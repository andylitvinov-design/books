'use client'
import { useEffect, useState } from 'react'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'

function ModerationService({service:s,busy,act}){
 const draft=s.draftCopy&&Object.keys(s.draftCopy).length?s.draftCopy:null
 const preview=draft||{
   copy:s.localizedCopy||{},displayLocales:s.displayLocales||['en','ru'],
   photos:s.photos||[],contacts:s.contacts||{},pricingMode:s.pricingMode,
   confirmedPrice:s.confirmedPrice,currency:s.currency
 }
 const locales=preview.displayLocales||['en','ru']
 const price=['free','contact'].includes(preview.pricingMode)?(preview.pricingMode==='free'?'Free':'Price on request')
   :(preview.pricingMode==='from'?'From ':'')+(preview.currency||'CAD')+' '+(preview.confirmedPrice??'')
 const contacts=preview.contacts||{}
 return <article className="client-document-card">
   <div style={{minWidth:0,flex:'1 1 380px'}}>
     <strong>{preview.copy?.en?.title||preview.copy?.ru?.title||preview.copy?.es?.title||s.copy?.title||s.slug}</strong>
     <p>{s.areaKey} · {s.deliveryFormat} · {price} · Display: {locales.join(', ').toUpperCase()}</p>
     <span>{s.status}{draft?' · pending edits':''}</span>
     {s.reviewNote&&<p><strong>Review note: </strong>{s.reviewNote}</p>}
     <div style={{display:'flex',flexWrap:'wrap',gap:8,margin:'11px 0'}}>
       {(preview.photos||[]).map((url,index)=><img key={url} src={url} loading="lazy" alt={'Public listing photo '+(index+1)}
         style={{width:110,height:80,objectFit:'cover',borderRadius:8,border:'1px solid #d8dce4'}}/>)}
     </div>
     {locales.map(lang=><div key={lang} style={{margin:'9px 0',padding:'8px 10px',background:'#f6f8fb',borderRadius:9}}>
       <strong>{lang.toUpperCase()} · {preview.copy?.[lang]?.title||'MISSING TITLE'}</strong>
       <p>{preview.copy?.[lang]?.shortDescription||'Missing short summary'}</p>
       {preview.copy?.[lang]?.description&&<details><summary>Full service description</summary><p style={{whiteSpace:'pre-wrap'}}>{preview.copy[lang].description}</p></details>}
     </div>)}
     {(contacts.whatsapp||contacts.telegram)&&<p><strong>Public messenger contacts: </strong>
       {contacts.whatsapp?'WhatsApp '+contacts.whatsapp+' ':''}{contacts.telegram?' · Telegram @'+contacts.telegram:''}
     </p>}
   </div>
   <div className="practitioner-cabinet-actions">
     <button disabled={busy||!['submitted','changes_requested'].includes(s.status)} onClick={()=>act('service',s.id,'approve')}>Publish</button>
     <button disabled={busy} onClick={()=>act('service',s.id,'changes_requested',{note:'Please revise this service and resubmit.'})}>Request changes</button>
     <button disabled={busy} onClick={()=>window.confirm('Suspend this public service?')&&act('service',s.id,'suspend',{note:'Suspended by Holistic House.'})}>Suspend</button>
     <button disabled={busy} onClick={()=>act('service',s.id,'archive')}>Archive</button>
   </div>
 </article>
}
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
     {services.map(s=><ModerationService key={s.id} service={s} busy={busy} act={act}/>)}
  </section>)}
 </main>
}
