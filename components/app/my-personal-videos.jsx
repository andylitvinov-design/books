'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {savePrivateMp4} from '@/lib/mandala/signed-private-video-upload.mjs'
import PersonalVideoMessengerPanel from './personal-video-messenger-panel'
import SupportPhotoCabinet from '@/components/app/support-photo-cabinet'

const COPY={
  en:{title:'My Videos',subtitle:'Your private saved videos, separate from the public video editor.',new:'Create free video',
    empty:'You have no saved videos yet.',disabled:'Private cloud saving is not enabled yet. Free local downloads remain available.',
    file:'Select a finished MP4 (up to 12 MB)',theme:'Theme',aspect:'Format',consent:'I agree to save this finished video privately in my Holistic House account. The original photo and wish are not uploaded.',
    upload:'Save in My House',busy:'Uploading securely…',download:'Get private download',play:'Play',delete:'Delete video',confirm:'Delete this saved video from your private account?',
    refresh:'Refresh',error:'Video action was not completed. Please try again.',completed:'Video confirmed in your private cabinet.',
    progress:'Uploading securely: {percent}%. Keep this tab open.',
    retry:'Upload interrupted. Tap Save again to resume this file without reserving another slot.',
    expired:'Upload expired. Delete the unfinished entry below and start again.',
    size:'Each file ≤12 MB · Up to 3 videos · Finished MP4 only.',music:'This page stores finished videos, not your original photos.',
    states:{ready:'Ready',pending:'Upload pending',failed:'Upload failed',deleting:'Delete pending'},
    themes:{money:'Money',relationships:'Relationships',energy:'Energy',goals:'Goals',health:'Health',life:'Personal growth'}},
  ru:{title:'Мои видео',subtitle:'Приватная библиотека готовых роликов в вашем кабинете.',new:'Создать бесплатное видео',
    empty:'Пока нет сохранённых видео.',disabled:'Облачное сохранение пока выключено. Бесплатное скачивание на устройство работает.',
    file:'Выберите готовый MP4 (до 12 МБ)',theme:'Тема',aspect:'Формат',consent:'Разрешаю сохранить только готовое видео в моём приватном кабинете Holistic House. Исходное фото и пожелание не отправляются.',
    upload:'Сохранить в My House',busy:'Безопасная загрузка…',download:'Приватное скачивание',play:'Смотреть',delete:'Удалить видео',confirm:'Удалить это видео из личного кабинета?',
    refresh:'Обновить',error:'Действие не завершено. Попробуйте снова.',completed:'Видео подтверждено в личном кабинете.',
    progress:'Безопасная загрузка: {percent}%. Не закрывайте вкладку.',
    retry:'Загрузка прервалась. Нажмите «Сохранить» ещё раз: продолжим без новой записи.',
    expired:'Срок загрузки истёк. Удалите незавершённое видео ниже и повторите попытку.',
    size:'Каждый файл ≤12 МБ · Не более 3 видео · Только готовый MP4.',music:'Исходные фотографии и пожелания здесь не хранятся.',
    states:{ready:'Готово',pending:'Загрузка не завершена',failed:'Ошибка загрузки',deleting:'Удаление не завершено'},
    themes:{money:'Деньги',relationships:'Отношения',energy:'Энергия',goals:'Цели',health:'Здоровье',life:'Развитие'}},
  es:{title:'Mis vídeos',subtitle:'Biblioteca privada de vídeos terminados en tu cuenta.',new:'Crear vídeo gratuito',
    empty:'Todavía no hay vídeos guardados.',disabled:'El almacenamiento privado no está activado. La descarga local sigue disponible.',
    file:'Selecciona un MP4 terminado (máximo 12 MB)',theme:'Tema',aspect:'Formato',consent:'Autorizo guardar únicamente el vídeo final en mi cuenta privada de Holistic House. No se envían la foto original ni mi petición.',
    upload:'Guardar en Mi Casa',busy:'Subiendo con seguridad…',download:'Descarga privada',play:'Ver',delete:'Eliminar vídeo',confirm:'¿Eliminar este vídeo de tu biblioteca privada?',
    refresh:'Actualizar',error:'No se pudo completar la acción. Inténtalo de nuevo.',completed:'Vídeo guardado en tu biblioteca privada.',
    progress:'Carga segura: {percent} %. Mantén esta pestaña abierta.',
    retry:'Carga interrumpida. Pulsa Guardar de nuevo para reanudar el mismo archivo.',
    expired:'La carga caducó. Borra el vídeo incompleto de abajo y vuelve a intentarlo.',
    size:'Cada archivo ≤12 MB · Máximo 3 vídeos · Solo MP4 terminados.',music:'Las fotos originales y los deseos no se guardan aquí.',
    states:{ready:'Listo',pending:'Carga pendiente',failed:'Error de carga',deleting:'Eliminación pendiente'},
    themes:{money:'Dinero',relationships:'Relaciones',energy:'Energía',goals:'Objetivos',health:'Salud',life:'Crecimiento personal'}}
}
const formats={portrait:'9:16',square:'1:1',landscape:'16:9'}
const limit=12_000_000
async function verifyMp4(file){
  if(!file||file.type!=='video/mp4'||file.size<1024||file.size>limit)throw new Error('INVALID_VIDEO')
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer())
  if(String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw new Error('INVALID_VIDEO')
  const url=URL.createObjectURL(file)
  try {
    const duration=await new Promise((resolve,reject)=>{
      const video=document.createElement('video')
      video.preload='metadata'
      const timer=setTimeout(()=>{video.removeAttribute('src');video.load();reject(new Error('INVALID_VIDEO'))},12000)
      video.onloadedmetadata=()=>{clearTimeout(timer);resolve(video.duration)}
      video.onerror=()=>{clearTimeout(timer);reject(new Error('INVALID_VIDEO'))}
      video.src=url
    })
    const matched=[10,15,20,30,60].find(x=>Math.abs(x-duration)<=1.25)
    if(!matched)throw new Error('INVALID_DURATION')
    return matched
  } finally {URL.revokeObjectURL(url)}
}
export default function MyPersonalVideos({accountId,locale='en'}){
  const t=COPY[locale==='ru'?'ru':locale==='es'?'es':'en']
  const [list,setList]=useState([])
  const [status,setStatus]=useState('loading')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const [uploadPercent,setUploadPercent]=useState(null)
  const uploadSessionRef=useRef(null)
  const [file,setFile]=useState(null)
  const [theme,setTheme]=useState('money')
  const [aspect,setAspect]=useState('portrait')
  const [consent,setConsent]=useState(false)
  const [play,setPlay]=useState(null)
  const [download,setDownload]=useState(null)
  const generation=useRef(0)
  const reload=useCallback(async()=>{
    const epoch=++generation.current
    try{
      const result=await appFetch('personal-videos',undefined,'GET',{accountId})
      if(generation.current===epoch){
        setList(result.videos||[])
        setStatus('ready')
      }
    }catch(error){
      if(generation.current===epoch)setStatus(error.code==='FEATURE_UNAVAILABLE'?'disabled':'error')
    }
  },[accountId])
  useEffect(()=>{void reload();return()=>{generation.current++}},[reload])
  useEffect(()=>{
    setFile(null);setConsent(false);setPlay(null);setDownload(null);setList([])
    uploadSessionRef.current=null;setUploadPercent(null)
  },[accountId])
  async function save(){
    if(busy||!file||!consent||status!=='ready')return
    setBusy(true);setNotice('');setUploadPercent(0)
    try{
      const duration=await verifyMp4(file)
      await savePrivateMp4({
        file,
        details:{theme,sceneId:theme==='money'?'golden-rain':theme==='relationships'?'heart-light':
          theme==='energy'?'sun-flight':'light-path',duration,aspect},
        request:(path,body)=>appFetch(path,body,'POST',{accountId}),
        sessionRef:uploadSessionRef,
        onProgress:(done,total)=>setUploadPercent(Math.min(100,Math.round(done/total*100)))
      })
      setNotice(t.completed);setFile(null);setConsent(false);setUploadPercent(null)
      uploadSessionRef.current=null
      await reload()
    }catch(error){
      setNotice(error?.code==='PRIVATE_UPLOAD_EXPIRED'?t.expired:
        error?.code==='INVALID_VIDEO_UPLOAD'||error?.code==='MEDIA_TYPE_NOT_ALLOWED'?
        t.error:t.retry)
      await reload()
    }finally{setBusy(false)}
  }
  async function view(id){
    setNotice('')
    try{const result=await appFetch('personal-videos/'+id,undefined,'GET',{accountId});setPlay({id,url:result.url});setDownload(null)}
    catch{setNotice(t.error)}
  }
  async function prepareDownload(id){
    setNotice('')
    try{const result=await appFetch('personal-videos/'+id,undefined,'GET',{accountId});setDownload({id,url:result.url})}
    catch{setNotice(t.error)}
  }
  async function remove(id){
    if(!window.confirm(t.confirm))return
    setBusy(true)
    try{
      await appFetch('personal-videos/'+id,undefined,'DELETE',{accountId})
      setPlay(null);setDownload(null)
      await reload()
    }catch{setNotice(t.error)}finally{setBusy(false)}
  }
  return <section style={{maxWidth:840,margin:'0 auto',padding:'16px'}} data-my-personal-videos>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',flexWrap:'wrap',gap:12}}>
      <div><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <Link href={'/'+locale+'/holistic-support/mandala'} prefetch={false}>{t.new}</Link>
    </div>
    <SupportPhotoCabinet locale={locale} />
    {status==='disabled'&&<p role="status">{t.disabled}</p>}
    {status==='error'&&<p role="alert">{t.error}</p>}
    {status==='ready'&&<>
      <PersonalVideoMessengerPanel key={accountId} accountId={accountId} locale={locale} videos={list}/>
      <section style={{padding:'14px',margin:'16px 0',border:'1px solid #cbded0',borderRadius:14}}>
        <h2>{t.upload}</h2><p>{t.size}</p>
        <label>{t.file}<input type="file" accept="video/mp4,.mp4" onChange={e=>{setFile(e.target.files?.[0]||null);setConsent(false);uploadSessionRef.current=null;setUploadPercent(null)}} disabled={busy}/></label>
        <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:10}}>
          <label>{t.theme}<select value={theme} onChange={e=>setTheme(e.target.value)} disabled={busy}>
            {Object.entries(t.themes).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select></label>
          <label>{t.aspect}<select value={aspect} onChange={e=>setAspect(e.target.value)} disabled={busy}>
            {Object.entries(formats).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select></label>
        </div>
        <label style={{display:'flex',gap:10,marginTop:12}}>
          <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/>{t.consent}
        </label>
        <button type="button" style={{minHeight:44,marginTop:12}} disabled={busy||!file||!consent}
          onClick={()=>void save()}>{busy?t.busy:t.upload}</button>
        {busy&&uploadPercent!==null&&<p role="status" aria-live="polite"
          data-private-video-upload-progress>{t.progress.replace('{percent}',String(uploadPercent))}</p>}
      </section>
      <p>{t.music}</p>
      <button type="button" disabled={busy} onClick={()=>void reload()}>{t.refresh}</button>
      {!list.length&&<p>{t.empty}</p>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12,marginTop:14}}>
        {list.map(video=><article key={video.id} style={{padding:12,border:'1px solid #d1dfd6',borderRadius:14,background:'#faf8f2'}}>
          <strong>{t.themes[video.theme]||video.theme}</strong>
          <p>{formats[video.aspect]} · {video.duration} s · {Math.round(video.bytes/1024)} KB · {t.states[video.status]||video.status}</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            <button type="button" disabled={busy||video.status!=='ready'} onClick={()=>void view(video.id)}>{t.play}</button>
            <button type="button" disabled={busy||video.status!=='ready'} onClick={()=>void prepareDownload(video.id)}>{t.download}</button>
            <button type="button" disabled={busy} onClick={()=>void remove(video.id)}>{t.delete}</button>
          </div>
          {play?.id===video.id&&<video src={play.url} controls playsInline preload="metadata" style={{width:'100%',marginTop:10}}/>}
          {download?.id===video.id&&<p><a href={download.url} target="_blank" rel="noopener noreferrer">{t.download} MP4</a></p>}
        </article>)}
      </div>
    </>}
    {notice&&<p role="status" aria-live="polite">{notice}</p>}
  </section>
}
