'use client'
import Link from 'next/link'
import {useCallback,useEffect,useRef,useState} from 'react'
import {ENGLISH_YOUTUBE_MASTERS} from '@/lib/youtube/english-master-catalog.mjs'

const jobStates=new Set(['queued','checking','uploading','processing'])
const isUploaded=job=>job?.state==='uploaded'&&
  /^[A-Za-z0-9_-]{11}$/.test(job.youtubeVideoId||'')&&!job.error
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function api(method,body,id){
  const response=await fetch('/api/admin/heygen-youtube'+(id?'?videoId='+id:''),{
    method,credentials:'same-origin',cache:'no-store',
    headers:body?{'content-type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,
  })
  const data=await response.json().catch(()=>({error:'PUBLISHER_UNAVAILABLE'}))
  if(!response.ok)throw Error(data.error||'PUBLISHER_UNAVAILABLE')
  return data
}
const COPY={
  ru:{
    title:'Английский YouTube — 7 финальных видео',
    text:'Готовые английские презентации из HeyGen. Тесты и черновики не загружаются. Каждый ролик сохраняется в @aatapro как «По ссылке» (Unlisted).',
    connected:'Английский YouTube подключён',missing:'Сначала подключите английский Google OAuth в блоке выше.',
    missingApi:'Для пакетной загрузки требуется HH_HEYGEN_API_KEY в Vercel; отдельные ролики можно загрузить через форму ниже с приватной MP4 ссылкой.',
    rights:'Подтверждаю права на публикацию каждого из этих 7 финальных видео.',
    unlisted:'Подтверждаю загрузку Unlisted на английский @aatapro, а не в русский канал.',
    start:'Загрузить все 7 по очереди',stop:'Остановить следующие загрузки',
    running:'Передача:',done:'Загрузка пакета подтверждена YouTube.',
    stopped:'Остановлено; текущая передача не отменяется. Уже начатые видео не повторяются.',
    waiting:'Ещё не загружено',uploaded:'Подтверждено на YouTube',
    processing:'Проверяем обработку',problem:'Требуется проверка',open:'Отдельно',
    instructions:'Держите эту страницу открытой до подтверждения. После обрыва можно безопасно продолжить: уже подтверждённые ID будут пропущены.',
  },
  en:{
    title:'English YouTube — 7 final videos',
    text:'Finished English HeyGen presentations only; tests and drafts are excluded. Each is uploaded Unlisted to @aatapro.',
    connected:'English YouTube is connected',missing:'Connect the English Google OAuth account above first.',
    missingApi:'Batch upload requires HH_HEYGEN_API_KEY in Vercel. Individual approved videos can use a private signed MP4 URL below.',
    rights:'I confirm my rights to publish each of these 7 finished videos.',
    unlisted:'I approve Unlisted uploads to English @aatapro, never the Russian channel.',
    start:'Upload all 7 sequentially',stop:'Stop upcoming uploads',
    running:'Transferring:',done:'All uploads verified by YouTube.',
    stopped:'Stopped. A current transfer continues; no confirmed upload will repeat.',
    waiting:'Not uploaded',uploaded:'Verified on YouTube',
    processing:'Processing',problem:'Needs review',open:'Open uploader',
    instructions:'Keep this page open until confirmed. Restarting is safe: verified YouTube IDs are skipped.',
  }
}
export default function HeygenEnYoutubeCatalog({locale='ru'}){
  const t=COPY[locale==='en'?'en':'ru']
  const [connected,setConnected]=useState(false)
  const [configured,setConfigured]=useState(false)
  const [jobs,setJobs]=useState({})
  const [rights,setRights]=useState(false)
  const [unlisted,setUnlisted]=useState(false)
  const [running,setRunning]=useState(false)
  const [active,setActive]=useState('')
  const [error,setError]=useState('')
  const [done,setDone]=useState(false)
  const stopped=useRef(false)
  const mounted=useRef(true)
  const update=useCallback(job=>{
    if(job?.videoId&&mounted.current)
      setJobs(previous=>({...previous,[job.videoId]:job}))
  },[])
  useEffect(()=>{
    mounted.current=true
    let current=true
    void (async()=>{
      try{
        const data=await api('GET',null,null)
        if(!current)return
        setConnected(data.connected===true)
        setConfigured(data.heygenApiConfigured===true)
        const statuses=await Promise.allSettled(ENGLISH_YOUTUBE_MASTERS.map(
          item=>api('GET',null,item.videoId)))
        if(!current)return
        for(const result of statuses)if(result.status==='fulfilled'&&result.value.job)
          update(result.value.job)
      }catch{/* Never infer an owner grant from guest or failed readback. */}
    })()
    return ()=>{current=false;mounted.current=false;stopped.current=true}
  },[update])
  async function start(){
    if(running||!connected||!configured||!rights||!unlisted)return
    stopped.current=false
    setRunning(true);setDone(false);setError('')
    try{
      for(const master of ENGLISH_YOUTUBE_MASTERS){
        if(stopped.current)break
        setActive(master.videoId)
        let {job}=await api('GET',null,master.videoId)
        if(isUploaded(job)){update(job);continue}
        if(job?.state==='uncertain'||job?.state==='failed'||job?.error)
          throw Error(master.title+': '+(job.error||job.state))
        if(!job){
          const queued=await api('POST',{
            action:'publish',videoId:master.videoId,title:master.title,
            description:master.description,rightsConfirmed:true,privacyConfirmed:true
          })
          job=queued.job;update(job)
        }
        // Upload runs server-side through the existing owner-authorized
        // Next after callback. Sequential uploads avoid parallel quota spikes.
        let confirmed=isUploaded(job)
        for(let check=0;!confirmed&&check<80&&!stopped.current;check++){
          if(!jobStates.has(job?.state))throw Error(master.title+': '+(job?.error||job?.state||'UNKNOWN'))
          await sleep(10000)
          if(stopped.current)break
          const next=await api('GET',null,master.videoId)
          job=next.job;update(job)
          if(job?.state==='uncertain'||job?.state==='failed'||job?.error)
            throw Error(master.title+': '+(job.error||job.state))
          confirmed=isUploaded(job)
        }
        if(!stopped.current&&!confirmed)
          throw Error(master.title+': YOUTUBE_EN_PROCESSING_PENDING')
      }
      if(!stopped.current)setDone(true)
    }catch(reason){if(!stopped.current)setError(String(reason?.message||reason))}
    finally{setActive('');setRunning(false)}
  }
  return <section data-heygen-en-catalog style={{
    margin:'16px 0',padding:14,border:'1px solid #d8c7ab',
    background:'#fffaf3',borderRadius:16,color:'#143d3a'}}>
    <h2 style={{fontSize:20,margin:'0 0 6px'}}>{t.title}</h2>
    <p style={{fontSize:14,margin:'0 0 9px'}}>{t.text}</p>
    <p style={{fontSize:13,margin:'0 0 12px'}} role="status">
      {connected?'✅ '+t.connected:'🔐 '+t.missing}
    </p>
    {!configured&&<p style={{fontSize:13,margin:'0 0 8px'}}>{t.missingApi}</p>}
    <ul style={{listStyle:'none',padding:0,margin:'0 0 12px',display:'grid',gap:7}}>
      {ENGLISH_YOUTUBE_MASTERS.map(master=>{
        const job=jobs[master.videoId],ok=isUploaded(job)
        const watch=ok?'https://www.youtube.com/watch?v='+job.youtubeVideoId:null
        const href='/admin/youtube-upload?heygen='+master.videoId+
          '&title='+encodeURIComponent(master.title)+
          '&description='+encodeURIComponent(master.description)
        return <li key={master.videoId} data-heygen-master={master.videoId}
          style={{display:'grid',gap:5,padding:'9px 10px',border:'1px solid #e8ddd0',
            borderRadius:12,background:active===master.videoId?'#e6f6f1':'#fffdfa'}}>
          <strong style={{fontSize:14}}>{master.title}</strong>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',
            justifyContent:'space-between',fontSize:12}}>
            <span>{ok?'✅ '+t.uploaded:job?.state==='failed'||job?.state==='uncertain'?
              '⚠️ '+t.problem:job?'⏳ '+t.processing:t.waiting}</span>
            {watch?<a href={watch} target="_blank" rel="noopener noreferrer">
              YouTube</a>:<Link prefetch={false} href={href}>{t.open}</Link>}
          </div>
        </li>
      })}
    </ul>
    <label style={{display:'flex',gap:8,fontSize:14,marginBottom:9}}>
      <input type="checkbox" checked={rights} disabled={running}
        onChange={event=>setRights(event.target.checked)}/>{t.rights}</label>
    <label style={{display:'flex',gap:8,fontSize:14,marginBottom:10}}>
      <input type="checkbox" checked={unlisted} disabled={running}
        onChange={event=>setUnlisted(event.target.checked)}/>{t.unlisted}</label>
    <button type="button" onClick={running?()=>{stopped.current=true}:()=>void start()}
      disabled={!running&&(!connected||!configured||!rights||!unlisted)}
      style={{minHeight:48,padding:'10px 14px',border:0,borderRadius:11,
        background:'#067a67',color:'white',fontSize:15,fontWeight:750,
        opacity:running||(connected&&configured&&rights&&unlisted)?1:.5}}>
      {running?t.stop:t.start}
    </button>
    {active&&<p role="status" style={{fontSize:13}}>{t.running} {
      ENGLISH_YOUTUBE_MASTERS.find(master=>master.videoId===active)?.title}</p>}
    {done&&<p role="status">✅ {t.done}</p>}
    {stopped.current&&!running&&<p role="status" style={{fontSize:13}}>{t.stopped}</p>}
    {error&&<p role="alert" style={{fontSize:13,color:'#9b3030'}}>{error}</p>}
    <p style={{fontSize:12,margin:'12px 0 0',color:'#5d6a71'}}>{t.instructions}</p>
  </section>
}
