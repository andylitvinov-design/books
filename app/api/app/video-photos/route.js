import {createHash} from 'node:crypto'
import {NextResponse} from 'next/server'
import sharp from 'sharp'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {transaction,consumeRate} from '@/lib/app/database'
import {createPrivateStorageClient,checkPrivateMediaStorage} from '@/lib/clients/session-delivery-storage'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {MAX_VIDEO_PHOTOS,MAX_VIDEO_PHOTO_BYTES,MAX_VIDEO_PHOTO_TOTAL_BYTES,
 MAX_VIDEO_PHOTO_INPUT_BYTES,VIDEO_PHOTO_ID,videoPhotoPrefix,videoPhotoKey,
 savedVideoPhotos,requireVideoPhotoPermission} from '@/lib/app/client-video-photo-contract.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const BUCKET='hh-client-private-media'

async function context(request,write=false){
  const config=getAppConfig()
  if(write)requireSameOrigin(request,config)
  else requestOrigin(request,config)
  const auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  await transaction(config,actor,async db=>{
    const {rows}=await db.query('select app_private.account_active() as active')
    if(rows[0]?.active!==true)throw new AppError('ACCOUNT_UNAVAILABLE',403)
  })
  if(!config.secretKey)throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)
  return {config,auth,actor,storage:createPrivateStorageClient(config).storage.from(BUCKET)}
}
async function portraitPhoto(ctx){
  const {data,error}=await ctx.storage.list('support-photo/'+ctx.actor.id,{limit:5,search:'portrait.jpg'})
  if(error)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return data?.some(p=>p.name==='portrait.jpg')?
    {id:'portrait',bytes:0,createdAt:null,isProfile:true}:null
}
async function ownedPhotos(ctx){
  const {data,error}=await ctx.storage.list(videoPhotoPrefix(ctx.actor.id),{limit:24})
  if(error)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return savedVideoPhotos(data)
}
async function urlFor(ctx,id){
  const {data,error}=await ctx.storage.createSignedUrl(id==='portrait'?'support-photo/'+ctx.actor.id+'/portrait.jpg':videoPhotoKey(ctx.actor.id,id),120)
  if(error||!data?.signedUrl)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(ctx.config.supabaseUrl).origin)
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return url.toString()
}
function fail(error,auth){
  const safe=safeError(error)
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(result):result
}
export async function GET(request){
  let auth
  try{
    const ctx=await context(request)
    auth=ctx.auth
    const photos=await ownedPhotos(ctx)
    const portrait=await portraitPhoto(ctx)
    if(portrait)photos.unshift(portrait)
    const id=new URL(request.url).searchParams.get('id')
    if(id!==null){
      if(id!=='portrait'&&!VIDEO_PHOTO_ID.test(id))throw new AppError('NOT_FOUND',404)
      const entry=photos.find(p=>p.id===id)
      if(!entry)throw new AppError('NOT_FOUND',404)
      return auth.apply(NextResponse.json({photo:{...entry,url:await urlFor(ctx,id)}},{headers:PRIVATE_HEADERS}))
    }
    return auth.apply(NextResponse.json({photos:await Promise.all(photos.map(async p=>({
      ...p,url:await urlFor(ctx,p.id)
    }))),maxPhotos:MAX_VIDEO_PHOTOS},{headers:PRIVATE_HEADERS}))
  }catch(error){return fail(error,auth)}
}
export async function POST(request){
  let auth
  try{
    const ctx=await context(request,true)
    auth=ctx.auth
    if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))
      throw new AppError('INVALID_CONTENT_TYPE',415)
    if(Number(request.headers.get('content-length')||0)>MAX_VIDEO_PHOTO_INPUT_BYTES+100_000)
      throw new AppError('PHOTO_TOO_LARGE',413)
    await consumeRate(ctx.config,{op:'client-video-photo-save',accountId:ctx.actor.id},12,3600)
    const form=await request.formData()
    try{requireVideoPhotoPermission(Object.fromEntries(['cloudConsent','photoRights','subject','subjectConsent','guardianConsent']
      .map(k=>[k,form.get(k)])))}catch{throw new AppError('PHOTO_CONSENT_REQUIRED',400)}
    const items=form.getAll('photo')
    const file=items[0]
    if(items.length!==1||!file||typeof file.arrayBuffer!=='function'||file.type!=='image/jpeg')
      throw new AppError('INVALID_IMAGE',400)
    if(file.size<128||file.size>MAX_VIDEO_PHOTO_INPUT_BYTES)
      throw new AppError('PHOTO_TOO_LARGE',413)
    let cleaned
    try{
      cleaned=await sharp(Buffer.from(await file.arrayBuffer()),{
        limitInputPixels:36_000_000,failOn:'error'
      }).rotate().resize({width:1536,height:1536,fit:'inside',withoutEnlargement:true})
        .jpeg({quality:77,mozjpeg:true}).toBuffer()
    }catch{throw new AppError('INVALID_IMAGE',400)}
    if(cleaned.length<128||cleaned.length>MAX_VIDEO_PHOTO_BYTES)
      throw new AppError('PHOTO_TOO_LARGE',413)
    const id=createHash('sha256').update(cleaned).digest('hex')
    await checkPrivateMediaStorage(ctx.config)
    // Serialize count, byte quota and writes per owner across concurrent functions.
    const result=await transaction(ctx.config,ctx.actor,async db=>{
      await db.query('select pg_advisory_xact_lock(451709,hashtext($1))',[ctx.actor.id])
      const photos=await ownedPhotos(ctx)
      if(photos.some(p=>p.id===id))return {id,alreadySaved:true}
      if(photos.length>=MAX_VIDEO_PHOTOS||
         photos.reduce((total,p)=>total+p.bytes,0)+cleaned.length>MAX_VIDEO_PHOTO_TOTAL_BYTES)
        throw new AppError('PHOTO_LIBRARY_QUOTA',413)
      const {error}=await ctx.storage.upload(videoPhotoKey(ctx.actor.id,id),cleaned,{
        contentType:'image/jpeg',cacheControl:'0',upsert:false
      })
      if(error)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
      return {id,alreadySaved:false}
    })
    return auth.apply(NextResponse.json({
      saved:true,...result,photo:{id,bytes:cleaned.length,url:await urlFor(ctx,id)}
    },{headers:PRIVATE_HEADERS}))
  }catch(error){return fail(error,auth)}
}
export async function DELETE(request){
  let auth
  try{
    const ctx=await context(request,true)
    auth=ctx.auth
    const id=new URL(request.url).searchParams.get('id')
    if(!VIDEO_PHOTO_ID.test(id||''))throw new AppError('NOT_FOUND',404)
    await consumeRate(ctx.config,{op:'client-video-photo-delete',accountId:ctx.actor.id},15,3600)
    await transaction(ctx.config,ctx.actor,async db=>{
      await db.query('select pg_advisory_xact_lock(451709,hashtext($1))',[ctx.actor.id])
      if(!(await ownedPhotos(ctx)).some(p=>p.id===id))throw new AppError('NOT_FOUND',404)
      const {error}=await ctx.storage.remove([videoPhotoKey(ctx.actor.id,id)])
      if(error)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
    })
    return auth.apply(NextResponse.json({removed:true},{headers:PRIVATE_HEADERS}))
  }catch(error){return fail(error,auth)}
}
