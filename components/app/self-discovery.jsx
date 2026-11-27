'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {INNER_VECTOR_ITEMS,OUTER_VECTOR_ITEMS,normalizeDevelopmentVectors,emptyDevelopmentVectors} from '@/lib/profile/development-vectors.mjs'
import {assessmentHistoryTitle} from '@/lib/assessments/personal-guidance'
import {buildExplorerEntries} from '@/lib/assessments/test-explorer'
import {verifiedHistoryView} from '@/lib/assessments/verified-history'
import {DISCOVERY_THEMES,freeDiscoveryEntries,themeMatches,themeProgress,themeResults} from '@/lib/app/self-discovery-themes.mjs'
import {Activity,ArrowLeft,ArrowRight,BarChart3,BookOpen,CheckCircle2,ChevronRight,Coins,Compass,Heart,Layers,ListChecks,MessageCircle,Play,Sparkles,Users,Zap} from 'lucide-react'
import SelfDiscoveryPractice from './self-discovery-practice'
import {TestDynamics} from './test-dynamics'
import DevelopmentVectorWheel from './development-vector-wheel'
import styles from './self-discovery.module.css'

const COPY={
 en:{intro:'Your independent, lifelong self-discovery programme. Explore your measurements, revisit tests and observe change.',back:'My courses',balance:'My Life Balance',axes:'My 8 Development Axes',profile:'Psychological profile & analyses',tests:'All tests',history:'Saved test attempts',dynamics:'Test dynamics',edit:'Update my ratings',date:'Measured',missing:'Not yet measured',empty:'No saved test attempts yet.',login:'Sign in to your private account',loading:'Opening your private measurements…',error:'Could not load private data. Try again.',retry:'Refresh',more:'Show more attempts',privacy:'Your data stays in your private account. This programme does not require a coach.',snapshot:'Current saved ratings only. Earlier wheel measurements are not available here yet.',analysis:'Open existing profile, interpretations and recommendations',catalog:'Explore the full existing test catalogue',all:'Open saved test history',retakeError:'Could not start this test. Try again.',unknown:'Date unavailable'},
 ru:{intro:'Самостоятельная программа самопознания без ограничения срока. Изучайте свои показатели, повторяйте тесты и наблюдайте изменения.',back:'Мои курсы',balance:'Колесо жизненного баланса',axes:'Мои восемь осей развития',profile:'Психологический портрет и аналитика',tests:'Все тесты',history:'Сохранённые прохождения',dynamics:'Динамика тестов',edit:'Обновить мои оценки',date:'Дата измерения',missing:'Ещё не измерено',empty:'Пока нет сохранённых прохождений.',login:'Войти в личный кабинет',loading:'Открываем ваши личные измерения…',error:'Не удалось загрузить личные данные. Повторите попытку.',retry:'Обновить',more:'Показать ещё прохождения',privacy:'Данные остаются в вашем личном кабинете. Коуч для этой программы не нужен.',snapshot:'Здесь показаны текущие сохранённые оценки. Предыдущие измерения колёс пока недоступны.',analysis:'Открыть существующий портрет, интерпретации и рекомендации',catalog:'Открыть весь существующий каталог тестов',all:'Открыть историю тестов',retakeError:'Не удалось начать тест. Повторите попытку.',unknown:'Дата неизвестна'},
 es:{intro:'Tu programa autónomo de autoconocimiento sin fecha de finalización. Explora tus mediciones y observa los cambios.',back:'Mis cursos',balance:'Mi equilibrio de vida',axes:'Mis ocho ejes de desarrollo',profile:'Perfil psicológico y análisis',tests:'Todas las pruebas',history:'Intentos guardados',dynamics:'Evolución de las pruebas',edit:'Actualizar mis valoraciones',date:'Fecha de medición',missing:'Sin medir',empty:'Aún no hay intentos guardados.',login:'Iniciar sesión en mi cuenta privada',loading:'Abriendo tus mediciones privadas…',error:'No se pudieron cargar los datos privados. Reintenta.',retry:'Actualizar',more:'Mostrar más intentos',privacy:'Tus datos permanecen en tu cuenta privada. No necesitas un coach.',snapshot:'Solo se muestran las valoraciones actuales guardadas. Las mediciones anteriores de las ruedas todavía no están disponibles aquí.',analysis:'Abrir el perfil, las interpretaciones y recomendaciones existentes (EN)',catalog:'Explorar el catálogo existente (EN)',all:'Abrir el historial de pruebas (EN)',retakeError:'No se pudo iniciar la prueba. Reintenta.',unknown:'Fecha no disponible'},
}
const DASH={
  "en": {
    "title": "Self Discovery",
    "course": "Free programme · Themes, tests and practice",
    "motto": "Discover yourself, step by step",
    "choose": "Choose a theme",
    "hint": "Love, money, energy and more",
    "theme": "Theme",
    "tasks": "What to do",
    "strip": "Your theme activities",
    "test": "Take tests",
    "practice": "Do a practice",
    "results": "View results",
    "testHint": "Free tests in this theme",
    "practiceHint": "One short optional exercise",
    "resultHint": "Analysis, recommendations, trends",
    "resources": "Theme resources",
    "guide": "Theme guide",
    "recommend": "Recommendations",
    "report": "Theme report",
    "next": "Go to",
    "overview": "My two wheels",
    "available": "Available",
    "complete": "Verified tests",
    "noTests": "No matching free tests in this theme.",
    "search": "Search tests",
    "start": "Open test",
    "retest": "Retake",
    "showMore": "Show more tests",
    "loaded": "Progress uses verified attempts currently loaded. Older records may be in the full history.",
    "noData": "No saved results in this theme yet.",
    "open": "Full test catalogue",
    "themeGuide": "Choose tests that interest you. Repeat measurements when useful; themes are not prerequisites or a clinical score.",
    "wheelHint": "Two independent personal self-rating wheels",
    "help": "Open iHelp",
    "freeOnly": "Only free, rights-cleared online tests are listed here.",
    "min": "min"
  },
  "ru": {
    "title": "Курс самопознания",
    "course": "Бесплатная программа · Темы, тесты и практика",
    "motto": "Познай себя шаг за шагом",
    "choose": "Выбрать тему",
    "hint": "Любовь, деньги, энергия и другое",
    "theme": "Тема",
    "tasks": "Что нужно сделать",
    "strip": "Задачи по теме",
    "test": "Пройти тесты",
    "practice": "Выполнить практику",
    "results": "Посмотреть результаты",
    "testHint": "Бесплатные тесты по теме",
    "practiceHint": "Короткая добровольная практика",
    "resultHint": "Анализ, рекомендации, динамика",
    "resources": "Материалы темы",
    "guide": "Гид по теме",
    "recommend": "Рекомендации",
    "report": "Отчёт по теме",
    "next": "Перейти к теме",
    "overview": "Мои два колеса",
    "available": "Доступно",
    "complete": "Подтверждённые тесты",
    "noTests": "В этой теме нет подходящих бесплатных тестов.",
    "search": "Поиск тестов",
    "start": "Открыть тест",
    "retest": "Повторить",
    "showMore": "Показать ещё тесты",
    "loaded": "Прогресс по загруженным подтверждённым прохождениям. Более ранние записи могут быть в полной истории.",
    "noData": "Пока нет сохранённых результатов по теме.",
    "open": "Весь каталог тестов",
    "themeGuide": "Выбирайте интересующие тесты. Повторяйте измерения при необходимости; темы не являются обязательными этапами или клинической оценкой.",
    "wheelHint": "Два независимых колеса личных самооценок",
    "help": "Открыть iHelp",
    "freeOnly": "Здесь только бесплатные онлайн-тесты с разрешённым использованием.",
    "min": "мин"
  },
  "es": {
    "title": "Curso de autoconocimiento",
    "course": "Programa gratuito · Temas, pruebas y práctica",
    "motto": "Conócete paso a paso",
    "choose": "Elegir un tema",
    "hint": "Amor, dinero, energía y más",
    "theme": "Tema",
    "tasks": "Qué hacer",
    "strip": "Actividades del tema",
    "test": "Hacer pruebas",
    "practice": "Hacer una práctica",
    "results": "Ver resultados",
    "testHint": "Pruebas gratuitas del tema",
    "practiceHint": "Un ejercicio breve y opcional",
    "resultHint": "Análisis, recomendaciones y evolución",
    "resources": "Recursos del tema",
    "guide": "Guía del tema",
    "recommend": "Recomendaciones",
    "report": "Informe del tema",
    "next": "Ir al tema",
    "overview": "Mis dos ruedas",
    "available": "Disponible",
    "complete": "Pruebas verificadas",
    "noTests": "No hay pruebas gratuitas para este tema.",
    "search": "Buscar pruebas",
    "start": "Abrir prueba",
    "retest": "Repetir",
    "showMore": "Mostrar más pruebas",
    "loaded": "El progreso usa los intentos verificados cargados. Puede haber otros en el historial completo.",
    "noData": "Todavía no hay resultados guardados de este tema.",
    "open": "Catálogo completo",
    "themeGuide": "Elige pruebas que te interesen. Repite mediciones cuando sea útil; los temas no son requisitos ni una puntuación clínica.",
    "wheelHint": "Dos ruedas independientes de autoevaluación",
    "help": "Abrir iHelp",
    "freeOnly": "Solo pruebas gratuitas autorizadas disponibles en línea.",
    "min": "min"
  }
}
const ICONS={love:Heart,money:Coins,energy:Zap,relationships:Users,meaning:Compass,wellbeing:Activity,personality:Sparkles,other:Layers,all:ListChecks}
const dated=(value,locale,fallback)=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):fallback
const isAuthError=e=>e?.status===401||e?.status===403||e?.code==='ACCOUNT_CHANGED'
export default function SelfDiscovery({locale='en'}){
 const t=COPY[locale]||COPY.en,accountLocale=locale==='es'?'en':locale,root='/'+accountLocale+'/app'
 const d=DASH[locale]||DASH.en
 const [state,setState]=useState({phase:'loading'}),[shown,setShown]=useState(20)
 const [themeId,setThemeId]=useState('love'),[expanded,setExpanded]=useState(false),[view,setView]=useState(null),[query,setQuery]=useState(''),[testLimit,setTestLimit]=useState(12)
 const theme=DISCOVERY_THEMES.find(x=>x.id===themeId)||DISCOVERY_THEMES[0]
 const entries=useMemo(()=>state.phase==='ready'?buildExplorerEntries({locale,audience:'account'}):[],[locale,state.phase])
 const free=useMemo(()=>freeDiscoveryEntries(entries),[entries])
 const verified=useMemo(()=>state.phase==='ready'?verifiedHistoryView(state.results).eligible:[],[state])
 const counts=themeProgress(free,verified,theme.id)
 const results=state.phase==='ready'?themeResults(state.results,entries,theme.id):[]
 const completed=new Set(verified.map(row=>row.definitionKey))
 const tests=free.filter(e=>themeMatches(e,theme.id)&&(!query.trim()||String(e.title+' '+e.key+' '+e.description).toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale))))
 const next=DISCOVERY_THEMES[(DISCOVERY_THEMES.indexOf(theme)+1)%DISCOVERY_THEMES.length]
 const epoch=useRef(0),controller=useRef(null)
 const clear=useCallback((phase='loading')=>{
  epoch.current++;controller.current?.abort()
  setState({phase});setShown(20);setQuery('')
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
  return()=>{epoch.current++;controller.current?.abort();channel?.close();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show)}
 },[clear,load])
 const sessionLost=useCallback(()=>clear('guest'),[clear])
 function choose(id){setThemeId(id);setQuery('');setTestLimit(12);setShown(20);if(id==='all'&&view==='practice')setView(null)}
 function openView(name){setView(old=>old===name?null:name);setShown(20)}
 function testPath(key){return root+'/tests?explore=1&from=self-discovery&test='+encodeURIComponent(key)}
 function retakeKey(id){return free.find(e=>e.definition?.id===id)?.key}
 const task=(name,Icon,label,hint,status)=> <button type="button" className={styles.task} aria-expanded={view===name} onClick={()=>openView(name)}><span className={styles.taskIcon}><Icon size={26} aria-hidden="true"/></span><span className={styles.taskText}><strong>{label}</strong><small>{hint}</small></span>{status&&<span className={styles.status}>{status}</span>}<ChevronRight size={21} aria-hidden="true"/></button>
 return <main className={styles.page} data-cabinet-theme="daybook" data-self-discovery>
  <div className={styles.mast}><Link href={root+'/course?view=courses'} prefetch={false}><ArrowLeft size={23} aria-hidden="true"/>{t.back}</Link><button className={styles.help} type="button" aria-label={d.help} aria-haspopup="dialog" onClick={()=>window.dispatchEvent(new Event('hh:open-ihelp'))}><MessageCircle size={19} aria-hidden="true"/>iHelp</button></div>
  <header className={styles.hero}><span className={styles.kicker}>SELF DISCOVERY</span><h1>{d.title}</h1><p>{d.course}</p><span className={styles.motto}><Sparkles size={16} aria-hidden="true"/>{d.motto}</span></header>
  <button type="button" className={styles.choose} aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}><span className={styles.choosePhoto} aria-hidden="true"/><span className={styles.chooseText}><strong>{d.choose}</strong><small>{d.hint}</small></span><ChevronRight size={26} aria-hidden="true"/></button>
  <nav className={styles.nav} aria-label={d.choose}>{DISCOVERY_THEMES.slice(0,5).map(item=>{const Icon=ICONS[item.id];const n=themeProgress(free,verified,item.id);return <button type="button" key={item.id} aria-pressed={theme.id===item.id} onClick={()=>choose(item.id)}><Icon size={21} aria-hidden="true"/>{item.label[locale]}{state.phase==='ready'&&<small>{n.done}/{n.total}</small>}</button>})}</nav>
  {expanded&&<div className={styles.allThemes}>{DISCOVERY_THEMES.map(item=><button type="button" key={item.id} aria-pressed={theme.id===item.id} onClick={()=>{choose(item.id);setExpanded(false)}}>{item.title[locale]}</button>)}</div>}
  <section className={styles.banner}><small>{d.theme} · {theme.label[locale]}</small><h2>{theme.title[locale]}</h2>{state.phase==='ready'&&<div className={styles.progressRow}><progress aria-label={d.complete} max={Math.max(1,counts.total)} value={counts.done}/><strong>{counts.done}/{counts.total}</strong></div>}</section>
  {state.phase!=='ready'?<section className={styles.panel} aria-live="polite">
   <p>{state.phase==='guest'?t.login:state.phase==='error'?t.error:t.loading}</p>
   {state.phase==='guest'?<Link className={styles.action} href={root+'/portrait'}>{t.login}</Link>:state.phase==='error'?<button className={styles.action} onClick={()=>void load()}>{t.retry}</button>:null}
  </section>:<>
   <section className={styles.panel}><h2>{d.tasks}</h2><div className={styles.strip}><CheckCircle2 size={17} aria-hidden="true"/>{d.strip}</div>
    <div className={styles.tasks}>{task('tests',ListChecks,d.test,d.testHint,counts.done+'/'+counts.total)}
    {theme.id!=='all'&&task('practice',Play,d.practice,d.practiceHint,d.available)}
    {task('results',BarChart3,d.results,d.resultHint,results.length?String(results.length):null)}</div>
    <h3 className={styles.resourceTitle}>{d.resources}</h3><div className={styles.resources}>
     <button type="button" onClick={()=>openView('guide')}><BookOpen size={23} aria-hidden="true"/><span>{d.guide}</span></button>
     <Link href={root+'/portfolio'} prefetch={false}><Sparkles size={23} aria-hidden="true"/><span>{d.recommend}</span></Link>
     <button type="button" onClick={()=>setView('results')}><BarChart3 size={23} aria-hidden="true"/><span>{d.report}</span></button>
    </div>
   </section>
   {view==='tests'&&<section className={styles.panel} data-self-discovery-tests><h2>{d.test}</h2><p className={styles.note}>{d.freeOnly}</p><input aria-label={d.search} className={styles.search} type="search" placeholder={d.search} value={query} onChange={e=>{setQuery(e.target.value);setTestLimit(12)}}/>
    {!tests.length?<p>{d.noTests}</p>:<ul className={styles.catalog}>{tests.slice(0,testLimit).map(e=><li key={e.key}><div><strong>{e.title}</strong><small>{e.definition?.instrumentLocale?.toUpperCase()}{e.durationMinutes?' · '+e.durationMinutes+' '+d.min:''}{completed.has(e.key)?' · ✓':''}</small></div><Link href={testPath(e.key)} prefetch={false}>{completed.has(e.key)?d.retest:d.start}<ChevronRight size={16} aria-hidden="true"/></Link></li>)}</ul>}
    {tests.length>testLimit&&<button className={styles.refresh} onClick={()=>setTestLimit(n=>n+12)}>{d.showMore} ({tests.length-testLimit})</button>}<Link className={styles.action} href={root+'/tests?explore=1&filters=topics'} prefetch={false}>{d.open}</Link></section>}
   {view==='practice'&&theme.id!=='all'&&<section className={styles.panel} data-self-discovery-practices><h2>{d.practice}</h2><SelfDiscoveryPractice key={state.id+':'+theme.id} accountId={state.id} locale={locale} theme={theme} onSessionLost={sessionLost}/></section>}
   {view==='guide'&&<section className={styles.panel}><h2>{d.guide}</h2><p>{d.themeGuide}</p>{theme.prompt&&<p>{theme.prompt[locale]}</p>}<Link className={styles.action} href={root+'/portfolio'} prefetch={false}>{t.analysis}</Link></section>}
   {view==='results'&&<><section id="test-dynamics" className={styles.panel}><TestDynamics key={theme.id} results={results} locale={accountLocale} canRetake={id=>Boolean(retakeKey(id))} onRetake={id=>{const key=retakeKey(id);if(key)window.location.assign(testPath(key))}}/></section>
    <section id="test-history" className={styles.panel}><h2>{t.history}</h2>{results.length===0?<p>{d.noData}</p>:<ul className={styles.history}>{results.slice(0,shown).map(row=><li key={row.id}><Link href={root+'/results/'+encodeURIComponent(row.id)} prefetch={false}><strong>{assessmentHistoryTitle(row,accountLocale)||row.definitionKey||t.tests}</strong><small>{t.date}: {dated(row.measurementAt,locale,t.unknown)}</small></Link></li>)}</ul>}
    {shown<results.length&&<button onClick={()=>setShown(n=>n+20)}>{t.more}</button>}<Link href={root+'/history'} prefetch={false}>{t.all}</Link></section></>}
   <button type="button" className={styles.primary} onClick={()=>{choose(next.id);setView(null)}}><Sparkles size={26} aria-hidden="true"/>{d.next} «{next.label[locale]}»<ArrowRight size={23} aria-hidden="true"/></button>
   <section className={styles.panel}><h2>{d.overview}</h2><p>{d.wheelHint}</p><p className={styles.note}>{t.snapshot}</p>
    {['outer','inner'].map(track=>{const items=track==='outer'?OUTER_VECTOR_ITEMS:INNER_VECTOR_ITEMS,model=state.vectors[track];return <details key={track} id={track==='outer'?'life-balance':'meaning-axes'}><summary>{track==='outer'?t.balance:t.axes} ({Object.keys(model.ratings).length}/{items.length})</summary>
     <DevelopmentVectorWheel items={items} ratings={model.ratings} focusId={model.focusId} locale={locale} track={track}/>
     <ul className={styles.dates}>{items.map(item=><li key={item.id}><span>{item.name[locale]||item.name.en}</span><small>{model.ratings[item.id]?dated(model.ratings[item.id].recordedAt,locale,t.unknown):t.missing}</small></li>)}</ul><Link className={styles.action} href={'/'+locale+'/development-vectors?mode=self-discovery&track='+track} prefetch={false}>{t.edit}</Link></details>})}
    <Link className={styles.action} href={root+'/portfolio'} prefetch={false}>{t.profile}</Link><Link className={styles.action} href={root+'/history'} prefetch={false}>{t.all}</Link>
   </section>
   <p className={styles.note+' '+styles.foot}>{d.loaded} {t.privacy}</p><button className={styles.refresh} onClick={()=>void load()}>{t.retry}</button>
  </>}
 </main>
}
