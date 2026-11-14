'use client'
import {useEffect,useId,useRef,useState} from 'react'
import Image from 'next/image'
import {COACH_PERSONAS} from '@/lib/coaching/persona-registry.mjs'
import {COACH_AVATAR_OPTIONS} from '@/lib/personal-coaching/coaching-avatar-state.mjs'
import styles from './coaching-avatar.module.css'
import {portraitMouthAperture,speechRms} from '@/lib/coaching/living-portrait-motion.mjs'

const copy={
 en:{label:'Coach illustration',idle:'Ready to listen',thinking:'Thinking',speaking:'Speaking',paused:'Paused',listening:'Listening',device:'Illustrated avatar · device voice',photo:'Animated photo · device voice'},
 ru:{label:'Образ коуча',idle:'Готов к разговору',thinking:'Думает',speaking:'Говорит',paused:'Пауза',listening:'Слушает',device:'2D-аватар · голос устройства',photo:'Живое фото · голос устройства'},
 es:{label:'Imagen del coach',idle:'Listo para escuchar',thinking:'Pensando',speaking:'Hablando',paused:'En pausa',listening:'Escuchando',device:'Avatar ilustrado · voz del dispositivo',photo:'Foto animada · voz del dispositivo'},
}
export default function CoachingAvatar({locale='en',avatarId='warm',onAvatarChange,phase='idle',beat=0,showPicker=true,displayName='',size='compact',personaId=null,playbackStream=null}){
 const lang=['ru','en','es'].includes(locale)?locale:'en'
 const t=copy[lang]
 const profile=COACH_AVATAR_OPTIONS.find(item=>item.id===avatarId)||COACH_AVATAR_OPTIONS[0]
 const uid=useId().replaceAll(':','')
 const skinId='hh-coach-skin-'+uid
 const state=['speaking','paused','listening','thinking'].includes(phase)?phase:'idle'
 const photoId=!showPicker&&size==='large'&&COACH_PERSONAS.some(p=>p.id===personaId)?personaId:null
 const palette={'--avatar-bg':profile.bg,'--avatar-shirt':profile.shirt,
  '--beat-speed':(0.27+(Math.abs(beat)%4)*0.05)+'s'}

 // This component never requests microphone permission or starts speech.
 // An optional, already-authorized playback MediaStream can drive real RMS.
 const frameRef=useRef(null)
 const lastBoundaryRef=useRef({beat:0,at:0})
 const [pageVisible,setPageVisible]=useState(true)
 const [reduceMotion,setReduceMotion]=useState(false)
 const [speakingPhotoId,setSpeakingPhotoId]=useState(null)
 useEffect(()=>{
   const media=window.matchMedia?.('(prefers-reduced-motion: reduce)')
   const onVisibility=()=>setPageVisible(document.visibilityState!=='hidden')
   const onMotion=()=>setReduceMotion(Boolean(media?.matches))
   onVisibility();onMotion()
   document.addEventListener('visibilitychange',onVisibility)
   if(media?.addEventListener)media.addEventListener('change',onMotion)
   else media?.addListener?.(onMotion)
   return ()=>{
     document.removeEventListener('visibilitychange',onVisibility)
     if(media?.removeEventListener)media.removeEventListener('change',onMotion)
     else media?.removeListener?.(onMotion)
   }
 },[])
 useEffect(()=>{
   if(state!=='speaking')setSpeakingPhotoId(null)
   else setSpeakingPhotoId(previous=>previous??photoId)
 },[state,photoId])
 useEffect(()=>{
   if(state!=='speaking')lastBoundaryRef.current={beat:0,at:0}
   else if(Number.isFinite(beat)&&beat>0)lastBoundaryRef.current={beat,at:performance.now()}
 },[state,beat,photoId])
 const livePhoto=Boolean(photoId)&&pageVisible&&!reduceMotion
 const speakingPhoto=livePhoto&&state==='speaking'&&speakingPhotoId===photoId
 useEffect(()=>{
   const element=frameRef.current
   if(!element||!speakingPhoto)return
   let raf=0,lastPaint=0,audioContext=null,audioSource=null,analyser=null,samples=null
   // SpeechSynthesis does not provide a capturable waveform. Never create
   // a new mic stream: use only an explicitly supplied playbackStream.
   const liveTracks=playbackStream?.getAudioTracks?.().some(track=>track.readyState==='live')
   if(liveTracks){
     try{
       const Context=window.AudioContext||window.webkitAudioContext
       if(Context){
         audioContext=new Context()
         audioSource=audioContext.createMediaStreamSource(playbackStream)
         analyser=audioContext.createAnalyser()
         analyser.fftSize=256
         samples=new Uint8Array(analyser.fftSize)
         audioSource.connect(analyser) // no destination: do not echo audio
         if(audioContext.state==='suspended')void audioContext.resume().catch(()=>{})
       }
     }catch{analyser=null}
   }
   const paint=now=>{
     raf=window.requestAnimationFrame(paint)
     if(now-lastPaint<48)return // <=21 visual samples per second
     lastPaint=now
     let amplitude=null
     if(analyser&&audioContext?.state==='running'){
       try{analyser.getByteTimeDomainData(samples);amplitude=speechRms(samples)}
       catch{amplitude=null}
     }
     const boundary=lastBoundaryRef.current
     element.style.setProperty('--photo-mouth-scale',(1+portraitMouthAperture({
       phase:'speaking',beat:boundary.beat,lastBoundaryAgoMs:now-boundary.at,
       nowMs:now,amplitude,
     })*.20).toFixed(3))
   }
   raf=window.requestAnimationFrame(paint)
   return ()=>{
     window.cancelAnimationFrame(raf)
     element.style.removeProperty('--photo-mouth-scale')
     try{audioSource?.disconnect()}catch{}
     try{analyser?.disconnect()}catch{}
     if(audioContext)void audioContext.close().catch(()=>{})
   }
 },[speakingPhoto,playbackStream,photoId])

 return <div ref={frameRef} className={styles.frame} data-coach-avatar="true" data-photo-speaking={speakingPhoto?'true':undefined}
  data-photo-motion={livePhoto?'enabled':'static'} data-avatar-size={size==='large'?'large':'compact'} data-phase={state}
  data-avatar-id={profile.id} data-photo-persona={photoId||undefined} style={palette} aria-label={t.label}>
  <div className={styles.face} aria-hidden="true">
   <svg className={styles.illustration} viewBox="0 0 146 146" focusable="false">
    <defs><linearGradient id={skinId} x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stopColor="#ffe2ca"/><stop offset="1" stopColor={profile.skin}/>
    </linearGradient></defs>
    <circle className={styles.halo} cx="73" cy="73" r="69" fill={profile.bg}/>
    <path d="M7 146 Q12 112 48 112 L97 112 Q133 112 141 146 Z" fill={profile.shirt}/>
    <path d="M58 105h30v20q-15 11-30 0z" fill={profile.skin}/>
    <g className={styles.head}>
     <ellipse cx="33" cy="77" rx="8" ry="13" fill={profile.skin}/>
     <ellipse cx="113" cy="77" rx="8" ry="13" fill={profile.skin}/>
     <ellipse cx="73" cy="73" rx="42" ry="53" fill={'url(#'+skinId+')'}/>
     <path d={profile.hairPath} fill={profile.hair}/>
     <g className={styles.eyes}>
      <path d="M47 73q9-7 18 0 M82 73q9-7 18 0" stroke="#5e4c42" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <circle cx="56" cy="74" r="3" fill="#443c36"/>
      <circle cx="91" cy="74" r="3" fill="#443c36"/>
     </g>
     <path d="M71 78q-4 14 4 15" stroke="#c68c75" strokeWidth="2" fill="none" strokeLinecap="round"/>
     <path className={styles.mouthRest} d="M60 101q13 6 26 0" fill="none" stroke="#976057" strokeWidth="3" strokeLinecap="round"/>
     <ellipse className={styles.mouthTalk} cx="73" cy="103" rx="11" ry="6" fill="#905452"/>
    </g>
   </svg>
   {photoId&&<div className={styles.livingPortrait} aria-hidden="true">
     <picture className={styles.livingPortraitBase}>
       <source media="(prefers-reduced-motion: reduce)" type="image/webp"
         srcSet={'/images/holistic-house/my-coach-motion/'+photoId+'-still.webp'}/>
       <Image className={styles.livingPortraitImage}
         src={'/images/holistic-house/my-coach-motion/'+photoId+(livePhoto?'-living.webp':'-still.webp')}
         width={370} height={697} unoptimized loading="eager" alt="" draggable={false}/>
     </picture>
     {speakingPhoto&&<Image className={styles.livingPortraitMouth}
       src={'/images/holistic-house/my-coach-motion/'+photoId+'-still.webp'}
       width={370} height={697} unoptimized alt="" draggable={false}/>}
   </div>}
  </div>
  <div className={styles.info}>
   {showPicker?<label className={styles.choice}>
    <span className={styles.srOnly}>{t.label}</span>
    <select aria-label={t.label} value={profile.id}
      onChange={event=>onAvatarChange?.(event.target.value)}>
     {COACH_AVATAR_OPTIONS.map(option=><option key={option.id} value={option.id}>
      {option.labels[lang]}
     </option>)}
    </select>
   </label>:<strong className={styles.avatarName}>{displayName||profile.labels[lang]}</strong>}
   <div className={styles.caption}>
    <span className={styles.state} aria-live="polite">{t[state]}</span>
    <small className={styles.device}>{photoId?t.photo:t.device}</small>
   </div>
  </div>
 </div>
}
