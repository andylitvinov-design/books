'use client'
import {useEffect,useMemo,useState} from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {ArrowRight,BookOpen,Briefcase,ChevronDown,Flower2,MessageCircle,Target} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {combineMyPageCourses} from '@/lib/app/my-page-courses.mjs'
import {CoursePurchaseHistory} from '../commerce/course-purchase-history'
import {clarityMyPageRunHref} from '@/lib/coaching/clarity-resume-scope.mjs'
import {collectJournalExport} from '@/lib/app/daybook-journal-export.mjs'
import {guideGoalProgress} from '@/lib/app/daybook-guide.mjs'
import {profileDaybookHref} from '@/lib/profile/profile-daybook-route.mjs'
import ProfileGoalConsole,{goalList} from './profile-goal-console'
const ProgramPanel=dynamic(()=>import('./profile-space-dashboard').then(m=>m.ProfileSpaceDashboard))
import profileStyles from './profile-personal-summary.module.css'
import styles from './my-page-courses.module.css'

const COPY={
 en:{title:'My Courses',all:'All my courses',loading:'Loading your courses…',empty:'No courses started yet.',partial:'Some course history is unavailable or incomplete.',retry:'Try again',growth:'Personal course',calm_balance:'Anti-Stress',business_focus:'Focus & Productivity',confidence:'Confidence & Inner Strength',reiki:'Reiki Practitioner',business:'Business Growth',clarity:'Express · AI Coaching',goal:'Achieving My Goal',antistress:'Anti-Stress · My Coach',coach:'My Coach',legacyClarity:'Express · saved sessions',run:'Course',session:'Session',minutes:'min',lessons:'lessons',days:'days',slides:'Saved position',saved:'Saved sessions',active:'Continue',paused:'Paused',setup:'Continue setup',completed:'Completed',closed:'Archived',unknown:'Progress unavailable',progress:'Course progress',time:'Coaching time',review:'Open history'},
 ru:{title:'Мои курсы',all:'Все мои курсы',loading:'Загружаем ваши курсы…',empty:'Вы ещё не начали ни одного курса.',partial:'Часть истории курсов недоступна или загружена не полностью.',retry:'Повторить',growth:'Персональный курс',calm_balance:'Антистресс',business_focus:'Фокус и продуктивность',confidence:'Уверенность и опора',reiki:'Практик Рейки',business:'Развитие бизнеса',clarity:'Экспресс · AI-коучинг',goal:'Достижение моей цели',antistress:'Антистресс · Мой коуч',coach:'Мой коуч',legacyClarity:'Экспресс · сохранённые сессии',run:'Курс',session:'Сессия',minutes:'мин',lessons:'уроков',days:'дней',slides:'Сохранённая позиция',saved:'Сохранённые сессии',active:'Продолжить',paused:'На паузе',setup:'Продолжить настройку',completed:'Завершён',closed:'В архиве',unknown:'Прогресс недоступен',progress:'Прогресс курса',time:'Время коучинга',review:'Открыть историю'},
 es:{title:'Mis cursos',all:'Todos mis cursos',loading:'Cargando tus cursos…',empty:'Todavía no has iniciado ningún curso.',partial:'Parte del historial de cursos no está disponible o está incompleto.',retry:'Reintentar',growth:'Curso personal',calm_balance:'Antiestrés',business_focus:'Enfoque y productividad',confidence:'Confianza y fortaleza interior',reiki:'Practicante de Reiki',business:'Crecimiento empresarial',clarity:'Exprés · coaching IA',goal:'Alcanzar mi meta',antistress:'Antiestrés · Mi coach',coach:'Mi coach',legacyClarity:'Exprés · sesiones guardadas',run:'Curso',session:'Sesión',minutes:'min',lessons:'lecciones',days:'días',slides:'Posición guardada',saved:'Sesiones guardadas',active:'Continuar',paused:'En pausa',setup:'Continuar configuración',completed:'Completado',closed:'Archivado',unknown:'Progreso no disponible',progress:'Progreso del curso',time:'Tiempo de coaching',review:'Abrir historial'}
}
const CABINET={
 en:{explore:'Explore programs',newGoal:'Create a new goal',goal:'My Goal',clarity:'Express Support',business:'My Business',notStarted:'Not started',manage:'Open course',details:'Program details',coach:'My Coach',settings:'Settings',reports:'My reports',sessions:'My sessions',videos:'MyVideo',start:'Start program'},
 ru:{explore:'Выбрать программу',newGoal:'Создать новую цель',goal:'Моя цель',clarity:'Экспресс-поддержка',business:'Мой бизнес',notStarted:'Не начат',manage:'Открыть курс',details:'О программе',coach:'Мой коуч',settings:'Настройки',reports:'Мои отчёты',sessions:'Мои сессии',videos:'MyVideo',start:'Начать программу'},
 es:{explore:'Explorar programas',newGoal:'Crear una nueva meta',goal:'Mi meta',clarity:'Apoyo exprés',business:'Mi negocio',notStarted:'Sin iniciar',manage:'Abrir curso',details:'Detalles del programa',coach:'Mi coach',settings:'Ajustes',reports:'Mis informes',sessions:'Mis sesiones',videos:'MyVideo',start:'Iniciar programa'}
}
function courseView(c,locale,t){
 const root='/'+locale,appRoot='/'+(locale==='es'?'en':locale)+'/app'
 const fallback=c.done===null||c.total===null?'':c.done+'/'+c.total
 switch(c.kind){
  case 'goal':return {title:c.title,detail:c.progress?c.progress.completedWeeks+'/8 '+({en:'weeks',ru:'недель',es:'semanas'})[locale]:'',href:c.progress?.next?profileDaybookHref(appRoot,c.id,c.progress.next.week,c.progress.next.step):profileDaybookHref(appRoot,c.id),Icon:Target}
  case 'growth':return {title:t[c.presetId]||t.growth,detail:fallback?fallback+' '+t.lessons:'',href:appRoot+'/course?view=courses&courseId='+encodeURIComponent(c.id),Icon:BookOpen}
  case 'reiki':return {title:t.reiki,detail:fallback?t.slides+' · '+fallback:'',href:root+'/academy/principles-of-energywork/learn'+(c.slideId?'?slide='+encodeURIComponent(c.slideId):''),Icon:Flower2}
  case 'business':return {title:t.business,detail:fallback+' '+t.days,href:root+'/app/daybook/business',Icon:Briefcase}
  case 'clarity':{
   const href=clarityMyPageRunHref(locale,c)
   return href?{title:t.clarity+' · '+t.run+' '+c.ordinal,detail:[c.day?t.session+' '+c.day+'/3':'',t.time+' '+Math.floor(c.done/60000)+'/60 '+t.minutes].filter(Boolean).join(' · '),href,Icon:MessageCircle}:null
  }
  case 'therapy':return {title:t.antistress+' · Therapy',detail:[c.day?t.session+' '+c.day+'/3':'',Math.floor(c.done/60000)+'/45 '+t.minutes].filter(Boolean).join(' · '),href:root+'/app/my-coaching-plan?tab=reports&antiStressRun='+encodeURIComponent(c.id),Icon:Flower2}
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
 const [opened,setOpened]=useState(null)
 const [goalState,setGoalState]=useState(null)
 const labels=CABINET[lang]
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController(), options={accountId,signal:controller.signal}
  const scopedFetch=(path,body,method,opts)=>appFetch(path,body,method,{...opts,signal:controller.signal})
  ;(async()=>{
   let plan=null
   try{
    plan=await appFetch('coaching-life-plan?locale='+lang,undefined,'GET',options)
    if(controller.signal.aborted)return
    const goals=goalList(plan)
    setGoalState({owner:accountId,retry,lang,plan,loading:false,error:false,entries:goals.length?null:[],entriesError:false})
    if(!goals.length)return
    const result=await collectJournalExport(scopedFetch,accountId,()=>!controller.signal.aborted)
    if(!controller.signal.aborted)setGoalState({owner:accountId,retry,lang,plan,loading:false,error:false,entries:result.entries,entriesError:false})
   }catch{
    if(!controller.signal.aborted)setGoalState({owner:accountId,retry,lang,plan,loading:false,error:!plan,entries:null,entriesError:!!plan})
   }
  })()
  return()=>controller.abort()
 },[accountId,lang,retry])
 useEffect(()=>{setOpened(null)},[accountId])
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
   setState({accountId,retry,courses:combineMyPageCourses(saved.value.courses,catalog),coursePurchases:Array.isArray(saved.value.coursePurchases)?saved.value.coursePurchases:[],partial:saved.value.partial||catalogPartial})
  })
  return()=>controller.abort()
 },[accountId,retry])
 const current=accountId&&state?.accountId===accountId&&state?.retry===retry?state:null
 const goalSnapshot=accountId&&goalState?.owner===accountId&&goalState.retry===retry&&goalState.lang===lang?goalState:null
 const snapshot=useMemo(()=>goalSnapshot?{...goalSnapshot,onRetry:()=>setRetry(n=>n+1)}:null,[goalSnapshot])
 const goalRows=useMemo(()=>goalList(goalSnapshot?.plan).map(goal=>{
  const id=String(goal.id),progress=guideGoalProgress(goalSnapshot?.entries,id)
  return {key:'goal:'+id,kind:'goal',id,title:goal.title,state:progress?.next===null?'completed':'active',percent:progress?.percent??null,progress}
 }),[goalSnapshot])
 const root='/'+(lang==='es'?'en':lang)+'/app', localRoot='/'+lang
 const rows=[...goalRows,...(current?.courses||[])]
 const canExplore=Boolean(current&&goalSnapshot&&!goalSnapshot.error)
 const available=[
  ...(!rows.some(c=>c.kind==='clarity'||c.kind==='legacy'&&c.group==='clarity')?[{key:'new:clarity',title:labels.clarity,section:'clarity',Icon:MessageCircle}]:[]),
  ...(!goalRows.length?[{key:'new:goal',title:labels.goal,section:'goals',Icon:Target}]:[]),
  ...(!rows.some(c=>c.kind==='business')?[{key:'new:business',title:labels.business,section:'business',Icon:Briefcase}]:[]),
  ...(!rows.some(c=>c.kind==='reiki')?[{key:'new:reiki',title:t.reiki,href:localRoot+'/academy/principles-of-energywork',Icon:Flower2}]:[])
 ]
 function toggle(key){setOpened(previous=>previous===key?null:key)}
 const expand=(key,view,percent,status,ringLabel,content,kind)=>{
  const {Icon}=view,expanded=opened===key,region='my-course-'+encodeURIComponent(key)
  return <article key={key} className={styles.item} data-my-page-course={kind} data-my-page-course-key={key}>
   <button type="button" className={styles.row} aria-expanded={expanded} aria-controls={region} onClick={()=>toggle(key)}>
    <span className={styles.icon} data-course-art={kind==='available'?key.replace('new:',''):kind} aria-hidden="true"><Icon size={22}/></span>
    <span className={styles.description}><strong>{view.title}</strong>{view.detail&&<small>{view.detail}</small>}<span className={styles.action}>{status}<ChevronDown size={14} aria-hidden="true" className={expanded?styles.rotated:undefined}/></span>{kind!=='available'&&Number.isInteger(percent)&&percent>=0&&percent<=100?<span className={styles.linear} aria-hidden="true"><span style={{width:percent+'%'}}/></span>:null}</span>
    {kind==='available'?<ChevronDown size={21} aria-hidden="true"/>:<ProgressRing percent={percent} label={ringLabel} unknown={t.unknown}/>}
   </button>
   <div id={region} className={styles.panel} hidden={!expanded}>{expanded&&content}</div>
  </article>
 }
 return <section className={profileStyles.card} aria-label={t.title} id="my-courses" data-my-page-courses>
  <header className={profileStyles.heading}><BookOpen size={23} aria-hidden="true"/><h2>{t.title}</h2></header>
  {!current||!goalSnapshot?<p className={profileStyles.empty} role="status">{t.loading}</p>:null}
  {rows.length>0?<div className={styles.list}>{rows.map(c=>{
    const view=courseView(c,lang,t);if(!view)return null
    const status=c.state==='saved'?t.review:t[c.state]
    const label=view.title+' · '+(c.kind==='reiki'?t.slides:c.kind==='clarity'?t.time:t.progress)
    const action=<Link href={view.href} prefetch={false} className={styles.resume} data-my-course-resume>{c.state==='completed'||c.state==='saved'||c.state==='closed'?labels.manage:status}<ArrowRight size={18} aria-hidden="true"/></Link>
    let content=action
    if(c.kind==='goal')content=<ProfileGoalConsole key={c.id} locale={lang} root={root} accountId={accountId} selectedGoalId={c.id} cabinetSnapshot={snapshot}/>
    else if(c.kind==='business')content=<>{action}<ProgramPanel locale={lang} root={root} accountId={accountId} embeddedSection="business"/></>
    else if(c.kind==='clarity'||c.kind==='legacy'&&c.group==='clarity')content=<>{action}<Link className={styles.secondary} href={localRoot+'/coaching/clarity'} prefetch={false}>{labels.details}<ArrowRight size={16}/></Link></>
    return expand(c.key,view,c.percent,status,label,content,c.kind)
  })}</div>:canExplore&&!current.partial&&<p className={profileStyles.empty}>{t.empty}</p>}
  {current?.coursePurchases?.length>0&&<CoursePurchaseHistory locale={lang} orders={current.coursePurchases}/>}
  {(current?.partial||goalSnapshot?.error||goalSnapshot?.entriesError)&&<div className={styles.notice} role="status">{t.partial} <button type="button" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></div>}
  {canExplore&&<div className={styles.discovery}>
   <h3>{labels.explore}</h3>
   {goalRows.length>0&&<Link className={styles.secondary} href={root+'/daybook?start=vector'} prefetch={false}>{labels.newGoal}<ArrowRight size={16}/></Link>}
   <div className={styles.list}>{available.map(item=>{
    const content=item.section==='goals'?<ProfileGoalConsole locale={lang} root={root} accountId={accountId} cabinetSnapshot={snapshot}/>:item.section?<ProgramPanel locale={lang} root={root} accountId={accountId} embeddedSection={item.section}/>:<Link className={styles.resume} href={item.href} prefetch={false}>{labels.start}<ArrowRight size={18}/></Link>
    return expand(item.key,item,null,labels.notStarted,labels.notStarted,content,'available')
   })}</div>
   <Link href={root+'/course?view=courses'} prefetch={false} className={profileStyles.more}>{t.all}<ArrowRight size={16} aria-hidden="true"/></Link>
  </div>}
 </section>

}
