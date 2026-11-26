'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,Check,Flower2} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {daybookGames,gameNotes,gameProgress,gameTag,validGameAnswer,gameResult} from '@/lib/app/daybook-games.mjs'
import css from './clarity-practice.module.css'
const C={
 ru:['К дневнику','Практики дня','День','Далее','Назад','Мой результат','Сохранить результат','Сохранено','Повторить сохранение','Загрузить записи','Не удалось загрузить записи','Записи дублируются. Проверьте личный дневник.','Личные ответы не передаются коучу автоматически.','Завершено','К следующему дню','Открыть конструктор цели','Выйти без сохранения?','Сохранение…','Не подтверждено. Повторите ту же запись.','Сохранить и закончить','Выберите значение','Мои результаты','Выберите до трёх','Открыть карту жизни и смысловых осей'],
 en:['Back to Daybook','Daily practices','Day','Next','Back','My result','Save result','Saved','Retry save','Load notes','Could not load notes','Duplicate notes. Review your private journal.','Private answers are not automatically shared with a coach.','Completed','Next day','Open goal builder','Leave without saving?','Saving…','Not confirmed. Retry the same note.','Save and finish','Choose a value','My results','Choose up to three','Open life and meaning axes map'],
 es:['Volver al diario','Prácticas del día','Día','Siguiente','Atrás','Mi resultado','Guardar resultado','Guardado','Reintentar','Cargar notas','No se pudieron cargar las notas','Notas duplicadas. Revisa tu diario privado.','Las respuestas privadas no se comparten automáticamente con el coach.','Completado','Siguiente día','Abrir constructor de metas','¿Salir sin guardar?','Guardando…','Sin confirmar. Reintenta la misma nota.','Guardar y terminar','Elige un valor','Mis resultados','Elige hasta tres','Abrir mapa de vida y ejes de significado']
}
export default function DaybookGames(props){
 const lang=Object.hasOwn(C,props.locale)?props.locale:'en',t=C[lang]
 if(props.hasMore)return <div className={css.flow}><button className={css.secondary} onClick={props.onClose}>{t[0]}</button><section className={css.paper}><button className={css.primary} disabled={props.loadingAll} onClick={props.onLoadAll}>{t[9]}</button>{props.loadError&&<p role="alert">{t[10]}</p>}</section></div>
 return <Games key={props.accountId+':'+props.day} {...props} lang={lang} t={t}/>
}
function Games({accountId,day,lang,t,entries,onSaved,onSessionLost,onClose,onNextDay}){
 const games=daybookGames(lang,day),progress=gameProgress(entries,day)
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
 const value=answers[step]
 return <div className={css.flow} data-daybook-games data-game-day={day}>
  <header className={css.top}><button type="button" disabled={busy} onClick={()=>exit(onClose)}><ArrowLeft size={21}/>{t[0]}</button><span>Holistic House</span></header>
  <div className={css.course}><Flower2 size={28}/><div><small>Find Clarity &amp; Support</small><strong>{t[2]} {day} · {t[1]}</strong><span>{progress.done}/3</span></div></div>
  {game&&!notes.length&&<nav className={css.gameDots} aria-label={t[1]}>{Array.from({length:5},(_,i)=><span key={i} data-current={i===step} data-past={i<step}/>)}</nav>}
  <section className={css.paper} ref={paper}>
   {!game?<><h2>{progress.complete?t[13]:t[1]}</h2>{games.map(g=>{const n=gameNotes(entries,day,g.id);return <button key={g.id} type="button" className={css.gameTile} onClick={()=>open(g.id)}><span aria-hidden="true">{g.icon}</span><strong>{g.title}</strong>{n.length===1?<Check size={22}/>:<ArrowRight size={20}/>}</button>})}{progress.complete&&<p role="status">✓ {t[21]} · 3/3</p>}{day===3&&progress.complete&&<Link className={css.tool} href={'/'+lang+'/app/daybook?start=vector'}>{t[15]}<ArrowRight size={18}/></Link>}{day!==2&&<Link className={css.tool} href={'/'+lang+'/development-vectors'} target="_blank" rel="noopener noreferrer">{t[23]}</Link>}</>:notes.length>1?<p role="alert">{t[11]}</p>:notes.length===1?<><h2>{game.icon} {game.title}</h2><p>{notes[0].text}</p><p role="status">✓ {t[7]}</p></>:review?<><h2>{t[5]}</h2><div className={css.tip}><p>{result}</p></div>{failed&&<p role="alert">{t[18]}</p>}</>:<>
    <div className={css.gameIcon} aria-hidden="true">{game.icon}</div><h2>{slide.prompt}</h2>
    {slide.kind==='scale'?<><div className={css.gameMeter} aria-live="polite"><strong>{value===undefined?'—':value+'/10'}</strong><div><span style={{width:(value??0)*10+'%'}}/></div></div><div className={css.gameScale} role="group" aria-label={t[20]}>{Array.from({length:11},(_,i)=><button key={i} type="button" aria-pressed={value===i} onClick={()=>choose(i)}>{i}</button>)}</div></>:<><div className={css.gameChoices} role="group" aria-label={slide.prompt}>{slide.options.map((option,i)=>{const selected=slide.kind==='multi'?(value||[]).includes(i):value===i;return <button type="button" key={i} aria-pressed={selected} onClick={()=>slide.kind==='multi'?choose(selected?value.filter(x=>x!==i):(value||[]).length<3?[...(value||[]),i]:value):choose(i)}>{option}{selected&&<Check size={19}/>}</button>})}</div>{slide.kind==='multi'&&<small>{t[22]} · {(value||[]).length}/3</small>}</>}
   </>}
   <p className={css.privacy}>{t[12]}</p>
  </section>
  <footer className={css.footer}>{!game?<button className={css.primary} onClick={progress.complete&&day<3?onNextDay:onClose}>{progress.complete&&day<3?t[14]:t[0]}<ArrowRight size={21}/></button>:notes.length?<button className={css.primary} onClick={()=>setId(null)}>{t[4]}</button>:<div className={css.actions}><button className={css.secondary} disabled={busy||failed} onClick={back}>{t[4]}</button><button className={css.primary} disabled={busy||(!review&&!validGameAnswer(slide,value))} onClick={()=>review?void save():setStep(s=>s+1)}>{busy?t[17]:failed?t[8]:review?t[6]:t[3]}<ArrowRight size={21}/></button></div>}</footer>
 </div>
}
