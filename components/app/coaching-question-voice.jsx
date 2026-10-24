'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { speechResultSegments } from '@/lib/personal-coaching/speech-text'
import { chooseCoachingVoice, coachingLocalVoices, coachingSpeechProfile } from '@/lib/personal-coaching/voice-quality'
import styles from './tradition-coaching.module.css'

const copy={
  en:{
    listen:'Listen to question',stop:'Stop reading',micNote:'Dictate my note',micAnswer:'Dictate my answer',
    stopMic:'Stop listening',unsupported:'Voice recognition is unavailable here. Use the microphone on your phone keyboard or type.',
    notice:'Your browser or phone may send your voice to its speech-recognition service. Holistic House stores only the text you review, not raw audio. Continue?',
    error:'Speech recognition did not work. You can still type or use keyboard dictation.',
    hearing:'Listening… tap Stop when finished.',interim:'Recognizing (not saved yet)',
    device:'System-generated voice, not an Andrey recording.',unavailable:'Read the question above — audio playback is not available on this device.',
    voiceSettings:'Voice & pace',voiceLabel:'Voice',voiceAuto:'Automatic · device voice',paceLabel:'Reading style',
    paceCalm:'Gentle & unhurried',paceClear:'Clear & normal',noVoiceChoices:'No alternative local voices exposed by this browser.',
    voiceLimit:'Voice quality depends on your device. iPhone Safari may not expose enhanced voices.',audioError:'Could not play this question. Please read the text above.',
  },
  ru:{
    listen:'Прослушать вопрос',stop:'Остановить озвучку',micNote:'Продиктовать уточнение',micAnswer:'Продиктовать ответ',
    stopMic:'Остановить микрофон',unsupported:'Распознавание речи здесь недоступно. Можно использовать микрофон клавиатуры телефона или напечатать ответ.',
    notice:'Браузер или телефон могут передать голос своему сервису распознавания. Holistic House сохраняет только проверенный вами текст, не аудиозапись. Продолжить?',
    error:'Не получилось распознать речь. Можно напечатать ответ или использовать диктовку клавиатуры.',
    hearing:'Слушаю… нажмите «Остановить», когда закончите.',interim:'Распознаём (пока не сохранено)',
    device:'Системный голос устройства, не запись Андрея.',unavailable:'Вопрос можно прочитать выше — озвучка на этом устройстве недоступна.',
    voiceSettings:'Голос и темп',voiceLabel:'Голос',voiceAuto:'Автоматически · голос устройства',paceLabel:'Манера речи',
    paceCalm:'Мягко и неспешно',paceClear:'Чётко и обычно',noVoiceChoices:'Другие локальные голоса браузер не показывает.',
    voiceLimit:'Качество зависит от устройства. Safari на iPhone может не показывать улучшенные голоса.',audioError:'Не удалось озвучить вопрос. Прочитайте его на экране.',
  },
  es:{
    listen:'Escuchar pregunta',stop:'Detener lectura',micNote:'Dictar mi nota',micAnswer:'Dictar mi respuesta',
    stopMic:'Detener micrófono',unsupported:'El reconocimiento de voz no está disponible. Usa el micrófono del teclado o escribe.',
    notice:'El navegador o teléfono puede enviar tu voz a su servicio de reconocimiento. Holistic House guarda solo el texto que revises, no audio. ¿Continuar?',
    error:'No se pudo reconocer la voz. Puedes escribir o usar el dictado del teclado.',
    hearing:'Escuchando… toca Detener cuando termines.',interim:'Reconociendo (aún sin guardar)',
    device:'Voz generada por el sistema, no grabación de Andrey.',unavailable:'Puedes leer la pregunta arriba; no hay reproducción de voz disponible.',
    voiceSettings:'Voz y ritmo',voiceLabel:'Voz',voiceAuto:'Automática · voz del dispositivo',paceLabel:'Estilo de lectura',
    paceCalm:'Suave y pausado',paceClear:'Claro y normal',noVoiceChoices:'Este navegador no muestra otras voces locales.',
    voiceLimit:'La calidad depende del dispositivo. Safari en iPhone puede ocultar las voces mejoradas.',audioError:'No se pudo reproducir la pregunta. Lee el texto de arriba.',
  },
}

// Non-sensitive sound preferences live only in this page's JS memory, not storage or a server.
const voicePreferences={}

