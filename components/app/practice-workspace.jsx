'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Plus, FileText, Film, IdCard, UsersRound, Leaf, ReceiptText, BarChart3, ChevronRight, ClipboardList, Share2, CheckCircle2, CalendarDays, Megaphone, BookOpen, Headphones, MessageCircle } from 'lucide-react'
import CrmManager from './crm-manager'
import PractitionerClientProfiles from './practitioner-client-profiles'
import PracticeExpressReports from './practice-express-reports'
import PracticeMaterials from './practice-materials'
import {PracticeInnerHeader,PracticeInnerBottomNavigation} from './practice-inner-navigation'
import PracticeEvents from './practice-events'
import PracticeServiceStatistics from './practice-service-statistics'
import PracticeRequestsOverview from './practice-requests-overview'
import PublicEnquiryContact from './public-enquiry-contact'
import FreeExpressOwnerCase, { isOwnerFreeExpressRequest } from './free-express-owner-case'
import MyServicesDashboard from './my-services-dashboard'
import SimpleServiceEditor from './simple-service-editor'
import RemoteGoalPhoto from './remote-goal-photo'
import PracticePhotoUpload from './practice-photo-upload'
import PracticeVideoField from './practice-video-field'
import PracticePublicAlias from './practice-public-alias'
import { getHobbyServiceQuota } from '@/lib/practitioners/service-quota.js'
import { getPublicServiceDetailHref } from '@/lib/practitioners/public-service-links.js'
import './practice-dashboard.css'

async function practiceFetch(path='',body){
  const response=await fetch('/api/app/practice'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined})
  const data=await response.json().catch(()=>({}))
  if(!response.ok){const error=new Error(data.error||'REQUEST_FAILED');error.code=data.error;throw error}
  return data
}
const AREAS={
  emotional_psychological:['Emotional & psychological','Эмоции и психология'],
  body_somatic:['Body & somatic','Тело и соматика'],
  relationships:['Relationships','Отношения'],
  homeopathy_holistic:['Homeopathy & holistic health','Гомеопатия и холистическое здоровье'],
  energy_spiritual:['Energy & spiritual practices','Энергетические и духовные практики'],
  career_purpose:['Career & purpose','Карьера и предназначение'],
  business_money:['Business & money','Бизнес и деньги'],
  personal_development:['Personal development','Личностное развитие'],
}
const emptyProfile={displayName:'',professionalTitle:'',shortBio:'',fullBio:'',languages:['en'],city:'',region:'',country:'',formats:['online'],areas:['personal_development'],methods:[],yearsExperience:'',websiteUrl:'',socialUrls:[],photoPath:'',videoPresentation:null,videoMaterials:[]}
const emptyService={copy:{en:{title:'',shortDescription:'',description:''},ru:{title:'',shortDescription:'',description:''},es:{title:'',shortDescription:'',description:''}},areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',locationLabel:'',languages:['en','ru'],pricingMode:'contact',confirmedPrice:'',currency:'CAD',durationMinutes:'',imagePath:'',photos:[],goals:[],methods:[],benefits:[],faq:[],displayLocales:['en','ru'],whatsapp:'',telegram:'',videoPresentation:null}
const emptyFreeService={...emptyService,pricingMode:'free',confirmedPrice:null,currency:''}
const DASHBOARD_COPY = {
  "en": {
    "breadcrumb": "My Practice",
    "subtitle": "Grow your practice. Support more people.",
    "privateTitle": "Practitioner tools",
    "publicTools": "Manage your practice",
    "addService": "Add service",
    "createReport": "Create report",
    "myData": "My data",
    "clients": "Clients",
    "clientsHint": "Contacts and client enquiries.",
    "services": "Services",
    "servicesHint": "Manage your services and offerings.",
    "reports": "Reports",
    "reportsHint": "View and edit saved client reports.",
    "invoices": "Invoices",
    "invoicesHint": "Receipts, invoices and payments.",
    "activity": "Practice activity",
    "activityHint": "Your services and incoming requests.",
    "credentials": "Credentials",
    "extra": "More practitioner tools",
    "close": "Close",
    "active": "Active services",
    "allServices": "Existing services",
    "status": "Status",
    "approved": "approved",
    "ownerError": "Could not open private practitioner tools. Please retry.",
    "loading": "Opening My Practice…",
    "requestsMetric": "Requests",
    "servicesMetric": "Services",
    "partner": "Holistic House Partner"
  },
  "ru": {
    "breadcrumb": "Моя практика",
    "subtitle": "Развивайте практику и помогайте большему числу людей.",
    "privateTitle": "Инструменты мастера",
    "publicTools": "Управление практикой",
    "addService": "Добавить услугу",
    "createReport": "Создать отчёт",
    "myData": "Мои данные",
    "clients": "Клиенты",
    "clientsHint": "Контакты и обращения клиентов.",
    "services": "Услуги",
    "servicesHint": "Редактирование и публикация услуг.",
    "reports": "Отчёты",
    "reportsHint": "Просмотр и редактирование сохранённых отчётов клиентов.",
    "invoices": "Счета",
    "invoicesHint": "Квитанции, счета и платежи.",
    "activity": "Активность практики",
    "activityHint": "Услуги и входящие заявки.",
    "credentials": "Квалификации",
    "extra": "Другие инструменты мастера",
    "close": "Закрыть",
    "active": "Опубликованные услуги",
    "allServices": "Сохранённые услуги",
    "status": "Статус",
    "approved": "одобрен",
    "ownerError": "Не удалось открыть приватные инструменты. Повторите попытку.",
    "loading": "Открываем My Practice…",
    "requestsMetric": "Заявки",
    "servicesMetric": "Услуги",
    "partner": "Партнёр Holistic House"
  }
}
const arr=value=>Array.isArray(value)?value.join(', '):''
const list=value=>String(value||'').split(',').map(x=>x.trim()).filter(Boolean)


const PRACTICE_SHOWCASE_IMAGES={
  personal_development:'/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
  energy_spiritual:'/academy/reiki-yggdrasil/source/basic-program.jpg',
  emotional_psychological:'/images/holistic-house/hero-olive-incense.webp',
  relationships:'/images/holistic-house/video-posters/constellations-en-v1.webp',
  body_somatic:'/images/holistic-house/hero-olive-incense.webp',
  homeopathy_holistic:'/images/holistic-house/distance-homeopathy.webp',
  career_purpose:'/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
  business_money:'/images/holistic-house/video-posters/constellations-en-v1.webp',
}
function showcasePhoto(item){
  const selected=typeof item.imagePath==='string'?item.imagePath.trim():''
  if(selected&&(selected.startsWith('https://')||(selected.startsWith('/')&&!selected.startsWith('//'))))return selected
  return PRACTICE_SHOWCASE_IMAGES[item.areaKey]||'/images/holistic-house/hero-olive-incense.webp'
}
function showcasePrice(item,locale,copy){
  if(item.pricingMode==='free')return copy.free
  if(item.pricingMode==='contact'||item.confirmedPrice==null)return copy.viewService
  try {
    const amount=new Intl.NumberFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{
      style:'currency',currency:item.currency||'CAD',maximumFractionDigits:0,
    }).format(item.confirmedPrice)
    return item.pricingMode==='from'?copy.from+' '+amount:amount
  }catch{return copy.viewService}
}

function ShowcaseCover({item}){
  const [failed,setFailed]=useState(false)
  const fallback=PRACTICE_SHOWCASE_IMAGES[item.areaKey]||'/images/holistic-house/hero-olive-incense.webp'
  return <span className="hh-practice-marketplace-card-photo">
    <Image src={failed?fallback:showcasePhoto(item)} alt="" fill unoptimized loading="lazy"
      sizes="(max-width: 600px) 116px, 165px" onError={()=>setFailed(true)} />
  </span>
}

function PracticeTile({Icon,title,description,onClick,active=false}) {
  return <button type="button" className="hh-practice-tool-card" onClick={onClick} aria-pressed={active}>
    <span className="hh-practice-tool-top">
      <span className="hh-practice-tool-icon"><Icon aria-hidden="true" /></span>
      <span className="hh-practice-tool-title">{title}</span>
      <ChevronRight className="hh-practice-tool-arrow" aria-hidden="true" />
    </span>
    <span className="hh-practice-tool-description">{description}</span>
  </button>
}

export function PracticeEntry({data,locale}){
  const ru=locale==='ru',practice=data?.practice
  return <section className="hh-panel hh-section">
    <p className="hh-kicker">{ru?'Для специалистов':'For practitioners'}</p>
    <h2>{practice?(ru?'Моя практика':'My Practice'):(ru?'Вы практик?':'Are you a practitioner?')}</h2>
    <p>{practice?(ru?'Управляйте публичным профилем, услугами и заявками в том же аккаунте.':'Manage your public profile, services and requests from the same Account.'):(ru?'Предложите свои услуги через Holistic House. Публикация проходит модерацию.':'Offer your services through Holistic House. Public profiles are moderated before publication.')}</p>
    <Link className="hh-primary" href={'/'+locale+'/practice'} prefetch={false}>{practice?(ru?'Открыть My Practice':'Open My Practice'):(ru?'Стать мастером':'Become a Master')}</Link>
  </section>
}

