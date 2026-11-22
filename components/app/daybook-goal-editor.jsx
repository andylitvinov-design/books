'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {goalEditorDraft,goalStatusOptions,createPersonalGoalSaver} from '@/lib/app/daybook-goal-client.mjs'
import {PERSONAL_GOAL_AREAS,PERSONAL_GOAL_AXES} from '@/lib/app/daybook-personal-goal-contract.mjs'
import {COACH_PROFILE_AXES} from '@/lib/coaching/coach-profile-intake.mjs'
import css from './daybook-goal-editor.module.css'
const KEYS=['heading','title','why','outcome','area','axes','deadline','step','fallback','status','confirm','milestone','done','add','remove','save','saving','saved','failed','invalid','legacy']
const COPY={
 en:['My personal goal','My goal','Why this matters to me','Desired result','Life area','Meaning axes (optional)','Deadline (optional)','My 15-minute step','My gentler alternative','Stage','I confirm these details and the selected stage.','Milestone','Completed','Add milestone','Remove milestone','Save goal','Saving…','Saved and verified','Save not confirmed. Your draft remains here. Retry before editing.','Check the fields. Your draft remains here.','Additional details were not previously recorded. Blank fields are not AI recommendations.'],
 ru:['Моя личная цель','Моя цель','Почему это важно для меня','Желаемый результат','Жизненная область','Смысловые оси (необязательно)','Срок (необязательно)','Мой шаг на 15 минут','Мой мягкий альтернативный шаг','Этап','Я подтверждаю эти данные и выбранный этап.','Промежуточный результат','Завершён','Добавить промежуточный результат','Удалить промежуточный результат','Сохранить цель','Сохранение…','Сохранено и проверено','Сохранение не подтверждено. Черновик остаётся здесь. Повторите перед изменением.','Проверьте поля. Черновик остаётся здесь.','Дополнительные данные раньше не записывались. Пустые поля — не рекомендации ИИ.'],
 es:['Mi objetivo personal','Mi objetivo','Por qué es importante para mí','Resultado deseado','Área de vida','Ejes de significado (opcional)','Fecha límite (opcional)','Mi paso de 15 minutos','Mi alternativa más suave','Etapa','Confirmo estos detalles y la etapa seleccionada.','Hito','Completado','Añadir hito','Eliminar hito','Guardar objetivo','Guardando…','Guardado y verificado','Guardado sin confirmar. El borrador sigue aquí. Reintenta antes de editar.','Revisa los campos. El borrador sigue aquí.','Los detalles adicionales no se habían registrado. Los campos vacíos no son recomendaciones de IA.'],
}
const STAGES=['proposed','accepted','active','deferred','declined','completed','paused','cancelled']
const STAGE_LABELS={en:['Proposed','Accepted','Active','Deferred','Declined','Completed','Paused','Cancelled'],ru:['Предложена','Принята','Активна','Отложена','Отклонена','Завершена','На паузе','Отменена'],es:['Propuesto','Aceptado','Activo','Aplazado','Rechazado','Completado','En pausa','Cancelado']}
const AREA_LABELS={en:['Body & health','Emotional wellbeing','Relationships','Career & business','Finance','Personal growth','Lifestyle','Meaning & purpose'],ru:['Тело и здоровье','Эмоциональное благополучие','Отношения','Карьера и бизнес','Финансы','Личностный рост','Образ жизни','Смысл и предназначение'],es:['Cuerpo y salud','Bienestar emocional','Relaciones','Carrera y negocio','Finanzas','Crecimiento personal','Estilo de vida','Sentido y propósito']}
export default function DaybookGoalEditor({accountId,locale='en',initialGoal=null,onSaved,onSessionLost}){
 const lang=COPY[locale]?locale:'en',c=Object.fromEntries(KEYS.map((key,i)=>[key,COPY[lang][i]]))
 const [state,setState]=useState(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false)
 const saver=useRef(null),epoch=useRef(0),working=useRef(false),callbacks=useRef({onSaved,onSessionLost})
 const invalidate=useCallback(()=>{epoch.current++},[])
 useEffect(()=>{callbacks.current={onSaved,onSessionLost}},[onSaved,onSessionLost])
 useEffect(()=>{
  epoch.current++;working.current=false;saver.current?.discard();setBusy(false);setStatus('')
  if(!accountId){setState(null);return}
  saver.current=createPersonalGoalSaver(appFetch,accountId)
  try{
   const value=initialGoal?goalEditorDraft(initialGoal):{legacy:false,draft:{id:crypto.randomUUID(),revision:0,areaKey:'meaning_purpose',title:'',why:'',desiredOutcome:'',axes:[],status:'proposed',confirmed:false,targetDate:null,milestones:[],firstStep:'',fallbackStep:''}}
   setState({owner:accountId,...value,previous:initialGoal?.status??null})
  }catch{setState(null);setStatus('invalid')}
  const activeSaver=saver.current
  return ()=>{invalidate();activeSaver?.discard()}
 },[accountId,initialGoal,invalidate])
 if(!accountId)return null
 if(!state||state.owner!==accountId)return <p role="status">{c[status]||''}</p>
 const draft=state.draft,locked=busy||status==='failed'
 const change=(key,value)=>{setState(old=>({...old,draft:{...old.draft,[key]:value}}));setStatus('')}
 async function save(event){
  event.preventDefault();if(working.current)return
  working.current=true;setBusy(true);setStatus('saving');const token=epoch.current
  try{
   const goal=await saver.current.save(draft)
   if(token!==epoch.current)return
   setState({owner:accountId,...goalEditorDraft(goal),previous:goal.status});setStatus('saved');callbacks.current.onSaved?.(goal,accountId)
  }catch(error){if(token!==epoch.current)return
   if(error.status===401||error.code==='ACCOUNT_CHANGED'){epoch.current++;saver.current?.discard();setState(null);callbacks.current.onSessionLost?.()}
   else setStatus(saver.current?.hasPending()?'failed':'invalid')
  }finally{if(token===epoch.current){working.current=false;setBusy(false)}}
 }
 return <form className={css.editor} onSubmit={save}><h2>{c.heading}</h2>{state.legacy&&<p>{c.legacy}</p>}
  {[['title','title',1000],['why','why',4000],['desiredOutcome','outcome',4000],['firstStep','step',2000],['fallbackStep','fallback',2000]].map(([key,label,max])=><label key={key}>{c[label]}<textarea rows={key==='title'?2:3} required={key==='title'} maxLength={max} value={draft[key]} disabled={locked} onChange={e=>change(key,e.target.value)}/></label>)}
  <label>{c.area}<select value={draft.areaKey} disabled={locked} onChange={e=>change('areaKey',e.target.value)}>{PERSONAL_GOAL_AREAS.map((key,i)=><option key={key} value={key}>{AREA_LABELS[lang][i]}</option>)}</select></label>
  <fieldset disabled={locked}><legend>{c.axes}</legend>{PERSONAL_GOAL_AXES.map(axis=><label key={axis}><input type="checkbox" checked={draft.axes.includes(axis)} onChange={e=>change('axes',e.target.checked?[...draft.axes,axis]:draft.axes.filter(key=>key!==axis))}/>{COACH_PROFILE_AXES.find(item=>item.id===axis)?.name[lang]||axis}</label>)}</fieldset>
  <label>{c.deadline}<input type="date" value={draft.targetDate||''} disabled={locked} onChange={e=>change('targetDate',e.target.value||null)}/></label>
  {draft.milestones.map((milestone,i)=><fieldset key={milestone.id} disabled={locked}><legend>{c.milestone} {i+1}</legend><input aria-label={c.milestone+' '+(i+1)} maxLength={500} value={milestone.title} onChange={e=>change('milestones',draft.milestones.map(item=>item.id===milestone.id?{...item,title:e.target.value}:item))}/><label><input type="checkbox" checked={milestone.completed} onChange={e=>change('milestones',draft.milestones.map(item=>item.id===milestone.id?{...item,completed:e.target.checked}:item))}/>{c.done}</label><button type="button" onClick={()=>change('milestones',draft.milestones.filter(item=>item.id!==milestone.id))}>{c.remove}</button></fieldset>)}
  <button type="button" disabled={locked||draft.milestones.length>=12} onClick={()=>change('milestones',[...draft.milestones,{id:crypto.randomUUID(),title:'',completed:false}])}>{c.add}</button>
  <label>{c.status}<select value={draft.status} disabled={locked} onChange={e=>change('status',e.target.value)}>{goalStatusOptions(state.previous).map(key=><option key={key} value={key}>{STAGE_LABELS[lang][STAGES.indexOf(key)]}</option>)}</select></label>
  <label><input type="checkbox" checked={draft.confirmed} disabled={locked} onChange={e=>change('confirmed',e.target.checked)}/>{c.confirm}</label>
  <button type="submit" disabled={busy||!draft.title.trim()||draft.status!=='proposed'&&!draft.confirmed}>{c.save}</button><p role="status">{c[status]||''}</p>
 </form>
}
