'use client'
import {useEffect,useRef} from 'react'
import {MessageCircle} from 'lucide-react'
import {expressCopy} from '@/lib/coaching/coach-express-intro.mjs'
import styles from './my-coach-express-intro.module.css'

// Caller must pass true only after the dedicated server grant is ready.
// No demo or course fallback is permitted.
export function CoachExpressButton({locale,available=false,busy=false,onStart}){
  if(!available||typeof onStart!=='function')return null
  return <button type="button" className={styles.badge} disabled={busy} onClick={onStart} data-coach-express-start>
    <MessageCircle size={17} aria-hidden="true"/>{expressCopy(locale).button}
  </button>
}
export function CoachExpressCompletion({locale,completed=false,onStartCourse,onChooseCoach}){
  const dialog=useRef(null)
  const copy=expressCopy(locale)
  useEffect(()=>{
    const node=dialog.current
    if(!node)return
    if(completed&&!node.open)node.showModal()
    if(!completed&&node.open)node.close()
  },[completed])
  return <dialog ref={dialog} className={styles.dialog} aria-label={copy.title} data-coach-express-completion>
    <h2>{copy.title}</h2>
    <p>{copy.ended}</p>
    <button type="button" className={styles.primary} onClick={onStartCourse}>{copy.start}</button>
    <button type="button" className={styles.secondary} onClick={onChooseCoach}>{copy.other}</button>
  </dialog>
}
