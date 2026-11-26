'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,BarChart3,BookOpen,CheckCircle2,ChevronRight,ClipboardCheck,FileText,Flower2,Layers,MessageCircle,Sparkles,Video} from 'lucide-react'
import {PUBLIC_COACH_PERSONAS,coachSessionHref,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {COACH_PROGRAM_GROUPS} from '@/lib/coaching/coach-program-topics.mjs'
import css from './coaching-course-dashboard.module.css'

const copy={
 ru:{back:'Описание курса',help:'Открыть iHelp',sessions:'сессии',session:'Сессия',coach:'Выбрать коуча',choose:'Выберите своего ИИ-коуча',my:'Мой коуч',change:'Сменить коуча',tasks:'Что нужно сделать',taskbar:'Задачи на сессию',homework:'ДЗ коуча',practice:'Практика',notLinked:'Нет данных',notStarted:'Не начато',inProgress:'В процессе',done:'Выполнено',reflection:'Рефлексия сохранена',materials:'Материалы сессии',results:'Итоги сессии',report:'Отчёт, график',protocol:'Протокол сессии',document:'Документ',start:n=>'Пройти '+n+' сессию с коучем',practiceProgress:'Прогресс практики',homeworkEmpty:'Задания коуча появятся здесь после подтверждённого завершения и привязки сессии. Пока назначение не подтверждено.',protocolEmpty:'Протокол пока не привязан к этой сессии. Сохранённые записи доступны в личном архиве.',archive:'Личный архив',resources:'Дополнительно',free:'Бесплатный дневник',course:'Коучинг-курс',close:'К дневнику',chooseBefore:'Сначала выберите коуча',availability:'Доступность сессии уточняется у коуча.',unknown:'Не проверено',goalMissing:'Выберите цель в разделе практики, чтобы открыть её отчёты.'},
 en:{back:'Course overview',help:'Open iHelp',sessions:'sessions',session:'Session',coach:'Choose a coach',choose:'Choose your AI coach',my:'My coach',change:'Change coach',tasks:'What to do',taskbar:'Session tasks',homework:'Coach homework',practice:'Practice',notLinked:'Not verified',notStarted:'Not started',inProgress:'In progress',done:'Completed',reflection:'Reflection saved',materials:'Session materials',results:'Session results',report:'Report, chart',protocol:'Session protocol',document:'Document',start:n=>'Start session '+n+' with a coach',practiceProgress:'Practice progress',homeworkEmpty:'Coach homework appears after a confirmed session is linked. No assignment has been verified yet.',protocolEmpty:'A protocol is not yet linked to this session. Saved records are available in your private archive.',archive:'Private archive',resources:'More resources',free:'Free workbook',course:'Coaching course',close:'Back to Daybook',chooseBefore:'Choose a coach first',availability:'Session availability is confirmed in My Coach.',unknown:'Not verified',goalMissing:'Select a goal in Practice to see its reports.'},
 es:{back:'Descripción del curso',help:'Abrir iHelp',sessions:'sesiones',session:'Sesión',coach:'Elegir coach',choose:'Elige tu coach de IA',my:'Mi coach',change:'Cambiar coach',tasks:'Qué hacer',taskbar:'Tareas de la sesión',homework:'Tareas del coach',practice:'Práctica',notLinked:'Sin verificar',notStarted:'Sin empezar',inProgress:'En curso',done:'Completada',reflection:'Reflexión guardada',materials:'Materiales de la sesión',results:'Resultados',report:'Informe, gráfico',protocol:'Protocolo',document:'Documento',start:n=>'Iniciar sesión '+n+' con coach',practiceProgress:'Progreso de práctica',homeworkEmpty:'Las tareas del coach aparecen tras vincular una sesión confirmada. No hay una asignación verificada.',protocolEmpty:'Todavía no hay un protocolo vinculado a esta sesión. Los registros guardados están en tu archivo privado.',archive:'Archivo privado',resources:'Más recursos',free:'Diario gratuito',course:'Curso de coaching',close:'Volver al diario',chooseBefore:'Primero elige un coach',availability:'La disponibilidad se confirma en My Coach.',unknown:'Sin verificar',goalMissing:'Elige una meta en Práctica para ver sus informes.'}
}
const portrait=id=>'/images/holistic-house/my-coach-motion/'+(id==='harry'?'harry-soft-still.webp':id==='genie'?'genie-natural-opening-v2.webp':id==='caesar'?'caesar-emblem.svg':id+'-still.webp')
export function dashboardSessionHref(locale,program,number,id){
 const href=coachSessionHref(locale,id)
 if(!href)return null
 if(program==='clarity'&&Number.isInteger(number)&&number>=1&&number<=3)return href+'&clarityDay='+number
 const topic=program==='goal'?COACH_PROGRAM_GROUPS.find(group=>group.id==='goal')?.sessions[number-1]:null
 return topic?href+'&goalCourse='+encodeURIComponent(topic.id):href
}
export default function CoachingCourseDashboard({locale='en',program,title,sessions,selected,onSelect,practiceCounts,loaded=true,ready=true,locked=false,initialPanel=null,practiceOnlyReflection=false,results,children,resources,onLeave,accountId}){
 const lang=Object.hasOwn(copy,locale)?locale:'en',t=copy[lang]
 const [coachId,setCoachId]=useState(''),[panel,setPanel]=useState(initialPanel),[startAfterChoice,setStartAfterChoice]=useState(false)
 const rail=useRef(null),sheet=useRef(null),previousOwner=useRef(accountId)
 useEffect(()=>{if(previousOwner.current!==accountId){previousOwner.current=accountId;setCoachId('');setPanel(null);setStartAfterChoice(false)}},[accountId])
 useEffect(()=>{if(initialPanel)setPanel(initialPanel)},[initialPanel])
 useEffect(()=>{const node=rail.current,item=node?.querySelector('[aria-pressed="true"]');if(item){const a=node.getBoundingClientRect(),b=item.getBoundingClientRect();if(b.left<a.left)node.scrollLeft-=a.left-b.left+4;else if(b.right>a.right)node.scrollLeft+=b.right-a.right+4}},[selected,panel])
 useEffect(()=>{if(sheet.current)sheet.current.scrollTop=0},[selected,panel])
 const coach=PUBLIC_COACH_PERSONAS.find(p=>p.id===coachId),preview=coach||PUBLIC_COACH_PERSONAS[0]
 const [sessionTitle,description]=sessions[selected-1]||sessions[0]
 const count=practiceCounts[selected-1],known=loaded&&count!=null
 const completed=known&&count.total>0&&count.done===count.total
 const state=!known?t.unknown:completed?(practiceOnlyReflection?t.reflection:t.done):count.done?t.inProgress:t.notStarted
 const root='/'+lang
 const sessionHref=coach?dashboardSessionHref(lang,program,selected,coach.id):null
 const panelTitle=panel==='coach'?t.choose:panel==='homework'?t.homework:panel==='practice'?t.practice:panel==='results'?t.results:panel==='protocol'?t.protocol:t.resources
 const open=p=>{if(!locked||p==='practice'){setStartAfterChoice(false);setPanel(p)}}
 function pick(id){if(locked)return;setCoachId(id);setPanel(null);setStartAfterChoice(false)}
 return <div className={css.frame} data-coaching-course-dashboard={program} data-coaching-course-active={ready?true:undefined}>
  <div className={css.layout}>
   <header className={css.topbar}>
    {panel?<button type="button" onClick={()=>{setPanel(null);setStartAfterChoice(false)}} disabled={locked&&panel==='practice'}><ArrowLeft size={19}/>{t.close}</button>:<Link href={root+'/coaching/'+program} prefetch={false} onClick={onLeave}><ArrowLeft size={19}/>{t.back}</Link>}
    <button type="button" className={css.help} aria-label={t.help} aria-haspopup="dialog" data-daybook-inline-help onClick={()=>window.dispatchEvent(new Event('hh:open-ihelp'))}><MessageCircle size={18}/>iHelp</button>
   </header>
   <div className={css.cover}><span> {program==='clarity'?'CLARITY':'MY GOAL'} · DAYBOOK</span><h1>{title}</h1><p>{sessions.length} {t.sessions} · {program==='clarity'?t.free:t.course}</p><b><Sparkles size={14}/>DAYBOOK</b></div>
   {!panel&&<button type="button" className={css.coach} data-coaching-coach={coach?.id||'choose'} disabled={locked} onClick={()=>open('coach')}>
    <span className={css.portrait}><img src={portrait(preview.id)} alt="" width="72" height="72"/></span><span className={css.coachName}><small>{coach?t.my:t.choose}</small><strong>{coach?localCoachText(coach.name,lang):t.coach}</strong></span><span className={css.change}>{coach?t.change:''}<ChevronRight size={20}/></span>
   </button>}
   {!panel&&<nav ref={rail} className={css.tabs} data-coaching-session-tabs={sessions.length} aria-label={t.sessions}>
    {sessions.map(([name],i)=>{const n=practiceCounts[i],verified=loaded&&n!=null;return <button key={i} type="button" aria-pressed={selected===i+1} disabled={locked} onClick={()=>onSelect(i+1)} title={name}><strong>{t.session} {i+1}</strong><small>{verified&&n.done===n.total&&n.total>0?<CheckCircle2 size={13}/>:null}{verified?n.done+'/'+n.total:'—'}</small></button>})}
   </nav>}
   <div className={css.sheet} ref={sheet} tabIndex={0} aria-label={panel?panelTitle:t.tasks}>
    {!panel&&<>
     <div className={css.banner}><span>{t.session} {selected} / {sessions.length}</span><h2>{sessionTitle}</h2><div className={css.progress}><progress max={known?count.total:1} value={known?count.done:0} aria-label={t.practiceProgress}/><strong>{known?count.done+'/'+count.total:'—'}</strong></div><small>{t.practiceProgress}</small></div>
     <div className={css.card}>
      <h3>{t.tasks}</h3><div className={css.taskbar}><CheckCircle2 size={17}/>{t.taskbar}</div>
      <button type="button" className={css.task} data-coaching-task="homework" onClick={()=>open('homework')} disabled={locked}><ClipboardCheck size={29}/><strong>{t.homework}</strong><span className={css.neutral}>{t.notLinked}</span><ChevronRight size={17}/></button>
      <button type="button" className={css.task} data-coaching-task="practice" onClick={()=>open('practice')}><Flower2 size={29}/><strong>{t.practice}</strong><span className={completed?css.done:css.neutral}>{state}</span><ChevronRight size={17}/></button>
      <h3 className={css.materialHeading}><Layers size={21}/>{t.materials}</h3>
      <div className={css.materials}>
       <button type="button" data-coaching-material="results" onClick={()=>open('results')} disabled={locked}><BarChart3 size={32}/><strong>{t.results}</strong><small>{t.report}</small></button>
       <button type="button" data-coaching-material="protocol" onClick={()=>open('protocol')} disabled={locked}><FileText size={32}/><strong>{t.protocol}</strong><small>{t.document}</small></button>
      </div>
      <button type="button" className={css.more} onClick={()=>open('resources')} disabled={locked}><BookOpen size={16}/>{t.resources}<ChevronRight size={17}/></button>
     </div>
    </>}
    {panel&&<div className={css.panelTitle}><span>{t.session} {selected} / {sessions.length}</span><h2>{panelTitle}</h2><p>{sessionTitle}</p></div>}
    {panel==='coach'&&<div className={css.coachList}>{PUBLIC_COACH_PERSONAS.map(persona=><button type="button" key={persona.id} aria-pressed={persona.id===coachId} onClick={()=>pick(persona.id)}><img src={portrait(persona.id)} width="56" height="56" alt=""/><span><strong>{localCoachText(persona.name,lang)}</strong><small>{localCoachText(persona.role,lang)}</small></span><ChevronRight size={19}/></button>)}</div>}
    {panel==='homework'&&<div className={css.panelBody}><p>{t.homeworkEmpty}</p></div>}
    <div className={css.panelBody} hidden={panel!=='practice'} data-coaching-practice-panel><p>{description}</p>{children}</div>
    <div className={css.panelBody} hidden={panel!=='results'} data-coaching-results-panel>{results||<p>{t.goalMissing}</p>}</div>
    {panel==='protocol'&&<div className={css.panelBody}><p>{t.protocolEmpty}</p><Link href={'/'+(lang==='es'?'en':lang)+'/app/my-coaching-plan?tab=reports'} prefetch={false} onClick={onLeave}>{t.archive}<ArrowRight size={18}/></Link></div>}
    <div className={css.panelBody} hidden={panel!=='resources'}>{resources}</div>
   </div>
   {!panel&&<footer className={css.footer}>{sessionHref?<Link href={sessionHref} className={css.cta} data-coaching-session-start={selected} prefetch={false} onClick={onLeave}><Video size={26}/><strong>{t.start(selected)}</strong><ArrowRight size={22}/></Link>:<button type="button" className={css.cta} data-coaching-session-start={selected} disabled={locked} onClick={()=>{setStartAfterChoice(true);setPanel('coach')}}><Video size={26}/><strong>{t.start(selected)}</strong><ArrowRight size={22}/></button>}<small>{t.availability}</small></footer>}
   {panel==='coach'&&startAfterChoice&&<p className={css.choiceNote}>{t.chooseBefore}</p>}
  </div>
 </div>
}
