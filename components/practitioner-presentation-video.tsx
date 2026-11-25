'use client'
import {useState} from 'react'
import type {VideoPresentation,ServiceIntroduction} from '@/lib/practitioners/public-types'
import styles from './practitioner-presentation-video.module.css'

const labels={
 en:{title:'Video introduction',service:'Watch this service explained',watch:'Watch video',listen:'Listen to audio',note:'This is a public presentation.'},
 ru:{title:'Знакомство с мастером',service:'Видео об услуге',watch:'Смотреть видео',listen:'Слушать аудио',note:'Публичная видеопрезентация.'},
 es:{title:'Presentación del profesional',service:'Vídeo sobre este servicio',watch:'Ver vídeo',listen:'Escuchar audio',note:'Vídeo de presentación público.'}
}
type Preview=ServiceIntroduction & {playbackUrl:string}
const languageNames={en:'English',ru:'Русский',es:'Español'}
export default function PractitionerPresentationVideo({video,locale='en',service=false,playbackUrl='',introductions=[]}:{
 video?:VideoPresentation|null,locale?:string,service?:boolean,playbackUrl?:string,introductions?:Preview[]
}){
 const [playing,setPlaying]=useState(false)
 const [selectedLanguage,setSelectedLanguage]=useState(locale)
 const fallbacks:Preview[]=video?[{language:(locale in languageNames?locale:'en') as 'en'|'ru'|'es',
   type:'video',media:video,playbackUrl}]:[]
 const available=introductions.length?introductions:fallbacks
 if(!available.length)return null
 const active=available.find(item=>item.language===selectedLanguage)||available[0]
 const media=active.media
 const isAudio=active.type==='audio'
 const t=labels[locale as keyof typeof labels]||labels.en
 const isExternal=media.kind==='external'
 const url=isExternal?media.url:active.playbackUrl
 if(!url)return null
 let embedUrl='',posterUrl=''
 if(isExternal){
  const parsed=new URL(url)
  if(parsed.hostname==='www.youtube.com'){
   const id=parsed.searchParams.get('v')
   if(!id||!/^[a-zA-Z0-9_-]{11}$/.test(id))return null
   embedUrl='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1&rel=0'
   posterUrl='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'
  }else if(parsed.hostname==='vimeo.com'){
   const id=parsed.pathname.slice(1)
   if(!/^\d{6,12}$/.test(id))return null
   embedUrl='https://player.vimeo.com/video/'+id+'?autoplay=1&dnt=1'
  }else return null
 }
 return <section id={service?'service-introduction':undefined} className={service?styles.section+' '+styles.inService:styles.section} aria-label={service?t.service:t.title} data-service-introduction={service||undefined}>
   <div className={styles.heading}><span className={styles.eyebrow}>Holistic House · {isAudio?'Audio':'Video'} · {languageNames[active.language]}</span>
     <h2>{service?t.service:t.title}</h2></div>
   {available.length>1&&<nav className={styles.languages} aria-label={locale==='ru'?'Язык обращения':locale==='es'?'Idioma del mensaje':'Message language'}>
     {available.map(item=><button type="button" key={item.language}
       aria-pressed={active.language===item.language} onClick={()=>{setSelectedLanguage(item.language);setPlaying(false)}}>
       {languageNames[item.language]} · {item.type==='audio'?'♫':'▶'}</button>)}</nav>}
   <div className={isAudio?styles.screen+' '+styles.audioScreen:styles.screen}>
     {!playing?<button type="button" className={styles.poster} onClick={()=>setPlaying(true)}
       style={posterUrl?{backgroundImage:`linear-gradient(0deg,rgba(6,23,40,.65),rgba(6,23,40,.18)),url("${posterUrl}")`}:undefined}
       aria-label={isAudio?t.listen:t.watch}>
       <span className={styles.play} aria-hidden="true">{isAudio?'♫':'▶'}</span><span>{isAudio?t.listen:t.watch}</span>
     </button>:isAudio?<div className={styles.audioPlayer}><audio controls autoPlay preload="metadata" src={url} aria-label={t.listen}/></div>
       :isExternal?<iframe src={embedUrl} className={styles.player} allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
       title={service?t.service:t.title} referrerPolicy="strict-origin-when-cross-origin" loading="eager" allowFullScreen/>
       :<video src={url} controls autoPlay playsInline preload="metadata" className={styles.player}
         aria-label={service?t.service:t.title}/>}
   </div>
   <p className={styles.note}>{t.note}</p>
 </section>
}
