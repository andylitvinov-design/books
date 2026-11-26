import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createAppRepository} from '@/lib/app/repository'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {transaction} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {readLukasVideoAccessStatus} from '@/lib/coaching/lukas-video-access-status.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
// Read-only: never issue a Simli token or send customer content to a provider.
export async function GET(request){
  let auth
  const json=(body,status=200)=>{
    const response=NextResponse.json(body,{status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
  try{
    const config=getAppConfig(),origin=requestOrigin(request,config)
    if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.has('origin')&&request.headers.get('origin')!==origin))return json({code:'ACCESS_DENIED',videoAvailable:false},403)
    auth=createRequestAuth(request,config)
    const repository=createAppRepository(config)
    const status=await readLukasVideoAccessStatus({auth,config,transaction,ownerEmailAllowed:practitionerEmailAllowed,ownerPractitionerActive:actor=>repository.isPractitioner(actor)})
    return json(status,status.code==='AUTH_REQUIRED'?401:status.code==='CONSENT_REQUIRED'?403:200)
  }catch(error){
    const failure=safeError(error)
    return json({code:failure.code,videoAvailable:false},failure.status)
  }
}
