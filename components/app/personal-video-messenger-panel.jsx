'use client'

import {useEffect,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'

// Telegram bot delivery is owner-verified and opt-in. WhatsApp is an on-device
// file share only; never use CRM phone data as a private video destination.
const COPY={
  en:{
    title:'Video delivery',intro:'Send saved MP4s to your verified Telegram chat. New videos created in Video Studio can be sent automatically after you opt in.',
    linked:'Telegram bot linked',notLinked:'Telegram bot is not linked yet',
    connect:'Connect Telegram bot',openBot:'Continue in Telegram',refresh:'Check connection',
    automatic:'Automatically deliver new videos from Video Studio to Telegram',
    consent:'By enabling this, I consent to private upload and delivery of each completed MP4 to my verified Telegram chat. I can turn this off at any time.',
    renew:'Your earlier permission is tied to a different or disconnected chat. Turn it off and re-enable it after linking the new chat.',
    off:'Automatic Telegram delivery is currently unavailable. You can still download files and share them manually.',
    send:'Send via Telegram bot',accepted:'Telegram accepted the MP4 for sending; delivery or viewing is not confirmed.',
    duplicate:'This MP4 already has a delivery attempt. It will not be sent twice.',
    unknown:'Delivery was not confirmed. No automatic retry will be attempted.',
    saved:'Automatic delivery preference updated.',error:'Could not update Telegram delivery. Your saved videos remain private.',
    noReady:'Save an MP4 in your library to send it from here.',
    manual:'WhatsApp: download your MP4 below, then share it from your phone. Automatic WhatsApp Business delivery is not activated.',
    quota:'Storage is limited to three saved videos, 12 MB per MP4; delete an old video yourself before saving another. Nothing is deleted automatically.',
  },
  ru:{
    title:'Доставка видео',intro:'Отправляйте сохранённые MP4 в подтверждённый Telegram. Для новых роликов из Видеостудии можно включить автоматическую доставку.',
    linked:'Telegram-бот подключён',notLinked:'Telegram-бот ещё не подключён',
    connect:'Подключить Telegram-бота',openBot:'Продолжить в Telegram',refresh:'Проверить подключение',
    automatic:'Автоматически отправлять новые ролики Видеостудии в Telegram',
    consent:'Включая настройку, разрешаю приватно загружать и отправлять готовые MP4 в мой подтверждённый Telegram. Разрешение можно отозвать.',
    renew:'Прежнее разрешение связано с другим или отключённым чатом. Отключите его и включите заново после привязки нового чата.',
    off:'Автоматическая доставка Telegram пока недоступна. Файлы можно скачивать и пересылать вручную.',
    send:'Отправить ботом в Telegram',accepted:'Telegram принял MP4 к отправке; получение и просмотр не подтверждены.',
    duplicate:'Отправка этого MP4 уже выполнялась. Повторного сообщения не будет.',
    unknown:'Отправка не подтверждена. Автоматических повторных попыток не будет.',
    saved:'Настройка автоматической доставки сохранена.',error:'Не удалось изменить настройки доставки. Видео остаются приватными.',
    noReady:'Сохраните MP4 в библиотеке, чтобы отправить его отсюда.',
    manual:'WhatsApp: скачайте MP4 ниже и отправьте через меню телефона. Автоматическая отправка через WhatsApp Business не активирована.',
    quota:'Лимит — три сохранённых ролика по 12 МБ. Чтобы освободить место, удалите старое видео вручную; автоматически ничего не удаляется.',
  },
  es:{
    title:'Entrega de vídeos',intro:'Envía los MP4 guardados a tu chat verificado de Telegram. Puedes activar el envío automático de nuevos vídeos de Video Studio.',
    linked:'Bot de Telegram conectado',notLinked:'El bot de Telegram aún no está conectado',
    connect:'Conectar bot de Telegram',openBot:'Continuar en Telegram',refresh:'Comprobar conexión',
    automatic:'Enviar automáticamente los nuevos vídeos de Video Studio a Telegram',
    consent:'Al activar, autorizo la carga privada y el envío de cada MP4 final a mi chat verificado de Telegram. Puedo revocarlo cuando quiera.',
    renew:'El permiso anterior corresponde a otro chat o a uno desconectado. Desactívalo y vuelve a activarlo después de vincular el chat.',
    off:'El envío automático de Telegram no está disponible. Puedes descargar y compartir los archivos manualmente.',
    send:'Enviar por el bot de Telegram',accepted:'Telegram aceptó el MP4, pero no ha confirmado su entrega ni visualización.',
    duplicate:'Este MP4 ya tiene un intento de entrega; no se duplicará.',
    unknown:'No se pudo confirmar la entrega. No habrá reintentos automáticos.',
    saved:'Preferencia de entrega actualizada.',error:'No se pudo actualizar el envío. Tus vídeos siguen siendo privados.',
    noReady:'Guarda un MP4 en tu biblioteca para enviarlo desde aquí.',
    manual:'WhatsApp: descarga el MP4 y compártelo desde tu teléfono. El envío automático de WhatsApp Business no está activo.',
    quota:'Límite: tres vídeos guardados de 12 MB. Elimina uno antiguo manualmente antes de guardar otro; nunca se borra automáticamente.',
  }
}

const BOT_LINK=/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=[A-Za-z0-9_-]{32}$/
const actionStyle={minHeight:44,padding:'8px 12px'}

export default function PersonalVideoMessengerPanel({accountId,locale='en',videos=[]}){
  const t=COPY[locale]||COPY.en
  const [state,setState]=useState(null)
  const [status,setStatus]=useState('loading')
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [botLink,setBotLink]=useState('')
  const language=['ru','es'].includes(locale)?locale:'en'
  useEffect(()=>{
    let active=true
    setState(null);setStatus('loading');setBotLink('');setNotice('')
    void appFetch('personal-videos/delivery',undefined,'GET',{accountId})
      .then(data=>{if(active){setState(data);setStatus('ready')}})
      .catch(()=>{if(active)setStatus('error')})
    return()=>{active=false}
  },[accountId])

  async function refresh(){
    if(busy)return
    setBusy(true)
    try{
      const next=await appFetch('personal-videos/delivery',undefined,'GET',{accountId})
      setState(next);setNotice('');setStatus('ready')
    }catch{setNotice(t.error)}
    finally{setBusy(false)}
  }
  async function connect(){
    if(busy)return
    setBusy(true);setNotice('')
    try{
      const next=await appFetch('personal-videos/delivery',
        {action:'connect',locale:language,consent:true},'POST',{accountId})
      if(!BOT_LINK.test(String(next.linkUrl||'')))throw new Error('INVALID_BOT_LINK')
      setBotLink(next.linkUrl)
    }catch{setNotice(t.error)}
    finally{setBusy(false)}
  }
  async function toggle(enabled){
    if(busy)return
    setBusy(true);setNotice('')
    try{
      const next=await appFetch('personal-videos/delivery',
        {action:'automatic',enabled,consent:enabled},'POST',{accountId})
      setState(next);setNotice(t.saved)
    }catch{setNotice(t.error)}
    finally{setBusy(false)}
  }
  async function send(videoId){
    if(busy)return
    setBusy(true);setNotice('')
    try{
      // One explicit user click consents to this MP4 only; no contact inference.
      const result=await appFetch('personal-videos/'+videoId+'/delivery',
        {channel:'telegram',automatic:false,consent:true,locale:language},'POST',{accountId})
      setNotice(result.status==='accepted'?t.accepted:
        result.duplicate||result.status==='claimed'?t.duplicate:t.unknown)
    }catch{setNotice(t.unknown)}
    finally{setBusy(false)}
  }

  const telegram=state?.telegram
  const optedIn=telegram?.consentSaved===true
  const active=telegram?.automatic===true
  const ready=videos.filter(video=>video.status==='ready')
  return <section data-personal-video-messenger-panel
    style={{padding:16,margin:'16px 0',border:'1px solid #cbded0',borderRadius:14}}>
    <h2>{t.title}</h2>
    <p>{t.intro}</p>
    {status==='loading'?<p role="status">…</p>:null}
    {status==='error'?<p role="alert">{t.error}</p>:null}
    {telegram?<>
      <p>{telegram.linked?t.linked:t.notLinked}</p>
      {!telegram.linked&&telegram.linkAvailable?
        <button type="button" disabled={busy} onClick={()=>void connect()} style={actionStyle}>
          {t.connect}
        </button>:null}
      {botLink?<p><a href={botLink} target="_blank" rel="noopener noreferrer">{t.openBot}</a></p>:null}
      <button type="button" disabled={busy} onClick={()=>void refresh()} style={actionStyle}>
        {t.refresh}
      </button>
      {(telegram.linked||optedIn)?<label style={{display:'flex',gap:10,margin:'14px 0',alignItems:'start'}}>
        <input type="checkbox" checked={optedIn} disabled={busy||(!optedIn&&(!telegram.linked||!telegram.sendingAvailable))}
          onChange={event=>void toggle(event.target.checked)}
          style={{width:20,height:20,flexShrink:0}}/>
        <span><strong>{t.automatic}</strong><small style={{display:'block'}}>{t.consent}</small></span>
      </label>:null}
      {optedIn&&!active?<p role="status">{t.renew}</p>:null}
      {!telegram.sendingAvailable?<p>{t.off}</p>:null}
      {telegram.linked&&telegram.sendingAvailable?<>
        {ready.length===0?<p>{t.noReady}</p>:null}
        <ul style={{listStyle:'none',padding:0,display:'grid',gap:8}}>
          {ready.map(video=><li key={video.id}>
            <button type="button" disabled={busy}
              data-video-archive-telegram-send={video.id}
              onClick={()=>void send(video.id)} style={actionStyle}>
              {t.send}: {video.theme} · {video.duration}s
            </button>
          </li>)}
        </ul>
      </>:null}
    </>:null}
    <p><small>{t.manual}</small></p>
    <p><small>{t.quota}</small></p>
    {notice?<p role="status" aria-live="polite" data-video-delivery-status>{notice}</p>:null}
  </section>
}
