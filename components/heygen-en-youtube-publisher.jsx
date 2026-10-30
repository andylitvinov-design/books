'use client'
import {useCallback,useEffect,useState} from 'react'

const MESSAGE={
 ru:{
  heading:'HeyGen → English YouTube · @aatapro',
  intro:'Готовый ролик загружается напрямую с HeyGen в английский YouTube, без Metricool, скачивания на телефон или новой генерации.',
  connected:'Серверное подключение @aatapro подтверждено',
  notConnected:'Нужно отдельно подключить серверный английский YouTube',
  channel:'Подключить @aatapro для автоматической загрузки',
  id:'HeyGen Video ID',title:'Название в YouTube',description:'Описание',
  url:'Прямая ссылка на captioned MP4 (если серверный HeyGen API не подключён)',
  urlHint:'Необязательная приватная ссылка из HeyGen. Не публикуйте её в GitHub или сообщениях.',
  consent:'Подтверждаю право использовать и публиковать этот ролик в своём канале @aatapro.',
  privacy:'Подтверждаю загрузку по ссылке (Unlisted), без публичной публикации.',
  upload:'Загрузить готовый HeyGen ролик',check:'Проверить статус',
  verify:'Проверить уже полученный YouTube ID',done:'Подтверждено YouTube',
  pending:'Передача выполняется или YouTube ещё обрабатывает видео.',
  uncertain:'Исход не подтверждён. Не повторяйте загрузку; проверьте существующий ID.',
  failed:'Ошибка. Автоматический повтор заблокирован.',
  key:'Для загрузки только по ID нужен HH_HEYGEN_API_KEY в Vercel. Без ключа можно передать подписанную captioned MP4 ссылку.',
  show:'Дополнительные параметры',source:'Источник не передаётся в публичный журнал.',
  error:'Ошибка',link:'Посмотреть на YouTube'
 },
 en:{
  heading:'HeyGen → English YouTube · @aatapro',
  intro:'Upload an existing HeyGen render directly to your English YouTube, without Metricool, phone download or another render.',
  connected:'Server-side @aatapro is connected',
  notConnected:'Connect English YouTube server access separately',
  channel:'Connect @aatapro for automatic uploads',
  id:'HeyGen video ID',title:'YouTube title',description:'Description',
  url:'Private captioned MP4 URL (if HeyGen API is not connected)',
  urlHint:'Optional private HeyGen signed URL. Never post it to public GitHub.',
  consent:'I own the rights to publish this video on my @aatapro channel.',
  privacy:'I approve an Unlisted upload, not a Public publication.',
  upload:'Upload finished HeyGen video',check:'Refresh status',
  verify:'Read back existing YouTube ID',done:'Verified by YouTube',
  pending:'Uploading or still processing on YouTube.',
  uncertain:'Outcome uncertain. Do not reupload; check the existing ID.',
  failed:'Upload failed. Automatic retries are disabled.',
  key:'For ID-only imports, set HH_HEYGEN_API_KEY in Vercel. A private captioned MP4 URL also works.',
  show:'Advanced',source:'Source URL is not added to the public history.',
  error:'Error',link:'Watch on YouTube'
 }
}
const valid=id=>/^[a-f0-9]{32}$/i.test(id)
async function api(method,body,videoId){
 const url='/api/admin/heygen-youtube'+(videoId?'?videoId='+encodeURIComponent(videoId):'')
 const response=await fetch(url,{
   method,credentials:'same-origin',cache:'no-store',
   headers:body?{'content-type':'application/json'}:undefined,
   body:body?JSON.stringify(body):undefined})
 const data=await response.json().catch(()=>({error:'INVALID_SERVER_RESPONSE'}))
 if(!response.ok)throw Error(data.error||'PUBLISHER_UNAVAILABLE')
 return data
}
export default function HeygenEnYoutubePublisher({
 locale='ru',initialVideoId='',initialTitle='',initialDescription=''
}){
 const t=MESSAGE[locale==='en'?'en':'ru']
 const [videoId,setVideoId]=useState(valid(initialVideoId)?initialVideoId:'')
 const [title,setTitle]=useState(initialTitle)
 const [description,setDescription]=useState(initialDescription)
 const [mediaUrl,setMediaUrl]=useState('')
 const [rights,setRights]=useState(false)
 const [privacy,setPrivacy]=useState(false)
 const [connected,setConnected]=useState(false)
 const [apiConfigured,setApiConfigured]=useState(false)
 const [job,setJob]=useState(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const read=useCallback(async id=>{
   const response=await api('GET',null,valid(id)?id:null)
   setConnected(response.connected===true)
   if(typeof response.heygenApiConfigured==='boolean')
     setApiConfigured(response.heygenApiConfigured)
   if(response.job)setJob(response.job)
   return response
 },[])
 useEffect(()=>{
   let current=true
   const refresh=async()=>{
     try{const data=await api('GET',null,valid(initialVideoId)?initialVideoId:null)
       if(!current)return
       setConnected(data.connected===true)
       setApiConfigured(data.heygenApiConfigured===true)
       if(data.job)setJob(data.job)
     }catch{/* Nothing should be marked connected after an anonymous request. */}
   }
   refresh()
   return ()=>{current=false}
 },[initialVideoId])
 useEffect(()=>{
   if(!job||!['queued','checking','uploading','processing','uncertain'].includes(job.state))return
   const timer=setInterval(()=>{
     read(job.videoId).catch(()=>{})
   },7000)
   return ()=>clearInterval(timer)
 },[job?.state,job?.videoId,read])
 async function submit(){
   setBusy(true);setError('')
   try{
     const result=await api('POST',{action:'publish',videoId,
       title,description,mediaUrl:mediaUrl.trim()||undefined,
       rightsConfirmed:rights,privacyConfirmed:privacy})
     setJob(result.job)
   }catch(e){setError(e.message)}
   finally{setBusy(false)}
 }
 async function refresh(verify=false){
   setBusy(true);setError('')
   try{
     if(verify&&valid(videoId)){
       const result=await api('POST',{action:'verify',videoId})
       setJob(result.job)
     }else await read(videoId)
   }catch(e){setError(e.message)}
   finally{setBusy(false)}
 }
 const canSubmit=connected&&valid(videoId)&&title.trim().length>0&&
   title.length<=100&&rights&&privacy&&!busy&&!job
 return <section data-heygen-en-publisher
   style={{border:'1px solid #bcae94',borderRadius:12,
     padding:14,margin:'16px 0',background:'#faf7f1',color:'#463c32'}}>
   <h2 style={{fontSize:19,margin:'0 0 8px'}}>{t.heading}</h2>
   <p style={{fontSize:15,margin:'0 0 12px'}}>{t.intro}</p>
   <p role="status" style={{fontSize:14,margin:'0 0 12px',fontWeight:600}}>
     {connected?'✅ '+t.connected:'🔐 '+t.notConnected}
   </p>
   {!connected&&<p><a href="/api/admin/telegram-video/youtube/start?target=en">
     {t.channel}</a></p>}
   <div style={{display:'grid',gap:10}}>
     <label style={{fontSize:14}}>{t.id}
       <input value={videoId} onChange={e=>{setVideoId(e.target.value.trim());setJob(null)}}
         inputMode="text" spellCheck={false} autoCapitalize="off" autoCorrect="off"
         maxLength={32} placeholder="32-character HeyGen ID"
         style={{display:'block',width:'100%',fontSize:16,padding:10,borderRadius:8,
           border:'1px solid #c5b7aa',marginTop:4,boxSizing:'border-box'}}/>
     </label>
     <label style={{fontSize:14}}>{t.title}
       <input value={title} onChange={e=>setTitle(e.target.value)}
         maxLength={100} placeholder="Holistic House — It Starts With You"
         style={{display:'block',width:'100%',fontSize:16,padding:10,borderRadius:8,
           border:'1px solid #c5b7aa',marginTop:4,boxSizing:'border-box'}}/>
     </label>
     <label style={{fontSize:14}}>{t.description}
       <textarea value={description} onChange={e=>setDescription(e.target.value)}
         maxLength={3000} rows={3}
         style={{display:'block',width:'100%',fontSize:16,padding:10,borderRadius:8,
           border:'1px solid #c5b7aa',marginTop:4,boxSizing:'border-box'}}/>
     </label>
     <details>
       <summary style={{fontSize:14,cursor:'pointer'}}>{t.show}</summary>
       <label style={{display:'block',fontSize:14,marginTop:8}}>{t.url}
         <textarea value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)}
           rows={3} spellCheck={false} placeholder="https://files2.heygen.ai/…/caption.mp4?…"
           style={{display:'block',fontSize:13,width:'100%',boxSizing:'border-box',
             border:'1px solid #c5b7aa',borderRadius:8,padding:10}}/>
       </label>
       <p style={{fontSize:12}}>{t.urlHint}</p>
     </details>
     {!apiConfigured&&!mediaUrl&&<p style={{fontSize:13,margin:0}}>{t.key}</p>}
     <label style={{fontSize:14,display:'flex',gap:8}}>
       <input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>
       <span>{t.consent}</span>
     </label>
     <label style={{fontSize:14,display:'flex',gap:8}}>
       <input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/>
       <span>{t.privacy}</span>
     </label>
     <button type="button" disabled={!canSubmit||(!apiConfigured&&!mediaUrl)}
       onClick={submit} style={{padding:13,fontSize:16,borderRadius:10,
         border:0,color:'#fff',background:'#285c59',
         opacity:canSubmit&&(apiConfigured||mediaUrl)?1:.5}}>
       {busy?'…':t.upload}
     </button>
   </div>
   {job&&<div role="status" style={{marginTop:12,borderTop:'1px solid #d1c6ba',paddingTop:10}}>
     <strong>{job.state==='uploaded'?t.done:job.state==='uncertain'?t.uncertain:
       job.state==='failed'?t.failed:t.pending}</strong>
     <p style={{fontSize:13,margin:'6px 0'}}>Status: {job.state}
       {job.error?' · '+job.error:''}</p>
     {job.youtubeVideoId&&<p style={{fontSize:13}}>
       <a target="_blank" rel="noopener noreferrer"
         href={'https://www.youtube.com/watch?v='+job.youtubeVideoId}>{t.link}</a>
     </p>}
     <button type="button" disabled={busy} onClick={()=>refresh(Boolean(job.youtubeVideoId))}
       style={{padding:8,borderRadius:8,fontSize:14}}>
       {job.youtubeVideoId?t.verify:t.check}
     </button>
   </div>}
   {error&&<p role="alert" style={{color:'#a22929',fontSize:13}}>{t.error}: {error}</p>}
 </section>
}
