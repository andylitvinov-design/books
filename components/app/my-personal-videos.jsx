'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {savePrivateMp4} from '@/lib/mandala/signed-private-video-upload.mjs'
import {inspectPersonalVideoFile,personalVideoDuration,personalVideoFileError} from '@/lib/app/personal-video-file-contract.mjs'
import PersonalVideoMessengerPanel from './personal-video-messenger-panel'
import SupportPhotoCabinet from '@/components/app/support-photo-cabinet'
import {MATERIAL_TAB_IDS,selectedMaterialTab,materialTabSearch} from '@/lib/app/my-materials-tabs.mjs'
import MyLivePhotos from '@/components/app/my-live-photos'

const COPY={
  en:{title:'My Videos',subtitle:'Your private saved videos, separate from the public video editor.',new:'Create free video',myPage:'Publish on My Page',
    empty:'You have no saved videos yet.',disabled:'Private cloud saving is not enabled yet. Free local downloads remain available.',
    file:'Select a finished MP4 (up to 12 MB)',theme:'Theme',aspect:'Format',consent:'I agree to save this finished video privately in my Holistic House account. The original photo and wish are not uploaded.',
    upload:'Save in My House',busy:'Uploading securely…',download:'Get private download',play:'Play',delete:'Delete video',confirm:'Delete this saved video from your private account?',
    refresh:'Refresh',error:'Video action was not completed. Please try again.',completed:'Video confirmed in your private cabinet.',
    progress:'Uploading securely: {percent}%. Keep this tab open.',
    retry:'Upload interrupted. Tap Save again to resume this file without reserving another slot.',
    expired:'Upload expired. Delete the unfinished entry below and start again.',
    size:'Each file ≤12 MB · Up to 60 seconds · Up to 3 videos · MP4 only (not MOV).',music:'This tab contains finished videos. Your saved photos are in My Photos.',
    invalidFile:'Choose a playable MP4. MOV/QuickTime and other formats are not supported.',
    tooLarge:'This file is larger than 12 MB. Choose a smaller MP4.',
    invalidDuration:'Choose an MP4 lasting more than zero and no more than 60 seconds.',
    quota:'The private video storage limit has been reached. Remove unneeded videos or try again later.',
    states:{ready:'Ready',pending:'Upload pending',failed:'Upload failed',deleting:'Delete pending'},
    themes:{money:'Money',relationships:'Relationships',energy:'Energy',goals:'Goals',health:'Health',life:'Personal growth',gift:'Personal Gift'}},
  ru:{title:'Мои видео',subtitle:'Приватная библиотека готовых роликов в вашем кабинете.',new:'Создать бесплатное видео',myPage:'На Мою страницу',
    empty:'Пока нет сохранённых видео.',disabled:'Облачное сохранение пока выключено. Бесплатное скачивание на устройство работает.',
    file:'Выберите готовый MP4 (до 12 МБ)',theme:'Тема',aspect:'Формат',consent:'Разрешаю сохранить только готовое видео в моём приватном кабинете Holistic House. Исходное фото и пожелание не отправляются.',
    upload:'Сохранить в My House',busy:'Безопасная загрузка…',download:'Приватное скачивание',play:'Смотреть',delete:'Удалить видео',confirm:'Удалить это видео из личного кабинета?',
    refresh:'Обновить',error:'Действие не завершено. Попробуйте снова.',completed:'Видео подтверждено в личном кабинете.',
    progress:'Безопасная загрузка: {percent}%. Не закрывайте вкладку.',
    retry:'Загрузка прервалась. Нажмите «Сохранить» ещё раз: продолжим без новой записи.',
    expired:'Срок загрузки истёк. Удалите незавершённое видео ниже и повторите попытку.',
    size:'Каждый файл ≤12 МБ · До 60 секунд · Не более 3 видео · Только MP4 (не MOV).',music:'В этой вкладке — готовые видео. Сохранённые фотографии находятся в «Моих фото».',
    invalidFile:'Выберите воспроизводимый MP4. MOV/QuickTime и другие форматы не поддерживаются.',
    tooLarge:'Файл больше 12 МБ. Выберите MP4 меньшего размера.',
    invalidDuration:'Выберите MP4 длительностью больше нуля и не более 60 секунд.',
    quota:'Достигнут лимит личного видеохранилища. Удалите ненужные видео или повторите позже.',
    states:{ready:'Готово',pending:'Загрузка не завершена',failed:'Ошибка загрузки',deleting:'Удаление не завершено'},
    themes:{money:'Деньги',relationships:'Отношения',energy:'Энергия',goals:'Цели',health:'Здоровье',life:'Развитие',gift:'Живая открытка'}},
  es:{title:'Mis vídeos',subtitle:'Biblioteca privada de vídeos terminados en tu cuenta.',new:'Crear vídeo gratuito',myPage:'Publicar en Mi página',
    empty:'Todavía no hay vídeos guardados.',disabled:'El almacenamiento privado no está activado. La descarga local sigue disponible.',
    file:'Selecciona un MP4 terminado (máximo 12 MB)',theme:'Tema',aspect:'Formato',consent:'Autorizo guardar únicamente el vídeo final en mi cuenta privada de Holistic House. No se envían la foto original ni mi petición.',
    upload:'Guardar en Mi Casa',busy:'Subiendo con seguridad…',download:'Descarga privada',play:'Ver',delete:'Eliminar vídeo',confirm:'¿Eliminar este vídeo de tu biblioteca privada?',
    refresh:'Actualizar',error:'No se pudo completar la acción. Inténtalo de nuevo.',completed:'Vídeo guardado en tu biblioteca privada.',
    progress:'Carga segura: {percent} %. Mantén esta pestaña abierta.',
    retry:'Carga interrumpida. Pulsa Guardar de nuevo para reanudar el mismo archivo.',
    expired:'La carga caducó. Borra el vídeo incompleto de abajo y vuelve a intentarlo.',
    size:'Cada archivo ≤12 MB · Hasta 60 segundos · Máximo 3 vídeos · Solo MP4 (no MOV).',music:'Esta pestaña contiene los vídeos terminados. Tus fotos guardadas están en Mis fotos.',
    invalidFile:'Elige un MP4 que se pueda reproducir. MOV/QuickTime y otros formatos no son compatibles.',
    tooLarge:'El archivo supera los 12 MB. Elige un MP4 más pequeño.',
    invalidDuration:'Elige un MP4 de más de cero y no más de 60 segundos.',
    quota:'Se alcanzó el límite de almacenamiento privado. Elimina vídeos innecesarios o vuelve a intentarlo más tarde.',
    states:{ready:'Listo',pending:'Carga pendiente',failed:'Error de carga',deleting:'Eliminación pendiente'},
    themes:{money:'Dinero',relationships:'Relaciones',energy:'Energía',goals:'Objetivos',health:'Salud',life:'Crecimiento personal',gift:'Tarjeta viva'}}
}
// One shared library and three views over existing private assets.
const MATERIAL_COPY={
  en:{title:'My Materials',subtitle:'Your private media for future videos.',
    label:'My private materials',tabs:{avatars:'AI Avatars',videos:'My Videos',photos:'My Photos'}},
  ru:{title:'Мои материалы',subtitle:'Ваши приватные материалы для следующих роликов.',
    label:'Личные медиаматериалы',tabs:{avatars:'AI-аватары',videos:'Мои видео',photos:'Мои фото'}},
  es:{title:'Mis materiales',subtitle:'Tus archivos privados para próximos vídeos.',
    label:'Mis materiales privados',tabs:{avatars:'Avatares IA',videos:'Mis vídeos',photos:'Mis fotos'}}
}
const formats={portrait:'9:16',square:'1:1',landscape:'16:9'}
async function verifyMp4(file){
  await inspectPersonalVideoFile(file)
  const url=URL.createObjectURL(file)
  const video=document.createElement('video')
  try {
    const duration=await new Promise((resolve,reject)=>{
      video.preload='metadata'
      const timer=setTimeout(()=>reject(personalVideoFileError('INVALID_VIDEO_FILE')),12000)
      video.onloadedmetadata=()=>{clearTimeout(timer);resolve(video.duration)}
      video.onerror=()=>{clearTimeout(timer);reject(personalVideoFileError('INVALID_VIDEO_FILE'))}
      video.src=url
    })
    return personalVideoDuration(duration)
  } finally {
    video.onloadedmetadata=null;video.onerror=null
    video.removeAttribute('src');video.load();URL.revokeObjectURL(url)
  }
}
export default function MyPersonalVideos({accountId,locale='en'}){
  const language=locale==='ru'?'ru':locale==='es'?'es':'en'
  const t=COPY[language]
  const library=MATERIAL_COPY[language]
  const [activeTab,setActiveTab]=useState('videos')
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
  const invalidate=useCallback(()=>{generation.current++},[])
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
  useEffect(()=>{
    const syncTab=()=>setActiveTab(selectedMaterialTab(window.location.search))
    syncTab()
    window.addEventListener('popstate',syncTab)
    return()=>window.removeEventListener('popstate',syncTab)
  },[])
  useEffect(()=>{if(activeTab==='videos')void reload();return invalidate},[reload,activeTab,invalidate])
  function selectMaterialTab(id){
    if(!MATERIAL_TAB_IDS.includes(id))return
    setActiveTab(id)
    window.history.replaceState(window.history.state,'',
      window.location.pathname+materialTabSearch(window.location.search,id)+window.location.hash)
  }
  function handleMaterialTabKey(event,id){
    let next=null
    const index=MATERIAL_TAB_IDS.indexOf(id)
    if(event.key==='ArrowRight')next=MATERIAL_TAB_IDS[(index+1)%MATERIAL_TAB_IDS.length]
    if(event.key==='ArrowLeft')next=MATERIAL_TAB_IDS[(index+MATERIAL_TAB_IDS.length-1)%MATERIAL_TAB_IDS.length]
    if(event.key==='Home')next=MATERIAL_TAB_IDS[0]
    if(event.key==='End')next=MATERIAL_TAB_IDS[MATERIAL_TAB_IDS.length-1]
    if(next){
      event.preventDefault()
      selectMaterialTab(next)
      document.getElementById('my-materials-tab-'+next)?.focus()
    }
  }
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
        accountId,
        request:(path,body,method)=>appFetch(path,body,method,{accountId}),
        sessionRef:uploadSessionRef,
        onProgress:(done,total)=>setUploadPercent(Math.min(100,Math.round(done/total*100)))
      })
      setNotice(t.completed);setFile(null);setConsent(false);setUploadPercent(null)
      uploadSessionRef.current=null
      await reload()
    }catch(error){
      setNotice(['PRIVATE_UPLOAD_EXPIRED','VIDEO_UPLOAD_EXPIRED'].includes(error?.code)?t.expired:
        error?.code==='INVALID_VIDEO_FILE'?t.invalidFile:
        error?.code==='VIDEO_TOO_LARGE'?t.tooLarge:
        error?.code==='VIDEO_DURATION_NOT_ALLOWED'?t.invalidDuration:
        error?.code==='VIDEO_STORAGE_QUOTA'?t.quota:
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
    try{const result=await appFetch('personal-videos/'+id+'?download=1',undefined,'GET',{accountId});setDownload({id,url:result.url})}
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
  return <section style={{maxWidth:840,margin:'0 auto',padding:'16px'}} data-my-personal-videos data-my-materials-library>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',flexWrap:'wrap',gap:12}}>
      <div><h1>{library.title}</h1><p>{library.subtitle}</p></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
        <Link href={'/'+locale+'/my-page'} prefetch={false} data-my-videos-publish-page>{t.myPage}</Link>
        <Link href={'/'+locale+'/holistic-support/mandala'} prefetch={false}>{t.new}</Link>
        <Link href={'/'+locale+'/holistic-support/mandala?mode=gift'} prefetch={false}>{t.themes.gift}</Link>
      </div>
    </div>
    <div role="tablist" aria-label={library.label} data-my-materials-tabs
      style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,margin:'14px 0'}}>
      {MATERIAL_TAB_IDS.map(id=><button type="button" key={id} role="tab"
        id={'my-materials-tab-'+id} aria-controls={'my-materials-panel-'+id}
        aria-selected={activeTab===id} tabIndex={activeTab===id?0:-1}
        onClick={()=>selectMaterialTab(id)}
        onKeyDown={event=>handleMaterialTabKey(event,id)}
        style={{minWidth:0,minHeight:48,padding:'8px 5px',borderRadius:12,
          border:activeTab===id?'2px solid #067a67':'1px solid #e9dfd1',
          background:activeTab===id?'#e6f6f1':'#fffcf7',color:'#143d3a',
          fontWeight:700,fontSize:14,overflowWrap:'anywhere',cursor:'pointer'}}>
        {library.tabs[id]}
      </button>)}
    </div>
    <div role="tabpanel" id="my-materials-panel-avatars" aria-labelledby="my-materials-tab-avatars"
      hidden={activeTab!=='avatars'}>
      {activeTab==='avatars'?<MyLivePhotos locale={locale}/>:null}
    </div>
    <div role="tabpanel" id="my-materials-panel-photos" aria-labelledby="my-materials-tab-photos"
      hidden={activeTab!=='photos'}>
      {activeTab==='photos'?<SupportPhotoCabinet locale={locale}/>:null}
    </div>
    <div role="tabpanel" id="my-materials-panel-videos" aria-labelledby="my-materials-tab-videos"
      hidden={activeTab!=='videos'}>
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
    </div>
  </section>
}
