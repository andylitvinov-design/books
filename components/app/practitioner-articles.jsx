'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {BookOpen,FolderPlus,Folder,Search,PenLine,Trash2,Eye,ChevronDown} from 'lucide-react'
import styles from './practitioner-articles.module.css'
import {articleBlocks,inlineArticleSegments} from '@/lib/practitioners/article-format'

const initial=(locale='en')=>({locale:['ru','en','es'].includes(locale)?locale:'en',title:'',excerpt:'',body:'',coverPath:'',sourceUrls:[],linkedServiceIds:[],tags:[]})
const clean=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().trim()
function shortStatus(status,ru){
 const map={draft:ru?'Черновик':'Draft',submitted:ru?'На проверке':'In review',published:ru?'Опубликовано':'Published',
  changes_requested:ru?'Нужны правки':'Changes requested',archived:ru?'Архив':'Archived',suspended:ru?'Остановлено':'Suspended'}
 return map[status]||status
}
function InlineText({value}){
 return inlineArticleSegments(value).map((part,i)=>
   part.strong?<strong key={i}>{part.text}</strong>:<span key={i}>{part.text}</span>)
}
function ArticlePreview({body}){
 return <div className={styles.preview}>
  {articleBlocks(body).map((block,i)=>
   block.type==='h2'?<h5 key={i}><InlineText value={block.text}/></h5>:
   block.type==='h3'?<h6 key={i}><InlineText value={block.text}/></h6>:
   block.type==='ul'?<ul key={i}>{block.items.map((line,j)=><li key={j}><InlineText value={line}/></li>)}</ul>:
   block.type==='ol'?<ol key={i}>{block.items.map((line,j)=><li key={j}><InlineText value={line}/></li>)}</ol>:
   <p key={i}><InlineText value={block.text}/></p>
  )}
 </div>
}
export default function PractitionerArticles({locale,services=[]}){
 const ru=locale==='ru'
 const t=ru?{
  heading:'Мои статьи',intro:'Личная библиотека: черновики остаются закрытыми до одобрения публикации.',
  newArticle:'Новая статья',newFolder:'Новая папка',folder:'Папки',all:'Все статьи',
  noFolder:'Без папки',rename:'Переименовать',delete:'Удалить папку',
  folderName:'Название папки',add:'Создать',cancel:'Отмена',
  search:'Поиск по названию и тексту статей…',found:'Найдено',none:'В этой папке пока нет статей.',
  edit:'Редактировать',more:'Показать ещё',language:'Язык',title:'Заголовок',excerpt:'Краткое описание',
  body:'Содержание статьи',place:'Сохранить в папке',preview:'Предпросмотр',hidePreview:'Скрыть просмотр',
  sources:'Источники, обложка и связанные услуги',sourceLinks:'Ссылки на источники (по одной на строку)',
  cover:'Путь к изображению',related:'Связанные услуги',save:'Сохранить черновик',
  submit:'Отправить на проверку',archive:'В архив',opened:'Открыть опубликованную статью',
  saved:'Статья сохранена.',folderSaved:'Папка создана.',folderRenamed:'Папка переименована.',folderRemoved:'Папка удалена, статьи сохранены.',
  confirmDelete:'Удалить папку? Статьи останутся в разделе «Без папки».',
  confirmArchive:'Архивировать статью?',saveFirst:'Сначала сохраните правки — затем отправляйте на проверку.',
  editTitle:'Редактор статьи',draftTitle:'Новая статья',close:'Закрыть редактор',emptyInput:'Введите название папки.',
  tags:'Ключевые слова (по одному на строку)',discard:'Есть несохранённые изменения. Закрыть без сохранения?',filterStatus:'Статус',allStatuses:'Любой статус',
  duplicateFolder:'Такая папка уже существует.',revisionError:'Статья изменена в другой вкладке. Скопируйте несохранённые правки перед обновлением страницы.',
  saving:'Сохраняем…',savedButRefreshFailed:'Черновик сохранён на сервере. Список не обновился, повторять сохранение не нужно.',
  statusUpdated:'Статус обновлён.',saveFailed:'Не удалось сохранить. Текст остаётся в редакторе — попробуйте снова.',
  signInAgain:'Сессия истекла. Войдите в аккаунт снова, предварительно скопировав несохранённый текст.',
  serverUnavailable:'Сервер временно недоступен. Текст остаётся в редакторе — повторите попытку.',
  invalidImage:'Проверьте обложку: нужен путь /images/… или /media/remedies/…',
  invalidUrl:'Источники должны содержать корректные ссылки с https://.',
  invalidText:'Проверьте длину заголовка, описания, текста или ключевых слов.',
  invalidFolder:'Выбранная папка недоступна. Выберите «Без папки» и повторите.',
  tooLarge:'Статья слишком большая для одного запроса. Сократите текст или ссылки.',
  slowDown:'Слишком много запросов. Подождите минуту и повторите.',
 }:{
  heading:'My articles',intro:'Your personal article library. Drafts stay private until publication is approved.',
  newArticle:'New article',newFolder:'New folder',folder:'Folders',all:'All articles',
  noFolder:'Unfiled',rename:'Rename',delete:'Delete folder',
  folderName:'Folder name',add:'Create',cancel:'Cancel',
  search:'Search titles and article text…',found:'Found',none:'No articles in this folder yet.',
  edit:'Edit',more:'Show more',language:'Language',title:'Title',excerpt:'Short description',
  body:'Article text',place:'Save in folder',preview:'Preview',hidePreview:'Hide preview',
  sources:'Sources, cover and related services',sourceLinks:'Source URLs (one per line)',
  cover:'Cover image path',related:'Related services',save:'Save draft',
  submit:'Submit for review',archive:'Archive',opened:'Open published article',
  saved:'Article saved.',folderSaved:'Folder created.',folderRenamed:'Folder renamed.',folderRemoved:'Folder deleted; articles were kept.',
  confirmDelete:'Delete this folder? Articles will remain in Unfiled.',
  confirmArchive:'Archive this article?',saveFirst:'Save your changes before submitting for review.',
  editTitle:'Edit article',draftTitle:'New article',close:'Close editor',emptyInput:'Enter a folder name.',
  tags:'Search keywords (one per line)',discard:'You have unsaved edits. Close without saving?',filterStatus:'Status',allStatuses:'Any status',
  duplicateFolder:'This folder already exists.',revisionError:'This article changed in another tab. Copy unsaved edits before refreshing.',
  saving:'Saving…',savedButRefreshFailed:'Draft saved on the server. The list could not refresh; no need to save again.',
  statusUpdated:'Status updated.',saveFailed:'Could not save. Your text remains in the editor; please retry.',
  signInAgain:'Session expired. Sign in again after copying unsaved text.',
  serverUnavailable:'The server is temporarily unavailable. Your text remains in the editor; retry.',
  invalidImage:'Check the cover image: use /images/… or /media/remedies/…',
  invalidUrl:'Source URLs must be valid https:// links.',
  invalidText:'Check the title, summary, article length and keywords.',
  invalidFolder:'The selected folder is unavailable. Choose Unfiled and retry.',
  tooLarge:'This article is too large for one request. Shorten the text or links.',
  slowDown:'Too many requests. Wait one minute and retry.',
 }
 const [items,setItems]=useState([]),[folders,setFolders]=useState([]),[selectedFolder,setSelectedFolder]=useState('all')
 const [query,setQuery]=useState(''),[limit,setLimit]=useState(24),[statusFilter,setStatusFilter]=useState('all')
 const [editing,setEditing]=useState(null),[editorOpen,setEditorOpen]=useState(false)
 const [draft,setDraft]=useState(()=>initial(locale)),[folderId,setFolderId]=useState('')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [addingFolder,setAddingFolder]=useState(false),[folderName,setFolderName]=useState('')
 const [preview,setPreview]=useState(false),bodyRef=useRef(null),editorRef=useRef(null)
 const [tagInput,setTagInput]=useState('')
 const operationRef=useRef(false)
 const tags=[...new Set(tagInput.split(/\r?\n/).map(value=>value.trim()).filter(Boolean))].slice(0,12)
 const preparedDraft={...draft,tags}
 const isUnchanged=!!editing&&JSON.stringify({...initial(editing.draft?.locale),...editing.draft})===JSON.stringify(preparedDraft)&&
  (editing.folderId||'')===folderId
 const hasUnsaved=editorOpen&&(editing?!isUnchanged:Boolean(draft.title.trim()||draft.body.trim()||draft.excerpt.trim()||tags.length||draft.coverPath||draft.sourceUrls?.length))
 function closeEditor(){
  if(busy||operationRef.current)return
  if(hasUnsaved&&!window.confirm(t.discard))return
  setEditorOpen(false)
 }
 async function reload(){
  const response=await fetch('/api/app/practice/articles',{credentials:'same-origin',cache:'no-store'})
  const json=await response.json().catch(()=>({}))
  if(!response.ok)throw Error(json.error||'ARTICLE_LOAD_FAILED')
  if(!Array.isArray(json.items)||!Array.isArray(json.folders))throw Error('ARTICLE_LOAD_FAILED')
  setItems(json.items);setFolders(json.folders)
 }
 useEffect(()=>{reload().catch(e=>setError(e.message))},[])
 useEffect(()=>{if(editorOpen)editorRef.current?.scrollIntoView({behavior:'smooth',block:'start'})},[editorOpen,editing?.id])
 useEffect(()=>{
  if(!hasUnsaved)return undefined
  const guard=event=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',guard)
  return ()=>window.removeEventListener('beforeunload',guard)
 },[hasUnsaved])
 function choose(item){
  if(busy||operationRef.current||(hasUnsaved&&!window.confirm(t.discard)))return
  setEditing(item||null)
  setDraft(item?{...initial(item.draft?.locale||locale),...item.draft}:initial(locale))
  setTagInput((item?.draft?.tags||[]).join('\n'))
  setFolderId(item?.folderId||(folders.some(f=>f.id===selectedFolder)?selectedFolder:''))
  setEditorOpen(true);setPreview(false);setError('');setNotice('')
 }
 async function request(path,body){
  const response=await fetch('/api/app/practice/articles'+path,{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  })
  const json=await response.json().catch(()=>({}))
  if(!response.ok)throw Error(json.error||'ARTICLE_SAVE_FAILED')
  return json
 }
 async function perform(fn){
  if(operationRef.current)return
  operationRef.current=true
  setBusy(true);setError('');setNotice('')
  try{await fn()}catch(e){
   const code=e.code||e.message||''
   const message=code==='FOLDER_EXISTS'?t.duplicateFolder:
    code==='REVISION_CONFLICT'?t.revisionError:
    ['SIGN_IN_REQUIRED','ACCOUNT_REQUIRED','ACCOUNT_CHANGED'].includes(code)?t.signInAgain:
    ['SERVICE_UNAVAILABLE','DATABASE_CONFIG_CHANGED'].includes(code)?t.serverUnavailable:
    code==='INVALID_IMAGE'?t.invalidImage:code==='INVALID_URL'?t.invalidUrl:
    ['INVALID_TEXT','INVALID_TAG'].includes(code)?t.invalidText:
    code==='FOLDER_NOT_FOUND'?t.invalidFolder:
    code==='PAYLOAD_TOO_LARGE'?t.tooLarge:
    code==='RATE_LIMITED'?t.slowDown:
    t.saveFailed+(code&&/^[A-Z0-9_]{3,45}$/.test(code)?' ('+code+')':'')
   setError(message)
  }finally{operationRef.current=false;setBusy(false)}
 }
 async function save(){
  await perform(async()=>{
   const saved=await request(editing?'/'+editing.id:'',{draft:preparedDraft,folderId:folderId||null,expectedRevision:editing?.revision})
   // A successful write must not be mistaken for failure when only the follow-up GET fails.
   if(!saved?.id||!Number.isSafeInteger(saved.revision))throw Error('ARTICLE_SAVE_FAILED')
   setEditing(saved);setDraft({...initial(saved.draft?.locale),...saved.draft})
   setFolderId(saved.folderId||'');setTagInput((saved.draft?.tags||[]).join('\n'))
   setItems(current=>[saved,...current.filter(item=>item.id!==saved.id)])
   setNotice(t.saved)
   try{await reload()}catch{setNotice(t.savedButRefreshFailed)}
  })
 }
 async function command(action){
  if(!editing)return
  await perform(async()=>{
   const result=await request('/'+editing.id,{action,expectedRevision:editing.revision})
   if(!result?.id||!Number.isSafeInteger(result.revision))throw Error('ARTICLE_SAVE_FAILED')
   setItems(current=>[result,...current.filter(item=>item.id!==result.id)])
   if(action==='archive'){setEditorOpen(false);setEditing(null)}
   else {setEditing(result);setDraft({...initial(result.draft?.locale),...result.draft});setTagInput((result.draft?.tags||[]).join('\n'))}
   setNotice(t.statusUpdated)
   try{await reload()}catch{setNotice(t.savedButRefreshFailed)}
  })
 }
 async function createFolder(e){
  e.preventDefault();if(!folderName.trim()){setError(t.emptyInput);return}
  await perform(async()=>{
   const folder=await request('/folders',{name:folderName})
   await reload();setSelectedFolder(folder.id);if(editorOpen)setFolderId(folder.id);setFolderName('');setAddingFolder(false);setLimit(24);setNotice(t.folderSaved)
  })
 }
 async function renameFolder(){
  const folder=folders.find(x=>x.id===selectedFolder)
  if(!folder)return
  const name=window.prompt(t.folderName,folder.name)
  if(name===null||!name.trim()||name.trim()===folder.name)return
  await perform(async()=>{
   await request('/folders/'+folder.id,{action:'rename',name:name.trim(),expectedRevision:folder.revision})
   await reload();setNotice(t.folderRenamed)
  })
 }
 async function deleteFolder(){
  const folder=folders.find(x=>x.id===selectedFolder)
  if(!folder||!window.confirm(t.confirmDelete))return
  await perform(async()=>{
   await request('/folders/'+folder.id,{action:'delete'})
   await reload();setSelectedFolder('all');setFolderId('');setNotice(t.folderRemoved)
  })
 }
 function insertFormat(prefix,suffix=''){
  const el=bodyRef.current
  const start=el?.selectionStart??draft.body.length,end=el?.selectionEnd??draft.body.length
  const selected=draft.body.slice(start,end)
  const next=draft.body.slice(0,start)+prefix+selected+suffix+draft.body.slice(end)
  setDraft(current=>({...current,body:next.slice(0,16000)}))
 }
 const filtered=useMemo(()=>{
  const tokens=clean(query).split(/\s+/).filter(Boolean)
  return items.filter(item=>{
   if(selectedFolder==='unfiled'&&item.folderId)return false
   if(selectedFolder!=='all'&&selectedFolder!=='unfiled'&&item.folderId!==selectedFolder)return false
   if(statusFilter!=='all'&&item.status!==statusFilter)return false
   if(!tokens.length)return true
   const haystack=clean([item.draft?.title,item.draft?.excerpt,item.draft?.body,
    ...(item.draft?.tags||[]),item.published?.title,item.slug].join(' '))
   return tokens.every(token=>haystack.includes(token))
  })
 },[items,query,selectedFolder,statusFilter])
 const selected=folders.find(x=>x.id===selectedFolder)
 const complete=draft.title.trim()&&draft.excerpt.trim().length>=30&&draft.body.trim().length>=200
 return <div className={styles.shell}>
  <div className={styles.top}>
   <div><h3>{t.heading} ({items.filter(x=>x.status!=='archived').length})</h3><p>{t.intro}</p></div>
   <button type="button" className={styles.primary} disabled={busy} onClick={()=>choose(null)}>+ {t.newArticle}</button>
  </div>
  {!editorOpen&&error&&<p role="alert" className={styles.error}>{error}</p>}
  {!editorOpen&&notice&&<p role="status" className={styles.status}>{notice}</p>}
  <div className={styles.folders}>
   <div className={styles.folderTitle}><span>{t.folder}</span><button type="button" className={styles.secondary} disabled={busy} onClick={()=>setAddingFolder(x=>!x)}><FolderPlus size={14} aria-hidden="true"/> {t.newFolder}</button></div>
   <div className={styles.folderList} role="group" aria-label={t.folder}>
    <button type="button" className={styles.folder} aria-pressed={selectedFolder==='all'} onClick={()=>{setSelectedFolder('all');setLimit(24)}}><BookOpen size={15} aria-hidden="true"/>{t.all}<small>{items.length}</small></button>
    {folders.map(f=><button type="button" className={styles.folder} key={f.id} aria-pressed={selectedFolder===f.id} onClick={()=>{setSelectedFolder(f.id);setLimit(24)}}><Folder size={15} aria-hidden="true"/>{f.name}<small>{items.filter(x=>x.folderId===f.id).length}</small></button>)}
    <button type="button" className={styles.folder} aria-pressed={selectedFolder==='unfiled'} onClick={()=>{setSelectedFolder('unfiled');setLimit(24)}}>{t.noFolder}<small>{items.filter(x=>!x.folderId).length}</small></button>
   </div>
   {(addingFolder||selected)&&<div className={styles.manage}>
    {addingFolder&&<form onSubmit={createFolder}><input value={folderName} onChange={e=>setFolderName(e.target.value)} maxLength={80} placeholder={t.folderName} aria-label={t.folderName} autoFocus/><button disabled={busy} className={styles.primary} type="submit">{t.add}</button><button type="button" className={styles.secondary} onClick={()=>setAddingFolder(false)}>{t.cancel}</button></form>}
    {selected&&<><button type="button" className={styles.secondary} disabled={busy} onClick={renameFolder}>{t.rename}</button><button type="button" className={styles.danger} disabled={busy} onClick={deleteFolder}><Trash2 size={14} aria-hidden="true"/> {t.delete}</button></>}
   </div>}
  </div>
  <div className={styles.findBar}>
   <label className={styles.search}><Search size={18} aria-hidden="true"/><input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={e=>{setQuery(e.target.value);setLimit(24)}}/></label>
   <select className={styles.statusSelect} aria-label={t.filterStatus} value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setLimit(24)}}>
    <option value="all">{t.allStatuses}</option>
    {['draft','submitted','published','changes_requested','archived'].map(value=><option key={value} value={value}>{shortStatus(value,ru)}</option>)}
   </select>
  </div>
  <div className={styles.results}><span>{t.found}: {filtered.length}</span><span>{selected?.name||(selectedFolder==='unfiled'?t.noFolder:t.all)}</span></div>
  {filtered.length?<div className={styles.list}>{filtered.slice(0,limit).map(item=><article key={item.id} className={styles.card}>
    <div className={styles.cardHeader}>
     {item.draft?.coverPath&&<img className={styles.thumb} src={item.draft.coverPath} alt="" loading="lazy"/>}
     <div className={styles.cardText}><div className={styles.tagline}><span className={styles.tag}>{shortStatus(item.status,ru)}</span><span className={styles.tag}>{(item.draft?.locale||'en').toUpperCase()}</span></div>
      <h4>{item.draft?.title||item.published?.title||item.slug}</h4>
      <p>{item.draft?.excerpt||item.draft?.body||''}</p></div>
    </div>
    <div className={styles.cardActions}>
     <button type="button" className={styles.secondary} onClick={()=>choose(item)} disabled={busy||item.status==='archived'||item.status==='suspended'}><PenLine size={14} aria-hidden="true"/> {t.edit}</button>
     {item.published?.title&&<Link href={'/'+item.published.locale+'/articles/'+item.slug}>{t.opened} →</Link>}
    </div>
   </article>)}</div>:<p className={styles.empty}>{t.none}</p>}
  {filtered.length>limit&&<div className={styles.actions}><button className={styles.secondary} type="button" onClick={()=>setLimit(x=>x+24)}>{t.more} <ChevronDown size={15} aria-hidden="true"/></button></div>}
  {editorOpen&&<form ref={editorRef} className={styles.editor} aria-busy={busy} onSubmit={e=>{e.preventDefault();void save()}}>
   <div className={styles.editorHeader}><h4>{editing?t.editTitle:t.draftTitle}</h4><button type="button" className={styles.secondary} onClick={closeEditor}>{t.close} ×</button></div>
   {editing?.reviewNote&&<p className={styles.error}>{editing.reviewNote}</p>}
   {editing?.status&&<p className={styles.caption}>{shortStatus(editing.status,ru)}</p>}
   <div className={styles.row}>
    <label>{t.language}<select value={draft.locale} onChange={e=>setDraft({...draft,locale:e.target.value})}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
    <label>{t.place}<select value={folderId} onChange={e=>setFolderId(e.target.value)}><option value="">{t.noFolder}</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
   </div>
   <label>{t.title}<input required maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
   <label>{t.excerpt}<textarea value={draft.excerpt} maxLength={500} rows={2} onChange={e=>setDraft({...draft,excerpt:e.target.value})}/></label>
   <label>{t.tags}<textarea rows={2} value={tagInput} maxLength={950} onChange={e=>setTagInput(e.target.value)} placeholder={ru?'Arsenicum\nмышьяк\nтревога':'Arsenicum\narsenic\nanxiety'}/></label>
   <div className={styles.bodyField}><span>{t.body}</span><div className={styles.tools}>
     <button type="button" className={styles.tool} onClick={()=>insertFormat('\n\n## ')}>H2</button>
     <button type="button" className={styles.tool} onClick={()=>insertFormat('\n- ')}>•</button>
     <button type="button" className={styles.tool} onClick={()=>insertFormat('**','**')}><b>B</b></button>
     <button type="button" className={styles.tool} aria-pressed={preview} onClick={()=>setPreview(x=>!x)}><Eye size={14} aria-hidden="true"/> {preview?t.hidePreview:t.preview}</button>
    </div>
    <textarea ref={bodyRef} maxLength={16000} rows={12} aria-label={t.body} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></div>
   {preview&&<ArticlePreview body={draft.body}/>}
   <details className={styles.source}><summary>{t.sources}</summary>
    <label>{t.sourceLinks}<textarea rows={3} value={(draft.sourceUrls||[]).join('\n')} onChange={e=>setDraft({...draft,sourceUrls:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,8)})}/></label>
    <label>{t.related}<select multiple size={Math.min(4,Math.max(2,services.length))} value={draft.linkedServiceIds||[]} onChange={e=>setDraft({...draft,linkedServiceIds:[...e.target.selectedOptions].map(o=>o.value).slice(0,2)})}>
     {services.filter(x=>['published','submitted','changes_requested'].includes(x.status)&&x.copy?.title).map(s=><option value={s.id} key={s.id}>{s.copy.title}</option>)}
    </select></label>
    <label>{t.cover}<input value={draft.coverPath||''} maxLength={300} placeholder="/images/… or /media/remedies/…" onChange={e=>setDraft({...draft,coverPath:e.target.value})}/></label>
   </details>
   <div className={styles.actions}>
    <button type="submit" disabled={busy} className={styles.primary}>{busy?t.saving:t.save}</button>
    {editing&&<button type="button" className={styles.secondary} disabled={busy||!complete||!isUnchanged} onClick={()=>command('submit')}>{t.submit}</button>}
    {editing&&<button type="button" className={styles.danger} disabled={busy} onClick={()=>window.confirm(t.confirmArchive)&&command('archive')}>{t.archive}</button>}
    {editing?.published?.title&&<Link href={'/'+editing.published.locale+'/articles/'+editing.slug}>{t.opened} →</Link>}
   </div>
   <div className={styles.saveFeedback} aria-live="polite">
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status" className={styles.status}>{notice}</p>}
   </div>
   {!isUnchanged&&editing&&<p className={styles.caption}>{t.saveFirst}</p>}
  </form>}
 </div>
}
