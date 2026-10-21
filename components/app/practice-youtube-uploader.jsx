'use client'
import {useEffect,useRef,useState} from 'react'
import {getConnectedChannel,beginUpload,probeUpload,putChunk,readUploadedDetails} from '@/lib/youtube/browser-upload'
import {YOUTUBE_UPLOAD_SCOPE,YOUTUBE_READ_SCOPE,isVideoFile,titleFromFilename,uploadMetadata,videoWatchUrl} from '@/lib/youtube/phone-upload-protocol.mjs'
import styles from './practice-youtube-uploader.module.css'

const translations={
  en:{
    title:'Upload to your YouTube',lead:'Connect up to two of your own YouTube channels. Video goes directly from this device to Google; no MP4 is stored by Holistic House.',
    setup:'The Holistic House Google YouTube connection is not configured yet. Ask the platform owner to activate the public OAuth Client ID.',
    unavailable:'YouTube is unavailable. Please try again; uploads are disabled until secure history storage is healthy.',
    connect:'Connect Google / YouTube',change:'Reconnect or switch Google account',pair:'Confirm this YouTube channel',pairNote:'I confirm that this is my intended YouTube channel.',
    pick:'Select a video (MP4 / MOV)',channel:'Destination channel',none:'Not connected',slot:'Channel',disconnect:'Disconnect channel',
    filename:'Video file',name:'Title',description:'Description',synthetic:'Includes a realistic AI avatar or synthesized voice',
    kids:'Made for kids',unlisted:'Visibility: Unlisted (link only)',start:'Upload to selected YouTube channel',
    resume:'Resume / retry verification',pause:'Pause upload',remove:'Remove file',history:'Uploaded videos',empty:'No verified uploads yet.',
    copy:'Copy link',open:'Open on YouTube',connected:'Connected',waiting:'Waiting for Google consent',saving:'Verifying with YouTube…',
    saved:'Verified Unlisted and saved to your history.',connectedOther:'Google returned the wrong channel. Nothing was uploaded.',
    privacy:'Do not upload private client recordings, medical information or confidential videos. Anyone with an Unlisted link can watch it.',
    retry:'If YouTube already returned a video link, retry only verification, never upload the file again. Keep this page open while transferring.',
    switchBlocked:'Finish or safely recover the current upload before changing or disconnecting the channel.',
    consent:'Choose the intended YouTube channel in the Google consent window, then confirm its name and ID.',
    problem:'YouTube could not confirm the upload. Check the channel, visibility and YouTube Studio before proceeding.',
  },
  ru:{
    title:'Загрузка в ваш YouTube',lead:'Подключите до двух собственных каналов. Видео отправляется с устройства прямо в Google — Holistic House не сохраняет MP4.',
    setup:'Google YouTube пока не настроен владельцем Holistic House. Нужно активировать публичный OAuth Client ID.',
    unavailable:'YouTube временно недоступен. Пока защищённая история не работает, загрузка отключена.',
    connect:'Подключить Google / YouTube',change:'Сменить Google-аккаунт',pair:'Подтвердить этот YouTube-канал',pairNote:'Подтверждаю, что это нужный мне канал YouTube.',
    pick:'Выбрать видео (MP4 / MOV)',channel:'Канал назначения',none:'Не подключён',slot:'Канал',disconnect:'Отключить канал',
    filename:'Видеофайл',name:'Название',description:'Описание',synthetic:'Реалистичный ИИ-аватар или синтезированный голос',
    kids:'Создано для детей',unlisted:'Видимость: Unlisted (по ссылке)',start:'Загрузить на выбранный YouTube',
    resume:'Продолжить / повторить проверку',pause:'Приостановить',remove:'Убрать файл',history:'История загрузок',empty:'Подтверждённых загрузок пока нет.',
    copy:'Скопировать ссылку',open:'Открыть YouTube',connected:'Подключён',waiting:'Ожидание разрешения Google',saving:'Проверка YouTube…',
    saved:'YouTube подтвердил Unlisted. Ссылка сохранена в истории.',connectedOther:'Google вернул другой канал. Видео не загружено.',
    privacy:'Не загружайте записи клиентов, медицинские сведения и конфиденциальные видео. Unlisted доступен всем, у кого есть ссылка.',
    retry:'Если YouTube уже вернул ссылку, повторяется только проверка, не передача файла. Держите страницу открытой.',
    switchBlocked:'Завершите или безопасно восстановите текущую загрузку, прежде чем менять канал.',
    consent:'Выберите нужный YouTube-канал в окне Google, затем проверьте название и ID.',
    problem:'YouTube не подтвердил завершение. Проверьте канал, видимость и YouTube Studio.',
  },
  es:{
    title:'Subir a tu YouTube',lead:'Conecta hasta dos canales propios. Los vídeos se envían directamente a Google, sin guardar MP4 en Holistic House.',
    setup:'El propietario debe configurar el cliente público OAuth de Google YouTube.',
    unavailable:'YouTube no está disponible. Las subidas están bloqueadas hasta recuperar el historial.',
    connect:'Conectar Google / YouTube',change:'Cambiar cuenta Google',pair:'Confirmar este canal',pairNote:'Confirmo que este es mi canal de YouTube.',
    pick:'Seleccionar vídeo (MP4 / MOV)',channel:'Canal de destino',none:'Sin conectar',slot:'Canal',disconnect:'Desconectar canal',
    filename:'Archivo',name:'Título',description:'Descripción',synthetic:'Avatar de IA o voz sintética realista',
    kids:'Creado para niños',unlisted:'Visibilidad: Oculto (con enlace)',start:'Subir al canal seleccionado',
    resume:'Reanudar / verificar',pause:'Pausar',remove:'Quitar archivo',history:'Historial',empty:'Aún no hay subidas verificadas.',
    copy:'Copiar enlace',open:'Abrir YouTube',connected:'Conectado',waiting:'Esperando a Google',saving:'Verificando en YouTube…',
    saved:'YouTube confirmó el vídeo oculto y se guardó el enlace.',connectedOther:'Google devolvió otro canal. No se subió ningún vídeo.',
    privacy:'No subas vídeos de clientes ni datos médicos. Cualquiera con el enlace puede ver un vídeo oculto.',
    retry:'Tras obtener el ID, vuelve a verificar sin crear un segundo vídeo. Mantén esta página abierta.',
    switchBlocked:'Finaliza o recupera esta subida antes de cambiar de canal.',
    consent:'Elige el canal de YouTube correcto en Google y comprueba su nombre e ID.',
    problem:'YouTube no confirmó la subida. Comprueba YouTube Studio y la visibilidad.',
  },
}
async function request(method,body){
  const response=await fetch('/api/app/practice/youtube',{
    method,credentials:'same-origin',cache:'no-store',
    headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,
  })
  const data=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(data.error||'YOUTUBE_UNAVAILABLE')
  return data
}
export default function PracticeYoutubeUploader({locale='en',onTransferLockChange,compact=false}){
  const t=translations[locale]||translations.en
  const [state,setState]=useState(null)
  const [slot,setSlot]=useState('1')
  const slotRef=useRef('1')
  const [authorized,setAuthorized]=useState(null)
  const [candidate,setCandidate]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [oauthReady,setOauthReady]=useState(false)
  const [authPending,setAuthPending]=useState(false)
  const [file,setFile]=useState(null)
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [synthetic,setSynthetic]=useState(false)
  const [kids,setKids]=useState(false)
  const [busy,setBusy]=useState(false)
  const [progress,setProgress]=useState(0)
  const [result,setResult]=useState(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const oauthClient=useRef(null)
  const pendingSlot=useRef(null)
  const tokens=useRef(new Map())
  const transfer=useRef(null)
  const controller=useRef(null)
  const alive=useRef(true)
  const channels=state?.channels||{'1':null,'2':null}
  const channelsRef=useRef(channels)
  channelsRef.current=channels
  const expected=channels[slot]
  const validToken=tokens.current.get(slot)
  const connected=authorized?.slot===slot&&authorized.id===expected?.id&&validToken?.expiresAt>Date.now()+30000
  const uploadHeld=Boolean(transfer.current&&!transfer.current.saved)
  const videoLink=result?.videoId?videoWatchUrl(result.videoId):null
  useEffect(()=>{
    onTransferLockChange?.(uploadHeld||busy)
    return ()=>onTransferLockChange?.(false)
  },[uploadHeld,busy,onTransferLockChange])
  useEffect(()=>{
    if(!uploadHeld&&!busy)return
    const protect=e=>{e.preventDefault();e.returnValue=''}
    window.addEventListener('beforeunload',protect)
    return ()=>window.removeEventListener('beforeunload',protect)
  },[uploadHeld,busy])
  useEffect(()=>{
    alive.current=true
    request('GET').then(data=>{if(alive.current){setState(data);setError('')}})
      .catch(e=>{if(alive.current)setError(e.message)})
    return()=>{alive.current=false;controller.current?.abort()}
  },[])
  useEffect(()=>{
    if(!state?.clientId||!state.enabled)return
    let current=true
    function init(){
      if(!current||!window.google?.accounts?.oauth2)return
      oauthClient.current=window.google.accounts.oauth2.initTokenClient({
        client_id:state.clientId,
        scope:YOUTUBE_UPLOAD_SCOPE+' '+YOUTUBE_READ_SCOPE,
        callback:async response=>{
          if(!current)return
          setAuthPending(false)
          const requested=pendingSlot.current
          pendingSlot.current=null
          if(!requested||requested!==slotRef.current)return
          if(!response?.access_token||![YOUTUBE_UPLOAD_SCOPE,YOUTUBE_READ_SCOPE].every(
            value=>String(response.scope||'').split(' ').includes(value)
          )){setError('YOUTUBE_RECONNECT_REQUIRED');return}
          try{
            const actual=await getConnectedChannel(response.access_token)
            if(!current||requested!==slotRef.current)return
            const paired=channelsRef.current[requested]
            if(paired&&actual.id!==paired.id)throw Error('YOUTUBE_WRONG_CHANNEL')
            tokens.current.set(requested,{
              token:response.access_token,expiresAt:Date.now()+Math.max(60,Number(response.expires_in||3600))*1000,id:actual.id,
            })
            if(paired){setAuthorized({...actual,slot:requested});setCandidate(null)}
            else{setCandidate(actual);setConfirmed(false);setAuthorized(null)}
            setError('');setMessage('')
          }catch(e){tokens.current.delete(requested);setCandidate(null);setAuthorized(null);setError(e.message)}
        },
        error_callback:()=>{if(current){setAuthPending(false);setError('GOOGLE_OAUTH_FAILED')}},
      })
      setOauthReady(true)
    }
    if(window.google?.accounts?.oauth2){init();return()=>{current=false;oauthClient.current=null}}
    const script=document.createElement('script')
    script.src='https://accounts.google.com/gsi/client'
    script.async=true
    const nonce=document.querySelector('script[nonce]')?.nonce
    if(nonce)script.nonce=nonce
    script.onload=init
    script.onerror=()=>{if(current)setError('GOOGLE_OAUTH_UNAVAILABLE')}
    document.head.appendChild(script)
    return()=>{current=false;script.remove();oauthClient.current=null}
  },[state?.clientId,state?.enabled])
  function selectSlot(next){
    if(busy||authPending||uploadHeld){setError(t.switchBlocked);return}
    slotRef.current=next
    setSlot(next);setCandidate(null);setConfirmed(false);setError('');setMessage('')
    const remembered=tokens.current.get(next)
    const paired=channels[next]
    setAuthorized(remembered&&remembered.expiresAt>Date.now()+30000&&remembered.id===paired?.id
      ? {...paired,slot:next}:null)
  }
  function connect(){
    if(!oauthClient.current||busy||authPending){setError('GOOGLE_OAUTH_UNAVAILABLE');return}
    tokens.current.delete(slot)
    setAuthorized(null);setCandidate(null);setConfirmed(false);setError('');setAuthPending(true)
    pendingSlot.current=slot
    oauthClient.current.requestAccessToken({prompt:'select_account'})
  }
  async function pairChannel(){
    if(!candidate||!confirmed||busy)return
    setBusy(true);setError('')
    try{
      const token=tokens.current.get(slot)?.token
      if(!token)throw Error('YOUTUBE_RECONNECT_REQUIRED')
      const response=await request('POST',{action:'pair',slot,token,confirmed:true})
      setState(old=>({...old,channels:{...old.channels,[slot]:response.channel}}))
      setAuthorized({...response.channel,slot});setCandidate(null);setConfirmed(false)
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function disconnect(){
    if(busy||uploadHeld){setError(t.switchBlocked);return}
    if(!window.confirm((locale==='ru'?'Отключить этот YouTube-канал?': 'Disconnect this YouTube channel?')))return
    setBusy(true);setError('')
    try{
      const data=await request('POST',{action:'disconnect',slot})
      setState(old=>({...old,channels:data.channels}))
      tokens.current.delete(slot);setAuthorized(null);setCandidate(null);setMessage('')
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  function chooseFile(event){
    const selected=event.target.files?.[0]
    event.target.value=''
    if(!selected||busy||uploadHeld)return
    if(!isVideoFile(selected)){setError('INVALID_VIDEO_FILE');return}
    transfer.current={slot,file:selected,session:null,videoId:null,saved:false}
    setFile(selected);setTitle(titleFromFilename(selected.name));setProgress(0)
    setResult(null);setError('');setMessage('')
  }
  async function upload(){
    if(busy||!file||!connected||!state?.enabled)return
    const item=transfer.current
    if(!item||item.slot!==slot||item.file!==file)return
    const auth=tokens.current.get(slot)
    if(!auth||auth.expiresAt<Date.now()+30000){setError('YOUTUBE_RECONNECT_REQUIRED');return}
    setBusy(true);setError('');setMessage('')
    const abort=new AbortController()
    controller.current=abort
    try{
      if(!item.videoId){
        let offset=0
        if(item.session){
          const recovered=await probeUpload(item.session,auth.token,file.size,abort.signal)
          if(recovered.done)item.videoId=recovered.videoId
          else offset=recovered.offset
        }else{
          item.session=await beginUpload(file,auth.token,uploadMetadata({
            title,description,language:locale==='ru'?'ru':'en',
            visibility:'unlisted',synthetic,madeForKids:kids,
          }),abort.signal)
        }
        while(!item.videoId&&offset<file.size){
          if(auth.expiresAt<Date.now()+30000)throw Error('YOUTUBE_RECONNECT_REQUIRED')
          const step=await putChunk(item.session,auth.token,file,offset,abort.signal,
            bytes=>setProgress(Math.min(99,Math.floor(bytes/file.size*100))))
          if(step.done)item.videoId=step.videoId
          else offset=step.offset
        }
      }
      if(!item.videoId)throw Error('YOUTUBE_READBACK_REQUIRED')
      setResult({videoId:item.videoId,saved:false})
      const details=await readUploadedDetails(item.videoId,auth.token,abort.signal)
      if(!details||details.channelId!==expected?.id)throw Error('YOUTUBE_WRONG_CHANNEL')
      if(details.privacyStatus!=='unlisted')throw Error('YOUTUBE_VISIBILITY_HOLD')
      const response=await request('POST',{action:'save',slot,videoId:item.videoId,token:auth.token})
      item.saved=true
      setState(old=>({...old,history:[response.record,...old.history.filter(row=>row.videoId!==response.record.videoId)]}))
      setResult({videoId:item.videoId,saved:true})
      setProgress(100);setMessage(t.saved)
    }catch(e){setError(e.message==='upload_paused'?'UPLOAD_PAUSED':e.message||t.problem)}
    finally{setBusy(false);controller.current=null}
  }
  function remove(){
    if(busy||transfer.current?.session||transfer.current?.videoId){setError(t.switchBlocked);return}
    transfer.current=null;setFile(null);setTitle('');setResult(null);setProgress(0)
  }
  async function copyLink(id){
    const link=videoWatchUrl(id)
    try{await navigator.clipboard.writeText(link);setMessage(locale==='ru'?'Ссылка скопирована.':'Link copied.')}
    catch{window.prompt(t.copy,link)}
  }
  return <section className={styles.panel+(compact?' '+styles.compact:'')} aria-label={t.title} data-practitioner-youtube-uploader>
    {!compact&&<><h3>{t.title}</h3><p className={styles.intro}>{t.lead}</p></>}
    {!state&&!error&&<p role="status">…</p>}
    {state&&!state.enabled&&<p className={styles.warning} role="status">{t.setup}</p>}
    {state?.enabled&&<>
      <fieldset className={styles.choices} disabled={busy||authPending}>
        <legend>{t.channel}</legend>
        <div className={styles.slots}>
          {['1','2'].map(n=><button key={n} type="button" aria-pressed={slot===n}
            className={slot===n?styles.selected:styles.slot} onClick={()=>selectSlot(n)}>
            <strong>{t.slot} {n}</strong>
            <span>{channels[n]?.name||t.none}</span>
          </button>)}
        </div>
      </fieldset>
      <div className={styles.connection}>
        <button type="button" className={styles.action} disabled={!oauthReady||busy||authPending} onClick={connect}>
          {authPending?t.waiting:connected?t.change:t.connect}
        </button>
        {expected&&<button type="button" className={styles.neutral} disabled={busy||uploadHeld} onClick={disconnect}>{t.disconnect}</button>}
      </div>
      {connected&&<p className={styles.success}>✓ {t.connected}: {authorized.name} {authorized.handle} ({authorized.id})</p>}
      {candidate&&<div className={styles.confirm}>
        <p>{t.consent}</p><strong>{candidate.name} · {candidate.handle||candidate.id}</strong>
        <small>{candidate.id}</small>
        <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t.pairNote}</label>
        <button type="button" className={styles.action} disabled={!confirmed||busy} onClick={pairChannel}>{t.pair}</button>
      </div>}
      <div className={styles.form}>
        <label className={styles.file}>{t.pick}<input type="file" accept="video/*,.mp4,.mov,.m4v,.webm" disabled={!connected||busy||uploadHeld}
          onChange={chooseFile}/></label>
        {file&&<div className={styles.fields}>
          <p>{t.filename}: <strong>{file.name}</strong> ({(file.size/1048576).toFixed(1)} MiB)</p>
          <label>{t.name}<input type="text" value={title} maxLength={100} disabled={busy||Boolean(transfer.current?.session)} onChange={e=>setTitle(e.target.value)}/></label>
          <details className={styles.advanced}>
            <summary>{locale==='ru'?'Настройки видео':locale==='es'?'Opciones del vídeo':'Video options'} · {t.unlisted}</summary>
            <label>{t.description}<textarea rows={2} maxLength={5000} value={description} disabled={busy||Boolean(transfer.current?.session)} onChange={e=>setDescription(e.target.value)}/></label>
            <label className={styles.checkbox}><input type="checkbox" checked={synthetic} disabled={busy||Boolean(transfer.current?.session)} onChange={e=>setSynthetic(e.target.checked)}/>{t.synthetic}</label>
            <label className={styles.checkbox}><input type="checkbox" checked={kids} disabled={busy||Boolean(transfer.current?.session)} onChange={e=>setKids(e.target.checked)}/>{t.kids}</label>
          </details>
          <progress max="100" value={progress} aria-label={t.filename}/>
          <div className={styles.connection}>
            <button type="button" className={styles.action} disabled={busy||!connected||Boolean(result?.saved)} onClick={upload}>
              {transfer.current?.session||transfer.current?.videoId?t.resume:t.start}
            </button>
            {busy&&<button type="button" className={styles.neutral} onClick={()=>controller.current?.abort()}>{t.pause}</button>}
            {!busy&&!transfer.current?.session&&!transfer.current?.videoId&&<button type="button" className={styles.neutral} onClick={remove}>{t.remove}</button>}
          </div>
          {videoLink&&<div className={styles.result}>
            <a target="_blank" rel="noreferrer" href={videoLink}>{t.open} ↗</a>
            <button className={styles.neutral} type="button" onClick={()=>copyLink(result.videoId)}>{t.copy}</button>
            {result.saved&&<span>✓ Unlisted</span>}
          </div>}
        </div>}
      </div>
    </>}
    {busy&&<p role="status">{t.saving}</p>}
    {error&&<p className={styles.error} role="alert">{error==='YOUTUBE_HISTORY_UNAVAILABLE'?t.unavailable:
      error==='YOUTUBE_WRONG_CHANNEL'?t.connectedOther:
      error==='YOUTUBE_VISIBILITY_HOLD'?(locale==='ru'?'YouTube вернул Private, Public или не подтвердил Unlisted. Проверьте видимость в YouTube Studio.':locale==='es'?'YouTube no confirmó la visibilidad Oculto. Comprueba YouTube Studio.':'YouTube did not confirm Unlisted. Check the actual visibility in YouTube Studio.'):
      error==='YOUTUBE_RECONNECT_REQUIRED'?(locale==='ru'?'Разрешение Google истекло. Подключите канал повторно и нажмите «Продолжить».':locale==='es'?'La sesión Google caducó. Reconecta el canal y reanuda.':'Google permission expired. Reconnect the channel and resume.'):
      error==='YOUTUBE_CHANNEL_CONFLICT'||error==='YOUTUBE_CHANNEL_ALREADY_CONNECTED'?(locale==='ru'?'Этот слот занят другим каналом либо канал уже подключён.':locale==='es'?'Este canal ya está conectado o el espacio está ocupado.':'This channel is already connected or the slot is occupied.'):
      error==='UPLOAD_PAUSED'?(locale==='ru'?'Загрузка приостановлена. Нажмите «Продолжить».':locale==='es'?'Subida pausada. Pulsa Reanudar.':'Upload paused. Select Resume.'):t.problem}</p>}
    {message&&<p className={styles.success} role="status">{message}</p>}
    {!compact&&<p className={styles.notice}>{t.retry}</p>}
    <details className={styles.history}>
      <summary>{t.history} ({state?.history?.length||0})</summary>
      {!state?.history?.length&&<p>{t.empty}</p>}
      {state?.history?.map(row=><div className={styles.historyRow} key={row.videoId}>
        <strong>{row.title}</strong><small>{row.uploadedAt.slice(0,10)} · {row.privacyStatus}</small>
        <div className={styles.result}><a href={row.url} target="_blank" rel="noreferrer">{t.open} ↗</a>
          <button className={styles.neutral} type="button" onClick={()=>copyLink(row.videoId)}>{t.copy}</button></div>
      </div>)}
    </details>
    {!compact&&<p className={styles.warning}>{t.privacy}</p>}
  </section>
}