export default function PracticeWorkspace({locale,ownerTools=null,accountId=null}){
  const ru=locale==='ru',[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[activePanel,setActivePanel]=useState(null),[materialTab,setMaterialTab]=useState('articles'),[materialShortcut,setMaterialShortcut]=useState({tab:'',nonce:0}),[shareNotice,setShareNotice]=useState(''),[newServiceRequest,setNewServiceRequest]=useState(0),[focusRequestId,setFocusRequestId]=useState(''),[selectedExpressRequestId,setSelectedExpressRequestId]=useState(''),[proStarter,setProStarter]=useState(''),[proCourseStart,setProCourseStart]=useState(false),[meditationType,setMeditationType]=useState(''),[meditationPickerOpen,setMeditationPickerOpen]=useState(false),[creationGoal,setCreationGoal]=useState('')
  async function load(){setError('');try{setData(await practiceFetch())}catch(e){setError(e.code||e.message)}}
  useEffect(()=>{load()},[])
  // Trusted cabinet deep link: owner still must authenticate before opening tools.
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    if(params.get('panel')==='materials'){
      setActivePanel('materials')
      if(params.get('materialTab')==='courses'&&params.get('create')==='1'){
        setProCourseStart(true)
        const meditation=params.get('meditation')
        if(['audio','video'].includes(meditation))setMeditationType(meditation)
      }
    }
    if(params.get('panel')==='services'){
      setActivePanel('services')
      if(params.get('create')==='1'){
        const starter=params.get('starter')
        setProStarter(['session','intro','workshop','diagnostic','energy','personal','reiki'].includes(starter)?starter:'')
        setNewServiceRequest(current=>current+1)
      }
    }
    // The public practitioner showroom passes only allowlisted panel choices.
    if(['profile','requests','analytics','events'].includes(params.get('panel')))setActivePanel(params.get('panel'))
    if(params.get('panel')==='marketing')setActivePanel('marketing')
    if(params.get('panel')==='express-reports')setActivePanel('express-reports')
    // Owner-only CRM remains guarded by isOwner; this is navigation, never authorization.
    if(params.get('panel')==='crm')setActivePanel('crm')
    if(params.get('panel')==='clients'){
      setActivePanel('clients')
      const requested=params.get('requestId')||''
      if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requested))
        setFocusRequestId(requested)
    }
  },[])
  const hasPracticeData=Boolean(data)
  useEffect(()=>{
    if(!activePanel||!hasPracticeData)return undefined
    const frame=requestAnimationFrame(()=>document.getElementById('hh-practice-workspace-top')?.scrollIntoView({behavior:'auto',block:'start'}))
    return ()=>cancelAnimationFrame(frame)
  },[activePanel,newServiceRequest,hasPracticeData])
  const t=useMemo(()=>ru?{
    title:'Моя практика',personal:'Личное пространство',intro:'Публичный профиль, услуги и заявки — отдельно от ваших личных тестов и истории.',
    noProfile:'Начните с короткого профиля. Он не станет публичным без проверки.',profile:'Профиль мастера',credentials:'Образование и credentials',services:'Услуги',requests:'Заявки',
    save:'Сохранить',submit:'Отправить на проверку',add:'Добавить',delete:'Удалить',pause:'Приостановить',contacted:'Связались',closed:'Закрыть',none:'Пока нет',status:'Статус',
    displayName:'Публичное имя',professionalTitle:'Профессиональный титул',shortBio:'Кратко о себе',fullBio:'Подробнее',languages:'Языки через запятую',formats:'Формат',areas:'Направления',methods:'Методы через запятую',city:'Город',region:'Регион',country:'Страна',years:'Лет опыта',website:'Сайт',
    credTitle:'Название квалификации',issuer:'Организация',jurisdiction:'Юрисдикция',reference:'Номер / reference',public:'Показывать публично',
    serviceTitleEn:'Название EN',serviceTitleRu:'Название RU',shortEn:'Краткое описание EN',shortRu:'Краткое описание RU',descEn:'Описание EN',descRu:'Описание RU',area:'Направление',delivery:'Формат',location:'Локация',duration:'Минут',pricing:'Цена',currency:'Валюта',
    becomeTitle:'Стать мастером',stepAbout:'1 · О себе',stepService:'2 · Бесплатная услуга',continueFree:'Продолжить: бесплатная услуга',freeTitle:'Первая бесплатная услуга',freeLead:'Добавьте простой бесплатный формат, чтобы человек мог познакомиться с вашей работой.',includeFree:'Добавить бесплатную вводную услугу',submitTogether:'Отправить профиль и услугу на проверку',submitProfile:'Отправить профиль на проверку',saveDraft:'Сохранить черновик',back:'Назад',skipFree:'Можно пропустить бесплатную услугу и добавить её позже.',submittedTogether:'Профиль отправлен на проверку. Услуга проверяется отдельно и появится только после публикации.',freePricing:'Бесплатно',offeringType:'Тип услуги',
    moderation:'Изменения публикуются только после модерации.',verified:'Проверено',partner:'Holistic House Partner',
  }:{
    title:'My Practice',personal:'Personal space',intro:'Your public profile, services and requests are separate from your private tests and History.',
    noProfile:'Start with a short practitioner profile. Nothing becomes public before review.',profile:'Practitioner profile',credentials:'Credentials',services:'Services',requests:'Requests',
    save:'Save',submit:'Submit for review',add:'Add',delete:'Delete',pause:'Pause',contacted:'Contacted',closed:'Close',none:'Nothing here yet',status:'Status',
    displayName:'Public name',professionalTitle:'Professional title',shortBio:'Short introduction',fullBio:'About',languages:'Languages, comma-separated',formats:'Format',areas:'Areas',methods:'Methods, comma-separated',city:'City',region:'Region',country:'Country',years:'Years of experience',website:'Website',
    credTitle:'Credential title',issuer:'Issuing organization',jurisdiction:'Jurisdiction',reference:'Registration / reference',public:'Show publicly',
    serviceTitleEn:'Title EN',serviceTitleRu:'Title RU',shortEn:'Short description EN',shortRu:'Short description RU',descEn:'Description EN',descRu:'Description RU',area:'Area',delivery:'Format',location:'Location',duration:'Minutes',pricing:'Pricing',currency:'Currency',
    becomeTitle:'Become a Master',stepAbout:'1 · About you',stepService:'2 · Free service',continueFree:'Continue: add free service',freeTitle:'Your first free service',freeLead:'Offer a simple free introduction so people can discover your work before choosing another service.',includeFree:'Add a free introductory service',submitTogether:'Submit profile + free service for review',submitProfile:'Submit profile for review',saveDraft:'Save draft',back:'Back',skipFree:'You can skip the free service and add it later.',submittedTogether:'Your profile has been submitted. The service is reviewed separately and appears only after publication.',freePricing:'Free',offeringType:'Service type',
    moderation:'Changes publish only after moderation.',verified:'Verified',partner:'Holistic House Partner',
  },[ru])
  async function act(fn,{rethrow=false}={}){setBusy(true);setError('');try{await fn();await load()}catch(e){setError(e.code||e.message);if(rethrow)throw e}finally{setBusy(false)}}
  const d=DASHBOARD_COPY[ru?'ru':'en']
  const isOwner=Boolean(ownerTools)
  const creationCopy=ru?{
    eyebrow:'ВАША ПРАКТИКА',title:'Что хотите предложить людям?',subtitle:'Начните с одного предложения — остальное можно добавить позже.',
    service:'Разместить услугу',serviceDetail:'Сессия, диагностика или персональная поддержка',
    reiki:'Создать услугу Рейки',reikiDetail:'Поддержка · инициация · курс, цены и сертификаты',
    meditation:'Добавить медитацию',meditationDetail:'Запись голоса или видео для ваших клиентов',
    audio:'Аудиомедитация',audioDetail:'Записать или загрузить аудио',
    video:'Видеомедитация',videoDetail:'Загрузить видео',
    safety:'Черновик сохраняется приватно. Публикация — только после вашего подтверждения.',
    limit:'Лимит услуг достигнут',
    registration:'Сначала завершите оформление профиля мастера и первой услуги. После активации откроется выбранный редактор.',
  }:locale==='es'?{
    eyebrow:'TU PRÁCTICA',title:'¿Qué quieres compartir?',subtitle:'Empieza con una propuesta. Puedes añadir más después.',
    service:'Publicar un servicio',serviceDetail:'Sesión, diagnóstico o apoyo personal',
    reiki:'Crear servicio Reiki',reikiDetail:'Apoyo · iniciación · curso, precios y certificados',
    meditation:'Añadir una meditación',meditationDetail:'Audio o vídeo para tus clientes',
    audio:'Meditación en audio',audioDetail:'Grabar o subir un audio',
    video:'Meditación en vídeo',videoDetail:'Subir un vídeo',
    safety:'Empiezas con un borrador privado. La publicación requiere tu confirmación.',
    limit:'Has alcanzado tu límite de servicios',
    registration:'Completa primero tu perfil profesional y envía el primer servicio. Después se abrirá el editor elegido.',
  }:{
    eyebrow:'YOUR PRACTICE',title:'What would you like to share?',subtitle:'Start with one offering. You can always add more later.',
    service:'List a service',serviceDetail:'A session, personal review or one-to-one support',
    reiki:'Create Reiki service',reikiDetail:'Support · initiation · course, prices & certificates',
    meditation:'Add a meditation',meditationDetail:'Share a guided audio or video practice',
    audio:'Audio meditation',audioDetail:'Record or upload your audio',
    video:'Video meditation',videoDetail:'Upload a guided video',
    safety:'Start with a private draft. Nothing goes public without your confirmation.',
    limit:'Service limit reached',
    registration:'Complete your practitioner profile and submit your first service. Your chosen editor will open once the practice is activated.',
  }
  useEffect(()=>{
    if(!data?.practiceActivated||!creationGoal)return
    // Registration already creates the first service; do not open a duplicate draft.
    if(['service','reiki'].includes(creationGoal)){
      if(!data.services?.length)addService(creationGoal==='reiki'?'reiki':'')
    } else startMeditation(creationGoal)
    setCreationGoal('')
  },[data?.practiceActivated,creationGoal])
  const marketingTools=[
    {destination:'growth',icon:Megaphone,title:'Growth Studio',description:ru?'Публикации, черновики и ручной календарь.':locale==='es'?'Publicaciones, borradores y calendario manual.':'Posts, drafts and manual calendar.'},
    {destination:'seo',icon:BarChart3,title:ru?'SEO и поиск':locale==='es'?'SEO y búsqueda':'SEO & search',description:ru?'Проверенные данные поиска и индексации.':locale==='es'?'Búsqueda e indexación verificadas.':'Verified search and indexing data.'},
    {destination:'acquisition',icon:ClipboardList,title:ru?'Кампании и заявки':locale==='es'?'Campañas y consultas':'Campaigns & enquiries',description:ru?'Счётчики, источники и этапы воронки.':locale==='es'?'Medición y etapas del embudo.':'Measurement and funnel stages.'},
    {destination:'videos',icon:Film,title:ru?'Видео сайта':locale==='es'?'Vídeos del sitio':'Website videos',description:ru?'Публичная видеобиблиотека и размещение.':locale==='es'?'Biblioteca y publicación de vídeos.':'Public video library and placement.'},
    {destination:'youtube',icon:CalendarDays,title:ru?'Загрузка YouTube':locale==='es'?'Subir a YouTube':'YouTube upload',description:ru?'Отдельная загрузка после проверки ролика и канала.':locale==='es'?'Subir tras revisar vídeo y canal.':'Separate upload after video and channel QA.'},
  ]
  async function openOwner(destination,clientId,lesson,mode) {
    if(busy||!isOwner)return
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/app/practitioner/open',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({destination,...(clientId?{clientId}:{})}),
      })
      if(!response.ok)throw new Error('OPEN_UNAVAILABLE')
      const result=await response.json()
      // The server validates ownership and maps only allowed admin destinations.
      if(typeof result.redirectUrl!=='string'||!result.redirectUrl.startsWith('/admin'))throw new Error('OPEN_UNAVAILABLE')
      // Select an allowed lesson only after the server authorizes this owner route.
      const safeLesson=['flight','tantra','kundalini','yggdrasil','initiation'].includes(lesson)?lesson:null
      const safeTradition=['egyptian','greek'].includes(lesson)?lesson:null
      const destinationUrl=destination==='reikiCourse'&&safeLesson&&
        result.redirectUrl==='/admin/materials/courses/reiki-practitioner'
        ?result.redirectUrl+'?lesson='+safeLesson+'&lang='+(locale==='ru'?'ru':'en')+(mode==='record'?'&mode=record':'')
        :destination==='coachingAudio'&&result.redirectUrl==='/admin/materials/coaching'&&safeTradition
          ?result.redirectUrl+'/'+safeTradition+'?lang='+(['ru','es'].includes(locale)?locale:'en')
          :result.redirectUrl
      window.location.assign(destinationUrl)
    } catch {
      setError(d.ownerError);setBusy(false)
    }
  }
  function setPanelRoute(panel,materialType){
    const url=new URL(window.location.href)
    if(panel)url.searchParams.set('panel',panel)
    else url.searchParams.delete('panel')
    if(materialType)url.searchParams.set('materialTab',materialType)
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
  }
  function openExpressReportFor(request){
    if(!request?.id || !(request.accountRequest===true || request.reportEligible===true))return
    setSelectedExpressRequestId(request.id)
    choosePanel('express-reports')
  }
  function choosePanel(panel){
    setActivePanel(panel)
    setPanelRoute(panel)
    setError('')
  }
  function closePanel(){
    setActivePanel(null)
    setProCourseStart(false)
    setMeditationType('')
    setPanelRoute(null)
    setError('')
  }
  function openMaterialsPanel(tab){
    setProCourseStart(false)
    setMeditationType('')
    setActivePanel('materials')
    setMaterialTab(tab)
    setMaterialShortcut(current=>({tab,nonce:current.nonce+1}))
    setPanelRoute('materials',tab)
    setError('')
  }
  function addService(starter=''){
    setProStarter(typeof starter==='string'?starter:'')
    setActivePanel('services')
    setPanelRoute('services')
    setNewServiceRequest(current=>current+1)
    setError('')
  }
  function startService(starter=''){
    if(!data?.practiceActivated){
      setCreationGoal(starter==='reiki'?'reiki':'service')
      document.getElementById('hh-practice-onboarding')?.scrollIntoView({behavior:'smooth',block:'start'})
      return
    }
    if(data.serviceQuota?.canAdd===false){setError('SERVICE_LIMIT_REACHED');return}
    addService(starter)
  }
  function startMeditation(kind){
    if(!['audio','video'].includes(kind))return
    if(!data?.practiceActivated){
      setCreationGoal(kind)
      document.getElementById('hh-practice-onboarding')?.scrollIntoView({behavior:'smooth',block:'start'})
      return
    }
    setProCourseStart(true)
    setMeditationType(kind)
    setMaterialTab('courses')
    setActivePanel('materials')
    setMaterialShortcut(current=>({tab:'courses',nonce:current.nonce+1}))
    setPanelRoute('materials','courses')
    setMeditationPickerOpen(false)
    setError('')
  }
  if(!data)return <section className="hh-practice-dashboard" aria-busy={!error}>
    <p role="status">{d.loading}</p>{error&&<p role="alert">{error}</p>}
  </section>

  const p=data.practitioner
  const onboardingService=(data.services||[]).find(item=>item.pricingMode==='free'||item.draftCopy?.pricingMode==='free')||null
  const needsOnboarding=!data.practiceActivated
  const requests=data.requests||[]
  const services=data.services||[]
  const serviceQuota=data.serviceQuota||getHobbyServiceQuota(services)
  const publishedCount=services.filter(item=>item.status==='published').length
  const openRequests=requests.filter(item=>['requested','contacted','booked','reschedule_proposed','confirmed','in_progress'].includes(item.status)).length
  const newRequests=requests.filter(item=>item.status==='requested').length
  const pendingServices=services.filter(item=>['submitted','changes_requested'].includes(item.status)).length
  const newServices=data.newServices
  const publicServiceExamples=(newServices?.recent||[])
    .filter(item=>locale!=='es'||item.displayLocales?.includes('es'))
  // Prefer examples from other masters, but never invent one if only our own are live.
  const recentPublicServices=[
    ...publicServiceExamples.filter(item=>item.practitionerSlug!==p?.slug),
    ...publicServiceExamples.filter(item=>item.practitionerSlug===p?.slug),
  ].slice(0,4)
  const marketplaceCopy=ru?{
    kicker:'HOLISTIC HOUSE · СООБЩЕСТВО',
    title:'Вдохновитесь услугами коллег',
    subtitle:'Посмотрите, как мастера представляют свои услуги. Ваше предложение тоже может появиться здесь.',
    latest:'Мастера уже размещают',noRecent:'Опубликованных примеров пока нет. Ваша услуга может стать одной из первых.',
    unavailable:'Примеры услуг временно недоступны.',all:'Все услуги',
    add:'Разместить свою услугу',limit:'Лимит услуг достигнут',
    hobby:'Hobby · бесплатно',slots:'услуг',free:'Бесплатно',from:'от',viewService:'Подробнее',
    practitioner:'Практик',
  }:locale==='es'?{
    kicker:'HOLISTIC HOUSE · COMUNIDAD',
    title:'Inspírate con otros profesionales',
    subtitle:'Mira cómo presentan sus servicios. Tu propuesta también puede aparecer aquí.',
    latest:'Servicios de la comunidad',noRecent:'Todavía no hay servicios publicados. El tuyo podría ser uno de los primeros.',
    unavailable:'Los ejemplos no están disponibles por ahora.',all:'Ver todos',
    add:'Publicar mi servicio',limit:'Límite de servicios alcanzado',
    hobby:'Hobby · gratis',slots:'servicios',free:'Gratis',from:'desde',viewService:'Descubrir',
    practitioner:'Profesional',
  }:{
    kicker:'HOLISTIC HOUSE · COMMUNITY',
    title:'Be inspired by fellow practitioners',
    subtitle:'See how others present their services. Your own offering could be next.',
    latest:'From our practitioner community',noRecent:'No published examples yet. Your service could be among the first.',
    unavailable:'Service examples are temporarily unavailable.',all:'Explore all',
    add:'Add your service — free',limit:'Service limit reached',
    hobby:'Hobby · Free',slots:'services',free:'Free',from:'From',viewService:'Explore service',
    practitioner:'Practitioner',
  }
  const hasProfile=Boolean(p?.profile?.displayName||p?.draftProfile?.displayName)
  const profileLive=Boolean(p?.slug&&p?.profile?.displayName&&['approved','submitted','changes_requested'].includes(p.status))
  const setupSteps=[
    {name:ru?'Заполните профиль':'Complete your profile',hint:ru?'Расскажите о себе':'Introduce your work',done:hasProfile},
    {name:ru?'Добавьте первую услугу':'Add your first service',hint:ru?'Можно начать с бесплатной':'A free introduction works well',done:services.length>0},
    {name:ru?'Поделитесь страницей':'Share your public page',hint:ru?'После проверки профиля':'Available after approval',done:profileLive},
  ]
  const readySteps=setupSteps.filter(step=>step.done).length
  async function shareProfile(){
    if(!profileLive){choosePanel('profile');return}
    const publicPath=p.publicAlias
      ? (locale==='en'?'/m/':'/'+locale+'/m/')+p.publicAlias
      : '/'+locale+'/masters/'+p.slug
    const url='https://holistichouse.vercel.app'+publicPath
    setShareNotice('')
    try{
      if(navigator.share){await navigator.share({title:'Holistic House',url});setShareNotice(ru?'Открыто меню отправки.':'Sharing menu opened.');return}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setShareNotice(ru?'Ссылка скопирована.':'Profile link copied.');return}
      setShareNotice(ru?'Скопируйте ссылку на профиль выше.':'Copy your profile link above.')
    }catch(error){if(error?.name!=='AbortError')setShareNotice(ru?'Скопируйте ссылку на профиль выше.':'Copy your profile link above.')}
  }
  function openSetupStep(index){
    if(needsOnboarding){document.getElementById('hh-practice-onboarding')?.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(index===0)choosePanel('profile')
    else if(index===1)choosePanel('services')
    else shareProfile()
  }
  return <section className="hh-practice-dashboard" data-practice-active={activePanel||undefined} data-practice-one-screen>
    <header className="hh-practice-head">
      <nav className="hh-practice-breadcrumb" aria-label={ru?'Путь':'Breadcrumb'}>
        <Link href={'/'+locale+'/app'} prefetch={false}>{t.personal}</Link>
        <ChevronRight aria-hidden="true" />
        <strong>{d.breadcrumb}</strong>
      </nav>
      <h1>{needsOnboarding?t.becomeTitle:t.title}</h1>
      <p className="hh-practice-intro">{needsOnboarding?t.noProfile:d.subtitle}</p>
      {p&&<div className="hh-practice-status">
        <span className={'hh-practice-status-chip'+(p.status==='approved'?' is-approved':'')}>
          <span className="hh-practice-status-dot" aria-hidden="true" />
          {d.status}: {p.status==='approved'?d.approved:p.status}
        </span>
        {p.isPartner&&<span className="hh-practice-status-chip">{d.partner}</span>}
      </div>}
    </header>
    {!activePanel&&<section className="hh-practice-first-actions" data-practice-create-first aria-label={creationCopy.title}>
      <header className="hh-practice-first-actions-heading">
        <span>{creationCopy.eyebrow}</span>
        <h2>{creationCopy.title}</h2>
        <p>{creationCopy.subtitle}</p>
      </header>
      <div className="hh-practice-first-actions-grid">
        <button type="button" className="hh-practice-first-action is-service" data-create-practice-service
          disabled={!needsOnboarding&&!serviceQuota.canAdd} onClick={()=>startService()}>
          <span className="hh-practice-first-action-icon"><Leaf aria-hidden="true"/></span>
          <span className="hh-practice-first-action-copy"><strong>{serviceQuota.canAdd||needsOnboarding?creationCopy.service:creationCopy.limit}</strong>
            <small>{creationCopy.serviceDetail}</small></span>
          <ChevronRight aria-hidden="true" className="hh-practice-first-action-arrow"/>
        </button>
        <button type="button" className="hh-practice-first-action is-reiki" data-create-practice-reiki
          disabled={!needsOnboarding&&!serviceQuota.canAdd} onClick={()=>startService('reiki')}>
          <span className="hh-practice-first-action-icon"><Leaf aria-hidden="true"/></span>
          <span className="hh-practice-first-action-copy"><strong>{creationCopy.reiki}</strong>
            <small>{creationCopy.reikiDetail}</small></span>
          <ChevronRight aria-hidden="true" className="hh-practice-first-action-arrow"/>
        </button>
        <button type="button" className="hh-practice-first-action is-meditation" data-create-practice-meditation
          aria-expanded={meditationPickerOpen} aria-controls="hh-practice-meditation-picker"
          onClick={()=>setMeditationPickerOpen(open=>!open)}>
          <span className="hh-practice-first-action-icon"><Headphones aria-hidden="true"/></span>
          <span className="hh-practice-first-action-copy"><strong>{creationCopy.meditation}</strong>
            <small>{creationCopy.meditationDetail}</small></span>
          <ChevronRight aria-hidden="true" className="hh-practice-first-action-arrow"/>
        </button>
      </div>
      {meditationPickerOpen&&<div id="hh-practice-meditation-picker" className="hh-practice-meditation-picker" data-meditation-choice>
        <button type="button" onClick={()=>startMeditation('audio')}><Headphones aria-hidden="true"/><span><strong>{creationCopy.audio}</strong><small>{creationCopy.audioDetail}</small></span><ChevronRight aria-hidden="true"/></button>
        <button type="button" onClick={()=>startMeditation('video')}><Film aria-hidden="true"/><span><strong>{creationCopy.video}</strong><small>{creationCopy.videoDetail}</small></span><ChevronRight aria-hidden="true"/></button>
      </div>}
      <p className="hh-practice-first-actions-note"><CheckCircle2 aria-hidden="true"/>{creationCopy.safety}</p>
    </section>}
    {p&&!activePanel&&<PracticePublicAlias practitioner={p} locale={locale}
      profileLive={profileLive} onSaved={load} />}

    {!needsOnboarding&&<section id="hh-practice-workspace-top" className="hh-practice-v4-launch" aria-label={ru?'Основные инструменты мастера':locale==='es'?'Herramientas del profesional':'Practitioner essentials'} data-practitioner-v4-dashboard>
      <div className="hh-practice-v4-grid">
        <button type="button" onClick={()=>choosePanel('clients')} aria-pressed={activePanel==='clients'}>
          <UsersRound aria-hidden="true"/><span>{d.clients}</span><small>{ru?'Контакты':locale==='es'?'Contactos':'Contacts'}</small>
        </button>
        <button type="button" onClick={()=>choosePanel('requests')} aria-pressed={activePanel==='requests'}>
          <ClipboardList aria-hidden="true"/><span>{d.requestsMetric}</span><strong>{openRequests}</strong>
        </button>
        <button type="button" onClick={()=>window.location.assign('/'+locale+'/app/messages'+(isOwner?'?tab=requests':''))}>
          <MessageCircle aria-hidden="true"/><span>{ru?'Сообщения':locale==='es'?'Mensajes':'Messages'}</span>
          <small>{ru?'Личный инбокс':locale==='es'?'Bandeja privada':'Private inbox'}</small>
        </button>
        <button type="button" onClick={()=>choosePanel('services')} aria-pressed={activePanel==='services'}>
          <Leaf aria-hidden="true"/><span>{d.services}</span><strong>{services.length}</strong>
        </button>
        <button type="button" onClick={()=>openMaterialsPanel('articles')} aria-pressed={activePanel==='materials'&&materialTab!=='courses'}>
          <FileText aria-hidden="true"/><span>{ru?'Материалы':locale==='es'?'Materiales':'Materials'}</span><small>{ru?'Библиотека':locale==='es'?'Biblioteca':'Library'}</small>
        </button>
        <button type="button" onClick={()=>openMaterialsPanel('courses')} aria-pressed={activePanel==='materials'&&materialTab==='courses'}>
          <BookOpen aria-hidden="true"/><span>{ru?'Курсы':locale==='es'?'Cursos':'Courses'}</span><small>{ru?'Управление':locale==='es'?'Gestionar':'Manage'}</small>
        </button>
        <button type="button" onClick={()=>choosePanel('analytics')} aria-pressed={activePanel==='analytics'}>
          <BarChart3 aria-hidden="true"/><span>{ru?'Аналитика':locale==='es'?'Analíticas':'Insights'}</span><small>{ru?'Практика':locale==='es'?'Práctica':'Practice'}</small>
        </button>
        <button type="button" onClick={()=>choosePanel('profile')} aria-pressed={activePanel==='profile'}>
          <IdCard aria-hidden="true"/><span>{ru?'Профиль':locale==='es'?'Perfil':'Profile'}</span>
        </button>
        <button type="button" onClick={()=>choosePanel('more')} aria-pressed={['more','marketing','crm','events'].includes(activePanel)}>
          <Plus aria-hidden="true"/><span>{ru?'Ещё':locale==='es'?'Más':'More'}</span>
        </button>
      </div>
      {!activePanel&&<nav className="hh-practice-community-shortcuts" aria-label={ru?'Сообщество мастеров':locale==='es'?'Comunidad de mentores':'Mentor community'}>
        <Link href={'/'+locale+'/masters'} prefetch={false}>
          <UsersRound aria-hidden="true"/>
          <span><strong>{ru?'Сообщество наставников':locale==='es'?'Comunidad de mentores':'Explore mentor community'}</strong>
            <small>{ru?'Статьи и профили':locale==='es'?'Artículos y perfiles':'Articles & profiles'}</small></span>
          <ChevronRight aria-hidden="true"/>
        </Link>
        <button type="button" onClick={()=>openMaterialsPanel('articles')}>
          <FileText aria-hidden="true"/>
          <span><strong>{ru?'Написать статью':locale==='es'?'Escribir artículo':'Write an article'}</strong>
            <small>{ru?'Публикация после проверки':locale==='es'?'Publicación tras revisión':'Published after review'}</small></span>
          <ChevronRight aria-hidden="true"/>
        </button>
      </nav>}
    </section>}

    {!activePanel&&<div className="hh-practice-v4-requests"><PracticeRequestsOverview requests={requests} services={services} locale={locale}
      canAdd={serviceQuota.canAdd}
      onAddService={needsOnboarding
        ? ()=>document.getElementById('hh-practice-onboarding')?.scrollIntoView({behavior:'smooth',block:'start'})
        : addService}
      onViewAll={()=>choosePanel('requests')} /></div>}
    {readySteps<3&&!activePanel&&<section className="hh-practice-setup" aria-label={ru?'Настройка практики':'Practice setup'}>
      <div className="hh-practice-setup-head">
        <div><h2>{ru?'Настройте свою практику':'Set up your practice'}</h2><p>{ru?'Три шага к первым клиентам':'Three steps to welcome clients'}</p></div>
        <span>{readySteps}/3</span>
      </div>
      <div className="hh-practice-setup-progress" aria-hidden="true"><span style={{width:(readySteps/3*100)+'%'}} /></div>
      <ol>{setupSteps.map((step,index)=><li key={step.name}>
        <button type="button" disabled={step.done||(index===2&&!profileLive)} onClick={()=>openSetupStep(index)}>
          <span className={'hh-practice-setup-number'+(step.done?' is-complete':'')}>{step.done?<CheckCircle2 aria-hidden="true" />:index+1}</span>
          <span className="hh-practice-setup-copy"><strong>{step.name}</strong><small>{step.hint}</small></span>
          {!step.done&&index!==2&&<ChevronRight aria-hidden="true" />}
        </button>
      </li>)}</ol>
    </section>}
    {!needsOnboarding&&!activePanel&&<div className="hh-practice-overview" aria-label={ru?'Обзор практики':'Practice overview'}>
      <div><strong>{newRequests}</strong><span>{ru?'Новые заявки':'New requests'}</span></div>
      <div><strong>{publishedCount}</strong><span>{ru?'Опубликованные услуги':'Published services'}</span></div>
      <div><strong>{pendingServices}</strong><span>{ru?'Ждут проверки':'Under review'}</span></div>
    </div>}
    {!needsOnboarding&&!activePanel&&<div id="hh-practice-v4-analytics" className="hh-practice-v4-analytics"><PracticeServiceStatistics analytics={data.serviceAnalytics} registrationStats={data.registrationStats} locale={locale} accountId={accountId} /></div>}
    {!needsOnboarding&&!activePanel&&p?.slug&&p.status==='approved'&&<p className="hh-practice-public-link">
      <Link href={p.publicAlias?(locale==='en'?'/m/':'/'+locale+'/m/')+p.publicAlias:'/'+locale+'/masters/'+p.slug} prefetch={false}>
        {ru?'Посмотреть мою публичную страницу':'View my public profile'} <span aria-hidden="true">↗</span>
      </Link>
      <button type="button" onClick={shareProfile}><Share2 aria-hidden="true" />{ru?'Поделиться':'Share'}</button>
    </p>}
    {!needsOnboarding&&!activePanel&&<>
      <nav className="hh-practice-quick" aria-label={ru?'Быстрые действия':'Quick actions'}>
        {isOwner&&<button type="button" disabled={busy} onClick={()=>openOwner('report')}>
          <FileText aria-hidden="true" />{ru?'Полный отчёт · мой':locale==='es'?'Informe completo · propietario':'Full report · owner only'}
        </button>}
        <button type="button" aria-pressed={activePanel==='express-reports'} onClick={()=>choosePanel('express-reports')}>
          <FileText aria-hidden="true"/>{ru?'Экспресс-отчёт':locale==='es'?'Informe exprés':'Express report'}
        </button>
        {!isOwner&&<button type="button" aria-pressed={activePanel==='requests'}
          onClick={()=>choosePanel('requests')}><ClipboardList aria-hidden="true" />{t.requests}</button>}
        <button type="button" onClick={shareProfile}>
          <Share2 aria-hidden="true" />{profileLive?(ru?'Пригласить клиента':'Invite client'):(ru?'Мой профиль':'My profile')}
        </button>
      </nav>
      <details className="hh-practice-v4-extra" data-practice-more-tools>
        <summary><BarChart3 aria-hidden="true"/><span>{ru?'Другие инструменты':locale==='es'?'Otras herramientas':'More tools'}</span><ChevronRight aria-hidden="true"/></summary>
      <section aria-labelledby="hh-practice-tools-title" className="hh-practice-tools">
        <div className="hh-practice-tool-heading"><h2 id="hh-practice-tools-title">{isOwner?d.privateTitle:d.publicTools}</h2></div>
        <div className="hh-practice-tool-grid">
          <PracticeTile Icon={UsersRound} title={d.clients} description={d.clientsHint}
            onClick={()=>choosePanel('clients')} active={activePanel==='clients'} />
          {isOwner&&<PracticeTile Icon={Megaphone}
            title={locale==='ru'?'Маркетинг':locale==='es'?'Marketing':'Marketing'}
            description={locale==='ru'?'Growth Studio, SEO, кампании и видео.':locale==='es'?'Growth Studio, SEO, campañas y vídeos.':'Growth Studio, SEO, campaigns and video.'}
            onClick={()=>choosePanel('marketing')} active={activePanel==='marketing'} />}
          {isOwner&&<PracticeTile Icon={UsersRound}
            title={locale==='ru'?'CRM · Контакты':locale==='es'?'CRM · Contactos':'CRM · Contacts'}
            description={locale==='ru'?'Контакты, статусы и подписчики.':locale==='es'?'Contactos, estados y suscriptores.':'Contacts, stages and subscribers.'}
            onClick={()=>choosePanel('crm')} active={activePanel==='crm'} />}
          <PracticeTile Icon={Film} title={ru?'Материалы':'Materials'} description={isOwner?(ru?'Курсы, медитации, статьи и видео.':locale==='es'?'Cursos, meditaciones, artículos y vídeos.':'Courses, meditations, articles and videos.'):ru?'Ваши статьи и видео: добавляйте, редактируйте и публикуйте после проверки.':'Your articles and videos: add, edit and submit for review.'}
            onClick={()=>choosePanel('materials')} active={activePanel==='materials'} />
          <PracticeTile Icon={CalendarDays} title={locale==='ru'?'Мероприятия':locale==='es'?'Eventos':'Events'}
            description={locale==='ru'?'Создавайте встречи и семинары, управляйте датами и публикациями.':locale==='es'?'Organiza encuentros, talleres y publicaciones.':'Create workshops and gatherings, manage dates and publication.'}
            onClick={()=>choosePanel('events')} active={activePanel==='events'} />
          <PracticeTile Icon={Leaf} title={d.services} description={d.servicesHint}
            onClick={()=>choosePanel('services')} active={activePanel==='services'} />
          <PracticeTile Icon={FileText} title={ru?'Экспресс-отчёты':locale==='es'?'Informes exprés':'Express reports'}
            description={ru?'Разбор ситуации без препаратов, в личный кабинет клиента.':locale==='es'?'Análisis sin remedios, en la cuenta del cliente.':'Private situation reviews without remedies.'}
            onClick={()=>choosePanel('express-reports')} active={activePanel==='express-reports'}/>
          {isOwner&&<PracticeTile Icon={FileText} title={d.reports} description={d.reportsHint}
            onClick={()=>openOwner('reports')} />}
          {isOwner?<PracticeTile Icon={ReceiptText} title={d.invoices} description={d.invoicesHint}
            onClick={()=>openOwner('payment')} />:
          <PracticeTile Icon={IdCard} title={d.myData} description={t.profile}
            onClick={()=>choosePanel('profile')} active={activePanel==='profile'} />}
        </div>
        <button className="hh-practice-activity" type="button" aria-pressed={activePanel==='requests'}
          onClick={()=>choosePanel('requests')}>
          <span className="hh-practice-tool-icon"><BarChart3 aria-hidden="true" /></span>
          <span className="hh-practice-activity-copy">
            <strong>{d.activity}</strong>
            <small>{d.activityHint} · {openRequests} {d.requestsMetric.toLowerCase()}</small>
          </span>
          <ChevronRight className="hh-practice-tool-arrow" aria-hidden="true" />
        </button>
      </section>
      </details>
    </>}
    {needsOnboarding? <div id="hh-practice-onboarding">{creationGoal&&<p className="hh-practice-registration-intent" role="status">{creationCopy.registration}</p>}<MasterOnboarding
        key={(p?.revision||'new')+':'+(onboardingService?.revision||'none')}
        data={data} practitioner={p} service={onboardingService} locale={locale} t={t}
        busy={busy} onAction={payload=>act(()=>practiceFetch('/onboarding',payload))} /></div>:
      activePanel&&<section id="hh-practice-workspace-detail" className="hh-practice-form-panel" data-practice-detail-panel={activePanel}>
        <PracticeInnerHeader locale={locale} panel={activePanel} requests={requests}
          onBack={closePanel} onNavigate={choosePanel}/>
        <div className="hh-practice-form-heading">
          <h2>{activePanel==='more'?(ru?'Ещё инструменты':locale==='es'?'Más herramientas':'More tools'):activePanel==='analytics'?(ru?'Аналитика':locale==='es'?'Analíticas':'Analytics'):activePanel==='marketing'?(ru?'Маркетинг':'Marketing'):activePanel==='materials'?(ru?'Мои материалы':'My materials'):activePanel==='express-reports'?(ru?'Экспресс-отчёты':locale==='es'?'Informes exprés':'Express reports'):activePanel==='events'?(locale==='ru'?'Мои мероприятия':locale==='es'?'Mis eventos':'My events'):activePanel==='services'?d.addService:activePanel==='profile'?d.myData:activePanel==='requests'?d.activity:activePanel==='clients'&&isOwner?(locale==='ru'?'Клиенты · Карточки и заявки':locale==='es'?'Clientes · Fichas y solicitudes':'Clients · Records & enquiries'):activePanel==='clients'?d.clients:d.credentials}</h2>
          <button type="button" className="hh-practice-close" onClick={closePanel}>{d.close} ×</button>
        </div>
        {activePanel==='more'&&<div className="hh-practice-inline-more" data-practice-inline-more>
          <div className="hh-practice-tool-grid">
            <PracticeTile Icon={CalendarDays} title={locale==='ru'?'Мероприятия':locale==='es'?'Eventos':'Events'}
              description={ru?'Создать встречу или семинар':'Create a meeting or workshop'} onClick={()=>choosePanel('events')} />
            {isOwner&&<PracticeTile Icon={Megaphone} title={ru?'Маркетинг':locale==='es'?'Marketing':'Marketing'}
              description={ru?'Growth Studio, SEO и кампании':'Growth Studio, SEO & campaigns'} onClick={()=>choosePanel('marketing')} />}
            {isOwner&&<PracticeTile Icon={UsersRound} title={ru?'CRM · Контакты':locale==='es'?'CRM · Contactos':'CRM · Contacts'}
              description={ru?'Контакты и подписчики':'Contacts and subscribers'} onClick={()=>choosePanel('crm')} />}
            <PracticeTile Icon={FileText} title={ru?'Экспресс-отчёт':locale==='es'?'Informe exprés':'Express report'}
              description={ru?'Приватный разбор ситуации, без гомеопатии':'Private situation review, without remedies'} onClick={()=>choosePanel('express-reports')} />
            {isOwner&&<PracticeTile Icon={FileText} title={d.createReport}
              description={ru?'Новый отчёт для клиента':'New client report'} onClick={()=>openOwner('report')} />}
            {isOwner&&<PracticeTile Icon={FileText} title={d.reports} description={d.reportsHint} onClick={()=>openOwner('reports')} />}
            {isOwner&&<PracticeTile Icon={ReceiptText} title={d.invoices} description={d.invoicesHint} onClick={()=>openOwner('payment')} />}
            <PracticeTile Icon={Share2} title={ru?'Поделиться профилем':locale==='es'?'Compartir mi perfil':'Share my profile'}
              description={ru?'Ссылка на мою публичную страницу':'Public profile link'} onClick={shareProfile} />
          </div>
        </div>}
        {activePanel==='marketing'&&isOwner&&<div className="hh-practice-marketing">
          <p className="hh-practice-marketing-intro">{ru?'Ваши инструменты продвижения в одном месте. Автопубликация и реклама без отдельного подтверждения не запускаются.':locale==='es'?'Herramientas de promoción en un solo lugar. No se activan anuncios ni publicaciones automáticas.':'Your promotion tools in one place. No ads or automatic publishing are activated.'}</p>
          <div className="hh-practice-marketing-grid">
            {marketingTools.map(({destination,icon:Icon,title,description})=><button
              key={destination} type="button" className="hh-practice-marketing-link" disabled={busy}
              onClick={()=>openOwner(destination)}>
              <span className="hh-practice-marketing-icon"><Icon aria-hidden="true" /></span>
              <span className="hh-practice-marketing-copy"><strong>{title}</strong><small>{description}</small></span>
              <ChevronRight aria-hidden="true" className="hh-practice-marketing-arrow"/>
            </button>)}
          </div>
        </div>}
        {activePanel==='materials'&&<PracticeMaterials key={p?.id||'materials'} quickCreateCourse={proCourseStart} meditationType={meditationType} shortcut={materialShortcut} onTabChange={setMaterialTab} locale={locale} practitioner={p} services={services} busy={busy} isOwner={isOwner} onOpenReikiCourse={(lesson,mode)=>openOwner('reikiCourse',undefined,lesson,mode)} onOpenCoachingAudio={slug=>openOwner('coachingAudio',undefined,slug)} onOpenServices={()=>choosePanel('services')} onAddService={addService} onOpenYoutube={()=>openOwner('youtube')} accountId={accountId}
           onSaveVideos={videos=>act(()=>practiceFetch('/profile',{action:'save',
             profile:{...emptyProfile,...(p?.draftProfile||{}),videoMaterials:videos},expectedRevision:p.revision}),{rethrow:true})}
           onSaveSitePresentation={video=>act(()=>practiceFetch('/profile',{action:'save',
             profile:{...emptyProfile,...(p?.draftProfile||{}),videoPresentation:video},expectedRevision:p.revision}),{rethrow:true})}
           onSubmitVideos={()=>act(()=>practiceFetch('/profile',{action:'submit',expectedRevision:p.revision}))} />}
        {activePanel==='services'&&<div id="hh-practice-services-view" className="hh-practice-inline-services">
          <Services items={services} t={t} locale={locale} busy={busy} quota={serviceQuota} createRequest={newServiceRequest} starter={proStarter}
        onSave={(id,draft,expectedRevision)=>act(()=>practiceFetch('/services'+(id?'/'+id:''),{draft,expectedRevision}))}
        onSaveAndSubmit={(id,draft,expectedRevision)=>act(async()=>{
          const saved=await practiceFetch('/services'+(id?'/'+id:''),{draft,expectedRevision})
          try {
            return await practiceFetch('/services/'+saved.id,{action:'submit',expectedRevision:saved.revision})
          } catch (error) {
            // Keep the newly saved draft visible if moderation validation fails.
            await load()
            throw error
          }
        })}
        onPause={item=>act(()=>practiceFetch('/services/'+item.id,{action:'pause',expectedRevision:item.revision}))} />
      <details className="hh-practice-fee-notice" aria-label={ru?'Условия комиссии':'Platform commission'}>
        <summary>{ru?'Комиссия 20% за оплаченные заказы на сайте':'20% commission on paid website orders'}</summary>
        <p>{ru?'Мастеру — 80% до применимых сборов и налогов. Бесплатные услуги без комиссии. Оплата на сайте и выплаты мастерам пока не включены.':'Practitioners receive 80% before applicable payment fees and taxes. Free services have no commission. Marketplace checkout and payouts are not yet enabled.'}</p>
      </details>
        </div>}
        {activePanel==='express-reports'&&<PracticeExpressReports locale={locale} accountId={accountId} requests={requests} owner={isOwner} initialRequestId={selectedExpressRequestId} onOpenRequests={()=>choosePanel('requests')}/>}
        {activePanel==='analytics'&&<div id="hh-practice-v4-analytics" className="hh-practice-v4-analytics">
          <PracticeServiceStatistics analytics={data.serviceAnalytics} registrationStats={data.registrationStats} locale={locale} accountId={accountId} />
        </div>}
        {activePanel==='events'&&<PracticeEvents locale={locale} accountId={accountId} />}

        {activePanel==='clients'&&isOwner&&
          <Link href="/admin/personal-support" className="hh-practice-monthly-support-link" data-monthly-support-owner-link>
            {locale==='ru'?'Месячное сопровождение · €200 — клиенты и встречи':locale==='es'?'Acompañamiento mensual · 200 € — clientes y sesiones':'Monthly support · €200 — clients and sessions'}
            <ChevronRight aria-hidden="true"/>
          </Link>}
        {activePanel==='clients'&&
          <PractitionerClientProfiles items={requests} services={services}
            practitionerTasks={data.practitionerTasks||[]}
            practitionerTaskSummary={data.practitionerTaskSummary}
            locale={locale} accountId={accountId} busy={busy} isOwner={isOwner}
            freeExpressV2Enabled={data.freeExpressV2Enabled === true}
            onOpenLegacy={clientId=>openOwner(clientId?'client':'clients',clientId)}
            onRefresh={()=>load()}
            onCreateReport={openExpressReportFor}
            focusRequestId={focusRequestId}
            onStatus={(item,status,extra={})=>act(()=>practiceFetch('/requests/'+item.id,{...(status?{status}:{}),...extra,expectedRevision:item.revision}))}
            onSaveContact={(item,payload)=>act(()=>practiceFetch('/requests/'+item.id,payload))}/>}
        {activePanel==='crm'&&isOwner&&accountId&&
          <CrmManager key={accountId} locale={locale} accountId={accountId}
            publicEnquiries={requests.filter(item=>item.requestKind==='public')}
            onOpenRequest={()=>choosePanel('requests')}
            onCreateReport={openExpressReportFor}/>}
        {activePanel==='profile'&&<>
          <ProfileEditor key={p?.revision||'profile'} practitioner={p} locale={locale} t={t} busy={busy}
            onSave={(profile,expectedRevision)=>act(()=>practiceFetch('/profile',{action:'save',profile,expectedRevision}))}
            onSubmit={()=>act(()=>practiceFetch('/profile',{action:'submit',expectedRevision:p.revision}))} />
          <details className="hh-practice-saved-services"><summary>{d.credentials} ({(data.credentials||[]).length})</summary>
            <Credentials items={data.credentials||[]} t={t} busy={busy}
              onCreate={value=>act(()=>practiceFetch('/credentials',value))}
              onDelete={id=>act(()=>practiceFetch('/credentials/'+id,{action:'delete'}))} />
          </details>
        </>}
        {activePanel==='requests'&&<Requests items={requests} services={services} t={t}
          locale={locale} busy={busy} enabled={data.freeExpressV2Enabled === true}
          isOwner={isOwner} accountId={accountId} onCreateReport={openExpressReportFor}
          onOpenRequest={item=>{setFocusRequestId(item.id);choosePanel('clients')}}
          onStatus={(item,status,extra={})=>act(()=>practiceFetch('/requests/'+item.id,{...(status?{status}:{}),...extra,expectedRevision:item.revision}))}
          onSaveContact={(item,payload)=>act(()=>practiceFetch('/requests/'+item.id,payload))}/>}
        <PracticeInnerBottomNavigation locale={locale} panel={activePanel}
          onBack={closePanel} onNavigate={choosePanel} onOpenMaterials={openMaterialsPanel}/>
      </section>}
    {!needsOnboarding&&!activePanel&&<details className="hh-practice-v4-community">
      <summary><Leaf aria-hidden="true"/><span>{marketplaceCopy.latest}</span><ChevronRight aria-hidden="true"/></summary>
      <section className="hh-practice-marketplace" aria-labelledby="hh-practice-marketplace-title">
      <div className="hh-practice-marketplace-heading">
        <span className="hh-practice-marketplace-mark"><Leaf aria-hidden="true" /></span>
        <div>
          <p className="hh-practice-marketplace-kicker">{marketplaceCopy.kicker}</p>
          <h2 id="hh-practice-marketplace-title">{marketplaceCopy.title}</h2>
          <p className="hh-practice-marketplace-intro">{marketplaceCopy.subtitle}</p>
        </div>
      </div>
      <div className="hh-practice-top-cta" aria-label={marketplaceCopy.add}>
        <button className="hh-practice-top-cta-button" type="button" disabled={!serviceQuota.canAdd}
          aria-pressed={activePanel==='services'} onClick={addService}>
          <Plus aria-hidden="true" />
          <span>{serviceQuota.canAdd?marketplaceCopy.add:marketplaceCopy.limit}</span>
          <ChevronRight aria-hidden="true" />
        </button>
        <p className="hh-practice-marketplace-cta-note">
          <span>{marketplaceCopy.hobby}</span>
          <span aria-hidden="true">·</span>
          <span>{serviceQuota.used+' / '+serviceQuota.limit+' '+marketplaceCopy.slots}</span>
        </p>
      </div>
      <div className="hh-practice-marketplace-latest">
        <div className="hh-practice-marketplace-latest-heading">
          <h3>{marketplaceCopy.latest}</h3>
          <Link className="hh-practice-marketplace-all" href={'/'+locale+'/services?catalog=1#service-listings'} prefetch={false}>
            {marketplaceCopy.all}<ChevronRight aria-hidden="true" />
          </Link>
        </div>
        {recentPublicServices.length?<ul className="hh-practice-marketplace-cards">
          {recentPublicServices.map(item=><li key={item.practitionerSlug+'/'+item.slug}>
            <Link className="hh-practice-marketplace-card"
              href={getPublicServiceDetailHref(locale,item.practitionerSlug,item.slug)} prefetch={false}>
              <ShowcaseCover item={item} />
              <span className="hh-practice-marketplace-card-content">
                <span className="hh-practice-marketplace-card-byline">{item.practitionerName||marketplaceCopy.practitioner}</span>
                <strong className="hh-practice-marketplace-card-title">{item.titles?.[locale]||item.titles?.en}</strong>
                <span className="hh-practice-marketplace-card-summary">{item.shortDescriptions?.[locale]||item.shortDescriptions?.en||''}</span>
                <span className="hh-practice-marketplace-card-foot">
                  <span>{showcasePrice(item,locale,marketplaceCopy)}</span><ChevronRight aria-hidden="true" />
                </span>
              </span>
            </Link>
          </li>)}
        </ul>:<p className="hh-practice-marketplace-empty" role="status">
          {newServices?marketplaceCopy.noRecent:marketplaceCopy.unavailable}
        </p>}
      </div>
    </section>
    </details>}

    {ownerTools && !activePanel && <details className="hh-practice-more-tools">
      <summary>{d.extra}</summary>
      <div className="hh-master-clinical-tools">{ownerTools}</div>
      <div className="hh-actions"><button type="button" className="hh-practice-new-service" onClick={()=>choosePanel('crm')} aria-pressed={activePanel==='crm'}>{ru?'Деловые контакты и подписчики':'Business contacts & subscribers'}</button><button type="button" className="hh-practice-new-service" disabled={busy} onClick={()=>openOwner('tools')}>{ru?'Дополнительные инструменты администратора':'Additional administrative tools'} →</button></div>
    </details>}
    {shareNotice&&<p role="status" className="hh-practice-share-notice">{shareNotice}</p>}
    {error&&<p role="alert" className="hh-practice-error">{error==='SERVICE_LIMIT_REACHED'?(ru?'На бесплатном тарифе Hobby можно сохранить до 10 услуг. Редактирование существующих услуг доступно.':'The free Hobby plan allows up to 10 saved services. You can still edit existing services.'):error}</p>}
  </section>
}

