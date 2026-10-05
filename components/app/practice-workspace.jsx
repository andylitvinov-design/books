'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

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
const emptyService={copy:{en:{title:'',shortDescription:'',description:''},ru:{title:'',shortDescription:'',description:''}},areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',locationLabel:'',languages:['en','ru'],pricingMode:'contact',confirmedPrice:'',currency:'CAD',durationMinutes:'',imagePath:''}
const emptyFreeService={...emptyService,pricingMode:'free',confirmedPrice:null,currency:''}
const arr=value=>Array.isArray(value)?value.join(', '):''
const list=value=>String(value||'').split(',').map(x=>x.trim()).filter(Boolean)

export function PracticeEntry({data,locale}){
  const ru=locale==='ru',practice=data?.practice
  return <section className="hh-panel hh-section">
    <p className="hh-kicker">{ru?'Для специалистов':'For practitioners'}</p>
    <h2>{practice?(ru?'Моя практика':'My Practice'):(ru?'Хотите стать мастером?':'Become a practitioner')}</h2>
    <p>{practice?(ru?'Управляйте публичным профилем, услугами и заявками в том же аккаунте.':'Manage your public profile, services and requests from the same Account.'):(ru?'Добавьте биографию о себе и первую бесплатную услугу. После проверки профиль появится в Holistic House.':'Add your practitioner bio and a first free introductory service. After review, your profile can appear in Holistic House.')}</p>
    <Link className="hh-primary" href={'/'+locale+'/app/practice'} prefetch={false}>{practice?(ru?'Открыть My Practice':'Open My Practice'):(ru?'Стать мастером':'Become a Master')}</Link>
  </section>
}

export default function PracticeWorkspace({locale}){
  const ru=locale==='ru',[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function load(){setError('');try{setData(await practiceFetch())}catch(e){setError(e.code||e.message)}}
  useEffect(()=>{load()},[])
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
  if(!data)return <section className="hh-panel"><h1>{t.title}</h1><p>{error||'…'}</p></section>
  const p=data.practitioner
  const onboardingService=(data.services||[]).find(item=>item.pricingMode==='free'||item.draftCopy?.pricingMode==='free')||null
  const needsOnboarding=!p||(!Object.keys(p.profile||{}).length&&['draft','submitted','changes_requested'].includes(p.status))
  return <section>
    <div className="hh-heading">
      <div className="hh-actions"><Link href={'/'+locale+'/app'} prefetch={false}>{t.personal}</Link><strong>My Practice</strong></div>
      <h1>{needsOnboarding?t.becomeTitle:t.title}</h1><p>{t.intro}</p>
      {p&&<p><span className="hh-badge">{t.status}: {p.status}</span>{p.isPartner&&<> <span className="hh-badge">{t.partner}</span></>}</p>}
    </div>
    {needsOnboarding?
      <MasterOnboarding
        key={(p?.revision||'new')+':'+(onboardingService?.revision||'none')}
        data={data}
        practitioner={p}
        service={onboardingService}
        locale={locale}
        t={t}
        busy={busy}
        onAction={(payload)=>act(()=>practiceFetch('/onboarding',payload))}
      />:
      <>
        <ProfileEditor key={p?.revision||'profile'} practitioner={p} locale={locale} t={t} busy={busy} onSave={(profile,expectedRevision)=>act(()=>practiceFetch('/profile',{action:'save',profile,expectedRevision}))} onSubmit={()=>act(()=>practiceFetch('/profile',{action:'submit',expectedRevision:p.revision}))}/>
        <Credentials items={data.credentials||[]} t={t} busy={busy} onCreate={value=>act(()=>practiceFetch('/credentials',value))} onDelete={id=>act(()=>practiceFetch('/credentials/'+id,{action:'delete'}))}/>
        <Services items={data.services||[]} t={t} locale={locale} busy={busy} onSave={(id,draft,expectedRevision)=>act(()=>practiceFetch('/services'+(id?'/'+id:''),{draft,expectedRevision}))} onSubmit={item=>act(()=>practiceFetch('/services/'+item.id,{action:'submit',expectedRevision:item.revision}))} onPause={item=>act(()=>practiceFetch('/services/'+item.id,{action:'pause',expectedRevision:item.revision}))}/>
        <Requests items={data.requests||[]} t={t} busy={busy} onStatus={(item,status)=>act(()=>practiceFetch('/requests/'+item.id,{status,expectedRevision:item.revision}))}/>
      </>
    }
    {error&&<p role="alert">{error}</p>}
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
function Services({items,t,locale,busy,onSave,onSubmit,onPause}){
  return <section className="hh-section"><h2>{t.services}</h2>{items.map(item=><ServiceEditor key={item.id+item.revision} item={item} t={t} locale={locale} busy={busy} onSave={onSave} onSubmit={onSubmit} onPause={onPause}/>)}
    <ServiceEditor key="new" item={null} t={t} locale={locale} busy={busy} onSave={onSave} onSubmit={onSubmit} onPause={onPause}/>
  </section>
}
function ServiceEditor({item,t,locale,busy,onSave,onSubmit,onPause}){
  const base=item?.draftCopy&&Object.keys(item.draftCopy).length?item.draftCopy:item?{...emptyService,copy:{en:{...emptyService.copy.en,...(item.localizedCopy?.en||{})},ru:{...emptyService.copy.ru,...(item.localizedCopy?.ru||{})}},areaKey:item.areaKey,offeringType:item.offeringType,deliveryFormat:item.deliveryFormat,locationLabel:item.locationLabel,languages:item.languages,pricingMode:item.pricingMode,confirmedPrice:item.confirmedPrice??'',currency:item.currency||'CAD',durationMinutes:item.durationMinutes??'',imagePath:item.imagePath||''}:emptyService
  const [v,setV]=useState(base),set=(k,x)=>setV(s=>({...s,[k]:x})),setCopy=(lang,k,x)=>setV(s=>({...s,copy:{...s.copy,[lang]:{...s.copy[lang],[k]:x}}}))
  return <form className="hh-form hh-panel" onSubmit={e=>{e.preventDefault();onSave(item?.id||null,{...v,languages:Array.isArray(v.languages)?v.languages:list(v.languages),confirmedPrice:v.confirmedPrice===''?null:Number(v.confirmedPrice),durationMinutes:v.durationMinutes===''?null:Number(v.durationMinutes)},item?.revision)}}><div className="hh-actions"><h3>{item?(item.copy?.title||t.services):t.add}</h3>{item&&<span className="hh-badge">{item.status}</span>}</div>{item?.reviewNote&&<p className="hh-notice">{item.reviewNote}</p>}
    <label>{t.serviceTitleEn}<input required value={v.copy.en.title} onChange={e=>setCopy('en','title',e.target.value)}/></label><label>{t.serviceTitleRu}<input required value={v.copy.ru.title} onChange={e=>setCopy('ru','title',e.target.value)}/></label>
    <label>{t.shortEn}<textarea required value={v.copy.en.shortDescription||v.copy.en.description} onChange={e=>setCopy('en','shortDescription',e.target.value)}/></label><label>{t.shortRu}<textarea required value={v.copy.ru.shortDescription||v.copy.ru.description} onChange={e=>setCopy('ru','shortDescription',e.target.value)}/></label>
    <label>{t.descEn}<textarea value={v.copy.en.description} onChange={e=>setCopy('en','description',e.target.value)}/></label><label>{t.descRu}<textarea value={v.copy.ru.description} onChange={e=>setCopy('ru','description',e.target.value)}/></label>
    <label>{t.area}<select value={v.areaKey} onChange={e=>set('areaKey',e.target.value)}>{Object.entries(AREAS).map(([k,l])=><option value={k} key={k}>{l[locale==='ru'?1:0]}</option>)}</select></label>
    <label>{t.delivery}<select value={v.deliveryFormat} onChange={e=>set('deliveryFormat',e.target.value)}><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label>
    <label>{t.location}<input value={v.locationLabel||''} onChange={e=>set('locationLabel',e.target.value)}/></label><label>{t.languages}<input value={arr(v.languages)} onChange={e=>set('languages',list(e.target.value))}/></label><label>{t.duration}<input type="number" min="5" max="1440" value={v.durationMinutes??''} onChange={e=>set('durationMinutes',e.target.value)}/></label>
    <label>{t.pricing}<select value={v.pricingMode} onChange={e=>set('pricingMode',e.target.value)}><option value="free">{t.freePricing}</option><option value="contact">Contact</option><option value="fixed">Fixed</option><option value="from">From</option></select></label>{!['free','contact'].includes(v.pricingMode)&&<><input type="number" min="0" step="0.01" value={v.confirmedPrice??''} onChange={e=>set('confirmedPrice',e.target.value)}/><label>{t.currency}<input maxLength="3" value={v.currency||'CAD'} onChange={e=>set('currency',e.target.value.toUpperCase())}/></label></>}
    <div className="hh-actions"><button className="hh-primary" disabled={busy}>{t.save}</button>{item&&<button type="button" disabled={busy} onClick={()=>onSubmit(item)}>{t.submit}</button>}{item&&['published','submitted','changes_requested'].includes(item.status)&&<button type="button" disabled={busy} onClick={()=>onPause(item)}>{t.pause}</button>}</div><p className="hh-fine">{t.moderation}</p>
  </form>
}
function Requests({items,t,busy,onStatus}){
  return <section className="hh-section"><h2>{t.requests}</h2>{!items.length&&<p>{t.none}</p>}{items.map(x=><article className="hh-panel" key={x.id}><span className="hh-badge">{x.status}</span><p>{new Date(x.createdAt).toLocaleString()}</p><p>{x.contact}</p>{x.message&&<p>{x.message}</p>}{x.sharedExcerpt&&<details><summary>Shared result excerpt</summary>{x.sharedExcerpt.dimensions?.map(d=><p key={d.key}>{d.key}: {d.value}/{d.max}</p>)}</details>}{['requested','contacted'].includes(x.status)&&<div className="hh-actions"><button disabled={busy} onClick={()=>onStatus(x,'contacted')}>{t.contacted}</button><button disabled={busy} onClick={()=>onStatus(x,'closed')}>{t.closed}</button></div>}</article>)}</section>
}
