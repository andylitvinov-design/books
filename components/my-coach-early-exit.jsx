'use client'
import {useEffect,useRef} from 'react'
import {Clock3,Hourglass,LogOut,UsersRound,X} from 'lucide-react'
import styles from './my-coach-early-exit.module.css'
const copy={
 en:{title:'Leave this session?',subtitle:'Your session is not completed yet.',time:'Session time',min:'min',exit:'Exit',change:'Continue with another coach',close:'Back to session',saved:'Your private draft and elapsed time will be saved. You can choose another coach on the course page. Direct cross-coach resume is not yet available.',unsaved:'Private saving is off. Leaving will not retain this conversation.',error:'Could not confirm the latest private checkpoint. Please retry or return to your session.',saving:'Saving…'},
 ru:{title:'Выйти из сессии?',subtitle:'Ваша сессия ещё не завершена.',time:'Время сессии',min:'мин',exit:'Выйти',change:'Продолжить с другим коучем',close:'Вернуться к сессии',saved:'Черновик и пройденное время сохранятся в профиле. На странице курса можно выбрать другого коуча. Прямое продолжение с другим коучем пока недоступно.',unsaved:'Приватное сохранение выключено. При выходе диалог не сохранится.',error:'Не удалось подтвердить сохранение. Повторите попытку или вернитесь к сессии.',saving:'Сохраняем…'},
 es:{title:'¿Salir de esta sesión?',subtitle:'Tu sesión aún no ha terminado.',time:'Tiempo de sesión',min:'min',exit:'Salir',change:'Continuar con otro coach',close:'Volver a la sesión',saved:'Se guardarán tu borrador privado y el tiempo transcurrido. Puedes elegir otro coach en la página del curso. La continuación directa con otro coach aún no está disponible.',unsaved:'El guardado privado está desactivado. Al salir no se conservará la conversación.',error:'No se pudo confirmar el último guardado. Reintenta o vuelve a la sesión.',saving:'Guardando…'}
}
export default function MyCoachEarlyExit({locale,seconds,saving,error,privateSave,onDismiss,onChoice}){
 const t=copy[locale]||copy.en,dialog=useRef(null)
 useEffect(()=>{const el=dialog.current;if(el&&!el.open)el.showModal();return()=>{if(el?.open)el.close()}},[])
 const value=Math.min(1200,Math.max(0,seconds||0))
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby="coach-exit-title" aria-describedby="coach-exit-description" onCancel={event=>{event.preventDefault();onDismiss()}} data-coach-early-exit>
  <button type="button" className={styles.close} aria-label={t.close} onClick={onDismiss} disabled={saving}><X size={23}/></button>
  <div className={styles.art} aria-hidden="true"><span><Hourglass size={53} strokeWidth={1.45}/></span><i>✧</i><i>✦</i></div>
  <h2 id="coach-exit-title">{t.title}</h2><p className={styles.subtitle} id="coach-exit-description">{t.subtitle}</p>
  <div className={styles.ornament} aria-hidden="true">✧</div>
  <div className={styles.time}><Clock3 size={28} aria-hidden="true"/><div><strong>{t.time}: {Math.floor(value/60)} / 20 {t.min}</strong><progress max={1200} value={value} aria-label={t.time}/></div></div>
  <p className={styles.note}>{privateSave?t.saved:t.unsaved}</p>
  {error&&<p role="alert" className={styles.error}>{t.error}</p>}
  {saving&&<p role="status">{t.saving}</p>}
  <div className={styles.actions}>
   <button type="button" className={styles.exit} onClick={()=>onChoice('exit')} disabled={saving}><LogOut size={26}/>{t.exit}</button>
   <button type="button" className={styles.switch} onClick={()=>onChoice('switch')} disabled={saving}><UsersRound size={27}/>{t.change}</button>
  </div>
 </dialog>
}
