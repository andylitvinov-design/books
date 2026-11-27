'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import css from './clarity-program.module.css'
const COPY={
 en:{empty:'No saved protocol for this day yet.',open:'Open protocol',close:'Close protocol',loading:'Loading protocol…',failed:'Could not open this protocol.',retry:'Retry',client:'You',coach:'Coach',interrupted:'Interrupted',unanswered:'Not answered',partial:'More reports may exist in the archive.',draft:'Unfinished session · saved privately',log:'Dialogue log',structured:'Session protocol',pendingResult:'Final results are not yet reviewed.',more:'Earlier unfinished sessions',confirmed:'Confirmed',needs_confirmation:'Needs confirmation',not_explored:'Not answered',skipped_by_client:'Skipped'},
 ru:{empty:'За этот день ещё нет сохранённого протокола.',open:'Открыть протокол',close:'Закрыть протокол',loading:'Загружаем протокол…',failed:'Не удалось открыть этот протокол.',retry:'Повторить',client:'Вы',coach:'Коуч',interrupted:'Прервано',unanswered:'Без ответа',partial:'В архиве могут быть более ранние отчёты.',draft:'Незавершённая сессия · сохранена в кабинете',log:'Лог диалога',structured:'Протокол сессии',pendingResult:'Итоговый результат ещё не проверен.',more:'Более ранние незавершённые сессии',confirmed:'Подтверждено',needs_confirmation:'Требует подтверждения',not_explored:'Нет ответа',skipped_by_client:'Пропущено'},
 es:{empty:'Todavía no hay un protocolo guardado para este día.',open:'Abrir protocolo',close:'Cerrar protocolo',loading:'Cargando protocolo…',failed:'No se pudo abrir este protocolo.',retry:'Reintentar',client:'Tú',coach:'Coach',interrupted:'Interrumpido',unanswered:'Sin respuesta',partial:'Puede haber informes anteriores en el archivo.',draft:'Sesión pendiente · guardada en privado',log:'Registro del diálogo',structured:'Protocolo de la sesión',pendingResult:'Los resultados finales aún no se han revisado.',more:'Sesiones pendientes anteriores',confirmed:'Confirmado',needs_confirmation:'Requiere confirmación',not_explored:'Sin respuesta',skipped_by_client:'Omitido'}
}
export function ClarityProtocolDocuments({sessionProtocol,log,locale}){
 const t=COPY[locale]||COPY.en
 return <>
  {sessionProtocol&&<section data-clarity-structured-protocol>
   <h3>{t.structured}</h3>
   {!sessionProtocol.reviewed&&<p role="status">{t.draft} · {t.pendingResult}</p>}
   <dl>{sessionProtocol.rows.map(row=><div key={row.id} data-clarity-protocol-status={row.status}>
    <dt><strong>{row.label}</strong></dt><dd style={{margin:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>
     <p>{row.question}</p>{row.quote&&<p>{row.quote}</p>}
     <small>{t[row.status]||row.status}{row.coachId?' · '+t.coach+' '+row.coachId:''}</small>
    </dd>
   </div>)}</dl>
  </section>}
  {log&&<details data-clarity-dialogue-log><summary>{t.log}</summary><ol data-clarity-transcript>{log.turns.map((row,i)=><li key={i}>
   <strong>{row.role==='assistant'?t.coach+' · '+row.personaId:t.client}</strong>
   {row.interrupted&&<small> · {t.interrupted}</small>}{row.unanswered&&<small> · {t.unanswered}</small>}
   <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.content}</p>
  </li>)}</ol></details>}
 </>
}
function ProtocolItem({report,accountId,locale,onSessionLost}){
 const t=COPY[locale]||COPY.en
 const [state,setState]=useState({phase:'closed'})
 const abortRef=useRef(null)
 useEffect(()=>()=>abortRef.current?.abort(),[])
 async function open(){
  abortRef.current?.abort()
  const controller=new AbortController();abortRef.current=controller
  setState({phase:'loading'})
  try{
   const q=new URLSearchParams({id:report.id,day:String(report.day),locale})
   const {protocol,sessionProtocol}=await appFetch('clarity-course/protocol?'+q.toString(),undefined,'GET',{accountId,signal:controller.signal})
   if(controller.signal.aborted)return
   if(protocol?.id!==report.id||protocol.day!==report.day||!Array.isArray(protocol.turns)||sessionProtocol?.id!==report.id||sessionProtocol.day!==report.day||!Array.isArray(sessionProtocol.rows))throw Error('INVALID_PROTOCOL')
   setState({phase:'ready',protocol,sessionProtocol})
  }catch(error){
   if(controller.signal.aborted)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){onSessionLost();return}
   setState({phase:'error'})
  }
 }
 function close(){abortRef.current?.abort();setState({phase:'closed'})}
 return <section data-clarity-protocol-item>
  <p>{new Date(report.savedAt||report.updatedAt).toLocaleDateString(locale)} · {report.personaId}{report.draft?' · '+t.draft:''}</p>
  {state.phase==='closed'?<button type="button" onClick={()=>void open()}>{t.open}</button>:
   <button type="button" onClick={close}>{t.close}</button>}
  {state.phase==='loading'&&<p role="status">{t.loading}</p>}
  {state.phase==='error'&&<><p role="alert">{t.failed}</p><button type="button" onClick={()=>void open()}>{t.retry}</button></>}
  {state.phase==='ready'&&<ClarityProtocolDocuments sessionProtocol={state.sessionProtocol} log={state.protocol} locale={locale}/>}
 </section>
}
function DraftProtocols({day,locale,accountId,onSessionLost,reports}){
 const t=COPY[locale]||COPY.en
 const [page,setPage]=useState({owner:null,items:[],cursor:null,phase:'loading'}),[retry,setRetry]=useState(0)
 const abortRef=useRef(null),lost=useRef(onSessionLost);lost.current=onSessionLost
 function load(cursor=null){
  abortRef.current?.abort()
  const controller=new AbortController();abortRef.current=controller
  setPage(old=>({...old,phase:'loading'}))
  const q=new URLSearchParams({day:String(day),...(cursor||{})})
  appFetch('clarity-course/protocol?'+q.toString(),undefined,'GET',{accountId,signal:controller.signal}).then(data=>{
   if(controller.signal.aborted)return
   if(!Array.isArray(data?.drafts)||typeof data.hasMore!=='boolean'||data.hasMore&&!data.nextCursor||data.drafts.some(row=>row.courseSessionId!=='clarity_day_'+day||typeof row.id!=='string'))throw Error('INVALID_DRAFT_LIST')
   setPage(old=>({owner:accountId,items:cursor&&old.owner===accountId?[...new Map([...old.items,...data.drafts].map(row=>[row.id,row])).values()]:data.drafts,cursor:data.hasMore?data.nextCursor:null,phase:'ready'}))
  }).catch(error=>{
   if(controller.signal.aborted)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){lost.current();return}
   setPage(old=>({...old,phase:'error'}))
  })
 }
 useEffect(()=>{setPage({owner:null,items:[],cursor:null,phase:'loading'});load();return()=>abortRef.current?.abort()},[accountId,day,retry])
 const items=page.owner===accountId?page.items.filter(item=>!reports.some(row=>row.id===item.id)):[]
 return <div data-clarity-unfinished-protocols>
  {items.map(item=><ProtocolItem key={accountId+':'+item.id} report={{...item,day,draft:true}} locale={locale} accountId={accountId} onSessionLost={onSessionLost}/>)}
  {page.phase==='loading'&&<p role="status">{t.loading}</p>}
  {page.phase==='error'&&<><p role="alert">{t.failed}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></>}
  {page.phase==='ready'&&!items.length&&!reports.length&&!page.cursor&&<p>{t.empty}</p>}
  {page.cursor&&<button type="button" disabled={page.phase==='loading'} onClick={()=>load(page.cursor)}>{t.more}</button>}
 </div>
}
export default function ClarityCourseProtocol({state,day,locale,accountId,onSessionLost}){
 const t=COPY[locale]||COPY.en
 const reports=state.phase==='ready'?state.data.results.filter(r=>r.day===day):[]
 return <div className={css.practiceBody} data-clarity-course-protocol>
  {state.phase==='loading'?<p>{t.loading}</p>:state.phase==='error'?<><p role="alert">{t.failed}</p><button type="button" onClick={state.reload}>{t.retry}</button></>:<>
   {reports.map(r=><ProtocolItem key={accountId+':'+r.id} report={r} locale={locale} accountId={accountId} onSessionLost={onSessionLost}/>)}
   <DraftProtocols key={accountId+':'+day} day={day} locale={locale} accountId={accountId} onSessionLost={onSessionLost} reports={reports}/>
   {!state.data.complete&&<p>{t.partial}</p>}
  </>}
 </div>
}
