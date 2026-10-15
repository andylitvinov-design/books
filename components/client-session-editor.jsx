'use client'
import {useEffect,useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {ClientSessionPage} from './client-session-page'
import './client-session-editor.css'

const text=(ru,en,r)=>r?ru:en
const kinds=['text','practice','report','document','video','audio','pdf','link']
const uuid=()=>crypto.randomUUID()
export function ClientSessionEditor({clientId,locale='en',reports=[],documents=[]}){
  const ru=locale==='ru'
  const [sessions,setSessions]=useState([]),[current,setCurrent]=useState(null)
  const [busy,setBusy]=useState(false),[status,setStatus]=useState('')
  const [selectedConsult,setSelectedConsult]=useState(''),[newSessionTitle,setNewSessionTitle]=useState(''),[newSessionDate,setNewSessionDate]=useState(new Date().toISOString().slice(0,10))
  const [title,setTitle]=useState(''),[summary,setSummary]=useState('')
  const [items,setItems]=useState([]),[newKind,setNewKind]=useState('text')
  const [newName,setNewName]=useState(''),[newBody,setNewBody]=useState(''),[newRef,setNewRef]=useState('')
  const [fileKind,setFileKind]=useState('audio'),[uploading,setUploading]=useState(false)
  const [recording,setRecording]=useState(false),[audioBlob,setAudioBlob]=useState(null)
  const [preview,setPreview]=useState(false)
  const previewItems=items.map(i=>i.kind==='report'
    ? {...i,report:reports.find(r=>r.id===i.refId)||null}
    : i)
  const recorder=useRef(null),mediaStream=useRef(null)
  const base='/admin/api/clients/'+encodeURIComponent(clientId)+'/sessions'
  const uniqueConsults=[...new Map(documents.map(d=>[d.consultationId??d.id,{id:d.consultationId??d.id,date:d.date}])).values()]
    .sort((a,b)=>b.date.localeCompare(a.date))
  const api=async(url,method='GET',body)=>{
    const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',
      headers:body?{'Content-Type':'application/json'}:undefined,
      body:body?JSON.stringify(body):undefined})
    if(!r.ok)throw new Error(r.status===409?'Unavailable or changed; reload and try again.':'Unavailable')
    return r.json()
  }
  async function refresh(){
    const {sessions:list}=await api(base)
    setSessions(list)
    return list
  }
  useEffect(()=>{
    let live=true
    api(base).then(result=>{if(live)setSessions(result.sessions)})
      .catch(()=>{if(live)setStatus('Session service unavailable. Check configuration and migrations.')})
    return()=>{live=false}
  },[clientId])
  function select(s){
    setCurrent(s);setTitle(s.title);setSummary(s.summary);setItems(s.items||[])
    setNewName('');setNewBody('');setNewRef('');setAudioBlob(null);setPreview(false);setStatus('')
  }
  async function act(action,body={}){
    if(!current)return
    return api(base+'/'+current.id,'POST',{action,...body})
  }
  async function create(){
    setBusy(true);setStatus('')
    try{
      const match=uniqueConsults.find(c=>c.id===selectedConsult)
      const date=match?.date||newSessionDate
      const chosen=newSessionTitle.trim()||text('Персональная консультация','Personal consultation',ru)
      const result=await api(base,'POST',{date,locale,consultationId:match?.id||null,title:chosen})
      const list=await refresh()
      select(list.find(x=>x.id===result.session.id)||result.session)
      setSelectedConsult('');setNewSessionTitle('')
    }catch(e){setStatus(e.message)}finally{setBusy(false)}
  }
  function inputItem(){
    if(!current)return
    const name=newName.trim()
    if(!name){setStatus(text('Укажите название.','Add a title.',ru));return}
    const item={id:uuid(),kind:newKind,title:name,body:newBody}
    if(newKind==='report'||newKind==='document'){
      if(!newRef){setStatus(text('Выберите документ.','Choose a record.',ru));return}
      item.refId=newRef
    }
    if(newKind==='link'){
      if(!newRef.startsWith('https://')){setStatus('HTTPS URL required');return}
      item.url=newRef
    }
    if(['video','audio','pdf'].includes(newKind)){setStatus(text('Для медиа используйте загрузку ниже.','Use the file upload for media below.',ru));return}
    setItems(old=>[...old,item]);setNewName('');setNewBody('');setNewRef('');setStatus('')
  }
  function normalize(){
    return {title,summary,items:items.map(i=>{
      const {id,kind,title,body,refId,assetId,url}=i
      return {id,kind,title,body,...(refId?{refId}:{}),...(assetId?{assetId}:{}),...(url?{url}:{})}
    })}
  }
  async function save(quiet=false){
    if(!current)throw new Error('Select a session')
    const {session}=await api(base+'/'+current.id,'PATCH',{revision:current.revision,content:normalize()})
    setCurrent(session);setTitle(session.title);setSummary(session.summary);setItems(session.items)
    await refresh()
    if(!quiet)setStatus(text('Черновик сохранён.','Draft saved.',ru))
    return session
  }
  async function saveClick(){
    setBusy(true);setStatus('')
    try{await save()}catch(e){setStatus(e.message)}finally{setBusy(false)}
  }
  async function publish(){
    if(!current)return
    setBusy(true);setStatus('')
    try{
      const session=await save(true)
      const published=await api(base+'/'+session.id,'POST',{action:'publish',revision:session.revision})
      select(published.result);await refresh()
      setStatus(text('Сессия опубликована. Можно копировать приватную ссылку.','Session published. Copy its private invitation below.',ru))
    }catch(e){setStatus(e.message)}finally{setBusy(false)}
  }
  async function share(rotate=false){
    if(!current)return
    setBusy(true);setStatus('')
    try{
      if(rotate&&!confirm(text('Обновить ссылку? Прежняя перестанет работать.','Rotate link? The old invitation will stop working.',ru)))return
      const {result}=await act(rotate?'rotate':'share')
      const url=location.origin+'/'+locale+'/client/session/'+result.selector+'#'+result.secret
      await navigator.clipboard.writeText(url)
      setStatus(text('Ссылка именно на эту сессию скопирована.','This session-only link is copied.',ru))
    }catch(e){setStatus(e.message)}finally{setBusy(false)}
  }
  async function revoke(){
    if(!current||!confirm(text('Отозвать только ссылку на эту сессию?','Revoke this session link only?',ru)))return
    setBusy(true);try{await act('revoke');setStatus(text('Приглашение отозвано.','Invitation revoked.',ru))}catch(e){setStatus(e.message)}finally{setBusy(false)}
  }
  async function archive(){
    if(!current||!confirm(text('Архивировать сессию и закрыть её ссылку?','Archive this session and revoke access?',ru)))return
    setBusy(true);try{await act('archive');setCurrent(null);await refresh();setStatus(text('Сессия архивирована.','Session archived.',ru))}catch(e){setStatus(e.message)}finally{setBusy(false)}
  }
  async function upload(file,kind=fileKind){
    if(!file||!current||uploading)return
    setUploading(true);setStatus(text('Загружаем файл…','Uploading securely…',ru))
    try{
      const rawMime=file.type==='audio/x-m4a'?'audio/mp4':file.type
      const mime=rawMime|| (kind==='audio'?'audio/mp4':kind==='video'?'video/mp4':'application/pdf')
      const {result:intent}=await act('upload-intent',{file:{mime,bytes:file.size}})
      const provider=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
      const {error}=await provider.storage.from(intent.bucket).uploadToSignedUrl(intent.path,intent.token,file,{contentType:mime,upsert:false})
      if(error)throw new Error('Private upload failed')
      await act('finalize-upload',{assetId:intent.assetId})
      const item={id:uuid(),kind,title:file.name.replace(/\.[^.]+$/,'').slice(0,150)||kind,body:'',assetId:intent.assetId}
      setItems(old=>[...old,item])
      setStatus(text('Файл прикреплён к черновику. Нажмите «Опубликовать», чтобы клиент увидел его.','Media attached to draft. Publish the session to make it visible.',ru))
      setAudioBlob(null)
    }catch(e){setStatus(e.message)}finally{setUploading(false)}
  }
  async function startRecording(){
    if(!current||recording||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      setStatus(text('Запись на этом устройстве недоступна.','Recording is unavailable on this device.',ru));return
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      mediaStream.current=stream
      const supported=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t))||''
      const mimeType=supported?{mimeType:supported}:{}
      const rec=new MediaRecorder(stream,mimeType),parts=[]
      recorder.current=rec
      rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)}
      rec.onstop=()=>{
        const type=supported.startsWith('audio/mp4')?'audio/mp4':'audio/webm'
        const extension=type==='audio/mp4'?'m4a':'webm'
        const blob=new Blob(parts,{type})
        setAudioBlob(new File([blob],'session-audio.'+extension,{type}))
        stream.getTracks().forEach(track=>track.stop())
        mediaStream.current=null
        setRecording(false)
      }
      rec.start(1000);setRecording(true);setStatus(text('Идёт запись. Нажмите «Остановить».','Recording. Choose Stop to finish.',ru))
    }catch{setStatus(text('Доступ к микрофону не получен.','Microphone access unavailable.',ru))}
  }
  function stopRecording(){if(recorder.current?.state==='recording')recorder.current.stop()}
  return <section className="hh-owner-sessions" aria-labelledby="hh-owner-sessions-title">
    <div className="hh-owner-sessions-heading"><div>
      <p>{text('ПЕРСОНАЛЬНЫЕ МАТЕРИАЛЫ','PERSONAL SESSION MATERIALS',ru)}</p>
      <h2 id="hh-owner-sessions-title">{text('Сессии клиента','Client sessions',ru)}</h2>
      <span>{text('Каждая сессия имеет своё видео, аудио, отчёт и закрытую ссылку.','Each session has its own video, audio, report and scoped private link.',ru)}</span>
    </div></div>
    <div className="hh-owner-sessions-new">
      <label>{text('Связать с консультацией','Link to consultation',ru)}
        <select value={selectedConsult} onChange={e=>{setSelectedConsult(e.target.value)}}>
          <option value="">{text('Новая сессия без привязки','Independent session',ru)}</option>
          {uniqueConsults.map(c=><option value={c.id} key={c.id}>{c.date} · {c.id.slice(0,8)}</option>)}
        </select>
      </label>
      {!selectedConsult?<label>{text('Дата новой сессии','Session date',ru)}
        <input type="date" value={newSessionDate} onChange={e=>setNewSessionDate(e.target.value)} required/>
      </label>:null}
      <label>{text('Название новой сессии','New session title',ru)}
        <input maxLength={160} value={newSessionTitle} onChange={e=>setNewSessionTitle(e.target.value)} placeholder={text('Материалы консультации','Consultation materials',ru)}/>
      </label>
      <button disabled={busy} onClick={create} type="button">{text('+ Новая сессия','+ New session',ru)}</button>
    </div>
    {sessions.length?<div className="hh-owner-session-list">{sessions.map(s=><button
      key={s.id} aria-pressed={current?.id===s.id} onClick={()=>select(s)} type="button">
        <strong>{s.title}</strong><small>{s.date} · {s.status}</small>
      </button>)}</div>:<p>{text('Пока нет созданных сессий.','No sessions yet.',ru)}</p>}
    {current?<div className="hh-owner-session-editor">
      <div className="hh-owner-session-editor-head"><h3>{current.status==='published'?text('Редактировать опубликованную сессию','Edit published session',ru):text('Черновик сессии','Session draft',ru)}</h3><span>v{current.revision}</span></div>
      <label>{text('Название','Title',ru)}<input value={title} maxLength={160} onChange={e=>setTitle(e.target.value)}/></label>
      <label>{text('Вступление для клиента','Introduction for the client',ru)}
        <textarea rows={3} maxLength={4000} value={summary} onChange={e=>setSummary(e.target.value)} placeholder={text('Короткое персональное сообщение…','A short personal note…',ru)}/>
      </label>
      <div className="hh-owner-session-items">
        <h4>{text('Материалы этой сессии','Materials for this session',ru)}</h4>
        {items.map((item,index)=><div className="hh-owner-session-item" key={item.id}>
          <div className="hh-owner-session-item-fields">
            <small>{item.kind}</small>
            <input aria-label={text('Название материала','Item title',ru)} maxLength={160} value={item.title}
              onChange={event=>setItems(a=>a.map((value,i)=>i===index?{...value,title:event.target.value}:value))}/>
            <textarea aria-label={text('Описание материала','Item description',ru)} rows={2} maxLength={7000}
              value={item.body||''}
              onChange={event=>setItems(a=>a.map((value,i)=>i===index?{...value,body:event.target.value}:value))}/>
          </div>
          <div><button type="button" disabled={index===0} onClick={()=>setItems(a=>{const b=[...a];[b[index-1],b[index]]=[b[index],b[index-1]];return b})} aria-label="Move up">↑</button>
            <button type="button" onClick={()=>setItems(a=>a.filter(i=>i.id!==item.id))} aria-label="Remove">×</button></div>
        </div>)}
        <div className="hh-owner-session-add">
          <label>{text('Тип','Type',ru)}<select value={newKind} onChange={e=>{setNewKind(e.target.value);setNewRef('')}}>{kinds.filter(k=>!['video','audio','pdf'].includes(k)).map(k=><option key={k} value={k}>{k}</option>)}</select></label>
          <label>{text('Название','Title',ru)}<input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={text('Рекомендация или практика','Recommendation or practice',ru)}/></label>
          {newKind==='report'||newKind==='document'?<label>{text('Запись','Record',ru)}
            <select value={newRef} onChange={e=>setNewRef(e.target.value)}><option value="">—</option>
              {(newKind==='report'?reports:documents).map(r=><option value={r.id} key={r.id}>{r.title} · {r.date||r.occurredOn}</option>)}
            </select></label>:null}
          {newKind==='link'?<label>HTTPS URL<input value={newRef} onChange={e=>setNewRef(e.target.value)} placeholder="https://"/></label>:null}
          <label>{text('Описание / текст','Description / text',ru)}<textarea rows={2} value={newBody} onChange={e=>setNewBody(e.target.value)}/></label>
          <button type="button" onClick={inputItem}>{text('+ Добавить материал','+ Add item',ru)}</button>
        </div>
      </div>
      <div className="hh-owner-session-add">
        <h4>{text('Приватные видео, аудио и PDF','Private video, audio and PDF',ru)}</h4>
        <label>{text('Формат','Format',ru)}<select value={fileKind} onChange={e=>setFileKind(e.target.value)}>
          <option value="audio">Audio</option><option value="video">Video</option><option value="pdf">PDF</option>
        </select></label>
        <label className="hh-owner-upload-label">{text('Выбрать файл','Select a file',ru)}
          <input type="file" disabled={uploading} accept={fileKind==='audio'?'audio/mpeg,audio/mp4,audio/webm,.mp3,.m4a':fileKind==='video'?'video/mp4,video/webm,.mp4,.webm':'application/pdf,.pdf'}
            onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value=''}}/>
        </label>
        {fileKind==='audio'?<div className="hh-owner-record">
          <button type="button" disabled={uploading||recording} onClick={startRecording}>● {text('Записать с телефона','Record from phone',ru)}</button>
          {recording?<button type="button" onClick={stopRecording}>{text('Остановить','Stop',ru)}</button>:null}
          {audioBlob?<button type="button" disabled={uploading} onClick={()=>upload(audioBlob,'audio')}>{text('Прикрепить запись','Attach recorded audio',ru)}</button>:null}
        </div>:null}
        <p className="hh-owner-hint">{text('Файлы сохраняются в закрытом хранилище. Публикация отдельным действием.','Files go to private storage. Publication is a separate action.',ru)}</p>
      </div>
      <div className="hh-owner-session-actions">
        <button type="button" disabled={busy||uploading} onClick={saveClick}>{text('Сохранить черновик','Save draft',ru)}</button>
        <button type="button" onClick={()=>setPreview(v=>!v)}>{preview?text('Скрыть предпросмотр','Close preview',ru):text('Предпросмотр','Preview',ru)}</button>
        <button type="button" disabled={busy||uploading} className="hh-owner-primary" onClick={publish}>{text('Опубликовать клиенту','Publish to client',ru)}</button>
        {current.status==='published'?<>
          <button type="button" disabled={busy} onClick={()=>share(false)}>{text('Копировать ссылку на эту сессию','Copy this session link',ru)}</button>
          <button type="button" disabled={busy} onClick={()=>share(true)}>{text('Обновить ссылку','Rotate link',ru)}</button>
          <button type="button" disabled={busy} onClick={revoke}>{text('Отозвать ссылку','Revoke invitation',ru)}</button>
        </>:null}
        <button type="button" disabled={busy} onClick={archive}>{text('Архивировать','Archive',ru)}</button>
      </div>
    </div>:null}
    {current&&preview?<div className="hh-owner-session-preview" aria-label={text('Предпросмотр сессии','Session preview',ru)}>
      <ClientSessionPage session={{id:current.id,date:current.date,title,summary,items:previewItems}}
        locale={locale} playBase={base+'/'+current.id+'/play'} pdfBase={null}/>
      <p className="hh-owner-hint">{text('Предпросмотр виден только специалисту. Гостевая ссылка создаётся после публикации.','Owner-only preview. A guest invitation becomes available after publication.',ru)}</p>
    </div>:null}
    {status?<p role="status" className="hh-owner-session-status">{status}</p>:null}
  </section>
}
