'use client'
import {useEffect,useState} from 'react'
import {BookOpen,CheckCircle2,FolderOpen,RefreshCw,ShieldCheck,Video} from 'lucide-react'
import {parseSessionYouTubeUrl} from '@/lib/clients/youtube-resource'
import {SessionAudioRecorder} from './session-audio-recorder'
import {SessionMaterialPicker} from './session-material-picker'
import styles from './client-session.module.css'

// Uses existing practitioner-scoped session APIs, not a new media store.
// Saving a selection updates only the DRAFT. Client access changes on Publish.
async function ownerApi(path,method='GET',body=null) {
  const response=await fetch(path,{method,cache:'no-store',credentials:'same-origin',
    ...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})})
  const result=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(response.status===401?'ADMIN_SIGN_IN_REQUIRED':result.error||'SESSION_UNAVAILABLE')
  return result
}

export function ReportVideoMaterialsEditor({clientId,documentId,sourceConsultationId,locale='en'}) {
  const ru=locale==='ru'
  const base='/api/admin/clients/'+encodeURIComponent(clientId)+'/sessions'
  const [sessionId,setSessionId]=useState('')
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [newTitle,setNewTitle]=useState(ru?'Обучающее видео':'Educational video')
  const [newUrl,setNewUrl]=useState('')
  const parsed=parseSessionYouTubeUrl(newUrl)
  const resources=session?.draft?.plan?.resources||[]
  const youtube=resources.filter(item=>item.kind==='youtube')
  const assets=new Map((session?.assets||[]).map(asset=>[asset.id,asset]))
  const videoRows=(session?.draft?.media||[]).filter(row=>{
    const asset=assets.get(row.assetId)
    return row.scope==='client'&&asset?.scope==='client'&&asset?.kind==='video'&&asset?.status==='ready'
  })
  const selected=videoRows.filter(row=>['additional','meditation'].includes(row.role)).length+
    youtube.filter(item=>item.placement==='materials').length+
    (session?.draft?.plan?.materialIds||session?.draft?.plan?.materials||[]).length
  const editorUrl=sessionId?'/admin/clients/'+encodeURIComponent(clientId)+
    '/sessions/'+encodeURIComponent(sessionId):''

  async function loadSession(id) {
    const result=await ownerApi(base+'/'+encodeURIComponent(id))
    if(result.session?.draft?.reportDocumentId!==documentId)
      throw new Error('REPORT_SESSION_MISMATCH')
    setSessionId(id)
    setSession(result.session)
    return result.session
  }
  async function findSession() {
    const result=await ownerApi(base)
    const existing=(result.sessions||[]).find(row=>row.sourceConsultationId===sourceConsultationId)
    if(existing){await loadSession(existing.id);return existing.id}
    setSession(null);setSessionId('')
    return ''
  }
  useEffect(()=>{
    let alive=true
    setLoading(true)
    async function start(){
      const result=await ownerApi(base)
      const existing=(result.sessions||[]).find(row=>row.sourceConsultationId===sourceConsultationId)
      if(existing){
        const response=await ownerApi(base+'/'+encodeURIComponent(existing.id))
        if(!alive)return
        if(response.session?.draft?.reportDocumentId!==documentId)throw new Error('REPORT_SESSION_MISMATCH')
        setSession(response.session);setSessionId(existing.id)
      }
    }
    void start().catch(e=>{if(alive)setError(e.message||'SESSION_UNAVAILABLE')})
      .finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[base,documentId,sourceConsultationId])

  async function ensureSession(){
    if(sessionId)return sessionId
    const created=await ownerApi(base,'POST',{documentId})
    const id=created.id
    await loadSession(id)
    return id
  }
  async function refresh(nextId=null){
    setError('');setNotice('')
    try{
      if(nextId)await loadSession(nextId)
      else if(sessionId)await loadSession(sessionId)
      else await findSession()
    }catch(e){setError(e.message||'SESSION_UNAVAILABLE')}
  }
  async function mutate(change) {
    if(busy)return false
    setBusy(true);setError('');setNotice('')
    try{
      const id=await ensureSession()
      for(let attempt=0;attempt<2;attempt++){
        // Re-fetch to preserve audio/video uploads and concurrent report edits.
        const owner=(await ownerApi(base+'/'+encodeURIComponent(id))).session
        if(owner?.draft?.reportDocumentId!==documentId)
          throw new Error('REPORT_SESSION_MISMATCH')
        const next=change(owner)
        if(next===null){setSession(owner);return false}
        try{
          await ownerApi(base+'/'+encodeURIComponent(id),'PATCH',{
            expectedRevision:owner.draftRevision,draft:next
          })
          await loadSession(id)
          setNotice(ru?'Выбор сохранён в черновике. Чтобы клиент увидел изменения, опубликуйте сессию.':
            'Saved in the draft. Publish the session for your client to see the changes.')
          return true
        }catch(e){
          if(e.message!=='SESSION_CHANGED'||attempt===1)throw e
        }
      }
    }catch(e){
      const code=e.message||'SESSION_UNAVAILABLE'
      const message=code==='ADMIN_SIGN_IN_REQUIRED'?(ru?'Войдите снова в кабинет специалиста.':'Sign in to your practitioner account again.'):
        code==='REPORT_SESSION_MISMATCH'?(ru?'Эта сессия связана с другим отчётом. Откройте редактор сессии.':'This session belongs to another report. Open its editor.'):
        code==='RESOURCE_LIMIT'?(ru?'Допускается не больше восьми ссылок.':'A session can have up to eight resource links.'):
        code==='VIDEO_ALREADY_ADDED'?(ru?'Это видео уже прикреплено. Выберите для него место в списке.':'This video is already attached. Select its position below.'):
        (ru?'Не удалось сохранить выбор. Повторите действие.':'Could not save this choice. Please retry.')
      setError(message)
      return false
    }finally{setBusy(false)}
    return false
  }
  async function addYoutube(){
    const link=parseSessionYouTubeUrl(newUrl)
    const title=newTitle.trim()
    if(!link||!title||title.length>140){
      setError(ru?'Укажите название и корректную ссылку на одно видео YouTube.':
        'Enter a title and a valid single-video YouTube URL.')
      return
    }
    const saved=await mutate(owner=>{
      const resources=owner.draft.plan?.resources||[]
      if(resources.length>=8)throw new Error('RESOURCE_LIMIT')
      if(resources.some(item=>item.kind==='youtube'&&parseSessionYouTubeUrl(item.url)?.id===link.id))
        throw new Error('VIDEO_ALREADY_ADDED')
      return {...owner.draft,plan:{...owner.draft.plan,resources:[...resources,
        {kind:'youtube',title,url:link.url,description:'',placement:'materials'}]}}
    })
    if(saved)setNewUrl('')
  }
  async function placeYoutube(url,placement) {
    const id=parseSessionYouTubeUrl(url)?.id
    if(!id||!['top','materials'].includes(placement))return
    await mutate(owner=>({...owner.draft,plan:{...owner.draft.plan,
      resources:(owner.draft.plan?.resources||[]).map(item=>
        item.kind==='youtube'&&parseSessionYouTubeUrl(item.url)?.id===id
          ? {...item,placement} : item)
    }}))
  }
  async function removeYoutube(url){
    const id=parseSessionYouTubeUrl(url)?.id
    if(!id)return
    await mutate(owner=>({...owner.draft,plan:{...owner.draft.plan,
      resources:(owner.draft.plan?.resources||[]).filter(item=>
        !(item.kind==='youtube'&&parseSessionYouTubeUrl(item.url)?.id===id))
    }}))
  }
  async function placePrivateVideo(assetId,role) {
    if(!['personal','instruction','meditation','additional','hidden'].includes(role))return
    await mutate(owner=>{
      const asset=owner.assets?.find(item=>item.id===assetId)
      const item=owner.draft.media.find(row=>row.assetId===assetId)
      if(asset?.kind!=='video'||asset.status!=='ready'||asset.scope!=='client'||
        item?.scope!=='client')throw new Error('VIDEO_NOT_AVAILABLE')
      return {...owner.draft,media:owner.draft.media.map(row=>
        row.assetId===assetId?{...row,role}:row)}
    })
  }
  return <section id="report-video-materials-editor" className={styles.ownerReportMaterials}
    aria-labelledby="report-materials-editor-title">
    <div className={styles.ownerMaterialsHeader}>
      <span className={styles.ownerMaterialsSymbol}><FolderOpen size={23} aria-hidden="true"/></span>
      <div><span className={styles.eyebrow}>{ru?'РЕДАКТОР ОТЧЁТА':'REPORT EDITOR'}</span>
        <h2 id="report-materials-editor-title">{ru?'Материалы — в конце отчёта':'Materials — report footer'}</h2>
        <p>{ru?'Выберите обучающие видео YouTube и приватные видеозаписи, которые должны появиться в блоке «Материалы» после отчёта. Остальные видео можно оставить наверху или скрыть.':
          'Choose YouTube lessons and private recordings to show in the final Materials block. Other videos may remain at the top or be hidden.'}</p>
      </div>
      <span className={styles.ownerMaterialsCount}>{ru?'Выбрано':'Selected'}: {selected}</span>
    </div>
    <div className={styles.ownerMaterialsNotice}><ShieldCheck size={18} aria-hidden="true"/>
      {ru?'Приватные записи показываются только через защищённую сессию. Для YouTube подходят только общие обучающие видео: Unlisted не является приватным.':
        'Private uploads stay in the protected session. YouTube links are for general education only: Unlisted videos are not private.'}
    </div>
    <SessionMaterialPicker locale={locale}
      selectedIds={session?.draft?.plan?.materialIds||session?.draft?.plan?.materials?.map(item=>item.id)||[]}
      disabled={busy||loading}
      onChange={ids=>{void mutate(owner=>({...owner.draft,plan:{...owner.draft.plan,materialIds:ids}}))}}/>
    {loading?<p role="status">{ru?'Загружаем материалы…':'Loading report materials…'}</p>:
    <>
      <div className={styles.ownerMaterialsGroup}>
        <h3><Video size={19} aria-hidden="true"/> {ru?'Видео YouTube':'YouTube videos'}</h3>
        {youtube.length===0&&<p className={styles.ownerMaterialsMuted}>{ru?'Пока нет прикреплённых видео.':'No YouTube lessons attached yet.'}</p>}
        {youtube.map((item,index)=><div className={styles.ownerMaterialsRow} key={item.url+'-'+index}>
          <strong>{item.title}</strong>
          <label>{ru?'Где показывать':'Placement'}
            <select value={item.placement||'top'} disabled={busy} onChange={e=>placeYoutube(item.url,e.target.value)}>
              <option value="top">{ru?'Над отчётом':'Above report'}</option>
              <option value="materials">{ru?'В конце: Материалы':'Footer: Materials'}</option>
            </select>
          </label>
          <button type="button" disabled={busy} onClick={()=>removeYoutube(item.url)}>
            {ru?'Убрать видео':'Remove video'}
          </button>
        </div>)}
        <div className={styles.ownerMaterialsAdd}>
          <label>{ru?'Название обучающего видео':'Educational video title'}
            <input maxLength={140} value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>
          </label>
          <label>{ru?'Ссылка на YouTube':'YouTube link'}
            <input type="url" inputMode="url" maxLength={1500} value={newUrl}
              placeholder="https://youtu.be/XXXXXXXXXXX" onChange={e=>setNewUrl(e.target.value)}/>
          </label>
          <button type="button" disabled={busy||!parsed||!newTitle.trim()} onClick={addYoutube}>
            + {ru?'Добавить в Материалы':'Add to Materials'}
          </button>
        </div>
      </div>
      <div className={styles.ownerMaterialsGroup}>
        <h3><Video size={19} aria-hidden="true"/> {ru?'Загруженные приватные видео':'Uploaded private videos'}</h3>
        {videoRows.length===0&&<p className={styles.ownerMaterialsMuted}>{ru?
          'Приватных видеозаписей пока нет. Загрузите MOV/MP4 ниже, затем выберите место показа.':
          'No private videos yet. Upload an MOV/MP4 below, then choose its placement.'}</p>}
        {videoRows.map(row=><div className={styles.ownerMaterialsRow} key={row.assetId}>
          <strong>{row.title||(ru?'Видеозапись':'Video recording')}</strong>
          <label>{ru?'Где показывать':'Placement'}
            <select value={row.role||'personal'} disabled={busy}
              onChange={e=>placePrivateVideo(row.assetId,e.target.value)}>
              <option value="hidden">{ru?'Не показывать клиенту':'Do not show'}</option>
              <option value="personal">{ru?'Видео вверху':'Video at top'}</option>
              <option value="instruction">{ru?'Видеоинструкция вверху':'Instruction at top'}</option>
              <option value="additional">{ru?'Материалы — в конце':'Materials — at end'}</option>
              <option value="meditation">{ru?'Медитация — в конце':'Meditation — at end'}</option>
            </select>
          </label>
        </div>)}
      </div>
      {editorUrl&&<p className={styles.ownerMaterialsPublish}>
        <CheckCircle2 size={18} aria-hidden="true"/>
        <span>{ru?'Изменения сохраняются в черновике, а не публикуются автоматически.':
          'Changes are saved to the draft and never published automatically.'}</span>
        <a href={editorUrl}>{ru?'Проверить и опубликовать сессию →':'Review and publish session →'}</a>
      </p>}
    </>}
    <div className={styles.ownerMaterialsToolbar}>
      <button type="button" disabled={busy||loading} onClick={()=>refresh()}>
        <RefreshCw size={18} aria-hidden="true"/>{ru?'Обновить список видео':'Refresh video list'}
      </button>
      {editorUrl&&<a href={editorUrl}><BookOpen size={18} aria-hidden="true"/>
        {ru?'Полный редактор сессии':'Full session editor'}</a>}
    </div>
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <SessionAudioRecorder clientId={clientId} documentId={documentId}
      sessionId={sessionId||null} locale={locale} showYouTubeQuickAdd={false}
      onSaved={id=>{void refresh(id||null)}}/>
  </section>
}
