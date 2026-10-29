'use client'

import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,IdCard,Link2,MessageCircle,RefreshCw} from 'lucide-react'
import CrmMessengerPanel from './crm-messenger'
import MessagesContactCard from './messages-contact-card'
import DirectMessageInbox from './direct-message-inbox'
import PracticeRequestConversation from './practice-request-conversation'
import styles from './messages-simple-inbox.module.css'
import {availableInboxHeight} from '@/lib/app/mobile-inbox-height.mjs'
import {filterInboxRows,inMessagesTab,normalizeMessagesTab} from '@/lib/app/messages-inbox-tabs.mjs'

const COPY={
  en:{title:'Messages',hint:'Conversations and requests',search:'Find a person',empty:'No messages or requests yet.',
    tabs:'Message folders',chats:'Conversations',requestsTab:'Requests',emptyChats:'No conversations yet.',emptyRequests:'No client requests yet.',noMatches:'No matching people.',
    choose:'Select a person to read the conversation',back:'Conversations',card:'Client card',refresh:'Refresh',loading:'Loading conversations…',
    telegram:'Telegram',website:'Website request',business:'Business request',direct:'Holistic House',
    waiting:'Waiting for your reply',received:'Received',details:'Request',contact:'Contact details',
    replyWebsite:'Reply in the protected client cabinet',openCase:'Full request',manual:'Open WhatsApp to reply',
    email:'Reply by email',unavailable:'Website requests could not be loaded; existing chats remain available.',
    offline:'Offline — reconnect to read and send messages.',botLink:'Copy Telegram link',botCopied:'Link copied',updated:'Updated',noMessage:'No description supplied',private:'Replies to website contacts are not sent through Telegram automatically.',
    more:'More conversations',other:'Other requests',portal:'Private website conversations'},
  ru:{title:'Сообщения',hint:'Диалоги и заявки',search:'Найти человека',empty:'Пока нет сообщений и заявок.',
    tabs:'Разделы сообщений',chats:'Переписка',requestsTab:'Заявки',emptyChats:'Пока нет переписок.',emptyRequests:'Пока нет заявок.',noMatches:'Ничего не найдено.',
    choose:'Выберите человека, чтобы открыть переписку',back:'К списку',card:'Карточка',refresh:'Обновить',loading:'Загружаем переписки…',
    telegram:'Telegram',website:'Заявка с сайта',business:'Бизнес-заявка',direct:'Holistic House',
    waiting:'Ждёт вашего ответа',received:'Получена',details:'Заявка',contact:'Контакты',
    replyWebsite:'Ответить в защищённом кабинете',openCase:'Вся заявка',manual:'Ответить через WhatsApp',
    email:'Ответить по email',unavailable:'Заявки сайта сейчас недоступны, но переписка остаётся открытой.',
    offline:'Нет интернета — для загрузки и отправки сообщений требуется соединение.',botLink:'Копировать ссылку Telegram',botCopied:'Ссылка скопирована',updated:'Обновлено',noMessage:'Описание не указано',private:'Ответы на заявки сайта не отправляются в Telegram автоматически.',
    more:'Ещё диалоги',other:'Другие заявки',portal:'Личная переписка на сайте'},
  es:{title:'Mensajes',hint:'Conversaciones y solicitudes',search:'Buscar persona',empty:'Aún no hay mensajes ni solicitudes.',
    tabs:'Carpetas de mensajes',chats:'Recibidos',requestsTab:'Solicitudes',emptyChats:'Aún no hay conversaciones.',emptyRequests:'Aún no hay solicitudes.',noMatches:'No se encontraron personas.',
    choose:'Elige una persona para abrir la conversación',back:'Volver',card:'Ficha',refresh:'Actualizar',loading:'Cargando conversaciones…',
    telegram:'Telegram',website:'Solicitud web',business:'Solicitud de negocio',direct:'Holistic House',
    waiting:'Esperando tu respuesta',received:'Recibida',details:'Solicitud',contact:'Contacto',
    replyWebsite:'Responder en el portal privado',openCase:'Solicitud completa',manual:'Responder por WhatsApp',
    email:'Responder por correo',unavailable:'No están disponibles las solicitudes web, pero puedes leer tus chats.',
    offline:'Sin conexión — conéctate para leer y enviar mensajes.',botLink:'Copiar enlace de Telegram',botCopied:'Enlace copiado',updated:'Actualizado',noMessage:'Sin descripción',private:'No se envían respuestas web automáticamente por Telegram.',
    more:'Más conversaciones',other:'Otras solicitudes',portal:'Conversaciones privadas del sitio'},
}
const channelNames={telegram:'Telegram',whatsapp:'WhatsApp',instagram:'Instagram',messenger:'Messenger'}
const validId=value=>/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(value||''))
const fmtDate=(value,locale)=>{
  const ms=Date.parse(value||'')
  if(!Number.isFinite(ms))return ''
  return new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',timeZone:'America/Toronto'}).format(new Date(ms))
}
const nameOf=(contact,fallback)=>contact?.displayName||contact?.name||contact?.fullName||
  contact?.email||fallback
