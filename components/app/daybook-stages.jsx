'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {STAGES,parseStageEntry,stageTag,stageText,stageRecords} from '@/lib/app/daybook-stages.mjs'
import DaybookGoalContext from './daybook-goal-context'
import css from './daybook-stages.module.css'

const copy={
 ru:{title:'7 шагов к мечте',intro:'Выберите страницу рабочей тетради. Ответы и результаты сохраняются отдельно для каждой цели.',index:'Все 7 страниц',stage:'Страница',answer:'Ваши ответы',tools:'Инструменты и ресурсы',coach:'Открыть ИИ-коуча',human:'Личная поддержка и сессии',save:'Сохранить ответы',complete:'Сохранить и завершить этап',saved:'Сохранено и проверено',done:'Завершён',draft:'В работе',empty:'Не начат',unknown:'Не все записи загружены',load:'Загрузить все сохранённые записи',loading:'Загрузка…',failed:'Сохранение не подтверждено. Повторите тот же запрос или обновите дневник.',retry:'Повторить сохранение',reload:'Обновить дневник',discard:'Отменить несохранённые изменения?',required:'Заполните итоговый вопрос, чтобы завершить этап. Остальные вопросы можно пропустить.',private:'Ответы остаются в личном дневнике. Коучу не передаются автоматически. Это рабочая тетрадь, не диагноз.',previous:'Назад',next:'Далее',rating:'Доступные силы сейчас (0–10, необязательно)',noRating:'Не оценено',vectors:'Колесо жизни и 8 смысловых осей',tests:'Мои тесты и самооценки',plan:'Мой коучинговый план',goals:'Цели и действия',today:'Сегодня и недельный обзор',courses:'Мои курсы и практики',videos:'Моя библиотека видео',pause:'Если вопрос вызывает сильный дискомфорт, его можно пропустить и обратиться за поддержкой.',result:'Итог этапа',history:'Предыдущие записи этапа доступны в разделе «Дневник».',loadFailed:'Не удалось загрузить все записи. Повторите.'},
 en:{title:'Seven steps to your dream',intro:'Choose a workbook page. Answers and results are saved separately for each goal.',index:'All 7 pages',stage:'Page',answer:'Your answers',tools:'Tools and resources',coach:'Open AI coach',human:'Personal support and sessions',save:'Save answers',complete:'Save and complete stage',saved:'Saved and verified',done:'Completed',draft:'In progress',empty:'Not started',unknown:'Not all entries loaded',load:'Load all saved entries',loading:'Loading…',failed:'Save not confirmed. Retry the same request or reload the journal.',retry:'Retry save',reload:'Reload journal',discard:'Discard unsaved changes?',required:'Answer the final question to complete this stage. Other questions may be skipped.',private:'Answers stay in your private journal. They are not automatically shared with a coach. This is a workbook, not a diagnosis.',previous:'Back',next:'Next',rating:'Available energy now (0–10, optional)',noRating:'Not rated',vectors:'Life wheel and eight meaning axes',tests:'My tests and self-ratings',plan:'My coaching plan',goals:'Goals and actions',today:'Today and weekly review',courses:'My courses and practices',videos:'My video library',pause:'If a question is distressing, skip it and seek support.',result:'Stage outcome',history:'Previous stage entries are available in Journal.',loadFailed:'Could not load all entries. Retry.'},
 es:{title:'Siete pasos hacia tu sueño',intro:'Elige una página. Las respuestas y resultados se guardan por objetivo.',index:'Las 7 páginas',stage:'Página',answer:'Tus respuestas',tools:'Herramientas y recursos',coach:'Abrir coach de IA',human:'Apoyo personal y sesiones',save:'Guardar respuestas',complete:'Guardar y completar etapa',saved:'Guardado y verificado',done:'Completado',draft:'En curso',empty:'Sin empezar',unknown:'Faltan entradas por cargar',load:'Cargar todas las entradas',loading:'Cargando…',failed:'Guardado sin confirmar. Reintenta la misma solicitud o recarga el diario.',retry:'Reintentar guardado',reload:'Recargar diario',discard:'¿Descartar cambios sin guardar?',required:'Responde la última pregunta para completar la etapa. Puedes omitir las demás.',private:'Tus respuestas permanecen en el diario privado. No se comparten automáticamente con un coach. No es un diagnóstico.',previous:'Atrás',next:'Siguiente',rating:'Energía disponible (0–10, opcional)',noRating:'Sin evaluar',vectors:'Rueda de vida y ocho ejes de sentido',tests:'Mis pruebas y autoevaluaciones',plan:'Mi plan de coaching',goals:'Objetivos y acciones',today:'Hoy y revisión semanal',courses:'Mis cursos y prácticas',videos:'Mi biblioteca de vídeos',pause:'Si una pregunta te causa malestar, puedes omitirla y buscar apoyo.',result:'Resultado de la etapa',history:'Las entradas anteriores están en el diario.',loadFailed:'No se pudieron cargar todas las entradas. Reintenta.'}
}
const routes={vectors:'/development-vectors',tests:'/app/tests',plan:'/app/my-coaching-plan',courses:'/app/course',videos:'/app/videos'}
export default function DaybookStages({accountId,locale,stageNumber,onStage,entries,hasMore,loadingAll,loadError,onLoadAll,onSaved,onSessionLost,onReload,onTab,ready}){
 const c=copy[locale],stage=STAGES[stageNumber-1],root='/'+locale
 const [goalId,setGoalId]=useState(null),[draft,setDraft]=useState(null),[pending,setPending]=useState(null),[status,setStatus]=useState('')
 const saver=useRef(null),active=useRef(false),inFlight=useRef(false)
 useEffect(()=>{active.current=true;saver.current=createJournalSaver(appFetch,accountId);return()=>{active.current=false;saver.current?.discard()}},[accountId])
 const records=stage?stageRecords(entries,goalId,stage.id):[]
 const current=records[0],existing=parseStageEntry(current),answers=draft??existing?.answers??{}
 const dirty=draft!==null,locked=!!pending||inFlight.current||status==='saving'
 function clear(){setDraft(null);setStatus('')}
 function navigate(n){if(locked||!ready)return;if(dirty&&!window.confirm(c.discard))return;clear();onStage(n)}
 function selectGoal(id){if(locked||!ready)return;if(dirty&&!window.confirm(c.discard))return;clear();setGoalId(id)}
 function tab(key){if(locked||!ready)return;if(dirty&&!window.confirm(c.discard))return;clear();onTab(key)}
 function change(key,value){setDraft({...answers,[key]:value});setStatus('')}
 async function save(complete){
  if(!ready||hasMore||inFlight.current||!stage)return
  const final=answers[stage.keys.at(-1)]?.trim()
  if(!pending&&complete&&!final)return
  if(!pending&&!Object.values(answers).some(v=>v.trim()))return
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone
  const input=pending||{id:current?.id||crypto.randomUUID(),revision:current?.revision||0,text:stageText(stage,answers,complete),tags:[stageTag(stage.id)],kind:'note',locale,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId}
  inFlight.current=true;setPending(input);setStatus('saving')
  try{
   const entry=await saver.current.save(input)
   if(!active.current)return
   onSaved(entry);setPending(null);setDraft(null);setStatus('saved')
  }catch(error){
   if(!active.current)return
   if(error.status===401||error.code==='ACCOUNT_CHANGED')onSessionLost()
   else setStatus('failed')
  }finally{inFlight.current=false}
 }
 const loaded=!hasMore
 return <div className={css.workbook}>
  <header className={css.hero}><span>COACHING DAYBOOK</span><h2>{c.title}</h2><p>{c.intro}</p></header>
  <DaybookGoalContext accountId={accountId} locale={locale} selectedId={goalId} disabled={locked||!ready} onChange={selectGoal} onSessionLost={onSessionLost}/>
  {hasMore&&<aside role="status"><p>{loadError?c.loadFailed:c.unknown}</p><button disabled={!ready||loadingAll||locked} onClick={onLoadAll}>{loadingAll?c.loading:c.load}</button></aside>}
  {!stage?<div className={css.index}>{STAGES.map((s,i)=>{
   const record=loaded?parseStageEntry(stageRecords(entries,goalId,s.id)[0]):null
   return <button key={s.id} onClick={()=>navigate(i+1)} disabled={!ready||locked}><span className={css.number}>{String(i+1).padStart(2,'0')}</span><span><strong>{s[locale][0]}</strong><small>{s[locale][1]} · {loaded?(record?(record.completed?c.done:c.draft):c.empty):'—'}</small></span><span aria-hidden="true">›</span></button>
  })}</div>:<>
   <button className={css.back} onClick={()=>navigate(0)} disabled={locked||!ready}>‹ {c.index}</button>
   <div className={css.pager} aria-label={c.stage}>{STAGES.map((s,i)=><button key={s.id} aria-current={stageNumber===i+1?'page':undefined} aria-label={s[locale][0]} disabled={locked||!ready} onClick={()=>navigate(i+1)}>{i+1}</button>)}</div>
   <section className={css.sheet}>
    <small>{c.stage} {stageNumber} / 7 · {loaded?(existing?(existing.completed?c.done:c.draft):c.empty):'—'}</small>
    <h2>{stage[locale][0]}</h2><p>{stage[locale][1]}</p>
    {stage.id==='obstacles'&&<p>{c.pause}</p>}
    <h3>{c.answer}</h3>
    {stage.rating&&<label>{c.rating}<select disabled={!ready||!loaded||locked} value={answers.rating??''} onChange={e=>change('rating',e.target.value)}><option value="">{c.noRating}</option>{Array.from({length:11},(_,n)=><option key={n} value={String(n)}>{n}</option>)}</select></label>}
    {stage.keys.map((key,i)=><label key={key}>{i===stage.keys.length-1&&<strong className={css.result}>{c.result}</strong>}{stage[locale][i+2]}<textarea rows={3} maxLength={1200} disabled={!ready||!loaded||locked} value={answers[key]||''} onChange={e=>change(key,e.target.value)}/></label>)}
    <p>{c.required}</p><p>{c.private}</p>
    {records.length>1&&<p>{c.history}</p>}
    <div className={css.actions}>{pending?<><button disabled={!ready||status==='saving'} onClick={()=>void save(false)}>{status==='saving'?c.loading:c.retry}</button><button disabled={status==='saving'} onClick={()=>{if(window.confirm(c.discard))onReload()}}>{c.reload}</button></>:<>
    <button disabled={!ready||!loaded||!Object.values(answers).some(v=>v.trim())} onClick={()=>void save(false)}>{c.save}</button>
    <button className={css.primary} disabled={!ready||!loaded||!answers[stage.keys.at(-1)]?.trim()} onClick={()=>void save(true)}>{c.complete}</button></>}</div>
    <p role="status">{status==='failed'?c.failed:status==='saved'?c.saved:status==='saving'?c.loading:''}</p>
   </section>
   <section className={css.sheet}><h3>{c.tools}</h3><div className={css.links}>
    {stage.links.map(key=>routes[key]?<Link key={key} prefetch={false} href={root+routes[key]} onClick={e=>{if(locked||(dirty&&!window.confirm(c.discard)))e.preventDefault()}}>{c[key]} ›</Link>:<button key={key} disabled={locked} onClick={()=>tab(key)}>{c[key]} ›</button>)}
    <Link prefetch={false} href={root+'/my-coach'} onClick={e=>{if(locked||(dirty&&!window.confirm(c.discard)))e.preventDefault()}}>{c.coach} ›</Link>
    <Link prefetch={false} href={root+'/app/portrait?space=sessions'} onClick={e=>{if(locked||(dirty&&!window.confirm(c.discard)))e.preventDefault()}}>{c.human} ›</Link>
   </div></section>
   <div className={css.actions}><button disabled={locked||!ready} onClick={()=>navigate(stageNumber-1)}>{c.previous}</button><button disabled={locked||!ready} onClick={()=>navigate(stageNumber===7?0:stageNumber+1)}>{stageNumber===7?c.index:c.next}</button></div>
  </>}
 </div>
}
