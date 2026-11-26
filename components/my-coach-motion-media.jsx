'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {PUBLIC_COACH_PERSONA_IDS} from '@/lib/coaching/persona-registry.mjs'
import {coachVisualClip,normalizeCoachVisualScene} from '@/lib/coaching/coach-visual-cues.mjs'
import {coachNaturalTake,coachNaturalVideoPath,coachVideoPosterPath} from '@/lib/coaching/coach-natural-motion.mjs'
import styles from './my-coach-motion-media.module.css'
import SamirMotionVideos from './samir-motion-videos'
import {samirMotionTake} from '@/lib/coaching/samir-motion.mjs'
import {releasedReactionMedia,releasedCoachPresentationLoop,isCoachPresentationContext,coachPresentationMetadataMatches,coachPresentationOpening} from '@/lib/coaching/coach-reaction-v4-registry.mjs'
import {REACTION_V4_RELEASED,REACTION_V5_CAMERA_GROUPS} from '@/lib/coaching/coach-reaction-v4-release.mjs'
import CoachReactionDirectorMedia from './coach-reaction-director-media'

// Samir has a calm, silent cinematic loop. Keep the original six videos and do not connect decorative motion to TTS or client microphone audio.
// Merlin and Harry have welcoming smiles, with Harry's existing attentive loop retained.
const VIDEO_PERSONAS=new Set(['mira','max','sofia','alex','merlin','harry','genie'])
const PHASES=new Set(['greeting','idle','listening','speaking','thinking'])
const MEDIA_ROOT='/images/holistic-house/my-coach-motion/'
// Samir's third, no-speech MP4 is owner-approved, not the rejected talking clip.

