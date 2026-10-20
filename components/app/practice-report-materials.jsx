'use client'
import {useState} from 'react'
import {ArrowRight,FolderOpen,LockKeyhole,RefreshCw} from 'lucide-react'
import PracticeMaterialPreview from './practice-material-preview'
import styles from './practice-materials.module.css'

export default function PracticeReportMaterials({items=[],loading=false,error='',locale='en',onRefresh}){
 const ru=locale==='ru',es=locale==='es'
 const [manageError,setManageError]=useState('')
 const [openVideoId,setOpenVideoId]=useState(null)
 async function openLibrary(){
  setManageError('')
  try{
   const response=await fetch('/api/app/practitioner/open',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},body:JSON.stringify({destination:'materials'}),
   })
   const data=await response.json().catch(()=>({}))
   if(!response.ok||data.redirectUrl!=='/admin/materials')throw Error('NOT_AUTHORIZED')
   window.location.assign(data.redirectUrl)
  }catch{
   setManageError(ru?'Войдите в кабинет мастера и попробуйте ещё раз.':
    es?'Inicia sesión como profesional e inténtalo de nuevo.':
    'Please sign in to your practitioner account and retry.')
  }
 }
 const copy=ru?{
  heading:'Для клиентских отчётов',info:'Приватные материалы. Клиент увидит их только после добавления в его отчёт.',
  empty:'Пока нет материалов.',refresh:'Обновить материалы',manage:'Управлять библиотекой',
  loading:'Загрузка…',video:'Приватное видео',photo:'Фото',open:'Описание',
 }:es?{
  heading:'Para informes',info:'Materiales privados. Solo aparecen para un cliente cuando los adjuntas a su informe.',
  empty:'Todavía no hay materiales.',refresh:'Actualizar materiales',manage:'Gestionar biblioteca',
  loading:'Cargando…',video:'Vídeo privado',photo:'Foto',open:'Descripción',
 }:{
  heading:'For client reports',info:'Private resources. Clients only see materials you attach to their reports.',
  empty:'No report materials yet.',refresh:'Refresh materials',manage:'Manage library',
  loading:'Loading…',video:'Private video',photo:'Photo',open:'Description',
 }
 return <section className={styles.body} aria-label={copy.heading}>
  <div className={styles.sectionHead}>
   <div className={styles.sectionHeadText}>
    <h3>{copy.heading} {!loading&&<small>({items.length})</small>}</h3>
    <p className={styles.privacyNote}><LockKeyhole size={14} aria-hidden="true"/>{copy.info}</p>
   </div>
   <button type="button" className={styles.refreshControl} aria-label={copy.refresh}
     title={copy.refresh} disabled={loading} onClick={onRefresh}><RefreshCw size={17}/></button>
  </div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {loading?<p role="status" className={styles.empty}>{copy.loading}</p>:
   items.length?<div className={styles.resourceList}>
    {items.map(item=>{
     const mediaUrl='/api/app/practice/report-materials/'+encodeURIComponent(item.id)+'/media'
     const expanded=item.kind==='video'&&openVideoId===item.id
     const description=String(item.description||'').trim()
     const concise=description.length>94?description.slice(0,91).trimEnd()+'…':description
     return <article className={styles.resourceRow} key={item.id}>
      <div className={styles.resourceMain}>
       <PracticeMaterialPreview kind={item.kind} url={item.url} mediaUrl={mediaUrl}
         title={item.title} locale={locale} expanded={expanded}
         onToggle={()=>setOpenVideoId(expanded?null:item.id)}/>
       <div className={styles.resourceCopy}>
        <div className={styles.cardTop}>
         <span className={styles.tag}>{item.kind==='video'?copy.video:item.kind==='image'?copy.photo:'YouTube'}</span>
        </div>
        <h4>{item.title}</h4>
        {description&&(description.length>94?
         <details className={styles.descriptionDetails}>
          <summary title={description}>{concise}</summary><p>{description}</p>
         </details>:<p className={styles.description}>{description}</p>)}
       </div>
      </div>
      {expanded&&<div className={styles.expandedVideo}>
       <video controls autoPlay playsInline preload="metadata" src={mediaUrl}/>
      </div>}
     </article>
    })}
   </div>:!error?<p className={styles.empty}>{copy.empty}</p>:null}
  {manageError&&<p className={styles.error} role="alert">{manageError}</p>}
  <div className={styles.libraryFooter}>
   <button type="button" className={styles.manageLink} onClick={()=>void openLibrary()}>
    <FolderOpen size={17} aria-hidden="true"/>{copy.manage}<ArrowRight size={16} aria-hidden="true"/>
   </button>
  </div>
 </section>
}