function MasterOnboarding({data,practitioner,service,locale,t,busy,onAction}){
  const [step,setStep]=useState(practitioner?.reviewNote?1:practitioner?2:1)
  const [includeService,setIncludeService]=useState(Boolean(service)||!practitioner)
  const [profile,setProfile]=useState({...emptyProfile,...(data.suggestedProfile||{}),...(practitioner?.draftProfile||{})})
  const serviceBase=service?.draftCopy&&Object.keys(service.draftCopy).length
    ? {...emptyFreeService,...service.draftCopy,pricingMode:'free',confirmedPrice:null,currency:''}
    : service
      ? {...emptyFreeService,copy:{en:{...emptyFreeService.copy.en,...(service.localizedCopy?.en||{})},ru:{...emptyFreeService.copy.ru,...(service.localizedCopy?.ru||{})}},areaKey:service.areaKey,offeringType:service.offeringType,deliveryFormat:service.deliveryFormat,locationLabel:service.locationLabel,languages:service.languages,durationMinutes:service.durationMinutes??'',photos:service.photos||[],imagePath:service.imagePath||''}
      : emptyFreeService
  const [offer,setOffer]=useState(serviceBase)
  const setProfileValue=(k,x)=>setProfile(s=>({...s,[k]:x}))
  const setOfferValue=(k,x)=>setOffer(s=>({...s,[k]:x}))
  const setOfferCopy=(lang,k,x)=>setOffer(s=>({...s,copy:{...s.copy,[lang]:{...s.copy[lang],[k]:x}}}))
  const normalizedProfile=()=>({...profile,languages:Array.isArray(profile.languages)?profile.languages:list(profile.languages),methods:Array.isArray(profile.methods)?profile.methods:list(profile.methods),socialUrls:Array.isArray(profile.socialUrls)?profile.socialUrls:list(profile.socialUrls)})
  const normalizedService=()=>({...offer,languages:Array.isArray(offer.languages)?offer.languages:list(offer.languages),pricingMode:'free',confirmedPrice:null,currency:'',durationMinutes:offer.durationMinutes===''?null:Number(offer.durationMinutes)})
  const payload=(action,withService=includeService)=>({action,profile:normalizedProfile(),service:withService?normalizedService():null,serviceId:withService?(service?.id||null):null,expectedPractitionerRevision:practitioner?.revision,expectedServiceRevision:withService?service?.revision:undefined})
  async function continueToService(e){e.preventDefault();await onAction(payload('save',false));setStep(2)}
  async function submit(e){e.preventDefault();await onAction(payload('submit'))}
  async function saveDraft(){await onAction(payload('save'))}

  return <section className="hh-section">
    <div className="hh-actions" aria-label={t.becomeTitle}><span className="hh-badge">{t.stepAbout}</span><span className="hh-badge">{t.stepService}</span></div>
    {practitioner?.status==='submitted'&&<p className="hh-notice">{t.submittedTogether}</p>}
    {practitioner?.reviewNote&&<p className="hh-notice">{practitioner.reviewNote}</p>}
    {service?.reviewNote&&<p className="hh-notice">{service.reviewNote}</p>}
    {step===1?
      <form className="hh-form hh-panel" onSubmit={continueToService}>
        <h2>{t.stepAbout}</h2>
        <PracticePhotoUpload mode="profile" value={profile.photoPath||''} onChange={value=>setProfileValue('photoPath',value)} locale={locale} disabled={busy||!practitioner}/>
        <label>{t.displayName}<input required maxLength="120" value={profile.displayName||''} onChange={e=>setProfileValue('displayName',e.target.value)}/></label>
        <label>{t.professionalTitle}<input required maxLength="160" value={profile.professionalTitle||''} onChange={e=>setProfileValue('professionalTitle',e.target.value)}/></label>
        <label>{t.shortBio}<textarea required maxLength="600" value={profile.shortBio||''} onChange={e=>setProfileValue('shortBio',e.target.value)}/></label>
        <label>{t.fullBio}<textarea maxLength="5000" value={profile.fullBio||''} onChange={e=>setProfileValue('fullBio',e.target.value)}/></label>
        <label>{t.languages}<input value={arr(profile.languages)} onChange={e=>setProfileValue('languages',list(e.target.value))}/></label>
        <fieldset><legend>{t.formats}</legend>{['online','in_person'].map(x=><label className="hh-check" key={x}><input type="checkbox" checked={(profile.formats||[]).includes(x)} onChange={e=>setProfileValue('formats',e.target.checked?[...(profile.formats||[]),x]:(profile.formats||[]).filter(y=>y!==x))}/>{x.replace('_',' ')}</label>)}</fieldset>
        <fieldset><legend>{t.areas}</legend>{Object.entries(AREAS).map(([x,label])=><label className="hh-check" key={x}><input type="checkbox" checked={(profile.areas||[]).includes(x)} onChange={e=>setProfileValue('areas',e.target.checked?[...(profile.areas||[]),x]:(profile.areas||[]).filter(y=>y!==x))}/>{label[locale==='ru'?1:0]}</label>)}</fieldset>
        <label>{t.methods}<input value={arr(profile.methods)} onChange={e=>setProfileValue('methods',list(e.target.value))}/></label>
        <label>{t.city}<input value={profile.city||''} onChange={e=>setProfileValue('city',e.target.value)}/></label>
        <label>{t.region}<input value={profile.region||''} onChange={e=>setProfileValue('region',e.target.value)}/></label>
        <label>{t.country}<input value={profile.country||''} onChange={e=>setProfileValue('country',e.target.value)}/></label>
        <label>{t.years}<input type="number" min="0" max="80" value={profile.yearsExperience??''} onChange={e=>setProfileValue('yearsExperience',e.target.value)}/></label>
        <label>{t.website}<input type="url" value={profile.websiteUrl||''} onChange={e=>setProfileValue('websiteUrl',e.target.value)}/></label>
        <label>{locale==='ru'?'Видео о мастере (YouTube/Vimeo)':'Practitioner introduction (YouTube/Vimeo)'}
          <input type="url" placeholder="https://youtu.be/..." value={profile.videoPresentation?.kind==='external'?profile.videoPresentation.url:''}
            onChange={e=>setProfileValue('videoPresentation',e.target.value?{kind:'external',url:e.target.value}:null)}/></label>
        <div className="hh-actions"><button className="hh-primary" disabled={busy}>{t.continueFree}</button><button type="button" disabled={busy} onClick={()=>onAction(payload('save',false))}>{t.saveDraft}</button></div>
        <p className="hh-fine">{t.moderation}</p>
      </form>:
      <form className="hh-form hh-panel" onSubmit={submit}>
        <div><span className="hh-badge">{t.freePricing}</span><h2>{t.freeTitle}</h2><p>{t.freeLead}</p></div>
        <PracticePhotoUpload mode="profile" value={profile.photoPath||''} onChange={value=>setProfileValue('photoPath',value)} locale={locale} disabled={busy||!practitioner}/>
        <label className="hh-check"><input type="checkbox" checked={includeService} onChange={e=>setIncludeService(e.target.checked)}/>{t.includeFree}</label>
        {includeService&&<>
          <PracticePhotoUpload mode="service" value={offer.photos||[]} onChange={value=>setOfferValue('photos',value)} locale={locale} disabled={busy||!practitioner}/>
          <label>{t.serviceTitleEn}<input required value={offer.copy.en.title} onChange={e=>setOfferCopy('en','title',e.target.value)}/></label>
          <label>{t.serviceTitleRu}<input required value={offer.copy.ru.title} onChange={e=>setOfferCopy('ru','title',e.target.value)}/></label>
          <label>{t.shortEn}<textarea required value={offer.copy.en.shortDescription||''} onChange={e=>setOfferCopy('en','shortDescription',e.target.value)}/></label>
          <label>{t.shortRu}<textarea required value={offer.copy.ru.shortDescription||''} onChange={e=>setOfferCopy('ru','shortDescription',e.target.value)}/></label>
          <label>{t.descEn}<textarea value={offer.copy.en.description||''} onChange={e=>setOfferCopy('en','description',e.target.value)}/></label>
          <label>{t.descRu}<textarea value={offer.copy.ru.description||''} onChange={e=>setOfferCopy('ru','description',e.target.value)}/></label>
          <label>{t.area}<select value={offer.areaKey} onChange={e=>setOfferValue('areaKey',e.target.value)}>{Object.entries(AREAS).map(([k,l])=><option value={k} key={k}>{l[locale==='ru'?1:0]}</option>)}</select></label>
          <label>{t.offeringType}<select value={offer.offeringType} onChange={e=>setOfferValue('offeringType',e.target.value)}><option value="session">Session</option><option value="assessment">Assessment</option></select></label>
          <label>{t.delivery}<select value={offer.deliveryFormat} onChange={e=>setOfferValue('deliveryFormat',e.target.value)}><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label>
          <label>{t.location}<input value={offer.locationLabel||''} onChange={e=>setOfferValue('locationLabel',e.target.value)}/></label>
          <label>{t.languages}<input value={arr(offer.languages)} onChange={e=>setOfferValue('languages',list(e.target.value))}/></label>
          <label>{t.duration}<input type="number" min="5" max="1440" value={offer.durationMinutes??''} onChange={e=>setOfferValue('durationMinutes',e.target.value)}/></label>
          <label>{locale==='ru'?'Видео об услуге (YouTube/Vimeo)':'Service video (YouTube/Vimeo)'}
            <input type="url" placeholder="https://youtu.be/..." value={offer.videoPresentation?.kind==='external'?offer.videoPresentation.url:''}
              onChange={e=>setOfferValue('videoPresentation',e.target.value?{kind:'external',url:e.target.value}:null)}/></label>
        </>}
        {!includeService&&<p className="hh-notice">{t.skipFree}</p>}
        <div className="hh-actions"><button type="button" disabled={busy} onClick={()=>setStep(1)}>{t.back}</button><button type="button" disabled={busy} onClick={saveDraft}>{t.saveDraft}</button><button className="hh-primary" disabled={busy}>{includeService?t.submitTogether:t.submitProfile}</button></div>
        <p className="hh-fine">{t.moderation}</p>
      </form>
    }
  </section>
}
function ProfileEditor({practitioner,locale,t,busy,onSave,onSubmit}){
  const [videoBusy,setVideoBusy]=useState(false)
  const [v,setV]=useState({...emptyProfile,...(practitioner?.draftProfile||{})})
  const set=(k,x)=>setV(s=>({...s,[k]:x}))
  return <section className="hh-panel hh-section"><h2>{t.profile}</h2>{practitioner?.reviewNote&&<p className="hh-notice">{practitioner.reviewNote}</p>}<form className="hh-form" onSubmit={e=>{e.preventDefault();if(videoBusy)return;onSave({...v,languages:list(v.languages),methods:list(v.methods),socialUrls:Array.isArray(v.socialUrls)?v.socialUrls:list(v.socialUrls)},practitioner?.revision)}}>
    <PracticePhotoUpload mode="profile" value={v.photoPath||''} onChange={value=>set('photoPath',value)} locale={locale} disabled={busy}/>
    <label>{t.displayName}<input required maxLength="120" value={v.displayName||''} onChange={e=>set('displayName',e.target.value)}/></label>
    <label>{t.professionalTitle}<input required maxLength="160" value={v.professionalTitle||''} onChange={e=>set('professionalTitle',e.target.value)}/></label>
    <label>{t.shortBio}<textarea required maxLength="600" value={v.shortBio||''} onChange={e=>set('shortBio',e.target.value)}/></label>
    <label>{t.fullBio}<textarea maxLength="5000" value={v.fullBio||''} onChange={e=>set('fullBio',e.target.value)}/></label>
    <label>{t.languages}<input value={arr(v.languages)} onChange={e=>set('languages',list(e.target.value))}/></label>
    <fieldset><legend>{t.formats}</legend>{['online','in_person'].map(x=><label className="hh-check" key={x}><input type="checkbox" checked={(v.formats||[]).includes(x)} onChange={e=>set('formats',e.target.checked?[...(v.formats||[]),x]:(v.formats||[]).filter(y=>y!==x))}/>{x.replace('_',' ')}</label>)}</fieldset>
    <fieldset><legend>{t.areas}</legend>{Object.entries(AREAS).map(([x,label])=><label className="hh-check" key={x}><input type="checkbox" checked={(v.areas||[]).includes(x)} onChange={e=>set('areas',e.target.checked?[...(v.areas||[]),x]:(v.areas||[]).filter(y=>y!==x))}/>{label[locale==='ru'?1:0]}</label>)}</fieldset>
    <label>{t.methods}<input value={arr(v.methods)} onChange={e=>set('methods',list(e.target.value))}/></label>
    <label>{t.city}<input value={v.city||''} onChange={e=>set('city',e.target.value)}/></label><label>{t.region}<input value={v.region||''} onChange={e=>set('region',e.target.value)}/></label><label>{t.country}<input value={v.country||''} onChange={e=>set('country',e.target.value)}/></label>
    <label>{t.years}<input type="number" min="0" max="80" value={v.yearsExperience??''} onChange={e=>set('yearsExperience',e.target.value)}/></label>
    <label>{t.website}<input type="url" value={v.websiteUrl||''} onChange={e=>set('websiteUrl',e.target.value)}/></label>
    <PracticeVideoField locale={locale} value={v.videoPresentation} onChange={value=>set('videoPresentation',value)} onBusyChange={setVideoBusy}/>
    <div className="hh-actions"><button className="hh-primary" disabled={busy||videoBusy}>{t.save}</button>{onSubmit&&<button type="button" disabled={busy||videoBusy} onClick={onSubmit}>{t.submit}</button>}</div><p className="hh-fine">{t.moderation}</p>
  </form></section>
}
function Credentials({items,t,busy,onCreate,onDelete}){
  const [v,setV]=useState({title:'',issuer:'',jurisdiction:'',reference:'',public:true,expiresOn:''})
  return <section className="hh-section"><h2>{t.credentials}</h2><div className="hh-grid">{items.map(x=><article className="hh-panel" key={x.id}><span className="hh-badge">{x.verificationStatus}</span><h3>{x.title}</h3><p>{[x.issuer,x.jurisdiction,x.reference].filter(Boolean).join(' · ')}</p><button disabled={busy} onClick={()=>onDelete(x.id)}>{t.delete}</button></article>)}</div>
  <form className="hh-form hh-panel" onSubmit={e=>{e.preventDefault();onCreate({...v,expiresOn:v.expiresOn||null});setV({title:'',issuer:'',jurisdiction:'',reference:'',public:true,expiresOn:''})}}><h3>{t.add}</h3>
    <label>{t.credTitle}<input required value={v.title} onChange={e=>setV({...v,title:e.target.value})}/></label><label>{t.issuer}<input value={v.issuer} onChange={e=>setV({...v,issuer:e.target.value})}/></label><label>{t.jurisdiction}<input value={v.jurisdiction} onChange={e=>setV({...v,jurisdiction:e.target.value})}/></label><label>{t.reference}<input value={v.reference} onChange={e=>setV({...v,reference:e.target.value})}/></label><label className="hh-check"><input type="checkbox" checked={v.public} onChange={e=>setV({...v,public:e.target.checked})}/>{t.public}</label><button disabled={busy}>{t.add}</button></form></section>
}
function Services({items,locale,busy,quota,createRequest=0,starter='',onSave,onSaveAndSubmit,onPause}){
  const canAdd=quota?.canAdd!==false
  const ru=locale==='ru'
  return <>
    {!canAdd&&<p className="hh-practice-limit-notice" role="status">{ru?'Бесплатный Hobby: достигнут лимит 10 услуг. Вы можете редактировать уже добавленные услуги.':locale==='es'?'Hobby gratis: has alcanzado el límite de 10 servicios. Puedes editar los existentes.':'Free Hobby: the 10-service limit is reached. You can still edit your existing services.'}</p>}
    <MyServicesDashboard items={items} locale={locale} quota={quota} busy={busy} createRequest={createRequest}
      renderEditor={(item,onDirtyChange,onMediaBusyChange)=><SimpleServiceEditor key={item?item.id+':'+item.revision:'new'} item={item} starter={item?null:starter} locale={locale} busy={busy}
        onSave={onSave} onSaveAndSubmit={onSaveAndSubmit} onPause={onPause} onDirtyChange={onDirtyChange} onMediaBusyChange={onMediaBusyChange}/>} />
  </>
}
function Requests({items,services=[],t,locale,busy,onStatus,onSaveContact,onCreateReport,onOpenRequest,enabled=false,isOwner=false,accountId}){
  const [proposals,setProposals]=useState({})
  const [status,setStatus]=useState(()=>items.some(item=>['requested','contacted','booked','reschedule_proposed','confirmed','in_progress'].includes(item.status))?'open':'all')
  const visible=items.filter(item=>status==='all'||(status==='open'?['requested','contacted','booked','reschedule_proposed','confirmed','in_progress'].includes(item.status):item.status===status))
  const ru=locale==='ru',es=locale==='es'
  const newCount=items.filter(item=>item.status==='requested').length
  const workCount=items.filter(item=>['contacted','reschedule_proposed','confirmed','booked','in_progress'].includes(item.status)).length
  const doneCount=items.filter(item=>['completed','closed'].includes(item.status)).length
  const labels={
    en:{requested:'New',contacted:'Discussing',reschedule_proposed:'Time proposed',confirmed:'Confirmed',
      booked:'Booked',in_progress:'In progress',completed:'Completed',closed:'Closed',declined:'Declined'},
    ru:{requested:'Новая',contacted:'Уточнение',reschedule_proposed:'Предложено время',confirmed:'Подтверждена',
      booked:'Записан',in_progress:'В работе',completed:'Завершена',closed:'Закрыта',declined:'Отклонена'},
    es:{requested:'Nueva',contacted:'En diálogo',reschedule_proposed:'Hora propuesta',confirmed:'Confirmada',
      booked:'Reservada',in_progress:'En curso',completed:'Terminada',closed:'Cerrada',declined:'Rechazada'}
  }[locale]||{}
  const lang=locale==='es'?'es':locale==='ru'?'ru':'en'
  return <section className="hh-section hh-inner-requests" data-practice-inner-requests>
    <div className="hh-inner-request-stats" aria-label={ru?'Настоящие показатели заявок':es?'Solicitudes reales':'Actual request counts'}>
      {[[newCount,ru?'Новые':es?'Nuevas':'New','new'],
         [workCount,ru?'В работе':es?'En curso':'In progress','working'],
         [doneCount,ru?'Завершены':es?'Terminadas':'Completed','done']].map(([value,label,kind])=>
          <div key={kind} data-kind={kind}><strong>{value}</strong><small>{label}</small></div>)}
    </div>
    <div className="hh-practice-service-toolbar"><h2>{t.requests} <small>({items.length})</small></h2>
    <label className="hh-practice-requests-filter">{ru?'Статус':'Status'}
      <select value={status} onChange={event=>setStatus(event.target.value)} aria-label={ru?'Фильтр заявок':'Filter requests'}>
        <option value="open">{ru?'Требуют внимания':'Needs attention'}</option>
        <option value="requested">{ru?'Новые':'New requests'}</option>
        <option value="contacted">{ru?'Связались':'Contacted'}</option>
        <option value="reschedule_proposed">{ru?'Предложен перенос':'Alternative time offered'}</option>
        <option value="confirmed">{ru?'Подтверждённые':'Confirmed'}</option>
        <option value="booked">{locale==='ru'?'Бронь подтверждена':locale==='es'?'Reserva confirmada':'Booked · awaiting payment'}</option>
        <option value="in_progress">{ru?'В работе':'In progress'}</option>
        <option value="completed">{ru?'Завершённые':'Completed'}</option>
        <option value="declined">{ru?'Отклонённые':'Declined'}</option>
        <option value="closed">{ru?'Закрытые':'Closed'}</option>
        <option value="all">{ru?'Все заявки':'All requests'}</option>
      </select>
    </label>
  </div>
    <div className="hh-inner-request-tabs" role="group" aria-label={ru?'Фильтр заявок':es?'Filtrar solicitudes':'Filter requests'}>
      {[['all',ru?'Все':es?'Todas':'All'],
        ['requested',ru?'Новые':es?'Nuevas':'New'],
        ['open',ru?'Активные':es?'Activas':'Active'],
        ['completed',ru?'Завершены':es?'Finalizadas':'Completed']].map(([value,label])=>
         <button key={value} type="button" aria-pressed={status===value} onClick={()=>setStatus(value)}>
          {label}{value==='requested'?' · '+newCount:''}
         </button>)}
    </div>
    <p className="hh-fine" role="status">{visible.length} / {items.length}</p>
    {!visible.length&&<p>{t.none}</p>}
    {visible.map(x=>{
      const service=services.find(item=>item.id===x.serviceId)
      const title=service?.localizedCopy?.[lang]?.title||service?.copy?.title||
        x.serviceTitle||x.remoteBooking?.serviceTitle||(ru?'Индивидуальная услуга':es?'Servicio personal':'Personal service')
      const person=x.contact?.displayName||x.contact?.name||
        (typeof x.contact==='string'?x.contact:null)||(ru?'Клиент':es?'Cliente':'Client')
      const state=labels[x.status]||x.status
      const hasAmount=x.remoteBooking?.price!=null&&Number.isFinite(Number(x.remoteBooking.price))
      const canReply=x.accountRequest===true||x.reportEligible===true
      return <article className="hh-panel hh-inner-request-card" key={x.id} data-request-status={x.status}>
        <div className="hh-inner-request-card-head">
          <span className="hh-inner-request-avatar" aria-hidden="true">{String(person).trim().slice(0,1).toUpperCase()||'•'}</span>
          <span className="hh-inner-request-identity"><strong>{person}</strong>
            <small>{new Date(x.createdAt).toLocaleString(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-CA')}</small>
          </span>
          <span className="hh-inner-request-state" data-status={x.status}>{state}</span>
        </div>
        <div className="hh-inner-request-service"><strong>{title}</strong>
          <small>{x.remoteBooking
             ?(ru?'Дистанционно':es?'A distancia':'Remote')+' · '+x.remoteBooking.duration+' min'
             :ru?'Условия уточняются':es?'Condiciones por confirmar':'Details to confirm'}</small>
          {hasAmount&&<b>{x.remoteBooking.price} {x.remoteBooking.currency||''}</b>}
        </div>
        <div className="hh-inner-request-actions">
          <button type="button" onClick={()=>onOpenRequest?.(x)}>
            {canReply?(ru?'Ответить':es?'Responder':'Reply'):(ru?'Открыть заявку':es?'Abrir solicitud':'Open request')}
            <ChevronRight size={16} aria-hidden="true"/>
          </button>
          <small>{ru?'Заявка ≠ запись или оплата':es?'No es reserva ni pago':'Not booked or paid'}</small>
        </div>
        <details className="hh-inner-request-details">
          <summary>{ru?'Подробности и действия':es?'Detalles y acciones':'Details and actions'} <ChevronRight size={16} aria-hidden="true"/></summary>
          <div className="hh-inner-request-advanced"><span className="hh-badge">{x.status}</span><p>{new Date(x.createdAt).toLocaleString()}</p><p>{safeLeadContact(x.contact)}</p>{enabled&&isOwner&&isOwnerFreeExpressRequest(x)
        ?<FreeExpressOwnerCase request={x} locale={locale} accountId={accountId}/>
        :x.message&&<p>{x.message}</p>}
      <div className="hh-actions">
        <button type="button" disabled={busy||!(x.accountRequest===true||x.reportEligible===true)}
          onClick={()=>onCreateReport?.(x)}>
          <FileText size={16} aria-hidden="true"/>{locale==='ru'?'Сформировать отчёт':locale==='es'?'Crear informe':'Create report'}
        </button>
        {x.requestKind==='public'&&!x.reportEligible&&
          <small className="hh-fine">{locale==='ru'?'Доступно после сохранения заявки клиентом через Google.':locale==='es'?'Disponible cuando el cliente guarda su solicitud con Google.':'Available after the client saves this request with Google.'}</small>}
      </div>
      {x.remoteBooking&&<p className="hh-fine"><strong>{locale==='ru'?'Дистанционная поддержка цели':'Goal support'}</strong>
        {' · '}{x.remoteBooking.duration} min · {x.remoteBooking.date} {x.remoteBooking.time} ({x.remoteBooking.timezone})
        {' · '}{x.remoteBooking.price} {x.remoteBooking.currency}
        {' · '}{locale==='ru'?'Оплата не подключена':'No payment collection'}</p>}{x.remoteBooking&&x.remoteBooking.photoPath&&
        <RemoteGoalPhoto key={x.id} requestId={x.id} role="master"
          hasPhoto={true} status={x.status} locale={locale}/>} {x.requestKind==='public'&&<PublicEnquiryContact request={x} locale={locale} busy={busy} onSave={onSaveContact}/>}  {x.sharedExcerpt&&<details><summary>Shared result excerpt</summary>{x.sharedExcerpt.dimensions?.map(d=><p key={d.key}>{d.key}: {d.value}/{d.max}</p>)}</details>}{!x.remoteBooking&&['requested','contacted'].includes(x.status)&&<div className="hh-actions"><button disabled={busy} onClick={()=>onStatus(x,'contacted')}>{t.contacted}</button><button disabled={busy} onClick={()=>onStatus(x,'closed')}>{t.closed}</button></div>}
      {x.requestKind==='public'&&x.bookingSku&&['requested','contacted'].includes(x.status)&&
        <label className="hh-fine" data-owner-confirm-public-booking>
          {locale==='ru'?'Согласованное с клиентом время (ваш местный часовой пояс)':locale==='es'?'Hora acordada (tu zona horaria local)':'Agreed session time (your local timezone)'}
          <input type="datetime-local" style={{display:'block',width:'min(100%,300px)',minHeight:44,marginTop:6}}
            value={proposals[x.id]||''} disabled={busy} onChange={event=>setProposals(prev=>({...prev,[x.id]:event.target.value}))}/>
          <button type="button" disabled={busy||!proposals[x.id]||!Number.isFinite(new Date(proposals[x.id]).getTime())}
            onClick={()=>onStatus(x,undefined,{action:'confirm_booking',confirmedStartAt:new Date(proposals[x.id]).toISOString()})}>
            {locale==='ru'?'Подтвердить согласованное время':locale==='es'?'Confirmar hora acordada':'Confirm agreed time'}
          </button>
          <small style={{display:'block'}}>{locale==='ru'?'Только после согласия клиента. Откроет кнопку оплаты в его защищённом браузере.':locale==='es'?'Solo después de acordarlo con el cliente. Activa su acceso al carrito.':'Only after agreeing with the client. Unlocks their signed booking link to the cart.'}</small>
        </label>}
      {x.requestKind==='public'&&x.status==='booked'&&x.bookingStartsAt&&
        <p className="hh-fine" data-owner-public-booking-confirmed>
          {locale==='ru'?'Подтверждённая запись':locale==='es'?'Reserva confirmada':'Confirmed booking'}:
          {' '}{new Date(x.bookingStartsAt).toLocaleString(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA')}
          {' · '}{x.bookingSku==='express-consultation-30'?'€50 / 30 min':'€100 / 60 min'}
          {' · '}{locale==='ru'?'Оплата подтверждается отдельно':locale==='es'?'El pago se confirma por separado':'Payment must be verified separately'}
        </p>}
      {x.remoteBooking&&x.remoteBooking.proposed&&<p className="hh-fine">
        {locale==='ru'?'Предложено новое время':'Alternative time offered'}:
        {' '}{x.remoteBooking.proposed.date} {x.remoteBooking.proposed.time}
        {' '}({x.remoteBooking.proposed.timezone}) ·
        {' '}{locale==='ru'?'Ожидается согласие клиента':'Waiting for client acceptance'}
      </p>}
      {x.remoteBooking&&['requested','confirmed'].includes(x.status)&&<label className="hh-fine">
        {locale==='ru'?'Предложить другое время (ваш местный часовой пояс)':'Suggest another time (your local timezone)'}
        <input type="datetime-local" style={{display:'block',width:'min(100%,300px)',marginTop:6}}
          value={proposals[x.id]||''} disabled={busy}
          onChange={event=>setProposals(prev=>({...prev,[x.id]:event.target.value}))}/>
        <button type="button" disabled={busy||!proposals[x.id]||!Number.isFinite(new Date(proposals[x.id]).getTime())}
          onClick={()=>onStatus(x,undefined,{action:'propose_time',proposedStartAt:new Date(proposals[x.id]).toISOString()})}>
          {locale==='ru'?'Отправить новое время':'Offer new time'}
        </button>
      </label>}
      {x.remoteBooking&&<div className="hh-actions">
        {x.status==='requested'&&<>
          <button disabled={busy} onClick={()=>onStatus(x,'confirmed')}>{locale==='ru'?'Подтвердить время':'Confirm slot'}</button>
          <button disabled={busy} onClick={()=>onStatus(x,'declined')}>{locale==='ru'?'Отклонить':'Decline'}</button>
        </>}
        {x.status==='confirmed'&&<>
          <button disabled={busy} onClick={()=>onStatus(x,'in_progress')}>{locale==='ru'?'Начать сеанс':'Start session'}</button>
          <button disabled={busy} onClick={()=>onStatus(x,'declined')}>{locale==='ru'?'Отменить до начала':'Decline before start'}</button>
        </>}
        {x.status==='in_progress'&&<button disabled={busy} onClick={()=>onStatus(x,'completed')}>{locale==='ru'?'Завершить сеанс':'Mark completed'}</button>}
      </div>}</div></details></article>})}
  </section>
}

function safeLeadContact(value){
  if(typeof value==='string')return value
  if(!value||typeof value!=='object')return ''
  return [value.displayName||value.name,value.email,value.phone].filter(part=>typeof part==='string'&&part.trim()).join(' · ')
}