const cleanPhone=value=>{
  const number=String(value||'').replace(/\D/g,'')
  return number.length>=8&&number.length<=15?number:null
}
const fallbackPortrait=(name)=>Array.from((String(name||'?').trim()||'?'))[0]?.toUpperCase()||'?'

// Private avatar: never use a Telegram CDN URL or raw Telegram file identifier.
// If no verified portrait exists, show the person's initial instead.
function PrivateAvatar({accountId,name,portrait,small=false}){
  const [src,setSrc]=useState('')
  const threadId=portrait?.threadId||''
  const messageId=portrait?.messageId||''
  useEffect(()=>{
    setSrc('')
    if(!accountId||!threadId||!messageId)return
    const controller=new AbortController()
    let blobUrl=''
    const params=new URLSearchParams({threadId,messageId})
    fetch('/api/app/crm/messenger/photo?'+params.toString(),{
      credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'X-HH-Account-Id':accountId},
    }).then(async response=>{
      if(!response.ok)throw new Error('PHOTO_UNAVAILABLE')
      const blob=await response.blob()
      if(!blob.type.startsWith('image/')||blob.size>5*1024*1024)return
      if(controller.signal.aborted)return
      blobUrl=URL.createObjectURL(blob)
      setSrc(blobUrl)
    }).catch(()=>{})
    return()=>{controller.abort();if(blobUrl)URL.revokeObjectURL(blobUrl)}
  },[accountId,threadId,messageId])
  return <span className={small?styles.avatarSmall:styles.avatar} aria-hidden="true">
    {src?<img src={src} alt="" loading="lazy"/>:fallbackPortrait(name)}
  </span>
}

