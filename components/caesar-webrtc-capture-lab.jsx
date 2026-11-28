'use client'
import {useEffect,useRef,useState} from 'react'
import {capturePcm16,captureMime,captureTracks,CAESAR_CAPTURE_AUDIO} from '@/lib/coaching/caesar-webrtc-capture.mjs'
import {connectSimliAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'
const wait=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal.aborted){reject(Error('STOPPED'));return}
 const stop=()=>{clearTimeout(timer);reject(Error('STOPPED'))}
 const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve()},ms)
 signal.addEventListener('abort',stop,{once:true})
})
export default function CaesarWebRtcCaptureLab({allowed}){
 const [confirmed,setConfirmed]=useState(false),[state,setState]=useState('idle'),[file,setFile]=useState(null)
 const video=useRef(null),audio=useRef(null),run=useRef(null),attempt=useRef(false),url=useRef(null),mounted=useRef(false)
 useEffect(()=>{mounted.current=true;const stop=()=>run.current?.abort();const hide=()=>{if(document.visibilityState==='hidden')stop()};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',stop);return()=>{mounted.current=false;stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',stop);if(url.current)URL.revokeObjectURL(url.current)}},[])
 async function start(){
  if(!allowed||!confirmed||attempt.current||run.current||document.visibilityState!=='visible')return
  const mime=captureMime(window.MediaRecorder)
  if(!mime){setState('unsupported');return}
  const controller=new AbortController();run.current=controller;const signal=controller.signal
  let context,renderer,recorder,timer,complete=false,speaking=false,lastSilent=0
  const chunks=[];let bytes=0
  setState('preparing')
  try{
   const Audio=window.AudioContext||window.webkitAudioContext
   context=new Audio();await context.resume()
   const response=await fetch(CAESAR_CAPTURE_AUDIO,{signal,cache:'no-store'});if(!response.ok)throw Error('AUDIO_MISSING')
   const data=await response.arrayBuffer();if(data.byteLength>1024*1024)throw Error('AUDIO_TOO_LARGE')
   const pcm=capturePcm16(await context.decodeAudioData(data))
   const sdk=await import('simli-client');if(signal.aborted)throw Error('STOPPED')
   attempt.current=true;setState('connecting')
   // The browser cannot mint a second token after an ambiguous response.
   timer=setTimeout(()=>controller.abort(),55000)
   const token=await fetch('/api/admin/caesar-webrtc-capture',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({job:'greeting-ru',freeOnly:true,editorialOnly:true}),signal})
   if(!token.ok)throw Error('TOKEN_REJECTED')
   const session=await token.json()
   renderer=await connectSimliAvatar({sdk,sessionToken:session.sessionToken,video:video.current,audio:audio.current,signal,onDisconnect:()=>controller.abort(),onSpeaking:()=>{speaking=true},onSilent:()=>{lastSilent=performance.now()}})
   let tracks=null;for(let i=0;i<50&&!tracks;i++){tracks=captureTracks(video.current,audio.current);if(!tracks)await wait(100,signal)}
   if(!tracks)throw Error('NATIVE_HD_TRACKS_UNAVAILABLE')
   const stream=new MediaStream(tracks)
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000,audioBitsPerSecond:128000})
   const stopped=new Promise(resolve=>{recorder.onstop=resolve})
   recorder.ondataavailable=e=>{if(e.data.size){bytes+=e.data.size;if(bytes>70*1024*1024)controller.abort();else chunks.push(e.data)}}
   recorder.onerror=()=>controller.abort()
   recorder.start(250);setState('recording');await wait(500,signal)
   const began=performance.now();let cursor=0
   while(cursor<pcm.length){if(!captureTracks(video.current,audio.current))throw Error('TRACK_CHANGED');const end=Math.min(cursor+3200,pcm.length);renderer.sendPcm16(pcm.subarray(cursor,end));cursor=end;await wait(Math.max(0,began+cursor/32-performance.now()),signal)}
   const sent=performance.now()
   // Keep the received speech and animation together. Require a speaking event
   // and a final silence; the file still needs actual visual/audio QA.
   while(performance.now()-sent<7000&&(performance.now()-sent<1800||lastSilent<sent-1000))await wait(100,signal)
   if(signal.aborted||!speaking||lastSilent<sent-1000||!captureTracks(video.current,audio.current))throw Error('CAPTURE_INCOMPLETE')
   recorder.stop();await Promise.race([stopped,wait(3000,signal).then(()=>{throw Error('RECORDER_STOP_TIMEOUT')})]);if(signal.aborted||!chunks.length)throw Error('CAPTURE_EMPTY')
   const blob=new Blob(chunks,{type:recorder.mimeType||mime});url.current=URL.createObjectURL(blob);complete=true
   if(mounted.current){setFile({url:url.current,name:'caesar-ru-native-candidate.'+(blob.type.includes('mp4')?'mp4':'webm')});setState('review')}
  }catch{if(mounted.current)setState(attempt.current?'locked':'preflight-failed')}
  finally{clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();controller.abort();try{await renderer?.stop()}catch{};try{await context?.close()}catch{};run.current=null;if(!complete&&url.current){URL.revokeObjectURL(url.current);url.current=null}}
 }
 return <section><h2>Caesar · WebRTC запись RU</h2><p>Один редакционный тест, максимум 60 секунд, только стандартный Simli-поток. Записываются полученные от Simli аудио и видео. Не Static API. Не клиентский разговор.</p><video ref={video} autoPlay playsInline muted style={{width:'100%',maxHeight:'48vh',objectFit:'contain',background:'#222'}}/><audio ref={audio} autoPlay muted/>
 <label><input type="checkbox" checked={confirmed} disabled={attempt.current||!allowed} onChange={e=>setConfirmed(e.target.checked)}/> Подтверждаю один бесплатный обычный видеозапуск и право на запись.</label><p><button type="button" disabled={!allowed||!confirmed||attempt.current||['preparing','connecting','recording'].includes(state)} onClick={start}>Записать Caesar RU</button>{' '}<button type="button" onClick={()=>run.current?.abort()} disabled={!['preparing','connecting','recording'].includes(state)}>Остановить</button></p><p role="status">{state==='locked'?'Попытка заблокирована. Не повторять без проверки расхода и результата.':state==='review'?'Получена запись-кандидат. Проверка качества обязательна.':state}</p>{file&&<a href={file.url} download={file.name}>Сохранить оригинальную запись для QA</a>}</section>
}
