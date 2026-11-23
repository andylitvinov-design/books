'use client'

import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,Play,RotateCcw,Sparkles,Volume2} from 'lucide-react'
import {getCoachPersona,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {coachIntroAudioPath,startDirectCoachIntroAudio} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import MyCoachMotionMedia from './my-coach-motion-media'
import {MyCoachInlineProfile} from './my-coach-compact-profile'
import styles from './my-coach-greeting-gate.module.css'

const words={
 en:{eyebrow:'MEET YOUR AI COACH',play:'Hear my greeting',playing:'Your coach is speaking…',
    start:'Start a session with',continue:'Continue coaching with',again:'Listen to the greeting again',
    failed:'The greeting audio could not play. You can try again or start the session.',
    free:'The introduction is free. Live voice starts only when you choose a session.',
    back:'Choose a different coach'},
 ru:{eyebrow:'ЗНАКОМСТВО С AI-КОУЧЕМ',play:'Послушать приветствие',
    playing:'Коуч приветствует вас…',start:'Начать сессию с',
    continue:'Продолжить сессию с',again:'Прослушать приветствие ещё раз',
    failed:'Приветствие не удалось воспроизвести. Повторите попытку или начните сессию.',
    free:'Приветствие бесплатно. Живой разговор начинается только по вашему выбору.',
    back:'Выбрать другого коуча'},
 es:{eyebrow:'CONOCE A TU COACH DE IA',play:'Escuchar la bienvenida',
    playing:'Tu coach te está saludando…',start:'Iniciar sesión con',
    continue:'Continuar la sesión con',again:'Volver a escuchar la presentación',
    failed:'No se pudo reproducir la bienvenida. Puedes intentarlo otra vez o iniciar la sesión.',
    free:'La presentación es gratuita. La sesión de voz empieza solo cuando tú lo decides.',
    back:'Elegir otro coach'},
}

// Audio is the existing public, first-party recorded welcome MP3. The video
// portrait is silent; no fake lip-sync or Gemini/TTS billing is involved.
export default function MyCoachGreetingGate({personaId,locale='en',name,methodId,onStart}){
 const lang=words[locale]?locale:'en',t=words[lang]
 const persona=getCoachPersona(personaId)
 const presentation=getCoachPresentation(personaId,lang)
 const [phase,setPhase]=useState('preview')
 const [error,setError]=useState('')
 const [priorSession,setPriorSession]=useState(false)
 const player=useRef(null)
 const audioRun=useRef(0)
 useEffect(()=>()=>{audioRun.current++;player.current?.cancel?.();player.current=null},[])
 // Presence-only flag for an actual previously connected Live session in
 // this tab. Never store session text, transcript, user identifiers or audio.
 useEffect(()=>{
   try{setPriorSession(window.sessionStorage.getItem('hh-coach-connected-'+personaId)==='1')}
   catch{setPriorSession(false)}
 },[personaId])
 useEffect(()=>{audioRun.current++;player.current?.cancel?.();player.current=null;
   setPhase('preview');setError('')},[personaId,lang])
 function playGreeting(){
   const url=coachIntroAudioPath(personaId,lang)
   if(!url){setError(t.failed);setPhase('complete');return}
   audioRun.current++
   const generation=audioRun.current
   player.current?.cancel?.()
   player.current=null
   setError('');setPhase('playing')
   try{
     player.current=startDirectCoachIntroAudio(url,{
       onStart:()=>{if(audioRun.current===generation)setPhase('playing')},
       onEnd:()=>{if(audioRun.current===generation){player.current=null;setPhase('complete')}},
       onBlocked:()=>{if(audioRun.current===generation){player.current=null;setError(t.failed);setPhase('complete')}},
       onError:()=>{if(audioRun.current===generation){player.current=null;setError(t.failed);setPhase('complete')}},
     })
   }catch{if(audioRun.current===generation){setPhase('complete');setError(t.failed)}}
 }
 function chooseSession(){
   audioRun.current++
   player.current?.cancel?.()
   player.current=null
   onStart?.()
 }
 const label=name||localCoachText(persona?.name,lang)||''
 return <div className={styles.screen} data-my-coach-greeting-gate={personaId}
   data-greeting-phase={phase}>
   <div className={styles.firstView}>
     <div className={styles.hero}>
       <MyCoachMotionMedia personaId={personaId} phase="greeting" context="greeting" />
       <div className={styles.shade} aria-hidden="true"/>
       <span className={styles.badge}><Sparkles size={16} aria-hidden="true"/>{t.eyebrow}</span>
       <div className={styles.heroText}>
         <h1>{label}</h1>
         <p>{localCoachText(persona?.role,lang)}</p>
       </div>
       {phase==='preview'&&<button type="button" className={styles.largePlay}
         data-coach-greeting-play onClick={playGreeting}
         aria-label={t.play}><Play size={43} fill="currentColor" aria-hidden="true"/></button>}
       {phase==='playing'&&<div className={styles.speaking} role="status">
         <Volume2 size={19} aria-hidden="true"/><span>{t.playing}</span>
       </div>}
       {phase==='complete'&&<div className={styles.completed}>
         <p className={styles.greetingQuote}>“{presentation?.text||localCoachText(persona?.opening,lang)}”</p>
         <button type="button" className={styles.primary} data-coach-greeting-start
           onClick={chooseSession}><Play size={22} fill="currentColor" aria-hidden="true"/>
           {priorSession?t.continue:t.start} {label}</button>
         <button type="button" className={styles.secondary} data-coach-greeting-replay
           onClick={playGreeting}><RotateCcw size={19} aria-hidden="true"/>{t.again}</button>
         {error&&<p className={styles.error} role="status">{error}</p>}
       </div>}
     </div>
     <p className={styles.freeNotice}>{t.free}</p>
   </div>
   <div className={styles.profileBelow}>
     <MyCoachInlineProfile personaId={personaId} locale={lang} methodId={methodId}/>
     <Link className={styles.back} href={'/'+lang+'/my-coach'}>
       <ArrowLeft size={17} aria-hidden="true"/>{t.back}</Link>
   </div>
 </div>
}
