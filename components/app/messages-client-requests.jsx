'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {messagesRequestPath,normalizeMessagesRequestId} from '@/lib/app/messages-request-route.mjs'
import {ArrowLeft,ArrowRight,CalendarDays,Inbox} from 'lucide-react'
import PracticeRequestConversation from './practice-request-conversation'
import PublicEnquiryContact from './public-enquiry-contact'
import FreeExpressOwnerCase, {isOwnerFreeExpressRequest} from './free-express-owner-case'
import CrmBusinessEnquiries from './crm-business-enquiries'
import styles from './messages-hub.module.css'

const OPEN=new Set(['requested','contacted','reschedule_proposed','confirmed','in_progress'])
const COPY={
  en:{back:'Back to requests',editContact:'Contact details',title:'Client requests',hint:'Service enquiries and follow-ups addressed to your practice.',
    new:'New',need:'Need attention',all:'All',empty:'No client requests yet',
    emptyInfo:'When a visitor sends a real enquiry, it will appear here.',
    choose:'Select a request to view details',received:'Received',service:'Service request',
    unnamed:'Client enquiry',reply:'Open conversation',details:'Request details',
    inPortal:'Reply securely inside Holistic House.',public:'Guest enquiry',
    publicHint:'A guest enquiry has no verified in-app chat. Use only the contact channel the client provided.',
    booking:'Booking enquiry — not a confirmed appointment or payment.',
    contacted:'Mark contacted',closed:'Close request',full:'Open in My Practice',
    failed:'Could not update this request. Please retry.',business:'Business consulting enquiries',
    businessHint:'Owner-only enquiries from the business form, with their existing CRM status and reply options.',
    siteUnavailable:'Website enquiries are temporarily unavailable. Existing Telegram CRM conversations remain accessible here.',
    onboarding:'Publish a practitioner service to receive client enquiries.',
    start:'Open My Practice',unavailable:'Some owner CRM enquiries could not be loaded. Review them in My Practice.',
    crmLeads:'Telegram & messenger enquiries',crmHint:'Only existing consented CRM conversations. Private message text is not shown in this list.',
    crmOpen:'Open conversation',crmWaiting:'Waiting for your reply',crmRecent:'Showing the latest 30 CRM conversations; open CRM for older history.',
    crmLoading:'Checking CRM conversations…',crmError:'CRM conversations are unavailable. Try the owner messenger.'},
  ru:{back:'К заявкам',editContact:'Данные для связи',title:'Заявки клиентов',hint:'Заявки на услуги и последующие обращения к вашей практике.',
    new:'Новые',need:'Требуют внимания',all:'Все',empty:'Пока нет заявок',
    emptyInfo:'Когда клиент действительно отправит заявку, она появится здесь.',
    choose:'Выберите заявку, чтобы открыть её',received:'Получена',service:'Заявка на услугу',
    unnamed:'Обращение клиента',reply:'Открыть переписку',details:'Подробности заявки',
    inPortal:'Ответить внутри защищённого кабинета Holistic House.',
    public:'Гостевая заявка',publicHint:'У гостевой заявки нет подтверждённого внутреннего чата. Используйте только контакт, оставленный клиентом.',
    booking:'Заявка на встречу — не подтверждение брони или оплаты.',
    contacted:'Связались',closed:'Закрыть заявку',full:'Открыть в Моей практике',
    failed:'Не удалось обновить заявку. Повторите попытку.',business:'Заявки на бизнес-консалтинг',
    businessHint:'Личные заявки владельца с существующими статусами и способами ответа в CRM.',
    siteUnavailable:'Заявки сайта временно недоступны. Сохранённые обращения Telegram доступны здесь.',
    onboarding:'Разместите свою услугу, чтобы получать обращения клиентов.',
    start:'Открыть Мою практику',unavailable:'Часть заявок CRM недоступна. Проверьте их в Моей практике.',
    crmLeads:'Обращения Telegram и мессенджеров',crmHint:'Только существующие диалоги CRM. Личный текст сообщений не показывается в списке.',
    crmOpen:'Открыть переписку',crmWaiting:'Ожидает вашего ответа',crmRecent:'Показаны последние 30 диалогов CRM. Более ранние откройте в CRM.',
    crmLoading:'Проверяем обращения CRM…',crmError:'Диалоги CRM сейчас недоступны. Проверьте мессенджер владельца.'},
  es:{back:'Volver a solicitudes',editContact:'Datos de contacto',title:'Solicitudes de clientes',hint:'Consultas y seguimiento de tus servicios.',
    new:'Nuevas',need:'Pendientes',all:'Todas',empty:'Todavía no hay solicitudes',
    emptyInfo:'Las solicitudes enviadas aparecerán aquí.',choose:'Elige una solicitud para verla',
    received:'Recibida',service:'Solicitud de servicio',unnamed:'Consulta del cliente',
    reply:'Abrir conversación',details:'Detalles de la solicitud',inPortal:'Responde en la cuenta privada.',
    public:'Solicitud de invitado',publicHint:'No hay chat verificado. Usa solo el contacto facilitado por el cliente.',
    booking:'Solicitud de reserva — no confirma cita ni pago.',
    contacted:'Contactado',closed:'Cerrar',full:'Abrir en Mi práctica',
    failed:'No se pudo actualizar la solicitud.',business:'Consultas de negocio',
    businessHint:'Consultas privadas del propietario y opciones actuales del CRM.',
    siteUnavailable:'Las solicitudes web no están disponibles temporalmente. Los mensajes CRM de Telegram siguen aquí.',
    onboarding:'Publica un servicio para recibir consultas.',start:'Abrir Mi práctica',
    unavailable:'Algunas consultas del CRM no están disponibles.',
    crmLeads:'Solicitudes de Telegram y mensajería',crmHint:'Solo conversaciones CRM existentes. No se muestra el texto privado.',
    crmOpen:'Abrir conversación',crmWaiting:'Esperando respuesta',crmRecent:'Últimas 30 conversaciones CRM. Abre el CRM para ver más.',
    crmLoading:'Revisando conversaciones CRM…',crmError:'Conversaciones CRM no disponibles. Abre el buzón del propietario.'},
}
function dateOf(value,locale){
  const time=Date.parse(value||'')
  if(!Number.isFinite(time))return ''
  return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{
    day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Toronto',
  }).format(new Date(time))
}
function nameOf(contact,fallback){
  if(typeof contact==='string')return contact.trim().slice(0,90)||fallback
  if(!contact||typeof contact!=='object')return fallback
  const label=contact.displayName||contact.name||contact.fullName||contact.email||contact.phone
  return typeof label==='string'&&label.trim()?label.trim().slice(0,90):fallback
}
function serviceName(item,services,locale,fallback){
  const service=services.find(s=>s.id===item.serviceId)
  return service?.localizedCopy?.[locale]?.title||service?.draftCopy?.copy?.[locale]?.title||
    service?.localizedCopy?.en?.title||service?.copy?.title||item.serviceTitle||fallback
}
const incomingSort=(a,b)=>Number(b.needsReply)-Number(a.needsReply)||
  Number(b.status==='requested')-Number(a.status==='requested')||
  (Date.parse(b.lastConversationAt||b.createdAt||'')||0)-(Date.parse(a.lastConversationAt||a.createdAt||'')||0)

