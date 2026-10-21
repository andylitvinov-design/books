'use client'
import {useEffect,useRef,useState} from 'react'
import {onPwaInstallPrompt,requestPwaInstallation} from '@/lib/pwa/install-prompt'
import styles from './post-signup-install-offer.module.css'

const COPY={
  en:{
    eyebrow:'HOLISTIC HOUSE · MOBILE',
    title:'Holistic House, right on your phone',
    intro:'Keep your private messages, courses and personal reports within easy reach.',
    saved:'Saved to your Cabinet. Your material will open as soon as you continue.',
    install:'Install Holistic House',
    later:'I’ll do this later',
    close:'Close installation offer',
    guidance:'How to add it to your Home Screen',
    ios:'In Safari, tap Share, then Add to Home Screen. Open the new Holistic House icon to use it as an app.',
    android:'In Chrome, tap the browser menu and choose Install app or Add to Home screen.',
    browser:'If you opened this page inside another app, copy the link and open it in Safari or Chrome first.',
    copy:'Copy installation link',
    copied:'Link copied. Open it in your phone browser.',
    privacy:'Alerts for private messages are optional and can be enabled separately in Settings. Message content is never displayed in a notification.',
    cta:'View full instructions',
    miniMessage:'New message',
    miniCourse:'My courses',
    miniReports:'My reports',
  },
  ru:{
    eyebrow:'HOLISTIC HOUSE · НА ТЕЛЕФОН',
    title:'Holistic House всегда под рукой',
    intro:'Личные сообщения, курсы и отчёты — прямо с главного экрана вашего телефона.',
    saved:'Сохранено в вашем кабинете. После этого предложения откроется ваш материал.',
    install:'Установить Holistic House',
    later:'Я сделаю это позже',
    close:'Закрыть предложение установки',
    guidance:'Как добавить на главный экран',
    ios:'В Safari нажмите «Поделиться», затем «На экран Домой». Откройте Holistic House с новой иконки.',
    android:'В Chrome откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».',
    browser:'Если вы открыли сайт внутри другого приложения, скопируйте ссылку и откройте её в Safari или Chrome.',
    copy:'Скопировать ссылку установки',
    copied:'Ссылка скопирована. Откройте её в браузере телефона.',
    privacy:'Уведомления о личных сообщениях включаются отдельно в настройках. Текст переписки в уведомления не передаётся.',
    cta:'Полная инструкция',
    miniMessage:'Новое сообщение',
    miniCourse:'Мои курсы',
    miniReports:'Мои отчёты',
  }
}
const mobileDevice=()=>{
  if(typeof window==='undefined')return {mobile:false,installed:false,ios:false}
  const ua=navigator.userAgent||''
  const ios=/iPhone|iPad|iPod/i.test(ua)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
  const mobile=ios||/Android/i.test(ua)
  const installed=window.matchMedia('(display-mode: standalone)').matches||
    navigator.standalone===true||
    window.Capacitor?.isNativePlatform?.()===true
  return {mobile,installed,ios}
}
export function isPostSignupInstallEligible(){
  const {mobile,installed}=mobileDevice()
  return mobile&&!installed
}
export default function PostSignupInstallOffer({locale='en',visible=false,onDismiss,context='signup'}){
  const t=COPY[locale]||COPY.en
  const [device,setDevice]=useState({mobile:false,installed:false,ios:false})
  const [prompt,setPrompt]=useState(null)
  const [instructions,setInstructions]=useState(false)
  const [copyDone,setCopyDone]=useState(false)
  const [working,setWorking]=useState(false)
  const layer=useRef(null)
  const close=useRef(null)
  const offerVisible=useRef(false)
  close.current=onDismiss
  offerVisible.current=visible
  useEffect(()=>{
    setDevice(mobileDevice())
    const unsubscribe=onPwaInstallPrompt(setPrompt)
    const installed=()=>{
      const updated=mobileDevice()
      setDevice(updated)
      if(offerVisible.current&&updated.installed)close.current?.()
    }
    window.addEventListener('appinstalled',installed)
    return ()=>{
      unsubscribe()
      window.removeEventListener('appinstalled',installed)
    }
  },[])
  const show=visible&&device.mobile&&!device.installed
  useEffect(()=>{
    if(!show)return undefined
    const element=layer.current
    const previous=document.activeElement
    const originalOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    element?.querySelector('[data-close-install]')?.focus()
    function handleKey(event){
      if(event.key==='Escape'){
        event.preventDefault()
        close.current?.()
      }
      if(event.key!=='Tab')return
      const items=[...(element?.querySelectorAll('button:not(:disabled),a[href]')||[])]
        .filter(node=>node.getClientRects().length)
      if(!items.length){event.preventDefault();return}
      const first=items[0],last=items[items.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',handleKey)
    return ()=>{
      document.body.style.overflow=originalOverflow
      document.removeEventListener('keydown',handleKey)
      if(previous instanceof HTMLElement&&document.contains(previous))previous.focus()
    }
  },[show])
  async function primary(){
    if(working)return
    if(prompt){
      setWorking(true)
      const result=await requestPwaInstallation()
      setWorking(false)
      if(result.accepted){close.current?.();return}
    }
    setInstructions(true)
  }
  async function copyLink(){
    try{
      await navigator.clipboard.writeText(location.origin+'/'+(locale==='ru'?'ru':'en')+'/install')
      setCopyDone(true)
    }catch{setCopyDone(false)}
  }
  if(!show)return null
  return <div className={styles.backdrop} data-post-signup-install>
    <section ref={layer} role="dialog" aria-modal="true" aria-labelledby="hh-install-offer-title" aria-describedby="hh-install-offer-description" className={styles.sheet}>
      <button type="button" data-close-install aria-label={t.close} className={styles.close} onClick={()=>onDismiss?.()}>
        <span aria-hidden="true">×</span>
      </button>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="hh-install-offer-title">{t.title}</h2>
        <p id="hh-install-offer-description" className={styles.intro}>{t.intro}</p>
        {context==='saved'&&<p className={styles.saved} role="status">✓ {t.saved}</p>}
        <div className={styles.art} aria-hidden="true">
          <div className={styles.orbit}/>
          <div className={styles.phone}>
            <div className={styles.phoneTop}><span className={styles.hhIcon}>HH</span><span className={styles.dot}/></div>
            <div className={styles.phoneHeading}>Holistic House</div>
            <div className={styles.phoneRow}><span className={styles.bubble}>✉</span><span>{t.miniMessage}</span></div>
            <div className={styles.phoneRow}><span className={styles.bubble}>✦</span><span>{t.miniCourse}</span></div>
            <div className={styles.phoneRow}><span className={styles.bubble}>◈</span><span>{t.miniReports}</span></div>
            <div className={styles.phoneBar}/>
          </div>
          <div className={styles.leafA}/>
          <div className={styles.leafB}/>
        </div>
        <button type="button" className={styles.primary} disabled={working} onClick={primary}>
          {working?'…':t.install}
        </button>
        {instructions&&<div className={styles.instructions} role="status">
          <strong>{t.guidance}</strong>
          <p>{device.ios?t.ios:t.android}</p>
          <p>{t.browser}</p>
          <button type="button" className={styles.copy} onClick={copyLink}>{t.copy}</button>
          {copyDone&&<p className={styles.copied}>{t.copied}</p>}
        </div>}
        <button type="button" className={styles.later} onClick={()=>onDismiss?.()}>{t.later}</button>
        <a className={styles.guide} href={'/'+(locale==='ru'?'ru':'en')+'/install'}>{t.cta} →</a>
        <p className={styles.privacy}>{t.privacy}</p>
      </div>
    </section>
  </div>
}
