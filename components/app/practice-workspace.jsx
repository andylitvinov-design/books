'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Plus, FileText, Film, IdCard, UsersRound, Leaf, ReceiptText, BarChart3, ChevronRight, ClipboardList, Share2, CheckCircle2, CalendarDays, Megaphone, BookOpen, Headphones } from 'lucide-react'
import CrmManager from './crm-manager'
import PractitionerClientProfiles from './practitioner-client-profiles'
import PracticeMaterials from './practice-materials'
import PracticeEvents from './practice-events'
import PracticeServiceStatistics from './practice-service-statistics'
import PracticeRequestsOverview from './practice-requests-overview'
import PublicEnquiryContact from './public-enquiry-contact'
import MyServicesDashboard from './my-services-dashboard'
import SimpleServiceEditor from './simple-service-editor'
import PracticePhotoUpload from './practice-photo-upload'
import PracticeVideoField from './practice-video-field'
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
    <Link className="hh-primary" href={'/'+locale+'/app/practice'} prefetch={false}>{practice?(ru?'Открыть My Practice':'Open My Practice'):(ru?'Стать мастером':'Become a Master')}</Link>
  </section>
}

export default function PracticeWorkspace({locale,ownerTools=null,accountId=null}){
  const ru=locale==='ru',[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[activePanel,setActivePanel]=useState(null),[shareNotice,setShareNotice]=useState(''),[newServiceRequest,setNewServiceRequest]=useState(0),[focusRequestId,setFocusRequestId]=useState('')
  async function load(){setError('');try{setData(await practiceFetch())}catch(e){setError(e.code||e.message)}}
  useEffect(()=>{load()},[])
  // Trusted cabinet deep link: owner still must authenticate before opening tools.
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    if(params.get('panel')==='materials')setActivePanel('materials')
    if(params.get('panel')==='marketing')setActivePanel('marketing')
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
      const destinationUrl=destination==='reikiCourse'&&safeLesson&&
        result.redirectUrl==='/admin/materials/courses/reiki-practitioner'
        ?result.redirectUrl+'?lesson='+safeLesson+'&lang='+(locale==='ru'?'ru':'en')+(mode==='record'?'&mode=record':'')
        :result.redirectUrl
      window.location.assign(destinationUrl)
    } catch {
      setError(d.ownerError);setBusy(false)
    }
  }
  function choosePanel(panel) {
    setActivePanel(panel)
    setError('')
  }
  function addService(){
    setActivePanel('services')
    setNewServiceRequest(current=>current+1)
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
  const openRequests=requests.filter(item=>['requested','contacted'].includes(item.status)).length
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
    const url=window.location.origin+'/'+locale+'/masters/'+p.slug
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
    
    {!needsOnboarding&&<section id="hh-practice-workspace-top" className="hh-practice-v4-launch" aria-label={ru?'Основные инструменты мастера':locale==='es'?'Herramientas del profesional':'Practitioner essentials'} data-practitioner-v4-dashboard>
      <div className="hh-practice-v4-grid">
        <button type="button" onClick={()=>choosePanel('clients')} aria-pressed={activePanel==='clients'}>
          <UsersRound aria-hidden="true"/><span>{d.clients}</span><small>{ru?'Контакты':locale==='es'?'Contactos':'Contacts'}</small>
        </button>
        <button type="button" onClick={()=>choosePanel('requests')} aria-pressed={activePanel==='requests'}>
          <ClipboardList aria-hidden="true"/><span>{d.requestsMetric}</span><strong>{openRequests}</strong>
        </button>
        <button type="button" onClick={()=>choosePanel('services')} aria-pressed={activePanel==='services'}>
          <Leaf aria-hidden="true"/><span>{d.services}</span><strong>{services.length}</strong>
        </button>
        <button type="button" onClick={()=>choosePanel('materials')} aria-pressed={activePanel==='materials'}>
          <FileText aria-hidden="true"/><span>{ru?'Материалы':locale==='es'?'Materiales':'Materials'}</span><small>{ru?'Библиотека':locale==='es'?'Biblioteca':'Library'}</small>
        </button>
        <button type="button" onClick={()=>choosePanel('materials')} aria-pressed={activePanel==='materials'}>
          <BookOpen aria-hidden="true"/><span>{ru?'Курсы':locale==='es'?'Cursos':'Courses'}</span><small>{ru?'Управление':locale==='es'?'Gestionar':'Manage'}</small>
        </button>
        <button type="button" onClick={()=>choosePanel('analytics')} aria-pressed={activePanel==='analytics'}>
          <BarChart3 aria-hidden="true"/><span>{ru?'Аналитика':locale==='es'?'Analíticas':'Insights'}</span><small>{ru?'Практика':locale==='es'?'Práctica':'Practice'}</small>
        </button>
      </div>
      {!activePanel&&<button type="button" className="hh-practice-v4-materials-cta" onClick={()=>choosePanel('materials')}>
        <Headphones aria-hidden="true"/><span><strong>{ru?'Создавайте и делитесь знаниями':locale==='es'?'Crea y comparte conocimientos':'Create and share knowledge'}</strong><small>{ru?'Статьи, услуги, курсы, медитации и видео':locale==='es'?'Artículos, servicios, cursos, audio y vídeo':'Articles, services, courses, meditations and videos'}</small></span><ChevronRight aria-hidden="true"/>
      </button>}
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
      <Link href={'/'+locale+'/masters/'+p.slug} prefetch={false}>
        {ru?'Посмотреть мою публичную страницу':'View my public profile'} <span aria-hidden="true">↗</span>
      </Link>
      <button type="button" onClick={shareProfile}><Share2 aria-hidden="true" />{ru?'Поделиться':'Share'}</button>
    </p>}
    {!needsOnboarding&&!activePanel&&<>
      <nav className="hh-practice-quick" aria-label={ru?'Быстрые действия':'Quick actions'}>
        {isOwner?<button type="button" disabled={busy} onClick={()=>openOwner('report')}>
          <FileText aria-hidden="true" />{d.createReport}
        </button>:<button type="button" aria-pressed={activePanel==='requests'}
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
    {needsOnboarding? <div id="hh-practice-onboarding"><MasterOnboarding
        key={(p?.revision||'new')+':'+(onboardingService?.revision||'none')}
        data={data} practitioner={p} service={onboardingService} locale={locale} t={t}
        busy={busy} onAction={payload=>act(()=>practiceFetch('/onboarding',payload))} /></div>:
      activePanel&&<section id="hh-practice-workspace-detail" className="hh-practice-form-panel" data-practice-detail-panel={activePanel}>
        <div className="hh-practice-form-heading">
          <h2>{activePanel==='marketing'?(ru?'Маркетинг':'Marketing'):activePanel==='materials'?(ru?'Мои материалы':'My materials'):activePanel==='events'?(locale==='ru'?'Мои мероприятия':locale==='es'?'Mis eventos':'My events'):activePanel==='services'?d.addService:activePanel==='profile'?d.myData:activePanel==='requests'?d.activity:activePanel==='clients'&&isOwner?(locale==='ru'?'Клиенты · Карточки и заявки':locale==='es'?'Clientes · Fichas y solicitudes':'Clients · Records & enquiries'):activePanel==='clients'?d.clients:d.credentials}</h2>
          <button type="button" className="hh-practice-close" onClick={()=>setActivePanel(null)}>{d.close} ×</button>
        </div>
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
        {activePanel==='materials'&&<PracticeMaterials key={p?.id||'materials'} locale={locale} practitioner={p} services={services} busy={busy} isOwner={isOwner} onOpenReikiCourse={(lesson,mode)=>openOwner('reikiCourse',undefined,lesson,mode)} onOpenServices={()=>choosePanel('services')} onAddService={addService} onOpenYoutube={()=>openOwner('youtube')} accountId={accountId}
           onSaveVideos={videos=>act(()=>practiceFetch('/profile',{action:'save',
             profile:{...emptyProfile,...(p?.draftProfile||{}),videoMaterials:videos},expectedRevision:p.revision}),{rethrow:true})}
           onSaveSitePresentation={video=>act(()=>practiceFetch('/profile',{action:'save',
             profile:{...emptyProfile,...(p?.draftProfile||{}),videoPresentation:video},expectedRevision:p.revision}),{rethrow:true})}
           onSubmitVideos={()=>act(()=>practiceFetch('/profile',{action:'submit',expectedRevision:p.revision}))} />}
        {activePanel==='services'&&<div id="hh-practice-services-view" className="hh-practice-inline-services">
          <Services items={services} t={t} locale={locale} busy={busy} quota={serviceQuota} createRequest={newServiceRequest}
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
        {activePanel==='analytics'&&<div id="hh-practice-v4-analytics" className="hh-practice-v4-analytics">
          <PracticeServiceStatistics analytics={data.serviceAnalytics} registrationStats={data.registrationStats} locale={locale} accountId={accountId} />
        </div>}
        {activePanel==='events'&&<PracticeEvents locale={locale} accountId={accountId} />}

        {activePanel==='clients'&&
          <PractitionerClientProfiles items={requests} services={services}
            practitionerTasks={data.practitionerTasks||[]}
            practitionerTaskSummary={data.practitionerTaskSummary}
            locale={locale} accountId={accountId} busy={busy} isOwner={isOwner}
            onOpenLegacy={clientId=>openOwner(clientId?'client':'clients',clientId)}
            onRefresh={()=>load()}
            focusRequestId={focusRequestId}
            onStatus={(item,status)=>act(()=>practiceFetch('/requests/'+item.id,{status,expectedRevision:item.revision}))}
            onSaveContact={(item,payload)=>act(()=>practiceFetch('/requests/'+item.id,payload))}/>}
        {activePanel==='crm'&&isOwner&&accountId&&
          <CrmManager key={accountId} locale={locale} accountId={accountId}/>} 
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
        {activePanel==='requests'&&<>
          <div className="hh-practice-metrics">
            <div><strong>{services.length}</strong><span>{d.servicesMetric}</span></div>
            <div><strong>{publishedCount}</strong><span>{d.active}</span></div>
            <div><strong>{openRequests}</strong><span>{d.requestsMetric}</span></div>
          </div>
          <Requests items={requests} t={t} locale={locale} busy={busy}
            onStatus={(item,status)=>act(()=>practiceFetch('/requests/'+item.id,{status,expectedRevision:item.revision}))}
            onSaveContact={(item,payload)=>act(()=>practiceFetch('/requests/'+item.id,payload))} />
        </>}
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
function Services({items,locale,busy,quota,createRequest=0,onSave,onSaveAndSubmit,onPause}){
  const canAdd=quota?.canAdd!==false
  const ru=locale==='ru'
  return <>
    {!canAdd&&<p className="hh-practice-limit-notice" role="status">{ru?'Бесплатный Hobby: достигнут лимит 10 услуг. Вы можете редактировать уже добавленные услуги.':locale==='es'?'Hobby gratis: has alcanzado el límite de 10 servicios. Puedes editar los existentes.':'Free Hobby: the 10-service limit is reached. You can still edit your existing services.'}</p>}
    <MyServicesDashboard items={items} locale={locale} quota={quota} createRequest={createRequest}
      renderEditor={item=><SimpleServiceEditor key={item?.id||'new'} item={item} locale={locale} busy={busy}
        onSave={onSave} onSaveAndSubmit={onSaveAndSubmit} onPause={onPause}/>} />
  </>
}
function Requests({items,t,locale,busy,onStatus,onSaveContact}){
  const [status,setStatus]=useState(()=>items.some(item=>['requested','contacted'].includes(item.status))?'open':'all')
  const visible=items.filter(item=>status==='all'||(status==='open'?['requested','contacted'].includes(item.status):item.status===status))
  const ru=t.requests==='Заявки'
  return <section className="hh-section"><div className="hh-practice-service-toolbar"><h2>{t.requests} <small>({items.length})</small></h2>
    <label className="hh-practice-requests-filter">{ru?'Статус':'Status'}
      <select value={status} onChange={event=>setStatus(event.target.value)} aria-label={ru?'Фильтр заявок':'Filter requests'}>
        <option value="open">{ru?'Требуют внимания':'Needs attention'}</option>
        <option value="requested">{ru?'Новые':'New requests'}</option>
        <option value="contacted">{ru?'Связались':'Contacted'}</option>
        <option value="closed">{ru?'Закрытые':'Closed'}</option>
        <option value="all">{ru?'Все заявки':'All requests'}</option>
      </select>
    </label>
  </div><p className="hh-fine" role="status">{visible.length} / {items.length}</p>
    {!visible.length&&<p>{t.none}</p>}
    {visible.map(x=><article className="hh-panel" key={x.id}><span className="hh-badge">{x.status}</span><p>{new Date(x.createdAt).toLocaleString()}</p><p>{safeLeadContact(x.contact)}</p>{x.message&&<p>{x.message}</p>}{x.requestKind==='public'&&<PublicEnquiryContact request={x} locale={locale} busy={busy} onSave={onSaveContact}/>} {x.sharedExcerpt&&<details><summary>Shared result excerpt</summary>{x.sharedExcerpt.dimensions?.map(d=><p key={d.key}>{d.key}: {d.value}/{d.max}</p>)}</details>}{['requested','contacted'].includes(x.status)&&<div className="hh-actions"><button disabled={busy} onClick={()=>onStatus(x,'contacted')}>{t.contacted}</button><button disabled={busy} onClick={()=>onStatus(x,'closed')}>{t.closed}</button></div>}</article>)}
  </section>
}

function safeLeadContact(value){
  if(typeof value==='string')return value
  if(!value||typeof value!=='object')return ''
  return [value.displayName||value.name,value.email,value.phone].filter(part=>typeof part==='string'&&part.trim()).join(' · ')
}
