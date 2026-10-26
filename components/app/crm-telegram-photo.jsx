'use client'
import { useEffect, useState } from 'react'

// Private per-owner media viewer: retrieve the bytes through the same CRM auth,
// never give Telegram file IDs or Bot API URLs to the browser.
export default function CrmTelegramPhoto({accountId,threadId,messageId,locale='en',purpose='portrait'}){
  const [src,setSrc]=useState('')
  const [state,setState]=useState('loading')
  useEffect(()=>{
    if(!accountId||!threadId||!messageId)return
    const controller=new AbortController()
    let objectUrl=null
    const params=new URLSearchParams({threadId,messageId})
    fetch('/api/app/crm/messenger/photo?'+params.toString(),{
      credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'X-HH-Account-Id':accountId},
    }).then(async response=>{
      if(!response.ok)throw new Error('UNAVAILABLE')
      const blob=await response.blob()
      if(!blob.type.startsWith('image/')||blob.size>5*1024*1024)throw new Error('INVALID_MEDIA')
      if(controller.signal.aborted)return
      objectUrl=URL.createObjectURL(blob)
      setSrc(objectUrl)
      setState('ready')
    }).catch(()=>{
      if(!controller.signal.aborted)setState('error')
    })
    return ()=>{
      controller.abort()
      if(objectUrl)URL.revokeObjectURL(objectUrl)
    }
  },[accountId,threadId,messageId])
  const label=purpose==='drawing'
    ?locale==='ru'?'Рисунок: я, цель, препятствие':locale==='es'?'Dibujo: yo, meta y obstáculo':'Drawing: me, goal and obstacle'
    :locale==='ru'?'Фото участника':locale==='es'?'Foto del participante':'Participant photo'
  return <div>
    {state==='loading'&&<span role="status">{locale==='ru'?'Загружаем фото…':locale==='es'?'Cargando foto…':'Loading photo…'}</span>}
    {state==='error'&&<span role="status">{locale==='ru'?'Фото недоступно':locale==='es'?'Foto no disponible':'Photo unavailable'}</span>}
    {src&&state==='ready'&&<img alt={label} src={src} loading="lazy"
      style={{maxWidth:'100%',width:240,height:'auto',borderRadius:12,display:'block',marginTop:8}}/>}
  </div>
}
