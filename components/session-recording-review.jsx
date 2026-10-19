'use client'
import {useEffect,useMemo,useState} from 'react'
import {Headphones,Video,Trash2,RefreshCw,ShieldCheck,AlertCircle} from 'lucide-react'
import styles from './client-session.module.css'

async function ownerRequest(url,method='GET',body=null){
  const res=await fetch(url,{method,credentials:'same-origin',cache:'no-store',
    ...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})})
  const payload=await res.json().catch(()=>({}))
  if(!res.ok)throw new Error(payload.error||'SESSION_UNAVAILABLE')
  return payload
}
const namedTake=(ru,kind,index)=>kind==='video'
  ?(ru?'Видеодубль ':'Video take ')+(index+1)
  :(ru?'Аудиодубль ':'Audio take ')+(index+1)

// One place to review multiple takes. All candidate assets are private to
// this client+session; selecting a take modifies only the DRAFT revision.
// Clients see a new selection only after the owner's separate Publish action.
export function SessionRecordingReview({clientId,sessionId,locale='en',refreshKey=0,onChanged}){
  const ru=locale==='ru',base=sessionId?
    '/api/admin/clients/'+encodeURIComponent(clientId)+'/sessions/'+encodeURIComponent(sessionId):''
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(false)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [playbackErrors,setPlaybackErrors]=useState({})
  const [canPlay,setCanPlay]=useState({})
  useEffect(()=>{
    if(!base){setSession(null);return}
    let alive=true
    setLoading(true)
    ownerRequest(base).then(data=>{if(alive){setSession(data.session);setError('')}})
      .catch(e=>{if(alive)setError(e.message||'SESSION_UNAVAILABLE')})
      .finally(()=>{if(alive)setLoading(false)})
    return ()=>{alive=false}
  },[base,refreshKey])
  const takes=useMemo(()=>(session?.assets||[])
    .filter(item=>item.status==='ready'&&['audio','video'].includes(item.kind))
    .slice().reverse(),[session?.assets])
  const draftMap=useMemo(()=>new Map((session?.draft?.media||[]).map(row=>[row.assetId,row])),
    [session?.draft?.media])
  const publishedIds=useMemo(()=>new Set((session?.published?.media||[]).map(row=>row.assetId)),
    [session?.published?.media])

  async function refresh(){
    if(!base)return
    const result=await ownerRequest(base)
    setSession(result.session)
    return result.session
  }
  async function toggle(asset,visible){
    if(!base||busy)return
    const id=asset.id
    setBusy(id);setError('');setMessage('')
    try{
      if(asset.scope!=='client')throw new Error('OWNER_ONLY_RECORDING')
      for(let attempt=0;attempt<2;attempt++){
        const current=await refresh()
        if(!current.assets.some(item=>item.id===id&&item.status==='ready'&&item.scope==='client'))
          throw new Error('MEDIA_UNAVAILABLE')
        const media=(current.draft.media||[]).slice()
        const index=media.findIndex(item=>item.assetId===id)
        if(index===-1){
          if(!visible)break
          media.push({assetId:id,scope:'client',
            title:asset.kind==='video'?(ru?'Видеообращение':'Video message'):(ru?'Голосовое сообщение':'Voice message'),
            role:'personal',transcript:'',sortOrder:media.length})
        }else media[index]={...media[index],role:visible?'personal':'hidden'}
        try{
          await ownerRequest(base,'PATCH',{expectedRevision:current.draftRevision,
            draft:{...current.draft,media}})
          await refresh()
          setMessage(visible?
            (ru?'Запись отмечена для клиента. Опубликуйте отчёт, чтобы он её увидел.':
              'Take selected. Publish the report to share it with the client.'):
            (ru?'Запись снята с выбора. Изменение появится у клиента после публикации.':
              'Take deselected. Republish to update the client view.'))
          onChanged?.(sessionId)
          return
        }catch(e){
          if(e.message!=='SESSION_CHANGED'||attempt===1)throw e
        }
      }
    }catch(e){
      setError(e.message==='MEDIA_ALREADY_PUBLISHED'?
        (ru?'Сначала уберите запись из отчёта и опубликуйте новую версию.':
          'Remove the take from the report and publish a new revision first.'):
        e.message==='OWNER_ONLY_RECORDING'?
          (ru?'Личную заметку нельзя открыть клиенту.':'Practitioner-only notes cannot be shared with clients.'):
          (ru?'Не удалось сохранить выбор. Обновите и повторите.':
            'Could not update the selection. Refresh and try again.'))
    }finally{setBusy('')}
  }
  async function remove(asset){
    if(!base||busy)return
    if(publishedIds.has(asset.id)){
      setError(ru?'Этот файл есть в опубликованном отчёте. Снимите галочку, опубликуйте изменения и только затем удалите.':
        'This file is in the published report. Deselect it, publish the changes, then delete it.')
      return
    }
    if(!window.confirm(ru?'Удалить этот неудачный дубль и его приватный файл без возможности восстановления?':
      'Permanently delete this unused take and its private file?'))return
    setBusy(asset.id);setError('');setMessage('')
    try{
      await ownerRequest(base+'/media','POST',{action:'delete',assetId:asset.id})
      await refresh()
      setMessage(ru?'Ненужный дубль удалён.':'Unused take deleted.')
      onChanged?.(sessionId)
    }catch(e){
      await refresh().catch(()=>{})
      setError(e.message==='MEDIA_ALREADY_PUBLISHED'?
        (ru?'Запись уже опубликована. Сначала исключите её и опубликуйте отчёт заново.':
          'This take is published. Deselect it and republish before deleting.'):
        e.message==='MEDIA_CLEANUP_RETRY_REQUIRED'?
          (ru?'Дубль скрыт, но удаление файла из хранилища требует повторной очистки в редакторе сессии.':
            'Take hidden; private storage deletion needs a housekeeping retry from the session editor.'):
          (ru?'Не удалось удалить запись. Попробуйте позже.':'Could not delete this take. Try again.'))
    }finally{setBusy('')}
  }
  if(!base)return null
  return <section className={styles.takeSection} aria-label={ru?'Варианты аудио и видео':'Audio and video takes'}>
    <div className={styles.takeHeader}>
      <div>
        <h3>{ru?'Варианты записи':'Recording takes'}</h3>
        <p>{ru?'Прослушайте дубли и отметьте любые подходящие записи. Можно выбрать несколько.':
          'Listen to each take and select as many as you need.'}</p>
      </div>
      <button type="button" onClick={()=>void refresh().catch(e=>setError(e.message))}
        disabled={Boolean(busy)||loading} aria-label={ru?'Обновить записи':'Refresh takes'}>
        <RefreshCw size={18}/>{ru?'Обновить':'Refresh'}
      </button>
    </div>
    {loading&&<p role="status">{ru?'Загружаем записи…':'Loading takes…'}</p>}
    {!loading&&takes.length===0&&<p>{ru?'Пока нет сохранённых дублей. Сделайте запись или загрузите файл выше.':
      'No saved takes yet. Record or import an audio file above.'}</p>}
    <div className={styles.takeList}>
      {takes.map((asset,index)=>{
        const row=draftMap.get(asset.id)
        const selected=Boolean(row&&row.scope==='client'&&row.role!=='hidden')
        const inPublished=publishedIds.has(asset.id)
        const isVideo=asset.kind==='video'
        const playable=canPlay[asset.id]===true
        const broken=Boolean(playbackErrors[asset.id])
        return <article key={asset.id} className={styles.takeCard}>
          <div className={styles.takeName}>
            {isVideo?<Video size={20}/>:<Headphones size={20}/>}
            <strong>{row?.title||namedTake(ru,asset.kind,index)}</strong>
            {Number.isFinite(asset.bytes)&&<small>{Math.ceil(asset.bytes/1024)} KB</small>}
          </div>
          {isVideo?
            <video controls playsInline preload="metadata"
              src={base+'/media/'+encodeURIComponent(asset.id)}
              className={styles.video}
              onCanPlay={()=>{setCanPlay(v=>({...v,[asset.id]:true}));setPlaybackErrors(v=>({...v,[asset.id]:false}))}}
              onError={()=>{setCanPlay(v=>({...v,[asset.id]:false}));setPlaybackErrors(v=>({...v,[asset.id]:true}))}}/>:
            <audio controls preload="metadata"
              src={base+'/media/'+encodeURIComponent(asset.id)}
              className={styles.audio}
              onCanPlay={()=>{setCanPlay(v=>({...v,[asset.id]:true}));setPlaybackErrors(v=>({...v,[asset.id]:false}))}}
              onError={()=>{setCanPlay(v=>({...v,[asset.id]:false}));setPlaybackErrors(v=>({...v,[asset.id]:true}))}}/>}
          {broken&&<p className={styles.takeError} role="alert"><AlertCircle size={17}/>
            {ru?'Запись не воспроизводится в этом браузере. Не прикрепляйте её, удалите или перезапишите.':
              'This recording cannot be played in your browser. Re-record or delete it instead of sharing.'}</p>}
          <div className={styles.takeActions}>
            {asset.scope==='client'?
              <label className={styles.takeChoice}>
                <input type="checkbox" checked={selected}
                  disabled={Boolean(busy)||(!selected&&broken)}
                  onChange={e=>void toggle(asset,e.target.checked)}/>
                <span>{ru?'Прикрепить клиенту':'Attach to client'}</span>
              </label>:
              <span className={styles.takePrivate}><ShieldCheck size={16}/>
                {ru?'Личная заметка — клиент не видит':'Practitioner only — hidden from client'}</span>}
            <button type="button" onClick={()=>void remove(asset)}
              disabled={Boolean(busy)||inPublished}
              title={inPublished?(ru?'Сначала исключите из опубликованного отчёта':'Deselect and republish first'):undefined}>
              <Trash2 size={17}/>{ru?'Удалить дубль':'Delete take'}
            </button>
          </div>
          {!selected&&!inPublished&&<p className={styles.takeHint}>{ru?
            'Черновик: этот дубль не будет отправлен клиенту.':
            'Draft only: this take will not be sent to the client.'}</p>}
          {inPublished&&<p className={styles.takeHint}>{ru?
            'Этот дубль есть в текущей опубликованной версии. Чтобы убрать его у клиента, снимите отметку и опубликуйте отчёт снова.':
            'Currently published. Deselect and republish to remove it from the client view.'}</p>}
          {selected&&!inPublished&&<p className={styles.takeHint}>{playable?
            (ru?'Прослушивание доступно. Опубликуйте отчёт для клиента.':'Playback available. Publish to share with the client.'):
            (ru?'Выбран в черновике; обязательно проверьте воспроизведение до публикации.':
              'Selected in draft. Verify playback before publishing.')}</p>}
        </article>
      })}
    </div>
    {message&&<p role="status" className={styles.success}>{message}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </section>
}
