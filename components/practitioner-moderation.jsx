'use client'
import { useEffect, useState } from 'react'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'

export default function PractitionerModeration(){
 const [items,setItems]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function load(){setError('');try{const r=await fetch('/admin/practitioners/data',{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error();setItems((await r.json()).items||[])}catch{setError('Unable to load practitioner network.')}}
 useEffect(()=>{load()},[])
 async function act(kind,id,action,extra={}){setBusy(true);setError('');try{const r=await fetch('/admin/practitioners/data',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,id,action,...extra})});if(!r.ok)throw new Error();await load()}catch{setError('The moderation action failed.')}finally{setBusy(false)}}
 return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="Practitioner Network" description="Review practitioner profiles, credentials and public services."/>
  {error&&<p role="alert">{error}</p>}
  {!items.length&&!error&&<p>No practitioner records yet.</p>}
  {items.map(({practitioner:p,credentials,services})=><section className="client-detail-card" key={p.id}>
    <div className="client-detail-summary"><div><p className="prescription-admin-eyebrow">{p.status}</p><h2>{p.draftProfile?.displayName||p.profile?.displayName||p.slug}</h2><p>{p.draftProfile?.professionalTitle||p.profile?.professionalTitle||''}</p><p>{p.draftProfile?.shortBio||p.profile?.shortBio||''}</p>{p.reviewNote&&<p><strong>Review note:</strong> {p.reviewNote}</p>}</div><div><p>/{p.slug}</p>{p.isPartner&&<strong>Holistic House Partner</strong>}</div></div>
    <div className="practitioner-cabinet-actions">
      <button disabled={busy} onClick={()=>act('practitioner',p.id,'approve')}>Approve</button>
      <button disabled={busy} onClick={()=>act('practitioner',p.id,'changes_requested',{note:'Please revise the public profile and resubmit.'})}>Request changes</button>
      <button disabled={busy} onClick={()=>window.confirm('Suspend this practitioner from public discovery?')&&act('practitioner',p.id,'suspend',{note:'Suspended by Holistic House.'})}>Suspend</button>
      <button disabled={busy} onClick={()=>act('practitioner',p.id,'restore')}>Restore</button>
      <button disabled={busy} onClick={()=>act('practitioner',p.id,'partner',{isPartner:!p.isPartner})}>{p.isPartner?'Remove Partner':'Set Partner'}</button>
    </div>
    <h3>Credentials</h3>
    {!credentials.length&&<p>None declared.</p>}
    {credentials.map(c=><article className="client-document-card" key={c.id}><div><strong>{c.title}</strong><p>{[c.issuer,c.jurisdiction,c.reference].filter(Boolean).join(' · ')}</p><span>{c.verificationStatus}</span></div><div className="practitioner-cabinet-actions"><button disabled={busy} onClick={()=>act('credential',c.id,'verify')}>Verify</button><button disabled={busy} onClick={()=>act('credential',c.id,'reject')}>Reject</button><button disabled={busy} onClick={()=>act('credential',c.id,'expire')}>Expired</button></div></article>)}
    <h3>Services</h3>
    {!services.length&&<p>No services yet.</p>}
    {services.map(s=><article className="client-document-card" key={s.id}><div><strong>{s.draftCopy?.copy?.en?.title||s.copy?.title||s.slug}</strong><p>{s.areaKey} · {s.deliveryFormat}</p><span>{s.status}</span>{s.reviewNote&&<p>{s.reviewNote}</p>}</div><div className="practitioner-cabinet-actions"><button disabled={busy} onClick={()=>act('service',s.id,'approve')}>Publish</button><button disabled={busy} onClick={()=>act('service',s.id,'changes_requested',{note:'Please revise this service and resubmit.'})}>Request changes</button><button disabled={busy} onClick={()=>window.confirm('Suspend this public service?')&&act('service',s.id,'suspend',{note:'Suspended by Holistic House.'})}>Suspend</button><button disabled={busy} onClick={()=>act('service',s.id,'archive')}>Archive</button></div></article>)}
  </section>)}
 </main>
}
