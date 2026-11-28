'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {capturePcm16,captureTracks,CAESAR_CAPTURE_AUDIO} from '@/lib/coaching/caesar-webrtc-capture.mjs'
import {captureBrowserProblem,captureProblem,captureUiMime} from '@/lib/coaching/caesar-capture-ui.mjs'
import {connectSimliAvatar} from '@/lib/coaching/live-avatar-renderers.mjs'
import {archiveStatus,saveCapture,retainCapture,recoverCapture,clearCapture} from '@/lib/coaching/caesar-capture-autosave.mjs'
import {ARCHIVE_API,ARCHIVE_MAX_BYTES} from '@/lib/coaching/caesar-capture-archive.mjs'
const wait=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal.aborted){reject(Error('STOPPED'));return}
 const stop=()=>{clearTimeout(timer);reject(Error('STOPPED'))}
 const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve()},ms)
 signal.addEventListener('abort',stop,{once:true})
})
const bounded=(promise,signal)=>new Promise((resolve,reject)=>{
 if(signal.aborted){reject(Error('STOPPED'));return}
 const stop=()=>reject(Error('STOPPED'))
 signal.addEventListener('abort',stop,{once:true})
 Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop))
})
const busyStates=['preparing','connecting','recording','saving','uploading']
const labels={idle:'Готово к записи',preparing:'Проверяем озвучку…',connecting:'Подключаем Caesar…',recording:'Записываем приветствие…',saving:'Сохраняем видео…',review:'Запись получена. Требуется проверка качества.'}
const primary={display:'block',width:'100%',minHeight:54,border:0,borderRadius:14,background:'#17634e',color:'white',font:'600 17px system-ui',padding:'12px 16px',cursor:'pointer',textAlign:'center',boxSizing:'border-box'}
export default function CaesarWebRtcCaptureLab({allowed}){
 const [state,setState]=useState('idle'),[file,setFile]=useState(null),[problem,setProblem]=useState(null),[checked,setChecked]=useState(false)
 const [archiveReady,setArchiveReady]=useState(false),[archived,setArchived]=useState(false),[duration,setDuration]=useState(null)
 const saving=useRef(false)
 const archiveFile=useCallback(async blob=>{
  if(saving.current)return
  saving.current=true;setState('uploading');setProblem(null)
  try{try{await retainCapture(blob)}catch{/* Keep the current in-memory copy. */} await saveCapture(blob);try{await clearCapture()}catch{};if(mounted.current){setArchived(true);setState('review')}}
  catch{if(mounted.current){setState('upload-failed');setProblem('ARCHIVE_UPLOAD_FAILED')}}finally{saving.current=false}
 },[])
 const video=useRef(null),audio=useRef(null),run=useRef(null),attempt=useRef(false),url=useRef(null),mounted=useRef(false)
 useEffect(()=>{mounted.current=true;setProblem(captureBrowserProblem(window)||(!captureUiMime(window)?.includes('mp4')?'MP4_REQUIRED':null));setChecked(true);let alive=true;void (async()=>{try{const status=await archiveStatus();if(!alive)return;if(status.present){setArchived(true);attempt.current=true}const recovered=await recoverCapture().catch(()=>null);if(!alive)return;setArchiveReady(true);if(!recovered)return;attempt.current=true;url.current=URL.createObjectURL(recovered);setFile({url:url.current,name:'caesar-ru-native-candidate.mp4',blob:recovered});void archiveFile(recovered)}catch{if(alive)setProblem('ARCHIVE_UNAVAILABLE')}})();const stop=()=>run.current?.abort();const hide=()=>{if(document.visibilityState==='hidden')stop()};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',stop);return()=>{alive=false;mounted.current=false;stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',stop);if(url.current)URL.revokeObjectURL(url.current)}},[archiveFile])
 async function start(){
  if(!allowed||!checked||!archiveReady||archived||attempt.current||run.current||document.visibilityState!=='visible')return
  const issue=captureBrowserProblem(window),mime=captureUiMime(window)
  if(issue||!mime||!mime.includes('mp4')){setProblem(issue||'MP4_REQUIRED');return}
  const controller=new AbortController();run.current=controller;const signal=controller.signal
  let context,renderer,recorder,timer,complete=false,speaking=false,lastSilent=0
  const chunks=[];let bytes=0
  setProblem(null);setState('preparing')
  try{
   timer=setTimeout(()=>controller.abort(),25000)
   const Audio=window.AudioContext||window.webkitAudioContext
   context=new Audio();await bounded(context.resume(),signal)
   const response=await fetch(CAESAR_CAPTURE_AUDIO,{signal,cache:'no-store'});if(!response.ok)throw Error('AUDIO_MISSING')
   const data=await bounded(response.arrayBuffer(),signal);if(data.byteLength>1024*1024)throw Error('AUDIO_TOO_LARGE')
   const decoded=await bounded(context.decodeAudioData(data),signal);setDuration(decoded.duration)
   const pcm=capturePcm16(decoded)
   const status=await bounded(archiveStatus(),signal);if(status.present){setArchived(true);attempt.current=true;throw Error('ARCHIVE_EXISTS')}
   const sdk=await bounded(import('simli-client'),signal);if(signal.aborted)throw Error('STOPPED')
   clearTimeout(timer);attempt.current=true;setState('connecting')
   timer=setTimeout(()=>controller.abort(),55000)
   const token=await fetch('/api/admin/caesar-webrtc-capture',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({job:'greeting-ru',freeOnly:true,editorialOnly:true}),signal})
   if(!token.ok){const error=await token.json().catch(()=>null);throw Error(['ACCESS_DENIED','CAPTURE_NOT_APPROVED','RATE_LIMITED','CAPTURE_ATTEMPT_LOCKED'].includes(error?.error)?error.error:'CAPTURE_ATTEMPT_LOCKED')}
   const session=await token.json()
   renderer=await connectSimliAvatar({sdk,sessionToken:session.sessionToken,video:video.current,audio:audio.current,signal,onDisconnect:()=>controller.abort(),onSpeaking:()=>{speaking=true},onSilent:()=>{lastSilent=performance.now()}})
   let tracks=null;for(let i=0;i<50&&!tracks;i++){tracks=captureTracks(video.current,audio.current);if(!tracks)await wait(100,signal)}
   if(!tracks)throw Error('NATIVE_HD_TRACKS_UNAVAILABLE')
   const stream=new MediaStream(tracks)
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000,audioBitsPerSecond:128000})
   const stopped=new Promise(resolve=>{recorder.onstop=resolve})
   recorder.ondataavailable=e=>{if(e.data.size){bytes+=e.data.size;if(bytes>ARCHIVE_MAX_BYTES)controller.abort();else chunks.push(e.data)}}
   recorder.onerror=()=>controller.abort()
   recorder.start(250);setState('recording');await wait(500,signal)
   const began=performance.now();let cursor=0
   while(cursor<pcm.length){if(!captureTracks(video.current,audio.current))throw Error('TRACK_CHANGED');const end=Math.min(cursor+3200,pcm.length);renderer.sendPcm16(pcm.subarray(cursor,end));cursor=end;await wait(Math.max(0,began+cursor/32-performance.now()),signal)}
   const sent=performance.now()
   while(performance.now()-sent<7000&&(performance.now()-sent<1800||lastSilent<sent-1000))await wait(100,signal)
   if(signal.aborted||!speaking||lastSilent<sent-1000||!captureTracks(video.current,audio.current))throw Error('CAPTURE_INCOMPLETE')
   setState('saving');recorder.stop();await Promise.race([stopped,wait(3000,signal).then(()=>{throw Error('RECORDER_STOP_TIMEOUT')})]);if(signal.aborted||!chunks.length)throw Error('CAPTURE_EMPTY')
   const blob=new Blob(chunks,{type:recorder.mimeType||mime})
   if(!mounted.current)throw Error('STOPPED')
   const name='caesar-ru-native-candidate.'+(blob.type.includes('mp4')?'mp4':'webm');url.current=URL.createObjectURL(blob);complete=true
   setFile({url:url.current,name,blob});clearTimeout(timer);controller.abort();try{await renderer?.stop()}catch{};await archiveFile(blob)
  }catch(error){if(mounted.current){setProblem(signal.aborted?'STOPPED':error?.message||'UNKNOWN');setState(attempt.current?'locked':'idle')}}
  finally{clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();controller.abort();try{await renderer?.stop()}catch{};try{await context?.close()}catch{};run.current=null;if(!complete&&url.current){URL.revokeObjectURL(url.current);url.current=null}}
 }
 async function share(){
  if(!file)return
  try{const item=new File([file.blob],file.name,{type:file.blob.type});if(navigator.canShare?.({files:[item]})){await navigator.share({files:[item]});return}}catch(error){if(error?.name==='AbortError')return}
  const link=document.createElement('a');link.href=file.url;link.download=file.name;link.click()
 }
 const busy=busyStates.includes(state),unsupported=['INSECURE_CONTEXT','AUDIO_UNSUPPORTED','RECORDER_UNSUPPORTED','MP4_REQUIRED'].includes(problem)
 return <section aria-label="Запись Caesar" style={{display:'grid',gap:12,maxWidth:440,margin:'0 auto',color:'#244139'}}>
  <div><h2 style={{margin:'0 0 4px',fontSize:26}}>Caesar · видео RU</h2><p style={{margin:0,fontSize:14}}>Оригинальная озвучка Algenib · {duration?duration.toFixed(1)+' сек.':'длительность исходной речи'}</p></div>
  {!file&&!busy&&!archived&&<><button type="button" style={{...primary,opacity:!allowed||!checked||!archiveReady||unsupported||attempt.current?0.5:1}} disabled={!allowed||!checked||!archiveReady||unsupported||attempt.current} onClick={start}>Записать Caesar RU</button><small>Нажимая, разрешаете один бесплатный запуск для записи приветствия. Видео сохранится автоматически. Не закрывайте страницу до подтверждения.</small></>}
  {busy&&state!=='uploading'&&<button type="button" style={{...primary,background:'#5b645f'}} onClick={()=>run.current?.abort()}>Остановить запись</button>}
  <p role="status" aria-live="polite" style={{margin:0,padding:12,borderRadius:12,background:'#edf2e9',fontSize:14}}>{state==='uploading'?'Автоматически сохраняем MP4…':state==='upload-failed'?'Запись получена, но архив не подтвердил сохранение. Повторите только отправку файла, без нового запуска Simli.':archived?'MP4 находится в закрытом архиве. Проверка качества и точной длительности ещё необходима.':problem==='ARCHIVE_UNAVAILABLE'?'Закрытое хранилище недоступно. Запись не запускалась.':problem==='MP4_REQUIRED'?'Для автоматического сохранения нужен браузер с поддержкой записи MP4. Запрос Simli не отправлен.':!archiveReady?'Проверяем закрытое хранилище…':!allowed?'Сервер не разрешил бесплатную запись.':problem?captureProblem(problem,attempt.current):labels[state]||'Запись остановлена.'}</p>
  <video ref={video} autoPlay playsInline muted style={{width:'100%',maxHeight:'46vh',objectFit:'contain',background:'#222',borderRadius:14,display:busy?'block':'none'}}/><audio ref={audio} autoPlay muted/>
  {file&&<><video src={file.url} controls playsInline preload="metadata" style={{width:'100%',maxHeight:'48vh',objectFit:'contain',background:'#222',borderRadius:14}}/><button type="button" style={primary} onClick={share}>Сохранить / поделиться видео</button><a href={file.url} download={file.name} style={{textAlign:'center'}}>Скачать файл напрямую</a>{state==='upload-failed'&&<button type="button" style={primary} onClick={()=>void archiveFile(file.blob)}>Повторить сохранение (без Simli)</button>}<small>Локальное скачивание необязательно. Публикация только после проверки.</small></>}
  {archived&&<a href={ARCHIVE_API+'?download=1'} style={{...primary,background:'#335d50'}}>Экспортировать MP4 из архива</a>}
 </section>
}
