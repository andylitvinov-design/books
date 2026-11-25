'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
const copy={
 ru:{title:'Незавершённые коуч-сессии',resume:'Открыть коуча',erase:'Удалить черновик',confirm:'Удалить текст этого черновика?',more:'Показать более ранние',error:'Не удалось открыть или изменить черновики.'},
 en:{title:'Unreviewed coaching sessions',resume:'Open coach',erase:'Delete draft',confirm:'Delete this draft text?',more:'Show earlier drafts',error:'Could not load or change drafts.'},
 es:{title:'Sesiones sin revisar',resume:'Abrir coach',erase:'Borrar borrador',confirm:'¿Borrar el texto del borrador?',more:'Mostrar anteriores',error:'No se pudieron abrir o cambiar los borradores.'}
}
export default function MyCoachDraftArchive({accountId,locale,coachHref}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const [rows,setRows]=useState([]),[cursor,setCursor]=useState(null),[error,setError]=useState(false),[busy,setBusy]=useState(false)
 async function request(query='',body,signal){
  const res=await fetch('/api/app/my-coach/drafts'+query,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,
   headers:{'X-HH-Account-ID':accountId,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  if(!res.ok)throw Error('DRAFT_UNAVAILABLE');return res.json()
 }
 useEffect(()=>{
  const controller=new AbortController()
  void request('',null,controller.signal).then(data=>{if(!controller.signal.aborted){setRows(data.drafts||[]);setCursor(data.nextCursor||null)}}).catch(()=>{if(!controller.signal.aborted)setError(true)})
  return()=>controller.abort()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[accountId])
 async function more(){
  if(!cursor||busy)return
  setBusy(true);setError(false)
  try{const data=await request('?'+new URLSearchParams(cursor).toString());setRows(old=>[...old,...data.drafts.filter(row=>!old.some(x=>x.id===row.id))]);setCursor(data.nextCursor||null)}
  catch{setError(true)}finally{setBusy(false)}
 }
 async function erase(row){
  if(busy||!window.confirm(t.confirm))return
  setBusy(true);setError(false)
  try{const result=await request('',{action:'delete',confirmed:true,id:row.id,expectedRevision:row.revision});if(!result.deleted)throw Error();setRows(old=>old.filter(x=>x.id!==row.id))}
  catch{setError(true)}finally{setBusy(false)}
 }
 if(!rows.length&&!error)return null
 return <section aria-label={t.title}><h2>{t.title}</h2>{rows.map(row=><article key={row.id}>
  <p>{row.personaId} · {new Date(row.updatedAt).toLocaleDateString(lang)} · {row.turnCount}</p>
  <Link href={coachHref(lang,row.personaId)}>{t.resume}</Link>{' '}
  <button type="button" disabled={busy} onClick={()=>void erase(row)}>{t.erase}</button>
 </article>)}{cursor&&<button type="button" disabled={busy} onClick={()=>void more()}>{t.more}</button>}{error&&<p role="alert">{t.error}</p>}</section>
}
