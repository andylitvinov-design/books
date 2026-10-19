'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Film,Images,Link2,UploadCloud,Video,RefreshCw} from 'lucide-react'
import {preparePhoto} from './session-photo-uploader'
import {normalizePhoneVideoFile} from '@/lib/clients/phone-video-file'
import {SessionYouTubePlayer} from './session-youtube-player'
import {readUiLocale} from '@/lib/ui-locale'
import {ownerMaterialApi} from '@/lib/clients/owner-material-api'
import styles from './practitioner-materials-cabinet.module.css'

const request=(url,method='GET',body)=>ownerMaterialApi(url,{method,body})
export function uploadFile(intent,file,mime,onProgress){
  if(intent.provider==='external')return new Promise((resolve,reject)=>{
    if(!intent.uploadUrl?.startsWith('https://'))return reject(new Error('VIDEO_STORAGE_NOT_CONFIGURED'))
    const xhr=new XMLHttpRequest()
    xhr.open('PUT',intent.uploadUrl)
    xhr.setRequestHeader('Content-Type',mime)
    xhr.setRequestHeader('If-None-Match','*')
    xhr.timeout=850000
    xhr.upload.onprogress=event=>{
      if(event.lengthComputable)onProgress?.(Math.round(event.loaded/event.total*100))
    }
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('VIDEO_UPLOAD_FAILED'))
    xhr.onerror=()=>reject(new Error('VIDEO_UPLOAD_FAILED'))
    xhr.ontimeout=()=>reject(new Error('VIDEO_UPLOAD_TIMEOUT'))
    xhr.onabort=()=>reject(new Error('VIDEO_UPLOAD_CANCELLED'))
    xhr.send(file)
  })
  if(!intent.token||!intent.bucket||!intent.objectKey||!intent.supabaseUrl||!intent.publishableKey)
    throw new Error('MEDIA_STORAGE_NOT_CONFIGURED')
  const storage=createClient(intent.supabaseUrl,intent.publishableKey,
    {auth:{persistSession:false,autoRefreshToken:false}})
  return storage.storage.from(intent.bucket).uploadToSignedUrl(
    intent.objectKey,intent.token,file,{contentType:mime,upsert:false})
    .then(result=>{if(result.error)throw new Error(result.error.message||'MEDIA_UPLOAD_FAILED')})
}
function kindName(kind,ru){return kind==='youtube'?'YouTube':
  kind==='image'?(ru?'Фото':'Photo'):(ru?'Видео':'Video')}
