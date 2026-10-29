'use client'
import {useCallback,useEffect,useState} from 'react'
import {ArrowRight,ClipboardList,Link2,MessageCircle,ShieldCheck} from 'lucide-react'
import {useSearchParams} from 'next/navigation'
import DirectMessageInbox from './direct-message-inbox'
import CrmMessengerPanel from './crm-messenger'
import MessagesClientRequests from './messages-client-requests'
import MessagesSimpleInbox from './messages-simple-inbox'
import styles from './messages-hub.module.css'

const COPY={
  en:{title:'Messages',subtitle:'Private conversations and client enquiries, together.',sources:'Message source',crmSource:'Messengers',directSource:'On-site',
    telegramShare:'Telegram link',telegramCopy:'Copy',telegramCopied:'Copied',chats:'Conversations',requests:'Client requests',crm:'Telegram & other connected channels',direct:'Private conversations inside Holistic House',openCrm:'View Telegram conversations',
    crmHint:'Owner-only CRM conversations. Replies depend on verified provider delivery.',
    refresh:'Refresh requests',loading:'Loading requests…',failure:'Could not load client requests. Please retry.',
    ownerLead:'New Telegram & messenger requests',ownerUnread:'unread messages',otherLoading:'Loading other requests…',sessionRequired:'This browser is not signed in to the Holistic House cabinet. Log in to see your messages.',signIn:'Sign in to view client enquiries',privacy:'Only you and the assigned practitioner can see private request conversations.'},
  ru:{title:'Сообщения',subtitle:'Переписка и заявки клиентов — в одном удобном месте.',sources:'Источник сообщений',crmSource:'Мессенджеры',directSource:'На сайте',
    telegramShare:'Ссылка Telegram',telegramCopy:'Копировать',telegramCopied:'Скопировано',chats:'Переписка',requests:'Заявки',crm:'Telegram и другие подключённые каналы',direct:'Личная переписка внутри Holistic House',openCrm:'Открыть Telegram-переписки',
    crmHint:'Переписки владельца в CRM. Доставка ответа зависит от подтверждения провайдера.',
    refresh:'Обновить заявки',loading:'Загружаю заявки…',failure:'Не удалось загрузить заявки. Повторите попытку.',
    ownerLead:'Новые обращения Telegram и мессенджеров',ownerUnread:'непрочитанных сообщений',otherLoading:'Загружаем остальные заявки…',sessionRequired:'В этом браузере не выполнен вход в кабинет Holistic House. Войдите в аккаунт владельца, чтобы увидеть и открыть сообщения.',signIn:'Войдите, чтобы посмотреть заявки',privacy:'Личные ответы видят только клиент и назначенный мастер.'},
  es:{title:'Mensajes',subtitle:'Conversaciones privadas y solicitudes de clientes en un lugar.',sources:'Origen de mensajes',crmSource:'Mensajería',directSource:'En el sitio',
    telegramShare:'Enlace Telegram',telegramCopy:'Copiar',telegramCopied:'Copiado',chats:'Conversaciones',requests:'Solicitudes',crm:'Telegram y otros canales conectados',direct:'Mensajes privados dentro de Holistic House',openCrm:'Abrir conversaciones de Telegram',
    crmHint:'Mensajes del CRM del propietario. La entrega depende de la confirmación del proveedor.',
    refresh:'Actualizar solicitudes',loading:'Cargando solicitudes…',failure:'No se pudieron cargar las solicitudes.',
    ownerLead:'Nuevas solicitudes de Telegram y mensajería',ownerUnread:'mensajes sin leer',otherLoading:'Cargando otras solicitudes…',sessionRequired:'Inicia sesión en la cuenta de Holistic House para ver los mensajes de esta conversación.',signIn:'Inicia sesión para ver las solicitudes',privacy:'Las conversaciones privadas solo son visibles para el cliente y su profesional.'},
}
const VALID_TABS=new Set(['chats','requests'])
export default function MessagesHub({locale='en',embedded=false,onClientsCount=undefined,onDetailChange=undefined}){
  const searchParams=useSearchParams()
  const t=COPY[locale]||COPY.en
  const [tab,setTab]=useState('chats')
  const [refreshKey,setRefreshKey]=useState(0)
  const [data,setData]=useState(null)
  const [ownerInfo,setOwnerInfo]=useState(null)
  const [ownerBootstrapPending,setOwnerBootstrapPending]=useState(true)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [unauthenticated,setUnauthenticated]=useState(false)
  const [bootstrapSignInRequired,setBootstrapSignInRequired]=useState(false)
  const [crmSummary,setCrmSummary]=useState(null)
  const [crmThreadToOpen,setCrmThreadToOpen]=useState({id:'',sequence:0})
  const [source,setSource]=useState('crm')
  const [crmOpen,setCrmOpen]=useState(false)
  const [directOpen,setDirectOpen]=useState(false)
  const [telegramUrl,setTelegramUrl]=useState('')
  const [telegramCopied,setTelegramCopied]=useState(false)
  const [directDestination,setDirectDestination]=useState('')
  const onCrmThreads=useCallback(summary=>setCrmSummary(summary),[])
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    const to=params.get('to')||''
    setDirectDestination(/^[a-z0-9-]{2,90}$/.test(to)?to:'')
    setTab(params.has('to')?'chats':VALID_TABS.has(params.get('tab'))?params.get('tab'):'chats')
  },[searchParams])
  useEffect(()=>{
    const controller=new AbortController()
    // Verify owner access without waiting for practice/business requests.
    setOwnerInfo(null);setBootstrapSignInRequired(false);setOwnerBootstrapPending(true)
    fetch('/api/app/messages/requests?view=owner',{
      credentials:'same-origin',cache:'no-store',signal:controller.signal,
    }).then(async response=>{
      if(response.status===401){if(!controller.signal.aborted)setBootstrapSignInRequired(true);return null}
      if(!response.ok)return null
      const value=await response.json()
      return typeof value.accountId==='string'&&typeof value.ownerMessenger==='boolean'?value:null
    }).then(result=>{if(!controller.signal.aborted)setOwnerInfo(result)})
      .catch(()=>{if(!controller.signal.aborted)setOwnerInfo(null)})
      .finally(()=>{if(!controller.signal.aborted)setOwnerBootstrapPending(false)})
    return()=>controller.abort()
  },[refreshKey])
  useEffect(()=>{
    const controller=new AbortController()
    setLoading(true);setError('');setUnauthenticated(false);setData(null);setCrmSummary(null);setCrmThreadToOpen({id:'',sequence:0})
    fetch('/api/app/messages/requests',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async response=>{
        const result=await response.json().catch(()=>({}))
        if(!response.ok){
          if(response.status===401)throw new Error('SIGN_IN_REQUIRED')
          throw new Error(result.error||'REQUESTS_UNAVAILABLE')
        }
        if(!Array.isArray(result.requests)||!Array.isArray(result.businessEnquiries)||!result.accountId)
          throw new Error('REQUESTS_UNAVAILABLE')
        return result
      }).then(result=>{if(!controller.signal.aborted)setData(result)})
      .catch(failure=>{
        if(!controller.signal.aborted){
          setUnauthenticated(failure.message==='SIGN_IN_REQUIRED')
          setError(t.failure)
        }
      }).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[refreshKey,t.failure])
  // Account-bound responses must agree before any CRM threads can be shown.
  const sameAccount=!data||!ownerInfo||data.accountId===ownerInfo.accountId
  const usableData=sameAccount?data:null
  const ownerAccountId=sameAccount
    ?ownerInfo?.ownerMessenger?ownerInfo.accountId:data?.ownerMessenger?data.accountId:null
    :null
  // Slow/failed website requests must not prevent reading existing owner Telegram threads.
  const requestData=usableData||(ownerAccountId?{
    accountId:ownerAccountId,ownerMessenger:true,ownerAuthorized:true,
    hasPractice:true,requests:[],businessEnquiries:[],services:[],
    websiteUnavailable:!loading,websiteLoading:loading,businessUnavailable:false,
  }:null)
  useEffect(()=>{
    if(!ownerAccountId){setTelegramUrl('');return}
    const controller=new AbortController()
    fetch('/api/public/telegram-diagnostic',{cache:'no-store',signal:controller.signal})
      .then(response=>response.ok?response.json():null)
      .then(result=>{
        if(controller.signal.aborted)return
        const url=result?.available===true?result.url:''
        setTelegramUrl(typeof url==='string'&&/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}$/.test(url)?url:'')
      }).catch(()=>{if(!controller.signal.aborted)setTelegramUrl('')})
    return()=>controller.abort()
  },[ownerAccountId])
  const safeCrmSummary=ownerAccountId?crmSummary:null
  const crmLeads=(safeCrmSummary?.threads||[]).filter(item=>item.lifecycle==='lead')
  const crmUnreadLeads=crmLeads.filter(item=>item.unreadCount>0)
  const crmUnreadMessages=crmLeads.reduce((total,item)=>total+(Number(item.unreadCount)||0),0)
  const switchTab=next=>{
    if(!VALID_TABS.has(next))return
    setTab(next)
    const url=new URL(window.location.href)
    if(next==='requests')url.searchParams.set('tab','requests')
    else url.searchParams.delete('tab')
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
  }
  const openCrmThread=id=>{
    if(!ownerAccountId||!/^[0-9a-f-]{36}$/i.test(id))return
    setCrmThreadToOpen(previous=>({id,sequence:previous.sequence+1}))
    setSource('crm')
    switchTab('chats')
  }
  // Owner-only one-window inbox. Preserve the existing authenticated provider
  // link check and member two-tab UI; no duplicate CRM or public send action.
  // A verified owner may also order from another practitioner. Keep this
  // private voice chat in the existing direct-messages store, not owner CRM.
  if(ownerAccountId&&directDestination)return <div className={styles.hub} data-private-direct-order-chat>
    <a href={'/'+locale+'/app/messages?section=clients'}>{locale==='ru'?'← К клиентам':locale==='es'?'← Clientes':'← Clients'}</a>
    <DirectMessageInbox key={ownerAccountId+':'+directDestination} locale={locale} embedded
      ownerCrmAvailable expectedAccountId={ownerAccountId}/>
  </div>
  if(ownerAccountId)return <MessagesSimpleInbox key={ownerAccountId} locale={locale}
    accountId={ownerAccountId} requests={requestData?.requests||[]}
    businessEnquiries={requestData?.businessEnquiries||[]}
    telegramUrl={telegramUrl}
    websiteLoading={loading} websiteUnavailable={!usableData&&!loading}
    onReload={()=>setRefreshKey(n=>n+1)} embedded={embedded}
    onClientsCount={onClientsCount} onDetailChange={onDetailChange}/>
  if(ownerBootstrapPending&&!data)return <p className={styles.authNotice} role="status">{t.loading}</p>
  // Practitioner and ordinary member accounts share the same compact protected
  // conversation-list UI, WITHOUT connecting to the owner-only Telegram CRM.
  // Their direct threads and assigned requests remain separately authorized.
  if(embedded&&requestData?.accountId)return <MessagesSimpleInbox
    key={requestData.accountId+':member'} locale={locale}
    accountId={requestData.accountId} requests={requestData.requests||[]}
    businessEnquiries={requestData.businessEnquiries||[]}
    crmEnabled={false} embedded websiteLoading={loading}
    websiteUnavailable={!usableData&&!loading}
    onClientsCount={onClientsCount} onDetailChange={onDetailChange}
    onReload={()=>setRefreshKey(value=>value+1)}/>
  if(embedded)return <p className={styles.authNotice}
    role={unauthenticated||bootstrapSignInRequired?'alert':'status'}>
    {unauthenticated||bootstrapSignInRequired?t.sessionRequired:loading?t.loading:t.failure}{' '}
    {(unauthenticated||bootstrapSignInRequired)&&
      <a href={'/'+(locale==='es'?'en':locale)+'/app/portrait'}>{t.signIn}</a>}
  </p>
  return <div className={styles.hub} data-messages-hub
    data-thread-open={tab==='chats'&&(ownerAccountId?(source==='crm'?crmOpen:directOpen):directOpen)||undefined}>
    <div className={styles.hero}>
      <div className={styles.icon}><MessageCircle aria-hidden="true"/></div>
      <div><span className={styles.eyebrow}>HOLISTIC HOUSE · INBOX</span>
        <h1>{t.title}</h1><p>{t.subtitle}</p></div>
      {ownerAccountId&&telegramUrl&&<div className={styles.telegramShare}>
        <a href={telegramUrl} target="_blank" rel="noopener noreferrer nofollow"
          referrerPolicy="no-referrer"><Link2 size={15} aria-hidden="true"/>{t.telegramShare}</a>
        <button type="button" onClick={async()=>{
          try{
            await navigator.clipboard.writeText(telegramUrl)
            setTelegramCopied(true)
          }catch{setTelegramCopied(false)}
        }}>{telegramCopied?t.telegramCopied:t.telegramCopy}</button>
      </div>}
    </div>
    {ownerAccountId&&crmUnreadLeads.length>0&&<button type="button"
      className={styles.unreadJump} onClick={()=>switchTab('requests')}>
      <span><strong>{t.ownerLead}: {crmUnreadLeads.length}</strong>
        <small>{crmUnreadMessages} {t.ownerUnread}</small></span>
      <ArrowRight size={19} aria-hidden="true"/>
    </button>}
    {(unauthenticated||bootstrapSignInRequired)&&!ownerAccountId&&!data&&<p className={styles.authNotice} role="alert">
      {t.sessionRequired}{' '}
      <a href={'/'+(locale==='es'?'en':locale)+'/app/portrait'}>{t.signIn}</a>
    </p>}
    <div className={styles.tabs} role="tablist" aria-label={t.title}>
      {[['chats',MessageCircle,t.chats],['requests',ClipboardList,t.requests]].map(([id,Icon,label])=>
        <button type="button" key={id} role="tab" id={'hh-inbox-tab-'+id}
          aria-selected={tab===id} aria-controls={'hh-inbox-panel-'+id}
          tabIndex={tab===id?0:-1}
          onClick={()=>switchTab(id)}
          onKeyDown={event=>{
            if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return
            event.preventDefault()
            const next=event.key==='Home'?'chats':event.key==='End'?'requests':
              event.key==='ArrowRight'?'requests':'chats'
            switchTab(next)
            document.getElementById('hh-inbox-tab-'+next)?.focus()
          }}>
          <Icon size={19} aria-hidden="true"/><span>{label}</span>
          {id==='requests'&&ownerAccountId&&crmUnreadLeads.length>0&&
            <span className={styles.count} aria-label={t.ownerLead}>{crmUnreadLeads.length}</span>}
        </button>)}
    </div>
    <section id="hh-inbox-panel-chats" role="tabpanel" aria-labelledby="hh-inbox-tab-chats"
      hidden={tab!=='chats'} className={styles.panel}>
      {ownerAccountId&&<div className={styles.sources} role="group" aria-label={t.sources}>
        <button type="button" aria-pressed={source==='crm'} onClick={()=>setSource('crm')}>
          {t.crmSource}</button>
        <button type="button" aria-pressed={source==='direct'} onClick={()=>setSource('direct')}>
          {t.directSource}</button>
      </div>}
      <div className={styles.inboxFrame}>
        {ownerAccountId&&<section hidden={source!=='crm'} className={styles.crm}
          aria-label={t.crm} id="hh-owner-crm-inbox">
          <CrmMessengerPanel key={ownerAccountId} locale={locale} accountId={ownerAccountId}
            compact onOpenChange={setCrmOpen}
            onThreadsLoaded={onCrmThreads} initialThreadId={crmThreadToOpen.id} initialThreadSequence={crmThreadToOpen.sequence}/>
        </section>}
        <section hidden={Boolean(ownerAccountId)&&source!=='direct'}
          className={styles.direct} aria-label={t.direct}>
          <DirectMessageInbox locale={locale} embedded compact onOpenChange={setDirectOpen}
            ownerCrmAvailable={Boolean(ownerAccountId)}/>
        </section>
      </div>
    </section>
    <section id="hh-inbox-panel-requests" role="tabpanel" aria-labelledby="hh-inbox-tab-requests"
      hidden={tab!=='requests'} className={styles.panel}>
      <div className={styles.toolbar}>
        <p><ShieldCheck size={16} aria-hidden="true"/>{t.privacy}</p>
        <button type="button" disabled={loading} onClick={()=>setRefreshKey(v=>v+1)}>{t.refresh}</button>
      </div>
      {requestData?<>
        {!usableData&&<p className={styles.note} role={loading?'status':'alert'}>
          {loading?t.otherLoading:t.failure}</p>}
        <MessagesClientRequests data={requestData} locale={locale} onReload={()=>setRefreshKey(v=>v+1)}
          onOpenCrmThread={openCrmThread}
          crmState={safeCrmSummary||{loading:Boolean(ownerAccountId),error:false,threads:[],partial:false}}/>
      </>:loading?<p className={styles.note} role="status">{t.loading}</p>:error?
        <p className={styles.note} role="alert">{unauthenticated?
          <a href={'/'+(locale==='es'?'en':locale)+'/app/portrait'}>{t.signIn}</a>:error}</p>:null}
    </section>
  </div>
}
