'use client'

import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {appFetch} from '@/lib/app/client-fetch'
import MyCoachContext from './my-coach-context'
import MyCoachDraftArchive from './my-coach-draft-archive'
import CoachSessionArchiveHeader from './coach-session-archive-header'
import CourseArchiveReview from './course-archive-review'
import MyCoachSavedProfileV3 from './my-coach-saved-profile-v3'
import DaybookDailySettings from './daybook-daily-settings'
import ReikiHintsSettings from './reiki-hints-settings'
import CoachMemoryReview from './coach-memory-review'
import {ArrowRight,BarChart3,Check,CheckCircle2,ChevronDown,ChevronRight,ClipboardList,Compass,Download,Heart,HeartPulse,Leaf,LoaderCircle,MapPin,Mountain,Plus,Printer,RefreshCw,Save,Sparkles,Sun,Target,Trash2,TrendingUp,Trophy,Users,Wallet} from 'lucide-react'
import {PRIMARY_GOAL_AREAS,orderedCoachingAreas,summarizeCoachingProgress} from '@/lib/app/coaching-plan-summary.mjs'
import styles from './my-coaching-plan.module.css'
import {downloadCoachingSessionPdf,openCoachingSessionPdf} from '@/lib/personal-coaching/session-pdf'
import {downloadCoachQualityTranscript} from '@/lib/personal-coaching/protocol-quality.mjs'
import {myCoachProtocolPdfOptions} from '@/lib/personal-coaching/session-protocol.mjs'
import {goalReviewedResult,isGoalReviewedResult} from '@/lib/coaching/goal-reviewed-results.mjs'
import {COACH_PROFILE_AXES} from '@/lib/coaching/coach-profile-intake.mjs'

