"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {Check,Play,Pause} from "lucide-react";
import videoStyles from "./mandala-video-mobile.module.css";
import {PUBLIC_MUSIC_TAG_LABELS,musicTagLabel,safeStudioMusicTags,studioMusicFilter,studioMusicFeaturedTracks,studioMusicAttachmentName} from "@/lib/mandala/studio-music-catalog.mjs";

const text={
ru:{title:"♫ Моя музыкальная библиотека",hide:"Скрыть библиотеку",upload:"Загрузить музыку",refresh:"Обновить",listen:"Прослушать",use:"В ролик",empty:"Нет доступных аудиодорожек",error:"Не удалось открыть аудио",loading:"Загрузка...",all:"Все",wellbeing:"Восстановление",focus:"Фокус",calm:"Спокойствие",energy:"Энергия",love:"Любовь"},
en:{title:"♫ My music library",hide:"Hide library",upload:"Upload music",refresh:"Refresh",listen:"Listen",use:"Use in video",empty:"No available recordings yet",error:"Music unavailable",loading:"Loading...",all:"All",wellbeing:"Wellbeing",focus:"Focus",calm:"Calm",energy:"Energy",love:"Love"},
es:{title:"♫ Mi biblioteca musical",hide:"Ocultar biblioteca",upload:"Subir música",refresh:"Actualizar",listen:"Escuchar",use:"Usar en vídeo",empty:"Aún no hay grabaciones disponibles",error:"Audio no disponible",loading:"Cargando...",all:"Todas",wellbeing:"Bienestar",focus:"Concentración",calm:"Calma",energy:"Energía",love:"Amor"}
};
const extra={
 ru:{find:"Найти музыку или композитора...",tags:"Теги",preview:"Источник и файл проверены · прослушивание не оценено",approved:"Проверено на слух"},
 en:{find:"Find music or composer...",tags:"Tags",preview:"Source and file verified · listening not yet reviewed",approved:"Audition approved"},
 es:{find:"Buscar música o compositor...",tags:"Etiquetas",preview:"Origen y archivo verificados · pendiente de escucha",approved:"Aprobado tras escuchar"}
};
const SAFE_MIME=new Set(["audio/mpeg","audio/mp4","audio/wav"]);
const MAX_SIZE=15*1024*1024;
export function StudioMusicPicker({locale="en",disabled=false,onSelect,initialOpen=false}){
 const t=text[locale]||text.en;
 const e=extra[locale]||extra.en;
 const [open,setOpen]=useState(Boolean(initialOpen));
 const [loading,setLoading]=useState(false);
 const [category,setCategory]=useState("all");
 const [tag,setTag]=useState("all"),[query,setQuery]=useState("");
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
     Number.isSafeInteger(v.bytes)&&v.bytes>0&&v.bytes<=MAX_SIZE)
     .map(row=>({...row,tags:safeStudioMusicTags(row.tags)})));
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
 const availableTags=useMemo(()=>Object.keys(PUBLIC_MUSIC_TAG_LABELS)
  .filter(k=>tracks.some(v=>v.tags?.includes(k))),[tracks]);
 const items=useMemo(()=>studioMusicFilter(tracks,{category,tag,query}),[tracks,category,tag,query]);
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
   <input aria-label={e.find} value={query} placeholder={e.find} maxLength={100}
     onChange={v=>setQuery(v.target.value)}
     style={{border:"1px solid #cbd8cc",padding:9,borderRadius:10,background:"white",width:"100%",boxSizing:"border-box"}}/>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
    <select aria-label={t.all} value={category} onChange={event=>setCategory(event.target.value)}
      style={{border:"1px solid #cbd8cc",padding:9,borderRadius:10,background:"white"}}>
     {["all","wellbeing","focus","calm","energy","love"].map(k=><option key={k} value={k}>{t[k]}</option>)}
    </select>
    <select aria-label={e.tags} value={tag} onChange={v=>setTag(v.target.value)}
      style={{border:"1px solid #cbd8cc",padding:9,borderRadius:10,background:"white",maxWidth:"100%"}}>
     <option value="all">{e.tags}</option>
     {availableTags.map(k=><option key={k} value={k}>{musicTagLabel(k,locale)}</option>)}
    </select>
    <button type="button" onClick={()=>void refresh()} disabled={loading}>{t.refresh}</button>
    <small>{loading?t.loading:items.length}</small>
   </div>
   {error&&<p role="alert">{error}</p>}
   {!loading&&items.length===0&&<small role="status">{t.empty}</small>}
   <div style={{maxHeight:330,overflowY:"auto",display:"grid",gap:7}}>
   {items.map(row=><div key={row.id} style={{border:"1px solid #dbe3dd",padding:9,borderRadius:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
    <div style={{flex:"1 1 160px",minWidth:0,display:"grid",gap:4}}>
      <strong style={{fontSize:13,overflowWrap:"anywhere"}}>{row.title}</strong>
      <small>{[row.composer,row.performer].filter(Boolean).join(" · ")}</small>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
       {row.tags?.filter(k=>PUBLIC_MUSIC_TAG_LABELS[k]).slice(0,4).map(k=>
         <small key={k} style={{background:"#eaf7ef",padding:"2px 5px",borderRadius:6}}>
          {musicTagLabel(k,locale)}</small>)}
      </div>
      <small>{row.reviewStage==="technical_preview"&&row.sourceVerified?e.preview:e.approved}</small>
    </div>
    <button type="button" disabled={loading||disabled} onClick={()=>void getRecording(row,false)}>{t.listen}</button>
    <button type="button" disabled={loading||disabled} onClick={()=>void getRecording(row,true)}>{t.use}</button>
    {preview?.id===row.id&&<audio src={preview.url} controls preload="none" style={{maxWidth:"100%",width:280}}/>}
   </div>)}
   </div>
  </div>}
 </section>
}