export default function MessagesClientRequests({data,locale='en',onReload,onOpenCrmThread,crmState={loading:false,error:false,threads:[],partial:false}}){
  const t=COPY[locale]||COPY.en
  const requestIdFromUrl=normalizeMessagesRequestId(useSearchParams().get('requestId'))
  const previousRequestIdRef=useRef('')
  const [filter,setFilter]=useState('all')
  const [selectedId,setSelectedId]=useState('')
  const [showContact,setShowContact]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const requests=useMemo(()=>[...(data.requests||[])].sort(incomingSort),[data.requests])
  useEffect(()=>{
    const previous=previousRequestIdRef.current
    previousRequestIdRef.current=requestIdFromUrl
    if(!requestIdFromUrl){
      if(previous){setSelectedId('');setShowContact(false)}
      return
    }
    // Query parameters do not authorize rows. Only signed-in API results
    // may select a request; a foreign/unknown UUID remains unavailable.
    if(!requests.some(item=>normalizeMessagesRequestId(item.id)===requestIdFromUrl))return
    setFilter('all')
    setSelectedId('request:'+requestIdFromUrl)
    setShowContact(false)
  },[requestIdFromUrl,requests])
  const syncRequestUrl=(id,{replace=false}={})=>{
    const url=new URL(window.location.href)
    const safeId=normalizeMessagesRequestId(id)
    if(safeId){url.searchParams.set('section','clients');url.searchParams.set('requestId',safeId)}
    else url.searchParams.delete('requestId')
    window.history[replace?'replaceState':'pushState'](window.history.state,'',url.pathname+url.search+url.hash)
  }
  const business=data.businessEnquiries||[]
  const crmLeads=crmState.threads.filter(item=>item.lifecycle==='lead')
  const visibleCrm=crmLeads.filter(item=>filter==='all'||(filter==='new'?item.unreadCount>0:item.needsReply||item.unreadCount>0))
  const openCount=requests.filter(r=>OPEN.has(r.status)).length+
    business.filter(r=>['new','contacted'].includes(r.status)).length+crmLeads.filter(r=>r.needsReply||r.unreadCount>0).length
  const total=requests.length+business.length+crmLeads.length
  const newCount=requests.filter(r=>r.status==='requested').length+
    business.filter(r=>r.status==='new').length+crmLeads.filter(r=>r.unreadCount>0).length
  const visible=requests.filter(r=>filter==='all'||(filter==='new'?r.status==='requested':OPEN.has(r.status)))
  const visibleBusiness=business.filter(r=>filter==='all'||(filter==='new'?r.status==='new':['new','contacted'].includes(r.status)))
  // One owner-scoped list: show the original items, never copy them into another table.
  const rows=[
    ...visible.map(item=>({key:'request:'+item.id,kind:'request',item,
      needsReply:item.needsReply||item.newMessageCount>0,unread:item.newMessageCount||0,
      createdAt:item.lastConversationAt||item.createdAt})),
    ...visibleCrm.map(item=>({key:'crm:'+item.id,kind:'crm',item,
      needsReply:item.needsReply||item.unreadCount>0,unread:item.unreadCount||0,createdAt:item.lastMessageAt})),
    ...visibleBusiness.map(item=>({key:'business:'+item.id,kind:'business',item,
      needsReply:item.status==='new',unread:0,createdAt:item.createdAt})),
  ].sort((a,b)=>Number(b.needsReply)-Number(a.needsReply)||
    (Date.parse(b.createdAt||'')||0)-(Date.parse(a.createdAt||'')||0))
  const selection=rows.find(row=>row.key===selectedId)||null
  const selected=selection?.kind==='request'?selection.item:null
  const businessSelected=selection?.kind==='business'?selection.item:null
  const ownerCase=Boolean(selected&&data.ownerAuthorized&&data.freeExpressV2Enabled===true&&isOwnerFreeExpressRequest(selected))
  async function post(path,body,owner=false){
    if(busy||!data.accountId)return
    setBusy(true);setError('')
    try{
      const response=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json',...(owner?{'X-HH-Account-Id':data.accountId}:{})},
        body:JSON.stringify(body)})
      if(!response.ok)throw new Error('REQUEST_FAILED')
      onReload?.()
    }catch{setError(t.failed);setBusy(false)}
  }
  const statusChange=(item,status)=>post('/api/app/practice/requests/'+encodeURIComponent(item.id),{
    status,expectedRevision:item.revision,
  })
  const saveContact=(item,body)=>post('/api/app/practice/requests/'+encodeURIComponent(item.id),body)
  const businessAction=(action,payload)=>{
    if(!['update_business_enquiry','import_business_contact'].includes(action))return
    void post('/api/app/crm',{action,payload},true)
  }
  return <div className={styles.requests} data-client-request-inbox>
    <div className={styles.requestsHead}>
      <h2>{t.title}</h2>
      <span className={styles.requestTotal}>{total}</span>
    </div>
    <div className={styles.filters} aria-label={t.title}>
      {[['open',t.need,openCount],['new',t.new,newCount],['all',t.all,total]].map(([id,label,count])=>
        <button type="button" key={id} aria-pressed={filter===id}
          onClick={()=>{setFilter(id);setSelectedId('');setShowContact(false);syncRequestUrl('',{replace:true})}}>
          {label} <span>{count}</span></button>)}
    </div>
    {error&&<p role="alert" className={styles.alert}>{error}</p>}
    {data.businessUnavailable&&<p role="alert" className={styles.alert}>{t.unavailable}</p>}
    {data.websiteUnavailable&&<p role="alert" className={styles.alert}>{t.siteUnavailable}</p>}
    {crmState.error&&data.ownerMessenger&&<p role="alert" className={styles.alert}>{t.crmError}</p>}
    <div className={styles.requestLayout} data-detail-open={Boolean(selection)}>
      <div className={styles.requestList} role="group" aria-label={t.title}>
        {rows.map(row=>{
          const item=row.item
          const name=row.kind==='crm'?item.name||t.unnamed:
            row.kind==='business'?item.name||t.unnamed:nameOf(item.contact,t.unnamed)
          const caption=row.kind==='crm'?({telegram:'Telegram',whatsapp:'WhatsApp',
            instagram:'Instagram',messenger:'Messenger'})[item.channel]||t.crmLeads:
            row.kind==='business'?t.business:serviceName(item,data.services||[],locale,t.service)
          const preview=row.kind==='crm'?(item.needsReply||item.unreadCount>0?t.crmWaiting:t.crmHint):
            row.kind==='business'?(item.question||t.businessHint):(item.message||t.details)
          return <button type="button" key={row.key} className={styles.requestItem}
            aria-pressed={row.key===selectedId}
            onClick={()=>{
              if(row.kind==='crm'){
                syncRequestUrl('',{replace:true});onOpenCrmThread?.(item.id)
              }else{
                setSelectedId(row.key);setShowContact(false)
                syncRequestUrl(row.kind==='request'?item.id:'')
              }
            }}>
            <span className={styles.requestAvatar} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
            <span className={styles.requestText}>
              <span className={styles.requestRow}><strong>{name}</strong>
                <time dateTime={row.createdAt}>{dateOf(row.createdAt,locale)}</time></span>
              <span className={styles.requestService}>{caption}</span>
              <span className={styles.requestPreview}>{String(preview).slice(0,110)}</span>
            </span>
            {row.unread>0?<span className={styles.count} aria-label={String(row.unread)}>{row.unread}</span>:
              row.needsReply?<span className={styles.dot} aria-label={t.need}/>:null}
          </button>
        })}
        {crmState.loading&&data.ownerMessenger&&<p className={styles.note} role="status">{t.crmLoading}</p>}
        {crmState.partial&&<p className={styles.note}>{t.crmRecent}</p>}
        {data.websiteLoading&&<p className={styles.note} role="status">{t.crmLoading}</p>}
        {!rows.length&&!crmState.loading&&!data.websiteLoading&&!data.websiteUnavailable&&<div className={styles.empty}>
          <Inbox size={26} aria-hidden="true"/><h3>{t.empty}</h3>
          <p>{!data.hasPractice?t.onboarding:t.emptyInfo}</p>
          {!data.hasPractice&&<Link href={'/'+(locale==='es'?'en':locale)+'/app/practice'}>
            {t.start} <ArrowRight size={15}/></Link>}
        </div>}
      </div>
      {selection&&<article className={styles.requestDetail} aria-label={t.details} key={selection.key}>
        <button type="button" className={styles.backRequest} onClick={()=>{setSelectedId('');setShowContact(false);syncRequestUrl('',{replace:true})}}>
          <ArrowLeft size={17} aria-hidden="true"/>{t.back}
        </button>
        {businessSelected?<CrmBusinessEnquiries enquiries={[businessSelected]} locale={locale}
          busy={busy} onAction={businessAction}/>:selected&&<>
          <div className={styles.detailHeader}>
            <div><span className={styles.detailLabel}>{t.details}</span>
              <h3>{serviceName(selected,data.services||[],locale,t.service)}</h3>
              <p><CalendarDays size={15} aria-hidden="true"/>{t.received}: {dateOf(selected.createdAt,locale)}</p>
            </div>
            <span className={styles.status} data-status={selected.status}>{selected.status}</span>
          </div>
          <p className={styles.clientName}>{nameOf(selected.contact,t.unnamed)}</p>
          {selected.message&&!ownerCase&&<p className={styles.fullMessage}>{selected.message}</p>}
          {selected.remoteBooking&&<p className={styles.notice}>{t.booking}</p>}
          <div className={styles.detailActions}>
            {selected.status==='requested'&&!selected.remoteBooking&&
              <button type="button" disabled={busy} onClick={()=>statusChange(selected,'contacted')}>{t.contacted}</button>}
            {['requested','contacted'].includes(selected.status)&&!selected.remoteBooking&&
              <button type="button" disabled={busy} onClick={()=>statusChange(selected,'closed')}>{t.closed}</button>}
            <Link href={messagesRequestPath(locale,selected.id)}
              prefetch={false}>{t.full} <ArrowRight size={15}/></Link>
          </div>
          {selected.requestKind==='public'?<>
            {ownerCase?<FreeExpressOwnerCase key={selected.id} request={selected}
              locale={locale} accountId={data.accountId}/>:<p className={styles.notice}>{t.publicHint}</p>}
            <button type="button" className={styles.contactToggle}
              aria-expanded={showContact} onClick={()=>setShowContact(value=>!value)}>{t.editContact}</button>
            {showContact&&<PublicEnquiryContact key={selected.id} request={selected}
              locale={locale} busy={busy} onSave={saveContact}/>}
          </>:<div className={styles.conversation}>
            <PracticeRequestConversation key={selected.id} requestId={selected.id}
              accountId={data.accountId} locale={locale}
              initialMessage={selected.message||''} createdAt={selected.createdAt}
              autoOpen
              onSaved={onReload} onViewed={onReload}/>
          </div>}
        </>}
      </article>}
    </div>
  </div>
}
