'use client'
import {useState} from 'react'
import {BookmarkCheck,LockKeyhole,ShieldCheck} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './client-session.module.css'

// Explicit, per-session consent. This button never binds the whole Client
// profile, never puts a private invitation token into an OAuth redirect.
export function SaveClientSessionToAccount({locale='en',selector,sessionId=null,appAvailable=true}){
  const ru=locale==='ru'
  const [consent,setConsent]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  async function save(){
    if(busy||!consent||!appAvailable)return
    setBusy(true);setError('')
    try{
      const value=await appFetch('save-intents',{
        sourceKind:'client_session',selector,
        ...(sessionId?{sourceId:sessionId}:{}),operationId:crypto.randomUUID()
      })
      // All client-session imports REQUIRE a second, account-specific approval
      // after sign-in; never set auto=1 for an already signed-in visitor.
      if(value.signedIn){
        window.location.assign('/'+locale+'/app/continue?intent='+encodeURIComponent(value.id))
      }else{
        const auth=await appFetch('auth/start',{locale,intentId:value.id})
        window.location.assign(auth.redirectUrl)
      }
    }catch(e){
      setError(e?.code==='SESSION_UNAVAILABLE'||e?.code==='SESSION_CHANGED'
        ? ru?'Ссылка или версия консультации больше недоступна. Попросите новую ссылку.':'This consultation or its version is unavailable. Request an updated invitation.'
        : ru?'Не удалось начать сохранение. Попробуйте ещё раз.':'Could not start saving. Please retry.')
      setBusy(false)
    }
  }
  return <section className={styles.saveSessionBox} aria-label={ru?'Сохранение этой консультации':'Save this consultation'}>
    <div className={styles.saveSessionHeading}>
      <BookmarkCheck size={24} aria-hidden="true"/>
      <div><h2>{ru?'Сохранить эту консультацию':'Save this consultation'}</h2>
        <p>{ru?'Добавьте именно эту страницу с назначениями, записями и материалами в раздел «Мои отчёты».':
          'Keep this session’s report, audio and materials under My Reports in your Google Cabinet.'}</p></div>
    </div>
    <label className={styles.saveSessionConsent}>
      <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
      <span>{ru?'Я хочу сохранить только эту консультацию в выбранном мной Google-аккаунте. Понимаю, что другие сессии не добавятся автоматически.':
        'I want to save only this consultation to my chosen Google Account. Other sessions will not be added automatically.'}</span>
    </label>
    <button type="button" className={styles.saveSessionButton} disabled={!consent||busy||!appAvailable} onClick={save}>
      <BookmarkCheck size={19} aria-hidden="true"/>
      {busy?(ru?'Открываем подтверждение…':'Opening confirmation…'):
        ru?'Сохранить в мой кабинет через Google':'Save in my Google Cabinet'}
    </button>
    <p className={styles.saveSessionPrivacy}><ShieldCheck size={15} aria-hidden="true"/>
      {ru?'После Google-входа вы подтвердите сохранение в конкретный аккаунт. Эта ссылка сама по себе не открывает остальные консультации.':
        'After Google sign-in, confirm the selected account. This link does not unlock other consultations.'}</p>
    {error&&<p role="alert" className={styles.saveSessionError}>{error}</p>}
    {!appAvailable&&<p className={styles.saveSessionError}>{ru?'Google-кабинет временно недоступен.':'Google Cabinet is temporarily unavailable.'}</p>}
  </section>
}
