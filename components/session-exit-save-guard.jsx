'use client'

import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react'
import {BookmarkCheck,House,LockKeyhole,ShieldCheck,X} from 'lucide-react'
import {SESSION_SAVE_COPY} from './save-client-session-to-account'
import {appFetch} from '@/lib/app/client-fetch'
import {rememberSessionSaveTarget,safeSessionExitTarget,sessionExitActionTarget} from '@/lib/app/session-exit-navigation'
import styles from './client-session.module.css'

const NavigationContext=createContext(null)
export const useSessionExitNavigation=()=>useContext(NavigationContext)

// While the secure session page is mounted, intercept same-tab links to other
// FIRST-PARTY pages, including the site's global header outside this component.
// No browser can promise a custom confirmation on tab close/OS shutdown.
export function SessionExitSaveGuard({children,locale='en',selector,sessionId=null,cabinetMode=false,appAvailable=true}) {
  const ru=locale==='ru'
  const saveCopy=SESSION_SAVE_COPY[locale]||SESSION_SAVE_COPY.en
  const [pending,setPending]=useState(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [savedSessionId,setSavedSessionId]=useState(null)
  const agreeRef=useRef(null),priorFocus=useRef(null)

  // A bootstrap row only proves that this Google Account saved the session
  // in the past. The practitioner may since have republished or withdrawn it.
  // Verify the exact current revision before skipping consent on navigation.
  // The status endpoint is account-scoped and never marks the report opened.
  useEffect(()=>{
    if(!appAvailable||!sessionId){setSavedSessionId(null);return}
    let live=true
    setSavedSessionId(null)
    async function checkCurrentSave(){
      try{
        const data=await appFetch('bootstrap')
        const found=(data.savedSessions||[]).find(item=>
          item.sourceSessionId===sessionId && item.available!==false)
        if(!found){if(live)setSavedSessionId(null);return}
        const checked=await appFetch('saved-sessions/'+found.id+'/status')
        if(live)setSavedSessionId(checked?.available===true && checked?.id===found.id?found.id:null)
      }catch{if(live)setSavedSessionId(null)}
    }
    void checkCurrentSave()
    return()=>{live=false}
  },[sessionId,appAvailable])

  const ask=useCallback((next=null)=>{
    if(!appAvailable){
      if(next)window.location.assign(next)
      return
    }
    if(savedSessionId){
      window.location.assign(next||'/'+locale+'/app/sessions/'+savedSessionId)
      return
    }
    const target=next?safeSessionExitTarget(next,window.location.origin,window.location.href):null
    // Same-page hash navigation must remain native and instant.
    if(next&&!target){window.location.assign(next);return}
    setError('')
    setPending({next:target})
  },[appAvailable,savedSessionId,locale])
  const requestExit=useCallback(url=>ask(url),[ask])
  const requestSave=useCallback(()=>ask(),[ask])
  const close=useCallback(()=>{
    if(busy)return
    setPending(null)
  },[busy])

  useEffect(()=>{
    if(!appAvailable||savedSessionId)return
    function intercept(event){
      if(event.defaultPrevented || event.button!==0 ||
        event.metaKey||event.ctrlKey||event.shiftKey||event.altKey ||
        pending) return
      const link=event.target?.closest?.('a[href]')
      if(!link||link.closest('[data-hh-session-save-modal]')||
        link.hasAttribute('download')||
        (link.target&&link.target!=='_self'))return
      const route=sessionExitActionTarget(link.href,window.location.origin,window.location.href)
      if(!route)return
      event.preventDefault()
      event.stopImmediatePropagation()
      setError('')
      setPending({next:route.afterSave,skipTo:route.withoutSave})
    }
    document.addEventListener('click',intercept,true)
    return ()=>document.removeEventListener('click',intercept,true)
  },[appAvailable,savedSessionId,pending])

  useEffect(()=>{
    if(!pending)return
    priorFocus.current=document.activeElement
    const oldOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    agreeRef.current?.focus()
    return ()=>{
      document.body.style.overflow=oldOverflow
      if(priorFocus.current?.isConnected)priorFocus.current.focus()
    }
  },[pending])

  function modalKey(event){
    if(event.key==='Escape'){event.preventDefault();close();return}
    if(event.key!=='Tab')return
    const controls=[...event.currentTarget.querySelectorAll('button:not([disabled])')]
    const first=controls[0],last=controls.at(-1)
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }

  function continueWithoutSaving(){
    if(busy)return
    const target=pending?.skipTo||pending?.next
    setPending(null)
    if(target)window.location.assign(target)
  }
  async function confirmAndSave(){
    if(busy||!appAvailable)return
    setBusy(true);setError('')
    try{
      // Consent occurs here before the browser-proven 15-minute save intent.
      // OAuth never receives the guest selector, secret or medical details.
      const intent=await appFetch('save-intents',{
        sourceKind:'client_session',selector,
        ...(cabinetMode&&sessionId?{sourceId:sessionId}:{}),
        operationId:crypto.randomUUID()
      })
      if(pending?.next){
        rememberSessionSaveTarget(intent.id,pending.next,window.location.origin,
          window.sessionStorage)
      }
      if(intent.signedIn){
        window.location.assign('/'+locale+'/app/continue?intent='+encodeURIComponent(intent.id)+'&auto=1')
      }else{
        const auth=await appFetch('auth/start',{locale,intentId:intent.id})
        const url=new URL(auth.redirectUrl)
        if(url.protocol!=='https:'||!url.hostname)throw new Error('SIGN_IN_UNAVAILABLE')
        window.location.assign(url.href)
      }
    }catch(err){
      setError(err?.code==='SESSION_UNAVAILABLE'||err?.code==='SESSION_CHANGED'
        ?(ru?'Ссылка или эта версия консультации уже недоступна. Попросите актуальную ссылку.':
          'This consultation has changed or is unavailable. Request a new invitation.')
        :(ru?'Не удалось сохранить консультацию. Попробуйте ещё раз или продолжите без сохранения.':
          'Could not save this consultation. Try again or continue without saving.'))
      setBusy(false)
    }
  }

  return <NavigationContext.Provider value={{requestExit,requestSave,savedSessionId}}>
    {children}
    {pending&&<div className={styles.sessionSaveBackdrop} data-hh-session-save-modal>
      <section className={styles.sessionSaveDialog} role="dialog" aria-modal="true"
        aria-labelledby="hh-session-save-title" aria-describedby="hh-session-save-description"
        onKeyDown={modalKey}>
        <button type="button" className={styles.sessionSaveClose} aria-label={ru?'Закрыть':'Close'}
          onClick={close} disabled={busy}><X size={19}/></button>
        <div className={styles.sessionSaveModalIcon}><BookmarkCheck size={27}/></div>
        <p className={styles.sessionSaveEyebrow}>HOLISTIC HOUSE · {saveCopy.kicker}</p>
        <h2 id="hh-session-save-title">{saveCopy.modalTitle}</h2>
        <p id="hh-session-save-description" className={styles.sessionSaveDescription}>{ru?
          'Вы сможете снова открыть этот отчёт, назначения, аудио и видео в разделе «Мои отчёты» без гостевой ссылки.':
          'Keep this report, recommendations, audio and video under My Reports, accessible through your Google Cabinet.'}</p>
        <div className={styles.sessionSaveModalSafety}><ShieldCheck size={18} aria-hidden="true"/>
          <span>{ru?'Будет сохранена только эта консультация в подтверждённый вами Google-аккаунт. Остальная история клиента не откроется.':
            'Only this consultation will be saved to the Google Account you confirm. Other consultations remain private.'}</span>
        </div>
        {pending.next&&<p className={styles.sessionSaveAfterHint}><House size={16} aria-hidden="true"/>
          {ru?'После сохранения откроется выбранный раздел сайта.':
            'After saving, you will continue to the section you selected.'}</p>}
        <div className={styles.sessionSaveModalActions}>
          <button type="button" ref={agreeRef} className={styles.sessionSaveModalPrimary}
            onClick={confirmAndSave} disabled={busy}>
            <BookmarkCheck size={19} aria-hidden="true"/>
            {busy?(ru?'Подготавливаем сохранение…':'Preparing secure save…'):
              (ru?'Сохранить через Google':'Save with Google')}
          </button>
          {pending.next&&<button type="button" className={styles.sessionSaveModalSecondary}
            onClick={continueWithoutSaving} disabled={busy}>
            {ru?'Продолжить без сохранения':'Continue without saving'}
          </button>}
          <button type="button" className={styles.sessionSaveModalCancel}
            onClick={close} disabled={busy}>{ru?'Остаться на странице':'Stay on this page'}</button>
        </div>
        {error&&<p role="alert" className={styles.saveSessionError}>{error}</p>}
        <p className={styles.sessionSaveModalFootnote}><LockKeyhole size={14}/>
          {ru?'Сохранение происходит только после вашего подтверждения.':
            'Nothing is saved without your confirmation.'}</p>
      </section>
    </div>}
  </NavigationContext.Provider>
}
