'use client'
import styles from './practice-materials.module.css'

export default function PracticeReportMaterials({items=[],loading=false,error='',locale='en',onRefresh,onManage}){
 const ru=locale==='ru',es=locale==='es'
 const copy=ru?{
  heading:'Материалы для отчётов',info:'Эти материалы доступны только мастеру и клиентам, которым вы их назначите в отчёте.',
  empty:'Пока нет материалов.',refresh:'Обновить',manage:'Открыть библиотеку мастера',
 }:es?{
  heading:'Materiales para informes',info:'Recursos privados, no visibles en el perfil público.',
  empty:'Todavía no hay materiales.',refresh:'Actualizar',manage:'Abrir biblioteca',
 }:{
  heading:'Materials for client reports',info:'Owner-only resources, never displayed on your public profile or sent to clients automatically.',
  empty:'No report materials yet.',refresh:'Refresh',manage:'Open practitioner library',
 }
 return <section className={styles.body} aria-label={copy.heading}>
  <p className={styles.intro}>{copy.info}</p>
  <div className={styles.heading}>
   <h3>{copy.heading}</h3>
   <button type="button" className={styles.secondary} disabled={loading} onClick={onRefresh}>{copy.refresh}</button>
  </div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {loading?<p role="status" className={styles.empty}>Loading…</p>:
   items.length?<div className={styles.list}>
    {items.map(item=><article className={styles.card} key={item.id}>
     <div className={styles.cardTop}><span className={styles.tag}>{item.kind==='video'?'Private video':item.kind==='image'?'Photo':'YouTube'}</span></div>
     <h4>{item.title}</h4>
     {item.kind==='video'?<video className={styles.privatePreview} controls playsInline preload="none"
      src={'/api/app/practice/report-materials/'+encodeURIComponent(item.id)+'/media'}/>:
      item.kind==='image'
       // eslint-disable-next-line @next/next/no-img-element
       ?<img className={styles.privatePreview} loading="lazy" alt={item.title}
        src={'/api/app/practice/report-materials/'+encodeURIComponent(item.id)+'/media'}/>:
       <a className={styles.external} href={item.url} rel="noopener noreferrer" target="_blank">YouTube ↗</a>}
     {item.description&&<p>{item.description}</p>}
    </article>)}
   </div>:!error?<p className={styles.empty}>{copy.empty}</p>:null}
  <div className={styles.saveActions}>
   <button type="button" className={styles.primary} onClick={onManage}>{copy.manage}</button>
  </div>
 </section>
}
