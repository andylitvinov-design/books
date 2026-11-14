'use client'

import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {Mic,MicOff,Volume2} from 'lucide-react'
import styles from './my-coach-speech-loop.module.css'
import {appendSpokenAnswer} from '@/lib/personal-coaching/speech-text.js'
import {chooseDictationLanguage,readDictationResults,detectedSpeechLocale,ios27NeedsSpeechRecovery} from '@/lib/personal-coaching/my-coach-dictation.mjs'
import {startCoachingMp3Playback} from '@/lib/personal-coaching/streamed-mp3-playback.mjs'

const speechLanguages={en:'en-GB',ru:'ru-RU',es:'es-ES'}

const words={
  en:{start:'Talk by voice',stop:'Stop voice',retryMic:'Retry microphone',listening:'Listening…',thinking:'Coach is thinking…',speaking:'Coach is speaking…',
    network:'Browser speech service is offline. Your words remain editable below.',noMicrophone:'No microphone found. Check device permissions.',language:'Browser speech does not support this language. Choose EN or RU.',
    unsupported:'Voice recognition is unavailable in this browser. Try opening this page in Safari, or type your message.',blocked:'Microphone denied. Check Safari/browser permissions.',
    short:'I did not catch that. Tap the microphone to try again.',review:'Voice saved as a draft. Review and send it below.',restart:'Tap the microphone for the next turn.',
    failed:'Could not complete this voice turn. Please try again or type.',
    privacy:'Microphone audio may be processed by your browser’s speech-recognition provider. We do not store recordings. Press Stop at any time.',
    fallback:'Natural voice unavailable. The coach question stays visible.',tapToHear:'Tap to hear the coach',preparing:'Preparing voice…',
    iosCue:'Ready to listen.',iosPreparing:'Preparing iPhone microphone…',iosSilent:'Safari may not be hearing. Your draft is editable; try again or reopen Safari.'},
  ru:{start:'Говорить голосом',stop:'Остановить голос',retryMic:'Перезапустить микрофон',listening:'Слушаю…',thinking:'Коуч думает…',speaking:'Коуч говорит…',
    network:'Распознавание браузера недоступно. Ваши слова остаются в поле ответа.',noMicrophone:'Микрофон не найден. Проверьте настройки устройства.',language:'Браузер не поддерживает этот язык. Выберите RU или EN.',
    unsupported:'Голосовой ввод недоступен в этом браузере. Попробуйте открыть страницу в Safari или написать сообщение.',
    blocked:'Доступ к микрофону запрещён. Разрешите его в Safari или настройках браузера.',
    short:'Не удалось разобрать фразу. Нажмите микрофон ещё раз.',review:'Слова сохранены в поле ввода. Проверьте и отправьте.',restart:'Нажмите микрофон для следующей реплики.',
    failed:'Голосовой ответ недоступен. Попробуйте ещё раз или напишите сообщение.',
    privacy:'Браузер может передавать аудио поставщику распознавания речи. Мы не сохраняем записи. Разговор можно остановить в любой момент.',
    fallback:'Естественный голос недоступен. Вопрос остаётся на экране.',tapToHear:'Нажмите, чтобы услышать коуча',preparing:'Готовлю голос…',
    iosCue:'Я вас слушаю.',iosPreparing:'Подготавливаю микрофон iPhone…',iosSilent:'Safari может не слышать речь. Текст можно отредактировать; попробуйте ещё раз или перезапустите Safari.'},
  es:{start:'Hablar por voz',stop:'Detener voz',retryMic:'Reiniciar micrófono',listening:'Escuchando…',thinking:'El coach piensa…',speaking:'El coach habla…',
    network:'El reconocimiento del navegador no está disponible. El texto dictado sigue abajo.',noMicrophone:'No se encontró un micrófono. Comprueba los permisos.',language:'El navegador no reconoce este idioma. Elige EN o RU.',
    unsupported:'El reconocimiento de voz no está disponible aquí. Prueba abrir la página en Safari o escribe tu mensaje.',
    blocked:'Micrófono bloqueado. Actívalo en Safari o en los ajustes del navegador.',
    short:'No entendí la frase. Toca el micrófono otra vez.',review:'Palabras guardadas en el borrador. Revisa y envía abajo.',restart:'Toca el micrófono para continuar.',
    failed:'No se pudo completar el turno de voz. Inténtalo de nuevo o escribe.',
    privacy:'El navegador puede enviar audio al proveedor de reconocimiento. No almacenamos grabaciones. Detén la conversación cuando quieras.',
    fallback:'La voz natural no está disponible. La pregunta sigue en pantalla.',tapToHear:'Toca para escuchar al coach',preparing:'Preparando voz…',
    iosCue:'Te escucho ahora.',iosPreparing:'Preparando el micrófono del iPhone…',iosSilent:'Safari puede haber dejado de escuchar. Tu texto se puede editar; prueba de nuevo o reinicia Safari.'},
}

