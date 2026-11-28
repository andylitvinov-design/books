'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {validClarityRunSummary} from '@/lib/coaching/clarity-resume-scope.mjs'
import {clarityRunNotes} from '@/lib/coaching/clarity-course-runs.mjs'
import {CLARITY_SYLLABUS,clarityDayNotes} from '@/lib/app/clarity-program.mjs'
import Link from 'next/link'
import {clarityCoachHref,clarityHomeworkNotes} from '@/lib/coaching/clarity-course.mjs'
import {coachSessionHref} from '@/lib/coaching/persona-registry.mjs'
import {clarityResultProjection} from '@/lib/coaching/clarity-course-results.mjs'
import {gameProgress} from '@/lib/app/daybook-games.mjs'
import DaybookGames from './daybook-games'
import ClaritySemanticResult from '../clarity-semantic-result'
import {ClarityProtocolDocuments} from './clarity-course-protocol'
import css from './clarity-program.module.css'
const COPY={
 en:{title:'My Coaching Courses',back:'All courses',free:'Free',paid:'Paid',ready:'Ready',in_progress:'In progress',completed:'Completed',open:'Open Daybook',session:'Session',protocol:'Course protocol',results:'Session results',draft:'Saved draft — not a reviewed report',empty:'No saved dialogue yet',notes:'Personal notes',practices:'Practices',homework:'Homework',load:'Load more',loading:'Loading…',retry:'Retry',error:'Could not verify saved data.',legacy:'Earlier workbook & archive',unavailable:'New purchases and live sessions are not available yet.',client:'You',coach:'Coach',duplicate:'Conflicting notes. Review your journal.',not_started:'Not started',active:'Active',paused:'Paused',time_limit:'20 minutes completed',minutes:'min'},
 ru:{title:'Мои курсы коучинга',back:'Все курсы',free:'Бесплатный',paid:'Платный',ready:'Готов к началу',in_progress:'В процессе',completed:'Завершён',open:'Открыть Daybook',session:'Сессия',protocol:'Протокол курса',results:'Результаты сессии',draft:'Сохранённый черновик — без итоговой проверки',empty:'Пока нет сохранённого диалога',notes:'Личные заметки',practices:'Практики',homework:'Домашнее задание',load:'Загрузить ещё',loading:'Загрузка…',retry:'Повторить',error:'Не удалось проверить сохранённые данные.',legacy:'Предыдущая рабочая тетрадь и архив',unavailable:'Покупка новых курсов и живые сессии пока недоступны.',client:'Вы',coach:'Коуч',duplicate:'Записи конфликтуют. Проверьте дневник.',not_started:'Не начата',active:'Активна',paused:'Пауза',time_limit:'20 минут завершены',minutes:'мин'},
 es:{title:'Mis cursos de coaching',back:'Todos los cursos',free:'Gratis',paid:'De pago',ready:'Listo',in_progress:'En curso',completed:'Completado',open:'Abrir Daybook',session:'Sesión',protocol:'Protocolo del curso',results:'Resultados de la sesión',draft:'Borrador guardado, sin revisión final',empty:'Todavía no hay diálogo guardado',notes:'Notas personales',practices:'Prácticas',homework:'Tarea',load:'Cargar más',loading:'Cargando…',retry:'Reintentar',error:'No se pudieron verificar los datos guardados.',legacy:'Cuaderno anterior y archivo',unavailable:'Las compras y sesiones en directo aún no están disponibles.',client:'Tú',coach:'Coach',duplicate:'Notas en conflicto. Revisa tu diario.',not_started:'No iniciada',active:'Activa',paused:'En pausa',time_limit:'20 minutos completados',minutes:'min'}
}
const minutes=ms=>Math.floor(ms/60000)
function SessionData({run,day,accountId,locale,entries,hasMore,loadingAll,loadError,onLoadAll,onSessionLost,renderReflection,t}){
 const [state,setState]=useState({phase:'loading'}),[retry,setRetry]=useState(0)
 const lost=useRef(onSessionLost);lost.current=onSessionLost
 useEffect(()=>{
  const controller=new AbortController()
  const q=new URLSearchParams({id:run.id,day:String(day.day),locale})
  setState({phase:'loading'})
  appFetch('clarity-course/runs?'+q,undefined,'GET',{accountId,signal:controller.signal}).then(data=>{
   if(controller.signal.aborted)return
   if(data?.courseRunId!==run.id||data.day!==day.day||data.protocolId!==day.protocolId||data.transcript&&(data.transcript.id!==day.protocolId||data.transcript.courseRunId!==run.id||!Array.isArray(data.transcript.turns))||data.sessionProtocol&&(data.sessionProtocol.id!==day.protocolId||data.sessionProtocol.day!==day.day||!Array.isArray(data.sessionProtocol.rows))||Boolean(data.transcript)!==Boolean(data.sessionProtocol)||data.result&&(data.result.id!==day.protocolId||data.sessionProtocol?.reviewed!==true))throw Error('INVALID_RUN_PROTOCOL')
   setState({phase:'ready',data})
  }).catch(e=>{
   if(controller.signal.aborted)return
   if(e.status===401||e.status===403||e.code==='ACCOUNT_CHANGED'){lost.current();return}
   setState({phase:'error'})
  })
  return()=>controller.abort()
 },[run.id,day.day,day.protocolId,accountId,locale,retry])
 if(state.phase==='loading')return <p role="status">{t.loading}</p>
 if(state.phase==='error')return <><p role="alert">{t.error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></>
 const {transcript,sessionProtocol,result}=state.data
 // A finished clock and an acknowledged saved transcript are different facts.
 // Reopen the exact original coach/day for report review, never a new course.
 const completedUnreviewed=Boolean(transcript&&!transcript.reviewed&&day.status==='time_limit'&&day.elapsedMs===1200000&&day.remainingMs===0)
 const reviewHref=completedUnreviewed?coachSessionHref(locale,transcript.personaId):null
 const projection=result?clarityResultProjection(result,entries,{journalComplete:!hasMore}):null
 return <div className={css.practiceBody}>
  {transcript?<><p>{new Date(transcript.updatedAt).toLocaleDateString(locale)}{!transcript.reviewed?' · '+(completedUnreviewed?({en:'Protocol saved · results awaiting review',ru:'Протокол сохранён · итоги ожидают проверки',es:'Protocolo guardado · resultados pendientes de revisión'})[locale]:t.draft):''}</p>
   <ClarityProtocolDocuments sessionProtocol={sessionProtocol} log={transcript} locale={locale} timedEnd={completedUnreviewed}/>
   {reviewHref&&<Link prefetch={false} data-clarity-review-completed href={clarityCoachHref(reviewHref,day.day,run.id)}>{({en:'Open saved session results',ru:'Открыть итоги сохранённой сессии',es:'Abrir resultados de la sesión guardada'})[locale]}</Link>}
   {!transcript.reviewed&&day.status==='paused'&&run.currentDay===day.day&&<Link prefetch={false} href={clarityCoachHref('/'+locale+'/my-coach',day.day,run.id)}>{({en:'Continue saved session by text',ru:'Продолжить сохранённую сессию текстом',es:'Continuar sesión guardada por texto'})[locale]}</Link>}</>:<><p>{t.empty}</p>{day.status==='not_started'&&day.elapsedMs===0&&run.currentDay===day.day&&<Link prefetch={false} data-clarity-start-bound-day href={clarityCoachHref('/'+locale+'/my-coach',day.day,run.id)}>{({en:'Choose coach for this session',ru:'Выбрать коуча для этой сессии',es:'Elegir coach para esta sesión'})[locale]}</Link>}</>}
  {result&&<section><h3>{t.results}</h3><ClaritySemanticResult day={day.day} rows={projection.rows} locale={locale}/>
   <dl>{projection.rows.map(row=><div key={row.id}><dt>{row.label}</dt><dd>{row.quote||'—'}</dd></div>)}</dl>
   {projection.assigned.length>0&&<section><h4>{t.homework} · {projection.homeworkDone}/{projection.homeworkTotal}</h4>
    {hasMore?<><button type="button" disabled={loadingAll} onClick={onLoadAll}>{loadingAll?t.loading:t.load}</button>{loadError&&<p role="alert">{t.error}</p>}</>:projection.assigned.map(row=>{
     const notes=clarityHomeworkNotes(entries,result.id,row.id)
     return <div key={row.id}>{notes.length>1?<p role="alert">{t.duplicate}</p>:renderReflection({key:notes[0]?.id||row.id,day:day.day,entry:notes[0],courseRunId:run.id,homework:{reportId:result.id,row}})}</div>
    })}</section>}
  </section>}
 </div>
}
function RunDetail({run,accountId,locale,entries,hasMore,loadingAll,loadError,onLoadAll,onSaved,onSessionLost,renderReflection,t,onBack,initialDay=null}){
 const scoped=clarityRunNotes(entries,run.id)
 const [open,setOpen]=useState(initialDay),[gameDay,setGameDay]=useState(null)
 if(gameDay)return <DaybookGames key={run.id+':'+gameDay} courseRunId={run.id} day={gameDay} accountId={accountId} locale={locale} entries={entries} hasMore={hasMore} loadingAll={loadingAll} loadError={loadError} onLoadAll={onLoadAll} onSaved={onSaved} onSessionLost={onSessionLost} onClose={()=>setGameDay(null)} onNextDay={()=>setGameDay(n=>Math.min(n+1,3))}/>
 return <section data-clarity-run={run.id} className={css.practiceBody}>
  <button type="button" onClick={onBack}>{t.back}</button>
  <h2>Clarity &amp; Support · #{run.ordinal}</h2>
  <p>{t[run.access]} · {t[run.status]} · {minutes(run.totalElapsedMs)}/60 {t.minutes}</p>
  <h3>{t.protocol}</h3>
  {run.days.map(day=>{
   const notes=clarityDayNotes(scoped,day.day),progress=gameProgress(entries,day.day,run.id)
   return <article key={day.day} className={css.practice}>
    <button type="button" aria-expanded={open===day.day} onClick={()=>setOpen(n=>n===day.day?null:day.day)}><strong>{t.session} {day.day} · {CLARITY_SYLLABUS[locale][day.day-1][0]}</strong></button>
    <p>{minutes(day.elapsedMs)}/20 {t.minutes} · {t[day.status]}</p><progress value={day.elapsedMs} max={1200000} aria-label={t.session+' '+day.day}/>
    {open===day.day&&<>
     <SessionData key={run.id+':'+day.day} run={run} day={day} accountId={accountId} locale={locale} entries={scoped} hasMore={hasMore} loadingAll={loadingAll} loadError={loadError} onLoadAll={onLoadAll} onSessionLost={onSessionLost} renderReflection={renderReflection} t={t}/>
     <details><summary>{t.notes}</summary>{hasMore?<button type="button" disabled={loadingAll} onClick={onLoadAll}>{t.load}</button>:notes.length>1?<p role="alert">{t.duplicate}</p>:renderReflection({key:notes[0]?.id||run.id+':'+day.day,courseRunId:run.id,day:day.day,entry:notes[0]})}</details>
     <button type="button" onClick={()=>setGameDay(day.day)}>{t.practices} · {progress.done}/{progress.total}</button>
    </>}
   </article>
  })}
  <p>{t.unavailable}</p>
 </section>
}
export default function ClarityRunCatalog({initialCatalog,accountId,locale,onLegacy,onSessionLost,initialRunId=null,initialDay=null,...props}){
 const t=COPY[locale]||COPY.en
 const [page,setPage]=useState(initialCatalog),[selected,setSelected]=useState(initialRunId),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
 const controller=useRef(null),lost=useRef(onSessionLost);lost.current=onSessionLost
 const [detail,setDetail]=useState({phase:'idle'}),[detailRetry,setDetailRetry]=useState(0)
 useEffect(()=>()=>controller.current?.abort(),[])
 useEffect(()=>{
  if(!selected)return
  const abort=new AbortController()
  setDetail({phase:'loading',id:selected})
  appFetch('clarity-course/runs?id='+encodeURIComponent(selected),undefined,'GET',{accountId,signal:abort.signal}).then(data=>{
   if(abort.signal.aborted)return
   if(!validClarityRunSummary(data?.run,selected))throw Error('INVALID_RUN_SUMMARY')
   setDetail({phase:'ready',id:selected,run:data.run})
  }).catch(error=>{
   if(abort.signal.aborted)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){lost.current();return}
   setDetail({phase:'error',id:selected})
  })
  return()=>abort.abort()
 },[accountId,selected,detailRetry])
 async function more(){
  if(busy||!page.hasMore)return
  const abort=new AbortController();controller.current=abort;setBusy(true);setFailed(false)
  try{
   const data=await appFetch('clarity-course/runs?before='+page.nextCursor,undefined,'GET',{accountId,signal:abort.signal})
   if(abort.signal.aborted)return
   if(!Array.isArray(data?.runs)||data.runs.some(r=>page.runs.some(old=>old.id===r.id)))throw Error('INVALID_RUN_PAGE')
   setPage(old=>({...data,runs:[...old.runs,...data.runs]}))
  }catch(e){if(!abort.signal.aborted){if(e.status===401||e.status===403||e.code==='ACCOUNT_CHANGED')onSessionLost();else setFailed(true)}}
  finally{if(!abort.signal.aborted)setBusy(false)}
 }
 const run=selected&&detail.id===selected&&detail.phase==='ready'?detail.run:null
 return <div data-clarity-run-catalog style={{height:'100dvh',overflowY:'auto',padding:'16px'}}>
  {selected?(run?<RunDetail key={run.id} initialDay={run.id===initialRunId?initialDay:null} run={run} accountId={accountId} locale={locale} t={t} onSessionLost={onSessionLost} onBack={()=>setSelected(null)} {...props}/>:<section role="status"><button type="button" onClick={()=>setSelected(null)}>{t.back}</button><p>{detail.id===selected&&detail.phase==='error'?t.error:t.loading}</p>{detail.id===selected&&detail.phase==='error'&&<button type="button" onClick={()=>setDetailRetry(n=>n+1)}>{t.retry}</button>}</section>):<>
   <h1>{t.title}</h1>
   {page.runs.map(r=><article key={r.id} className={css.card}><h2>Clarity &amp; Support · #{r.ordinal}</h2><p>{new Date(r.createdAt).toLocaleDateString(locale)} · {t[r.access]} · {t[r.status]}</p><progress value={r.totalElapsedMs} max={3600000} aria-label={t.title}/><p>{minutes(r.totalElapsedMs)}/60 {t.minutes}</p><button type="button" className={css.primary} onClick={()=>setSelected(r.id)}>{t.open}</button></article>)}
   {page.hasMore&&<button type="button" disabled={busy} onClick={()=>void more()}>{busy?t.loading:failed?t.retry:t.load}</button>}
   {failed&&<p role="alert">{t.error}</p>}
   <p>{t.unavailable}</p><button type="button" onClick={onLegacy}>{t.legacy}</button>
  </>}
 </div>
}
