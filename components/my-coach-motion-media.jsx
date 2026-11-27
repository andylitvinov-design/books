'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {PUBLIC_COACH_PERSONA_IDS} from '@/lib/coaching/persona-registry.mjs'
import {coachVisualClip,normalizeCoachVisualScene} from '@/lib/coaching/coach-visual-cues.mjs'
import {coachNaturalTake,coachNaturalVideoPath,coachVideoPosterPath} from '@/lib/coaching/coach-natural-motion.mjs'
import styles from './my-coach-motion-media.module.css'
import SamirMotionVideos from './samir-motion-videos'
import {samirMotionTake} from '@/lib/coaching/samir-motion.mjs'
import {releasedReactionMedia,protectedCoachPresence,isCoachPresentationContext,coachPresentationOpening} from '@/lib/coaching/coach-reaction-v4-registry.mjs'
import {REACTION_V4_RELEASED,REACTION_V5_CAMERA_GROUPS} from '@/lib/coaching/coach-reaction-v4-release.mjs'
import CoachReactionDirectorMedia from './coach-reaction-director-media'
import CoachPresentationLayers from './coach-presentation-layers'
import {selectCoachReactionCameraGroup} from '@/lib/coaching/coach-reaction-director.mjs'
import {qualityScreenedReactionMedia,qualityScreenedPresentation} from '@/lib/coaching/coach-reaction-quality.mjs'

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
  const [unavailableCamera,setUnavailableCamera]=useState(null)
  const [failedLegacy,setFailedLegacy]=useState([])
  const [openingDone,setOpeningDone]=useState(null)
  const supported=PUBLIC_COACH_PERSONA_IDS.includes(personaId)
  const isGenie=personaId==='genie'
  const hasVideo=VIDEO_PERSONAS.has(personaId)
  const sessionContext=context==='session'
  const directorActive=sessionContext&&Boolean(reactionIntent)
  const presentationActive=isCoachPresentationContext(context,presentationLoop)
  const pinnedPresentation=useMemo(()=>presentationActive?protectedCoachPresence(personaId,REACTION_V4_RELEASED):null,[presentationActive,personaId])
  const presentation=useMemo(()=>pinnedPresentation?qualityScreenedPresentation(pinnedPresentation,releasedReactionMedia(personaId,REACTION_V4_RELEASED,pinnedPresentation.group)):null,[pinnedPresentation,personaId])
  // Mira's protected original is 480x672 and visibly soft on Retina.
  // Keep its immutable asset/registry for archival and other consumers; only
  // the public presentation begins directly with the screened same-camera HD loop.
  const opening=presentationActive&&personaId!=='mira'?coachPresentationOpening(personaId):null
  const openingActive=Boolean(opening&&openingDone!==personaId)
  const activePresentation=openingActive?opening:presentation
  // Lock the released HD camera for the whole session. Exhaustion holds its
  // verified anchor, never switches camera or falls back to legacy SD.
  const preferredGroup=REACTION_V5_CAMERA_GROUPS[personaId]||'primary'
  const cameraGroup=useMemo(()=>selectCoachReactionCameraGroup(personaId,REACTION_V4_RELEASED,preferredGroup),[personaId,preferredGroup])
  const released=useMemo(()=>sessionContext&&cameraGroup?qualityScreenedReactionMedia(releasedReactionMedia(personaId,REACTION_V4_RELEASED,cameraGroup)):null,[sessionContext,personaId,cameraGroup])
  const sessionPoster=useMemo(()=>sessionContext?protectedCoachPresence(personaId,REACTION_V4_RELEASED)?.poster:null,[sessionContext,personaId])
  function failCamera(group=cameraGroup){setUnavailableCamera(personaId+':'+group)}
  const phaseState=PHASES.has(phase)?phase:'idle'
  const state=directorActive&&phaseState==='listening'&&reactionIntent.speaker==='none'?'idle':phaseState
  const fallbackScene=state==='greeting'?'welcome':state==='listening'?'attentive':'calm'
  const visualScene=directorActive?normalizeCoachVisualScene(reactionIntent.scene,fallbackScene):
    state==='speaking'?normalizeCoachVisualScene(scene,'explain'):fallbackScene
  const protectedHold=directorActive&&reactionIntent.kind==='hold'
  const neutralOnly=directorActive&&reactionIntent.kind==='empathy'
  const clip=personaId==='harry'?coachVisualClip(state,visualScene):coachNaturalTake(state,visualScene)
  const samirTake=isGenie?(neutralOnly?'idle':samirMotionTake(state,visualScene)):null
  const fallbackPoster=supported?(personaId==='harry'?MEDIA_ROOT+'harry-soft-still.webp':isGenie?MEDIA_ROOT+'genie-natural-opening-v2.webp':personaId==='caesar'?MEDIA_ROOT+'caesar-emblem.svg':MEDIA_ROOT+personaId+'-still.webp'):null
  const harryClip=state==='listening'?'attentive':'calm'
  const greetingSrc=state==='greeting'&&(personaId==='merlin'||personaId==='harry')
    ?MEDIA_ROOT+personaId+'-greeting-real-v2.mp4':null
  const legacySrc=supported&&hasVideo&&!isGenie?(greetingSrc||(
    personaId==='merlin'?MEDIA_ROOT+'merlin-greeting-real-v2.mp4':
    personaId==='harry'?MEDIA_ROOT+'harry-soft-'+harryClip+'.mp4':
    coachNaturalVideoPath(personaId,state,visualScene))):null

  // Only the protected one-shot visual opening can advance to the calm loop.
  // Audio, speech phase and Play/Replay never restart the visual greeting.
  const calmSrc=personaId==='harry'?MEDIA_ROOT+'harry-soft-calm.mp4':coachNaturalVideoPath(personaId,'idle','calm')
  const attentiveSrc=personaId==='harry'?MEDIA_ROOT+'harry-soft-attentive.mp4':coachNaturalVideoPath(personaId,'listening','attentive')
  const reserveSrc=[neutralOnly||(directorActive&&personaId==='merlin'&&state!=='greeting')?calmSrc:legacySrc,calmSrc,attentiveSrc].find(path=>path&&!failedLegacy.includes(path))||null
  const src=presentationActive?(activePresentation?.src||null):reserveSrc
  const framePoster = presentationActive?null:coachVideoPosterPath(src)
  // Keep the initial poster stable beneath the two presentation layers.
  const preferredPoster=presentationActive?(openingActive?opening?.poster||pinnedPresentation?.poster:pinnedPresentation?.poster||opening?.poster):sessionContext?(released?.poster||sessionPoster):framePoster
  const poster=preferredPoster&&preferredPoster!==missingPoster?preferredPoster:fallbackPoster
  const mediaIdentity=presentationActive?personaId+'-presentation':released?.anchorHash||src

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
  useEffect(()=>{setOpeningDone(null);setUnavailableCamera(null)},[personaId,presentationActive])
  const shouldPlay=supported&&hasVideo&&motionAllowed&&inViewport&&pageVisible&&
    (presentationActive?Boolean(opening||presentation):sessionContext?Boolean(released):(!protectedHold&&(isGenie||Boolean(src))))
  useEffect(()=>{
    if(presentationActive||sessionContext)return
    const video=videoRef.current
    if(!video)return
    if(!shouldPlay){video.pause();setVideoReady(false);return}
    const attempt=video.play()
    if(attempt?.catch)void attempt.catch(()=>{
      if(videoRef.current!==video)return
      setVideoReady(false)
      if(!presentationActive&&src)setFailedLegacy(previous=>previous.includes(src)?previous:[...previous,src])
    })
  },[shouldPlay,src,presentationActive,sessionContext])
  const finishPresentationOpening=useCallback(()=>setOpeningDone(personaId),[personaId])
  if(!supported)return null
  return <span ref={containerRef} className={[styles.media,className].filter(Boolean).join(' ')}
    data-coach-motion-media={personaId} data-coach-motion-context={context}
    data-coach-motion-state={state} data-coach-motion-clip={presentationActive?(activePresentation?.id||'still'):released?'reaction-v4':isGenie?samirTake:hasVideo?(greetingSrc||personaId==='merlin'?'greeting-real-v2':personaId==='harry'?harryClip:clip):'still'}
    data-coach-reaction-mode={presentationActive?(openingActive?'presentation-original':presentation?'presentation-loop':'presentation-still'):sessionContext?(released?'v4':'hd-anchor'):undefined}
    data-coach-quality-hold={sessionContext&&unavailableCamera===personaId+':'+cameraGroup?'true':undefined}
    data-coach-presentation-loop={presentation?.id}
    data-coach-presentation-opening={openingActive?opening.id:undefined}
    data-coach-presentation-anchor={presentation?.anchorHash}
    data-coach-reaction-group={released?.group||presentation?.group}
    data-coach-reaction-kind={directorActive?reactionIntent.kind:undefined}
    data-coach-reaction-speaker={directorActive?reactionIntent.speaker:undefined}
    data-coach-natural-performance={presentationActive?(openingActive?'protected-original':presentation?'reaction-v4-presentation':'still'):released?'reaction-v4':isGenie?'samir-three-state-v1':hasVideo&&(personaId!=='harry'||Boolean(greetingSrc))?'v1':'still'}
    data-coach-motion-scene={visualScene} data-coach-motion-ready={videoReady?'true':'false'}
    aria-hidden="true">
    <img src={poster} className={styles.poster} alt="" draggable={false} loading={context==='greeting'?'eager':'lazy'} decoding="async" fetchPriority={isGenie&&context==='greeting'?'high':undefined}
      onError={poster===preferredPoster?()=>setMissingPoster(preferredPoster):undefined} />
    {presentationActive?<CoachPresentationLayers key={personaId} opening={opening} presence={presentation}
        openingActive={openingActive} enabled={shouldPlay} onOpeningDone={finishPresentationOpening} onReady={setVideoReady} />:released?<CoachReactionDirectorMedia key={personaId+':'+released.anchorHash} media={released} intent={reactionIntent} enabled={shouldPlay} onReady={value=>{setVideoReady(value);if(value)setUnavailableCamera(null)}} onUnavailable={failCamera} />:!sessionContext&&shouldPlay&&(isGenie
      ? <SamirMotionVideos take={samirTake} cycle={!neutralOnly&&(state==='idle'||state==='greeting')} onReady={setVideoReady} />
      : <video key={src} ref={videoRef} className={styles.video}
          src={src} poster={poster} muted loop playsInline autoPlay preload="metadata"
          controls={false} disablePictureInPicture
          onPlaying={()=>setVideoReady(true)} onError={()=>{setVideoReady(false);if(src)setFailedLegacy(previous=>previous.includes(src)?previous:[...previous,src])}} />)}
    {motionAllowed&&hasVideo&&!presentationActive&&!sessionContext&&!released&&!protectedHold&&(isGenie||!['greeting','session','hero'].includes(context))&&<span className={styles.sceneGraphics}>
      <span className={styles.sceneHalo}/><span className={styles.sceneArc}/>
      <span className={styles.scenePoint}/>
    </span>}
  </span>
}
