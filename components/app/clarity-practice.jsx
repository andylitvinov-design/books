'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,Compass,Flower2,Headphones,MessageCircle,Sparkles} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {CLARITY_PRACTICE_COUNT,clarityPracticeNotes,clarityPracticeProgress,clarityPracticeSteps,clarityPracticeTag} from '@/lib/app/clarity-practice.mjs'
import CoachingQuestionVoice from './coaching-question-voice'
import css from './clarity-practice.module.css'

const COPY={
 ru:{course:'Ясность и поддержка',session:'Сессия 1 · Практика',topic:'Познать себя',back:'Назад',close:'К дневнику',step:'Шаг',of:'из',saved:'Ответ сохранён',next:'Сохранить и далее',continue:'Далее',finish:'Сохранить итоги',nextDay:'К занятию 2',finishToday:'Сохранено · закончить на сегодня',review:'Мои сохранённые ответы',write:'Напишите свой ответ…',read:'Можно читать или слушать озвучку устройства.',tool:'Открыть инструмент в новой вкладке',privacy:'Личные записи не передаются коучу автоматически. Практика не завершает ИИ-сессию.',loading:'Загрузка…',load:'Загрузить все сохранённые ответы',loadError:'Не удалось загрузить все ответы. Повторите попытку.',saving:'Сохраняем…',retry:'Повторить сохранение',error:'Сохранение не подтверждено. Повторите ту же запись или вернитесь и загрузите дневник заново.',duplicate:'Обнаружено несколько записей этого шага. Разберите их в дневнике; ничего не перезаписывается.',journal:'Личный дневник',unsaved:'Несохранённые изменения останутся только на этой странице. Выйти?',congrats:'Вы сделали важный шаг к большей ясности. Ваши ответы сохранены в личном дневнике.',more:'Следующее занятие — понять себя и найти опору.',complete:'Практика завершена!',old:'Ранее сохранённая рефлексия занятия 1',help:'Открыть iHelp',reviewTitle:'Проверьте свои итоги',savedCount:'Сохранённые шаги'},
 en:{course:'Find Clarity & Support',session:'Session 1 · Practice',topic:'Discover yourself',back:'Back',close:'Back to Daybook',step:'Step',of:'of',saved:'Answer saved',next:'Save and continue',continue:'Continue',finish:'Save results',nextDay:'Go to session 2',finishToday:'Saved · finish for today',review:'My saved answers',write:'Write your answer…',read:'Read the text or listen to the device voice.',tool:'Open tool in a new tab',privacy:'Private notes are not shared with a coach automatically. Practice does not complete an AI session.',loading:'Loading…',load:'Load all saved answers',loadError:'Could not load all answers. Try again.',saving:'Saving…',retry:'Retry save',error:'Save not confirmed. Retry the same note, or return and reload the journal.',duplicate:'Several notes exist for this step. Review them in your journal; nothing is overwritten here.',journal:'Private journal',unsaved:'Unsaved changes stay on this page only. Leave?',congrats:'You have taken an important step toward clarity. Your answers are saved in your private journal.',more:'Next session — understand yourself and find support.',complete:'Practice complete!',old:'Previously saved session 1 reflection',help:'Open iHelp',reviewTitle:'Review your results',savedCount:'Saved steps'},
 es:{course:'Claridad y apoyo',session:'Sesión 1 · Práctica',topic:'Conócete',back:'Atrás',close:'Volver al diario',step:'Paso',of:'de',saved:'Respuesta guardada',next:'Guardar y continuar',continue:'Continuar',finish:'Guardar resultados',nextDay:'Ir a la sesión 2',finishToday:'Guardado · terminar por hoy',review:'Mis respuestas guardadas',write:'Escribe tu respuesta…',read:'Lee el texto o escucha la voz del dispositivo.',tool:'Abrir herramienta en otra pestaña',privacy:'Las notas privadas no se comparten con el coach automáticamente. La práctica no completa una sesión de IA.',loading:'Cargando…',load:'Cargar todas las respuestas',loadError:'No se pudieron cargar las respuestas. Reintenta.',saving:'Guardando…',retry:'Reintentar',error:'No se confirmó el guardado. Reintenta la misma nota o vuelve y recarga el diario.',duplicate:'Hay varias notas para este paso. Revísalas en tu diario; no se sobrescribe ninguna.',journal:'Diario privado',unsaved:'Los cambios sin guardar solo quedan en esta página. ¿Salir?',congrats:'Has dado un paso importante hacia la claridad. Tus respuestas están guardadas en tu diario privado.',more:'Siguiente sesión: compréndete y encuentra apoyo.',complete:'¡Práctica completada!',old:'Reflexión anterior de la sesión 1',help:'Abrir iHelp',reviewTitle:'Revisa tus resultados',savedCount:'Pasos guardados'}
}
function Header({t,onClose,disabled}){
 return <header className={css.top}><button type="button" onClick={onClose} disabled={disabled} aria-label={t.close}><ArrowLeft size={22}/><span><Sparkles size={16}/>Holistic House</span></button><button type="button" className={css.help} aria-label={t.help} aria-haspopup="dialog" onClick={()=>window.dispatchEvent(new Event('hh:open-ihelp'))}><MessageCircle size={19}/>iHelp</button></header>
}
export default function ClarityPractice({accountId,locale='en',entries,hasMore,loadingAll,loadError,onLoadAll,onSaved,onSessionLost,onClose,onNextDay,oldNotes=[]}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang]
 if(hasMore)return <div className={css.flow} data-clarity-practice-flow><Header t={t} onClose={onClose}/><div className={css.paper}><h2>{t.session}</h2><button type="button" className={css.primary} disabled={loadingAll} onClick={onLoadAll}>{loadingAll?t.loading:t.load}</button>{loadError&&<p role="alert">{t.loadError}</p>}</div></div>
 return <ReadyPractice key={accountId} {...{accountId,lang,t,entries,onSaved,onSessionLost,onClose,onNextDay,oldNotes}}/>
}
function ReadyPractice({accountId,lang,t,entries,onSaved,onSessionLost,onClose,onNextDay,oldNotes}){
 const steps=clarityPracticeSteps(lang),progress=clarityPracticeProgress(entries)
 const [step,setStep]=useState(()=>progress.firstMissing),[drafts,setDrafts]=useState({}),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[editingFinal,setEditingFinal]=useState(false)
 const saver=useRef(null),pending=useRef(null),active=useRef(false),inFlight=useRef(false),paper=useRef(null),heading=useRef(null)
 useEffect(()=>{active.current=true;const instance=createJournalSaver(appFetch,accountId);saver.current=instance;return()=>{active.current=false;instance.discard();saver.current=null}},[accountId])
 useEffect(()=>{if(paper.current)paper.current.scrollTop=0;heading.current?.focus({preventScroll:true})},[step,editingFinal])
 const slide=steps[step-1],notes=clarityPracticeNotes(entries,step),entry=notes.length===1?notes[0]:null
 const text=drafts[step]??entry?.text??''
 const duplicate=notes.length>1,final=step===CLARITY_PRACTICE_COUNT
 const done=final&&progress.complete&&!editingFinal
 const root='/'+lang
 const tools={vectors:root+'/development-vectors',profile:root+'/app/portrait'}
 const dirty=Object.entries(drafts).some(([n,value])=>value.trim()!==(clarityPracticeNotes(entries,Number(n))[0]?.text||''))
 function close(){
  if(inFlight.current)return
  if((dirty||failed)&&!window.confirm(t.unsaved))return
  onClose()
 }
 function go(number){
  if(inFlight.current||failed||number<1||number>progress.firstMissing)return
  setStep(number);setEditingFinal(false)
 }
 async function save(){
  if(inFlight.current||!saver.current||duplicate||!text.trim()||step>progress.firstMissing)return
  if(final&&!progress.valid.slice(0,-1).every(Boolean))return
  if(!failed&&entry?.text===text.trim()){
   setDrafts(old=>{const next={...old};delete next[step];return next})
   if(final)setEditingFinal(false)
   else setStep(step+1)
   return
  }
  inFlight.current=true;setBusy(true)
  try{
   if(!pending.current){
    const timezone=entry?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone
    pending.current={id:entry?.id||crypto.randomUUID(),revision:entry?.revision||0,text:text.trim(),tags:entry?.tags||[clarityPracticeTag(step)],kind:'note',locale:entry?.locale||lang,timezone,localDay:entry?.localDay||localJournalDay(new Date().toISOString(),timezone),goalId:null}
   }
   const saved=await saver.current.save(pending.current)
   if(!active.current)return
   pending.current=null;setFailed(false)
   setDrafts(old=>{const next={...old};delete next[step];return next})
   onSaved(saved)
   if(final)setEditingFinal(false)
   else setStep(step+1)
  }catch(error){
   if(!active.current)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')onSessionLost()
   else setFailed(true)
  }finally{inFlight.current=false;if(active.current)setBusy(false)}
 }
 const complete=done
 const first=step===1
 return <div className={css.flow} data-clarity-practice-flow data-practice-step={step}>
  <Header t={t} onClose={close} disabled={busy}/>
  <div className={css.course}><Flower2 size={28}/><div><small>{t.course}</small><strong>{t.session}</strong><span>{t.topic}</span></div></div>
  <nav className={css.rail} aria-label={t.savedCount}>{steps.map(s=><button type="button" key={s.number} aria-current={s.number===step?'step':undefined} aria-label={t.step+' '+s.number+' '+s.title} data-verified={progress.valid[s.number-1]&&(s.number!==7||progress.complete)?'true':undefined} disabled={busy||failed||s.number>progress.firstMissing} onClick={()=>go(s.number)}>{progress.valid[s.number-1]&&(s.number!==7||progress.complete)?<Check size={19}/>:s.number}</button>)}</nav>
  <div className={css.stepLabel} aria-live="polite">{complete?t.complete:t.step+' '+step+' '+t.of+' '+CLARITY_PRACTICE_COUNT+' · '+slide.title}</div>
  <main className={css.paper} ref={paper}>
   {complete?<><div className={css.celebrate} data-practice-art="sunrise"><span><Check size={48}/></span><h2 ref={heading} tabIndex={-1}>{t.complete}</h2></div><p className={css.center}>{t.congrats}</p><div className={css.tip}><Flower2 size={29}/><p>{t.more}</p></div><details className={css.review}><summary>{t.review}</summary>{steps.map(s=><div key={s.number}><b>{s.title}</b><p>{clarityPracticeNotes(entries,s.number)[0]?.text}</p></div>)}</details><button type="button" className={css.secondary} onClick={()=>{setDrafts(old=>({...old,[step]:entry.text}));setEditingFinal(true)}}>{t.reviewTitle} <BookOpen size={18}/></button></>:
   <>
    <h2 ref={heading} tabIndex={-1}>{final?t.reviewTitle:slide.title}</h2>
    {!final&&<div className={css.art} data-practice-art={slide.art} aria-hidden="true">{first&&<span><Headphones size={36}/></span>}</div>}
    <p>{slide.body}</p>
    {first&&<div className={css.audio}><CoachingQuestionVoice text={slide.body} locale={lang} allowDictation={false} disabled={busy||failed||duplicate}/><small>{t.read}</small></div>}
    {slide.tool&&<Link href={tools[slide.tool]} target="_blank" rel="noopener noreferrer" prefetch={false} className={css.tool}><Compass size={20}/>{t.tool}<ArrowRight size={18}/></Link>}
    {final&&<details className={css.review} open><summary>{t.review}</summary>{steps.slice(0,-1).map(s=><div key={s.number}><b>{s.title}</b><p>{clarityPracticeNotes(entries,s.number)[0]?.text}</p></div>)}</details>}
    {duplicate?<div role="alert" className={css.tip}><p>{t.duplicate}</p><Link href={root+'/app/daybook?tab=journal'} prefetch={false} target="_blank" rel="noopener noreferrer">{t.journal}</Link></div>:<label className={css.question}><span><Flower2 size={23}/>{slide.question}</span><textarea value={text} onChange={e=>setDrafts(old=>({...old,[step]:e.target.value}))} placeholder={t.write} rows={3} maxLength={2000} disabled={busy||failed}/></label>}
    {entry&&!duplicate&&<p className={css.saved} role="status"><CheckCircle2 size={17}/>{t.saved}</p>}
    {failed&&<p role="alert">{t.error}</p>}
   </>}
   {oldNotes.length>0&&step===1&&<details className={css.review}><summary>{t.old}</summary>{oldNotes.map(e=><p key={e.id}>{e.text}</p>)}</details>}
   <p className={css.privacy}>{t.privacy}</p>
  </main>
  <footer className={css.footer}><div className={css.progressLabel}><span>{t.savedCount}: {progress.done}/{progress.total}</span><strong>{Math.round(progress.done/progress.total*100)}%</strong></div><progress value={progress.done} max={progress.total} aria-label={t.savedCount}/>
   {complete?<><button type="button" className={css.primary} onClick={onNextDay}>{t.nextDay}<ArrowRight size={22}/></button><button type="button" className={css.secondary} onClick={close}>{t.finishToday}<BookOpen size={19}/></button></>:<div className={css.actions}><button type="button" className={css.secondary} onClick={()=>step===1?close():go(step-1)} disabled={busy||failed}><ArrowLeft size={21}/>{t.back}</button><button type="button" className={css.primary} disabled={busy||duplicate||!text.trim()||step>progress.firstMissing} onClick={()=>void save()}>{busy?t.saving:failed?t.retry:final?t.finish:entry?.text===text.trim()?t.continue:t.next}<ArrowRight size={22}/></button></div>}
  </footer>
 </div>
}
