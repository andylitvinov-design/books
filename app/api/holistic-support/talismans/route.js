import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getAppConfig,requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS,safeError } from '@/lib/app/http'
import { AppError,requireUUID } from '@/lib/assessments/contracts'
import {
  TALISMAN_BUCKET,validateTalismanDetails,listMyTalismans,reserveTalisman,
  completeTalisman,getMyTalisman,removeTalismanRecord,cancelTalismanReservation,
} from '@/lib/app/support-talismans'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0
const MAX_INPUT=3_000_000
const MAX_OUTPUT=1_500_000
const ACCEPTED=new Set(['image/jpeg','image/png','image/webp'])
function failure(error,auth){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
}
async function authorized(request){
  const config=getAppConfig(),auth=createRequestAuth(request,config),actor=await auth.verified()
  return {config,auth,actor}
}
export async function GET(request){
  let auth
  try{
    const access=await authorized(request)
    auth=access.auth
    const own=await listMyTalismans(access.config,access.actor)
    const items=await Promise.all(own.map(async item=>{
      const {data,error}=await auth.client.storage.from(TALISMAN_BUCKET).createSignedUrl(item.path,600)
      // Failed signing is not a public URL fallback: preserve privacy.
      return error||!data?.signedUrl?null:{
        id:item.id,title:item.title,category:item.category,createdAt:item.createdAt,imageUrl:data.signedUrl
      }
    }))
    return auth.apply(NextResponse.json({items:items.filter(Boolean)},{headers:PRIVATE_HEADERS}))
  }catch(error){return failure(error,auth)}
}
export async function POST(request){
  let auth,reservation,config,actor
  try{
    config=getAppConfig()
    requireSameOrigin(request,config)
    if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))throw new AppError('INVALID_CONTENT_TYPE',415)
    const length=Number(request.headers.get('content-length')||0)
    if(!Number.isFinite(length)||length>MAX_INPUT+20000)throw new AppError('TALISMAN_TOO_LARGE',413)
    auth=createRequestAuth(request,config)
    actor=await auth.verified()
    await consumeRate(config,{op:'support-talisman-upload',actor:actor.id},8,3600)
    const form=await request.formData()
    const {title,category}=validateTalismanDetails(form.get('title'),form.get('category'))
    const file=form.get('image')
    if(!file||typeof file.arrayBuffer!=='function'||!ACCEPTED.has(file.type))
      throw new AppError('INVALID_IMAGE',400)
    if(file.size<128||file.size>MAX_INPUT)throw new AppError('TALISMAN_TOO_LARGE',413)
    let clean
    try{
      clean=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:24_000_000,failOn:'error'})
        .rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true})
        .flatten({background:'#ffffff'}).jpeg({quality:70,mozjpeg:true}).toBuffer()
    }catch{throw new AppError('INVALID_IMAGE',400)}
    if(clean.length<128||clean.length>MAX_OUTPUT)throw new AppError('TALISMAN_TOO_LARGE',413)
    reservation=await reserveTalisman(config,actor,{title,category})
    const {error}=await auth.client.storage.from(TALISMAN_BUCKET).upload(reservation.path,clean,{
      contentType:'image/jpeg',cacheControl:'60',upsert:false
    })
    if(error)throw new AppError('TALISMAN_UPLOAD_FAILED',503)
    const item=await completeTalisman(config,actor,reservation.id)
    // Durable save is complete. A temporary preview link is fetched by GET.
    reservation=null
    return auth.apply(NextResponse.json({item:{
      id:item.id,title:item.title,category:item.category,createdAt:item.createdAt,
    }},{status:201,headers:PRIVATE_HEADERS}))
  }catch(error){
    if(reservation&&auth&&config&&actor){
      await auth.client.storage.from(TALISMAN_BUCKET).remove([reservation.path]).catch(()=>{})
      await cancelTalismanReservation(config,actor,reservation.id).catch(()=>{})
    }
    return failure(error,auth)
  }
}
export async function DELETE(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const id=new URL(request.url).searchParams.get('id')
    requireUUID(id)
    await consumeRate(config,{op:'support-talisman-delete',actor:actor.id},30,3600)
    const own=await getMyTalisman(config,actor,id)
    if(!own)throw new AppError('NOT_FOUND',404)
    const {error}=await auth.client.storage.from(TALISMAN_BUCKET).remove([own.storage_path])
    if(error)throw new AppError('TALISMAN_DELETE_FAILED',503)
    await removeTalismanRecord(config,actor,id)
    return auth.apply(NextResponse.json({deleted:true},{headers:PRIVATE_HEADERS}))
  }catch(error){return failure(error,auth)}
}
