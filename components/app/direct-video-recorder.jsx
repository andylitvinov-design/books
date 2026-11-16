'use client'
import {useEffect,useRef,useState} from 'react'
import {Video,Square,Trash2} from 'lucide-react'
import {directMediaSpec} from '@/lib/practitioners/direct-message-policy.mjs'
import styles from './direct-video-recorder.module.css'

const COPY={
 en:{start:'Record video',stop:'Finish video',cancel:'Discard video',pending:'Opening camera…',
   recording:'Video note',limit:'60 seconds max',error:'Camera or microphone unavailable. Attach a short video instead.',
   invalid:'Video is empty or exceeds 20 MB.'},
 ru:{start:'Записать видео',stop:'Завершить видео',cancel:'Удалить видео',pending:'Открываем камеру…',
   recording:'Видеосообщение',limit:'Не более 60 секунд',error:'Камера или микрофон недоступны. Можно прикрепить короткое видео.',
   invalid:'Видео пустое или больше 20 МБ.'},
 es:{start:'Grabar vídeo',stop:'Terminar vídeo',cancel:'Descartar vídeo',pending:'Abriendo cámara…',
   recording:'Videomensaje',limit:'Máximo 60 segundos',error:'Cámara o micrófono no disponible. Adjunta un vídeo corto.',
   invalid:'El vídeo está vacío o supera 20 MB.'},
}
const MAX_MILLIS=60_000
function chooseMime(){
 if(typeof MediaRecorder==='undefined')return ''
 for(const type of ['video/mp4','video/webm;codecs=vp8,opus','video/webm'])
   if(MediaRecorder.isTypeSupported?.(type))return type
 return ''
}
function stopTracks(stream){for(const track of stream?.getTracks?.()||[])track.stop()}

// A video note is a local draft until the member taps Send. Never auto-upload.
export default function DirectVideoRecorder({locale='en',disabled=false,onRecorded,onRecordingChange}){
 const t=COPY[locale]||COPY.en
 const [phase,setPhase]=useState('idle'),[seconds,setSeconds]=useState(0),[error,setError]=useState('')
 const current=useRef(null),preview=useRef(null),mounted=useRef(true)
 const report=useRef(onRecordingChange)
 report.current=onRecordingChange
 useEffect(()=>{
   mounted.current=true
   const close=()=>dispose(true)
   window.addEventListener('pagehide',close)
   return()=>{mounted.current=false;window.removeEventListener('pagehide',close);dispose(true);report.current?.(false)}
 },[])
 useEffect(()=>{
   if(phase!=='recording')return
   const id=setInterval(()=>setSeconds(value=>Math.min(60,value+1)),1000)
   if(preview.current&&current.current)preview.current.srcObject=current.current.stream
   return()=>clearInterval(id)
 },[phase])
 function dispose(discard){
   const session=current.current
   if(!session)return
   session.discard=Boolean(discard)
   if(session.timer)clearTimeout(session.timer)
   try{if(session.recorder.state!=='inactive')session.recorder.stop()}catch{}
   stopTracks(session.stream)
   if(preview.current)preview.current.srcObject=null
   current.current=null
   if(mounted.current){setPhase('idle');report.current?.(false)}
 }
 function finish(discard=false){
   const session=current.current
   if(!session)return
   session.discard=Boolean(discard)
   if(session.timer)clearTimeout(session.timer)
   try{if(session.recorder.state!=='inactive')session.recorder.stop()}catch{
     stopTracks(session.stream)
     current.current=null
     if(mounted.current){setPhase('idle');report.current?.(false)}
     return
   }
   if(mounted.current)setPhase('finalizing')
 }
 async function begin(){
   if(disabled||phase!=='idle')return
   setError('');setSeconds(0);setPhase('pending');report.current?.(true)
   let stream
   try{
     if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')
       throw new Error('CAMERA_UNSUPPORTED')
     const mime=chooseMime()
     if(!mime)throw new Error('VIDEO_FORMAT_UNSUPPORTED')
     stream=await navigator.mediaDevices.getUserMedia({
       video:{facingMode:{ideal:'user'},width:{ideal:400},height:{ideal:400},frameRate:{ideal:18}},
       audio:{echoCancellation:true,noiseSuppression:true},
     })
     if(!mounted.current){stopTracks(stream);return}
     const recorder=new MediaRecorder(stream,{
       mimeType:mime,videoBitsPerSecond:330_000,audioBitsPerSecond:32_000,
     })
     const session={stream,recorder,chunks:[],discard:false,timer:null}
     current.current=session
     recorder.ondataavailable=event=>{
       if(event.data?.size)session.chunks.push(event.data)
       if(session.chunks.reduce((total,chunk)=>total+chunk.size,0)>20_000_000){
         session.discard=true
         finish(true)
         if(mounted.current)setError(t.invalid)
       }
     }
     recorder.onerror=()=>{
       session.discard=true;finish(true)
       if(mounted.current)setError(t.error)
     }
     recorder.onstop=()=>{
       if(session.timer)clearTimeout(session.timer)
       stopTracks(stream)
       if(preview.current)preview.current.srcObject=null
       if(current.current!==session||!mounted.current)return
       current.current=null
       setPhase('idle')
       report.current?.(false)
       if(session.discard)return
       const kind=(recorder.mimeType||mime).split(';')[0].toLowerCase()
       const suffix=kind==='video/mp4'?'mp4':'webm'
       const clip=new File(session.chunks,'video-note-'+Date.now()+'.'+suffix,{type:kind})
       try{directMediaSpec(kind,clip.size);onRecorded?.(clip);setError('')}
       catch{setError(t.invalid)}
     }
     recorder.start(500)
     setPhase('recording')
     session.timer=setTimeout(()=>finish(false),MAX_MILLIS)
   }catch{
     stopTracks(stream)
     if(mounted.current){setError(t.error);setPhase('idle');report.current?.(false)}
   }
 }
 return <div className={styles.root} data-video-recorder>
   {phase==='recording'&&<div className={styles.capture}>
     <video ref={preview} muted autoPlay playsInline aria-label={t.recording} className={styles.camera}/>
     <div className={styles.controls}>
       <button type="button" className={styles.stop} onClick={()=>finish(false)} aria-label={t.stop}>
         <Square size={15} fill="currentColor" aria-hidden="true"/>
         {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}
       </button>
       <button type="button" className={styles.discard} onClick={()=>finish(true)} aria-label={t.cancel}>
         <Trash2 size={18} aria-hidden="true"/>
       </button>
     </div>
     <span className={styles.hint} role="status">{t.recording} · {t.limit}</span>
   </div>}
   {phase!=='recording'&&<button type="button" className={styles.start}
     disabled={disabled||phase!=='idle'} onClick={begin} aria-label={t.start}>
     <Video size={17} aria-hidden="true"/>{phase==='pending'?t.pending:phase==='finalizing'?t.stop:t.start}
   </button>}
   {error&&<span role="alert" className={styles.error}>{error}</span>}
 </div>
}
