'use client'
import {useCallback,useEffect,useState} from 'react'

const copy={
 ru:{title:'Общий YouTube · видео участников',off:'Миграция или приём заявок не включены.',channel:'Общий канал',connect:'Подключить отдельный канал (OAuth)',connected:'Подключён',unconnected:'Ожидает отдельного OAuth',
  empty:'Заявок пока нет.',refresh:'Обновить',inspect:'Проверить MP4 и контрольную сумму',
  preview:'Посмотреть готовый MP4',rights:'Права подтверждены',privacy:'Приватность проверена',consent:'YouTube разрешён',catalog:'Каталог',
  review:'Лично просмотрел(а) ЭТОТ финальный MP4, проверил(а) права и маркировку',watermark:'Логотип Free виден в реальном MP4',
  attest:'Подтвердить проверку готового ролика',approve:'Одобрить',reject:'Отклонить',
  start:'Начать единственную загрузку',resume:'Проверить/продолжить прежнюю сессию',verify:'Сверить YouTube videos.list',
  hide:'Скрыть карточку на сайте',takedown:'Запросить снятие с YouTube',
  warn:'Google может уже хранить ролик, даже если загрузка прервалась. Повторную новую загрузку создавать нельзя.',
  error:'Действие не завершено. Проверяйте статус заявки; повторный Google upload не создавайте.',
  notes:'Заявка, проверка Google, согласие на каталог и снятие — независимые статусы.',none:'Не проверено',
  status:'Состояние',variant:'Вариант MP4'},
 en:{title:'Community YouTube · member videos',off:'Migration or request intake is not enabled.',channel:'Shared channel',connect:'Connect separate channel (OAuth)',connected:'Connected',unconnected:'Needs separate OAuth',
  empty:'No publication requests yet.',refresh:'Refresh',inspect:'Inspect final MP4 and checksum',
  preview:'View actual finished MP4',rights:'Rights confirmed',privacy:'Privacy reviewed',consent:'YouTube approved',catalog:'Catalog consent',
  review:'I personally reviewed THIS exact final MP4, content rights and branding',watermark:'Free watermark is visible on the actual MP4',
  attest:'Record final video review',approve:'Approve',reject:'Reject',
  start:'Start sole upload attempt',resume:'Check/resume existing session',verify:'Verify YouTube videos.list',
  hide:'Hide website card',takedown:'Request YouTube takedown',
  warn:'Google may already have the video after an interrupted upload. Never start a second new upload.',
  error:'Action not confirmed. Check the request state; do not recreate a Google upload.',
  notes:'Request, Google readback, public catalog consent and external takedown are separate states.',none:'Not verified',
  status:'State',variant:'MP4 variant'}
}
function cardStatus(p){return `${p.moderationState} / ${p.providerState}${p.takedownPending?' / takedown pending':''}`}
export default function CommunityYoutubeAdmin({locale='en'}){
 const t=copy[locale]||copy.en
 const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState('')
 const [inspection,setInspection]=useState({}),[reviewed,setReviewed]=useState({}),[mark,setMark]=useState({}),[variant,setVariant]=useState({})
 const refresh=useCallback(async()=>{
  try{const response=await fetch('/api/admin/community-youtube',{credentials:'same-origin',cache:'no-store'})
   if(!response.ok)throw Error('UNAVAILABLE')
   setState(await response.json());setError('')
  }catch{setError(t.error)}
 },[t.error])
 useEffect(()=>{void refresh()},[refresh])
 async function action(id,verb,extra={}){
  if(busy)return
  setBusy(id+verb);setError('')
  try{
   const response=await fetch('/api/admin/community-youtube',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},body:JSON.stringify({action:verb,id,...extra})})
   const data=await response.json().catch(()=>null)
   if(!response.ok||data?.error)throw Error('UNAVAILABLE')
   if(verb==='inspect')setInspection(old=>({...old,[id]:data}))
   await refresh()
  }catch{setError(t.error)}finally{setBusy('')}
 }
 if(!state&&!error)return null
 return <section data-community-youtube-admin style={{margin:'18px 0',border:'1px solid #b8c8bf',padding:14,borderRadius:12}}>
  <h2 style={{margin:'0 0 7px'}}>{t.title}</h2><p>{t.notes}</p>
  {state?.flags?.channelId?<p><strong>{t.channel}: </strong><code>{state.flags.channelId}</code> ·
   {state.connected?t.connected:t.unconnected}</p>:<p>{t.unconnected}</p>}
  {state?.flags?.schemaReady&&<p><a href="/api/admin/community-youtube/oauth/start">
   {t.connect}</a> — {state.connected?t.connected:t.unconnected}</p>}
  {!state?.flags?.requestsEnabled&&<p role="status">{t.off}</p>}
  <button type="button" onClick={()=>void refresh()} style={{minHeight:44}}>{t.refresh}</button>
  {error&&<p role="alert">{error}</p>}
  {!state?.publications?.length&&<p>{t.empty}</p>}
  <div style={{display:'grid',gap:16,marginTop:12}}>
   {(state?.publications||[]).map(p=><article key={p.id}
    style={{border:'1px solid #ccd9d0',borderRadius:12,padding:12,minWidth:0,overflowWrap:'anywhere'}}>
    <h3>{p.title}</h3><p>{p.authorDisplayName} · {p.audioLanguage} · {p.visibility}</p>
    <p><strong>{t.status}: </strong>{cardStatus(p)}</p>
    <p><strong>{t.variant}: </strong>{p.brandingVariant||t.none}</p>
    <p><small>{p.rightsConfirmed?t.rights:'Rights missing'} · {p.privacyReviewed?t.privacy:'Privacy missing'} ·
     {p.youtubeConsent?t.consent:'Consent missing'} · {p.catalogConsent?t.catalog:'No catalog consent'}</small></p>
    <details><summary>Exact author-approved YouTube description</summary>
     <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:13}}>{p.description}</pre></details>
    <p><a href={p.authorProfileUrl} target="_blank" rel="noopener noreferrer">{p.authorDisplayName}</a></p>
    {p.youtubeVideoId&&<p><a href={'https://www.youtube.com/watch?v='+p.youtubeVideoId}
     target="_blank" rel="noopener noreferrer">YouTube ID {p.youtubeVideoId}</a> ·
     {p.youtubeConfirmedAt?'Readback recorded':'Not yet processed'}</p>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     <button disabled={!!busy} onClick={()=>void action(p.id,'inspect')}>{t.inspect}</button>
     <button disabled={!!busy} onClick={()=>void action(p.id,'verify')}>{t.verify}</button>
     <button disabled={!!busy} onClick={()=>void action(p.id,'hide')}>{t.hide}</button>
     <button disabled={!!busy} onClick={()=>void action(p.id,'requestTakedown')}>{t.takedown}</button>
    </div>
    {inspection[p.id]&&<section>
     <p><strong>SHA-256: </strong><code style={{overflowWrap:'anywhere'}}>{inspection[p.id].sha256}</code></p>
     <video controls playsInline preload="metadata" style={{width:'100%',maxWidth:440,maxHeight:290}}
      src={inspection[p.id].previewUrl} aria-label={t.preview}/>
     <label style={{display:'block',marginTop:12}}>{t.variant}
      <select style={{display:'block',minHeight:44}} value={variant[p.id]||'free_watermarked'}
       onChange={e=>setVariant(v=>({...v,[p.id]:e.target.value}))}>
       <option value="free_watermarked">Free · visible Holistic House mark</option>
       <option value="pro_clear">PRO · no watermark, server entitlement required</option>
      </select></label>
     <label style={{display:'flex',gap:8,marginTop:12}}><input type="checkbox" checked={!!reviewed[p.id]}
      onChange={e=>setReviewed(v=>({...v,[p.id]:e.target.checked}))}/>{t.review}</label>
     <label style={{display:'flex',gap:8,marginTop:8}}><input type="checkbox" checked={!!mark[p.id]}
      onChange={e=>setMark(v=>({...v,[p.id]:e.target.checked}))}/>{t.watermark}</label>
     <button disabled={!!busy||!reviewed[p.id]||((variant[p.id]||'free_watermarked')==='free_watermarked'&&!mark[p.id])}
      style={{minHeight:44,marginTop:10}}
      onClick={()=>void action(p.id,'attest',{variant:variant[p.id]||'free_watermarked',sha256:inspection[p.id].sha256,
       confirmReviewedFinalMp4:true,confirmBrandStamp:!!mark[p.id]})}>{t.attest}</button>
    </section>}
    {p.moderationState==='pending'&&<div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
     <button disabled={!!busy||p.brandingVariant==='not_verified'} onClick={()=>void action(p.id,'approve')}>{t.approve}</button>
     <button disabled={!!busy} onClick={()=>void action(p.id,'reject')}>{t.reject}</button>
    </div>}
    {p.moderationState==='approved'&&p.providerState==='none'&&<button
     style={{minHeight:44,marginTop:10}} disabled={!!busy||!state.flags.uploadsEnabled||!state.connected}
     onClick={()=>void action(p.id,'start')}>{t.start}</button>}
    {['uncertain','sending'].includes(p.providerState)&&<button style={{minHeight:44,marginTop:10}}
     disabled={!!busy||!state.flags.uploadsEnabled} onClick={()=>void action(p.id,'resume')}>{t.resume}</button>}
    {['claimed','sending','uncertain'].includes(p.providerState)&&<p style={{fontSize:13}}>{t.warn}</p>}
   </article>)}
  </div>
 </section>
}
