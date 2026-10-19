/* eslint-disable @next/next/no-img-element */
'use client'
import {useState} from 'react'
import {ExternalLink,Film,Image as ImageIcon,Play, X} from 'lucide-react'
import {SessionPrivateVideoPoster} from '@/components/session-private-video-poster'
import {safeMaterialVideoUrl,youtubePreviewId} from '@/lib/practitioners/material-preview.js'
import styles from './practice-materials.module.css'

// A small, reusable preview. Private assets are read from the existing
// authenticated cabinet media route; no public CDN or new storage is involved.
export default function PracticeMaterialPreview({
  kind='youtube',url='',mediaUrl='',title='',locale='en',expanded=false,onToggle,
}){
  const [imageFailed,setImageFailed]=useState(false)
  const safeUrl=kind==='youtube'?safeMaterialVideoUrl(url):''
  const youtubeId=kind==='youtube'?youtubePreviewId(url):''
  const isVimeo=safeUrl&&new URL(safeUrl).hostname.toLowerCase().includes('vimeo.com')
  const playText=locale==='ru'?'Смотреть':locale==='es'?'Ver':'Preview'
  const photoText=locale==='ru'?'Открыть фото':locale==='es'?'Abrir foto':'Open photo'
  const image=kind==='image'&&mediaUrl
  const previewImage=kind==='youtube'&&youtubeId&&!imageFailed?
    'https://i.ytimg.com/vi/'+youtubeId+'/hqdefault.jpg':''
  const body=<>
    {image&&!imageFailed&&<img className={styles.thumbnailImage} src={mediaUrl}
      loading="lazy" alt="" onError={()=>setImageFailed(true)}/>}
    {previewImage&&<img className={styles.thumbnailImage} src={previewImage}
      loading="lazy" alt="" onError={()=>setImageFailed(true)}/>}
    {kind==='video'&&mediaUrl&&<SessionPrivateVideoPoster src={mediaUrl}/>}
    {((kind==='image'&&imageFailed)||(kind==='youtube'&&!previewImage))&&
      <span className={styles.thumbnailFallback}>
        {kind==='image'?<ImageIcon size={25}/>:<Film size={25}/>}
        {isVimeo&&<small>Vimeo</small>}
      </span>}
    {kind!=='image'&&<span className={styles.playMark} aria-hidden="true">
      {expanded?<X size={17}/>:kind==='youtube'?<ExternalLink size={16}/>:<Play size={18} fill="currentColor"/>}
    </span>}
  </>
  if(kind==='video')return <button type="button" className={styles.materialThumbnail}
    aria-label={(expanded?(locale==='ru'?'Свернуть видео: ':locale==='es'?'Cerrar vídeo: ':'Close video: '):playText+': ')+title}
    aria-expanded={expanded} onClick={onToggle} disabled={!mediaUrl||typeof onToggle!=='function'}>
    {body}
  </button>
  if(kind==='image')return <a className={styles.materialThumbnail} href={mediaUrl}
    aria-label={photoText+': '+title} target="_blank" rel="noopener noreferrer">{body}</a>
  if(safeUrl)return <a className={styles.materialThumbnail} href={safeUrl}
    aria-label={playText+': '+title} target="_blank" rel="noopener noreferrer">{body}</a>
  return <span className={styles.materialThumbnail} aria-label={title}>{body}</span>
}
