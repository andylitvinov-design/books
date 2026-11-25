'use client'
import { useEffect,useState } from 'react'
import {LockKeyhole} from 'lucide-react'
import styles from './client-session.module.css'
export function ClientSessionShareGate({locale='en',selector}) {
  const ru=locale==='ru'
  const [status,setStatus]=useState('checking')
  useEffect(()=>{
    let active=true
    const secret=window.location.hash.startsWith('#')?
      window.location.hash.slice(1):''
    // The capability is only sent through a same-origin POST, never a URL or log.
    window.history.replaceState(null,'',window.location.pathname)
    if(!/^[a-zA-Z0-9_-]{43}$/.test(secret)) {setStatus('unavailable');return}
    const controller=new AbortController()
    fetch('/api/client-session-access',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'content-type':'application/json'},body:JSON.stringify({selector,secret}),signal:controller.signal})
      .then(res=>{if(!res.ok) throw new Error('Access unavailable');if(active) window.location.replace(window.location.pathname)})
      .catch(()=>{if(active)setStatus('unavailable')})
    return ()=>{active=false;controller.abort()}
  },[selector])
  return <main className={styles.shareGate}>
    <LockKeyhole size={38}/>
    <span className={styles.eyebrow}>HOLISTIC HOUSE · {ru?'ЛИЧНО':'PRIVATE'}</span>
    <h1>{ru?'Ваша личная сессия':'Your personal session'}</h1>
    <p role="status">{status==='checking'?(ru?'Безопасно открываем материалы…':'Opening your materials securely…'):
      (ru?'Ссылка недоступна или срок её действия истёк. Попросите специалиста отправить новую ссылку.':
        'This link is unavailable or expired. Please ask your practitioner for a new link.')}</p>
  </main>
}
