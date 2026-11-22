"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import styles from "./studio-music-picker.module.css";
import {Check,Play,Pause} from "lucide-react";
import videoStyles from "./mandala-video-mobile.module.css";
import montageRef from "./mandala-montage-approved.module.css";
import {createStudioMusicPreviewUrlCache} from "@/lib/mandala/studio-music-preview-cache.mjs";
import {PUBLIC_MUSIC_TAG_LABELS,musicTagLabel,safeStudioMusicTags,studioMusicFilter,studioMusicFeaturedTracks,studioMusicAttachmentName} from "@/lib/mandala/studio-music-catalog.mjs";

const text={
ru:{title:"♫ Моя музыкальная библиотека",hide:"Скрыть библиотеку",upload:"Загрузить музыку",refresh:"Обновить",listen:"Прослушать",use:"В ролик",empty:"Нет доступных аудиодорожек",error:"Не удалось открыть аудио",loading:"Загрузка...",all:"Все",wellbeing:"Восстановление",focus:"Фокус",calm:"Спокойствие",energy:"Энергия",love:"Любовь"},
en:{title:"♫ My music library",hide:"Hide library",upload:"Upload music",refresh:"Refresh",listen:"Listen",use:"Use in video",empty:"No available recordings yet",error:"Music unavailable",loading:"Loading...",all:"All",wellbeing:"Wellbeing",focus:"Focus",calm:"Calm",energy:"Energy",love:"Love"},
es:{title:"♫ Mi biblioteca musical",hide:"Ocultar biblioteca",upload:"Subir música",refresh:"Actualizar",listen:"Escuchar",use:"Usar en vídeo",empty:"Aún no hay grabaciones disponibles",error:"Audio no disponible",loading:"Cargando...",all:"Todas",wellbeing:"Bienestar",focus:"Concentración",calm:"Calma",energy:"Energía",love:"Amor"}
};
const extra={
 ru:{find:"Найти музыку или композитора...",tags:"Теги",preview:"Источник и файл проверены · прослушивание не оценено",approved:"Проверено на слух",previewShort:"Файл проверен",approvedShort:"Одобрено",play:"Воспроизвести",pause:"Пауза",seek:"Перемотка",retry:"Обновить ссылку",playError:"Аудио не открылось. Обновите ссылку и попробуйте снова.",more:"Показать ещё",of:"из"},
 en:{find:"Find music or composer...",tags:"Tags",preview:"Source and file verified · listening not yet reviewed",approved:"Audition approved",previewShort:"File verified",approvedShort:"Reviewed",play:"Play",pause:"Pause",seek:"Seek audio",retry:"Refresh link",playError:"Audio could not play. Refresh its link and try again.",more:"Show more",of:"of"},
 es:{find:"Buscar música o compositor...",tags:"Etiquetas",preview:"Origen y archivo verificados · pendiente de escucha",approved:"Aprobado tras escuchar",previewShort:"Archivo verificado",approvedShort:"Revisado",play:"Reproducir",pause:"Pausar",seek:"Buscar posición",retry:"Renovar enlace",playError:"No se pudo reproducir el audio. Renueva el enlace e inténtalo otra vez.",more:"Mostrar más",of:"de"}
};
const SAFE_MIME=new Set(["audio/mpeg","audio/mp4","audio/wav"]);
const MAX_SIZE=15*1024*1024;
const PAGE_SIZE=12;
const clock=(seconds)=>{
 if(!Number.isFinite(seconds)||seconds<0)return "0:00";
 const s=Math.floor(seconds);
 return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
};
function AudioTransport({src,expiresAt,title,e,onRetry}){
 const element=useRef(null);
 const [playing,setPlaying]=useState(false);
 const [position,setPosition]=useState(0);
 const [duration,setDuration]=useState(0);
 const [failed,setFailed]=useState(false);
 const toggle=()=>{
  const audio=element.current;
  if(!audio||failed)return;
  if(Date.now()>=expiresAt){onRetry();return}
  if(audio.paused){
   void audio.play().then(()=>setPlaying(true)).catch(()=>{setFailed(true);setPlaying(false)});
  }else{audio.pause();setPlaying(false)}
 };
 const seek=event=>{
  if(!element.current||!duration)return;
  element.current.currentTime=Number(event.target.value);
 };
 return <div className={styles.player} role="group" aria-label={title}>
  <audio ref={element} src={src} preload="none"
   onLoadedMetadata={event=>setDuration(Number.isFinite(event.currentTarget.duration)?event.currentTarget.duration:0)}
   onTimeUpdate={event=>setPosition(event.currentTarget.currentTime)}
   onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
   onEnded={()=>{setPlaying(false);setPosition(0)}}
   onError={()=>{setFailed(true);setPlaying(false)}}/>
  {failed?<div className={styles.error} style={{gridColumn:"1 / -1"}}>
   {e.playError} <button type="button" className={styles.retry} onClick={onRetry}>{e.retry}</button>
  </div>:<>
   <button type="button" className={styles.playButton} onClick={toggle}
    aria-label={playing?e.pause:e.play} title={playing?e.pause:e.play}>
    {playing?"❚❚":"▶"}
   </button>
   <input className={styles.seek} type="range" min="0" max={duration||1}
    step="0.1" value={Math.min(position,duration||1)} onChange={seek}
    disabled={!duration} aria-label={e.seek}/>
   <span className={styles.time}>{clock(position)} / {duration?clock(duration):"–:––"}</span>
  </>}
 </div>;
}
export function StudioMusicPicker({locale="en",disabled=false,onSelect,initialOpen=false}){
 const t=text[locale]||text.en;
 const e=extra[locale]||extra.en;
 const [open,setOpen]=useState(Boolean(initialOpen));
 const [loading,setLoading]=useState(false);
 const [category,setCategory]=useState("all");
 const [tag,setTag]=useState("all"),[query,setQuery]=useState("");
 const [tracks,setTracks]=useState([]);
 const [preview,setPreview]=useState(null);
 const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
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
   if(!attach){
    const seconds=Number.isSafeInteger(json.expiresSeconds)?json.expiresSeconds:180;
    setPreview({id:row.id,url:url.href,expiresAt:Date.now()+Math.max(0,seconds-15)*1000});
    return;
   }
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
 return <section data-video-studio-music-library className={styles.library}>
  <div className={styles.head}>
   <button type="button" data-video-studio-music-open disabled={disabled} className={styles.toggle}
    onClick={()=>setOpen(x=>!x)}>{open?t.hide:t.title}</button>
   <Link href="/admin/music-library" className={styles.upload}>{t.upload}</Link>
  </div>
  {open&&<div className={styles.content}>
   <input className={styles.search} aria-label={e.find} value={query}
    placeholder={e.find} maxLength={100}
    onChange={event=>{setQuery(event.target.value);setVisibleCount(PAGE_SIZE)}}/>
   <div className={styles.filters}>
    <select className={styles.select} aria-label={t.all} value={category}
     onChange={event=>{setCategory(event.target.value);setVisibleCount(PAGE_SIZE)}}>
     {["all","wellbeing","focus","calm","energy","love"].map(k=><option key={k} value={k}>{t[k]}</option>)}
    </select>
    <select className={styles.select} aria-label={e.tags} value={tag}
     onChange={event=>{setTag(event.target.value);setVisibleCount(PAGE_SIZE)}}>
     <option value="all">{e.tags}</option>
     {availableTags.map(k=><option key={k} value={k}>{musicTagLabel(k,locale)}</option>)}
    </select>
   </div>
   <div className={styles.filterFoot}>
    <span className={styles.count}>{loading?t.loading:items.length+" "+e.of+" "+tracks.length}</span>
    <button type="button" className={styles.refresh} onClick={()=>void refresh()} disabled={loading}>{t.refresh}</button>
   </div>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {!loading&&items.length===0&&<p className={styles.notice} role="status">{t.empty}</p>}
   <div className={styles.list}>
    {items.slice(0,visibleCount).map(row=><article key={row.id} className={styles.card}>
     <div className={styles.cardHeader}>
      <span aria-hidden="true" className={styles.cover}>♫</span>
      <div className={styles.description}>
       <strong className={styles.title}>{row.title}</strong>
       {(row.composer||row.performer)&&<span className={styles.author}>
        {[row.composer,row.performer].filter(Boolean).join(" · ")}</span>}
      </div>
     </div>
     {row.tags?.length>0&&<div className={styles.tags}>
      {row.tags.filter(k=>PUBLIC_MUSIC_TAG_LABELS[k]).slice(0,4).map(k=>
       <span key={k} className={styles.tag}>{musicTagLabel(k,locale)}</span>)}
     </div>}
     <span className={styles.quality}
      title={row.reviewStage==="technical_preview"&&row.sourceVerified?e.preview:e.approved}>
      {row.reviewStage==="technical_preview"&&row.sourceVerified?e.previewShort:e.approvedShort}
     </span>
     <div className={styles.actions}>
      <button type="button" className={styles.listen} disabled={loading||disabled}
       onClick={()=>void getRecording(row,false)}>▶ {t.listen}</button>
      <button type="button" className={styles.use} disabled={loading||disabled}
       onClick={()=>void getRecording(row,true)}>{t.use}</button>
     </div>
     {preview?.id===row.id&&
      <AudioTransport key={preview.url} src={preview.url} expiresAt={preview.expiresAt}
       title={row.title} e={e} onRetry={()=>void getRecording(row,false)}/>}
    </article>)}
   </div>
   {items.length>visibleCount&&<button type="button" className={styles.more}
    onClick={()=>setVisibleCount(count=>count+PAGE_SIZE)}>{e.more} ({items.length-visibleCount})</button>}
  </div>}
 </section>;
}
const featuredText={
 ru:{loading:"Загрузка звука",verified:"Источник проверен · ещё без оценки звучания",add:"Выбрать запись",remove:"Убрать запись",listen:"Прослушать",pause:"Пауза",unavailable:"Запись временно недоступна",again:"Нажмите воспроизведение ещё раз"},
 en:{loading:"Loading audio",verified:"Verified source · not yet listening-rated",add:"Choose recording",remove:"Remove recording",listen:"Listen",pause:"Pause",unavailable:"Recording unavailable",again:"Tap play again"},
 es:{loading:"Cargando audio",verified:"Origen verificado · sin valoración auditiva",add:"Elegir grabación",remove:"Quitar grabación",listen:"Escuchar",pause:"Pausa",unavailable:"Grabación no disponible",again:"Pulsa reproducir otra vez"}
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
 const seconds=Number.isSafeInteger(data.expiresSeconds)?data.expiresSeconds:180;
 return {url:url.href,expiresAt:Date.now()+Math.max(0,Math.min(seconds,180)-20)*1000};
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
 selectedFilename=null,onSelect,onDeselect,onPreviewStart,onError}){
 const t=featuredText[locale]||featuredText.en;
 const [tracks,setTracks]=useState([]);
 const [loadState,setLoadState]=useState("loading"),[retry,setRetry]=useState(0);
 const [busyId,setBusyId]=useState(null);
 const [preview,setPreview]=useState(null);
 const [playing,setPlaying]=useState(false);
 const audioRef=useRef(null);
 const [bufferingId,setBufferingId]=useState(null);
 const playSequence=useRef(0);
 const cacheRef=useRef(null);
 if(!cacheRef.current)cacheRef.current=createStudioMusicPreviewUrlCache(verifiedStudioMusicUrl);
 const signedUrlCache=cacheRef.current;
 useEffect(()=>{
  const controller=new AbortController();let live=true;
  void fetch("/api/app/studio-music",{credentials:"same-origin",cache:"no-store",
   signal:controller.signal}).then(async response=>{
    if(!response.ok)throw Error("MUSIC_LIST_FAILED");
    const data=await response.json();
    if(!Array.isArray(data?.items))throw Error("MUSIC_LIST_INVALID");
    if(live){setTracks(data.items.filter(validSiteRecording));setLoadState("ready");}
   }).catch(error=>{
     if(live&&error?.name!=="AbortError")setLoadState("failed");
   });
  return ()=>{live=false;controller.abort();audioRef.current?.pause();};
 // The public source route owns permissions; retry triggers a new bounded read.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[retry]);
 const picked=useMemo(()=>studioMusicFeaturedTracks(tracks,category,4),[tracks,category]);
 useEffect(()=>{
  if(loadState!=="ready"||disabled)return;
  // Only sign three visible music URLs after paint. Audio bytes are never prefetched.
  const timer=setTimeout(()=>signedUrlCache.prime(picked,3),150);
  return ()=>clearTimeout(timer);
 },[loadState,disabled,picked,signedUrlCache]);
 useEffect(()=>()=>{playSequence.current+=1;signedUrlCache.clear()},[signedUrlCache]);
 const notice=message=>onError?.(message);
 const playFromUrl=(row,url,sequence)=>{
  const audio=audioRef.current;
  if(!audio||sequence!==playSequence.current)return;
  audio.pause();audio.src=url;audio.load();
  setPreview({id:row.id,url});setPlaying(false);setBufferingId(row.id);
  void audio.play().then(()=>{
   if(sequence===playSequence.current){setPlaying(true);setBufferingId(null)}
  }).catch(error=>{
   if(sequence===playSequence.current){
    setPlaying(false);setBufferingId(null);
    notice(error?.name==="NotAllowedError"?t.again:t.unavailable);
   }
  });
 };
 async function audition(row){
  if(disabled||busyId)return;
  const audio=audioRef.current;
  if(preview?.id===row.id&&audio&&!audio.paused){
   playSequence.current+=1;audio.pause();setPlaying(false);setBufferingId(null);return;
  }
  const sequence=++playSequence.current;
  onPreviewStart?.();
  const readyUrl=signedUrlCache.peek(row.id);
  if(readyUrl){
   // Synchronous within original iOS user gesture: no await before play().
   if(preview?.id===row.id&&audio?.src===readyUrl){
    setBufferingId(row.id);
    void audio.play().then(()=>{
     if(sequence===playSequence.current){setPlaying(true);setBufferingId(null)}
    }).catch(error=>{
     if(sequence===playSequence.current){
      setPlaying(false);setBufferingId(null);
      notice(error?.name==="NotAllowedError"?t.again:t.unavailable);
     }
    });
   }else playFromUrl(row,readyUrl,sequence);
   return;
  }
  if(audio){audio.pause();audio.removeAttribute("src");audio.load();}
  setPlaying(false);setPreview({id:row.id,url:""});
  setBufferingId(row.id);setBusyId(row.id);
  try{
   const url=await signedUrlCache.get(row);
   if(sequence===playSequence.current)playFromUrl(row,url,sequence);
  }catch{
   if(sequence===playSequence.current){setBufferingId(null);notice(t.unavailable)}
  }finally{setBusyId(null)}
 }
 async function choose(row){
  if(disabled||busyId)return;
  const name=studioMusicAttachmentName(row);
  if(selectedFilename===name){onDeselect?.();return;}
  setBusyId(row.id);
  try{
   const url=await signedUrlCache.get(row);
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
   onPlaying={()=>{setPlaying(true);setBufferingId(null)}}
   onWaiting={()=>{if(preview?.id)setBufferingId(preview.id)}}
   onStalled={()=>{if(preview?.id)setBufferingId(preview.id)}}
   onTimeUpdate={event=>{if(event.currentTarget.currentTime>=30){event.currentTarget.pause();event.currentTarget.currentTime=0;}}}
   onPause={()=>setPlaying(false)}
   onEnded={()=>{setPlaying(false);setBufferingId(null)}}
   onError={()=>{setPlaying(false);setBufferingId(null)}}/>
  {loadState==="loading"&&<div data-video-studio-featured-loading className={videoStyles.audioCompactUpload}
    role="status">{locale==="ru"?"Загружаем записи…":locale==="es"?"Cargando grabaciones…":"Loading recordings…"}</div>}
  {loadState==="failed"&&<button type="button" data-video-studio-featured-retry
    className={videoStyles.audioCompactUpload} disabled={disabled}
    onClick={()=>{setLoadState("loading");setRetry(v=>v+1);}}>
    {locale==="ru"?"Дополнительные записи недоступны · Повторить":
      locale==="es"?"Más grabaciones no disponibles · Reintentar":"Extra recordings unavailable · Retry"}
  </button>}
  {picked.map(row=>{
   const selected=selectedFilename===studioMusicAttachmentName(row);
   const current=preview?.id===row.id&&playing;
   const buffering=busyId===row.id||bufferingId===row.id;
   const parts=row.title.split(" · ");
   const short=parts.length>=2?(parts.slice(1,-1).join(" · ")||parts[1]):row.title;
   return <article key={row.id} className={montageRef.trackRow}
     data-video-audio-compact-track={"library:"+row.id}
     data-video-studio-featured-recording={row.id} data-selected={selected}
     data-audio-buffering={buffering}
     data-audio-quality={row.reviewStage==="published"?"listening-reviewed":"source-verified"}>
    <button type="button" className={montageRef.trackPlay}
      data-video-studio-featured-play={row.id}
      aria-label={(buffering?t.loading:current?t.pause:t.listen)+" — "+row.title}
      aria-busy={buffering} aria-pressed={current} disabled={disabled||Boolean(busyId)}
      onPointerEnter={()=>{if(!disabled)void signedUrlCache.get(row).catch(()=>{})}}
      onFocus={()=>{if(!disabled)void signedUrlCache.get(row).catch(()=>{})}}
      onTouchStart={()=>{if(!disabled)void signedUrlCache.get(row).catch(()=>{})}}
      onClick={()=>void audition(row)}>
      {buffering?<span aria-hidden="true">…</span>:current?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}
    </button>
    <button type="button" className={montageRef.trackChoose}
      data-video-audio-compact-select={"library:"+row.id}
      aria-label={(selected?t.remove:t.add)+" — "+row.title+" · "+t.verified}
      aria-pressed={selected} disabled={disabled||Boolean(busyId)}
      onClick={()=>void choose(row)}>
      <span className={montageRef.trackMeta}>
        <strong>{short}</strong>
        <small>{(row.composer?.split(" ").at(-1)||"Classical")+" · "+(row.licenseCode||"PD")}</small>
      </span>
      <span className={montageRef.trackWave} aria-hidden="true">
        {Array.from({length:13},(_,bar)=><i key={bar}/>)}
      </span>
      {selected?<span className={montageRef.trackTick} aria-hidden="true"><Check size={16} strokeWidth={3}/></span>:null}
    </button>
   </article>;
  })}
 </>;
}

