'use client'

import {useEffect,useRef,useState} from 'react'
import {AudioLines,Mic,MicOff,Pause,Play,Send,Square,Volume2,X} from 'lucide-react'
import styles from './coaching-live-voice.module.css'

const speechLanguages={en:'en-US',ru:'ru-RU',es:'es-ES'}
const labels={
  en:{
    launch:'Live Voice',heading:'Talk with your AI coach',disclosure:'Optional AI conversation using OpenRouter for text responses and your device for speech. Your browser may send microphone audio to its speech-recognition provider. No audio or transcript is saved to your coaching report or Life Plan. Provider data handling depends on the provider.',
    start:'I understand · Start',waiting:'Ready when you are',listening:'Listening…',thinking:'Thinking…',
    speaking:'Coach speaking',paused:'Paused',close:'Close live voice',stop:'End conversation',
    pause:'Pause',resume:'Resume',mute:'Turn microphone off',unmute:'Turn microphone on',
    interrupt:'Interrupt coach',repeat:'Repeat answer',send:'Send',type:'Or type a message',
    microphone:'Microphone',language:'Conversation language',micUnsupported:'Speech recognition is unavailable here; type your message.',
    playbackUnavailable:'Speech playback is unavailable on this device; read the reply.',
    permission:'Microphone access was blocked. Enable it in browser settings or type.',
    error:'Voice response is unavailable. Your existing coaching answers are unchanged.',
    safetyStop:'Coaching paused for safety · seek human support.',
    micEnded:'The browser stopped listening. Tap the microphone to start again.',
    empty:'Say something or type your message.',tooShort:'Please say a few more words.',private:'Private in this tab · AI, not a human practitioner',
    recent:'Latest reply',textMode:'You can use typed conversation even without a microphone.',
    offline:'AI unavailable · an authored coaching question is shown instead.',
  },
  ru:{
    launch:'Живой голос',heading:'Разговор с AI-коучем',disclosure:'Дополнительный AI-диалог: OpenRouter формирует текст ответа, устройство распознаёт речь и озвучивает ответ. Браузер может передавать голос поставщику распознавания. Аудио и история диалога не сохраняются в отчёте или Life Plan. Обработка данных у поставщика регулируется его правилами.',
    start:'Понимаю · Начать',waiting:'Можно начинать',listening:'Слушаю…',thinking:'Обдумываю…',
    speaking:'Коуч отвечает',paused:'Пауза',close:'Закрыть голосовой диалог',stop:'Завершить разговор',
    pause:'Пауза',resume:'Продолжить',mute:'Выключить микрофон',unmute:'Включить микрофон',
    interrupt:'Перебить коуча',repeat:'Повторить ответ',send:'Отправить',type:'Или напишите сообщение',
    microphone:'Микрофон',language:'Язык беседы',micUnsupported:'Распознавание речи недоступно — напишите сообщение.',
    playbackUnavailable:'Озвучка недоступна — прочитайте ответ.',
    permission:'Доступ к микрофону запрещён. Разрешите его в браузере или напишите сообщение.',
    error:'Не удалось получить ответ. Сохранённые ответы коучинг-сессии не затронуты.',
    safetyStop:'Коучинг остановлен ради безопасности · обратитесь за помощью.',
    micEnded:'Браузер остановил запись. Нажмите на микрофон, чтобы продолжить.',
    empty:'Скажите что-нибудь или напишите сообщение.',tooShort:'Пожалуйста, скажите чуть подробнее.',private:'Приватно в этой вкладке · AI, не живой специалист',
    recent:'Последний ответ',textMode:'Письменный диалог доступен и без микрофона.',
    offline:'AI сейчас недоступен · показываем авторский вопрос.',
  },
  es:{
    launch:'Voz en vivo',heading:'Habla con tu coach de IA',disclosure:'Conversación opcional con OpenRouter para respuestas de texto y tu dispositivo para voz. El navegador puede enviar audio al proveedor de reconocimiento. Ni el audio ni el historial se guardan en el informe o Life Plan. El tratamiento de datos depende de cada proveedor.',
    start:'Entiendo · Empezar',waiting:'Cuando quieras',listening:'Escuchando…',thinking:'Pensando…',
    speaking:'El coach habla',paused:'En pausa',close:'Cerrar conversación',stop:'Terminar conversación',
    pause:'Pausar',resume:'Continuar',mute:'Apagar micrófono',unmute:'Encender micrófono',
    interrupt:'Interrumpir al coach',repeat:'Repetir respuesta',send:'Enviar',type:'O escribe un mensaje',
    microphone:'Micrófono',language:'Idioma',micUnsupported:'El reconocimiento de voz no está disponible; escribe.',
    playbackUnavailable:'No hay reproducción de voz; lee la respuesta.',
    permission:'El micrófono está bloqueado. Actívalo en el navegador o escribe.',
    error:'El coach no pudo responder. Tus respuestas guardadas siguen intactas.',
    safetyStop:'Coaching detenido por seguridad · busca apoyo humano.',
    micEnded:'El navegador dejó de escuchar. Toca el micrófono para continuar.',
    empty:'Habla o escribe un mensaje.',tooShort:'Di unas palabras más, por favor.',private:'Privado en esta pestaña · IA, no profesional humano',
    recent:'Última respuesta',textMode:'Puedes escribir incluso sin micrófono.',
    offline:'IA no disponible · se muestra una pregunta preparada.',
  },
}
const statusCopy=(t,phase)=>({
  ready:t.waiting,listening:t.listening,thinking:t.thinking,speaking:t.speaking,paused:t.paused,
})[phase]||t.waiting

