'use client'
import {useCallback,useEffect,useState} from 'react'
import {ArrowRight,ClipboardList,MessageCircle,ShieldCheck} from 'lucide-react'
import DirectMessageInbox from './direct-message-inbox'
import CrmMessengerPanel from './crm-messenger'
import MessagesClientRequests from './messages-client-requests'
import styles from './messages-hub.module.css'

const COPY={
  en:{title:'Messages',subtitle:'Private conversations and client enquiries, together.',
    chats:'Conversations',requests:'Client requests',crm:'Telegram & other connected channels',direct:'Private conversations inside Holistic House',openCrm:'View Telegram conversations',
    crmHint:'Owner-only CRM conversations. Replies depend on verified provider delivery.',
    refresh:'Refresh requests',loading:'Loading requests…',failure:'Could not load client requests. Please retry.',
    ownerLead:'New Telegram & messenger requests',ownerUnread:'unread messages',otherLoading:'Loading other requests…',signIn:'Sign in to view client enquiries',sessionRequired:'This browser is not signed in to the Holistic House cabinet. Log in to see your messages.',privacy:'Only you and the assigned practitioner can see private request conversations.'},
  ru:{title:'Сообщения',subtitle:'Переписка и заявки клиентов — в одном удобном месте.',
    chats:'Переписка',requests:'Заявки',crm:'Telegram и другие подключённые каналы',direct:'Личная переписка внутри Holistic House',openCrm:'Открыть Telegram-переписки',
    crmHint:'Переписки владельца в CRM. Доставка ответа зависит от подтверждения провайдера.',
    refresh:'Обновить заявки',loading:'Загружаю заявки…',failure:'Не удалось загрузить заявки. Повторите попытку.',
    ownerLead:'Новые обращения Telegram и мессенджеров',ownerUnread:'непрочитанных сообщений',otherLoading:'Загружаем остальные заявки…',signIn:'Войдите, чтобы посмотреть заявки',sessionRequired:'В этом браузере не выполнен вход в кабинет Holistic House. Войдите в аккаунт владельца, чтобы увидеть и открыть сообщения.',privacy:'Личные ответы видят только клиент и назначенный мастер.'},
  es:{title:'Mensajes',subtitle:'Conversaciones privadas y solicitudes de clientes en un lugar.',
    chats:'Conversaciones',requests:'Solicitudes',crm:'Telegram y otros canales conectados',direct:'Mensajes privados dentro de Holistic House',openCrm:'Abrir conversaciones de Telegram',
    crmHint:'Mensajes del CRM del propietario. La entrega depende de la confirmación del proveedor.',
    refresh:'Actualizar solicitudes',loading:'Cargando solicitudes…',failure:'No se pudieron cargar las solicitudes.',
    ownerLead:'Nuevas solicitudes de Telegram y mensajería',ownerUnread:'mensajes sin leer',otherLoading:'Cargando otras solicitudes…',signIn:'Inicia sesión para ver las solicitudes',sessionRequired:'Inicia sesión en la cuenta de Holistic House para ver los mensajes de esta conversación.',privacy:'Las conversaciones privadas solo son visibles para el cliente y su profesional.'},
}
const VALID_TABS=new Set(['chats','requests'])
export default function MessagesHub({locale='en'}){
  const t=COPY[locale]||COPY.en
  const [tab,setTab]=useState('chats')
  const [refreshKey,setRefreshKey]=useState(0)
  const [data,setData]=useState(null)
  const [ownerInfo,setOwnerInfo]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [unauthenticated,setUnauthenticated]=useState(false)
  const [bootstrapSignInRequired,setBootstrapSignInRequired]=useState(false)
  const [crmSummary,setCrmSummary]=useState(null)
  const [crmThreadToOpen,setCrmThreadToOpen]=useState('')
  const onCrmThreads=useCallback(summary=>setCrmSummary(summary),[])
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    setTab(params.has('to')?'chats':VALID_TABS.has(params.get('tab'))?params.get('tab'):'chats')
  },[])
  useEffect(()=>{
    const controller=new AbortController()
    // Separate fast owner permission read from expensive practice/business data.
    // Both routes authenticate on the server and use no-store private responses.
    setOwnerInfo(null);setBootstrapSignInRequired(false)
    fetch('/api/app/messages/requests?view=owner',{
      credentials:'same-origin',cache:'no-store',signal:controller.signal,
    }).then(async response=>{
      if(response.status===401){setBootstrapSignInRequired(true);return null}
      if(!response.ok)return null
      const value=await response.json()
      return typeof value.accountId==='string'&&typeof value.ownerMessenger==='boolean'?value:null
    }).then(result=>{if(!controller.signal.aborted)setOwnerInfo(result)})
      .catch(()=>{if(!controller.signal.aborted)setOwnerInfo(null)})
    return()=>controller.abort()
  },[refreshKey])
  useEffect(()=>{
    const controller=new AbortController()
    setLoading(true);setError('');setUnauthenticated(false);setData(null);setCrmSummary(null);setCrmThreadToOpen('')
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
  // Fail closed if parallel cookie-bound reads saw different signed-in users.
  const sameAccount=!data||!ownerInfo||data.accountId===ownerInfo.accountId
  const usableData=sameAccount?data:null
  const ownerAccountId=sameAccount
    ?ownerInfo?.ownerMessenger?ownerInfo.accountId:data?.ownerMessenger?data.accountId:null
    :null
  // CRM threads remain accessible when website request loading fails or is slow.
  const requestData=usableData||(ownerAccountId?{
    accountId:ownerAccountId,ownerMessenger:true,ownerAuthorized:true,
    hasPractice:true,requests:[],businessEnquiries:[],services:[],
    websiteUnavailable:!loading,websiteLoading:loading,businessUnavailable:false,
  }:null)
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
    setCrmThreadToOpen(id)
    switchTab('chats')
    requestAnimationFrame(()=>document.getElementById('hh-owner-crm-inbox')?.scrollIntoView({block:'start'}))
  }
  return <div className={styles.hub} data-messages-hub>
    <div className={styles.hero}>
      <div className={styles.icon}><MessageCircle aria-hidden="true"/></div>
      <div><span className={styles.eyebrow}>HOLISTIC HOUSE · INBOX</span>
        <h1>{t.title}</h1><p>{t.subtitle}</p></div>
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
      {ownerAccountId&&<section className={styles.crm} aria-labelledby="hh-owner-crm-inbox">
        <div className={styles.crmTitle}><MessageCircle size={19} aria-hidden="true"/>
          <h2 id="hh-owner-crm-inbox">{t.crm}</h2></div>
        <p>{t.crmHint}</p>
        <CrmMessengerPanel key={ownerAccountId} locale={locale} accountId={ownerAccountId}
          onThreadsLoaded={onCrmThreads} initialThreadId={crmThreadToOpen}/>
      </section>}
      <section className={styles.direct} aria-label={t.direct}>
        {ownerAccountId&&<h2 className={styles.directTitle}>{t.direct}</h2>}
        <DirectMessageInbox locale={locale} embedded ownerCrmAvailable={Boolean(ownerAccountId)}/>
      </section>
    </section>
    <section id="hh-inbox-panel-requests" role="tabpanel" aria-labelledby="hh-inbox-tab-requests"
      hidden={tab!=='requests'} className={styles.panel}>
      {ownerAccountId&&<div className={styles.crmShortcut}>
        <span>{t.crm}</span>
        <button type="button" onClick={()=>switchTab('chats')}>{t.openCrm}</button>
      </div>}
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
