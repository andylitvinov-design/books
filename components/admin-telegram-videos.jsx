'use client'
import {useCallback,useEffect,useState} from 'react'
const labels={
 ru:{heading:'Видео из Telegram',intro:'Только готовые MP4 · исходные фото и аудио не сохраняются по отдельности.',
   refresh:'Обновить',empty:'Пока нет готовых видео.',loading:'Загружаем…',
   error:'Приватная библиотека недоступна.',watch:'Смотреть',hide:'Скрыть',private:'Приватно · не опубликовано',selected:'✂️ Обрезанная версия',download:'Скачать MP4',studio:'Открыть YouTube Studio'},
 en:{heading:'Telegram videos',intro:'Finished MP4s only · no separate source photos or audio in My Materials.',
   refresh:'Refresh',empty:'No finished videos yet.',loading:'Loading…',
   error:'Private video library is unavailable.',watch:'Watch',hide:'Hide',private:'Private · not published',selected:'✂️ Trimmed version',download:'Download MP4',studio:'Open YouTube Studio'},
 es:{heading:'Vídeos de Telegram',intro:'Solo MP4 terminados · sin guardar fotos o audios originales por separado.',
   refresh:'Actualizar',empty:'Todavía no hay vídeos terminados.',loading:'Cargando…',
   error:'Biblioteca privada no disponible.',watch:'Ver',hide:'Ocultar',private:'Privado · sin publicar',selected:'✂️ Versión recortada',download:'Descargar MP4',studio:'Abrir YouTube Studio'}
}
export default function AdminTelegramVideos({locale='en'}){
 const t=labels[locale]||labels.en
 const [files,setFiles]=useState([]),[selected,setSelected]=useState(null),[busy,setBusy]=useState(true)
 const [error,setError]=useState(''),[active,setActive]=useState('')
 const load=useCallback(async()=>{
   setBusy(true);setError('')
   try{
     const res=await fetch('/api/admin/telegram-video/drafts',{
       credentials:'same-origin',cache:'no-store'})
     if(!res.ok)throw Error('UNAVAILABLE')
     const json=await res.json()
     if(!Array.isArray(json.files))throw Error('INVALID')
     setFiles(json.files)
     setSelected(json.selected?.previewUrl&&Number.isInteger(json.selected.trimStartSeconds)?json.selected:null)
   }catch{setError(t.error)}finally{setBusy(false)}
 },[t.error])
 useEffect(()=>{void load()},[load])
 const date=value=>{
   const d=new Date(value)
   return Number.isFinite(d.getTime())?d.toLocaleString(
     locale==='es'?'es':locale==='ru'?'ru':'en',
     {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''
 }
 return <section data-owner-telegram-video-cabinet style={{
   margin:'12px 0 18px',padding:'12px 14px',border:'1px solid #d7ccb8',
   borderRadius:12,background:'#faf7f2'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
     <h2 style={{margin:0,fontSize:'1.06rem',color:'#44372d'}}>🎬 {t.heading}</h2>
     <button type="button" onClick={()=>void load()} disabled={busy} style={{
       border:'1px solid #c7bba8',borderRadius:8,padding:'6px 10px',background:'#fff',color:'#44372d'}}>{t.refresh}</button>
   </div>
   <p style={{fontSize:13,margin:'7px 0 10px',color:'#594c40'}}>{t.intro}</p>
   {busy?<p role="status">{t.loading}</p>:error?<p role="alert">{error}</p>:
     !files.length?<p>{t.empty}</p>:<div style={{display:'grid',gap:9}}>
       {files.map(file=><div key={file.id} style={{
         padding:10,border:'1px solid #e6ddcf',borderRadius:10,background:'#fff',minWidth:0}}>
         <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
           <div style={{minWidth:0}}>
             <strong style={{overflowWrap:'anywhere'}}>{file.title}</strong>
             <div style={{fontSize:12,color:'#6b5c4c'}}>{date(file.createdAt)} · {(file.bytes/1048576).toFixed(1)} MB · {t.private}</div>
           </div>
           <button type="button" onClick={()=>setActive(active===file.id?'':file.id)}
             aria-expanded={active===file.id} style={{border:'1px solid #b6a388',
               borderRadius:9,padding:'7px 12px',background:'#f7f0e6',color:'#493a2c'}}>
             {active===file.id?t.hide:t.watch}
           </button>
         </div>
         {active===file.id&&<video controls playsInline preload="metadata"
           src={file.previewUrl} controlsList="nodownload" style={{
             width:'100%',maxHeight:410,display:'block',marginTop:10,
             borderRadius:8,background:'#1e1c1a'}}/>}
       </div>)}
     </div>}
 </section>
}
