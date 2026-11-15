'use client'
import {useEffect,useRef} from 'react'
import {ArrowRight,LockKeyhole,X} from 'lucide-react'
import styles from './profile-guest-auth-dialog.module.css'
const COPY={
 ru:{title:'Добро пожаловать в Holistic House',detail:'Чтобы сохранить данные и продолжить, войдите или зарегистрируйтесь. Это бесплатно.',google:'Продолжить через Google',telegram:'Продолжить через Telegram',disabled:'Вход через Telegram пока не подключён к аккаунту сайта.',existing:'Уже есть Google-кабинет? Войдите через Google и привяжите Telegram в настройках.',close:'Продолжить просмотр'},
 en:{title:'Welcome to Holistic House',detail:'Sign in or create an account to save and continue. Getting started is free.',google:'Continue with Google',telegram:'Continue with Telegram',disabled:'Telegram sign-in is not yet enabled for this website account.',existing:'Already use Google? Sign in with Google first and link Telegram in Settings.',close:'Keep exploring'},
 es:{title:'Bienvenido a Holistic House',detail:'Entra o crea una cuenta para guardar y continuar. Es gratis empezar.',google:'Continuar con Google',telegram:'Continuar con Telegram',disabled:'El acceso con Telegram aún no está activado en esta cuenta web.',existing:'¿Ya usas Google? Entra primero con Google y vincula Telegram en Ajustes.',close:'Seguir explorando'},
}
export default function ProfileGuestAuthDialog({locale='en',open=false,busy=false,telegramAvailable=false,errorMessage='',onGoogle,onTelegram,onDismiss}){
 const ref=useRef(null)
 const t=COPY[locale]||COPY.en
 useEffect(()=>{
  const node=ref.current
  if(!node)return
  if(open&&!node.open)node.showModal()
  else if(!open&&node.open)node.close()
 },[open])
 return <dialog ref={ref} className={styles.dialog} data-profile-auth-dialog aria-labelledby="profile-guest-auth-title"
   onCancel={event=>{event.preventDefault();if(!busy)onDismiss?.()}}
   onClick={event=>{if(event.target===event.currentTarget&&!busy)onDismiss?.()}}>
   <div className={styles.content}>
     <button type="button" className={styles.x} onClick={onDismiss} disabled={busy} aria-label={locale === 'ru' ? 'Закрыть окно' : locale === 'es' ? 'Cerrar ventana' : 'Close dialog'}><X size={18} aria-hidden="true"/></button>
     <div className={styles.icon}><LockKeyhole size={25} aria-hidden="true"/></div>
     <h2 id="profile-guest-auth-title">{t.title}</h2>
     <p className={styles.intro}>{t.detail}</p>
     {errorMessage&&<p role="alert" className={styles.error}>{errorMessage}</p>}
     <div className={styles.providers}>
       <button type="button" className={styles.google} autoFocus disabled={busy} onClick={onGoogle}>
         {t.google}<ArrowRight size={18} aria-hidden="true"/>
       </button>
       <button type="button" className={styles.telegram} data-telegram-auth="login"
         disabled={busy||!telegramAvailable} onClick={onTelegram}>
         {t.telegram}<ArrowRight size={18} aria-hidden="true"/>
       </button>
     </div>
     <p className={styles.note}>{telegramAvailable?t.existing:t.disabled}</p>
     <button type="button" className={styles.close} onClick={onDismiss} disabled={busy}>{t.close}</button>
   </div>
 </dialog>
}
