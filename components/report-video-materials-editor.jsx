'use client'
import {useEffect,useState} from 'react'
import {prepareReportSession} from '@/lib/consultations/owner-report-sharing'
import {BookOpen,FolderOpen,RefreshCw,ShieldCheck} from 'lucide-react'
import {SessionMaterialPicker} from './session-material-picker'
import {SessionSaveFooterVideo} from './session-save-footer-video'
import {SessionAudioRecorder} from './session-audio-recorder'
import styles from './client-session.module.css'

// Shared materials are selected only from the approved owner catalog.
// A separate inline voice recorder saves client-specific audio to the
// consultation session, never to shared Materials; publication remains explicit.
async function ownerApi(path,method='GET',body=null){
  const response=await fetch(path,{method,cache:'no-store',credentials:'same-origin',
    ...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})})
  const result=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(response.status===401?'ADMIN_SIGN_IN_REQUIRED':result.error||'SESSION_UNAVAILABLE')
  return result
}

export function ReportVideoMaterialsEditor({clientId,documentId,sourceConsultationId,locale='en',placement='all'}){
  const ru=locale==='ru'
  const base='/api/admin/clients/'+encodeURIComponent(clientId)+'/sessions'
  const [sessionId,setSessionId]=useState('')
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const selectedIds=session?.draft?.plan?.materialIds||
    session?.draft?.plan?.materials?.map(item=>item.id)||[]
  const legacyCount=(session?.draft?.plan?.resources||[]).length+
    (session?.draft?.media||[]).filter(item=>item.scope==='client').length
  const editorUrl=sessionId?'/admin/clients/'+encodeURIComponent(clientId)+
    '/sessions/'+encodeURIComponent(sessionId):''

  async function readSession(id){
    const result=await ownerApi(base+'/'+encodeURIComponent(id))
    if(result.session?.draft?.reportDocumentId!==documentId)
      throw new Error('REPORT_SESSION_MISMATCH')
    setSessionId(id)
    setSession(result.session)
    return result.session
  }
  async function findSession(){
    const result=await ownerApi(base)
    const existing=(result.sessions||[]).find(row=>row.sourceConsultationId===sourceConsultationId)
    if(existing)return readSession(existing.id)
    setSession(null)
    setSessionId('')
    return null
  }
  useEffect(()=>{
    let alive=true
    setLoading(true)
    async function load(){
      const result=await ownerApi(base)
      const existing=(result.sessions||[]).find(row=>row.sourceConsultationId===sourceConsultationId)
      if(!existing){if(alive){setSession(null);setSessionId('')}return}
      const detail=(await ownerApi(base+'/'+encodeURIComponent(existing.id))).session
      if(detail?.draft?.reportDocumentId!==documentId)throw new Error('REPORT_SESSION_MISMATCH')
      if(alive){setSession(detail);setSessionId(existing.id)}
    }
    void load().catch(e=>{if(alive)setError(e.message||'SESSION_UNAVAILABLE')})
      .finally(()=>{if(alive)setLoading(false)})
    return ()=>{alive=false}
  },[base,documentId,sourceConsultationId])

  async function ensureSession(){
    if(sessionId)return sessionId
    // The top voice editor may have created the linked session in another instance.
    const existing=await findSession()
    if(existing?.id)return existing.id
    const created=await ownerApi(base,'POST',{documentId})
    await readSession(created.id)
    return created.id
  }
  async function saveSelectedMaterials(ids){
    if(busy)return
    setBusy(true);setNotice('');setError('')
    try{
      const id=await ensureSession()
      for(let attempt=0;attempt<2;attempt++){
        // Re-read the exact report draft before updating only its selection.
        // This preserves personal recordings, legacy resources and report text.
        const owner=(await ownerApi(base+'/'+encodeURIComponent(id))).session
        if(owner?.draft?.reportDocumentId!==documentId)
          throw new Error('REPORT_SESSION_MISMATCH')
        const draft={...owner.draft,plan:{...owner.draft.plan,materialIds:ids}}
        try{
          await ownerApi(base+'/'+encodeURIComponent(id),'PATCH',{
            expectedRevision:owner.draftRevision,draft,
          })
          await readSession(id)
          setNotice(ru?'Выбранные материалы сохранены в черновике. Они появятся у клиента после публикации отчёта.':
            'Selected library materials saved in the draft. Publish the report to show them to the client.')
          return
        }catch(e){
          if(e.message!=='SESSION_CHANGED'||attempt===1)throw e
        }
      }
    }catch(e){
      setError(e.message==='ADMIN_SIGN_IN_REQUIRED'?
        (ru?'Войдите снова в кабинет мастера.':'Sign in to your practitioner account again.'):
        e.message==='REPORT_SESSION_MISMATCH'?
          (ru?'Эта сессия связана с другим отчётом.':'This session belongs to another report.'):
        (ru?'Не удалось сохранить выбор. Повторите действие.':'Unable to save selected materials. Please try again.'))
    }finally{setBusy(false)}
  }
  async function refresh(){
    if(busy)return
    setLoading(true);setError('');setNotice('')
    try{
      if(sessionId)await readSession(sessionId)
      else await findSession()
    }catch(e){setError(e.message||'SESSION_UNAVAILABLE')}
    finally{setLoading(false)}
  }
  return <>
  {(placement==='video'||placement==='all')&&!loading&&<SessionAudioRecorder clientId={clientId} sessionId={sessionId||null}
    documentId={documentId} locale={locale} videoOnly
    onSaved={savedId=>{void readSession(savedId).catch(e=>setError(e.message||'SESSION_UNAVAILABLE'))}}/>}
  {(placement==='audio'||placement==='all')&&!loading&&<SessionAudioRecorder clientId={clientId} sessionId={sessionId||null}
    documentId={documentId} locale={locale} audioOnly
    onSaved={savedId=>{void readSession(savedId).catch(e=>setError(e.message||'SESSION_UNAVAILABLE'))}}/>}
  {(placement==='materials'||placement==='all')&&<section id="report-video-materials-editor" className={styles.ownerReportMaterials}
    aria-labelledby="report-materials-editor-title">
    <div className={styles.ownerMaterialsHeader}>
      <span className={styles.ownerMaterialsSymbol}><FolderOpen size={23} aria-hidden="true"/></span>
      <div>
        <span className={styles.eyebrow}>{ru?'РЕДАКТОР ОТЧЁТА':'REPORT EDITOR'}</span>
        <h2 id="report-materials-editor-title">{ru?'Материалы из библиотеки':'Materials from library'}</h2>
        <p>{ru?'Сохраните общее видео из отчёта или телефона, затем выбирайте его для других клиентов.':
          'Save a general video from this report or phone, then reuse it in other reports.'}</p>
      </div>
      <span className={styles.ownerMaterialsCount}>{ru?'К отчёту':'In this report'}: {selectedIds.length}</span>
    </div>
    <div className={styles.ownerMaterialsNotice}>
      <ShieldCheck size={18} aria-hidden="true"/>
      {ru?'Новое видео сначала сохраняется в ваши Материалы. Другим клиентам оно не отправляется автоматически.':
        'New videos stay in your private Materials until you choose them for a report.'}
    </div>
    <SessionSaveFooterVideo clientId={clientId} session={session} locale={locale}/>
    {loading?<p role="status">{ru?'Загружаем выбор материалов…':'Loading selected materials…'}</p>:
      <SessionMaterialPicker locale={locale} selectedIds={selectedIds}
        disabled={busy} onChange={ids=>void saveSelectedMaterials(ids)}/>}
    {legacyCount>0&&<p className={styles.ownerMaterialsMuted}>{ru?
      'Уже добавленные к этой консультации личные записи и старые ссылки сохранены. Они не становятся общими материалами.':
      'Existing personal recordings and legacy links remain in this consultation. They are not part of the shared library.'}</p>}
    {editorUrl&&<p className={styles.ownerMaterialsPublish}>
      <BookOpen size={18} aria-hidden="true"/>
      <span>{ru?'После выбора откройте полный редактор сессии, чтобы проверить и опубликовать отчёт.':
        'After selecting resources, open the full session editor to review and publish.'}</span>
      <a href={editorUrl}>{ru?'Проверить отчёт →':'Review report →'}</a>
    </p>}
    {!editorUrl&&<button type="button" disabled={busy||loading} onClick={async()=>{
      if(busy)return
      setBusy(true);setError('')
      try{window.location.assign(await prepareReportSession(clientId,documentId))}
      catch{setError(ru?'Не удалось открыть редактор сессии. Повторите после входа в кабинет.':'Unable to open the session editor. Sign in and retry.');setBusy(false)}
    }}>{ru?'Проверить и опубликовать отчёт →':'Review and publish report →'}</button>}
    <div className={styles.ownerMaterialsToolbar}>
      <button type="button" disabled={busy||loading} onClick={()=>void refresh()}>
        <RefreshCw size={17} aria-hidden="true"/>{ru?'Обновить выбор':'Refresh selection'}
      </button>
      <a href="/admin/materials" target="_blank" rel="noopener noreferrer">
        <FolderOpen size={18} aria-hidden="true"/>
        {ru?'Открыть библиотеку мастера ↗':'Open practitioner library ↗'}
      </a>
    </div>
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </section>}
  </>
}
