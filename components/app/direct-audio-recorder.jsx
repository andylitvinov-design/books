'use client'
import {useEffect,useRef,useState} from 'react'
import {Mic,Square,X} from 'lucide-react'
import {directMediaSpec} from '@/lib/practitioners/direct-message-policy.mjs'
import styles from './direct-message-inbox.module.css'

const TEXT={
  en:{start:'Record voice',stop:'Finish recording',cancel:'Discard recording',
    recording:'Recording voice · up to 2 minutes',unavailable:'Microphone recording is unavailable. Attach an audio file instead.',
    failed:'Could not record audio. Check microphone permission and try again.',
    large:'Voice message is too large. Record a shorter message.'},
  ru:{start:'Записать голос',stop:'Завершить запись',cancel:'Удалить запись',
    recording:'Запись голоса · до 2 минут',unavailable:'Запись с микрофона недоступна. Можно прикрепить аудиофайл.',
    failed:'Не удалось записать голос. Проверьте доступ к микрофону.',
    large:'Аудиосообщение слишком большое. Сделайте запись короче.'},
  es:{start:'Grabar voz',stop:'Finalizar grabación',cancel:'Descartar grabación',
    recording:'Grabando voz · hasta 2 minutos',unavailable:'No se puede grabar. Adjunta un archivo de audio.',
    failed:'No se pudo grabar. Comprueba el permiso del micrófono.',
    large:'El audio es demasiado grande. Graba un mensaje más corto.'},
}
const MAX_SECONDS=120
const OPTIONS=[['audio/mp4','m4a'],['audio/webm;codecs=opus','webm'],['audio/webm','webm'],['audio/ogg;codecs=opus','ogg'],['audio/ogg','ogg']]

export default function DirectAudioRecorder({locale='en',disabled=false,onRecorded,onError,onRecordingChange}){
  const t=TEXT[locale]||TEXT.en
  const [recording,setRecording]=useState(false)
  const recorder=useRef(null),stream=useRef(null),timeout=useRef(null),alive=useRef(true),
    discarded=useRef(false),callbacks=useRef({onRecorded,onError,onRecordingChange})
  callbacks.current={onRecorded,onError,onRecordingChange}
  function cleanup(){
    if(timeout.current)clearTimeout(timeout.current)
    timeout.current=null
    stream.current?.getTracks().forEach(track=>track.stop())
    stream.current=null
    recorder.current=null
  }
  useEffect(()=>{
    alive.current=true
    return ()=>{
      alive.current=false
      discarded.current=true
      try{if(recorder.current?.state==='recording')recorder.current.stop()}catch{}
      cleanup()
      callbacks.current.onRecordingChange?.(false)
    }
  },[])
  function stop(discard=false){
    discarded.current=discard
    if(timeout.current)clearTimeout(timeout.current)
    timeout.current=null
    if(recorder.current?.state==='recording'){
      try{recorder.current.stop()}catch{cleanup();setRecording(false)}
    }else{cleanup();setRecording(false)}
  }
  async function start(){
    if(disabled||recording)return
    if(typeof window==='undefined'||typeof MediaRecorder==='undefined'||
      typeof MediaRecorder.isTypeSupported!=='function'||!navigator.mediaDevices?.getUserMedia){
      callbacks.current.onError?.(t.unavailable);return
    }
    const format=OPTIONS.find(([mime])=>MediaRecorder.isTypeSupported(mime))
    if(!format){callbacks.current.onError?.(t.unavailable);return}
    let acquired
    try{
      acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})
      if(!alive.current||disabled){acquired.getTracks().forEach(track=>track.stop());return}
      const instance=new MediaRecorder(acquired,{mimeType:format[0],audioBitsPerSecond:64000})
      const chunks=[]
      let bytes=0,failed=false
      discarded.current=false
      instance.ondataavailable=event=>{
        if(!event.data?.size)return
        bytes+=event.data.size
        if(bytes>20_000_000){
          failed=true
          callbacks.current.onError?.(t.large)
          if(instance.state==='recording')instance.stop()
        }else chunks.push(event.data)
      }
      instance.onerror=()=>{
        failed=true
        callbacks.current.onError?.(t.failed)
        if(instance.state==='recording')instance.stop()
      }
      instance.onstop=()=>{
        cleanup()
        if(!alive.current)return
        setRecording(false)
        callbacks.current.onRecordingChange?.(false)
        if(discarded.current||failed)return
        try{
          const type=format[0].split(';')[0]
          const blob=new Blob(chunks,{type})
          directMediaSpec(type,blob.size)
          callbacks.current.onRecorded?.(new File([blob],'voice-message.'+format[1],{type}))
        }catch{callbacks.current.onError?.(t.large)}
      }
      stream.current=acquired
      recorder.current=instance
      instance.start(1000)
      setRecording(true)
      callbacks.current.onRecordingChange?.(true)
      timeout.current=setTimeout(()=>stop(),MAX_SECONDS*1000)
    }catch{
      acquired?.getTracks().forEach(track=>track.stop())
      cleanup()
      if(alive.current){setRecording(false);callbacks.current.onRecordingChange?.(false);callbacks.current.onError?.(t.failed)}
    }
  }
  return <div className={styles.voiceRecorder}>
    {!recording?<button type="button" className={styles.recordButton} onClick={start} disabled={disabled}
      aria-label={t.start}><Mic size={17} aria-hidden="true"/>{t.start}</button>:<>
      <span role="status" className={styles.recordingState}>{t.recording}</span>
      <button type="button" className={styles.recordButton} onClick={()=>stop(false)}
        aria-label={t.stop}><Square size={16} aria-hidden="true"/>{t.stop}</button>
      <button type="button" className={styles.recordDiscard} onClick={()=>stop(true)}
        aria-label={t.cancel}><X size={17} aria-hidden="true"/></button>
    </>}
  </div>
}
