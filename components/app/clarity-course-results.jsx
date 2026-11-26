'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import css from './clarity-program.module.css'
import {clarityResultProjection} from '@/lib/coaching/clarity-course-results.mjs'
import ClaritySemanticResult from '../clarity-semantic-result'
const words={
 en:{archive:'Open private archive',empty:'No reviewed result for this day yet.',loading:'Loading session results…',retry:'Retry',failed:'Could not verify results or session access.',partial:'More reports may exist in the archive.',used:'Free voice window already issued; open your saved draft in My Coach to review and save.',busy:'A voice session is starting. Try later.',off:'Free voice sessions are not enabled yet.',ready:'One free voice window, up to 20 minutes, subject to availability.',saved:'Saved review (not completion proof)',homework:'Optional homework after the timed session'},
 ru:{archive:'Открыть личный архив',empty:'За этот день ещё нет сохранённого результата.',loading:'Загружаем результаты сессии…',retry:'Повторить',failed:'Не удалось проверить результаты или доступность сессии.',partial:'В архиве могут быть более ранние отчёты.',used:'Бесплатное голосовое окно уже выдано; откройте черновик в My Coach для проверки и сохранения.',busy:'Сессия запускается. Попробуйте позже.',off:'Бесплатные голосовые сессии пока не включены.',ready:'Одно бесплатное голосовое окно до 20 минут при наличии доступного лимита.',saved:'Сохранённый отчёт (не подтверждение завершения)',homework:'Домашнее задание после завершения по времени'},
 es:{archive:'Abrir archivo privado',empty:'Todavía no hay un resultado revisado para este día.',loading:'Cargando resultados…',retry:'Reintentar',failed:'No se pudieron verificar los resultados o el acceso.',partial:'Puede haber informes anteriores en el archivo.',used:'Ya se emitió la ventana gratuita; abre el borrador guardado en My Coach para revisarlo y guardarlo.',busy:'Se está iniciando una sesión. Inténtalo más tarde.',off:'Las sesiones de voz gratuitas aún no están activadas.',ready:'Una ventana de voz gratuita de hasta 20 minutos, sujeta a disponibilidad.',saved:'Informe guardado (no prueba de finalización)',homework:'Tarea opcional tras finalizar por tiempo'}
}
export function useClarityResults(accountId,locale,onSessionLost){
 const [state,setState]=useState({phase:'loading'}),[retry,setRetry]=useState(0)
 const lostRef=useRef(onSessionLost);lostRef.current=onSessionLost
 useEffect(()=>{
  const controller=new AbortController()
  setState({phase:'loading'})
  appFetch('clarity-course?locale='+locale,undefined,'GET',{accountId,signal:controller.signal}).then(data=>{
   if(controller.signal.aborted)return
   if(!Array.isArray(data?.results)||!data?.grant||typeof data.complete!=='boolean')throw Error('INVALID_RESULTS')
   setState({phase:'ready',data})
  }).catch(error=>{
   if(controller.signal.aborted)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){lostRef.current();return}
   setState({phase:'error'})
  })
  return()=>controller.abort()
 },[accountId,locale,retry])
 return {...state,reload:()=>setRetry(v=>v+1)}
}
export function ClarityCourseStatus({state,day,locale}){
 const t=words[locale]||words.en
 if(state.phase==='loading')return <small role="status">{t.loading}</small>
 if(state.phase!=='ready')return <small role="alert">{t.failed}</small>
 const g=state.data.grant
 return <small role="status">{!g.enabled?t.off:g.usedDays.includes(day)?t.used:g.busyDays.includes(day)?t.busy:t.ready}</small>
}
const resultCopy={
 en:{coverage:'Answers recorded',confirmed:'Confirmed in the protocol',self_reported:'Completed independently',needs_confirmation:'Needs confirmation',not_explored:'Not answered',skipped_by_client:'Skipped by you',unchecked:'Load saved homework to update the result.',conflict:'Conflicting homework notes; review in journal.',load:'Load saved homework',loadFailed:'Could not load all notes.',original:'Original session notes'},
 ru:{coverage:'Ответы сохранены',confirmed:'Подтверждено в протоколе',self_reported:'Выполнено самостоятельно',needs_confirmation:'Требуется подтверждение',not_explored:'Нет ответа',skipped_by_client:'Пропущено вами',unchecked:'Загрузите сохранённые задания, чтобы обновить результат.',conflict:'Несколько ответов на один вопрос; проверьте дневник.',load:'Загрузить сохранённые задания',loadFailed:'Не удалось загрузить все записи.',original:'Исходные итоги разговора'},
 es:{coverage:'Respuestas guardadas',confirmed:'Confirmado en el protocolo',self_reported:'Completado por tu cuenta',needs_confirmation:'Requiere confirmación',not_explored:'Sin respuesta',skipped_by_client:'Omitido por ti',unchecked:'Carga las tareas guardadas para actualizar el resultado.',conflict:'Respuestas duplicadas; revisa el diario.',load:'Cargar tareas guardadas',loadFailed:'No se pudieron cargar todas las notas.',original:'Notas originales de la sesión'}
}
function ResultDiagram({projection,t}){
 const colors={confirmed:'#43776a',self_reported:'#9c7043',needs_confirmation:'#e7cc9e',not_explored:'#ded8cd',skipped_by_client:'#9b9994'}
 return <section data-clarity-result-diagram aria-label={t.coverage}>
  <p role="status"><strong>{t.coverage}: {projection.answered}/{projection.total}</strong></p>
  <div aria-hidden="true" style={{display:'grid',gridTemplateColumns:'repeat('+Math.max(1,projection.total)+', minmax(0,1fr))',gap:4}}>
   {projection.active.map(row=><span key={row.id} style={{height:12,borderRadius:4,background:colors[row.status]||colors.not_explored}}/>)}
  </div>
  <div style={{display:'grid',gap:4,marginTop:8}}>{Object.keys(colors).map(status=>{
   const count=projection.active.filter(row=>row.status===status).length
   return count>0?<small key={status}><span aria-hidden="true" style={{display:'inline-block',width:10,height:10,background:colors[status],borderRadius:2,marginInlineEnd:6}}/>{t[status]}: {count}</small>:null
  })}</div>
 </section>
}
export function ClarityCourseResults({state,day,locale,entries=[],hasMore=true,loadingAll=false,onLoadAll,loadError=false}){
 const t=words[locale]||words.en
 const reports=state.phase==='ready'?state.data.results.filter(r=>r.day===day):[]
 const labels=resultCopy[locale]||resultCopy.en
 return <div className={css.practiceBody} data-clarity-session-results>
  {state.phase==='loading'?<p>{t.loading}</p>:state.phase==='error'?<><p role="alert">{t.failed}</p><button onClick={state.reload}>{t.retry}</button></>:<>
   {!reports.length&&<p>{t.empty}</p>}
   {reports.map(r=>{const projection=clarityResultProjection(r,entries,{journalComplete:!hasMore});return <article key={r.id} data-clarity-saved-result>
    <strong>{t.saved} · {new Date(r.savedAt).toLocaleDateString(locale)}</strong>
    <ClaritySemanticResult day={day} rows={projection.rows} locale={locale}/>
    <ResultDiagram projection={projection} t={labels}/>
    {hasMore&&r.homework.length>0&&<><p role="status">{labels.unchecked}</p><button type="button" disabled={loadingAll} onClick={onLoadAll}>{loadingAll?t.loading:labels.load}</button>{loadError&&<p role="alert">{labels.loadFailed}</p>}</>}
    {projection.rows.length>0&&<dl>{projection.rows.map(row=><div key={row.id} data-clarity-answer-source={row.source||'unresolved'}><dt><strong>{row.label}</strong>{row.archived&&<small> · {labels.original}</small>}</dt><dd style={{margin:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.quote&&<p>{row.quote}</p>}<small>{labels[row.status]}</small>{row.homeworkState==='conflict'&&<p role="alert">{labels.conflict}</p>}</dd></div>)}</dl>}
    {(r.summary||r.nextStep)&&<details><summary>{labels.original}</summary>{r.summary&&<p>{r.summary}</p>}{r.nextStep&&<p>{r.nextStep}</p>}</details>}
   </article>})}
   {!state.data.complete&&<p>{t.partial}</p>}
  </>}
  <Link href={'/'+(locale==='es'?'en':locale)+'/app/my-coaching-plan?tab=reports'}>{t.archive}</Link>
 </div>
}