export default function CoachingQuestionVoice({
  text,locale='en',onTranscript,onInterim,onListeningChange,disabled=false,mode='note',
  speechConsent=false,onConsent,
}){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  const t=copy[lang]
  const spoken=lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-US'
  const [speaking,setSpeaking]=useState(false)
  const [listening,setListening]=useState(false)
  const [support,setSupport]=useState({tts:false,stt:false})
  const [error,setError]=useState('')
  const [interim,setInterim]=useState('')
  const [voices,setVoices]=useState([])
  const [voicePanel,setVoicePanel]=useState(false)
  const [voiceChoice,setVoiceChoice]=useState('auto')
  const [voicePace,setVoicePace]=useState('calm')
  const soundPanelId=useId()
  const utterance=useRef(null)
  const recognition=useRef(null)
  const accepted=useRef(false)
  const savedCallback=useRef(onTranscript)
  const interimCallback=useRef(onInterim)
  const listeningCallback=useRef(onListeningChange)
  const consentCallback=useRef(onConsent)
  savedCallback.current=onTranscript
  interimCallback.current=onInterim
  listeningCallback.current=onListeningChange
  consentCallback.current=onConsent

  useEffect(()=>{
    setSupport({
      tts:typeof window!=='undefined'&&!!window.speechSynthesis&&!!window.SpeechSynthesisUtterance,
      stt:typeof window!=='undefined'&&!!(window.SpeechRecognition||window.webkitSpeechRecognition),
    })
    const stopHidden=()=>{
      if(!document.hidden)return
      window.speechSynthesis?.cancel()
      const capture=recognition.current
      recognition.current=null
      try{capture?.abort()}catch{/* permission prompt may already have ended */}
      utterance.current=null
      setSpeaking(false);setListening(false);setInterim('')
      interimCallback.current?.('')
      listeningCallback.current?.(false)
    }
    document.addEventListener('visibilitychange',stopHidden)
    return ()=>{
      document.removeEventListener('visibilitychange',stopHidden)
      window.speechSynthesis?.cancel()
      const capture=recognition.current
      recognition.current=null
      try{capture?.abort()}catch{/* permission prompt may already have ended */}
      utterance.current=null
      interimCallback.current?.('')
      listeningCallback.current?.(false)
    }
  },[])

  useEffect(()=>{
    const synth=window.speechSynthesis
    if(!synth)return
    const refresh=()=>setVoices(synth.getVoices?.()||[])
    refresh()
    synth.addEventListener?.('voiceschanged',refresh)
    return()=>synth.removeEventListener?.('voiceschanged',refresh)
  },[])

  useEffect(()=>{
    const saved=voicePreferences[lang]||{voice:'auto',pace:'calm'}
    setVoiceChoice(saved.voice)
    setVoicePace(saved.pace)
  },[lang])

  // Changing the question or the language cancels any old speech, even mid-sentence.
  useEffect(()=>{
    window.speechSynthesis?.cancel()
    const capture=recognition.current
    recognition.current=null
    capture?.abort()
    utterance.current=null
    setSpeaking(false);setListening(false);setError('');setInterim('')
    interimCallback.current?.('')
    listeningCallback.current?.(false)
  },[text,spoken])

  // Never let an in-progress dictation write into a slide after a save begins.
  useEffect(()=>{
    if(!disabled)return
    window.speechSynthesis?.cancel()
    const capture=recognition.current
    recognition.current=null
    capture?.abort()
    utterance.current=null
    setSpeaking(false);setListening(false);setInterim('')
    interimCallback.current?.('')
    listeningCallback.current?.(false)
  },[disabled])

  function toggleVoice(){
    if(!support.tts||disabled)return
    if(speaking){
      window.speechSynthesis.cancel()
      utterance.current=null
      setSpeaking(false)
      return
    }
    try{
      const synth=window.speechSynthesis
      synth.cancel()
      const item=new window.SpeechSynthesisUtterance(String(text||'').trim())
      item.lang=spoken
      Object.assign(item,coachingSpeechProfile(voicePace))
      const available=synth.getVoices?.()||[]
      const selected=chooseCoachingVoice(available.length?available:voices,spoken,voiceChoice)
      if(selected)item.voice=selected
      setError('')
      item.onend=()=>{if(utterance.current===item){utterance.current=null;setSpeaking(false)}}
      item.onerror=()=>{if(utterance.current===item){utterance.current=null;setSpeaking(false);setError(t.audioError)}}
      utterance.current=item
      setSpeaking(true)
      synth.speak(item)
    }catch{
      utterance.current=null
      setSpeaking(false)
    }
  }

  function updateSound(key,value){
    voicePreferences[lang]={...(voicePreferences[lang]||{voice:'auto',pace:'calm'}),[key]:value}
    if(key==='voice')setVoiceChoice(value)
    else setVoicePace(value)
    window.speechSynthesis?.cancel()
    utterance.current=null
    setSpeaking(false)
  }

  function toggleMic(){
    if(disabled)return
    if(listening){
      try{recognition.current?.stop()}catch{/* the browser may have ended capture already */}
      return
    }
    if(!support.stt){setError(t.unsupported);return}
    if(!speechConsent&&!accepted.current){
      if(!window.confirm(t.notice))return
      accepted.current=true
      consentCallback.current?.()
    }
    try{
      window.speechSynthesis?.cancel()
      utterance.current=null
      setSpeaking(false)
      const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition
      const capture=new Constructor()
      capture.lang=spoken
      capture.continuous=false
      capture.interimResults=true
      capture.maxAlternatives=1
      let emitted=''
      capture.onresult=event=>{
        if(recognition.current!==capture)return
        const {final,delta,interim:temporary}=speechResultSegments(event.results,emitted)
        if(final)emitted=final
        if(delta)savedCallback.current?.(delta)
        setInterim(temporary)
        interimCallback.current?.(temporary)
      }
      capture.onerror=()=>{
        if(recognition.current!==capture)return
        recognition.current=null
        try{capture.abort()}catch{/* permission may already be denied */}
        setListening(false);setInterim('')
        interimCallback.current?.('')
        listeningCallback.current?.(false)
        setError(t.error)
      }
      capture.onend=()=>{
        if(recognition.current!==capture)return
        recognition.current=null
        setListening(false);setInterim('')
        interimCallback.current?.('')
        listeningCallback.current?.(false)
      }
      recognition.current=capture
      setError('');setInterim('')
      capture.start()
      setListening(true)
      listeningCallback.current?.(true)
    }catch{
      recognition.current=null
      setListening(false)
      listeningCallback.current?.(false)
      setError(t.error)
    }
  }

  return <div className={styles.voice} data-tradition-voice data-coaching-question-voice>
    <div className={styles.voiceActions}>
      {support.tts?<button type="button" disabled={disabled} onClick={toggleVoice}
        aria-label={speaking?t.stop:t.listen} aria-pressed={speaking}>
        {speaking?<VolumeX size={18}/>:<Volume2 size={18}/>} {speaking?t.stop:t.listen}
      </button>:<small>{t.unavailable}</small>}
      {support.stt&&<button type="button" disabled={disabled} onClick={toggleMic}
        aria-label={listening?t.stopMic:mode==='answer'?t.micAnswer:t.micNote} aria-pressed={listening}>
        {listening?<MicOff size={18}/>:<Mic size={18}/>} {listening?t.stopMic:mode==='answer'?t.micAnswer:t.micNote}
      </button>}
    </div>
    {support.tts&&<>
      <button type="button" className={styles.voiceSettingsToggle} aria-expanded={voicePanel}
        aria-controls={soundPanelId} onClick={()=>{setVoices(window.speechSynthesis?.getVoices?.()||[]);setVoicePanel(open=>!open)}}>
        {t.voiceSettings}
      </button>
      {voicePanel&&<div id={soundPanelId} className={styles.voiceSettingsPanel}>
        <label>{t.voiceLabel}
          <select value={voiceChoice} onChange={event=>updateSound('voice',event.target.value)}>
            <option value="auto">{t.voiceAuto}</option>
            {coachingLocalVoices(voices,spoken).map((voice,index)=><option
              key={(voice.voiceURI||voice.name)+index} value={voice.voiceURI||'name:'+voice.name}>
              {voice.name} ({voice.lang})
            </option>)}
          </select>
        </label>
        <label>{t.paceLabel}
          <select value={voicePace} onChange={event=>updateSound('pace',event.target.value)}>
            <option value="calm">{t.paceCalm}</option>
            <option value="clear">{t.paceClear}</option>
          </select>
        </label>
        <small>{coachingLocalVoices(voices,spoken).length?t.voiceLimit:t.noVoiceChoices}</small>
      </div>}
    </>}
    <small role="status" aria-live="polite">{listening?t.hearing:!support.stt?t.unsupported:t.device}</small>
    {interim&&<small className={styles.voiceInterim} aria-live="polite">{t.interim}: {interim}</small>}
    {error&&<small role="alert" className={styles.voiceError}>{error}</small>}
  </div>
}
