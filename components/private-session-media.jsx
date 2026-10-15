'use client'
import {useState} from 'react'
export function PrivateSessionMedia({kind,title,itemId,playBase,mime}){
  const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false)
  const video=kind==='video',pdf=kind==='pdf'
  async function load(){
    if(busy)return
    setBusy(true);setError(false)
    try{
      const response=await fetch(playBase+'/'+encodeURIComponent(itemId),{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:'{}'
      })
      if(!response.ok)throw new Error('unavailable')
      const value=await response.json()
      if(!value.url||typeof value.url!=='string'||!value.url.startsWith('https://'))throw new Error('unavailable')
      if(pdf){
        const a=document.createElement('a');a.href=value.url;a.target='_blank';a.rel='noopener noreferrer';a.click()
      }else setUrl(value.url)
    }catch{setError(true)}
    finally{setBusy(false)}
  }
  return <div className={'hh-session-media hh-session-media--'+kind}>
    {!url&&!pdf?<button type="button" onClick={load} disabled={busy} className="hh-session-play" aria-label={'Play '+title}>
      <span aria-hidden="true">{video?'▶':'♫'}</span>
      <span>{busy?'Opening…':video?'Play personal video':'Play audio practice'}</span>
    </button>:null}
    {url&&video?<video src={url} controls playsInline preload="metadata" controlsList="nodownload" onError={()=>{setUrl('');setError(true)}} aria-label={title}/>:null}
    {url&&!video?<audio src={url} controls preload="metadata" onError={()=>{setUrl('');setError(true)}} aria-label={title}/>:null}
    {pdf?<button type="button" onClick={load} disabled={busy}>{busy?'Opening…':'Open private PDF ↗'}</button>:null}
    {error?<p role="alert" className="hh-session-error">Media unavailable. You can retry or contact your practitioner.</p>:null}
  </div>
}
