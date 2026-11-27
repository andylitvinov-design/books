'use client'
import {useRef,useState} from 'react'
import MyCoachGeminiLive from '../my-coach-gemini-live'
import {projectAntiStressPanelClock} from '@/lib/coaching/anti-stress-relay-client.mjs'
import {PUBLIC_COACH_PERSONAS,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {ANTI_STRESS_COURSE} from '@/lib/coaching/anti-stress-course.mjs'
const copy={
 en:{title:'Therapy · Live session',coach:'Choose coach',notice:'Play sends your voice and transcripts to Google Gemini Free; Google may use them to improve models. AI self-regulation support, not clinical care. Practice requires separate permission.',stop:'End voice connection',refresh:'Refresh saved session',unverified:'Connection stop not verified. Refresh the saved session before continuing.',done:'Session time completed. Review your results.',captions:'Current conversation (on this screen only)',time:'Verified active time'},
 ru:{title:'Терапия · Живая сессия',coach:'Выберите коуча',notice:'Play передаёт голос и расшифровку Google Gemini Free (возможно обучение моделей). Поддержка саморегуляции с ИИ, не медицинская помощь. Для каждой практики нужно отдельное согласие.',stop:'Завершить голосовое соединение',refresh:'Обновить сохранённую сессию',unverified:'Остановка не подтверждена. Обновите сохранённую сессию перед продолжением.',done:'Время сессии завершено. Проверьте результаты.',captions:'Текущий разговор (только на этом экране)',time:'Подтверждённое активное время'},
 es:{title:'Terapia · Sesión en directo',coach:'Elegir coach',notice:'Play envía voz y transcripciones a Google Gemini Free; Google puede usarlas para mejorar sus modelos. Apoyo de autorregulación con IA, no atención clínica. Cada práctica requiere permiso separado.',stop:'Cerrar conexión de voz',refresh:'Actualizar sesión guardada',unverified:'Cierre sin verificar. Actualiza la sesión guardada antes de continuar.',done:'Tiempo de sesión completado. Revisa los resultados.',captions:'Conversación actual (solo en esta pantalla)',time:'Tiempo activo verificado'}
}
export default function AntiStressLivePanel({accountId,locale='en',run,day,onRefresh}){
 const lang=copy[locale]?locale:'en',t=copy[lang],speech=useRef(null),clockRef=useRef(null)
 const [coach,setCoach]=useState('mira'),[clock,setClock]=useState(null),[phase,setPhase]=useState('idle'),[fault,setFault]=useState(false)
 const [input,setInput]=useState(''),[output,setOutput]=useState(''),[stopping,setStopping]=useState(false),[storageConsent,setStorageConsent]=useState(false)
 const elapsed=clock?.elapsedMs??day.elapsedMs
 const completed=clock?.status==='time_limit'||day.status==='time_limit'
 const canStart=Boolean(!fault&&!completed&&!stopping&&run.access==='free'&&run.currentDay===day.day&&['not_started','paused'].includes(day.status))
 const selection={accountId,runId:run.id,protocolId:day.protocolId,sessionId:day.sessionId,personaId:coach,minimumElapsedMs:elapsed,storageConsent}
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
   setInput('');setOutput('');setPhase('idle')
   return true
  }finally{setStopping(false)}
 }
 async function changeCoach(next){if(next!==coach&&await finish(true))setCoach(next)}
 const title=ANTI_STRESS_COURSE.sessions.find(x=>x.id===day.sessionId)?.title[lang]
 return <section data-anti-stress-live-panel style={{display:'grid',gap:10,border:'1px solid #d9cebe',padding:12,borderRadius:12}}>
  <h3>{t.title} · {title}</h3>
  <p>{t.notice}</p>
  <label><input type="checkbox" checked={storageConsent} disabled={stopping||!['idle','paused'].includes(phase)} onChange={e=>setStorageConsent(e.target.checked)}/>{({ru:'Сохранить распознанные завершённые реплики этой части разговора в моём приватном Daybook. Незавершённые реплики могут не сохраниться.',en:'Save recognized completed turns from this connection in my private Daybook. Incomplete turns may not be saved.',es:'Guardar los turnos completos reconocidos de esta conexión en mi Daybook privado. Los turnos incompletos podrían no guardarse.'})[lang]}</label>
  <label>{t.coach} <select value={coach} disabled={stopping||completed||fault} onChange={e=>void changeCoach(e.target.value)}>{PUBLIC_COACH_PERSONAS.map(p=><option key={p.id} value={p.id}>{localCoachText(p.name,lang)}</option>)}</select></label>
  <progress max={900000} value={elapsed} aria-label={t.time}/><span>{Math.floor(elapsed/60000)}:{String(Math.floor(elapsed/1000)%60).padStart(2,'0')} / 15:00</span>
  {completed?<p role="status">{t.done}</p>:<MyCoachGeminiLive ref={speech} locale={lang} personaId={coach} courseSessionId={day.sessionId} therapyRelaySelection={selection} onTherapyRelayClock={onClock}
    enabled={canStart} canStart={canStart} elapsedSeconds={Math.floor(elapsed/1000)}
    onVoiceStateChange={v=>setPhase(v.phase)} onInputInterim={setInput} onOutputInterim={setOutput}
    onInputFinal={text=>{setInput(text);return false}} onOutputFinal={text=>setOutput(text)} />}
  {(input||output)&&<div><small>{t.captions}</small><p>{input}</p><p>{output}</p></div>}
  {fault&&<p role="alert">{t.unverified}</p>}
  {!completed&&phase!=='idle'&&<button type="button" disabled={stopping} onClick={()=>void finish()}>{t.stop}</button>}
  <button type="button" disabled={stopping||!['idle','paused'].includes(phase)} onClick={onRefresh}>{t.refresh}</button>
 </section>
}
