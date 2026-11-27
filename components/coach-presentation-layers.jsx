'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {coachPresentationMetadataMatches} from '@/lib/coaching/coach-reaction-v4-registry.mjs'
import styles from './my-coach-motion-media.module.css'

// Presentation only: two independently decoded layers. Never blend two faces
// or replace a visible video with a poster while the next file is loading.
export default function CoachPresentationLayers({opening,presence,openingActive,enabled,onOpeningDone,onReady}){
  const openingRef=useRef(null)
  const presenceRef=useRef(null)
  const activeSrcRef=useRef(null)
  const visibleRef=useRef(null)
  const [mounted,setMounted]=useState(false)
  const [failed,setFailed]=useState({})
  const [visibleSrc,setVisibleSrc]=useState(null)
  const active=openingActive?opening:presence
  const targetSrc=active&&!failed[active.src]?active.src:null
  const renderLayers=enabled||mounted
  useEffect(()=>{if(enabled)setMounted(true)},[enabled])

  const fail=useCallback((clip,video)=>{
    if(!clip||!video||(openingRef.current!==video&&presenceRef.current!==video))return
    video.pause()
    setFailed(previous=>previous[clip.src]?previous:{...previous,[clip.src]:true})
    if(visibleRef.current===clip.src||clip.src===presence?.src&&activeSrcRef.current===clip.src){
      // Never fall back to a previously shown lower-resolution greeting.
      // Parent holds the same-camera HD anchor after the opening.
      visibleRef.current=null
      setVisibleSrc(null)
      onReady(false)
    }
    if(clip.src===opening?.src){
      onOpeningDone()
    }
  },[opening,presence,onOpeningDone,onReady])

  useEffect(()=>{
    const openingVideo=openingRef.current
    const presenceVideo=presenceRef.current
    const target=targetSrc===opening?.src?openingVideo:targetSrc===presence?.src?presenceVideo:null
    activeSrcRef.current=enabled?targetSrc:null
    if(!openingActive&&(!presence||failed[presence.src])&&visibleRef.current===opening?.src){
      visibleRef.current=null;setVisibleSrc(null);onReady(false)
    }
    for(const video of [openingVideo,presenceVideo]){
      if(video&&(!enabled||video!==target))video.pause()
    }
    if(enabled&&target){
      let cancelled=false
      const clip=targetSrc===opening?.src?opening:presence
      const attempt=target.play()
      if(attempt?.catch)void attempt.catch(error=>{
        if(!cancelled&&error?.name==='NotSupportedError')fail(clip,target)
        // AbortError and Safari autoplay policy are not evidence of a broken file.
        // Keep the last rendered frame/poster and retry on visibility change.
      })
      return()=>{cancelled=true;activeSrcRef.current=null;target.pause()}
    }
    return()=>{activeSrcRef.current=null}
  },[enabled,renderLayers,targetSrc,opening,presence,openingActive,failed,fail,onReady])

  function valid(video,clip){
    if(coachPresentationMetadataMatches(clip,video))return true
    fail(clip,video)
    return false
  }
  function reveal(video,clip){
    if(activeSrcRef.current!==clip.src||video.paused||video.ended||video.readyState<2)return
    if(openingRef.current!==video&&presenceRef.current!==video)return
    if(!valid(video,clip))return
    if(visibleRef.current===clip.src)return
    visibleRef.current=clip.src
    setVisibleSrc(clip.src)
    onReady(true)
  }
  function playing(video,clip){
    if(!valid(video,clip))return
    if(typeof video.requestVideoFrameCallback==='function'){
      video.requestVideoFrameCallback(()=>reveal(video,clip))
    }else reveal(video,clip)
  }
  function layer(clip,role,ref){
    if(!clip)return null
    return <video key={role+':'+clip.src} ref={ref} className={[styles.video,styles.presentationLayer].join(' ')}
      data-coach-presentation-video={visibleSrc===clip.src?'true':undefined}
      data-presentation-layer={role} data-presentation-visible={visibleSrc===clip.src?'true':'false'}
      src={clip.src} poster={clip.poster} muted loop={role==='presence'} playsInline preload="auto"
      controls={false} disablePictureInPicture
      onLoadedMetadata={event=>valid(event.currentTarget,clip)}
      onPlaying={event=>playing(event.currentTarget,clip)}
      onTimeUpdate={event=>{const video=event.currentTarget
        // Safari can delay a hidden layer's frame callback. Only advance once
        // playback demonstrably progressed with current decoded frame data.
        if(video.currentTime>=.12)reveal(video,clip)
      }}
      onEnded={role==='opening'?onOpeningDone:undefined}
      onError={event=>fail(clip,event.currentTarget)} />
  }
  if(!renderLayers)return null
  return <>{layer(opening,'opening',openingRef)}{layer(presence,'presence',presenceRef)}</>
}
