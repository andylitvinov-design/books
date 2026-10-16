'use client'
import { useState } from 'react'
import { SessionAudioRecorder } from './session-audio-recorder'
import { SessionMaterialPicker } from './session-material-picker'
import { SessionYouTubePlayer } from './session-youtube-player'
import { parseSessionYouTubeUrl } from '@/lib/clients/youtube-resource'
import { tryCopyOwnerLink } from '@/lib/consultations/owner-report-sharing'
import { Copy,FileText,LockKeyhole,PlayCircle,Save,Send,Trash2,RotateCw,ChevronUp,ChevronDown } from 'lucide-react'
import styles from './client-session.module.css'

async function api(url,method='GET',body) {
  const res=await fetch(url,{method,cache:'no-store',credentials:'same-origin',
    ...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})})
  const response=await res.json()
  if(!res.ok) throw new Error(response.error||'Request unavailable')
  return response
}
function mediaTitle(row,locale) {
  if(row?.kind==='pdf') return locale==='ru'?'PDF-материал':'PDF resource'
  if(row?.kind==='image') return locale==='ru'?'Фотография':'Photo'
  if(row?.kind==='video') return locale==='ru'?'Видеообращение':'Video message'
  return locale==='ru'?'Голосовое сообщение':'Voice message'
}
export function AdminSessionStudio({clientId,initialSession,documents=[],locale='en'}) {
  const ru=locale==='ru'
  const [session,setSession]=useState(initialSession)
  const [draft,setDraft]=useState(initialSession.draft)
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [link,setLink]=useState('')
  const [showClientPreview,setShowClientPreview]=useState(false)
  const [playerUrls,setPlayerUrls]=useState({})
  const base='/api/admin/clients/'+clientId+'/sessions/'+session.id
  const activeAssets=new Map((session.assets||[]).map(row=>[row.id,row]))
  const plan=draft.plan||{focus:'',nextStep:'',takeaways:[],practices:[],additionalRecommendations:'',resources:[]}
  const updatePlan=patch=>setDraft(current=>({...current,
    plan:{focus:'',nextStep:'',takeaways:[],practices:[],additionalRecommendations:'',resources:[],...(current.plan||{}),...patch}
  }))
  function setTakeaway(index,value){
    const points=[...(plan.takeaways||[])];points[index]=value
    updatePlan({takeaways:points})
  }
  function changePractice(index,patch){
    const rows=[...(plan.practices||[])]
    rows[index]={...rows[index],...patch}
    updatePlan({practices:rows})
  }
  function changeResource(index,patch){
    const links=[...(plan.resources||[])]
    links[index]={...links[index],...patch}
    updatePlan({resources:links})
  }
  const hasExtraText=Boolean(
    plan.focus?.trim()||plan.nextStep?.trim()||plan.additionalRecommendations?.trim()||
    (plan.takeaways||[]).some(point=>point?.trim())||
    (plan.practices||[]).some(item=>item.title?.trim()||item.instructions?.trim())
  )
  const changed=JSON.stringify(draft)!==JSON.stringify(session.draft)
  async function load() {
    const result=await api(base)
    setSession(result.session)
    setDraft(result.session.draft)
    return result.session
  }
  async function refreshAfterMedia() {
    const result=await api(base)
    setSession(result.session)
    setDraft(current=>{
      if(JSON.stringify(current)===JSON.stringify(session.draft)) return result.session.draft
      const ids=new Set(current.media.map(item=>item.assetId))
      return {...current,media:[...current.media,...result.session.draft.media.filter(item=>!ids.has(item.assetId))]}
    })
  }
  async function save() {
    const result=await api(base,'PATCH',{expectedRevision:session.draftRevision,draft})
    const updated=await load()
    setMessage(ru?'Черновик сохранён':'Draft saved')
    return updated
  }
  async function act(action,days) {
    setBusy(action);setError('');setMessage('')
    try {
      if(action==='publish'&&changed) await save()
      const result=await api(base,'POST',{action,days})
      if(['copy','rotate'].includes(action)&&result.secret) {
        const url=window.location.origin+'/'+locale+'/client/session/'+result.selector+'#'+result.secret
        setLink(url)
        if(await tryCopyOwnerLink(url,navigator.clipboard))
          setMessage(ru?'Ссылка на одну сессию скопирована':'Session-only link copied')
        else setMessage(ru?'Ссылка готова. Нажмите «Копировать ещё раз» или выделите адрес ниже.':
          'Link ready. Tap Copy again or select the URL below.')
      } else {
        setMessage(action==='publish'?(ru?'Сессия опубликована. Теперь можно скопировать отдельную ссылку.':'Session published. Copy its individual link now.'):
          action==='revoke'?(ru?'Доступ по этой ссылке отозван':'This session link was revoked'):
          action==='extend'?(ru?'Срок ссылки продлён':'Session link extended'):ru?'Готово':'Done')
      }
      if(['revoke','rotate','archive'].includes(action)) setLink('')
      await load()
    } catch(e) {setError(e.message||String(e))}
    finally {setBusy('')}
  }
  async function play(assetId) {
    setError('')
    try {
      const result=await api(base+'/media','POST',{action:'play',assetId})
      setPlayerUrls(previous=>({...previous,[assetId]:result.url}))
    } catch(e){setError(e.message||String(e))}
  }
  function setMedia(id,patch) {
    setDraft(d=>({...d,media:d.media.map(row=>row.assetId===id?{...row,...patch}:row)}))
  }
  function moveMedia(index,delta) {
    setDraft(d=>{
      const rows=[...d.media],other=index+delta
      if(other<0||other>=rows.length) return d
      ;[rows[index],rows[other]]=[rows[other],rows[index]]
      return {...d,media:rows.map((row,i)=>({...row,sortOrder:i}))}
    })
  }
  function discardMedia(id) {setDraft(d=>({...d,media:d.media.filter(m=>m.assetId!==id).map((row,i)=>({...row,sortOrder:i}))}))}
  const block=Boolean(busy)
  return <div className={styles.adminStudio}>
    <header className={styles.studioHeader}>
      <div><span className={styles.eyebrow}>HOLISTIC HOUSE · {ru?'СЕССИЯ КЛИЕНТА':'CLIENT SESSION'}</span>
        <h1>{ru?'Сопровождение консультации':'Consultation delivery'}</h1>
        <p>{ru?'Отчёт, аудио и видео хранятся отдельно для этой даты. Клиент видит только опубликованное.':
          'Reports, voice notes and videos belong to this consultation only. Clients see published content.'}</p>
      </div>
      <span className={styles.status}>{session.status==='published'?(ru?'Опубликовано':'Published'):
        session.status==='archived'?(ru?'Архив':'Archived'):(ru?'Черновик':'Draft')}</span>
    </header>
    <section className={styles.editorCard+' '+styles.reportReadyCard} id="session-attached-report">
      <h2>{ru?'Готовый отчёт клиента':'Saved client report'}</h2>
      <p>{ru?
        'Анализ, назначения и рекомендации уже находятся в исходном отчёте. Заполнять их повторно для публикации не нужно.':
        'Your original report already contains the analysis and recommendations. No additional questionnaire is required to publish it.'}</p>
      <label className={styles.field}><FileText size={18}/>{ru?'Привязанный отчёт (настоящий PDF)':'Attached report (real PDF)'}
        <select value={draft.reportDocumentId||''}
          onChange={e=>setDraft({...draft,reportDocumentId:e.target.value||null})}>
          <option value="">{ru?'Без документа':'No report attached'}</option>
          {documents.map(doc=><option key={doc.id} value={doc.id}>{doc.dateIssued} · {doc.kind}</option>)}
        </select>
      </label>
      <div className={styles.actions}>
        <a href="#session-publication" className={styles.jumpToPublication}>
          {ru?'Перейти к публикации ↓':'Go to publication ↓'}
        </a>
        <button type="button" className={styles.secondaryButton} disabled={block||!changed}
          onClick={()=>{setBusy('save');setError('');save().catch(e=>setError(e.message)).finally(()=>setBusy(''))}}>
          <Save size={17}/>{ru?'Сохранить черновик':'Save draft'}
        </button>
        {changed&&<span className={styles.unsaved}>{ru?'Есть несохранённые изменения':'Unsaved changes'}</span>}
      </div>
    </section>
    <details className={styles.optionalTextEditor}>
      <summary>{ru?'Личное сопроводительное сообщение (необязательно)':'Personal cover message (optional)'}
        {Boolean(draft.summary?.trim())&&<span className={styles.optionalFilled}>{ru?'Есть текст':'Has text'}</span>}
      </summary>
      <div className={styles.optionalTextBody}>
        <p>{ru?'Не нужно повторять текст готового отчёта. Можно добавить только отдельное приветствие.':
          'Do not repeat the report. Add a separate welcome message only if you want one.'}</p>
      <label className={styles.field}>{ru?'Название сессии':'Session title'}
        <input value={draft.title} maxLength={160} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label className={styles.field}>{ru?'Короткое пояснение и рекомендации':'Short explanation & key next steps'}
        <textarea rows={4} maxLength={6000} value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})}/></label>
      </div>
    </details>
    <details className={styles.optionalTextEditor}>
      <summary>{ru?'Дополнительные заметки и упражнения (необязательно)':'Additional notes and practices (optional)'}
        {hasExtraText&&<span className={styles.optionalFilled}>{ru?'Есть записи':'Has content'}</span>}
      </summary>
      <div className={styles.optionalTextBody}>
        <p>{ru?'Эти поля нужны только для дополнительных указаний сверх уже составленного отчёта. Для обычной публикации оставьте их пустыми.':
          'Use these only for genuinely additional notes beyond your existing report. Leave them blank for normal publication.'}</p>
      <label className={styles.field}>{ru?'Главный фокус встречи':'Main focus of this session'}
        <textarea rows={2} maxLength={300} value={plan.focus||''}
          placeholder={ru?'На что мы обратили внимание…':'What we focused on…'}
          onChange={event=>updatePlan({focus:event.target.value})}/></label>
      <label className={styles.field}>{ru?'Самый первый следующий шаг':'The first next step'}
        <textarea rows={2} maxLength={300} value={plan.nextStep||''}
          placeholder={ru?'Что клиенту полезно сделать сначала…':'What to do first…'}
          onChange={event=>updatePlan({nextStep:event.target.value})}/></label>
      <div className={styles.planEditorSection}>
        <h3>{ru?'Главные выводы':'Key takeaways'} <small>{(plan.takeaways||[]).length}/3</small></h3>
        {(plan.takeaways||[]).map((value,index)=><div className={styles.planEditorRow} key={index}>
          <label className={styles.field}>{ru?'Вывод':'Takeaway'} {index+1}
            <input maxLength={300} value={value} onChange={event=>setTakeaway(index,event.target.value)}/></label>
          <button type="button" className={styles.secondaryButton} aria-label={ru?'Удалить вывод':'Remove takeaway'}
            onClick={()=>updatePlan({takeaways:plan.takeaways.filter((_,i)=>i!==index)})}>×</button>
        </div>)}
        {(plan.takeaways||[]).length<3&&<button type="button" className={styles.secondaryButton}
          onClick={()=>updatePlan({takeaways:[...(plan.takeaways||[]),'']})}>
          + {ru?'Добавить вывод':'Add takeaway'}
        </button>}
      </div>
      <div className={styles.planEditorSection}>
        <h3>{ru?'Домашние практики':'Home practices'} <small>{(plan.practices||[]).length}/3</small></h3>
        {(plan.practices||[]).map((practice,index)=><div className={styles.planEditorPractice} key={index}>
          <label className={styles.field}>{ru?'Название упражнения':'Practice title'}
            <input maxLength={120} value={practice.title}
              onChange={event=>changePractice(index,{title:event.target.value})}/></label>
          <label className={styles.field}>{ru?'Как выполнять':'How to practice'}
            <textarea rows={3} maxLength={1500} value={practice.instructions||''}
              onChange={event=>changePractice(index,{instructions:event.target.value})}/></label>
          <button type="button" className={styles.secondaryButton} onClick={()=>
            updatePlan({practices:plan.practices.filter((_,i)=>i!==index)})}>
            {ru?'Убрать практику':'Remove practice'}
          </button>
        </div>)}
        {(plan.practices||[]).length<3&&<button type="button" className={styles.secondaryButton}
          onClick={()=>updatePlan({practices:[...(plan.practices||[]),{title:ru?'Новая практика':'New practice',instructions:''}]})}>
          + {ru?'Добавить практику':'Add practice'}
        </button>}
      </div>
      <label className={styles.field}>
        {ru?'Дополнительные рекомендации для клиента':'Additional recommendations for the client'}
        <textarea rows={4} maxLength={4000} value={plan.additionalRecommendations||''}
          placeholder={ru?'Например: наблюдения, образ жизни или другие индивидуально согласованные действия…':
            'Any additional practitioner-approved guidance or observations…'}
          onChange={event=>updatePlan({additionalRecommendations:event.target.value})}/>
      </label>
      </div>
    </details>
    <section className={styles.editorCard} aria-label={ru?'Дополнительные материалы к отчёту':'Additional report materials'}>
      <h2>{ru?'Аудио, видео и материалы (необязательно)':'Audio, video and materials (optional)'}</h2>
      <p>{ru?'Можно опубликовать только готовый отчёт либо добавить обучающие ссылки и материалы из библиотеки.':
        'Publish the report as it is, or add educational links and selected library materials.'}</p>
      <div className={styles.planEditorSection}>
        <h3>{ru?'Материалы, медитации и видео YouTube':'Materials, meditations & YouTube videos'} <small>{(plan.resources||[]).length}/8</small></h3>
        <p>{ru?'Добавляйте здесь только проверенные общедоступные HTTPS-материалы. Приватные аудио, видео и PDF загружайте отдельным полем ниже.':
          'Use this for approved public HTTPS resources only. Upload private audio, video and PDF below instead.'}</p>
        {(plan.resources||[]).map((resource,index)=><div className={styles.planEditorPractice} key={index}>
          <label className={styles.field}>{resource.kind==='youtube'?(ru?'Название обучающего видео':'Educational video title'):(ru?'Название материала':'Material title')}
            <input maxLength={140} value={resource.title} onChange={e=>changeResource(index,{title:e.target.value})}/>
          </label>
          <label className={styles.field}>{resource.kind==='youtube'?(ru?'Ссылка на YouTube':'YouTube URL'):(ru?'Публичная HTTPS-ссылка':'Public HTTPS link')}
            <input inputMode="url" type="url" maxLength={1500} value={resource.url}
              placeholder={resource.kind==='youtube'?'https://youtu.be/XXXXXXXXXXX':'https://'}
              onChange={e=>changeResource(index,{url:e.target.value})}/>
          </label>
          {resource.kind==='youtube'&&resource.url.trim()&&!parseSessionYouTubeUrl(resource.url)&&
            <p role="alert" className={styles.youtubeEditorWarning}>
              {ru?'Вставьте ссылку на одно YouTube-видео (youtu.be, watch, shorts).':
                'Enter one YouTube video URL (youtu.be, watch or shorts).'}
            </p>}
          {resource.kind==='youtube'&&parseSessionYouTubeUrl(resource.url)&&
            <SessionYouTubePlayer title={resource.title} url={resource.url}
              description={resource.description} locale={locale}/>}
          {resource.kind==='youtube'&&<label className={styles.field}>{ru?'Где показывать видео':'Video location in the report'}
            <select value={resource.placement||'top'} onChange={e=>changeResource(index,{placement:e.target.value})}>
              <option value="top">{ru?'Над текстом отчёта':'Above the report'}</option>
              <option value="materials">{ru?'Материалы — в конце отчёта':'Materials — at the end'}</option>
            </select>
          </label>}
          {resource.kind==='youtube'&&<p className={styles.youtubeEditorNote}>{ru?
            'Только общие обучающие ролики. Даже Unlisted на YouTube доступен каждому, у кого есть ссылка. Не добавляйте персональные записи клиентов.':
            'General educational videos only. Unlisted is viewable by anyone with the link. Never attach private client recordings.'}</p>}
          <label className={styles.field}>{ru?'Короткое описание':'Short description'}
            <textarea rows={2} maxLength={500} value={resource.description||''}
              onChange={e=>changeResource(index,{description:e.target.value})}/>
          </label>
          <button type="button" className={styles.secondaryButton} onClick={()=>
            updatePlan({resources:plan.resources.filter((_,i)=>i!==index)})}>
            {resource.kind==='youtube'?(ru?'Удалить видео':'Remove video'):(ru?'Удалить материал':'Remove material')}
          </button>
        </div>)}
        {(plan.resources||[]).length<8&&<>
          <button type="button" className={styles.secondaryButton}
            onClick={()=>updatePlan({resources:[...(plan.resources||[]),
              {kind:'youtube',title:ru?'Обучающее видео':'Educational video',description:'',url:''}]})}>
            + {ru?'Добавить видео с YouTube':'Add YouTube video'}
          </button>
          <button type="button" className={styles.secondaryButton}
            onClick={()=>updatePlan({resources:[...(plan.resources||[]),
              {title:ru?'Новый материал':'New material',description:'',url:'https://'}]})}>
            + {ru?'Добавить ссылку':'Add resource link'}
          </button>
        </>}
      </div>
      <SessionMaterialPicker locale={locale}
        selectedIds={plan.materialIds||plan.materials?.map(item=>item.id)||[]}
        disabled={block}
        onChange={ids=>updatePlan({materialIds:ids})}/>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} disabled={block||!changed} onClick={()=>{
          setBusy('save');setError('');save().catch(e=>setError(e.message)).finally(()=>setBusy(''))
        }}><Save size={17}/>{ru?'Сохранить план':'Save plan'}</button>
      </div>
    </section>
    <SessionAudioRecorder clientId={clientId} sessionId={session.id} locale={locale} showYouTubeQuickAdd={false}
      onSaved={()=>refreshAfterMedia().catch(e=>setError(e.message))}/>
    <section className={styles.editorCard}>
      <h2>{ru?'Материалы этой сессии':'Media for this session'}</h2>
      <button type="button" disabled={block} onClick={async()=>{setBusy('cleanup');setError('');try{await api(base+'/media','POST',{action:'cleanup'});setMessage(ru?'Незавершённые загрузки старше суток очищены. Сохранённые записи не затронуты.':'Incomplete uploads older than one day cleaned up. Saved recordings are unchanged.')}catch(e){setError(e.message)}finally{setBusy('')}}}>{ru?'Очистить старые незавершённые загрузки':'Clean up old incomplete uploads'}</button>
      {!draft.media.length&&<p>{ru?'Запишите аудио или добавьте видео, PDF или фотографии.':
        'Record audio or attach video, PDF or photos.'}</p>}
      <p>{ru?'Для фото измените подпись и порядок. Расшифровка аудио и видео вводится вручную, без стороннего распознавания.':'For photos, edit captions and order. Audio/video transcripts are entered manually; nothing is sent to external transcription.'}</p>
      {draft.media.map((row,index)=>{
        const asset=activeAssets.get(row.assetId)
        return <div key={row.assetId} className={styles.mediaEditor}>
          <div className={styles.mediaToolbar}>
            <strong>{mediaTitle(asset,locale)}</strong>
            <span className={styles.scopeBadge}>{row.scope==='practitioner'?(ru?'Только мне':'Owner only'):row.role==='hidden'?(ru?'Не показывать клиенту':'Hidden from client'):(ru?'Для клиента':'For client')}</span>
            <button aria-label={ru?'Поднять выше':'Move up'} onClick={()=>moveMedia(index,-1)} disabled={index===0||block}><ChevronUp size={18}/></button>
            <button aria-label={ru?'Опустить ниже':'Move down'} onClick={()=>moveMedia(index,1)} disabled={index===draft.media.length-1||block}><ChevronDown size={18}/></button>
            <button aria-label={ru?'Убрать из сессии':'Detach from draft'} onClick={()=>discardMedia(row.assetId)} disabled={block}><Trash2 size={18}/></button>
          </div>
          <label className={styles.field}>{asset?.kind==='image'?(ru?'Подпись к фотографии':'Photo caption'):(ru?'Название записи':'Recording title')}
            <input value={row.title} maxLength={160} onChange={e=>setMedia(row.assetId,{title:e.target.value})}/></label>
          {row.scope==='client'&&!['pdf','image'].includes(asset?.kind)&&<label className={styles.field}>
            {ru?'Где показывать запись клиенту':'Where this recording appears'}
            <select value={row.role||'personal'} onChange={e=>setMedia(row.assetId,{role:e.target.value})}>
              <option value="personal">{ru?'Личное обращение вверху':'Personal message (top)'}</option>
              {asset?.kind==='video'&&<option value="instruction">{ru?'Видео: как принимать препараты':'Video: how to follow the recommendations'}</option>}
              <option value="meditation">{ru?'Дополнительная медитация':'Additional meditation'}</option>
              <option value="additional">{asset?.kind==='video'?(ru?'Материалы — в конце отчёта':'Materials — report footer'):(ru?'Другие материалы':'Other materials')}</option>
              {asset?.kind==='video'&&<option value="hidden">{ru?'Не показывать клиенту':'Do not show to client'}</option>}
            </select>
          </label>}
          {asset?.kind!=='image'&&<label className={styles.field}>{ru?'Текст / расшифровка (необязательно)':'Transcript (optional)'}
            <textarea rows={2} maxLength={12000} value={row.transcript||''} onChange={e=>setMedia(row.assetId,{transcript:e.target.value})}/></label>}
          {asset?.kind==='image' ? <div className={styles.adminPhotoPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={base+'/media/'+row.assetId} alt={row.title||(ru?'Фотография':'Photo')} loading="lazy"/>
          </div> : playerUrls[row.assetId] ? asset?.kind==='video'?
            <video controls playsInline preload="metadata" className={styles.video} src={playerUrls[row.assetId]}/>:
            asset?.kind==='pdf'?<a href={playerUrls[row.assetId]} target="_blank" rel="noopener noreferrer" className={styles.secondaryButton}>
              {ru?'Открыть PDF':'Open PDF'}
            </a>:
            <audio controls preload="metadata" className={styles.audio} src={playerUrls[row.assetId]}/>:
            <button className={styles.secondaryButton} onClick={()=>play(row.assetId)}><PlayCircle size={18}/>{ru?'Проверить материал':'Preview material'}</button>}
        </div>
      })}
    </section>
    <section className={styles.editorCard} id="session-publication">
      <h2>{ru?'Публикация для клиента':'Client publication'}</h2>
      {draft.reportDocumentId&&<p><a className={styles.secondaryButton}
        href={'/admin/documents/'+encodeURIComponent(draft.reportDocumentId)+'/session-preview?locale='+locale}
        target="_blank" rel="noopener noreferrer">
        {ru?'Открыть полную страницу клиента с вложениями ↗':'Open full client page with attachments ↗'}
      </a><small>{ru?'Показываются сохранённые изменения. Перед просмотром сохраните черновик.':'Shows saved changes. Save the draft first to preview your latest edits.'}</small></p>}
      <button type="button" className={styles.secondaryButton} aria-expanded={showClientPreview}
        onClick={()=>setShowClientPreview(value=>!value)}>
        {showClientPreview?(ru?'Скрыть предпросмотр':'Hide client preview'):
          (ru?'Краткий предпросмотр':'Quick draft summary')}
      </button>
      {showClientPreview&&<div className={styles.ownerPreview}>
        <span className={styles.eyebrow}>{ru?'ПРЕДПРОСМОТР · НЕ ОПУБЛИКОВАНО':'PREVIEW · NOT PUBLISHED'}</span>
        <h3>{draft.title}</h3>
        {draft.summary&&<p className={styles.sessionSummary}>{draft.summary}</p>}
        {plan.nextStep&&<p><strong>{ru?'Следующий шаг':'Next step'}:</strong> {plan.nextStep}</p>}
        {plan.focus&&<p><strong>{ru?'Фокус':'Focus'}:</strong> {plan.focus}</p>}
        {(plan.takeaways||[]).some(Boolean)&&<>
          <h4>{ru?'Выводы':'Key takeaways'}</h4>
          <ol>{plan.takeaways.filter(Boolean).map((point,index)=><li key={index}>{point}</li>)}</ol>
        </>}
        {draft.media.some(item=>item.scope==='client'&&item.role!=='hidden')&&<>
          <h4>{ru?'Личные медиа':'Client media'}</h4>
          {draft.media.filter(item=>item.scope==='client'&&item.role!=='hidden').map(item=>
            <p key={item.assetId}>{activeAssets.get(item.assetId)?.kind==='image'?'▧ ':'♫ '}{item.title||mediaTitle(activeAssets.get(item.assetId),locale)}
              {item.transcript&&<small> · {ru?'Есть текст записи':'Transcript available'}</small>}
            </p>)}
        </>}
        {draft.reportDocumentId&&<p>▣ {ru?'Привязан отчёт в формате PDF':'A PDF report is attached'}</p>}
        {plan.additionalRecommendations&&<p><strong>{ru?'Дополнительные рекомендации':'Additional recommendations'}:</strong> {plan.additionalRecommendations}</p>}
        {(plan.resources||[]).length>0&&<>
          <h4>{ru?'Дополнительные ссылки':'Additional links'}</h4>
          {plan.resources.map((r,i)=><p key={i}>{r.title} · {r.url}</p>)}
        </>}
        {(plan.practices||[]).length>0&&<>
          <h4>{ru?'Практики':'Practices'}</h4>
          {plan.practices.map((practice,index)=><div key={index}>
            <strong>{practice.title}</strong>
            {practice.instructions&&<p>{practice.instructions}</p>}
          </div>)}
        </>}
        <p className={styles.previewDisclaimer}>{ru?
          'В предпросмотре не показываются личные заметки специалиста. Медиа доступны для проверки через отдельные кнопки выше.':
          'Owner-only notes are omitted. Preview media using the separate secure controls above.'}
        </p>
      </div>}

      <p>{ru?'Аудио сохраняется автоматически как черновик. Только кнопка «Опубликовать» обновляет страницу клиента. Личные заметки туда не попадают.':
        'Recordings save as drafts automatically. Only Publish updates the client page. Private notes are never included.'}</p>
      <div className={styles.actions}>
        <button className={styles.primaryButton} disabled={block||session.status==='archived'}
          onClick={()=>act('publish')}><Send size={18}/>{ru?'Опубликовать клиенту':'Publish to client'}</button>
        <button className={styles.secondaryButton} disabled={block||session.status!=='published'}
          onClick={()=>act('copy')}><Copy size={18}/>{ru?'Скопировать ссылку сессии':'Copy session-only link'}</button>
      </div>
      {link&&<div className={styles.sessionShareLinkReady}>
        <label className={styles.field}>{ru?'Личная ссылка (только на эту сессию)':'Private link (this session only)'}
          <input readOnly value={link} onFocus={e=>e.target.select()} aria-label="Session share link"/></label>
        <button type="button" className={styles.secondaryButton} onClick={async()=>{
          if(await tryCopyOwnerLink(link,navigator.clipboard))
            setMessage(ru?'Ссылка скопирована':'Link copied')
          else setMessage(ru?'Выделите адрес в поле и скопируйте вручную.':'Select and copy the URL manually.')
        }}>{ru?'Копировать ещё раз':'Copy again'}</button>
      </div>}
      {session.status==='published'&&<details className={styles.accessDetails}>
        <summary><LockKeyhole size={17}/>{ru?'Управление доступом':'Access controls'}</summary>
        <p>{ru?'Ссылка не открывает общий кабинет или другие консультации. Владелец ссылки сможет видеть эту сессию до её истечения.':
          'The link never unlocks the full cabinet or other consultations. Anyone holding it can view this one session until expiration.'}</p>
        <div className={styles.actions}>
          <button disabled={block} onClick={()=>act('extend',30)}>{ru?'Продлить на 30 дней':'Extend 30 days'}</button>
          <button disabled={block} onClick={()=>window.confirm(ru?'Заменить старую ссылку?':'Rotate link and invalidate old sessions?')&&act('rotate',30)}><RotateCw size={16}/>{ru?'Сменить ссылку':'Rotate link'}</button>
          <button disabled={block} onClick={()=>window.confirm(ru?'Отозвать доступ по ссылке?':'Revoke this session link?')&&act('revoke')}>{ru?'Отозвать ссылку':'Revoke link'}</button>
          <button disabled={block} onClick={()=>window.confirm(ru?'Архивировать сессию?':'Archive this session?')&&act('archive')}>{ru?'Архивировать':'Archive'}</button>
        </div>
      </details>}
    </section>
    {message&&<p role="status" className={styles.success}>{message}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </div>
}

