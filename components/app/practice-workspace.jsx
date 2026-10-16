'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Plus, FileText, IdCard, UsersRound, Leaf, ReceiptText, BarChart3, ChevronRight, ClipboardList, Share2, CheckCircle2 } from 'lucide-react'
import CrmManager from './crm-manager'
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
const emptyService={copy:{en:{title:'',shortDescription:'',description:''},ru:{title:'',shortDescription:'',description:''},es:{title:'',shortDescription:'',description:''}},displayLocales:['en','ru'],areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',locationLabel:'',languages:['en','ru'],pricingMode:'contact',confirmedPrice:'',currency:'CAD',durationMinutes:'',imagePath:'',photos:[],contacts:{whatsapp:'',telegram:''}}
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
const LISTING_LANGS={en:'English',ru:'Русский',es:'Español'}
const LISTING_CURRENCIES=['CAD','USD','EUR','GBP','MXN','UAH','PLN','CHF','AUD']
async function preparePublicListingPhoto(file){
  if(!file||file.size>25_000_000||file.size<128)throw new Error('PHOTO_TOO_LARGE')
  const url=URL.createObjectURL(file)
  try{
    const image=new Image()
    image.decoding='async'
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url})
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('INVALID_IMAGE')
    const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight))
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale))
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale))
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.78))
    if(!blob||blob.size<128||blob.size>3_000_000)throw new Error('PHOTO_TOO_LARGE')
    return blob
  }catch(error){
    if(error.message==='PHOTO_TOO_LARGE')throw error
    throw new Error('PHOTO_FORMAT_NOT_SUPPORTED')
  }finally{URL.revokeObjectURL(url)}
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
  const ru=locale==='ru',[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[activePanel,setActivePanel]=useState(null),[shareNotice,setShareNotice]=useState(''),[newServiceRequest,setNewServiceRequest]=useState(0)
  async function load(){setError('');try{setData(await practiceFetch())}catch(e){setError(e.code||e.message)}}
  useEffect(()=>{load()},[])
  useEffect(()=>{
    if(!activePanel)return undefined
    const frame=requestAnimationFrame(()=>document.getElementById('hh-practice-workspace-detail')?.scrollIntoView({behavior:'smooth',block:'start'}))
    return ()=>cancelAnimationFrame(frame)
  },[activePanel])
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
    {!needsOnboarding&&p?.slug&&p.status==='approved'&&<p className="hh-practice-public-link">
      <Link href={'/'+locale+'/masters/'+p.slug} prefetch={false}>
        {ru?'Посмотреть мою публичную страницу':'View my public profile'} <span aria-hidden="true">↗</span>
      </Link>
      <button type="button" onClick={shareProfile}><Share2 aria-hidden="true" />{ru?'Поделиться':'Share'}</button>
    </p>}
    {!needsOnboarding&&<>
      <nav className="hh-practice-quick" aria-label={ru?'Быстрые действия':'Quick actions'}>
        <button className="hh-practice-quick-primary" type="button"
          aria-pressed={activePanel==='services'} onClick={addService}>
          <Plus aria-hidden="true" />{d.addService}
        </button>
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
          <h2>{activePanel==='services'?d.addService:activePanel==='profile'?d.myData:activePanel==='requests'?d.activity:activePanel==='clients'?d.clients:d.credentials}</h2>
          <button type="button" className="hh-practice-close" onClick={()=>setActivePanel(null)}>{d.close} ×</button>
        </div>
        {activePanel==='services'&&<>
          <details className="hh-practice-fee-notice" aria-label={ru?'Условия комиссии':'Platform commission'}>
            <summary>{ru?'Комиссия 20% за оплаченные заказы на сайте':'20% commission on paid website orders'}</summary>
            <p>{ru?'Мастеру — 80% до применимых сборов и налогов. Бесплатные услуги без комиссии. Оплата на сайте и выплаты мастерам пока не включены.':'Practitioners receive 80% before applicable payment fees and taxes. Free services have no commission. Marketplace checkout and payouts are not yet enabled.'}</p>
          </details>
          <Services items={services} t={t} locale={locale} busy={busy} createRequest={newServiceRequest}
            onSave={(id,draft,expectedRevision)=>act(()=>practiceFetch('/services'+(id?'/'+id:''),{draft,expectedRevision}))}
            onPublish={(id,draft,expectedRevision)=>act(async()=>{
              const saved=await practiceFetch('/services'+(id?'/'+id:''),{draft,expectedRevision})
              await practiceFetch('/services/'+saved.id,{action:'submit',expectedRevision:saved.revision})
            })}
            onPause={item=>act(()=>practiceFetch('/services/'+item.id,{action:'pause',expectedRevision:item.revision}))} />
        </>}
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
    {error&&<p role="alert" className="hh-practice-error">{error}</p>}
  </section>
}

function MasterOnboarding({data,practitioner,service,locale,t,busy,onAction}){
  const ru=locale==='ru'
  const [step,setStep]=useState(practitioner?.reviewNote?1:practitioner?2:1)
  const [includeService,setIncludeService]=useState(Boolean(service)||!practitioner)
  const [profile,setProfile]=useState({...emptyProfile,...(data.suggestedProfile||{}),...(practitioner?.draftProfile||{})})
  const serviceBase=service?.draftCopy&&Object.keys(service.draftCopy).length
    ? {...emptyFreeService,...service.draftCopy,pricingMode:'free',confirmedPrice:null,currency:''}
    : service
      ? {...emptyFreeService,copy:{en:{...emptyFreeService.copy.en,...(service.localizedCopy?.en||{})},ru:{...emptyFreeService.copy.ru,...(service.localizedCopy?.ru||{})},es:{...emptyFreeService.copy.es,...(service.localizedCopy?.es||{})}},areaKey:service.areaKey,offeringType:service.offeringType,deliveryFormat:service.deliveryFormat,locationLabel:service.locationLabel,languages:service.languages,durationMinutes:service.durationMinutes??''}
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
          <fieldset className="hh-listing-languages"><legend>{ru?'На каких языках показать':'Listing display languages'}</legend>
            <div className="hh-listing-lang-options">{Object.entries(LISTING_LANGS).map(([lang,name])=><label className="hh-check" key={lang}>
              <input type="checkbox" checked={(offer.displayLocales||['en','ru']).includes(lang)} onChange={event=>{
                const existing=offer.displayLocales||['en','ru']
                const next=event.target.checked?[...new Set([...existing,lang])]:existing.filter(code=>code!==lang)
                if(next.length)setOfferValue('displayLocales',next)
              }}/>{name}
            </label>)}</div>
          </fieldset>
          {(offer.displayLocales||['en','ru']).map(lang=><section key={lang} className="hh-listing-onboarding-language">
            <h4>{LISTING_LANGS[lang]}</h4>
            <label>{ru?'Название':'Title'} {lang.toUpperCase()}<input required maxLength="160" value={offer.copy[lang]?.title||''} onChange={event=>setOfferCopy(lang,'title',event.target.value)}/></label>
            <label>{ru?'Краткая польза':'Short benefit'} {lang.toUpperCase()}<textarea required maxLength="500" value={offer.copy[lang]?.shortDescription||''} onChange={event=>setOfferCopy(lang,'shortDescription',event.target.value)}/></label>
            <label>{ru?'Подробности':'Details'} {lang.toUpperCase()}<textarea maxLength="4000" value={offer.copy[lang]?.description||''} onChange={event=>setOfferCopy(lang,'description',event.target.value)}/></label>
          </section>)}
          <label>{t.area}<select value={offer.areaKey} onChange={event=>setOfferValue('areaKey',event.target.value)}>{Object.entries(AREAS).map(([k,l])=><option value={k} key={k}>{l[locale==='ru'?1:0]}</option>)}</select></label>
          <label>{t.offeringType}<select value={offer.offeringType} onChange={event=>setOfferValue('offeringType',event.target.value)}><option value="session">Session</option><option value="assessment">Assessment</option></select></label>
          <label>{t.delivery}<select value={offer.deliveryFormat} onChange={event=>setOfferValue('deliveryFormat',event.target.value)}><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label>
          <label>{t.location}<input value={offer.locationLabel||''} onChange={event=>setOfferValue('locationLabel',event.target.value)}/></label>
          <label>{t.languages}<input value={Array.isArray(offer.languages)?arr(offer.languages):offer.languages||''} onChange={event=>setOfferValue('languages',event.target.value)}/></label>
          <label>{t.duration}<input type="number" min="5" max="1440" value={offer.durationMinutes??''} onChange={event=>setOfferValue('durationMinutes',event.target.value)}/></label>
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
function Services({items,t,locale,busy,createRequest=0,onSave,onPublish,onPause}){
  const ru=locale==='ru'
  const [creating,setCreating]=useState(items.length===0)
  const [status,setStatus]=useState('all')
  useEffect(()=>{if(items.length)setCreating(false)},[items.length])
  useEffect(()=>{if(createRequest>0)setCreating(true)},[createRequest])
  const visible=items.filter(item=>status==='all'||(status==='published'?item.status==='published':status==='review'?['submitted','changes_requested'].includes(item.status):['draft','paused'].includes(item.status)))
  const statusLabel=value=>({
    published:ru?'Опубликовано':'Published',
    submitted:ru?'На проверке':'In review',
    changes_requested:ru?'Нужны правки':'Changes needed',
    draft:ru?'Черновик':'Draft',
    paused:ru?'На паузе':'Paused',
    suspended:ru?'Приостановлено':'Suspended',
  }[value]||value)
  const priceLabel=item=>item.pricingMode==='free'?(ru?'Бесплатно':'Free'):item.pricingMode==='contact'?(ru?'По запросу':'Price on request'):item.confirmedPrice!=null?((item.pricingMode==='from'?(ru?'От ':'From '):'')+[item.currency,item.confirmedPrice].filter(Boolean).join(' ')):(ru?'По запросу':'Price on request')
  return <section className="hh-practice-services-editor">
    <div className="hh-practice-service-toolbar">
      <div><h3>{ru?'Мои услуги':'My services'} <small>({items.length})</small></h3>
        <p>{ru?'Редактируйте предложения и следите за публикацией.':'Edit your offers and track publication.'}</p>
      </div>
      <div className="hh-practice-service-controls">
        <select className="hh-practice-service-filter-control" aria-label={ru?'Фильтр услуг':'Filter services'} value={status} onChange={event=>setStatus(event.target.value)}>
          <option value="all">{ru?'Все услуги':'All services'}</option>
          <option value="published">{ru?'Опубликованные':'Published'}</option>
          <option value="review">{ru?'На проверке':'Under review'}</option>
          <option value="draft">{ru?'Черновики и пауза':'Drafts / paused'}</option>
        </select>
        <button type="button" className="hh-practice-new-service" aria-expanded={creating} onClick={()=>setCreating(value=>!value)}>
          {creating?(ru?'Закрыть':'Close'):(ru?'+ Новая услуга':'+ New service')}
        </button>
      </div>
    </div>
    <p className="hh-practice-services-count" role="status">{ru?'Показано':'Showing'} {visible.length} / {items.length}</p>
    {creating&&<ServiceEditor key="new" item={null} t={t} locale={locale} busy={busy}
      onSave={onSave} onPublish={onPublish} onPause={onPause} />}
    {visible.map(item=><details key={item.id+':'+item.revision} className="hh-practice-service-row">
      <summary>
        <span className="hh-practice-service-row-main">
          <span className="hh-practice-service-symbol" aria-hidden="true">{item.photos?.[0]?<img src={item.photos[0]} alt="" loading="lazy"/>:<Leaf />}</span>
          <span className="hh-practice-service-row-description">
            <strong>{item.localizedCopy?.[locale]?.title||item.copy?.title||item.localizedCopy?.en?.title||(ru?'Без названия':'Untitled service')}</strong>
            <small>{item.deliveryFormat==='in_person'?(ru?'Лично':'In person'):item.deliveryFormat==='hybrid'?(ru?'Онлайн или лично':'Online or in person'):(ru?'Онлайн':'Online')}{item.durationMinutes?' · '+item.durationMinutes+' min':''}</small>
            <small className="hh-practice-service-price">{priceLabel(item)}</small>
          </span>
        </span>
        <span className="hh-practice-service-row-meta" data-status={item.status}>{statusLabel(item.status)}</span>
        <ChevronRight className="hh-practice-service-chevron" aria-hidden="true"/>
      </summary>
      <ServiceEditor item={item} t={t} locale={locale} busy={busy} onSave={onSave} onPublish={onPublish} onPause={onPause}/>
    </details>)}
    {items.length===0&&!creating&&<div className="hh-practice-empty-state">
      <p>{ru?'Пока нет услуг. Создайте своё первое предложение.':'No services yet. Add your first offer.'}</p>
      <button type="button" onClick={()=>setCreating(true)}>{ru?'+ Создать услугу':'+ Add a service'}</button>
    </div>}
    {items.length>0&&!visible.length&&<p role="status" className="hh-fine">{ru?'Услуг с таким статусом нет.':'No services with this status.'}</p>}
  </section>
}
function ServiceEditor({item,t,locale,busy,onSave,onPublish,onPause}){
  const ru=locale==='ru'
  const published=item?{
    copy:item.localizedCopy||{},displayLocales:item.displayLocales||['en','ru'],
    areaKey:item.areaKey,offeringType:item.offeringType,deliveryFormat:item.deliveryFormat,
    locationLabel:item.locationLabel,languages:item.languages,pricingMode:item.pricingMode,
    confirmedPrice:item.confirmedPrice??'',currency:item.currency||'CAD',
    durationMinutes:item.durationMinutes??'',imagePath:item.imagePath||'',
    photos:item.photos||[],contacts:item.contacts||{}
  }:{}
  const draft=item?.draftCopy&&Object.keys(item.draftCopy).length?item.draftCopy:published
  const initial={...emptyService,...draft,
    copy:Object.fromEntries(Object.keys(LISTING_LANGS).map(lang=>[lang,{...emptyService.copy[lang],...(draft.copy?.[lang]||{})}])),
    displayLocales:draft.displayLocales||['en','ru'],photos:draft.photos||[],
    contacts:{...emptyService.contacts,...(draft.contacts||{})}}
  const [v,setV]=useState(initial)
  const [editingLocale,setEditingLocale]=useState(v.displayLocales[0]||'en')
  const [sourceLocale,setSourceLocale]=useState(v.displayLocales[0]||'en')
  const [photoBusy,setPhotoBusy]=useState(false)
  const [translationBusy,setTranslationBusy]=useState(false)
  const [formError,setFormError]=useState('')
  const [info,setInfo]=useState('')
  const set=(key,value)=>setV(previous=>({...previous,[key]:value}))
  const setCopy=(lang,key,value)=>setV(previous=>({...previous,copy:{...previous.copy,[lang]:{...previous.copy[lang],[key]:value}}}))
  const normalized=()=>({...v,
    languages:Array.isArray(v.languages)?v.languages:list(v.languages),
    confirmedPrice:['free','contact'].includes(v.pricingMode)?null:(v.confirmedPrice===''?null:Number(v.confirmedPrice)),
    currency:['free','contact'].includes(v.pricingMode)?'':v.currency,
    durationMinutes:v.durationMinutes===''?null:Number(v.durationMinutes)
  })
  function toggleLanguage(lang,enabled){
    const next=enabled?[...new Set([...(v.displayLocales||[]),lang])]:v.displayLocales.filter(code=>code!==lang)
    if(!next.length)return
    set('displayLocales',next)
    if(!next.includes(editingLocale))setEditingLocale(next[0])
  }
  async function uploadPhoto(event){
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file||(v.photos||[]).length>=5)return
    setPhotoBusy(true);setFormError('');setInfo('')
    try{
      const blob=await preparePublicListingPhoto(file)
      const data=new FormData()
      data.append('photo',blob,'listing.jpg')
      const response=await fetch('/api/app/practice/photos',{method:'POST',credentials:'same-origin',body:data})
      const json=await response.json().catch(()=>({}))
      if(!response.ok||!json.url)throw new Error(json.error||'PHOTO_UPLOAD_UNAVAILABLE')
      setV(previous=>({...previous,photos:[...(previous.photos||[]),json.url].slice(0,5)}))
      setInfo(ru?'Фото добавлено. Сохраните услугу.':'Photo added. Save the service.')
    }catch(error){setFormError(error.message||'PHOTO_UPLOAD_UNAVAILABLE')}
    finally{setPhotoBusy(false)}
  }
  async function translate(target){
    if(sourceLocale===target)return
    setTranslationBusy(true);setFormError('');setInfo('')
    try{
      const response=await fetch('/api/app/practice/translate',{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({source:sourceLocale,target,copy:v.copy[sourceLocale]})
      })
      const json=await response.json().catch(()=>({}))
      if(!response.ok||!json.copy)throw new Error(json.error||'TRANSLATION_UNAVAILABLE')
      setV(previous=>({...previous,copy:{...previous.copy,[target]:json.copy}}))
      setInfo(ru?'Перевод добавлен. Проверьте его перед публикацией.':'Translation added. Review it before publication.')
    }catch(error){setFormError(error.message==='TRANSLATION_NOT_ENABLED'?(ru?'Автоперевод пока не подключён. Заполните перевод вручную.':'Automatic translation is not configured yet. You can write the translation manually.'):(error.message||'TRANSLATION_UNAVAILABLE'))}
    finally{setTranslationBusy(false)}
  }
  function publish(){
    setFormError('')
    if(!v.displayLocales.length||v.displayLocales.some(lang=>!v.copy[lang]?.title?.trim()||!v.copy[lang]?.shortDescription?.trim())){
      setFormError(ru?'Заполните название и краткое описание для каждого выбранного языка.':'Add a title and summary for every display language.')
      return
    }
    if(!v.languages.length||(v.deliveryFormat!=='online'&&!v.locationLabel.trim())){
      setFormError(ru?'Добавьте языки консультации и место очной встречи.':'Add spoken languages and an in-person location when applicable.')
      return
    }
    onPublish(item?.id||null,normalized(),item?.revision)
  }
  const copy=v.copy[editingLocale]||emptyService.copy.en
  return <form className="hh-form hh-panel hh-listing-editor" onSubmit={event=>{event.preventDefault();onSave(item?.id||null,normalized(),item?.revision)}}>
    <div className="hh-actions"><h3>{item?(item.copy?.title||t.services):ru?'Новая услуга':'New service'}</h3>{item&&<span className="hh-badge">{item.status}</span>}</div>
    {item?.reviewNote&&<p className="hh-notice">{item.reviewNote}</p>}
    <fieldset className="hh-listing-languages"><legend>{ru?'Где показывать услугу':'Display listing on site languages'}</legend>
      <div className="hh-listing-lang-options">{Object.entries(LISTING_LANGS).map(([lang,name])=><label key={lang} className="hh-check">
        <input type="checkbox" checked={v.displayLocales.includes(lang)} onChange={event=>toggleLanguage(lang,event.target.checked)}/>{name}
      </label>)}</div>
      <p className="hh-fine">{ru?'Язык показа сайта и язык консультации задаются отдельно. После проверки услуга появится только на выбранных версиях сайта.':'Site display languages and spoken languages are separate. Once approved, this service appears only on selected site versions.'}</p>
    </fieldset>
    <section className="hh-listing-text-section" aria-label={ru?'Тексты услуги':'Service text'}>
      <div className="hh-listing-lang-tabs" role="tablist" aria-label={ru?'Язык текста':'Text language'}>
        {v.displayLocales.map(lang=><button key={lang} type="button" role="tab" aria-selected={editingLocale===lang} className={editingLocale===lang?'is-active':''} onClick={()=>setEditingLocale(lang)}>{lang.toUpperCase()}</button>)}
      </div>
      <label>{ru?'Название услуги':'Service title'} · {editingLocale.toUpperCase()}
        <input maxLength="160" value={copy.title||''} onChange={event=>setCopy(editingLocale,'title',event.target.value)}/>
      </label>
      <label>{ru?'Что получит клиент — 1–2 предложения':'What the client gets — 1–2 sentences'} · {editingLocale.toUpperCase()}
        <textarea maxLength="500" rows={3} value={copy.shortDescription||''} onChange={event=>setCopy(editingLocale,'shortDescription',event.target.value)}/>
      </label>
      <label>{ru?'Как проходит услуга, что включено':'How it works and what is included'}
        <textarea maxLength="4000" rows={5} value={copy.description||''} onChange={event=>setCopy(editingLocale,'description',event.target.value)}/>
      </label>
      {v.displayLocales.length>1&&<div className="hh-listing-translate">
        <span>{ru?'Помощь с переводом (при подключённом ИИ)':'Translation assistance (when AI is connected)'}</span>
        <div className="hh-listing-translate-controls"><select aria-label={ru?'Исходный язык':'Source language'} value={sourceLocale} onChange={event=>setSourceLocale(event.target.value)}>
          {Object.entries(LISTING_LANGS).filter(([lang])=>v.displayLocales.includes(lang)).map(([lang,name])=><option key={lang} value={lang}>{name}</option>)}
        </select>
        <button type="button" disabled={busy||translationBusy||sourceLocale===editingLocale} onClick={()=>translate(editingLocale)}>
          {translationBusy?(ru?'Перевод…':'Translating…'):(ru?'Перевести в ':'Translate into ')+editingLocale.toUpperCase()}
        </button></div>
        <small>{ru?'По нажатию только текст услуги передаётся ИИ. Проверьте перевод.':'Only listing text is sent to AI on click. Review its output.'}</small>
      </div>}
    </section>
    <section className="hh-listing-photo-section"><h4>{ru?'Фотографии услуги':'Service photos'} <small>{v.photos.length}/5</small></h4>
      <p className="hh-fine">{ru?'Загружайте только разрешённые для публичного показа фото. Геоданные удаляются.':'Only use photos you may publish. Location metadata is removed.'}</p>
      <div className="hh-listing-photo-grid">{v.photos.map((url,index)=><div key={url} className="hh-listing-photo-card">
        <img src={url} alt={(ru?'Фото услуги ':'Service photo ')+(index+1)} loading="lazy"/>
        <button type="button" onClick={()=>set('photos',v.photos.filter(photo=>photo!==url))} aria-label={(ru?'Удалить фото ':'Remove photo ')+(index+1)}>×</button>
        {index===0&&<span>{ru?'Обложка':'Cover'}</span>}
      </div>)}
        {v.photos.length<5&&<label className="hh-listing-photo-add">
          <span>{photoBusy?(ru?'Загрузка…':'Uploading…'):'+ '+(ru?'Добавить фото':'Add photo')}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={busy||photoBusy} onChange={uploadPhoto}/>
        </label>}
      </div>
    </section>
    <div className="hh-listing-field-grid">
      <label>{t.pricing}<select value={v.pricingMode} onChange={event=>setV(previous=>({
        ...previous,pricingMode:event.target.value,
        currency:['fixed','from'].includes(event.target.value)?(previous.currency||'CAD'):previous.currency
      }))}>
        <option value="free">{t.freePricing}</option><option value="contact">{ru?'Цена по запросу':'Price on request'}</option>
        <option value="fixed">{ru?'Фиксированная цена':'Fixed price'}</option><option value="from">{ru?'Цена от':'Starting from'}</option>
      </select></label>
      {!['free','contact'].includes(v.pricingMode)&&<>
        <label>{ru?'Стоимость':'Price'}<input type="number" min="0" max="100000" step="0.01" value={v.confirmedPrice??''} onChange={event=>set('confirmedPrice',event.target.value)}/></label>
        <label>{t.currency}<select value={v.currency||'CAD'} onChange={event=>set('currency',event.target.value)}>
          {LISTING_CURRENCIES.map(code=><option key={code} value={code}>{code}</option>)}
        </select></label>
      </>}
    </div>
    <fieldset className="hh-listing-contacts"><legend>{ru?'Куда клиенту написать':'Where clients can message you'}</legend>
      <p className="hh-fine">{ru?'Контакты будут публичными после модерации. Внутренняя заявка Holistic House сохраняется.':'Contacts become public after approval. Holistic House enquiries remain available.'}</p>
      <div className="hh-listing-field-grid">
        <label>WhatsApp · {ru?'международный номер':'international number'}
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 416 555 1234" value={v.contacts?.whatsapp||''} onChange={event=>set('contacts',{...v.contacts,whatsapp:event.target.value})}/>
        </label>
        <label>Telegram · {ru?'имя пользователя':'username'}
          <input type="text" autoCapitalize="none" spellCheck="false" placeholder="@username" value={v.contacts?.telegram||''} onChange={event=>set('contacts',{...v.contacts,telegram:event.target.value})}/>
        </label>
      </div>
    </fieldset>
    <details className="hh-listing-advanced"><summary>{ru?'Дополнительные параметры':'More service details'}</summary>
      <div className="hh-listing-field-grid">
        <label>{t.area}<select value={v.areaKey} onChange={event=>set('areaKey',event.target.value)}>{Object.entries(AREAS).map(([key,label])=><option key={key} value={key}>{label[ru?1:0]}</option>)}</select></label>
        <label>{t.offeringType}<select value={v.offeringType||'session'} onChange={event=>set('offeringType',event.target.value)}>
          {[
            ['session',ru?'Личная консультация':'Personal session'],['intro',ru?'Вводная встреча':'Intro session'],
            ['assessment',ru?'Обзор / диагностика ресурсов':'Assessment'],['group',ru?'Групповая сессия':'Group session'],
            ['workshop',ru?'Мастер-класс':'Workshop'],['course',ru?'Курс':'Course'],
            ['package',ru?'Пакет консультаций':'Package'],['event',ru?'Мероприятие':'Event']
          ].map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>{t.delivery}<select value={v.deliveryFormat} onChange={event=>set('deliveryFormat',event.target.value)}>
          <option value="online">{ru?'Онлайн':'Online'}</option><option value="in_person">{ru?'Лично':'In person'}</option><option value="hybrid">{ru?'Онлайн и лично':'Online / in person'}</option>
        </select></label>
        <label>{t.location}<input maxLength="200" value={v.locationLabel||''} onChange={event=>set('locationLabel',event.target.value)}/></label>
        <label>{ru?'Языки консультации (например: en, ru)':'Spoken languages (e.g. en, ru)'}
          <input value={Array.isArray(v.languages)?arr(v.languages):v.languages||''} onChange={event=>set('languages',event.target.value)}/></label>
        <label>{t.duration}<input type="number" min="5" max="1440" value={v.durationMinutes??''} onChange={event=>set('durationMinutes',event.target.value)}/></label>
      </div>
    </details>
    {formError&&<p className="hh-practice-error" role="alert">{formError}</p>}
    {info&&<p className="hh-notice" role="status">{info}</p>}
    <div className="hh-actions hh-listing-actions">
      <button type="submit" disabled={busy||photoBusy||translationBusy}>{ru?'Сохранить черновик':'Save draft'}</button>
      <button type="button" className="hh-primary" disabled={busy||photoBusy||translationBusy} onClick={publish}>
        {ru?'Отправить на публикацию':'Submit for publication'}
      </button>
      {item&&['published','submitted','changes_requested'].includes(item.status)&&<button type="button" disabled={busy} onClick={()=>onPause(item)}>{t.pause}</button>}
    </div>
    <p className="hh-fine">{t.moderation}</p>
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
