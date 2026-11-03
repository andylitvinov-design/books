import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const BUCKET='hh-service-photos'
const MAX_INPUT_BYTES=3_000_000
const MAX_OUTPUT_BYTES=2_500_000
const ACCEPTED=new Set(['image/jpeg','image/png','image/webp'])

export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))throw new AppError('INVALID_CONTENT_TYPE',415)
    // Avoid requests that exceed Vercel's common request-body size limit.
    const length=Number(request.headers.get('content-length')||'0')
    if(length>MAX_INPUT_BYTES+50_000)throw new AppError('PHOTO_TOO_LARGE',413)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const practice=await createPractitionerRepository(config).getMyPractice(actor)
    if(!practice.practitioner||['suspended','rejected','archived'].includes(practice.practitioner.status))
      throw new AppError('PRACTITIONER_REQUIRED',403)
    await consumeRate(config,{op:'practice-photo-upload',actor:actor.id},15,3600)
    const data=await request.formData()
    const file=data.get('photo')
    if(!file||typeof file.arrayBuffer!=='function'||!ACCEPTED.has(file.type))
      throw new AppError('INVALID_IMAGE',400)
    if(file.size<128||file.size>MAX_INPUT_BYTES)throw new AppError('PHOTO_TOO_LARGE',413)
    const source=Buffer.from(await file.arrayBuffer())
    // Decode and re-encode all uploads. EXIF, GPS, filenames and ancillary
    // metadata never enter the publicly readable storage bucket.
    let cleaned
    try{
      cleaned=await sharp(source,{limitInputPixels:25_000_000,failOn:'error'})
        .rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
        .jpeg({quality:80,mozjpeg:true}).toBuffer()
    }catch{throw new AppError('INVALID_IMAGE',400)}
    if(cleaned.length<128||cleaned.length>MAX_OUTPUT_BYTES)throw new AppError('PHOTO_TOO_LARGE',413)
    const path=actor.id+'/'+randomUUID()+'.jpg'
    const {error}=await auth.client.storage.from(BUCKET).upload(path,cleaned,{
      contentType:'image/jpeg',cacheControl:'31536000',upsert:false
    })
    if(error)throw new AppError('PHOTO_UPLOAD_UNAVAILABLE',503)
    const url=config.supabaseUrl+'/storage/v1/object/public/'+BUCKET+'/'+path
    return auth.apply(NextResponse.json({url},{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
