'use client'
import {useEffect,useRef,useState} from 'react'
import {actionTransition} from '@/lib/app/daybook-personal-action-contract.mjs'
import css from './daybook-goal-editor.module.css'
const COPY={
 en:{planning:'Optional planning details',heading:'My next step',description:'What I will do',timing:'When I will do it',trigger:'What will remind me',obstacle:'What might get in the way',fallback:'My gentler alternative',feasibility:'How doable is this? (optional, 0–10)',unknown:'Not rated',stage:'Stage',confirm:'I confirm this step and its selected stage.',save:'Save step',saving:'Saving…',saved:'Saved and verified',failed:'Not confirmed. Your draft remains here. Retry the same operation before editing.',invalid:'Check the fields. Your draft remains here.',remove:'Delete step permanently',deleting:'Deleting…',deleteConfirm:'Permanently delete this step and its encrypted change history?',retryDelete:'Retry deletion'},
 ru:{planning:'Дополнительные детали шага',heading:'Мой следующий шаг',description:'Что я сделаю',timing:'Когда я это сделаю',trigger:'Что напомнит мне',obstacle:'Что может помешать',fallback:'Мой мягкий альтернативный шаг',feasibility:'Насколько это выполнимо? (необязательно, 0–10)',unknown:'Без оценки',stage:'Этап',confirm:'Я подтверждаю этот шаг и выбранный этап.',save:'Сохранить шаг',saving:'Сохранение…',saved:'Сохранено и проверено',failed:'Не подтверждено. Черновик остаётся здесь. Повторите ту же операцию перед изменением.',invalid:'Проверьте поля. Черновик остаётся здесь.',remove:'Удалить шаг навсегда',deleting:'Удаление…',deleteConfirm:'Безвозвратно удалить этот шаг и зашифрованную историю изменений?',retryDelete:'Повторить удаление'},
 es:{planning:'Detalles opcionales del paso',heading:'Mi siguiente paso',description:'Qué haré',timing:'Cuándo lo haré',trigger:'Qué me lo recordará',obstacle:'Qué podría dificultarlo',fallback:'Mi alternativa más suave',feasibility:'¿Es realizable? (opcional, 0–10)',unknown:'Sin valorar',stage:'Etapa',confirm:'Confirmo este paso y la etapa seleccionada.',save:'Guardar paso',saving:'Guardando…',saved:'Guardado y verificado',failed:'Sin confirmar. El borrador sigue aquí. Reintenta la misma operación antes de editar.',invalid:'Revisa los campos. El borrador sigue aquí.',remove:'Eliminar paso permanentemente',deleting:'Eliminando…',deleteConfirm:'¿Eliminar permanentemente este paso y su historial cifrado?',retryDelete:'Reintentar eliminación'},
}
const STAGES=['proposed','accepted','active','deferred','declined','completed','cancelled']
const LABELS={en:['Proposed','Accepted','Active','Deferred','Declined','Completed','Cancelled'],ru:['Предложен','Принят','Активен','Отложен','Отклонён','Завершён','Отменён'],es:['Propuesto','Aceptado','Activo','Aplazado','Rechazado','Completado','Cancelado']}
export default function DaybookActionEditor({accountId,locale='en',editorSession,onSaved,onDeleted,onSessionLost,goalTitle}){
 const lang=COPY[locale]?locale:'en',c=COPY[lang],[state,setState]=useState(null),notified=useRef(null),callbacks=useRef({onSaved,onDeleted,onSessionLost})
 useEffect(()=>{callbacks.current={onSaved,onDeleted,onSessionLost}},[onSaved,onDeleted,onSessionLost])
 useEffect(()=>{setState(editorSession?.snapshot());return editorSession?.subscribe(()=>setState(editorSession.snapshot()))},[editorSession])
 useEffect(()=>{
  if(state?.owner!==accountId)return
  if(state.status==='signed-out')callbacks.current.onSessionLost?.()
  if(state.result&&notified.current!==state.result){
   notified.current=state.result
   if(state.status==='saved')callbacks.current.onSaved?.(state.result,accountId)
   if(state.status==='deleted')callbacks.current.onDeleted?.(state.result,accountId)
  }
 },[state,accountId])
 if(!accountId||state?.owner!==accountId||!state.draft)return null
 const {draft,status,busy,previous,mode}=state,locked=busy||status==='failed'
 const change=(key,value)=>editorSession.change(key,value)
 return <form className={css.editor} onSubmit={event=>{event.preventDefault();void editorSession.save()}}><h2>{c.heading}</h2>{goalTitle&&<p>{goalTitle}</p>}
  <label>{c.description}<textarea rows={2} maxLength={2000} required value={draft.description} disabled={locked} onChange={event=>change('description',event.target.value)}/></label>
  <details><summary>{c.planning}</summary>
  {['timing','trigger','obstacle','fallback'].map(key=><label key={key}>{c[key]}<textarea rows={key==='description'?2:3} maxLength={2000} required={key==='description'} value={draft[key]} disabled={locked} onChange={event=>change(key,event.target.value)}/></label>)}
  <label>{c.feasibility}<select value={draft.feasibilityScore??''} disabled={locked} onChange={event=>change('feasibilityScore',event.target.value===''?null:Number(event.target.value))}><option value="">{c.unknown}</option>{Array.from({length:11},(_,i)=><option value={i} key={i}>{i}</option>)}</select></label>
  </details>
  <label>{c.stage}<select value={draft.status} disabled={locked} onChange={event=>change('status',event.target.value)}>{STAGES.filter(key=>{try{actionTransition(previous,key,true);return true}catch{return false}}).map(key=><option key={key} value={key}>{LABELS[lang][STAGES.indexOf(key)]}</option>)}</select></label>
  <label><input type="checkbox" checked={draft.confirmed} disabled={locked} onChange={event=>change('confirmed',event.target.checked)}/>{c.confirm}</label>
  {mode!=='delete'&&<button type="submit" disabled={busy||!draft.description.trim()||draft.status!=='proposed'&&!draft.confirmed}>{c.save}</button>}
  {draft.revision>0&&<button type="button" disabled={busy||mode!=='delete'&&status==='failed'} onClick={()=>{if(mode==='delete'||window.confirm(c.deleteConfirm))void editorSession.remove(true)}}>{mode==='delete'?c.retryDelete:c.remove}</button>}
  <p role="status">{c[status]||''}</p>
 </form>
}
