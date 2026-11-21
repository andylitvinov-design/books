'use client'
import {useEffect,useRef,useState} from 'react'
import {PUBLIC_COACH_PERSONA_IDS} from '@/lib/coaching/persona-registry.mjs'
import {coachVisualClip,normalizeCoachVisualScene} from '@/lib/coaching/coach-visual-cues.mjs'
import {coachNaturalTake,coachNaturalVideoPath} from '@/lib/coaching/coach-natural-motion.mjs'
import styles from './my-coach-motion-media.module.css'

// Six coaches use approved pre-rendered portrait media; no runtime face distortion or lip sync.
// Merlin and Harry have welcoming smiles, with Harry's existing attentive loop retained.
const VIDEO_PERSONAS=new Set(['mira','max','sofia','alex','merlin','harry'])
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
  const clip=personaId==='harry'?coachVisualClip(state,visualScene):coachNaturalTake(state,visualScene)
  const poster=supported?(personaId==='harry'?MEDIA_ROOT+'harry-soft-still.webp':MEDIA_ROOT+personaId+'-still.webp'):null
  const harryClip=state==='listening'?'attentive':'calm'
  const greetingSrc=state==='greeting'&&(personaId==='merlin'||personaId==='harry')
    ?MEDIA_ROOT+personaId+'-greeting-real-v1.mp4':null
  const src=supported&&hasVideo?(greetingSrc||(
    personaId==='merlin'?MEDIA_ROOT+'merlin-greeting-real-v1.mp4':
    personaId==='harry'?MEDIA_ROOT+'harry-soft-'+harryClip+'.mp4':
    coachNaturalVideoPath(personaId,state,visualScene))):null

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
    data-coach-motion-state={state} data-coach-motion-clip={hasVideo?(greetingSrc||personaId==='merlin'?'greeting-real-v1':personaId==='harry'?harryClip:clip):'still'}
    data-coach-natural-performance={hasVideo&&(personaId!=='harry'||Boolean(greetingSrc))?'v1':'still'}
    data-coach-motion-scene={visualScene} data-coach-motion-ready={videoReady?'true':'false'}
    aria-hidden="true">
    <img src={poster} className={styles.poster} alt="" draggable={false} loading="lazy" decoding="async" />
    {shouldPlay&&<video key={src} ref={videoRef} className={styles.video}
      src={src} poster={poster} muted loop playsInline autoPlay preload="metadata"
      controls={false} disablePictureInPicture
      onPlaying={()=>setVideoReady(true)} onError={()=>setVideoReady(false)} />}
    {motionAllowed&&hasVideo&&<span className={styles.sceneGraphics}>
      <span className={styles.sceneHalo}/><span className={styles.sceneArc}/>
      <span className={styles.scenePoint}/>
    </span>}
  </span>
}