// Decorative silent video. Never synthesizes facial movement or reads audio.
export default function MyCoachMotionMedia({personaId,phase='idle',context='card',className='',scene,reactionIntent,presentationLoop=false}){
  const containerRef=useRef(null)
  const videoRef=useRef(null)
  const [motionAllowed,setMotionAllowed]=useState(false)
  const [inViewport,setInViewport]=useState(false)
  const [pageVisible,setPageVisible]=useState(true)
  const [videoReady,setVideoReady]=useState(false)
  const [missingPoster,setMissingPoster]=useState(null)
  const [failedPresentationSrc,setFailedPresentationSrc]=useState(null)
  const [openingDone,setOpeningDone]=useState(false)
  const [openingStarted,setOpeningStarted]=useState(false)
  const supported=PUBLIC_COACH_PERSONA_IDS.includes(personaId)
  const isGenie=personaId==='genie'
  const hasVideo=VIDEO_PERSONAS.has(personaId)
  const directorActive=context==='session'&&Boolean(reactionIntent)
  const presentationActive=isCoachPresentationContext(context,presentationLoop)
  const presentation=useMemo(()=>presentationActive?releasedCoachPresentationLoop(personaId,REACTION_V4_RELEASED,REACTION_V5_CAMERA_GROUPS[personaId]||'primary'):null,[presentationActive,personaId])
  const opening=coachPresentationOpening(personaId,presentation)
  const openingActive=Boolean(opening&&!openingDone)
  const activePresentation=openingActive?opening:presentation
  const released=useMemo(()=>directorActive?releasedReactionMedia(personaId,REACTION_V4_RELEASED,REACTION_V5_CAMERA_GROUPS[personaId]||'primary'):null,[directorActive,personaId])
  const phaseState=PHASES.has(phase)?phase:'idle'
  const state=directorActive&&phaseState==='listening'&&reactionIntent.speaker==='none'?'idle':phaseState
  const fallbackScene=state==='greeting'?'welcome':state==='listening'?'attentive':'calm'
  const visualScene=directorActive?normalizeCoachVisualScene(reactionIntent.scene,fallbackScene):
    state==='speaking'?normalizeCoachVisualScene(scene,'explain'):fallbackScene
  const protectedHold=directorActive&&['hold','empathy'].includes(reactionIntent.kind)
  const clip=personaId==='harry'?coachVisualClip(state,visualScene):coachNaturalTake(state,visualScene)
  const samirTake=isGenie?samirMotionTake(state,visualScene):null
  const fallbackPoster=supported?(personaId==='harry'?MEDIA_ROOT+'harry-soft-still.webp':isGenie?MEDIA_ROOT+'genie-natural-opening-v2.webp':personaId==='caesar'?MEDIA_ROOT+'caesar-emblem.svg':MEDIA_ROOT+personaId+'-still.webp'):null
  const harryClip=state==='listening'?'attentive':'calm'
  const greetingSrc=state==='greeting'&&(personaId==='merlin'||personaId==='harry')
    ?MEDIA_ROOT+personaId+'-greeting-real-v2.mp4':null
  const legacySrc=supported&&hasVideo&&!isGenie?(greetingSrc||(
    personaId==='merlin'?MEDIA_ROOT+'merlin-greeting-real-v2.mp4':
    personaId==='harry'?MEDIA_ROOT+'harry-soft-'+harryClip+'.mp4':
    coachNaturalVideoPath(personaId,state,visualScene))):null

  // Only Harry's one-shot visual opening can advance to the calm loop.
  // Audio, speech phase and Play/Replay never restart the visual greeting.
  const src=presentationActive?(activePresentation?.src||null):legacySrc
  const framePoster = presentationActive?null:coachVideoPosterPath(src)
  const preferredPoster=released?.poster||activePresentation?.poster||framePoster
  const poster=preferredPoster&&preferredPoster!==missingPoster?preferredPoster:fallbackPoster
  const mediaIdentity=released?.anchorHash||src

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
  useEffect(()=>{setVideoReady(false)},[mediaIdentity,personaId])
  useEffect(()=>{setOpeningDone(false);setOpeningStarted(false)},[personaId,presentationActive])
  const shouldPlay=supported&&hasVideo&&motionAllowed&&inViewport&&pageVisible&&
    (presentationActive?Boolean(activePresentation&&failedPresentationSrc!==src):(Boolean(released)||!protectedHold))
  // Keep Harry's element mounted across visibility/reduced-motion pauses so
  // returning to the screen cannot replay his one-time smile.
  const keepHarryVideo=Boolean(opening&&openingStarted&&activePresentation&&failedPresentationSrc!==src)
  useEffect(()=>{
    const video=videoRef.current
    if(!video)return
    if(!shouldPlay){video.pause();setVideoReady(false);return}
    const attempt=video.play()
    if(attempt?.catch)void attempt.catch(()=>setVideoReady(false))
  },[shouldPlay,src])
  function failPresentation(){
    setVideoReady(false)
    if(openingActive){setOpeningDone(true);return}
    setFailedPresentationSrc(src)
  }
  function validatePresentation(video){
    if(coachPresentationMetadataMatches(activePresentation,video))return true
    video.pause();failPresentation();return false
  }
  function finishPresentationOpening(){
    if(openingActive){setVideoReady(false);setOpeningDone(true)}
  }
  if(!supported)return null
  return <span ref={containerRef} className={[styles.media,className].filter(Boolean).join(' ')}
    data-coach-motion-media={personaId} data-coach-motion-context={context}
    data-coach-motion-state={state} data-coach-motion-clip={presentationActive?(activePresentation?.id||'still'):released?'reaction-v4':isGenie?samirTake:hasVideo?(greetingSrc||personaId==='merlin'?'greeting-real-v2':personaId==='harry'?harryClip:clip):'still'}
    data-coach-reaction-mode={presentationActive?(presentation?'presentation-loop':'presentation-still'):directorActive?(released?'v4':'legacy'):undefined}
    data-coach-presentation-loop={presentation?.id}
    data-coach-presentation-opening={openingActive?opening.id:undefined}
    data-coach-presentation-anchor={presentation?.anchorHash}
    data-coach-reaction-group={released?.group||presentation?.group}
    data-coach-reaction-kind={directorActive?reactionIntent.kind:undefined}
    data-coach-reaction-speaker={directorActive?reactionIntent.speaker:undefined}
    data-coach-natural-performance={presentationActive?(presentation?'reaction-v4-presentation':'still'):released?'reaction-v4':isGenie?'samir-three-state-v1':hasVideo&&(personaId!=='harry'||Boolean(greetingSrc))?'v1':'still'}
    data-coach-motion-scene={visualScene} data-coach-motion-ready={videoReady?'true':'false'}
    aria-hidden="true">
    <img src={poster} className={styles.poster} alt="" draggable={false} loading={context==='greeting'?'eager':'lazy'} decoding="async" fetchPriority={isGenie&&context==='greeting'?'high':undefined}
      onError={poster===preferredPoster?()=>setMissingPoster(preferredPoster):undefined} />
    {presentationActive?((shouldPlay||keepHarryVideo)&&<video key={src} ref={videoRef} className={styles.video}
        data-coach-presentation-video src={src} poster={poster} muted loop={!openingActive} playsInline autoPlay={shouldPlay} preload="auto"
        controls={false} disablePictureInPicture
        onLoadedMetadata={event=>validatePresentation(event.currentTarget)}
        onPlaying={event=>{if(validatePresentation(event.currentTarget)){if(openingActive)setOpeningStarted(true);setVideoReady(shouldPlay)}}}
        onEnded={finishPresentationOpening}
        onError={failPresentation} />):released?<CoachReactionDirectorMedia key={released.anchorHash} media={released} intent={reactionIntent} enabled={shouldPlay} onReady={setVideoReady} />:shouldPlay&&(isGenie
      ? <SamirMotionVideos take={samirTake} cycle={state==='idle'||state==='greeting'} onReady={setVideoReady} />
      : <video key={src} ref={videoRef} className={styles.video}
          src={src} poster={poster} muted loop playsInline autoPlay preload="metadata"
          controls={false} disablePictureInPicture
          onPlaying={()=>setVideoReady(true)} onError={()=>setVideoReady(false)} />)}
    {motionAllowed&&hasVideo&&!presentationActive&&!released&&!protectedHold&&(isGenie||!['greeting','session','hero'].includes(context))&&<span className={styles.sceneGraphics}>
      <span className={styles.sceneHalo}/><span className={styles.sceneArc}/>
      <span className={styles.scenePoint}/>
    </span>}
  </span>
}
