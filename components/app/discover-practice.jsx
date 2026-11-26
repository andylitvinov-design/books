'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {discoverPractices,discoverNotes,discoverRecordedDays} from '@/lib/app/discover-practice.mjs'
import css from './clarity-program.module.css'

const copy={
 en:{coach:"Choose an AI coach",title:'Discover Yourself · 7 days',intro:'Seven optional self-guided practices. Work at your own pace. These notes do not mark an AI session complete or unlock paid sessions.',day:'Day',saved:'Note saved and verified',count:'Days with saved notes',note:'Private reflection',save:'Save reflection',update:'Update reflection',retry:'Retry save',saving:'Saving…',error:'Save not confirmed. Retry the same draft before editing.',load:'Load all saved entries before editing',loading:'Loading…',duplicate:'More than one note exists for this day. Open your journal to review them; nothing is overwritten here.',journal:'Open private journal',privacy:'Notes stay private. They are not automatically shared with a coach. Unsaved drafts stay on this page only.'},
 ru:{coach:"Выбрать AI-коуча",title:'Discover Yourself · 7 дней',intro:'Семь добровольных самостоятельных практик. Проходите в своём темпе. Записи не отмечают AI-сессию завершённой и не открывают платные встречи.',day:'День',saved:'Запись сохранена и проверена',count:'Дней с сохранёнными записями',note:'Личная рефлексия',save:'Сохранить рефлексию',update:'Обновить рефлексию',retry:'Повторить сохранение',saving:'Сохраняем…',error:'Сохранение не подтверждено. Повторите сохранение того же черновика перед редактированием.',load:'Загрузить все записи перед редактированием',loading:'Загружаем…',duplicate:'За этот день есть несколько записей. Посмотрите их в дневнике; здесь ничего не перезаписывается.',journal:'Открыть личный дневник',privacy:'Записи приватны и не передаются коучу автоматически. Несохранённые черновики остаются только на этой странице.'},
 es:{coach:"Elegir un coach de IA",title:'Discover Yourself · 7 días',intro:'Siete prácticas voluntarias y autónomas. Avanza a tu ritmo. Las notas no completan una sesión de IA ni desbloquean sesiones de pago.',day:'Día',saved:'Nota guardada y verificada',count:'Días con notas guardadas',note:'Reflexión privada',save:'Guardar reflexión',update:'Actualizar reflexión',retry:'Reintentar',saving:'Guardando…',error:'No se confirmó el guardado. Reintenta el mismo borrador antes de editar.',load:'Cargar todas las notas antes de editar',loading:'Cargando…',duplicate:'Hay varias notas para este día. Revísalas en tu diario; aquí no se sobrescribe nada.',journal:'Abrir diario privado',privacy:'Las notas son privadas y no se comparten automáticamente con un coach. Los borradores sin guardar solo permanecen en esta página.'}
}
function PracticeNote({accountId,locale,practice,entry,onSaved,onSessionLost}){
 const t=copy[locale]||copy.en
 const [text,setText]=useState(entry?.text||''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
 const saver=useRef(null),pending=useRef(null),active=useRef(false),inFlight=useRef(false)
 useEffect(()=>{active.current=true;const instance=createJournalSaver(appFetch,accountId);saver.current=instance;return()=>{active.current=false;instance.discard();saver.current=null}},[accountId])
 async function save(){
  if(inFlight.current||!saver.current||!text.trim())return
  inFlight.current=true;setBusy(true)
  try{
   if(!pending.current){
    const timezone=entry?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone
    pending.current={id:entry?.id||crypto.randomUUID(),revision:entry?.revision||0,text:text.trim(),tags:entry?.tags||[practice.tag],kind:'note',locale:entry?.locale||locale,timezone,localDay:entry?.localDay||localJournalDay(new Date().toISOString(),timezone),goalId:null}
   }
   const saved=await saver.current.save(pending.current)
   if(!active.current)return
   pending.current=null;setText(saved.text);setFailed(false);onSaved(saved)
  }catch(error){
   if(!active.current)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')onSessionLost()
   else setFailed(true)
  }finally{inFlight.current=false;if(active.current)setBusy(false)}
 }
 return <div className={css.reflection}>
  <label>{t.note}<textarea rows={4} maxLength={20000} value={text} disabled={busy||failed} onChange={e=>setText(e.target.value)}/></label>
  {entry&&<p role="status">{t.saved}</p>}
  {failed&&<p role="alert">{t.error}</p>}
  <button type="button" className={css.primary} onClick={()=>void save()} disabled={busy||!text.trim()||(!failed&&entry?.text===text.trim())}>{busy?t.saving:failed?t.retry:entry?t.update:t.save}</button>
 </div>
}
export default function DiscoverPractice({accountId,locale='en',entries,hasMore,loadingAll,loadError,onLoadAll,onSaved,onSessionLost}){
 const lang=Object.hasOwn(copy,locale)?locale:'en',t=copy[lang]
 const practices=discoverPractices(lang)
 if(hasMore)return <section className={css.shell} data-discover-practice><h2>{t.title}</h2><p>{t.intro}</p><button type="button" disabled={loadingAll} onClick={onLoadAll}>{loadingAll?t.loading:t.load}</button>{loadError&&<p role="alert">{t.error}</p>}</section>
 return <section className={css.shell} data-discover-practice>
  <header className={css.hero}><h2>{t.title}</h2><p>{t.intro}</p></header>
  <p>{t.count}: {discoverRecordedDays(entries).length} / 7</p>
  {practices.map(practice=>{
   const notes=discoverNotes(entries,practice.day)
   return <details className={css.card} key={practice.day}><summary>{t.day} {practice.day} — {practice.title}</summary><p>{practice.prompt}</p>
    {notes.length>1?<p>{t.duplicate}</p>:<PracticeNote key={notes[0]?.id||'new'} accountId={accountId} locale={lang} practice={practice} entry={notes[0]} onSaved={onSaved} onSessionLost={onSessionLost}/>}
   </details>
  })}
  <p>{t.privacy}</p><div className={css.reflection}><Link href={'/'+lang+'/my-coach'} prefetch={false}>{t.coach}</Link></div><Link href={'/'+lang+'/app/daybook?tab=journal'} prefetch={false}>{t.journal}</Link>
 </section>
}