const protocolCopy={
 en:{title:'My Coach · Session protocol',transcript:'Conversation transcript',print:'Print / open PDF',download:'Download PDF',delete:'Delete protocol',confirm:'Delete this private conversation protocol permanently?',error:'Could not load or delete the saved protocols.',pdfError:'Could not prepare the protocol PDF.',coach:'AI coach'},
 ru:{title:'Мой коуч · Протокол сессии',transcript:'Диалог с коучем',print:'Распечатать / открыть PDF',download:'Скачать PDF',delete:'Удалить протокол',confirm:'Безвозвратно удалить этот личный протокол диалога?',error:'Не удалось загрузить или удалить протоколы.',pdfError:'Не удалось подготовить PDF протокола.',coach:'ИИ-коуч'},
 es:{title:'Mi coach · Protocolo',transcript:'Diálogo con el coach',print:'Imprimir / abrir PDF',download:'Descargar PDF',delete:'Eliminar protocolo',confirm:'¿Eliminar permanentemente este protocolo privado?',error:'No se pudieron cargar o borrar los protocolos.',pdfError:'No se pudo preparar el PDF.',coach:'Coach IA'},
}
const copy={
 en:{
  title:'My Goals & Coaching Reports',subtitle:'Your goals, actions and coaching session reports — all in one private space.',
  plan:'Goals & actions',reports:'Coaching reports',context:'My Context',contextIntro:'This is the compact, consented context Ali can use in a future coaching conversation. It never includes raw transcripts or test results.',contextEmpty:'There is no active context permission yet.',contextGoals:'Approved goals',contextActions:'Open actions',loading:'Opening your private plan…',retry:'Try again',
  emptyTitle:'Your plan begins with one conversation',empty:'Complete a coaching session to capture what matters and choose a first step.',
  start:'Start a coaching session',edit:'Edit area',save:'Save changes',saving:'Saving…',saved:'Changes saved',
  current:'Where I am now',desired:'What I want to change',obstacles:'What gets in the way',rating:'My self-rating (optional · 0–10)',
  noRating:'Not rated',goals:'Goals',actions:'Actions',noGoals:'No goals yet in this area.',
  reportsEmpty:'Your saved coaching reports will appear here.',report:'Session report',reviewed:'Reviewed by you',
  noActions:'No accepted actions in this report yet.',chooseArea:'Add accepted actions to a life area',
  chooseActions:'Choose the actions to add',planConsent:'I agree that these selected actions may be used as context in my future coaching sessions. This does not share them with practitioners.',add:'Add to my plan',adding:'Adding…',added:'Added to your Life Plan',
  already:'Already added',select:'Choose a life area',none:'No actions selected',reportError:'Could not load your reports.',
  loadError:'Could not load your Life Plan.',saveError:'Could not save these changes. Your text is still here.',
  importError:'Could not add these actions. Your report remains saved.',
  contextTitle:'Future session context permissions',contextInfo:'You can withdraw permission for a session without deleting your plan or report.',contextSession:'Session',revokeContext:'Withdraw permission',revokingContext:'Withdrawing…',contextRevoked:'Permission withdrawn',contextError:'Could not withdraw permission. Please try again.',
  deleteAction:'Delete action',confirmDeleteAction:'Delete this action and its plan history? The original report and goal will remain.',deletingAction:'Deleting…',actionDeleted:'Action deleted',deleteActionError:'Could not delete this action. Please try again.',
  overview:'Session overview',initialSituation:'Initial situation',desiredOutcome:'Desired outcome',
  keyDiscoveries:'Key discoveries',mainObstacles:'Main obstacles',strengthsResources:'Strengths & resources',
  newPerspective:'New perspective',decisions:'Decisions',actionPlan:'Action plan',followUp:'Follow-up',
  notCaptured:'Not captured in this session',unrated:'Not rated by you',overviewFallback:'Session details are unavailable.',actionPlanNote:'Review the confirmed action choices below.',
 },
 ru:{
  title:'Мои цели и отчёты коучинга',subtitle:'Ваши цели, действия и отчёты коучинга — в одном личном пространстве.',
  plan:'Цели и действия',reports:'Отчёты коучинга',context:'Мой контекст',contextIntro:'Это краткий согласованный контекст, который Ali может использовать в будущей коуч-беседе. В нём нет сырых расшифровок и результатов тестов.',contextEmpty:'Пока нет активного разрешения на использование контекста.',contextGoals:'Подтверждённые цели',contextActions:'Незавершённые действия',loading:'Открываем ваш личный план…',retry:'Повторить',
  emptyTitle:'Ваш план начинается с одного разговора',empty:'Пройдите коуч-сессию, чтобы определить важное и выбрать первый шаг.',
  start:'Начать коуч-сессию',edit:'Изменить сферу',save:'Сохранить изменения',saving:'Сохраняем…',saved:'Изменения сохранены',
  current:'Где я сейчас',desired:'Что я хочу изменить',obstacles:'Что мне мешает',rating:'Моя самооценка (необязательно · 0–10)',
  noRating:'Не оценено',goals:'Цели',actions:'Действия',noGoals:'В этой сфере пока нет целей.',
  reportsEmpty:'Здесь появятся сохранённые отчёты коучинга.',report:'Отчёт сессии',reviewed:'Подтверждён вами',
  noActions:'В этом отчёте пока нет принятых действий.',chooseArea:'Добавить принятые действия в сферу жизни',
  chooseActions:'Выберите действия для добавления',planConsent:'Я согласен, чтобы выбранные действия могли использоваться как контекст в моих будущих коуч-сессиях. Это не означает передачу данных специалистам.',add:'Добавить в мой план',adding:'Добавляем…',added:'Добавлено в ваш план жизни',
  already:'Уже добавлено',select:'Выберите сферу жизни',none:'Действия не выбраны',reportError:'Не удалось загрузить отчёты.',
  loadError:'Не удалось загрузить план жизни.',saveError:'Не удалось сохранить. Введённый текст остался здесь.',
  importError:'Не удалось добавить действия. Отчёт остался сохранённым.',
  contextTitle:'Разрешения для будущих сессий',contextInfo:'Вы можете отозвать разрешение для сессии, сохранив план и отчёт.',contextSession:'Сессия',revokeContext:'Отозвать разрешение',revokingContext:'Отзываем…',contextRevoked:'Разрешение отозвано',contextError:'Не удалось отозвать разрешение. Попробуйте ещё раз.',
  deleteAction:'Удалить действие',confirmDeleteAction:'Удалить действие и его историю в плане? Исходный отчёт и цель сохранятся.',deletingAction:'Удаляем…',actionDeleted:'Действие удалено',deleteActionError:'Не удалось удалить действие. Попробуйте ещё раз.',
  overview:'Обзор сессии',initialSituation:'Исходная ситуация',desiredOutcome:'Желаемый результат',
  keyDiscoveries:'Ключевые открытия',mainObstacles:'Основные препятствия',strengthsResources:'Сильные стороны и ресурсы',
  newPerspective:'Новый взгляд',decisions:'Решения',actionPlan:'План действий',followUp:'Продолжение',
  notCaptured:'В этой сессии не зафиксировано',unrated:'Вы не ставили оценку',overviewFallback:'Данные сессии недоступны.',actionPlanNote:'Подтверждённые варианты действий представлены ниже.'
 },
 es:{
  title:'Mis metas e informes de coaching',subtitle:'Tus metas, acciones e informes de coaching en un espacio privado.',
  plan:'Metas y acciones',reports:'Informes de coaching',context:'Mi contexto',contextIntro:'Este es el contexto breve y consentido que Ali puede usar en una futura conversación de coaching. Nunca incluye transcripciones sin procesar ni resultados de pruebas.',contextEmpty:'Aún no hay permiso de contexto activo.',contextGoals:'Metas aprobadas',contextActions:'Acciones pendientes',loading:'Abriendo tu plan privado…',retry:'Reintentar',
  emptyTitle:'Tu plan comienza con una conversación',empty:'Completa una sesión de coaching para aclarar lo importante y elegir un primer paso.',
  start:'Iniciar una sesión',edit:'Editar área',save:'Guardar cambios',saving:'Guardando…',saved:'Cambios guardados',
  current:'Dónde estoy ahora',desired:'Qué quiero cambiar',obstacles:'Qué se interpone',rating:'Mi valoración (opcional · 0–10)',
  noRating:'Sin valorar',goals:'Metas',actions:'Acciones',noGoals:'Todavía no hay metas en esta área.',
  reportsEmpty:'Tus informes guardados aparecerán aquí.',report:'Informe de sesión',reviewed:'Confirmado por ti',
  noActions:'Este informe aún no contiene acciones aceptadas.',chooseArea:'Añadir acciones aceptadas a un área',
  chooseActions:'Elige las acciones que deseas añadir',planConsent:'Acepto que estas acciones seleccionadas se utilicen como contexto en futuras sesiones de coaching. Esto no comparte mis datos con profesionales.',add:'Añadir a mi plan',adding:'Añadiendo…',added:'Añadido a tu plan de vida',
  already:'Ya añadido',select:'Elige un área de vida',none:'No hay acciones seleccionadas',reportError:'No se pudieron cargar los informes.',
  loadError:'No se pudo cargar tu plan de vida.',saveError:'No se pudieron guardar los cambios. El texto sigue aquí.',
  importError:'No se pudieron añadir las acciones. El informe sigue guardado.',
  contextTitle:'Permisos para futuras sesiones',contextInfo:'Puedes retirar el permiso de una sesión sin borrar tu plan ni tu informe.',contextSession:'Sesión',revokeContext:'Retirar permiso',revokingContext:'Retirando…',contextRevoked:'Permiso retirado',contextError:'No se pudo retirar el permiso. Inténtalo de nuevo.',
  deleteAction:'Eliminar acción',confirmDeleteAction:'¿Eliminar esta acción y su historial del plan? El informe original y la meta se conservarán.',deletingAction:'Eliminando…',actionDeleted:'Acción eliminada',deleteActionError:'No se pudo eliminar la acción. Inténtalo de nuevo.',
  overview:'Resumen de la sesión',initialSituation:'Situación inicial',desiredOutcome:'Resultado deseado',
  keyDiscoveries:'Descubrimientos clave',mainObstacles:'Obstáculos principales',strengthsResources:'Fortalezas y recursos',
  newPerspective:'Nueva perspectiva',decisions:'Decisiones',actionPlan:'Plan de acción',followUp:'Seguimiento',
  notCaptured:'No se registró en esta sesión',unrated:'No lo has valorado',overviewFallback:'Los datos de la sesión no están disponibles.',actionPlanNote:'Las acciones confirmadas aparecen a continuación.'
 },
}


