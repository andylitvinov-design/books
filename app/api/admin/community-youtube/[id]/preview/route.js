import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {adminInspectCommunityVideo} from '@/lib/app/community-video-publishing'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60
export async function GET(request,{params}){
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(!await requireAdminRequest())throw new AppError('SIGN_IN_REQUIRED',401)
  const {id}=await params
  const {bytes}=await adminInspectCommunityVideo(config,id)
  const headers={...PRIVATE_HEADERS,'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Disposition':'inline; filename="community-review.mp4"'}
  const range=request.headers.get('range')
  if(range){
   const match=/^bytes=(\d+)-(\d*)$/.exec(range)
   if(!match)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${bytes.length}`}})
   const first=Number(match[1]),last=match[2]?Number(match[2]):bytes.length-1
   if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first>last||last>=bytes.length)
    return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${bytes.length}`}})
   return new Response(bytes.subarray(first,last+1),{status:206,headers:{...headers,
    'Content-Range':`bytes ${first}-${last}/${bytes.length}`,'Content-Length':String(last-first+1)}})
  }
  return new Response(bytes,{headers:{...headers,'Content-Length':String(bytes.length)}})
 }catch(error){const safe=safeError(error);return Response.json({error:safe.code},
  {status:safe.status,headers:PRIVATE_HEADERS})}
}
