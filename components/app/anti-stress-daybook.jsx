'use client'
import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,Check,Flower2,Play,Pause,RotateCcw} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {daybookGames,gameNotes,gameProgress,gameTag,validGameAnswer,gameResult,decodeSavedGame,antiStressDays,skipLabel} from '@/lib/app/anti-stress-daybook-games.mjs'
import css from './clarity-practice.module.css'
const EXTRA={ru:{start:'Начать практику',pause:'Пауза',resume:'Продолжить практику',reset:'Сначала',ready:'Время вышло. Отметьте свой опыт; можно пропустить.',result:'Твой результат',before:'До',after:'После',saved:'Результат сохранён',copy:'Скопировать результат для коуча',copied:'Скопировано',copyError:'Не удалось скопировать. Можно открыть запись в дневнике.'},en:{start:'Start practice',pause:'Pause',resume:'Resume practice',reset:'Restart',ready:'Time is up. Mark your experience or skip.',result:'Your result',before:'Before',after:'After',saved:'Result saved',copy:'Copy result for your coach',copied:'Copied',copyError:'Could not copy. Open the note in your journal.'},es:{start:'Iniciar práctica',pause:'Pausa',resume:'Continuar práctica',reset:'Reiniciar',ready:'Terminó el tiempo. Indica tu experiencia u omite.',result:'Tu resultado',before:'Antes',after:'Después',saved:'Resultado guardado',copy:'Copiar resultado para tu coach',copied:'Copiado',copyError:'No se pudo copiar. Abre la nota en tu diario.'}}
const C={
 ru:['К дневнику','Практики дня','День','Далее','Назад','Мой результат','Сохранить результат','Сохранено','Повторить сохранение','Загрузить записи','Не удалось загрузить записи','Записи дублируются. Проверьте личный дневник.','Личные ответы не передаются коучу автоматически.','Завершено','К следующему дню','Открыть конструктор цели','Выйти без сохранения?','Сохранение…','Не подтверждено. Повторите ту же запись.','Сохранить и закончить','Выберите значение','Мои результаты','Выберите до трёх','Открыть карту жизни и смысловых осей'],
 en:['Back to Daybook','Daily practices','Day','Next','Back','My result','Save result','Saved','Retry save','Load notes','Could not load notes','Duplicate notes. Review your private journal.','Private answers are not automatically shared with a coach.','Completed','Next day','Open goal builder','Leave without saving?','Saving…','Not confirmed. Retry the same note.','Save and finish','Choose a value','My results','Choose up to three','Open life and meaning axes map'],
 es:['Volver al diario','Prácticas del día','Día','Siguiente','Atrás','Mi resultado','Guardar resultado','Guardado','Reintentar','Cargar notas','No se pudieron cargar las notas','Notas duplicadas. Revisa tu diario privado.','Las respuestas privadas no se comparten automáticamente con el coach.','Completado','Siguiente día','Abrir constructor de metas','¿Salir sin guardar?','Guardando…','Sin confirmar. Reintenta la misma nota.','Guardar y terminar','Elige un valor','Mis resultados','Elige hasta tres','Abrir mapa de vida y ejes de significado']
}
const EXTRA_COURSE={ru:{title:'Антистресс · Практики',back:'В My Page',skip:'Пропустить',privacy:'Самостоятельные упражнения, не лечение. Можно остановиться или пропустить любой шаг.',note:'Не нужно делиться травматическими историями. Если становится некомфортно, прекратите упражнение и отдохните.',input:'Ваши слова',results:'Практики сохранены'},en:{title:'Anti-Stress · Practices',back:'Back to My Page',skip:'Skip',privacy:'Self-guided exercises, not treatment. Stop or skip any step.',note:'No need to share traumatic stories. If uncomfortable, stop the exercise and rest.',input:'Your own words',results:'Practices saved'},es:{title:'Antiestrés · Prácticas',back:'Volver a Mi página',skip:'Omitir',privacy:'Ejercicios autónomos, no tratamiento. Puedes parar u omitir cualquier paso.',note:'No hace falta contar historias traumáticas. Si sientes malestar, para y descansa.',input:'Tus palabras',results:'Prácticas guardadas'}}
export default function AntiStressDaybook(props){
 const lang=Object.hasOwn(C,props.locale)?props.locale:'en',t=C[lang],labels=EXTRA_COURSE[lang]
 const [selected,setSelected]=useState(null)
 const day=selected??([1,2,3].find(n=>!gameProgress(props.entries,n).complete)||3)
 const onClose=()=>window.location.assign('/'+lang+'/my-page')
 return <section data-anti-stress-daybook style={{display:'flex',flexDirection:'column',height:'100%',maxWidth:640,margin:'0 auto',padding:'max(8px,env(safe-area-inset-top)) 12px max(8px,env(safe-area-inset-bottom))',boxSizing:'border-box'}}>
 {props.hasMore?<div className={css.flow}><button className={css.secondary} onClick={onClose}>{labels.back}</button><section className={css.paper}><h2>{labels.title}</h2><button className={css.primary} disabled={props.loadingAll} onClick={props.onLoadAll}>{t[9]}</button>{props.loadError&&<p role="alert">{t[10]}</p>}</section></div>:<Games key={props.accountId+':'+day} {...props} day={day} lang={lang} t={t} labels={labels} onSaved={entry=>{setSelected(day);props.onSaved(entry)}} onSelect={setSelected} onClose={onClose} onNextDay={()=>setSelected(Math.min(day+1,3))}/>}
 </section>
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
function VisualResult({game,answers}){
 return <div className={css.gameResult} data-game-visual-result>
 {game.steps.map((s,i)=><div key={i} className={css.gameResultCard}><small>{s.prompt}</small>
 {s.kind==='scale'&&answers[i]!==-1?<><strong>{answers[i]}/10</strong><div className={css.gameResultTrack}><span style={{width:answers[i]*10+'%'}}/></div></>:<div className={css.gameChips}><span>{s.kind==='scale'||(s.kind==='text'&&!answers[i])?skipLabel(game.locale):s.kind==='text'?answers[i]:s.options[answers[i]]}</span></div>}
 </div>)}
 </div>
}
function SavedGame({note,day,game,x}){
 const [status,setStatus]=useState('')
 const answers=decodeSavedGame(note,day,game.id)
 async function copy(){try{await navigator.clipboard.writeText(note.text);setStatus(x.copied)}catch{setStatus(x.copyError)}}
 return <><h2>{game.icon} {game.title}</h2>{answers?<VisualResult day={day} game={game} answers={answers} x={x}/>:<p>{note.text}</p>}<p role="status">{answers?'✓ '+x.saved:x.copyError}</p><button type="button" className={css.secondary} onClick={()=>void copy()}>{x.copy}</button>{status&&<p role="status">{status}</p>}</>
}
function Games({accountId,day,lang,t,entries,onSaved,onSessionLost,onClose,onNextDay,onSelect,labels}){
 const games=daybookGames(lang,day),progress=gameProgress(entries,day),x=EXTRA[lang]
 const [id,setId]=useState(null),[step,setStep]=useState(0),[answers,setAnswers]=useState({}),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
 const saver=useRef(null),pending=useRef(null),active=useRef(false),flight=useRef(false),paper=useRef(null)
 useEffect(()=>{active.current=true;const s=createJournalSaver(appFetch,accountId);saver.current=s;return()=>{active.current=false;s.discard();saver.current=null}},[accountId])
 useEffect(()=>{if(paper.current)paper.current.scrollTop=0},[id,step])
 const game=id===null?null:games[id-1],notes=game?gameNotes(entries,day,id):[],slide=game?.steps[step],review=game&&step===game.steps.length
 const result=review?gameResult(game,answers):null
 function exit(action){if(flight.current)return;if((Object.keys(answers).length||failed)&&!window.confirm(t[16]))return;action()}
 function open(n){if(flight.current||failed)return;setId(n);setStep(0);setAnswers({})}
 function back(){if(flight.current||failed)return;if(step>0)setStep(step-1);else exit(()=>{setId(null);setAnswers({})})}
 function choose(v){setAnswers(old=>({...old,[step]:v}))}
 async function save(){
  if(flight.current||!saver.current||!review||notes.length)return
  flight.current=true;setBusy(true)
  try{
   if(!pending.current){const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;pending.current={id:crypto.randomUUID(),revision:0,text:result,tags:[gameTag(day,id)],kind:'note',locale:lang,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId:null}}
   const saved=await saver.current.save(pending.current)
   if(!active.current)return
   pending.current=null;setFailed(false);onSaved(saved);setAnswers({});setStep(0);setId(null)
  }catch(e){if(active.current){if(e.status===401||e.status===403||e.code==='ACCOUNT_CHANGED')onSessionLost();else setFailed(true)}}
  finally{flight.current=false;if(active.current)setBusy(false)}
 }
 const value=answers[step],seconds=slide?.seconds||0,days=antiStressDays(lang)
 function leave(){exit(()=>{if(game&&!failed){setId(null);setStep(0);setAnswers({})}else onClose()})}
 return <div className={css.flow} data-anti-stress-games data-game-day={day}>
  <header className={css.top}><button type="button" disabled={busy} onClick={leave}><ArrowLeft size={21}/>{game&&!failed?t[0]:labels.back}</button><span>Holistic House</span></header>
  <div className={css.course}><Flower2 size={28}/><div><small>{labels.title}</small><strong>{t[2]} {day} · {days[day-1]}</strong><span>{progress.done}/3</span></div></div>
  {!game&&<nav className={css.rail} aria-label={labels.title}>{days.map((title,i)=><button type="button" key={i} aria-label={title} aria-current={day===i+1?'step':undefined} data-verified={gameProgress(entries,i+1).complete} onClick={()=>onSelect(i+1)}>{i+1}</button>)}</nav>}
  {game&&!notes.length&&<nav className={css.gameDots} aria-label={t[1]}>{Array.from({length:5},(_,i)=><span key={i} data-current={i===step} data-past={i<step}/>)}</nav>}
  <section className={css.paper} ref={paper}>
   {!game?<><h2>{progress.complete?t[13]:days[day-1]}</h2><p>{labels.privacy}</p>{games.map(g=>{const n=gameNotes(entries,day,g.id);return <button key={g.id} type="button" className={css.gameTile} onClick={()=>open(g.id)}><span aria-hidden="true">{g.icon}</span><strong>{g.title}</strong>{n.length===1&&decodeSavedGame(n[0],day,g.id)?<Check size={22}/>:<ArrowRight size={20}/>}</button>})}{progress.complete&&<p role="status">✓ {labels.results} · 3/3</p>}<p>{labels.note}</p></>:notes.length>1?<p role="alert">{t[11]}</p>:notes.length===1?<SavedGame key={notes[0].id} note={notes[0]} day={day} game={game} x={x}/>:review?<><h2>{t[5]}</h2><VisualResult day={day} game={game} answers={answers} x={x}/>{failed&&<p role="alert">{t[18]}</p>}</>:<>
    <div className={css.gameIcon} aria-hidden="true">{game.icon}</div><h2>{slide.prompt}</h2>{slide.actionCue&&<p className={css.center} data-practice-action-cue>{slide.actionCue}</p>}{seconds>0&&<PracticeTimer key={id+':'+step} seconds={seconds} x={x}/>}
    {slide.kind==='scale'?<><div className={css.gameMeter} aria-live="polite"><strong>{value===undefined?'—':value===-1?skipLabel(lang):value+'/10'}</strong><div><span style={{width:(value>=0?value:0)*10+'%'}}/></div></div><div className={css.gameScale} role="group" aria-label={t[20]}>{Array.from({length:11},(_,i)=><button key={i} type="button" aria-pressed={value===i} onClick={()=>choose(i)}>{i}</button>)}</div><button type="button" className={css.secondary} aria-pressed={value===-1} onClick={()=>choose(-1)}>{labels.skip}</button></>:slide.kind==='text'?<div className={css.question}><label><span>{labels.input}</span><textarea rows={2} maxLength={140} value={value??''} onChange={e=>choose(e.target.value.replace(/[\r\n]/g,' '))} onBlur={()=>{if(typeof value==='string')choose(value.trim())}}/></label><button type="button" className={css.secondary} aria-pressed={value===''} onClick={()=>choose('')}>{labels.skip}</button></div>:<div className={css.gameChoices} role="group" aria-label={slide.prompt}>{slide.options.map((option,i)=><button type="button" key={i} aria-pressed={value===i} onClick={()=>choose(i)}>{option}{value===i&&<Check size={19}/>}</button>)}</div>}
   </>}
   <p className={css.privacy}>{t[12]}</p>
  </section>
  <footer className={css.footer}>{!game?<button className={css.primary} onClick={progress.complete&&day<3?onNextDay:onClose}>{progress.complete&&day<3?t[14]:labels.back}<ArrowRight size={21}/></button>:notes.length?<button className={css.primary} onClick={()=>{setId(null);setAnswers({});setStep(0)}}>{t[4]}</button>:<div className={css.actions}><button className={css.secondary} disabled={busy||failed} onClick={back}>{t[4]}</button><button className={css.primary} disabled={busy||(!review&&!validGameAnswer(slide,value))} onClick={()=>review?void save():setStep(s=>s+1)}>{busy?t[17]:failed?t[8]:review?t[6]:t[3]}<ArrowRight size={21}/></button></div>}</footer>
 </div>
}
