'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createPersonalGoalRemover} from '@/lib/app/daybook-goal-delete-client.mjs'
import {createGoalEditorSession} from '@/lib/app/daybook-goal-editor-session.mjs'
import {createVectorGoalSession} from '@/lib/app/daybook-vector-session.mjs'
import {vectorStartDecision} from '@/lib/app/daybook-route-intent.mjs'
import css from './daybook-goal-editor.module.css'
import DaybookGoalEditor from './daybook-goal-editor'
import DaybookVectorStart from './daybook-vector-start'
import DaybookActionEditor from './daybook-action-editor'
import DaybookCoachLink from './daybook-coach-link'
import {createActionEditorSession} from '@/lib/app/daybook-personal-action-session.mjs'
const COPY={
 en:{newAction:'Add a step',actions:'My steps',editAction:'Edit step',title:'My Goals',resumed:'Your open draft is preserved. Close it when you are ready to start another goal.',new:'Create a goal',edit:'Edit',remove:'Delete permanently',confirm:'Permanently delete this goal, its actions and encrypted change history?',close:'Close editor',switch:'Close this editor? Unsaved changes will be lost.',loading:'Loading saved goals…',error:'Could not load your goals.',retry:'Reload goals',empty:'No saved goals yet.',failed:'Deletion not confirmed. Retry the same goal or reload to check its current state.',deleted:'Deletion verified'},
 ru:{newAction:'Добавить шаг',actions:'Мои шаги',editAction:'Изменить шаг',title:'Мои цели',resumed:'Открытый черновик сохранён на экране. Закройте его, когда захотите начать другую цель.',new:'Создать цель',edit:'Изменить',remove:'Удалить навсегда',confirm:'Безвозвратно удалить цель, её действия и зашифрованную историю изменений?',close:'Закрыть редактор',switch:'Закрыть редактор? Несохранённые изменения будут потеряны.',loading:'Загрузка сохранённых целей…',error:'Не удалось загрузить цели.',retry:'Обновить цели',empty:'Сохранённых целей пока нет.',failed:'Удаление не подтверждено. Повторите для той же цели или обновите её состояние.',deleted:'Удаление проверено'},
 es:{newAction:'Añadir un paso',actions:'Mis pasos',editAction:'Editar paso',title:'Mis metas',resumed:'Tu borrador abierto se conserva. Ciérralo cuando quieras empezar otra meta.',new:'Crear un objetivo',edit:'Editar',remove:'Eliminar permanentemente',confirm:'¿Eliminar permanentemente este objetivo, sus acciones y el historial cifrado?',close:'Cerrar editor',switch:'¿Cerrar este editor? Se perderán los cambios sin guardar.',loading:'Cargando objetivos guardados…',error:'No se pudieron cargar los objetivos.',retry:'Recargar objetivos',empty:'Aún no hay objetivos guardados.',failed:'Eliminación sin confirmar. Reintenta el mismo objetivo o recarga su estado actual.',deleted:'Eliminación verificada'},
}
export default function DaybookPersonalGoals({accountId,locale='en',onSessionLost,memory,autoStartVector=false,vectorStartRequest=1,onVectorDone}){
 const c=COPY[locale]||COPY.en
 const [view,setView]=useState({owner:null,goals:[],phase:'loading'}),[selection,setSelection]=useState(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[reload,setReload]=useState(0),[pendingDelete,setPendingDelete]=useState(null)
 const epoch=useRef(0),working=useRef(false),remover=useRef(null),lost=useRef(onSessionLost)
 const cache=useRef(null)
 const vectorStartReceipt=useRef({owner:null,request:0})
 const invalidate=useCallback(()=>{epoch.current++},[])
 const remember=useCallback((selection,pendingDelete)=>{cache.current={selection,pendingDelete,remover:remover.current,vectorStartConsumed:vectorStartReceipt.current.owner===accountId?vectorStartReceipt.current.request:0};memory?.set(accountId,cache.current)},[memory,accountId])
 useEffect(()=>{lost.current=onSessionLost},[onSessionLost])
 const sessionLost=useCallback(()=>{invalidate();memory?.clear();remover.current?.discard();cache.current?.selection?.session?.dispose();setSelection(null);setView({owner:null,goals:[],phase:'error'});lost.current?.()},[invalidate,memory])
 useEffect(()=>{
  const token=++epoch.current,abort=new AbortController()
  const checkpoint=memory?.get(accountId)
  if(vectorStartReceipt.current.owner!==accountId)vectorStartReceipt.current={owner:accountId,request:0}
  if(Number.isSafeInteger(checkpoint?.vectorStartConsumed))vectorStartReceipt.current.request=Math.max(vectorStartReceipt.current.request,checkpoint.vectorStartConsumed)
  let restoredSelection=checkpoint?.selection||null,restoredPending=checkpoint?.pendingDelete||null
  setSelection(restoredSelection);setBusy(false);working.current=false;setStatus(restoredPending?'failed':'');setPendingDelete(restoredPending);setView({owner:accountId,goals:[],phase:'loading'})
  remover.current=checkpoint?.remover||(accountId?createPersonalGoalRemover(appFetch,accountId):null)
  if(accountId)remember(restoredSelection,restoredPending)
  if(accountId)appFetch('coaching-life-plan?locale='+locale,undefined,'GET',{accountId,signal:abort.signal}).then(async plan=>{
   if(token!==epoch.current)return
   if(!Array.isArray(plan.goals))throw new Error('INVALID_PLAN')
   if(restoredPending){
    try{
     const result=await remover.current.recover()
     if(token!==epoch.current)return
     if(result.id!==restoredPending)throw new Error('GOAL_DELETE_UNCONFIRMED')
     plan={...plan,goals:plan.goals.filter(goal=>goal.id!==result.id)}
     if((restoredSelection?.session?.snapshot()?.draft?.id===restoredPending||restoredSelection?.session?.snapshot()?.draft?.goalId===restoredPending))restoredSelection=null
     restoredPending=null;remember(restoredSelection,null);setSelection(restoredSelection);setPendingDelete(null);setStatus('deleted')
    }catch(error){
     if(token!==epoch.current)return
     if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){sessionLost();return}
     setStatus('failed')
    }
   }
   const intent=vectorStartDecision({autoStartVector,request:vectorStartRequest,consumed:vectorStartReceipt.current.request,hasSelection:Boolean(restoredSelection),selectionStatus:restoredSelection?.session?.snapshot()?.status,pendingDelete:Boolean(restoredPending)})
   if(intent.consume){
    vectorStartReceipt.current={owner:accountId,request:vectorStartRequest}
    if(intent.open)restoredSelection={key:crypto.randomUUID(),kind:'vector',session:createVectorGoalSession(appFetch,accountId)}
    if(intent.resume&&!restoredPending)setStatus('resumed')
    remember(restoredSelection,restoredPending);setSelection(restoredSelection)
   }
   setView({owner:accountId,goals:plan.goals,phase:'ready'})
  }).catch(error=>{if(token===epoch.current){if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')sessionLost();else setView({owner:accountId,goals:[],phase:'error'})}})
  const activeRemover=remover.current
  return ()=>{invalidate();abort.abort();if(!memory){activeRemover?.discard();cache.current?.selection?.session?.dispose()}}
 },[accountId,locale,reload,invalidate,sessionLost,memory,remember,autoStartVector,vectorStartRequest])
 function canSwitch(){return !selection||selection.session?.snapshot()?.status==='saved'||window.confirm(c.switch)}
 function fresh(){if(!canSwitch())return;vectorStartReceipt.current={owner:accountId,request:vectorStartRequest};const selected={key:crypto.randomUUID(),kind:'vector',session:createVectorGoalSession(appFetch,accountId)};remember(selected,null);setSelection(selected);setStatus('')}
 async function edit(goal){
  if(working.current||!canSwitch())return
  working.current=true;setBusy(true);const token=epoch.current
  try{const read=await appFetch('personal-goals?id='+encodeURIComponent(goal.id),undefined,'GET',{accountId});if(token===epoch.current){const selected={key:crypto.randomUUID(),goal:read.goal,session:createGoalEditorSession(appFetch,accountId,read.goal)};remember(selected,null);setSelection(selected);setStatus('')}}
  catch(error){if(token===epoch.current){if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')sessionLost();else setStatus('error')}}
  finally{if(token===epoch.current){working.current=false;setBusy(false)}}
 }
 async function remove(goal){
  if(working.current||goal&&!window.confirm(c.confirm))return
  const id=goal?.id||pendingDelete
  if(!id)return
  working.current=true;setBusy(true);setPendingDelete(id);remember(selection,id);const token=epoch.current
  try{const result=await (goal?remover.current.remove({id,revision:goal.revision,confirmed:true}):remover.current.recover());if(token!==epoch.current)return
   if(result.id!==id)throw new Error('GOAL_DELETE_UNCONFIRMED')
   const selected=cache.current?.selection
   const next=(selected?.session?.snapshot()?.draft?.id===id||selected?.session?.snapshot()?.draft?.goalId===id)?null:selected
   remember(next,null);setSelection(next);setView(old=>({...old,goals:old.goals.filter(item=>item.id!==id)}));setStatus('deleted');setPendingDelete(null)
  }catch(error){if(token===epoch.current){if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')sessionLost();else setStatus('failed')}}
  finally{if(token===epoch.current){working.current=false;setBusy(false)}}
 }
 function saved(goal,owner){
  if(owner!==accountId)return
  setView(old=>old.owner===owner?{...old,goals:[{...goal,actions:old.goals.find(item=>item.id===goal.id)?.actions||[]},...old.goals.filter(item=>item.id!==goal.id)]}:old)
  const selected=cache.current?.selection,next=selected?{...selected,id:goal.id}:null
  remember(next,cache.current?.pendingDelete||null);setSelection(next)
 }
 async function actionEditor(goal,action=null){
  if(working.current||!canSwitch())return
  const token=epoch.current;working.current=true;setBusy(true)
  try{
   const initial=action?(await appFetch('personal-actions?id='+encodeURIComponent(action.id),undefined,'GET',{accountId})).action:null
   if(token!==epoch.current)return
   const selected={key:crypto.randomUUID(),kind:'action',goalTitle:goal.title,session:createActionEditorSession(appFetch,accountId,goal.id,initial)}
   remember(selected,null);setSelection(selected);setStatus('')
  }catch(error){if(token===epoch.current){if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')sessionLost();else setStatus('error')}}
  finally{if(token===epoch.current){working.current=false;setBusy(false)}}
 }
 function actionSaved(action,owner){
  if(owner!==accountId)return
  setView(old=>old.owner===owner?{...old,goals:old.goals.map(goal=>goal.id===action.goalId?{...goal,actions:[action,...(goal.actions||[]).filter(item=>item.id!==action.id)]}:goal)}:old)
 }
 function actionDeleted(result,owner){
  if(owner!==accountId)return
  setView(old=>old.owner===owner?{...old,goals:old.goals.map(goal=>({...goal,actions:(goal.actions||[]).filter(action=>action.id!==result.id)}))}:old)
  remember(null,null);setSelection(null);setStatus('deleted')
 }
 if(!accountId)return null
 if(view.owner!==accountId||view.phase!=='ready')return <section className={css.workspace}><h2>{c.title}</h2><p role="status">{view.phase==='error'?c.error:c.loading}</p>{view.phase==='error'&&<button onClick={()=>setReload(v=>v+1)}>{c.retry}</button>}</section>
 return <section className={css.workspace} id="daybook-goals"><h2>{c.title}</h2><button disabled={busy||Boolean(pendingDelete)} onClick={fresh}>{c.new}</button>
  <button disabled={busy} onClick={()=>{if(canSwitch()){memory?.clear();cache.current?.selection?.session?.dispose();setReload(v=>v+1)}}}>{c.retry}</button>
  {selection&&<><button disabled={busy} onClick={()=>{if(canSwitch()){remember(null,pendingDelete);setSelection(null)}}}>{c.close}</button>{selection.kind==='vector'?<DaybookVectorStart key={selection.key} accountId={accountId} locale={locale} editorSession={selection.session} onSaved={saved} onSessionLost={sessionLost} onDone={()=>{remember(null,pendingDelete);setSelection(null);onVectorDone?.()}}/>:selection.kind==='action'?<DaybookActionEditor key={selection.key} goalTitle={selection.goalTitle} accountId={accountId} locale={locale} editorSession={selection.session} onSaved={actionSaved} onDeleted={actionDeleted} onSessionLost={sessionLost}/>:<DaybookGoalEditor key={selection.key} accountId={accountId} locale={locale} editorSession={selection.session} onSaved={saved} onSessionLost={sessionLost}/>}</>}
  <p role="status">{c[status]||''}</p>{pendingDelete&&<button disabled={busy} onClick={()=>void remove(null)}>{c.retry}</button>}{!view.goals.length&&<p>{c.empty}</p>}
  {view.goals.map(goal=><article key={goal.id}><h3>{goal.title}</h3><button disabled={busy||Boolean(pendingDelete)} onClick={()=>void edit(goal)}>{c.edit}</button><button disabled={busy||Boolean(pendingDelete&&pendingDelete!==goal.id)} onClick={()=>void remove(goal)}>{c.remove}</button>
   {['accepted','active'].includes(goal.status)&&<button disabled={busy||Boolean(pendingDelete)} onClick={()=>void actionEditor(goal)}>{c.newAction}</button>}
   {goal.actions?.length>0&&<section aria-label={c.actions}><h4>{c.actions}</h4><ul>{goal.actions.map(action=><li key={action.id}>{action.status==='completed'?<s>{action.description}</s>:action.description} <button disabled={busy||Boolean(pendingDelete)} onClick={()=>void actionEditor(goal,action)}>{c.editAction}</button></li>)}</ul></section>}
   {['accepted','active','in_progress'].includes(goal.status)&&<DaybookCoachLink accountId={accountId} locale={locale} kind="goal" itemId={goal.id} revision={goal.revision} disabled={busy||Boolean(pendingDelete)} onSessionLost={sessionLost}/>}
  </article>)}
 </section>
}
