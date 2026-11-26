'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {practiceCatalog,weekStart,priorWeek,skillTags,readSkillTags,recommendedSkill,practiceTags,validEntry,stableJournalId,normalizeSkills} from '@/lib/app/daybook-micro-coaching.mjs'
import DaybookCoachLink from './daybook-coach-link'
import css from './daybook-today.module.css'
const COPY={
 en:['Micro coaching · 2–3 min','Optional private exercises. Answers are not automatically sent to AI or a specialist.','My weekly skills','Choose one or two skills and rate current confidence 0–10. Not a diagnostic score.','First skill','Second skill (optional)','Current self-rating','A real example (optional)','Save weekly focus','Previous week self-rating','Suggested from your chosen skills and self-ratings; choose another if you wish.','Practice','Start','Next','Back','Stop without saving','What did you notice? (optional)','Review your answers','Save practice','Saved and verified in your journal.','Already saved for this date.','Checking your private journal…','Could not verify your journal. Nothing is marked saved.','Check saved entry','Saving…','None','Goal (optional)','Retry save','Current week self-rating','No verified previous-week rating.','Review or delete saved notes in your private journal.','Discard unsaved answers?','Save not confirmed; retry the same answers or check the saved entry.','Date','Week starting'],
 ru:['Микрокоучинг · 2–3 мин','Добровольные личные упражнения. Ответы не передаются ИИ или специалисту автоматически.','Мои навыки недели','Выберите один или два навыка и оцените текущую уверенность от 0 до 10. Это не диагностическая оценка.','Первый навык','Второй навык (необязательно)','Текущая самооценка','Реальный пример (необязательно)','Сохранить фокус недели','Самооценка прошлой недели','Рекомендация на основе выбранных навыков и оценок; можно выбрать другую практику.','Практика','Начать','Далее','Назад','Остановить без сохранения','Что вы заметили? (необязательно)','Проверьте ответы','Сохранить практику','Сохранено и проверено в дневнике.','На эту дату уже сохранено.','Проверяем личный дневник…','Не удалось подтвердить запись. Ничего не отмечено сохранённым.','Проверить запись','Сохраняем…','Без выбора','Цель (необязательно)','Повторить сохранение','Самооценка текущей недели','Нет подтверждённой оценки прошлой недели.','Просмотреть или удалить сохранённые записи можно в личном дневнике.','Удалить несохранённые ответы?','Сохранение не подтверждено; повторите с теми же ответами или проверьте запись.','Дата','Неделя с'],
 es:['Microcoaching · 2–3 min','Ejercicios privados voluntarios. Las respuestas no se envían automáticamente a IA ni a un especialista.','Mis habilidades de la semana','Elige una o dos habilidades y valora tu confianza actual de 0 a 10. No es una puntuación diagnóstica.','Primera habilidad','Segunda habilidad (opcional)','Autoevaluación actual','Un ejemplo real (opcional)','Guardar enfoque semanal','Autoevaluación de la semana anterior','Sugerencia basada en las habilidades elegidas y sus valoraciones; puedes elegir otra.','Ejercicio','Empezar','Siguiente','Atrás','Parar sin guardar','¿Qué notaste? (opcional)','Revisa tus respuestas','Guardar ejercicio','Guardado y verificado en tu diario.','Ya guardado para esta fecha.','Comprobando tu diario privado…','No se pudo verificar el diario. Nada está marcado como guardado.','Comprobar entrada','Guardando…','Ninguno','Meta (opcional)','Reintentar guardado','Autoevaluación de esta semana','No hay una valoración verificada de la semana anterior.','Revisa o borra las notas guardadas en tu diario privado.','¿Descartar las respuestas sin guardar?','Guardado sin confirmar; reintenta con las mismas respuestas o comprueba la entrada.','Fecha','Semana del']
}
const fields=scope=>scope==='skills'?['hh-skill-week-v1']:practiceTags(scope.slice(9))
function useEntry(accountId,day,scope,locale,onSessionLost){
 const [view,setView]=useState({phase:'loading'}),[epoch,setEpoch]=useState(0)
 const serial=useRef(0),saver=useRef(null),pending=useRef(null),busy=useRef(false)
 const key=accountId+'|'+day+'|'+scope
 useEffect(()=>{
  const n=++serial.current,controller=new AbortController()
  saver.current?.discard();saver.current=createJournalSaver(appFetch,accountId);pending.current=null;busy.current=false
  setView({key,phase:'loading'})
  ;(async()=>{try{
   const id=await stableJournalId(accountId,day,scope)
   if(n!==serial.current)return
   let entry=null
   try{const result=await appFetch('daybook-journal?id='+encodeURIComponent(id),undefined,'GET',{accountId,signal:controller.signal});if(!result?.entry)throw Error('UNEXPECTED_ENTRY');entry=result.entry}catch(e){if(e.status!==404||e.code!=='NOT_FOUND')throw e}
   if(n!==serial.current)return
   if(entry&&(!validEntry(entry,id,day,fields(scope))||(scope==='skills'&&!readSkillTags(entry.tags))))throw Error('UNEXPECTED_ENTRY')
   setView({key,id,entry,phase:entry?'existing':'ready'})
  }catch(e){if(n!==serial.current)return;if(e.status===401||e.code==='ACCOUNT_CHANGED'){onSessionLost?.();return}setView({key,phase:'error'})}})()
  return()=>{serial.current++;controller.abort();saver.current?.discard();pending.current=null;busy.current=false}
 },[accountId,day,scope,epoch,key,onSessionLost])
 const v=view.key===key?view:{phase:'loading'}
 async function save(data){
  if(busy.current||!['ready','failed'].includes(v.phase)||!v.id)return
  const n=serial.current,body=pending.current??{id:v.id,revision:0,kind:'note',locale,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,localDay:day,...data}
  pending.current=body;busy.current=true;setView(old=>({...old,phase:'saving'}))
  try{const entry=await saver.current.save(body);if(n!==serial.current)return;pending.current=null;setView({key,id:body.id,entry,phase:'saved'})}
  catch(e){if(n!==serial.current)return;if(e.status===401||e.code==='ACCOUNT_CHANGED'){onSessionLost?.();return}setView(old=>({...old,phase:'failed'}))}
  finally{if(n===serial.current)busy.current=false}
 }
 return {...v,save,retry:()=>save(pending.current),reload:()=>setEpoch(n=>n+1)}
}
export default function DaybookMicroCoaching({accountId,locale='en',day,goals=[],onSessionLost}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang],catalog=practiceCatalog(lang),week=weekStart(day)
 const [goal,setGoal]=useState(''),[s1,setS1]=useState(''),[s2,setS2]=useState(''),[r1,setR1]=useState(''),[r2,setR2]=useState(''),[example,setExample]=useState('')
 const [practice,setPractice]=useState('focus'),[step,setStep]=useState(-1),[answers,setAnswers]=useState(['','','','']),[chosen,setChosen]=useState(false)
 const weekly=useEntry(accountId,week,'skills',lang,onSessionLost),previous=useEntry(accountId,priorWeek(day),'skills',lang,onSessionLost),daily=useEntry(accountId,day,'practice:'+practice,lang,onSessionLost)
 const current=readSkillTags(weekly.entry?.tags),old=readSkillTags(previous.entry?.tags),recommendation=recommendedSkill(current)
 useEffect(()=>{if(recommendation&&!chosen&&step===-1&&!['saving','failed'].includes(daily.phase))setPractice(recommendation)},[recommendation,chosen,step,daily.phase])
 const skillSelection=normalizeSkills([{id:s1,rating:r1===''?null:Number(r1)},...(s2?[{id:s2,rating:r2===''?null:Number(r2)}]:[])])
 const label=id=>catalog.find(p=>p.id===id)?.title||id,selected=catalog.find(p=>p.id===practice)
 const lock=['saving','failed'].includes(daily.phase),weekLock=['saving','failed'].includes(weekly.phase)
 const allowedGoals=goals.filter(g=>['active','accepted','in_progress'].includes(g.status)),goalId=allowedGoals.some(g=>g.id===goal)?goal:null
 const valid=answers.slice(0,3).every(a=>a.trim())
 const mayLeave=!lock&&!weekLock&&!(step>=0&&daily.phase==='ready')
 function coachLink(v){
  if(!['existing','saved'].includes(v.phase)||!v.entry?.id||!Number.isInteger(v.entry.revision)||v.entry.revision<1)return null
  return <DaybookCoachLink accountId={accountId} kind="journal" itemId={v.entry.id} revision={v.entry.revision} locale={lang} disabled={!mayLeave} onSessionLost={onSessionLost}/>
 }
 function ratingChange(skill){const before=old?.find(s=>s.id===skill.id);if(!before)return '';const delta=skill.rating-before.rating;return ' ('+before.rating+' → '+skill.rating+'; '+(delta>0?'+':'')+delta+')'}
 function reset(){setAnswers(['','','','']);setStep(-1)}
 function stop(){if(!answers.some(a=>a.trim())||window.confirm(t[31]))reset()}
 function status(v){
  if(v.phase==='loading'||v.phase==='saving')return <p role="status">{v.phase==='loading'?t[21]:t[24]}</p>
  if(v.phase==='failed'||v.phase==='error')return <div role="alert"><p>{v.phase==='failed'?t[32]:t[22]}</p>{v.phase==='failed'&&<button type="button" onClick={v.retry}>{t[27]}</button>}<button type="button" onClick={v.reload}>{t[23]}</button></div>
  if(v.phase==='existing'||v.phase==='saved')return <p role="status">{v.phase==='saved'?t[19]:t[20]}</p>
  return null
 }
 function saveWeekly(){if(!skillSelection)return;void weekly.save({text:[t[2],...skillSelection.map(s=>label(s.id)+': '+s.rating+'/10'),...(example.trim()?[t[7]+': '+example.trim()]:[])].join('\n'),tags:skillTags(skillSelection),goalId})}
 function savePractice(){if(!valid)return;void daily.save({text:[selected.title,...selected.steps.map((q,i)=>q+'\n'+answers[i].trim()),...(answers[3].trim()?[t[16]+'\n'+answers[3].trim()]:[])].join('\n\n'),tags:practiceTags(practice),goalId})}
 return <section className={css.panel} aria-label={t[0]} data-daybook-micro-coaching>
  <h2>{t[0]}</h2><p>{t[1]}</p>
  <label>{t[26]}<select value={goalId||''} disabled={lock||weekLock} onChange={e=>setGoal(e.target.value)}><option value="">{t[25]}</option>{allowedGoals.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
  <details><summary>{t[2]} · {t[34]} {week}</summary><p>{t[3]}</p>{status(weekly)}
   {weekly.phase==='ready'&&<><label>{t[4]}<select value={s1} onChange={e=>setS1(e.target.value)}><option value="">{t[25]}</option>{catalog.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>{t[6]}<input type="number" min="0" max="10" step="1" value={r1} onChange={e=>setR1(e.target.value)}/></label>
   <label>{t[5]}<select value={s2} onChange={e=>setS2(e.target.value)}><option value="">{t[25]}</option>{catalog.filter(p=>p.id!==s1).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>{s2&&<label>{t[6]}<input type="number" min="0" max="10" step="1" value={r2} onChange={e=>setR2(e.target.value)}/></label>}
   <label>{t[7]}<textarea maxLength={800} value={example} onChange={e=>setExample(e.target.value)}/></label><button type="button" className={css.primary} disabled={!skillSelection||lock} onClick={saveWeekly}>{t[8]}</button></>}
   {current&&<><p>{t[28]}</p><ul>{current.map(s=><li key={s.id}>{label(s.id)}: {s.rating}/10{ratingChange(s)}</li>)}</ul><p>{t[30]}</p>{mayLeave&&coachLink(weekly)}</>}
   {old&&<><p>{t[9]}</p><ul>{old.map(s=><li key={s.id}>{label(s.id)}: {s.rating}/10</li>)}</ul></>}{previous.phase==='ready'&&<p>{t[29]}</p>}{['loading','error'].includes(previous.phase)&&status(previous)}
  </details>
  <p>{t[33]}: {day}</p>{recommendation&&<p>{t[10]} {label(recommendation)}</p>}
  <label>{t[11]}<select value={practice} disabled={lock||(step>=0&&daily.phase==='ready')} onChange={e=>{setChosen(true);setPractice(e.target.value);reset()}}>{catalog.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
  {status(daily)}
  {daily.phase==='ready'&&step===-1&&<button type="button" className={css.primary} onClick={()=>{setChosen(true);setStep(0)}}>{t[12]}</button>}
  {daily.phase==='ready'&&step>=0&&step<4&&<div><p>{step+1}/4</p><label>{step===3?t[16]:selected.steps[step]}<textarea maxLength={800} value={answers[step]} onChange={e=>setAnswers(old=>old.map((a,i)=>i===step?e.target.value:a))}/></label>{step>0&&<button type="button" onClick={()=>setStep(step-1)}>{t[14]}</button>}<button type="button" className={css.primary} disabled={step<3&&!answers[step].trim()} onClick={()=>setStep(step+1)}>{t[13]}</button><button type="button" onClick={stop}>{t[15]}</button></div>}
  {daily.phase==='ready'&&step===4&&<div><h3>{t[17]}</h3>{selected.steps.map((q,i)=><div key={i}><p>{q}</p><p>{answers[i]}</p></div>)}{answers[3]&&<p>{t[16]}: {answers[3]}</p>}<button type="button" onClick={()=>setStep(3)}>{t[14]}</button><button type="button" disabled={!valid||weekLock} className={css.primary} onClick={savePractice}>{t[18]}</button><button type="button" onClick={stop}>{t[15]}</button></div>}
  {['existing','saved'].includes(daily.phase)&&<><p>{t[30]}</p>{mayLeave&&coachLink(daily)}</>}
 </section>
}
