'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {INNER_VECTOR_ITEMS,OUTER_VECTOR_ITEMS,normalizeDevelopmentVectors,emptyDevelopmentVectors} from '@/lib/profile/development-vectors.mjs'
import {assessmentHistoryTitle} from '@/lib/assessments/personal-guidance'
import {getDefinitionById} from '@/lib/assessments/definitions'
import {TestDynamics} from './test-dynamics'
import DevelopmentVectorWheel from './development-vector-wheel'
import styles from './self-discovery.module.css'

const COPY={
 en:{intro:'Your independent, lifelong self-discovery programme. Explore your measurements, revisit tests and observe change.',back:'My courses',balance:'My Life Balance',axes:'My 8 Development Axes',profile:'Psychological profile & analyses',tests:'All tests',history:'Saved test attempts',dynamics:'Test dynamics',edit:'Update my ratings',date:'Measured',missing:'Not yet measured',empty:'No saved test attempts yet.',login:'Sign in to your private account',loading:'Opening your private measurements…',error:'Could not load private data. Try again.',retry:'Refresh',more:'Show more attempts',privacy:'Your data stays in your private account. This programme does not require a coach.',snapshot:'Current saved ratings only. Earlier wheel measurements are not available here yet.',analysis:'Open existing profile, interpretations and recommendations',catalog:'Explore the full existing test catalogue',all:'Open saved test history',retakeError:'Could not start this test. Try again.',unknown:'Date unavailable'},
 ru:{intro:'Самостоятельная программа самопознания без ограничения срока. Изучайте свои показатели, повторяйте тесты и наблюдайте изменения.',back:'Мои курсы',balance:'Колесо жизненного баланса',axes:'Мои восемь осей развития',profile:'Психологический портрет и аналитика',tests:'Все тесты',history:'Сохранённые прохождения',dynamics:'Динамика тестов',edit:'Обновить мои оценки',date:'Дата измерения',missing:'Ещё не измерено',empty:'Пока нет сохранённых прохождений.',login:'Войти в личный кабинет',loading:'Открываем ваши личные измерения…',error:'Не удалось загрузить личные данные. Повторите попытку.',retry:'Обновить',more:'Показать ещё прохождения',privacy:'Данные остаются в вашем личном кабинете. Коуч для этой программы не нужен.',snapshot:'Здесь показаны текущие сохранённые оценки. Предыдущие измерения колёс пока недоступны.',analysis:'Открыть существующий портрет, интерпретации и рекомендации',catalog:'Открыть весь существующий каталог тестов',all:'Открыть историю тестов',retakeError:'Не удалось начать тест. Повторите попытку.',unknown:'Дата неизвестна'},
 es:{intro:'Tu programa autónomo de autoconocimiento sin fecha de finalización. Explora tus mediciones y observa los cambios.',back:'Mis cursos',balance:'Mi equilibrio de vida',axes:'Mis ocho ejes de desarrollo',profile:'Perfil psicológico y análisis',tests:'Todas las pruebas',history:'Intentos guardados',dynamics:'Evolución de las pruebas',edit:'Actualizar mis valoraciones',date:'Fecha de medición',missing:'Sin medir',empty:'Aún no hay intentos guardados.',login:'Iniciar sesión en mi cuenta privada',loading:'Abriendo tus mediciones privadas…',error:'No se pudieron cargar los datos privados. Reintenta.',retry:'Actualizar',more:'Mostrar más intentos',privacy:'Tus datos permanecen en tu cuenta privada. No necesitas un coach.',snapshot:'Solo se muestran las valoraciones actuales guardadas. Las mediciones anteriores de las ruedas todavía no están disponibles aquí.',analysis:'Abrir el perfil, las interpretaciones y recomendaciones existentes (EN)',catalog:'Explorar el catálogo existente (EN)',all:'Abrir el historial de pruebas (EN)',retakeError:'No se pudo iniciar la prueba. Reintenta.',unknown:'Fecha no disponible'},
}
const dated=(value,locale,fallback)=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):fallback
const isAuthError=e=>e?.status===401||e?.status===403||e?.code==='ACCOUNT_CHANGED'
export default function SelfDiscovery({locale='en'}){
 const t=COPY[locale]||COPY.en,accountLocale=locale==='es'?'en':locale,root='/'+accountLocale+'/app'
 const [state,setState]=useState({phase:'loading'}),[shown,setShown]=useState(20),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const epoch=useRef(0),controller=useRef(null),operation=useRef(null)
 const clear=useCallback((phase='loading')=>{
  epoch.current++;controller.current?.abort();operation.current=null
  setState({phase});setBusy(false);setError('');setShown(20)
 },[])
 const load=useCallback(async()=>{
  clear();const token=epoch.current,abort=new AbortController();controller.current=abort
  try{
   const boot=await appFetch('bootstrap',undefined,'GET',{signal:abort.signal})
   const id=boot.account?.id
   if(!id||boot.account.onboardingState!=='active'){if(token===epoch.current)clear('guest');return}
   const saved=await appFetch('development-goals',undefined,'GET',{accountId:id,signal:abort.signal})
   if(token!==epoch.current)return
   if(!saved?.goals||!Number.isInteger(saved.revision))throw Error('INVALID_RESPONSE')
   const vectors=saved.goals.vectors?normalizeDevelopmentVectors(saved.goals.vectors):emptyDevelopmentVectors()
   if(!vectors)throw Error('INVALID_VECTORS')
   // Never project records explicitly attributed to another account.
   if(boot.results.some(row=>row?.accountId&&row.accountId!==id))throw Error('ACCOUNT_MISMATCH')
   const results=boot.results.filter(row=>row&&typeof row.id==='string'&&row.id)
    .slice().sort((a,b)=>(Date.parse(b.measurementAt)||0)-(Date.parse(a.measurementAt)||0)||String(b.id).localeCompare(String(a.id)))
   setState({phase:'ready',id,vectors,results,runs:boot.runs||[]})
  }catch(e){if(token===epoch.current&&!abort.signal.aborted)clear(isAuthError(e)?'guest':'error')}
 },[clear])
 useEffect(()=>{
  if(document.visibilityState!=='hidden')void load()
  let channel
  try{channel=new BroadcastChannel('hh-app-session');channel.onmessage=e=>{if(e.data==='signed-out')clear('guest')}}catch{}
  const hide=()=>clear()
  const show=()=>{if(document.visibilityState==='visible')void load()}
  const visibility=()=>document.visibilityState==='hidden'?hide():show()
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show)
  return()=>{epoch.current++;controller.current?.abort();operation.current=null;channel?.close();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show)}
 },[clear,load])
 function definitionFor(id){try{return getDefinitionById(id)||null}catch{return null}}
 async function retake(id){
  if(state.phase!=='ready'||operation.current)return
  const def=definitionFor(id);if(!def)return
  const token=epoch.current,request={};operation.current=request;setBusy(true);setError('')
  try{
   const draft=state.runs.find(run=>run.definitionId===id&&['draft','in_progress'].includes(run.status))
   const run=draft||await appFetch('runs',{definitionKey:def.key,definitionVersion:def.version,instrumentLocale:def.instrumentLocale,operationId:crypto.randomUUID()},'POST',{accountId:state.id})
   if(token===epoch.current&&operation.current===request&&run?.id)window.location.assign(root+'/runs/'+encodeURIComponent(run.id)+'?mode=quick')
  }catch(e){if(token===epoch.current){if(isAuthError(e))clear('guest');else setError(t.retakeError)}}
  finally{if(token===epoch.current){operation.current=null;setBusy(false)}}
 }
 return <main className={styles.page} data-cabinet-theme="daybook" data-self-discovery>
  <header className={styles.hero}><Link href={root+'/course?view=courses'} prefetch={false}>← {t.back}</Link><p>MY DAYBOOK</p><h1>Self Discovery</h1><p>{t.intro}</p></header>
  {state.phase!=='ready'?<section className={styles.panel} aria-live="polite">
   <p>{state.phase==='guest'?t.login:state.phase==='error'?t.error:t.loading}</p>
   {state.phase==='guest'?<Link href={root+'/portrait'}>{t.login}</Link>:state.phase==='error'?<button onClick={()=>void load()}>{t.retry}</button>:null}
  </section>:<>
   <nav className={styles.nav} aria-label="Self Discovery">
    <a href="#life-balance">{t.balance}</a><a href="#meaning-axes">{t.axes}</a><Link href={root+'/portfolio'} prefetch={false}>{t.profile}</Link><Link href={root+'/tests?explore=1&filters=topics'} prefetch={false}>{t.tests}</Link><a href="#test-dynamics">{t.dynamics}</a><a href="#test-history">{t.history}</a>
   </nav>
   <p className={styles.note}>{t.snapshot}</p>
   {['outer','inner'].map(track=>{const items=track==='outer'?OUTER_VECTOR_ITEMS:INNER_VECTOR_ITEMS,model=state.vectors[track];return <section key={track} id={track==='outer'?'life-balance':'meaning-axes'} className={styles.panel}>
    <DevelopmentVectorWheel items={items} ratings={model.ratings} focusId={model.focusId} locale={locale} track={track}/>
    <ul className={styles.dates}>{items.map(item=><li key={item.id}><span>{item.name[locale]||item.name.en}</span><small>{model.ratings[item.id]?dated(model.ratings[item.id].recordedAt,locale,t.unknown):t.missing}</small></li>)}</ul>
    <Link className={styles.action} href={'/'+locale+'/development-vectors?mode=self-discovery&track='+track} prefetch={false}>{t.edit}</Link>
   </section>})}
   <section className={styles.panel}><h2>{t.profile}</h2><Link href={root+'/portfolio'} prefetch={false}>{t.analysis}</Link></section>
   <section className={styles.panel}><h2>{t.tests}</h2><Link href={root+'/tests?explore=1&filters=topics'} prefetch={false}>{t.catalog}</Link></section>
   <section id="test-dynamics" className={styles.panel}><TestDynamics results={state.results} locale={accountLocale} canRetake={id=>Boolean(definitionFor(id))} onRetake={id=>void retake(id)} busy={busy}/>{error&&<p role="alert">{error}</p>}</section>
   <section id="test-history" className={styles.panel}><h2>{t.history}</h2>
    {state.results.length===0?<p>{t.empty}</p>:<ul className={styles.history}>{state.results.slice(0,shown).map(row=><li key={row.id}><Link href={root+'/results/'+encodeURIComponent(row.id)} prefetch={false}><strong>{assessmentHistoryTitle(row,accountLocale)||row.definitionKey||t.tests}</strong><small>{t.date}: {dated(row.measurementAt,locale,t.unknown)}</small></Link></li>)}</ul>}
    {shown<state.results.length&&<button onClick={()=>setShown(n=>n+20)}>{t.more}</button>}
    <Link href={root+'/history'} prefetch={false}>{t.all}</Link>
   </section>
   <p className={styles.note}>{t.privacy}</p><button className={styles.refresh} onClick={()=>void load()}>{t.retry}</button>
  </>}
 </main>
}
