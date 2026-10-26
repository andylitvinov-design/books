'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'
import {ArrowRight,CalendarDays,CheckCircle2,ClipboardList,Inbox,MessageCircle} from 'lucide-react'
import PracticeRequestConversation from './practice-request-conversation'
import PublicEnquiryContact from './public-enquiry-contact'
import FreeExpressOwnerCase, {isOwnerFreeExpressRequest} from './free-express-owner-case'
import CrmBusinessEnquiries from './crm-business-enquiries'
import styles from './messages-hub.module.css'

const OPEN=new Set(['requested','contacted','reschedule_proposed','confirmed','in_progress'])
const COPY={
  en:{title:'Client requests',hint:'Service enquiries and follow-ups addressed to your practice.',
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
    onboarding:'Publish a practitioner service to receive client enquiries.',
    start:'Open My Practice',unavailable:'Some owner CRM enquiries could not be loaded. Review them in My Practice.'},
  ru:{title:'Заявки клиентов',hint:'Заявки на услуги и последующие обращения к вашей практике.',
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
    onboarding:'Разместите свою услугу, чтобы получать обращения клиентов.',
    start:'Открыть Мою практику',unavailable:'Часть заявок CRM недоступна. Проверьте их в Моей практике.'},
  es:{title:'Solicitudes de clientes',hint:'Consultas y seguimiento de tus servicios.',
    new:'Nuevas',need:'Pendientes',all:'Todas',empty:'Todavía no hay solicitudes',
    emptyInfo:'Las solicitudes enviadas aparecerán aquí.',choose:'Elige una solicitud para verla',
    received:'Recibida',service:'Solicitud de servicio',unnamed:'Consulta del cliente',
    reply:'Abrir conversación',details:'Detalles de la solicitud',inPortal:'Responde en la cuenta privada.',
    public:'Solicitud de invitado',publicHint:'No hay chat verificado. Usa solo el contacto facilitado por el cliente.',
    booking:'Solicitud de reserva — no confirma cita ni pago.',
    contacted:'Contactado',closed:'Cerrar',full:'Abrir en Mi práctica',
    failed:'No se pudo actualizar la solicitud.',business:'Consultas de negocio',
    businessHint:'Consultas privadas del propietario y opciones actuales del CRM.',
    onboarding:'Publica un servicio para recibir consultas.',start:'Abrir Mi práctica',
    unavailable:'Algunas consultas del CRM no están disponibles.'},
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

export default function MessagesClientRequests({data,locale='en',onReload}){
  const t=COPY[locale]||COPY.en
  const [filter,setFilter]=useState('open')
  const [selectedId,setSelectedId]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const requests=useMemo(()=>[...(data.requests||[])].sort(incomingSort),[data.requests])
  const business=data.businessEnquiries||[]
  const openCount=requests.filter(r=>OPEN.has(r.status)).length+
    business.filter(r=>['new','contacted'].includes(r.status)).length
  const total=requests.length+business.length
  const newCount=requests.filter(r=>r.status==='requested').length+
    business.filter(r=>r.status==='new').length
  const visible=requests.filter(r=>filter==='all'||(filter==='new'?r.status==='requested':OPEN.has(r.status)))
  const visibleBusiness=business.filter(r=>filter==='all'||(filter==='new'?r.status==='new':['new','contacted'].includes(r.status)))
  const selected=visible.find(item=>item.id===selectedId)||visible[0]||null
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
      <div><h2>{t.title}</h2><p>{t.hint}</p></div>
      <div className={styles.metrics}>
        <span><strong>{newCount}</strong> {t.new}</span>
        <span><strong>{openCount}</strong> {t.need}</span>
        <span><strong>{total}</strong> {t.all}</span>
      </div>
    </div>
    <div className={styles.filters} aria-label={t.title}>
      {[['open',t.need,openCount],['new',t.new,newCount],['all',t.all,total]].map(([id,label,count])=>
        <button type="button" key={id} aria-pressed={filter===id}
          onClick={()=>{setFilter(id);setSelectedId('')}}>{label} <span>{count}</span></button>)}
    </div>
    {error&&<p role="alert" className={styles.alert}>{error}</p>}
    {data.businessUnavailable&&<p role="alert" className={styles.alert}>{t.unavailable}</p>}
    {!data.hasPractice&&total===0?<div className={styles.empty}>
      <Inbox size={32} aria-hidden="true"/><h3>{t.empty}</h3><p>{t.onboarding}</p>
      <Link href={'/'+(locale==='es'?'en':locale)+'/app/practice'}>{t.start} <ArrowRight size={16}/></Link>
    </div>:!visible.length&&!visibleBusiness.length?<div className={styles.empty}>
      <CheckCircle2 size={32} aria-hidden="true"/><h3>{t.empty}</h3><p>{t.emptyInfo}</p>
    </div>:null}
    {visible.length>0&&<div className={styles.requestLayout}>
      <div className={styles.requestList} role="group" aria-label={t.title}>
        {visible.map(item=><button type="button" key={item.id}
          className={styles.requestItem} aria-pressed={selected?.id===item.id}
          onClick={()=>setSelectedId(item.id)}>
          <span className={styles.requestAvatar}>{nameOf(item.contact,t.unnamed).charAt(0).toUpperCase()}</span>
          <span className={styles.requestText}>
            <span className={styles.requestRow}><strong>{nameOf(item.contact,t.unnamed)}</strong>
              <time dateTime={item.createdAt}>{dateOf(item.createdAt,locale)}</time></span>
            <span className={styles.requestService}>{serviceName(item,data.services||[],locale,t.service)}</span>
            <span className={styles.requestPreview}>{(item.message||'').slice(0,125)||t.details}</span>
          </span>
          {item.needsReply||item.newMessageCount>0?<span className={styles.dot} aria-label={t.need}/>:null}
        </button>)}
      </div>
      {selected&&<article className={styles.requestDetail} aria-label={t.details} key={selected.id}>
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
          <Link href={'/'+(locale==='es'?'en':locale)+'/app/practice?panel=clients&requestId='+encodeURIComponent(selected.id)}
            prefetch={false}>{t.full} <ArrowRight size={15}/></Link>
        </div>
        {selected.requestKind==='public'?<>
          {ownerCase?<FreeExpressOwnerCase key={selected.id} request={selected} locale={locale} accountId={data.accountId}/>:
            <p className={styles.notice}>{t.publicHint}</p>}
          <PublicEnquiryContact key={selected.id} request={selected} locale={locale} busy={busy} onSave={saveContact}/>
        </>:<div className={styles.conversation}>
          <p><MessageCircle size={16} aria-hidden="true"/>{t.inPortal}</p>
          <PracticeRequestConversation key={selected.id} requestId={selected.id}
            accountId={data.accountId} locale={locale}
            initialMessage={selected.message||''} createdAt={selected.createdAt}
            autoOpen={selected.needsReply||selected.newMessageCount>0}
            onSaved={onReload} onViewed={onReload}/>
        </div>}
      </article>}
    </div>}
    {visibleBusiness.length>0&&data.ownerMessenger&&<section className={styles.business}>
      <details open={!visible.length}>
        <summary><ClipboardList size={18} aria-hidden="true"/>{t.business}<span>{visibleBusiness.length}</span></summary>
        <p>{t.businessHint}</p>
        <CrmBusinessEnquiries enquiries={visibleBusiness} locale={locale} busy={busy}
          onAction={businessAction}/>
      </details>
    </section>}
  </div>
}
