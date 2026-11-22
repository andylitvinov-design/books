'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {createDailyEditorSession} from '@/lib/app/daybook-daily-client.mjs'
import DaybookDailyExport from './daybook-daily-export'
import css from './daybook-today.module.css'
const COPY={
 en:{title:'What matters today?',day:'Plan date',focus:'My focus for this week (optional)',none:'No selected focus',actions:'Choose up to three realistic steps',empty:'No confirmed open actions yet. You can review your goals and coaching actions in your plan.',plan:'Open my goals and actions',previous:'A previous day to review',review:'Review unfinished steps',carry:'Choose steps to carry into this day',nothing:'No confirmed open steps from that day.',save:'Save my daily plan',reload:'Reload saved plan',discard:'Discard this unsaved selection and read the saved plan?',clear:'Clear this saved daily plan',confirm:'Clear this daily plan? Your goals, actions and journal entries will remain.',saving:'Saving…',saved:'Saved and verified',failed:'Save not confirmed. Your selection remains here. Retry or reload before editing.',invalid:'Check your selection. Nothing has been confirmed as saved.',limit:'Choose at most three steps.',loading:'Opening your daily plan…',error:'Could not load your daily plan.',unavailable:'Previously selected item is unavailable. Remove it to update the plan.',privacy:'Choosing a step does not complete it. This plan is private and is not shared with a coach automatically.',timezone:'Saved time zone',clearing:'Clearing…',deleted:'Daily plan deletion verified','delete-failed':'Deletion not confirmed. Retry clearing or reload.','carry-error':'Could not review that earlier day. Your selection remains here.'},
 ru:{title:'Что сегодня важнее всего?',day:'Дата плана',focus:'Мой фокус на неделю (необязательно)',none:'Фокус не выбран',actions:'Выберите до трёх реалистичных шагов',empty:'Подтверждённых открытых действий пока нет. Посмотрите свои цели и действия из коучинга в плане.',plan:'Открыть мои цели и действия',previous:'Прошлый день для обзора',review:'Посмотреть незавершённые шаги',carry:'Выберите шаги для переноса на этот день',nothing:'Подтверждённых открытых шагов за этот день нет.',save:'Сохранить мой план дня',reload:'Загрузить сохранённый план',discard:'Отбросить несохранённый выбор и прочитать сохранённый план?',clear:'Очистить сохранённый план дня',confirm:'Очистить план этого дня? Цели, действия и записи дневника останутся.',saving:'Сохранение…',saved:'Сохранено и проверено',failed:'Сохранение не подтверждено. Выбор остаётся здесь. Повторите или загрузите план перед изменением.',invalid:'Проверьте выбор. Сохранение не подтверждено.',limit:'Выберите не более трёх шагов.',loading:'Открываем план дня…',error:'Не удалось загрузить план дня.',unavailable:'Ранее выбранный элемент недоступен. Уберите его, чтобы обновить план.',privacy:'Выбор шага не означает его выполнение. План приватный и не передаётся коучу автоматически.',timezone:'Сохранённый часовой пояс',clearing:'Очистка…',deleted:'Удаление плана дня проверено','delete-failed':'Удаление не подтверждено. Повторите очистку или загрузите план.','carry-error':'Не удалось прочитать прошлый день. Ваш выбор остаётся здесь.'},
 es:{title:'¿Qué importa hoy?',day:'Fecha del plan',focus:'Mi enfoque de la semana (opcional)',none:'Sin enfoque seleccionado',actions:'Elige hasta tres pasos realistas',empty:'Aún no hay acciones abiertas confirmadas. Puedes revisar tus objetivos y acciones de coaching en tu plan.',plan:'Abrir mis objetivos y acciones',previous:'Un día anterior para revisar',review:'Revisar pasos pendientes',carry:'Elige pasos para trasladar a este día',nothing:'No hay pasos abiertos confirmados de ese día.',save:'Guardar mi plan diario',reload:'Recargar el plan guardado',discard:'¿Descartar esta selección sin guardar y leer el plan guardado?',clear:'Borrar este plan diario guardado',confirm:'¿Borrar este plan diario? Tus objetivos, acciones y entradas del diario permanecerán.',saving:'Guardando…',saved:'Guardado y verificado',failed:'Guardado sin confirmar. Tu selección sigue aquí. Reintenta o recarga antes de editar.',invalid:'Revisa tu selección. No se ha confirmado el guardado.',limit:'Elige como máximo tres pasos.',loading:'Abriendo tu plan diario…',error:'No se pudo cargar el plan diario.',unavailable:'El elemento seleccionado ya no está disponible. Quítalo para actualizar el plan.',privacy:'Elegir un paso no significa completarlo. Este plan es privado y no se comparte automáticamente con un coach.',timezone:'Zona horaria guardada',clearing:'Borrando…',deleted:'Eliminación del plan diario verificada','delete-failed':'Eliminación sin confirmar. Reintenta borrar o recarga.','carry-error':'No se pudo revisar ese día anterior. Tu selección sigue aquí.'},
}
export default function DaybookToday({accountId,locale,initialDay,memory,onSessionLost}){
 const c=COPY[locale]||COPY.en
 const [day,setDay]=useState(()=>memory?.get(accountId)?.localDay||initialDay),[sourceDay,setSourceDay]=useState(''),[view,setView]=useState(null)
 const active=useRef(null),lost=useRef(onSessionLost)
 useEffect(()=>{lost.current=onSessionLost},[onSessionLost])
 useEffect(()=>{
  if(!accountId)return
  const cached=memory?.get(accountId)
  const session=cached?.localDay===day?cached.selection.session:createDailyEditorSession(appFetch,accountId,day,Intl.DateTimeFormat().resolvedOptions().timeZone,locale)
  memory?.set(accountId,{localDay:day,selection:{session}});active.current=session;setSourceDay('')
  const update=()=>setView(session.snapshot());update()
  const unsubscribe=session.subscribe(update);void session.load()
  return ()=>{unsubscribe();if(!memory)session.dispose();active.current=null}
 },[accountId,day,locale,memory])
 useEffect(()=>{if(view?.owner===accountId&&view.phase==='signed-out')lost.current?.()},[view,accountId])
 if(!accountId||view?.owner!==accountId)return null
 if(view.phase!=='ready'||!view.draft||view.localDay!==day)return <section className={css.panel}><h2>{c.title}</h2><p role="status">{view.phase==='error'?c.error:c.loading}</p>{view.phase==='error'&&<button onClick={()=>void active.current?.load(true)}>{c.reload}</button>}</section>
 const {draft,plan}=view,session=active.current,locked=view.busy||session?.hasPending()
 const goals=plan.goals.filter(goal=>['accepted','active'].includes(goal.status)||goal.id===draft.weeklyGoalId)
 const goalById=new Map(plan.goals.map(goal=>[goal.id,goal])),actionById=new Map(plan.actions.map(action=>[action.id,action]))
 const open=plan.actions.filter(action=>['accepted','active'].includes(action.status)&&['accepted','active'].includes(goalById.get(action.goalId)?.status)&&typeof action.clientConfirmedAt==='string'&&Number.isFinite(Date.parse(action.clientConfirmedAt)))
 const visible=[...new Set([...open.map(action=>action.id),...draft.actionIds])]
 const source=sourceDay||view.offer?.day||draft.carryFromDay||''
 function reload(){if((!view.dirty&&!session.hasPending())||window.confirm(c.discard))void session.load(true)}
 function chooseDay(value){if(value&&((!view.dirty&&!session.hasPending())||window.confirm(c.discard)))setDay(value)}
 return <section className={css.panel} aria-label={c.title}><h2>{c.title}</h2>
  <label>{c.day}<input type="date" value={day} disabled={locked} onChange={e=>chooseDay(e.target.value)}/></label>
  <p>{c.timezone}: {draft.timezone}</p>
  <label>{c.focus}<select value={draft.weeklyGoalId||''} disabled={locked} onChange={e=>session.setFocus(e.target.value||null)}><option value="">{c.none}</option>
   {draft.weeklyGoalId&&!goalById.has(draft.weeklyGoalId)&&<option value={draft.weeklyGoalId}>{c.unavailable}</option>}
   {goals.map(goal=><option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
  <fieldset disabled={locked}><legend>{c.actions}</legend>{!visible.length&&<p>{c.empty}</p>}
   {visible.map(id=><label className={css.choice} key={id}><input type="checkbox" checked={draft.actionIds.includes(id)} onChange={()=>session.toggleAction(id)}/><span>{actionById.get(id)?.description||c.unavailable}</span></label>)}
  </fieldset>
  <details><summary>{c.previous}</summary><label>{c.previous}<input type="date" value={source} max={day} disabled={locked||draft.carriedActionIds.length>0} onChange={e=>setSourceDay(e.target.value)}/></label>
   <button disabled={locked||!source} onClick={()=>void session.reviewCarryover(source)}>{c.review}</button></details>
  {view.offer&&<fieldset disabled={locked}><legend>{c.carry}</legend>{!view.offer.actionIds.length&&<p>{c.nothing}</p>}{view.offer.actionIds.map(id=><label className={css.choice} key={id}><input type="checkbox" checked={draft.carriedActionIds.includes(id)} onChange={()=>session.toggleCarry(id)}/><span>{actionById.get(id)?.description||c.unavailable}</span></label>)}</fieldset>}
  <p>{c.privacy}</p><button className={css.primary} disabled={view.busy||view.status==='delete-failed'} onClick={()=>void session.save()}>{c.save}</button>
  <button disabled={view.busy} onClick={reload}>{c.reload}</button>
  {draft.revision>0&&<button disabled={view.busy||view.status==='failed'} onClick={()=>{if(view.status==='delete-failed'||window.confirm(c.confirm))void session.remove()}}>{c.clear}</button>}
  <p role="status">{c[view.status]||''}</p><Link href={'/'+locale+'/app/my-coaching-plan'}>{c.plan}</Link>
  <DaybookDailyExport accountId={accountId} locale={locale} disabled={view.busy} onSessionLost={onSessionLost}/>
 </section>
}
