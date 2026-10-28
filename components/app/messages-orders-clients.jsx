'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,Bell,Clock3,Headphones,Inbox,MessageCircle,PackageCheck,RefreshCw,ShoppingBag} from 'lucide-react'
import PracticeRequestConversation from './practice-request-conversation'
import styles from './messages-orders-clients.module.css'

const TEXT={
 en:{title:'Requests',subtitle:'Your orders and conversations with practitioners, all in one place.',
  orders:'My orders',clients:'Clients',conversations:'Conversations',iOrder:'I ordered',incoming:'Requests to me',
  all:'All',waiting:'Waiting',working:'In progress',finished:'Completed',empty:'You have no orders yet.',
  explore:'Explore services',error:'Could not load your orders.',retry:'Try again',loading:'Loading your orders…',
  open:'Open order',back:'My orders',number:'Request',practitioner:'Practitioner',details:'Order details',
  conditions:'Selected terms',status:'Request status',noPrice:'Price to be agreed',minutes:'min',
  initial:'Original request',chat:'Conversation about this order',voice:'Record an audio message',
  voiceInfo:'Record or attach audio directly above. The file belongs only to this order and is played inside its private conversation.',
  noVoice:'Audio chat is available when the practitioner has a verified profile.',
  materials:'Materials and progress',materialsInfo:'Delivered materials appear in your private Cabinet after confirmation.',
  myPractice:'My practices',payment:'Payment',paymentInfo:'A request is not a confirmed booking or payment.',
  newer:'New reply',signIn:'Sign in to see your private orders',search:'Find a practitioner',more:'Older requests are available under Consultations.',
  incomingHelp:'Client requests and messages go to your existing protected practitioner inbox.'},
 ru:{title:'Заявки',subtitle:'Ваши заказы и переписка с мастерами в одном месте.',
  orders:'Мои заказы',clients:'Клиенты',conversations:'Переписка',iOrder:'Я заказываю',incoming:'Мне поступили',
  all:'Все',waiting:'Жду ответа',working:'В работе',finished:'Завершены',empty:'Пока нет заказов.',
  explore:'Выбрать услугу',error:'Не удалось загрузить заказы.',retry:'Повторить',loading:'Загружаем ваши заказы…',
  open:'Открыть заказ',back:'Мои заказы',number:'Заявка',practitioner:'Мастер',details:'Детали заказа',
  conditions:'Выбранные условия',status:'Статус заявки',noPrice:'Стоимость уточняется',minutes:'мин',
  initial:'Исходное обращение',chat:'Переписка по заказу',voice:'Записать аудиосообщение',
  voiceInfo:'Записывайте и отправляйте аудио прямо в переписке выше. Запись привязана к этому заказу и видна только его участникам.',
  noVoice:'Аудиочат доступен после подтверждения профиля мастера.',
  materials:'Материалы и результат',materialsInfo:'Выданные материалы откроются в защищённом кабинете после подтверждения.',
  myPractice:'Мои практики',payment:'Оплата',paymentInfo:'Заявка ещё не означает запись или подтверждённую оплату.',
  newer:'Новый ответ',signIn:'Войдите, чтобы увидеть личные заказы',search:'Найти мастера',more:'Более ранние заявки доступны в разделе «Консультации».',
  incomingHelp:'Все заявки ваших клиентов и сообщения открываются в существующем защищённом разделе.'},
 es:{title:'Solicitudes',subtitle:'Tus pedidos y conversaciones con profesionales en un solo lugar.',
  orders:'Mis pedidos',clients:'Clientes',conversations:'Conversaciones',iOrder:'Mis solicitudes',incoming:'Recibidos',
  all:'Todos',waiting:'Pendientes',working:'En curso',finished:'Terminados',empty:'Todavía no tienes pedidos.',
  explore:'Explorar servicios',error:'No se pudieron cargar tus pedidos.',retry:'Reintentar',loading:'Cargando pedidos…',
  open:'Abrir pedido',back:'Mis pedidos',number:'Solicitud',practitioner:'Profesional',details:'Detalles del pedido',
  conditions:'Opciones elegidas',status:'Estado de la solicitud',noPrice:'Precio por confirmar',minutes:'min',
  initial:'Solicitud original',chat:'Conversación sobre el pedido',voice:'Grabar mensaje de voz',
  voiceInfo:'Graba y envía audios arriba. La grabación pertenece a este pedido y solo es accesible para sus participantes.',
  noVoice:'El chat de audio requiere un perfil profesional verificado.',
  materials:'Materiales y resultado',materialsInfo:'Los materiales entregados aparecen en tu cuenta privada después de la confirmación.',
  myPractice:'Mis prácticas',payment:'Pago',paymentInfo:'Una solicitud no confirma una reserva ni un pago.',
  newer:'Nueva respuesta',signIn:'Inicia sesión para ver tus pedidos',search:'Buscar profesional',more:'Las solicitudes anteriores están en Consultas.',
  incomingHelp:'Las solicitudes de tus clientes y mensajes están en la bandeja protegida existente.'},
}
const STATES={
 en:{requested:'Waiting for practitioner',contacted:'Discussing details',reschedule_proposed:'Time change proposed',confirmed:'Confirmed by practitioner',in_progress:'In progress',completed:'Completed',declined:'Declined',cancelled:'Cancelled'},
 ru:{requested:'Ожидается ответ мастера',contacted:'Уточняем детали',reschedule_proposed:'Предложен перенос',confirmed:'Мастер подтвердил',in_progress:'В работе',completed:'Завершено',declined:'Отказано',cancelled:'Отменено'},
 es:{requested:'Esperando respuesta',contacted:'Aclarando detalles',reschedule_proposed:'Cambio de horario',confirmed:'Confirmado',in_progress:'En curso',completed:'Completado',declined:'Rechazado',cancelled:'Cancelado'},
}
const DONE=new Set(['completed','declined','cancelled'])
const WORK=new Set(['confirmed','in_progress'])
function category(order){return DONE.has(order.status)?'finished':WORK.has(order.status)?'working':'waiting'}
function titleOf(order,locale){const copy=order.serviceCopy||{}
  return copy[locale]?.title||copy.en?.title||copy.ru?.title||order.remoteBooking?.serviceTitle||
    ({en:'Personal service',ru:'Индивидуальная услуга',es:'Servicio personal'})[locale]}
