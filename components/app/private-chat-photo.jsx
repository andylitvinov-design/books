'use client'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {X,ZoomIn} from 'lucide-react'
import styles from './private-chat-photo.module.css'

const COPY={
 en:{open:'Open photo full screen',close:'Close full-screen photo'},
 ru:{open:'Открыть фото на весь экран',close:'Закрыть фото'},
 es:{open:'Abrir foto en pantalla completa',close:'Cerrar foto'},
}

// Receives only an already authorized, same-origin private media URL or a
// revocable blob. Never exposes or persists a Telegram file ID/public URL.
export default function PrivateChatPhoto({src,alt='',locale='en',onLoad,onError}){
 const t=COPY[locale]||COPY.en
 const [open,setOpen]=useState(false)
 const trigger=useRef(null),close=useRef(null)
 useEffect(()=>{setOpen(false)},[src])
 useEffect(()=>{
   if(!open)return
   close.current?.focus()
   const escape=event=>{
     if(event.key==='Escape'){event.stopPropagation();setOpen(false)}
     if(event.key==='Tab'){event.preventDefault();close.current?.focus()}
   }
   document.addEventListener('keydown',escape)
   return ()=>{document.removeEventListener('keydown',escape);trigger.current?.focus()}
 },[open])
 return <>
   <button ref={trigger} type="button" className={styles.thumb} aria-label={t.open}
     aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>
     <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={onLoad} onError={onError}/>
     <ZoomIn size={20} aria-hidden="true" className={styles.zoom}/>
   </button>
   {open&&typeof document!=='undefined'&&createPortal(
     <div className={styles.overlay} onClick={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
       <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={alt||t.open}
         onClick={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
         <button ref={close} className={styles.close} type="button" onClick={()=>setOpen(false)}
           aria-label={t.close}><X size={21} aria-hidden="true"/><span>{t.close}</span></button>
         <img className={styles.full} src={src} alt={alt} decoding="async" onError={onError}/>
       </div>
     </div>,document.body)}
 </>
}
