// Browser-safe upload state. Keep destination and privacy scope pinned across retries.
export function recordingUpload({file,clientId,sessionId,scope,durationSeconds=0,reviewFirst=false}) {
  if(!file || !['client','practitioner'].includes(scope)) throw new Error('INVALID_RECORDING')
  return {intentId:globalThis.crypto.randomUUID(),file,clientId,sessionId,scope,durationSeconds,reviewFirst:reviewFirst===true,intent:null,uploaded:false}
}
export async function saveRecording(job,{post,upload}) {
  const mime=(job.file.type||'').split(';')[0].toLowerCase()
  const kind=mime.startsWith('image/')?'image':mime==='application/pdf'?'pdf':mime.startsWith('video/')?'video':'audio'
  // The server chooses the real limit: old Supabase 45 MB, gated external 200 MB.
  const max=kind==='video'?200_000_000:kind==='pdf'?15_000_000:kind==='image'?5_000_000:20_000_000
  if(!['audio/mp4','audio/x-m4a','audio/webm','audio/mpeg','video/mp4','video/quicktime','application/pdf','image/jpeg','image/png','image/webp'].includes(mime)) throw new Error('MEDIA_TYPE_NOT_ALLOWED')
  if(job.file.size<128 || job.file.size>max) throw new Error('MEDIA_SIZE_NOT_ALLOWED')
  const base='/api/admin/clients/'+job.clientId+'/sessions/'+job.sessionId+'/media'
  if(!job.intent){
    try{job.intent=await post(base,{action:'intent',intentId:job.intentId,mime,kind,scope:job.scope,bytes:job.file.size})}
    catch(error){if(error.message==='MEDIA_INTENT_EXPIRED'){job.intentId=globalThis.crypto.randomUUID();job.intent=await post(base,{action:'intent',intentId:job.intentId,mime,kind,scope:job.scope,bytes:job.file.size})}else throw error}
  }
  if(job.intent.ready)job.uploaded=true
  // Finalization is idempotent. A lost success response must not create a second asset.
  if(!job.uploaded) {
    try { await upload(job.intent,job.file,mime); job.uploaded=true }
    catch(error) {
      // The server may have received the whole file before the connection dropped.
      // Verify it through the same bounded asset before retrying its signed upload.
      try {
        await post(base,{action:'complete',assetId:job.intent.assetId,
          durationSeconds:kind==='image'?null:Math.floor(job.durationSeconds),reviewFirst:job.reviewFirst===true})
        job.uploaded=true
        return
      } catch(finalizeError) {
        // A conditional PUT cannot replace a *truncated* or malformed object.
        // If finalization proves that the old object is unusable, allocate a
        // NEW opaque object key on the next explicit user retry. Keep the
        // original intent when the failure is only transient or a lost reply.
        if(['MEDIA_SIZE_NOT_ALLOWED','MEDIA_TYPE_NOT_ALLOWED','MEDIA_UNAVAILABLE']
          .includes(finalizeError?.message))
          job.intentId=globalThis.crypto.randomUUID()
        job.intent=null
        throw error
      }
    }
  }
  await post(base,{action:'complete',assetId:job.intent.assetId,durationSeconds:kind==='image'?null:Math.floor(job.durationSeconds),reviewFirst:job.reviewFirst===true})
}
