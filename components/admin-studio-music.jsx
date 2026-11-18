"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {createClient} from "@supabase/supabase-js";
import styles from "./admin-studio-music.module.css";
import {PUBLIC_MUSIC_TAG_LABELS,musicTagLabel,safeStudioMusicTags,studioMusicFilter} from "@/lib/mandala/studio-music-catalog.mjs";
import {
 STUDIO_MUSIC_CATEGORIES,STUDIO_MUSIC_MAX_BYTES,
 studioMusicFileInfo
} from "@/lib/mandala/studio-music-contract.mjs";

const words={
 ru:{title:"Музыкальная библиотека MyVideo",hint:"Загрузите до 30 качественных аудиодорожек за один раз. Исходники сохраняются приватно. Записи с проверенными файлами и лицензией доступны для ручного выбора; после прослушивания и оценки они попадут в одобренную подборку.",cat:"Категория для новых записей",choose:"Выбрать аудиофайлы",send:"Загрузить все",sending:"Загрузка",saved:"Сохранённые записи",empty:"Пока нет загруженных композиций",listen:"Прослушать",publish:"Опубликовать в MyVideo",retire:"Скрыть",rights:"Я проверил качество, права на коммерческое использование в видео и публичное воспроизведение этой фонограммы.",quality:"Моя оценка звучания",done:"Файлы приняты. Прослушайте и одобрите каждую запись отдельно.",problem:"Не удалось загрузить или сохранить некоторые файлы.",back:"В Video Studio",count:"Файлов в очереди",list:"Из них опубликовано",limit:"MP3, M4A, WAV · до 15 МБ каждый · до 30 за пакет",status:{pending:"Ожидает загрузки",ready:"Приватно",published:"Опубликовано",retired:"Скрыто"},categories:{wellbeing:"Восстановление",focus:"Сосредоточение",calm:"Спокойствие",energy:"Энергия",love:"Любовь"}},
 en:{title:"MyVideo music library",hint:"Add up to 30 high-quality recordings at once. Uploads stay private. Source-verified classics can be selected manually; listening approval is still required for the reviewed collection.",cat:"New music category",choose:"Choose audio files",send:"Upload all",sending:"Uploading",saved:"Saved recordings",empty:"No music uploaded yet",listen:"Listen",publish:"Publish to MyVideo",retire:"Hide",rights:"I listened to this recording and verified commercial video-sync and public recording-preview rights.",quality:"My listening score",done:"Files uploaded. Listen and approve each recording separately.",problem:"Some music files could not be uploaded.",back:"Video Studio",count:"Files queued",list:"Published",limit:"MP3, M4A, WAV · 15 MB per file · 30 per batch",status:{pending:"Pending upload",ready:"Private",published:"Published",retired:"Hidden"},categories:{wellbeing:"Wellbeing",focus:"Focus",calm:"Calm",energy:"Energy",love:"Love"}},
 es:{title:"Biblioteca musical MyVideo",hint:"Sube hasta 30 pistas de calidad. Las cargas siguen privadas. La música con origen verificado puede seleccionarse manualmente; la colección aprobada requiere escucharla y evaluarla.",cat:"Categoría",choose:"Elegir archivos",send:"Subir todos",sending:"Subiendo",saved:"Grabaciones guardadas",empty:"Todavía no hay pistas",listen:"Escuchar",publish:"Publicar en MyVideo",retire:"Ocultar",rights:"He escuchado la grabación y confirmado los derechos para vídeo comercial y reproducción pública.",quality:"Mi valoración",done:"Archivos subidos. Escucha y aprueba cada grabación.",problem:"Algunos archivos no se pudieron subir.",back:"Video Studio",count:"Archivos pendientes",list:"Publicados",limit:"MP3, M4A, WAV · 15 MB por archivo · 30 por lote",status:{pending:"Pendiente",ready:"Privado",published:"Publicado",retired:"Oculto"},categories:{wellbeing:"Bienestar",focus:"Concentración",calm:"Calma",energy:"Energía",love:"Amor"}}
};
const filtersWords={
 ru:{find:"Поиск по названию или исполнителю",all:"Все категории",tags:"Любые теги",source:"Источник записи",verified:"Подлинный аудиофайл проверен"},
 en:{find:"Search titles or performers",all:"All categories",tags:"Any tag",source:"Recording source",verified:"Original audio verified"},
 es:{find:"Buscar título o intérprete",all:"Todas las categorías",tags:"Cualquier etiqueta",source:"Fuente de grabación",verified:"Audio original verificado"}
};
const address="/api/admin/studio-music";
const post=async input=>{
 const response=await fetch(address,{method:"POST",credentials:"same-origin",
  cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
 const json=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(json.error||"MUSIC_REQUEST_FAILED");
 return json;
};
export default function AdminStudioMusic({locale="ru"}){
 const t=words[locale]||words.ru;
 const ft=filtersWords[locale]||filtersWords.ru;
 const [items,setItems]=useState([]),[files,setFiles]=useState([]);
 const [category,setCategory]=useState("calm");
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState("");
 const [notice,setNotice]=useState(""),[error,setError]=useState("");
 const [preview,setPreview]=useState(null);
 const [reviews,setReviews]=useState({});
 const [filterCategory,setFilterCategory]=useState("all"),[filterTag,setFilterTag]=useState("all"),[filterQuery,setFilterQuery]=useState("");
 const input=useRef(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;void reload();return()=>{mounted.current=false}},[]);
 async function reload(){
  try{
   const response=await fetch(address,{credentials:"same-origin",cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw Error(data.error);
   if(mounted.current)setItems(data.items||[]);
  }catch{if(mounted.current)setError(t.problem)}
 }
 function pick(event){
  const list=Array.from(event.currentTarget.files||[]);
  event.currentTarget.value="";
  setError("");setNotice("");
  if(list.length>30){setError(t.limit);return}
  try{list.forEach(file=>studioMusicFileInfo(file.name,file.type,file.size));setFiles(list)}
  catch{setFiles([]);setError(t.limit)}
 }
 async function uploadAll(){
  if(!files.length||busy)return;
  setBusy(true);setError("");setNotice("");
  let done=0;
  const failed=[];
  for(const file of files){
   try{
    if(!mounted.current)break;
    setProgress(t.sending+" "+(done+failed.length+1)+"/"+files.length+": "+file.name);
    const {intent}=await post({action:"prepare",filename:file.name,
      mime:file.type,bytes:file.size,title:file.name.replace(/\.[^.]+$/,"").slice(0,120),category});
    if(!intent||!intent.token||!intent.supabaseUrl||!intent.publishableKey||
       intent.bytes!==file.size)throw Error("INVALID_UPLOAD_INTENT");
    const store=createClient(intent.supabaseUrl,intent.publishableKey,
      {auth:{persistSession:false,autoRefreshToken:false}}).storage.from(intent.bucket);
    const {error:uploadError}=await store.uploadToSignedUrl(intent.path,intent.token,file,
      {contentType:intent.mime});
    // Completion always checks the exact object. It is safe after a lost upload ACK.
    try{await post({action:"complete",assetId:intent.assetId})}
    catch(error){throw uploadError||error}
    done++;
   }catch{failed.push(file.name)}
   if(mounted.current)await reload();
  }
  if(mounted.current){
   setFiles(failed.length?files.filter(f=>failed.includes(f.name)):[]);
   setProgress("");
   setNotice(done?t.done+" ("+done+")":"");
   if(failed.length)setError(t.problem+" ("+failed.join(", ")+")");
   setBusy(false);
  }
 }
 async function listen(item){
  setError("");setPreview(null);
  try{
   const p=await post({action:"preview",assetId:item.id});
   setPreview({id:item.id,url:p.url});
  }catch{setError(t.problem)}
 }
 async function publish(item){
  const review=reviews[item.id]||{};
  if(!review.rights||![4,5].includes(review.score)||busy)return;
  setBusy(true);setError("");
  try{
   await post({action:"publish",assetId:item.id,qualityScore:review.score,rightsConfirmed:true});
   await reload();
   setNotice(item.title+" — "+t.status.published);
  }catch{setError(t.problem)}
  finally{setBusy(false)}
 }
 async function retire(item){
  if(busy||!window.confirm(t.retire+" «"+item.title+"»?"))return;
  setBusy(true);setError("");
  try{await post({action:"retire",assetId:item.id,confirmed:true});await reload();
   if(preview?.id===item.id)setPreview(null)}
  catch{setError(t.problem)}finally{setBusy(false)}
 }
 const published=items.filter(x=>x.status==="published").length;
 const tags=useMemo(()=>Object.keys(PUBLIC_MUSIC_TAG_LABELS)
  .filter(k=>items.some(v=>safeStudioMusicTags(v.tags).includes(k))),[items]);
 const visible=useMemo(()=>studioMusicFilter(items,{category:filterCategory,tag:filterTag,query:filterQuery}),
  [items,filterCategory,filterTag,filterQuery]);
 return <main className={styles.page} data-studio-music-owner lang={locale}>
  <header className={styles.head}><div>
   <h1>{t.title}</h1><p>{t.hint}</p>
  </div><Link href={"/"+locale+"/holistic-support/mandala"}>{t.back}</Link></header>
  <section className={styles.panel}>
   <label className={styles.field}>{t.cat}
    <select value={category} onChange={e=>setCategory(e.target.value)} disabled={busy}>
     {STUDIO_MUSIC_CATEGORIES.map(key=><option key={key} value={key}>{t.categories[key]}</option>)}
    </select>
   </label>
   <label className={styles.fileBtn}>{t.choose}
    <input ref={input} type="file" multiple accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
      data-music-library-upload disabled={busy} onChange={pick}/>
   </label>
   <small>{t.limit}</small>
   <div className={styles.tools}>
    <span>{t.count}: {files.length}</span>
    <button className={styles.primary} onClick={uploadAll} disabled={busy||!files.length}>
     {busy?progress:t.send}
    </button>
   </div>
   {files.length>0&&<div className={styles.pending}>{files.map((f,i)=><small key={i}>{f.name} · {(f.size/1048576).toFixed(1)} MB</small>)}</div>}
   {notice&&<p role="status" className={styles.success}>{notice}</p>}
   {error&&<p role="alert" className={styles.error}>{error}</p>}
  </section>
  <section className={styles.panel}>
   <h2>{t.saved}: {items.length} · {t.list}: {published}</h2>
   <div className={styles.filters}>
    <input aria-label={ft.find} placeholder={ft.find} value={filterQuery} maxLength={100}
     onChange={v=>setFilterQuery(v.target.value)}/>
    <select aria-label={ft.all} value={filterCategory} onChange={v=>setFilterCategory(v.target.value)}>
     <option value="all">{ft.all}</option>{STUDIO_MUSIC_CATEGORIES.map(k=><option key={k} value={k}>{t.categories[k]}</option>)}
    </select>
    <select aria-label={ft.tags} value={filterTag} onChange={v=>setFilterTag(v.target.value)}>
     <option value="all">{ft.tags}</option>{tags.map(k=><option key={k} value={k}>{musicTagLabel(k,locale)}</option>)}
    </select>
    <small>{visible.length}/{items.length}</small>
   </div>
   {items.length===0?<p>{t.empty}</p>:
    <div className={styles.grid}>{visible.map(item=><article key={item.id} className={styles.record} data-studio-music-row={item.id}>
     <div><strong>{item.title}</strong>
      <small>{t.categories[item.category]} · {(item.bytes/1048576).toFixed(1)} MB · {t.status[item.status]}</small>
      {item.composer&&<small>{item.composer} · {item.performer||""}</small>}
      <div className={styles.tags}>{safeStudioMusicTags(item.tags).filter(k=>PUBLIC_MUSIC_TAG_LABELS[k]).slice(0,6)
       .map(k=><small key={k}>{musicTagLabel(k,locale)}</small>)}</div>
      {item.sourceVerified&&<small>{ft.verified} · {item.licenseCode}</small>}
      {item.sourcePage?.startsWith("https://commons.wikimedia.org/wiki/File:")&&
       <a href={item.sourcePage} target="_blank" rel="noopener noreferrer">{ft.source}</a>}
     </div>
     {(item.status==="ready"||item.status==="published")&&
      <button onClick={()=>listen(item)} disabled={busy}>{t.listen}</button>}
     {preview?.id===item.id&&<audio src={preview.url} controls preload="none" className={styles.player}/>}
     {item.status==="ready"&&<div className={styles.review}>
      <label>{t.quality}
       <select value={reviews[item.id]?.score||""} onChange={e=>setReviews(v=>({...v,
        [item.id]:{...v[item.id],score:Number(e.target.value)}}))}>
        <option value="">—</option><option value="4">4/5</option><option value="5">5/5</option>
       </select>
      </label>
      <label className={styles.check}><input type="checkbox" checked={reviews[item.id]?.rights||false}
       onChange={e=>setReviews(v=>({...v,[item.id]:{...v[item.id],rights:e.target.checked}}))}/>
       {t.rights}</label>
      <button className={styles.primary} disabled={busy||!reviews[item.id]?.rights||![4,5].includes(reviews[item.id]?.score)}
        onClick={()=>publish(item)}>{t.publish}</button>
     </div>}
     {(item.status==="ready"||item.status==="published")&&
       <button onClick={()=>retire(item)} disabled={busy} className={styles.retire}>{t.retire}</button>}
    </article>)}</div>}
  </section>
 </main>;
}
