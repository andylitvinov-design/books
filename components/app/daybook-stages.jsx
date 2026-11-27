'use client'

import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ClipboardList,ChevronDown,ChevronRight,Flag,LockKeyhole,MessageCircle,NotebookPen,Save,Zap,UserRound} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {stageRecords,stageReadable} from '@/lib/app/daybook-stages.mjs'
import {GUIDE_WEEKS,getGuideTask,guideTag,guideText,guideRecords,parseGuideEntry,guideProgress,guideGoalProgress} from '@/lib/app/daybook-guide.mjs'
import DaybookGoalContext from './daybook-goal-context'
import DaybookCoachLink from './daybook-coach-link'
import css from './daybook-stages.module.css'
import DaybookWeekReports from './daybook-week-reports'
import CoachingCourseDashboard from './coaching-course-dashboard'
import GoalTapPractice from './goal-tap-practice'
import {goalTapPractice} from '@/lib/app/goal-tap-practice.mjs'

const copy={
 ru:{title:'Дневник целей',intro:'Ваш коучинг-гид — от намерения к действию.',eyebrow:'МОЙ DAYBOOK',weeks:'Недели коучинга',week:'Неделя',level:'Уровень',levels:'Уровни работы',steps:'Шаги недели',step:'Шаг',of:'из',shortLevels:['Тесты','ИИ-коуч','Практика','Сессия'],start:'Выбрать направление',review:'Итоги и новые перспективы',reviewTag:'Завершение программы',backToWeeks:'Вернуться к неделям',completed:'Выполнено',progress:'Прогресс недели',save:'Сохранить черновик',savePreparation:'Сохранить подготовку',complete:'Сохранить и завершить шаг',completeReview:'Сохранить итоги',saved:'Сохранено в дневнике и проверено',saving:'Сохраняем…',failed:'Сохранение не подтверждено. Ваши ответы остаются здесь. Повторите сохранение перед продолжением.',retry:'Повторить сохранение',reload:'Обновить дневник',discard:'На этой странице есть несохранённые ответы. Выйти и удалить черновики?',unknown:'Загрузите оставшиеся записи, чтобы увидеть точный прогресс и продолжить работу.',load:'Загрузить записи',loading:'Загружаем…',loadFailed:'Не удалось загрузить все записи. Повторите попытку.',required:'Заполните обязательные поля, чтобы завершить шаг.',validation:'Проверьте ответы: заполните обязательные поля и сократите слишком длинный текст.',optional:'необязательно',noRating:'Без оценки',draft:'Несохранённый черновик',draftHint:'Можно переключать недели и шаги — черновики останутся на этой странице.',goalHint:'Без цели — общий черновик.',tools:'Материалы к этому шагу',vectors:'Колесо жизни и смысловые оси',tests:'Тесты и самооценки',plan:'Коучинговый план',goals:'Мои цели и действия',today:'Сегодня и недельный обзор',courses:'Курсы и практики',videos:'Моя видеобиблиотека',coach:'Выбрать ИИ-коуча',human:'Перейти к личным сессиям',deeper:'Открыть практики',preparation:'Подготовка к работе',preparationHint:'Сохраните запрос и заметки. Открытие формата не подтверждает оплату или проведение сессии.',optionalSupport:'Дополнительная поддержка по теме недели. Первый уровень можно пройти самостоятельно.',priceHint:'Стоимость и доступность уточняются перед заказом. Сейчас XP не списываются.',private:'Записи приватны и не передаются коучу автоматически.',legacy:'Мои прежние записи этой недели',legacyHint:'Сохранённые ответы из предыдущей версии дневника. Они не отмечают новые задания выполненными.',previous:'Предыдущий шаг',next:'Следующий шаг',nextWeek:'Следующая неделя',allDone:'Все семь шагов этой недели сохранены и завершены.',reviewIntro:'Посмотрите на свой путь и выберите, что хотите продолжить.',summaryDone:'Итоги сохранены'},
 en:{title:'Goal Daybook',intro:'Your coaching guide, from intention to action.',eyebrow:'MY DAYBOOK',weeks:'Coaching weeks',week:'Week',level:'Level',levels:'Ways to work',steps:'Weekly steps',step:'Step',of:'of',shortLevels:['Reflect','AI coach','Practice','Session'],start:'Choose a direction',review:'Results and new possibilities',reviewTag:'Programme reflection',backToWeeks:'Back to the weeks',completed:'Completed',progress:'Weekly progress',save:'Save draft',savePreparation:'Save preparation',complete:'Save and complete step',completeReview:'Save reflection',saved:'Saved to your journal and verified',saving:'Saving…',failed:'Save not confirmed. Your answers remain here. Retry before continuing.',retry:'Retry save',reload:'Reload journal',discard:'You have unsaved answers on this page. Leave and discard the drafts?',unknown:'Load the remaining entries to see accurate progress and continue.',load:'Load entries',loading:'Loading…',loadFailed:'Could not load all entries. Please retry.',required:'Complete the required fields to finish this step.',validation:'Check your answers: complete the required fields and shorten any text over the limit.',optional:'optional',noRating:'Not rated',draft:'Unsaved draft',draftHint:'You can switch weeks and steps. Drafts remain on this page.',goalHint:'Without a goal — an unlinked draft.',tools:'Resources for this step',vectors:'Life wheel and meaning axes',tests:'Tests and self-ratings',plan:'My coaching plan',goals:'My goals and actions',today:'Today and weekly review',courses:'Courses and practices',videos:'My video library',coach:'Choose an AI coach',human:'Open personal sessions',deeper:'Explore practices',preparation:'Prepare for the session',preparationHint:'Save your request and notes. Opening a format does not confirm payment or a completed session.',optionalSupport:'Optional support for this week. You can complete level one on your own.',priceHint:'Price and availability are confirmed before ordering. No XP is charged here.',private:'Your entries stay private and are not automatically shared with a coach.',legacy:'My earlier entries for this week',legacyHint:'Saved answers from the previous workbook. They do not mark the new tasks as complete.',previous:'Previous step',next:'Next step',nextWeek:'Next week',allDone:'All seven steps for this week are saved and complete.',reviewIntro:'Reflect on your journey and choose what you want to continue.',summaryDone:'Reflection saved'},
 es:{title:'Diario de metas',intro:'Tu guía de coaching, de la intención a la acción.',eyebrow:'MI DAYBOOK',weeks:'Semanas de coaching',week:'Semana',level:'Nivel',levels:'Niveles de trabajo',steps:'Pasos de la semana',step:'Paso',of:'de',shortLevels:['Reflexión','Coach IA','Práctica','Sesión'],start:'Elegir una dirección',review:'Resultados y nuevas posibilidades',reviewTag:'Balance del programa',backToWeeks:'Volver a las semanas',completed:'Completado',progress:'Progreso semanal',save:'Guardar borrador',savePreparation:'Guardar preparación',complete:'Guardar y completar paso',completeReview:'Guardar balance',saved:'Guardado en tu diario y verificado',saving:'Guardando…',failed:'Guardado sin confirmar. Tus respuestas siguen aquí. Reintenta antes de continuar.',retry:'Reintentar guardado',reload:'Recargar diario',discard:'Hay respuestas sin guardar. ¿Salir y descartar los borradores?',unknown:'Carga las entradas restantes para ver tu progreso exacto y continuar.',load:'Cargar entradas',loading:'Cargando…',loadFailed:'No se pudieron cargar todas las entradas. Reintenta.',required:'Completa los campos obligatorios para terminar el paso.',validation:'Revisa las respuestas: completa los campos obligatorios y acorta los textos que superen el límite.',optional:'opcional',noRating:'Sin evaluar',draft:'Borrador sin guardar',draftHint:'Puedes cambiar de semana y paso. Los borradores permanecen en esta página.',goalHint:'Sin meta — borrador sin vincular.',tools:'Recursos para este paso',vectors:'Rueda de vida y ejes de sentido',tests:'Pruebas y autoevaluaciones',plan:'Mi plan de coaching',goals:'Mis metas y acciones',today:'Hoy y revisión semanal',courses:'Cursos y prácticas',videos:'Mi biblioteca de vídeos',coach:'Elegir un coach de IA',human:'Abrir sesiones personales',deeper:'Explorar prácticas',preparation:'Preparar la sesión',preparationHint:'Guarda tu consulta y tus notas. Abrir un formato no confirma el pago ni una sesión realizada.',optionalSupport:'Apoyo opcional para esta semana. Puedes completar el primer nivel por tu cuenta.',priceHint:'El precio y la disponibilidad se confirman antes del pedido. Aquí no se cobran XP.',private:'Tus entradas son privadas y no se comparten automáticamente con un coach.',legacy:'Mis entradas anteriores de esta semana',legacyHint:'Respuestas guardadas del diario anterior. No completan las nuevas tareas automáticamente.',previous:'Paso anterior',next:'Paso siguiente',nextWeek:'Semana siguiente',allDone:'Los siete pasos de esta semana están guardados y completados.',reviewIntro:'Reflexiona sobre tu camino y elige cómo continuar.',summaryDone:'Balance guardado'},
}
const routes={vectors:'/development-vectors',tests:'/app/tests',plan:'/app/my-coaching-plan',courses:'/app/course',videos:'/app/videos'}
const levelIcons=[ClipboardList,MessageCircle,Zap,UserRound]
const premiumOrder=[3,2,4]
const premiumPrices={2:20,3:50,4:1000}
const presentation={
 ru:{program:'Программа достижения цели',practices:'7 практик недели',premium:'Дополнительная поддержка',names:{2:'ИИ-консультация',3:'Экспресс-анализ',4:'Личная консультация'},descs:{2:'Диалог и помощь по теме недели',3:'Разбор ситуации и рекомендации',4:'Индивидуальная сессия с мастером'},next:'Продолжить',open:'Открыть',collapse:'Свернуть',details:'Условия и доступность',all:'Прогресс программы'},
 en:{program:'Your goal programme',practices:'7 practices this week',premium:'Optional support',names:{2:'AI consultation',3:'Express analysis',4:'Personal consultation'},descs:{2:'Dialogue and guidance for this week',3:'Situation review and recommendations',4:'Individual session with a practitioner'},next:'Continue',open:'Open',collapse:'Collapse',details:'Terms and availability',all:'Programme progress'},
 es:{program:'Programa de metas',practices:'7 prácticas de la semana',premium:'Apoyo opcional',names:{2:'Consulta con IA',3:'Análisis exprés',4:'Consulta personal'},descs:{2:'Diálogo y orientación semanal',3:'Análisis de la situación y recomendaciones',4:'Sesión individual con un profesional'},next:'Continuar',open:'Abrir',collapse:'Cerrar',details:'Condiciones y disponibilidad',all:'Progreso del programa'}
}
const bounded=(value,max)=>Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=max?Number(value):1
function sameWindowNavigation(event,anchor){
 if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||anchor.hasAttribute('download'))return false
 const target=anchor.getAttribute('target')?.toLowerCase()
 if(target&&!['_self','_parent','_top'].includes(target))return false
 try{
  const destination=new URL(anchor.href,window.location.href),current=new URL(window.location.href)
  if(!['http:','https:'].includes(destination.protocol))return false
  if(destination.origin===current.origin&&destination.pathname===current.pathname&&destination.search===current.search&&(destination.hash||anchor.getAttribute('href')?.startsWith('#')))return false
  return true
 }catch{return false}
}
function keepsDaybookMounted(anchor){
 try{
  const destination=new URL(anchor.href,window.location.href)
  return destination.origin===window.location.origin&&destination.pathname===window.location.pathname
 }catch{return false}
}
function revealSelection(rail){
 if(!rail)return
 const selected=rail.querySelector('[aria-pressed="true"]')
 if(!selected)return
 const outer=rail.getBoundingClientRect(),inner=selected.getBoundingClientRect()
 if(inner.left<outer.left)rail.scrollLeft-=outer.left-inner.left+4
 else if(inner.right>outer.right)rail.scrollLeft+=inner.right-outer.right+4
}
export default function DaybookStages({accountId,locale='en',stageNumber=1,onStage,entries=[],hasMore,loadingAll,loadError,onLoadAll,onSaved,onSessionLost,onReload,onTab,ready,initialGoalId=null,initialLevel=1,initialStep=1,entryRequest=null,onPositionChange,onLockChange,children}){
 const lang=Object.hasOwn(copy,locale)?locale:'en',c=copy[lang],root='/'+lang
 const review=Number(stageNumber)===8,week=GUIDE_WEEKS[bounded(stageNumber,7)-1],weekId=review?'review':week.id
 const [goalId,setGoalId]=useState(initialGoalId),[level,setLevel]=useState(bounded(initialLevel,4)),[stepNumber,setStepNumber]=useState(bounded(initialStep,7))
 const [expanded,setExpanded]=useState(false)
 const p=presentation[lang]
 const [drafts,setDrafts]=useState({}),[statuses,setStatuses]=useState({}),[pending,setPending]=useState(null)
 const effectiveLevel=review?1:level,stepId=review?'summary':effectiveLevel===1?week.steps[stepNumber-1].id:'preparation'
 const task=getGuideTask(weekId,effectiveLevel,stepId),key=JSON.stringify([goalId,weekId,effectiveLevel,stepId])
 const records=guideRecords(entries,goalId,weekId,effectiveLevel,stepId),current=records[0],existing=parseGuideEntry(current)
 const answers=drafts[key]??existing?.answers??{},dirty=Object.hasOwn(drafts,key),hasDrafts=Object.keys(drafts).length>0
 const status=statuses[key]||'',loaded=!hasMore
 const saver=useRef(null),active=useRef(false),inFlight=useRef(false),generation=useRef(0),pendingKey=useRef(null)
 const workbookRef=useRef(null),weeksRail=useRef(null),taskRef=useRef(null),routeIntent=useRef({goalId:initialGoalId,level:initialLevel,step:initialStep}),lastEntryRequest=useRef(null)
 const locked=!!pending||inFlight.current,pendingStatus=pending?statuses[pendingKey.current]:''
 const progress=guideProgress(entries,goalId,week.id),completed=loaded&&!dirty&&existing?.completed===true
 const programme=loaded?guideGoalProgress(entries,goalId):null
 const nextStep=week.steps.findIndex(item=>parseGuideEntry(guideRecords(entries,goalId,week.id,1,item.id)[0])?.completed!==true)+1
 const LevelIcon=levelIcons[effectiveLevel-1],legacy=review?[]:stageRecords(entries,goalId,week.id)
 const requiredReady=task.fields.filter(field=>field.required).every(field=>typeof answers[field.id]==='string'&&answers[field.id].trim())
 const tapPractice=effectiveLevel===1?goalTapPractice(weekId,stepId,lang):null
 const hasAnswers=Object.values(answers).some(value=>typeof value==='string'&&value.trim())
 useEffect(()=>{
  const token=generation.current+1
  active.current=true;generation.current=token;saver.current=createJournalSaver(appFetch,accountId)
  const ownerSaver=saver.current
  return()=>{active.current=false;generation.current=token+1;ownerSaver.discard()}
 },[accountId])
 useEffect(()=>{
  if(locked)return
  const prior=routeIntent.current
  if(prior.goalId!==initialGoalId)setGoalId(initialGoalId)
  if(prior.level!==initialLevel)setLevel(bounded(initialLevel,4))
  if(prior.step!==initialStep){setStepNumber(bounded(initialStep,7));setExpanded(true)}
  routeIntent.current={goalId:initialGoalId,level:initialLevel,step:initialStep}
 },[initialGoalId,initialLevel,initialStep,locked])
 useEffect(()=>{
  if(locked||!entryRequest||lastEntryRequest.current===entryRequest)return
  lastEntryRequest.current=entryRequest
  setExpanded(true);setGoalId(entryRequest.goalId??null);setLevel(bounded(entryRequest.level,4));setStepNumber(bounded(entryRequest.step,7))
 },[entryRequest,locked])
 useEffect(()=>{onLockChange?.(locked);return()=>onLockChange?.(false)},[locked,onLockChange])
 useEffect(()=>{revealSelection(weeksRail.current)},[stageNumber])
 useEffect(()=>{if(new URLSearchParams(window.location.search).has('step'))setExpanded(true)},[])
 useEffect(()=>{
  if(!hasDrafts&&!pending)return undefined
  const leave=event=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',leave)
  return()=>window.removeEventListener('beforeunload',leave)
 },[hasDrafts,pending])
 useEffect(()=>{
  if(!hasDrafts&&!pending)return undefined
  const guardOutsideLink=event=>{
   const anchor=event.target instanceof Element?event.target.closest('a[href]'):null
   // Inside links already use leave(). Capture outside the component before
   // Next's link handler can unmount the private in-memory drafts.
   if(!sameWindowNavigation(event,anchor)||workbookRef.current?.contains(anchor))return
   const saving=pending||inFlight.current
   if(saving||(hasDrafts&&!keepsDaybookMounted(anchor)&&!window.confirm(c.discard))){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()
   }
  }
  document.addEventListener('click',guardOutsideLink,true)
  return()=>document.removeEventListener('click',guardOutsideLink,true)
 },[accountId,hasDrafts,pending,c.discard])
 function position(next){onPositionChange?.({level:effectiveLevel,step:review?1:stepNumber,goalId,...next})}
 function navigate(n){if(locked||!ready)return;setStepNumber(1);onStage(n)}
 function chooseLevel(n){if(locked||!ready)return;setLevel(n);if(n!==1)setExpanded(true);position({level:n})}
 function chooseStep(n){if(locked||!ready)return;setLevel(1);setExpanded(true);setStepNumber(n);position({level:1,step:n})}
 function resume(){if(locked||!ready)return;if(!nextStep){navigate(week.number===7?8:week.number+1);return}chooseStep(nextStep);requestAnimationFrame(()=>taskRef.current?.scrollIntoView({block:'nearest'}))}
 function chooseGoal(id){if(locked||!ready)return;setGoalId(id);position({goalId:id})}
 function leave(event){if(!sameWindowNavigation(event,event.currentTarget))return true;if(locked||!ready||(hasDrafts&&!keepsDaybookMounted(event.currentTarget)&&!window.confirm(c.discard))){event.preventDefault();return false}return true}
 function openTab(tab){if(locked||!ready)return;onTab(tab)}
 function change(field,value){if(locked||!ready)return;setDrafts(old=>({...old,[key]:{...answers,[field]:value}}));setStatuses(old=>({...old,[key]:''}))}
 async function save(complete){
  if(!ready||hasMore||inFlight.current)return
  if(!pending){
   if(complete&&(!hasAnswers||!requiredReady))return
   if(!complete&&!hasAnswers&&!current)return
  }
  let input=pending
  const saveKey=pending?pendingKey.current:key
  if(!input){
   try{
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone
    input={id:current?.id||crypto.randomUUID(),revision:current?.revision||0,text:guideText({weekId,level:effectiveLevel,stepId,answers,completed:effectiveLevel===1&&complete}),tags:[guideTag(weekId,effectiveLevel,stepId)],kind:'note',locale:lang,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId}
   }catch{setStatuses(old=>({...old,[key]:'validation'}));return}
  }
  const token=generation.current
  inFlight.current=true;pendingKey.current=saveKey;setPending(input);setStatuses(old=>({...old,[saveKey]:'saving'}))
  try{
   const entry=await saver.current.save(input)
   if(!active.current||token!==generation.current)return
   onSaved(entry);setPending(null);pendingKey.current=null
   setDrafts(old=>{const next={...old};delete next[saveKey];return next});setStatuses(old=>({...old,[saveKey]:'saved'}))
  }catch(error){
   if(!active.current||token!==generation.current)return
   if(error.status===401||error.code==='ACCOUNT_CHANGED')onSessionLost()
   else setStatuses(old=>({...old,[saveKey]:'failed'}))
  }finally{if(token===generation.current)inFlight.current=false}
 }
 function resourceLink(name){return routes[name]?<Link key={name} href={root+routes[name]} prefetch={false} onClick={leave}><BookOpen size={18} aria-hidden="true"/><span>{c[name]}</span><ArrowRight size={17} aria-hidden="true"/></Link>:<button type="button" key={name} disabled={locked||!ready} onClick={()=>openTab(name)}><BookOpen size={18} aria-hidden="true"/><span>{c[name]}</span><ArrowRight size={17} aria-hidden="true"/></button>}
 const taskPanel=<div className={css.taskPanel}><section ref={taskRef} className={css.sheet} data-guide-task aria-labelledby="daybook-task-title">
   <div className={css.taskMeta}><span>{review?c.reviewTag:effectiveLevel===1?`${c.step} ${stepNumber} ${c.of} 7`:c.preparation}</span>{completed&&<span className={css.done}><CheckCircle2 size={16} aria-hidden="true"/>{review?c.summaryDone:c.completed}</span>}{dirty&&<span>{c.draft}</span>}</div>
   {!review&&effectiveLevel===1&&<button type="button" className={css.collapse} disabled={locked||!ready} onClick={()=>setExpanded(false)}>{p.collapse}<ChevronDown size={16} aria-hidden="true"/></button>}
   <h3 id="daybook-task-title">{task.title[lang]}</h3><p className={css.description}>{task.description[lang]}</p>{effectiveLevel>1&&<p className={css.hint}>{c.preparationHint}</p>}
   {tapPractice&&!answers[tapPractice.fieldId]&&<GoalTapPractice key={accountId+':'+key+':'+lang} practice={tapPractice} locale={lang} disabled={!ready||!loaded||locked} onApply={value=>{if(!answers[tapPractice.fieldId])change(tapPractice.fieldId,value)}}/>}
   <div className={css.fields}>{task.fields.map(field=><label key={field.id} className={css.field}><span>{field.label[lang]}{field.required?<span className={css.requiredMark} aria-hidden="true">{'\u00a0*'}</span>:<small> · {c.optional}</small>}</span>{field.type==='rating'?<select aria-required={field.required} disabled={!ready||!loaded||locked} value={answers[field.id]??''} onChange={event=>change(field.id,event.target.value)}><option value="">{c.noRating}</option>{Array.from({length:11},(_,n)=><option key={n} value={String(n)}>{n} / 10</option>)}</select>:<textarea rows={3} maxLength={1200} aria-required={field.required} disabled={!ready||!loaded||locked} value={answers[field.id]||''} onChange={event=>change(field.id,event.target.value)}/>}</label>)}</div>
   {effectiveLevel===1&&task.fields.some(field=>field.required)&&<p className={css.hint}>{c.required}</p>}
   {pending?<div className={css.pending}><p role={pendingStatus==='failed'?'alert':'status'}>{pendingStatus==='failed'?c.failed:c.saving}</p><div className={css.actions}><button type="button" className={css.primary} data-guide-action="retry" disabled={!ready||pendingStatus==='saving'||inFlight.current} onClick={()=>void save(false)}>{pendingStatus==='saving'?c.saving:c.retry}</button>{pendingStatus==='failed'&&<button type="button" className={css.secondary} onClick={()=>{if(window.confirm(c.discard))onReload()}}>{c.reload}</button>}</div></div>:<><div className={css.actions}>{effectiveLevel===1&&<button type="button" className={css.primary} data-guide-action="complete" disabled={!ready||!loaded||!hasAnswers||!requiredReady} onClick={()=>void save(true)}><CheckCircle2 size={19} aria-hidden="true"/>{review?c.completeReview:c.complete}</button>}<button type="button" className={effectiveLevel===1?css.secondary:css.primary} data-guide-action="save" disabled={!ready||!loaded||(!hasAnswers&&!current)} onClick={()=>void save(false)}><Save size={18} aria-hidden="true"/>{effectiveLevel===1?c.save:c.savePreparation}</button></div><p className={status==='validation'?css.error:css.saveStatus} role={status==='validation'?'alert':'status'}>{status==='saved'?c.saved:status==='validation'?c.validation:dirty?c.draftHint:''}</p></>}
   <p className={css.privacy}><LockKeyhole size={14} aria-hidden="true"/>{c.private}</p>
   {effectiveLevel===2&&current&&!dirty&&<div className={css.coachHandoff}><DaybookCoachLink accountId={accountId} locale={lang} kind="journal" itemId={current.id} revision={current.revision} disabled={locked||!ready} onSessionLost={onSessionLost}/></div>}
  </section>
  {task.resources?.length>0&&<details className={css.resources}><summary><BookOpen size={18} aria-hidden="true"/>{c.tools}</summary><div className={css.links}>{task.resources.map(resourceLink)}</div></details>}</div>
 const sessionRows=[...GUIDE_WEEKS.map(w=>[w.title[lang],w.subtitle[lang]]),[c.review,c.reviewIntro]]
 const sessionCounts=[...GUIDE_WEEKS.map(w=>{const n=guideProgress(entries,goalId,w.id);return {done:n.completed,total:n.total}}),{done:parseGuideEntry(guideRecords(entries,goalId,'review',1,'summary')[0])?.completed===true?1:0,total:1}]
 return <div ref={workbookRef}>
 <CoachingCourseDashboard accountId={accountId} locale={lang} program="goal" title={({ru:'Достижение моей цели',en:'Achieving My Goal',es:'Alcanzar mi meta'})[lang]} sessions={sessionRows} selected={review?8:week.number} onSelect={navigate} practiceCounts={sessionCounts} loaded={loaded} ready={ready} locked={locked} initialPanel={entryRequest||expanded?'practice':null} onLeave={leave}
  results={ready&&goalId?<DaybookWeekReports key={accountId+':'+goalId} locale={lang} accountId={accountId} program="goal" week={review?8:week.number} goalId={goalId} showEmpty/>:null}
  resources={<>{children}<button type="button" disabled={locked||!ready} onClick={()=>onTab('goals')}>{c.goals}</button><Link href={root+'/app/portrait'} prefetch={false} onClick={leave}>{c.title}</Link></>}>
 <div className={css.workbook} data-daybook-guide data-guide-active-week={review?8:week.number} data-guide-layout="weekly-practices">
  <header className={css.hero}><span className={css.eyebrow}><NotebookPen size={17} aria-hidden="true"/>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.intro}</p></header>
  <div className={css.goalBar}>
   <div><DaybookGoalContext compact active={ready} accountId={accountId} locale={lang} selectedId={goalId} disabled={locked||!ready} onChange={chooseGoal} onSessionLost={onSessionLost}/><p className={css.goalHint}>{review?c.reviewTag:c.week+' '+week.number+' '+c.of+' 7'}</p>{!goalId&&<p className={css.goalHint}>{c.goalHint}</p>}</div>
   <div className={css.goalRing} role="img" aria-label={p.all+': '+(programme?programme.percent+'%':'—')}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="#e7cfa3" strokeWidth="7"/>{programme?.percent>0&&<circle cx="32" cy="32" r="26" fill="none" stroke="#087652" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray={programme.percent+' 100'} transform="rotate(-90 32 32)"/>}</svg><strong>{programme?programme.percent+'%':'—'}</strong></div>
  </div>
  <h2 className={css.programTitle}>{p.program}</h2>
  <div className={css.weekCard}>
   <div className={css.weeks} role="group" aria-label={c.weeks} ref={weeksRail} data-guide-weeks>
    {GUIDE_WEEKS.map(item=>{const count=loaded?guideProgress(entries,goalId,item.id).completed:0;return <button type="button" className={css.weekButton} key={item.id} data-guide-week={item.number} aria-pressed={!review&&week.id===item.id} aria-label={c.week+' '+item.number+': '+item.title[lang]} disabled={locked||!ready} onClick={()=>navigate(item.number)}><span>{c.week}<b>{item.number}</b></span><small>{count===7?<Check size={17} aria-hidden="true"/>:loaded?count+' / 7':'—'}</small></button>})}
   </div>
   <div className={css.timeline} aria-hidden="true">{GUIDE_WEEKS.map(item=><span key={item.id} data-done={loaded&&guideProgress(entries,goalId,item.id).completed===7} data-active={!review&&item.id===week.id}/>)}</div>
  </div>
  {hasMore&&<aside className={css.notice} role="status"><p>{loadError?c.loadFailed:c.unknown}</p><button type="button" disabled={!ready||loadingAll||locked} onClick={onLoadAll}>{loadingAll?c.loading:c.load}</button></aside>}
  <div className={css.weekCanvas}>
   <div className={css.weekHeading}><div><h2>{review?c.review:c.week+' '+week.number+' — '+week.title[lang]}</h2><p>{review?c.reviewIntro:week.subtitle[lang]}</p></div>{!review&&<div className={css.progress} data-guide-progress data-completed={loaded?progress.completed:undefined} data-total="7"><span>{c.progress}<strong>{loaded?progress.completed+' / 7':'—'}</strong></span><progress max={7} value={loaded?progress.completed:0} aria-label={c.progress}/></div>}</div>
   {!review&&<div data-guide-levels role="group" aria-label={c.levels} className={css.premiumGroup}>
    <div className={css.premiumCaption}>{p.premium}</div>
    {premiumOrder.map(n=>{const Icon=levelIcons[n-1];return <button type="button" key={n} className={css.premiumRow} data-guide-level={n} aria-pressed={effectiveLevel===n} disabled={locked||!ready} onClick={()=>chooseLevel(n)}><span className={css.premiumIcon}><Icon size={22} aria-hidden="true"/></span><span className={css.premiumText}><strong>{p.names[n]}</strong><small>{p.descs[n]}</small></span><span className={css.xp}>{premiumPrices[n]} XP</span><ChevronRight size={16} aria-hidden="true"/></button>})}
    <button type="button" className={css.practiceHeading} data-guide-level="1" aria-pressed={effectiveLevel===1} disabled={locked||!ready} onClick={()=>chooseLevel(1)}><BookOpen size={20} aria-hidden="true"/><strong>{p.practices}</strong><span>{loaded?progress.completed+' / 7':'—'}</span><ChevronDown size={19} aria-hidden="true"/></button>
   </div>}
   {!review&&effectiveLevel>1&&<div className={css.premiumDetail}><div className={css.offerHeading}><span className={css.offerIcon}><LevelIcon size={23} aria-hidden="true"/></span><div><h3>{p.names[effectiveLevel]}</h3><span className={css.price}>{premiumPrices[effectiveLevel]} XP</span></div></div><p className={css.hint}>{c.priceHint}</p><Link className={css.offerAction} href={root+(effectiveLevel===2?'/my-coach':effectiveLevel===4?'/app/portrait?space=sessions':'/services/catalog')} prefetch={false} onClick={leave}>{effectiveLevel===2?c.coach:effectiveLevel===4?c.human:p.details}<ArrowRight size={19} aria-hidden="true"/></Link>{taskPanel}</div>}
   {review?taskPanel:<div className={css.practiceList} role="group" aria-label={c.steps} data-guide-steps>
    {week.steps.map((item,index)=>{const record=loaded?parseGuideEntry(guideRecords(entries,goalId,week.id,1,item.id)[0]):null;const selected=effectiveLevel===1&&stepNumber===index+1;const opened=selected&&expanded;return <div className={css.practiceItem} key={item.id} data-current={loaded&&nextStep===index+1}><button type="button" className={css.practiceRow} data-guide-step={item.id} aria-pressed={selected} aria-expanded={opened} aria-label={c.step+' '+(index+1)+': '+item.title[lang]+(record?.completed?' · '+c.completed:'')} disabled={locked||!ready} onClick={()=>chooseStep(index+1)}><span className={css.practicePhoto} data-photo={index}><span>{index+1}</span></span><span className={css.practiceText}><strong>{item.title[lang]}</strong><small>{item.description[lang]}</small></span><span className={css.practiceStatus}>{record?.completed?<><CheckCircle2 size={22} aria-hidden="true"/><small>{c.completed}</small></>:<><ChevronDown size={20} aria-hidden="true"/><small>{p.open}</small></>}</span></button>{opened&&taskPanel}</div>})}
   </div>}
   {!review&&<button type="button" className={css.resume} disabled={locked||!ready||!loaded} onClick={resume}>{nextStep?p.next+' — '+c.step+' '+nextStep:week.number===7?c.review:c.nextWeek}<ArrowRight size={20} aria-hidden="true"/></button>}
  </div>
   {legacy.length>0&&<details className={css.legacy}><summary>{c.legacy}</summary><p className={css.hint}>{c.legacyHint}</p>{legacy.map(entry=><article key={entry.id}><time dateTime={entry.localDay}>{entry.localDay}</time><p>{stageReadable(entry,lang)}</p></article>)}</details>}
  {loaded&&!review&&effectiveLevel===1&&progress.completed===7&&<p className={css.finished}><CheckCircle2 size={20} aria-hidden="true"/>{c.allDone}</p>}
  <button type="button" className={css.reviewLink} disabled={locked||!ready} onClick={()=>navigate(review?7:8)}>{review?<ArrowLeft size={18} aria-hidden="true"/>:<Flag size={18} aria-hidden="true"/>}{review?c.backToWeeks:c.review}{!review&&<ArrowRight size={17} aria-hidden="true"/>}</button>
 </div>
 </CoachingCourseDashboard>
 </div>
}