const uiCopy={
 en:{eyebrow:'MY PLAN',overviewTitle:'My progress at a glance',details:'View details',hideDetails:'Hide details',
  completion:'Goals completed',unmeasured:'Not measured yet',inProgress:'In progress',completed:'Completed',
  goalAreas:'My goal areas',addGoal:'Add goal',chooseArea:'Choose a life area',
  moreAreas:'All life areas',lessAreas:'Show main areas',singular:'goal',plural:'goals',
  areasWithGoals:'Areas with goals',acceptedActions:'Accepted actions',
  noProgress:'No saved goals yet. Start a coaching session, or describe your desired result in a life area.',
  editHint:'Describe what you want to change. Tracked goals and action plans can also be created in a coaching session.'},
 ru:{eyebrow:'МОЙ ПЛАН',overviewTitle:'Мой прогресс',details:'Подробнее',hideDetails:'Скрыть',
  completion:'Достигнутые цели',unmeasured:'Пока не измерено',inProgress:'В процессе',completed:'Завершено',
  goalAreas:'Сферы моих целей',addGoal:'Добавить цель',chooseArea:'Выберите сферу жизни',
  moreAreas:'Все сферы жизни',lessAreas:'Основные сферы',singular:'цель',plural:'целей',
  areasWithGoals:'Сферы с целями',acceptedActions:'Принятые действия',
  noProgress:'Пока нет сохранённых целей. Начните коуч-сессию или опишите желаемый результат в сфере жизни.',
  editHint:'Опишите, что хотите изменить. Отслеживаемые цели и планы действий также создаются на коуч-сессии.'},
 es:{eyebrow:'MI PLAN',overviewTitle:'Mi progreso de un vistazo',details:'Ver detalles',hideDetails:'Ocultar',
  completion:'Metas completadas',unmeasured:'Aún sin medir',inProgress:'En progreso',completed:'Completadas',
  goalAreas:'Áreas de mis metas',addGoal:'Añadir meta',chooseArea:'Elige un área de vida',
  moreAreas:'Todas las áreas',lessAreas:'Áreas principales',singular:'meta',plural:'metas',
  areasWithGoals:'Áreas con metas',acceptedActions:'Acciones aceptadas',
  noProgress:'Aún no hay metas guardadas. Inicia una sesión o describe tu resultado deseado en un área.',
  editHint:'Describe lo que quieres cambiar. Las metas con seguimiento también se crean en una sesión.'},
}
const areaIcons={body_health:HeartPulse,emotional_wellbeing:Heart,relationships:Users,career_business:TrendingUp,
 meaning_purpose:Compass,finance:Wallet,personal_growth:Leaf,lifestyle:Sun}
const areaNames={
 en:{career_business:'Work & Growth',meaning_purpose:'Meaning & Life Purpose'},
 ru:{career_business:'Работа и рост',meaning_purpose:'Смысл и предназначение'},
 es:{career_business:'Trabajo y desarrollo',meaning_purpose:'Sentido y propósito'},
}
const areaSubtitles={
 en:{body_health:'Energy, wellbeing, vitality',emotional_wellbeing:'Emotions, stress, inner balance',
  relationships:'Love, family, communication',career_business:'Career, work, realization',
  meaning_purpose:'Direction, values, contribution',finance:'Money and stability',
  personal_growth:'Learning and inner growth',lifestyle:'Habits and life balance'},
 ru:{body_health:'Энергия, самочувствие, здоровье',emotional_wellbeing:'Чувства, стресс, равновесие',
  relationships:'Любовь, семья, общение',career_business:'Карьера, работа, реализация',
  meaning_purpose:'Ценности, смысл, вклад',finance:'Деньги и устойчивость',
  personal_growth:'Обучение и развитие',lifestyle:'Привычки и баланс жизни'},
 es:{body_health:'Energía, bienestar, vitalidad',emotional_wellbeing:'Emociones, estrés, equilibrio',
  relationships:'Amor, familia, comunicación',career_business:'Carrera, trabajo, realización',
  meaning_purpose:'Dirección, valores, contribución',finance:'Dinero y estabilidad',
  personal_growth:'Aprendizaje y crecimiento',lifestyle:'Hábitos y equilibrio vital'},
}

const savedCheckinCopy={
 en:{opening:'Opening steps recorded',name:'Preferred name',feelings:'Feelings · client words',focus:'Recorded focus',profile:'Meaning axes · saved self-ratings',updates:'Meaning axes · saved updates in this session',current:'Now',desired:'Desired',notCaptured:'Not recorded here',skipped:'Skipped',partial:'Partial',rated:'Recorded',unknown:'Session type not recorded',focuses:{profile:'Personal profile',goal:'Goal',challenge:'Problem',self_exploration:'Self-exploration',deferred:'Deferred'}},
 ru:{opening:'Зафиксированные шаги вступления',name:'Предпочитаемое имя',feelings:'Состояние · слова клиента',focus:'Зафиксированный фокус',profile:'Оси смысла · сохранённые самооценки',updates:'Оси смысла · уточнения этой сессии',current:'Сейчас',desired:'Желаемое',notCaptured:'Не зафиксировано здесь',skipped:'Пропущено',partial:'Частично',rated:'Зафиксировано',unknown:'Тип сессии не зафиксирован',focuses:{profile:'Личный профиль',goal:'Цель',challenge:'Проблема',self_exploration:'Самопознание',deferred:'Отложено'}},
 es:{opening:'Pasos de inicio registrados',name:'Nombre preferido',feelings:'Emociones · palabras del cliente',focus:'Enfoque registrado',profile:'Ejes de sentido · autoevaluaciones guardadas',updates:'Ejes de sentido · cambios guardados en esta sesión',current:'Ahora',desired:'Deseado',notCaptured:'No registrado aquí',skipped:'Omitido',partial:'Parcial',rated:'Registrado',unknown:'Tipo de sesión no registrado',focuses:{profile:'Perfil personal',goal:'Meta',challenge:'Problema',self_exploration:'Autoconocimiento',deferred:'Aplazado'}}
}
function savedMeaningRows(checkin,locale){
 if(!['hh-coach-profile-intake-v1','hh-coach-profile-intake-v2'].includes(checkin?.version)||!Array.isArray(checkin.ratings))return []
 const valid=n=>Number.isInteger(n)&&n>=0&&n<=10
 return COACH_PROFILE_AXES.map(axis=>{
  const item=checkin.ratings.find(row=>row?.axis===axis.id)
  const current=valid(item?.current)?item.current:null,desired=valid(item?.desired)?item.desired:null
  const status=item?.kind==='skipped'?'skipped':current!==null&&desired!==null?'rated':
   current!==null||desired!==null?'partial':'notCaptured'
  return {id:axis.id,label:axis.name[locale]||axis.name.en,status,
   current:status==='skipped'?null:current,desired:status==='skipped'?null:desired}
 })
}
function SavedGoalResults({protocol,locale,onDownload}){
 let result
 try{result=goalReviewedResult(protocol,locale)}catch{return <p role="status">{({en:'Results could not be verified.',ru:'Не удалось проверить итоги.',es:'No se pudieron verificar los resultados.'})[locale]}</p>}
 if(!result)return null
 const c=({en:{download:'Download results PDF',missing:'Not confirmed',skip:'Skipped'},ru:{download:'Скачать итоги PDF',missing:'Не подтверждено',skip:'Пропущено'},es:{download:'Descargar resultados PDF',missing:'Sin confirmar',skip:'Omitido'}})[locale]
 return <section data-goal-reviewed-results className={styles.reportSection}><h3>{result.title}</h3><p>{result.caption}</p><progress max={result.total||1} value={result.confirmed} aria-label={result.caption}/>{result.rows.map(row=><div className={styles.reportSection} key={row.id}><b>{row.label}</b><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.answer??(row.status==='skipped'?c.skip:c.missing)}</p></div>)}<small>{result.note}</small><button type="button" className={styles.primaryButton} onClick={onDownload}><Download size={16}/>{c.download}</button></section>
}
function SavedProtocolOverview({protocol,locale}){
 let overview
 try{overview=myCoachProtocolPdfOptions(protocol,{locale}).protocolOverview}catch{return null}
 return overview?<div data-coach-saved-protocol-overview><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{overview}</p></div>:null
}
function SavedProtocolCheckin({protocol,locale}){
 const words=savedCheckinCopy[locale]||savedCheckinCopy.en
 const opening=protocol.opening,rows=savedMeaningRows(protocol.profileCheckin,locale)
 const steps=['invitation','name','continuity','focus','feelings','confirmation']
 const recorded=steps.filter(step=>opening?.checkmarks?.[step]===true).length
 return <>
  {opening&&<div className={styles.reportSection} data-my-coach-saved-opening>
   <b>{words.opening} · {recorded}/6</b>
   {opening.name&&<p>{words.name}: {opening.name}</p>}
   {words.focuses[opening.focus]&&<p>{words.focus}: {words.focuses[opening.focus]}</p>}
   {opening.feelings&&<p>{words.feelings}: {opening.feelings}</p>}
  </div>}
  <MyCoachSavedProfileV3 protocol={protocol} locale={locale}/>
  {rows.length>0&&<div className={styles.reportSection} data-my-coach-saved-meaning-axes>
   <b>{protocol.profileCheckin.version==='hh-coach-profile-intake-v2'?words.updates:words.profile}</b>
   <p>{words.current} / {words.desired}</p>
   {rows.map(row=><p key={row.id} data-axis-id={row.id} data-rating-status={row.status}>
    {row.label}: {row.status==='skipped'||row.status==='notCaptured'?words[row.status]:
     <>{row.current??'—'} / {row.desired??'—'}{row.status==='partial'?' · '+words.partial:''}</>}
   </p>)}
  </div>}
 </>
}

