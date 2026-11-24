'use client'
import { useEffect,useState } from 'react'
import {LockKeyhole} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './client-session.module.css'

export function ClientSessionShareGate({locale='en',selector,invitationReady=false}) {
  const ru=locale==='ru'
  const [status,setStatus]=useState(invitationReady?'ready':'checking')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState(false)
  useEffect(()=>{
    let active=true
    const secret=window.location.hash.startsWith('#')?window.location.hash.slice(1):''
    if(!secret){setStatus(invitationReady?'ready':'unavailable');return}
    if(!/^[a-zA-Z0-9_-]{43}$/.test(secret)){setStatus('unavailable');return}
    const controller=new AbortController()
    setStatus('checking')
    fetch('/api/client-session-access',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'content-type':'application/json'},body:JSON.stringify({selector,secret}),signal:controller.signal})
      .then(res=>{
        if(!res.ok)throw new Error('Access unavailable')
        if(active){
          window.history.replaceState(null,'',window.location.pathname)
          setStatus('ready')
        }
      })
      .catch(()=>{if(active)setStatus('unavailable')})
    return ()=>{active=false;controller.abort()}
  },[selector,invitationReady])

  async function openWithGoogle(){
    if(busy||status!=='ready')return
    setBusy(true);setError(false)
    try{
      const intent=await appFetch('save-intents',{sourceKind:'client_session',selector,operationId:crypto.randomUUID()})
      // Always use Google for this first invitation claim. The same browser-
      // bound intent survives the existing PKCE handoff; no report goes to OAuth.
      const auth=await appFetch('auth/start',{locale,intentId:intent.id,provider:'google'})
      const url=new URL(auth.redirectUrl)
      if(url.protocol!=='https:'||!url.hostname)throw new Error('SIGN_IN_UNAVAILABLE')
      window.location.assign(url.href)
    }catch{setError(true);setBusy(false)}
  }

  return <main className={styles.shareGate}>
    <LockKeyhole size={38}/>
    <span className={styles.eyebrow}>HOLISTIC HOUSE · {ru?'ЛИЧНО':'PRIVATE'}</span>
    <h1>{ru?'Ваш личный отчёт готов':'Your personal report is ready'}</h1>
    {status==='ready'?<>
      <p>{ru?'Войдите через Google, чтобы открыть отчёт и сохранить его в своём личном кабинете.':
        'Sign in with Google to open your report and keep it in your personal Cabinet.'}</p>
      <button type="button" className={styles.sessionSaveModalPrimary} disabled={busy} onClick={openWithGoogle}>
        {busy?(ru?'Открываем Google…':'Opening Google…'):(ru?'Продолжить через Google':'Continue with Google')}
      </button>
      <p>{ru?'После входа кабинет будет связан с вашей карточкой клиента и контактами специалиста. Это не подписка на рассылку.':
        'Your Cabinet will be linked to your existing client record and the practitioner’s contact list. This does not subscribe you to marketing.'}</p>
      <p>{ru?'Доступ получит только подтверждённый аккаунт клиента. Если адрес Google отличается от указанного специалистом, обратитесь к специалисту.':
        'Only the verified client account can access the report. If your Google email differs from the address your practitioner recorded, contact your practitioner.'}</p>
      {error&&<p role="alert">{ru?'Не удалось начать вход. Попробуйте ещё раз.':'Could not start sign-in. Please try again.'}</p>}
    </>:<p role="status">{status==='checking'?(ru?'Проверяем приглашение…':'Checking your invitation…'):
      (ru?'Ссылка недоступна или срок её действия истёк. Попросите специалиста отправить новую ссылку.':
        'This link is unavailable or expired. Please ask your practitioner for a new link.')}</p>}
  </main>
}
