'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,BarChart3,CheckCircle2,ChevronDown,ChevronRight,Clock3,ClipboardCheck,FileText,Flower2,Layers,MessageCircle,Video} from 'lucide-react'
import {PUBLIC_COACH_PERSONAS,coachSessionHref,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {COACH_PROGRAM_GROUPS} from '@/lib/coaching/coach-program-topics.mjs'
import {consumeCoachCourseChoice} from '@/lib/app/coach-course-choice.mjs'
import css from './coaching-course-dashboard.module.css'

const copy={
 ru:{back:'Описание курса',help:'Открыть iHelp',sessions:'сессии',session:'Сессия',coach:'Выбрать коуча',choose:'Выберите своего ИИ-коуча',my:'Мой коуч',change:'Сменить коуча',tasks:'Что нужно сделать',taskbar:'Задачи на сессию',homework:'ДЗ коуча',practice:'Практика',notLinked:'Нет данных',notStarted:'Не начато',inProgress:'В процессе',done:'Выполнено',reflection:'Рефлексия сохранена',materials:'Материалы сессии',results:'Итоги сессии',report:'Отчёт, график',protocol:'Протокол сессии',document:'Документ',start:n=>'Пройти '+n+' сессию с коучем',practiceProgress:'Прогресс практики',homeworkEmpty:'Задания коуча появятся здесь после подтверждённого завершения и привязки сессии. Пока назначение не подтверждено.',protocolEmpty:'Протокол пока не привязан к этой сессии. Сохранённые записи доступны в личном архиве.',archive:'Личный архив',resources:'Дополнительно',free:'Бесплатный дневник',course:'Коучинг-курс',close:'К дневнику',chooseBefore:'Сначала выберите коуча',availability:'Доступность сессии уточняется у коуча.',unknown:'Не проверено',goalMissing:'Выберите цель в разделе практики, чтобы открыть её отчёты.'},
 en:{back:'Course overview',help:'Open iHelp',sessions:'sessions',session:'Session',coach:'Choose a coach',choose:'Choose your AI coach',my:'My coach',change:'Change coach',tasks:'What to do',taskbar:'Session tasks',homework:'Coach homework',practice:'Practice',notLinked:'Not verified',notStarted:'Not started',inProgress:'In progress',done:'Completed',reflection:'Reflection saved',materials:'Session materials',results:'Session results',report:'Report, chart',protocol:'Session protocol',document:'Document',start:n=>'Start session '+n+' with a coach',practiceProgress:'Practice progress',homeworkEmpty:'Coach homework appears after a confirmed session is linked. No assignment has been verified yet.',protocolEmpty:'A protocol is not yet linked to this session. Saved records are available in your private archive.',archive:'Private archive',resources:'More resources',free:'Free workbook',course:'Coaching course',close:'Back to Daybook',chooseBefore:'Choose a coach first',availability:'Session availability is confirmed in My Coach.',unknown:'Not verified',goalMissing:'Select a goal in Practice to see its reports.'},
 es:{back:'Descripción del curso',help:'Abrir iHelp',sessions:'sesiones',session:'Sesión',coach:'Elegir coach',choose:'Elige tu coach de IA',my:'Mi coach',change:'Cambiar coach',tasks:'Qué hacer',taskbar:'Tareas de la sesión',homework:'Tareas del coach',practice:'Práctica',notLinked:'Sin verificar',notStarted:'Sin empezar',inProgress:'En curso',done:'Completada',reflection:'Reflexión guardada',materials:'Materiales de la sesión',results:'Resultados',report:'Informe, gráfico',protocol:'Protocolo',document:'Documento',start:n=>'Iniciar sesión '+n+' con coach',practiceProgress:'Progreso de práctica',homeworkEmpty:'Las tareas del coach aparecen tras vincular una sesión confirmada. No hay una asignación verificada.',protocolEmpty:'Todavía no hay un protocolo vinculado a esta sesión. Los registros guardados están en tu archivo privado.',archive:'Archivo privado',resources:'Más recursos',free:'Diario gratuito',course:'Curso de coaching',close:'Volver al diario',chooseBefore:'Primero elige un coach',availability:'La disponibilidad se confirma en My Coach.',unknown:'Sin verificar',goalMissing:'Elige una meta en Práctica para ver sus informes.'}
}
const standardCopy={en:{back:'My course',coach:'Your AI coach',start:n=>'Start session '+n,materials:'Your materials',materialHint:'Results · Protocol',practiceHint:'A simple exercise to reinforce your insights',homeworkHint:'A small step for real change',minutes:'20-minute coaching session'},ru:{back:'Мой курс',coach:'Ваш ИИ-коуч',start:n=>'Начать сессию '+n,materials:'Ваши материалы',materialHint:'Итоги · Протокол',practiceHint:'Упражнение для закрепления результата',homeworkHint:'Небольшой шаг к переменам',minutes:'20-минутная коучинг-сессия'},es:{back:'Mi curso',coach:'Tu coach de IA',start:n=>'Iniciar sesión '+n,materials:'Tus materiales',materialHint:'Resultados · Protocolo',practiceHint:'Un ejercicio para afianzar lo aprendido',homeworkHint:'Un pequeño paso hacia el cambio',minutes:'Sesión de coaching de 20 minutos'}}
const portrait=id=>'/images/holistic-house/my-coach-motion/'+(id==='harry'?'harry-soft-still.webp':id==='genie'?'genie-natural-opening-v2.webp':id==='caesar'?'caesar-emblem.svg':id+'-still.webp')
export function dashboardSessionHref(locale,program,number,id){
 const href=coachSessionHref(locale,id)
 if(!href)return null
 if(program==='clarity'&&Number.isInteger(number)&&number>=1&&number<=3)return href+'&clarityDay='+number
 const topic=program==='goal'?COACH_PROGRAM_GROUPS.find(group=>group.id==='goal')?.sessions[number-1]:null
 return topic?href+'&goalCourse='+encodeURIComponent(topic.id):href
}
const courseUnavailable={ru:'Коучинг-сессии курса пока недоступны. Самостоятельные практики открыты.',en:'Course coaching sessions are not available yet. Independent practices are open.',es:'Las sesiones de coaching aún no están disponibles. Las prácticas autónomas están abiertas.'}
const preferenceKey=(accountId,program)=>typeof accountId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)&&['clarity','goal'].includes(program)?'hh-daybook-coach-v1:'+accountId+':'+program:null
export default function CoachingCourseDashboard({locale='en',program,title,sessions,selected,onSelect,practiceCounts,loaded=true,ready=true,locked=false,initialPanel=null,practiceOnlyReflection=false,practiceFlow=null,results,children,resources,onLeave,accountId,sessionAvailable=program==='goal',sessionStatus,homework,homeworkStatus,protocol}){
 const lang=Object.hasOwn(copy,locale)?locale:'en',t=copy[lang]
 const v=standardCopy[lang]
 const [materialsOpen,setMaterialsOpen]=useState(false)
 const storageKey=preferenceKey(accountId,program)
 const [choice,setChoice]=useState({key:null,id:''}),[panel,setPanel]=useState(initialPanel),[startAfterChoice,setStartAfterChoice]=useState(false)
 const coachId=choice.key===storageKey?choice.id:''
 const rail=useRef(null),sheet=useRef(null),previousOwner=useRef(accountId)
 useEffect(()=>{
  if(previousOwner.current!==accountId){previousOwner.current=accountId;setPanel(null);setStartAfterChoice(false)}
  let id=''
  try{const saved=storageKey&&window.localStorage.getItem(storageKey);if(PUBLIC_COACH_PERSONAS.some(p=>p.id===saved))id=saved}catch{}
  const launchChoice=storageKey?consumeCoachCourseChoice(program,accountId):null
  if(launchChoice){id=launchChoice;try{window.localStorage.setItem(storageKey,id)}catch{}}
  setChoice({key:storageKey,id})
 },[accountId,storageKey])
 useEffect(()=>{if(initialPanel)setPanel(initialPanel)},[initialPanel])
 useEffect(()=>{const node=rail.current,item=node?.querySelector('[aria-pressed="true"]');if(item){const a=node.getBoundingClientRect(),b=item.getBoundingClientRect();if(b.left<a.left)node.scrollLeft-=a.left-b.left+4;else if(b.right>a.right)node.scrollLeft+=b.right-a.right+4}},[selected,panel])
 useEffect(()=>{if(sheet.current)sheet.current.scrollTop=0;setMaterialsOpen(false)},[selected,panel])
 const coach=PUBLIC_COACH_PERSONAS.find(p=>p.id===coachId),preview=coach||PUBLIC_COACH_PERSONAS[0]
 const [sessionTitle,description]=sessions[selected-1]||sessions[0]
 const count=practiceCounts[selected-1],known=loaded&&count!=null
 const completed=known&&count.total>0&&count.done===count.total
 const state=!known?t.unknown:completed?(practiceOnlyReflection?t.reflection:t.done):count.done?t.inProgress:t.notStarted
 const root='/'+lang
 const sessionHref=sessionAvailable&&coach?dashboardSessionHref(lang,program,selected,coach.id):null
 const panelTitle=panel==='coach'?t.choose:panel==='homework'?t.homework:panel==='practice'?t.practice:panel==='results'?t.results:panel==='protocol'?t.protocol:t.resources
 const open=p=>{if(!locked||p==='practice'){setStartAfterChoice(false);setPanel(p)}}
 function pick(id){
  if(locked||!PUBLIC_COACH_PERSONAS.some(p=>p.id===id))return
  setChoice({key:storageKey,id})
  try{if(storageKey)window.localStorage.setItem(storageKey,id)}catch{}
  setPanel(null);setStartAfterChoice(false)
 }
 if(panel==='practice'&&practiceFlow)return <div className={css.frame} data-coaching-course-dashboard={program} data-coaching-course-active={ready?true:undefined}><div className={css.layout}>{practiceFlow(()=>{setPanel(null);setStartAfterChoice(false)})}</div></div>
 return <div className={css.frame} data-coaching-course-dashboard={program} data-coaching-course-active={ready?true:undefined}>
  <div className={css.layout}>
   <header className={css.topbar}>
    {panel?<button type="button" onClick={()=>{setPanel(null);setStartAfterChoice(false)}} disabled={locked&&panel==='practice'}><ArrowLeft size={19}/>{t.close}</button>:<Link href={root+'/coaching/'+program} prefetch={false} onClick={onLeave}><ArrowLeft size={19}/>{v.back}</Link>}
    {!panel&&<button type="button" className={css.tools} aria-label={t.resources} title={t.resources} onClick={()=>open('resources')} disabled={locked}><Layers size={19}/></button>}
    <button type="button" className={css.help} aria-label={t.help} aria-haspopup="dialog" data-daybook-inline-help onClick={()=>window.dispatchEvent(new Event('hh:open-ihelp'))}><MessageCircle size={18}/>iHelp</button>
   </header>
   <div className={css.cover}><span> {program==='clarity'?'CLARITY':'MY GOAL'} · DAYBOOK</span><h1>{title}</h1><p>{sessions.length} {t.sessions} · {program==='clarity'?t.free:t.course}</p>{!panel&&<div className={css.coverProgress}><progress max={1} value={loaded&&practiceCounts.length===sessions.length&&practiceCounts.every(n=>n&&n.total>0)?practiceCounts.reduce((sum,n)=>sum+n.done,0)/practiceCounts.reduce((sum,n)=>sum+n.total,0):0} aria-label={t.practiceProgress}/><small>{t.practiceProgress}</small></div>}</div>
   {!panel&&<nav ref={rail} className={css.tabs} data-coaching-session-tabs={sessions.length} aria-label={t.sessions}>
    {sessions.map(([name],i)=>{const n=practiceCounts[i],verified=loaded&&n!=null;return <button key={i} type="button" aria-pressed={selected===i+1} disabled={locked} onClick={()=>onSelect(i+1)} title={name}><strong>{t.session} {i+1}</strong><span className={css.tabTitle}>{name}</span><small>{verified&&n.done===n.total&&n.total>0?<CheckCircle2 size={13}/>:null}{verified?n.done+'/'+n.total:'—'}</small></button>})}
   </nav>}
   <div className={css.sheet} ref={sheet} tabIndex={0} aria-label={panel?panelTitle:t.tasks}>
    {!panel&&<>
     <div className={css.card} data-course-standard="golden-v4">
      <div className={css.banner}><span>{t.session} {selected} / {sessions.length}</span><h2>{sessionTitle}</h2><p>{description}</p><div className={css.progress}><progress max={known?count.total:1} value={known?count.done:0} aria-label={t.practiceProgress}/><strong>{known?count.done+'/'+count.total:'—'}</strong></div></div>
<button type="button" className={css.coach} data-coaching-coach={coach?.id||'choose'} disabled={locked} onClick={()=>open('coach')}>
    <span className={css.portrait}><img src={portrait(preview.id)} alt="" width="72" height="72"/></span><span className={css.coachName}><small>{v.coach}</small><strong>{coach?localCoachText(coach.name,lang):t.coach}</strong></span><span className={css.change}>{coach?t.change:''}<ChevronRight size={20}/></span>
   </button>
<footer className={css.footer}>{sessionHref?<Link href={sessionHref} className={css.cta} data-coaching-session-start={selected} prefetch={false} onClick={onLeave}><Video size={22}/><strong>{v.start(selected)}</strong><ArrowRight size={19}/></Link>:<button type="button" className={css.cta} data-coaching-session-start={selected} disabled={locked||!sessionAvailable} onClick={()=>{setStartAfterChoice(true);setPanel('coach')}}><Video size={22}/><strong>{v.start(selected)}</strong><ArrowRight size={19}/></button>}{sessionStatus||(!sessionAvailable?<small>{courseUnavailable[lang]}</small>:program==='clarity'?<small><Clock3 size={13}/>{v.minutes}</small>:<small>{t.availability}</small>)}</footer>
      <button type="button" className={css.task} data-coaching-task="practice" onClick={()=>open('practice')}><Flower2 size={24}/><div className={css.taskText}><strong>{t.practice}</strong><small>{v.practiceHint}</small></div><span className={completed?css.done:css.neutral}>{state}</span><ChevronRight size={17}/></button>
      <button type="button" className={css.task} data-coaching-task="homework" onClick={()=>open('homework')} disabled={locked}><ClipboardCheck size={24}/><div className={css.taskText}><strong>{t.homework}</strong><small>{v.homeworkHint}</small></div><span className={homeworkStatus?.complete?css.done:css.neutral}>{homeworkStatus?.label||t.notLinked}</span><ChevronRight size={17}/></button>
      <button type="button" className={css.materialToggle} aria-expanded={materialsOpen} aria-controls="course-session-materials" onClick={()=>setMaterialsOpen(old=>!old)} disabled={locked}><Layers size={24}/><div className={css.taskText}><strong>{v.materials}</strong><small>{v.materialHint}</small></div><ChevronDown size={19}/></button>
      <div id="course-session-materials" className={css.materials} hidden={!materialsOpen}>
       <button type="button" data-coaching-material="results" onClick={()=>open('results')} disabled={locked}><BarChart3 size={32}/><strong>{t.results}</strong><small>{t.report}</small></button>
       <button type="button" data-coaching-material="protocol" onClick={()=>open('protocol')} disabled={locked}><FileText size={32}/><strong>{t.protocol}</strong><small>{t.document}</small></button>
      </div>
     </div>
    </>}
    {panel&&<div className={css.panelTitle}><span>{t.session} {selected} / {sessions.length}</span><h2>{panelTitle}</h2><p>{sessionTitle}</p></div>}
    {panel==='coach'&&<div className={css.coachList}>{PUBLIC_COACH_PERSONAS.map(persona=><button type="button" key={persona.id} aria-pressed={persona.id===coachId} onClick={()=>pick(persona.id)}><img src={portrait(persona.id)} width="56" height="56" alt=""/><span><strong>{localCoachText(persona.name,lang)}</strong><small>{localCoachText(persona.role,lang)}</small></span><ChevronRight size={19}/></button>)}</div>}
    <div className={css.panelBody} hidden={panel!=='homework'} data-coaching-homework-panel>{homework||<p>{t.homeworkEmpty}</p>}</div>
    <div className={css.panelBody} hidden={panel!=='practice'} data-coaching-practice-panel><p>{description}</p>{children}</div>
    <div className={css.panelBody} hidden={panel!=='results'} data-coaching-results-panel>{results||<p>{t.goalMissing}</p>}</div>
    {panel==='protocol'&&<div className={css.panelBody} data-coaching-protocol-panel>{protocol||<p>{t.protocolEmpty}</p>}<Link href={'/'+(lang==='es'?'en':lang)+'/app/my-coaching-plan?tab=reports'} prefetch={false} onClick={onLeave}>{t.archive}<ArrowRight size={18}/></Link></div>}
    <div className={css.panelBody} hidden={panel!=='resources'}>{resources}</div>
   </div>
   {panel==='coach'&&startAfterChoice&&<p className={css.choiceNote}>{t.chooseBefore}</p>}
  </div>
 </div>
}
