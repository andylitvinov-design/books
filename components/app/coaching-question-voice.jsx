'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import styles from './tradition-coaching.module.css'

const copy={
  en:{listen:'Listen to question',stop:'Stop voice',mic:'Dictate my note',stopMic:'Stop listening',unsupported:'Use the microphone on your keyboard for dictation.',notice:'Your browser/OS may send speech to its recognition service. No raw audio is saved by Holistic House. Continue?',error:'Speech recognition unavailable. You can type your answer.',hearing:'Listening…',device:'Device-generated voice, not an Andrey recording.'},
  ru:{listen:'Прослушать вопрос',stop:'Остановить озвучку',mic:'Продиктовать уточнение',stopMic:'Остановить микрофон',unsupported:'Для диктовки можно использовать микрофон клавиатуры.',notice:'Браузер или ОС могут отправлять речь в сервис распознавания. Holistic House не сохраняет аудио. Продолжить?',error:'Распознавание речи недоступно. Можно напечатать ответ.',hearing:'Слушаю…',device:'Системный голос устройства, не запись Андрея.'},
  es:{listen:'Escuchar pregunta',stop:'Detener voz',mic:'Dictar nota',stopMic:'Detener micrófono',unsupported:'Puedes usar el micrófono del teclado para dictar.',notice:'El navegador o SO puede enviar voz a su servicio de reconocimiento. Holistic House no guarda audio. ¿Continuar?',error:'Reconocimiento no disponible. Puedes escribir.',hearing:'Escuchando…',device:'Voz generada por el dispositivo; no es la voz de Andrey.'},
}
export default function CoachingQuestionVoice({text,locale='en',onTranscript,disabled=false}){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  const t=copy[lang]
  const spoken=lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-US'
  const [speaking,setSpeaking]=useState(false)
  const [listening,setListening]=useState(false)
  const [support,setSupport]=useState({tts:false,stt:false})
  const [error,setError]=useState('')
  const utterance=useRef(null)
  const recognition=useRef(null)
  const savedCallback=useRef(onTranscript)
  savedCallback.current=onTranscript

  useEffect(()=>{
    setSupport({
      tts:typeof window!=='undefined' && !!window.speechSynthesis && !!window.SpeechSynthesisUtterance,
      stt:typeof window!=='undefined' && !!(window.SpeechRecognition||window.webkitSpeechRecognition),
    })
    const stopHidden=()=>{if(document.hidden){window.speechSynthesis?.cancel();recognition.current?.abort();recognition.current=null;utterance.current=null;setSpeaking(false);setListening(false)}}
    document.addEventListener('visibilitychange',stopHidden)
    return ()=>{document.removeEventListener('visibilitychange',stopHidden);window.speechSynthesis?.cancel();recognition.current?.abort();recognition.current=null;utterance.current=null}
  },[])
  useEffect(()=>{
    window.speechSynthesis?.cancel()
    recognition.current?.abort();recognition.current=null
    utterance.current=null
    setSpeaking(false);setListening(false);setError('')
  },[text,spoken])
  function toggleVoice(){
    if(!support.tts||disabled)return
    if(speaking){window.speechSynthesis.cancel();utterance.current=null;setSpeaking(false);return}
    if(recognition.current){recognition.current.abort();recognition.current=null;setListening(false)}
    try{
      const synth=window.speechSynthesis
      synth.cancel()
      const item=new window.SpeechSynthesisUtterance(String(text||''))
      item.lang=spoken;item.rate=.9
      const voices=synth.getVoices()
      item.voice=voices.find(v=>v.lang?.toLowerCase().startsWith(lang)&&v.localService)||voices.find(v=>v.lang?.toLowerCase().startsWith(lang))||null
      item.onend=()=>{if(utterance.current===item){utterance.current=null;setSpeaking(false)}}
      item.onerror=()=>{if(utterance.current===item){utterance.current=null;setSpeaking(false)}}
      utterance.current=item;setSpeaking(true);synth.speak(item)
    }catch{setSpeaking(false)}
  }
  function toggleMic(){
    if(disabled)return
    if(listening){recognition.current?.stop();return}
    if(!support.stt){setError(t.unsupported);return}
    if(!window.confirm(t.notice))return
    if(utterance.current){window.speechSynthesis.cancel();utterance.current=null;setSpeaking(false)}
    try{
      const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition
      const capture=new Constructor()
      capture.lang=spoken;capture.continuous=false;capture.interimResults=false;capture.maxAlternatives=1
      capture.onresult=e=>{
        // An old question's late recognition callback must never replace the next slide's answer.
        if(recognition.current!==capture)return
        const value=Array.from(e.results||[]).filter(r=>r.isFinal).map(r=>r[0]?.transcript||'').join(' ').trim()
        if(value)savedCallback.current?.(value)
      }
      capture.onerror=()=>{if(recognition.current===capture)setError(t.error)}
      capture.onend=()=>{if(recognition.current===capture){recognition.current=null;setListening(false)}}
      recognition.current=capture;setError('');capture.start();setListening(true)
    }catch{recognition.current=null;setListening(false);setError(t.error)}
  }
  return <div className={styles.voice} data-tradition-voice>
    <div className={styles.voiceActions}>
      {support.tts&&<button type="button" disabled={disabled} onClick={toggleVoice} aria-label={speaking?t.stop:t.listen}>
        {speaking?<VolumeX size={18}/>:<Volume2 size={18}/>} {speaking?t.stop:t.listen}
      </button>}
      <button type="button" disabled={disabled} onClick={toggleMic} aria-label={listening?t.stopMic:t.mic}>
        {listening?<MicOff size={18}/>:<Mic size={18}/>} {listening?t.stopMic:t.mic}
      </button>
    </div>
    <small>{listening?t.hearing:!support.stt?t.unsupported:t.device}</small>
    {error&&<small role="status" className={styles.voiceError}>{error}</small>}
  </div>
}
