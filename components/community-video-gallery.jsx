'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'
const t={
 en:{title:'Community videos',all:'All authors',any:'All categories',author:'Author',watch:'Watch on YouTube',empty:'No public community videos yet.'},
 ru:{title:'Видео участников',all:'Все авторы',any:'Все темы',author:'Автор',watch:'Смотреть на YouTube',empty:'Публичных видео участников пока нет.'},
 es:{title:'Vídeos comunitarios',all:'Todos los autores',any:'Todas las categorías',author:'Autor',watch:'Ver en YouTube',empty:'Aún no hay vídeos comunitarios públicos.'}
}
export default function CommunityVideoGallery({videos=[],locale='en',heading=true}){
 const text=t[locale]||t.en
 const [author,setAuthor]=useState('all'),[category,setCategory]=useState('all')
 const unique=useMemo(()=>[...new Map(videos.map(v=>[v.id,v])).values()], [videos])
 const authors=useMemo(()=>[...new Set(unique.map(v=>v.author))].sort((a,b)=>a.localeCompare(b)),[unique])
 const categories=useMemo(()=>[...new Set(unique.map(v=>v.category))].sort((a,b)=>a.localeCompare(b)),[unique])
 const selected=unique.filter(v=>(author==='all'||v.author===author)&&(category==='all'||v.category===category))
 if(!unique.length)return null
 return <section data-community-public-videos style={{margin:'24px 0',width:'100%'}}>
  {heading&&<h2 style={{fontSize:'1.2rem'}}>{text.title}</h2>}
  <div style={{display:'flex',gap:9,flexWrap:'wrap',marginBottom:16}}>
   <label style={{fontSize:14}}>{text.author}<select aria-label={text.author} value={author} onChange={e=>setAuthor(e.target.value)}
    style={{display:'block',minHeight:44,fontSize:16,maxWidth:250}}>
    <option value="all">{text.all}</option>{authors.map(a=><option key={a} value={a}>{a}</option>)}
   </select></label>
   <label style={{fontSize:14}}>{text.any}<select aria-label={text.any} value={category} onChange={e=>setCategory(e.target.value)}
    style={{display:'block',minHeight:44,fontSize:16}}>
    <option value="all">{text.any}</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}
   </select></label>
  </div>
  {!selected.length&&<p>{text.empty}</p>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:14}}>
   {selected.map(video=><article key={video.id} style={{border:'1px solid #d1d7d4',borderRadius:12,overflow:'hidden',minWidth:0}}>
    <a href={video.url} target="_blank" rel="noopener noreferrer" aria-label={video.title}>
     <img src={video.thumbnail} width="480" height="270" alt="" loading="lazy"
      style={{width:'100%',height:'auto',aspectRatio:'16 / 9',objectFit:'cover'}}/>
    </a>
    <div style={{padding:12}}><strong>{video.title}</strong>
     <p style={{fontSize:14,margin:'9px 0'}}><span>{text.author}: </span>
      <Link href={video.authorUrl} prefetch={false} style={{fontWeight:600}}>{video.author}</Link></p>
     <small>{video.category} · {video.duration}s</small>
     <p><a href={video.url} target="_blank" rel="noopener noreferrer">{text.watch}</a></p>
    </div>
   </article>)}
  </div>
 </section>
}
