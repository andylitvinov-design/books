'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'

const initial=()=>({locale:'en',title:'',excerpt:'',body:'',coverPath:'',sourceUrls:[],linkedServiceIds:[]})
export default function PractitionerArticles({locale,services=[]}){
 const ru=locale==='ru'
 const [items,setItems]=useState([]),[editing,setEditing]=useState(null),[draft,setDraft]=useState(initial()),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 async function reload(){
  const response=await fetch('/api/app/practice/articles',{credentials:'same-origin',cache:'no-store'})
  const json=await response.json()
  if(!response.ok)throw Error(json.error||'ARTICLE_LOAD_FAILED')
  setItems(json.items||[])
 }
 useEffect(()=>{reload().catch(e=>setError(e.message))},[])
 function choose(item){setEditing(item);setDraft(item?{...initial(),...item.draft}:initial());setError('');setNotice('')}
 async function request(path,body){
  const response=await fetch('/api/app/practice/articles'+path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const json=await response.json().catch(()=>({}))
  if(!response.ok)throw Error(json.error||'ARTICLE_SAVE_FAILED')
  return json
 }
 async function save(){
  setBusy(true);setError('');setNotice('')
  try{
   const saved=await request(editing?'/'+editing.id:'',{draft,expectedRevision:editing?.revision})
   await reload()
   choose(saved)
   setNotice(ru?'Черновик сохранён.':'Draft saved.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function command(action){
  if(!editing)return
  setBusy(true);setError('');setNotice('')
  try{
   const result=await request('/'+editing.id,{action,expectedRevision:editing.revision})
   await reload()
   choose(result)
   setNotice(ru?'Статус обновлён.':'Status updated.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <div className="hh-practice-services-editor">
  <div className="hh-practice-service-toolbar"><div><h3>{ru?'Мои статьи':'My articles'} ({items.length})</h3><p>{ru?'Полезные материалы от автора — с проверкой перед публикацией.':'Write useful educational content, reviewed before publication.'}</p></div>
   <button type="button" className="hh-practice-new-service" onClick={()=>choose(null)}>+ {ru?'Новая статья':'New article'}</button>
  </div>
  {error&&<p role="alert" className="hh-notice">{error}</p>}{notice&&<p role="status" className="hh-notice">{notice}</p>}
  <div className="hh-practice-service-toolbar">
   <label>{ru?'Сохранённые статьи':'Saved articles'} <select value={editing?.id||''} onChange={e=>choose(items.find(x=>x.id===e.target.value)||null)}>
    <option value="">{ru?'Новая статья':'New article'}</option>
    {items.map(item=><option key={item.id} value={item.id}>{item.draft?.title||item.published?.title||item.slug} · {item.status}</option>)}
   </select></label>
   {editing?.published?.title&&<Link href={'/'+editing.published.locale+'/articles/'+editing.slug}>{ru?'Открыть опубликованную':'View published'} →</Link>}
  </div>
  <form className="hh-form hh-panel" onSubmit={e=>{e.preventDefault();void save()}}>
   {editing?.reviewNote&&<p className="hh-notice">{editing.reviewNote}</p>}
   {editing?.status&&<p className="hh-fine">{ru?'Статус':'Status'}: {editing.status}</p>}
   <label>{ru?'Язык статьи':'Article language'}<select value={draft.locale} onChange={e=>setDraft({...draft,locale:e.target.value})}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
   <label>{ru?'Название':'Title'}<input required maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
   <label>{ru?'Краткое описание (30–500 символов для публикации)':'Excerpt (30–500 characters to publish)'}<textarea value={draft.excerpt} maxLength={500} rows={3} onChange={e=>setDraft({...draft,excerpt:e.target.value})}/></label>
   <label>{ru?'Текст статьи (от 200 символов, без HTML)':'Article text (200+ characters, no HTML)'}<textarea rows={12} maxLength={16000} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label>
   <p className="hh-fine">{ru?'Для заголовка раздела используйте ##, для нового абзаца — пустую строку.':'Use ## for section headings and an empty line for a new paragraph.'}</p>
   <details className="hh-practice-advanced-copy"><summary>{ru?'Источники и связанные услуги':'Sources and related services'}</summary>
    <label>{ru?'Ссылки на источники (каждая с новой строки)':'Source links (one per line)'}<textarea value={(draft.sourceUrls||[]).join('\n')} onChange={e=>setDraft({...draft,sourceUrls:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,8)})}/></label>
    <label>{ru?'Свои опубликованные услуги (до двух)':'Own published services (up to two)'}
     <select multiple size="4" value={draft.linkedServiceIds||[]} onChange={e=>setDraft({...draft,linkedServiceIds:[...e.target.selectedOptions].map(o=>o.value).slice(0,2)})}>
       {services.filter(x=>['published','submitted','changes_requested'].includes(x.status)&&x.copy?.title).map(s=><option value={s.id} key={s.id}>{s.copy.title}</option>)}
     </select>
    </label>
    <label>{ru?'Обложка из существующих публичных изображений':'Public image path (optional)'}<input value={draft.coverPath||''} placeholder="/images/..." onChange={e=>setDraft({...draft,coverPath:e.target.value})}/></label>
   </details>
   <div className="hh-actions"><button type="submit" disabled={busy} className="hh-primary">{busy?'…':ru?'Сохранить черновик':'Save draft'}</button>
    {editing&&<button type="button" disabled={busy||!draft.title||draft.excerpt.length<30||draft.body.length<200} onClick={()=>command('submit')}>{ru?'Отправить на модерацию':'Submit for review'}</button>}
    {editing&&<button type="button" disabled={busy} onClick={()=>window.confirm(ru?'Архивировать статью?':'Archive article?')&&command('archive')}>{ru?'Архивировать':'Archive'}</button>}
   </div>
   <p className="hh-fine">{ru?'Сначала сохраните изменения, затем отправьте именно сохранённый черновик на проверку. Действующая опубликованная версия не меняется до одобрения.':'Save changes first, then submit the saved draft. The current published version stays visible until approved.'}</p>
  </form>
 </div>
}
