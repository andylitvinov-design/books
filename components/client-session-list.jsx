'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './client-session.module.css'
export function OwnerClientSessions({clientId,sessions,documents,locale='en'}) {
  const router=useRouter(),ru=locale==='ru'
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function create() {
    if(busy) return
    setBusy(true);setError('')
    try {
      const first=[...documents].filter(x=>x.kind!=='report'&&x.status==='active').sort((a,b)=>b.dateIssued.localeCompare(a.dateIssued))[0]
      const res=await fetch('/api/admin/clients/'+clientId+'/sessions',{method:'POST',cache:'no-store',
        headers:{'content-type':'application/json'},credentials:'same-origin',
        body:JSON.stringify({documentId:first?.id||null})})
      const data=await res.json()
      if(!res.ok||!data.id) throw new Error(data.error||'Unable to create session')
      router.push('/admin/clients/'+clientId+'/sessions/'+data.id)
    } catch(e){setError(e.message)}
    finally{setBusy(false)}
  }
  return <section className={styles.sessionList} aria-label={ru?'Сессии клиента':'Client sessions'}>
    <header><div><h2>{ru?'Персональные сессии':'Personal sessions'}</h2><p>
      {ru?'Отдельные отчёты, аудио и видео для каждой консультации':'One private report, audio and video collection per consultation'}</p>
    </div><button type="button" disabled={busy} onClick={create}>+ {ru?'Новая сессия':'New session'}</button></header>
    <div className={styles.sessionCards}>
      {sessions.map(item=><a key={item.id} href={'/admin/clients/'+clientId+'/sessions/'+item.id}>
        <strong>{item.title}</strong><small>{item.occurredOn} · {item.status==='published'?(ru?'Опубликовано':'Published'):
          item.status==='archived'?(ru?'Архив':'Archived'):(ru?'Черновик':'Draft')}</small></a>)}
    </div>
    {!sessions.length&&<p style={{marginTop:16}}>{ru?'Начните с новой сессии, запись прикрепится автоматически.':
      'Start a new session; recordings attach here automatically.'}</p>}
    {error&&<p role="alert" style={{color:'#a52734',marginTop:10}}>{error}</p>}
  </section>
}
