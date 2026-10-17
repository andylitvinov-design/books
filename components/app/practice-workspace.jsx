'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Plus, FileText, IdCard, UsersRound, Leaf, ReceiptText, BarChart3, ChevronRight, ClipboardList, Share2, CheckCircle2 } from 'lucide-react'
import CrmManager from './crm-manager'
import PractitionerArticles from './practitioner-articles'
import PracticeServiceStatistics from './practice-service-statistics'
import MyServicesDashboard from './my-services-dashboard'
import { getHobbyServiceQuota } from '@/lib/practitioners/service-quota.js'
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
const emptyProfile={displayName:'',professionalTitle:'',shortBio:'',fullBio:'',languages:['en'],city:'',region:'',country:'',formats:['online'],areas:['personal_development'],methods:[],yearsExperience:'',websiteUrl:'',socialUrls:[],photoPath:''}
const emptyService={copy:{en:{title:'',shortDescription:'',description:''},ru:{title:'',shortDescription:'',description:''},es:{title:'',shortDescription:'',description:''}},areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',locationLabel:'',languages:['en','ru'],pricingMode:'contact',confirmedPrice:'',currency:'CAD',durationMinutes:'',imagePath:'',goals:[],methods:[],benefits:[],faq:[],displayLocales:['en','ru'],whatsapp:'',telegram:''}
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
    "reportsHint": "Create and view client reports.",
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
    "reportsHint": "Создание и просмотр отчётов клиентов.",
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
  const ru=locale==='ru',[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[activePanel,setActivePanel]=useState(null),[shareNotice,setShareNotice]=useState(''),[newServiceRequest,setNewServiceRequest]=useState(0)
  async function load(){setError('');try{setData(await practiceFetch())}catch(e){setError(e.code||e.message)}}
  useEffect(()=>{load()},[])
  useEffect(()=>{
    if(!activePanel)return undefined
    const targetId=activePanel==='services'?'hh-practice-services-view':'hh-practice-workspace-detail'
    const frame=requestAnimationFrame(()=>document.getElementById(targetId)?.scrollIntoView({behavior:'smooth',block:'start'}))
    return ()=>cancelAnimationFrame(frame)
  },[activePanel,newServiceRequest])
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
  async function act(fn){setBusy(true);setError('');try{await fn();await load()}catch(e){setError(e.code||e.message)}finally{setBusy(false)}}
  const d=DASHBOARD_COPY[ru?'ru':'en']
  const isOwner=Boolean(ownerTools)
  async function openOwner(destination) {
    if(busy||!isOwner)return
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/app/practitioner/open',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({destination}),
      })
      if(!response.ok)throw new Error('OPEN_UNAVAILABLE')
      const result=await response.json()
      // The server validates ownership and maps only allowed admin destinations.
      if(typeof result.redirectUrl!=='string'||!result.redirectUrl.startsWith('/admin'))throw new Error('OPEN_UNAVAILABLE')
      window.location.assign(result.redirectUrl)
    } catch {
      setError(d.ownerError);setBusy(false)
    }
  }
  function choosePanel(panel) {
    setActivePanel(current=>current===panel?null:panel)
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
  const needsOnboarding=!p||(!Object.keys(p.profile||{}).length&&['draft','submitted','changes_requested'].includes(p.status))
  const requests=data.requests||[]
  const services=data.services||[]
  const serviceQuota=data.serviceQuota||getHobbyServiceQuota(services)
  const publishedCount=services.filter(item=>item.status==='published').length
  const openRequests=requests.filter(item=>['requested','contacted'].includes(item.status)).length
  const newRequests=requests.filter(item=>item.status==='requested').length
  const pendingServices=services.filter(item=>['submitted','changes_requested'].includes(item.status)).length
  const hasProfile=Boolean(p?.profile?.displayName||p?.draftProfile?.displayName)
  const profileLive=Boolean(p?.slug&&p.status==='approved')
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
  if(!needsOnboarding&&activePanel==='services')return <section className="hh-practice-dashboard" aria-label={ru?'Мои услуги':'My services'}>
    <nav className="hh-practice-breadcrumb hh-practice-services-breadcrumb" aria-label={ru?'Путь':'Breadcrumb'}>
      <button type="button" onClick={()=>setActivePanel(null)}>{t.title}</button>
      <ChevronRight aria-hidden="true" />
      <strong>{d.services}</strong>
    </nav>
    <div id="hh-practice-services-view">
      <Services items={services} t={t} locale={locale} busy={busy} quota={serviceQuota} createRequest={newServiceRequest}
        onSave={(id,draft,expectedRevision)=>act(()=>practiceFetch('/services'+(id?'/'+id:''),{draft,expectedRevision}))}
        onSubmit={item=>act(()=>practiceFetch('/services/'+item.id,{action:'submit',expectedRevision:item.revision}))}
        onPause={item=>act(()=>practiceFetch('/services/'+item.id,{action:'pause',expectedRevision:item.revision}))} />
      <details className="hh-practice-fee-notice" aria-label={ru?'Условия комиссии':'Platform commission'}>
        <summary>{ru?'Комиссия 20% за оплаченные заказы на сайте':'20% commission on paid website orders'}</summary>
        <p>{ru?'Мастеру — 80% до применимых сборов и налогов. Бесплатные услуги без комиссии. Оплата на сайте и выплаты мастерам пока не включены.':'Practitioners receive 80% before applicable payment fees and taxes. Free services have no commission. Marketplace checkout and payouts are not yet enabled.'}</p>
      </details>
      <button type="button" className="hh-practice-services-back" onClick={()=>setActivePanel(null)}>{ru?'← Вернуться в My Practice':'← Back to My Practice'}</button>
      {error&&<p role="alert" className="hh-practice-error">{error==='SERVICE_LIMIT_REACHED'?(ru?'На бесплатном тарифе Hobby можно сохранить до 10 услуг. Редактирование существующих услуг доступно.':'The free Hobby plan allows up to 10 saved services. You can still edit existing services.'):error}</p>}
    </div>
  </section>
  return <section className="hh-practice-dashboard">
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
    {!needsOnboarding&&<div className="hh-practice-top-cta" aria-label={ru?'Добавление услуг':'Add services'}>
      <button className="hh-practice-top-cta-button" type="button" disabled={!serviceQuota.canAdd}
        aria-pressed={activePanel==='services'} onClick={addService}>
        <Plus aria-hidden="true" />
        <span>{serviceQuota.canAdd?d.addService:(ru?'Лимит 10 услуг':'10-service limit reached')}</span>
        <ChevronRight aria-hidden="true" />
      </button>
      <div className="hh-practice-top-cta-quota">
        <strong>{ru?'Hobby · бесплатно':'Hobby · Free'}</strong>
        <span>{ru?`${serviceQuota.used} из ${serviceQuota.limit} услуг`:`${serviceQuota.used} of ${serviceQuota.limit} services`}</span>
      </div>
    </div>}
    {readySteps<3&&<section className="hh-practice-setup" aria-label={ru?'Настройка практики':'Practice setup'}>
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
    {!needsOnboarding&&<div className="hh-practice-overview" aria-label={ru?'Обзор практики':'Practice overview'}>
      <div><strong>{newRequests}</strong><span>{ru?'Новые заявки':'New requests'}</span></div>
      <div><strong>{publishedCount}</strong><span>{ru?'Опубликованные услуги':'Published services'}</span></div>
      <div><strong>{pendingServices}</strong><span>{ru?'Ждут проверки':'Under review'}</span></div>
    </div>}
    {!needsOnboarding&&<PracticeServiceStatistics analytics={data.serviceAnalytics} locale={locale} />}
    {!needsOnboarding&&p?.slug&&p.status==='approved'&&<p className="hh-practice-public-link">
      <Link href={'/'+locale+'/masters/'+p.slug} prefetch={false}>
        {ru?'Посмотреть мою публичную страницу':'View my public profile'} <span aria-hidden="true">↗</span>
      </Link>
      <button type="button" onClick={shareProfile}><Share2 aria-hidden="true" />{ru?'Поделиться':'Share'}</button>
    </p>}
    {!needsOnboarding&&<>
      <nav className="hh-practice-quick" aria-label={ru?'Быстрые действия':'Quick actions'}>
        {isOwner?<button type="button" disabled={busy} onClick={()=>openOwner('report')}>
          <FileText aria-hidden="true" />{d.createReport}
        </button>:<button type="button" aria-pressed={activePanel==='requests'}
          onClick={()=>choosePanel('requests')}><ClipboardList aria-hidden="true" />{t.requests}</button>}
        <button type="button" onClick={shareProfile}>
          <Share2 aria-hidden="true" />{profileLive?(ru?'Пригласить клиента':'Invite client'):(ru?'Мой профиль':'My profile')}
        </button>
      </nav>
      <section aria-labelledby="hh-practice-tools-title" className="hh-practice-tools">
        <div className="hh-practice-tool-heading"><h2 id="hh-practice-tools-title">{isOwner?d.privateTitle:d.publicTools}</h2></div>
        <div className="hh-practice-tool-grid">
          <PracticeTile Icon={UsersRound} title={d.clients} description={d.clientsHint}
            onClick={()=>isOwner?openOwner('clients'):choosePanel('clients')} active={!isOwner&&activePanel==='clients'} />
          <PracticeTile Icon={FileText} title={ru?'Статьи':'Articles'} description={ru?'Пишите полезные статьи и публикуйте после проверки.':'Publish helpful articles after editorial review.'}
            onClick={()=>choosePanel('articles')} active={activePanel==='articles'} />
          <PracticeTile Icon={Leaf} title={d.services} description={d.servicesHint}
            onClick={()=>choosePanel('services')} active={activePanel==='services'} />
          {isOwner&&<PracticeTile Icon={FileText} title={d.reports} description={d.reportsHint}
            onClick={()=>openOwner('report')} />}
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
    </>}
    {needsOnboarding? <div id="hh-practice-onboarding"><MasterOnboarding
        key={(p?.revision||'new')+':'+(onboardingService?.revision||'none')}
        data={data} practitioner={p} service={onboardingService} locale={locale} t={t}
        busy={busy} onAction={payload=>act(()=>practiceFetch('/onboarding',payload))} /></div>:
      activePanel&&<section id="hh-practice-workspace-detail" className="hh-practice-form-panel">
        <div className="hh-practice-form-heading">
          <h2>{activePanel==='articles'?(ru?'Мои статьи':'My articles'):activePanel==='services'?d.addService:activePanel==='profile'?d.myData:activePanel==='requests'?d.activity:activePanel==='clients'?d.clients:d.credentials}</h2>
          <button type="button" className="hh-practice-close" onClick={()=>setActivePanel(null)}>{d.close} ×</button>
        </div>
        {activePanel==='articles'&&<PractitionerArticles locale={locale} services={services} />}

        {activePanel==='clients'&&(isOwner&&accountId
          ?<CrmManager key={accountId} locale={locale} accountId={accountId} />
          :<ClientLeads items={requests} locale={locale} onOpenRequests={()=>choosePanel('requests')} />)}
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
          <Requests items={requests} t={t} busy={busy}
            onStatus={(item,status)=>act(()=>practiceFetch('/requests/'+item.id,{status,expectedRevision:item.revision}))} />
        </>}
      </section>}
    {ownerTools && <details className="hh-practice-more-tools">
      <summary>{d.extra}</summary>
      <div className="hh-master-clinical-tools">{ownerTools}</div>
      <div className="hh-actions"><button type="button" className="hh-practice-new-service" onClick={()=>choosePanel('clients')} aria-pressed={activePanel==='clients'}>{ru?'Деловые контакты и подписчики':'Business contacts & subscribers'}</button></div>
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
      ? {...emptyFreeService,copy:{en:{...emptyFreeService.copy.en,...(service.localizedCopy?.en||{})},ru:{...emptyFreeService.copy.ru,...(service.localizedCopy?.ru||{})}},areaKey:service.areaKey,offeringType:service.offeringType,deliveryFormat:service.deliveryFormat,locationLabel:service.locationLabel,languages:service.languages,durationMinutes:service.durationMinutes??''}
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
        <div className="hh-actions"><button className="hh-primary" disabled={busy}>{t.continueFree}</button><button type="button" disabled={busy} onClick={()=>onAction(payload('save',false))}>{t.saveDraft}</button></div>
        <p className="hh-fine">{t.moderation}</p>
      </form>:
      <form className="hh-form hh-panel" onSubmit={submit}>
        <div><span className="hh-badge">{t.freePricing}</span><h2>{t.freeTitle}</h2><p>{t.freeLead}</p></div>
        <label className="hh-check"><input type="checkbox" checked={includeService} onChange={e=>setIncludeService(e.target.checked)}/>{t.includeFree}</label>
        {includeService&&<>
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
        </>}
        {!includeService&&<p className="hh-notice">{t.skipFree}</p>}
        <div className="hh-actions"><button type="button" disabled={busy} onClick={()=>setStep(1)}>{t.back}</button><button type="button" disabled={busy} onClick={saveDraft}>{t.saveDraft}</button><button className="hh-primary" disabled={busy}>{includeService?t.submitTogether:t.submitProfile}</button></div>
        <p className="hh-fine">{t.moderation}</p>
      </form>
    }
  </section>
}
function ProfileEditor({practitioner,locale,t,busy,onSave,onSubmit}){
  const [v,setV]=useState({...emptyProfile,...(practitioner?.draftProfile||{})})
  const set=(k,x)=>setV(s=>({...s,[k]:x}))
  return <section className="hh-panel hh-section"><h2>{t.profile}</h2>{practitioner?.reviewNote&&<p className="hh-notice">{practitioner.reviewNote}</p>}<form className="hh-form" onSubmit={e=>{e.preventDefault();onSave({...v,languages:list(v.languages),methods:list(v.methods),socialUrls:Array.isArray(v.socialUrls)?v.socialUrls:list(v.socialUrls)},practitioner?.revision)}}>
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
    <div className="hh-actions"><button className="hh-primary" disabled={busy}>{t.save}</button>{onSubmit&&<button type="button" disabled={busy} onClick={onSubmit}>{t.submit}</button>}</div><p className="hh-fine">{t.moderation}</p>
  </form></section>
}
function Credentials({items,t,busy,onCreate,onDelete}){
  const [v,setV]=useState({title:'',issuer:'',jurisdiction:'',reference:'',public:true,expiresOn:''})
  return <section className="hh-section"><h2>{t.credentials}</h2><div className="hh-grid">{items.map(x=><article className="hh-panel" key={x.id}><span className="hh-badge">{x.verificationStatus}</span><h3>{x.title}</h3><p>{[x.issuer,x.jurisdiction,x.reference].filter(Boolean).join(' · ')}</p><button disabled={busy} onClick={()=>onDelete(x.id)}>{t.delete}</button></article>)}</div>
  <form className="hh-form hh-panel" onSubmit={e=>{e.preventDefault();onCreate({...v,expiresOn:v.expiresOn||null});setV({title:'',issuer:'',jurisdiction:'',reference:'',public:true,expiresOn:''})}}><h3>{t.add}</h3>
    <label>{t.credTitle}<input required value={v.title} onChange={e=>setV({...v,title:e.target.value})}/></label><label>{t.issuer}<input value={v.issuer} onChange={e=>setV({...v,issuer:e.target.value})}/></label><label>{t.jurisdiction}<input value={v.jurisdiction} onChange={e=>setV({...v,jurisdiction:e.target.value})}/></label><label>{t.reference}<input value={v.reference} onChange={e=>setV({...v,reference:e.target.value})}/></label><label className="hh-check"><input type="checkbox" checked={v.public} onChange={e=>setV({...v,public:e.target.checked})}/>{t.public}</label><button disabled={busy}>{t.add}</button></form></section>
}
function Services({items,t,locale,busy,quota,createRequest=0,onSave,onSubmit,onPause}){
  const canAdd=quota?.canAdd!==false
  const ru=locale==='ru'
  return <>
    {!canAdd&&<p className="hh-practice-limit-notice" role="status">{ru?'Бесплатный Hobby: достигнут лимит 10 услуг. Вы можете редактировать уже добавленные услуги.':locale==='es'?'Hobby gratis: has alcanzado el límite de 10 servicios. Puedes editar los existentes.':'Free Hobby: the 10-service limit is reached. You can still edit your existing services.'}</p>}
    <MyServicesDashboard items={items} locale={locale} quota={quota} createRequest={createRequest}
      renderEditor={item=><ServiceEditor key={item?.id||'new'} item={item} t={t} locale={locale} busy={busy}
        onSave={onSave} onSubmit={onSubmit} onPause={onPause}/>} />
  </>
}
function ServiceEditor({item,t,locale,busy,onSave,onSubmit,onPause}){
  const base=item?.draftCopy&&Object.keys(item.draftCopy).length?item.draftCopy:item?{...emptyService,copy:{en:{...emptyService.copy.en,...(item.localizedCopy?.en||{})},ru:{...emptyService.copy.ru,...(item.localizedCopy?.ru||{})},es:{...emptyService.copy.es,...(item.localizedCopy?.es||{})}},goals:item.goals||[],methods:item.methods||[],benefits:item.benefits||[],faq:item.faq||[],displayLocales:item.displayLocales||['en','ru'],whatsapp:item.whatsapp||'',telegram:item.telegram||'',areaKey:item.areaKey,offeringType:item.offeringType,deliveryFormat:item.deliveryFormat,locationLabel:item.locationLabel,languages:item.languages,pricingMode:item.pricingMode,confirmedPrice:item.confirmedPrice??'',currency:item.currency||'CAD',durationMinutes:item.durationMinutes??'',imagePath:item.imagePath||''}:emptyService
  const [v,setV]=useState({...emptyService,...base,copy:{...emptyService.copy,...base.copy}}),set=(k,x)=>setV(s=>({...s,[k]:x})),setCopy=(lang,k,x)=>setV(s=>({...s,copy:{...s.copy,[lang]:{...s.copy[lang],[k]:x}}}))
  return <form className="hh-form hh-panel" onSubmit={e=>{e.preventDefault();onSave(item?.id||null,{...v,languages:Array.isArray(v.languages)?v.languages:list(v.languages),confirmedPrice:['free','contact'].includes(v.pricingMode)?null:(v.confirmedPrice===''?null:Number(v.confirmedPrice)),currency:['free','contact'].includes(v.pricingMode)?'':v.currency,durationMinutes:v.durationMinutes===''?null:Number(v.durationMinutes)},item?.revision)}}><div className="hh-actions"><h3>{item?(item.copy?.title||t.services):t.add}</h3>{item&&<span className="hh-badge">{item.status}</span>}</div>{item?.reviewNote&&<p className="hh-notice">{item.reviewNote}</p>}
    <label>{t.serviceTitleEn}<input required value={v.copy.en.title} onChange={e=>setCopy('en','title',e.target.value)}/></label><label>{t.serviceTitleRu}<input required value={v.copy.ru.title} onChange={e=>setCopy('ru','title',e.target.value)}/></label>
    <label>{t.shortEn}<textarea required value={v.copy.en.shortDescription||v.copy.en.description} onChange={e=>setCopy('en','shortDescription',e.target.value)}/></label><label>{t.shortRu}<textarea required value={v.copy.ru.shortDescription||v.copy.ru.description} onChange={e=>setCopy('ru','shortDescription',e.target.value)}/></label>
    <details className="hh-practice-advanced-copy" open><summary>{locale==='ru'?'Цели, методы, польза и контакты':'Goals, methods, benefits & contact'}</summary>
      <label>{locale==='ru'?'Цели клиента':'Client goals'}<select multiple size="5" value={v.goals||[]} onChange={e=>set('goals',[...e.target.selectedOptions].map(o=>o.value))}>
        {[['confidence','Confidence','Уверенность'],['relationships','Relationships','Отношения'],['relaxation','Relaxation','Расслабление'],['learning','Learning','Обучение'],['clarity','Clarity','Ясность'],['purpose','Purpose','Предназначение'],['energy','Energy','Энергия'],['self_awareness','Self-awareness','Самопознание']].map(([id,en,ru])=><option key={id} value={id}>{locale==='ru'?ru:en}</option>)}
      </select></label>
      <label>{locale==='ru'?'Методы через запятую':'Methods, comma separated'}<input value={arr(v.methods)} onChange={e=>set('methods',list(e.target.value))}/></label>
      <label>{locale==='ru'?'Возможные результаты, по строкам':'Potential benefits, one per line'}<textarea value={(v.benefits||[]).join('\n')} onChange={e=>set('benefits',e.target.value.split('\n').filter(Boolean).slice(0,5))}/></label>
      <label>FAQ<textarea value={(v.faq||[]).join('\n')} onChange={e=>set('faq',e.target.value.split('\n').filter(Boolean).slice(0,6))}/></label>
      <label>WhatsApp (+country code)<input value={v.whatsapp||''} onChange={e=>set('whatsapp',e.target.value)}/></label>
      <label>Telegram (@username)<input value={v.telegram||''} onChange={e=>set('telegram',e.target.value)}/></label>
    </details>
    <details className="hh-practice-advanced-copy"><summary>{locale==='ru'?'Испанский перевод':'Spanish translation'}</summary>
      <label>Title ES<input value={v.copy.es?.title||''} onChange={e=>setCopy('es','title',e.target.value)}/></label>
      <label>Description ES<textarea value={v.copy.es?.shortDescription||''} onChange={e=>setCopy('es','shortDescription',e.target.value)}/></label>
      <label><input type="checkbox" checked={(v.displayLocales||[]).includes('es')} onChange={e=>set('displayLocales',e.target.checked?['en','ru','es']:['en','ru'])}/> {locale==='ru'?'Публиковать испанскую версию после проверки':'Publish ES only after review'}</label>
    </details>
    <details className="hh-practice-advanced-copy">
      <summary>{locale==='ru'?'Подробные описания · необязательно':'Full descriptions · optional'}</summary>
      <label>{t.descEn}<textarea value={v.copy.en.description} onChange={e=>setCopy('en','description',e.target.value)}/></label>
      <label>{t.descRu}<textarea value={v.copy.ru.description} onChange={e=>setCopy('ru','description',e.target.value)}/></label>
    </details>
    <label>{t.area}<select value={v.areaKey} onChange={e=>set('areaKey',e.target.value)}>{Object.entries(AREAS).map(([k,l])=><option value={k} key={k}>{l[locale==='ru'?1:0]}</option>)}</select></label>
    <label>{t.offeringType}<select value={v.offeringType||'session'} onChange={e=>set('offeringType',e.target.value)}>
      {[
        ['session',locale==='ru'?'Личная консультация':'Personal session'],
        ['intro',locale==='ru'?'Знакомство / вводная встреча':'Intro session'],
        ['assessment',locale==='ru'?'Обзор / диагностика ресурсов':'Assessment / review'],
        ['group',locale==='ru'?'Групповая сессия':'Group session'],
        ['workshop',locale==='ru'?'Практикум / мастер-класс':'Workshop'],
        ['course',locale==='ru'?'Курс':'Course'],
        ['package',locale==='ru'?'Пакет консультаций':'Session package'],
        ['event',locale==='ru'?'Мероприятие':'Event'],
      ].map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>{t.delivery}<select value={v.deliveryFormat} onChange={e=>set('deliveryFormat',e.target.value)}><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label>
    <label>{t.location}<input value={v.locationLabel||''} onChange={e=>set('locationLabel',e.target.value)}/></label><label>{t.languages}<input value={arr(v.languages)} onChange={e=>set('languages',list(e.target.value))}/></label><label>{t.duration}<input type="number" min="5" max="1440" value={v.durationMinutes??''} onChange={e=>set('durationMinutes',e.target.value)}/></label>
    <label>{t.pricing}<select value={v.pricingMode} onChange={e=>set('pricingMode',e.target.value)}><option value="free">{t.freePricing}</option><option value="contact">{locale==='ru'?'Стоимость по запросу':'Price on request'}</option><option value="fixed">{locale==='ru'?'Точная стоимость':'Fixed price'}</option><option value="from">{locale==='ru'?'Цена от':'Starting from'}</option></select></label>
    {!['free','contact'].includes(v.pricingMode)&&<>
      <label>{locale==='ru'?'Стоимость услуги':'Service price'}
        <input type="number" min="0" step="0.01" required value={v.confirmedPrice??''} onChange={e=>set('confirmedPrice',e.target.value)}/>
      </label>
      <label>{t.currency}<select value={v.currency||'CAD'} onChange={e=>set('currency',e.target.value)}>
        <option value="CAD">CAD</option><option value="EUR">EUR</option><option value="USD">USD</option>
      </select></label>
    </>}
    <div className="hh-actions"><button className="hh-primary" disabled={busy}>{t.save}</button>{item&&<button type="button" disabled={busy} onClick={()=>onSubmit(item)}>{t.submit}</button>}{item&&['published','submitted','changes_requested'].includes(item.status)&&<button type="button" disabled={busy} onClick={()=>onPause(item)}>{t.pause}</button>}</div><p className="hh-fine">{t.moderation}</p>
  </form>
}
function Requests({items,t,busy,onStatus}){
  const [status,setStatus]=useState('open')
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
    {visible.map(x=><article className="hh-panel" key={x.id}><span className="hh-badge">{x.status}</span><p>{new Date(x.createdAt).toLocaleString()}</p><p>{safeLeadContact(x.contact)}</p>{x.message&&<p>{x.message}</p>}{x.sharedExcerpt&&<details><summary>Shared result excerpt</summary>{x.sharedExcerpt.dimensions?.map(d=><p key={d.key}>{d.key}: {d.value}/{d.max}</p>)}</details>}{['requested','contacted'].includes(x.status)&&<div className="hh-actions"><button disabled={busy} onClick={()=>onStatus(x,'contacted')}>{t.contacted}</button><button disabled={busy} onClick={()=>onStatus(x,'closed')}>{t.closed}</button></div>}</article>)}
  </section>
}

function safeLeadContact(value){
  if(typeof value==='string')return value
  if(!value||typeof value!=='object')return ''
  return [value.displayName||value.name,value.email,value.phone].filter(part=>typeof part==='string'&&part.trim()).join(' · ')
}
function ClientLeads({items,locale,onOpenRequests}){
  const ru=locale==='ru'
  const [search,setSearch]=useState('')
  const seen=new Set()
  const contacts=items.filter(item=>{
    const contact=safeLeadContact(item.contact).trim()
    if(!contact)return false
    const key=contact.toLowerCase()
    if(seen.has(key))return false
    seen.add(key)
    return true
  })
  const filtered=contacts.filter(item=>safeLeadContact(item.contact).toLowerCase().includes(search.trim().toLowerCase()))
  return <div className="hh-practice-clients">
    <p className="hh-practice-clients-notice">{ru?'Здесь только контакты из заявок на ваши услуги. Личные тесты и медицинские данные недоступны.':'Only contacts from enquiries about your services appear here. Private tests and health records are not shared.'}</p>
    <div className="hh-practice-clients-head"><h3>{ru?'Клиентские обращения':'Client enquiries'} ({contacts.length})</h3>
      <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
        aria-label={ru?'Поиск контакта':'Search contacts'} placeholder={ru?'Поиск контакта…':'Search contacts…'} />
    </div>
    {filtered.length?<ul className="hh-practice-leads-list">{filtered.map(item=><li key={item.id}>
      <span className="hh-practice-lead-icon"><UsersRound aria-hidden="true" /></span>
      <span><strong>{safeLeadContact(item.contact)}</strong><small>{item.status==='requested'?(ru?'Новая заявка':'New enquiry'):item.status==='contacted'?(ru?'Связались':'Contacted'):(ru?'Обращение':'Enquiry')}</small></span>
    </li>)}</ul>:<div className="hh-practice-empty-state"><p>{search?(ru?'Совпадений нет.':'No matching contacts.'):(ru?'Когда появятся заявки, контакты будут здесь.':'Contact details will appear when someone enquires.')}</p></div>}
    <button type="button" className="hh-practice-client-open" onClick={onOpenRequests}>{ru?'Открыть заявки':'Open enquiries'} <ChevronRight aria-hidden="true" /></button>
  </div>
}