const featuredText={
 ru:{verified:"Источник проверен · ещё без оценки звучания",add:"Выбрать запись",remove:"Убрать запись",listen:"Прослушать",pause:"Пауза",unavailable:"Запись временно недоступна",again:"Нажмите воспроизведение ещё раз"},
 en:{verified:"Verified source · not yet listening-rated",add:"Choose recording",remove:"Remove recording",listen:"Listen",pause:"Pause",unavailable:"Recording unavailable",again:"Tap play again"},
 es:{verified:"Origen verificado · sin valoración auditiva",add:"Elegir grabación",remove:"Quitar grabación",listen:"Escuchar",pause:"Pausa",unavailable:"Grabación no disponible",again:"Pulsa reproducir otra vez"}
};
const validSiteRecording=row=>row?.mime==="audio/mpeg"&&
 Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.bytes<=15*1024*1024;
async function verifiedStudioMusicUrl(row){
 const response=await fetch("/api/app/studio-music",{
  method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"open",assetId:row.id})
 });
 if(!response.ok)throw Error("MUSIC_OPEN_FAILED");
 const data=await response.json();
 if(data?.id!==row.id||data.mime!==row.mime||data.bytes!==row.bytes||
    typeof data.url!=="string")throw Error("MUSIC_SOURCE_INVALID");
 const url=new URL(data.url);
 if(url.protocol!=="https:"||url.username||url.password||
    !url.hostname.endsWith(".supabase.co")||
    !url.pathname.startsWith("/storage/v1/object/sign/hh-studio-music-library/"))
   throw Error("MUSIC_URL_UNTRUSTED");
 return url.href;
}
/** Inline signed recordings in the SAME carousel as the original local choices.
 * No autoplay, no file upload, no new storage. Picking is a deliberate action.
 */
/**
 * Explicit cross-file JSX contract: default null and [] alone narrow inferred
 * props to null/never[] and reject the real string filename and poster list.
 * This is the existing client-side player; it preserves signed URL checks.
 * @param {{
 *   locale?: string,
 *   category?: string,
 *   disabled?: boolean,
 *   selectedFilename?: string | null,
 *   posters?: string[],
 *   onSelect?: (file: File) => void,
 *   onDeselect?: () => void,
 *   onPreviewStart?: () => void,
 *   onError?: (message: string) => void
 * }} props
 */
