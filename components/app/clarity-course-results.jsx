'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import css from './clarity-program.module.css'
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
export function ClarityCourseResults({state,day,locale}){
 const t=words[locale]||words.en
 const reports=state.phase==='ready'?state.data.results.filter(r=>r.day===day):[]
 return <div className={css.practiceBody} data-clarity-session-results>
  {state.phase==='loading'?<p>{t.loading}</p>:state.phase==='error'?<><p role="alert">{t.failed}</p><button onClick={state.reload}>{t.retry}</button></>:<>
   {!reports.length&&<p>{t.empty}</p>}
   {reports.map(r=><article key={r.id} data-clarity-saved-result>
    <strong>{t.saved} · {new Date(r.savedAt).toLocaleDateString(locale)}</strong>
    {r.summary&&<p>{r.summary}</p>}{r.nextStep&&<p>{r.nextStep}</p>}
    {r.rows.length>0&&<dl>{r.rows.map(row=><div key={row.id}><dt>{row.label}</dt><dd>{row.quote||'—'}{row.coachId&&<small> · {row.coachId==='genie'?'Samir':row.coachId}</small>}</dd></div>)}</dl>}
    {r.homework.length>0&&<div data-clarity-homework><strong>{t.homework}</strong><ul>{r.homework.map(row=><li key={row.id}>{row.question}</li>)}</ul></div>}
   </article>)}
   {!state.data.complete&&<p>{t.partial}</p>}
  </>}
  <Link href={'/'+(locale==='es'?'en':locale)+'/app/my-coaching-plan?tab=reports'}>{t.archive}</Link>
 </div>
}
