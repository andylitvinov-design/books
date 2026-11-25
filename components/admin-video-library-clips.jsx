'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {createClient} from '@supabase/supabase-js';
import {ownerVideoFile,OWNER_VIDEO_CATEGORIES} from '@/lib/video-library/owner-video-contract.mjs';

const endpoint='/api/admin/video-library/clips';
const text={
 ru:{title:'Доступные видео для монтажа',hint:'Это готовые MP4 сайта. Выберите ролик для просмотра, затем откройте монтаж и подберите сюжет.',
  add:'Добавить свои видео MP4',private:'Приватный каталог загрузок',file:'Выбрать MP4',upload:'Загрузить видео',
  pending:'Пока не загружено',max:'До 8 МБ за файл, 12 файлов и 64 МБ для вашего каталога. MP4 H.264, просмотр и проверка перед добавлением.',
  category:'Тематика',tags:'Теги через запятую',preview:'Смотреть',close:'Закрыть плеер',review:'Отметить проверенным',delete:'Удалить',
  rights:'Проверены права на использование в коммерческих видео',people:'Разрешения людей, логотипов и объектов проверены',
  source:'Тип источника',original:'Моя оригинальная съёмка',licensed:'Лицензированный источник',link:'Официальная страница с лицензией',
  score:'Оценка качества',submit:'Завершить проверку',open:'Открыть монтаж',busy:'Загрузка…',
  onlyPrivate:'Загруженные файлы доступны только вам. Даже после проверки они НЕ становятся публичными или автоматически доступными генератору.',
  error:'Не удалось выполнить действие. Проверьте видео, вход в кабинет и доступное место.',ready:'Файлы загружены. Нажмите «Смотреть» и проверьте источник.',
  video:'Воспроизвести',clips:'Готовые видео',all:'Все',aspect:'Формат',portrait:'Вертикальный',landscape:'Горизонтальный',
  none:'По этим фильтрам нет роликов',confirm:'Удалить файл из приватного хранилища без восстановления?',
  labels:{'goals-money':'Дело и деньги','love-relationships':'Любовь','energy-confidence':'Энергия','stress-anxiety':'Стресс'}},
 en:{title:'Playable video footage',hint:'These are published local MP4 clips. Preview, then open Montage to choose a matching film.',
  add:'Add your MP4 footage',private:'Private uploaded footage',file:'Choose MP4',upload:'Upload video',pending:'No uploads yet',
  max:'Up to 8 MB/file, 12 files and 64 MB total. MP4 H.264; preview and rights review are required.',
  category:'Topic',tags:'Comma-separated tags',preview:'Preview',close:'Close player',review:'Review footage',delete:'Delete',
  rights:'I verified commercial-video usage rights',people:'People, brands and property are cleared',
  source:'Source',original:'My original footage',licensed:'Licensed source',link:'Original source/licence page',
  score:'Footage quality',submit:'Save review',open:'Open Montage',busy:'Uploading…',
  onlyPrivate:'Uploaded MP4s remain owner-private. Review does NOT publish them or make them generator-eligible.',
  error:'Action failed. Check your MP4, owner session and storage quota.',ready:'Upload complete. Preview and verify each clip.',
  video:'Play',clips:'Ready-made clips',all:'All',aspect:'Orientation',portrait:'Portrait',landscape:'Landscape',
  none:'No clips match these filters',confirm:'Permanently delete this private video file?',
  labels:{'goals-money':'Goals & Money','love-relationships':'Love','energy-confidence':'Energy','stress-anxiety':'Stress'}},
 es:{title:'Vídeos disponibles',hint:'MP4 publicados para previsualizar. Abre Montaje para seleccionar un vídeo.',
  add:'Agregar tus MP4',private:'Mis vídeos privados',file:'Elegir MP4',upload:'Subir vídeos',pending:'Sin archivos aún',
  max:'Hasta 8 MB por archivo, 12 vídeos y 64 MB en total. Se requiere revisión.',
  category:'Tema',tags:'Etiquetas separadas por comas',preview:'Ver',close:'Cerrar vídeo',review:'Revisar vídeo',delete:'Eliminar',
  rights:'He verificado los derechos comerciales',people:'Los derechos de personas, marcas y propiedades están aclarados',
  source:'Origen',original:'Mi vídeo original',licensed:'Fuente con licencia',link:'Página oficial de la fuente',
  score:'Calidad',submit:'Guardar revisión',open:'Abrir montaje',busy:'Subiendo…',
  onlyPrivate:'Los archivos subidos son privados. Revisarlos NO los publica ni activa para el generador.',
  error:'No se pudo completar. Comprueba el vídeo, el acceso y la cuota.',ready:'Vídeo subido. Revísalo antes de usarlo.',
  video:'Reproducir',clips:'Vídeos listos',all:'Todos',aspect:'Orientación',portrait:'Vertical',landscape:'Horizontal',
  none:'No hay vídeos con estos filtros',confirm:'¿Eliminar permanentemente el vídeo privado?',
  labels:{'goals-money':'Metas y dinero','love-relationships':'Amor','energy-confidence':'Energía','stress-anxiety':'Estrés'}}
};
const box={border:'1px solid #ddd6c8',borderRadius:14,padding:12,background:'#fffdf9'};
const control={minHeight:44,padding:'9px 12px',borderRadius:10,border:'1px solid #cfc6b9',background:'#fff',color:'#243b30',maxWidth:'100%'};
const btn={...control,cursor:'pointer',fontWeight:650};
const sourceCategory={money:'goals-money',goals:'goals-money',life:'goals-money',relationships:'love-relationships',energy:'energy-confidence',health:'stress-anxiety'};
const studio=locale=>`/${locale}/holistic-support/mandala#video-templates`;
const request=async input=>{
 const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const json=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(json.error||'VIDEO_LIBRARY_REQUEST_FAILED');
 return json;
};
function localMetadata(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),video=document.createElement('video');
  let done=false;
  const finish=(ok)=>{if(done)return;done=true;clearTimeout(timeout);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);
   (ok?resolve:reject)(ok?true:Error('VIDEO_NOT_PLAYABLE'));};
  const timeout=setTimeout(()=>finish(false),9000);
  video.preload='metadata';video.muted=true;video.playsInline=true;
  video.onloadedmetadata=()=>finish(video.videoWidth>=360&&video.videoHeight>=360&&
   Number.isFinite(video.duration)&&video.duration>=2&&video.duration<=180);
  video.onerror=()=>finish(false);video.src=url;video.load();
 });
}
/**
 * @typedef {{
 *   id: string,
 *   theme: string,
 *   collection: string,
 *   label: {en:string,ru:string,es:string},
 *   poster: string,
 *   video: string,
 *   allowedAspects: string[]
 * }} ApprovedSiteVideo
 * @param {{locale?: 'ru'|'en'|'es', scenes?: ApprovedSiteVideo[]}} props
 */
