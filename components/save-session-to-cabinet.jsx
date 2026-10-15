'use client'
import {useState} from 'react'
import {BookmarkPlus,LockKeyhole} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './client-session.module.css'

// Explicit item-scoped save request: neither client ID nor full cabinet
// token enters OAuth. A second Account confirmation is required after sign-in.
export function SaveSessionToCabinet({selector,locale='en',appAvailable=true}){
  const ru=locale==='ru'
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function save(){
    if(busy||!appAvailable)return
    setBusy(true);setError('')
    try{
      const intent=await appFetch('save-intents',{
        sourceKind:'client_session',selector,operationId:crypto.randomUUID()
      })
      if(intent.signedIn){
        window.location.assign('/'+locale+'/app/continue?intent='+encodeURIComponent(intent.id))
        return
      }
      const auth=await appFetch('auth/start',{locale,intentId:intent.id})
      const dest=new URL(auth.redirectUrl)
      if(dest.protocol!=='https:'||!dest.hostname)throw new Error('AUTH_UNAVAILABLE')
      window.location.assign(dest.href)
    }catch{
      setError(ru?'Сохранение сейчас недоступно. Проверьте ссылку на сессию или попробуйте позже.':
        'This session cannot be saved right now. Check your invitation or try again later.')
      setBusy(false)
    }
  }
  return <section className={styles.saveSessionCard} aria-label={ru?'Сохранить консультацию':'Save consultation'}>
    <div className={styles.saveSessionCardTitle}>
      <BookmarkPlus size={23} aria-hidden="true"/>
      <div><h2>{ru?'Сохранить эту консультацию':'Save this consultation'}</h2>
        <p>{ru?'Добавить именно эту сессию в «Мои отчёты» Google-кабинета.':
          'Keep this one session in My Reports of your Google Cabinet.'}</p>
      </div>
    </div>
    <button type="button" onClick={save} disabled={!appAvailable||busy} className={styles.saveSessionButton}>
      <BookmarkPlus size={19} aria-hidden="true"/>
      {busy?(ru?'Подготавливаем сохранение…':'Preparing your save…'):
        ru?'Сохранить сессию в Google-кабинет':'Save this session to Google Cabinet'}
    </button>
    <p className={styles.saveSessionPrivacy}><LockKeyhole size={16} aria-hidden="true"/>
      {ru?'После входа вы подтвердите Google-аккаунт и сохранение. Другие сессии не будут переданы.':
       'You will confirm the receiving Google Account. Other consultations will not be imported.'}</p>
    {!appAvailable&&<p role="status">{ru?'Google-кабинет пока недоступен.':'Google Cabinet is temporarily unavailable.'}</p>}
    {error&&<p role="alert" className={styles.cabinetEntryError}>{error}</p>}
  </section>
}
