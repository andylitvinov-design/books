'use client'
import {ArrowRight,Mic} from 'lucide-react'
import {coachSessionHref} from '@/lib/coaching/persona-registry.mjs'
import {ReikiJoinDialog} from './reiki-join-dialog'
import {useGooglePageAction} from './use-google-page-action'
import styles from './my-coach-express-start.module.css'

const COPY={
 en:{talk:'Talk now with Mira',checking:'Checking your account…',error:'Could not continue. Please try again.'},
 ru:{talk:'Поговорить с Мирой',checking:'Проверяем вход…',error:'Не удалось продолжить. Попробуйте ещё раз.'},
 es:{talk:'Hablar ahora con Mira',checking:'Verificando tu cuenta…',error:'No pudimos continuar. Inténtalo de nuevo.'},
}
export default function MyCoachExpressStart({locale='en',embedded=false,href,children,className,...buttonProps}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang]
 const target=href||coachSessionHref(lang,'mira')
 const {busy,error,open,begin,signIn,dismiss}=useGooglePageAction({
  locale:lang,continuation:'my-coach-action',kind:'coach-link',
  onAuthorized:action=>window.location.assign(action.href),
 })
 function start(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
  event.preventDefault()
  if(!busy)void begin({href:target})
 }
 return <>
  {className!==undefined?<a {...buttonProps} className={className||undefined} href={target} onClick={start} aria-busy={busy}>{children}</a>:
   <div className={embedded?`${styles.actionWrap} ${styles.embeddedWrap}`:styles.actionWrap} data-my-coach-mira-quick-start>
    <button type="button" className={styles.talkButton} {...buttonProps} onClick={()=>void begin({href:target})} disabled={busy} data-my-coach-mira-talk>
     <span className={styles.portrait} aria-hidden="true"/><Mic size={19} aria-hidden="true"/><span>{busy?t.checking:t.talk}</span><ArrowRight size={20} aria-hidden="true"/>
    </button>
   </div>}
  {error&&!open&&<p role="alert" className={styles.inlineError}>{t.error}</p>}
  {open&&<ReikiJoinDialog mode="coach" locale={lang} busy={busy} error={error?t.error:''} onGoogle={()=>void signIn()} onDismiss={dismiss}/>}
 </>
}
