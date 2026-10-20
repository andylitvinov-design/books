'use client'
import {useState} from 'react'
import type {VideoPresentation} from '@/lib/practitioners/public-types'
import styles from './practitioner-presentation-video.module.css'

const labels={
 en:{title:'Video introduction',service:'Watch this service explained',watch:'Watch video',note:'This is a public presentation.'},
 ru:{title:'Знакомство с мастером',service:'Видео об услуге',watch:'Смотреть видео',note:'Публичная видеопрезентация.'},
 es:{title:'Presentación del profesional',service:'Vídeo sobre este servicio',watch:'Ver vídeo',note:'Vídeo de presentación público.'}
}
export default function PractitionerPresentationVideo({video,locale='en',service=false,playbackUrl=''}:{
 video?:VideoPresentation|null,locale?:string,service?:boolean,playbackUrl?:string
}){
 const [playing,setPlaying]=useState(false)
 if(!video)return null
 const t=labels[locale as keyof typeof labels]||labels.en
 const isExternal=video.kind==='external'
 const url=isExternal?video.url:playbackUrl
 if(!url)return null
 let embedUrl='',posterUrl=''
 if(isExternal){
  const parsed=new URL(url)
  if(parsed.hostname==='www.youtube.com'){
   const id=parsed.searchParams.get('v')
   if(!id||!/^[a-zA-Z0-9_-]{11}$/.test(id))return null
   embedUrl='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0'
   posterUrl='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'
  }else if(parsed.hostname==='vimeo.com'){
   const id=parsed.pathname.slice(1)
   if(!/^\d{6,12}$/.test(id))return null
   embedUrl='https://player.vimeo.com/video/'+id+'?autoplay=1&dnt=1'
  }else return null
 }
 return <section className={styles.section} aria-label={service?t.service:t.title}>
   <div className={styles.heading}><span className={styles.eyebrow}>Holistic House · Video</span>
     <h2>{service?t.service:t.title}</h2></div>
   <div className={styles.screen}>
     {isExternal&&posterUrl?<a href={url} target="_blank" rel="noopener noreferrer" className={styles.poster}
       style={{backgroundImage:`linear-gradient(0deg,rgba(6,23,40,.65),rgba(6,23,40,.18)),url("${posterUrl}")`}}
       aria-label={t.watch+': YouTube'}>
       <span className={styles.play} aria-hidden="true">▶</span><span>{t.watch} · YouTube ↗</span>
     </a>:!playing?<button type="button" className={styles.poster} onClick={()=>setPlaying(true)}
       style={posterUrl?{backgroundImage:`linear-gradient(0deg,rgba(6,23,40,.65),rgba(6,23,40,.18)),url("${posterUrl}")`}:undefined}
       aria-label={t.watch}>
       <span className={styles.play} aria-hidden="true">▶</span><span>{t.watch}</span>
     </button>:isExternal?<iframe src={embedUrl} className={styles.player} allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
       title={service?t.service:t.title} referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
       :<video src={url} controls autoPlay playsInline preload="metadata" className={styles.player}
         aria-label={service?t.service:t.title}/>}
   </div>
   <p className={styles.note}>{t.note}</p>
 </section>
}
