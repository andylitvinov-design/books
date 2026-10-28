'use client'
import {useEffect,useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Headphones,Mic,MicOff,UploadCloud,Film,Music2,PlayCircle,ShieldCheck,RefreshCw,Clapperboard} from 'lucide-react'
import {MEDITATION_MUSIC,MEDITATION_SCENES,MEDITATION_AUDIO_MAX,MEDITATION_VIDEO_MAX} from '@/lib/practitioners/meditation-studio-contract.mjs'
import styles from './practitioner-meditation-studio.module.css'

const COPY={
  en:{
    title:'Meditation Studio',lead:'Record a guided meditation in your own voice. Choose music and a visual, then send a private draft for editorial review.',
    voice:'1. Record or upload',start:'Record with microphone',stop:'Stop recording',source:'Your audio or video',upload:'Save private recording',listen:'Listen before sending',
    details:'2. Name your meditation',name:'Meditation title',desc:'Description and intended audience',language:'Spoken language',
    music:'3. Background music',musicHint:'Original royalty-free ambient tones, synthesized locally. Voice stays in front.',
    visual:'4. Video background',visualHint:'Free existing motion scenes, or request a quote for an AI-made video based on your spoken words.',
    mode:'Visual production',free:'Free: existing animation',original:'I uploaded a finished video',ai:'AI video tailored to my words · request price',
    aiHint:'Cost, generation provider and rights are agreed with the owner first. No purchase or AI rendering takes place now.',
    create:'Create free video with voice',processing:'Compositing locally…',videoReady:'Free video is ready on your device.',uploadVideo:'Upload this video privately',
    submit:'5. Send for moderation',rights:'I created or have rights to this recording and consent to editorial review and Unlisted publication on the Holistic House YouTube channel if approved.',
    send:'Submit for review',loading:'Loading…',saving:'Saving…',status:'Review status',empty:'No private meditations yet.',
    queue:'My submissions',notice:'Review and YouTube delivery are separate. Only the owner approves publication; a failed provider upload never counts as published.',
    noMic:'Microphone unavailable or permission denied. Upload an audio file instead.',cancel:'Cancel video creation',
    unsupported:'This browser cannot mix voice with video. Your private audio can still be submitted for manual video preparation.',
    max:'Audio up to 20 MB; video up to 45 MB. MP3, M4A, WebM, WAV, OGG, MP4, MOV.',
    waiting:'The owner will need to prepare an MP4 before YouTube upload.',preview:'Preview',
    errRights:'Please confirm the rights and publication consent.',sent:'Private meditation submitted for moderation.',
    camera:'A microphone is only used after you press Record.',noVideo:'Your audio remains private; YouTube requires an approved rendered video.',
  },
  ru:{
    title:'Студия медитаций',lead:'Запишите медитацию собственным голосом, выберите музыку и видеоряд. Готовая запись сначала попадёт в закрытую очередь модерации.',
    voice:'1. Голос или готовый ролик',start:'Записать с микрофона',stop:'Остановить запись',source:'Аудио или видео',upload:'Сохранить запись приватно',listen:'Прослушать перед отправкой',
    details:'2. Название и язык',name:'Название медитации',desc:'Описание: для кого и для чего',language:'Язык записи',
    music:'3. Музыка под голос',musicHint:'Оригинальные фоновые мелодии создаются локально, без чужих фонограмм и лицензий YouTube.',
    visual:'4. Видеоряд',visualHint:'Бесплатные готовые анимации или индивидуальный видеоряд по словам — после согласования стоимости.',
    mode:'Способ создания видео',free:'Бесплатно: готовая анимация',original:'Я загрузил готовый ролик',ai:'ИИ-видеоряд по словам · запрос цены',
    aiHint:'Сначала согласуем цену, провайдера и права. Платная генерация сейчас НЕ запускается.',
    create:'Создать видео с моим голосом бесплатно',processing:'Создаём видео на устройстве…',videoReady:'Бесплатное видео создано на вашем устройстве.',uploadVideo:'Сохранить готовое видео приватно',
    submit:'5. Модерация',rights:'Подтверждаю авторские права на запись и согласие на модерацию и публикацию по ссылке (Unlisted) на YouTube Holistic House после одобрения.',
    send:'Отправить на модерацию',loading:'Загружаем…',saving:'Сохраняем…',status:'Статус проверки',empty:'Пока нет сохранённых медитаций.',
    queue:'Мои записи',notice:'Модерация и доставка на YouTube — разные этапы. Одобрение не означает, что видео уже опубликовано.',
    noMic:'Микрофон недоступен или не разрешён. Можно загрузить готовое аудио.',cancel:'Отменить создание видео',
    unsupported:'Этот браузер не поддерживает смешивание голоса и видеоряда. Аудио всё равно можно отправить на подготовку ролика.',
    max:'Аудио до 20 МБ; видео до 45 МБ. MP3, M4A, WebM, WAV, OGG, MP4, MOV.',
    waiting:'Для YouTube владелец подготовит MP4 из вашего аудио.',preview:'Предпросмотр',
    errRights:'Подтвердите права на материалы и согласие на модерацию.',sent:'Медитация отправлена в закрытую очередь модерации.',
    camera:'Микрофон включится только после нажатия кнопки записи.',noVideo:'Аудио останется приватным. Для YouTube понадобится одобренное видео.',
  },
  es:{
    title:'Estudio de meditación',lead:'Graba con tu voz, elige música y vídeo. El borrador se revisa antes de subirlo a YouTube.',
    voice:'1. Grabar o subir',start:'Grabar con micrófono',stop:'Parar grabación',source:'Audio o vídeo',upload:'Guardar grabación privada',listen:'Escuchar primero',
    details:'2. Título e idioma',name:'Título',desc:'Descripción',language:'Idioma hablado',
    music:'3. Música de fondo',musicHint:'Tonos ambientales originales generados localmente.',visual:'4. Fondo de vídeo',visualHint:'Animaciones gratis o una cotización de vídeo IA según tu voz.',
    mode:'Producción',free:'Gratis: animación',original:'Subí un vídeo terminado',ai:'Vídeo IA según mis palabras · presupuesto',
    aiHint:'Sin compra ni generación hasta aprobar el precio.',create:'Crear vídeo gratuito',processing:'Creando en tu dispositivo…',videoReady:'Vídeo creado.',
    uploadVideo:'Subir vídeo privado',submit:'5. Moderación',rights:'Confirmo que tengo derechos y acepto revisión y publicación Unlisted tras aprobación.',
    send:'Enviar a revisión',loading:'Cargando…',saving:'Guardando…',status:'Estado',empty:'Aún no tienes meditaciones.',queue:'Mis grabaciones',
    notice:'Aprobación y subida a YouTube son pasos distintos.',noMic:'Sin micrófono: puedes subir un archivo.',cancel:'Cancelar vídeo',
    unsupported:'Este navegador no permite crear vídeo con voz; aún puedes enviar el audio.',max:'Audio hasta 20 MB; vídeo hasta 45 MB.',
    waiting:'Se necesita un vídeo MP4 para YouTube.',preview:'Vista previa',errRights:'Confirma los derechos.',sent:'Enviado a revisión.',
    camera:'El micrófono se activa solo al pulsar Grabar.',noVideo:'Tu audio es privado hasta aprobarse.',
  }
}
const MUSIC_NAMES={
  none:['No music','Без музыки','Sin música'],harmony:['Harmony','Гармония','Armonía'],
  meditation:['Deep calm','Глубокое спокойствие','Calma'],
  energy:['Energy','Энергия','Energía'],love:['Warmth','Тепло','Calidez'],
  prosperity:['Abundance','Изобилие','Abundancia'],
}
const SCENE_NAMES={
  none:['Soft gradient','Мягкий свет','Luz suave'],
  'cosmic-flow':['Cosmic flow','Космический поток','Flujo cósmico'],
  dreams:['Dreamlike light','Свет сновидений','Luz de sueños'],
  'abundance-tree':['Golden tree','Золотое дерево','Árbol dorado'],
  'path-to-goals':['Path of light','Путь света','Camino de luz'],
}
const LABEL={draft:['Draft','Черновик','Borrador'],submitted:['Under review','На модерации','En revisión'],
  changes_requested:['Revisions requested','Нужны правки','Revisar'],
  approved:['Approved; YouTube pending','Одобрено; YouTube ожидает','Aprobado; YouTube pendiente'],
  uploading:['YouTube upload in progress','Загрузка YouTube','Subiendo'],
  upload_uncertain:['YouTube receipt needs checking','Проверяется доставка YouTube','Comprobando'],
  uploaded:['YouTube processed','YouTube обработан','Publicado'],
  rejected:['Rejected','Отклонено','Rechazado']}