export default function CoachingLiveVoice({locale='en',sessionId,accountId,disabled=false}){
  const initial=Object.hasOwn(labels,locale)?locale:'en'
  const [visible,setVisible]=useState(false)
  const [language,setLanguage]=useState(initial)
  const [started,setStarted]=useState(false)
  const [safetyHandoff,setSafetyHandoff]=useState(false)
  const [phase,setPhase]=useState('ready')
  const [micOn,setMicOn]=useState(false)
  const [lastReply,setLastReply]=useState('')
  const [replyMode,setReplyMode]=useState('')
  const [interim,setInterim]=useState('')
  const [draft,setDraft]=useState('')
  const [error,setError]=useState('')
  const [support,setSupport]=useState({stt:true,tts:true})
  const dialogRef=useRef(null)
  const recognitionRef=useRef(null)
  const networkRef=useRef(null)
  const silenceRef=useRef(null)
  const pendingRef=useRef('')
  const historyRef=useRef([])
  const generationRef=useRef(0)
  const phaseRef=useRef('ready')
  const activeRef=useRef(false)
  const pausedRef=useRef(false)
  const safetyRef=useRef(false)
  const micRef=useRef(false)
  const localeRef=useRef(initial)
  const t=labels[language]||labels.en

  function phaseTo(next){phaseRef.current=next;setPhase(next)}
  function cancelSilence(){
    if(silenceRef.current!==null){clearTimeout(silenceRef.current);silenceRef.current=null}
  }
  function stopRecognition(){
    const recognition=recognitionRef.current
    recognitionRef.current=null
    if(recognition){
      recognition.onresult=null;recognition.onerror=null;recognition.onend=null
      try{recognition.abort()}catch{}
    }
    cancelSilence()
    pendingRef.current=''
    setInterim('')
  }
  function cancelPlayback(){
    if(typeof window!=='undefined')window.speechSynthesis?.cancel()
  }
  function abortPending(){
    generationRef.current+=1
    networkRef.current?.abort()
    networkRef.current=null
  }
  function resetAudio(){
    stopRecognition()
    abortPending()
    cancelPlayback()
  }
  function end(){
    activeRef.current=false
    pausedRef.current=false
    safetyRef.current=false
    setSafetyHandoff(false)
    micRef.current=false
    resetAudio()
    historyRef.current=[]
    setStarted(false)
    setMicOn(false)
    setLastReply('')
    setReplyMode('')
    setDraft('')
    setError('')
    phaseTo('ready')
    setVisible(false)
  }
  // Leaving a route, changing account/session or hiding a tab never leaves
  // a microphone or an orphaned playback running. No audio is stored.
  useEffect(()=>{
    return ()=>{
      activeRef.current=false;pausedRef.current=true;micRef.current=false
      const recognition=recognitionRef.current
      recognitionRef.current=null
      if(recognition){recognition.onresult=null;recognition.onerror=null;recognition.onend=null;try{recognition.abort()}catch{}}
      networkRef.current?.abort()
      generationRef.current+=1
      if(silenceRef.current!==null)clearTimeout(silenceRef.current)
      if(typeof window!=='undefined')window.speechSynthesis?.cancel()
    }
  },[sessionId,accountId])
  useEffect(()=>{
    const dialog=dialogRef.current
    if(visible && dialog && !dialog.open)dialog.showModal()
    if(!visible && dialog?.open)dialog.close()
  },[visible])
  useEffect(()=>{
    const onHidden=()=>{
      if(document.visibilityState==='hidden' && activeRef.current){
        pausedRef.current=true
        const recognition=recognitionRef.current
        recognitionRef.current=null
        if(recognition){recognition.onresult=null;recognition.onerror=null;recognition.onend=null;try{recognition.abort()}catch{}}
        networkRef.current?.abort();generationRef.current+=1
        if(silenceRef.current!==null){clearTimeout(silenceRef.current);silenceRef.current=null}
        pendingRef.current=''
        window.speechSynthesis?.cancel()
        phaseRef.current='paused';setPhase('paused')
      }
    }
    document.addEventListener('visibilitychange',onHidden)
    return ()=>document.removeEventListener('visibilitychange',onHidden)
  },[])

  function openDialog(){
    if(disabled||!sessionId)return
    setError('')
    cancelPlayback() // The existing question narration must not leak into live capture.
    setSupport({
      stt:!!(window.SpeechRecognition||window.webkitSpeechRecognition),
      tts:!!(window.speechSynthesis&&window.SpeechSynthesisUtterance),
    })
    setVisible(true)
  }

  function startListening(){
    if(!activeRef.current||pausedRef.current||safetyRef.current||!micRef.current)return
    if(recognitionRef.current)return
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!Recognition){
      micRef.current=false;setMicOn(false)
      phaseTo('ready');setError(t.micUnsupported)
      return
    }
    const recognition=new Recognition()
    recognitionRef.current=recognition
    recognition.lang=speechLanguages[localeRef.current]
    recognition.continuous=true
    recognition.interimResults=true
    recognition.maxAlternatives=1
    pendingRef.current=''
    phaseTo('listening')
    recognition.onresult=event=>{
      if(recognitionRef.current!==recognition||!activeRef.current||pausedRef.current)return
      const rows=Array.from(event.results||[])
      const finalText=rows.filter(row=>row.isFinal).map(row=>row[0]?.transcript||'').join(' ').trim()
      const temporary=rows.filter(row=>!row.isFinal).map(row=>row[0]?.transcript||'').join(' ').trim()
      pendingRef.current=finalText
      setInterim((finalText+' '+temporary).trim().slice(0,1200))
      cancelSilence()
      // Do not commit partial recognition as one coaching turn. Wait for a
      // natural silence window; more speech cancels and extends the window.
      if(finalText && !temporary){
        silenceRef.current=setTimeout(()=>{
          if(recognitionRef.current===recognition && activeRef.current&&!pausedRef.current){
            const said=pendingRef.current.trim()
            if(said)void sendTurn(said)
          }
        },1900)
      }
    }
    recognition.onerror=event=>{
      if(recognitionRef.current!==recognition)return
      recognitionRef.current=null
      cancelSilence()
      pendingRef.current=''
      setInterim('')
      micRef.current=false
      setMicOn(false)
      if(event.error==='not-allowed'||event.error==='service-not-allowed'){
        setError(t.permission)
      }else if(event.error!=='aborted'&&event.error!=='no-speech'){
        setError(t.micUnsupported)
      }else if(event.error==='no-speech'){
        setError(t.micEnded)
      }
      phaseTo('ready')
    }
    recognition.onend=()=>{
      if(recognitionRef.current!==recognition)return
      recognitionRef.current=null
      // Some browsers stop recognizing after one phrase or a silence timeout.
      // Do not keep showing a live microphone when browser capture has ended.
      if(pendingRef.current&&!pausedRef.current){
        const spoken=pendingRef.current.trim()
        cancelSilence()
        pendingRef.current=''
        if(spoken)void sendTurn(spoken)
      }else{
        cancelSilence()
        micRef.current=false
        setMicOn(false)
        setInterim('')
        if(activeRef.current&&!pausedRef.current){
          phaseTo('ready')
          setError(t.micEnded)
        }
      }
    }
    try{recognition.start()}
    catch{
      recognitionRef.current=null
      micRef.current=false;setMicOn(false)
      phaseTo('ready');setError(t.micUnsupported)
    }
  }

  function speakReply(reply,replyLocale){
    const synth=window.speechSynthesis
    if(!synth||!window.SpeechSynthesisUtterance){
      phaseTo(safetyRef.current?'paused':'ready')
      setError(t.playbackUnavailable)
      if(micRef.current&&!safetyRef.current)startListening()
      return
    }
    synth.cancel()
    const utterance=new window.SpeechSynthesisUtterance(reply)
    utterance.lang=speechLanguages[replyLocale]||speechLanguages.en
    utterance.rate=0.99
    const thisGeneration=generationRef.current
    utterance.onend=()=>{
      if(thisGeneration!==generationRef.current||!activeRef.current||pausedRef.current)return
      if(safetyRef.current){phaseTo('paused');return}
      phaseTo('ready')
      if(micRef.current)startListening()
    }
    utterance.onerror=()=>{
      if(thisGeneration!==generationRef.current||!activeRef.current||pausedRef.current)return
      phaseTo(safetyRef.current?'paused':'ready');setError(t.playbackUnavailable)
      if(micRef.current&&!safetyRef.current)startListening()
    }
    phaseTo('speaking')
    synth.speak(utterance)
  }

  async function sendTurn(raw){
    const message=String(raw||'').trim().slice(0,1200)
    if(safetyRef.current)return // Crisis handoff is terminal for this ephemeral dialogue.
    if(message.length<3){setError(message?t.tooShort:t.empty);return}
    if(!activeRef.current||pausedRef.current){
      if(!message)setError(t.empty)
      return
    }
    stopRecognition()
    abortPending()
    cancelPlayback()
    setError('')
    setDraft('')
    const context=historyRef.current.slice(-6)
    const requestGeneration=generationRef.current
    const controller=new AbortController()
    networkRef.current=controller
    phaseTo('thinking')
    try{
      const response=await fetch('/api/app/coaching/voice/turn',{
        method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
        headers:{
          'Content-Type':'application/json',
          ...(accountId?{'x-hh-account-id':accountId}:{}),
        },
        body:JSON.stringify({
          sessionId,locale:localeRef.current,message,history:context,voiceConsent:true,
        }),
      })
      const result=await response.json()
      if(!activeRef.current||pausedRef.current||generationRef.current!==requestGeneration)return
      if(!response.ok||typeof result.reply!=='string'||!result.reply.trim())throw Error('VOICE_ERROR')
      historyRef.current=[...context,{role:'user',text:message},{role:'assistant',text:result.reply}].slice(-6)
      if(result.safety==='urgent'){
        safetyRef.current=true
        setSafetyHandoff(true)
        micRef.current=false
        setMicOn(false)
      }
      setLastReply(result.reply)
      setReplyMode(result.mode==='offline'?'offline':result.mode==='safety'?'safety':'ai')
      if(['en','ru','es'].includes(result.locale)){
        localeRef.current=result.locale
        setLanguage(result.locale)
      }
      speakReply(result.reply,result.locale||localeRef.current)
    }catch{
      if(!activeRef.current||pausedRef.current||generationRef.current!==requestGeneration)return
      setError(t.error)
      phaseTo('ready')
    }finally{
      if(networkRef.current===controller)networkRef.current=null
    }
  }

  function start(){
    activeRef.current=true
    pausedRef.current=false
    safetyRef.current=false
    setSafetyHandoff(false)
    micRef.current=support.stt
    setStarted(true)
    setMicOn(support.stt)
    setError('')
    phaseTo('ready')
    if(support.stt)startListening()
  }
  function interrupt(){
    if(!activeRef.current||pausedRef.current||safetyRef.current)return
    resetAudio()
    phaseTo('ready')
    if(micRef.current)startListening()
  }
  function pauseOrResume(){
    if(!activeRef.current||safetyRef.current)return
    if(!pausedRef.current){
      pausedRef.current=true
      resetAudio()
      phaseTo('paused')
    }else{
      pausedRef.current=false
      phaseTo('ready')
      if(micRef.current)startListening()
    }
  }
  function toggleMic(){
    if(!activeRef.current||safetyRef.current)return
    if(micRef.current){
      micRef.current=false;setMicOn(false)
      stopRecognition()
      if(phaseRef.current==='listening')phaseTo('ready')
    }else{
      micRef.current=true;setMicOn(true);setError('')
      if(!pausedRef.current){
        if(phaseRef.current==='thinking'||phaseRef.current==='speaking')interrupt()
        else startListening()
      }
    }
  }
  function switchLanguage(next){
    if(!Object.hasOwn(labels,next)||next===localeRef.current)return
    resetAudio()
    localeRef.current=next
    setLanguage(next)
    setError('')
    if(activeRef.current){
      phaseTo(pausedRef.current?'paused':'ready')
      if(micRef.current&&!pausedRef.current)startListening()
    }
  }

  return <>
    <button type="button" className={styles.launch} onClick={openDialog}
      disabled={disabled||!sessionId} aria-label={labels[initial].launch} data-coaching-live-voice-launch>
      <AudioLines size={17} aria-hidden="true"/><span className={styles.launchText}>{labels[initial].launch}</span>
    </button>
    <dialog ref={dialogRef} className={styles.dialog} aria-label={t.heading}
      onCancel={event=>{event.preventDefault();end()}} data-coaching-live-voice-dialog>
      <header className={styles.head}>
        <div><small>HOLISTIC HOUSE · LIVE VOICE</small><h2>{t.heading}</h2></div>
        <button type="button" className={styles.icon} onClick={end} aria-label={t.close}><X size={20}/></button>
      </header>
      {!started ? <>
        <p className={styles.disclosure}>{t.disclosure}</p>
        <p className={styles.subtle}>{t.textMode}</p>
        <button type="button" className={styles.mainAction} onClick={start}>{t.start}<Play size={17}/></button>
      </> : <>
        <div className={styles.topControls}>
          <label htmlFor="hh-coaching-live-language">{t.language}</label>
          <select id="hh-coaching-live-language" value={language} onChange={e=>switchLanguage(e.target.value)}>
            <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
          </select>
        </div>
        <div className={styles.avatar} data-voice-phase={phase} aria-hidden="true">
          <span className={styles.pulse}><AudioLines size={38}/></span>
        </div>
        <div className={styles.phase} role="status" aria-live="polite">{safetyHandoff&&phase!=='speaking'?t.safetyStop:statusCopy(t,phase)}</div>
        {replyMode==='offline'&&<p className={styles.subtle} role="status">{t.offline}</p>}
        {interim&&<p className={styles.interim} aria-live="off">{interim}</p>}
        {lastReply&&<div className={styles.reply} aria-label={t.recent}>
          <strong>{t.recent}</strong><p>{lastReply}</p>
        </div>}
        <div className={styles.controls}>
          <button type="button" onClick={toggleMic} disabled={safetyHandoff} aria-pressed={micOn} title={micOn?t.mute:t.unmute}>
            {micOn?<Mic size={21}/>:<MicOff size={21}/>}<span>{t.microphone}</span>
          </button>
          <button type="button" onClick={pauseOrResume} disabled={safetyHandoff}>
            {phase==='paused'?<Play size={21}/>:<Pause size={21}/>}<span>{phase==='paused'?t.resume:t.pause}</span>
          </button>
          <button type="button" onClick={interrupt} disabled={safetyHandoff||(phase!=='thinking'&&phase!=='speaking')}>
            <Square size={21}/><span>{t.interrupt}</span>
          </button>
          <button type="button" onClick={()=>{if(lastReply){resetAudio();speakReply(lastReply,localeRef.current)}}}
            disabled={!lastReply||(phase==='paused'&&!safetyHandoff)}>
            <Volume2 size={21}/><span>{t.repeat}</span>
          </button>
        </div>
        <form className={styles.composer} onSubmit={event=>{event.preventDefault();void sendTurn(draft)}}>
          <label htmlFor="hh-coaching-live-text">{t.type}</label>
          <div><input id="hh-coaching-live-text" type="text" value={draft} maxLength={1200}
            onChange={event=>setDraft(event.target.value)} placeholder={t.type}
            disabled={phase==='paused'||safetyHandoff} />
            <button type="submit" disabled={!draft.trim()||phase==='paused'||safetyHandoff} aria-label={t.send}><Send size={20}/></button>
          </div>
        </form>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        {!support.stt&&<p className={styles.subtle}>{t.micUnsupported}</p>}
        <button type="button" className={styles.end} onClick={end}><Square size={16}/>{t.stop}</button>
      </>}
      <p className={styles.privacy}>{t.private}</p>
    </dialog>
  </>
}
