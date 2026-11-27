import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readMyCoachProtocol} from '@/lib/app/personal-coaching'
import {clarityProtocolView,clarityDraftLog,claritySessionProtocol} from '@/lib/coaching/clarity-course-protocol.mjs'
import {listCoachDrafts,readClarityRunDraft} from '@/lib/app/my-coach-protocol-drafts.js'
import {excludeBoundClarityResults} from '@/lib/app/clarity-course-runs.js'
import {clarityCourseId} from '@/lib/coaching/clarity-course.mjs'
import {isMyCoachProtocolId} from '@/lib/personal-coaching/protocol-archive.mjs'
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
  const q=new URL(request.url).searchParams
  if([...q.keys()].some(k=>!['id','day','locale','before','beforeId'].includes(k)||q.getAll(k).length!==1)||!['1','2','3'].includes(q.get('day')))throw new AppError('INVALID_QUERY',400)
  await consumeRate(config,{op:'clarity-course-protocol-read',actor:actor.id},60,3600)
  const day=Number(q.get('day')),locale=['en','ru','es'].includes(q.get('locale'))?q.get('locale'):'en'
  if(!q.has('id')){
   // Metadata only, owner-scoped keyset cursor. Full dialogue is lazy.
   const page=await listCoachDrafts(config,actor,{view:'summary',courseSessionId:clarityCourseId(day),before:q.get('before'),beforeId:q.get('beforeId')})
   const drafts=await excludeBoundClarityResults(config,actor,page.drafts)
   return auth.apply(NextResponse.json({drafts,hasMore:page.hasMore,nextCursor:page.nextCursor},{headers:PRIVATE_HEADERS}))
  }
  if(!isMyCoachProtocolId(q.get('id'))||q.has('before')||q.has('beforeId'))throw new AppError('INVALID_QUERY',400)
  const id=q.get('id')
  let draft=null,reviewed=null
  try{draft=await readClarityRunDraft(config,actor,id,day)}catch(error){if(error.code!=='MY_COACH_DRAFT_CONFLICT')throw error}
  // A concurrent promotion is read as the reviewed archive, not a vanished draft.
  try{reviewed=await readMyCoachProtocol(config,actor,id)}catch(error){if(error.code!=='MY_COACH_PROTOCOL_NOT_FOUND')throw error}
  const result=reviewed?clarityProtocolView(reviewed,day):draft?clarityDraftLog(draft.protocol,day,draft.updatedAt):null
  const sessionProtocol=reviewed?claritySessionProtocol(reviewed,day,locale):draft?claritySessionProtocol(draft.protocol,day,locale,{draftReview:draft.review,scenarioVersion:draft.scenarioVersion,updatedAt:draft.updatedAt}):null
  if(!result||!sessionProtocol)throw new AppError('MY_COACH_PROTOCOL_NOT_FOUND',404)
  return auth.apply(NextResponse.json({protocol:result,sessionProtocol},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
