'use client'
import {useEffect,useState} from 'react'
import styles from './crm-telegram-photo.module.css'
import PrivateChatPhoto from './private-chat-photo'

// Client photos never use public Storage URLs or expose Telegram identifiers.
// Bytes are fetched only from the account-checked owner CRM photo endpoint.
export default function CrmTelegramPhoto({accountId,threadId,messageId,locale='en',purpose='portrait'}){
  const [src,setSrc]=useState('')
  const [state,setState]=useState('loading')
  const [retry,setRetry]=useState(0)
  const [failureCode,setFailureCode]=useState('')

  useEffect(()=>{
    if(!accountId||!threadId||!messageId){setState('error');return}
    const controller=new AbortController()
    let objectUrl=null
    setSrc('')
    setFailureCode('')
    setState('loading')
    const params=new URLSearchParams({threadId,messageId})
    fetch('/api/app/crm/messenger/photo?'+params.toString(),{
      credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'X-HH-Account-Id':accountId},
    }).then(async response=>{
      if(!response.ok){
        // This is an owner-only API. Keep only its existing safe error code,
        // never a raw provider response, bot token, or private file ID.
        const body=await response.json().catch(()=>null)
        const code=typeof body?.error==='string'?body.error:''
        throw new Error(['SIGN_IN_REQUIRED','ACCOUNT_CHANGED','ACCESS_DENIED',
          'CHANNEL_NOT_CONNECTED','PHOTO_UNAVAILABLE','PROVIDER_REJECTED',
          'PROVIDER_STATUS_UNKNOWN'].includes(code)?code:'NETWORK_ERROR')
      }
      const blob=await response.blob()
      if(!['image/jpeg','image/png'].includes(blob.type)||!blob.size||
        blob.size>5*1024*1024)throw new Error('INVALID_MEDIA')
      if(controller.signal.aborted)return
      objectUrl=URL.createObjectURL(blob)
      setSrc(objectUrl)
      // An HTTP 200 is not proof that the browser can display the image.
      // Wait for <img onLoad>, and show an actionable error on decode failure.
      setState('decoding')
    }).catch(error=>{
      if(controller.signal.aborted)return
      setFailureCode(['SIGN_IN_REQUIRED','ACCOUNT_CHANGED','ACCESS_DENIED',
        'CHANNEL_NOT_CONNECTED','PHOTO_UNAVAILABLE','PROVIDER_REJECTED',
        'PROVIDER_STATUS_UNKNOWN','INVALID_MEDIA'].includes(error?.message)
        ?error.message:'NETWORK_ERROR')
      setState('error')
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
  const enlarge=locale==='ru'?'Открыть на весь экран':locale==='es'?'Abrir en pantalla completa':'Open full screen'
  // Show an actionable, localized reason if Retry cannot restore an existing
  // file. These are coarse safe codes; no private Telegram details leave server.
  const reasonKey=['SIGN_IN_REQUIRED','ACCOUNT_CHANGED','ACCESS_DENIED'].includes(failureCode)?'auth':
    failureCode==='CHANNEL_NOT_CONNECTED'?'disconnected':
    failureCode==='PHOTO_UNAVAILABLE'?'missing':
    ['PROVIDER_REJECTED','PROVIDER_STATUS_UNKNOWN'].includes(failureCode)?'provider':
    failureCode==='INVALID_MEDIA'?'invalid':'network'
  const reasons={
    auth:{en:'Please sign in again to view this private image.',ru:'Войдите заново, чтобы открыть приватное фото.',es:'Vuelve a iniciar sesión para ver la imagen privada.'},
    disconnected:{en:'Telegram is not connected. Check the channel setup.',ru:'Telegram не подключён. Проверьте настройки канала.',es:'Telegram no está conectado. Revisa la configuración.'},
    missing:{en:'Telegram cannot provide this file. It may need to be sent again.',ru:'Telegram не отдаёт этот файл. Возможно, его нужно отправить повторно.',es:'Telegram no puede entregar este archivo. Quizás deba enviarse de nuevo.'},
    provider:{en:'Telegram is temporarily unavailable. Try again later.',ru:'Telegram временно недоступен. Повторите позже.',es:'Telegram no está disponible ahora. Vuelve a intentarlo.'},
    invalid:{en:'The file could not be decoded as a supported image.',ru:'Не удалось распознать файл как изображение.',es:'No se pudo reconocer el archivo como una imagen.'},
    network:{en:'Check your connection and try again.',ru:'Проверьте соединение и повторите попытку.',es:'Comprueba tu conexión y vuelve a intentarlo.'},
  }

  return <div className={styles.media} data-state={state}>
    <span className={styles.label}>{label}</span>
    {(state==='loading'||state==='decoding')&&<span role="status" className={styles.loading}>{loading}</span>}
    {src&&state!=='error'&&<PrivateChatPhoto src={src} alt={label} locale={locale}
      onLoad={()=>setState('ready')} onError={()=>setState('error')}/>}
    {state==='ready'&&<small className={styles.hint}>{enlarge}</small>}
    {state==='error'&&<div className={styles.error}>
      <span role="status">{failed}</span>
      <button type="button" onClick={()=>setRetry(value=>value+1)}>{retryLabel}</button>
      <small className={styles.hint}>{reasons[reasonKey][locale]||reasons[reasonKey].en}</small>
    </div>}
  </div>
}