function imageOf(order,locale){
  const value=titleOf(order,locale).toLowerCase()
  if(/reiki|рейки|инциа|инициа|kundalini|кундалини/i.test(value))return '/images/holistic-house/reiki-approved-sunrise-v3.webp'
  if(/meditat|медитац|meditaci|video|видео|видеорол/i.test(value))return '/images/holistic-house/hero-olive-incense.webp'
  return '/images/holistic-house/hero-olive-incense.webp'
}
function dateOf(value,locale){
  const ms=Date.parse(value||'');if(!Number.isFinite(ms))return ''
  return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{
    day:'numeric',month:'short',year:'numeric',timeZone:'America/Toronto'}).format(new Date(ms))
}
function priceOf(order,t){
  // Never substitute the current catalogue price for the agreed order price.
  const r=order.remoteBooking
  return r&&r.price!=null&&Number.isFinite(Number(r.price))&&Number(r.price)>=0
    ? new Intl.NumberFormat('en-IE',{maximumFractionDigits:2}).format(Number(r.price))+' '+(r.currency||'EUR')
    :t.noPrice
}
export default function MessagesOrdersClients({locale='en',children}){
  const searchParams=useSearchParams()
  const t=TEXT[locale]||TEXT.en,status=STATES[locale]||STATES.en
  const [section,setSection]=useState('orders')
  const [ordersData,setOrdersData]=useState(null)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [signedOut,setSignedOut]=useState(false)
  const [generation,setGeneration]=useState(0)
  const [filter,setFilter]=useState('all')
  const [selectedId,setSelectedId]=useState('')
  useEffect(()=>{
    const q=new URLSearchParams(window.location.search)
    setSection(q.get('section')==='clients'||q.has('to')||q.has('tab')?'clients':'orders')
    const id=q.get('order')
    setSelectedId(id&&/^[0-9a-f-]{36}$/i.test(id)?id:'')
  },[searchParams])
  const reload=useCallback(()=>setGeneration(v=>v+1),[])
  useEffect(()=>{
    const controller=new AbortController()
    setLoading(true);setError('')
    fetch('/api/app/messages/my-orders',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async r=>{
        const data=await r.json().catch(()=>({}))
        if(!r.ok)throw new Error(data.error||'REQUESTS_UNAVAILABLE')
        if(!data.accountId||!Array.isArray(data.orders))throw new Error('INVALID_RESPONSE')
        return data
      }).then(data=>{if(!controller.signal.aborted){setOrdersData(data);setSignedOut(false)}})
      .catch(e=>{if(!controller.signal.aborted){setError(t.error);setSignedOut(e.message==='SIGN_IN_REQUIRED');setOrdersData(null)}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[generation,locale])
  const orders=ordersData?.orders||[]
  const visible=useMemo(()=>orders.filter(row=>filter==='all'||category(row)===filter),[orders,filter])
  const selected=orders.find(order=>order.id===selectedId)||null
  const unread=orders.reduce((sum,order)=>sum+Math.max(0,Number(order.unread)||0),0)
  function chooseSection(value){
    setSection(value)
    const url=new URL(window.location.href)
    if(value==='orders')url.searchParams.delete('section')
    else url.searchParams.set('section','clients')
    if(value==='orders'){url.searchParams.delete('tab');url.searchParams.delete('to')}
    window.history.replaceState(window.history.state,'',url)
  }
  function chooseOrder(id){
    setSelectedId(id)
    const url=new URL(window.location.href)
    if(id)url.searchParams.set('order',id)
    else url.searchParams.delete('order')
    window.history.replaceState(window.history.state,'',url)
  }
  const clientTab=ordersData?.hasPractice?t.clients:t.conversations
  return <section className={styles.root} data-orders-clients-hub>
    <header className={styles.head}>
      <div><span className={styles.eyebrow}>HOLISTIC HOUSE</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <button type="button" onClick={reload} className={styles.refresh} aria-label={t.retry} title={t.retry}>
        <RefreshCw size={19} aria-hidden="true"/>
      </button>
    </header>
    <div className={styles.sections} role="tablist" aria-label={t.title}>
      <button type="button" role="tab" aria-controls="hh-orders-panel" aria-selected={section==='orders'}
        onClick={()=>chooseSection('orders')}><ShoppingBag size={23} aria-hidden="true"/>
        <span><strong>{t.orders}</strong><small>{t.iOrder}</small></span>
        {unread>0&&<b className={styles.count} aria-label={t.newer}>{unread>99?'99+':unread}</b>}
      </button>
      <button type="button" role="tab" aria-controls="hh-clients-panel" aria-selected={section==='clients'}
        onClick={()=>chooseSection('clients')}><Inbox size={23} aria-hidden="true"/>
        <span><strong>{clientTab}</strong><small>{ordersData?.hasPractice?t.incoming:t.conversations}</small></span>
      </button>
    </div>
    {section==='orders'&&<div id="hh-orders-panel" role="tabpanel" className={styles.panel}>
      {!selected&&<div className={styles.filters} aria-label={t.orders}>
        {[['all',t.all],['waiting',t.waiting],['working',t.working],['finished',t.finished]].map(([key,label])=>
          <button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}
            <span>{key==='all'?orders.length:orders.filter(order=>category(order)===key).length}</span>
          </button>)}
      </div>}
      {loading&&<p role="status" className={styles.notice}>{t.loading}</p>}
      {error&&<p role="alert" className={styles.notice}>{signedOut?<Link href={'/'+(locale==='es'?'en':locale)+'/app/portrait'}>{t.signIn}</Link>:t.error}
        {!signedOut&&<button type="button" onClick={reload}>{t.retry}</button>}</p>}
      {!loading&&!error&&!orders.length&&<div className={styles.empty}>
        <ShoppingBag size={38} aria-hidden="true"/><p>{t.empty}</p>
        <Link href={'/'+locale+'/masters'}>{t.explore}<ArrowRight size={18}/></Link></div>}
      {!loading&&!error&&!selected&&visible.map(order=>
        <button key={order.id} className={styles.order} type="button"
          onClick={()=>chooseOrder(order.id)} aria-label={t.open+': '+titleOf(order,locale)}>
          <img src={imageOf(order,locale)} alt="" width="88" height="92" loading="lazy"/>
          <span className={styles.orderText}>
            <strong>{titleOf(order,locale)}</strong>
            <small>{t.practitioner}: {order.practitionerName}</small>
            <b className={styles.price}>{priceOf(order,t)}</b>
            <span className={styles.orderFoot}>
              <em data-kind={category(order)}>{status[order.status]||order.status}</em>
              <small>{dateOf(order.createdAt,locale)}</small>
            </span>
          </span>
          {order.unread>0&&<span className={styles.unread}>{order.unread}</span>}
          <ArrowRight aria-hidden="true" size={18} className={styles.openArrow}/>
        </button>)}
      {!loading&&!error&&!selected&&ordersData?.hasMore&&<p className={styles.notice}>
        {t.more} <Link href={'/'+locale+'/app/consultations'}>{t.back}</Link></p>}
      {!loading&&!error&&selected&&<div className={styles.detail}>
        <button type="button" className={styles.back} onClick={()=>chooseOrder('')}>
          <ArrowLeft size={18} aria-hidden="true"/>{t.back}</button>
        <article className={styles.detailCard}>
          <img src={imageOf(selected,locale)} alt="" width="116" height="116"/>
          <div><small>{t.number} №{selected.id.slice(0,8).toUpperCase()}</small>
            <h2>{titleOf(selected,locale)}</h2>
            <p>{t.practitioner}: {selected.practitionerName}</p>
            <strong>{priceOf(selected,t)}</strong>
            <div><em data-kind={category(selected)}>{status[selected.status]||selected.status}</em></div>
          </div>
        </article>
        <div className={styles.factBox}>
          <h3><PackageCheck size={18} aria-hidden="true"/>{t.details}</h3>
          <p><b>{t.status}:</b> {status[selected.status]||selected.status}</p>
          {selected.durationMinutes&&<p><b>{t.conditions}:</b> {selected.durationMinutes} {t.minutes}</p>}
          {selected.remoteBooking?.date&&<p>{selected.remoteBooking.date} {selected.remoteBooking.time||''} ({selected.remoteBooking.timezone||'Toronto'})</p>}
          <p><Clock3 size={15} aria-hidden="true"/>{dateOf(selected.createdAt,locale)}</p>
          <p className={styles.note}><Bell size={15} aria-hidden="true"/>{t.paymentInfo}</p>
        </div>
        <div className={styles.conversation}>
          <h3><MessageCircle size={19} aria-hidden="true"/>{t.chat}</h3>
          <PracticeRequestConversation key={selected.id} requestId={selected.id} accountId={ordersData.accountId}
            locale={locale} inline autoOpen initialMessage={selected.message||''}
            createdAt={selected.createdAt} onSaved={reload} onViewed={reload}/>
        </div>
        <p className={styles.note}>{t.voiceInfo}</p>
        <div className={styles.materials}><h3><Headphones size={19}/>{t.materials}</h3>
          <p>{t.materialsInfo}</p>
          <Link href={'/'+(locale==='es'?'en':locale)+'/app/practice'}>{t.myPractice}<ArrowRight size={18}/></Link>
        </div>
      </div>}
    </div>}
    {section==='clients'&&<div id="hh-clients-panel" role="tabpanel" className={styles.clients}>
      <p className={styles.clientHint}>{t.incomingHelp}</p>
      {children}
    </div>}
  </section>
}
