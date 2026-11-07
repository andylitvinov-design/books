'use client'
import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {ArrowRight,BarChart3,Check,ChevronRight,Clock3,Leaf,RefreshCw,ShieldCheck,Sparkles,Target,X} from 'lucide-react'
import {buildDailyInsight} from '@/lib/app/insight-recommendations.mjs'
import styles from './messages-daily-briefing.module.css'

const WORDS={
  ru:{title:'Мой брифинг',subtitle:'Что изменилось и что сделать сегодня',today:'Главный шаг',other:'Ещё для вас',
    seven:'За 7 завершённых дней',views:'Показы услуг',clicks:'Клики «Заказать»',handoffs:'В мессенджеры',
    leads:'Полученные заявки',more:'Подробнее',tasks:'Ожидают ответа',orders:'Мои заказы',services:'Опубликовано услуг',
    personal:'Личное развитие',personalText:'Учитывать мои цели и факт прохождения тестов. Только в моём кабинете.',
    personalPrivacy:'Личные результаты не передаются маркетингу, мастерам, Telegram или внешнему AI.',
    noPractice:'Статистика услуг появится, когда вы создадите практику.',noTracked:'Показы и переходы пока недоступны. Отсутствие данных не означает отсутствие посетителей.',
    dataUnavailable:'Данные практики сейчас недоступны. Часть рекомендаций может отсутствовать.',
    loading:'Собираем только ваши доступные данные…',guest:'Войдите в свой кабинет, чтобы увидеть личный брифинг.',
    retry:'Обновить данные',done:'Отметить сделанным',later:'Отложить',open:'Открыть',empty:'На сегодня срочных рекомендаций нет.',
    saved:'Сохранено на этом устройстве',notice:'Отметки сохраняются только в этом браузере и не меняют реальные статусы заказов.',
    source:'Основано на данных вашего кабинета',date:'Данные до',personalProgress:'Тесты для программы',manage:'Настроить статистику в Telegram',
    own:'Ваша информация видна только в личном кабинете.',pending:'Есть обновления',partial:'Часть источников недоступна'},
  en:{title:'My briefing',subtitle:'What changed and what to do today',today:'Top action',other:'More for you',
    seven:'Last 7 completed days',views:'Service views',clicks:'Order button clicks',handoffs:'Messenger link clicks',
    leads:'Saved enquiries',more:'Details',tasks:'Awaiting replies',orders:'My orders',services:'Published services',
    personal:'Personal development',personalText:'Use my goals and test completion counts, only in my private Cabinet.',
    personalPrivacy:'Personal results are not shared with marketing, practitioners, Telegram or external AI.',
    noPractice:'Service statistics will appear when you create a practitioner profile.',noTracked:'Views and clicks are unavailable. Missing data does not mean zero visitors.',
    dataUnavailable:'Practice data is unavailable. Some suggestions may be missing.',
    loading:'Checking only your authorized information…',guest:'Sign in to see your personal briefing.',
    retry:'Refresh data',done:'Mark done',later:'Snooze',open:'Open',empty:'No urgent suggestions for today.',
    saved:'Saved on this device',notice:'Feedback is stored in this browser only; it does not change any order or task status.',
    source:'From your authorized Cabinet data',date:'Data through',personalProgress:'Tests for learning journey',manage:'Set up Telegram statistics',
    own:'Only you can view your briefing here.',pending:'Updates available',partial:'Some sources unavailable'},
  es:{title:'Mi informe',subtitle:'Qué ha cambiado y qué hacer hoy',today:'Paso principal',other:'Más para ti',
    seven:'Últimos 7 días completos',views:'Vistas de servicios',clicks:'Clics para pedir',handoffs:'Clics a mensajeros',
    leads:'Solicitudes registradas',more:'Detalles',tasks:'Esperando respuesta',orders:'Mis pedidos',services:'Servicios publicados',
    personal:'Desarrollo personal',personalText:'Utilizar mis objetivos y número de pruebas realizadas, solo en mi espacio privado.',
    personalPrivacy:'Los resultados personales no se comparten con marketing, profesionales, Telegram ni IA externa.',
    noPractice:'Las estadísticas aparecerán cuando crees tu perfil profesional.',noTracked:'No hay datos de vistas y clics. No significa que no haya visitantes.',
    dataUnavailable:'Los datos profesionales no están disponibles. Puede faltar alguna recomendación.',
    loading:'Consultando solo tu información autorizada…',guest:'Inicia sesión para ver tu informe personal.',
    retry:'Actualizar',done:'Marcar como hecho',later:'Posponer',open:'Abrir',empty:'No hay recomendaciones urgentes hoy.',
    saved:'Guardado en este dispositivo',notice:'Las marcas se guardan solo en este navegador; no modifican pedidos ni tareas.',
    source:'Datos de tu cuenta privada',date:'Datos hasta',personalProgress:'Pruebas para el aprendizaje',manage:'Configurar resúmenes de Telegram',
    own:'Solo tú puedes leer este informe.',pending:'Novedades',partial:'Algunas fuentes no están disponibles'}
}
const colors={clients:'client',profile:'profile',marketing:'marketing',personal:'personal'}
function torontoDay(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]))
  return p.year+'-'+p.month+'-'+p.day
}
async function fetchPrivate(path,accountId,signal){
  const response=await fetch('/api/app/'+path,{
    credentials:'same-origin',cache:'no-store',signal,headers:accountId?{'X-HH-Account-ID':accountId}:{}
  })
  if(!response.ok)throw Error('UNAVAILABLE')
  return response.json()
}
function readLocal(accountId){
  try {
    const raw=JSON.parse(localStorage.getItem('hh-daily-insight-v1:'+accountId)||'{}')
    return {personal:raw.personal===true,actions:raw.actions && typeof raw.actions==='object'&&!Array.isArray(raw.actions)?raw.actions:{}}
  }catch{return {personal:false,actions:{}}}
}
export default function MessagesDailyBriefing({
  locale='en',accountId=null,authStatus='checking',active=false,orders=null,refreshKey=0
}){
  const t=WORDS[locale]||WORDS.en
  const [settings,setSettings]=useState({ready:false,personal:false,actions:{}})
  const [state,setState]=useState({loading:false,practice:null,journey:null,goals:null,partial:false})
  const [generation,setGeneration]=useState(0)
  const day=torontoDay()
  useEffect(()=>{
    if(!accountId){setSettings({ready:false,personal:false,actions:{}});setState({loading:false,practice:null,journey:null,goals:null,partial:false});return}
    const saved=readLocal(accountId)
    setSettings({ready:true,...saved})
  },[accountId])
  useEffect(()=>{
    if(!active||!accountId||!settings.ready)return undefined
    const controller=new AbortController()
    setState(old=>({...old,loading:true,partial:false}))
    const jobs=[fetchPrivate('practice',accountId,controller.signal)]
    if(settings.personal){
      jobs.push(fetchPrivate('journey',accountId,controller.signal))
      jobs.push(fetchPrivate('development-goals',accountId,controller.signal))
    }
    Promise.allSettled(jobs).then(result=>{
      if(controller.signal.aborted)return
      const good=index=>result[index]?.status==='fulfilled'?result[index].value:null
      setState({loading:false,practice:good(0),journey:settings.personal?good(1):null,
        goals:settings.personal?good(2):null,partial:result.some(item=>item.status!=='fulfilled')})
    })
    return ()=>controller.abort()
  },[active,accountId,settings.ready,settings.personal,refreshKey,generation])
  function store(next){
    setSettings(next)
    if(!accountId)return
    try {
      // The browser stores only consent and recommendation IDs, never personal records or test results.
      localStorage.setItem('hh-daily-insight-v1:'+accountId,JSON.stringify({
        personal:next.personal,actions:Object.fromEntries(Object.entries(next.actions).filter(([key,value])=>
          /^[a-z-]{2,60}:\d{4}-\d{2}-\d{2}$/.test(key)&&['done','snoozed'].includes(value)).slice(-100))
      }))
    }catch{/* Private browsing still works in memory. */}
  }
  function mark(id,value){store({...settings,actions:{...settings.actions,[id+':'+day]:value}})}
  const insight=useMemo(()=>buildDailyInsight({
    practice:state.practice,journey:state.journey,goals:state.goals,
    personalEnabled:settings.personal,orders,locale
  }),[state.practice,state.journey,state.goals,settings.personal,orders,locale])
  const visible=insight.recommendations.filter(item=>!settings.actions[item.id+':'+day])
  const headline=visible[0]
  const metrics=insight.analytics?.totals
  const num=n=>new Intl.NumberFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA').format(n)
  if(!active)return null
  if(authStatus!=='authenticated'||!accountId){
    return <section className={styles.guest} aria-live="polite"><Sparkles size={25}/>
      <p>{authStatus==='checking'?t.loading:t.guest}</p>
      {authStatus==='guest'&&<Link href={'/'+locale+'/app/portrait'}>{t.open}<ArrowRight size={16}/></Link>}
    </section>
  }
  return <section className={styles.root} data-hh-insight-briefing>
    <header className={styles.heading}>
      <div><span className={styles.eyebrow}><Sparkles size={14}/>{t.source}</span>
        <h2>{t.title}</h2><p>{t.subtitle}</p></div>
      <button className={styles.refresh} type="button" onClick={()=>setGeneration(n=>n+1)}
        disabled={state.loading} aria-label={t.retry} title={t.retry}><RefreshCw size={19}/></button>
    </header>
    {state.loading&&<p className={styles.status} role="status">{t.loading}</p>}
    {state.partial&&!state.loading&&<p className={styles.status} role="status">{t.partial} · {t.dataUnavailable}</p>}
    {!state.loading&&headline&&<article className={styles.hero}>
      <span className={styles.sectionLabel}><Target size={17}/>{t.today}</span>
      <h3>{headline.title}</h3><p>{headline.reason}</p>
      <div className={styles.heroButtons}>
        <Link href={headline.href} prefetch={false}>{t.open}<ArrowRight size={16}/></Link>
        <button type="button" onClick={()=>mark(headline.id,'done')}><Check size={15}/>{t.done}</button>
        <button type="button" onClick={()=>mark(headline.id,'snoozed')} aria-label={t.later}><Clock3 size={16}/></button>
      </div>
    </article>}
    {!state.loading&&!headline&&!state.partial&&<div className={styles.empty}><Leaf size={23}/><p>{t.empty}</p></div>}
    {insight.role==='practitioner'&&<section className={styles.stats}>
      <div className={styles.sectionHeading}><strong>{t.seven}</strong>
        <Link href={'/'+locale+'/app/practice?panel=analytics'}>{t.more}<ChevronRight size={15}/></Link>
      </div>
      {metrics?<div className={styles.metricGrid}>
        <div><strong>{num(metrics.impressions)}</strong><span>{t.views}</span></div>
        <div><strong>{num(metrics.orders)}</strong><span>{t.clicks}</span></div>
        <div><strong>{num(metrics.whatsapp+metrics.telegram)}</strong><span>{t.handoffs}</span></div>
      </div>:<p className={styles.muted}>{t.noTracked}</p>}
      {metrics&&<p className={styles.meta}>{t.date}: {insight.analytics.period} · {t.views} ≠ {t.leads}</p>}
      <div className={styles.smallStats}>
        <span><BarChart3 size={16}/>{t.leads}: <b>{insight.registration?.last7==null?'—':num(insight.registration.last7)}</b></span>
        <span>{t.tasks}: <b>{num(insight.requests?.waiting||0)}</b></span>
        <span>{t.services}: <b>{num(insight.services?.published||0)}</b></span>
      </div>
    </section>}
    {insight.role==='member'&&!state.loading&&<div className={styles.member}>
      <ShieldCheck size={20}/><span>{state.partial?t.dataUnavailable:t.noPractice}
      {insight.ordersCount!=null?' · '+t.orders+': '+num(insight.ordersCount):''}</span>
    </div>}
    <section className={styles.cards}>
      <div className={styles.sectionHeading}><strong>{t.other}</strong></div>
      {visible.slice(1,4).map(item=><article key={item.id} className={styles.advice}>
        <span className={styles.category} data-category={colors[item.category]||'profile'}>{item.category==='personal'?t.personal:item.category==='clients'?t.tasks:item.category==='marketing'?'Marketing':'Profile'}</span>
        <h3>{item.title}</h3><p>{item.reason}</p>
        <div className={styles.actions}>
          <Link href={item.href} prefetch={false}>{t.open}<ArrowRight size={15}/></Link>
          <button type="button" onClick={()=>mark(item.id,'done')} title={t.done}><Check size={17}/></button>
          <button type="button" onClick={()=>mark(item.id,'snoozed')} title={t.later}><X size={16}/></button>
        </div>
      </article>)}
    </section>
    <section className={styles.personal}>
      <label className={styles.switch}>
        <input type="checkbox" checked={settings.personal}
          onChange={event=>store({...settings,personal:event.target.checked})}/>
        <span><strong><Leaf size={17}/>{t.personal}</strong><small>{t.personalText}</small></span>
      </label>
      <p>{t.personalPrivacy}</p>
      {settings.personal&&insight.personal&&<p>{t.personalProgress}: {num(insight.personal.testsCompleted)}</p>}
    </section>
    {insight.role==='practitioner'&&<Link href={'/'+locale+'/app/practice?panel=analytics'} className={styles.settingsLink}>
      {t.manage}<ChevronRight size={15}/></Link>}
    <footer><ShieldCheck size={14}/>{t.own} {t.notice}</footer>
  </section>
}
