'use client'

import {useEffect,useRef,useState} from 'react'
import {PUBLIC_COACH_PERSONA_IDS} from '@/lib/coaching/persona-registry.mjs'
import styles from './my-coach-motion-media.module.css'

const PHASES=new Set(['greeting','idle','listening','speaking'])
const MEDIA_ROOT='/images/holistic-house/my-coach-motion/'

// Decorative, silent and intentionally not a microphone/speech controller.
// These local 24fps MP4 loops never contact a video-generation provider.
export default function MyCoachMotionMedia({personaId,phase='idle',context='card',className=''}){
  const containerRef=useRef(null)
  const videoRef=useRef(null)
  const [motionAllowed,setMotionAllowed]=useState(false)
  const [inViewport,setInViewport]=useState(false)
  const [pageVisible,setPageVisible]=useState(true)
  const [videoReady,setVideoReady]=useState(false)
  const supported=PUBLIC_COACH_PERSONA_IDS.includes(personaId)
  const state=PHASES.has(phase)?phase:'idle'
  // Frame-matched, seamless first-party v3 greeting on the hero, profile and
  // public cards. Real conversation listening/speaking clips stay independent.
  const expressiveGreeting=state==='greeting'||(state==='idle'&&context==='card')
  const poster=supported?MEDIA_ROOT+personaId+(expressiveGreeting?'-greeting-real-v3.webp':'-still.webp'):null
  const src=supported?MEDIA_ROOT+personaId+(expressiveGreeting?'-greeting-real-v3.mp4':'-'+state+'.mp4'):null

  useEffect(()=>{
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const sync=()=>setMotionAllowed(!preference?.matches)
    sync()
    if(preference?.addEventListener)preference.addEventListener('change',sync)
    else preference?.addListener?.(sync)
    return()=>{
      if(preference?.removeEventListener)preference.removeEventListener('change',sync)
      else preference?.removeListener?.(sync)
    }
  },[])
  useEffect(()=>{
    const onVisibility=()=>setPageVisible(document.visibilityState!=='hidden')
    onVisibility()
    document.addEventListener('visibilitychange',onVisibility)
    return()=>document.removeEventListener('visibilitychange',onVisibility)
  },[])
  useEffect(()=>{
    const node=containerRef.current
    if(!node)return
    if(typeof IntersectionObserver==='undefined'){
      setInViewport(true)
      return
    }
    const observer=new IntersectionObserver(entries=>{
      setInViewport(entries.some(entry=>entry.isIntersecting))
    },{rootMargin:'60px',threshold:0.05})
    observer.observe(node)
    return()=>observer.disconnect()
  },[personaId])
  useEffect(()=>{
    setVideoReady(false)
  },[src])
  const shouldPlay=supported&&motionAllowed&&inViewport&&pageVisible
  useEffect(()=>{
    const video=videoRef.current
    if(!video)return
    if(!shouldPlay){video.pause();setVideoReady(false);return}
    const attempt=video.play()
    if(attempt?.catch)void attempt.catch(()=>setVideoReady(false))
  },[shouldPlay,src])
  if(!supported)return null
  return <span ref={containerRef} className={[styles.media,className].filter(Boolean).join(' ')}
    data-coach-motion-media={personaId} data-coach-motion-context={context}
    data-coach-motion-state={state} data-coach-motion-clip={expressiveGreeting?'greeting-real-v3':state}
    data-coach-motion-ready={videoReady?'true':'false'}
    aria-hidden="true">
    <img src={poster} className={styles.poster} alt="" draggable={false} loading="lazy" decoding="async" />
    {shouldPlay&&<video key={src} ref={videoRef} className={styles.video}
      src={src} poster={poster} muted loop playsInline autoPlay preload="none"
      controls={false} disablePictureInPicture
      onPlaying={()=>setVideoReady(true)} onError={()=>setVideoReady(false)} />}
  </span>
}