'use client'
import {useEffect,useRef,useState} from 'react'
import {coachIsNameRepairUtterance} from '@/lib/coaching/coach-opening-protocol.mjs'
import MyCoachSavedProfileV3 from './my-coach-saved-profile-v3'
import MyCoachCourseFieldReview from '../my-coach-course-field-review'
import styles from './my-coaching-plan.module.css'

const copy={
 ru:{title:'Незавершённые коуч-сессии',unreviewed:'Автосохранённый черновик · не проверенный итог',review:'Проверить и сохранить в архив',name:'Подтверждённое имя (необязательно)',goal:'Моя подтверждённая цель',summary:'Мой итог',step:'Мой следующий шаг',consent:'Я проверил(а) расшифровку и введённые сведения. Сохранить как проверенный отчёт.',discard:'Удалить черновик',ask:'Удалить незавершённый протокол без возможности восстановления?',more:'Показать более ранние черновики',error:'Не удалось синхронизировать черновики. Повторите попытку.',saved:'Проверенный протокол сохранён.',empty:'Нет незавершённых сессий',you:'Вы',coach:'Коуч'},
 en:{title:'Unfinished coaching sessions',unreviewed:'Autosaved draft · not a reviewed conclusion',review:'Review and save to archive',name:'Confirmed name (optional)',goal:'My confirmed goal',summary:'My takeaway',step:'My next step',consent:'I reviewed the transcript and entered information. Save as a reviewed report.',discard:'Discard draft',ask:'Permanently discard this unfinished protocol?',more:'Show earlier drafts',error:'Could not synchronize drafts. Please retry.',saved:'Reviewed protocol saved.',empty:'No unfinished sessions',you:'You',coach:'Coach'},
 es:{title:'Sesiones de coaching pendientes',unreviewed:'Borrador guardado · no revisado',review:'Revisar y guardar',name:'Nombre confirmado (opcional)',goal:'Mi objetivo confirmado',summary:'Mi conclusión',step:'Mi próximo paso',consent:'He revisado la transcripción y los datos introducidos. Guardar como informe revisado.',discard:'Eliminar borrador',ask:'¿Eliminar definitivamente este borrador?',more:'Mostrar borradores anteriores',error:'No se pudieron sincronizar los borradores. Reintenta.',saved:'Informe revisado guardado.',empty:'No hay sesiones pendientes',you:'Tú',coach:'Coach'}
}
function DraftRow({item,t,lang,onAction,busy}){
 const [checked,setChecked]=useState(false),[name,setName]=useState(''),[goal,setGoal]=useState(''),[summary,setSummary]=useState(''),[step,setStep]=useState('')
 const [courseFieldReview,setCourseFieldReview]=useState(null)
 const p=item.protocol,opening=p.opening
 const nameValid=!name.trim()||(!coachIsNameRepairUtterance(name)&&/^[\p{L}][\p{L}'’ -]{0,59}$/u.test(name.trim()))
 function reviewed(){
  // User may explicitly confirm the preferred name and new summary; never
  // carry forward an unchecked inferred opening, profile score or AI goal.
  const {opening:ignored,profileCheckin:ignoredProfile,provenance:ignoredProvenance,courseFieldReview:ignoredReview,...transcript}=p
  return {...transcript,courseSessionId:item.courseSessionId,goal:goal.trim(),clientSummary:summary.trim(),clientNextStep:step.trim(),
    ...(courseFieldReview?{courseFieldReview}:{}),
    ...(name.trim()?{opening:{version:'hh-coach-opening-v1-20261122',completed:false,declined:false,
      name:name.trim(),continuity:'',focus:'',feelings:'',invitationQuote:'',confirmedQuote:'',
      checkmarks:{invitation:false,name:true,continuity:false,focus:false,feelings:false,confirmation:false}}}:{})}
 }
 return <article className={styles.reportCard} data-coach-unreviewed-draft={item.id}>
  <div className={styles.reportTop}><div><span>{t.unreviewed}</span><h2>{p.personaId}</h2><small>{new Date(item.updatedAt).toLocaleDateString(lang)} · {p.turns.length}</small></div></div>
  <details className={styles.reportDetails}><summary>{t.review}</summary>
   {opening?.name&&<p>{t.name}: {opening.name} ({t.unreviewed})</p>}
   <MyCoachSavedProfileV3 protocol={p} locale={lang}/>
   <MyCoachCourseFieldReview courseSessionId={item.courseSessionId} turns={p.turns} locale={lang} value={courseFieldReview} onChange={value=>{setCourseFieldReview(value);setChecked(false)}} disabled={busy}/>
   {p.turns.map((row,i)=><div className={styles.reportSection} key={i}><b>{row.role==='user'?t.you:t.coach}</b><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.content}</p></div>)}
   <label>{t.name}<input value={name} maxLength={60} onChange={e=>{setName(e.target.value);setChecked(false)}}/></label>
   <label>{t.goal}<textarea rows={2} value={goal} maxLength={180} onChange={e=>{setGoal(e.target.value);setChecked(false)}}/></label>
   <label>{t.summary}<textarea rows={3} value={summary} maxLength={1000} onChange={e=>{setSummary(e.target.value);setChecked(false)}}/></label>
   <label>{t.step}<textarea rows={2} value={step} maxLength={500} onChange={e=>{setStep(e.target.value);setChecked(false)}}/></label>
   <label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>{t.consent}</label>
   <button type="button" className={styles.primaryButton} disabled={!checked||!nameValid||busy} onClick={()=>onAction(item,reviewed())}>{t.review}</button>
  </details>
  <button type="button" className={styles.primaryButton} disabled={busy} onClick={()=>{if(window.confirm(t.ask))onAction(item,null)}}>{t.discard}</button>
 </article>
}
export default function MyCoachDraftArchive({accountId,locale='en',onReviewed}){
 const lang=copy[locale]?locale:'en',t=copy[lang],ownerRef=useRef(accountId)
 ownerRef.current=accountId
 const [state,setState]=useState({owner:null,items:[],cursor:null}),[error,setError]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const generation=useRef(0)
 async function load(cursor=null){
  if(!accountId)return
  const current=++generation.current
  setBusy(true);setError(false)
  try{
   const suffix=cursor?'?'+new URLSearchParams(cursor).toString():''
   const response=await fetch('/api/app/my-coach/draft'+suffix,{credentials:'same-origin',cache:'no-store',headers:{'X-HH-Account-ID':accountId}})
   const result=await response.json().catch(()=>null)
   if(!response.ok||!Array.isArray(result?.drafts))throw Error('DRAFT_LOAD')
   if(ownerRef.current!==accountId||generation.current!==current)return
   setState(previous=>({owner:accountId,items:cursor?[...new Map([...previous.items,...result.drafts].map(x=>[x.id,x])).values()]:result.drafts,cursor:result.nextCursor||null}))
  }catch{if(ownerRef.current===accountId&&generation.current===current)setError(true)}
  finally{if(ownerRef.current===accountId&&generation.current===current)setBusy(false)}
 }
 useEffect(()=>{setState({owner:null,items:[],cursor:null});void load();return()=>{generation.current++}},[accountId])
 async function action(item,reviewed){
  if(busy||state.owner!==accountId)return
  setBusy(true);setError(false);setNotice('')
  try{
   const response=await fetch(reviewed?'/api/app/my-coach/protocol':'/api/app/my-coach/draft',{
    method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-HH-Account-ID':accountId},
    body:JSON.stringify(reviewed?{action:'save',consent:true,protocol:reviewed,draftRevision:item.revision}:{action:'discard',confirmed:true,id:item.id})})
   const result=await response.json().catch(()=>null)
   if(!response.ok||(reviewed?result?.saved!==true:result?.deleted!==true))throw Error('DRAFT_ACTION')
   if(ownerRef.current!==accountId)return
   setState(previous=>({...previous,items:previous.items.filter(x=>x.id!==item.id)}))
   if(reviewed){setNotice(t.saved);onReviewed?.()}
  }catch{if(ownerRef.current===accountId)setError(true)}
  finally{if(ownerRef.current===accountId)setBusy(false)}
 }
 const items=state.owner===accountId?state.items:[]
 return <section data-my-coach-draft-archive>
  <h2>{t.title}</h2>{notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert">{t.error} <button type="button" onClick={()=>load()}>{t.more}</button></p>}
  {!busy&&!error&&!items.length&&<p>{t.empty}</p>}
  {items.map(item=><DraftRow key={item.id+':'+item.revision} item={item} t={t} lang={lang} busy={busy} onAction={action}/>)}
  {state.owner===accountId&&state.cursor&&<button type="button" disabled={busy} onClick={()=>load(state.cursor)}>{t.more}</button>}
 </section>
}
