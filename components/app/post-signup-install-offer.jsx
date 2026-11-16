'use client'
import {useEffect,useRef,useState} from 'react'
import {onPwaInstallPrompt,requestPwaInstallation} from '@/lib/pwa/install-prompt'
import {whatsappEnquiryUrl} from '@/lib/whatsapp-enquiry'
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
    waTitle:'Your Cabinet is ready. Stay in touch on WhatsApp',
    waIntro:'You can ask us about available free bonus materials and personal guidance. Your private Cabinet stays on this website.',
    waAction:'Write to us on WhatsApp',
    waHelp:'WhatsApp opens a prepared message; you choose whether to send it. This is not website sign-in, account linking or a newsletter subscription.',
    waPrivacy:'Do not send test results, medical records or private Cabinet links through WhatsApp. Protected materials remain in your Cabinet.',
    waSkip:'Continue to my Cabinet',
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
    waTitle:'Ваш кабинет готов. Будем на связи в WhatsApp?',
    waIntro:'Напишите нам, чтобы узнать о доступных бонусных материалах и возможности личного общения. Ваши приватные материалы остаются в кабинете.',
    waAction:'Написать нам в WhatsApp',
    waHelp:'Откроется готовое сообщение. Вы сами решаете, отправлять ли его. Это не вход на сайт, не привязка кабинета и не подписка на рассылку.',
    waPrivacy:'Не отправляйте в WhatsApp результаты тестов, медицинские документы и приватные ссылки. Личные материалы остаются в защищённом кабинете.',
    waSkip:'Продолжить в мой кабинет',
  },
  es:{
    eyebrow:'HOLISTIC HOUSE · EN TU MÓVIL',title:'Holistic House a mano',
    intro:'Tus mensajes privados, cursos e informes siempre a mano.',
    saved:'Guardado en tu gabinete. Después podrás abrir tu material.',
    install:'Instalar Holistic House',later:'Lo haré más tarde',
    close:'Cerrar invitación',guidance:'Añadir a la pantalla de inicio',
    ios:'En Safari, toca Compartir y luego Añadir a inicio.',
    android:'En Chrome, abre el menú y elige Instalar aplicación.',
    browser:'Abre el enlace en Safari o Chrome si estás dentro de otra aplicación.',
    copy:'Copiar enlace',copied:'Enlace copiado. Ábrelo en el navegador.',
    privacy:'Los avisos privados son opcionales y se activan por separado.',
    cta:'Ver instrucciones',miniMessage:'Nuevo mensaje',miniCourse:'Mis cursos',
    miniReports:'Mis informes',waTitle:'Tu gabinete está listo. ¿Hablamos por WhatsApp?',
    waIntro:'Pregunta por los materiales gratuitos disponibles y las respuestas personales. Tu contenido privado permanece en el gabinete.',
    waAction:'Escribirnos por WhatsApp',
    waHelp:'Se abrirá un mensaje preparado; tú decides si enviarlo. Esto no inicia sesión, no vincula cuentas ni te suscribe a publicidad.',
    waPrivacy:'No envíes resultados de pruebas, informes médicos ni enlaces privados por WhatsApp.',
    waSkip:'Continuar a mi gabinete',
  }
}
const WHATSAPP_DRAFT={
  en:{service:'Holistic House',request:'I created my private Cabinet. Please tell me which optional free bonus materials and personal replies are available via WhatsApp. I am not subscribing to marketing.'},
  ru:{service:'Holistic House',request:'Я создал(а) личный кабинет. Подскажите, какие бесплатные бонусные материалы и личные ответы можно получить через WhatsApp. Это не согласие на рекламную рассылку.'},
  es:{service:'Holistic House',request:'He creado mi gabinete privado. ¿Qué materiales gratuitos opcionales y respuestas personales puedo recibir por WhatsApp? No me suscribo a publicidad.'},
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
  useEffect(()=>{offerVisible.current=visible},[visible])
  useEffect(()=>{
    setDevice(mobileDevice())
    const unsubscribe=onPwaInstallPrompt(setPrompt)
    const installed=()=>{
      // The appinstalled event itself is proof: the original browser tab
      // may remain non-standalone even after the PWA was installed.
      setDevice({...mobileDevice(),installed:true})
      if(offerVisible.current)close.current?.()
    }
    window.addEventListener('appinstalled',installed)
    return ()=>{
      unsubscribe()
      window.removeEventListener('appinstalled',installed)
    }
  },[])
  // A one-time invitation follows only a server-confirmed NEW account onboarding.
  // PWA installation remains optional/mobile-only; never mount two stacked dialogs.
  const showWhatsApp=visible&&(context==='signup'||context==='saved')
  const showInstall=visible&&device.mobile&&!device.installed
  const show=showWhatsApp||showInstall
  const waDraft=WHATSAPP_DRAFT[locale]||WHATSAPP_DRAFT.en
  // Manual, user-confirmed wa.me handoff; NO account token, phone, report or
  // other private data is included and NO CRM/Meta opt-in is inferred.
  const whatsappUrl=whatsappEnquiryUrl({locale,...waDraft})
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
      <button type="button" data-close-install aria-label={showWhatsApp?t.waSkip:t.close} className={styles.close} onClick={()=>onDismiss?.()}>
        <span aria-hidden="true">×</span>
      </button>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="hh-install-offer-title">{showWhatsApp?t.waTitle:t.title}</h2>
        <p id="hh-install-offer-description" className={styles.intro}>{showWhatsApp?t.waIntro:t.intro}</p>
        {context==='saved'&&<p className={styles.saved} role="status">✓ {t.saved}</p>}
        {showWhatsApp&&<div className={styles.whatsappCard} data-hh-post-google-whatsapp-invite>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer nofollow"
             referrerPolicy="no-referrer" className={styles.whatsappAction}
             data-hh-post-signup-whatsapp-contact>{t.waAction}</a>
          <p className={styles.whatsappHelp}>{t.waHelp}</p>
        </div>}
        {showInstall&&<>
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
        </>}
        <button type="button" className={styles.later} onClick={()=>onDismiss?.()}>
          {showWhatsApp?t.waSkip:t.later}
        </button>
        {showInstall&&context!=='saved'&&<a className={styles.guide} href={'/'+(locale==='ru'?'ru':'en')+'/install'}>{t.cta} →</a>}
        <p className={styles.privacy}>{showWhatsApp?t.waPrivacy:t.privacy}</p>
      </div>
    </section>
  </div>
}
