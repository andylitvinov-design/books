'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import css from './my-page.module.css'
const copy={
 en:{title:'My Memory',lead:'Review confirmed answers from saved sessions. Selected memories stay private; they do not authorize an AI provider.',query:'Search past answers',search:'Search history',searchSaved:'Search selected memories',all:'All types',resource:'Resources',goal_statement:'Goals',action_statement:'Actions',practice_observation:'Practices',state_observation:'States',client_statement:'Other answers',history:'Historical answer',partial:'Only part of the archive could be checked.',none:'No matching confirmed answers in the checked archive.',error:'Memory is unavailable.',saved:'Selected for private memory.',forgotten:'Removed from memory. The original session remains in your Daybook.',selected:'My selected memories',load:'Show selected memories',more:'More',save:'Keep in My Memory',forget:'Forget selection',consent:'Enable memory and sensitive-memory permission to save historical answers.',settings:'Memory permissions',unavailable:'Source unavailable. You can forget this selection.',confirm:'Forget this selection? It will not automatically return.'},
 ru:{title:'Моя память',lead:'Просмотрите подтверждённые ответы из сохранённых сессий. Выбранные записи остаются приватными; это не разрешение передавать их AI-провайдеру.',query:'Поиск по прошлым ответам',search:'Найти в истории',searchSaved:'Найти в моей памяти',all:'Все типы',resource:'Ресурсы',goal_statement:'Цели',action_statement:'Действия',practice_observation:'Практики',state_observation:'Состояния',client_statement:'Другие ответы',history:'Исторический ответ',partial:'Проверена только часть архива.',none:'В проверенной истории нет подходящих подтверждённых ответов.',error:'Память недоступна.',saved:'Выбрано для личной памяти.',forgotten:'Удалено из памяти. Исходная сессия остаётся в Daybook.',selected:'Мои выбранные записи',load:'Показать выбранные записи',more:'Ещё',save:'Сохранить в мою память',forget:'Забыть выбранную запись',consent:'Включите память и отдельное разрешение на чувствительную информацию для сохранения ответа.',settings:'Разрешения памяти',unavailable:'Источник недоступен. Вы можете забыть выбранную запись.',confirm:'Забыть выбранную запись? Она не вернётся автоматически.'},
 es:{title:'Mi memoria',lead:'Consulta respuestas confirmadas de sesiones guardadas. Las memorias seleccionadas son privadas; no autorizan a un proveedor de IA.',query:'Buscar respuestas anteriores',search:'Buscar en el historial',searchSaved:'Buscar memorias seleccionadas',all:'Todos los tipos',resource:'Recursos',goal_statement:'Objetivos',action_statement:'Acciones',practice_observation:'Prácticas',state_observation:'Estados',client_statement:'Otras respuestas',history:'Respuesta histórica',partial:'Solo se pudo revisar parte del archivo.',none:'No hay respuestas confirmadas coincidentes en el archivo revisado.',error:'Memoria no disponible.',saved:'Seleccionado para la memoria privada.',forgotten:'Eliminado de la memoria. La sesión original sigue en tu diario.',selected:'Mis memorias seleccionadas',load:'Ver memorias seleccionadas',more:'Más',save:'Guardar en Mi memoria',forget:'Olvidar selección',consent:'Activa la memoria y el permiso de datos sensibles para guardar respuestas.',settings:'Permisos de memoria',unavailable:'Fuente no disponible. Puedes olvidar esta selección.',confirm:'¿Olvidar esta selección? No volverá automáticamente.'}
}
const types=['resource','goal_statement','action_statement','practice_observation','state_observation','client_statement']
export default function CoachPersonalMemoryPanel({accountId,locale='en',selectionEnabled=false}){
 const t=copy[locale]||copy.en
 const [query,setQuery]=useState(''),[type,setType]=useState('')
 const [result,setResult]=useState(null),[selected,setSelected]=useState(null)
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const pending=useRef(null)
 useEffect(()=>()=>pending.current?.abort(),[])
 async function run(fn){
  if(pending.current)return
  const controller=new AbortController();pending.current=controller;setBusy(true);setNotice('')
  try{await fn(controller.signal)}catch(e){
   if(!controller.signal.aborted){
    setSelected(null)
    if(e.code==='ACCOUNT_CHANGED'||e.code==='SIGN_IN_REQUIRED')setResult(null)
    setNotice(t.error)
   }
  }finally{if(pending.current===controller){pending.current=null;if(!controller.signal.aborted)setBusy(false)}}
 }
 const post=(path,body,signal)=>appFetch(path,body,'POST',{accountId,signal})
 async function loadSelected(signal,after=null){
  const next=await post('my-coach/memory-selection',{action:'list',after},signal)
  // Do not accumulate earlier pages in a private UI: a page may have become
  // stale after a revoke or a source delete. Display the current page only.
  if(!signal.aborted)setSelected(next)
 }
 function search(){
  if(!query.trim()&&!type)return
  void run(async signal=>{
   const next=await post('my-coach/memory-search',{ownerReview:true,query:query.trim(),...(type?{types:[type]}:{}),limit:12},signal)
   if(!signal.aborted)setResult(next)
   if(selectionEnabled)await loadSelected(signal)
  })
 }
 function searchSelected(){
  if(!query.trim()&&!type)return
  void run(async signal=>{
   const next=await post('my-coach/memory-selection',{action:'search',
    query:{ownerReview:true,query:query.trim(),...(type?{types:[type]}:{}),limit:12}},signal)
   if(!signal.aborted)setSelected(next)
  })
 }
 function save(item){
  if(!selected||selected.consentRequired||!item.sourceFingerprint)return
  void run(async signal=>{
   const response=await post('my-coach/memory-selection',{action:'save',confirmed:true,operationId:crypto.randomUUID(),
    expectedSettingsRevision:selected.settingsRevision,source:item.source,sourceFingerprint:item.sourceFingerprint},signal)
   if(response.status!=='active')throw Error('MEMORY_UNAVAILABLE')
   await loadSelected(signal)
   if(!signal.aborted)setNotice(t.saved)
  })
 }
 function forget(item){
  if(!window.confirm(t.confirm))return
  void run(async signal=>{
   const response=await post('my-coach/memory-selection',{action:'forget',confirmed:true,operationId:crypto.randomUUID(),
    id:item.id,expectedRevision:item.revision},signal)
   if(response.status!=='blocked'&&response.status!=='unavailable')throw Error('MEMORY_UNAVAILABLE')
   if(!signal.aborted)setSelected(old=>old?{...old,items:old.items.filter(x=>x.id!==item.id)}:old)
   await loadSelected(signal)
   if(!signal.aborted)setNotice(t.forgotten)
  })
 }
 const render=item=>item.status==='source_unavailable'?<p>{t.unavailable}</p>:
  <><small>{t[item.kind]||t.history} · {t.history} · {item.sessionEndedAt?.slice(0,10)}</small><p>{item.value}</p></>
 return <section className={css.card} data-my-page-personal-memory aria-busy={busy}>
  <h2>{t.title}</h2><p>{t.lead}</p>
  <form onSubmit={e=>{e.preventDefault();search()}}>
   <label className={css.label}>{t.query}<input className={css.field} value={query} maxLength={120}
    autoComplete="off" disabled={busy} onChange={e=>{setQuery(e.target.value);setResult(null)}}/></label>
   <select className={css.field} aria-label={t.all} value={type} disabled={busy} onChange={e=>{setType(e.target.value);setResult(null)}}>
    <option value="">{t.all}</option>{types.map(k=><option key={k} value={k}>{t[k]}</option>)}
   </select>
   <button className={css.button} type="submit" disabled={busy||(!query.trim()&&!type)}>{t.search}</button>
  </form>
  {result&&<div>{result.status==='partial'&&<p>{t.partial}</p>}
   {!result.items.length&&<p>{t.none}</p>}
   {result.items.map(item=><article className={css.entry} key={item.source.protocolId+':'+item.source.fieldId}>
    {render(item)}{selectionEnabled&&selected&&!selected.consentRequired&&
     <button type="button" className={css.secondary} disabled={busy} onClick={()=>save(item)}>{t.save}</button>}
   </article>)}</div>}
  {selectionEnabled&&<><h3>{t.selected}</h3>
   <button type="button" className={css.secondary} disabled={busy} onClick={()=>void run(signal=>loadSelected(signal))}>{t.load}</button>
   <button type="button" className={css.secondary} disabled={busy||(!query.trim()&&!type)} onClick={searchSelected}>{t.searchSaved}</button>
   {selected?.searchStatus==='no_match'&&<p>{t.none}</p>}
   {selected?.consentRequired&&<p>{t.consent} <Link href={'/'+locale+'/app/memory'} prefetch={false}>{t.settings}</Link></p>}
   {selected?.partial&&<p>{t.partial}</p>}
   {selected?.items.map(item=><article className={css.entry} key={item.id}>{render(item)}
    <button type="button" className={css.secondary} disabled={busy} onClick={()=>forget(item)}>{t.forget}</button>
   </article>)}
   {selected?.nextCursor&&<button type="button" className={css.secondary} disabled={busy}
    onClick={()=>void run(signal=>loadSelected(signal,selected.nextCursor))}>{t.more}</button>}</>}
  <p role="status">{notice}</p>
 </section>
}
