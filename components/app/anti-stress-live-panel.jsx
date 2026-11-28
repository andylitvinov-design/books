'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch,getCabinetBootstrap} from '@/lib/app/client-fetch'
import {lockedCoachSessionVoice} from '@/lib/coaching/gemini-voice-catalog.mjs'
import {coachReturningSalutation} from '@/lib/coaching/coach-private-recall.mjs'
import MyCoachContext from './my-coach-context'
import {coachContextTopicOptions} from '../my-coach-staged-memory-controls'
import MyCoachGeminiLive from '../my-coach-gemini-live'
import {projectAntiStressPanelClock} from '@/lib/coaching/anti-stress-relay-client.mjs'
import {PUBLIC_COACH_PERSONAS,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {ANTI_STRESS_COURSE} from '@/lib/coaching/anti-stress-course.mjs'
import {antiStressProgressProjection} from '@/lib/coaching/anti-stress-progress.mjs'
import AntiStressProgress from './anti-stress-progress'
const copy={
 en:{title:'Therapy · Live session',coach:'Choose coach',notice:'Play sends your voice and transcripts to Google Gemini Free; Google may use them to improve models. AI self-regulation support, not clinical care. Practice requires separate permission.',stop:'End voice connection',refresh:'Refresh saved session',unverified:'Connection stop not verified. Refresh the saved session before continuing.',done:'Session time completed. Review your results.',captions:'Current conversation (on this screen only)',time:'Verified active time'},
 ru:{title:'Терапия · Живая сессия',coach:'Выберите коуча',notice:'Play передаёт голос и расшифровку Google Gemini Free (возможно обучение моделей). Поддержка саморегуляции с ИИ, не медицинская помощь. Для каждой практики нужно отдельное согласие.',stop:'Завершить голосовое соединение',refresh:'Обновить сохранённую сессию',unverified:'Остановка не подтверждена. Обновите сохранённую сессию перед продолжением.',done:'Время сессии завершено. Проверьте результаты.',captions:'Текущий разговор (только на этом экране)',time:'Подтверждённое активное время'},
 es:{title:'Terapia · Sesión en directo',coach:'Elegir coach',notice:'Play envía voz y transcripciones a Google Gemini Free; Google puede usarlas para mejorar sus modelos. Apoyo de autorregulación con IA, no atención clínica. Cada práctica requiere permiso separado.',stop:'Cerrar conexión de voz',refresh:'Actualizar sesión guardada',unverified:'Cierre sin verificar. Actualiza la sesión guardada antes de continuar.',done:'Tiempo de sesión completado. Revisa los resultados.',captions:'Conversación actual (solo en esta pantalla)',time:'Tiempo activo verificado'}
}
export default function AntiStressLivePanel({accountId,locale='en',run,day,onRefresh}){
 const lang=copy[locale]?locale:'en',t=copy[lang],speech=useRef(null),clockRef=useRef(null)
 const [coach,setCoach]=useState('mira'),[clock,setClock]=useState(null),[phase,setPhase]=useState('idle'),[fault,setFault]=useState(false)
 const [input,setInput]=useState(''),[output,setOutput]=useState(''),[stopping,setStopping]=useState(false),[storageConsent,setStorageConsent]=useState(false)
 const [identity,setIdentity]=useState({status:'loading',name:''})
 const [memoryOptions,setMemoryOptions]=useState(null),[memoryChoice,setMemoryChoice]=useState(''),[memoryConsent,setMemoryConsent]=useState(false),[memoryBusy,setMemoryBusy]=useState(false)
 const [materialConsent,setMaterialConsent]=useState(null)
 const [materialContext,setMaterialContext]=useState(null)
 const [materialTopic,setMaterialTopic]=useState('emotional_wellbeing')
 const [materialState,setMaterialState]=useState('')
 const materialRequest=useRef(null)
 const memoryRequest=useRef(null)
 useEffect(()=>()=>{memoryRequest.current?.abort();materialRequest.current?.abort()},[])
 async function loadMaterialContext(more=false){
  if(materialRequest.current)return
  const c=new AbortController()
  const previous=more&&materialContext?.owner===accountId&&materialContext.expiresAt>Date.now()?materialContext:null
  if(more&&!previous?.nextCursor)return
  materialRequest.current=c
  if(!previous){setMaterialConsent(null);clearMemoryChoice();setMaterialContext(null)}
  setMaterialState('loading')
  try{
   const [session,journal]=await Promise.all([
    previous||appFetch('coaching-context/session',{},'POST',{accountId,signal:c.signal}),
    appFetch('daybook-journal?limit=30'+(previous?'&before='+encodeURIComponent(previous.nextCursor):''),undefined,'GET',{accountId,signal:c.signal}),
   ])
   if(c.signal.aborted||identityScope.current!==accountId)return
   if(typeof session?.token!=='string'||!Number.isFinite(session.expiresAt)||!Array.isArray(journal?.entries))throw Error('MATERIAL_UNAVAILABLE')
   const notes=journal.entries.filter(entry=>entry.material&&typeof entry.text==='string'&&entry.text.trim()&&entry.text.length<=240)
   setMaterialContext({owner:accountId,token:session.token,expiresAt:session.expiresAt,notes:[...(previous?.notes||[]),...notes],nextCursor:journal.nextCursor})
   setMaterialState('')
  }catch{if(!c.signal.aborted)setMaterialState('error')}
  finally{if(materialRequest.current===c)materialRequest.current=null}
 }
 function clearMemoryChoice(){setMemoryChoice('');setMemoryConsent(false)}
 async function loadShareOptions(){
  if(memoryRequest.current)return
  const c=new AbortController();memoryRequest.current=c;setMemoryBusy(true);clearMemoryChoice()
  try{
   const owner=await getCabinetBootstrap('portrait',{refresh:true})
   if(c.signal.aborted||identityScope.current!==accountId)return
   if(owner?.account?.id!==accountId)throw Error('ACCOUNT_CHANGED')
   const q=new URLSearchParams({view:'continuity',exclude:day.protocolId,locale:lang})
   const data=await appFetch('anti-stress/session?'+q,undefined,'GET',{accountId,signal:c.signal})
   if(c.signal.aborted||identityScope.current!==accountId)return
   if(!Array.isArray(data?.shareOptions)||data.shareOptions.length>10)throw Error('memory')
   setMemoryOptions(data.shareOptions.filter(x=>['coaching','therapy'].includes(x.mode)&&typeof x.field==='string'&&typeof x.value==='string'&&x.value.length<=300&&/^[a-f0-9]{64}$/.test(x.fingerprint||'')))
  }catch{if(!c.signal.aborted)setMemoryOptions([])}
  finally{if(memoryRequest.current===c){memoryRequest.current=null;setMemoryBusy(false)}}
 }
 const identityScope=useRef(accountId);identityScope.current=accountId
 useEffect(()=>{
  const controller=new AbortController();setIdentity({status:'loading',name:''})
  async function readIdentity(){
   try{
    const verified=await getCabinetBootstrap('portrait',{refresh:true})
    if(controller.signal.aborted||identityScope.current!==accountId)return
    if(verified?.account?.id!==accountId)throw Error('ACCOUNT_CHANGED')
    const result=await appFetch('my-coach/protocol?view=greeting-identity',undefined,'GET',{accountId,signal:controller.signal})
    if(controller.signal.aborted||identityScope.current!==accountId)return
    const name=typeof result?.preferredName==='string'?result.preferredName.trim().slice(0,80):''
    setIdentity({status:'ready',name,returning:result?.hasPreviousProtocol===true})
   }catch{if(!controller.signal.aborted&&identityScope.current===accountId)setIdentity({status:'unavailable',name:''})}
  }
  void readIdentity();return()=>controller.abort()
 },[accountId])
 const voiceName=lockedCoachSessionVoice(coach,lang)
 const privateSalutation=identity.name?coachReturningSalutation(({ru:'Здравствуйте, ',en:'Hello, ',es:'Hola, '})[lang]+identity.name+'.',identity.returning,lang):''
 const elapsed=clock?.elapsedMs??day.elapsedMs
 const [protocolRead,setProtocolRead]=useState(null),[protocolRefresh,setProtocolRefresh]=useState(0)
 const protocolScope=accountId+':'+run.id+':'+day.protocolId+':'+lang
 const protocolScopeRef=useRef(protocolScope);protocolScopeRef.current=protocolScope
 const minuteBucket=Math.floor(elapsed/60000)
 const clockStatus=clock?.status||day.status
 useEffect(()=>{
  const c=new AbortController(),selection={runId:run.id,protocolId:day.protocolId,sessionId:day.sessionId}
  const q=new URLSearchParams({runId:run.id,sessionId:day.sessionId,locale:lang,view:'protocol'})
  appFetch('anti-stress/session?'+q,undefined,'GET',{accountId,signal:c.signal}).then(data=>{
   if(c.signal.aborted||protocolScopeRef.current!==protocolScope)return
   const checked=antiStressProgressProjection({selection,locale:lang,data})
   if(!checked?.available)throw Error('PROTOCOL_BINDING')
   setProtocolRead(prior=>prior?.scope===protocolScope&&(prior.data?.reviewRevision>data.reviewRevision||prior.data?.run?.revision>data.run?.revision)?{...prior,stale:true}:{scope:protocolScope,data,stale:false})
  }).catch(()=>{if(!c.signal.aborted&&protocolScopeRef.current===protocolScope)setProtocolRead(prior=>({scope:protocolScope,data:prior?.scope===protocolScope?prior.data:null,stale:true}))})
  return()=>c.abort()
 },[accountId,run.id,day.protocolId,day.sessionId,lang,protocolScope,minuteBucket,clockStatus,protocolRefresh])
 const completed=clock?.status==='time_limit'||day.status==='time_limit'
 const canStart=Boolean(identity.status==='ready'&&voiceName&&!fault&&!completed&&!stopping&&run.access==='free'&&run.currentDay===day.day&&['not_started','paused'].includes(day.status))
 const currentMaterials=materialContext?.owner===accountId?materialContext:null
 const allowedMaterial=currentMaterials&&materialConsent?.contextSessionToken===currentMaterials.token&&
  materialConsent.topicKey===materialTopic&&currentMaterials.expiresAt>Date.now()?materialConsent:null
 const materialItems=currentMaterials?.notes.map(entry=>({itemId:entry.id,category:'journal_excerpt',topicKey:materialTopic,
  label:entry.text,excerpt:{revision:entry.revision,start:0,end:entry.text.length}}))||[]
 const materialCopy=({en:['Choose a Daybook note about a material','Topic','No material notes available.','Could not load material notes.','The approved note will be used on the next Play.','Load saved notes','Load more'],
  ru:['Выбрать запись о материале из дневника','Тема','Нет доступных записей о материалах.','Не удалось загрузить записи о материалах.','Разрешённая запись будет использована при следующем Play.','Загрузить сохранённые записи','Загрузить ещё'],
  es:['Elegir una nota del diario sobre un material','Tema','No hay notas sobre materiales.','No se pudieron cargar las notas.','La nota autorizada se usará al pulsar Play.','Cargar notas guardadas','Cargar más']})[lang]
 const selection={accountId,runId:run.id,protocolId:day.protocolId,sessionId:day.sessionId,personaId:coach,minimumElapsedMs:elapsed,storageConsent,...(allowedMaterial?{materialSelection:allowedMaterial}:{}),...(!allowedMaterial&&memoryChoice&&memoryConsent?{memorySelection:{provider:'gemini_live_free',consent:true,fingerprint:memoryChoice}}:{})}
 const onClock=(ack,selected)=>{
  if(selected.personaId!==coach)return false
  const next=projectAntiStressPanelClock({previous:clockRef.current,selection:selected,owner:accountId,ack})
  if(!next)return false
  clockRef.current=next;setClock(next)
  return true
 }
 async function finish(change=false){
  if(stopping)return false
  setStopping(true)
  try{
   const verified=await speech.current?.finishCourseSegment?.(change)
   if(verified!==true){setFault(true);return false}
   setInput('');setOutput('');setPhase('idle');setProtocolRefresh(n=>n+1)
   return true
  }finally{setStopping(false)}
 }
 async function changeCoach(next){if(next!==coach&&await finish(true))setCoach(next)}
 const title=ANTI_STRESS_COURSE.sessions.find(x=>x.id===day.sessionId)?.title[lang]
 return <section data-anti-stress-live-panel style={{display:'grid',gap:10,border:'1px solid #d9cebe',padding:12,borderRadius:12}}>
  <h3>{t.title} · {title}</h3>
  <p>{t.notice}</p>
  {!voiceName&&<p role="status">{({ru:'Утверждённый голос для этого языка пока недоступен.',en:'An approved voice for this language is not available yet.',es:'Aún no hay una voz aprobada para este idioma.'})[lang]}</p>}
  {identity.status==='unavailable'&&<p role="alert">{({ru:'Не удалось проверить профиль. Обновите сохранённую сессию.',en:'Could not verify your profile. Refresh the saved session.',es:'No se pudo verificar tu perfil. Actualiza la sesión guardada.'})[lang]}</p>}
  <label><input type="checkbox" checked={storageConsent} disabled={stopping||!['idle','paused'].includes(phase)} onChange={e=>setStorageConsent(e.target.checked)}/>{({ru:'Сохранить распознанные завершённые реплики этой части разговора в моём приватном Daybook. Незавершённые реплики могут не сохраниться.',en:'Save recognized completed turns from this connection in my private Daybook. Incomplete turns may not be saved.',es:'Guardar los turnos completos reconocidos de esta conexión en mi Daybook privado. Los turnos incompletos podrían no guardarse.'})[lang]}</label>
  {['idle','paused'].includes(phase)&&!completed&&!fault&&<div data-therapy-memory-share><button type="button" disabled={memoryBusy||stopping} onClick={loadShareOptions}>{({ru:'Выбрать сведения из прежних сессий',en:'Choose previous-session context',es:'Elegir contexto anterior'})[lang]}</button>{memoryOptions&&<><select aria-label={t.coach} value={memoryChoice} onChange={e=>{setMaterialConsent(null);setMemoryChoice(e.target.value);setMemoryConsent(false)}}><option value="">{({ru:'Не передавать память',en:'Do not share memory',es:'No compartir memoria'})[lang]}</option>{memoryOptions.map(x=><option key={x.fingerprint} value={x.fingerprint}>{x.mode==='therapy'?'Therapy':'Coaching'} · {x.value}</option>)}</select>{memoryChoice&&<label><input type="checkbox" checked={memoryConsent} onChange={e=>setMemoryConsent(e.target.checked)}/>{({ru:'Передать только выбранную запись Google Gemini Free на следующем Play (возможно обучение моделей). Это не согласие на практику.',en:'Share only the selected item with Google Gemini Free on the next Play (it may train models). This is not practice consent.',es:'Compartir solo el dato elegido con Google Gemini Free al pulsar Play (puede entrenar modelos). No autoriza prácticas.'})[lang]}</label>}</>}</div>}
  {['idle','paused'].includes(phase)&&!completed&&!fault&&<details data-therapy-material-context>
   <summary>{materialCopy[0]}</summary>
   {(!currentMaterials||currentMaterials.expiresAt<=Date.now())&&
    <button type="button" disabled={materialState==='loading'||stopping} onClick={()=>void loadMaterialContext()}>{materialCopy[5]}</button>}
   {materialState==='error'&&<p role="status">{materialCopy[3]}</p>}
   {currentMaterials&&!materialItems.length&&!currentMaterials.nextCursor&&<p>{materialCopy[2]}</p>}
   {currentMaterials?.nextCursor&&currentMaterials.expiresAt>Date.now()&&
    <button type="button" disabled={materialState==='loading'||stopping} onClick={()=>void loadMaterialContext(true)}>{materialCopy[6]}</button>}
   {materialItems.length>0&&<>
    <label>{materialCopy[1]} <select value={materialTopic} onChange={event=>{setMaterialConsent(null);setMaterialTopic(event.target.value)}}>
     {coachContextTopicOptions.map(([key,en,ru,es])=><option key={key} value={key}>{{en,ru,es}[lang]}</option>)}
    </select></label>
    <MyCoachContext key={materialTopic} accountId={accountId} locale={lang} domains={[]} fixedProvider="gemini_free"
     contextSessionToken={currentMaterials.token} materialItems={materialItems} onGrantChange={receipt=>{clearMemoryChoice();setMaterialConsent(receipt)}}/>
    {allowedMaterial&&<p role="status">{materialCopy[4]}</p>}
   </>}
  </details>}
  <label>{t.coach} <select value={coach} disabled={stopping||completed||fault} onChange={e=>void changeCoach(e.target.value)}>{PUBLIC_COACH_PERSONAS.map(p=><option key={p.id} value={p.id}>{localCoachText(p.name,lang)}</option>)}</select></label>
  <AntiStressProgress selection={selection} locale={lang} elapsedMs={elapsed} data={protocolRead?.scope===protocolScope?protocolRead.data:null} stale={protocolRead?.scope===protocolScope&&protocolRead.stale}/><span>{Math.floor(elapsed/60000)}:{String(Math.floor(elapsed/1000)%60).padStart(2,'0')} / 15:00</span>
  {completed?<p role="status">{t.done}</p>:<MyCoachGeminiLive ref={speech} locale={lang} personaId={coach} courseSessionId={day.sessionId} voiceName={voiceName||''} privateGreetingText={privateSalutation} therapyRelaySelection={selection} onTherapyRelayClock={onClock} onTherapyRelayClosed={receipt=>{setMaterialConsent(null);clearMemoryChoice();if(!receipt.terminalVerified&&receipt.status!=='not_started')setFault(true)}}
    enabled={canStart} canStart={canStart} elapsedSeconds={Math.floor(elapsed/1000)}
    onVoiceStateChange={v=>setPhase(v.phase)} onInputInterim={setInput} onOutputInterim={setOutput}
    onInputFinal={text=>{setInput(text);return false}} onOutputFinal={text=>setOutput(text)} />}
  {(input||output)&&<div><small>{t.captions}</small><p>{input}</p><p>{output}</p></div>}
  {fault&&<p role="alert">{t.unverified}</p>}
  {!completed&&phase!=='idle'&&<button type="button" disabled={stopping} onClick={()=>void finish()}>{t.stop}</button>}
  <button type="button" disabled={stopping||!['idle','paused'].includes(phase)} onClick={onRefresh}>{t.refresh}</button>
 </section>
}
