'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowRight,BookOpen,Briefcase,Flower2,MessageCircle,Target} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {combineMyPageCourses} from '@/lib/app/my-page-courses.mjs'
import profileStyles from './profile-personal-summary.module.css'
import styles from './my-page-courses.module.css'

const COPY={
 en:{title:'My Courses',all:'All my courses',loading:'Loading your courses…',empty:'No courses started yet.',partial:'Some course history is unavailable or incomplete.',retry:'Try again',growth:'Personal course',calm_balance:'Anti-Stress',business_focus:'Focus & Productivity',confidence:'Confidence & Inner Strength',reiki:'Reiki Practitioner',business:'Business Growth',clarity:'Clarity · AI Coaching',goal:'Achieving My Goal',antistress:'Anti-Stress · My Coach',coach:'My Coach',legacyClarity:'Clarity · saved sessions',run:'Course',session:'Session',minutes:'min',lessons:'lessons',days:'days',slides:'Saved position',saved:'Saved sessions',active:'Continue',paused:'Paused',setup:'Continue setup',completed:'Completed',closed:'Archived',unknown:'Progress unavailable',progress:'Course progress',time:'Coaching time',review:'Open history'},
 ru:{title:'Мои курсы',all:'Все мои курсы',loading:'Загружаем ваши курсы…',empty:'Вы ещё не начали ни одного курса.',partial:'Часть истории курсов недоступна или загружена не полностью.',retry:'Повторить',growth:'Персональный курс',calm_balance:'Антистресс',business_focus:'Фокус и продуктивность',confidence:'Уверенность и опора',reiki:'Практик Рейки',business:'Развитие бизнеса',clarity:'Ясность · AI-коучинг',goal:'Достижение моей цели',antistress:'Антистресс · Мой коуч',coach:'Мой коуч',legacyClarity:'Ясность · сохранённые сессии',run:'Курс',session:'Сессия',minutes:'мин',lessons:'уроков',days:'дней',slides:'Сохранённая позиция',saved:'Сохранённые сессии',active:'Продолжить',paused:'На паузе',setup:'Продолжить настройку',completed:'Завершён',closed:'В архиве',unknown:'Прогресс недоступен',progress:'Прогресс курса',time:'Время коучинга',review:'Открыть историю'},
 es:{title:'Mis cursos',all:'Todos mis cursos',loading:'Cargando tus cursos…',empty:'Todavía no has iniciado ningún curso.',partial:'Parte del historial de cursos no está disponible o está incompleto.',retry:'Reintentar',growth:'Curso personal',calm_balance:'Antiestrés',business_focus:'Enfoque y productividad',confidence:'Confianza y fortaleza interior',reiki:'Practicante de Reiki',business:'Crecimiento empresarial',clarity:'Claridad · coaching IA',goal:'Alcanzar mi meta',antistress:'Antiestrés · Mi coach',coach:'Mi coach',legacyClarity:'Claridad · sesiones guardadas',run:'Curso',session:'Sesión',minutes:'min',lessons:'lecciones',days:'días',slides:'Posición guardada',saved:'Sesiones guardadas',active:'Continuar',paused:'En pausa',setup:'Continuar configuración',completed:'Completado',closed:'Archivado',unknown:'Progreso no disponible',progress:'Progreso del curso',time:'Tiempo de coaching',review:'Abrir historial'}
}
function courseView(c,locale,t){
 const root='/'+locale,appRoot='/'+(locale==='es'?'en':locale)+'/app'
 const fallback=c.done===null||c.total===null?'':c.done+'/'+c.total
 switch(c.kind){
  case 'self-discovery':return {title:'Self Discovery',detail:[fallback?fallback+' '+({en:'tests explored',ru:'тестов исследовано',es:'pruebas exploradas'}[locale]):'',c.axes+'/16 '+({en:'axes measured',ru:'осей измерено',es:'ejes medidos'}[locale])].filter(Boolean).join(' · '),href:root+'/app/daybook/self-discovery?theme=all&view=results',Icon:BookOpen}
  case 'growth':return {title:t[c.presetId]||t.growth,detail:fallback?fallback+' '+t.lessons:'',href:appRoot+'/course?view=courses&courseId='+encodeURIComponent(c.id),Icon:BookOpen}
  case 'reiki':return {title:t.reiki,detail:fallback?t.slides+' · '+fallback:'',href:root+'/academy/principles-of-energywork/learn'+(c.slideId?'?slide='+encodeURIComponent(c.slideId):''),Icon:Flower2}
  case 'business':return {title:t.business,detail:fallback+' '+t.days,href:root+'/app/daybook/business',Icon:Briefcase}
  case 'clarity':return {title:t.clarity+' · '+t.run+' '+c.ordinal,detail:[c.day?t.session+' '+c.day+'/3':'',t.time+' '+Math.floor(c.done/60000)+'/60 '+t.minutes].filter(Boolean).join(' · '),href:root+'/app/daybook?program=clarity',Icon:MessageCircle}
  case 'legacy':return {title:c.group==='clarity'?t.legacyClarity:t[c.group]||t.coach,detail:t.saved+' · '+c.done,href:c.group==='goal'?root+'/app/daybook?start=vector':c.group==='clarity'?root+'/app/daybook?program=clarity':root+'/my-coach',Icon:c.group==='goal'?Target:MessageCircle}
  default:return null
 }
}
function ProgressRing({percent,label,unknown}){
 const known=Number.isInteger(percent)&&percent>=0&&percent<=100
 return <span className={styles.ring} role={known?'progressbar':'img'} aria-label={known?label:unknown} aria-valuemin={known?0:undefined} aria-valuemax={known?100:undefined} aria-valuenow={known?percent:undefined}>
  <svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="23" className={styles.track}/>{known&&<circle cx="27" cy="27" r="23" pathLength="100" strokeDasharray={percent+' 100'} className={styles.fill}/>}</svg>
  <strong aria-hidden="true">{known?percent+'%':'—'}</strong>
 </span>
}
export default function MyPageCourses({locale='en',accountId}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang]
 const [state,setState]=useState(null)
 const [retry,setRetry]=useState(0)
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController()
  const options={accountId,signal:controller.signal}
  Promise.allSettled([
   appFetch('my-page?view=courses',undefined,'GET',options),
   appFetch('clarity-course/runs',undefined,'GET',options)
  ]).then(([saved,runs])=>{
   if(controller.signal.aborted)return
   if(saved.status==='rejected'||saved.value?.accountId!==accountId||!Array.isArray(saved.value.courses)){
    setState({accountId,retry,courses:[],partial:true});return
   }
   // New Clarity run storage is independently gated. A missing route on older
   // production builds is not a reason to hide the already-owned courses.
   const catalog=runs.status==='fulfilled'&&Array.isArray(runs.value?.runs)?runs.value.runs:[]
   const catalogPartial=runs.status==='fulfilled'?runs.value?.hasMore===true||!Array.isArray(runs.value?.runs):![404].includes(runs.reason?.status)
   setState({accountId,retry,courses:combineMyPageCourses(saved.value.courses,catalog),partial:saved.value.partial||catalogPartial})
  })
  return()=>controller.abort()
 },[accountId,retry])
 const current=accountId&&state?.accountId===accountId&&state?.retry===retry?state:null
 const root='/'+(lang==='es'?'en':lang)+'/app'
 return <section className={profileStyles.card} aria-label={t.title} data-my-page-courses>
  <header className={profileStyles.heading}><BookOpen size={23} aria-hidden="true"/><h2>{t.title}</h2><Link href={root+'/course?view=courses'} aria-label={t.all} prefetch={false}><ArrowRight size={20}/></Link></header>
  {!current?<p className={profileStyles.empty} role="status">{t.loading}</p>:<>
   {current.courses.length>0?<div className={styles.list}>{current.courses.map(c=>{
    const view=courseView(c,lang,t);if(!view)return null
    const {Icon}=view
    return <Link key={c.key} href={view.href} prefetch={false} className={styles.row} data-my-page-course={c.kind}>
     <span className={styles.icon}><Icon size={22} aria-hidden="true"/></span>
     <span className={styles.description}><strong>{view.title}</strong>{view.detail&&<small>{view.detail}</small>}<span className={styles.action}>{c.state==='saved'?t.review:t[c.state]}<ArrowRight size={14} aria-hidden="true"/></span></span>
     <ProgressRing percent={c.percent} label={view.title+' · '+(c.kind==='reiki'?t.slides:c.kind==='clarity'?t.time:c.kind==='self-discovery'?({en:'Test catalogue coverage',ru:'Охват каталога тестов',es:'Cobertura del catálogo'}[lang]):t.progress)} unknown={t.unknown}/>
    </Link>
   })}</div>:!current.partial&&<p className={profileStyles.empty}>{t.empty}</p>}
   {current.partial&&<div className={styles.notice} role="status">{t.partial} <button type="button" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></div>}
  </>}
  {current&&!current.courses.some(c=>c.kind==='self-discovery')&&<Link href={'/'+lang+'/app/daybook/self-discovery'} prefetch={false} className={profileStyles.more} data-self-discovery-entry>Self Discovery · {({en:'Open',ru:'Открыть',es:'Abrir'})[lang]}<ArrowRight size={16} aria-hidden="true"/></Link>}
  <Link href={root+'/course?view=courses'} prefetch={false} className={profileStyles.more}>{t.all}<ArrowRight size={16} aria-hidden="true"/></Link>
 </section>
}
