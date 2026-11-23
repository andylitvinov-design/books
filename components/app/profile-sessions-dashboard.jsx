'use client'
import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {ArrowRight,BriefcaseBusiness,CalendarDays,CheckCircle2,ChevronRight,Clock3,FileText,Heart,Leaf,RefreshCw,Sparkles} from 'lucide-react'
import styles from './profile-sessions-dashboard.module.css'

const TEXT={
 ru:{life:'Моя жизнь',work:'Моя работа',tag:'СЕССИИ',title:'Мои консультации',intro:'Личные консультации, анализы и рекомендации от мастеров.',book:'Записаться на консультацию',bookInfo:'Выберите услугу и отправьте заявку.',working:'Заказы в работе',workingInfo:'Текущие заявки и консультации',emptyWorking:'Пока нет заказов в работе. После оформления заявки её статус появится здесь.',recent:'Мои последние заказы',all:'Все заказы',emptyHistory:'Здесь появятся завершённые заказы и сохранённые консультации.',saved:'Сохранённая консультация',savedStatus:'Сохранена',savedUpdate:'Нужно обновить',offers:'Рекомендовано для вас',choose:'Выбрать услугу',noOffers:'Подберите консультацию в разделе поддержки.',loading:'Загружаем заказы…',error:'Не удалось загрузить заказы.',retry:'Повторить',messages:'новых сообщений',unknown:'Личная услуга',priceRequest:'Стоимость уточняется',free:'Бесплатно',from:'от',minutes:'мин'},
 en:{life:'My Life',work:'My Work',tag:'SESSIONS',title:'My consultations',intro:'Personal sessions, analyses and guidance from practitioners.',book:'Request a consultation',bookInfo:'Choose a service and send an enquiry.',working:'Orders in progress',workingInfo:'Current enquiries and consultations',emptyWorking:'No active orders yet. Your enquiries appear here.',recent:'My recent orders',all:'All orders',emptyHistory:'Completed orders and saved consultations will appear here.',saved:'Saved consultation',savedStatus:'Saved',savedUpdate:'Update required',offers:'Recommended for you',choose:'Choose a service',noOffers:'Explore consultations through Support.',loading:'Loading orders…',error:'Could not load orders.',retry:'Try again',messages:'new messages',unknown:'Personal service',priceRequest:'Price on request',free:'Free',from:'from',minutes:'min'},
 es:{life:'Mi vida',work:'Mi trabajo',tag:'SESIONES',title:'Mis consultas',intro:'Sesiones, análisis y recomendaciones de profesionales.',book:'Solicitar una consulta',bookInfo:'Elige un servicio y envía una solicitud.',working:'Pedidos en curso',workingInfo:'Solicitudes y consultas actuales',emptyWorking:'Todavía no tienes pedidos activos.',recent:'Mis últimos pedidos',all:'Todos los pedidos',emptyHistory:'Aquí verás pedidos terminados y consultas guardadas.',saved:'Consulta guardada',savedStatus:'Guardada',savedUpdate:'Requiere actualización',offers:'Recomendado para ti',choose:'Elegir servicio',noOffers:'Explora consultas en Soporte.',loading:'Cargando pedidos…',error:'No se pudieron cargar pedidos.',retry:'Reintentar',messages:'mensajes nuevos',unknown:'Servicio personal',priceRequest:'Precio por confirmar',free:'Gratis',from:'desde',minutes:'min'},
}
const STATUS={
 ru:{requested:'Ожидает ответа',contacted:'Уточняем детали',reschedule_proposed:'Предложен перенос',confirmed:'Подтверждён',in_progress:'В работе',completed:'Завершён',declined:'Отклонён',cancelled:'Отменён'},
 en:{requested:'Awaiting reply',contacted:'Discussing details',reschedule_proposed:'Time change proposed',confirmed:'Confirmed',in_progress:'In progress',completed:'Completed',declined:'Declined',cancelled:'Cancelled'},
 es:{requested:'Esperando respuesta',contacted:'Aclarando detalles',reschedule_proposed:'Cambio de horario',confirmed:'Confirmado',in_progress:'En curso',completed:'Completado',declined:'Rechazado',cancelled:'Cancelado'},
}
const CLOSED=new Set(['completed','declined','cancelled'])
const PENDING=new Set(['requested','contacted','reschedule_proposed'])
function dateLabel(value,locale){
 const time=Date.parse(value||'');if(!Number.isFinite(time))return ''
 return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Toronto'}).format(new Date(time))
}
function orderTitle(order,lang,fallback){
 const c=order.serviceCopy||{}
 return c[lang]?.title||c.en?.title||c.ru?.title||order.remoteBooking?.serviceTitle||fallback
}
function serviceCopy(service,lang){return service.copy?.[lang]||service.copy?.en||service.copy?.ru||{}}
function servicePrice(service,lang,t){
 if(service.pricingMode==='free')return t.free
 const amount=Number(service.confirmedPrice)
 if(service.pricingMode==='contact'||service.confirmedPrice==null||!Number.isFinite(amount))return t.priceRequest
 const currency=service.currency||'EUR'
 let value
 try{value=new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-IE',{style:'currency',currency,maximumFractionDigits:0}).format(amount)}
 catch{return t.priceRequest}
 return service.pricingMode==='from'?t.from+' '+value:value
}
export default function ProfileSessionsDashboard({locale='en',savedSessions=[],services=[]}){
 const lang=TEXT[locale]?locale:'en',t=TEXT[lang],root='/'+lang+'/app'
 const [orders,setOrders]=useState(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0)
 const [catalog,setCatalog]=useState(null)
 // One read-only, account-authorized source shared with My Orders, not sample screenshot data.
 useEffect(()=>{
  const controller=new AbortController()
  setOrders(null);setError(false)
  fetch('/api/app/messages/my-orders',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('ORDERS_UNAVAILABLE');const value=await r.json();if(!value.accountId||!Array.isArray(value.orders))throw Error('INVALID_ORDERS');return value.orders})
   .then(value=>{if(!controller.signal.aborted)setOrders(value)})
   .catch(()=>{if(!controller.signal.aborted)setError(true)})
  return()=>controller.abort()
 },[attempt])
 // Profile bootstrap intentionally omits offerings: fetch only the tiny catalog
 // after entering Sessions, never force the heavy full Cabinet bootstrap.
 useEffect(()=>{
  if(Array.isArray(services)&&services.length)return
  const controller=new AbortController()
  fetch('/api/app/profile-session-offers',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('OFFERS_UNAVAILABLE');const data=await r.json();if(!Array.isArray(data.services))throw Error('INVALID_OFFERS');return data.services})
   .then(value=>{if(!controller.signal.aborted)setCatalog(value)})
   .catch(()=>{/* Keep the existing Support fallback without invented prices. */})
  return()=>controller.abort()
 },[services])
 const {active,recent}=useMemo(()=>{
  const items=(orders||[]).filter(item=>typeof item?.id==='string'&&item.id)
   .sort((a,b)=>(Date.parse(b.createdAt||'')||0)-(Date.parse(a.createdAt||'')||0))
  return {active:items.filter(item=>!CLOSED.has(item.status)),recent:items.filter(item=>CLOSED.has(item.status))}
 },[orders])
 const saved=(Array.isArray(savedSessions)?savedSessions:[]).filter(item=>typeof item?.id==='string'&&item.id)
  .sort((a,b)=>(Date.parse(b.savedAt||b.occurredOn||'')||0)-(Date.parse(a.savedAt||a.occurredOn||'')||0))
 const offers=(Array.isArray(services)&&services.length?services:Array.isArray(catalog)?catalog:[]).filter(item=>item?.id&&item?.copy)
  .sort((a,b)=>Number(b.pricingMode==='free')-Number(a.pricingMode==='free')).slice(0,3)
 function orderCard(order,i,closed=false){
  return <Link key={order.id} href={root+'/messages?section=orders&order='+encodeURIComponent(order.id)} className={styles.orderCard} prefetch={false}>
    <span className={styles.orderImage} data-order-visual={i%3} aria-hidden="true" />
    <span className={styles.orderBody}>
      <small className={styles.kind}>{t.tag}</small><strong>{orderTitle(order,lang,t.unknown)}</strong>
      {dateLabel(order.createdAt,lang)&&<small className={styles.date}><CalendarDays size={14} aria-hidden="true" />{dateLabel(order.createdAt,lang)}</small>}
      {Number(order.unread)>0&&<small className={styles.messages}>{order.unread} {t.messages}</small>}
    </span>
    <span className={styles.orderRight}><span className={closed?(order.status==='completed'?styles.completed:styles.pending):PENDING.has(order.status)?styles.pending:styles.inProgress}>
      {closed&&order.status==='completed'?<CheckCircle2 size={15} aria-hidden="true"/>:<Clock3 size={15} aria-hidden="true"/>}
      {STATUS[lang][order.status]||order.status}</span><ChevronRight size={20} aria-hidden="true"/></span>
   </Link>
 }
 return <div className={styles.dashboard} data-profile-sessions-dashboard>
  <nav className={styles.mode} aria-label={t.title}>
    <Link href={root+'/portrait'} prefetch={false} className={styles.life}><Heart size={21} aria-hidden="true"/>{t.life}</Link>
    <Link href={'/'+lang+'/practice'} prefetch={false} className={styles.work}><BriefcaseBusiness size={21} aria-hidden="true"/>{t.work}</Link>
  </nav>
  <section className={styles.hero} aria-labelledby="my-consultations-title">
    <p className={styles.eyebrow}><CalendarDays size={20} aria-hidden="true"/>{t.tag}</p>
    <h1 id="my-consultations-title">{t.title}</h1><p className={styles.summary}>{t.intro}</p>
    <Link href={root+'/consultations'} className={styles.heroAction} prefetch={false}>
      <span className={styles.heroActionIcon}><CalendarDays size={26} aria-hidden="true"/></span>
      <span><strong>{t.book}</strong><small>{t.bookInfo}</small></span>
      <span className={styles.actionArrow}><ArrowRight size={23} aria-hidden="true"/></span>
    </Link>
  </section>
  <section className={styles.activePanel} data-profile-active-orders aria-labelledby="profile-active-orders-heading">
    <header className={styles.activeHeader}>
      <span className={styles.activeIcon}><BriefcaseBusiness size={27} aria-hidden="true"/></span>
      <div><h2 id="profile-active-orders-heading">{t.working}{orders&&active.length>0&&<b className={styles.count}>{active.length}</b>}</h2><p>{t.workingInfo}</p></div>
      <Leaf className={styles.leaf} size={42} strokeWidth={1.2} aria-hidden="true"/>
    </header>
    {orders===null&&!error&&<p className={styles.empty} role="status">{t.loading}</p>}
    {error&&<div className={styles.retryRow} role="alert"><span>{t.error}</span><button type="button" onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={16} aria-hidden="true"/>{t.retry}</button></div>}
    {orders&&active.length===0&&<p className={styles.empty}>{t.emptyWorking}</p>}
    {orders&&active.slice(0,3).map((order,i)=>orderCard(order,i))}
    {orders&&active.length>3&&<Link href={root+'/messages?section=orders'} className={styles.moreActive} prefetch={false}>{t.all}<ArrowRight size={16} aria-hidden="true"/></Link>}
  </section>
  <section className={styles.history} data-profile-recent-orders aria-labelledby="profile-recent-orders-heading">
    <div className={styles.sectionHeading}><h2 id="profile-recent-orders-heading">{t.recent}</h2>
      <Link href={root+'/messages?section=orders'} prefetch={false}>{t.all}<ArrowRight size={17} aria-hidden="true"/></Link>
    </div>
    {orders&&recent.length===0&&saved.length===0&&<p className={styles.empty}>{t.emptyHistory}</p>}
    {recent.slice(0,3).map((order,i)=>orderCard(order,i+1,true))}
    {saved.map((item,i)=><Link key={item.id} href={root+'/sessions/'+encodeURIComponent(item.id)}
       className={styles.orderCard} prefetch={false} data-saved-session>
       <span className={styles.orderImage} data-order-visual={(i+2)%3} aria-hidden="true"/>
       <span className={styles.orderBody}><small className={styles.kind}>{t.saved}</small><strong>{t.saved}</strong>
         {(item.occurredOn||item.savedAt)&&<small className={styles.date}><FileText size={14} aria-hidden="true"/>{item.occurredOn||dateLabel(item.savedAt,lang)}</small>}
       </span><span className={styles.orderRight}><span className={styles.completed}><CheckCircle2 size={15} aria-hidden="true"/>{item.available===false?t.savedUpdate:t.savedStatus}</span><ChevronRight size={20} aria-hidden="true"/></span>
     </Link>)}
  </section>
  <section className={styles.recommendations} data-profile-sessions-recommendations aria-labelledby="profile-session-recommendations-heading">
    <div className={styles.sectionHeading}><h2 id="profile-session-recommendations-heading">{t.offers}</h2>
      <Link href={root+'/consultations'} prefetch={false}>{t.choose}<ArrowRight size={17} aria-hidden="true"/></Link>
    </div>
    {offers.length>0?<div className={styles.offerRail}>{offers.map((service,i)=>{
      const copy=serviceCopy(service,lang)
      const href=service.slug==='remote-energy-support'?
        '/'+lang+'/services/remote-energy-support?practitioner='+encodeURIComponent(service.practitionerSlug||''):
        root+'/consultations?service='+encodeURIComponent(service.id)
      return <Link key={service.id} href={href} prefetch={false} className={styles.offer}>
        <span className={styles.offerImage} data-offer-visual={i%3} aria-hidden="true"/>
        <span className={styles.offerBody}><strong>{copy.title||t.unknown}</strong>
          <small>{copy.shortDescription||copy.description||t.bookInfo}</small>
          <span className={styles.offerMeta}>{service.durationMinutes?service.durationMinutes+' '+t.minutes+' · ':''}{servicePrice(service,lang,t)}</span>
          <span className={styles.offerArrow}><ArrowRight size={19} aria-hidden="true"/></span>
        </span>
      </Link>
    })}</div>:
    <Link href={'/'+lang+'/holistic-support'} prefetch={false} className={styles.noOffers}><Sparkles size={20} aria-hidden="true"/>{t.noOffers}<ArrowRight size={18} aria-hidden="true"/></Link>}
  </section>
 </div>
}
