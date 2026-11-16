"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";

const text={
ru:{title:"♫ Моя музыкальная библиотека",hide:"Скрыть библиотеку",upload:"Загрузить музыку",refresh:"Обновить",listen:"Прослушать",use:"В ролик",empty:"Опубликованных аудиодорожек пока нет",error:"Не удалось открыть аудио",loading:"Загрузка...",all:"Все",wellbeing:"Восстановление",focus:"Фокус",calm:"Спокойствие",energy:"Энергия",love:"Любовь"},
en:{title:"♫ My music library",hide:"Hide library",upload:"Upload music",refresh:"Refresh",listen:"Listen",use:"Use in video",empty:"No published recordings yet",error:"Music unavailable",loading:"Loading...",all:"All",wellbeing:"Wellbeing",focus:"Focus",calm:"Calm",energy:"Energy",love:"Love"},
es:{title:"♫ Mi biblioteca musical",hide:"Ocultar biblioteca",upload:"Subir música",refresh:"Actualizar",listen:"Escuchar",use:"Usar en vídeo",empty:"Aún no hay pistas publicadas",error:"Audio no disponible",loading:"Cargando...",all:"Todas",wellbeing:"Bienestar",focus:"Concentración",calm:"Calma",energy:"Energía",love:"Amor"}
};
const SAFE_MIME=new Set(["audio/mpeg","audio/mp4","audio/wav"]);
const MAX_SIZE=15*1024*1024;
export function StudioMusicPicker({locale="en",disabled=false,onSelect}){
 const t=text[locale]||text.en;
 const [open,setOpen]=useState(false);
 const [loading,setLoading]=useState(false);
 const [category,setCategory]=useState("all");
 const [tracks,setTracks]=useState([]);
 const [preview,setPreview]=useState(null);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/app/studio-music",{credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw Error("MUSIC_LIST_FAILED");
   const json=await response.json();
   if(!Array.isArray(json.items))throw Error("MUSIC_LIST_INVALID");
   setTracks(json.items.filter(v=>v&&typeof v.id==="string"&&
     typeof v.title==="string"&&SAFE_MIME.has(v.mime)&&
     Number.isSafeInteger(v.bytes)&&v.bytes>0&&v.bytes<=MAX_SIZE));
  }catch{setError(t.error)}
  finally{setLoading(false)}
 },[t.error]);
 useEffect(()=>{if(open)void refresh()},[open,refresh]);
 async function getRecording(row,attach){
  if(disabled||loading)return;
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/app/studio-music",{method:"POST",
    credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"open",assetId:row.id})});
   if(!response.ok)throw Error("MUSIC_SOURCE_UNAVAILABLE");
   const json=await response.json();
   if(json.id!==row.id||json.mime!==row.mime||json.bytes!==row.bytes||
    typeof json.url!=="string")throw Error("MUSIC_INVALID");
   const url=new URL(json.url);
   if(url.protocol!=="https:"||url.username||url.password)throw Error("MUSIC_URL_INVALID");
   if(!attach){setPreview({id:row.id,url:url.href});return}
   const fetched=await fetch(url.href,{cache:"no-store"});
   if(!fetched.ok)throw Error("MUSIC_DOWNLOAD_FAILED");
   const buffer=await fetched.blob();
   if(buffer.size!==row.bytes||buffer.size>MAX_SIZE)throw Error("MUSIC_LENGTH_INVALID");
   const ext=row.mime==="audio/mpeg"?"mp3":row.mime==="audio/mp4"?"m4a":"wav";
   const safeName=row.title.slice(0,90).replace(/[/\\]/g,"-")+"."+ext;
   const file=new File([buffer],safeName,{type:row.mime});
   onSelect(file);
   setPreview(null);setOpen(false);
  }catch{setError(t.error)}finally{setLoading(false)}
 }
 const items=tracks.filter(x=>category==="all"||x.category===category);
 return <section data-video-studio-music-library
  style={{margin:"10px 0",border:"1px solid #d6ded2",borderRadius:15,padding:"10px 12px",background:"#fbfff9"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",alignItems:"center"}}>
   <button type="button" data-video-studio-music-open disabled={disabled}
    onClick={()=>setOpen(x=>!x)}
    style={{border:"1px solid #80c3ae",borderRadius:12,padding:"9px 13px",background:"#e9fff5",color:"#08735d",fontWeight:700}}>
    {open?t.hide:t.title}
   </button>
   <Link href="/admin/music-library" style={{color:"#08735d",textDecoration:"underline",fontSize:12}}>{t.upload}</Link>
  </div>
  {open&&<div style={{display:"grid",gap:9,marginTop:10}}>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
    <select aria-label={t.all} value={category} onChange={event=>setCategory(event.target.value)}
      style={{border:"1px solid #cbd8cc",padding:9,borderRadius:10,background:"white"}}>
     {["all","wellbeing","focus","calm","energy","love"].map(k=><option key={k} value={k}>{t[k]}</option>)}
    </select>
    <button type="button" onClick={()=>void refresh()} disabled={loading}>{t.refresh}</button>
    <small>{loading?t.loading:items.length}</small>
   </div>
   {error&&<p role="alert">{error}</p>}
   {!loading&&items.length===0&&<small role="status">{t.empty}</small>}
   <div style={{maxHeight:330,overflowY:"auto",display:"grid",gap:7}}>
   {items.map(row=><div key={row.id} style={{border:"1px solid #dbe3dd",padding:9,borderRadius:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
    <strong style={{fontSize:13,flex:"1 1 125px"}}>{row.title}</strong>
    <button type="button" disabled={loading||disabled} onClick={()=>void getRecording(row,false)}>{t.listen}</button>
    <button type="button" disabled={loading||disabled} onClick={()=>void getRecording(row,true)}>{t.use}</button>
    {preview?.id===row.id&&<audio src={preview.url} controls preload="none" style={{maxWidth:"100%",width:280}}/>}
   </div>)}
   </div>
  </div>}
 </section>
}