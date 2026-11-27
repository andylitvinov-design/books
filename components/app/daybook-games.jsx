'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,Check,Flower2,Play,Pause,RotateCcw} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {daybookGames,gameNotes,gameProgress,gameTag,validGameAnswer,gameResult,decodeSavedGame} from '@/lib/app/daybook-games.mjs'
import {clarityRunScopeTag} from '@/lib/coaching/clarity-course-runs.mjs'
import css from './clarity-practice.module.css'
const EXTRA={ru:{start:'Начать практику',pause:'Пауза',resume:'Продолжить практику',reset:'Сначала',ready:'Время вышло. Отметьте, как всё прошло.',result:'Твой результат',before:'До',after:'После',saved:'Результат сохранён',copy:'Скопировать результат для коуча',copied:'Скопировано',copyError:'Не удалось скопировать. Можно открыть запись в дневнике.'},en:{start:'Start practice',pause:'Pause',resume:'Resume practice',reset:'Restart',ready:'Time is up. Mark how it went.',result:'Your result',before:'Before',after:'After',saved:'Result saved',copy:'Copy result for your coach',copied:'Copied',copyError:'Could not copy. Open the note in your journal.'},es:{start:'Iniciar práctica',pause:'Pausa',resume:'Continuar práctica',reset:'Reiniciar',ready:'Terminó el tiempo. Indica cómo te fue.',result:'Tu resultado',before:'Antes',after:'Después',saved:'Resultado guardado',copy:'Copiar resultado para tu coach',copied:'Copiado',copyError:'No se pudo copiar. Abre la nota en tu diario.'}}
const C={
 ru:['К дневнику','Практики дня','День','Далее','Назад','Мой результат','Сохранить результат','Сохранено','Повторить сохранение','Загрузить записи','Не удалось загрузить записи','Записи дублируются. Проверьте личный дневник.','Личные ответы не передаются коучу автоматически.','Завершено','К следующему дню','Открыть конструктор цели','Выйти без сохранения?','Сохранение…','Не подтверждено. Повторите ту же запись.','Сохранить и закончить','Выберите значение','Мои результаты','Выберите до трёх','Открыть карту жизни и смысловых осей'],
 en:['Back to Daybook','Daily practices','Day','Next','Back','My result','Save result','Saved','Retry save','Load notes','Could not load notes','Duplicate notes. Review your private journal.','Private answers are not automatically shared with a coach.','Completed','Next day','Open goal builder','Leave without saving?','Saving…','Not confirmed. Retry the same note.','Save and finish','Choose a value','My results','Choose up to three','Open life and meaning axes map'],
 es:['Volver al diario','Prácticas del día','Día','Siguiente','Atrás','Mi resultado','Guardar resultado','Guardado','Reintentar','Cargar notas','No se pudieron cargar las notas','Notas duplicadas. Revisa tu diario privado.','Las respuestas privadas no se comparten automáticamente con el coach.','Completado','Siguiente día','Abrir constructor de metas','¿Salir sin guardar?','Guardando…','Sin confirmar. Reintenta la misma nota.','Guardar y terminar','Elige un valor','Mis resultados','Elige hasta tres','Abrir mapa de vida y ejes de significado']
}
export default function DaybookGames(props){
 const lang=Object.hasOwn(C,props.locale)?props.locale:'en',t=C[lang]
 if(props.hasMore)return <div className={css.flow}><button className={css.secondary} onClick={props.onClose}>{t[0]}</button><section className={css.paper}><button className={css.primary} disabled={props.loadingAll} onClick={props.onLoadAll}>{t[9]}</button>{props.loadError&&<p role="alert">{t[10]}</p>}</section></div>
 return <Games key={props.accountId+':'+(props.courseRunId||'legacy')+':'+props.day} {...props} lang={lang} t={t}/>
}
function PracticeTimer({seconds,x}){
 const [left,setLeft]=useState(seconds),[running,setRunning]=useState(false)
 const deadline=useRef(0)
 useEffect(()=>{
  if(!running)return
  const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setLeft(remaining);if(remaining===0)setRunning(false)}
  const interval=setInterval(tick,200)
  const hide=()=>{if(document.hidden){tick();setRunning(false)}}
  document.addEventListener('visibilitychange',hide)
  return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',hide)}
 },[running])
 function toggle(){if(running){setLeft(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)));setRunning(false)}else if(left>0){deadline.current=Date.now()+left*1000;setRunning(true)}}
 return <div className={css.gameTimer} data-practice-timer>
  <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="#e6d7bf" strokeWidth="8"/><circle cx="60" cy="60" r="50" fill="none" stroke="#a67948" strokeWidth="8" strokeLinecap="round" strokeDasharray={2*Math.PI*50} strokeDashoffset={2*Math.PI*50*(1-left/seconds)} transform="rotate(-90 60 60)"/><text x="60" y="66" textAnchor="middle" fontSize="23" fontWeight="750" fill="#392013">{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</text></svg>
  {left===0?<p role="status">{x.ready}</p>:<button type="button" className={css.secondary} onClick={toggle}>{running?<Pause size={18}/>:<Play size={18}/>} {running?x.pause:left===seconds?x.start:x.resume}</button>}
  <button type="button" className={css.gameReset} onClick={()=>{setRunning(false);setLeft(seconds)}}><RotateCcw size={16}/>{x.reset}</button>
 </div>
}
function VisualResult({day,game,answers,x}){
 const wheel=day===1&&game.id===1
 const coords=(r,i)=>[80+r*Math.sin(i*Math.PI/2),80-r*Math.cos(i*Math.PI/2)].join(',')
 return <div className={css.gameResult} data-game-visual-result>
  {wheel&&<svg viewBox="0 0 160 160" className={css.gameWheel} role="img" aria-label={game.title}>{[15,30,45,60].map(r=><polygon key={r} points={[0,1,2,3].map(i=>coords(r,i)).join(' ')} fill="none" stroke="#d5bea0"/>)}{[0,1,2,3].map(i=><line key={i} x1="80" y1="80" x2={80+60*Math.sin(i*Math.PI/2)} y2={80-60*Math.cos(i*Math.PI/2)} stroke="#d5bea0"/>)}<polygon points={[0,1,2,3].map(i=>coords(answers[i]*6,i)).join(' ')} fill="#a6794850" stroke="#8c6135" strokeWidth="2"/>{[0,1,2,3].map(i=><circle key={i} cx={80+answers[i]*6*Math.sin(i*Math.PI/2)} cy={80-answers[i]*6*Math.cos(i*Math.PI/2)} r="3.5" fill="#8c6135"/>)}</svg>}
  {game.steps.map((s,i)=><div key={i} className={css.gameResultCard}><small>{day===2&&game.id===3&&i===0?x.before:day===2&&game.id===3&&i===3?x.after:s.prompt}</small>{s.kind==='scale'?<><strong>{answers[i]}/10</strong><div className={css.gameResultTrack}><span style={{width:answers[i]*10+'%'}}/></div></>:<div className={css.gameChips}>{(s.kind==='multi'?answers[i]:[answers[i]]).map(v=><span key={v}>{s.options[v]}</span>)}</div>}</div>)}
 </div>
}
function SavedGame({note,day,game,x}){
 const [status,setStatus]=useState('')
 const answers=decodeSavedGame(note,day,game.id)
 async function copy(){try{await navigator.clipboard.writeText(note.text);setStatus(x.copied)}catch{setStatus(x.copyError)}}
 return <><h2>{game.icon} {game.title}</h2>{answers?<VisualResult day={day} game={game} answers={answers} x={x}/>:<p>{note.text}</p>}<p role="status">✓ {x.saved}</p><button type="button" className={css.secondary} onClick={()=>void copy()}>{x.copy}</button>{status&&<p role="status">{status}</p>}</>
}
function Games({accountId,day,lang,t,entries,onSaved,onSessionLost,onClose,onNextDay,courseRunId=null}){
 const games=daybookGames(lang,day),progress=gameProgress(entries,day,courseRunId),x=EXTRA[lang]
 const [id,setId]=useState(null),[step,setStep]=useState(0),[answers,setAnswers]=useState({}),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
 const saver=useRef(null),pending=useRef(null),active=useRef(false),flight=useRef(false),paper=useRef(null)
 useEffect(()=>{active.current=true;const s=createJournalSaver(appFetch,accountId);saver.current=s;return()=>{active.current=false;s.discard();saver.current=null}},[accountId])
 useEffect(()=>{if(paper.current)paper.current.scrollTop=0},[id,step])
 const game=id===null?null:games[id-1],notes=game?gameNotes(entries,day,id,courseRunId):[],slide=game?.steps[step],review=game&&step===game.steps.length
 const result=review?gameResult(game,answers):null
 function exit(action){if(flight.current)return;if((Object.keys(answers).length||failed)&&!window.confirm(t[16]))return;action()}
 function open(n){if(flight.current||failed)return;setId(n);setStep(0);setAnswers({})}
 function back(){if(flight.current||failed)return;if(step>0)setStep(step-1);else exit(()=>{setId(null);setAnswers({})})}
 function choose(v){setAnswers(old=>({...old,[step]:v}))}
 async function save(){
  if(flight.current||!saver.current||!review||notes.length)return
  flight.current=true;setBusy(true)
  try{
   if(!pending.current){const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;pending.current={id:crypto.randomUUID(),revision:0,text:result,tags:[gameTag(day,id),...(courseRunId?[clarityRunScopeTag(courseRunId)]:[])],kind:'note',locale:lang,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId:null}}
   const saved=await saver.current.save(pending.current)
   if(!active.current)return
   pending.current=null;setFailed(false);onSaved(saved);setAnswers({});setStep(0);setId(null)
  }catch(e){if(active.current){if(e.status===401||e.status===403||e.code==='ACCOUNT_CHANGED')onSessionLost();else setFailed(true)}}
  finally{flight.current=false;if(active.current)setBusy(false)}
 }
 const value=answers[step],seconds=day===2&&id===2&&step===3?30:day===2&&id===3&&step===2?60:0
 return <div className={css.flow} data-daybook-games data-game-day={day}>
  <header className={css.top}><button type="button" disabled={busy} onClick={()=>exit(onClose)}><ArrowLeft size={21}/>{t[0]}</button><span>Holistic House</span></header>
  <div className={css.course}><Flower2 size={28}/><div><small>Find Clarity &amp; Support</small><strong>{t[2]} {day} · {t[1]}</strong><span>{progress.done}/3</span></div></div>
  {game&&!notes.length&&<nav className={css.gameDots} aria-label={t[1]}>{Array.from({length:5},(_,i)=><span key={i} data-current={i===step} data-past={i<step}/>)}</nav>}
  <section className={css.paper} ref={paper}>
   {!game?<><h2>{progress.complete?t[13]:t[1]}</h2>{games.map(g=>{const n=gameNotes(entries,day,g.id,courseRunId);return <button key={g.id} type="button" className={css.gameTile} onClick={()=>open(g.id)}><span aria-hidden="true">{g.icon}</span><strong>{g.title}</strong>{n.length===1?<Check size={22}/>:<ArrowRight size={20}/>}</button>})}{progress.complete&&<p role="status">✓ {t[21]} · 3/3</p>}{day===3&&progress.complete&&<Link className={css.tool} href={'/'+lang+'/app/daybook?start=vector'}>{t[15]}<ArrowRight size={18}/></Link>}{day!==2&&<Link className={css.tool} href={'/'+lang+'/development-vectors'} target="_blank" rel="noopener noreferrer">{t[23]}</Link>}</>:notes.length>1?<p role="alert">{t[11]}</p>:notes.length===1?<SavedGame key={notes[0].id} note={notes[0]} day={day} game={game} x={x}/>:review?<><h2>{t[5]}</h2><VisualResult day={day} game={game} answers={answers} x={x}/>{failed&&<p role="alert">{t[18]}</p>}</>:<>
    <div className={css.gameIcon} aria-hidden="true">{game.icon}</div><h2>{slide.prompt}</h2>{seconds>0&&<PracticeTimer key={id+':'+step} seconds={seconds} x={x}/>}
    {slide.kind==='scale'?<><div className={css.gameMeter} aria-live="polite"><strong>{value===undefined?'—':value+'/10'}</strong><div><span style={{width:(value??0)*10+'%'}}/></div></div><div className={css.gameScale} role="group" aria-label={t[20]}>{Array.from({length:11},(_,i)=><button key={i} type="button" aria-pressed={value===i} onClick={()=>choose(i)}>{i}</button>)}</div></>:<><div className={css.gameChoices} role="group" aria-label={slide.prompt}>{slide.options.map((option,i)=>{const selected=slide.kind==='multi'?(value||[]).includes(i):value===i;return <button type="button" key={i} aria-pressed={selected} onClick={()=>slide.kind==='multi'?choose(selected?value.filter(x=>x!==i):(value||[]).length<3?[...(value||[]),i]:value):choose(i)}>{option}{selected&&<Check size={19}/>}</button>})}</div>{slide.kind==='multi'&&<small>{t[22]} · {(value||[]).length}/3</small>}</>}
   </>}
   <p className={css.privacy}>{t[12]}</p>
  </section>
  <footer className={css.footer}>{!game?<button className={css.primary} onClick={progress.complete&&day<3?onNextDay:onClose}>{progress.complete&&day<3?t[14]:t[0]}<ArrowRight size={21}/></button>:notes.length?<button className={css.primary} onClick={()=>setId(null)}>{t[4]}</button>:<div className={css.actions}><button className={css.secondary} disabled={busy||failed} onClick={back}>{t[4]}</button><button className={css.primary} disabled={busy||(!review&&!validGameAnswer(slide,value))} onClick={()=>review?void save():setStep(s=>s+1)}>{busy?t[17]:failed?t[8]:review?t[6]:t[3]}<ArrowRight size={21}/></button></div>}</footer>
 </div>
}