function formatDate(value,locale){
 if(!value||!Number.isFinite(Date.parse(value)))return ''
 try{return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}catch{return ''}
}
function reportTitle(report,locale,t){
 return report?.sections?.desiredOutcome?.text||report?.outcome?.clientFocus?.text||
  report?.evidence?.find(item=>item.kind==='client_request')?.value||t.report
}
function domainState(area){
 return {currentState:area.currentState||'',desiredState:area.desiredState||'',
  obstacles:area.obstacles||'',selfRating:area.selfRating===null||area.selfRating===undefined?'':String(area.selfRating)}
}

export default function MyCoachingPlan({accountId,locale='en'}){
 const lang=copy[locale]?locale:'en',t={...copy[lang],...uiCopy[lang]}
 const searchParams=useSearchParams()
 const requestedTab=searchParams?.get('tab')
 const [tab,setTab]=useState(['reports','context'].includes(requestedTab)?requestedTab:'plan'),[plan,setPlan]=useState(null),[reports,setReports]=useState([])
 const [protocols,setProtocols]=useState([]),[protocolError,setProtocolError]=useState(''),[protocolDeleting,setProtocolDeleting]=useState('')
 const [protocolPage,setProtocolPage]=useState({accountId:'',hasMore:false,nextCursor:null})
 const [protocolPageLoading,setProtocolPageLoading]=useState(false)
 const activeAccountRef=useRef(accountId),loadRevision=useRef(0)
 activeAccountRef.current=accountId
 const visibleProtocols=protocolPage.accountId===accountId?protocols:[]
 const [drafts,setDrafts]=useState({}),[selections,setSelections]=useState({}),[areas,setAreas]=useState({}),[planConsents,setPlanConsents]=useState({})
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(''),[importing,setImporting]=useState('')
 const [notice,setNotice]=useState(''),[reportError,setReportError]=useState(''),[revoking,setRevoking]=useState(''),[contextError,setContextError]=useState(''),[deleting,setDeleting]=useState(''),[deleteError,setDeleteError]=useState('')
 const [expandedArea,setExpandedArea]=useState(''),[showAllAreas,setShowAllAreas]=useState(false),[areaPicker,setAreaPicker]=useState(false),[showProgressDetails,setShowProgressDetails]=useState(false)
 const load=useCallback(async()=>{
  const revision=++loadRevision.current
  if(!accountId){setProtocols([]);setProtocolPage({accountId:'',hasMore:false,nextCursor:null});return}
  setLoading(true);setError('');setReportError('');setProtocolError('')
  // New account/reload invalidates every previous page and in-flight request.
  setProtocols([]);setProtocolPage({accountId:'',hasMore:false,nextCursor:null});setProtocolPageLoading(false)
  try{
   const [life,reportsResult,protocolResult]=await Promise.all([
    appFetch('coaching-life-plan?locale='+lang,undefined,'GET',{accountId}).catch(()=>null),
    appFetch('personal-coaching-reports',undefined,'GET',{accountId}).catch(()=>null),
    fetch('/api/app/my-coach/protocol',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{'x-hh-account-id':accountId}})
      .then(async response=>response.ok?response.json():null).catch(()=>null),
   ])
   if(activeAccountRef.current!==accountId||loadRevision.current!==revision)return
   // The independently authorized archive must stay visible even when the Life Plan fails.
   const validLife=Array.isArray(life?.domains)&&life.domains.length===8
   setPlan(validLife?life:null)
   if(!validLife)setError('load')
   setReports(Array.isArray(reportsResult?.reports)?reportsResult.reports:[])
   setProtocols(Array.isArray(protocolResult?.protocols)?protocolResult.protocols:[])
   setProtocolPage({accountId,hasMore:protocolResult?.hasMore===true,
     nextCursor:protocolResult?.nextCursor||null})
   if(!protocolResult)setProtocolError(protocolCopy[lang].error)
   if(!reportsResult)setReportError('load')
   setDrafts(validLife?Object.fromEntries(life.domains.map(area=>[area.areaKey,domainState(area)])):{})
  }catch(e){if(activeAccountRef.current===accountId&&loadRevision.current===revision){
    setError(e?.code||'load');setReportError(e?.code||'load')
  }}
  finally{if(activeAccountRef.current===accountId&&loadRevision.current===revision)setLoading(false)}
 },[accountId,lang])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{
  const wanted=searchParams?.get('goal')
  if(!wanted||!plan?.domains)return
  const area=plan.domains.find(item=>item.goals?.some(goal=>goal.id===wanted))
  if(!area)return
  setTab('plan');setExpandedArea(area.areaKey)
  if(!PRIMARY_GOAL_AREAS.includes(area.areaKey))setShowAllAreas(true)
 },[searchParams,plan])
 useEffect(()=>{
  const wanted=searchParams?.get('goal')
  if(!wanted||!expandedArea)return
  document.getElementById('goal-'+wanted)?.scrollIntoView({block:'center',behavior:'smooth'})
 },[searchParams,expandedArea,plan])
 const importedKeys=useMemo(()=>new Set((plan?.actions||[]).filter(item=>item.sourceReportId&&item.sourceActionKey).map(item=>item.sourceReportId+'|'+item.sourceActionKey)),[plan])
 const change=(areaKey,key,value)=>setDrafts(prev=>({...prev,[areaKey]:{...prev[areaKey],[key]:value}}))
 async function saveArea(area){
  const value=drafts[area.areaKey]||domainState(area)
  const busyKey='area:'+area.areaKey
  setSaving(busyKey);setNotice('');setError('')
  try{
   await appFetch('coaching-life-plan/areas/'+encodeURIComponent(area.areaKey),{
    revision:area.revision||0,currentState:value.currentState,desiredState:value.desiredState,
    obstacles:value.obstacles,selfRating:value.selfRating===''?null:Number(value.selfRating),
   },'POST',{accountId})
   setNotice(t.saved);await load()
  }catch(e){setError(e?.code||t.saveError)}
  finally{setSaving('')}
 }
 async function importActions(record){
  const report=record.report
  const available=(report?.actionCandidates||[]).filter(item=>item.status==='accepted'&&
    !importedKeys.has(record.id+'|'+item.candidateId))
  const selected=(selections[record.id]||[]).filter(id=>available.some(item=>item.candidateId===id))
  const areaKey=areas[record.id]||'career_business'
  if(!selected.length){setNotice(t.none);return}
  setImporting(record.id);setNotice('');setReportError('')
  try{
   const result=await appFetch('coaching-life-plan/import',{
    reportId:record.id,reportRevision:record.revision,areaKey,candidateIds:selected,planConsent:planConsents[record.id]===true,
   },'POST',{accountId})
   setNotice(t.added+' · '+result.imported)
   setSelections(prev=>({...prev,[record.id]:[]}))
   setPlanConsents(prev=>({...prev,[record.id]:false}))
   await load()
  }catch(e){setReportError(e?.code||t.importError)}
  finally{setImporting('')}
 }
 async function revokeContext(sessionId){
  setRevoking(sessionId);setContextError('');setNotice('')
  try{
   await appFetch('coaching-life-plan/revoke-context',{sessionId,confirmed:true},'POST',{accountId})
   await load();setNotice(t.contextRevoked)
  }catch{setContextError(t.contextError)}
  finally{setRevoking('')}
 }
 function exportProtocol(protocol,print=false,documentKind='protocol'){
  try{
   const options=myCoachProtocolPdfOptions(protocol,{locale:lang,documentKind})
   if(print)openCoachingSessionPdf(options)
   else downloadCoachingSessionPdf(options)
   setProtocolError('')
  }catch{setProtocolError(protocolCopy[lang].pdfError)}
 }
 async function loadEarlierProtocols(){
  const cursor=protocolPage.accountId===accountId?protocolPage.nextCursor:null
  if(!accountId||!cursor||!protocolPage.hasMore||protocolPageLoading)return
  const revision=loadRevision.current
  setProtocolPageLoading(true);setProtocolError('')
  try{
   const params=new URLSearchParams({before:cursor.before,beforeId:cursor.beforeId})
   const response=await fetch('/api/app/my-coach/protocol?'+params.toString(),{
    method:'GET',credentials:'same-origin',cache:'no-store',
    headers:{'x-hh-account-id':accountId},
   })
   const data=await response.json().catch(()=>null)
   if(!response.ok||!Array.isArray(data?.protocols)||typeof data?.hasMore!=='boolean')
    throw Error('MY_COACH_PROTOCOL_PAGE_UNAVAILABLE')
   if(activeAccountRef.current!==accountId||loadRevision.current!==revision)return
   setProtocols(previous=>{
    const known=new Set(previous.map(item=>item.id))
    return [...previous,...data.protocols.filter(item=>{
      if(!item||typeof item.id!=='string'||known.has(item.id))return false
      known.add(item.id);return true
    })]
   })
   setProtocolPage({accountId,hasMore:data.hasMore,nextCursor:data.nextCursor||null})
  }catch{
   if(activeAccountRef.current===accountId&&loadRevision.current===revision)
    setProtocolError(protocolCopy[lang].error)
  }finally{
   if(activeAccountRef.current===accountId&&loadRevision.current===revision)
    setProtocolPageLoading(false)
  }
 }
 async function deleteProtocol(protocol){
  if(!window.confirm(protocolCopy[lang].confirm))return
  setProtocolDeleting(protocol.id);setProtocolError('')
  try{
   const response=await fetch('/api/app/my-coach/protocol',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','x-hh-account-id':accountId},
    body:JSON.stringify({action:'delete',id:protocol.id,confirmed:true}),
   })
   const result=await response.json().catch(()=>null)
   if(!response.ok||result?.deleted!==true)throw Error('DELETE_UNCONFIRMED')
   setProtocols(previous=>previous.filter(item=>item.id!==protocol.id))
  }catch{setProtocolError(protocolCopy[lang].error)}
  finally{setProtocolDeleting('')}
 }
 async function deleteAction(action){
  if(!window.confirm(t.confirmDeleteAction))return
  setDeleting(action.id);setDeleteError('');setNotice('')
  try{
   await appFetch('coaching-life-plan/actions/'+encodeURIComponent(action.id)+'/delete',{confirmed:true},'POST',{accountId})
   await load();setNotice(t.actionDeleted)
  }catch{setDeleteError(t.deleteActionError)}
  finally{setDeleting('')}
 }
 const sections=[
  ['sessionOverview',t.overview],['initialSituation',t.initialSituation],['desiredOutcome',t.desiredOutcome],
  ['keyDiscoveries',t.keyDiscoveries],['mainObstacles',t.mainObstacles],['strengthsResources',t.strengthsResources],
  ['newPerspective',t.newPerspective],['decisions',t.decisions],['actionPlan',t.actionPlan],['followUp',t.followUp],
 ]
 if(loading)return <section className={styles.root} aria-live="polite"><div className={styles.loading}><LoaderCircle className={styles.spin}/>{t.loading}</div></section>
 const domains=plan?.domains||[]
 const progress=summarizeCoachingProgress(domains)
 const visibleAreas=orderedCoachingAreas(domains,showAllAreas)
 const toggleArea=key=>{setExpandedArea(value=>value===key?'':key);setAreaPicker(false)}
 const openArea=key=>{if(!PRIMARY_GOAL_AREAS.includes(key))setShowAllAreas(true);setExpandedArea(key);setAreaPicker(false)}
 return <main className={styles.root} data-my-coaching-plan>
  <header className={styles.header}>
   <div className={styles.eyebrow}><Sparkles size={20}/><span>{t.eyebrow}</span></div>
   <h1>{t.title}</h1><p>{t.subtitle}</p>
   <div className={styles.tabs} role="tablist" aria-label={t.title}>
    <button type="button" role="tab" aria-selected={tab==='plan'} className={tab==='plan'?styles.tabActive:styles.tab} onClick={()=>setTab('plan')}><Target size={16}/>{t.plan}</button>
    <button type="button" role="tab" aria-selected={tab==='reports'} className={tab==='reports'?styles.tabActive:styles.tab} onClick={()=>setTab('reports')}><ClipboardList size={16}/>{t.reports}<span>{reports.length+visibleProtocols.length}</span></button>
    <button type="button" role="tab" id="coach-context-tab" aria-controls={tab==='context'?'coach-context-panel':undefined} aria-selected={tab==='context'} className={tab==='context'?styles.tabActive:styles.tab} onClick={()=>setTab('context')}><Sparkles size={16}/>{t.context}</button>
   </div>
  </header>
  {error&&<div className={styles.error} role="alert">{t.loadError} <button onClick={load}>{t.retry}</button></div>}
  {notice&&<div className={styles.notice} role="status">{notice}</div>}
  {deleteError&&<div className={styles.error} role="alert">{deleteError}</div>}
  {tab==='context'&&<MyCoachContext key={accountId} accountId={accountId} locale={lang} domains={domains}/>}
  {tab==='plan'&&<>
   <DaybookDailySettings accountId={accountId} locale={lang} goals={plan?.goals||[]}/>
   <ReikiHintsSettings key={accountId} accountId={accountId} locale={lang}/>
   <section className={styles.sectionHead}><h2>{t.overviewTitle}</h2>
    <button type="button" className={styles.smallPill} aria-expanded={showProgressDetails}
     onClick={()=>setShowProgressDetails(value=>!value)}><BarChart3 size={19}/>{showProgressDetails?t.hideDetails:t.details}<ArrowRight size={17}/></button>
   </section>
   <section className={styles.progressCard} aria-label={t.overviewTitle} data-goal-progress>
    <div className={styles.gauge} aria-label={t.completion+': '+(progress.completionPercent===null?t.unmeasured:progress.completionPercent+'%')}>
     <svg viewBox="0 0 200 112" aria-hidden="true"><path d="M20 100 A80 80 0 0 1 180 100" pathLength="100" fill="none" stroke="#daece2" strokeWidth="19" strokeLinecap="round"/>
      {progress.completionPercent!==null&&<path d="M20 100 A80 80 0 0 1 180 100" pathLength="100" fill="none" stroke="#05a078"
       strokeWidth="19" strokeLinecap="round" strokeDasharray={progress.completionPercent+' 100'}/>}</svg>
     <strong>{progress.completionPercent===null?'—':progress.completionPercent+'%'}</strong><small>{t.completion}</small>
    </div>
    <div className={styles.metrics}>
     <div><span><Target size={22}/></span><b>{progress.totalGoals}</b><small>{t.goals}</small></div>
     <div><span><CheckCircle2 size={22}/></span><b>{progress.inProgressGoals}</b><small>{t.inProgress}</small></div>
     <div><span><Trophy size={22}/></span><b>{progress.completedGoals}</b><small>{t.completed}</small></div>
    </div>
   </section>
   {showProgressDetails&&<div className={styles.progressDetails} role="status">
    <span>{t.areasWithGoals}: <b>{progress.areasWithGoals} / {domains.length}</b></span>
    <span>{t.acceptedActions}: <b>{progress.acceptedActions}</b></span>
    {progress.completionPercent===null&&<p>{t.noProgress}</p>}
   </div>}
   <section className={styles.sectionHead}><h2>{t.goalAreas}</h2>
    <button type="button" className={styles.smallPill} aria-expanded={areaPicker}
     onClick={()=>setAreaPicker(value=>!value)}><Plus size={21}/>{t.addGoal}</button></section>
   {areaPicker&&<section className={styles.areaPicker} aria-label={t.chooseArea}>
    <p>{t.chooseArea}</p><div>{domains.map(area=><button type="button" key={area.areaKey}
     onClick={()=>openArea(area.areaKey)}>{areaNames[lang]?.[area.areaKey]||area.label}<ArrowRight size={15}/></button>)}</div>
   </section>}
   <section className={styles.domainGrid} data-goal-areas aria-label={t.goalAreas}>
    {visibleAreas.map(area=>{
     const Icon=areaIcons[area.areaKey]||Target
     const draft=drafts[area.areaKey]||domainState(area)
     const dirty=draft.currentState!==(area.currentState||'')||draft.desiredState!==(area.desiredState||'')||
      draft.obstacles!==(area.obstacles||'')||draft.selfRating!==(area.selfRating===null||area.selfRating===undefined?'':String(area.selfRating))
     const busy=saving==='area:'+area.areaKey, expanded=expandedArea===area.areaKey, count=area.goals?.length||0
     return <article className={styles.domainCard} key={area.areaKey} data-life-plan-area={area.areaKey} data-goal-expanded={expanded}>
      <button type="button" className={styles.areaSummary} aria-expanded={expanded}
       aria-controls={'hh-area-'+area.areaKey} onClick={()=>toggleArea(area.areaKey)}>
       <span className={styles.areaArt} data-goal-art={area.areaKey} aria-hidden="true"/>
       <span className={styles.areaIcon}><Icon size={24} aria-hidden="true"/></span>
       <span className={styles.areaCopy}><strong>{areaNames[lang]?.[area.areaKey]||area.label}</strong>
        <small>{areaSubtitles[lang]?.[area.areaKey]||''}</small></span>
       <span className={styles.goalBadge}>{count} {count===1?t.singular:t.plural}</span>
       <ChevronRight className={styles.areaArrow} size={22} aria-hidden="true"/>
      </button>
      {expanded&&<div id={'hh-area-'+area.areaKey} className={styles.areaEditor}>
       <p className={styles.editHint}>{t.editHint}</p>
       <label className={styles.fieldRow}><span><MapPin size={17}/>{t.current}</span>
        <textarea rows={2} maxLength={1200} value={draft.currentState} onChange={e=>change(area.areaKey,'currentState',e.target.value)}/></label>
       <label className={styles.fieldRow}><span><Target size={17}/>{t.desired}</span>
        <textarea rows={2} maxLength={1200} value={draft.desiredState} onChange={e=>change(area.areaKey,'desiredState',e.target.value)}/></label>
       <label className={styles.fieldRow}><span><Mountain size={17}/>{t.obstacles}</span>
        <textarea rows={2} maxLength={1200} value={draft.obstacles} onChange={e=>change(area.areaKey,'obstacles',e.target.value)}/></label>
       <label className={styles.fieldRow}><span><BarChart3 size={17}/>{t.rating}</span>
        <select value={draft.selfRating} onChange={e=>change(area.areaKey,'selfRating',e.target.value)}>
         <option value="">{t.noRating}</option>{Array.from({length:11},(_,n)=><option key={n} value={String(n)}>{n}/10</option>)}
        </select></label>
       <button type="button" className={styles.saveButton} disabled={!dirty||busy} onClick={()=>saveArea(area)}>
        {busy?<LoaderCircle className={styles.spin} size={17}/>:<Save size={17}/>} {busy?t.saving:t.save}</button>
       <div className={styles.goalList}><strong>{t.goals} · {count}</strong>
        {count===0&&<p>{t.noGoals}</p>}
        {(area.goals||[]).map(goal=><div className={styles.goal} key={goal.id} id={'goal-'+goal.id}>
         <b>{goal.title}</b>{goal.desiredOutcome&&<p>{goal.desiredOutcome}</p>}
         <span>{goal.status}</span>
         {(goal.actions||[]).map(action=><div className={styles.action} key={action.id}>
          <Check size={13}/>{action.description}<small>{action.status}</small>
          <button type="button" disabled={!!deleting} aria-label={t.deleteAction+': '+action.description}
           onClick={()=>deleteAction(action)}>{deleting===action.id?t.deletingAction:t.deleteAction}</button>
         </div>)}
        </div>)}
       </div>
      </div>}
     </article>
    })}
   </section>
   {domains.length>PRIMARY_GOAL_AREAS.length&&<button type="button" className={styles.moreAreas}
    aria-expanded={showAllAreas} onClick={()=>{if(showAllAreas&&!PRIMARY_GOAL_AREAS.includes(expandedArea))setExpandedArea('');setShowAllAreas(v=>!v)}}>
    {showAllAreas?t.lessAreas:t.moreAreas}<ChevronDown size={18}/></button>}
   <Link href={'/'+lang+'/app/coaching'} className={styles.sessionLink}><Sparkles size={24}/>{t.start}<ArrowRight size={23}/></Link>
   {!!plan?.contextPermissions?.length&&<details className={styles.permissions}><summary>{t.contextTitle}<ChevronDown size={18}/></summary>
    <p>{t.contextInfo}</p>{contextError&&<p role="alert">{contextError}</p>}
    {plan.contextPermissions.map((permission,index)=><div key={permission.sessionId}>
     <span>{t.contextSession} {index+1} · {formatDate(permission.completedAt,lang)}</span>{' '}
     <button type="button" className={styles.saveButton} disabled={!!revoking}
      onClick={()=>revokeContext(permission.sessionId)}>{revoking===permission.sessionId?t.revokingContext:t.revokeContext}</button>
    </div>)}
   </details>}
  </>}
  {tab==='reports'&&<section className={styles.reports}>
   {protocolPage.accountId===accountId&&!loading&&(!protocolError||visibleProtocols.length>0)&&<CourseArchiveReview key={'course-review:'+accountId} accountId={accountId} locale={lang} protocols={visibleProtocols} hasMore={protocolPage.hasMore} plan={plan}/>}
   <MyCoachDraftArchive key={accountId} accountId={accountId} locale={lang} onReviewed={()=>void load()}/>
   {reportError&&<p className={styles.inlineError} role="alert">{t.reportError}</p>}
   {protocolError&&<p className={styles.inlineError} role="alert">{protocolError}</p>}
   {visibleProtocols.map(protocol=><article key={protocol.id} className={styles.reportCard} data-my-coach-saved-protocol={protocol.id}>
    <CoachSessionArchiveHeader protocol={protocol} locale={lang} reviewed/>
    {isGoalReviewedResult(protocol.courseSessionId)?<><SavedGoalResults protocol={protocol} locale={lang} onDownload={()=>exportProtocol(protocol,false,'results')}/><details className={styles.reportDetails}><summary>{protocolCopy[lang].title} <ChevronDown size={16}/></summary><SavedProtocolOverview protocol={protocol} locale={lang}/></details></>:<SavedProtocolOverview protocol={protocol} locale={lang}/>} 
   <SavedProtocolCheckin protocol={protocol} locale={lang}/>
    {protocol.clientSummary&&<div className={styles.reportSection}><b>{lang==='ru'?'Мой итог':lang==='es'?'Mi conclusión':'My takeaway'}</b><p>{protocol.clientSummary}</p></div>}
    {protocol.clientNextStep&&<div className={styles.reportSection}><b>{lang==='ru'?'Мой следующий шаг':lang==='es'?'Mi próximo paso':'My next step'}</b><p>{protocol.clientNextStep}</p></div>}
    <details className={styles.reportDetails}><summary>{protocolCopy[lang].transcript} <ChevronDown size={16}/></summary>
      <button type="button" className={styles.primaryButton} onClick={()=>{if(window.confirm(({en:'This file contains private conversation text. Keep it secure and share only with explicit permission. Download?',ru:'Файл содержит личный диалог. Храните его безопасно и передавайте только с явного разрешения. Скачать?',es:'El archivo contiene un diálogo privado. Guárdalo de forma segura y compártelo solo con permiso explícito. ¿Descargar?'})[lang]))downloadCoachQualityTranscript(protocol)}}>{({en:'Export private QA transcript (JSON)',ru:'Скачать стенограмму для анализа (JSON)',es:'Exportar transcripción privada (JSON)'})[lang]}</button>
     <button type="button" className={styles.primaryButton} onClick={()=>exportProtocol(protocol,false,'transcript')}><Download size={16}/>{({en:'Download transcript PDF',ru:'Скачать стенограмму PDF',es:'Descargar transcripción PDF'})[lang]}</button>
     {(protocol.turns||[]).map((turn,index)=><div className={styles.reportSection} key={index}>
      <b>{turn.role==='user'?({en:'You',ru:'Вы',es:'Tú'}[lang]):protocolCopy[lang].coach}</b>
      <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{turn.content}</p>
      {turn.interrupted===true&&<small>{lang==='ru'?'Ответ перебит (мог быть услышан не полностью)':lang==='es'?'Respuesta interrumpida':'Reply interrupted; may not have been fully heard'}</small>}
     </div>)}
    </details>
    <div className={styles.importPanel}>
     <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
      <button type="button" className={styles.primaryButton} onClick={()=>exportProtocol(protocol,false)}><Download size={16}/>{({en:'Download protocol PDF',ru:'Скачать протокол PDF',es:'Descargar protocolo PDF'})[lang]}</button>
      <button type="button" className={styles.primaryButton} onClick={()=>exportProtocol(protocol,true)}><Printer size={16}/>{protocolCopy[lang].print}</button>
      <button type="button" className={styles.primaryButton} disabled={!!protocolDeleting} onClick={()=>deleteProtocol(protocol)}><Trash2 size={16}/>{protocolCopy[lang].delete}</button>
     </div>
    </div>
   </article>)}
   {protocolPage.accountId===accountId&&protocolPage.hasMore&&protocolPage.nextCursor&&
    <button type="button" className={styles.primaryButton} data-my-coach-load-earlier
      disabled={protocolPageLoading} onClick={()=>void loadEarlierProtocols()}>
      {protocolPageLoading?({
        en:'Loading earlier sessions…',ru:'Загружаем предыдущие сессии…',es:'Cargando sesiones anteriores…',
      }[lang]):({
        en:'Show earlier sessions',ru:'Показать предыдущие сессии',es:'Mostrar sesiones anteriores',
      }[lang])}
    </button>}
   {!reports.length&&!visibleProtocols.length&&!reportError&&!protocolError&&<div className={styles.empty}><ClipboardList size={24}/><p>{t.reportsEmpty}</p></div>}
   {reports.map(record=>{
    const report=record.report||{},accepted=(report.actionCandidates||[]).filter(item=>item.status==='accepted')
    const available=accepted.filter(item=>!importedKeys.has(record.id+'|'+item.candidateId))
    const selected=selections[record.id]||[]
    return <article className={styles.reportCard} key={record.id} data-coaching-report={record.id}>
     <div className={styles.reportTop}><div><span>{t.reviewed}</span><h2>{reportTitle(report,lang,t)}</h2><small>{formatDate(record.createdAt,lang)}</small></div><span className={styles.reportRevision}>v{record.revision}</span></div>
     <details className={styles.reportDetails}><summary>{t.report} · {sections.length} sections <ChevronDown size={16}/></summary>
      {sections.map(([key,label])=>{
       const section=report.sections?.[key]
       let value=section?.status==='not_captured'?t.notCaptured:(section?.text||t.notCaptured)
       if(key==='sessionOverview'){
        const meta=section?.metadata||{}
        const bits=[]
        if(meta.modelKey)bits.push(meta.modelKey.replace(/_v\\d+$/,'').toUpperCase())
        if(Number.isSafeInteger(meta.durationSeconds)&&meta.durationSeconds>0)bits.push(Math.round(meta.durationSeconds/60)+' min')
        const date=formatDate(meta.completedAt,lang)
        if(date)bits.push(date)
        value=bits.join(' · ')||t.overviewFallback
       }
       if(key==='actionPlan')value=report.actionCandidates?.length?t.actionPlanNote:t.notCaptured
       return <div className={styles.reportSection} key={key}><b>{label}</b><p>{value}</p></div>
      })}
     </details>
     <div className={styles.importPanel}>
      <h3>{t.chooseArea}</h3>
      <label>{t.select}<select value={areas[record.id]||'career_business'} onChange={e=>setAreas(prev=>({...prev,[record.id]:e.target.value}))}>
       {domains.map(area=><option value={area.areaKey} key={area.areaKey}>{area.label}</option>)}
      </select></label>
      <strong>{t.chooseActions}</strong>
      {!accepted.length&&<p>{t.noActions}</p>}
      {accepted.map(candidate=>{
       const wasImported=importedKeys.has(record.id+'|'+candidate.candidateId)
       return <label className={styles.actionChoice} key={candidate.candidateId}>
        <input type="checkbox" disabled={wasImported} checked={wasImported||selected.includes(candidate.candidateId)}
         onChange={e=>setSelections(prev=>({...prev,[record.id]:e.target.checked?[...(prev[record.id]||[]),candidate.candidateId]:(prev[record.id]||[]).filter(id=>id!==candidate.candidateId)}))}/>
        <span>{candidate.text}{wasImported&&<small>{t.already}</small>}</span>
       </label>
      })}
      {selected.length>0&&<label className={styles.planConsent}>
       <input type="checkbox" checked={planConsents[record.id]===true}
        onChange={e=>setPlanConsents(prev=>({...prev,[record.id]:e.target.checked}))}/>
       <span>{t.planConsent}</span>
      </label>}
      <button type="button" className={styles.primaryButton} disabled={!selected.length||planConsents[record.id]!==true||Boolean(importing)} onClick={()=>importActions(record)}>
       {importing===record.id?<LoaderCircle className={styles.spin} size={16}/>:<Plus size={16}/>} {importing===record.id?t.adding:t.add}
      </button>
      {reportError&&<p className={styles.inlineError} role="alert">{t.importError}</p>}
      {!!accepted.length&&<CoachMemoryReview key={accountId+':'+record.id} accountId={accountId}
        reportId={record.id} areaKey={areas[record.id]||'career_business'} locale={lang}
        importedKeys={importedKeys} onSaved={load}/>}
     </div>
    </article>
   })}
  </section>}
  {tab==='context'&&!!plan?.contextPermissions?.length&&
   <details className={styles.permissions}><summary>{t.contextTitle}<ChevronDown size={18}/></summary>
    <p>{t.contextInfo}</p>{contextError&&<p role="alert">{contextError}</p>}
    {plan.contextPermissions.map((permission,index)=><div key={permission.sessionId}><span>{t.contextSession} {index+1} · {formatDate(permission.completedAt,lang)}</span>{' '}<button type="button" className={styles.saveButton} disabled={!!revoking} onClick={()=>revokeContext(permission.sessionId)}>{revoking===permission.sessionId?t.revokingContext:t.revokeContext}</button></div>)}
   </details>}
 </main>
}
