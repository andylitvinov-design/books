'use client'
import {useState} from 'react'
import {Video} from 'lucide-react'
import {parseSessionYouTubeUrl} from '@/lib/clients/youtube-resource'
import styles from './client-session.module.css'

// Shared by the existing report/consultation editors that already offer
// phone audio/video capture. Creates a session draft, never publishes it.
export function SessionYouTubeQuickAdd({clientId,ensureSession,locale='en',onSaved}) {
  const ru=locale==='ru'
  const [title,setTitle]=useState(ru?'Обучающее видео':'Educational video')
  const [url,setUrl]=useState('')
  const [busy,setBusy]=useState(false)
  const [savedSessionId,setSavedSessionId]=useState('')
  const [error,setError]=useState('')
  const parsed=parseSessionYouTubeUrl(url)

  async function api(path,method='GET',body=null){
    const response=await fetch(path,{
      method,cache:'no-store',credentials:'same-origin',
      ...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}),
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok){
      if(response.status===401)throw Error('ADMIN_SIGN_IN_REQUIRED')
      throw Error(data.error||'SESSION_UNAVAILABLE')
    }
    return data
  }
  async function addVideo(){
    if(busy)return
    setError('');setSavedSessionId('')
    const link=parseSessionYouTubeUrl(url)
    if(!link){setError(ru?'Введите корректную ссылку YouTube.':'Enter a valid YouTube URL.');return}
    const label=title.trim()
    if(!label||label.length>140){setError(ru?'Введите название видео (до 140 символов).':'Enter a video title (up to 140 characters).');return}
    setBusy(true)
    try{
      const sid=await ensureSession()
      const path='/api/admin/clients/'+encodeURIComponent(clientId)+'/sessions/'+encodeURIComponent(sid)
      // Always read the latest server draft, never submit a stale copy of
      // another practitioner's edits. One conflict refresh/retry is allowed.
      for(let attempt=0;attempt<2;attempt++){
        const response=await api(path)
        const session=response.session
        if(!session?.draft||!Number.isSafeInteger(session.draftRevision))
          throw Error('SESSION_UNAVAILABLE')
        const resources=session.draft.plan?.resources||[]
        if(resources.some(x=>x.kind==='youtube'&&parseSessionYouTubeUrl(x.url)?.id===link.id)){
          setSavedSessionId(sid)
          onSaved?.(sid)
          return
        }
        if(resources.length>=8)throw Error('RESOURCE_LIMIT')
        const draft={...session.draft,plan:{...session.draft.plan,
          resources:[...resources,{kind:'youtube',title:label,url:link.url,description:''}]}}
        try{
          await api(path,'PATCH',{expectedRevision:session.draftRevision,draft})
          setSavedSessionId(sid)
          onSaved?.(sid)
          return
        }catch(e){
          if(e.message!=='SESSION_CHANGED'||attempt===1)throw e
        }
      }
    }catch(e){
      setError(e.message==='ADMIN_SIGN_IN_REQUIRED'?(ru?'Войдите повторно в кабинет специалиста.':'Sign in to your practitioner account again.'):
        e.message==='RESOURCE_LIMIT'?(ru?'Не больше 8 материалов на одну консультацию.':'This consultation already has 8 resources.'):
        (ru?'Не удалось сохранить ссылку. Повторите попытку.':'Could not save the YouTube link. Please retry.'))
    }finally{setBusy(false)}
  }
  return <details className={styles.youtubeQuickAdd}>
    <summary><Video size={20} aria-hidden="true"/>
      {ru?'Добавить YouTube-видео по ссылке':'Add a YouTube video by link'}
    </summary>
    <div className={styles.youtubeQuickAddBody}>
      <p className={styles.youtubeEditorNote}>{ru?
        'Для общих обучающих видео. Ссылка YouTube, включая Unlisted, не защищает личные записи клиента.':
        'For general educational videos. Even an Unlisted YouTube link is not private enough for personal client recordings.'}</p>
      <label className={styles.field}>{ru?'Название видео':'Video title'}
        <input maxLength={140} value={title} onChange={e=>setTitle(e.target.value)}/>
      </label>
      <label className={styles.field}>{ru?'Вставьте ссылку YouTube':'Paste a YouTube URL'}
        <input inputMode="url" type="url" maxLength={1500} value={url}
          placeholder="https://youtu.be/XXXXXXXXXXX" onChange={e=>{
            setUrl(e.target.value);setSavedSessionId('');setError('')
          }}/>
      </label>
      {parsed&&<p className={styles.youtubeEditorNote} role="status">{ru?
        'Ссылка распознана. Плеер появится на странице отчёта после публикации.':
        'Valid video link. The player will appear on the report after publication.'}</p>}
      {error&&<p role="alert" className={styles.youtubeEditorWarning}>{error}</p>}
      <button type="button" className={styles.primaryButton}
        disabled={busy||!parsed||!title.trim()} onClick={addVideo}>
        {busy?(ru?'Сохраняем…':'Saving…'):(ru?'Сохранить видео в черновик':'Add video to draft')}
      </button>
      {savedSessionId&&<p role="status" className={styles.success}>
        {ru?'Видео добавлено в черновик. Для просмотра клиентом опубликуйте сессию.':
          'Video added to the draft. Publish the session before your client can view it.'}
        <a href={'/admin/clients/'+clientId+'/sessions/'+savedSessionId}>
          {ru?'Открыть и опубликовать →':'Open and publish →'}
        </a>
      </p>}
    </div>
  </details>
}
