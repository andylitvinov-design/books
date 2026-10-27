'use client'

import {useMemo, useState} from 'react'
import Link from 'next/link'
import styles from './practitioner-public-feed.module.css'

type Locale='en'|'ru'|'es'
type Media={source?:string;type?:string;url?:string;assetId?:string}
type Article={id:string;slug:string;publishedAt?:string|null;published:{kind?:string;title:string;excerpt?:string;body?:string;locale:string;coverPath?:string;media?:Media[]}}
type Course={slug:string;publishedAt?:string|null;course:{title:string;description?:string;locale:Locale;contentType?:string}}
type Video={title:string;description?:string;locale:Locale;url:string}
type Audio={id:string;title:string;locale:Locale}
type Entry={key:string;kind:string;categories:string[];title:string;description?:string;body?:string;locale:Locale;date?:string|null;href?:string;url?:string;cover?:string;media?:Media[]}
const filters=['all','post','article','image','video','audio','course'] as const
const copy={
 en:{title:'From the practitioner',lead:'Posts, articles, recordings and courses in one place.',filter:'Filter publications',all:'All',post:'Posts',article:'Articles',image:'Photos',video:'Video',audio:'Audio',course:'Courses',empty:'No published materials in this category yet.',read:'Read article',open:'Open course',view:'Open original',play:'Play video',about:'General educational material · original language shown'},
 ru:{title:'Лента мастера',lead:'Публикации, статьи, записи и курсы — в одном месте.',filter:'Фильтр публикаций',all:'Все',post:'Посты',article:'Статьи',image:'Фото',video:'Видео',audio:'Аудио',course:'Курсы',empty:'В этой категории пока нет опубликованных материалов.',read:'Читать статью',open:'Открыть курс',view:'Открыть оригинал',play:'Смотреть видео',about:'Образовательные материалы · указан исходный язык'},
 es:{title:'Publicaciones del profesional',lead:'Publicaciones, artículos, grabaciones y cursos en un solo lugar.',filter:'Filtrar publicaciones',all:'Todo',post:'Entradas',article:'Artículos',image:'Fotos',video:'Vídeo',audio:'Audio',course:'Cursos',empty:'Todavía no hay materiales publicados en esta categoría.',read:'Leer artículo',open:'Abrir curso',view:'Abrir original',play:'Ver vídeo',about:'Contenido educativo · se indica el idioma original'},
}
function canonicalVideo(value:string){
 try{
  const u=new URL(value)
  if(u.protocol!=='https:')return null
  const host=u.hostname.toLowerCase()
  let id=''
  if(host==='www.youtube.com'&&u.pathname==='/watch')id=u.searchParams.get('v')||''
  else if(host==='youtu.be')id=u.pathname.slice(1)
  if(/^[a-zA-Z0-9_-]{11}$/.test(id))return {url:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1&rel=0',poster:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'}
  if((host==='vimeo.com'||host==='www.vimeo.com')&&/^\/\d{6,12}\/?$/.test(u.pathname)){const number=u.pathname.replace(/\//g,'');return {url:'https://vimeo.com/'+number,embed:'https://player.vimeo.com/video/'+number+'?dnt=1',poster:''}}
 }catch{/* Ignore unsafe or legacy links. */}
 return null
}
function VideoPlayer({url,title,locale}:{url:string;title:string;locale:Locale}){
 const [playing,setPlaying]=useState(false)
 const video=canonicalVideo(url)
 const t=copy[locale]
 if(!video)return null
 return <div className={styles.player}>
  {playing?<iframe title={title} src={video.embed} loading="eager" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:
   <button type="button" className={styles.poster} style={video.poster?{backgroundImage:'linear-gradient(0deg,rgba(11,31,45,.5),rgba(11,31,45,.1)),url("'+video.poster+'")'}:undefined}
     onClick={()=>setPlaying(true)} aria-label={t.play+': '+title}><span aria-hidden="true">▶</span>{t.play}</button>}
 </div>
}
function validAudioUrl(url:string){
 try{
  const parsed=new URL(url)
  const host=parsed.hostname.toLowerCase()
  return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.port&&host.includes('.')&&
   !/(^|\.)(localhost|internal|local|test|invalid)$/.test(host)&&
   !/^\d+(?:\.\d+){3}$/.test(host)&&/\.(mp3|m4a|aac|ogg|oga|wav)$/i.test(parsed.pathname)
 }catch{return false}
}
function validImageUrl(url:string){
 try{
  const parsed=new URL(url)
  const host=parsed.hostname.toLowerCase()
  return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.port&&host.includes('.')&&
   !/(^|\.)(localhost|internal|local|test|invalid)$/.test(host)&&
   !/^\d+(?:\.\d+){3}$/.test(host)&&/\.(?:jpe?g|png|webp)$/i.test(parsed.pathname)
 }catch{return false}
}
function DirectVideo({url,title}:{url:string;title:string}){
 try{
  const u=new URL(url)
  if(u.protocol==='https:'&&u.hostname.includes('.')&&/\.(mp4|webm|mov)$/i.test(u.pathname)){
   return <video controls preload="none" playsInline aria-label={title} className={styles.directVideo} src={url}/>
  }
 }catch{/* Media URL may have been deleted after publication. */}
 return null
}
function PostMedia({media,locale}:{media:Media[];locale:Locale}){
 return <div className={styles.mediaStack}>{media.map((m,index)=>{
  if(m.source!=='external'||!m.url)return null
  if(m.type==='image'&&validImageUrl(m.url))return <img key={index} className={styles.cover} src={m.url} alt="" loading="lazy" referrerPolicy="no-referrer"/>
  if(m.type==='video')return canonicalVideo(m.url)?<VideoPlayer key={index} url={m.url} title={'Video '+(index+1)} locale={locale}/>:<DirectVideo key={index} url={m.url} title={'Video '+(index+1)}/>
  if(m.type==='audio'&&validAudioUrl(m.url))return <audio key={index} controls preload="none" src={m.url} aria-label={copy[locale].audio+' '+(index+1)}/>
  return null
 })}</div>
}
function safeCover(path?:string){return !!path&&/^\/(?:images\/[a-zA-Z0-9/_-]+|media\/remedies\/[a-z0-9-]+\/[a-zA-Z0-9_-]+)\.(?:jpg|jpeg|png|webp)$/i.test(path)}
export default function PractitionerPublicFeed({locale='en',masterSlug,articles=[],courses=[],videos=[],audios=[]}:{locale:Locale;masterSlug:string;articles:Article[];courses:Course[];videos:Video[];audios:Audio[]}){
 const [active,setActive]=useState<(typeof filters)[number]>('all')
 const t=copy[locale]||copy.en
 const items=useMemo(()=>{
  const entries:Entry[]=[]
  for(const article of articles){
   const p=article.published
   if(!p||!['en','ru','es'].includes(p.locale)||!article.slug||!article.id)continue
   const isPost=p.kind==='post'
   const media=Array.isArray(p.media)?p.media.slice(0,4):[]
   const categories=[isPost?'post':'article',...media.map(m=>m.type).filter((m):m is string=>m==='image'||m==='audio'||m==='video')]
   entries.push({key:'a:'+article.id,kind:isPost?'post':'article',categories,title:p.title,description:p.excerpt,body:p.body,locale:p.locale as Locale,date:article.publishedAt,href:isPost?undefined:'/'+p.locale+'/articles/'+article.slug,cover:p.coverPath,media})
  }
  for(const course of courses){
   const p=course.course
   if(!p||!p.title||!['en','ru','es'].includes(p.locale))continue
   const category=p.contentType==='video_meditation'?'video':p.contentType==='audio_meditation'?'audio':'course'
   entries.push({key:'c:'+course.slug,kind:'course',categories:['course',category],title:p.title,description:p.description,locale:p.locale,date:course.publishedAt,href:'/'+p.locale+'/courses/masters/'+course.slug})
  }
  for(let i=0;i<videos.length;i++){
   const v=videos[i]
   if(!canonicalVideo(v.url)||!['en','ru','es'].includes(v.locale))continue
   entries.push({key:'v:'+i+':'+v.url,kind:'video',categories:['video'],title:v.title,description:v.description,locale:v.locale,url:v.url})
  }
  for(const a of audios){
   if(!/^[0-9a-f-]{36}$/i.test(a.id)||!['en','ru','es'].includes(a.locale))continue
   entries.push({key:'s:'+a.id,kind:'audio',categories:['audio'],title:a.title,locale:a.locale,url:'/api/masters/'+encodeURIComponent(masterSlug)+'/shared-audio/'+a.id})
  }
  return entries.sort((a,b)=>Number(Date.parse(b.date||'')||0)-Number(Date.parse(a.date||'')||0))
 },[articles,courses,videos,audios,masterSlug])
 const visible=items.filter(item=>active==='all'||item.categories.includes(active))
 return <section className={styles.feed} id="practitioner-feed" aria-labelledby="practitioner-feed-heading" data-practitioner-public-feed>
  <header className={styles.heading}><div><p className={styles.kicker}>HOLISTIC HOUSE</p><h2 id="practitioner-feed-heading">{t.title}</h2><p>{t.lead}</p></div><small>{items.length}</small></header>
  <div className={styles.filters} role="group" aria-label={t.filter}>
   {filters.map(key=><button type="button" key={key} aria-pressed={active===key} onClick={()=>setActive(key)}>{t[key]}<span>{key==='all'?items.length:items.filter(x=>x.categories.includes(key)).length}</span></button>)}
  </div>
  <div className={styles.list} aria-live="polite">
   {visible.length?visible.map(item=><article key={item.key} className={styles.card}>
    <div className={styles.meta}><span className={styles.type}>{t[item.kind as keyof typeof t]||item.kind}</span><span>{item.locale.toUpperCase()}</span>{item.date&&<time dateTime={item.date}>{new Date(item.date).toLocaleDateString(locale)}</time>}</div>
    <h3>{item.title}</h3>
    {item.description&&item.kind!=='post'&&<p>{item.description}</p>}
    {item.kind==='post'&&item.body&&<p className={styles.postText}>{item.body}</p>}
    {item.cover&&safeCover(item.cover)&&<img className={styles.cover} src={item.cover} alt="" loading="lazy"/>}
    {item.kind==='post'&&item.media&&<PostMedia media={item.media} locale={locale}/>}
    {item.kind==='video'&&item.url&&<VideoPlayer url={item.url} title={item.title} locale={locale}/>}
    {item.kind==='audio'&&item.url&&<audio controls preload="none" aria-label={item.title} src={item.url}/>}
    {item.href&&<Link href={item.href} className={styles.open}>{item.kind==='article'?t.read:item.kind==='course'?t.open:t.view} →</Link>}
   </article>):<p className={styles.empty}>{t.empty}</p>}
  </div>
  <p className={styles.footer}>{t.about}</p>
 </section>
}
