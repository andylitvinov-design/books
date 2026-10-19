'use client'
import styles from './practice-materials.module.css'

export default function PracticeReportMaterials({items=[],loading=false,error='',locale='en',onRefresh,onManage}){
 const ru=locale==='ru',es=locale==='es'
 const t=ru?{
  title:'Материалы для клиентских отчётов',
  hint:'Видео и фото из закрытой библиотеки. Они не появятся в публичном профиле и не отправятся клиенту, пока вы не выберете их в отчёте.',
  loading:'Загружаем материалы…',empty:'Пока нет материалов для отчётов.',
  refresh:'Обновить',manage:'Открыть библиотеку мастера',video:'Защищённое видео',photo:'Фото',link:'YouTube · доступен по ссылке',
 }:es?{
  title:'Materiales para informes',hint:'Biblioteca privada. Nada aparece en el perfil público ni se envía a los clientes automáticamente.',
  loading:'Cargando…',empty:'Todavía no hay materiales.',
  refresh:'Actualizar',manage:'Abrir biblioteca',video:'Vídeo privado',photo:'Foto',link:'YouTube · accesible mediante enlace',
 }:{
  title:'Materials for client reports',
  hint:'Private report library. Nothing appears on your public profile or is sent to clients unless you select it in a report.',
  loading:'Loading materials…',empty:'No report materials yet.',
  refresh:'Refresh',manage:'Open practitioner library',video:'Private video',photo:'Photo',link:'YouTube · accessible by link',
 }
 return <section className={styles.body} aria-label={t.title}>
  <p className={styles.intro}>{t.hint}</p>
  <div className={styles.heading}>
   <h3>{t.title}</h3>
   <button type="button" className={styles.secondary} onClick={onRefresh} disabled={loading}>{t.refresh}</button>
  </div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  {loading?<p className={styles.empty} role="status">{t.loading}</p>:
   items.length?<div className={styles.list}>
    {items.map(item=>{
      const path='/api/app/practice/report-materials/'+encodeURIComponent(item.id)+'/media'
      return <article className={styles.card} key={item.id}>
       <div className={styles.cardTop}><span className={styles.tag}>{item.kind==='video'?t.video:item.kind==='youtube'?t.link:t.photo}</span></div>
       <h4>{item.title}</h4>
       {item.kind==='video'?<video className={styles.privatePreview} controls playsInline preload="none" src={path} aria-label={item.title}/>:
        item.kind==='image'
         // eslint-disable-next-line @next/next/no-img-element
         ?<img className={styles.privatePreview} src={path} alt={item.title} loading="lazy"/>:
         <a className={styles.external} href={item.url} target="_blank" rel="noopener noreferrer">{t.link} ↗</a>}
       {item.description&&<p>{item.description}</p>}
      </article>
    })}
   </div>:!error?<p className={styles.empty}>{t.empty}</p>:null}
  <div className={styles.saveActions}>
   <button type="button" className={styles.primary} onClick={onManage}>{t.manage}</button>
  </div>
 </section>
}
