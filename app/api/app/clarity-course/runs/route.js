import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readClarityRun,listClarityRuns,clarityRunStorageEnabled} from '@/lib/app/clarity-course-runs.js'
import {readClarityRunDraft} from '@/lib/app/my-coach-protocol-drafts.js'
import {readMyCoachProtocol} from '@/lib/app/personal-coaching'
import {clarityRunProtocolId,clarityRunTranscript,isClarityRunId,clarityRunSummary} from '@/lib/coaching/clarity-course-runs.mjs'
import {clarityCourseResult} from '@/lib/coaching/clarity-course-results.mjs'
import {claritySessionProtocol} from '@/lib/coaching/clarity-course-protocol.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export async function GET(request){
 let auth
 try{
  const config=getAppConfig();requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  if(!clarityRunStorageEnabled())throw new AppError('CLARITY_RUN_UNAVAILABLE',503)
  await consumeRate(config,{op:'clarity-course-run-read',actor:actor.id},120,3600)
  const q=new URL(request.url).searchParams
  if([...q.keys()].some(k=>!['id','day','before','locale'].includes(k)||q.getAll(k).length!==1))throw new AppError('INVALID_QUERY',400)
  const locale=['en','ru','es'].includes(q.get('locale'))?q.get('locale'):'en'
  let data
  if(q.has('id')&&!q.has('day')){
   if(!isClarityRunId(q.get('id'))||q.has('before'))throw new AppError('INVALID_QUERY',400)
   data={run:clarityRunSummary(await readClarityRun(config,actor,q.get('id')))}
  }else if(q.has('id')||q.has('day')){
   if(!isClarityRunId(q.get('id'))||!['1','2','3'].includes(q.get('day'))||q.has('before'))throw new AppError('INVALID_QUERY',400)
   const run=await readClarityRun(config,actor,q.get('id')),day=Number(q.get('day')),protocolId=clarityRunProtocolId(run,day)
   // Read draft first, then reviewed archive; an atomic promotion cannot be
   // mistaken for an empty record. Never fetch the newest report by day.
   const draft=await readClarityRunDraft(config,actor,protocolId,day)
   let reviewed=null
   try{reviewed=await readMyCoachProtocol(config,actor,protocolId)}catch(error){if(error.code!=='MY_COACH_PROTOCOL_NOT_FOUND')throw error}
   const protocol=reviewed||draft?.protocol||null
   const transcript=protocol?clarityRunTranscript(protocol,day,run,reviewed?.savedAt||draft?.updatedAt):null
   const sessionProtocol=reviewed?claritySessionProtocol(reviewed,day,locale):draft?claritySessionProtocol(draft.protocol,day,locale,{draftReview:draft.review,scenarioVersion:draft.scenarioVersion,updatedAt:draft.updatedAt}):null
   if(protocol&&(!transcript||!sessionProtocol))throw new AppError('CLARITY_RUN_CONFLICT',409)
   data={courseRunId:run.id,day,protocolId,transcript,sessionProtocol,result:reviewed?clarityCourseResult(reviewed,locale,{clock:run.clock}):null}
  }else{
   if(q.has('before')&&!/^[1-9][0-9]{0,9}$/.test(q.get('before')))throw new AppError('INVALID_QUERY',400)
   data=await listClarityRuns(config,actor,{before:q.has('before')?Number(q.get('before')):null})
  }
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error),response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
// No POST, no browser payment proof, no browser time observation.
