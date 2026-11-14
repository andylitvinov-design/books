'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCheck, CirclePlay, MessageCircle, Send, ShieldCheck } from 'lucide-react'
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from '@/lib/whatsapp-enquiry'
import styles from './my-coach-human-specialist.module.css'

type Locale = 'en' | 'ru' | 'es'
export type SpecialistVideo = {
  id: string
  title: string
  description: string
  language: Locale
  kind: 'embed' | 'file'
  url: string
  poster: string
  durationSeconds: number | null
}
type Message = {id:string;mine:boolean;text:string;createdAt:string;committed?:boolean}
type Thread = {threadId:string;accountId:string;messages:Message[];requiresMessengerVerification?:boolean;legacyReadOnly?:boolean}
type Props = {
  locale: Locale
  slug: string
  name: string
  role: string
  bio: string
  photo: string
  videos: SpecialistVideo[]
  bookingHref: string
  isOwner: boolean
  canMessage: boolean
}
const textByLocale = {
  en: {
    choose:'Choose another specialist', chooseShort:'Change specialist', badge:'REAL SPECIALIST · VIDEOS',
    recorded:'Recorded introduction · not a live video call', noVideo:'No published videos yet',
    more:'More videos by this specialist', noMore:'More videos will appear after publication.',
    ask:'Ask the specialist', empty:'Ask a question below. Only actual messages with this practitioner will appear here.',
    placeholder:'Write your question…', send:'Send', sending:'Sending…', signIn:'Sign in to message securely',
    book:'Book a personal consultation', note:'The specialist confirms the format, time and price before a booking.',
    guest:'Sign in and verify Telegram for the private website chat, or choose a messenger below.',
    unavailable:'The private message service is temporarily unavailable. Your question has not been sent.',
    verify:'Link and authorize Telegram in Cabinet settings before sending a website message.',
    blocked:'This conversation cannot accept new messages.',
    retry:'Refresh conversation', sent:'Message saved in the verified conversation.',
    question:'Ask in WhatsApp or Telegram', channels:'Choose how to send your question',
    step:'Selecting a channel opens a draft; press Send in the messenger to submit.',
    defaultRequest:'I would like to ask you about a personal consultation.',
    restricted:'This practitioner has no enabled direct messages. Choose a published service to request a consultation.',
    master:'Specialist profile', overview:'Watch original videos'
  },
  ru: {
    choose:'Выбрать другого специалиста',chooseShort:'Другой специалист',badge:'ЖИВОЙ СПЕЦИАЛИСТ · ВИДЕО',
    recorded:'Записи специалиста · это не прямой видеозвонок',noVideo:'Опубликованных видео пока нет',
    more:'Другие видео специалиста',noMore:'Новые видео появятся после публикации.',
    ask:'Задать вопрос специалисту',empty:'Напишите вопрос ниже. Здесь будут только настоящие сообщения из переписки со специалистом.',
    placeholder:'Напишите ваш вопрос…',send:'Отправить',sending:'Отправка…',signIn:'Войти для защищённой переписки',
    book:'Заказать личную консультацию',note:'Специалист отдельно подтверждает формат, время и стоимость консультации.',
    guest:'Для переписки на сайте войдите и подтвердите Telegram либо выберите мессенджер ниже.',
    unavailable:'Переписка на сайте временно недоступна. Сообщение не было отправлено.',
    verify:'Подключите Telegram в настройках кабинета и разрешите ответы, чтобы писать на сайте.',
    blocked:'Отправка сообщений в этой беседе недоступна.',
    retry:'Обновить переписку',sent:'Сообщение сохранено в подтверждённой переписке.',
    question:'Написать через WhatsApp или Telegram',channels:'Выберите канал для отправки вопроса',
    step:'Откроется черновик: для отправки нажмите «Отправить» в мессенджере.',
    defaultRequest:'Хочу задать вопрос о личной консультации.',
    restricted:'У этого специалиста нет активной личной переписки. Выберите опубликованную услугу для записи.',
    master:'Профиль специалиста',overview:'Оригинальные видеоматериалы'
  },
  es: {
    choose:'Elegir otro profesional',chooseShort:'Otro profesional',badge:'PROFESIONAL REAL · VÍDEOS',
    recorded:'Vídeos grabados · no es una videollamada en directo',noVideo:'Aún no hay vídeos publicados',
    more:'Más vídeos del profesional',noMore:'Habrá más vídeos después de su publicación.',
    ask:'Pregunta al profesional',empty:'Escribe tu pregunta. Aquí solo aparecen los mensajes reales de tu conversación.',
    placeholder:'Escribe tu pregunta…',send:'Enviar',sending:'Enviando…',signIn:'Acceder a los mensajes privados',
    book:'Reservar una consulta personal',note:'El profesional confirma el formato, la fecha y el precio antes de reservar.',
    guest:'Inicia sesión y verifica Telegram para mensajes privados o elige un mensajero.',
    unavailable:'El servicio de mensajes no está disponible. Tu pregunta no se ha enviado.',
    verify:'Conecta y autoriza Telegram en la configuración de tu cuenta para escribir aquí.',
    blocked:'No se pueden enviar mensajes en esta conversación.',
    retry:'Actualizar conversación',sent:'Mensaje guardado en la conversación verificada.',
    question:'Preguntar por WhatsApp o Telegram',channels:'Elige dónde enviar tu pregunta',
    step:'Se abrirá un borrador. Pulsa Enviar en la aplicación para remitirlo.',
    defaultRequest:'Quisiera preguntar sobre una consulta personal.',
    restricted:'Este profesional no tiene mensajes directos habilitados. Elige un servicio publicado.',
    master:'Perfil del profesional',overview:'Vídeos originales'
  },
}
function duration(seconds: number | null) {
  if (seconds===null) return ''
  const minutes = Math.floor(seconds/60)
  return String(minutes)+':'+String(seconds%60).padStart(2,'0')
}
function safeMessages(value:unknown): Message[] {
  if (!Array.isArray(value)) return []
  return value.filter((v):v is Message => Boolean(v && typeof v==='object'
    && typeof v.id==='string' && typeof v.mine==='boolean'
    && typeof v.text==='string' && typeof v.createdAt==='string')).slice(-30)
}
/** A blocked third-party YouTube poster must not hide a published practitioner's
 * own profile photo, and failure of that local photo falls back to the frame. */