const langIndex=locale=>locale==='ru'?1:locale==='es'?2:0
const fileMime=file=>{
  const type=String(file.type||'').toLowerCase().split(';')[0]
  if(type==='audio/x-m4a'||type==='audio/m4a')return 'audio/mp4'
  if(type==='audio/x-wav')return 'audio/wav'
  if(type==='video/x-m4v')return 'video/mp4'
  return type
}
async function api(body){
  const res=await fetch('/api/app/practice/meditations',{method:body?'POST':'GET',
    credentials:'same-origin',cache:'no-store',
    headers:body?{'content-type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined})
  const result=await res.json().catch(()=>({}))
  if(!res.ok)throw Error(result.error||'MEDITATION_UNAVAILABLE')
  return result
}
async function sendSigned(intent,blob,mime){
  const storage=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const {error}=await storage.storage.from(intent.bucket).uploadToSignedUrl(intent.objectKey,intent.token,blob,{contentType:mime,upsert:false})
  if(error)throw Error(error.message||'MEDIA_UPLOAD_FAILED')
}
function chooseRecorderType(kind){
  const candidates=kind==='video'
    ?['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4','video/webm;codecs=vp8,opus','video/webm']
    :['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg']
  return candidates.find(type=>MediaRecorder.isTypeSupported(type))||null
}
function urlFor(file){return file?URL.createObjectURL(file):''}
async function sourceDuration(audio){
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('AUDIO_METADATA_UNAVAILABLE')),15000)
    audio.onloadedmetadata=()=>{clearTimeout(timer);resolve()}
    audio.onerror=()=>{clearTimeout(timer);reject(Error('AUDIO_UNPLAYABLE'))}
    audio.load()
  })
  if(!Number.isFinite(audio.duration)||audio.duration<=0||audio.duration>480)
    throw Error('FREE_VIDEO_LIMIT_8_MINUTES')
}
export default function PractitionerMeditationStudio({locale='en',initialKind='audio'}){
  const t=COPY[locale]||COPY.en,index=langIndex(locale)
  const [kind,setKind]=useState(initialKind==='video'?'video':'audio'),[recording,setRecording]=useState(false)
  const [media,setMedia]=useState(null),[mediaUrl,setMediaUrl]=useState('')
  const [render,setRender]=useState(null),[renderUrl,setRenderUrl]=useState('')
  const [title,setTitle]=useState(''),[description,setDescription]=useState('')
  const [language,setLanguage]=useState(locale==='ru'?'ru':'en')
  const [music,setMusic]=useState('meditation'),[scene,setScene]=useState('cosmic-flow')
  const [mode,setMode]=useState('free'),[rights,setRights]=useState(false)
  const [draftId,setDraftId]=useState(null),[items,setItems]=useState([])
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[note,setNote]=useState('')
  const [percent,setPercent]=useState(0)
  const microphone=useRef(null),job=useRef(null),sourceUrl=useRef(''),finalUrl=useRef('')
  useEffect(()=>{return()=>{
    microphone.current?.recorder?.state==='recording'&&microphone.current.recorder.stop()
    microphone.current?.stream?.getTracks().forEach(track=>track.stop())
    if(job.current)job.current.cancel()
    if(sourceUrl.current)URL.revokeObjectURL(sourceUrl.current)
    if(finalUrl.current)URL.revokeObjectURL(finalUrl.current)
  }},[])
  async function refresh(){try{setItems((await api()).items||[])}catch(e){setError(e.message)}}
  useEffect(()=>{void refresh()},[])
  function chooseMedia(file){
    if(sourceUrl.current)URL.revokeObjectURL(sourceUrl.current)
    if(finalUrl.current)URL.revokeObjectURL(finalUrl.current)
    sourceUrl.current=file?urlFor(file):''
    finalUrl.current=''
    setMedia(file);setMediaUrl(sourceUrl.current);setRender(null);setRenderUrl('');setDraftId(null)
    setError('');setNote('')
  }
  async function record(){
    setError('');setNote('')
    if(recording){microphone.current?.recorder?.stop();return}
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      setError(t.noMic);return
    }
    let stream
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})
      const mime=chooseRecorderType('audio')
      if(!mime)throw Error('AUDIO_RECORDER_UNSUPPORTED')
      const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:96000})
      const chunks=[]
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)}
      recorder.onstop=()=>{
        stream.getTracks().forEach(track=>track.stop());microphone.current=null;setRecording(false)
        const blob=new Blob(chunks,{type:recorder.mimeType.split(';')[0]})
        if(blob.size>=128&&blob.size<=MEDITATION_AUDIO_MAX){setKind('audio');chooseMedia(blob)}
        else setError('AUDIO_SIZE_NOT_ALLOWED')
      }
      recorder.onerror=()=>{stream.getTracks().forEach(track=>track.stop());setRecording(false);setError('AUDIO_RECORDER_UNAVAILABLE')}
      microphone.current={stream,recorder};recorder.start(1000);setRecording(true);setKind('audio')
    }catch(e){stream?.getTracks().forEach(track=>track.stop());setError(e?.name==='NotAllowedError'?t.noMic:e.message||t.noMic)}
  }
  async function uploadSource(){
    if(!media||busy)return
    const mime=fileMime(media)
    if(!((mime.startsWith('audio/')&&media.size<=MEDITATION_AUDIO_MAX)||
      (mime.startsWith('video/')&&media.size<=MEDITATION_VIDEO_MAX))||media.size<128){
      setError('MEDIA_TYPE_OR_SIZE_NOT_ALLOWED');return
    }
    setBusy('source');setError('');setNote('')
    try{
      const result=await api({action:'source-intent',mime,bytes:media.size})
      await sendSigned(result.intent,media,mime)
      await api({action:'source-complete',id:result.id})
      setDraftId(result.id);setNote(locale==='ru'?'Запись сохранена в приватном хранилище.':'Recording saved privately.')
      await refresh()
    }catch(e){setError(e.message)}finally{setBusy('')}
  }
  async function buildVideo(){
    if(!media||kind!=='audio'||busy)return
    setBusy('render');setError('');setPercent(0)
    let audio,video,ctx,mix,musicSession,raf=0,recorder
    try{
      if(typeof window==='undefined'||typeof MediaRecorder==='undefined')throw Error(t.unsupported)
      const mediaMime=chooseRecorderType('video')
      if(!mediaMime)throw Error(t.unsupported)
      const canvas=document.createElement('canvas')
      canvas.width=960;canvas.height=540
      if(!canvas.captureStream)throw Error(t.unsupported)
      ctx=new (window.AudioContext||window.webkitAudioContext)()
      const destination=ctx.createMediaStreamDestination()
      audio=new Audio(mediaUrl);audio.preload='auto'
      await sourceDuration(audio)
      const voice=ctx.createMediaElementSource(audio)
      const voiceGain=ctx.createGain();voiceGain.gain.value=1
      voice.connect(voiceGain).connect(destination)
      if(music!=='none'){
        const ambient=await import('@/lib/mandala/local-video-music')
        musicSession=await ambient.startAmbientMusic(music)
        if(!musicSession)throw Error('MUSIC_UNAVAILABLE')
        const ambientSource=ctx.createMediaStreamSource(new MediaStream([musicSession.track]))
        const gain=ctx.createGain();gain.gain.value=0.14
        ambientSource.connect(gain).connect(destination)
      }
      video=document.createElement('video')
      video.src=MEDITATION_SCENES[scene]||''
      video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto'
      if(scene!=='none')await video.play()
      const paint=()=>{
        const g=canvas.getContext('2d')
        if(video?.readyState>=2){
          const w=video.videoWidth,h=video.videoHeight
          const scale=Math.max(canvas.width/w,canvas.height/h)
          const dw=w*scale,dh=h*scale
          g.drawImage(video,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh)
        }else{
          const gradient=g.createLinearGradient(0,0,960,540)
          gradient.addColorStop(0,'#142f37');gradient.addColorStop(.5,'#47776c')
          gradient.addColorStop(1,'#bda77e');g.fillStyle=gradient;g.fillRect(0,0,960,540)
        }
        g.fillStyle='rgba(8,25,29,.16)';g.fillRect(0,0,960,540)
        raf=requestAnimationFrame(paint)
      }
      paint()
      const stream=canvas.captureStream(20)
      destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track))
      recorder=new MediaRecorder(stream,{mimeType:mediaMime,videoBitsPerSecond:700000,audioBitsPerSecond:112000})
      const chunks=[]
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)}
      const finished=new Promise((resolve,reject)=>{
        recorder.onerror=()=>reject(Error('FREE_VIDEO_RENDER_FAILED'))
        recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType.split(';')[0]}))
      })
      job.current={cancel:()=>{audio?.pause();if(recorder.state!=='inactive')recorder.stop()}}
      recorder.start(1000)
      audio.ontimeupdate=()=>setPercent(Math.min(100,Math.round(audio.currentTime/audio.duration*100)))
      audio.onended=()=>{if(recorder.state==='recording')recorder.stop()}
      await ctx.resume()
      await audio.play()
      const blob=await finished
      if(blob.size<128||blob.size>MEDITATION_VIDEO_MAX)throw Error('FREE_VIDEO_TOO_LARGE')
      if(finalUrl.current)URL.revokeObjectURL(finalUrl.current)
      finalUrl.current=urlFor(blob)
      setRender(blob);setRenderUrl(finalUrl.current);setNote(t.videoReady)
      setPercent(100)
    }catch(e){setError(e.message||'FREE_VIDEO_RENDER_FAILED')}
    finally{
      job.current=null;cancelAnimationFrame(raf);audio?.pause();video?.pause()
      musicSession?.close?.()
      try{await ctx?.close()}catch{}
      setBusy('')
    }
  }
  async function uploadVideo(){
    if(!render||!draftId||busy)return
    const mime=fileMime(render)
    setBusy('video');setError('')
    try{
      const created=await api({action:'video-intent',id:draftId,mime,bytes:render.size})
      await sendSigned(created.intent,render,mime)
      await api({action:'video-complete',id:draftId})
      setNote(locale==='ru'?'Видеоролик сохранён приватно.':'Video saved privately.')
      await refresh()
    }catch(e){setError(e.message)}finally{setBusy('')}
  }
  async function submit(e){
    e.preventDefault()
    if(!draftId||busy)return
    if(!rights){setError(t.errRights);return}
    setBusy('submit');setError('');setNote('')
    try{
      await api({action:'submit',id:draftId,metadata:{
        title,description,language,music,scene,mode,rightsConfirmed:rights}})
      setNote(t.sent);setDraftId(null);await refresh()
    }catch(e){setError(e.message)}finally{setBusy('')}
  }
  return <section className={styles.studio} data-meditation-studio>
    <header className={styles.header}><span className={styles.eyebrow}>HOLISTIC HOUSE · MASTERS</span>
      <h2><Headphones size={24} aria-hidden="true"/> {t.title}</h2><p>{t.lead}</p></header>
    <div className={styles.step}>
      <h3><Mic size={18}/> {t.voice}</h3>
      <div className={styles.actions}>
        <button type="button" className={recording?styles.stop:styles.primary} onClick={()=>void record()} disabled={Boolean(busy)}>
          {recording?<MicOff size={17}/>:<Mic size={17}/>} {recording?t.stop:t.start}
        </button>
        <label className={styles.file}>{t.source}
          <input type="file" accept="audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm,video/mp4,video/quicktime,video/webm,.m4a,.mp3,.wav,.ogg,.webm,.mp4,.mov"
            disabled={recording||Boolean(busy)} onChange={e=>{
              const file=e.target.files?.[0];if(!file)return
              chooseMedia(file);setKind(fileMime(file).startsWith('video/')?'video':'audio');e.target.value=''
            }}/>
        </label>
      </div>
      <p className={styles.hint}>{t.camera} {t.max}</p>
      {mediaUrl&&<div className={styles.preview}>
        <strong>{t.listen}</strong>
        {kind==='audio'?<audio controls src={mediaUrl} preload="metadata"/>:<video controls playsInline src={mediaUrl} preload="metadata"/>}
        <button className={styles.primary} type="button" disabled={Boolean(busy)||Boolean(draftId)} onClick={()=>void uploadSource()}>
          <UploadCloud size={16}/>{draftId?(locale==='ru'?'Запись сохранена':'Saved'):busy==='source'?t.saving:t.upload}
        </button>
      </div>}
    </div>
    <form onSubmit={submit} className={styles.form}>
      <div className={styles.step}><h3>{t.details}</h3>
        <label>{t.name}<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label>{t.desc}<textarea maxLength={600} value={description} onChange={e=>setDescription(e.target.value)}/></label>
        <label>{t.language}<select value={language} onChange={e=>setLanguage(e.target.value)}>
          <option value="en">English</option><option value="ru">Русский</option>
        </select></label>
      </div>
      <div className={styles.step}><h3><Music2 size={18}/>{t.music}</h3><p className={styles.hint}>{t.musicHint}</p>
        <div className={styles.chips} role="group" aria-label={t.music}>
          {MEDITATION_MUSIC.map(key=><button type="button" key={key} aria-pressed={music===key}
            onClick={()=>setMusic(key)}>{MUSIC_NAMES[key][index]}</button>)}
        </div>
      </div>
      <div className={styles.step}><h3><Film size={18}/>{t.visual}</h3><p className={styles.hint}>{t.visualHint}</p>
        <label>{t.mode}<select value={mode} onChange={e=>setMode(e.target.value)}>
          <option value="free">{t.free}</option><option value="original">{t.original}</option><option value="ai_quote">{t.ai}</option>
        </select></label>
        {mode==='ai_quote'&&<p className={styles.hint}>{t.aiHint}</p>}
        {mode==='free'&&<div className={styles.scenes}>{Object.keys(MEDITATION_SCENES).map(key=>
          <button type="button" className={styles.scene} aria-pressed={scene===key}
            key={key} onClick={()=>setScene(key)}>
            {key==='none'?<span className={styles.gradient} aria-hidden="true"/>:
              <img src={MEDITATION_SCENES[key].replace(/\.mp4$/,'.jpg')} alt="" loading="lazy"/>}
            <span>{SCENE_NAMES[key][index]}</span>
          </button>)}</div>}
        {mode==='free'&&kind==='audio'&&media&&<div className={styles.preview}>
          {renderUrl&&<video controls playsInline src={renderUrl} preload="metadata"/>}
          <button type="button" className={styles.primary} disabled={Boolean(busy)} onClick={()=>void buildVideo()}>
            <Clapperboard size={17}/> {busy==='render'?t.processing:t.create}
          </button>
          {busy==='render'&&<progress value={percent} max={100} aria-label={t.processing}/>}
          {render&&draftId&&<button type="button" disabled={Boolean(busy)} onClick={()=>void uploadVideo()}>
            <UploadCloud size={16}/>{busy==='video'?t.saving:t.uploadVideo}
          </button>}
        </div>}
        {kind==='audio'&&mode!=='free'&&<p className={styles.hint}>{t.noVideo}</p>}
      </div>
      <div className={styles.step}><h3><ShieldCheck size={18}/>{t.submit}</h3>
        <label className={styles.consent}><input type="checkbox" required checked={rights} onChange={e=>setRights(e.target.checked)}/>
          <span>{t.rights}</span></label>
        <button type="submit" className={styles.primary} disabled={!draftId||Boolean(busy)}><UploadCloud size={17}/>{busy==='submit'?t.saving:t.send}</button>
        <p className={styles.hint}>{t.notice}</p>
        {draftId&&kind==='audio'&&!render&&<p className={styles.hint}>{t.waiting}</p>}
      </div>
    </form>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {note&&<p role="status" className={styles.notice}>{note}</p>}
    <section className={styles.queue}><div className={styles.queueHead}><h3>{t.queue}</h3>
      <button type="button" onClick={()=>void refresh()} aria-label="Refresh submissions"><RefreshCw size={17}/></button></div>
      {!items.length?<p>{t.empty}</p>:items.map(item=><article className={styles.entry} key={item.id}>
        <div><strong>{item.title||'Untitled draft'}</strong>
          <small>{item.language.toUpperCase()} · {item.kind} · {LABEL[item.status]?.[index]||item.status}</small>
          {item.reviewNote&&<p>{item.reviewNote}</p>}</div>
        {item.sourceReady&&<a target="_blank" rel="noreferrer noopener" href={'/api/app/practice/meditations/'+item.id+'/media'}>
          <PlayCircle size={16}/>{t.preview}</a>}
        {item.youtubeVideoId&&item.status==='uploaded'&&<a target="_blank" rel="noreferrer noopener"
          href={'https://www.youtube.com/watch?v='+item.youtubeVideoId}>YouTube</a>}
      </article>)}
    </section>
  </section>
}
