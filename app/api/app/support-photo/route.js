import {NextResponse} from 'next/server'
import sharp from 'sharp'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {transaction,consumeRate} from '@/lib/app/database'
import {createPrivateStorageClient,checkPrivateMediaStorage} from '@/lib/clients/session-delivery-storage'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

const BUCKET='hh-client-private-media'
const MAX_INPUT_BYTES=1_500_000
const MAX_OUTPUT_BYTES=1_450_000
const keyFor=actor=>'support-photo/'+actor.id+'/portrait.jpg'

async function context(request,write=false){
  const config=getAppConfig()
  if(write)requireSameOrigin(request,config)
  else requestOrigin(request,config)
  const auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  // The transaction verifies the live auth session; explicitly require
  // an active application account BEFORE the privileged private-storage client
  // is created. A bare SELECT 1 cannot check account status.
  await transaction(config,actor,async db=>{
    const {rows}=await db.query('select app_private.account_active() as active')
    if(rows[0]?.active!==true)throw new AppError('ACCOUNT_UNAVAILABLE',403)
  })
  if(!config.secretKey)throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)
  return {config,auth,actor,storage:createPrivateStorageClient(config).storage.from(BUCKET)}
}
async function signedPhotoUrl(storage,key,config){
  const {data,error}=await storage.createSignedUrl(key,120)
  if(error||!data?.signedUrl)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return url.toString()
}
function errorResponse(error,auth){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
}

export async function GET(request){
  let auth
  try{
    const ctx=await context(request)
    auth=ctx.auth
    const {data,error}=await ctx.storage.list('support-photo/'+ctx.actor.id,{
      limit:5,search:'portrait.jpg',
    })
    if(error)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
    const exists=data?.some(file=>file.name==='portrait.jpg')
    const url=exists?await signedPhotoUrl(ctx.storage,keyFor(ctx.actor),ctx.config):null
    return auth.apply(NextResponse.json({url},{headers:PRIVATE_HEADERS}))
  }catch(error){return errorResponse(error,auth)}
}

export async function POST(request){
  let auth
  try{
    const ctx=await context(request,true)
    auth=ctx.auth
    if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))
      throw new AppError('INVALID_CONTENT_TYPE',415)
    const length=Number(request.headers.get('content-length')||0)
    if(length>MAX_INPUT_BYTES+50_000)throw new AppError('PHOTO_TOO_LARGE',413)
    await consumeRate(ctx.config,{op:'support-private-photo',accountId:ctx.actor.id},10,3600)
    const form=await request.formData()
    const file=form.get('photo')
    if(!file||typeof file.arrayBuffer!=='function'||file.type!=='image/jpeg')
      throw new AppError('INVALID_IMAGE',400)
    if(file.size<128||file.size>MAX_INPUT_BYTES)throw new AppError('PHOTO_TOO_LARGE',413)
    let cleaned
    try {
      cleaned=await sharp(Buffer.from(await file.arrayBuffer()),{
        limitInputPixels:36_000_000,failOn:'error',
      }).rotate().resize({width:1536,height:1536,fit:'inside',withoutEnlargement:true})
        .jpeg({quality:77,mozjpeg:true}).toBuffer()
    }catch{throw new AppError('INVALID_IMAGE',400)}
    if(cleaned.length<128||cleaned.length>MAX_OUTPUT_BYTES)
      throw new AppError('PHOTO_TOO_LARGE',413)
    await checkPrivateMediaStorage(ctx.config)
    const {error}=await ctx.storage.upload(keyFor(ctx.actor),cleaned,{
      contentType:'image/jpeg',cacheControl:'0',upsert:true,
    })
    if(error)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
    const url=await signedPhotoUrl(ctx.storage,keyFor(ctx.actor),ctx.config)
    return auth.apply(NextResponse.json({url,saved:true},{headers:PRIVATE_HEADERS}))
  }catch(error){return errorResponse(error,auth)}
}

export async function DELETE(request){
  let auth
  try{
    const ctx=await context(request,true)
    auth=ctx.auth
    await consumeRate(ctx.config,{op:'support-private-photo-delete',accountId:ctx.actor.id},10,3600)
    const {error}=await ctx.storage.remove([keyFor(ctx.actor)])
    if(error)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
    return auth.apply(NextResponse.json({removed:true},{headers:PRIVATE_HEADERS}))
  }catch(error){return errorResponse(error,auth)}
}
