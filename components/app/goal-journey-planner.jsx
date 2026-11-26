'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {GOAL_JOURNEY_TAG,goalJourneySchedule,goalJourneyText,goalJourneyNotes,parseGoalJourneyNote} from '@/lib/app/goal-journey-schedule.mjs'
import css from './clarity-program.module.css'

const copy={
 en:{title:'My Coaching Journey',intro:'Plan eight Goal coaching topics in 28 or 49 days, then choose your next step. This is a private planning preference, not enrollment, verified completion or payment access.',pace:'Preferred pace',fast:'28 days · intensive',slow:'49 days · steady',start:'Start date',end:'Integration until',save:'Save my schedule',update:'Update schedule',saved:'Schedule saved and verified',saving:'Saving…',retry:'Retry saving',error:'Could not verify the save. Retry the same draft or reload to review.',load:'Load all saved entries',loading:'Loading…',ambiguous:'A schedule note needs review. Open your private journal; we will not overwrite it.',journal:'Private journal',today:'Today & weekly review',coach:'Choose a coach',reports:'Saved coaching reports',plan:'Goals and actions',privacy:'Dates are suggestions. Changing them does not change your session history or payments.',invalid:'Choose a valid start date.',locked:'Finish or save the current guide step first.'},
 ru:{title:'My Coaching Journey',intro:'Спланируйте восемь тем Goal на 28 или 49 дней. Это личный план, а не запись на курс, подтверждение завершения сессии или право на платные услуги.',pace:'Предпочтительный темп',fast:'28 дней · интенсивно',slow:'49 дней · размеренно',start:'Дата начала',end:'Интеграция до',save:'Сохранить график',update:'Обновить график',saved:'График сохранён и проверен',saving:'Сохраняем…',retry:'Повторить сохранение',error:'Не удалось подтвердить сохранение. Повторите тот же черновик или обновите страницу для проверки.',load:'Загрузить все сохранённые записи',loading:'Загружаем…',ambiguous:'Запись графика требует проверки. Откройте личный дневник; мы ничего не перезапишем.',journal:'Личный дневник',today:'Сегодня и недельный обзор',coach:'Выбрать коуча',reports:'Сохранённые отчёты коучинга',plan:'Цели и действия',privacy:'Даты рекомендательные. Изменение графика не меняет историю сессий и оплату.',invalid:'Выберите корректную дату начала.',locked:'Сначала сохраните или завершите текущий шаг гида.'},
 es:{title:'My Coaching Journey',intro:'Planifica ocho temas de Goal en 28 o 49 días. Es una preferencia privada de planificación, no una inscripción, finalización verificada ni acceso de pago.',pace:'Ritmo preferido',fast:'28 días · intensivo',slow:'49 días · gradual',start:'Fecha de inicio',end:'Integración hasta',save:'Guardar mi calendario',update:'Actualizar calendario',saved:'Calendario guardado y verificado',saving:'Guardando…',retry:'Reintentar guardado',error:'No se confirmó el guardado. Reintenta el mismo borrador o recarga para revisar.',load:'Cargar todas las notas guardadas',loading:'Cargando…',ambiguous:'Hay una nota de calendario que requiere revisión. Abre tu diario privado; no la sobrescribiremos.',journal:'Diario privado',today:'Hoy y revisión semanal',coach:'Elegir un coach',reports:'Informes de coaching guardados',plan:'Metas y acciones',privacy:'Las fechas son orientativas. Cambiarlas no modifica tus sesiones ni tus pagos.',invalid:'Elige una fecha de inicio válida.',locked:'Primero guarda o finaliza el paso actual de la guía.'}
}
function ScheduleEditor({accountId,locale,today,entry,disabled,onSaved,onSessionLost}){
 const t=copy[locale]
 const original=parseGoalJourneyNote(entry)
 const [pace,setPace]=useState(original?.pace||49),[startDay,setStartDay]=useState(original?.startDay||today)
 const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
 const saver=useRef(null),pending=useRef(null),alive=useRef(false),inFlight=useRef(false)
 useEffect(()=>{alive.current=true;const instance=createJournalSaver(appFetch,accountId);saver.current=instance;return()=>{alive.current=false;instance.discard();saver.current=null}},[accountId])
 let plan=null
 try{plan=goalJourneySchedule(startDay,pace,locale)}catch{}
 const changed=original?.pace!==pace||original?.startDay!==startDay
 const locked=disabled||busy||failed
 const labelDate=day=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))
 async function save(){
  if(disabled||inFlight.current||!saver.current||!plan||(!failed&&!changed))return
  inFlight.current=true;setBusy(true)
  try{
   if(!pending.current){
    const timezone=entry?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone
    pending.current={id:entry?.id||crypto.randomUUID(),revision:entry?.revision||0,text:goalJourneyText(startDay,pace),tags:entry?.tags||[GOAL_JOURNEY_TAG],kind:'note',locale:entry?.locale||locale,timezone,localDay:entry?.localDay||localJournalDay(new Date().toISOString(),timezone),goalId:null}
   }
   const saved=await saver.current.save(pending.current)
   if(!alive.current)return
   pending.current=null;setFailed(false);onSaved(saved)
  }catch(error){
   if(!alive.current)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')onSessionLost()
   else setFailed(true)
  }finally{inFlight.current=false;if(alive.current)setBusy(false)}
 }
 return <>
  <div className={css.reflection}>
   <label>{t.pace}<select value={pace} disabled={locked} onChange={event=>setPace(Number(event.target.value))}><option value={28}>{t.fast}</option><option value={49}>{t.slow}</option></select></label>
   <label>{t.start}<input type="date" min="1900-01-01" max="9998-12-31" value={startDay} disabled={locked} onChange={event=>setStartDay(event.target.value)}/></label>
   {!plan&&<p role="alert">{t.invalid}</p>}
   {entry&&!changed&&!failed&&<p role="status">{t.saved}</p>}
   {failed&&<p role="alert">{t.error}</p>}
   {disabled&&<p>{t.locked}</p>}
   <button type="button" className={css.primary} disabled={disabled||busy||!plan||(!changed&&!failed)} onClick={()=>void save()}>{busy?t.saving:failed?t.retry:entry?t.update:t.save}</button>
  </div>
  {plan&&<><ol data-goal-journey-schedule>{plan.sessions.map(session=><li key={session.id}><strong>{session.title}</strong> — <time dateTime={session.date}>{labelDate(session.date)}</time></li>)}</ol><p>{t.end}: <time dateTime={plan.endDay}>{labelDate(plan.endDay)}</time></p></>}
 </>
}
export default function GoalJourneyPlanner({accountId,locale='en',today,entries,hasMore,loadingAll,loadError,onLoadAll,onSaved,onSessionLost,disabled,onTab}){
 const lang=Object.hasOwn(copy,locale)?locale:'en',t=copy[lang],root='/'+lang
 const notes=goalJourneyNotes(entries),entry=notes[0]
 return <details className={css.shell} data-goal-journey-planner>
  <summary>{t.title}</summary><p>{t.intro}</p>
  {hasMore?<><button type="button" disabled={loadingAll||disabled} onClick={onLoadAll}>{loadingAll?t.loading:t.load}</button>{loadError&&<p role="alert">{t.error}</p>}</>:
   notes.length>1||(entry&&!parseGoalJourneyNote(entry))?<p role="alert">{t.ambiguous}</p>:
   <ScheduleEditor key={entry?entry.id+':'+entry.revision:'new'} accountId={accountId} locale={lang} today={today} entry={entry} disabled={disabled||loadingAll} onSaved={onSaved} onSessionLost={onSessionLost}/>}
  <p>{t.privacy}</p>
  <div className={css.reflection}>
   <button type="button" disabled={disabled} onClick={()=>onTab('today')}>{t.today}</button>
   <button type="button" disabled={disabled} onClick={()=>onTab('journal')}>{t.journal}</button>
   <Link href={root+'/my-coach'} prefetch={false}>{t.coach}</Link>
   <Link href={root+'/app/my-coaching-plan?tab=reports'} prefetch={false}>{t.reports}</Link>
   <Link href={root+'/app/my-coaching-plan'} prefetch={false}>{t.plan}</Link>
  </div>
 </details>
}
