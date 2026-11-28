'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {coachPresentationMetadataMatches} from '@/lib/coaching/coach-reaction-v4-registry.mjs'
import styles from './my-coach-motion-media.module.css'

// Original welcome, measured same-camera return, then presence.
// Separate role identity allows two layers to reuse the same immutable MP4.
export default function CoachPresentationLayers({opening,returnClip,presence,openingActive,returnActive,enabled,onOpeningDone,onReturnDone,onReady}){
  const openingRef=useRef(null)
  const returnRef=useRef(null)
  const presenceRef=useRef(null)
  const activeRoleRef=useRef(null)
  const visibleRef=useRef(null)
  const failedRef=useRef({})
  const playbackEpoch=useRef(0)
  const progressRef=useRef(null)
  const returnStarted=useRef(false)
  const [mounted,setMounted]=useState(false)
  const [failed,setFailed]=useState({})
  const [visibleRole,setVisibleRole]=useState(null)
  const role=openingActive?'opening':returnActive?'return':'presence'
  const active=openingActive?opening:returnActive?returnClip:presence
  const renderLayers=enabled||mounted
  useEffect(()=>{if(enabled)setMounted(true)},[enabled])

  const fail=useCallback((clip,video,failedRole)=>{
    const ref=failedRole==='opening'?openingRef:failedRole==='return'?returnRef:presenceRef
    if(!clip||!video||ref.current!==video)return
    video.pause()
    failedRef.current={...failedRef.current,[failedRole]:true}
    setFailed(previous=>previous[failedRole]?previous:{...previous,[failedRole]:true})
    if(visibleRef.current===failedRole){
      visibleRef.current=null
      setVisibleRole(null)
      onReady(false)
    }
    // Hidden return failure retains the outgoing frame, not an abrupt cut.
    // Never fall back to a previously shown lower-resolution greeting.
    if(failedRole==='opening'&&activeRoleRef.current!=='return'&&activeRoleRef.current!=='presence'){
      onReturnDone()
      onOpeningDone()
    }
  },[onOpeningDone,onReturnDone,onReady])

  useEffect(()=>{
    const videos={opening:openingRef.current,return:returnRef.current,presence:presenceRef.current}
    const target=active&&!failed[role]?videos[role]:null
    const epoch=++playbackEpoch.current
    activeRoleRef.current=enabled&&target?role:null
    progressRef.current=null
    for(const video of Object.values(videos)){
      if(video&&(!enabled||video!==target))video.pause()
    }
    if(!enabled||!target||!active)return()=>{playbackEpoch.current++;activeRoleRef.current=null;progressRef.current=null}
    let cancelled=false
    const current=()=>!cancelled&&epoch===playbackEpoch.current&&activeRoleRef.current===role
    const play=()=>{
      if(!current()||target.seeking||target.readyState<1)return
      if(!coachPresentationMetadataMatches(active,target)){fail(active,target,role);return}
      if(target.ended&&role!=='presence'){
        if(role==='opening')onOpeningDone()
        else onReturnDone()
        return
      }
      if(role==='return'&&!returnStarted.current){
        if(Math.abs(target.currentTime-active.startTime)>1/24){
          try{target.currentTime=active.startTime}catch{fail(active,target,role)}
          return
        }
        returnStarted.current=true
      }
      progressRef.current={video:target,epoch,start:target.currentTime}
      const attempt=target.play()
      if(attempt?.catch)void attempt.catch(error=>{
        if(current()&&error?.name==='NotSupportedError')fail(active,target,role)
      })
    }
    target.addEventListener('loadedmetadata',play)
    target.addEventListener('seeked',play)
    play()
    return()=>{
      cancelled=true;playbackEpoch.current++;activeRoleRef.current=null;progressRef.current=null
      target.removeEventListener('loadedmetadata',play)
      target.removeEventListener('seeked',play)
      target.pause()
    }
  },[enabled,renderLayers,role,active,failed,fail,onOpeningDone,onReturnDone])

  function valid(video,clip,videoRole){
    if(coachPresentationMetadataMatches(clip,video))return true
    fail(clip,video,videoRole)
    return false
  }
  function reveal(video,clip,videoRole,epoch=playbackEpoch.current,mediaTime=video.currentTime){
    if(epoch!==playbackEpoch.current||failedRef.current[videoRole])return
    if(activeRoleRef.current!==videoRole||video.paused||video.ended||video.seeking||video.readyState<2)return
    const ref=videoRole==='opening'?openingRef:videoRole==='return'?returnRef:presenceRef
    if(ref.current!==video||!valid(video,clip,videoRole))return
    if(videoRole==='return'&&(!returnStarted.current||mediaTime<clip.startTime-1/48))return
    if(visibleRef.current===videoRole)return
    visibleRef.current=videoRole
    setVisibleRole(videoRole)
    onReady(true)
  }
  function playing(video,clip,videoRole){
    if(!valid(video,clip,videoRole))return
    if(typeof video.requestVideoFrameCallback==='function'){
      const epoch=playbackEpoch.current
      video.requestVideoFrameCallback((_,metadata)=>reveal(video,clip,videoRole,epoch,metadata?.mediaTime??video.currentTime))
    }
  }
  function metadata(video,clip,videoRole){
    if(!valid(video,clip,videoRole))return
    // Pre-seek the hidden bridge to its verified frame while the original
    // is visible. Never rewind it on a visibility or reduced-motion change.
    if(videoRole==='return'&&!returnStarted.current&&!video.seeking&&Math.abs(video.currentTime-clip.startTime)>1/24){
      try{video.currentTime=clip.startTime}catch{fail(clip,video,videoRole)}
    }
  }
  function ended(video,videoRole){
    if(activeRoleRef.current!==videoRole||!video.ended)return
    if(videoRole==='opening')onOpeningDone()
    if(videoRole==='return')onReturnDone()
  }
  function layer(clip,videoRole,ref){
    if(!clip)return null
    return <video key={videoRole+':'+clip.src} ref={ref} className={[styles.video,styles.presentationLayer].join(' ')}
      data-coach-presentation-video={visibleRole===videoRole?'true':undefined}
      data-presentation-layer={videoRole} data-presentation-visible={visibleRole===videoRole?'true':'false'}
      src={clip.src} poster={clip.poster} muted loop={videoRole==='presence'} playsInline preload={videoRole==='opening'?'auto':'metadata'}
      controls={false} disablePictureInPicture
      onLoadedMetadata={event=>metadata(event.currentTarget,clip,videoRole)}
      onPlaying={event=>playing(event.currentTarget,clip,videoRole)}
      onTimeUpdate={event=>{
        const video=event.currentTarget
        const progress=progressRef.current
        if(progress?.video===video&&video.currentTime-progress.start>=.12)reveal(video,clip,videoRole,progress.epoch)
      }}
      onEnded={videoRole==='presence'?undefined:event=>ended(event.currentTarget,videoRole)}
      onError={event=>fail(clip,event.currentTarget,videoRole)} />
  }
  if(!renderLayers)return null
  return <>{layer(opening,'opening',openingRef)}{layer(returnClip,'return',returnRef)}{layer(presence,'presence',presenceRef)}</>
}