// Presentation only: existing CRM, practitioner and private-message APIs retain their
// independent authorization, storage, consent and actual send policies.
export default function MessagesSimpleInbox({
  locale='en',accountId,requests=[],businessEnquiries=[],telegramUrl='',
  websiteLoading=false,websiteUnavailable=false,onReload,initialDirectThreadId='',
}){
  const t=COPY[locale]||COPY.en
  const [crmState,setCrmState]=useState({loading:true,error:false,threads:[],partial:false})
  const [directThreads,setDirectThreads]=useState([])
  const [portraits,setPortraits]=useState({})
  const [selectedKey,setSelectedKey]=useState('')
  const [search,setSearch]=useState('')
  const [tab,setTab]=useState('chats')
  const [linkCopied,setLinkCopied]=useState(false)
  const [openDetail,setOpenDetail]=useState(false)
  const [showCard,setShowCard]=useState(false)
  const inboxWindowRef=useRef(null)
  const openedLinkRef=useRef('')
  const [refreshNonce,setRefreshNonce]=useState(0)
  const [offline,setOffline]=useState(false)
  useEffect(()=>{
    const syncNetwork=()=>setOffline(navigator.onLine===false)
    syncNetwork()
    window.addEventListener('online',syncNetwork)
    window.addEventListener('offline',syncNetwork)
    return()=>{
      window.removeEventListener('online',syncNetwork)
      window.removeEventListener('offline',syncNetwork)
    }
  },[])
  useEffect(()=>{
    const query=new URLSearchParams(window.location.search)
    setTab(normalizeMessagesTab(query.get('tab')))
  },[accountId])
  const onCrmThreads=useCallback(result=>setCrmState(result),[])
  const onDirectThreads=useCallback(result=>setDirectThreads(Array.isArray(result)?result:[]),[])
  const onPortraitFound=useCallback(({threadId,messageId})=>{
    setPortraits(old=>old[threadId]===messageId?old:{...old,[threadId]:messageId})
  },[])
  const rows=useMemo(()=>{
    const crm=(crmState.threads||[]).map(item=>({
      key:'crm:'+item.id,kind:'crm',id:item.id,contactId:item.contactId,lifecycle:item.lifecycle,name:item.name||t.choose,
      source:channelNames[item.channel]||item.channel,unread:Number(item.unreadCount)||0,
      needsReply:Boolean(item.needsReply),at:item.lastMessageAt||item.lastInboundAt,
      preview:item.needsReply?t.waiting:channelNames[item.channel]||item.channel,
    }))
    const portal=directThreads.map(item=>({
      key:'direct:'+item.id,kind:'direct',id:item.id,peerMasterSlug:item.peerMasterSlug||'',name:item.peerName||t.portal,
      source:t.direct,unread:Number(item.unread)||0,needsReply:(Number(item.unread)||0)>0,
      at:item.updatedAt,preview:t.portal,
    }))
    const incoming=requests.filter(item=>validId(item.id)).map(item=>({
      key:'request:'+item.id,kind:'request',id:item.id,item,
      name:nameOf(item.contact,t.website),source:t.website,
      unread:Number(item.newMessageCount)||0,
      needsReply:Boolean(item.needsReply),at:item.lastConversationAt||item.createdAt,
      preview:(item.message||'').trim().slice(0,90)||t.website,
    }))
    const business=businessEnquiries.filter(item=>validId(item.id)).map(item=>({
      key:'business:'+item.id,kind:'business',id:item.id,item,
      name:item.name||t.business,source:t.business,
      unread:0,needsReply:['new','contacted'].includes(item.status),
      at:item.createdAt,preview:(item.question||'').trim().slice(0,90)||t.business,
    }))
    return [...crm,...portal,...incoming,...business].sort((a,b)=>
      Number(b.unread>0)-Number(a.unread>0)||
      Number(b.needsReply)-Number(a.needsReply)||
      (Date.parse(b.at||'')||0)-(Date.parse(a.at||'')||0))
  },[crmState.threads,directThreads,requests,businessEnquiries,t])
  const selected=rows.find(item=>item.key===selectedKey)||null
  // One canonical owner-scoped row set: filter by source, never duplicate a CRM lead.
  const chatsCount=filterInboxRows(rows,'chats').length
  const requestsCount=filterInboxRows(rows,'requests').length
  const tabTotal=tab==='requests'?requestsCount:chatsCount
  const tabLoading=tab==='requests'?(websiteLoading||crmState.loading):crmState.loading
  const displayed=filterInboxRows(rows,tab,search)
  const unreadCount=rows.reduce((sum,item)=>sum+Math.max(0,item.unread),0)
  const crmThreadId=selected?.kind==='crm'?selected.id:''
  const directThreadId=selected?.kind==='direct'?selected.id:''

  // Open a lock-screen deep link only when the signed-in user's own verified
  // inbox contains this thread. A URL UUID by itself grants no access.
  useEffect(()=>{
    if(!accountId||!initialDirectThreadId)return
    const opening=accountId+':'+initialDirectThreadId
    if(openedLinkRef.current===opening)return
    const key='direct:'+initialDirectThreadId
    if(!rows.some(row=>row.key===key))return
    openedLinkRef.current=opening
    setTab('chats');setSearch('');setSelectedKey(key);setOpenDetail(true);setShowCard(false)
  },[accountId,initialDirectThreadId,rows])

  useEffect(()=>{
    setSelectedKey('');setOpenDetail(false);setShowCard(false);setCrmState({loading:true,error:false,threads:[],partial:false})
    setDirectThreads([]);setPortraits({})
  },[accountId])
  // Safari's keyboard shrinks the visual viewport but does NOT reliably update
  // vh/dvh sizing. Size the conversation to the actually visible area and
  // hide the fixed bottom navigation only while an editor has focus.
  useEffect(()=>{
    const windowElement=inboxWindowRef.current
    if(!windowElement)return
    let frame=0
    const update=()=>{
      if(!window.matchMedia('(max-width:700px)').matches){
        windowElement.style.removeProperty('--hh-mobile-window-height')
        return
      }
      const visual=window.visualViewport
      const bottom=visual?visual.offsetTop+visual.height:window.innerHeight
      const top=windowElement.getBoundingClientRect().top
      const focused=windowElement.contains(document.activeElement)&&
        /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName||'')
      const nav=document.querySelector('.hh-mobile-app-nav')
      const navVisible=nav&&window.getComputedStyle(nav).display!=='none'
      const navTop=navVisible&&!focused?nav.getBoundingClientRect().top:null
      const height=availableInboxHeight({
        visualBottom:bottom,windowTop:top,navigationTop:navTop,gutter:8,
      })
      if(height!==null&&windowElement.style.getPropertyValue('--hh-mobile-window-height')!==height+'px')
        windowElement.style.setProperty('--hh-mobile-window-height',height+'px')
    }
    const requestUpdate=()=>{
      if(frame)window.cancelAnimationFrame(frame)
      frame=window.requestAnimationFrame(update)
    }
    const visual=window.visualViewport
    requestUpdate()
    window.addEventListener('resize',requestUpdate)
    window.addEventListener('scroll',requestUpdate,{passive:true})
    document.addEventListener('focusin',requestUpdate)
    document.addEventListener('focusout',requestUpdate)
    visual?.addEventListener('resize',requestUpdate)
    visual?.addEventListener('scroll',requestUpdate)
    return ()=>{
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize',requestUpdate)
      window.removeEventListener('scroll',requestUpdate)
      document.removeEventListener('focusin',requestUpdate)
      document.removeEventListener('focusout',requestUpdate)
      visual?.removeEventListener('resize',requestUpdate)
      visual?.removeEventListener('scroll',requestUpdate)
      windowElement.style.removeProperty('--hh-mobile-window-height')
    }
  },[openDetail]) // Tabs collapse while reading a chat; remeasure against the new top edge.

  const select=item=>{
    setSelectedKey(item.key)
    setShowCard(false)
    setOpenDetail(true)
  }
  const switchTab=next=>{
    if(next!=='chats'&&next!=='requests')return
    setTab(next)
    // Return to the list on phones without disposing an in-flight reply or draft.
    setOpenDetail(false)
    const url=new URL(window.location.href)
    if(next==='requests')url.searchParams.set('tab','requests')
    else url.searchParams.delete('tab')
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
  }
  const publicBotUrl=typeof telegramUrl==='string'&&/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}$/.test(telegramUrl)?telegramUrl:''
  const refresh=()=>{
    setRefreshNonce(n=>n+1)
    onReload?.()
  }

  return <section className={styles.shell} aria-label={t.title} data-simple-messages data-detail-open={openDetail?'true':'false'}>
    {offline&&<p className={styles.offline} role="status">{t.offline}</p>}
    <header className={styles.heading}>
      <div><h1>{t.title}</h1><span>{t.hint}{unreadCount>0?' · '+unreadCount:''}</span></div>
      <div className={styles.headingActions}>
        {publicBotUrl&&<button type="button" className={styles.shareLink}
          title={t.botLink} aria-label={t.botLink}
          onClick={async()=>{
            try{await navigator.clipboard.writeText(publicBotUrl);setLinkCopied(true)}
            catch{setLinkCopied(false)}
          }}><Link2 size={16} aria-hidden="true"/>
          <span>{linkCopied?t.botCopied:'Telegram'}</span>
        </button>}
        <button type="button" className={styles.refresh} onClick={refresh}
          aria-label={t.refresh} title={t.refresh}>
          <RefreshCw size={19} aria-hidden="true"/>
        </button>
      </div>
    </header>
    <div className={styles.tabs} role="tablist" aria-label={t.tabs}>
      {[['chats',t.chats,chatsCount],['requests',t.requestsTab,requestsCount]].map(([id,label,count])=>
        <button type="button" role="tab" key={id} id={'hh-simple-tab-'+id}
          aria-controls="hh-simple-list-panel" aria-selected={tab===id} tabIndex={tab===id?0:-1}
          onClick={()=>switchTab(id)}
          onKeyDown={event=>{
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
            event.preventDefault()
            const next=event.key==='Home'?'chats':event.key==='End'?'requests':
              event.key==='ArrowRight'?'requests':'chats'
            switchTab(next)
            document.getElementById('hh-simple-tab-'+next)?.focus()
          }}>
          {label}<span aria-hidden="true">{count}</span>
        </button>)}
    </div>
    <div className={styles.window} ref={inboxWindowRef}>
      <aside className={styles.people} id="hh-simple-list-panel" role="tabpanel"
        aria-labelledby={'hh-simple-tab-'+tab}>
        <label className={styles.search}>
          <span className={styles.srOnly}>{t.search}</span>
          <input type="search" value={search} placeholder={t.search}
            onChange={e=>setSearch(e.target.value)} autoComplete="off"/>
        </label>
        <div className={styles.peopleScroll}>
          {!tabTotal&&tabLoading?<p className={styles.info} role="status">{t.loading}</p>:null}
          {!tabTotal&&!tabLoading?<p className={styles.info}>{tab==='requests'?t.emptyRequests:t.emptyChats}</p>:null}
          {tabTotal>0&&!displayed.length&&search.trim()&&<p className={styles.info}>{t.noMatches}</p>}
          {crmState.error&&<p role="alert" className={styles.info}>{t.unavailable}</p>}
          {websiteUnavailable&&tab==='requests'&&<p role="alert" className={styles.info}>{t.unavailable}</p>}
          {displayed.map(row=><button type="button" key={row.key}
            aria-pressed={selectedKey===row.key}
            className={selectedKey===row.key?styles.personSelected:styles.person}
            onClick={()=>select(row)}>
            <PrivateAvatar accountId={accountId} name={row.name}
              portrait={row.kind==='crm'&&portraits[row.id]?{threadId:row.id,messageId:portraits[row.id]}:null}/>
            <span className={styles.personText}>
              <span className={styles.personHead}><strong>{row.name}</strong><time>{fmtDate(row.at,locale)}</time></span>
              <span className={styles.preview}>{row.preview||row.source}</span>
              <small>{row.source}</small>
            </span>
            {row.unread>0?<span className={styles.unread} aria-label={String(row.unread)}>{row.unread}</span>:
              row.needsReply?<span className={styles.needsReplyDot} aria-label={t.waiting}/>:null}
          </button>)}
          {tab==='chats'&&crmState.partial&&<a className={styles.history}
            href={'/'+locale+'/app/practice?panel=crm&crmTab=messages'}>{t.more}</a>}
        </div>
      </aside>
      <div className={styles.detail} aria-live="polite"
        hidden={Boolean(selected)&&!inMessagesTab(selected,tab)}>
        {selected&&<header className={styles.personBar}>
          <button type="button" className={styles.back} onClick={()=>{setOpenDetail(false);setShowCard(false)}}
            aria-label={t.back}><ArrowLeft size={21} aria-hidden="true"/></button>
          <PrivateAvatar small accountId={accountId} name={selected.name}
            portrait={selected.kind==='crm'&&portraits[selected.id]?{threadId:selected.id,messageId:portraits[selected.id]}:null}/>
          <span className={styles.personLabel}><strong>{selected.name}</strong><small>{selected.source}</small></span>
          {selected.unread>0&&<span className={styles.unread}>{selected.unread}</span>}
          <button type="button" className={styles.cardButton} aria-label={t.card} aria-pressed={showCard}
            onClick={()=>setShowCard(value=>!value)}><IdCard size={17} aria-hidden="true"/><span>{t.card}</span></button>
        </header>}
        {!selected&&<div className={styles.placeholder}>
          <MessageCircle size={34} aria-hidden="true"/>
          <p>{t.choose}</p>
        </div>}
        {showCard&&selected&&<MessagesContactCard key={accountId+':'+selected.key}
          item={selected} accountId={accountId} locale={locale} onBack={()=>setShowCard(false)}/>}
        <div className={styles.chatHolder} hidden={showCard||selected?.kind!=='crm'}>
          <CrmMessengerPanel key={accountId+':'+refreshNonce} accountId={accountId}
            locale={locale} conversationOnly onThreadsLoaded={onCrmThreads} onPortraitFound={onPortraitFound}
            initialThreadId={crmThreadId}/>
        </div>
        <div className={styles.chatHolder} hidden={showCard||selected?.kind!=='direct'}>
          <DirectMessageInbox key={accountId+':direct:'+refreshNonce} locale={locale}
            simpleDetail expectedAccountId={accountId} initialThreadId={directThreadId} onThreadsLoaded={onDirectThreads}/>
        </div>
        {!showCard&&selected?.kind==='request'&&<div className={styles.requestPane}>
          <div className={styles.requestBubble}>
            <small>{t.details} · {fmtDate(selected.item.createdAt,locale)}</small>
            <p>{selected.item.message||t.noMessage}</p>
          </div>
          {selected.item.requestKind!=='public'?
            <PracticeRequestConversation key={selected.id} inline autoOpen
              locale={locale} accountId={accountId} requestId={selected.id}
              initialMessage="" createdAt={selected.item.createdAt} onSaved={onReload} onViewed={onReload}/>:
            <div className={styles.requestActions}>
              <p>{t.private}</p>
              <Link href={'/'+locale+'/app/practice?panel=clients&requestId='+encodeURIComponent(selected.id)}>
                {t.openCase} <ArrowRight size={16} aria-hidden="true"/></Link>
            </div>}
        </div>}
        {!showCard&&selected?.kind==='business'&&<div className={styles.requestPane}>
          <div className={styles.requestBubble}>
            <small>{t.details} · {fmtDate(selected.item.createdAt,locale)}</small>
            <p>{selected.item.question||t.noMessage}</p>
          </div>
          <div className={styles.requestActions}>
            <strong>{t.contact}</strong>
            {selected.item.email&&<span>{selected.item.email}</span>}
            {selected.item.phone&&<span>{selected.item.phone}</span>}
            {selected.item.replyChannel==='whatsapp'&&cleanPhone(selected.item.phone)&&
              <a href={'https://wa.me/'+cleanPhone(selected.item.phone)}
                target="_blank" rel="noopener noreferrer">{t.manual} <ArrowRight size={16} aria-hidden="true"/></a>}
            {selected.item.replyChannel==='email'&&selected.item.email&&
              <a href={'mailto:'+encodeURIComponent(selected.item.email)}>{t.email} <ArrowRight size={16} aria-hidden="true"/></a>}
            <small>{t.private}</small>
          </div>
        </div>}
      </div>
    </div>
  </section>
}
