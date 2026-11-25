'use client'
import {useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,Share2,Check,BookOpen,MessageCircleQuestion,Link2,AlignLeft} from 'lucide-react'
import styles from './public-practitioner-course-player.module.css'

const copy={
 en:{lesson:'Slide',of:'of',prev:'Previous slide',next:'Next slide',back:'All courses',share:'Share course',copy:'Link copied',original:'Watch video',author:'Course author',reflection:'Question for reflection',instructions:'Practice / instructions'},
 ru:{lesson:'Слайд',of:'из',prev:'Назад',next:'Далее',back:'Все курсы',share:'Поделиться',copy:'Ссылка скопирована',original:'Смотреть видео',author:'Автор курса',reflection:'Вопрос для размышления',instructions:'Практика / инструкция'},
 es:{lesson:'Diapositiva',of:'de',prev:'Anterior',next:'Siguiente',back:'Todos los cursos',share:'Compartir',copy:'Enlace copiado',original:'Ver vídeo',author:'Autor del curso',reflection:'Pregunta para reflexionar',instructions:'Práctica / instrucciones'}
}
function safeEmbed(value){
 try{
  const url=new URL(value)
  if(url.origin==='https://www.youtube.com'&&url.pathname==='/watch'){
   const id=url.searchParams.get('v')||''
   if(/^[a-zA-Z0-9_-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id
  }
  if(url.origin==='https://vimeo.com'&&/^\/\d{6,12}$/.test(url.pathname))
   return 'https://player.vimeo.com/video'+url.pathname
 }catch{}
 return null
}
export default function PublicPractitionerCoursePlayer({course,slug,practitionerName,locale='en'}){
 const t=copy[locale]||copy.en
 const [position,setPosition]=useState(0),[feedback,setFeedback]=useState('')
 const slides=Array.isArray(course.slides)?course.slides:[]
 const slide=slides[position]
 async function share(){
  const url=window.location.href
  try{
   if(navigator.share){await navigator.share({title:course.title,url});return}
   await navigator.clipboard.writeText(url);setFeedback(t.copy)
  }catch(e){if(e.name!=='AbortError')setFeedback('SHARE_UNAVAILABLE')}
 }
 if(!slide)return null
 const embed=slide.kind==='embed'?safeEmbed(slide.videoUrl):null
 const mediaUrl=slide.assetId?'/api/practitioner-course-media/'+slide.assetId:null
 const coverId=slide.coverAssetId||(slide.kind==='image'?slide.assetId:null)
 const coverUrl=coverId?'/api/practitioner-course-media/'+coverId:null
 return <main className={styles.root} data-public-master-course lang={course.locale||locale}>
  <div className={styles.top}>
   <Link href={'/'+locale+'/academy/free-ai-courses#practitioner-courses'}><ArrowLeft size={17}/>{t.back}</Link>
   <button type="button" onClick={()=>void share()}><Share2 size={16}/>{t.share}</button>
  </div>
  <div className={styles.info}><span className={styles.kicker}>HOLISTIC HOUSE · ACADEMY</span>
    <h1>{course.title}</h1><p>{course.description}</p><small>{t.author}: {practitionerName||'Holistic House'}</small>
  </div>
  <div className={styles.deck}>
   <aside className={styles.rail} aria-label={t.lesson}>
    {slides.map((item,i)=><button type="button" key={item.id} onClick={()=>setPosition(i)} aria-current={i===position?'step':undefined}
      className={i===position?styles.active:''}><span>{i+1}</span><strong>{item.title||t.lesson+' '+(i+1)}</strong></button>)}
   </aside>
   <section className={styles.slide} aria-live="polite">
    <div className={styles.counter}><BookOpen size={16}/>{t.lesson} {position+1} {t.of} {slides.length}</div>
    <article className={styles.pageCanvas} data-course-learner-page>
     {coverUrl&&<img className={styles.cover} src={coverUrl} alt={slide.title||course.title} loading="lazy"/>}
     {slide.title&&<h2>{slide.title}</h2>}
     {slide.question&&<section className={styles.reflection}>
       <MessageCircleQuestion size={24} aria-hidden="true"/>
       <div><small>{t.reflection}</small><p>{slide.question}</p></div>
      </section>}
     {slide.body&&<section className={styles.instructions}>
       <AlignLeft size={21} aria-hidden="true"/>
       <div><small>{t.instructions}</small><p className={styles.body}>{slide.body}</p></div>
      </section>}
     {mediaUrl&&slide.kind==='audio'&&<audio className={styles.audio} controls preload="none" src={mediaUrl}/>}
     {mediaUrl&&slide.kind==='video'&&<video className={styles.video} controls playsInline preload="none" src={mediaUrl}/>}
     {embed&&<div className={styles.embed}><iframe key={embed} src={embed} title={slide.title||course.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/></div>}
     {slide.kind==='embed'&&!embed&&slide.videoUrl&&<a href={slide.videoUrl} rel="noopener noreferrer" target="_blank">{t.original} <ArrowRight size={14}/></a>}
     {slide.ctaLabel&&slide.ctaUrl&&<a className={styles.slideCta} href={slide.ctaUrl} rel="noopener noreferrer nofollow" target="_blank"><Link2 size={18} aria-hidden="true"/>{slide.ctaLabel}<ArrowRight size={17} aria-hidden="true"/></a>}
    </article>
    <div className={styles.controls}>
     <button type="button" disabled={position===0} onClick={()=>setPosition(i=>i-1)}><ArrowLeft size={16}/>{t.prev}</button>
     <span>{Math.round((position+1)/slides.length*100)}%</span>
     <button type="button" disabled={position===slides.length-1} onClick={()=>setPosition(i=>i+1)}>{position===slides.length-1?<Check size={17}/>:<ArrowRight size={17}/>} {t.next}</button>
    </div>
   </section>
  </div>
  {feedback&&<p className={styles.feedback} role="status">{feedback}</p>}
 </main>
}
