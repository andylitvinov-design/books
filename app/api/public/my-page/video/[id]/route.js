import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {getPublicMyVideoKey} from '@/lib/app/my-page'
import {createPrivateStorageClient} from '@/lib/clients/session-delivery-storage'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const headers={'Cache-Control':'private, no-store'}
export async function GET(request,{params}){
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  const {id}=await params
  const key=await getPublicMyVideoKey(config,id)
  if(!key||!/^personal-videos\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/master\.mp4$/.test(key))
    return NextResponse.json({error:'NOT_FOUND'},{status:404,headers})
  const {data,error}=await createPrivateStorageClient(config).storage.from('hh-client-private-media').createSignedUrl(key,60)
  if(error||!data?.signedUrl)return NextResponse.json({error:'VIDEO_UNAVAILABLE'},{status:503,headers})
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)
    return NextResponse.json({error:'VIDEO_UNAVAILABLE'},{status:503,headers})
  return NextResponse.redirect(url,{status:302,headers})
 }catch{
  return NextResponse.json({error:'VIDEO_UNAVAILABLE'},{status:503,headers})
 }
}
