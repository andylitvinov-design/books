'use client'
import {useEffect,useState} from 'react'
import {Mic,Film,CheckCircle2,RefreshCw,ShieldAlert,ExternalLink} from 'lucide-react'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'

const title={
  draft:'Draft',submitted:'Awaiting editorial review',changes_requested:'Changes requested',
  approved:'Approved · awaiting verified YouTube delivery',uploading:'Uploading · confirmation pending',
  upload_uncertain:'YouTube receipt uncertain · do not retry',uploaded:'Provider processed',
  rejected:'Rejected'
}
async function api(body){
  const response=await fetch('/api/admin/practitioners/meditations',{
    credentials:'same-origin',cache:'no-store',method:body?'POST':'GET',
    headers:body?{'content-type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined})
  const data=await response.json().catch(()=>({}))
  if(!response.ok)throw Error(data.error||'MODERATION_UNAVAILABLE')
  return data
}
export default function PractitionerMeditationsModeration(){
  const [items,setItems]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(''),[notes,setNotes]=useState({})
  async function load(){
    setError('');try{setItems((await api()).items||[])}catch(e){setError(e.message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])
  async function moderate(item,action){
    if(busy)return
    if(action==='approve'&&!window.confirm('Approve for preparation of an Unlisted Holistic House YouTube video? This does NOT send or publish it yet.'))return
    const note=notes[item.id]||''
    if(action!=='approve'&&!note.trim()){setError('Give the practitioner a concrete revision / rejection reason.');return}
    setBusy(item.id);setError('')
    try{await api({id:item.id,action,note});await load()}
    catch(e){setError(e.message)}finally{setBusy('')}
  }
  const waiting=items.filter(item=>item.status==='submitted').length
  return <main className="prescription-admin-shell" style={{maxWidth:1050}}>
    <PrescriptionAdminHeader title="Meditation submissions" description="Listen, review rights and language, then approve or return. No submission can publish automatically without verified owner YouTube OAuth."/>
    <div className="practitioner-cabinet-actions" style={{marginBottom:18}}>
      <button type="button" onClick={()=>void load()} disabled={loading||Boolean(busy)}><RefreshCw size={16}/> Refresh ({waiting} pending)</button>
      <a href="/admin/youtube-upload">Owner YouTube uploader <ExternalLink size={14}/></a>
      <a href="/admin/practitioners">All practitioners</a>
    </div>
    <p style={{padding:13,borderRadius:10,background:'#f6eee5',lineHeight:1.5}}>
      <ShieldAlert size={16} aria-hidden="true"/> Review the complete spoken content, rights, audio language and any footage. A microphone recording,
      approval, downloaded file, or HTTP 200 is not a YouTube delivery receipt.
      RU recordings go only to the verified RU owner channel, EN only to the verified EN owner channel. Keep Unlisted until approved for public release.
    </p>
    {error&&<p role="alert" style={{color:'#893e33'}}>{error}</p>}
    {loading?<p>Loading private moderation queue…</p>:
     !items.length?<p>No practitioner meditation submissions yet.</p>:
     items.map(item=>{
       const path='/api/admin/practitioners/meditations/'+item.id+'/media'
       const hasVideo=item.videoReady||item.kind==='video'
       const videoUrl=item.videoReady?path+'?video=1':path
       return <section className="client-detail-card" key={item.id} style={{display:'grid',gap:12,marginBottom:14}}>
         <div className="client-detail-summary">
           <div><p className="prescription-admin-eyebrow">{item.language.toUpperCase()} · {item.practitionerName} · {title[item.status]||item.status}</p>
             <h2>{item.title||'(Untitled)'}</h2><p>{item.description}</p>
             <small>{item.kind==='audio'?'Voice recording':'Uploaded video'} · music: {item.music} · scene: {item.scene} · production: {item.mode}</small></div>
           <div><strong>{item.sourceReady?'Original verified':'Original pending'}</strong><p>{item.createdAt?new Date(item.createdAt).toLocaleString():'Unknown date'}</p></div>
         </div>
         {item.sourceReady&&<div style={{display:'grid',gap:10,maxWidth:610}}>
           <strong><Mic size={15} aria-hidden="true"/> Original voice / video for full listening</strong>
           {item.kind==='video'?<video controls preload="none" playsInline src={path} style={{width:'100%',maxHeight:300,borderRadius:12}}/>:
             <audio controls preload="none" src={path} style={{width:'100%'}}/>}
           {item.videoReady&&<><strong><Film size={15} aria-hidden="true"/> Rendered video</strong>
             <video controls preload="none" playsInline src={videoUrl} style={{width:'100%',maxHeight:300,borderRadius:12}}/></>}
         </div>}
         {!hasVideo&&<p style={{color:'#985a39',margin:0}}>Audio-only submission. An approved final video still needs to be made before YouTube upload.</p>}
         {item.mode==='ai_quote'&&<p style={{color:'#985a39',margin:0}}>AI video requested: price and vendor approval required. No render has been purchased.</p>}
         {item.reviewNote&&<p><strong>Review note:</strong> {item.reviewNote}</p>}
         {item.status==='submitted'&&<>
           <label style={{display:'grid',gap:6}}>Moderation note to practitioner
             <textarea rows={2} maxLength={500} value={notes[item.id]||''}
               onChange={e=>setNotes(previous=>({...previous,[item.id]:e.target.value}))}
               placeholder="If returning or rejecting, specify the exact change needed."
               style={{width:'100%',maxWidth:650,padding:10,borderRadius:8}}/></label>
           <div className="practitioner-cabinet-actions">
             <button disabled={Boolean(busy)} onClick={()=>void moderate(item,'approve')}><CheckCircle2 size={16}/> Approve for delivery</button>
             <button disabled={Boolean(busy)} onClick={()=>void moderate(item,'changes_requested')}>Request changes</button>
             <button disabled={Boolean(busy)} onClick={()=>void moderate(item,'reject')}>Reject</button>
           </div>
         </>}
         {['approved','upload_uncertain','uploading'].includes(item.status)&&
           <div style={{display:'grid',gap:8}}>
             <strong>Delivery handoff · {item.language.toUpperCase()}</strong>
             {item.canUpload?
               <><p style={{margin:0}}>Owner-verified OAuth delivery is pending. Import the approved video and use the existing uploader only if you accept a manual handoff; do not re-upload if provider status is uncertain.</p>
                 <div className="practitioner-cabinet-actions">
                   <a href={videoUrl} target="_blank" rel="noreferrer noopener">Preview approved video</a>
                   <a href={'/admin/youtube-upload?meditation='+encodeURIComponent(item.id)}>Import into verified {item.language.toUpperCase()} YouTube uploader</a>
                 </div></>:
               <p style={{margin:0}}>YouTube upload blocked: first produce a final MP4 or WebM video from the approved voice/video and verify the target channel. No duplicate upload.</p>}
           </div>}
         {item.status==='uploaded'&&item.youtubeVideoId&&<a target="_blank" rel="noopener noreferrer" href={'https://www.youtube.com/watch?v='+item.youtubeVideoId}>Verified YouTube video</a>}
       </section>
     })}
  </main>
}
