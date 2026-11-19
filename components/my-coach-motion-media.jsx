'use client'
import {useEffect,useRef,useState} from 'react'
import {PUBLIC_COACH_PERSONA_IDS} from '@/lib/coaching/persona-registry.mjs'
import {normalizeCoachVisualScene} from '@/lib/coaching/coach-visual-cues.mjs'
import {coachNaturalTake,coachNaturalVideoPath} from '@/lib/coaching/coach-natural-motion.mjs'
import styles from './my-coach-motion-media.module.css'

// Only the original four have MP4 loops. Merlin and Harry use their own still art;
// never request nonexistent video clips.
const VIDEO_PERSONAS=new Set(['mira','max','sofia','alex'])
const PHASES=new Set(['greeting','idle','listening','speaking'])
const MEDIA_ROOT='/images/holistic-house/my-coach-motion/'

// Decorative silent video. Never synthesizes facial movement or reads audio.
export default function MyCoachMotionMedia({personaId,phase='idle',context='card',className='',scene}){
  const containerRef=useRef(null)
  const videoRef=useRef(null)
  const [motionAllowed,setMotionAllowed]=useState(false)
  const [inViewport,setInViewport]=useState(false)
  const [pageVisible,setPageVisible]=useState(true)
  const [videoReady,setVideoReady]=useState(false)
  const supported=PUBLIC_COACH_PERSONA_IDS.includes(personaId)
  const hasVideo=VIDEO_PERSONAS.has(personaId)
  const state=PHASES.has(phase)?phase:'idle'
  const fallbackScene=state==='greeting'?'welcome':state==='listening'?'attentive':'calm'
  const visualScene=state==='speaking'?normalizeCoachVisualScene(scene,'explain'):fallbackScene
  const clip=coachNaturalTake(state,visualScene)
  const poster=supported?(personaId==='harry'?MEDIA_ROOT+'harry-still.svg':MEDIA_ROOT+personaId+'-still.webp'):null
  // Never fall back to the old morphed MP4s; missing files use still poster.
  const src=supported&&hasVideo?coachNaturalVideoPath(personaId,state,visualScene):null

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
  },[personaId,supported])
  useEffect(()=>{setVideoReady(false)},[src])
  const shouldPlay=supported&&hasVideo&&motionAllowed&&inViewport&&pageVisible
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
    data-coach-motion-state={state} data-coach-motion-clip={hasVideo?clip:'still'}
    data-coach-natural-performance={hasVideo?'v1':'still'}
    data-coach-motion-scene={visualScene} data-coach-motion-ready={videoReady?'true':'false'}
    aria-hidden="true">
    <img src={poster} className={styles.poster} alt="" draggable={false} loading="lazy" decoding="async" />
    {shouldPlay&&<video ref={videoRef} className={styles.video}
      src={src} poster={poster} muted loop playsInline autoPlay preload="metadata"
      controls={false} disablePictureInPicture
      onPlaying={()=>setVideoReady(true)} onError={()=>setVideoReady(false)} />}
    {motionAllowed&&hasVideo&&<span className={styles.sceneGraphics}>
      <span className={styles.sceneHalo}/><span className={styles.sceneArc}/>
      <span className={styles.scenePoint}/>
    </span>}
  </span>
}
