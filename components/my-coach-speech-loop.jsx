'use client'

import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {Mic,MicOff,Volume2} from 'lucide-react'
import styles from './my-coach-speech-loop.module.css'

const langs={en:'en-GB',ru:'ru-RU',es:'es-ES'}
const words={
  en:{start:'Talk by voice',stop:'Stop voice',listening:'Listening…',thinking:'Coach is thinking…',speaking:'Coach is speaking…',
    unsupported:'Voice recognition is unavailable in this browser. Try opening this page in Safari, or type your message.',blocked:'Microphone denied. Check Safari/browser permissions.',
    short:'I did not catch that. Tap the microphone to try again.',review:'Voice saved as a draft. Review and send it below.',restart:'Tap the microphone for the next turn.',
    failed:'Could not complete this voice turn. Please try again or type.',
    privacy:'Microphone audio may be processed by your browser’s speech-recognition provider. We do not store recordings. Press Stop at any time.'},
  ru:{start:'Говорить голосом',stop:'Остановить голос',listening:'Слушаю…',thinking:'Коуч думает…',speaking:'Коуч говорит…',
    unsupported:'Голосовой ввод недоступен в этом браузере. Попробуйте открыть страницу в Safari или написать сообщение.',
    blocked:'Доступ к микрофону запрещён. Разрешите его в Safari или настройках браузера.',
    short:'Не удалось разобрать фразу. Нажмите микрофон ещё раз.',review:'Слова сохранены в поле ввода. Проверьте и отправьте.',restart:'Нажмите микрофон для следующей реплики.',
    failed:'Голосовой ответ недоступен. Попробуйте ещё раз или напишите сообщение.',
    privacy:'Браузер может передавать аудио поставщику распознавания речи. Мы не сохраняем записи. Разговор можно остановить в любой момент.'},
  es:{start:'Hablar por voz',stop:'Detener voz',listening:'Escuchando…',thinking:'El coach piensa…',speaking:'El coach habla…',
    unsupported:'El reconocimiento de voz no está disponible aquí. Prueba abrir la página en Safari o escribe tu mensaje.',
    blocked:'Micrófono bloqueado. Actívalo en Safari o en los ajustes del navegador.',
    short:'No entendí la frase. Toca el micrófono otra vez.',review:'Palabras guardadas en el borrador. Revisa y envía abajo.',restart:'Toca el micrófono para continuar.',
    failed:'No se pudo completar el turno de voz. Inténtalo de nuevo o escribe.',
    privacy:'El navegador puede enviar audio al proveedor de reconocimiento. No almacenamos grabaciones. Detén la conversación cuando quieras.'},
}

