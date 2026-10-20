'use client'
import {useState} from 'react'
import styles from './practitioner-video-gallery.module.css'

type VideoMaterial={title:string;description:string;locale:'en'|'ru'|'es';url:string}
type Embed={src:string;poster:string}
const labels={
 en:{eyebrow:'Watch & learn',title:'Videos by this practitioner',watch:'Watch video',open:'Open original',note:'Educational content for general audiences.'},
 ru:{eyebrow:'Смотреть и изучать',title:'Видео мастера',watch:'Смотреть видео',open:'Открыть оригинал',note:'Общие образовательные материалы.'},
 es:{eyebrow:'Ver y aprender',title:'Vídeos del profesional',watch:'Ver vídeo',open:'Abrir original',note:'Contenido educativo de carácter general.'},
}
function embedFor(url:string):Embed|null{
 try{
  const parsed=new URL(url)
  if(parsed.protocol!=='https:')return null
  if(parsed.hostname==='www.youtube.com'&&parsed.pathname==='/watch'){
   const id=parsed.searchParams.get('v')
   if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id))return null
   return {src:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0',poster:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'}
  }
  if(parsed.hostname==='vimeo.com'){
   const id=parsed.pathname.slice(1)
   if(!/^\d{6,12}$/.test(id))return null
   return {src:'https://player.vimeo.com/video/'+id+'?dnt=1',poster:''}
  }
 }catch{/* Invalid or legacy content stays hidden. */}
 return null
}
export default function PractitionerVideoGallery({videos,locale='en'}:{videos:VideoMaterial[];locale?:string}){
 const [playing,setPlaying]=useState<string|null>(null)
 const t=labels[locale as keyof typeof labels]||labels.en
 const entries=(videos||[]).map((video,index)=>({video,index,embed:embedFor(video.url)}))
  .filter((item):item is {video:VideoMaterial;index:number;embed:Embed}=>Boolean(item.embed))
  .sort((a,b)=>Number(b.video.locale===locale)-Number(a.video.locale===locale))
 if(!entries.length)return null
 return <section id="practitioner-videos" className={styles.section} aria-labelledby="practitioner-video-gallery-title">
  <header className={styles.header}>
   <p className="homeopathy-kicker">{t.eyebrow}</p>
   <h2 id="practitioner-video-gallery-title">{t.title}</h2>
   <p>{t.note}</p>
  </header>
  <div className={styles.grid}>{entries.map(({video,index,embed})=>{
   const id=index+':'+video.url,active=playing===id
   const directYouTube=video.url.startsWith('https://www.youtube.com/watch?v=')
   return <article className={styles.card} key={id}>
    <div className={styles.screen}>{directYouTube
     ?<a className={styles.poster} href={video.url} target="_blank" rel="noopener noreferrer"
       style={embed.poster?{backgroundImage:'linear-gradient(0deg,rgba(6,24,40,.67),rgba(6,24,40,.1)),url("'+embed.poster+'")'}:undefined}
       aria-label={t.watch+': '+video.title}>
       <span className={styles.play} aria-hidden="true">▶</span><span>{t.watch} · YouTube ↗</span>
      </a>
     :active
     ?<iframe title={video.title} src={embed.src} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
     :<button type="button" className={styles.poster} style={embed.poster?{backgroundImage:'linear-gradient(0deg,rgba(6,24,40,.67),rgba(6,24,40,.1)),url("'+embed.poster+'")'}:undefined}
       onClick={()=>setPlaying(id)} aria-label={t.watch+': '+video.title}>
       <span className={styles.play} aria-hidden="true">▶</span><span>{t.watch}</span>
      </button>}
    </div>
    <div className={styles.copy}>
     <span className={styles.language}>{video.locale.toUpperCase()}</span>
     <h3>{video.title}</h3>
     {video.description&&<p>{video.description}</p>}
     <a href={video.url} target="_blank" rel="noopener noreferrer nofollow">{t.open} ↗</a>
    </div>
   </article>
  })}</div>
 </section>
}
