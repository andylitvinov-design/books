'use client'
import {useEffect,useRef,useState} from 'react'
import {videoAccessView} from '@/lib/coaching/lukas-video-ui.mjs'
import MessengerSignIn from '@/components/app/messenger-sign-in'

/** Optional inline control for the existing Ali messenger. No autoplay, polling,
 * external provider calls or automatic microphone activation on mount. */
export default function LukasVideoAccessPanel({locale='en',authenticated=false,voiceSupported=false,onVoice,onStart,onText}){
 const [status,setStatus]=useState(null),[checking,setChecking]=useState(false),controller=useRef(null)
 useEffect(()=>()=>controller.current?.abort(),[])
 useEffect(()=>{controller.current?.abort();controller.current=null;setStatus(null);setChecking(false)},[authenticated])
 async function check(){
   if(!authenticated||controller.current)return
   const ac=new AbortController();controller.current=ac;setChecking(true)
   try{
     const response=await fetch('/api/holistic-agent/video-access',{credentials:'same-origin',cache:'no-store',signal:ac.signal})
     const payload=await response.json()
     if(!ac.signal.aborted)setStatus(payload)
   }catch{if(!ac.signal.aborted)setStatus({code:'UNAVAILABLE'})}
   finally{if(controller.current===ac){controller.current=null;setChecking(false)}}
 }
 const view=videoAccessView(status,{locale,authenticated,voiceSupported})
 return <section data-hh-lukas-access aria-label={view.title} style={{display:'grid',gap:6,padding:'8px 10px',border:'1px solid #dce6de',borderRadius:14,background:'#f7faf7'}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><strong>{view.title}</strong><small>{view.allowance}</small></div>
   {!authenticated?<><small>{view.message}</small><MessengerSignIn locale={locale}/></>:<>
     {status&&<><small>{view.balance}</small><small role="status">{view.message}</small></>}
     <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
       {view.canStart&&typeof onStart==='function'?<button type="button" onClick={onStart}>{view.start}</button>:<button type="button" onClick={()=>void check()} disabled={checking}>{checking?view.checking:status?view.later:view.check}</button>}
       {view.signIn&&status&&<MessengerSignIn locale={locale}/>}
       {view.canVoice&&typeof onVoice==='function'?<button type="button" onClick={onVoice}>{view.voice}</button>:typeof onText==='function'?<button type="button" onClick={onText}>{view.text}</button>:null}
     </div>
   </>}
 </section>
}
