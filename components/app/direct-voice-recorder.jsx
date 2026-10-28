'use client'
import {useEffect,useRef,useState} from 'react'
import {Mic,Square,Trash2} from 'lucide-react'
import {directMediaSpec} from '@/lib/practitioners/direct-message-policy.mjs'
import styles from './direct-voice-recorder.module.css'

const STRINGS={
 en:{start:'Record voice',stop:'Finish recording',cancel:'Discard',recording:'Recording…',pending:'Requesting microphone…',
 error:'Microphone unavailable. You can attach an audio file instead.',invalid:'Recording is empty or too large.',limit:'Maximum recording length: 2 minutes.'},
 ru:{start:'Записать голос',stop:'Завершить запись',cancel:'Удалить',recording:'Идёт запись…',pending:'Запрашиваем микрофон…',
 error:'Микрофон недоступен. Можно прикрепить аудиофайл.',invalid:'Запись пустая или слишком большая.',limit:'Запись — не более 2 минут.'},
 es:{start:'Grabar voz',stop:'Terminar grabación',cancel:'Descartar',recording:'Grabando…',pending:'Solicitando micrófono…',
 error:'Micrófono no disponible. Puedes adjuntar un archivo de audio.',invalid:'Grabación vacía o demasiado grande.',limit:'Máximo 2 minutos.'},
}
const chooseMime=()=>{
  if(typeof MediaRecorder==='undefined')return ''
  for(const mime of ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'])
    if(MediaRecorder.isTypeSupported?.(mime))return mime
  return ''
}
function stopTracks(stream){for(const track of stream?.getTracks?.()||[])track.stop()}
export default function DirectVoiceRecorder({locale='en',disabled=false,onRecorded,onRecordingChange}){
  const t=STRINGS[locale]||STRINGS.en
  const current=useRef(null)
  const mounted=useRef(true)
  const reportRecording=useRef(onRecordingChange)
  reportRecording.current=onRecordingChange
  const [phase,setPhase]=useState('idle')
  const [error,setError]=useState('')
  const [seconds,setSeconds]=useState(0)
  useEffect(()=>{
    mounted.current=true
    return ()=>{mounted.current=false;dispose(true);reportRecording.current?.(false)}
  },[])
  useEffect(()=>{
    if(phase!=='recording')return
    const timer=setInterval(()=>setSeconds(s=>s+1),1000)
    return()=>clearInterval(timer)
  },[phase])
  function dispose(discard){
    const session=current.current
    if(!session)return
    session.discard=Boolean(discard)
    if(discard)reportRecording.current?.(false)
    if(session.timer)clearTimeout(session.timer)
    try{if(session.recorder.state!=='inactive')session.recorder.stop()}catch{}
    stopTracks(session.stream)
    current.current=null
  }
  function finish(discard=false){
    const session=current.current
    if(!session)return
    session.discard=Boolean(discard)
    if(session.timer)clearTimeout(session.timer)
    try{if(session.recorder.state!=='inactive')session.recorder.stop()}catch{stopTracks(session.stream)}
    // Wait for the final MediaRecorder dataavailable/onstop before starting
    // another take; otherwise a late callback could replace the new draft.
    if(mounted.current)setPhase(discard?'idle':'finalizing')
  }
  async function begin(){
    if(disabled||phase!=='idle')return
    setError('');setSeconds(0);setPhase('pending');reportRecording.current?.(true)
    let stream
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('UNSUPPORTED')
      const mime=chooseMime()
      if(!mime)throw new Error('UNSUPPORTED')
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false})
      if(!mounted.current){stopTracks(stream);return}
      const recorder=new MediaRecorder(stream,{mimeType:mime})
      const session={stream,recorder,bytes:[],discard:false,timer:null}
      current.current=session
      recorder.ondataavailable=e=>{if(e.data?.size)session.bytes.push(e.data)}
      recorder.onerror=()=>{session.discard=true;finish(true);if(mounted.current)setError(t.error)}
      recorder.onstop=()=>{
        if(session.timer)clearTimeout(session.timer)
        stopTracks(stream)
        if(current.current===session)current.current=null
        if(!mounted.current||session.discard)return
        const kind=(recorder.mimeType||mime).split(';')[0].toLowerCase()
        const extension=kind==='audio/mp4'?'m4a':kind==='audio/ogg'?'ogg':'webm'
        const audio=new File(session.bytes,'voice-'+Date.now()+'.'+extension,{type:kind})
        try{directMediaSpec(kind,audio.size);onRecorded?.(audio);setError('')}
        catch{setError(t.invalid)}
        setPhase('idle')
        reportRecording.current?.(false)
      }
      recorder.start(1000)
      setPhase('recording')
      session.timer=setTimeout(()=>finish(false),120000)
    }catch{
      stopTracks(stream)
      if(mounted.current){setError(t.error);setPhase('idle');reportRecording.current?.(false)}
    }
  }
  return <div className={styles.root} data-voice-recorder>
    {phase==='recording'?<div className={styles.recording}>
      <button type="button" onClick={()=>finish(false)} className={styles.stop} aria-label={t.stop}>
        <Square size={16} fill="currentColor" aria-hidden="true"/>{t.stop} {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}
      </button>
      <button type="button" onClick={()=>finish(true)} className={styles.discard} aria-label={t.cancel}><Trash2 size={18}/></button>
    </div>:<button type="button" className={styles.start}
      disabled={disabled||phase!=='idle'} onClick={begin} aria-label={t.start}>
      <Mic size={17} aria-hidden="true"/>{phase==='pending'?t.pending:phase==='finalizing'?t.stop:t.start}
    </button>}
    {phase==='recording'&&<span className={styles.hint} role="status">{t.recording} {t.limit}</span>}
    {error&&<span className={styles.error} role="alert">{error}</span>}
  </div>
}
