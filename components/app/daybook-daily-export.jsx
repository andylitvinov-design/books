'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {collectDailyExport} from '@/lib/app/daybook-daily-export.mjs'
const COPY={
 en:{title:'Export my daily plans',note:'Includes saved daily choices and the current wording of linked goals and steps. Unsaved selections are excluded.',button:'Export saved daily plans (JSON)',working:'Reading saved daily plans…',done:'Download prepared.',failed:'Export could not finish. No partial file was downloaded. Try again.',large:'The export exceeds the 32 MiB browser limit. No partial file was downloaded.'},
 ru:{title:'Экспорт моих планов дня',note:'Включает сохранённый выбор по дням и текущие формулировки связанных целей и шагов. Несохранённый выбор не включён.',button:'Экспорт сохранённых планов дня (JSON)',working:'Чтение сохранённых планов дня…',done:'Файл подготовлен для скачивания.',failed:'Не удалось завершить экспорт. Неполный файл не скачан. Повторите попытку.',large:'Экспорт превышает лимит браузера 32 МиБ. Неполный файл не скачан.'},
 es:{title:'Exportar mis planes diarios',note:'Incluye las elecciones diarias guardadas y el texto actual de los objetivos y pasos vinculados. No incluye elecciones sin guardar.',button:'Exportar planes diarios guardados (JSON)',working:'Leyendo los planes diarios guardados…',done:'Descarga preparada.',failed:'No se pudo completar la exportación. No se descargó un archivo parcial. Reintenta.',large:'La exportación supera el límite del navegador de 32 MiB. No se descargó un archivo parcial.'},
}
export default function DaybookDailyExport({accountId,locale='en',onSessionLost,disabled=false}){
 const c=COPY[locale]||COPY.en,[state,setState]=useState({owner:null,status:''})
 const epoch=useRef(0),pending=useRef(null),lost=useRef(onSessionLost)
 const invalidate=useCallback(()=>{epoch.current++;pending.current?.abort();pending.current=null},[])
 useEffect(()=>{lost.current=onSessionLost},[onSessionLost])
 useEffect(()=>{
  invalidate();setState({owner:accountId,status:''})
  return invalidate
 },[accountId,invalidate])
 async function download(){
  if(!accountId||pending.current||disabled)return
  const token=epoch.current,controller=new AbortController();pending.current=controller
  const current=()=>token===epoch.current&&!controller.signal.aborted
  setState({owner:accountId,status:'working'})
  try{
   const fetcher=(path,body,method,options)=>appFetch(path,body,method,{...options,signal:controller.signal})
   const result=await collectDailyExport(fetcher,accountId,current,locale)
   if(!current())return
   const url=URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/json'})),anchor=document.createElement('a')
   try{anchor.href=url;anchor.download='holistic-house-daily-plans-'+result.exportedAt.slice(0,10)+'.json';anchor.click()}
   finally{URL.revokeObjectURL(url)}
   setState({owner:accountId,status:'done'})
  }catch(error){
   if(!current())return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){setState({owner:null,status:''});lost.current?.()}
   else setState({owner:accountId,status:error.code==='DAYBOOK_EXPORT_TOO_LARGE'?'large':'failed'})
  }finally{if(current())pending.current=null}
 }
 if(!accountId||state.owner!==accountId)return null
 return <div role="group" aria-label={c.title}><h3>{c.title}</h3><p>{c.note}</p><button disabled={disabled||state.status==='working'} onClick={()=>void download()}>{c.button}</button><p role="status">{c[state.status]||''}</p></div>
}
