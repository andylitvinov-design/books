'use client'
import {createClient} from '@supabase/supabase-js'
import {PRESENTATION_MAX_BYTES} from './presentation-contract.js'

async function request(path,body){
  const response=await fetch('/api/app/practice/video-upload/'+path,{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
  })
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(payload.error||'PRESENTATION_UPLOAD_FAILED')
  return payload
}
/** Reuse the established first-party signed media flow. Never proxy the MP4 via Vercel. */
export async function uploadPractitionerPresentationFile(file){
  const extension=String(file?.name||'').split('.').pop()?.toLowerCase()
  const mime=extension==='mov'?'video/quicktime':extension==='mp4'?'video/mp4':null
  if(!mime)throw new Error('MEDIA_TYPE_NOT_ALLOWED')
  if(!Number.isSafeInteger(file?.size)||file.size<128||file.size>PRESENTATION_MAX_BYTES)
    throw new Error('MEDIA_SIZE_NOT_ALLOWED')
  const intent=await request('intent',{mime,bytes:file.size})
  const storage=createClient(intent.supabaseUrl,intent.publishableKey,{
    auth:{persistSession:false,autoRefreshToken:false},
  })
  const {error}=await storage.storage.from(intent.bucket).uploadToSignedUrl(
    intent.path,intent.token,file,{contentType:mime,upsert:false},
  )
  if(error)throw new Error('PRESENTATION_UPLOAD_FAILED')
  const completed=await request('complete',{assetId:intent.assetId})
  if(completed.video?.kind!=='upload'||completed.video.assetId!==intent.assetId)
    throw new Error('PRESENTATION_NOT_READY')
  return completed.video
}