const MyCoachSpeechLoop=forwardRef(function MyCoachSpeechLoop({locale='en',enabled=false,canStart=true,onTurn,onCancelTurn,onVoiceStateChange,onRequestConsent,onTranscript,onDraft},ref){
  const lang=words[locale]?locale:'en',t=words[lang]
  const [phase,setPhase]=useState('idle')
  const [notice,setNotice]=useState('')
  const [supported,setSupported]=useState(null)
  const phaseRef=useRef('idle')
  const activeRef=useRef(false)
  const recognitionRef=useRef(null)
  const speakingRef=useRef(false)
  const generationRef=useRef(0)
  const turnRef=useRef(onTurn),cancelRef=useRef(onCancelTurn),stopRef=useRef(null)
  const voiceStateRef=useRef(onVoiceStateChange)
  const beatRef=useRef(0)
  const heardRef=useRef('')
  const transcriptRef=useRef(onTranscript),draftRef=useRef(onDraft)
  transcriptRef.current=onTranscript
  draftRef.current=onDraft
  turnRef.current=onTurn
  cancelRef.current=onCancelTurn
  voiceStateRef.current=onVoiceStateChange

  function changePhase(next){
    phaseRef.current=next
    if(next!=='speaking')beatRef.current=0
    setPhase(next)
    voiceStateRef.current?.({phase:next,beat:beatRef.current})
  }
  function silence(){
    activeRef.current=false
    generationRef.current+=1
    const recognition=recognitionRef.current
    recognitionRef.current=null
    if(recognition){
      recognition.onresult=null;recognition.onerror=null;recognition.onend=null
      try{recognition.abort()}catch{}
    }
    if(speakingRef.current){
      speakingRef.current=false
      try{window.speechSynthesis?.cancel()}catch{}
    }
  }
  function stopVoice(){
    const cancelTurn=phaseRef.current==='thinking'
    if(phaseRef.current==='listening'&&heardRef.current.trim().length>=3){
      draftRef.current?.(heardRef.current.trim())
      setNotice(t.review)
    }else setNotice('')
    heardRef.current=''
    transcriptRef.current?.('')
    silence()
    if(cancelTurn)cancelRef.current?.()
    changePhase('idle')
  }
  stopRef.current=stopVoice
  useImperativeHandle(ref,()=>({
    startWithConsent(){
      if(activeRef.current||!canStart)return
      activeRef.current=true
      generationRef.current+=1
      startListening()
    },
  }))
  useEffect(()=>{
    setSupported(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition))
    const onHidden=()=>{if(document.visibilityState==='hidden')stopRef.current?.()}
    document.addEventListener('visibilitychange',onHidden)
    return ()=>{
      document.removeEventListener('visibilitychange',onHidden)
      stopRef.current?.()
    }
  },[])
  useEffect(()=>{
    if(!enabled&&activeRef.current)stopRef.current?.()
  },[enabled])

  function startListening(){
    if(!activeRef.current)return
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!Recognition){setSupported(false);stopVoice();setNotice(t.unsupported);return}
    const recognition=new Recognition()
    recognitionRef.current=recognition
    recognition.lang=langs[lang]
    recognition.continuous=false
    recognition.interimResults=true
    recognition.maxAlternatives=1
    let finished=''
    heardRef.current=''
    transcriptRef.current?.('')
    changePhase('listening')
    setNotice('')
    recognition.onresult=event=>{
      if(recognitionRef.current!==recognition||!activeRef.current)return
      const rows=Array.from(event.results||[])
      const final=rows.filter(row=>row.isFinal).map(row=>row[0]?.transcript||'').join(' ').trim()
      const interim=rows.filter(row=>!row.isFinal).map(row=>row[0]?.transcript||'').join(' ').trim()
      heardRef.current=(final||interim).slice(0,1200)
      transcriptRef.current?.(heardRef.current)
      if(final){finished=final;try{recognition.stop()}catch{}}
      setNotice((final||interim).slice(0,240))
    }
    recognition.onerror=event=>{
      if(recognitionRef.current!==recognition)return
      recognitionRef.current=null
      if(event.error==='aborted'&&!activeRef.current)return
      if(heardRef.current.trim().length>=3)draftRef.current?.(heardRef.current.trim())
      heardRef.current=''
      transcriptRef.current?.('')
      silence();changePhase('idle')
      setNotice(['not-allowed','service-not-allowed'].includes(event.error)?t.blocked:t.restart)
    }
    recognition.onend=()=>{
      if(recognitionRef.current!==recognition)return
      recognitionRef.current=null
      if(!activeRef.current)return
      if(finished.length>=3)void deliver(finished)
      else{
        const recovered=heardRef.current.trim()
        if(recovered.length>=3)draftRef.current?.(recovered)
        transcriptRef.current?.('')
        heardRef.current=''
        silence();changePhase('idle');setNotice(recovered.length>=3?t.review:t.short)
      }
    }
    try{recognition.start()}
    catch{recognitionRef.current=null;silence();changePhase('idle');setNotice(t.restart)}
  }

  async function deliver(text){
    const generation=generationRef.current
    changePhase('thinking')
    let result
    try{result=await turnRef.current?.(text)}
    catch{result=null}
    if(!activeRef.current||generationRef.current!==generation)return
    if(!result?.reply){
      draftRef.current?.(text)
      transcriptRef.current?.('')
      silence();changePhase('idle');setNotice(t.failed);return
    }
    heardRef.current=''
    transcriptRef.current?.('')
    const speech=window.speechSynthesis
    if(!speech||!window.SpeechSynthesisUtterance){
      silence();changePhase('idle');setNotice(t.restart);return
    }
    const utterance=new window.SpeechSynthesisUtterance(result.reply.slice(0,900))
    utterance.lang=langs[lang]
    utterance.rate=0.97
    const voices=speech.getVoices?.()||[]
    const preferred=voices.find(voice=>voice.lang?.toLowerCase()===langs[lang].toLowerCase())
      ||voices.find(voice=>voice.lang?.toLowerCase().startsWith(lang+'-'))
    if(preferred)utterance.voice=preferred
    // Only a real browser speech onstart changes the avatar into speaking.
    // Queuing speech must not animate the mouth before audio starts.
    utterance.onstart=()=>{if(activeRef.current&&generationRef.current===generation)changePhase('speaking')}
    utterance.onboundary=event=>{
      if(!activeRef.current||generationRef.current!==generation||phaseRef.current!=='speaking')return
      if(event.name&&event.name!=='word'&&event.name!=='sentence')return
      beatRef.current+=1
      voiceStateRef.current?.({phase:'speaking',beat:beatRef.current})
    }
    utterance.onend=()=>{
      speakingRef.current=false
      if(!activeRef.current||generationRef.current!==generation)return
      if(result.mode==='safety'||result.mode==='boundary'){
        silence();changePhase('idle');return
      }
      startListening()
    }
    utterance.onerror=()=>{
      if(!activeRef.current||generationRef.current!==generation)return
      speakingRef.current=false
      silence();changePhase('idle');setNotice(t.restart)
    }
    try{
      speech.cancel()
      speakingRef.current=true
      speech.speak(utterance)
    }catch{speakingRef.current=false;silence();changePhase('idle');setNotice(t.restart)}
  }

  function toggle(){
    if(activeRef.current){stopVoice();return}
    if(!canStart)return
    if(supported===false){setNotice(t.unsupported);return}
    if(!enabled){onRequestConsent?.();return}
    activeRef.current=true
    generationRef.current+=1
    startListening()
  }

  const active=phase!=='idle'
  return <div className={styles.root} data-my-coach-voice={phase}>
    <button type="button" className={styles.button}
      onClick={toggle} disabled={!active&&!canStart}
      aria-pressed={active} aria-label={active?t.stop:t.start}>
      {active?<MicOff size={19} aria-hidden="true"/>:<Mic size={19} aria-hidden="true"/>}
      <span>{active?t.stop:t.start}</span>
      {phase==='speaking'&&<Volume2 size={17} aria-hidden="true"/>}
    </button>
    {supported===false&&<p className={styles.note} role="status">{t.unsupported}</p>}
    {active&&<span className={styles.status} role="status">
      {phase==='listening'?t.listening:phase==='thinking'?t.thinking:t.speaking}
    </span>}
    {notice&&<p className={styles.note} role="status">{notice}</p>}
    <p className={styles.privacy} data-my-coach-voice-privacy>{t.privacy}</p>
  </div>
})

export default MyCoachSpeechLoop
