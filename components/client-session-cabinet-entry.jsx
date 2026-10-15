'use client'

import {useState} from 'react'
import {BookOpen,ClipboardList,FolderOpen,House,LogIn,ShieldCheck,ChevronRight} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './client-session.module.css'

// These are fixed, public cabinet destinations. Never send a private session
// selector, fragment, token, prescription id or arbitrary return URL to OAuth.
const sections={
  cabinet:{path:'portrait', icon:House},
  'my-tests':{path:'tests',icon:ClipboardList},
  'my-courses':{path:'course',icon:BookOpen},
  reports:{path:'portrait#personal-reports',icon:FolderOpen}
}

export function ClientSessionCabinetEntry({locale='en',variant='header',appAvailable=true}) {
  const ru=locale==='ru'
  const [busy,setBusy]=useState(null)
  const [error,setError]=useState('')
  const base='/'+locale+'/app'
  const navigate=async(kind)=>{
    if(busy||!sections[kind])return
    if(!appAvailable) {
      setError(ru?'Личный кабинет временно недоступен. Материалы текущей консультации остаются на этой странице.':
        'The Google Cabinet is temporarily unavailable. You can still read this session here.')
      return
    }
    setError('');setBusy(kind)
    try {
      // A verified Google account goes straight to its own Cabinet. A guest
      // has NO access to any account data or other sessions through this link.
      try {
        await appFetch('bootstrap')
        window.location.assign(base+'/'+sections[kind].path)
        return
      } catch (e) {
        if(e?.status!==401)throw e
      }
      const auth=await appFetch('auth/start',{locale,continueTo:kind})
      const destination=new URL(auth.redirectUrl)
      if(destination.protocol!=='https:' || !destination.hostname)
        throw new Error('SIGN_IN_UNAVAILABLE')
      window.location.assign(destination.href)
    } catch {
      setError(ru?'Не удалось начать вход через Google. Попробуйте ещё раз.':
        'Google sign-in could not start. Please try again.')
      setBusy(null)
    }
  }
  if(variant==='header')return <div className={styles.cabinetHeaderEntry}>
    <button type="button" className={styles.cabinetHeaderButton}
      disabled={Boolean(busy)||!appAvailable} onClick={()=>navigate('cabinet')}>
      <House size={18} aria-hidden="true"/>
      <span>{ru?'Мой кабинет':'My Cabinet'}</span>
      <ChevronRight size={16} aria-hidden="true"/>
    </button>
    {error&&<p role="alert" className={styles.cabinetEntryError}>{error}</p>}
  </div>
  return <section className={styles.cabinetBridge} aria-label={ru?'Вход в личный кабинет':'Personal Cabinet sign-in'}>
    <header className={styles.cabinetBridgeHeading}>
      <span className={styles.cabinetBridgeIcon}><House size={24} aria-hidden="true"/></span>
      <div><span className={styles.sectionKicker}>{ru?'ЛИЧНЫЙ КАБИНЕТ HOLISTIC HOUSE':'HOLISTIC HOUSE PERSONAL CABINET'}</span>
        <h2>{ru?'Все ваши возможности — в одном кабинете':'Your personal space, in one place'}</h2></div>
    </header>
    <p className={styles.cabinetBridgeDescription}>{ru?
      'Войдите через Google, чтобы открыть свои тесты, курсы, профиль и сохранённые отчёты. Если вы уже вошли, кабинет откроется сразу.':
      'Continue with Google to access your tests, courses, profile and saved reports. If already signed in, the Cabinet opens immediately.'}</p>
    <button type="button" className={styles.cabinetBridgePrimary}
      onClick={()=>navigate('cabinet')} disabled={Boolean(busy)||!appAvailable}>
      <LogIn size={19} aria-hidden="true"/>
      {busy==='cabinet'?(ru?'Открываем кабинет…':'Opening your Cabinet…'):
        ru?'Войти в кабинет через Google':'Enter Cabinet with Google'}
      <ChevronRight size={16} aria-hidden="true"/>
    </button>
    <nav className={styles.cabinetBridgeLinks} aria-label={ru?'Разделы кабинета':'Cabinet sections'}>
      {[
        ['my-tests',ru?'Мои тесты':'My tests'],
        ['reports',ru?'Мои отчёты':'My reports'],
        ['my-courses',ru?'Мои курсы':'My courses']
      ].map(([kind,label])=>{
        const Icon=sections[kind].icon
        return <button key={kind} type="button" onClick={()=>navigate(kind)}
          disabled={Boolean(busy)||!appAvailable}>
          <Icon size={18} aria-hidden="true"/><span>{label}</span><ChevronRight size={15} aria-hidden="true"/>
        </button>
      })}
    </nav>
    <p className={styles.cabinetBridgePrivacy}><ShieldCheck size={16} aria-hidden="true"/>
      <span>{ru?
        'Ваш рецепт останется доступен по этой защищённой ссылке. Вход через Google сам по себе не переносит рецепт или другие приватные сессии в аккаунт.':
        'This prescription remains available through its private link. Signing in with Google does not automatically import this consultation or other private sessions into your account.'}</span>
    </p>
    {error&&<p role="alert" className={styles.cabinetEntryError}>{error}</p>}
    {!appAvailable&&<p className={styles.cabinetEntryError}>{ru?'Google-кабинет временно недоступен.':'Google Cabinet is temporarily unavailable.'}</p>}
  </section>
}