export function PractitionerMaterialsCabinet(){
  const [locale,setLocale]=useState('en'),ru=locale==='ru'
  const [type,setType]=useState('youtube')
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [url,setUrl]=useState('')
  const [files,setFiles]=useState([])
  const [materials,setMaterials]=useState([])
  const [filter,setFilter]=useState('all')
  const [publicLocales,setPublicLocales]=useState({})
  const [publishing,setPublishing]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [progress,setProgress]=useState('')
  const [feedback,setFeedback]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{
    const update=e=>setLocale(e.detail==='ru'?'ru':'en')
    setLocale(readUiLocale(document.cookie))
    window.addEventListener('holistic-house-ui-locale',update)
    return ()=>window.removeEventListener('holistic-house-ui-locale',update)
  },[])
  async function reload(){
    setLoading(true)
    try{
      const result=await request('/api/admin/materials')
      setMaterials(result.materials||[])
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{void reload()},[])
  async function save(event){
    event.preventDefault()
    if(busy)return
    setBusy(true);setFeedback('');setError('');setProgress('')
    try{
      if(type==='youtube'){
        await request('/api/admin/materials','POST',{action:'youtube',
          title,description,url})
        setUrl('')
        setFeedback(ru?'Ссылка YouTube добавлена в библиотеку.':'YouTube video saved to the library.')
      }else{
        if(!files.length)throw new Error('SELECT_FILE')
        if(files.length>10)throw new Error('SELECT_UP_TO_10')
        let done=0
        for(const [index,original] of files.entries()){
          const file=type==='image'?await preparePhoto(original):normalizePhoneVideoFile(original)
          const mime=file.type.split(';')[0].toLowerCase()
          if((type==='image'&&!['image/jpeg','image/png','image/webp'].includes(mime))||
            (type==='video'&&!['video/mp4','video/quicktime'].includes(mime)))
            throw new Error('MEDIA_TYPE_NOT_ALLOWED')
          const name=title.trim()+(files.length>1?' · '+(index+1):'')
          const result=await request('/api/admin/materials','POST',{
            action:'intent',title:name,description,kind:type,mime,bytes:file.size})
          setProgress((index+1)+'/'+files.length+' · 0%')
          await uploadFile(result.intent,file,mime,pct=>setProgress((index+1)+'/'+files.length+' · '+pct+'%'))
          await request('/api/admin/materials/'+result.intent.assetId,'POST',{action:'complete'})
          done++
          setProgress((index+1)+'/'+files.length+' · 100%')
        }
        setFiles([])
        setFeedback(ru?'Загружено материалов: '+done+'. Теперь их можно выбрать в отчете.':
          'Uploaded '+done+' material(s). You can now attach them to client reports.')
      }
      await reload()
    }catch(e){
      const messages={
        SELECT_FILE:ru?'Выберите фото или видео.':'Select a photo or video.',
        SELECT_UP_TO_10:ru?'Не более 10 файлов за раз.':'Choose up to 10 files at once.',
        MEDIA_STORAGE_NOT_CONFIGURED:ru?'Защищённое хранилище не подключено. YouTube-ссылки можно добавлять отдельно.':
          'Private storage is not configured. YouTube links can still be saved.',
        VIDEO_STORAGE_NOT_CONFIGURED:ru?'Для видео требуется включить защищённый R2/S3 или отдельно согласованный Supabase.':
          'Enable private R2/S3 video storage or the explicitly approved Supabase option.',
        MEDIA_SIZE_NOT_ALLOWED:ru?'Файл превышает допустимый размер.':'File exceeds storage size limit.',
        MATERIAL_VIDEO_STORAGE_LIMIT:ru?'Превышен лимит 160 МБ для видео в закрытой библиотеке.':'The private library has reached its 160 MB video storage limit.',
      }
      setError(messages[e.message]||e.message)
    }finally{setBusy(false)}
  }
  async function changePublication(item,publish){
    if(publishing)return
    const nextLocale=publicLocales[item.id]||item.publicLocale||locale
    if(publish&&!window.confirm(ru?
      'Опубликовать это обучающее видео в открытой библиотеке? Подтвердите, что в нём нет данных клиентов и оно доступно всем по ссылке.':
      'Publish this educational video in the public Library? Confirm it contains no client information and can be watched by anyone with the link.'))return
    setPublishing(item.id);setError('');setFeedback('')
    try{
      await request('/api/admin/materials/'+item.id,'POST',{
        action:publish?'publish-library':'unpublish-library',
        locale:nextLocale,reviewed:publish,
      })
      await reload()
      setFeedback(publish?(ru?'Видео появилось в публичной библиотеке.':'Video is now in the public Library.'):
        (ru?'Видео скрыто из публичной библиотеки.':'Video removed from the public Library.'))
    }catch(e){setError(e.message||'PUBLICATION_UNAVAILABLE')}
    finally{setPublishing('')}
  }
  const visible=materials.filter(item=>filter==='all'||item.kind===filter)
  return <div className={styles.shell}>
    <section className={styles.panel}>
      <h2>{ru?'Добавить в библиотеку':'Add to library'}</h2>
      <p className={styles.hint}>{ru?'Материалы сохраняются один раз и затем доступны для выбора в разных клиентских отчетах.':
        'Save a resource once, then reuse it across different client reports.'}</p>
      <p className={styles.hint}>{ru?'Добавляйте сюда только общие учебные материалы без данных клиентов. Личные фото и записи добавляются непосредственно к защищенной сессии.':
        'Only reusable non-client-specific education belongs here. Upload private client photos and recordings to their protected session instead.'}</p>
      <div className={styles.types} role="group" aria-label={ru?'Тип материала':'Material type'}>
        {['youtube','image','video'].map(kind=><button type="button" key={kind}
          aria-pressed={type===kind} onClick={()=>{setType(kind);setError('');setFeedback('')}}>
          {kind==='youtube'?<Link2 size={18}/>:kind==='image'?<Images size={18}/>:<Video size={18}/>}
          {kindName(kind,ru)}
        </button>)}
      </div>
      <form className={styles.form} onSubmit={save}>
        <label>{ru?'Название материала':'Material title'}
          <input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}
            placeholder={ru?'Например: Медитация на расслабление':'e.g. Relaxation meditation'}/>
        </label>
        {type==='youtube'
          ?<label>{ru?'Ссылка YouTube':'YouTube link'}
            <input type="url" required value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://youtu.be/XXXXXXXXXXX" maxLength={1500}/></label>
          :<label>{type==='image'?(ru?'Фотографии':'Photos'):(ru?'Видео MP4 / MOV':'MP4 / MOV video')}
            <input type="file" required accept={type==='image'?
              'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif':
              'video/mp4,video/quicktime,.mp4,.mov'} multiple={type==='image'}
              key={type} onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
          </label>}
        <label>{ru?'Описание (необязательно)':'Description (optional)'}
          <textarea maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}
            placeholder={ru?'Кратко: когда использовать этот материал':'Briefly explain when to use this material'}/>
        </label>
        <div className={styles.note}>{type==='youtube'
          ?(ru?'Только общие обучающие ролики. Скрытое (Unlisted) видео тоже доступно каждому, у кого есть ссылка.':
            'General educational videos only. Unlisted links are viewable by anyone with the URL.')
          :type==='video'
          ?(ru?'MOV с iPhone поддерживается, но кодек HEVC может не воспроизводиться в других браузерах. Большие видео хранятся в закрытом R2/S3, не на YouTube.':
            'iPhone MOV is accepted; HEVC may not play in other browsers. Larger videos require protected R2/S3 storage, not YouTube.')
          :(ru?'Фото с iPhone сжимаются и очищаются от GPS/EXIF перед загрузкой. Максимум 5 МБ после обработки.':
            'Phone photos are resized and stripped of GPS/EXIF before upload. 5 MB processed size limit.')}</div>
        {type==='video'&&<div className={styles.note}>
          <strong>{ru?'Без R2/S3: загрузите обучающее видео через YouTube (Unlisted).':
            'No R2/S3: upload an educational video with YouTube (Unlisted).'}</strong>
          <p>{ru?'После загрузки скопируйте ссылку и добавьте её на вкладке YouTube. Не используйте YouTube для личных записей клиентов.':
            'Copy the video link afterwards and add it under the YouTube tab. Never use YouTube for private client recordings.'}</p>
          <a href="/admin/youtube-upload" target="_blank" rel="noopener noreferrer">
            {ru?'Открыть загрузчик YouTube ↗':'Open YouTube uploader ↗'}</a>
        </div>}
        <button type="submit" className={styles.primary} disabled={busy}>
          <UploadCloud size={16}/> {busy?(ru?'Загрузка…':'Uploading…'):(ru?'Сохранить материал':'Save material')}
        </button>
      </form>
      {progress&&<p className={styles.status} role="status">{progress}</p>}
      {feedback&&<p className={styles.status} role="status">{feedback}</p>}
      {error&&<p role="alert" className={styles.error}>{error}</p>}
    </section>
    <div className={styles.listHeader}>
      <h2>{ru?'Мои материалы':'My materials'} <small>({materials.length})</small></h2>
      <div style={{display:'flex',gap:8}}>
        <select aria-label={ru?'Фильтр материалов':'Filter materials'} value={filter}
          onChange={e=>setFilter(e.target.value)}>
          <option value="all">{ru?'Все':'All'}</option>
          <option value="youtube">YouTube</option>
          <option value="image">{ru?'Фото':'Photo'}</option>
          <option value="video">{ru?'Видео':'Video'}</option>
        </select>
        <button type="button" className={styles.primary} onClick={()=>void reload()} disabled={loading}
          title={ru?'Обновить':'Refresh'} aria-label={ru?'Обновить':'Refresh'}>
          <RefreshCw size={18}/></button>
      </div>
    </div>
    <div className={styles.catalog} aria-live="polite">
      {loading?<p className={styles.empty}>{ru?'Загрузка библиотеки…':'Loading library…'}</p>:
      !visible.length?<p className={styles.empty}>{ru?'Пока нет материалов этого типа.':'No materials of this type yet.'}</p>:
      visible.map(item=><article key={item.id} className={styles.item}>
        <header>
          {item.kind==='youtube'?<Link2 size={19}/>:item.kind==='image'?<Images size={19}/>:<Film size={19}/>}
          <strong>{item.title}</strong><span className={styles.tag}>{kindName(item.kind,ru)}</span>
        </header>
        {item.kind==='youtube'?<SessionYouTubePlayer title={item.title} url={item.url} locale={locale}/>:
          item.kind==='image'
          // eslint-disable-next-line @next/next/no-img-element
          ?<img className={styles.thumb} alt={item.title} loading="lazy" src={'/api/admin/materials/'+item.id+'/media'}/>
          :<video className={styles.mediaPreview} controls playsInline preload="none"
            src={'/api/admin/materials/'+item.id+'/media'}/>}
        {item.description&&<p>{item.description}</p>}
        {item.kind==='youtube'&&<div className={styles.publication}>
          {item.publishedAt?<div className={styles.published}>
            {ru?'Опубликовано в библиотеке':'Published in Library'}
            {' · '}<a href={'/'+(item.publicLocale||'en')+'/library'} target="_blank" rel="noopener noreferrer">
              {ru?'Открыть ↗':'View ↗'}</a>
          </div>:<p className={styles.privateLabel}>{ru?'Только внутренние материалы':'Owner materials only'}</p>}
          <div className={styles.publishActions}>
            <select aria-label={ru?'Язык публикации':'Publication language'}
              value={publicLocales[item.id]||item.publicLocale||locale}
              onChange={e=>setPublicLocales(prev=>({...prev,[item.id]:e.target.value}))}>
              <option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option>
            </select>
            <button type="button" disabled={!!publishing} onClick={()=>void changePublication(item,!item.publishedAt)}
              className={item.publishedAt?styles.unpublish:styles.publish}>
              {publishing===item.id?(ru?'Сохранение…':'Saving…'):item.publishedAt?
                (ru?'Снять с публикации':'Unpublish'):(ru?'Опубликовать в Library':'Publish to Library')}
            </button>
          </div>
        </div>}
        {item.kind==='video'&&<p className={styles.privateLabel}>{ru?
          'Исходный файл остаётся закрытым. Для публичной библиотеки добавьте отдельную ссылку YouTube (Unlisted).':
          'This original file stays private. To publish it in the Library, add an Unlisted YouTube link separately.'}</p>}
        <div className={styles.itemFooter}>{ru?'Доступно для клиентских отчётов':'Available for client reports'}</div>
      </article>)}
    </div>
  </div>
}
