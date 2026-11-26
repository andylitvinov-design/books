'use client'

import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react'
import {Mic,Play,Volume2} from 'lucide-react'
import styles from './my-coach-speech-loop.module.css'
import {appendSpokenAnswer} from '@/lib/personal-coaching/speech-text.js'
import {startCoachRecordedTurn,coachRecordedSupported} from '@/lib/personal-coaching/coach-recorded-turn.mjs'
import {coachVoiceFragmentNeedsReview,coachDraftWithoutUncertainSpeech} from '@/lib/personal-coaching/coach-voice-turn-quality.mjs'
import {isCoachBargeEcho} from '@/lib/personal-coaching/coach-barge-in.mjs'
import {chooseDictationLanguage,coachSpokenTurnLocale,readDictationResults,detectedSpeechLocale,ios27NeedsSpeechRecovery,hasCoachSpokenAnswer} from '@/lib/personal-coaching/my-coach-dictation.mjs'
import {setCoachIos27AudioSession,refreshCoachIos27PlaybackRoute} from '@/lib/personal-coaching/coach-ios-audio-route.mjs'
import {startCoachingMp3Playback,primeCoachingAudioGesture,unlockCoachingAudioContext,shouldUseCoachingWebAudio} from '@/lib/personal-coaching/streamed-mp3-playback.mjs'
import {coachSpokenText} from '@/lib/coaching/coach-spoken-text.mjs'
import {coachIntroAudioPath,startDirectCoachIntroAudio} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'

const words={
  en:{start:'Talk by voice',stop:'Stop voice',retryMic:'Retry microphone',listening:'Listening…',thinking:'Coach is thinking…',speaking:'Speaking…',
    network:'Browser speech service is offline. Your words remain editable below.',noMicrophone:'No microphone detected by Safari.',captureRetry:'Restoring microphone…',captureFailed:'Safari could not activate the microphone. Check site microphone access, then tap Mic to retry.',language:'Browser speech does not support this language. Choose EN or RU.',
    unsupported:'Voice recognition is unavailable in this browser. Try opening this page in Safari, or type your message.',blocked:'Microphone denied. Check Safari/browser permissions.',
    short:'I did not catch that. Tap the microphone to try again.',review:'Voice saved as a draft. Review and send it below.',restart:'Tap the microphone for the next turn.',
    failed:'Coach could not answer. The microphone is listening again; keep talking or edit your text.',
    privacy:'Microphone audio may be processed by your browser’s speech-recognition provider. We do not store recordings. Press Stop at any time.',
    fallback:'Natural coach voice is unavailable right now. The microphone remains active; keep talking or type.',bargeManual:'Auto interrupt off · tap Mic',tapToHear:'Tap to hear the coach',preparing:'Preparing voice…',
    iosCue:'Okay.',iosPreparing:'Resetting iPhone speech input…',iosAwaitSpeech:'Microphone started; waiting for speech…',iosSilent:'iPhone Safari stopped sending speech. Use the text field or fully close and reopen Safari to reset its audio service.',iosCueFailed:'Safari could not reset speech input. Use text or restart Safari, then tap the mic again.',iosAwaitEnd:'Text ready. Waiting for Safari to finish…',audioHearing:'Voice detected…',audioTranscribing:'Transcribing your words…',audioQuiet:'Mic on · waiting for your voice.',audioNoSignal:'No mic signal. Tap Mic to retry, or use Text.',deviceFallback:'Device voice: natural coach voice temporarily unavailable.',audioUnavailable:'Speech recognition is temporarily unavailable. You can keep typing.',sttCooling:'Free voice quota reached. Retrying in about a minute; you can type.',sttQuotaStopped:'Free voice quota is still reached. Tap Mic to retry later or type.',sttRecovering:'Restoring recognition… Please repeat your last words.',sttSignIn:'Sign in again to restore voice recognition.'},
  ru:{start:'Говорить голосом',stop:'Остановить голос',retryMic:'Перезапустить микрофон',listening:'Слушаю…',thinking:'Коуч думает…',speaking:'Говорит…',
    network:'Распознавание браузера недоступно. Ваши слова остаются в поле ответа.',noMicrophone:'Safari не обнаружил микрофон.',captureRetry:'Восстанавливаю микрофон…',captureFailed:'Браузер не смог включить микрофон. Проверьте доступ к микрофону для сайта и нажмите микрофон ещё раз.',language:'Браузер не поддерживает этот язык. Выберите RU или EN.',
    unsupported:'Голосовой ввод недоступен в этом браузере. Попробуйте открыть страницу в Safari или написать сообщение.',
    blocked:'Доступ к микрофону запрещён. Разрешите его в Safari или настройках браузера.',
    short:'Не удалось разобрать фразу. Нажмите микрофон ещё раз.',review:'Слова сохранены в поле ввода. Проверьте и отправьте.',restart:'Нажмите микрофон для следующей реплики.',
    failed:'Коуч пока не смог ответить. Микрофон снова слушает; продолжайте говорить или исправьте текст.',
    privacy:'Браузер может передавать аудио поставщику распознавания речи. Мы не сохраняем записи. Разговор можно остановить в любой момент.',
    fallback:'Качественный голос коуча сейчас недоступен. Микрофон продолжает слушать; можно говорить или писать.',bargeManual:'Перебить: нажмите микрофон',tapToHear:'Нажмите, чтобы услышать коуча',preparing:'Готовлю голос…',
    iosCue:'Да.',iosPreparing:'Восстанавливаю распознавание iPhone…',iosAwaitSpeech:'Микрофон запущен, жду вашу речь…',iosSilent:'Safari на iPhone перестал передавать речь. Можно написать ответ или полностью закрыть и снова открыть Safari для сброса аудиослужбы.',iosCueFailed:'Safari не восстановил распознавание. Попробуйте текст или перезапустите Safari и снова нажмите микрофон.',iosAwaitEnd:'Текст готов. Ждём завершения Safari…',audioHearing:'Слышу голос…',audioTranscribing:'Расшифровываю ваши слова…',audioQuiet:'Микрофон включён · пока не слышу голос.',audioNoSignal:'Нет сигнала микрофона. Нажмите микрофон или ответьте текстом.',deviceFallback:'Временный голос устройства: естественный голос пока недоступен.',audioUnavailable:'Распознавание временно недоступно. Можно продолжить текстом.',sttCooling:'Лимит бесплатного распознавания. Повторю через минуту; пока можно писать.',sttQuotaStopped:'Лимит всё ещё исчерпан. Попробуйте микрофон позднее или пишите.',sttRecovering:'Восстанавливаю распознавание… Повторите последние слова.',sttSignIn:'Чтобы вернуть распознавание, войдите в аккаунт заново.'},
  es:{start:'Hablar por voz',stop:'Detener voz',retryMic:'Reiniciar micrófono',listening:'Escuchando…',thinking:'El coach piensa…',speaking:'Hablando…',
    network:'El reconocimiento del navegador no está disponible. El texto dictado sigue abajo.',noMicrophone:'Safari no detectó ningún micrófono.',captureRetry:'Restaurando micrófono…',captureFailed:'Safari no pudo activar el micrófono. Revisa los permisos del sitio y vuelve a tocar el micrófono.',language:'El navegador no reconoce este idioma. Elige EN o RU.',
    unsupported:'El reconocimiento de voz no está disponible aquí. Prueba abrir la página en Safari o escribe tu mensaje.',
    blocked:'Micrófono bloqueado. Actívalo en Safari o en los ajustes del navegador.',
    short:'No entendí la frase. Toca el micrófono otra vez.',review:'Palabras guardadas en el borrador. Revisa y envía abajo.',restart:'Toca el micrófono para continuar.',
    failed:'El coach no pudo responder. El micrófono vuelve a escuchar; sigue hablando o edita el texto.',
    privacy:'El navegador puede enviar audio al proveedor de reconocimiento. No almacenamos grabaciones. Detén la conversación cuando quieras.',
    fallback:'La voz natural del coach no está disponible. El micrófono sigue activo; puedes hablar o escribir.',bargeManual:'Pulsa Mic para interrumpir',tapToHear:'Toca para escuchar al coach',preparing:'Preparando voz…',
    iosCue:'Sí.',iosPreparing:'Restableciendo el reconocimiento del iPhone…',iosAwaitSpeech:'Micrófono iniciado; esperando tu voz…',iosSilent:'Safari en iPhone dejó de entregar voz. Puedes escribir o cerrar completamente Safari y volver a abrirlo para restablecer el audio.',iosCueFailed:'Safari no pudo restablecer el reconocimiento. Escribe o reinicia Safari antes de volver a tocar el micrófono.',iosAwaitEnd:'Texto listo. Esperando el final de Safari…',audioHearing:'Voz detectada…',audioTranscribing:'Transcribiendo tu voz…',audioQuiet:'Micrófono activo · esperando tu voz.',audioNoSignal:'Sin señal de audio. Reintenta con Mic o escribe.',deviceFallback:'Voz temporal del dispositivo: voz natural no disponible.',audioUnavailable:'El reconocimiento está temporalmente no disponible. Puedes escribir.',sttCooling:'Cuota gratuita agotada. Reintentaré en un minuto; puedes escribir.',sttQuotaStopped:'Cuota aún agotada. Reintenta con Mic más tarde o escribe.',sttRecovering:'Restableciendo el reconocimiento… Repite lo último.',sttSignIn:'Inicia sesión de nuevo para recuperar el reconocimiento.'},
}

