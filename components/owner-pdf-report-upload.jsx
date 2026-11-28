'use client'
import {useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {recordingUpload,saveRecording} from '@/lib/clients/recording-upload'
import styles from './client-session.module.css'

async function post(url,body){
  const res=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  const data=await res.json().catch(()=>({}))
  if(!res.ok)throw new Error(data.error||'PDF_UPLOAD_FAILED')
  return data
}
export function OwnerPdfReportUpload({clientId,sessionId,locale='en',disabled,onSaved,onBusy}){
  const ru=locale==='ru',job=useRef(null),lock=useRef(false)
  const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  async function upload(){
    if(lock.current||!file)return
    lock.current=true;setBusy(true);onBusy?.(true);setMessage('')
    try{
      if(!job.current){
        if(file.size<128||file.size>15_000_000||!file.name.toLowerCase().endsWith('.pdf')||
          !['','application/pdf','application/octet-stream'].includes(file.type)||
          await file.slice(0,5).text()!=='%PDF-')throw new Error('INVALID_PDF')
        const pdf=new File([file],'report.pdf',{type:'application/pdf'})
        job.current=recordingUpload({file:pdf,clientId,sessionId,scope:'client'})
      }
      await saveRecording(job.current,{post,upload:async(intent,blob,mime)=>{
        if(intent.provider==='external'||!intent.token||!intent.publishableKey)throw new Error('PDF_UPLOAD_FAILED')
        const supabase=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
        const result=await supabase.storage.from(intent.bucket).uploadToSignedUrl(intent.objectKey,intent.token,blob,{contentType:mime,upsert:false})
        if(result.error)throw new Error('PDF_UPLOAD_FAILED')
      }})
      await onSaved?.(job.current.intent.assetId)
      job.current=null;setFile(null);setMessage(ru?'PDF сохранён в приватном черновике.':'PDF saved in the private draft.')
    }catch(error){
      setMessage(error.message==='INVALID_PDF'?(ru?'Выберите корректный PDF до 15 МБ.':'Choose a valid PDF up to 15 MB.'):
        (ru?'Не удалось завершить загрузку. Файл остался здесь, повторите.':'Upload could not be completed. The file is retained here; retry.'))
    }finally{lock.current=false;setBusy(false);onBusy?.(false)}
  }
  return <div style={{display:'grid',gap:12,padding:'14px 0'}}>
    <label className={styles.field}>{ru?'Готовый PDF (до 15 МБ)':'Original PDF (up to 15 MB)'}
      <input type="file" accept="application/pdf,.pdf" disabled={busy||disabled} onChange={event=>{
        const next=event.target.files?.[0];if(next){job.current=null;setFile(next);setMessage('')}event.target.value=''
      }}/></label>
    {file&&<p>{file.name} · {(file.size/1_000_000).toFixed(2)} MB</p>}
    <button type="button" className={styles.primaryButton} disabled={busy||disabled||!file} onClick={upload}>
      {busy?(ru?'Загрузка…':'Uploading…'):(ru?'Загрузить PDF':'Upload PDF')}</button>
    {message&&<p role="status" aria-live="polite">{message}</p>}
  </div>
}
