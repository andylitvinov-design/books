'use client'
import { useEffect,useRef,useState } from 'react'
export function SessionShareGate({selector,locale='en'}){
  const [failed,setFailed]=useState(false),started=useRef(false)
  useEffect(()=>{
    if(started.current)return
    started.current=true
    const secret=location.hash.startsWith('#')?location.hash.slice(1):''
    // Never leave bearer in visible address or browser history longer than necessary.
    history.replaceState(history.state,'',location.pathname+location.search)
    if(!/^[a-zA-Z0-9_-]{43}$/.test(secret)){setFailed(true);return}
    void fetch('/api/client-session/exchange',{
      method:'POST',cache:'no-store',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({selector,secret}),
    }).then(response=>{
      if(!response.ok)throw new Error('unavailable')
      location.replace(location.pathname+location.search)
    }).catch(()=>setFailed(true))
  },[selector])
  const ru=locale==='ru'
  return <main className="hh-session-access"><p>HOLISTIC HOUSE · PRIVATE</p>
    <h1>{failed?(ru?'Ссылка на сессию недоступна':'This session link is unavailable'):(ru?'Открываем вашу консультацию…':'Opening your session…')}</h1>
    <p>{failed?(ru?'Попросите специалиста прислать действующую ссылку.':'Please ask your practitioner for a new invitation.'):(ru?'Проверяем приватный доступ.':'Checking secure access.')}</p>
  </main>
}
