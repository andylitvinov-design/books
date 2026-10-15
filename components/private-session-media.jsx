'use client'
import {useCallback,useEffect,useRef,useState} from 'react'

export function PrivateSessionMedia({kind,title,itemId,playBase,locale='en'}){
  const ru=locale==='ru',video=kind==='video',pdf=kind==='pdf'
  const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false)
  const [expiresAt,setExpiresAt]=useState(0)
  const player=useRef(null),restore=useRef(null),inFlight=useRef(false)

  const sign=useCallback(async(renew=false)=>{
    if(inFlight.current)return
    inFlight.current=true;setBusy(true);setError(false)
    const node=player.current
    const state=renew&&node?{time:node.currentTime,playing:!node.paused}:null
    try{
      const response=await fetch(playBase+'/'+encodeURIComponent(itemId),{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:'{}'
      })
      if(!response.ok)throw new Error('unavailable')
      const value=await response.json()
      if(typeof value.url!=='string'||!value.url.startsWith('https://'))throw new Error('unavailable')
      if(pdf){
        const a=document.createElement('a')
        a.href=value.url;a.target='_blank';a.rel='noopener noreferrer';a.click()
      }else{
        restore.current=state
        setExpiresAt(Date.now()+Math.min(Number(value.expiresIn)||300,300)*1000)
        setUrl(value.url)
      }
    }catch{
      setError(true)
      if(renew)setUrl('')
    }finally{
      inFlight.current=false;setBusy(false)
    }
  },[playBase,itemId,pdf])

  useEffect(()=>{
    if(!url||!expiresAt||pdf)return
    const delay=Math.max(1000,expiresAt-Date.now()-45000)
    const timer=setTimeout(()=>{
      if(player.current&&!player.current.paused&&!player.current.ended)void sign(true)
    },delay)
    return()=>clearTimeout(timer)
  },[url,expiresAt,pdf,sign])

  function loaded(){
    const resume=restore.current
    if(!resume||!player.current)return
    restore.current=null
    try{if(Number.isFinite(resume.time)&&resume.time>0)player.current.currentTime=resume.time}catch{}
    if(resume.playing)void player.current.play().catch(()=>{})
  }
  function playing(){
    if(Date.now()>expiresAt-30000&&!inFlight.current)void sign(true)
  }
  function failed(){
    if(Date.now()>expiresAt-15000&&!inFlight.current)void sign(true)
    else{setUrl('');setError(true)}
  }

  return <div className={'hh-session-media hh-session-media--'+kind}>
    {!url&&!pdf?<button type="button" onClick={()=>sign(false)} disabled={busy} className="hh-session-play"
      aria-label={(ru?'Воспроизвести ':'Play ')+title}>
      <span aria-hidden="true">{video?'▶':'♫'}</span>
      <span>{busy?(ru?'Открываем…':'Opening…'):video?(ru?'Смотреть личное видео':'Play personal video'):(ru?'Слушать практику':'Play audio practice')}</span>
    </button>:null}
    {url&&video?<video ref={player} src={url} controls playsInline preload="metadata" controlsList="nodownload"
      onLoadedMetadata={loaded} onPlay={playing} onError={failed} aria-label={title}/>:null}
    {url&&!video?<audio ref={player} src={url} controls preload="metadata"
      onLoadedMetadata={loaded} onPlay={playing} onError={failed} aria-label={title}/>:null}
    {pdf?<button type="button" onClick={()=>sign(false)} disabled={busy}>
      {busy?(ru?'Открываем…':'Opening…'):(ru?'Открыть приватный PDF ↗':'Open private PDF ↗')}
    </button>:null}
    {error?<p role="alert" className="hh-session-error">
      {ru?'Файл недоступен. Попробуйте ещё раз или свяжитесь со специалистом.':'Media unavailable. Retry or contact your practitioner.'}
    </p>:null}
  </div>
}
