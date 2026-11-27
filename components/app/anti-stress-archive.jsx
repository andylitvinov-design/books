'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {ANTI_STRESS_COURSE} from '@/lib/coaching/anti-stress-course.mjs'
import AntiStressResult from '../anti-stress-result'
import AntiStressMemoryPanel from './anti-stress-memory-panel'
import AntiStressLivePanel from './anti-stress-live-panel'
import styles from './anti-stress-archive.module.css'
const copy={
 en:{title:'My Anti-Stress courses',result:'Result',protocol:'Protocol',log:'Dialogue',loading:'Loading…',error:'Could not verify saved data.',retry:'Retry',more:'Load more',missing:'Not recorded',client:'You',coach:'Coach',minutes:'min',states:{not_started:'Not started',active:'Active',paused:'Paused',time_limit:'Time completed',confirmed:'Confirmed',skipped:'Skipped',not_explored:'Not explored',needs_confirmation:'Needs confirmation'}},
 ru:{title:'Мои антистресс-курсы',result:'Результат',protocol:'Протокол',log:'Диалог',loading:'Загрузка…',error:'Не удалось проверить сохранённые данные.',retry:'Повторить',more:'Загрузить ещё',missing:'Не записано',client:'Вы',coach:'Коуч',minutes:'мин',states:{not_started:'Не начато',active:'Активно',paused:'Пауза',time_limit:'Время завершено',confirmed:'Подтверждено',skipped:'Пропущено',not_explored:'Не обсуждалось',needs_confirmation:'Нужно подтверждение'}},
 es:{title:'Mis cursos antiestrés',result:'Resultado',protocol:'Protocolo',log:'Diálogo',loading:'Cargando…',error:'No se pudieron verificar los datos guardados.',retry:'Reintentar',more:'Cargar más',missing:'No registrado',client:'Tú',coach:'Coach',minutes:'min',states:{not_started:'No iniciada',active:'Activa',paused:'En pausa',time_limit:'Tiempo completado',confirmed:'Confirmado',skipped:'Omitido',not_explored:'No explorado',needs_confirmation:'Pendiente de confirmación'}}
}
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const validRun=r=>r?.programId===ANTI_STRESS_COURSE.id&&r.programType==='therapy'&&uuid(r.id)&&Number.isSafeInteger(r.totalElapsedMs)&&r.totalElapsedMs>=0&&r.totalElapsedMs<=2700000&&Array.isArray(r.days)&&r.days.length===3&&r.days.every((d,i)=>d.sessionId===ANTI_STRESS_COURSE.sessions[i].id&&uuid(d.protocolId)&&Number.isSafeInteger(d.elapsedMs)&&d.elapsedMs>=0&&d.elapsedMs<=900000)
function MeditationEditor({accountId,locale,run,day,meditation,onSaved,t}){
 const words=({en:['Edit meditation','Save','Cancel','Decline meditation','Needs review','Saved'],ru:['Редактировать медитацию','Сохранить','Отмена','Отказаться от медитации','Нужно уточнение','Сохранено'],es:['Editar meditación','Guardar','Cancelar','Rechazar meditación','Necesita revisión','Guardada']}[locale])
 const [editing,setEditing]=useState(false),[body,setBody]=useState(meditation.body||''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[confirm,setConfirm]=useState(false)
 const pending=useRef(null)
 useEffect(()=>()=>pending.current?.abort(),[])
 async function send(type){
  if(pending.current)return
  const c=new AbortController();pending.current=c;setBusy(true);setError(false)
  try{
   const data=await appFetch('anti-stress/session',{runId:run.id,protocolId:day.protocolId,type,expectedRevision:meditation.revision,...(type==='save'?{body}:{})},'PATCH',{accountId,signal:c.signal})
   if(c.signal.aborted)return
   const m=data?.meditation
   if(m?.courseRunId!==run.id||m.protocolId!==day.protocolId||m.revision!==meditation.revision+1||m.status!==(type==='save'?'saved':'declined'))throw Error('binding')
   onSaved()
  }catch{if(!c.signal.aborted)setError(true)}
  finally{if(!c.signal.aborted){pending.current=null;setBusy(false)}}
 }
 if(meditation.status==='declined')return null
 if(meditation.status==='needs_review')return <div><p>{words[4]}</p>
  {confirm?<div><button type="button" disabled={busy} onClick={()=>send('decline')}>{words[3]}</button><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>{words[2]}</button></div>:<button type="button" disabled={busy} onClick={()=>setConfirm(true)}>{words[3]}</button>}
  {error&&<p role="alert">{t.error}</p>}
 </div>
 if(!['draft','saved'].includes(meditation.status)||typeof meditation.body!=='string')return null
 return <div><h4>{meditation.title}</h4>{meditation.status==='saved'&&<p>{words[5]}</p>}
  {editing?<div><textarea aria-label={words[0]} value={body} rows={8} maxLength={12000} disabled={busy} onChange={e=>setBody(e.target.value)}/><button type="button" disabled={busy||!body.trim()} onClick={()=>send('save')}>{words[1]}</button><button type="button" disabled={busy} onClick={()=>{setEditing(false);setBody(meditation.body)}}>{words[2]}</button></div>:<div>{meditation.body.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}<button type="button" disabled={busy||confirm} onClick={()=>setEditing(true)}>{words[0]}</button>{meditation.status==='draft'&&<button type="button" disabled={busy||confirm} onClick={()=>send('save')}>{words[1]}</button>}</div>}
  {confirm?<div><button type="button" disabled={busy} onClick={()=>send('decline')}>{words[3]}</button><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>{words[2]}</button></div>:<button type="button" disabled={busy||editing} onClick={()=>setConfirm(true)}>{words[3]}</button>}
  {error&&<p role="alert">{t.error}</p>}
 </div>
}
function SessionView({accountId,locale,run,day,t}){
 const [view,setView]=useState('result'),[retry,setRetry]=useState(0),[state,setState]=useState(null)
 useEffect(()=>{
  const c=new AbortController();let live=true
  setState(null)
  const q=new URLSearchParams({runId:run.id,sessionId:day.sessionId,locale,view})
  appFetch('anti-stress/session?'+q,undefined,'GET',{accountId,signal:c.signal}).then(data=>{
   if(!live)return
   if(data?.binding?.courseRunId!==run.id||data.binding.sessionId!==day.sessionId||data.binding.protocolId!==day.protocolId||data.binding.programType!=='therapy'||data.run?.id!==run.id)throw Error('binding')
   setState({view,data})
  }).catch(()=>{if(live)setState({view,error:true})})
  return()=>{live=false;c.abort()}
 },[accountId,locale,run.id,day.sessionId,day.protocolId,view,retry])
 const data=state?.view===view?state.data:null
 return <div className={styles.session}>
  <AntiStressMemoryPanel key={accountId+':'+day.protocolId} accountId={accountId} exclude={day.protocolId} locale={locale}/>
  {process.env.NEXT_PUBLIC_HH_ANTI_STRESS_LIVE_ENABLED==='true'&&data&&data.run.currentDay===day.day&&data.run.access==='free'&&['paused','not_started'].includes(data.run.days[day.day-1]?.status)&&<AntiStressLivePanel key={accountId+':'+day.protocolId+':'+retry} accountId={accountId} locale={locale} run={data.run} day={data.run.days[day.day-1]} onRefresh={()=>setRetry(n=>n+1)}/>}
  <div className={styles.tabs}>{['result','protocol','log'].map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>{setState(null);setView(v);if(view===v)setRetry(n=>n+1)}}>{t[v]}</button>)}</div>
  {state?.view===view&&state.error?<p role="alert">{t.error} <button type="button" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></p>:!data?<p>{t.loading}</p>:view==='result'?<><AntiStressResult result={data.result} locale={locale} hideMeditation/>{data.result?.meditation&&<MeditationEditor key={data.result.meditation.revision} accountId={accountId} locale={locale} run={run} day={day} meditation={data.result.meditation} onSaved={()=>setRetry(n=>n+1)} t={t}/>}</>:view==='protocol'?<dl>{data.protocol?.rows?.map(row=><div key={row.fieldId}><dt>{row.label} · {t.states[row.status]||t.missing}</dt><dd>{row.value===null||row.value===undefined?t.missing:String(row.value)}</dd></div>)}</dl>:data.log?.turns?.length?<div>{data.log.turns.map(turn=><p key={turn.turnId}><strong>{turn.role==='client'?t.client:(turn.coachId||t.coach)}</strong> — {turn.text}</p>)}</div>:<p>{t.missing}</p>}
 </div>
}
export default function AntiStressArchive({accountId,locale='en',runId=null}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const [state,setState]=useState(null),[open,setOpen]=useState(null),[retry,setRetry]=useState(0)
 const generation=useRef(0),activeOwner=useRef(accountId);activeOwner.current=accountId
 const abort=useRef(null)
 useEffect(()=>{
  const g=++generation.current;setState(null);setOpen(null)
  if(!accountId)return
  if(runId!==null&&!uuid(runId)){setState({accountId,error:true});return}
  const c=new AbortController();abort.current=c
  const path=runId===null?'anti-stress/session?view=catalog':'anti-stress/session?view=run&runId='+encodeURIComponent(runId)
  appFetch(path,undefined,'GET',{accountId,signal:c.signal}).then(data=>{
   if(g!==generation.current||activeOwner.current!==accountId)return
   if(runId!==null){
    if(!validRun(data.run)||data.run.id!==runId)throw Error('binding')
    setState({accountId,runs:[data.run],nextCursor:null});return
   }
   if(!Array.isArray(data.runs)||!data.runs.every(validRun)||(data.nextCursor!==null&&!uuid(data.nextCursor)))throw Error('catalog')
   setState({accountId,runs:data.runs,nextCursor:data.nextCursor})
  }).catch(e=>{if(g===generation.current&&activeOwner.current===accountId&&(runId!==null||e.code!=='ANTI_STRESS_UNAVAILABLE')&&!c.signal.aborted)setState({accountId,error:true})})
  return()=>{generation.current++;abort.current?.abort()}
 },[accountId,retry,runId])
 async function more(){
  if(!state?.nextCursor||state.loading||state.accountId!==accountId)return
  const g=generation.current,c=new AbortController();abort.current=c
  setState(old=>({...old,loading:true}))
  try{
   const data=await appFetch('anti-stress/session?view=catalog&before='+encodeURIComponent(state.nextCursor),undefined,'GET',{accountId,signal:c.signal})
   if(g!==generation.current||activeOwner.current!==accountId)return
   if(!Array.isArray(data.runs)||!data.runs.every(validRun)||(data.nextCursor!==null&&!uuid(data.nextCursor)))throw Error('catalog')
   setState(old=>({...old,loading:false,runs:[...old.runs,...data.runs.filter(r=>!old.runs.some(x=>x.id===r.id))],nextCursor:data.nextCursor}))
  }catch{if(g===generation.current&&activeOwner.current===accountId)setState(old=>({...old,loading:false,error:true}))}
 }
 if(!state||state.accountId!==accountId||(!state.error&&!state.runs?.length))return runId!==null?<p role="status">{t.loading}</p>:null
 return <section className={styles.archive} data-anti-stress-archive>
  <h2>{t.title}</h2>
  {state.error&&<p role="alert">{t.error} <button type="button" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></p>}
  {state.runs?.map(run=><article key={run.id} className={styles.run}><h3>{ANTI_STRESS_COURSE.title[lang]}</h3><p>Therapy · {Math.floor(run.totalElapsedMs/60000)}/45 {t.minutes}</p><progress max={2700000} value={run.totalElapsedMs} aria-label={t.title}/>{run.days.map((day,i)=>{
   const k=run.id+':'+day.sessionId
   return <div key={k}><button className={styles.day} type="button" aria-expanded={open===k} onClick={()=>setOpen(x=>x===k?null:k)}><strong>{i+1}. {ANTI_STRESS_COURSE.sessions[i].title[lang]}</strong><span>{t.states[day.status]||t.missing} · {Math.floor(day.elapsedMs/60000)}/15 {t.minutes}</span></button>{open===k&&<SessionView key={accountId+':'+k} accountId={accountId} locale={lang} run={run} day={day} t={t}/>}</div>
  })}</article>)}
  {state.nextCursor&&<button type="button" disabled={state.loading} onClick={more}>{state.loading?t.loading:t.more}</button>}
 </section>
}