const MyCoachSpeechLoop=forwardRef(function MyCoachSpeechLoop({locale='en',speechLocale='auto',initialDraft='',enabled=false,canStart=true,cloudAvailable=false,cloudAgreed=false,cloudProvider=null,personaId='mira',wizardVoice=false,onTurn,onCancelTurn,onVoiceStateChange,onRequestConsent,onTranscript,onDraft},ref){
  const lang=words[locale]?locale:'en',t=words[lang]
  const [phase,setPhase]=useState('idle')
  const [notice,setNotice]=useState('')
  const [supported,setSupported]=useState(null)
  const [micStalled,setMicStalled]=useState(false)
  const phaseRef=useRef('idle')
  const activeRef=useRef(false)
  const recognitionRef=useRef(null)
  const cloudControllerRef=useRef(null)
  const cloudPlayerRef=useRef(null)
  const speakingRef=useRef(false)
  const speechTimerRef=useRef(null),blockedResumeRef=useRef(null),utteranceRef=useRef(null)
  const iosCueTimerRef=useRef(null)
  const iosResultTimerRef=useRef(null)
  const hasRecognizedRef=useRef(false)
  const iosCueSatisfiedRef=useRef(false)
  const generationRef=useRef(0)
  const turnRef=useRef(onTurn),cancelRef=useRef(onCancelTurn),stopRef=useRef(null)
  const voiceStateRef=useRef(onVoiceStateChange)
  const beatRef=useRef(0)
  const heardRef=useRef('')
  const lastHeardRef=useRef('')
  const draftAtStartRef=useRef('')
  const currentDraftRef=useRef(initialDraft)
  currentDraftRef.current=initialDraft
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
    if(speechTimerRef.current)clearTimeout(speechTimerRef.current)
    speechTimerRef.current=null;blockedResumeRef.current=null;utteranceRef.current=null
    if(iosCueTimerRef.current)clearTimeout(iosCueTimerRef.current)
    if(iosResultTimerRef.current)clearTimeout(iosResultTimerRef.current)
    iosCueTimerRef.current=null
    iosResultTimerRef.current=null
    iosCueSatisfiedRef.current=false
    cloudControllerRef.current?.abort()
    cloudControllerRef.current=null
    cloudPlayerRef.current?.cancel()
    cloudPlayerRef.current=null
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
    setMicStalled(false)
    const cancelTurn=phaseRef.current==='thinking'
    if(['starting','listening'].includes(phaseRef.current)&&heardRef.current.trim().length>=3){
      draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,heardRef.current.trim(),1200))
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
  useEffect(()=>{
    if((!cloudAgreed||!cloudAvailable)&&(cloudControllerRef.current||cloudPlayerRef.current))
      stopRef.current?.()
  },[cloudAgreed,cloudAvailable])

  function startListening(){
    if(!activeRef.current)return
    setMicStalled(false)
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
    const ios27=ios27NeedsSpeechRecovery(window.navigator)
    if(!Recognition){setSupported(false);stopVoice();setNotice(t.unsupported);return}
    const recognition=new Recognition()
    recognitionRef.current=recognition
    recognition.lang=chooseDictationLanguage({locale:lang,selection:speechLocale,
      browserLanguages:window.navigator.languages?.length?window.navigator.languages:[window.navigator.language],
      lastTranscript:lastHeardRef.current})
    recognition.continuous=false
    recognition.interimResults=true
    recognition.maxAlternatives=1
    let finished=''
    draftAtStartRef.current=currentDraftRef.current.trim()
    heardRef.current=''
    transcriptRef.current?.('')
    changePhase('starting')
    setNotice('')
    recognition.onstart=()=>{
      if(recognitionRef.current!==recognition||!activeRef.current)return
      changePhase('listening')
      if(ios27){
        if(iosResultTimerRef.current)clearTimeout(iosResultTimerRef.current)
        iosResultTimerRef.current=setTimeout(()=>{
          if(recognitionRef.current===recognition&&activeRef.current&&!heardRef.current.trim()){
            setMicStalled(true)
            changePhase('stalled')
            setNotice(t.iosSilent)
          }
        },9000)
      }
    }
    recognition.onresult=event=>{
      if(recognitionRef.current!==recognition||!activeRef.current)return
      setMicStalled(false)
      if(['starting','stalled'].includes(phaseRef.current))changePhase('listening')
      if(iosResultTimerRef.current){clearTimeout(iosResultTimerRef.current);iosResultTimerRef.current=null}
      const {final,interim,visible}=readDictationResults(event.results,1200)
      heardRef.current=visible
      transcriptRef.current?.(visible)
      // Safari interim words are editable even without a later final event.
      if(visible)draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,visible,1200))
      if(final){
        // Preserve interim words following a final segment in the same Safari event.
        finished=visible
        lastHeardRef.current=finished
        // iOS 27 Safari can become deaf after an explicit stop(). Let this
        // continuous=false recognizer finish naturally after its final result.
        if(!ios27)try{recognition.stop()}catch{}
      }
      // Dictation is shown in the transcript, never echoed beneath the microphone.
      if(visible||interim)setNotice('')
    }
    recognition.onerror=event=>{
      if(recognitionRef.current!==recognition)return
      setMicStalled(false)
      recognitionRef.current=null
      if(event.error==='aborted'&&!activeRef.current)return
      if(heardRef.current.trim().length>=3)draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,heardRef.current.trim(),1200))
      heardRef.current=''
      transcriptRef.current?.('')
      silence();changePhase('idle')
      setNotice(['not-allowed','service-not-allowed'].includes(event.error)?t.blocked:
        event.error==='network'?t.network:event.error==='audio-capture'?t.noMicrophone:
        event.error==='language-not-supported'?t.language:t.restart)
    }
    recognition.onend=()=>{
      if(iosResultTimerRef.current){clearTimeout(iosResultTimerRef.current);iosResultTimerRef.current=null}
      if(recognitionRef.current!==recognition)return
      recognitionRef.current=null
      if(!activeRef.current)return
      setMicStalled(false)
      if(finished.length>=3)void deliver(appendSpokenAnswer(draftAtStartRef.current,finished,1200))
      else{
        const recovered=heardRef.current.trim()
        if(recovered.length>=3){
          // Safari sometimes ends after interim words without a final event.
          // A natural recognizer end commits that one turn; Stop/error never do.
          lastHeardRef.current=recovered
          void deliver(appendSpokenAnswer(draftAtStartRef.current,recovered,1200))
        }else{
          transcriptRef.current?.('')
          heardRef.current=''
          silence();changePhase('idle');setNotice(t.short)
        }
      }
    }
    const startRecognition=()=>{
      if(recognitionRef.current!==recognition||!activeRef.current)return
      try{recognition.start();hasRecognizedRef.current=true}
      catch{recognitionRef.current=null;silence();changePhase('idle');setNotice(t.restart)}
    }
    iosCueSatisfiedRef.current=false
    // WebKit #321436: even after coach device/Fish speech, every iOS 27
    // follow-up recognizer gets its own completed short voice cue.
    // Never stop a recognizer with useful interim words before natural onend.
    if(ios27&&hasRecognizedRef.current&&
       window.speechSynthesis?.speak&&window.SpeechSynthesisUtterance){
      const cue=new window.SpeechSynthesisUtterance(t.iosCue)
      cue.lang=recognition.lang
      cue.rate=1.05
      let completed=false
      const finishCue=()=>{
        if(completed)return
        completed=true
        if(iosCueTimerRef.current)clearTimeout(iosCueTimerRef.current)
        iosCueTimerRef.current=null
        speakingRef.current=false
        setNotice('')
        startRecognition()
      }
      cue.onend=finishCue
      cue.onerror=finishCue
      try{
        window.speechSynthesis.cancel()
        speakingRef.current=true
        iosCueTimerRef.current=setTimeout(()=>{
          try{window.speechSynthesis.cancel()}catch{}
          finishCue()
        },4000)
        window.speechSynthesis.speak(cue)
        setNotice(t.iosPreparing)
      }catch{finishCue()}
      return
    }
    startRecognition()
  }

  async function deliver(text){
    const generation=generationRef.current
    setNotice('') // Clear the old user transcript before coach speech.
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
    changePhase('loading') // Reply is ready; synthesis is pending, not model thinking.
    const reply=String(result.reply).slice(0,900)
    // Speak the final focused question rather than forwarding long personal reflections.
    const questions=reply.match(/[^.!?\n]+[?？]/gu)||[]
    const speakable=(questions.slice().reverse().find(item=>item.trim().length<=500)||
      reply.slice(0,500)).trim()
    const replyLocale=detectedSpeechLocale(reply,detectedSpeechLocale(text,lang))
    const live=()=>activeRef.current&&generationRef.current===generation
    const afterSpeech=()=>{
      if(!live())return
      if(result.mode==='safety'||result.mode==='boundary'){
        silence();changePhase('idle');return
      }
      startListening()
    }

    function showTextOnly(){
      if(!live())return
      setNotice(t.fallback)
      silence();changePhase('idle')
    }

    function speakOnDevice(){
      if(!live())return
      const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance
      if(!synth?.speak||!Utterance){showTextOnly();return}
      const utterance=new Utterance(speakable||reply)
      utterance.lang=speechLanguages[replyLocale]||speechLanguages[lang]
      utterance.rate=wizardVoice?0.93:0.97
      utterance.pitch=wizardVoice?1.08:1
      const voices=synth.getVoices?.()||[]
      const voice=voices.find(v=>v.lang?.toLowerCase()===utterance.lang.toLowerCase())||
        voices.find(v=>v.lang?.toLowerCase().startsWith(replyLocale+'-'))
      if(voice)utterance.voice=voice
      let started=false,done=false
      const current=()=>utteranceRef.current===utterance&&live()
      const clear=()=>{if(speechTimerRef.current)clearTimeout(speechTimerRef.current);speechTimerRef.current=null}
      const retry=()=>{
        if(done||!current())return
        done=true;clear();speakingRef.current=false;utteranceRef.current=null
        blockedResumeRef.current=speakOnDevice
        changePhase('ready');setNotice(t.tapToHear)
      }
      utterance.onstart=()=>{
        if(done||!current())return
        started=true;clear();setNotice('');changePhase('speaking')
        speechTimerRef.current=setTimeout(()=>{
          if(!current()||done)return
          try{synth.cancel()}catch{}
          retry()
        },60000)
      }
      utterance.onboundary=event=>{
        if(!current()||phaseRef.current!=='speaking')return
        if(event.name&&event.name!=='word'&&event.name!=='sentence')return
        beatRef.current+=1
        voiceStateRef.current?.({phase:'speaking',beat:beatRef.current})
      }
      utterance.onend=()=>{
        if(done||!current())return
        done=true;clear();speakingRef.current=false;utteranceRef.current=null
        blockedResumeRef.current=null
        iosCueSatisfiedRef.current=ios27NeedsSpeechRecovery(window.navigator)
        afterSpeech()
      }
      utterance.onerror=retry
      try{
        synth.cancel();speakingRef.current=true;blockedResumeRef.current=null;utteranceRef.current=utterance
        setNotice('');changePhase('loading');synth.speak(utterance)
        if(!started&&!done)speechTimerRef.current=setTimeout(()=>{
          if(!current()||started||done)return
          try{synth.cancel()}catch{}
          retry()
        },3500)
      }catch{retry()}
    }

    if(cloudAgreed&&cloudAvailable&&['google_chirp3_hd','fish_free'].includes(cloudProvider)&&!['safety','boundary'].includes(result.mode)){
      const controller=new AbortController()
      cloudControllerRef.current=controller
      const fallback=()=>{
        if(!live()||controller.signal.aborted)return
        cloudPlayerRef.current?.cancel()
        cloudPlayerRef.current=null
        cloudControllerRef.current=null
        showTextOnly()
      }
      try{
        const response=await fetch('/api/app/my-coach/voice/synthesize',{
          method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({provider:cloudProvider,locale:replyLocale,personaId,
            text:cloudProvider==='google_chirp3_hd'?speakable:reply,
            voiceConsent:true,cloudVoiceConsent:true,
            ...(cloudProvider==='fish_free'?{trainingUseConsent:true}:{})}),
        })
        if(!response.ok||!response.body)throw Error('CLOUD_TTS_UNAVAILABLE')
        if(!live()||controller.signal.aborted)return
        cloudPlayerRef.current=startCoachingMp3Playback(response,{
          onStart:()=>{
            if(!live())return
            blockedResumeRef.current=null;setNotice('');changePhase('speaking')
          },
          onBlocked:()=>{
            if(!live())return
            blockedResumeRef.current=()=>{
              const player=cloudPlayerRef.current
              if(!player||!live())return
              setNotice('');changePhase('loading')
              void player.resume() // genuine user gesture; no re-fetch
            }
            changePhase('ready');setNotice(t.tapToHear)
          },
          onEnd:()=>{
            if(!live())return
            cloudControllerRef.current=null
            cloudPlayerRef.current?.cancel()
            cloudPlayerRef.current=null
            // Keep iOS 27 WebKit's established short microphone-recovery cue.
            // The MP3 playback itself is not proof that SpeechRecognition was reset.
            iosCueSatisfiedRef.current=false
            afterSpeech()
          },
          onError:fallback,
        })
        return
      }catch{fallback();return}
    }
    // Unchecked cloud consent = device-only audio, never an unconsented vendor call.
    // A failed opted-in cloud request still uses showTextOnly(), not paid fallback.
    speakOnDevice()
  }

  function toggle(){
    if(phaseRef.current==='stalled'){
      // One deliberate iPhone tap restarts a recognizer stuck with no words.
      stopVoice()
      if(!canStart||!enabled)return
      activeRef.current=true
      generationRef.current+=1
      startListening()
      return
    }
    if(phaseRef.current==='ready'&&blockedResumeRef.current){
      blockedResumeRef.current()
      return
    }
    if(activeRef.current){stopVoice();return}
    if(!canStart)return
    if(supported===false){setNotice(t.unsupported);return}
    if(!enabled){onRequestConsent?.();return}
    activeRef.current=true
    generationRef.current+=1
    startListening()
  }

  const active=phase!=='idle',ready=phase==='ready',retryMic=micStalled&&phase==='stalled'
  return <div className={styles.root} data-my-coach-voice={phase}>
    <button type="button" className={styles.button}
      onClick={toggle} disabled={!active&&!canStart}
      aria-pressed={active&&!ready} aria-label={retryMic?t.retryMic:ready?t.tapToHear:active?t.stop:t.start}>
      {ready?<Volume2 size={19} aria-hidden="true"/>:active?<MicOff size={19} aria-hidden="true"/>:<Mic size={19} aria-hidden="true"/>}
      <span>{retryMic?t.retryMic:ready?t.tapToHear:active?t.stop:t.start}</span>
      {phase==='speaking'&&<Volume2 size={17} aria-hidden="true"/>}
    </button>
    {supported===false&&!notice&&<p className={styles.note} role="status">{t.unsupported}</p>}
    {active&&!notice&&<span className={styles.status} role="status">
      {retryMic?t.retryMic:ready?t.tapToHear:phase==='loading'?t.preparing:phase==='starting'||phase==='listening'?t.listening:phase==='thinking'?t.thinking:t.speaking}
    </span>}
    {notice&&<p className={styles.note} role="status">{notice}</p>}
    <p className={styles.privacy} data-my-coach-voice-privacy>{t.privacy}</p>
  </div>
})

export default MyCoachSpeechLoop
