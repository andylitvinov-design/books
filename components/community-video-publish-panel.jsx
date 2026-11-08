'use client'
import {useCallback,useEffect,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'

const policy='hh-community-youtube-v2'
const copy={
 en:{title:'Publish this video',intro:'Submit this finished MP4 for review on the separate Holistic House community YouTube channel.',
  off:'Community YouTube requests are not enabled yet. Download and private Telegram delivery remain separate.',
  titleLabel:'Video title',description:'Video description',author:'Public author name',language:'Original audio language',
  visibility:'Who may discover it on Holistic House?',link:'YouTube link only — do not display in public MyTube',
  catalog:'Also show in public MyTube and my author materials',warning:'Unlisted is not private: anyone with the URL can forward it. MyTube makes the link publicly discoverable.',
  synthetic:'Realistic AI-generated / altered content?',kids:'Is this made for children?',choose:'Select…',yes:'Yes',no:'No',
  rights:'I own or have publishing rights to the images, music, voices and video.',
  privacy:'The FINAL MP4 does not reveal private client details, psychological requests or another person’s personal data.',
  youtube:'I explicitly authorize uploading THIS finalized MP4 to the separate shared Holistic House YouTube channel.',
  catalogConsent:'I separately authorize listing this video and author profile publicly on Holistic House.',
  review:'Review exact YouTube description',confirmMetadata:'I have reviewed and approve the exact title, author name and complete description shown below.',
  submit:'Submit for owner review',sending:'Sending request…',withdraw:'Withdraw permission / request YouTube takedown',
  withdrawn:'The site link is hidden. YouTube access may remain until Google confirms removal.',
  requested:'Request submitted. No YouTube upload occurs before moderator review.',
  pending:'Awaiting owner moderation',approved:'Approved; awaiting owner upload',processing:'Google upload/verification in progress',
  published:'Published on YouTube (Unlisted)',rejected:'Not approved',external:'YouTube takedown pending',
  error:'Action unavailable. Your video remains private. No automatic YouTube upload happened.',
  approvedDescription:'Exact proposed YouTube description',authorMaterials:'Author materials',open:'Open on YouTube',status:'Publication status'},
 ru:{title:'Опубликовать ролик',intro:'Отправьте готовый MP4 на проверку для отдельного общего YouTube-канала Holistic House.',
  off:'Приём заявок на общий YouTube пока выключен. Скачивание и личная отправка в Telegram независимы.',
  titleLabel:'Название видео',description:'Описание видео',author:'Публичное имя автора',language:'Язык аудиодорожки',
  visibility:'Где показывать видео на Holistic House?',link:'Только YouTube по ссылке — не показывать в MyTube',
  catalog:'Также показывать публично в MyTube и моих материалах',warning:'«По ссылке» не означает приватность: ссылку можно переслать. MyTube делает видео общедоступным для поиска.',
  synthetic:'Есть реалистичный контент, созданный или изменённый ИИ?',kids:'Это видео специально для детей?',choose:'Выберите…',yes:'Да',no:'Нет',
  rights:'У меня есть права на изображения, музыку, голоса и видео для этой публикации.',
  privacy:'В ГОТОВОМ MP4 нет приватных данных клиентов, психологических запросов или чужих персональных сведений.',
  youtube:'Я отдельно разрешаю загрузку ЭТОГО готового MP4 на новый общий YouTube-канал Holistic House.',
  catalogConsent:'Отдельно разрешаю открытую карточку видео и страницу автора на Holistic House.',
  review:'Проверить точное описание YouTube',confirmMetadata:'Я прочитал(а) и утверждаю показанное название, автора и полный текст описания.',
  submit:'Отправить владельцу на проверку',sending:'Отправляем заявку…',withdraw:'Отозвать согласие / запросить снятие с YouTube',
  withdrawn:'Ссылка скрыта на сайте. На YouTube доступ может сохраняться до подтверждения Google.',
  requested:'Заявка создана. YouTube-публикация начнётся только после проверки владельцем.',
  pending:'На модерации',approved:'Одобрено; ожидает загрузки',processing:'Загрузка или проверка Google',
  published:'Опубликовано на YouTube (по ссылке)',rejected:'Отклонено',external:'Снятие с YouTube ещё не подтверждено',
  error:'Операция недоступна. Ролик остался приватным; автоматической загрузки на YouTube нет.',
  approvedDescription:'Полное предлагаемое описание YouTube',authorMaterials:'Материалы автора',open:'Открыть на YouTube',status:'Состояние публикации'},
 es:{title:'Publicar este vídeo',intro:'Envía el MP4 final para revisión en el nuevo canal comunitario de YouTube de Holistic House.',
  off:'Todavía no se reciben solicitudes de YouTube comunitario. La descarga y Telegram privado son independientes.',
  titleLabel:'Título del vídeo',description:'Descripción del vídeo',author:'Nombre público del autor',language:'Idioma del audio',
  visibility:'¿Dónde se descubrirá en Holistic House?',link:'Solo enlace de YouTube — no mostrar en MyTube público',
  catalog:'Mostrar también en MyTube público y mis materiales',warning:'No listado no es privado: cualquiera puede compartir el enlace. MyTube lo hace públicamente localizable.',
  synthetic:'¿Contenido realista creado o modificado con IA?',kids:'¿Creado específicamente para niños?',choose:'Selecciona…',yes:'Sí',no:'No',
  rights:'Tengo derechos de publicación sobre imágenes, música, voces y vídeo.',
  privacy:'El MP4 FINAL no expone clientes, consultas psicológicas ni datos personales ajenos.',
  youtube:'Autorizo expresamente subir ESTE MP4 final al canal comunitario independiente de Holistic House.',
  catalogConsent:'Autorizo separadamente mostrar vídeo y perfil públicamente en Holistic House.',
  review:'Revisar descripción completa de YouTube',confirmMetadata:'He revisado y apruebo el título, autor y descripción completa mostrados.',
  submit:'Enviar para revisión',sending:'Enviando solicitud…',withdraw:'Retirar consentimiento / pedir retirada de YouTube',
  withdrawn:'Enlace oculto en la web. YouTube puede seguir accesible hasta confirmación de Google.',
  requested:'Solicitud recibida. No se sube a YouTube antes de la revisión del propietario.',
  pending:'Pendiente de moderación',approved:'Aprobado, pendiente de subida',processing:'Subida o verificación de Google',
  published:'Publicado en YouTube (no listado)',rejected:'Rechazado',external:'Retirada de YouTube pendiente',
  error:'Acción no disponible. El vídeo sigue privado; no hubo subida automática a YouTube.',
  approvedDescription:'Descripción exacta de YouTube',authorMaterials:'Materiales del autor',open:'Abrir en YouTube',status:'Estado de publicación'}
}
const fieldStyle={display:'block',margin:'10px 0',fontSize:14}
const inputStyle={display:'block',width:'100%',minHeight:44,marginTop:4,fontSize:16,padding:8,boxSizing:'border-box',borderRadius:8}
export default function CommunityVideoPublishPanel({videoId,locale='en',accountId=null}){
 const t=copy[locale]||copy.en
 const [enabled,setEnabled]=useState(false),[loading,setLoading]=useState(true)
 const [publication,setPublication]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [title,setTitle]=useState(''),[description,setDescription]=useState('')
 const [author,setAuthor]=useState(''),[language,setLanguage]=useState(['en','ru','es'].includes(locale)?locale:'en')
 const [visibility,setVisibility]=useState('link_only'),[synthetic,setSynthetic]=useState('')
 const [kids,setKids]=useState(''),[rights,setRights]=useState(false),[privacy,setPrivacy]=useState(false)
 const [youtube,setYoutube]=useState(false),[catalog,setCatalog]=useState(false)
 const [preview,setPreview]=useState(null),[metadataApproved,setMetadataApproved]=useState(false)
 const refresh=useCallback(async()=>{
  try{
   const result=await appFetch('personal-videos/'+videoId+'/youtube',undefined,'GET',{accountId})
   setEnabled(result.enabled===true);setPublication(result.publication||null)
  }catch{setEnabled(false)}finally{setLoading(false)}
 },[accountId,videoId])
 useEffect(()=>{void refresh()},[refresh])
 const invalidate=()=>{setPreview(null);setMetadataApproved(false);setError('')}
 const intent=()=>({title,description,authorDisplayName:author,audioLanguage:language,visibility,
  rightsConfirmed:rights,privacyReviewed:privacy,publishToSharedYoutubeConfirmed:youtube,
  siteCatalogConsent:visibility==='public_catalog'&&catalog,
  containsRealisticSyntheticMedia:synthetic==='yes',madeForKidsDecision:kids})
 async function doPreview(){
  if(busy)return
  setBusy(true);setError('')
  try{
   const r=await appFetch('personal-videos/'+videoId+'/youtube',{action:'preview',...intent()},'POST',{accountId})
   setPreview(r.preview);setMetadataApproved(false)
  }catch{setPreview(null);setError(t.error)}finally{setBusy(false)}
 }
 async function submit(){
  if(!preview||!metadataApproved||busy)return
  setBusy(true);setError('')
  try{
   const r=await appFetch('personal-videos/'+videoId+'/youtube',{
    action:'request',...intent(),approvedFinalMetadataHash:preview.metadataHash,consentPolicyVersion:policy
   },'POST',{accountId})
   setPublication(r.publication);setPreview(null)
   await refresh()
  }catch{setError(t.error)}finally{setBusy(false)}
 }
 async function withdraw(){
  if(busy)return
  setBusy(true);setError('')
  try{const r=await appFetch('personal-videos/'+videoId+'/youtube',undefined,'DELETE',{accountId})
   setPublication(r.publication)}catch{setError(t.error)}finally{setBusy(false)}
 }
 const checkbox=(key,label,value,change)=><label key={key} style={{...fieldStyle,display:'flex',gap:9,alignItems:'start'}}>
  <input type="checkbox" checked={value} onChange={e=>{change(e.target.checked);invalidate()}}
   style={{width:22,height:22,flexShrink:0}}/><span>{label}</span></label>
 const choicesReady=rights&&privacy&&youtube&&(visibility!=='public_catalog'||catalog)&&synthetic&&kids&&title.trim()&&author.trim()
 if(loading)return null
 if(!enabled&&!publication)return <p style={{fontSize:13,marginTop:8}}>{t.off}</p>
 return <section data-community-video-publishing aria-label={t.title}
  style={{border:'1px solid #aac0b8',borderRadius:12,padding:12,marginTop:12,minWidth:0}}>
  <strong>{t.title}</strong>
  {publication?<div>
   <p><strong>{t.status}:</strong> {publication.takedownPending?t.external:
    publication.moderationState==='withdrawn'?t.withdrawn:publication.moderationState==='rejected'?t.rejected:
    publication.providerState==='processed'?t.published:publication.moderationState==='approved'?t.approved:
    publication.providerState==='none'?t.pending:t.processing}</p>
   {publication.youtubeUrl?<p><a href={publication.youtubeUrl} target="_blank" rel="noopener noreferrer">{t.open}</a></p>:null}
   {publication.authorProfileUrl?<p><a href={publication.authorProfileUrl}>{t.authorMaterials}</a></p>:null}
   {publication.moderationState!=='withdrawn'&&<button type="button" disabled={busy} onClick={()=>void withdraw()}
    style={{minHeight:44}}>{t.withdraw}</button>}
   {publication.takedownPending&&<p role="status">{t.withdrawn}</p>}
  </div>:enabled?<div>
   <p style={{fontSize:13}}>{t.intro}</p><p style={{fontSize:13}}>{t.warning}</p>
   <label style={fieldStyle}>{t.titleLabel}<input style={inputStyle} maxLength={100} value={title}
    onChange={e=>{setTitle(e.target.value);invalidate()}}/></label>
   <label style={fieldStyle}>{t.description}<textarea style={inputStyle} maxLength={4200} rows={3} value={description}
    onChange={e=>{setDescription(e.target.value);invalidate()}}/></label>
   <label style={fieldStyle}>{t.author}<input style={inputStyle} maxLength={100} value={author}
    onChange={e=>{setAuthor(e.target.value);invalidate()}}/></label>
   <label style={fieldStyle}>{t.language}<select style={inputStyle} value={language}
    onChange={e=>{setLanguage(e.target.value);invalidate()}}><option value="en">English</option>
    <option value="ru">Русский</option><option value="es">Español</option></select></label>
   <label style={fieldStyle}>{t.visibility}<select style={inputStyle} value={visibility}
    onChange={e=>{setVisibility(e.target.value);setCatalog(false);invalidate()}}>
    <option value="link_only">{t.link}</option><option value="public_catalog">{t.catalog}</option></select></label>
   <label style={fieldStyle}>{t.synthetic}<select style={inputStyle} value={synthetic}
    onChange={e=>{setSynthetic(e.target.value);invalidate()}}>
    <option value="">{t.choose}</option><option value="yes">{t.yes}</option><option value="no">{t.no}</option></select></label>
   <label style={fieldStyle}>{t.kids}<select style={inputStyle} value={kids}
    onChange={e=>{setKids(e.target.value);invalidate()}}>
    <option value="">{t.choose}</option><option value="yes">{t.yes}</option><option value="no">{t.no}</option></select></label>
   {checkbox('rights',t.rights,rights,setRights)}
   {checkbox('privacy',t.privacy,privacy,setPrivacy)}
   {checkbox('youtube',t.youtube,youtube,setYoutube)}
   {visibility==='public_catalog'&&checkbox('catalog',t.catalogConsent,catalog,setCatalog)}
   <button type="button" disabled={busy||!choicesReady} onClick={()=>void doPreview()}
    style={{minHeight:44,width:'100%'}}>{t.review}</button>
   {preview?<section style={{overflowWrap:'anywhere',marginTop:12}}>
    <strong>{t.approvedDescription}</strong>
    <p>{preview.title}</p><pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:14}}>{preview.description}</pre>
    <label style={{display:'flex',gap:8,alignItems:'start'}}>
     <input type="checkbox" checked={metadataApproved} style={{width:22,height:22}}
      onChange={e=>setMetadataApproved(e.target.checked)}/>{t.confirmMetadata}</label>
    <button type="button" disabled={busy||!metadataApproved} onClick={()=>void submit()}
     style={{minHeight:44,width:'100%',marginTop:10}}>{busy?t.sending:t.submit}</button>
   </section>:null}
  </div>:<p>{t.off}</p>}
  {error&&<p role="alert" style={{fontSize:13}}>{error}</p>}
 </section>
}
