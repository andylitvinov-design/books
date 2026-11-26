'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {rehearsalCatalog,createCoachRehearsal,coachRehearsalView,advanceCoachRehearsal,coachRehearsalFeedback} from '@/lib/coaching/coach-rehearsal.mjs'
import DaybookGoalContext from './daybook-goal-context'
import css from './coach-rehearsal.module.css'
const COPY={
 en:{title:'Rehearse a difficult conversation',intro:'A scripted, fictional text rehearsal with no external AI. Use invented names or no names. Not a real conversation or professional evaluation.',scenario:'Scenario',role:'Your role',difficulty:'Difficulty',standard:'Standard · 3 exchanges',challenge:'Challenge · 4 exchanges',goal:'Your desired outcome',start:'Start rehearsal',reply:'Your reply',next:'Send reply',stop:'Stop and discard rehearsal',review:'Feedback on your actual words',quote:'Your reply',strength:'Observable strength',example:'One possible alternative phrasing',takeaway:'Write only the learning point you want to keep (optional)',save:'Save only my learning point',saved:'Your learning point was saved and verified.',retry:'Retry the same save',failed:'Saving was not confirmed. Your learning point remains here.',reset:'Try again',skip:'Finish without saving',confirm:'Discard this unsaved rehearsal?',saving:'Saving…',session:'Sign-in expired. No new save is confirmed.',private:'The transcript and your selected scenario goal are not saved. Only your explicitly approved learning point and optional linked goal go to the private journal.'},
 ru:{title:'Репетиция сложного разговора',intro:'Текстовая репетиция вымышленного диалога без внешнего ИИ. Не указывайте настоящие имена. Это не реальный разговор и не профессиональная оценка.',scenario:'Сценарий',role:'Ваша роль',difficulty:'Сложность',standard:'Обычная · 3 обмена репликами',challenge:'Сложнее · 4 обмена репликами',goal:'Какого результата вы хотите?',start:'Начать репетицию',reply:'Ваша реплика',next:'Ответить',stop:'Остановить и удалить черновик',review:'Обратная связь по вашим словам',quote:'Ваша реплика',strength:'Наблюдаемая сильная сторона',example:'Один возможный вариант формулировки',takeaway:'Напишите только вывод, который хотите сохранить (необязательно)',save:'Сохранить только мой вывод',saved:'Ваш вывод сохранён и проверен.',retry:'Повторить сохранение',failed:'Сохранение не подтверждено. Ваш вывод остаётся здесь.',reset:'Попробовать снова',skip:'Завершить без сохранения',confirm:'Удалить несохранённую репетицию?',saving:'Сохранение…',session:'Сессия входа истекла. Новое сохранение не подтверждено.',private:'Диалог и цель репетиции не сохраняются. В личный дневник попадает только явно одобренный вами вывод и необязательная связь с целью.'},
 es:{title:'Ensayar una conversación difícil',intro:'Ensayo ficticio de texto con guion, sin IA externa. Usa nombres inventados o ninguno. No es una conversación real ni una evaluación profesional.',scenario:'Escenario',role:'Tu papel',difficulty:'Dificultad',standard:'Normal · 3 intercambios',challenge:'Desafío · 4 intercambios',goal:'¿Qué resultado deseas?',start:'Empezar ensayo',reply:'Tu respuesta',next:'Responder',stop:'Parar y descartar el borrador',review:'Comentarios sobre tus palabras',quote:'Tu respuesta',strength:'Fortaleza observable',example:'Una posible frase alternativa',takeaway:'Escribe solo el aprendizaje que quieres conservar (opcional)',save:'Guardar solo mi aprendizaje',saved:'Tu aprendizaje se ha guardado y verificado.',retry:'Reintentar el mismo guardado',failed:'Guardado sin confirmar. Tu aprendizaje sigue aquí.',reset:'Intentar otra vez',skip:'Terminar sin guardar',confirm:'¿Descartar este ensayo sin guardar?',saving:'Guardando…',session:'La sesión ha caducado. No se ha confirmado un nuevo guardado.',private:'No se guardan la conversación ni la meta del ensayo. Solo se guarda el aprendizaje que apruebes y una meta vinculada opcional en tu diario privado.'}
}
export default function CoachRehearsal({accountId,locale='en'}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang],catalog=rehearsalCatalog(lang)
 const [scenarioId,setScenario]=useState('boundaries'),[difficulty,setDifficulty]=useState('standard'),[goal,setGoal]=useState('')
 const [state,setState]=useState(null),[reply,setReply]=useState(''),[takeaway,setTakeaway]=useState(''),[goalId,setGoalId]=useState(null),[status,setStatus]=useState('')
 const lifecycle=useRef(0),saver=useRef(null),pending=useRef(null),busy=useRef(false)
 useEffect(()=>{lifecycle.current++;saver.current=createJournalSaver(appFetch,accountId);return()=>{lifecycle.current++;saver.current?.discard();pending.current=null;busy.current=false}},[accountId])
 const sessionLost=useCallback(()=>{lifecycle.current++;saver.current?.discard();pending.current=null;busy.current=false;setState(null);setGoal('');setReply('');setTakeaway('');setGoalId(null);setStatus('session')},[])
 const view=state?coachRehearsalView(state):null,feedback=view?.done?coachRehearsalFeedback(state):null
 const setup=catalog.find(s=>s.id===scenarioId)
 const locked=status==='saving'||status==='failed'
 function clear(){setState(null);setReply('');setTakeaway('');setGoalId(null);setGoal('');setStatus('')}
 function stop(){if(locked)return;if(window.confirm(t.confirm))clear()}
 function start(){if(!goal.trim()||!saver.current||status==='session')return;setState(createCoachRehearsal({scenarioId,locale:lang,difficulty,goal}));setReply('');setTakeaway('');setStatus('')}
 function answer(){if(!reply.trim()||!view||view.done)return;setState(old=>advanceCoachRehearsal(old,reply));setReply('')}
 async function save(){
  if(!feedback||!takeaway.trim()||busy.current||status==='saved'||status==='session'||!saver.current)return
  const token=lifecycle.current
  if(!pending.current){const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;pending.current={id:crypto.randomUUID(),revision:0,text:takeaway.trim(),tags:['hh-coach-rehearsal-v1'],kind:'note',locale:lang,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId}}
  busy.current=true;setStatus('saving')
  try{await saver.current.save(pending.current);if(token!==lifecycle.current)return;pending.current=null;setState(null);setGoal('');setReply('');setTakeaway('');setGoalId(null);setStatus('saved')}
  catch(e){if(token!==lifecycle.current)return;if(e.status===401||e.code==='ACCOUNT_CHANGED'){sessionLost();return}setStatus('failed')}
  finally{if(token===lifecycle.current)busy.current=false}
 }
 if(!accountId)return null
 return <details className={css.panel} data-coach-rehearsal><summary>{t.title}</summary><p>{t.intro}</p>
  {!state&&status!=='session'&&<><label>{t.scenario}<select value={scenarioId} onChange={e=>setScenario(e.target.value)}>{catalog.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
   <p>{t.role}: {setup.role}</p><label>{t.difficulty}<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="standard">{t.standard}</option><option value="challenge">{t.challenge}</option></select></label>
   <label>{t.goal}<textarea maxLength={300} value={goal} onChange={e=>setGoal(e.target.value)}/></label><button type="button" disabled={!goal.trim()} onClick={start}>{t.start}</button></>}
  {state&&!view.done&&<><p>{view.index+1}/{view.limit} · {view.scenario.counterpart}</p><div className={css.prompt} aria-live="polite">{view.prompt}</div><label>{t.reply}<textarea maxLength={800} value={reply} onChange={e=>setReply(e.target.value)}/></label><button type="button" disabled={!reply.trim()} onClick={answer}>{t.next}</button><button type="button" onClick={stop}>{t.stop}</button></>}
  {feedback&&<><h3>{t.review}</h3><p>{t.quote}: “{feedback.evidenceQuote}”</p><p>{t.strength}: {feedback.strength}</p><p>{t.example}: {feedback.example}</p><p>{t.private}</p>
   <label>{t.takeaway}<textarea maxLength={1000} value={takeaway} disabled={locked} onChange={e=>setTakeaway(e.target.value)}/></label>
   <DaybookGoalContext accountId={accountId} locale={lang} selectedId={goalId} onChange={setGoalId} onSessionLost={sessionLost} compact disabled={locked}/>
   <button type="button" disabled={!takeaway.trim()||status==='saving'} onClick={()=>void save()}>{status==='failed'?t.retry:status==='saving'?t.saving:t.save}</button>
   <button type="button" disabled={locked} onClick={()=>{setState(createCoachRehearsal({scenarioId,locale:lang,difficulty,goal}));setReply('');setTakeaway('');setGoalId(null)}}>{t.reset}</button>
   <button type="button" disabled={locked} onClick={clear}>{t.skip}</button></>}
  {status==='saved'&&<p role="status">{t.saved}</p>}{status==='failed'&&<p role="alert">{t.failed}</p>}{status==='session'&&<p role="alert">{t.session}</p>}
 </details>
}
