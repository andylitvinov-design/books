import {createHash} from 'node:crypto'
import {requireAdminActor} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {privateStorageClient} from '@/lib/clients/session-delivery-storage.js'
import {archiveInput,archiveMetadata,isArchiveMp4,ARCHIVE_BUCKET,ARCHIVE_PATH,ARCHIVE_MAX_BYTES} from '@/lib/coaching/caesar-capture-archive.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const origin='https://holistichouse.vercel.app'
const json=(body,status=200)=>Response.json(body,{status,headers:PRIVATE_HEADERS})
async function authorized(request,write=false){
 return request.headers.get('sec-fetch-site')!=='cross-site'&&(!write||request.headers.get('origin')===origin)&&(!request.headers.has('origin')||request.headers.get('origin')===origin)&&Boolean((await requireAdminActor())?.id)
}
async function archive(){
 const config=getAppConfig(),storage=privateStorageClient(config).storage
 const {data,error}=await storage.getBucket(ARCHIVE_BUCKET)
 if(error||!data||data.public!==false||Number(data.file_size_limit)<ARCHIVE_MAX_BYTES)throw Error('ARCHIVE_UNAVAILABLE')
 return {config,bucket:storage.from(ARCHIVE_BUCKET)}
}
async function existing(bucket){
 const {data,error}=await bucket.list('caesar-editorial',{limit:10,search:'greeting-ru-v1.mp4'})
 if(error||!Array.isArray(data))throw Error('ARCHIVE_UNAVAILABLE')
 return archiveMetadata(data.find(x=>x.name==='greeting-ru-v1.mp4'))
}
async function signed(bucket,config,download=false){
 const {data,error}=await bucket.createSignedUrl(ARCHIVE_PATH,180,download?{download:'caesar-ru-native-candidate.mp4'}:{})
 if(error||!data?.signedUrl)throw Error('ARCHIVE_UNAVAILABLE')
 const url=new URL(data.signedUrl)
 if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)throw Error('ARCHIVE_UNAVAILABLE')
 return url.href
}
async function verify(bucket,config,input,meta){
 if(!meta||meta.bytes!==input.bytes)throw Error('ARCHIVE_UNCONFIRMED')
 const response=await fetch(await signed(bucket,config),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)})
 if(!response.ok||!response.body)throw Error('ARCHIVE_UNCONFIRMED')
 const hash=createHash('sha256');let size=0,header=Buffer.alloc(0)
 try{for await(const chunk of response.body){size+=chunk.byteLength;if(size>input.bytes||size>ARCHIVE_MAX_BYTES)throw Error('ARCHIVE_INVALID');if(header.length<12)header=Buffer.concat([header,Buffer.from(chunk.subarray(0,12-header.length))]);hash.update(chunk)}}finally{await response.body.cancel().catch(()=>{})}
 const sha256=hash.digest('hex')
 if(size!==input.bytes||sha256!==input.sha256||!isArchiveMp4(header))throw Error('ARCHIVE_CONFLICT')
 return {saved:true,bytes:size,sha256,status:'PRIVATE_QA_PENDING'}
}
export async function GET(request){
 if(!await authorized(request))return json({error:'ACCESS_DENIED'},403)
 try{
  const {config,bucket}=await archive(),meta=await existing(bucket)
  if(new URL(request.url).searchParams.get('download')==='1'){
   if(!meta)return json({error:'ARCHIVE_MISSING'},404)
   return new Response(null,{status:303,headers:{...PRIVATE_HEADERS,Location:await signed(bucket,config,true)}})
  }
  return json({ready:true,present:Boolean(meta),bytes:meta?.bytes??null})
 }catch{return json({error:'ARCHIVE_UNAVAILABLE'},503)}
}
export async function POST(request){
 if(!await authorized(request,true))return json({error:'ACCESS_DENIED'},403)
 try{
  const input=archiveInput(await readBody(request,512)),{config,bucket}=await archive(),meta=await existing(bucket)
  if(meta||input.action==='complete')return json(await verify(bucket,config,input,meta))
  // Exactly one path; a signed upload cannot replace an existing candidate.
  const {data,error}=await bucket.createSignedUploadUrl(ARCHIVE_PATH,{upsert:false})
  if(error||!data?.token)throw Error('ARCHIVE_UNAVAILABLE')
  return json({bucket:ARCHIVE_BUCKET,path:ARCHIVE_PATH,token:data.token,supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey})
 }catch(e){return json({error:['ARCHIVE_INVALID','ARCHIVE_UNCONFIRMED','ARCHIVE_CONFLICT'].includes(e?.message)?e.message:'ARCHIVE_UNAVAILABLE'},409)}
}
