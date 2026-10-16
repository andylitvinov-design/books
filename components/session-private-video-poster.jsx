'use client'
import {useEffect,useRef,useState} from 'react'
import styles from './client-session.module.css'

// Extract a still in THIS authenticated browser from the actual private MP4/MOV.
// Fetches only first nearby video ranges when visible; no API key, public CDN,
// analytics, or stored thumbnail containing client-specific information.
export function SessionPrivateVideoPoster({src}) {
  const holder=useRef(null),video=useRef(null)
  const [frame,setFrame]=useState('')
  useEffect(()=>{
    const box=holder.current,probe=video.current
    if(!box||!probe||!src)return
    let active=true,loaded=false,captured=false,observer=null
    function capture(){
      if(!active||captured||probe.readyState<2||!probe.videoWidth||!probe.videoHeight)return
      try {
        const width=Math.min(640,probe.videoWidth)
        const height=Math.max(1,Math.round(width*probe.videoHeight/probe.videoWidth))
        const canvas=document.createElement('canvas')
        canvas.width=width;canvas.height=height
        const ctx=canvas.getContext('2d')
        if(!ctx)return
        ctx.drawImage(probe,0,0,width,height)
        const result=canvas.toDataURL('image/jpeg',0.76)
        if(result.length<512)return
        captured=true
        setFrame(result)
        // Stop loading a long/private clip once its single preview frame exists.
        probe.pause()
        probe.removeAttribute('src')
        probe.load()
      }catch{
        // Older Safari/unsupported HEVC may prohibit canvas extraction.
        // Keep the native paused video as a best-effort frame fallback.
      }
    }
    function metadata(){
      if(!active)return
      const duration=Number.isFinite(probe.duration)?probe.duration:0
      const time=duration>0?Math.min(1.5,Math.max(0.15,duration*0.12),duration*0.85):0
      if(time>0.05) {
        try{probe.currentTime=time}catch{if(probe.readyState>=2)capture()}
      }else if(probe.readyState>=2)capture()
    }
    function load(){
      if(loaded||!active)return
      loaded=true
      probe.preload='metadata'
      probe.src=src
      probe.load()
    }
    probe.addEventListener('loadedmetadata',metadata)
    probe.addEventListener('seeked',capture)
    probe.addEventListener('loadeddata',capture)
    if(typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){
          observer.disconnect()
          load()
        }
      },{rootMargin:'180px'})
      observer.observe(box)
    }else load()
    return ()=>{
      active=false
      observer?.disconnect()
      probe.removeEventListener('loadedmetadata',metadata)
      probe.removeEventListener('seeked',capture)
      probe.removeEventListener('loadeddata',capture)
      probe.pause()
      probe.removeAttribute('src')
      probe.load()
    }
  },[src])
  return <div className={styles.privateVideoStill} aria-hidden="true" ref={holder}>
    <video ref={video} className={styles.privateVideoStillFrame}
      muted playsInline preload="none" tabIndex={-1}/>
    {frame&&/* eslint-disable-next-line @next/next/no-img-element */<img
      className={styles.privateVideoStillFrame} src={frame} alt=""/>}
  </div>
}
