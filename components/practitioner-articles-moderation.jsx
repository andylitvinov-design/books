'use client'
import {useEffect,useState} from 'react'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
export default function ArticlesModeration(){
 const [items,setItems]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('')
 async function load(){const r=await fetch('/admin/practitioners/articles/data',{cache:'no-store',credentials:'same-origin'});const result=await r.json();if(!r.ok)throw Error(result.error||'LOAD_FAILED');setItems(result.items||[])}
 useEffect(()=>{load().catch(e=>setError(e.message))},[])
 async function action(id,action){setBusy(true);setError('');try{const r=await fetch('/admin/practitioners/articles/data',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,note})});if(!r.ok){const e=await r.json();throw Error(e.error||'REVIEW_FAILED')}await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <main className="prescription-admin-shell">
  <PrescriptionAdminHeader title="Practitioner articles" description="Review author content before publication. Published revisions remain stable until approval."/>
  <p><a href="/admin/practitioners">← Practitioner network</a></p>
  {error&&<p role="alert">{error}</p>}
  <label>Moderation feedback <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Specific requested changes"/></label>
  {items.map(item=><section className="client-detail-card" key={item.id}>
   <p className="prescription-admin-eyebrow">{item.status} · {item.draft.locale} · {item.practitionerSlug}</p>
   <h2>{item.draft.title||item.slug}</h2><p>{item.draft.excerpt}</p>
   <details><summary>Read submitted body</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.draft.body}</pre><p>{(item.draft.sourceUrls||[]).join(' · ')}</p></details>
   {item.published?.title&&<p>Currently published: {item.published.title} · {item.published.locale}</p>}
   <div className="practitioner-cabinet-actions">
    <button disabled={busy} onClick={()=>action(item.id,'approve')}>Approve & publish</button>
    <button disabled={busy||!note.trim()} onClick={()=>action(item.id,'changes_requested')}>Request changes</button>
    <button disabled={busy} onClick={()=>window.confirm('Suspend article?')&&action(item.id,'suspend')}>Suspend</button>
    <button disabled={busy} onClick={()=>window.confirm('Archive article?')&&action(item.id,'archive')}>Archive</button>
   </div>
  </section>)}
  {!items.length&&!error&&<p>No practitioner articles submitted yet.</p>}
 </main>
}
