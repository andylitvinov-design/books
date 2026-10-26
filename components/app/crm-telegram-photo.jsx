'use client'
import {useEffect,useState} from 'react'
import styles from './crm-telegram-photo.module.css'

// Client photos never use public Storage URLs or expose Telegram identifiers.
// Bytes are fetched only from the account-checked owner CRM photo endpoint.
export default function CrmTelegramPhoto({accountId,threadId,messageId,locale='en',purpose='portrait'}){
  const [src,setSrc]=useState('')
  const [state,setState]=useState('loading')
  const [retry,setRetry]=useState(0)
  const [expanded,setExpanded]=useState(false)

  useEffect(()=>{
    if(!accountId||!threadId||!messageId){setState('error');return}
    const controller=new AbortController()
    let objectUrl=null
    setSrc('')
    setExpanded(false)
    setState('loading')
    const params=new URLSearchParams({threadId,messageId})
    fetch('/api/app/crm/messenger/photo?'+params.toString(),{
      credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'X-HH-Account-Id':accountId},
    }).then(async response=>{
      if(!response.ok)throw new Error('UNAVAILABLE')
      const blob=await response.blob()
      if(!['image/jpeg','image/png'].includes(blob.type)||!blob.size||
        blob.size>5*1024*1024)throw new Error('INVALID_MEDIA')
      if(controller.signal.aborted)return
      objectUrl=URL.createObjectURL(blob)
      setSrc(objectUrl)
      // An HTTP 200 is not proof that the browser can display the image.
      // Wait for <img onLoad>, and show an actionable error on decode failure.
      setState('decoding')
    }).catch(()=>{
      if(!controller.signal.aborted)setState('error')
    })
    return ()=>{
      controller.abort()
      if(objectUrl)URL.revokeObjectURL(objectUrl)
    }
  },[accountId,threadId,messageId,retry])

  const drawing=purpose==='drawing'
  const label=drawing
    ?locale==='ru'?'Рисунок клиента':locale==='es'?'Dibujo del cliente':'Client drawing'
    :locale==='ru'?'Фото клиента':locale==='es'?'Foto del cliente':'Client photo'
  const loading=locale==='ru'?'Загружаем фото…':locale==='es'?'Cargando foto…':'Loading photo…'
  const failed=locale==='ru'?'Не удалось открыть фотографию':locale==='es'?'No se pudo abrir la foto':'Could not open photo'
  const retryLabel=locale==='ru'?'Повторить':locale==='es'?'Reintentar':'Retry'
  const enlarge=locale==='ru'?'Увеличить фото':locale==='es'?'Ampliar foto':'Enlarge photo'
  const shrink=locale==='ru'?'Уменьшить фото':locale==='es'?'Reducir foto':'Shrink photo'

  return <div className={styles.media} data-state={state} data-expanded={expanded||undefined}>
    <span className={styles.label}>{label}</span>
    {(state==='loading'||state==='decoding')&&<span role="status" className={styles.loading}>{loading}</span>}
    {src&&state!=='error'&&<button className={styles.photoButton} type="button"
      disabled={state!=='ready'} aria-expanded={expanded}
      aria-label={expanded?shrink:enlarge} onClick={()=>setExpanded(value=>!value)}>
      <img src={src} alt={label} loading="lazy" decoding="async"
        onLoad={()=>setState('ready')} onError={()=>setState('error')}/>
    </button>}
    {state==='ready'&&<small className={styles.hint}>{expanded?shrink:enlarge}</small>}
    {state==='error'&&<div className={styles.error}>
      <span role="status">{failed}</span>
      <button type="button" onClick={()=>setRetry(value=>value+1)}>{retryLabel}</button>
    </div>}
  </div>
}
