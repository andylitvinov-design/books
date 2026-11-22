'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createPersonalGoalRemover} from '@/lib/app/daybook-goal-delete-client.mjs'
import DaybookGoalEditor from './daybook-goal-editor'
const COPY={
 en:{title:'My personal goals',new:'Create a goal',edit:'Edit',remove:'Delete permanently',confirm:'Permanently delete this goal, its actions and encrypted change history?',close:'Close editor',switch:'Close this editor? Unsaved changes will be lost.',loading:'Loading saved goals…',error:'Could not load your goals.',retry:'Reload goals',empty:'No saved goals yet.',failed:'Deletion not confirmed. Retry the same goal or reload to check its current state.',deleted:'Deletion verified'},
 ru:{title:'Мои личные цели',new:'Создать цель',edit:'Изменить',remove:'Удалить навсегда',confirm:'Безвозвратно удалить цель, её действия и зашифрованную историю изменений?',close:'Закрыть редактор',switch:'Закрыть редактор? Несохранённые изменения будут потеряны.',loading:'Загрузка сохранённых целей…',error:'Не удалось загрузить цели.',retry:'Обновить цели',empty:'Сохранённых целей пока нет.',failed:'Удаление не подтверждено. Повторите для той же цели или обновите её состояние.',deleted:'Удаление проверено'},
 es:{title:'Mis objetivos personales',new:'Crear un objetivo',edit:'Editar',remove:'Eliminar permanentemente',confirm:'¿Eliminar permanentemente este objetivo, sus acciones y el historial cifrado?',close:'Cerrar editor',switch:'¿Cerrar este editor? Se perderán los cambios sin guardar.',loading:'Cargando objetivos guardados…',error:'No se pudieron cargar los objetivos.',retry:'Recargar objetivos',empty:'Aún no hay objetivos guardados.',failed:'Eliminación sin confirmar. Reintenta el mismo objetivo o recarga su estado actual.',deleted:'Eliminación verificada'},
}
export default function DaybookPersonalGoals({accountId,locale='en',onSessionLost}){
 const c=COPY[locale]||COPY.en
 const [view,setView]=useState({owner:null,goals:[],phase:'loading'}),[selection,setSelection]=useState(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[reload,setReload]=useState(0),[pendingDelete,setPendingDelete]=useState(null)
 const epoch=useRef(0),working=useRef(false),remover=useRef(null),lost=useRef(onSessionLost)
 const invalidate=useCallback(()=>{epoch.current++},[])
 useEffect(()=>{lost.current=onSessionLost},[onSessionLost])
 const sessionLost=useCallback(()=>{invalidate();remover.current?.discard();setSelection(null);setView({owner:null,goals:[],phase:'error'});lost.current?.()},[invalidate])
 useEffect(()=>{
  const token=++epoch.current,abort=new AbortController()
  setSelection(null);setBusy(false);working.current=false;setStatus('');setPendingDelete(null);setView({owner:accountId,goals:[],phase:'loading'})
  remover.current?.discard();remover.current=accountId?createPersonalGoalRemover(appFetch,accountId):null
  if(accountId)appFetch('coaching-life-plan?locale='+locale,undefined,'GET',{accountId,signal:abort.signal}).then(plan=>{
   if(token!==epoch.current)return
   if(!Array.isArray(plan.goals))throw new Error('INVALID_PLAN')
   setView({owner:accountId,goals:plan.goals,phase:'ready'})
  }).catch(error=>{if(token===epoch.current){if(error.status===401||error.code==='ACCOUNT_CHANGED')sessionLost();else setView({owner:accountId,goals:[],phase:'error'})}})
  const activeRemover=remover.current
  return ()=>{invalidate();abort.abort();activeRemover?.discard()}
 },[accountId,locale,reload,invalidate,sessionLost])
 function canSwitch(){return !selection||window.confirm(c.switch)}
 function fresh(){if(!canSwitch())return;setSelection({key:crypto.randomUUID(),goal:null});setStatus('')}
 async function edit(goal){
  if(working.current||!canSwitch())return
  working.current=true;setBusy(true);const token=epoch.current
  try{const read=await appFetch('personal-goals?id='+encodeURIComponent(goal.id),undefined,'GET',{accountId});if(token===epoch.current){setSelection({key:crypto.randomUUID(),goal:read.goal});setStatus('')}}
  catch(error){if(token===epoch.current){if(error.status===401||error.code==='ACCOUNT_CHANGED')sessionLost();else setStatus('error')}}
  finally{if(token===epoch.current){working.current=false;setBusy(false)}}
 }
 async function remove(goal){
  if(working.current||!window.confirm(c.confirm))return
  working.current=true;setBusy(true);setPendingDelete(goal.id);const token=epoch.current
  try{await remover.current.remove({id:goal.id,revision:goal.revision,confirmed:true});if(token!==epoch.current)return
   setView(old=>({...old,goals:old.goals.filter(item=>item.id!==goal.id)}));if(selection?.id===goal.id||selection?.goal?.id===goal.id)setSelection(null);setStatus('deleted');setPendingDelete(null)
  }catch(error){if(token===epoch.current){if(error.status===401||error.code==='ACCOUNT_CHANGED')sessionLost();else setStatus('failed')}}
  finally{if(token===epoch.current){working.current=false;setBusy(false)}}
 }
 function saved(goal,owner){
  if(owner!==accountId)return
  setView(old=>old.owner===owner?{...old,goals:[goal,...old.goals.filter(item=>item.id!==goal.id)]}:old)
  setSelection(old=>old?{...old,id:goal.id}:old)
 }
 if(!accountId)return null
 if(view.owner!==accountId||view.phase!=='ready')return <section><h2>{c.title}</h2><p role="status">{view.phase==='error'?c.error:c.loading}</p>{view.phase==='error'&&<button onClick={()=>setReload(v=>v+1)}>{c.retry}</button>}</section>
 return <section><h2>{c.title}</h2><button disabled={busy||Boolean(pendingDelete)} onClick={fresh}>{c.new}</button>
  <button disabled={busy} onClick={()=>{if(canSwitch())setReload(v=>v+1)}}>{c.retry}</button>
  {selection&&<><button disabled={busy} onClick={()=>{if(canSwitch())setSelection(null)}}>{c.close}</button><DaybookGoalEditor key={selection.key} accountId={accountId} locale={locale} initialGoal={selection.goal} onSaved={saved} onSessionLost={sessionLost}/></>}
  <p role="status">{c[status]||''}</p>{!view.goals.length&&<p>{c.empty}</p>}
  {view.goals.map(goal=><article key={goal.id}><h3>{goal.title}</h3><button disabled={busy||Boolean(pendingDelete)} onClick={()=>void edit(goal)}>{c.edit}</button><button disabled={busy||Boolean(pendingDelete&&pendingDelete!==goal.id)} onClick={()=>void remove(goal)}>{c.remove}</button></article>)}
 </section>
}