export default function AdminVideoLibraryClips({locale='ru',scenes=[]}){
 const t=text[locale]||text.ru;
 const [items,setItems]=useState([]),[files,setFiles]=useState([]);
 const [category,setCategory]=useState('energy-confidence'),[tags,setTags]=useState('');
 const [filter,setFilter]=useState('all'),[aspect,setAspect]=useState('all');
 const [search,setSearch]=useState(''),[mediaKind,setMediaKind]=useState('all'),[visible,setVisible]=useState(24);
 const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(''),[error,setError]=useState('');
 const [review,setReview]=useState({});const mounted=useRef(true);
 const input=useRef(null);
 useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false}},[]);
 async function load(){
  try{const r=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});
   const json=await r.json();if(!r.ok)throw Error(json.error);
   if(mounted.current)setItems(json.items||[]);
  }catch{if(mounted.current)setError(t.error)}
 }
 function choose(e){const picked=Array.from(e.target.files||[]).slice(0,3);
  e.target.value='';setNotice('');setError('');
  try{picked.forEach(file=>ownerVideoFile({filename:file.name,mime:file.type||'',bytes:file.size,
   title:file.name.replace(/\.mp4$/i,''),category,tags:[]}));setFiles(picked)}
  catch{setError(t.max);setFiles([])}
 }
 async function upload(){if(busy||!files.length)return;
  setBusy(true);setError('');setNotice('');let done=0;
  for(const file of files){
   try{
    await localMetadata(file);
    const cleanTags=[...new Set(tags.toLowerCase().split(',').map(x=>x.trim()).filter(Boolean))];
    const details=ownerVideoFile({filename:file.name,mime:file.type||'',bytes:file.size,
     title:file.name.replace(/\.mp4$/i,''),category,tags:cleanTags});
    const {intent}=await request({action:'prepare',...details});
    if(intent.bytes!==file.size||!intent.token||!intent.publishableKey||!intent.supabaseUrl)
      throw Error('VIDEO_UPLOAD_INTENT_INVALID');
    const client=createClient(intent.supabaseUrl,intent.publishableKey,
      {auth:{persistSession:false,autoRefreshToken:false}});
    const {error:uploadError}=await client.storage.from(intent.bucket).uploadToSignedUrl(
      intent.path,intent.token,file,{contentType:intent.mime,upsert:false});
    if(uploadError)throw uploadError;
    await request({action:'complete',assetId:intent.assetId});done++;
   }catch{setError(t.error+' '+file.name)}
   await load();
  }
  if(mounted.current){setBusy(false);setFiles([]);if(done)setNotice(t.ready+' ('+done+')')}
 }
 async function playOwned(item){setError('');try{const p=await request({action:'preview',assetId:item.id});
  setPreview({id:item.id,url:p.url,type:'owner'});
 }catch{setError(t.error)}}
 async function markReviewed(item){if(busy)return;setBusy(true);setError('');
  const v=review[item.id]||{};
  try{await request({action:'review',assetId:item.id,qualityScore:Number(v.score),
   rightsConfirmed:v.rights===true,peopleCleared:v.people===true,
   sourceType:v.sourceType||'owner_original',sourcePage:v.sourceType==='licensed_source'?v.sourcePage||'':null});
   await load();setNotice(item.title+' — '+t.submit);
  }catch{setError(t.error)}finally{setBusy(false)}
 }
 async function remove(item){if(busy||!window.confirm(t.confirm))return;setBusy(true);setError('');
  try{await request({action:'remove',assetId:item.id,confirmed:true});
   if(preview?.id===item.id)setPreview(null);await load();
  }catch{setError(t.error)}finally{setBusy(false)}
 }
 const available=useMemo(()=>{
  const needle=search.trim().toLocaleLowerCase().slice(0,70);
  return scenes.filter(s=>{
   if(filter!=='all'&&sourceCategory[s.theme]!==filter)return false;
   if(aspect!=='all'&&!(s.allowedAspects||[]).includes(aspect))return false;
   if(mediaKind==='filmed'&&s.media!=='licensed_mp4')return false;
   if(mediaKind==='motion'&&s.media!=='original_motion_mp4')return false;
   return !needle||[s.id,s.collection,s.theme,s.label?.[locale],...(s.tags||[])]
    .some(value=>String(value||'').toLocaleLowerCase().includes(needle));
  });
 },[scenes,filter,aspect,mediaKind,search,locale]);
 const pageItems=available.slice(0,visible);
 const chooseReview=(id,field,value)=>setReview(prev=>({...prev,[id]:{...prev[id],[field]:value}}));
 return <div data-admin-video-usable-library style={{display:'grid',gap:20,minWidth:0}}>
  <details style={box} data-admin-video-playable>
   <summary style={{cursor:'pointer',fontWeight:750,fontSize:17,padding:'4px 0'}}>{t.title} · {available.length}</summary>
   <p>{t.hint}</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
    <label>{locale==="ru"?"Поиск":locale==="es"?"Buscar":"Search"} <input type="search" style={control} value={search} maxLength={70} placeholder={locale==="ru"?"Название, тема или ID":locale==="es"?"Nombre, tema o ID":"Name, topic or ID"} onChange={e=>{setSearch(e.target.value);setVisible(24)}}/></label>
    <label>{locale==="ru"?"Тип видео":locale==="es"?"Tipo":"Video type"} <select style={control} value={mediaKind} onChange={e=>{setMediaKind(e.target.value);setVisible(24)}}>
     <option value="all">{t.all}</option><option value="filmed">{locale==="ru"?"Видео / композиции":"Video / compositions"}</option><option value="motion">{locale==="ru"?"Анимации (не съёмка)":"Animations (not filmed)"}</option>
    </select></label>
    <label>{t.category} <select style={control} value={filter} onChange={e=>{setFilter(e.target.value);setVisible(24)}}>
     <option value="all">{t.all}</option>
     {OWNER_VIDEO_CATEGORIES.map(x=><option key={x} value={x}>{t.labels[x]}</option>)}
    </select></label>
    <label>{t.aspect} <select style={control} value={aspect} onChange={e=>{setAspect(e.target.value);setVisible(24)}}>
     <option value="all">{t.all}</option><option value="portrait">{t.portrait} 9:16</option><option value="landscape">{t.landscape} 16:9</option>
    </select></label>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,165px),1fr))',gap:10}}>
    {pageItems.map(scene=><article key={scene.id} style={{...box,padding:8}}>
     {preview?.id===scene.id&&preview.type==='built-in'?<video key={scene.id} src={scene.video} poster={scene.poster}
       style={{width:'100%',aspectRatio:'9/12',objectFit:'contain',borderRadius:10,background:'#111'}} controls playsInline preload="metadata"/>
      :scene.poster?<img src={scene.poster} alt="" loading="lazy" style={{display:'block',width:'100%',aspectRatio:'9/12',objectFit:'cover',borderRadius:10,background:'#e9ede8'}}/>:
       <div style={{display:'grid',placeItems:'center',width:'100%',aspectRatio:'9/12',borderRadius:10,background:'#e9ede8'}} aria-hidden="true">▶</div>}
     <strong style={{display:'block',margin:'6px 0',fontSize:13}}>{scene.label?.[locale]||scene.id}</strong>
     <small>{scene.allowedAspects?.join(' / ')} · {scene.collection} · {scene.media==='original_motion_mp4'?(locale==='ru'?'Анимация': 'Animation'):(locale==='ru'?'Видеокомпозиция':'Video composition')}</small>
     <button type="button" style={{...btn,width:'100%',marginTop:6}}
      onClick={()=>setPreview(p=>p?.id===scene.id?null:{id:scene.id,type:'built-in'})}>
      {preview?.id===scene.id?t.close:t.preview}</button>
    </article>)}
   </div>
   {!available.length?<p>{t.none}</p>:null}
   {available.length>visible?<button type="button" style={btn} onClick={()=>setVisible(v=>Math.min(v+24,available.length))}>{locale==='ru'?'Показать ещё 24':locale==='es'?'Mostrar 24 más':'Show 24 more'} ({visible}/{available.length})</button>:null}
   <p><Link href={studio(locale)} style={{...btn,display:'inline-block',textDecoration:'none'}}>{t.open}</Link></p>
  </details>
  <section id="owner-video-upload" style={box} data-admin-video-upload>
   <h2 style={{margin:'0 0 6px'}}>{t.add}</h2><p>{t.max}</p>
   <p style={{fontSize:13,color:'#6b5142'}}>{t.onlyPrivate}</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'end'}}>
    <label>{t.category} <select style={control} disabled={busy} value={category} onChange={e=>setCategory(e.target.value)}>
     {OWNER_VIDEO_CATEGORIES.map(x=><option key={x} value={x}>{t.labels[x]}</option>)}
    </select></label>
    <label>{t.tags} <input style={control} value={tags} onChange={e=>setTags(e.target.value)} placeholder="people, teamwork" maxLength={230}/></label>
    <label style={{...btn,display:'inline-flex',alignItems:'center'}}>{t.file}
      <input ref={input} type="file" multiple accept=".mp4,video/mp4" disabled={busy}
       onChange={choose} style={{display:'block',maxWidth:210}}/></label>
    <button style={btn} type="button" disabled={!files.length||busy} onClick={upload}>
     {busy?t.busy:t.upload+' ('+files.length+')'}</button>
   </div>
   {notice?<p role="status">{notice}</p>:null}{error?<p role="alert">{error}</p>:null}
   <h3>{t.private} · {items.length}</h3>
   {!items.length?<p>{t.pending}</p>:null}
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))',gap:10}}>
    {items.map(item=><article key={item.id} style={box}>
     <strong>{item.title}</strong><p style={{fontSize:13,margin:'6px 0'}}>{t.labels[item.category]||item.category} · {item.status} · {(item.bytes/1e6).toFixed(1)} MB</p>
     <small>{item.tags?.join(' · ')||''}</small>
     {preview?.id===item.id&&preview.type==='owner'?<video key={item.id} src={preview.url} controls playsInline preload="metadata"
      style={{width:'100%',background:'#111',borderRadius:8,marginTop:8,maxHeight:240}}/>:null}
     <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:8}}>
      {item.status!=='pending'?<button style={btn} onClick={()=>playOwned(item)}>{t.preview}</button>:null}
      <button style={btn} disabled={busy} onClick={()=>remove(item)}>{t.delete}</button>
     </div>
     {item.status==='ready'?<details style={{marginTop:9}}>
      <summary>{t.review}</summary>
      <label style={{display:'block',marginTop:8}}>{t.source} <select style={control}
       value={review[item.id]?.sourceType||'owner_original'} onChange={e=>chooseReview(item.id,'sourceType',e.target.value)}>
       <option value="owner_original">{t.original}</option><option value="licensed_source">{t.licensed}</option>
      </select></label>
      {review[item.id]?.sourceType==='licensed_source'?<label style={{display:'block'}}>{t.link}
       <input style={{...control,width:'100%'}} type="url" value={review[item.id]?.sourcePage||''}
        onChange={e=>chooseReview(item.id,'sourcePage',e.target.value)}/></label>:null}
      <label style={{display:'block'}}>{t.score} <select style={control}
       value={review[item.id]?.score||''} onChange={e=>chooseReview(item.id,'score',Number(e.target.value))}>
       <option value="">—</option><option value="4">4/5</option><option value="5">5/5</option>
      </select></label>
      <label style={{display:'block',marginTop:8}}><input type="checkbox" checked={review[item.id]?.rights===true}
       onChange={e=>chooseReview(item.id,'rights',e.target.checked)}/> {t.rights}</label>
      <label style={{display:'block'}}><input type="checkbox" checked={review[item.id]?.people===true}
       onChange={e=>chooseReview(item.id,'people',e.target.checked)}/> {t.people}</label>
      <button type="button" style={{...btn,marginTop:10}} disabled={busy} onClick={()=>markReviewed(item)}>{t.submit}</button>
     </details>:null}
    </article>)}
   </div>
  </section>
 </div>;
}
