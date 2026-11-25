'use client'
import {useEffect,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {journalGoalContext} from '@/lib/app/daybook-goal-context.mjs'
const labels={
 en:{goal:'Link this entry to my goal (optional)',none:'No linked goal',loading:'Loading saved goals…',error:'Could not load goals. Your journal draft remains here.',retry:'Reload goals',actions:'Confirmed open actions for this goal',empty:'No confirmed open actions for this goal.',historic:'Previously linked goal'},
 ru:{goal:'Связать запись с моей целью (необязательно)',none:'Без связанной цели',loading:'Загрузка сохранённых целей…',error:'Не удалось загрузить цели. Черновик дневника остаётся здесь.',retry:'Обновить цели',actions:'Подтверждённые открытые действия по этой цели',empty:'Подтверждённых открытых действий по этой цели пока нет.',historic:'Ранее связанная цель'},
 es:{goal:'Vincular esta entrada a mi objetivo (opcional)',none:'Sin objetivo vinculado',loading:'Cargando objetivos guardados…',error:'No se pudieron cargar los objetivos. El borrador permanece aquí.',retry:'Recargar objetivos',actions:'Acciones abiertas confirmadas para este objetivo',empty:'No hay acciones abiertas confirmadas para este objetivo.',historic:'Objetivo vinculado anteriormente'},
}
export default function DaybookGoalContext({accountId,locale,selectedId,onChange,disabled,onSessionLost,compact=false,active=true}){
 const [plan,setPlan]=useState(null),[status,setStatus]=useState('loading'),[version,setVersion]=useState(0)
 const c=labels[locale]
 useEffect(()=>{
  if(!active)return undefined
  const abort=new AbortController();let alive=true
  setPlan(null);setStatus('loading')
  appFetch('coaching-life-plan?locale='+locale,undefined,'GET',{accountId,signal:abort.signal}).then(data=>{if(alive){setPlan(data);setStatus('ready')}}).catch(error=>{if(alive){if(error.status===401||error.code==='ACCOUNT_CHANGED')onSessionLost();else setStatus('error')}})
  return ()=>{alive=false;abort.abort()}
 },[accountId,locale,version,onSessionLost,active])
 const data=journalGoalContext(plan,selectedId)
 return <div>
  {status!=='ready'?<p role="status">{c[status]} {status==='error'&&<button disabled={disabled} onClick={()=>setVersion(v=>v+1)}>{c.retry}</button>}</p>:<>
   <label>{compact?({en:'My goal',ru:'Моя цель',es:'Mi objetivo'})[locale]:c.goal}<select disabled={disabled} value={selectedId||''} onChange={e=>onChange(e.target.value||null)}>
    <option value="">{c.none}</option>
    {selectedId&&!data.selected&&<option value={selectedId}>{c.historic}</option>}
    {data.goals.map(goal=><option key={goal.id} value={goal.id}>{goal.title}</option>)}
   </select></label>
   {!compact&&data.selected&&<><h3>{c.actions}</h3>{data.actions.length?<ul>{data.actions.map(action=><li key={action.id}>{action.description}</li>)}</ul>:<p>{c.empty}</p>}</>}
  </>}
 </div>
}
