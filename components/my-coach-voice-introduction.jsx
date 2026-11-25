'use client'

import {useEffect,useRef,useState} from 'react'
import {Volume2,ArrowRight} from 'lucide-react'
import {getCoachPresentation,coachPresentationVoice} from '@/lib/coaching/persona-presentations.mjs'
import styles from './my-coach-voice-introduction.module.css'

// A single Play gesture starts a real, localized spoken presentation.
// Browser autoplay is blocked on iPhone; no external TTS call or client data.
const words={
  en:{eyebrow:'MEET YOUR AI COACH',style:'My approach',listen:'Hear my introduction',
    speaking:'Your coach is speaking…',continue:'Continue to conversation',
    unavailable:'Audio could not start on this device. Please try again or continue in text.',
    retry:'Retry the introduction',text:'Continue with text',
    note:'Fictional AI character, not a human therapist. This introduction uses your device voice; no conversation text is sent.'},
  ru:{eyebrow:'ЗНАКОМСТВО С AI-КОУЧЕМ',style:'Мой стиль',listen:'Послушать приветствие',
    speaking:'Коуч рассказывает о себе…',continue:'Перейти к диалогу',
    unavailable:'Устройство не смогло озвучить приветствие. Попробуйте снова или продолжите текстом.',
    retry:'Повторить озвучивание',text:'Продолжить текстом',
    note:'Это вымышленный AI-персонаж, не психотерапевт. Приветствие озвучивает устройство, ваши сообщения не передаются.'},
  es:{eyebrow:'CONOCE A TU COACH DE IA',style:'Mi estilo',listen:'Escuchar presentación',
    speaking:'Tu coach se presenta…',continue:'Pasar al diálogo',
    unavailable:'Este dispositivo no pudo reproducir la presentación. Reinténtalo o continúa con texto.',
    retry:'Reintentar audio',text:'Continuar con texto',
    note:'Personaje ficticio de IA, no terapeuta. La presentación usa la voz del dispositivo y no envía tus mensajes.'},
}
export default function MyCoachVoiceIntroduction({personaId,locale='en',name,onReady,onVoiceStateChange}){
  const lang=words[locale]?locale:'en'
  const copy=words[lang]
  const intro=getCoachPresentation(personaId,lang)
  const [phase,setPhase]=useState('preview')
  const [error,setError]=useState('')
  const speech=useRef(null)
  const fallbackTimer=useRef(null)
  const readyRef=useRef(onReady)
  const voiceRef=useRef(onVoiceStateChange)
  useEffect(()=>{
    readyRef.current=onReady
    voiceRef.current=onVoiceStateChange
  },[onReady,onVoiceStateChange])

  function cancelAudio(){
    if(fallbackTimer.current)clearTimeout(fallbackTimer.current)
    fallbackTimer.current=null
    const active=speech.current
    speech.current=null
    if(active)try{window.speechSynthesis?.cancel()}catch{}
  }
  useEffect(()=>()=>{ // Do not leave a speaking voice behind on route change.
    if(fallbackTimer.current)clearTimeout(fallbackTimer.current)
    fallbackTimer.current=null
    if(speech.current)try{window.speechSynthesis?.cancel()}catch{}
    speech.current=null
  },[])
  function finish(){
    cancelAudio()
    voiceRef.current?.({phase:'idle',beat:0})
    readyRef.current?.()
  }
  function fail(){
    cancelAudio()
    voiceRef.current?.({phase:'idle',beat:0})
    setPhase('preview');setError(copy.unavailable)
  }
  function start(){
    if(phase==='speaking')return
    const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance
    if(!synth?.speak||!Utterance||!intro?.text){setError(copy.unavailable);return}
    cancelAudio()
    let started=false
    try{
      const utterance=new Utterance(intro.text)
      const voice=coachPresentationVoice(personaId,lang,synth.getVoices?.()||[])
      if(voice){
        utterance.lang=voice.lang;utterance.rate=voice.rate;utterance.pitch=voice.pitch
        if(voice.voice)utterance.voice=voice.voice
      }
      speech.current=utterance
      setError('');setPhase('speaking')
      utterance.onstart=()=>{
        if(speech.current!==utterance)return
        started=true
        if(fallbackTimer.current)clearTimeout(fallbackTimer.current)
        fallbackTimer.current=null
        voiceRef.current?.({phase:'speaking',beat:0})
      }
      utterance.onboundary=event=>{
        if(speech.current!==utterance||!started)return
        if(event.name&&event.name!=='word'&&event.name!=='sentence')return
        voiceRef.current?.({phase:'speaking',beat:1})
      }
      utterance.onend=()=>{if(speech.current===utterance)finish()}
      utterance.onerror=()=>{if(speech.current===utterance)fail()}
      // iOS requires speechSynthesis.speak in THIS user click, not in an effect.
      synth.cancel()
      synth.speak(utterance)
      if(!started)fallbackTimer.current=setTimeout(()=>{
        if(!started&&speech.current===utterance)fail()
      },7000)
    }catch{fail()}
  }
  if(!intro)return null
  return <section className={styles.intro} data-my-coach-audio-introduction={personaId}
    data-audio-phase={phase} aria-labelledby="coach-introduction-title">
    <span className={styles.eyebrow}>{copy.eyebrow}</span>
    <h2 id="coach-introduction-title">{name}</h2>
    <div className={styles.style}><strong>{copy.style}</strong><span>{intro.style}</span></div>
    <p className={styles.introText}>{intro.text}</p>
    <div className={styles.actions}>
      <button type="button" className={styles.play} onClick={start}
        disabled={phase==='speaking'} data-my-coach-start-audio-intro>
        <Volume2 size={22} aria-hidden="true"/>
        <span>{phase==='speaking'?copy.speaking:error?copy.retry:copy.listen}</span>
      </button>
      {(phase==='speaking'||Boolean(error))&&<button type="button" className={styles.continue}
        onClick={finish} data-my-coach-intro-continue>
        {error?copy.text:copy.continue}<ArrowRight size={16} aria-hidden="true"/>
      </button>}
    </div>
    {error&&<p className={styles.error} role="status">{error}</p>}
    <p className={styles.note}>{copy.note}</p>
  </section>
}
