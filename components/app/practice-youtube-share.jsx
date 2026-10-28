'use client'
import {useEffect,useState} from 'react'
const COPY={
 en:{title:'Share on Holistic House YouTube',hint:'Optional: offer this promotional video to the platform owner for review and Unlisted upload to the Russian YouTube channel. Your own YouTube connection is not required.',name:'Video title',rights:'I created this video or hold permission to license its publication on Holistic House YouTube.',privacy:'This video contains no private client recordings, personal health data, or third-party content without consent.',send:'Offer video for review',withdraw:'Withdraw request',waiting:'Awaiting owner review; this is not a YouTube upload.',approved:'Owner approved; upload will be attempted without a new Google login.',uploaded:'Verified on Holistic House YouTube',pending:'YouTube processing is being checked. No new upload will be started.',declined:'This video cannot be resubmitted; upload a new video if required.',error:'Could not save this request. Retry.',notice:'Nothing is sent to the owner’s YouTube without their explicit approval.'},
 ru:{title:'Предложить видео для YouTube Holistic House',hint:'Добровольно: отправьте презентацию владельцу на проверку и загрузку на русский YouTube «По ссылке». Собственный YouTube-аккаунт подключать не нужно.',name:'Название видео',rights:'У меня есть права и разрешения на публикацию этого видео на YouTube Holistic House.',privacy:'Здесь нет приватных записей клиентов, медицинских данных или чужих материалов без согласия.',send:'Предложить видео владельцу',withdraw:'Отозвать заявку',waiting:'Ожидает решения владельца; YouTube пока не затронут.',approved:'Владелец одобрил; видео будет отправлено без повторного Google-входа.',uploaded:'Проверено на YouTube Holistic House',pending:'YouTube проверяет обработку; повторная загрузка запрещена.',declined:'Повторная отправка этого файла запрещена. При необходимости загрузите новую версию.',error:'Не удалось сохранить запрос. Повторите.',notice:'Видеофайл не уйдёт в YouTube без отдельного решения владельца.'},
 es:{title:'Proponer vídeo para YouTube Holistic House',hint:'Opcional: ofrece tu presentación al propietario para revisión y publicación como No listado en el YouTube ruso.',name:'Título',rights:'Soy autor o tengo autorización para publicar este vídeo en YouTube Holistic House.',privacy:'No contiene grabaciones privadas de clientes, datos médicos o contenido ajeno sin permiso.',send:'Enviar para revisión',withdraw:'Retirar solicitud',waiting:'Pendiente de revisión; sin publicación.',approved:'Aprobado por el propietario; sin nueva autorización de Google.',uploaded:'Verificado en YouTube Holistic House',pending:'YouTube está procesando el vídeo; no se repetirá la subida.',declined:'No puede volver a enviarse este archivo.',error:'No se pudo guardar. Reintenta.',notice:'No se sube nada sin la aprobación individual del propietario.'}
}
const labels={requested:'waiting',approved:'approved',publishing:'pending',uncertain:'pending',uploaded:'uploaded',declined:'declined'}
async function request(assetId,body){
 const res=await fetch('/api/app/practice/youtube/share'+(body?'':'?assetId='+encodeURIComponent(assetId)),{
   method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
   ...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})
 })
 const data=await res.json().catch(()=>({}))
 if(!res.ok)throw Error(data.error||'YOUTUBE_SHARE_UNAVAILABLE')
 return data.request||null
}
export default function PracticeYoutubeShare({video,locale='en',initialTitle=''}){
 const t=COPY[locale]||COPY.en
 const assetId=video?.kind==='upload'?video.assetId:''
 const [title,setTitle]=useState(initialTitle||'Master video')
 const [rights,setRights]=useState(false),[privacy,setPrivacy]=useState(false)
 const [entry,setEntry]=useState(null),[busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>{
   if(!assetId){setEntry(null);return}
   let current=true
   request(assetId).then(result=>{if(current){setEntry(result);setError('')}})
     .catch(()=>{if(current)setError(t.error)})
   return()=>{current=false}
 },[assetId,t.error])
 if(!assetId)return null
 const state=entry?.state||null
 async function send(action){
   if(busy)return
   setBusy(true);setError('')
   try{setEntry(await request(assetId,action==='submit'
     ?{action:'submit',assetId,title,rightsConfirmed:rights,privacyConfirmed:privacy}
     :{action:'withdraw',assetId}))}
   catch{setError(t.error)}
   finally{setBusy(false)}
 }
 return <section data-master-youtube-share aria-label={t.title}
   style={{margin:'12px 0',padding:12,border:'1px solid #ccbda9',background:'#fffaf2',
     borderRadius:12,display:'grid',gap:9,fontSize:13,maxWidth:'100%'}}>
   <strong style={{fontSize:15,color:'#443c34'}}>{t.title}</strong>
   <p style={{margin:0,color:'#67574a',lineHeight:1.45}}>{t.hint}</p>
   {state?<div role="status" style={{display:'grid',gap:8,color:'#3f4d43'}}>
     <p style={{margin:0}}>{t[labels[state]]||t.pending}</p>
     {state==='uploaded'&&entry.videoId&&<a target="_blank" rel="noopener noreferrer"
       href={'https://www.youtube.com/watch?v='+entry.videoId}>{t.uploaded}</a>}
     {state==='requested'&&<button type="button" disabled={busy} onClick={()=>send('withdraw')}>
       {t.withdraw}</button>}
   </div>:<>
     <label style={{display:'grid',gap:4}}>{t.name}
       <input type="text" value={title} maxLength={100} onChange={e=>setTitle(e.target.value)}
         style={{width:'100%',boxSizing:'border-box',padding:8,border:'1px solid #c5b6a2',borderRadius:8}}/>
     </label>
     <label style={{display:'flex',gap:8,alignItems:'flex-start'}}>
       <input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>{t.rights}
     </label>
     <label style={{display:'flex',gap:8,alignItems:'flex-start'}}>
       <input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/>{t.privacy}
     </label>
     <button type="button" disabled={busy||!rights||!privacy||!title.trim()}
       onClick={()=>send('submit')}
       style={{padding:'10px 12px',border:0,borderRadius:9,background:'#6b553e',
         color:'white',fontWeight:700}}>{t.send}</button>
   </>}
   {error&&<p role="alert" style={{margin:0,color:'#9a332d'}}>{error}</p>}
   <small style={{color:'#705d4c'}}>{t.notice}</small>
 </section>
}
