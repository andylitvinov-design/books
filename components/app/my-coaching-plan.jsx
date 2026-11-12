'use client'

import {useCallback,useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {appFetch} from '@/lib/app/client-fetch'
import {Check,ChevronDown,ClipboardList,Compass,Download,LoaderCircle,Plus,RefreshCw,Save,Sparkles,Target} from 'lucide-react'
import styles from './my-coaching-plan.module.css'

const copy={
 en:{
  title:'My Coaching Plan',subtitle:'Your life areas, decisions and next steps — gathered from your coaching work.',
  plan:'Life Plan',reports:'Coaching reports',loading:'Opening your private plan…',retry:'Try again',
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
  title:'Мой план коучинга',subtitle:'Ваши жизненные сферы, решения и следующие шаги, собранные из коучинговых сессий.',
  plan:'План жизни',reports:'Отчёты коучинга',loading:'Открываем ваш личный план…',retry:'Повторить',
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
  title:'Mi plan de coaching',subtitle:'Tus áreas de vida, decisiones y próximos pasos reunidos de tus sesiones.',
  plan:'Plan de vida',reports:'Informes de coaching',loading:'Abriendo tu plan privado…',retry:'Reintentar',
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
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const searchParams=useSearchParams()
 const [tab,setTab]=useState(searchParams?.get('tab')==='reports'?'reports':'plan'),[plan,setPlan]=useState(null),[reports,setReports]=useState([])
 const [drafts,setDrafts]=useState({}),[selections,setSelections]=useState({}),[areas,setAreas]=useState({}),[planConsents,setPlanConsents]=useState({})
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(''),[importing,setImporting]=useState('')
 const [notice,setNotice]=useState(''),[reportError,setReportError]=useState(''),[revoking,setRevoking]=useState(''),[contextError,setContextError]=useState(''),[deleting,setDeleting]=useState(''),[deleteError,setDeleteError]=useState('')
 const load=useCallback(async()=>{
  if(!accountId)return
  setLoading(true);setError('');setReportError('')
  try{
   const [life,reportsResult]=await Promise.all([
    appFetch('coaching-life-plan?locale='+lang,undefined,'GET',{accountId}),
    appFetch('personal-coaching-reports',undefined,'GET',{accountId}).catch(()=>null),
   ])
   if(!Array.isArray(life?.domains)||life.domains.length!==8)throw new Error('COACHING_PLAN_RESPONSE_INVALID')
   setPlan(life)
   setReports(Array.isArray(reportsResult?.reports)?reportsResult.reports:[])
   if(!reportsResult)setReportError('load')
   setDrafts(Object.fromEntries(life.domains.map(area=>[area.areaKey,domainState(area)])))
  }catch(e){setError(e?.code||'load');setReportError(e?.code||'load')}
  finally{setLoading(false)}
 },[accountId,lang])
 useEffect(()=>{void load()},[load])
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
 return <main className={styles.root} data-my-coaching-plan>
  <header className={styles.header}>
   <div className={styles.eyebrow}><Compass size={15}/><span>HOLISTIC HOUSE</span></div>
   <h1>{t.title}</h1><p>{t.subtitle}</p>
   <div className={styles.tabs} role="tablist" aria-label={t.title}>
    <button type="button" role="tab" aria-selected={tab==='plan'} className={tab==='plan'?styles.tabActive:styles.tab} onClick={()=>setTab('plan')}><Target size={16}/>{t.plan}</button>
    <button type="button" role="tab" aria-selected={tab==='reports'} className={tab==='reports'?styles.tabActive:styles.tab} onClick={()=>setTab('reports')}><ClipboardList size={16}/>{t.reports}<span>{reports.length}</span></button>
   </div>
  </header>
  {error&&<div className={styles.error} role="alert">{t.loadError} <button onClick={load}>{t.retry}</button></div>}
  {notice&&<div className={styles.notice} role="status">{notice}</div>}
  {deleteError&&<div className={styles.error} role="alert">{deleteError}</div>}
  {tab==='plan'&&<>
   {!!plan?.contextPermissions?.length&&<section className={styles.domainCard} aria-label={t.contextTitle}>
    <h2>{t.contextTitle}</h2><p>{t.contextInfo}</p>
    {contextError&&<p role="alert">{contextError}</p>}
    {plan.contextPermissions.map((permission,index)=><div key={permission.sessionId}>
     <span>{t.contextSession} {index+1} · {formatDate(permission.completedAt,lang)}</span>{' '}
     <button type="button" className={styles.saveButton} aria-label={`${t.revokeContext}: ${t.contextSession} ${index+1}`} disabled={!!revoking} onClick={()=>revokeContext(permission.sessionId)}>{revoking===permission.sessionId?t.revokingContext:t.revokeContext}</button>
    </div>)}
   </section>}
   {!plan?.plan&&<section className={styles.empty}>
    <div className={styles.emptyIcon}><Sparkles size={24}/></div>
    <h2>{t.emptyTitle}</h2><p>{t.empty}</p>
    <Link href={'/'+lang+'/app/coaching'} className={styles.primaryLink}>{t.start}</Link>
   </section>}
   <section className={styles.domainGrid} aria-label={t.plan}>
    {domains.map(area=>{
     const draft=drafts[area.areaKey]||domainState(area)
     const dirty=draft.currentState!==(area.currentState||'')||draft.desiredState!==(area.desiredState||'')||
      draft.obstacles!==(area.obstacles||'')||draft.selfRating!==(area.selfRating===null||area.selfRating===undefined?'':String(area.selfRating))
     const isBusy=saving==='area:'+area.areaKey
     return <article className={styles.domainCard} key={area.areaKey} data-life-plan-area={area.areaKey}>
      <div className={styles.domainHeading}><div><span className={styles.areaDot}/><h2>{area.label}</h2></div><span className={styles.revision}>v{area.revision||0}</span></div>
      <label>{t.current}<textarea rows={2} maxLength={1200} value={draft.currentState} onChange={e=>change(area.areaKey,'currentState',e.target.value)} /></label>
      <label>{t.desired}<textarea rows={2} maxLength={1200} value={draft.desiredState} onChange={e=>change(area.areaKey,'desiredState',e.target.value)} /></label>
      <label>{t.obstacles}<textarea rows={2} maxLength={1200} value={draft.obstacles} onChange={e=>change(area.areaKey,'obstacles',e.target.value)} /></label>
      <label>{t.rating}<select value={draft.selfRating} onChange={e=>change(area.areaKey,'selfRating',e.target.value)}>
       <option value="">{t.noRating}</option>{Array.from({length:11},(_,i)=><option value={String(i)} key={i}>{i}/10</option>)}
      </select></label>
      <button type="button" className={styles.saveButton} disabled={!dirty||isBusy} onClick={()=>saveArea(area)}>
       {isBusy?<LoaderCircle className={styles.spin} size={16}/>:<Save size={16}/>} {isBusy?t.saving:t.save}
      </button>
      <div className={styles.goalList}>
       <strong>{t.goals} · {area.goals?.length||0}</strong>
       {!area.goals?.length&&<p>{t.noGoals}</p>}
       {(area.goals||[]).map(goal=><div className={styles.goal} key={goal.id}>
        <b>{goal.title}</b>{goal.desiredOutcome&&<p>{goal.desiredOutcome}</p>}
        <span>{goal.status}</span>
        {(goal.actions||[]).map(action=><div className={styles.action} key={action.id}><Check size={13}/>{action.description}<small>{action.status}</small><button type="button" disabled={!!deleting} aria-label={`${t.deleteAction}: ${action.description}`} onClick={()=>deleteAction(action)}>{deleting===action.id?t.deletingAction:t.deleteAction}</button></div>)}
       </div>)}
      </div>
     </article>
    })}
   </section>
  </>}
  {tab==='reports'&&<section className={styles.reports}>
   {reportError&&<p className={styles.inlineError} role="alert">{t.reportError}</p>}
   {!reports.length&&!reportError&&<div className={styles.empty}><ClipboardList size={24}/><p>{t.reportsEmpty}</p></div>}
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
     </div>
    </article>
   })}
  </section>}
 </main>
}
