'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import css from './clarity-program.module.css'
const COPY={
 en:{empty:'No saved protocol for this day yet.',open:'Open protocol',close:'Close protocol',loading:'Loading protocol…',failed:'Could not open this protocol.',retry:'Retry',client:'You',coach:'Coach',interrupted:'Interrupted',unanswered:'Not answered',partial:'More reports may exist in the archive.'},
 ru:{empty:'За этот день ещё нет сохранённого протокола.',open:'Открыть протокол',close:'Закрыть протокол',loading:'Загружаем протокол…',failed:'Не удалось открыть протокол.',retry:'Повторить',client:'Вы',coach:'Коуч',interrupted:'Прервано',unanswered:'Без ответа',partial:'В архиве могут быть более ранние отчёты.'},
 es:{empty:'Todavía no hay un protocolo guardado para este día.',open:'Abrir protocolo',close:'Cerrar protocolo',loading:'Cargando protocolo…',failed:'No se pudo abrir el protocolo.',retry:'Reintentar',client:'Tú',coach:'Coach',interrupted:'Interrumpido',unanswered:'Sin respuesta',partial:'Puede haber informes anteriores en el archivo.'}
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
   const q=new URLSearchParams({id:report.id,day:String(report.day)})
   const {protocol}=await appFetch('clarity-course/protocol?'+q.toString(),undefined,'GET',{accountId,signal:controller.signal})
   if(controller.signal.aborted)return
   if(protocol?.id!==report.id||protocol.day!==report.day||!Array.isArray(protocol.turns))throw Error('INVALID_PROTOCOL')
   setState({phase:'ready',protocol})
  }catch(error){
   if(controller.signal.aborted)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){onSessionLost();return}
   setState({phase:'error'})
  }
 }
 function close(){abortRef.current?.abort();setState({phase:'closed'})}
 return <section data-clarity-protocol-item>
  <p>{new Date(report.savedAt).toLocaleDateString(locale)} · {report.personaId}</p>
  {state.phase==='closed'?<button type="button" onClick={()=>void open()}>{t.open}</button>:
   <button type="button" onClick={close}>{t.close}</button>}
  {state.phase==='loading'&&<p role="status">{t.loading}</p>}
  {state.phase==='error'&&<><p role="alert">{t.failed}</p><button type="button" onClick={()=>void open()}>{t.retry}</button></>}
  {state.phase==='ready'&&<ol data-clarity-transcript>{state.protocol.turns.map((row,i)=><li key={i}>
   <strong>{row.role==='assistant'?t.coach+' · '+row.personaId:t.client}</strong>
   {row.interrupted&&<small> · {t.interrupted}</small>}{row.unanswered&&<small> · {t.unanswered}</small>}
   <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.content}</p>
  </li>)}</ol>}
 </section>
}
export default function ClarityCourseProtocol({state,day,locale,accountId,onSessionLost}){
 const t=COPY[locale]||COPY.en
 const reports=state.phase==='ready'?state.data.results.filter(r=>r.day===day):[]
 return <div className={css.practiceBody} data-clarity-course-protocol>
  {state.phase==='loading'?<p>{t.loading}</p>:state.phase==='error'?<><p role="alert">{t.failed}</p><button type="button" onClick={state.reload}>{t.retry}</button></>:<>
   {!reports.length&&<p>{t.empty}</p>}
   {reports.map(r=><ProtocolItem key={accountId+':'+r.id} report={r} locale={locale} accountId={accountId} onSessionLost={onSessionLost}/>)}
   {!state.data.complete&&<p>{t.partial}</p>}
  </>}
 </div>
}
