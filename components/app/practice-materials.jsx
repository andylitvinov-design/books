'use client'
import {useEffect,useState} from 'react'
import {normalizeVideoPresentation} from '@/lib/practitioners/presentation-contract'
import PractitionerArticles from './practitioner-articles'
import PracticeReportMaterials from './practice-report-materials'
import styles from './practice-materials.module.css'

const fresh=locale=>({locale:['en','ru','es'].includes(locale)?locale:'en',title:'',description:'',url:''})
const supportedUrl=value=>{
 try{
  const url=new URL(value)
  if(url.protocol!=='https:'||url.username||url.password||url.hash)return false
  const host=url.hostname.toLowerCase()
  if(['youtu.be','youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','music.youtube.com'].includes(host))
   return Boolean((url.searchParams.get('v')||url.pathname.split('/').filter(Boolean).at(-1)||'').match(/^[a-zA-Z0-9_-]{11}$/))
  return ['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)&&/\d{6,12}/.test(url.pathname)
 }catch{return false}
}
export default function PracticeMaterials({practitioner,services=[],locale='en',busy=false,isOwner=false,onSaveVideos,onSubmitVideos,onOpenOwner}){
 const ru=locale==='ru',es=locale==='es'
 const t=ru?{
  videos:'Видео',articles:'Статьи',add:'+ Добавить видео',new:'Новое видео',edit:'Редактировать видео',
  title:'Название',url:'Ссылка YouTube / Vimeo',description:'Краткое описание',language:'Язык видео',
  addToList:'Добавить в список',update:'Обновить',cancel:'Отмена',editBtn:'Изменить',deleteBtn:'Убрать',
  published:'Опубликовано',pending:'Черновик',empty:'Вы пока не добавили видео.',
  save:'Сохранить изменения',review:'Отправить на проверку',unsaved:'Сначала сохраните изменения, затем отправьте на проверку.',
  note:'Только общедоступные образовательные видео. Скрытые ссылки YouTube доступны каждому, у кого есть URL. Не добавляйте видео клиентов.',
  moderation:'После модерации видео появятся на вашей публичной странице. Уже опубликованные материалы останутся видимыми до одобрения обновлений.',
  invalid:'Укажите корректную ссылку YouTube или Vimeo.',
 }:es?{
  videos:'Vídeos',articles:'Artículos',add:'+ Añadir vídeo',new:'Nuevo vídeo',edit:'Editar vídeo',
  title:'Título',url:'Enlace de YouTube / Vimeo',description:'Descripción breve',language:'Idioma del vídeo',
  addToList:'Añadir a la lista',update:'Actualizar',cancel:'Cancelar',editBtn:'Editar',deleteBtn:'Quitar',
  published:'Publicado',pending:'Borrador',empty:'Aún no has añadido vídeos.',
  save:'Guardar cambios',review:'Enviar a revisión',unsaved:'Guarda los cambios antes de enviarlos.',
  note:'Solo vídeos educativos para el público. Los enlaces no listados pueden compartirse. No incluyas vídeos de clientes.',
  moderation:'Los vídeos aparecerán en tu perfil público después de aprobarlos. Las versiones ya publicadas permanecerán visibles hasta la revisión.',
  invalid:'Introduce un enlace válido de YouTube o Vimeo.',
 }:{
  videos:'Videos',articles:'Articles',add:'+ Add video',new:'New video',edit:'Edit video',
  title:'Title',url:'YouTube / Vimeo link',description:'Short description',language:'Video language',
  addToList:'Add to list',update:'Update',cancel:'Cancel',editBtn:'Edit',deleteBtn:'Remove',
  published:'Published',pending:'Draft',empty:'You have not added any videos yet.',
  save:'Save changes',review:'Submit for review',unsaved:'Save your changes before submitting for review.',
  note:'Public educational videos only. Unlisted YouTube videos are accessible to anyone with the link. Never add private client videos.',
  moderation:'Your videos appear on the public profile after editorial approval. Previously published materials remain visible until changes are approved.',
  invalid:'Enter a valid YouTube or Vimeo URL.',
 }
 const [tab,setTab]=useState(()=>isOwner?'reports':'videos')
 const original=practitioner?.draftProfile?.videoMaterials||[]
 const [videos,setVideos]=useState(()=>original)
 const [editing,setEditing]=useState(null)
 const [form,setForm]=useState(()=>fresh(locale))
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false)
 const [privateItems,setPrivateItems]=useState([])
 const [privateLoading,setPrivateLoading]=useState(Boolean(isOwner))
 const [privateError,setPrivateError]=useState('')
 const [privateRevision,setPrivateRevision]=useState(0)
 const published=practitioner?.profile?.videoMaterials||[]
 const ptext=ru?{
  reports:'Для отчётов',public:'Для публичного профиля',
  intro:'Общие материалы для клиентских отчётов. Закрытые MP4 не публикуются в профиле и не отправляются клиентам автоматически.',
  empty:'В библиотеке отчётов пока нет материалов.',loading:'Загружаем библиотеку…',error:'Библиотека недоступна. Повторите попытку.',refresh:'Обновить',
  manage:'Управлять материалами',privateVideo:'Защищённое видео',photo:'Фото',
  saveVideo:'Сохранить видео в черновик',saving:'Сохраняем…',saveError:'Не удалось сохранить видео. Попробуйте ещё раз.',
 }:es?{
  reports:'Para informes',public:'Perfil público',
  intro:'Materiales para informes privados de clientes. No se publican ni se envían automáticamente.',
  empty:'Aún no hay materiales.',loading:'Cargando biblioteca…',error:'Biblioteca no disponible.',refresh:'Actualizar',
  manage:'Gestionar materiales',privateVideo:'Vídeo privado',photo:'Foto',
  saveVideo:'Guardar vídeo en borrador',saving:'Guardando…',saveError:'No se pudo guardar el vídeo.',
 }:{
  reports:'For client reports',public:'Public profile',
  intro:'Private resources for client reports. Private MP4s never appear on your public profile and nothing is sent to clients automatically.',
  empty:'No private report materials yet.',loading:'Loading private library…',error:'Could not load this library. Retry.',refresh:'Refresh',
  manage:'Manage materials',privateVideo:'Private video',photo:'Photo',
  saveVideo:'Save video draft',saving:'Saving…',saveError:'Could not save the video. Please retry.',
 }
 useEffect(()=>{
  if(!isOwner||tab!=='reports')return
  let active=true
  setPrivateLoading(true);setPrivateError('')
  fetch('/api/app/practice/report-materials',{credentials:'same-origin',cache:'no-store'})
   .then(async response=>{
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw Error(data.error||'MATERIAL_UNAVAILABLE')
      return Array.isArray(data.items)?data.items:[]
   }).then(items=>{if(active)setPrivateItems(items)})
    .catch(()=>{if(active)setPrivateError(ptext.error)})
    .finally(()=>{if(active)setPrivateLoading(false)})
  return ()=>{active=false}
 },[isOwner,tab,privateRevision])
 const dirty=JSON.stringify(videos)!==JSON.stringify(original)
 function open(index=null){
  setEditing(index===null?'new':index)
  setForm(index===null?fresh(locale):{...videos[index]})
  setError('')
 }
 async function apply(e){
  e.preventDefault()
  if(!supportedUrl(form.url)){setError(t.invalid);return}
  const normalized={title:form.title.trim(),description:form.description.trim(),url:form.url.trim(),locale:form.locale}
  const next=editing==='new'?[...videos,normalized]:videos.map((video,index)=>index===editing?normalized:video)
  if(next.length>12){setError('Maximum 12 videos');return}
  const saved=await onSaveVideos(next)
  if(saved===true){setVideos(next);setEditing(null);setError('')}
  else setError(ptext.saveError)
 }
 return <div className={styles.shell}>
  <div className={styles.tabs} role="group" aria-label={ru?'Тип материалов':'Material type'}>
   {isOwner&&<button type="button" aria-pressed={tab==='reports'} onClick={()=>setTab('reports')}>
     {ptext.reports} ({privateLoading?'…':privateError?'?':privateItems.length})</button>}
   <button type="button" aria-pressed={tab==='videos'} onClick={()=>setTab('videos')}>
     {ptext.public} ({videos.length})</button>
   <button type="button" aria-pressed={tab==='articles'} onClick={()=>setTab('articles')}>{t.articles}</button>
  </div>
  {tab==='articles'?<PractitionerArticles locale={locale} services={services}/>:
   tab==='reports'&&isOwner?<PracticeReportMaterials items={privateItems}
    loading={privateLoading} error={privateError} locale={locale}
    onRefresh={()=>setPrivateRevision(value=>value+1)}
    onManage={()=>onOpenOwner?.('materials')}/>:
  <div className={styles.body}>
   <p className={styles.intro}>{t.note}</p>
   <div className={styles.heading}>
    <h3>{t.videos}</h3>
    <button type="button" className={styles.primary} onClick={()=>open()} disabled={busy||editing!==null||videos.length>=12}>{t.add}</button>
   </div>
   {videos.length?<div className={styles.list}>{videos.map((video,index)=>{
    const live=published.some(p=>p.url===video.url&&p.title===video.title&&p.locale===video.locale&&p.description===video.description)
    return <article className={styles.card} key={index}>
     <div className={styles.cardTop}><span className={styles.tag}>{video.locale.toUpperCase()}</span><span className={styles.tag+' '+(live?styles.published:'')}>{live?t.published:t.pending}</span></div>
     <h4>{video.title}</h4>
     {video.description&&<p>{video.description}</p>}
     <div className={styles.cardActions}>
      <button type="button" disabled={busy} onClick={()=>open(index)}>{t.editBtn}</button>
      <button type="button" disabled={busy} onClick={()=>{setVideos(current=>current.filter((_,i)=>i!==index));setEditing(null)}}>{t.deleteBtn}</button>
     </div>
    </article>
   })}</div>:<p className={styles.empty}>{t.empty}</p>}
   {editing!==null&&<form className={styles.editor} onSubmit={apply}>
    <h4>{editing==='new'?t.new:t.edit}</h4>
    <label>{t.title}<input required maxLength={140} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>{t.url}<input required type="url" maxLength={500} value={form.url} placeholder="https://youtu.be/..." onChange={e=>setForm({...form,url:e.target.value})}/></label>
    <label>{t.language}<select value={form.locale} onChange={e=>setForm({...form,locale:e.target.value})}>
     <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
    </select></label>
    <label>{t.description}<textarea rows={3} maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <div className={styles.editorActions}>
     <button className={styles.primary} type="submit">{editing==='new'?t.addToList:t.update}</button>
     <button type="button" className={styles.secondary} onClick={()=>{setEditing(null);setError('')}}>{t.cancel}</button>
    </div>
   </form>}
   <div className={styles.saveActions}>
    <button type="button" className={styles.primary} disabled={busy||!dirty||editing!==null} onClick={()=>onSaveVideos(videos)}>{t.save}</button>
    <button type="button" className={styles.secondary} disabled={busy||dirty||editing!==null||practitioner?.status==='submitted'} onClick={onSubmitVideos}>{t.review}</button>
   </div>
   {dirty&&<p className={styles.notice}>{t.unsaved}</p>}
   <p className={styles.notice}>{t.moderation}</p>
  </div>}
 </div>
}
