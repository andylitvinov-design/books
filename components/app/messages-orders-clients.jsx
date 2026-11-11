'use client'
import {cloneElement,isValidElement,useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,Bell,Clock3,Headphones,MessageCircle,PackageCheck,History,SquarePen,ShoppingBag,Leaf,Search,SlidersHorizontal,UsersRound,ChevronRight,Sparkles,Newspaper} from 'lucide-react'
import PracticeRequestConversation from './practice-request-conversation'
import MessengerAiWorkspace from './messenger-ai-workspace'
import MessagesDailyBriefing from './messages-daily-briefing'
import MessengerGuestGate from './messenger-guest-gate'
import styles from './messages-orders-clients.module.css'

const TEXT={
 en:{title:'Messages',subtitle:'AI · Orders · Clients · News',
  introOrders:'Your orders and conversations with practitioners',introOrdersBody:'Status, messages and materials together.',introClients:'Your incoming client messages',introClientsBody:'Answer requests through existing protected conversations.',searchOrders:'Search orders, services or practitioners',filterOrders:'Filter by status',chatIndicator:'Order conversation',
  orders:'My orders',clients:'My clients',conversations:'Conversations',iOrder:'I ordered',incoming:'Requests to me',
  all:'All',waiting:'Waiting',working:'In progress',finished:'Completed',empty:'You have no orders yet.',emptyHelp:'Your order status and conversation with a practitioner will appear here.',
  explore:'Explore services',error:'Could not load your orders.',retry:'Try again',loading:'Loading your orders…',
  open:'Open order',back:'My orders',number:'Request',practitioner:'Practitioner',details:'Order details',
  conditions:'Selected terms',status:'Request status',noPrice:'Price to be agreed',minutes:'min',
  initial:'Original request',chat:'Conversation about this order',voice:'Record an audio message',
  voiceInfo:'Record or attach audio directly above. The file belongs only to this order and is played inside its private conversation.',
  noVoice:'Audio chat is available when the practitioner has a verified profile.',
  materials:'Materials and progress',materialsInfo:'Delivered materials appear in your private Cabinet after confirmation.',
  myPractice:'My practices',payment:'Payment',paymentInfo:'A request is not a confirmed booking or payment.',
  newer:'New reply',signIn:'Sign in to see your private orders',search:'Find a practitioner',more:'Older requests are available under Consultations.',
  freeLabel:'FREE',freeConsultation:'Get a free written personal review',freeConsultationDetail:'Personal written review with Andrey · no call or fee.',
  freeReiki:'Start the free Reiki practice course',freeReikiDetail:'Five guided lessons, meditations and easy exercises.',
  incomingHelp:'Client requests and messages go to your existing protected practitioner inbox.',
  notifyTitle:'Do not miss your practitioner’s reply',notifyInfo:'Enable phone or Telegram alerts for updates after you leave the site.',notifyAction:'Notification settings'},
 ru:{title:'Сообщения',subtitle:'ИИ · Заказы · Клиенты · Новости',
  introOrders:'Здесь хранятся ваши заказы и переписка с мастерами',introOrdersBody:'Все статусы, диалоги и материалы в одном месте.',introClients:'Здесь вы видите входящие сообщения от клиентов',introClientsBody:'Отвечайте на обращения через защищённые диалоги.',searchOrders:'Поиск по заказам, мастерам, темам',filterOrders:'Фильтр по статусу',chatIndicator:'Переписка по заказу',
  orders:'Мои заказы',clients:'Мои клиенты',conversations:'Переписка',iOrder:'Я заказываю',incoming:'Мне поступили',
  all:'Все',waiting:'Жду ответа',working:'В работе',finished:'Завершены',empty:'Пока нет заказов.',emptyHelp:'После оформления здесь появятся статус заказа и переписка с мастером.',
  explore:'Выбрать услугу',error:'Не удалось загрузить заказы.',retry:'Повторить',loading:'Загружаем ваши заказы…',
  open:'Открыть заказ',back:'Мои заказы',number:'Заявка',practitioner:'Мастер',details:'Детали заказа',
  conditions:'Выбранные условия',status:'Статус заявки',noPrice:'Стоимость уточняется',minutes:'мин',
  initial:'Исходное обращение',chat:'Переписка по заказу',voice:'Записать аудиосообщение',
  voiceInfo:'Записывайте и отправляйте аудио прямо в переписке выше. Запись привязана к этому заказу и видна только его участникам.',
  noVoice:'Аудиочат доступен после подтверждения профиля мастера.',
  materials:'Материалы и результат',materialsInfo:'Выданные материалы откроются в защищённом кабинете после подтверждения.',
  myPractice:'Мои практики',payment:'Оплата',paymentInfo:'Заявка ещё не означает запись или подтверждённую оплату.',
  newer:'Новый ответ',signIn:'Войдите, чтобы увидеть личные заказы',search:'Найти мастера',more:'Более ранние заявки доступны в разделе «Консультации».',
  freeLabel:'БЕСПЛАТНО',freeConsultation:'Получить бесплатный письменный разбор',freeConsultationDetail:'Личный письменный разбор с Андреем · без звонка и оплаты.',
  freeReiki:'Пройти бесплатный курс практик Рейки',freeReikiDetail:'5 уроков с медитациями и простыми упражнениями.',
  incomingHelp:'Все заявки ваших клиентов и сообщения открываются в существующем защищённом разделе.',
  notifyTitle:'Не пропустите ответ мастера',notifyInfo:'Настройте уведомления на телефон или в Telegram, даже когда сайт закрыт.',notifyAction:'Настроить уведомления'},
 es:{title:'Mensajes',subtitle:'IA · Pedidos · Clientes · Noticias',
  introOrders:'Tus pedidos y conversaciones con profesionales',introOrdersBody:'Estados, mensajes y materiales en un solo lugar.',introClients:'Aquí están los mensajes de tus clientes',introClientsBody:'Responde a las consultas en conversaciones privadas.',searchOrders:'Buscar pedidos, temas o profesionales',filterOrders:'Filtrar por estado',chatIndicator:'Conversación del pedido',
  orders:'Mis pedidos',clients:'Mis clientes',conversations:'Conversaciones',iOrder:'Mis solicitudes',incoming:'Recibidos',
  all:'Todos',waiting:'Pendientes',working:'En curso',finished:'Terminados',empty:'Todavía no tienes pedidos.',emptyHelp:'Aquí verás el estado de tus pedidos y el chat con el profesional.',
  explore:'Explorar servicios',error:'No se pudieron cargar tus pedidos.',retry:'Reintentar',loading:'Cargando pedidos…',
  open:'Abrir pedido',back:'Mis pedidos',number:'Solicitud',practitioner:'Profesional',details:'Detalles del pedido',
  conditions:'Opciones elegidas',status:'Estado de la solicitud',noPrice:'Precio por confirmar',minutes:'min',
  initial:'Solicitud original',chat:'Conversación sobre el pedido',voice:'Grabar mensaje de voz',
  voiceInfo:'Graba y envía audios arriba. La grabación pertenece a este pedido y solo es accesible para sus participantes.',
  noVoice:'El chat de audio requiere un perfil profesional verificado.',
  materials:'Materiales y resultado',materialsInfo:'Los materiales entregados aparecen en tu cuenta privada después de la confirmación.',
  myPractice:'Mis prácticas',payment:'Pago',paymentInfo:'Una solicitud no confirma una reserva ni un pago.',
  newer:'Nueva respuesta',signIn:'Inicia sesión para ver tus pedidos',search:'Buscar profesional',more:'Las solicitudes anteriores están en Consultas.',
  freeLabel:'GRATIS',freeConsultation:'Solicitar un análisis personal escrito gratuito',freeConsultationDetail:'Revisión personal escrita con Andrey · sin llamada ni pago.',
  freeReiki:'Empezar el curso gratis de prácticas Reiki',freeReikiDetail:'Cinco lecciones con meditaciones y ejercicios sencillos.',
  incomingHelp:'Las solicitudes de tus clientes y mensajes están en la bandeja protegida existente.',
  notifyTitle:'No te pierdas la respuesta',notifyInfo:'Configura los avisos en tu teléfono o Telegram al cerrar el sitio.',notifyAction:'Configurar avisos'},
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
export default function MessagesOrdersClients({locale:routeLocale='en',children}){
  const searchParams=useSearchParams()
  const [locale,setLocale]=useState(routeLocale)
  useEffect(()=>setLocale(routeLocale),[routeLocale])
  const t=TEXT[locale]||TEXT.en,status=STATES[locale]||STATES.en
  const [section,setSection]=useState(()=>{
    const requested=searchParams.get('section')
    return requested==='clients'||searchParams.has('requestId')||searchParams.has('to')||searchParams.has('tab')?'clients':
      requested==='orders'||searchParams.has('order')?'orders':requested==='news'?'news':'ai'
  })
  const [ordersData,setOrdersData]=useState(null)
  // Keep AI authentication separate from potentially unavailable orders data.
  const [aiIdentity,setAiIdentity]=useState({status:'checking',accountId:null})
  const [identityCheck,setIdentityCheck]=useState(0)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [signedOut,setSignedOut]=useState(false)
  const [generation,setGeneration]=useState(0)
  const [filter,setFilter]=useState('all')
  const [filtersOpen,setFiltersOpen]=useState(false)
  const [search,setSearch]=useState('')
  const [clientCount,setClientCount]=useState(0)
  const [clientDetailOpen,setClientDetailOpen]=useState(false)
  const [clientsVisited,setClientsVisited]=useState(()=>section==='clients')
  useEffect(()=>{if(section==='clients')setClientsVisited(true)},[section])
  const [selectedId,setSelectedId]=useState('')
  const orderChatRef=useRef(null)
  const hubRef=useRef(null)
  const aiAccountRef=useRef(null)
  const [aiSession,setAiSession]=useState(0)
  useEffect(()=>{
    const q=new URLSearchParams(window.location.search)
    const requested=q.get('section')
    setSection(requested==='clients'||q.has('requestId')||q.has('to')||q.has('tab')?'clients':
      requested==='orders'||q.has('order')?'orders':requested==='news'?'news':'ai')
    const id=q.get('order')
    // Switching folders removes ?order= from the URL, but must not discard
    // the private conversation still mounted behind the current tab.
    if(id&&/^[0-9a-f-]{36}$/i.test(id))setSelectedId(id)
    else if(requested==='orders')setSelectedId('')
  },[searchParams])
  const reload=useCallback(()=>setGeneration(v=>v+1),[])
  const retryAiIdentity=useCallback(()=>setIdentityCheck(v=>v+1),[])
  useEffect(()=>{
    const controller=new AbortController()
    setAiIdentity({status:'checking',accountId:null})
    fetch('/api/app/session',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async response=>{
        if(response.status===401)return {status:'guest',accountId:null}
        if(!response.ok)return {status:'unavailable',accountId:null}
        const data=await response.json().catch(()=>null)
        if(data?.authenticated!==true||typeof data.accountId!=='string')
          return {status:'unavailable',accountId:null}
        return {status:'authenticated',accountId:data.accountId}
      })
      .then(identity=>{if(!controller.signal.aborted)setAiIdentity(identity)})
      .catch(()=>{if(!controller.signal.aborted)setAiIdentity({status:'unavailable',accountId:null})})
    return()=>controller.abort()
  },[identityCheck])
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
  },[generation,routeLocale])
  // Orders failures are not logout; only a verified identity change can reset chat.
  useEffect(()=>{
    if(aiIdentity.status==='authenticated'){
      const account=aiIdentity.accountId
      if(aiAccountRef.current&&aiAccountRef.current!==account)
        setAiSession(value=>value+1)
      aiAccountRef.current=account
    }else if(aiIdentity.status==='guest'&&aiAccountRef.current){
      aiAccountRef.current=null
      setAiSession(value=>value+1)
    }
  },[aiIdentity.status,aiIdentity.accountId])
  const orders=ordersData?.orders||[]
  const visible=useMemo(()=>{
    const term=search.trim().toLocaleLowerCase()
    return orders.filter(row=>(filter==='all'||category(row)===filter)&&
      (!term||[titleOf(row,locale),row.practitionerName,status[row.status],
        row.remoteBooking?.serviceTitle].some(value=>String(value||'').toLocaleLowerCase().includes(term))))
  },[orders,filter,search,locale,status])
  const selected=orders.find(order=>order.id===selectedId)||null
  // Real iPhone visual viewport is authoritative: an open order chat occupies
  // the *visible* screen, not the area below its order details.
  useEffect(()=>{
    const pane=orderChatRef.current
    if(!pane||section!=='orders'||!selectedId)return
    let frame=0
    const update=()=>{
      if(!window.matchMedia('(max-width:760px)').matches){
        pane.style.removeProperty('--hh-order-chat-top')
        pane.style.removeProperty('--hh-order-chat-height')
        return
      }
      const visual=window.visualViewport
      pane.style.setProperty('--hh-order-chat-top',Math.max(0,Math.round(visual?.offsetTop||0))+'px')
      pane.style.setProperty('--hh-order-chat-height',
        Math.max(1,Math.floor(visual?.height||window.innerHeight))+'px')
    }
    const schedule=()=>{window.cancelAnimationFrame(frame);frame=requestAnimationFrame(update)}
    schedule()
    const visual=window.visualViewport
    window.addEventListener('resize',schedule)
    window.addEventListener('orientationchange',schedule)
    window.addEventListener('pageshow',schedule)
    document.addEventListener('focusin',schedule)
    document.addEventListener('focusout',schedule)
    visual?.addEventListener('resize',schedule)
    visual?.addEventListener('scroll',schedule)
    return()=>{
      cancelAnimationFrame(frame)
      window.removeEventListener('resize',schedule)
      window.removeEventListener('orientationchange',schedule)
      window.removeEventListener('pageshow',schedule)
      document.removeEventListener('focusin',schedule)
      document.removeEventListener('focusout',schedule)
      visual?.removeEventListener('resize',schedule)
      visual?.removeEventListener('scroll',schedule)
      pane.style.removeProperty('--hh-order-chat-top')
      pane.style.removeProperty('--hh-order-chat-height')
    }
  },[section,selectedId,ordersData?.accountId])

  // The AI workspace has its own scrolling conversation and pinned composer.
  // Measure the actual visible viewport; the one existing dock takes space
  // only while it is visible and no chat editor is focused.
  useEffect(()=>{
    const hub=hubRef.current
    if(!hub)return
    let frame=0
    const update=()=>{
      if(!window.matchMedia('(max-width:760px)').matches||section!=='ai'){
        for(const name of ['--hh-messenger-top','--hh-messenger-height'])
          hub.style.removeProperty(name)
        delete hub.dataset.chatEditing
        delete hub.dataset.keyboardOpen
        return
      }
      const visual=window.visualViewport
      const top=Math.max(0,Math.round(visual?.offsetTop||0))
      const bottom=top+(visual?.height||window.innerHeight)
      const active=document.activeElement
      const editing=Boolean(hub.querySelector('[data-hh-messenger-ai]')?.contains(active))&&
        Boolean(active?.matches?.('textarea,input:not([type="file"]),[contenteditable="true"]'))
      // Share iOS keyboard visibility with the unified dock and handle Safari animation.
      const sharedKeyboard=document.querySelector('.hh-messages-page')?.dataset.hhMobileKeyboardOpen==='true'
      const visualHeight=visual?.height||window.innerHeight
      const keyboard=editing&&(sharedKeyboard||window.innerHeight-bottom>92||
        visualHeight<window.innerHeight*0.83)
      hub.dataset.chatEditing=editing?'true':'false'
      hub.dataset.keyboardOpen=keyboard?'true':'false'
      const sharedDock=document.querySelector('[data-hh-unified-dock]')
      const fallbackDock=document.querySelector('.hh-messages-page .hh-mobile-app-nav')
      const dock=[sharedDock,fallbackDock].find(el=>el&&getComputedStyle(el).display!=='none'&&
        el.getBoundingClientRect().height>0)
      const navTop=dock?.getBoundingClientRect().top
      // Reserve space for a VISIBLE dock only: no phantom 88px gap below input.
      const limit=keyboard?bottom:Math.min(bottom,navTop&&navTop>top?navTop-5:bottom)
      hub.style.setProperty('--hh-messenger-top',top+'px')
      hub.style.setProperty('--hh-messenger-height',Math.max(1,Math.floor(limit-top-4))+'px')
    }
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)}
    const visual=window.visualViewport
    schedule()
    window.addEventListener('resize',schedule)
    window.addEventListener('orientationchange',schedule)
    window.addEventListener('pageshow',schedule)
    document.addEventListener('focusin',schedule)
    document.addEventListener('focusout',schedule)
    visual?.addEventListener('resize',schedule)
    visual?.addEventListener('scroll',schedule)
    return()=>{
      cancelAnimationFrame(frame)
      window.removeEventListener('resize',schedule)
      window.removeEventListener('orientationchange',schedule)
      window.removeEventListener('pageshow',schedule)
      document.removeEventListener('focusin',schedule)
      document.removeEventListener('focusout',schedule)
      visual?.removeEventListener('resize',schedule)
      visual?.removeEventListener('scroll',schedule)
      for(const name of ['--hh-messenger-top','--hh-messenger-height'])
        hub.style.removeProperty(name)
      delete hub.dataset.chatEditing
      delete hub.dataset.keyboardOpen
    }
  },[section])

  function chooseSection(value){
    if(!['ai','orders','clients','news'].includes(value))return
    setSection(value)
    const url=new URL(window.location.href)
    url.searchParams.set('section',value)
    if(value!=='clients'){
      url.searchParams.delete('tab')
      url.searchParams.delete('to')
      url.searchParams.delete('requestId')
    }
    if(value!=='orders')url.searchParams.delete('order')
    else if(selectedId)url.searchParams.set('order',selectedId)
    // Preserve selected client/order and their unsent drafts while changing folders.
    window.history.replaceState(window.history.state,'',url)
  }
  function chooseOrder(id){
    setSelectedId(id)
    const url=new URL(window.location.href)
    if(id)url.searchParams.set('order',id)
    else url.searchParams.delete('order')
    window.history.replaceState(window.history.state,'',url)
  }
  const guestAccess=aiIdentity.status==='guest'
  const clientTab=ordersData?.hasPractice?t.clients:t.conversations
  const detailMode=(section==='orders'&&Boolean(selected))||(section==='clients'&&clientDetailOpen)
  // Load-dependent helper lives inside the active panel, not above the tabs.
  const listHelper=section!=='ai'&&section!=='news'&&!detailMode&&!loading&&!error&&Boolean(ordersData)&&(
    <div className={styles.introCard} data-messenger-list-helper>
      <span className={styles.introIcon}><Leaf size={25} aria-hidden="true"/></span>
      <span className={styles.introCopy}><strong>{section==='orders'?t.introOrders:t.introClients}</strong>
        <small>{section==='orders'?t.introOrdersBody:t.introClientsBody}</small></span>
      <img src="/images/holistic-house/messenger-zen-stones.svg" alt="" aria-hidden="true"
        loading="lazy" width="118" height="104" className={styles.introArt}/>
    </div>
  )
  return <section ref={hubRef} className={styles.root} lang={locale} data-orders-clients-hub
    data-detail-open={detailMode||undefined} data-section={section}>
    <div className={styles.sections} role="tablist" aria-label={t.title} data-chat-top-tabs>
      <button type="button" role="tab" aria-controls="hh-ai-panel" aria-selected={section==='ai'}
        className={styles.aiTab} onClick={()=>chooseSection('ai')}>
        <Sparkles size={21} aria-hidden="true"/><span><strong>{
          locale==="ru"?"ИИ":locale==="es"?"IA":"AI"
        }</strong></span>
      </button>
      <button type="button" role="tab" aria-controls="hh-orders-panel" aria-selected={section==='orders'}
        onClick={()=>chooseSection('orders')}><ShoppingBag size={23} aria-hidden="true"/>
        <span><strong>{t.orders}</strong></span>
        {!loading&&orders.length>0&&<b className={styles.count} aria-label={t.orders}>
          {orders.length>99?'99+':orders.length}</b>}
      </button>
      <button type="button" role="tab" aria-controls="hh-clients-panel" aria-selected={section==='clients'}
        onClick={()=>chooseSection('clients')}><UsersRound size={22} aria-hidden="true"/>
        <span><strong>{clientTab}</strong></span>
        {clientCount>0&&<b className={styles.count} aria-label={clientTab}>{clientCount>99?'99+':clientCount}</b>}
      </button>
      <button type="button" role="tab" aria-controls="hh-news-panel" aria-selected={section==='news'}
        onClick={()=>chooseSection('news')}><Newspaper size={21} aria-hidden="true"/>
        <span><strong>{locale==='ru'?'Новости':locale==='es'?'Noticias':'News'}</strong></span>
      </button>
    </div>
    <header className={styles.head} data-hh-ai-assistant-header>
      <div><h1>{locale==='ru'?'ИИ-ассистент':locale==='es'?'Asistente IA':'AI Assistant'}</h1>
        <p>{locale==='ru'?'Спросить · Исследовать · Учиться · Создавать':
          locale==='es'?'Preguntar · Explorar · Aprender · Crear':'Ask · Explore · Learn · Create'}</p></div>
      <span className={styles.headerActions} data-hh-ai-assistant-actions>
        <button type="button" className={styles.notificationSettings}
          data-hh-ai-chat-history
          onClick={()=>{chooseSection('ai');window.dispatchEvent(new Event('hh:messenger-open-history'));}}
          aria-label={locale==='ru'?'История диалогов':locale==='es'?'Historial de conversaciones':'Conversation history'}
          title={locale==='ru'?'История':locale==='es'?'Historial':'History'}>
          <History size={19} aria-hidden="true"/>
        </button>
        <button type="button" className={styles.refresh}
          data-hh-ai-new-chat
          onClick={()=>{chooseSection('ai');window.dispatchEvent(new Event('hh:messenger-new-chat'));}}
          aria-label={locale==='ru'?'Новый диалог':locale==='es'?'Nuevo chat':'New chat'}
          title={locale==='ru'?'Новый диалог':locale==='es'?'Nuevo chat':'New chat'}>
          <SquarePen size={19} aria-hidden="true"/>
        </button>
      </span>
    </header>
    <div id="hh-ai-panel" role="tabpanel" data-hh-messenger-ai hidden={section!=='ai'}>
      <MessengerAiWorkspace key={aiSession} locale={locale}
          onConversationLocaleChange={setLocale} authenticated={aiIdentity.status==='authenticated'} authStatus={aiIdentity.status}
          onAuthRetry={retryAiIdentity}/>
    </div>
    <div id="hh-orders-panel" role="tabpanel" className={styles.panel} hidden={section!=='orders'}>
      {guestAccess?(section==='orders'?<MessengerGuestGate locale={locale} section="orders"/>:null):<>
      {listHelper}
      {!loading&&!error&&orders.length>0&&!selected&&
        <aside className={styles.notifyInvite}>
          <Bell size={19} aria-hidden="true"/>
          <div><strong>{t.notifyTitle}</strong><p>{t.notifyInfo}</p></div>
          <Link href={'/'+(locale==='es'?'en':locale)+'/app/settings#hh-phone-notifications'}
            prefetch={false}>{t.notifyAction}<ArrowRight size={15} aria-hidden="true"/></Link>
        </aside>}
      {!loading&&!error&&!selected&&ordersData&&orders.length===0&&
        <div className={styles.freeOffers} data-free-order-offers>
          <Link href={'/'+locale+'/services/free-situation-review'} className={styles.freeOffer}
            data-free-order-offer="consultation" prefetch={false}>
            <img src="/images/holistic-house/andy-about.png" alt="" aria-hidden="true"
              width="104" height="108" loading="lazy"/>
            <span className={styles.freeOfferText}>
              <small>{t.freeLabel}</small><strong>{t.freeConsultation}</strong>
              <span>{t.freeConsultationDetail}</span>
            </span>
            <ChevronRight className={styles.freeOfferArrow} size={19} aria-hidden="true"/>
          </Link>
          <Link href={'/'+locale+'/academy/reiki/free-practitioner-course'} className={styles.freeOffer}
            data-free-order-offer="reiki" prefetch={false}>
            <img src="/images/holistic-house/reiki-practitioner-sunrise.webp" alt="" aria-hidden="true"
              width="104" height="108" loading="lazy"/>
            <span className={styles.freeOfferText}>
              <small>{t.freeLabel}</small><strong>{t.freeReiki}</strong>
              <span>{t.freeReikiDetail}</span>
            </span>
            <ChevronRight className={styles.freeOfferArrow} size={19} aria-hidden="true"/>
          </Link>
        </div>}
      {!selected&&!loading&&!error&&orders.length>0&&<div className={styles.orderToolbar}>
        <label className={styles.search}><Search size={19} aria-hidden="true"/>
          <span className={styles.visuallyHidden}>{t.searchOrders}</span>
          <input type="search" value={search} autoComplete="off"
            placeholder={t.searchOrders} onChange={e=>setSearch(e.target.value)}/>
        </label>
        <button type="button" className={styles.filterToggle} aria-expanded={filtersOpen}
          aria-label={t.filterOrders} title={t.filterOrders}
          onClick={()=>setFiltersOpen(value=>!value)}><SlidersHorizontal size={20} aria-hidden="true"/></button>
      </div>}
      {!selected&&orders.length>0&&filtersOpen&&<div className={styles.filters} aria-label={t.orders}>
        {[['all',t.all],['waiting',t.waiting],['working',t.working],['finished',t.finished]].map(([key,label])=>
          <button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}
            <span>{key==='all'?orders.length:orders.filter(order=>category(order)===key).length}</span>
          </button>)}
      </div>}
      {loading&&<p role="status" className={styles.notice}>{t.loading}</p>}
      {error&&<p role="alert" className={styles.notice}>{signedOut?<Link href={'/'+(locale==='es'?'en':locale)+'/app/portrait'}>{t.signIn}</Link>:t.error}
        {!signedOut&&<button type="button" onClick={reload}>{t.retry}</button>}</p>}
      {!loading&&!error&&!orders.length&&<div className={styles.emptyHint} role="status">
        <Leaf size={24} aria-hidden="true"/>
        <span><strong>{t.empty}</strong><small>{t.emptyHelp}</small></span>
      </div>}
      {!loading&&!error&&!selected&&orders.length>0&&!visible.length&&
        <p className={styles.notice}>{locale==='ru'?'По этому запросу заказов не найдено.':
          locale==='es'?'No se encontraron pedidos.':'No matching orders.'}</p>}
      {!loading&&!error&&!selected&&visible.map(order=>
        <button key={order.id} data-order-card={order.id} className={styles.order} type="button"
          onClick={()=>chooseOrder(order.id)} aria-label={t.open+': '+titleOf(order,locale)}>
          <img src={imageOf(order,locale)} alt="" width="88" height="92" loading="lazy"/>
          <span className={styles.orderText}>
            <span className={styles.orderMain}>
              <strong>{titleOf(order,locale)}</strong>
              <em data-kind={category(order)}>{status[order.status]||order.status}</em>
            </span>
            <small>{t.practitioner}: {order.practitionerName||'—'}</small>
            <span className={styles.orderFoot}>
              <MessageCircle size={15} aria-hidden="true"/>
              <span>{t.chatIndicator}</span>
              {order.unread>0&&<b className={styles.unread}>{order.unread}</b>}
              <small>{dateOf(order.createdAt,locale)}</small>
            </span>
          </span>
          <ChevronRight aria-hidden="true" size={19} className={styles.openArrow}/>
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
        <details className={styles.factBox}>
          <summary><PackageCheck size={18} aria-hidden="true"/>{t.details}</summary>
          <p><b>{t.status}:</b> {status[selected.status]||selected.status}</p>
          {selected.durationMinutes&&<p><b>{t.conditions}:</b> {selected.durationMinutes} {t.minutes}</p>}
          {selected.remoteBooking?.date&&<p>{selected.remoteBooking.date} {selected.remoteBooking.time||''} ({selected.remoteBooking.timezone||'Toronto'})</p>}
          <p><Clock3 size={15} aria-hidden="true"/>{dateOf(selected.createdAt,locale)}</p>
          <p className={styles.note}><Bell size={15} aria-hidden="true"/>{t.paymentInfo}</p>
        </details>
        <div className={styles.conversation} ref={orderChatRef} data-hh-order-active-chat>
          <div className={styles.chatBar}>
            <button type="button" className={styles.back} onClick={()=>chooseOrder('')}
              aria-label={t.back}><ArrowLeft size={20} aria-hidden="true"/>{t.back}</button>
            <h3><MessageCircle size={18} aria-hidden="true"/>{t.chat}</h3>
          </div>
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
      </>}
    </div>
    <div id="hh-clients-panel" role="tabpanel" className={styles.clients} hidden={section!=='clients'}>
      {guestAccess?(section==='clients'?<MessengerGuestGate locale={locale} section="clients"/>:null):<>
      {listHelper}
      {clientsVisited&&(isValidElement(children)?cloneElement(children,{
        locale,onClientsCount:setClientCount,onDetailChange:setClientDetailOpen}):children)}
      </>}
    </div>
    <div id="hh-news-panel" role="tabpanel" hidden={section!=='news'}>
      {guestAccess?(section==='news'?<MessengerGuestGate locale={locale} section="news"/>:null):<MessagesDailyBriefing locale={locale} accountId={aiIdentity.accountId}
        authStatus={aiIdentity.status} active={section==='news'}
        orders={ordersData?.accountId===aiIdentity.accountId?ordersData.orders:null}
        refreshKey={generation}/>}
    </div>
  </section>
}