function VideoArtwork({src,fallback,className,loading='lazy'}:{
  src:string;fallback:string;className?:string;loading?:'lazy'|'eager'
}) {
  const [current,setCurrent] = useState(src || fallback)
  useEffect(()=>setCurrent(src || fallback),[src,fallback])
  if(!current)return null
  return <img src={current} loading={loading} className={className} alt="" aria-hidden="true"
    onError={()=>setCurrent(previous=>previous!==fallback&&fallback?fallback:'')} />
}
export default function HumanSpecialistDialogue({locale,slug,name,role,photo,videos,bookingHref,isOwner,canMessage}:Props) {
  const t = textByLocale[locale]
  const [selected,setSelected] = useState(0)
  const [playing,setPlaying] = useState(false)
  const [draft,setDraft] = useState('')
  const [showChannels,setShowChannels] = useState(false)
  const [mode,setMode] = useState<'loading'|'guest'|'ready'|'verify'|'unavailable'|'restricted'>(canMessage?'loading':'restricted')
  const [accountId,setAccountId] = useState('')
  const [threadId,setThreadId] = useState('')
  const [messages,setMessages] = useState<Message[]>([])
  const [busy,setBusy] = useState(false)
  const [notice,setNotice] = useState('')
  const operation = useRef<{text:string;id:string}|null>(null)
  const activeVideo = videos[selected] || null
  const publicProfileHref = '/'+locale+'/masters/'+slug
  const settingsHref = '/'+locale+'/app/settings#hh-telegram-connect'

  useEffect(() => {
    if(!canMessage){setMode('restricted');return}
    const controller = new AbortController()
    async function initialize() {
      setMode('loading')
      try {
        const res = await fetch('/api/app/direct-messages',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
        const body = await res.json().catch(()=>({}))
        if(!res.ok) {
          if(res.status===401 || body.error==='SIGN_IN_REQUIRED'){setMode('guest');return}
          setMode('unavailable');return
        }
        if(!body.accountId || typeof body.accountId!=='string'){setMode('unavailable');return}
        const threads = Array.isArray(body.threads)?body.threads:[]
        if(controller.signal.aborted)return
        setAccountId(body.accountId)
        const existing = threads.find((thread:{peerMasterSlug?:string;slug?:string;providerBacked?:boolean})=>
          thread.providerBacked===true && (thread.peerMasterSlug===slug || thread.slug===slug))
        if(existing && typeof existing.id==='string') {
          const reply = await fetch('/api/app/direct-messages?threadId='+encodeURIComponent(existing.id),
            {credentials:'same-origin',cache:'no-store',signal:controller.signal})
          const detail = (await reply.json().catch(()=>({}))) as Partial<Thread>
          if(!reply.ok || detail.accountId!==body.accountId || detail.threadId!==existing.id) {
            setMode('unavailable');return
          }
          if(controller.signal.aborted)return
          setThreadId(existing.id)
          setMessages(safeMessages(detail.messages))
          setMode(detail.requiresMessengerVerification||detail.legacyReadOnly?'verify':'ready')
        } else setMode('ready')
      } catch(error) {
        if(!controller.signal.aborted)setMode('unavailable')
      }
    }
    void initialize()
    return ()=>controller.abort()
  },[slug,canMessage])

  async function refreshThread(id:string,ownerId:string) {
    const response = await fetch('/api/app/direct-messages?threadId='+encodeURIComponent(id),
      {credentials:'same-origin',cache:'no-store'})
    const result = (await response.json().catch(()=>({}))) as Partial<Thread>
    if(!response.ok || result.accountId!==ownerId || result.threadId!==id) throw new Error('INBOX_UNAVAILABLE')
    const remote = safeMessages(result.messages)
    // Keep only server-acknowledged messages until they appear in the
    // fetched history; pending/unconfirmed messages are never invented.
    setMessages(previous => {
      const ids = new Set(remote.map(message=>message.id))
      const confirmed = previous.filter(message=>message.committed===true&&!ids.has(message.id))
      return [...remote,...confirmed].slice(-30)
    })
    setMode(result.requiresMessengerVerification||result.legacyReadOnly?'verify':'ready')
  }
  async function post(body:Record<string,unknown>) {
    const response = await fetch('/api/app/direct-messages',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'content-type':'application/json','x-hh-account-id':accountId},body:JSON.stringify(body)})
    const result = await response.json().catch(()=>({}))
    if(!response.ok) throw new Error(typeof result.error==='string'?result.error:'MESSAGE_NOT_SENT')
    return result
  }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if(!text || busy)return
    if(mode==='guest'||mode==='verify'||mode==='unavailable'||mode==='restricted'||!accountId) {
      setShowChannels(true)
      setNotice(mode==='verify'?t.verify:mode==='restricted'?t.restricted:mode==='unavailable'?t.unavailable:t.guest)
      return
    }
    setBusy(true)
    setNotice('')
    try {
      let id = threadId
      if(!id) {
        const started = await post({action:'start',slug})
        if(typeof started.threadId!=='string')throw new Error('INBOX_UNAVAILABLE')
        id=started.threadId
        setThreadId(id)
      }
      if(operation.current?.text!==text)operation.current={text,id:crypto.randomUUID()}
      const committedId = operation.current.id
      const result = await post({action:'send',threadId:id,operationId:committedId,text})
      if(result.saved!==true)throw new Error('MESSAGE_NOT_SAVED')
      // The real server has acknowledged this exact idempotency key. Display
      // the committed turn immediately, even if the subsequent GET is delayed.
      setMessages(previous=>previous.some(message=>message.id===committedId)?previous:
        [...previous,{id:committedId,mine:true,text,createdAt:new Date().toISOString(),committed:true}].slice(-30))
      operation.current=null
      setDraft('')
      setNotice(t.sent)
      // A committed send stays successful even when a follow-up history read fails.
      try { await refreshThread(id,accountId) } catch { /* The message is already saved; refresh can be retried. */ }
    } catch(error) {
      const code = error instanceof Error?error.message:''
      if(['MESSENGER_VERIFICATION_REQUIRED','MESSENGER_REPLY_CONSENT_REQUIRED','MASTER_MESSENGER_NOT_CONNECTED'].includes(code)){
        setMode('verify');setShowChannels(true);setNotice(t.verify)
      } else setNotice(t.unavailable)
    } finally {setBusy(false)}
  }
  function messengerLinks() {
    if(!isOwner)return null // Never route another practitioner's question to Andrey.
    const whatsapp = whatsappEnquiryUrl({
      locale,service:role||name,request:draft.trim()||t.defaultRequest,pagePath:publicProfileHref,
    })
    const telegram = telegramEnquiryUrlFromWhatsApp(whatsapp)
    return <div className={styles.messengerChoices} data-human-specialist-channels>
      <strong>{t.channels}</strong>
      <div className={styles.messengerButtons}>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">WhatsApp</a>
        <a href={telegram} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Telegram</a>
      </div>
      <small>{t.step}</small>
    </div>
  }
  return <main lang={locale} className={styles.page} data-my-coach-human-dialogue data-specialist-slug={slug}>
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={'/'+locale} className={styles.brand} aria-label="Holistic House">
          <img src="/icons/holistic-house-teal.svg" width={42} height={42} alt="" aria-hidden="true"/>
          <span>Holistic House</span>
        </Link>
        <Link href={'/'+locale+'/my-coach#all-coaches'} className={styles.change}>
          <ArrowLeft size={19} aria-hidden="true"/>
          <span className={styles.changeFull}>{t.choose}</span>
          <span className={styles.changeCompact}>{t.chooseShort}</span>
        </Link>
      </header>

      <section className={styles.mediaSection} aria-label={t.overview}>
        <div className={styles.mainVideo} data-human-video-stage>
          {playing && activeVideo
            ? activeVideo.kind==='file'
              ? <video key={activeVideo.id} src={activeVideo.url} autoPlay controls playsInline preload="metadata"
                  className={styles.actualPlayer} aria-label={activeVideo.title}/>
              : <iframe key={activeVideo.id} src={activeVideo.url} title={activeVideo.title}
                  className={styles.actualPlayer} allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
            : <button type="button" className={styles.stagePoster}
                onClick={()=>{if(activeVideo)setPlaying(true)}} disabled={!activeVideo}
                aria-label={activeVideo?locale==='ru'?'Воспроизвести '+activeVideo.title:locale==='es'?'Reproducir '+activeVideo.title:'Play '+activeVideo.title:t.noVideo}>
                {(activeVideo?.poster||photo) && <VideoArtwork key={activeVideo?.id||'empty'}
                  src={activeVideo?.poster||''} fallback={photo} className={styles.stageImage} loading="eager"/>}
                <span className={styles.videoShade}/>
                <span className={styles.videoIdentity}>
                  <span className={styles.videoBadge}>{t.badge}</span>
                  <strong>{name}</strong>
                  {role&&<span>{role}</span>}
                </span>
                {activeVideo?<span className={styles.heroPlay}><CirclePlay size={48} aria-hidden="true"/></span>
                  :<span className={styles.noVideo}>{t.noVideo}</span>}
              </button>}
        </div>
        <p className={styles.recordedNote}><ShieldCheck size={15} aria-hidden="true"/>{t.recorded}</p>
        {videos.length>0&&<div className={styles.reelSection}>
          <div className={styles.reelHeading}><h2>{t.more}</h2><span>{videos.length}</span></div>
          <div className={styles.reel} role="group" aria-label={t.more} data-human-video-reel>
            {videos.map((video,index)=><button type="button" className={styles.videoCard} key={video.id}
              aria-pressed={selected===index} onClick={()=>{setSelected(index);setPlaying(false)}}
              data-human-video-thumb={video.id}>
              <span className={styles.thumbFrame}>
                {(video.poster||photo)&&<VideoArtwork src={video.poster} fallback={photo}/>}
                <span className={styles.thumbPlay} aria-hidden="true">▶</span>
                {duration(video.durationSeconds)&&<small className={styles.duration}>{duration(video.durationSeconds)}</small>}
              </span>
              <span className={styles.thumbText}><strong>{video.title}</strong><small>{video.language.toUpperCase()}</small></span>
            </button>)}
          </div>
        </div>}
      </section>

      <section className={styles.dialogue} aria-labelledby="human-specialist-ask">
        <h2 id="human-specialist-ask"><MessageCircle size={25} aria-hidden="true"/>{t.ask}</h2>
        <div className={styles.thread} aria-live="polite" data-human-specialist-thread>
          {messages.length?messages.map(message=><div className={message.mine?styles.myBubble:styles.theirBubble} key={message.id}>
            {!message.mine&&<strong>{name}</strong>}
            <p>{message.text}</p>
            <small>{new Date(message.createdAt).toLocaleString(locale,{dateStyle:'short',timeStyle:'short'})}
              {message.mine&&<CheckCheck size={14} aria-hidden="true"/>}</small>
          </div>):<p className={styles.emptyMessage}>{t.empty}</p>}
        </div>
        <form className={styles.messageForm} onSubmit={submit}>
          <label htmlFor="hh-human-specialist-question" className={styles.srOnly}>{t.ask}</label>
          <textarea id="hh-human-specialist-question" rows={2} maxLength={1200} value={draft}
            onChange={event=>{setDraft(event.target.value);setNotice('');operation.current=null}}
            placeholder={t.placeholder} disabled={busy} />
          <button type="submit" className={styles.send} disabled={busy||!draft.trim()}
            aria-label={busy?t.sending:t.send}><Send size={22} aria-hidden="true"/></button>
        </form>
        {notice&&<p className={styles.messageNotice} role="status">{notice}</p>}
        {mode==='loading'&&<p className={styles.chatHint} role="status">…</p>}
        {mode==='guest'&&<Link href={'/'+locale+'/app/messages?to='+encodeURIComponent(slug)}
          className={styles.secondaryLink} prefetch={false}>{t.signIn}<ArrowRight size={16} aria-hidden="true"/></Link>}
        {mode==='verify'&&<Link href={settingsHref} className={styles.secondaryLink} prefetch={false}>{t.verify}<ArrowRight size={16} aria-hidden="true"/></Link>}
        {mode==='ready'&&threadId&&<button type="button" className={styles.refresh}
          onClick={()=>{void refreshThread(threadId,accountId).catch(()=>setNotice(t.unavailable))}}>{t.retry}</button>}
        {isOwner&&<button type="button" className={styles.channelToggle}
          onClick={()=>setShowChannels(x=>!x)} aria-expanded={showChannels}>{t.question}<ArrowRight size={15} aria-hidden="true"/></button>}
        {showChannels&&messengerLinks()}
        {mode==='restricted'&&!isOwner&&<Link href={publicProfileHref} className={styles.secondaryLink}>
          {t.master}<ArrowRight size={16} aria-hidden="true"/></Link>}
      </section>

      <Link href={bookingHref} className={styles.book} data-human-specialist-book>
        <CalendarDays size={25} aria-hidden="true"/><span>{t.book}</span><ArrowRight size={23} aria-hidden="true"/>
      </Link>
      <p className={styles.bookingNote}>{t.note}</p>
    </div>
  </main>
}