export function StudioMusicFeatured({locale="en",category="all",disabled=false,
 selectedFilename=null,posters=[],onSelect,onDeselect,onPreviewStart,onError}){
 const t=featuredText[locale]||featuredText.en;
 const [tracks,setTracks]=useState([]);
 const [loadState,setLoadState]=useState("loading"),[retry,setRetry]=useState(0);
 const [busyId,setBusyId]=useState(null);
 const [preview,setPreview]=useState(null);
 const [playing,setPlaying]=useState(false);
 const audioRef=useRef(null);
 useEffect(()=>{
  const controller=new AbortController();let live=true;
  void fetch("/api/app/studio-music",{credentials:"same-origin",cache:"no-store",
   signal:controller.signal}).then(async response=>{
    if(!response.ok)throw Error("MUSIC_LIST_FAILED");
    const data=await response.json();
    if(!Array.isArray(data?.items))throw Error("MUSIC_LIST_INVALID");
    if(live){setTracks(data.items.filter(validSiteRecording));setLoadState("ready");}
   }).catch(error=>{
     if(live&&error?.name!=="AbortError"){setLoadState("failed");onError?.(t.unavailable);}
   });
  return ()=>{live=false;controller.abort();audioRef.current?.pause();};
 // The public source route owns permissions; retry triggers a new bounded read.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[retry]);
 const picked=useMemo(()=>studioMusicFeaturedTracks(tracks,category,5),[tracks,category]);
 const notice=message=>onError?.(message);
 async function audition(row){
  if(disabled||busyId)return;
  const audio=audioRef.current;
  if(preview?.id===row.id&&audio){
   if(!audio.paused){audio.pause();setPlaying(false);return;}
   try{await audio.play();setPlaying(true);}catch{notice(t.again);}
   return;
  }
  if(audio){audio.pause();audio.removeAttribute("src");audio.load();}
  setPlaying(false);onPreviewStart?.();setBusyId(row.id);
  try{
   const url=await verifiedStudioMusicUrl(row);
   if(audio){audio.src=url;audio.load();}
   setPreview({id:row.id,url});
   try{await audio?.play();setPlaying(Boolean(audio));}catch{notice(t.again);}
  }catch{notice(t.unavailable);}finally{setBusyId(null);}
 }
 async function choose(row){
  if(disabled||busyId)return;
  const name=studioMusicAttachmentName(row);
  if(selectedFilename===name){onDeselect?.();return;}
  setBusyId(row.id);
  try{
   const url=await verifiedStudioMusicUrl(row);
   const response=await fetch(url,{cache:"no-store"});
   if(!response.ok)throw Error("MUSIC_FILE_UNAVAILABLE");
   const blob=await response.blob();
   if(blob.size!==row.bytes||blob.size>15*1024*1024||
     !["audio/mpeg","application/octet-stream"].includes(blob.type))
    throw Error("MUSIC_FILE_MISMATCH");
   onSelect?.(new File([blob],name,{type:row.mime}));
  }catch{notice(t.unavailable);}finally{setBusyId(null);}
 }
 return <>
  <audio ref={audioRef} preload="none" style={{display:"none"}}
   onEnded={()=>setPlaying(false)} onError={()=>setPlaying(false)}/>
  {loadState==="loading"&&<div data-video-studio-featured-loading
    className={videoStyles.audioCompactUpload} role="status">
    <strong>♫</strong><small>{locale==="ru"?"Загружаем записи…":
      locale==="es"?"Cargando grabaciones…":"Loading recordings…"}</small>
   </div>}
  {loadState==="failed"&&<button type="button"
    data-video-studio-featured-retry className={videoStyles.audioCompactUpload}
    disabled={disabled} onClick={()=>{setLoadState("loading");setRetry(v=>v+1);}}>
    <strong>↻</strong><small>{locale==="ru"?"Повторить":locale==="es"?"Reintentar":"Retry"}</small>
   </button>}
  {picked.map((row,index)=>{
   const selected=selectedFilename===studioMusicAttachmentName(row);
   const current=preview?.id===row.id&&playing;
   const poster=Array.isArray(posters)?posters[index%Math.max(1,posters.length)]:null;
   const parts=row.title.split(" · ");
   const short=parts.length>=2?(parts.slice(1,-1).join(" · ")||parts[1]):row.title;
   return <article key={row.id} className={videoStyles.audioCompactTile}
     data-video-audio-compact-track={"library:"+row.id}
     data-video-studio-featured-recording={row.id} data-selected={selected}
     data-audio-quality={row.reviewStage==="published"?"listening-reviewed":"source-verified"}
     style={!poster?{background:"linear-gradient(145deg,#35645b,#19433e 56%,#7c9a89)"}:undefined}>
    {poster&&<>
      {/* Decorative film scene, not a recording cover. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" loading="lazy"/>
    </>}
    <button type="button" className={videoStyles.audioCompactSelect}
     aria-label={(selected?t.remove:t.add)+" — "+row.title+" · "+t.verified}
     aria-pressed={selected} disabled={disabled||Boolean(busyId)}
     onClick={()=>void choose(row)}>
     <span className={videoStyles.audioCompactCheck} aria-hidden="true">
      {selected?<Check size={16} strokeWidth={3}/>:null}
     </span>
     <strong>{short}</strong>
     <small>{row.composer?.split(" ").at(-1)||"Classical"} · {row.licenseCode||"PD"} ♫</small>
    </button>
    <button type="button" className={videoStyles.audioCompactPlay}
     data-video-studio-featured-play={row.id}
     aria-label={(current?t.pause:t.listen)+" — "+row.title}
     aria-pressed={current} disabled={disabled||Boolean(busyId)}
     onClick={()=>void audition(row)}>
     {current?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}
    </button>
   </article>;
  })}
 </>;
}
