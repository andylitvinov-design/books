'use client'
import {useCallback,useEffect,useState} from 'react'
const COPY={
 ru:{title:'Из кабинетов мастеров → мой YouTube',note:'Видео уходят на русский @shamanic_academy только после вашего согласия. Готовые материалы клиентов не попадают в очередь.',refresh:'Обновить',loading:'Проверяю…',notConnected:'Подключите русский YouTube через ссылку выше.',owner:'Мои готовые видео',master:'Предложено другими мастерами',empty:'Пока нет видео, разрешённых для этой очереди.',preview:'Просмотреть',hide:'Скрыть',rights:'Права на публикацию подтверждены.',privacy:'Полностью просмотрено. Нет сведений о здоровье, клиентов и частных записей.',approve:'Одобрить и отправить на YouTube',decline:'Отклонить',verify:'Проверить YouTube ID (без загрузки)',titleLabel:'Название в YouTube',status:'Статус',error:'Не удалось выполнить действие. Повторите.',queued:'Принято. Сервер отправляет видео и затем проверяет YouTube.',readOnly:'Проверяем уже отправленное видео.',connected:'Подключён русский YouTube',unlisted:'Видимость: только по ссылке (Unlisted)',notice:'Ни один чужой файл не отправляется автоматически сразу после загрузки мастером.',state:{requested:'Ждёт вашего решения',approved:'Одобрено · ожидает отправки',publishing:'Передаётся в YouTube',uncertain:'YouTube проверяет · повторная загрузка заблокирована',uploaded:'Обработано · по ссылке',declined:'Отклонено'}},
 en:{title:'Practitioner videos → my YouTube',note:'Upload to @shamanic_academy only after your approval. Private client files are excluded.',refresh:'Refresh',loading:'Loading…',notConnected:'Connect Russian YouTube using the link above.',owner:'My finished videos',master:'Offered by practitioners',empty:'No eligible videos yet.',preview:'Review video',hide:'Hide',rights:'I confirm the publication rights.',privacy:'I reviewed the full video. No client, health or private content.',approve:'Approve and upload to YouTube',decline:'Decline',verify:'Check existing YouTube ID (no upload)',titleLabel:'YouTube title',status:'Status',error:'Could not complete the action.',queued:'Accepted. The server is uploading and verifying YouTube.',readOnly:'Checking the already-uploaded video.',connected:'Russian YouTube connected',unlisted:'Visibility: Unlisted',notice:'Another practitioner’s upload never auto-publishes without your approval.',state:{requested:'Waiting for owner approval',approved:'Approved · awaiting upload',publishing:'Uploading',uncertain:'YouTube processing · no duplicate uploads',uploaded:'Processed · Unlisted',declined:'Declined'}},
 es:{title:'Vídeos de terapeutas → mi YouTube',note:'Publicación en @shamanic_academy solo con tu aprobación. Excluye archivos privados.',refresh:'Actualizar',loading:'Cargando…',notConnected:'Conecta el canal ruso de YouTube arriba.',owner:'Mis vídeos',master:'Ofrecidos por terapeutas',empty:'No hay vídeos elegibles.',preview:'Ver vídeo',hide:'Ocultar',rights:'Confirmo los derechos de publicación.',privacy:'He revisado todo el vídeo. Sin datos privados, médicos o de clientes.',approve:'Aprobar y subir a YouTube',decline:'Rechazar',verify:'Verificar ID sin subir',titleLabel:'Título',status:'Estado',error:'No se pudo completar la acción.',queued:'Aceptado. El servidor enviará y verificará.',readOnly:'Verificando el vídeo existente.',connected:'YouTube ruso conectado',unlisted:'Visibilidad: No listado',notice:'Ningún vídeo externo se publica sin la aprobación del propietario.',state:{requested:'Pendiente',approved:'Aprobado',publishing:'Subiendo',uncertain:'Procesando; sin reenvío',uploaded:'Procesado',declined:'Rechazado'}}
}
async function api(body){
 const response=await fetch('/api/admin/youtube-publications',{
   method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
   ...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})
 })
 const value=await response.json().catch(()=>({}))
 if(!response.ok)throw Error(value.error||'PUBLICATION_UNAVAILABLE')
 return value
}
export default function AdminYoutubePublications({locale='en'}){
 const t=COPY[locale]||COPY.en
 const [data,setData]=useState(null)
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState('')
 const [open,setOpen]=useState(''),[rights,setRights]=useState({}),[privacy,setPrivacy]=useState({})
 const [titles,setTitles]=useState({}),[error,setError]=useState(''),[feedback,setFeedback]=useState('')
 const refresh=useCallback(async()=>{
   try{const result=await api();setData(result);setError('')}
   catch{setError(t.error)}finally{setLoading(false)}
 },[t.error])
 useEffect(()=>{void refresh()},[refresh])
 async function act(key,body){
   if(busy)return
   setBusy(key);setError('');setFeedback('')
   try{
     const response=await api(body)
     setFeedback(response.readOnly?t.readOnly:body.action==='decline'?'':t.queued)
     await refresh()
   }catch{setError(t.error)}
   finally{setBusy('')}
 }
 const requests=data?.requests||[]
 const ownerMaterials=(data?.materials||[]).map(m=>({
   ...m,request:requests.find(r=>r.sourceType==='owner_material'&&r.sourceId===m.id)||null
 }))
 const thirdParty=requests.filter(r=>r.sourceType==='practitioner_presentation'&&r.state!=='declined')
 function renderItem(item,source){
   const owner=source==='owner'
   const id=owner?item.id:item.id
   const req=owner?item.request:item
   const name=owner?item.title:item.title
   const state=req?.state||null
   const eligible=!state||(state==='requested'&&!owner)
   const consent=rights[id]&&privacy[id]
   const videoUrl=owner?'/api/admin/materials/'+id+'/media':
     '/api/admin/youtube-publications/'+id+'/preview'
   return <article key={source+id} data-youtube-publication-entry style={{
     padding:12,border:'1px solid #dccbb3',background:'#fff',borderRadius:11,
     display:'grid',gap:9,minWidth:0}}>
     <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
       <strong style={{color:'#4e3c2d',overflowWrap:'anywhere',flex:'1 1 160px'}}>{name}</strong>
       <span style={{fontSize:12,color:'#68584a'}}>{state?t.state[state]||state:t.unlisted}
         {' · '}{((owner?item.bytes:item.bytes)/1e6).toFixed(1)} MB</span>
     </div>
     <button type="button" onClick={()=>setOpen(open===source+id?'':source+id)}
       style={{justifySelf:'start',border:'1px solid #b8a58c',background:'#f8f2e7',
         borderRadius:8,padding:'6px 10px'}}>{open===source+id?t.hide:t.preview}</button>
     {open===source+id&&<video controls playsInline preload="metadata" src={videoUrl}
       style={{width:'100%',maxHeight:320,borderRadius:9,background:'#211d19'}}/>}
     {state==='uploaded'&&req.videoId&&<a target="_blank" rel="noopener noreferrer"
       href={'https://www.youtube.com/watch?v='+req.videoId} style={{color:'#225a4e'}}>
       {t.state.uploaded} · YouTube
     </a>}
     {state==='uncertain'&&req.videoId&&<button type="button" disabled={!!busy}
       onClick={()=>act(id,{action:'verify',id:req.id})}
       style={{border:'1px solid #8d7a63',borderRadius:9,padding:'8px 10px',background:'#fff'}}>{t.verify}</button>}
     {eligible&&<>
       {owner&&<label style={{display:'grid',gap:4,fontSize:13}}>
         {t.titleLabel}<input value={titles[id]??name} maxLength={100}
           onChange={e=>setTitles(old=>({...old,[id]:e.target.value}))}
           style={{padding:8,borderRadius:7,border:'1px solid #c9b9a4',width:'100%',boxSizing:'border-box'}}/>
       </label>}
       <label style={{display:'flex',gap:8,fontSize:13,alignItems:'flex-start'}}>
         <input type="checkbox" checked={!!rights[id]}
           onChange={e=>setRights(old=>({...old,[id]:e.target.checked}))}/>{t.rights}
       </label>
       <label style={{display:'flex',gap:8,fontSize:13,alignItems:'flex-start'}}>
         <input type="checkbox" checked={!!privacy[id]}
           onChange={e=>setPrivacy(old=>({...old,[id]:e.target.checked}))}/>{t.privacy}
       </label>
       <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
         <button type="button" disabled={!data?.connected||!consent||!!busy||
           (owner&&!(titles[id]??name).trim())}
           onClick={()=>act(id,owner?{action:'approve',sourceType:'owner_material',sourceId:id,
             title:titles[id]??name,rightsConfirmed:true,privacyConfirmed:true}:
             {action:'approve',requestId:id,rightsConfirmed:true,privacyConfirmed:true})}
           style={{background:'#4b6455',color:'#fff',border:0,padding:'10px 12px',
             borderRadius:9,fontWeight:700}}>{t.approve}</button>
         {!owner&&<button type="button" disabled={!!busy} onClick={()=>act(id,{action:'decline',id})}
           style={{border:'1px solid #c5b6a2',padding:'9px 12px',background:'#fff',
             borderRadius:9}}>{t.decline}</button>}
       </div>
     </>}
   </article>
 }
 return <section data-owner-youtube-publications aria-label={t.title} style={{
   border:'1px solid #cdbb9c',borderRadius:14,background:'#f9f2e6',
   padding:12,margin:'12px 0',display:'grid',gap:11,maxWidth:'100%'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',flexWrap:'wrap'}}>
     <h2 style={{margin:0,fontSize:18,color:'#493d30'}}>{t.title}</h2>
     <button type="button" onClick={()=>{setLoading(true);void refresh()}} disabled={loading||!!busy}
       style={{padding:'6px 10px',border:'1px solid #b7a487',borderRadius:8,
         background:'#fff'}}>{t.refresh}</button>
   </div>
   <p style={{fontSize:13,margin:0,color:'#6a5a49'}}>{t.note}</p>
   {loading?<p role="status">{t.loading}</p>:!data?.connected?<p role="status">{t.notConnected}</p>:
     <p role="status" style={{color:'#356152',margin:0}}>✓ {t.connected} · {t.unlisted}</p>}
   <h3 style={{fontSize:14,margin:0}}>{t.owner}</h3>
   {ownerMaterials.length?ownerMaterials.map(row=>renderItem(row,'owner')):<p style={{fontSize:13,margin:0}}>{t.empty}</p>}
   <h3 style={{fontSize:14,margin:0}}>{t.master}</h3>
   {thirdParty.length?thirdParty.map(row=>renderItem(row,'master')):<p style={{fontSize:13,margin:0}}>{t.empty}</p>}
   {error&&<p role="alert" style={{color:'#a04338',margin:0}}>{error}</p>}
   {feedback&&<p role="status" style={{color:'#38674f',margin:0}}>{feedback}</p>}
   <small style={{color:'#776550'}}>{t.notice}</small>
 </section>
}