const MyCoachSpeechLoop=forwardRef(function MyCoachSpeechLoop({locale='en',speechLocale='auto',initialDraft='',enabled=false,canStart=true,cloudAvailable=false,cloudAgreed=false,cloudProvider=null,voiceName=null,personaId='mira',introduction='',onSessionStart,onTurn,onCancelTurn,onCoachInterrupted,onVoiceStateChange,onVoiceLevel,onMicLevel,onRequestConsent,onTranscript,onDraft},ref){
  const lang=words[locale]?locale:'en',t=words[lang]
  const [phase,setPhase]=useState('idle')
  const [notice,setNotice]=useState('')
  const [supported,setSupported]=useState(null)
  const phaseRef=useRef('idle'),introStartedRef=useRef(false),pauseRef=useRef(null)
  const activeRef=useRef(false)
  const recognitionRef=useRef(null),recordedTurnRef=useRef(null)
  const retryTimerRef=useRef(null),settleTimerRef=useRef(null),retryAttemptsRef=useRef(0)
  // Web Speech callbacks created on first Play must use fresh provider/consent
  // state on each turn; a closure over Play-time props can silence turn two.
  const voiceConfigRef=useRef({cloudAgreed,cloudAvailable,cloudProvider,voiceName})
  voiceConfigRef.current={cloudAgreed,cloudAvailable,cloudProvider,voiceName}
  // Read the CURRENT dropdown on every recognizer turn, not the first Play render.
  const speechLocaleRef=useRef(speechLocale)
  speechLocaleRef.current=speechLocale
  const priorSpeechLocaleRef=useRef(speechLocale)
  const selectionAtRecognitionRef=useRef(speechLocale)
  const recognizedLanguageRef=useRef('en-GB')
  // A provider change must cancel only the in-flight TTS, not the voice session.
  const providerUnavailableRef=useRef(null)
  // Shared Whisper quota exhaustion must not terminate this one-Play session.
  const uncertainSpeechDraftRef=useRef(null)
  const cloudControllerRef=useRef(null)
  const cloudPlayerRef=useRef(null)
  const lastSpokenCoachRef=useRef('')
  const introControllerRef=useRef(null),introPlayerRef=useRef(null)
  const microphonePermissionRef=useRef(null)
  const microphonePermissionStateRef=useRef('unknown'),captureFailureRef=useRef(false)
  const primedAudioRef=useRef(null),audioContextRef=useRef(null)
  const speakingRef=useRef(false)
  const speechTimerRef=useRef(null),blockedResumeRef=useRef(null),utteranceRef=useRef(null)
  const iosCueTimerRef=useRef(null)
  const iosResultTimerRef=useRef(null)
  const hasRecognizedRef=useRef(false)
  const iosCueSatisfiedRef=useRef(false)
  // If Safari's reset cue jams, keep the same session and avoid repeating it.
  const iosCueBrokenRef=useRef(false)
  const generationRef=useRef(0)
  const bargeRecoveryRef=useRef({generation:-1,retries:0})
  const captureRetryRef=useRef({generation:-1,retries:0})
  const sttRecoveryRef=useRef({generation:-1,retries:0})
  const earlySpeechRef=useRef(null) // one authorized early sentence, no second model call
  const turnRef=useRef(onTurn),cancelRef=useRef(onCancelTurn),interruptedRef=useRef(onCoachInterrupted),stopRef=useRef(null),sessionStartRef=useRef(onSessionStart)
  const voiceStateRef=useRef(onVoiceStateChange),levelRef=useRef(onVoiceLevel)
  const micLevelRef=useRef(onMicLevel)
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
  sessionStartRef.current=onSessionStart
  cancelRef.current=onCancelTurn
  interruptedRef.current=onCoachInterrupted
  voiceStateRef.current=onVoiceStateChange
  levelRef.current=onVoiceLevel
  micLevelRef.current=onMicLevel

  function changePhase(next){
    phaseRef.current=next
    if(next!=='speaking'){beatRef.current=0;levelRef.current?.(null)}
    if(next!=='listening')micLevelRef.current?.(0)
    setPhase(next)
    voiceStateRef.current?.({phase:next,beat:beatRef.current})
  }
  function offerEarlyPhrase(phrase,locale,generation){
    if(!activeRef.current||generationRef.current!==generation||earlySpeechRef.current||
       phaseRef.current!=='thinking'||typeof phrase!=='string'||
       phrase.length<20||phrase.length>220)return
    const early={generation,prefix:phrase,ended:false,final:null}
    earlySpeechRef.current=early
    changePhase('loading')
    void speakCoachReply({reply:phrase,mode:'ai',locale},'',generation,false,true)
  }
  function finishEarlyPhrase(early){
    if(earlySpeechRef.current!==early||generationRef.current!==early.generation||!early.final)return
    earlySpeechRef.current=null
    const rest=String(early.final.reply||'').slice(early.prefix.length).trim()
    if(rest.length>=4){
      changePhase('loading')
      void speakCoachReply({...early.final,reply:rest},'',early.generation,false,false,early.final.reply)
    }else if(ios27NeedsSpeechRecovery(window.navigator)&&
             recordedTurnRef.current?.continueAfterCoach?.()){
      changePhase('listening');setNotice('')
    }else{
      recordedTurnRef.current?.cancel()
      recordedTurnRef.current=null
      startListening()
    }
  }
  function earlyPhraseEnded(generation){
    const early=earlySpeechRef.current
    if(!early||early.generation!==generation||early.ended)return
    early.ended=true
    if(early.final)finishEarlyPhrase(early)
    else changePhase('thinking')
  }
  function silence(){
    earlySpeechRef.current=null
    if(speechTimerRef.current)clearTimeout(speechTimerRef.current)
    speechTimerRef.current=null;blockedResumeRef.current=null;utteranceRef.current=null
    if(iosCueTimerRef.current)clearTimeout(iosCueTimerRef.current)
    if(iosResultTimerRef.current)clearTimeout(iosResultTimerRef.current)
    iosCueTimerRef.current=null
    iosResultTimerRef.current=null
    iosCueSatisfiedRef.current=false
    iosCueBrokenRef.current=false
    if(retryTimerRef.current)clearTimeout(retryTimerRef.current)
    if(settleTimerRef.current)clearTimeout(settleTimerRef.current)
    retryTimerRef.current=null;settleTimerRef.current=null;retryAttemptsRef.current=0
    captureFailureRef.current=false
    captureRetryRef.current={generation:-1,retries:0}
    sttRecoveryRef.current={generation:-1,retries:0}
    uncertainSpeechDraftRef.current=null
    providerUnavailableRef.current=null
    cloudControllerRef.current?.abort()
    cloudControllerRef.current=null
    cloudPlayerRef.current?.cancel()
    cloudPlayerRef.current=null
    introControllerRef.current?.abort()
    introControllerRef.current=null
    introPlayerRef.current?.cancel()
    introPlayerRef.current=null
    const audioContext=audioContextRef.current
    audioContextRef.current=null
    setCoachIos27AudioSession(window.navigator,'auto')
    if(audioContext)try{void audioContext.close?.().catch?.(()=>{})}catch{}
    primedAudioRef.current=null
    activeRef.current=false
    micLevelRef.current?.(0)
    recordedTurnRef.current?.cancel()
    recordedTurnRef.current=null
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
  function stopVoice({pause=false}={}){
    const cancelTurn=phaseRef.current==='thinking'||Boolean(earlySpeechRef.current)
    if(['starting','listening'].includes(phaseRef.current)&&hasCoachSpokenAnswer(heardRef.current)){
      draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,heardRef.current.trim(),1200))
      setNotice(t.review)
    }else setNotice('')
    heardRef.current=''
    transcriptRef.current?.('')
    silence()
    if(cancelTurn)cancelRef.current?.()
    changePhase(pause?'paused':'idle')
  }
  function pauseSession(){
    if(phaseRef.current==='paused')return true
    if(!activeRef.current)return false
    if(phaseRef.current==='speaking'&&lastSpokenCoachRef.current)
      interruptedRef.current?.(lastSpokenCoachRef.current)
    stopVoice({pause:true})
    return true
  }
  function resumePausedSession(){
    if(phaseRef.current!=='paused'||!enabled||!canStart||document.visibilityState==='hidden')return false
    if(supported===false){setNotice(t.unsupported);return false}
    // Retain the parent's transcript and duration; do not replay the introduction.
    activeRef.current=true
    introStartedRef.current=true
    generationRef.current+=1
    refreshCoachIos27PlaybackRoute(window.navigator)
    audioContextRef.current=shouldUseCoachingWebAudio(window.navigator)?unlockCoachingAudioContext():null
    primedAudioRef.current=audioContextRef.current?null:primeCoachingAudioGesture()
    primeMicrophonePermission()
    setNotice('')
    startListening()
    return true
  }
  stopRef.current=stopVoice
  pauseRef.current=pauseSession

  function restoreCoachVolume(){
    try{cloudPlayerRef.current?.setVolume?.(1)}catch{}
    try{if(introPlayerRef.current?.audio)introPlayerRef.current.audio.volume=1}catch{}
  }
  function duckCoachVolume(){
    try{cloudPlayerRef.current?.setVolume?.(0.08)}catch{}
    try{if(introPlayerRef.current?.audio)introPlayerRef.current.audio.volume=0.08}catch{}
  }
  function cancelOutgoingCoachSpeech(){
    // Cancel ONLY the outgoing player and vendor fetch: never release the
    // already-capturing client microphone or the original Play audio context.
    providerUnavailableRef.current=null
    cloudControllerRef.current?.abort()
    cloudControllerRef.current=null
    cloudPlayerRef.current?.cancel()
    cloudPlayerRef.current=null
    introControllerRef.current?.abort()
    introControllerRef.current=null
    introPlayerRef.current?.cancel()
    introPlayerRef.current=null
    blockedResumeRef.current=null
    if(speechTimerRef.current){clearTimeout(speechTimerRef.current);speechTimerRef.current=null}
    const voice=utteranceRef.current
    utteranceRef.current=null
    if(voice){voice.onstart=null;voice.onend=null;voice.onerror=null}
    if(speakingRef.current){
      speakingRef.current=false
      try{window.speechSynthesis?.cancel()}catch{}
    }
  }
  function interruptCoachToListen(){
    if(!activeRef.current)return
    const interruptedPhase=phaseRef.current
    if(['loading','speaking'].includes(interruptedPhase))interruptedRef.current?.(lastSpokenCoachRef.current)
    const computing=interruptedPhase==='thinking'||Boolean(earlySpeechRef.current)
    if(computing){
      // A model stream can remain live even after the first sentence plays.
      generationRef.current+=1
      earlySpeechRef.current=null
      cancelRef.current?.()
    }
    cancelOutgoingCoachSpeech()
    // Safari 27's native SpeechRecognition is unreliable; reuse the already
    // captured mic. Desktop has working browser ASR: do not burn one of the
    // shared, limited Whisper uploads on an ordinary manual interruption.
    if(!computing&&ios27NeedsSpeechRecovery(window.navigator)&&
       recordedTurnRef.current?.continueAfterCoach?.()){
      changePhase('listening');setNotice('')
      return
    }
    recordedTurnRef.current?.cancel()
    recordedTurnRef.current=null
    startListening()
  }
  function beginVoiceBargeMonitor(generation){
    // One captured track with browser echoCancellation=true is sampled only
    // locally while the coach speaks. A short duck confirms user voice rather
    // than the loudspeaker echo. Unsupported Safari stays on the manual Mic.
    if(bargeRecoveryRef.current.generation!==generation)
      bargeRecoveryRef.current={generation,retries:0}
    if(!activeRef.current||generationRef.current!==generation||
       ios27NeedsSpeechRecovery(window.navigator)||
       recordedTurnRef.current||!coachRecordedSupported(window)||
       microphonePermissionStateRef.current==='denied')return
    const begin=()=>{
      if(!activeRef.current||generationRef.current!==generation||
         !['thinking','loading','speaking'].includes(phaseRef.current)||recordedTurnRef.current)return
      const selected=chooseDictationLanguage({locale:lang,selection:speechLocaleRef.current,
        browserLanguages:window.navigator.languages?.length?window.navigator.languages:[window.navigator.language],
        lastTranscript:lastHeardRef.current})
      selectionAtRecognitionRef.current=speechLocaleRef.current
      recognizedLanguageRef.current=selected
      const transcriptionLocale=selected.slice(0,2)
      draftAtStartRef.current=coachDraftWithoutUncertainSpeech(currentDraftRef.current,uncertainSpeechDraftRef.current)
      let interrupted=false,monitorGeneration=generation
      const monitor=startCoachRecordedTurn({
        locale:transcriptionLocale,environment:window,
        audioContext:audioContextRef.current,monitorPlayback:true,
        onLevel:value=>{if(activeRef.current&&generationRef.current===generation)micLevelRef.current?.(value)},
        onState:state=>{
          if(!activeRef.current||generationRef.current!==monitorGeneration)return
          if(state==='listening')setNotice('')
          else if(state==='transcribing'){changePhase('thinking');setNotice(t.audioTranscribing)}
          else if(state==='hearing'){setNotice(t.audioHearing)}
          else if(state==='recovering'){setNotice(t.captureRetry)}
        },
        onCandidate:()=>{if(phaseRef.current==='speaking')duckCoachVolume()},
        onCandidateExpired:()=>{if(phaseRef.current==='speaking')restoreCoachVolume()},
        onSpeechDetected:()=>{
          if(!activeRef.current||generationRef.current!==monitorGeneration)return
          interrupted=true
          const interruptedPhase=phaseRef.current
          // Transfer this live mic capture to the new request epoch, including
          // interruptions while early voice and model tokens overlap.
          if(['loading','speaking'].includes(interruptedPhase))
            interruptedRef.current?.(lastSpokenCoachRef.current)
          monitorGeneration=generationRef.current+1
          generationRef.current=monitorGeneration
          earlySpeechRef.current=null
          cancelRef.current?.()
          cancelOutgoingCoachSpeech()
          changePhase('listening')
          setNotice(t.audioHearing)
        },
        onResult:value=>{
          if(!activeRef.current||generationRef.current!==monitorGeneration)return
          recordedTurnRef.current=null
          sttRecoveryRef.current={generation:-1,retries:0}
          if(interrupted&&isCoachBargeEcho(value,lastSpokenCoachRef.current)){
            // A false interruption must not create a duplicate model request.
            startListening();setNotice(t.listening);return
          }
          if(!hasCoachSpokenAnswer(value)){startListening();return}
          lastHeardRef.current=value
          heardRef.current=value
          transcriptRef.current?.(value)
          void deliver(appendSpokenAnswer(draftAtStartRef.current,value,1200))
        },
        onFailure:code=>{
          if(!activeRef.current||generationRef.current!==monitorGeneration)return
          recordedTurnRef.current=null
          // Playback continues while the monitor recovers. A dead automatic
          // monitor must be visible and the green mic still interrupts by tap.
          if(!interrupted){
            const recovery=bargeRecoveryRef.current
            if(['MIC_CAPTURE','MIC_NO_SIGNAL'].includes(code)&&
               recovery.generation===monitorGeneration&&recovery.retries<1&&
               ['thinking','loading','speaking'].includes(phaseRef.current)){
              recovery.retries+=1
              window.setTimeout(()=>{
                if(activeRef.current&&generationRef.current===monitorGeneration&&
                   ['thinking','loading','speaking'].includes(phaseRef.current))
                  beginVoiceBargeMonitor(monitorGeneration)
              },350)
            }else if(['thinking','loading','speaking'].includes(phaseRef.current))
              setNotice(t.bargeManual)
            return
          }
          // A transient WebKit capture failure is not a Whisper outage.
          // Re-arm fresh recorded capture instead of permanently falling back
          // to Safari's unreliable native SpeechRecognition.
          if(['STT_UNAVAILABLE','STT_RATE_LIMIT','STT_SIGN_IN'].includes(code)){
            recoverRecordedStt(code,monitorGeneration)
            return
          }
          if(code==='MIC_PERMISSION'||code==='MIC_MISSING'){
            changePhase('ready');setNotice(code==='MIC_PERMISSION'?t.blocked:t.noMicrophone)
            return
          }
          startListening()
          setNotice(code==='MIC_CAPTURE'||code==='MIC_NO_SIGNAL'?t.captureRetry:t.audioUnavailable)
        },
      })
      if(monitor)recordedTurnRef.current=monitor
    }
    // Never race the first Play's getUserMedia permission/track cleanup.
    if(microphonePermissionRef.current)
      void microphonePermissionRef.current.then(begin,begin)
    else begin()
  }

  // Request iPhone mic permission in the very SAME Play gesture, without
  // recording or uploading audio. Immediately release the temporary stream;
  // the actual Web Speech recognizer starts AFTER the coach finishes.
  function primeMicrophonePermission(){
    if(microphonePermissionRef.current)return microphonePermissionRef.current
    const devices=window.navigator.mediaDevices
    if(typeof devices?.getUserMedia!=='function')return null
    const classify=error=>{
      const name=String(error?.name||'')
      // An iOS audio-service reset can use NotAllowedError without permission denial.
      if(/AVAudioSessionCaptureDevice|audio session|capture device/i.test(String(error?.message||'')))return 'temporary'
      if(['NotAllowedError','SecurityError','PermissionDeniedError'].includes(name))return 'denied'
      if(['NotFoundError','DevicesNotFoundError'].includes(name))return 'missing'
      return 'temporary'
    }
    try{
      // Begin the permission request in the actual user Play/tap gesture.
      const request=devices.getUserMedia({audio:true})
      const checked=Promise.resolve(request).then(stream=>{
        try{for(const track of stream.getTracks())track.stop()}catch{}
        microphonePermissionStateRef.current='granted'
        return 'granted'
      },error=>{
        const outcome=classify(error)
        microphonePermissionStateRef.current=outcome
        return outcome
      }).finally(()=>{
        if(microphonePermissionRef.current===checked)microphonePermissionRef.current=null
      })
      microphonePermissionRef.current=checked
      return checked
    }catch(error){
      microphonePermissionStateRef.current=classify(error)
      return null
    }
  }

  useImperativeHandle(ref,()=>({
    startSession(introduction,{naturalVoice=false}={}){
      if(phaseRef.current==='paused')return resumePausedSession()
      if(activeRef.current||!enabled||!canStart||document.visibilityState==='hidden')return false
      // The hero Play must grant the same voice consent as the toolbar Play.
      sessionStartRef.current?.()
      activeRef.current=true
      introStartedRef.current=true
      generationRef.current+=1
      // Unlock browser audio before any asynchronous model/TTS request.
      refreshCoachIos27PlaybackRoute(window.navigator)
      audioContextRef.current=shouldUseCoachingWebAudio(window.navigator)?unlockCoachingAudioContext():null
      primedAudioRef.current=audioContextRef.current?null:primeCoachingAudioGesture()
      changePhase('loading')
      // Play is the single deliberate gesture that starts coach audio followed
      // by browser recognition. No recording, upload or second mic tap.
      if(!ios27NeedsSpeechRecovery(window.navigator))primeMicrophonePermission()
      beginVoiceBargeMonitor(generationRef.current)
      void speakCoachReply({reply:String(introduction||'').slice(0,900),mode:'intro'},'',generationRef.current,naturalVoice)
      return true
    },
    startWithConsent(){
      if(phaseRef.current==='paused')return resumePausedSession()
      if(activeRef.current||!canStart)return false
      activeRef.current=true
      generationRef.current+=1
      primeMicrophonePermission()
      startListening()
      return true
    },
    pauseForTypedTurn(){
      if(!activeRef.current)return false
      // Text Send cancels the active microphone/voice without releasing the
      // already-unlocked Safari output. The answer can play automatically.
      generationRef.current+=1
      earlySpeechRef.current=null
      recordedTurnRef.current?.cancel()
      recordedTurnRef.current=null
      const recognition=recognitionRef.current
      recognitionRef.current=null
      if(recognition){
        recognition.onresult=null;recognition.onerror=null;recognition.onend=null
        try{recognition.abort()}catch{}
      }
      for(const key of [retryTimerRef,settleTimerRef,iosResultTimerRef,iosCueTimerRef])
        if(key.current){clearTimeout(key.current);key.current=null}
      providerUnavailableRef.current=null
      cloudControllerRef.current?.abort()
      cloudControllerRef.current=null
      cloudPlayerRef.current?.cancel()
      cloudPlayerRef.current=null
      introControllerRef.current?.abort()
      introControllerRef.current=null
      introPlayerRef.current?.cancel()
      introPlayerRef.current=null
      // Do not let a cancelled device fallback re-arm the microphone while a
      // typed answer is being sent; detach callbacks and clear the watchdog.
      if(speechTimerRef.current){clearTimeout(speechTimerRef.current);speechTimerRef.current=null}
      const interruptedUtterance=utteranceRef.current
      utteranceRef.current=null
      if(interruptedUtterance){
        interruptedUtterance.onstart=null
        interruptedUtterance.onend=null
        interruptedUtterance.onerror=null
      }
      if(speakingRef.current){
        speakingRef.current=false
        try{window.speechSynthesis?.cancel()}catch{}
      }
      blockedResumeRef.current=null
      heardRef.current=''
      transcriptRef.current?.('')
      setNotice('')
      changePhase('thinking')
      return true
    },
    speakReply(result){
      if(!activeRef.current||phaseRef.current!=='thinking'||!result?.reply)return false
      changePhase('loading')
      void speakCoachReply(result,'',generationRef.current)
      return true
    },
    resumeAfterTypedFailure(){
      if(activeRef.current&&phaseRef.current==='thinking')startListening()
    },
    // Replay is an explicit user gesture: resume Safari-blocked device or MP3 audio
    // without re-synthesizing the same paid/free-quota-limited coach question.
    stop(){stopVoice()},
    pauseSession,
    hasLiveSession:()=>activeRef.current||phaseRef.current==='paused',
    resumeVoice(){
      if(phaseRef.current!=='ready'||!blockedResumeRef.current)return false
      blockedResumeRef.current()
      return true
    },
  }))
  useEffect(()=>{
    setSupported(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition||
      (ios27NeedsSpeechRecovery(window.navigator)&&coachRecordedSupported(window))))
    const onHidden=()=>{if(document.visibilityState==='hidden')pauseRef.current?.()}
    const onPageHide=()=>pauseRef.current?.()
    document.addEventListener('visibilitychange',onHidden)
    window.addEventListener('pagehide',onPageHide)
    return ()=>{
      document.removeEventListener('visibilitychange',onHidden)
      window.removeEventListener('pagehide',onPageHide)
      stopRef.current?.()
    }
  },[])
  useEffect(()=>{
    if(!enabled&&(activeRef.current||phaseRef.current==='paused'))stopRef.current?.()
  },[enabled])
  useEffect(()=>{
    // A provider outage/revoked consent interrupts only outbound audio.
    // Preserve the original Play activation and return to hands-free listening.
    if((!cloudAgreed||!cloudAvailable)&&(cloudControllerRef.current||cloudPlayerRef.current))
      providerUnavailableRef.current?.()
  },[cloudAgreed,cloudAvailable])

  // Switching RU/EN mid-session needs no second Play. Never abort iOS speech
  // that has already produced words: wait for its natural onend instead.
  useEffect(()=>{
    if(priorSpeechLocaleRef.current===speechLocale)return
    priorSpeechLocaleRef.current=speechLocale
    if(!activeRef.current)return
    if(recordedTurnRef.current){recordedTurnRef.current.cancel();recordedTurnRef.current=null;startListening();return}
    const recognition=recognitionRef.current
    if(!recognition||!['starting','listening'].includes(phaseRef.current))return
    if(heardRef.current.trim())return
    retryAttemptsRef.current=0
    restartSilentRecognition(recognition)
  },[speechLocale])

  // If Web Speech ends without words, transparently try a fresh recognizer.
  // Retries are bounded; permission and network failures remain visible.
  function restartSilentRecognition(recognition,reason='silence'){
    if(reason==='capture')captureFailureRef.current=true
    if(recognitionRef.current!==recognition||!activeRef.current)return
    recognitionRef.current=null
    recognition.onresult=null;recognition.onend=null;recognition.onerror=null
    if(iosResultTimerRef.current){clearTimeout(iosResultTimerRef.current);iosResultTimerRef.current=null}
    if(settleTimerRef.current){clearTimeout(settleTimerRef.current);settleTimerRef.current=null}
    try{recognition.abort()}catch{}
    if(retryAttemptsRef.current>=3){
      const message=captureFailureRef.current?t.captureFailed:t.iosSilent
      // Keep the session and its unlocked audio for typed replies; never fake a live mic.
      changePhase('ready');setNotice(message);return
    }
    retryAttemptsRef.current+=1
    changePhase('starting');setNotice(reason==='capture'?t.captureRetry:ios27NeedsSpeechRecovery(window.navigator)?t.iosPreparing:t.listening)
    if(retryTimerRef.current)clearTimeout(retryTimerRef.current)
    const generation=generationRef.current
    retryTimerRef.current=setTimeout(()=>{
      retryTimerRef.current=null
      if(activeRef.current&&generationRef.current===generation)startListening()
    },reason==='capture'?[800,1500,2600][retryAttemptsRef.current-1]:420)
  }

  // Restore Safari's *recorded* STT after a temporary provider failure.
  // Never latch a single 429/503 into permanent browser recognition: iOS 27's
  // Web Speech recognizer can claim Listening while delivering no audio.
  // One bounded retry per voice turn, no hidden paid fallback or busy loop.
  function recoverRecordedStt(code,generation){
    if(!activeRef.current||generationRef.current!==generation)return
    if(retryTimerRef.current){clearTimeout(retryTimerRef.current);retryTimerRef.current=null}
    if(code==='STT_SIGN_IN'){
      changePhase('ready');setNotice(t.sttSignIn);return
    }
    if(sttRecoveryRef.current.generation!==generation)
      sttRecoveryRef.current={generation,retries:0}
    const recovery=sttRecoveryRef.current
    if(recovery.retries>=1){
      changePhase('ready')
      setNotice(code==='STT_RATE_LIMIT'?t.sttQuotaStopped:t.audioUnavailable)
      return
    }
    recovery.retries+=1
    const delay=code==='STT_RATE_LIMIT'?61000:2200
    changePhase('starting')
    setNotice(code==='STT_RATE_LIMIT'?t.sttCooling:t.sttRecovering)
    retryTimerRef.current=setTimeout(()=>{
      retryTimerRef.current=null
      if(activeRef.current&&generationRef.current===generation&&
        phaseRef.current==='starting')startListening()
    },delay)
  }

  function startListening(){
    setCoachIos27AudioSession(window.navigator,'auto')
    if(!activeRef.current)return
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
    const ios27=ios27NeedsSpeechRecovery(window.navigator)
    // One failed reset must never trigger an endless cue/restart cycle.
    // Manual retry in the ready state re-enables the existing recorded STT path.
    if(ios27&&iosCueBrokenRef.current&&!coachRecordedSupported(window)){
      changePhase('ready');setNotice(t.iosCueFailed);return
    }
    // Safari/WebKit 27 reports a working SpeechRecognition but emits no text.
    // Use the already-authorized one-Play microphone with short VAD turns.
    if(ios27&&coachRecordedSupported(window)){
      const generation=generationRef.current
      selectionAtRecognitionRef.current=speechLocaleRef.current
      const chosen=chooseDictationLanguage({locale:lang,selection:speechLocaleRef.current,
        browserLanguages:window.navigator.languages?.length?window.navigator.languages:[window.navigator.language],
        lastTranscript:lastHeardRef.current})
      recognizedLanguageRef.current=chosen
      const transcriptLocale=chosen.slice(0,2)
      draftAtStartRef.current=coachDraftWithoutUncertainSpeech(currentDraftRef.current,uncertainSpeechDraftRef.current)
      heardRef.current=''
      transcriptRef.current?.('')
      changePhase('starting')
      setNotice(t.iosPreparing)
      // The old WebSpeech bug must not trigger more useless reset cues.
      const begin=()=>{
        if(!activeRef.current||generationRef.current!==generation)return
        const capture=startCoachRecordedTurn({locale:transcriptLocale,environment:window,
          audioContext:audioContextRef.current,
          onLevel:value=>{
            if(activeRef.current&&generationRef.current===generation)micLevelRef.current?.(value)
          },
          onState:status=>{
            if(!activeRef.current||generationRef.current!==generation)return
            if(status==='listening'){changePhase('listening');setNotice('')}
            if(status==='hearing')setNotice(t.audioHearing)
            if(status==='transcribing'){changePhase('thinking');setNotice(t.audioTranscribing)}
            if(status==='recovering'){changePhase('starting');setNotice(t.captureRetry)}
            if(status==='quiet')setNotice(t.audioQuiet)
          },
          onResult:value=>{
            if(!activeRef.current||generationRef.current!==generation)return
            recordedTurnRef.current=null
            captureRetryRef.current={generation:-1,retries:0}
            sttRecoveryRef.current={generation:-1,retries:0}
            if(!hasCoachSpokenAnswer(value)){startListening();return}
            lastHeardRef.current=value
            heardRef.current=value
            transcriptRef.current?.(value)
            void deliver(appendSpokenAnswer(draftAtStartRef.current,value,1200))
          },
          onFailure:code=>{
            if(!activeRef.current||generationRef.current!==generation)return
            recordedTurnRef.current=null
            if(code==='MIC_NO_SIGNAL'){
              // Retain the coaching session, never display a deaf mic as Listening.
              changePhase('ready');setNotice(t.audioNoSignal);return
            }
            if(code==='MIC_CAPTURE'){
              // The microphone track/AudioContext failed, NOT the speech
              // provider. Recover one microphone capture in place, without
              // disabling the Groq Whisper path or charging an extra model.
              const recovery=captureRetryRef.current
              if(recovery.generation!==generation){
                recovery.generation=generation;recovery.retries=0
              }
              if(recovery.retries>=1){
                changePhase('ready');setNotice(t.captureFailed)
                return
              }
              recovery.retries+=1
              changePhase('starting');setNotice(t.captureRetry)
              if(retryTimerRef.current)clearTimeout(retryTimerRef.current)
              retryTimerRef.current=setTimeout(()=>{
                retryTimerRef.current=null
                if(activeRef.current&&generationRef.current===generation&&
                   phaseRef.current==='starting')startListening()
              },650)
              return
            }
            if(['STT_UNAVAILABLE','STT_RATE_LIMIT','STT_SIGN_IN'].includes(code)){
              recoverRecordedStt(code,generation)
              return
            }
            silence();changePhase('idle')
            setNotice(code==='MIC_PERMISSION'?t.blocked:code==='MIC_MISSING'?t.noMicrophone:t.audioUnavailable)
          },
        })
        if(capture)recordedTurnRef.current=capture
        else{silence();changePhase('idle');setNotice(t.audioUnavailable)}
      }
      if(microphonePermissionRef.current)
        void microphonePermissionRef.current.then(begin,begin)
      else begin()
      return
    }
    if(!Recognition){setSupported(false);stopVoice();setNotice(t.unsupported);return}
    const recognition=new Recognition()
    recognitionRef.current=recognition
    selectionAtRecognitionRef.current=speechLocaleRef.current
    recognition.lang=chooseDictationLanguage({locale:lang,selection:selectionAtRecognitionRef.current,
      browserLanguages:window.navigator.languages?.length?window.navigator.languages:[window.navigator.language],
      lastTranscript:lastHeardRef.current})
    recognizedLanguageRef.current=recognition.lang
    recognition.continuous=false
    recognition.interimResults=true
    recognition.maxAlternatives=1
    let finished=''
    // On WebKit 321436 even onstart/onerror/onend may never fire.
    // Reset this timer on onstart and onresult; never show an endless fake mic.
    const armSilentWatchdog=delay=>{
      if(!ios27)return
      if(iosResultTimerRef.current)clearTimeout(iosResultTimerRef.current)
      iosResultTimerRef.current=setTimeout(()=>{
        iosResultTimerRef.current=null
        if(recognitionRef.current===recognition&&activeRef.current&&!heardRef.current.trim())
          restartSilentRecognition(recognition)
      },delay)
    }
    draftAtStartRef.current=coachDraftWithoutUncertainSpeech(currentDraftRef.current,uncertainSpeechDraftRef.current)
    heardRef.current=''
    transcriptRef.current?.('')
    changePhase('starting')
    setNotice('')
    recognition.onstart=()=>{
      if(recognitionRef.current!==recognition||!activeRef.current)return
      changePhase('listening')
      if(ios27){
        setNotice(t.iosAwaitSpeech) // onstart is NOT proof that Safari receives audio
        armSilentWatchdog(9000)
      }
    }
    recognition.onresult=event=>{
      if(recognitionRef.current!==recognition||!activeRef.current)return
        if(phaseRef.current==='starting')changePhase('listening')
      if(iosResultTimerRef.current){clearTimeout(iosResultTimerRef.current);iosResultTimerRef.current=null}
      const {final,interim,visible}=readDictationResults(event.results,1200)
      heardRef.current=visible
      transcriptRef.current?.(visible)
      // Safari interim words are editable even without a later final event.
      // Interim words stay in the transcript, never duplicated in the composer.
      if(final){
        // Preserve interim words following a final segment in the same Safari event.
        finished=visible
        lastHeardRef.current=finished
        // iOS 27 Safari can become deaf after an explicit stop(). Let this
        // continuous=false recognizer finish naturally after its final result.
      }
      // iOS 27 WebKit #321436: a recognized session must end naturally.
      // After a long silence, keep the text editable; NEVER abort a recognizer
      // that has heard words or subsequent sessions can become permanently deaf.
      if(ios27&&visible){
        iosResultTimerRef.current=setTimeout(()=>{
          if(recognitionRef.current!==recognition||!activeRef.current)return
          const heard=heardRef.current.trim()
          if(hasCoachSpokenAnswer(heard)){
            draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,heard,1200))
            transcriptRef.current?.('') // One visible copy in the editable Text field
          }
          // Safari must end every recognition naturally, even one-letter noise.
          // Aborting after onresult poisons the next iOS 27 microphone session.
          setNotice(t.iosAwaitEnd)
        },6500)
      }
      // Dictation is shown in the transcript, never echoed beneath the microphone.
      if(visible||interim)setNotice('')
      if(visible){
        retryAttemptsRef.current=0
        if(settleTimerRef.current)clearTimeout(settleTimerRef.current)
        // Only non-iOS-27 browsers use the early automatic settle fallback.
        // On iOS 27, wait for natural onend to preserve the next voice turn.
        // Other browsers can settle a final transcript sooner; do not cut iOS.
        if(!ios27){
          const heardNow=visible.trim()
          settleTimerRef.current=setTimeout(()=>{
            if(recognitionRef.current!==recognition||!activeRef.current)return
            const heard=heardRef.current.trim()
            if(!hasCoachSpokenAnswer(heard)||heard!==heardNow)return
            recognitionRef.current=null
            recognition.onresult=null;recognition.onend=null;recognition.onerror=null
            try{recognition.abort()}catch{}
            lastHeardRef.current=heard
            void deliver(appendSpokenAnswer(draftAtStartRef.current,heard,1200))
          },final?500:1900)
        }
      }
    }
    recognition.onerror=event=>{
      if(recognitionRef.current!==recognition)return
      const heard=heardRef.current.trim()
      if(hasCoachSpokenAnswer(heard)&&!['not-allowed','service-not-allowed'].includes(event.error)){
        recognitionRef.current=null
        recognition.onresult=null;recognition.onend=null;recognition.onerror=null
        if(settleTimerRef.current)clearTimeout(settleTimerRef.current)
        lastHeardRef.current=heard
        void deliver(appendSpokenAnswer(draftAtStartRef.current,heard,1200))
        return
      }
      if(event.error==='audio-capture'){
        // WebKit can lose capture even when a physical microphone exists.
        if(['denied','missing'].includes(microphonePermissionStateRef.current)){
          const message=microphonePermissionStateRef.current==='denied'?t.blocked:t.noMicrophone
          silence();changePhase('idle');setNotice(message)
        }else restartSilentRecognition(recognition,'capture')
        return
      }
      if(['no-speech','aborted','network'].includes(event.error)){
        // A temporary browser STT network error must not cancel the one-Play
        // session. Existing bounded recognition retries never retry AI/TTS.
        // Permission denial fails closed; transient capture loss is retried.
        restartSilentRecognition(recognition);return
      }
      silence();changePhase('idle')
      setNotice(['not-allowed','service-not-allowed'].includes(event.error)?t.blocked:
        event.error==='network'?t.network:event.error==='language-not-supported'?t.language:t.restart)
    }
    const restartSilentRecognitionAfterEnd=()=>{
      // onend has already detached the recognizer; retry without a second tap.
      if(!activeRef.current)return
      if(retryAttemptsRef.current>=3){changePhase('ready');setNotice(t.iosSilent);return}
      retryAttemptsRef.current+=1
      changePhase('starting');setNotice(ios27?t.iosPreparing:t.listening)
      const generation=generationRef.current
      retryTimerRef.current=setTimeout(()=>{
        retryTimerRef.current=null
        if(activeRef.current&&generationRef.current===generation)startListening()
      },300)
    }
    recognition.onend=()=>{
      if(iosResultTimerRef.current){clearTimeout(iosResultTimerRef.current);iosResultTimerRef.current=null}
      if(settleTimerRef.current){clearTimeout(settleTimerRef.current);settleTimerRef.current=null}
      if(recognitionRef.current!==recognition)return
      recognitionRef.current=null
      if(!activeRef.current)return
        if(hasCoachSpokenAnswer(finished))void deliver(appendSpokenAnswer(draftAtStartRef.current,finished,1200))
      else{
        const recovered=heardRef.current.trim()
        if(hasCoachSpokenAnswer(recovered)){
          // Safari sometimes ends after interim words without a final event.
          // A natural recognizer end commits that one turn; Stop/error never do.
          lastHeardRef.current=recovered
          void deliver(appendSpokenAnswer(draftAtStartRef.current,recovered,1200))
        }else{
          transcriptRef.current?.('')
          heardRef.current=''
          restartSilentRecognitionAfterEnd()
        }
      }
    }
    const startRecognition=()=>{
      if(recognitionRef.current!==recognition||!activeRef.current)return
      const begin=()=>{
        if(recognitionRef.current!==recognition||!activeRef.current)return
        const permission=microphonePermissionStateRef.current
        if(permission==='denied'||permission==='missing'){
          const message=permission==='denied'?t.blocked:t.noMicrophone
          silence();changePhase('idle');setNotice(message);return
        }
        try{
          armSilentWatchdog(14000)
          recognition.start()
        }catch{restartSilentRecognition(recognition,'capture')}
      }
      // Do not race Web Speech with the Safari permission prompt/track cleanup.
      const permissionRequest=microphonePermissionRef.current
      if(permissionRequest){void permissionRequest.then(begin,begin);return}
      begin()
    }
    iosCueSatisfiedRef.current=false
    // WebKit #321436: even the FIRST recognizer follows MP3 introduction.
    // Use a short completed, non-muted utterance before EVERY iOS 27 start.
    // Let recognized speech end naturally; do not cut a heard session.
    if(ios27&&window.speechSynthesis?.speak&&window.SpeechSynthesisUtterance){
      const cue=new window.SpeechSynthesisUtterance(t.iosCue)
      cue.lang=recognition.lang
      cue.rate=1.15
      // volume=0 may be optimized away and leaves WebKit's audio session deaf.
      // A very short, quiet cue is necessary; not used as the coach's voice.
      cue.volume=0.2
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
      const failCue=()=>{
        if(completed)return
        completed=true
        if(iosCueTimerRef.current)clearTimeout(iosCueTimerRef.current)
        iosCueTimerRef.current=null
        speakingRef.current=false
        if(!activeRef.current||recognitionRef.current!==recognition)return
        // A stuck Safari audio cue is not a request to End the coaching session.
        // Detach the recognizer that never started, preserve the draft, coach
        // context and unlocked audio; a manual Mic retry can use recorded STT.
        iosCueBrokenRef.current=true
        recognitionRef.current=null
        recognition.onstart=null;recognition.onresult=null
        recognition.onerror=null;recognition.onend=null
        changePhase('ready');setNotice(t.iosCueFailed)
      }
      cue.onend=finishCue
      cue.onerror=failCue
      try{
        window.speechSynthesis.cancel()
        speakingRef.current=true
        iosCueTimerRef.current=setTimeout(()=>{
          try{window.speechSynthesis.cancel()}catch{}
          failCue() // cancel() is not a completed audio-session reset
        },4000)
        window.speechSynthesis.speak(cue)
        setNotice(t.iosPreparing)
      }catch{failCue()}
      return
    }
    startRecognition()
  }

  async function deliver(text){
    // Do not let a 3–5 letter ASR guess become a coaching goal or AI turn.
    if(coachVoiceFragmentNeedsReview(heardRef.current||text)){
      const candidate=String(text||'').trim()
      uncertainSpeechDraftRef.current={visible:candidate,prior:draftAtStartRef.current}
      currentDraftRef.current=candidate
      draftRef.current?.(candidate)
      transcriptRef.current?.('')
      heardRef.current=''
      startListening()
      setNotice(t.review)
      return
    }
    uncertainSpeechDraftRef.current=null
    const generation=generationRef.current
    hasRecognizedRef.current=true
    setNotice('') // Clear the old user transcript before coach speech.
    changePhase('thinking')
    beginVoiceBargeMonitor(generation) // Listen even while AI and TTS are pending.
    const modelStartedAt=typeof performance!=='undefined'?performance.now():null
    let result
    try{
      const utteranceLocale=coachSpokenTurnLocale({
        selection:selectionAtRecognitionRef.current,
        recognizedLanguage:recognizedLanguageRef.current,transcript:text,fallback:lang,
      })
      result=await turnRef.current?.(text,{locale:utteranceLocale,
        onApprovedPhrase:(phrase,locale)=>offerEarlyPhrase(phrase,locale||utteranceLocale,generation)})
    }catch{result=null}
    if(!activeRef.current||generationRef.current!==generation)return
    if(modelStartedAt!==null&&typeof performance!=='undefined'){
      // Numeric-only browser timing; no transcript, user identifiers or server telemetry.
      try{performance.measure?.('hh-coach-ai-turn', {start:modelStartedAt,end:performance.now()})}
      catch{/* Metrics must never interrupt an audible coach turn. */}
    }
    if(!result?.reply){
      if(earlySpeechRef.current?.generation===generation){
        earlySpeechRef.current=null
        cancelOutgoingCoachSpeech()
      }
      // A model outage fails only this turn. Keep the text editable and the
      // one-Play voice session alive, without retrying the model or TTS.
      // Sync the draft ref before Web Speech restarts in this same tick.
      currentDraftRef.current=text
      draftRef.current?.(text)
      transcriptRef.current?.('')
      if(ios27NeedsSpeechRecovery(window.navigator)&&
         recordedTurnRef.current?.continueAfterCoach?.())changePhase('listening')
      else{
        recordedTurnRef.current?.cancel()
        recordedTurnRef.current=null
        startListening()
      }
      setNotice(t.failed)
      return
    }
    heardRef.current=''
    transcriptRef.current?.('')
    const early=earlySpeechRef.current
    if(early&&early.generation===generation){
      if(result.mode==='ai'&&result.approvedSpokenPrefix===early.prefix&&
         String(result.reply).startsWith(early.prefix)){
        early.final=result
        if(early.ended)finishEarlyPhrase(early)
        return
      }
      // Final full-turn veto or provider failure: cancel provisional audio.
      earlySpeechRef.current=null
      cancelOutgoingCoachSpeech()
    }
    changePhase('loading') // Reply is ready; synthesis is pending, not model thinking.
    void speakCoachReply(result,text,generation)
  }

  async function speakCoachReply(result,text,generation,naturalVoice=false,earlySegment=false,fullText=''){
    if(result?.mode!=='intro'){
      setCoachIos27AudioSession(window.navigator,'playback')
      refreshCoachIos27PlaybackRoute(window.navigator)
    }
    const reply=String(result.reply).slice(0,900)
    lastSpokenCoachRef.current=String(fullText||reply).slice(0,900)
    // An audible reply must include the answer/acknowledgement, not only its last question.
    // The Google excerpt only applies to its separately-consented 500-char path.
    const speakable=coachSpokenText(reply).text
    const replyLocale=['en','ru','es'].includes(result.locale)?result.locale:
      ['en','ru','es'].includes(speechLocaleRef.current)?speechLocaleRef.current:
      detectedSpeechLocale(reply,detectedSpeechLocale(text,lang))
    const live=()=>activeRef.current&&generationRef.current===generation
    const afterSpeech=()=>{
      if(!live())return
      if(earlySegment){earlyPhraseEnded(generation);return}
      if(result.mode==='safety'||result.mode==='boundary'){
        silence();changePhase('idle');return
      }
      // Preserve iOS 27's one-Play captured mic. Other browsers return to
      // their built-in ASR after natural TTS, saving the global Whisper quota.
      if(ios27NeedsSpeechRecovery(window.navigator)&&
         recordedTurnRef.current?.continueAfterCoach?.()){
        changePhase('listening')
        setNotice('')
        return
      }
      recordedTurnRef.current?.cancel()
      recordedTurnRef.current=null
      startListening()
    }

    function playDeviceFallback(){
      // Only after the consented natural voice fails. No second provider request.
      const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance
      if(!synth?.speak||!Utterance)return false
      const voice=new Utterance(speakable||reply)
      voice.lang={ru:'ru-RU',en:'en-US',es:'es-ES'}[replyLocale]||'en-US'
      voice.rate=0.96
      const matches=(synth.getVoices?.()||[]).filter(item=>
        String(item.lang||'').toLowerCase().startsWith(replyLocale))
      // A device without a RU/ES voice must not silently pronounce translated
      // coach text with the phone's English default voice.
      if(replyLocale!=='en'&&!matches.length)return false
      voice.voice=matches.find(item=>item.localService)||matches[0]||null
      const clear=()=>{
        if(speechTimerRef.current)clearTimeout(speechTimerRef.current)
        speechTimerRef.current=null
        voice.onstart=null;voice.onend=null;voice.onerror=null
        if(utteranceRef.current===voice)utteranceRef.current=null
        speakingRef.current=false
      }
      const fail=()=>{
        if(utteranceRef.current!==voice)return
        clear()
        if(live()){
          if(earlySegment)earlyPhraseEnded(generation)
          else startListening()
          setNotice(t.fallback)
        }
      }
      voice.onstart=()=>{
        if(utteranceRef.current!==voice||!live())return
        if(speechTimerRef.current)clearTimeout(speechTimerRef.current)
        setNotice(t.deviceFallback);changePhase('speaking')
        speechTimerRef.current=setTimeout(()=>{
          if(utteranceRef.current!==voice)return
          try{synth.cancel()}catch{}
          fail()
        },Math.min(90000,24000+reply.length*120))
      }
      voice.onend=()=>{
        if(utteranceRef.current!==voice)return
        clear()
        afterSpeech()
      }
      voice.onerror=fail
      utteranceRef.current=voice
      speakingRef.current=true
      try{
        synth.cancel()
        speechTimerRef.current=setTimeout(()=>{
          if(utteranceRef.current===voice&&phaseRef.current!=='speaking'){
            try{synth.cancel()}catch{}
            fail()
          }
        },4500)
        synth.speak(voice)
        return true
      }catch{fail();return true}
    }

    function showTextOnly(){
      if(!live())return
      // Sensitive safety/boundary replies still terminate the speaking loop,
      // even when premium TTS is unavailable. Do not auto-prompt after a stop.
      if(result.mode==='safety'||result.mode==='boundary'){
        afterSpeech()
        return
      }
      // An unavailable natural voice must never end the active conversation.
      // Keep the visible text and first-gesture Safari audio unlock; release
      // only the failed player, then listen for the next user turn automatically.
      providerUnavailableRef.current=null
      introControllerRef.current?.abort()
      introControllerRef.current=null
      introPlayerRef.current?.cancel()
      introPlayerRef.current=null
      cloudControllerRef.current?.abort()
      cloudControllerRef.current=null
      cloudPlayerRef.current?.cancel()
      cloudPlayerRef.current=null
      // Natural Google/Fish stays first; disclose the temporary OS voice.
      if(playDeviceFallback())return
      if(earlySegment)earlyPhraseEnded(generation)
      else startListening()
      setNotice(t.fallback)
    }

    // Device narration is a clearly labeled continuity fallback; it is not
    // the persona's natural Google/Fish voice.

    // Initial Play requests only the fixed authored persona introduction from
    // the public, globally rate-limited Fish S2.1 free route. No client audio,
    // client transcript or arbitrary text is exposed through this endpoint.
    if(result.mode==='intro'){
      const url=coachIntroAudioPath(personaId,lang)
      if(!url){showTextOnly();return}
      const controller=new AbortController()
      introControllerRef.current=controller
      try{
        // Direct MediaElement.play() executes in the original user gesture.
        // Safari streams audio progressively instead of waiting for a
        // complete MP3 Blob and WebAudio decode.
        introPlayerRef.current=startDirectCoachIntroAudio(url,{
          onStart:()=>{
            if(live()&&!controller.signal.aborted){setNotice('');changePhase('speaking')}
          },
          onEnd:()=>{
            if(!live()||controller.signal.aborted)return
            introControllerRef.current=null
            introPlayerRef.current?.cancel()
            introPlayerRef.current=null
            afterSpeech()
          },
          onBlocked:()=>{if(live())showTextOnly()},
          onError:()=>{if(live())showTextOnly()},
        })
      }catch{if(live())showTextOnly()}
      return
    }
    const {cloudAgreed:voiceAgreed,cloudAvailable:voiceAvailable,
      cloudProvider:voiceProvider,voiceName:selectedVoice}=voiceConfigRef.current
    if((naturalVoice||voiceAgreed)&&voiceAvailable&&['google_chirp3_hd','fish_free','gemini_tts_free','gemini_tts_paid'].includes(voiceProvider)&&!['safety','boundary'].includes(result.mode)){
      const controller=new AbortController()
      cloudControllerRef.current=controller
      providerUnavailableRef.current=()=>{
        if(live()&&!controller.signal.aborted)showTextOnly()
      }
      const fallback=()=>{
        if(!live()||controller.signal.aborted)return
        cloudPlayerRef.current?.cancel()
        cloudPlayerRef.current=null
        cloudControllerRef.current=null
        // Never silently switch to a low-quality phone voice.
        showTextOnly()
      }
      try{
        const synthesisStartedAt=typeof performance!=='undefined'?performance.now():null
        const response=await fetch('/api/app/my-coach/voice/synthesize',{
          method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({provider:voiceProvider,locale:replyLocale,personaId,
            text:voiceProvider==='google_chirp3_hd'?speakable:
               voiceProvider.startsWith('gemini_tts_')?(speakable||reply).slice(0,500):reply,
            ...(voiceProvider.startsWith('gemini_tts_')?{voiceName:selectedVoice}:{}),
            voiceConsent:true,cloudVoiceConsent:true,
            ...(['fish_free','gemini_tts_free'].includes(voiceProvider)?{trainingUseConsent:true}:{})}),
        })
        if(!response.ok||!response.body)throw Error('CLOUD_TTS_UNAVAILABLE')
        if(!live()||controller.signal.aborted)return
        if(synthesisStartedAt!==null&&typeof performance!=='undefined')
          try{performance.measure?.('hh-coach-tts-headers',{start:synthesisStartedAt,end:performance.now()})}
          catch{/* Unsupported Performance API: keep audio playing. */}
        cloudPlayerRef.current=startCoachingMp3Playback(response,{
          audioElement:primedAudioRef.current,
          audioContext:audioContextRef.current,
          onLevel:level=>{if(live())levelRef.current?.(level)},
          onStart:()=>{
            if(!live())return
            if(synthesisStartedAt!==null&&typeof performance!=='undefined')
              try{performance.measure?.('hh-coach-tts-first-play',{start:synthesisStartedAt,end:performance.now()})}
              catch{/* Never break streaming and recognizer re-arm. */}
            blockedResumeRef.current=null;setNotice('');changePhase('speaking')
            beginVoiceBargeMonitor(generation)
          },
          onBlocked:()=>{
            if(!live())return
            // Safari must not demand a second Replay tap after the one Play.
            // If even the unlocked MP3 is rejected, try device narration.
            cloudPlayerRef.current?.cancel()
            cloudPlayerRef.current=null
            cloudControllerRef.current=null
            blockedResumeRef.current=null
            showTextOnly()
          },
          onEnd:()=>{
            if(!live())return
            providerUnavailableRef.current=null
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
    // A remote natural voice is required. Keep text visible if unavailable.
    showTextOnly()
  }

  function toggle(){
    if(phaseRef.current==='paused'){resumePausedSession();return}
    if(phaseRef.current==='ready'&&blockedResumeRef.current){
      blockedResumeRef.current()
      return
    }
    if(phaseRef.current==='ready'){
      retryAttemptsRef.current=0
      captureRetryRef.current={generation:-1,retries:0}
      sttRecoveryRef.current={generation:-1,retries:0}
      startListening()
      return
    }
    if(activeRef.current&&['speaking','loading','thinking'].includes(phaseRef.current)){
      interruptCoachToListen()
      return
    }
    if(activeRef.current){pauseSession();return}
    if(!canStart)return
    if(!enabled){onRequestConsent?.();return}
    // A natural prerecorded greeting must work even if this browser lacks STT.
    if(!introStartedRef.current){
      // Play is the only start gesture: the visitor starts live voice processing.
      sessionStartRef.current?.()
      activeRef.current=true
      introStartedRef.current=true
      generationRef.current+=1
      refreshCoachIos27PlaybackRoute(window.navigator)
      audioContextRef.current=shouldUseCoachingWebAudio(window.navigator)?unlockCoachingAudioContext():null
      primedAudioRef.current=audioContextRef.current?null:primeCoachingAudioGesture()
      changePhase('loading')
      if(!ios27NeedsSpeechRecovery(window.navigator))primeMicrophonePermission()
      beginVoiceBargeMonitor(generationRef.current)
      void speakCoachReply({reply:String(introduction||'').slice(0,900),mode:'intro'},'',generationRef.current,true)
      return
    }
    if(supported===false){setNotice(t.unsupported);return}
    activeRef.current=true
    generationRef.current+=1
    primeMicrophonePermission()
    startListening()
  }

  const isPaused=phase==='paused',active=phase!=='idle'&&!isPaused,ready=phase==='ready'
  const pauseLabel=({ru:'Пауза',en:'Pause',es:'Pausa'})[lang]
  const continueLabel=({ru:'Продолжить разговор',en:'Continue conversation',es:'Continuar conversación'})[lang]
  const interrupting=['speaking','loading','thinking'].includes(phase)
  const interruptLabel={ru:'Перебить коуча',en:'Interrupt coach',es:'Interrumpir al coach'}[lang]
  return <div className={styles.root} data-my-coach-voice={phase}>
    <button type="button" className={styles.button}
      onClick={toggle} disabled={!active&&!canStart}
      aria-pressed={active&&!ready} aria-label={isPaused?continueLabel:ready?(blockedResumeRef.current?t.tapToHear:t.retryMic):interrupting?interruptLabel:active?pauseLabel:!introStartedRef.current?({en:'Start session with coach introduction',ru:'Начать сессию с аудиоприветствия',es:'Iniciar con la presentación en audio'}[lang]):t.start}>
      {isPaused||(!active&&!introStartedRef.current)?
        <Play size={19} fill="currentColor" aria-hidden="true"/>:
        <Mic size={19} aria-hidden="true" data-coach-microphone-icon/>}
      <span>{isPaused?continueLabel:ready?(blockedResumeRef.current?t.tapToHear:t.retryMic):interrupting?interruptLabel:active?pauseLabel:t.start}</span>
      {phase==='speaking'&&<Volume2 size={15} aria-hidden="true" data-coach-speaker-indicator/>}
    </button>
    {supported===false&&!notice&&<p className={styles.note} role="status">{t.unsupported}</p>}
    {isPaused&&<span className={styles.status} role="status">{({ru:'Разговор на паузе',en:'Conversation paused',es:'Conversación en pausa'})[lang]}</span>}
    {active&&!notice&&<span className={styles.status} role="status" data-coach-voice-status>
      {ready?(blockedResumeRef.current?t.tapToHear:t.retryMic):phase==='loading'?t.preparing:phase==='starting'||phase==='listening'?t.listening:phase==='thinking'?t.thinking:t.speaking}
    </span>}
    {notice&&<p className={styles.note} role="status" data-coach-voice-status title={notice}>{notice}</p>}
  </div>
})

export default MyCoachSpeechLoop
