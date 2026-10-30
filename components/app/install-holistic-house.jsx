'use client'
import {useEffect,useState} from 'react'
import {onPwaInstallPrompt,requestPwaInstallation} from '@/lib/pwa/install-prompt'

// The free public install is the SAME first-party Holistic House PWA, not an
// unsigned test APK or a new app. The browser owns the actual install action.
const COPY={
  en:{
    title:'Holistic House on your phone',subtitle:'A free Home Screen app for your private messages, reports, tests and courses.',
    install:'Install for free',iosHelp:'Copy link for Safari',androidHelp:'How to install in Chrome',desktopButton:'Copy free installation link',iosGuide:'iPhone: install in Safari in three steps',iosSteps:['If you are inside ChatGPT, tap the compass icon to open this page in Safari. Otherwise open holistichouse.vercel.app/en/install in Safari.','In Safari tap Share (the square with an upward arrow).','Choose Add to Home Screen → Add. Open the new Holistic House icon to access Messages.'],
    ios:'In Safari: tap Share → Add to Home Screen. Then open the new Holistic House icon.',
    android:'In Chrome: open the browser menu ⋮ → Install app or Add to Home screen.',
    desktop:'Open this page on your phone in Safari or Chrome to install the free app.',
    browser:'If this page is inside another app, open the copied link in Safari or Chrome.',
    guide:'Installation steps',link:'Full installation guide',
    copy:'Copy link',copied:'Link copied — open it on your phone.',
    copyFailed:'Copy is unavailable. Open holistichouse.vercel.app/en/install on your phone.',
    accepted:'The browser accepted the request. Finish installation there; the new icon confirms it.',
    installed:'Holistic House is already running as an installed app.',open:'Open messages',
    privacy:'Free to install. Some consultations and courses are paid separately. A connection is required for private messages.'
  },
  ru:{
    title:'Holistic House на телефоне',subtitle:'Бесплатное приложение на главный экран: сообщения, отчёты, тесты и курсы.',
    install:'Установить бесплатно',iosHelp:'Скопировать ссылку для Safari',androidHelp:'Как установить через Chrome',desktopButton:'Скопировать ссылку для установки',iosGuide:'Как установить на iPhone — 3 шага',iosSteps:['Если страница открыта внутри ChatGPT, нажмите значок компаса внизу, чтобы перейти в Safari. Или откройте holistichouse.vercel.app/ru/install прямо в Safari.','В Safari нажмите «Поделиться» (квадрат со стрелкой вверх).','Выберите «На экран Домой» → «Добавить». Откройте Holistic House с новой иконки.'],
    ios:'В Safari: нажмите «Поделиться» → На экран «Домой». Затем откройте новую иконку Holistic House.',
    android:'В Chrome: меню ⋮ → «Установить приложение» или «Добавить на главный экран».',
    desktop:'Откройте эту страницу в Safari или Chrome на телефоне и установите приложение бесплатно.',
    browser:'Если ссылка открыта внутри другого приложения, перенесите её в Safari или Chrome.',
    guide:'Как установить',link:'Полная инструкция по установке',
    copy:'Скопировать ссылку',copied:'Ссылка скопирована — откройте её на телефоне.',
    copyFailed:'Скопируйте адрес holistichouse.vercel.app/ru/install и откройте на телефоне.',
    accepted:'Браузер принял запрос. Завершите установку; новая иконка подтвердит её.',
    installed:'Holistic House уже открыто как установленное приложение.',open:'Открыть сообщения',
    privacy:'Установка бесплатна. Некоторые консультации и курсы платные. Для личной переписки нужен интернет.'
  },
  es:{
    title:'Holistic House en tu teléfono',subtitle:'Aplicación gratuita en la pantalla de inicio para mensajes, informes, pruebas y cursos.',
    install:'Instalar gratis',iosHelp:'Copiar enlace para Safari',androidHelp:'Cómo instalar desde Chrome',desktopButton:'Copiar enlace de instalación gratuita',iosGuide:'iPhone: instalación en Safari en 3 pasos',iosSteps:['Si esta página está dentro de ChatGPT, pulsa el icono de la brújula para abrirla en Safari, o abre holistichouse.vercel.app/es/install en Safari.','En Safari toca Compartir (cuadrado con flecha hacia arriba).','Selecciona Añadir a la pantalla de inicio → Añadir. Abre Holistic House desde su icono.'],
    ios:'En Safari: toca Compartir → Añadir a la pantalla de inicio. Abre Holistic House desde su nuevo icono.',
    android:'En Chrome: abre el menú ⋮ → Instalar aplicación o Añadir a la pantalla de inicio.',
    desktop:'Abre esta página en Safari o Chrome en tu teléfono para instalar la aplicación gratis.',
    browser:'Si estás en el navegador de otra aplicación, abre el enlace en Safari o Chrome.',
    guide:'Cómo instalar',link:'Instrucciones completas',
    copy:'Copiar enlace',copied:'Enlace copiado — ábrelo en tu teléfono.',
    copyFailed:'Abre holistichouse.vercel.app/es/install en tu teléfono.',
    accepted:'El navegador aceptó la solicitud. Completa la instalación allí; el icono nuevo la confirma.',
    installed:'Holistic House ya está abierto como aplicación instalada.',open:'Abrir mensajes',
    privacy:'Instalar es gratis. Algunas consultas y cursos se pagan por separado. Los mensajes privados requieren internet.'
  }
}
export default function InstallHolisticHouse({locale='en',showGuideLink=true,landing=false}){
  const c=COPY[locale]||COPY.en
  const [standalone,setStandalone]=useState(null)
  const [ios,setIos]=useState(false)
  const [android,setAndroid]=useState(false)
  const [offer,setOffer]=useState(false)
  const [installing,setInstalling]=useState(false)
  const [instructions,setInstructions]=useState(false)
  const [accepted,setAccepted]=useState(false)
  const [copyResult,setCopyResult]=useState(null)
  useEffect(()=>{
    const installed=()=>window.matchMedia('(display-mode: standalone)').matches||
      navigator.standalone===true||window.Capacitor?.isNativePlatform?.()===true
    setStandalone(installed())
    const ua=navigator.userAgent||''
    setIos(/iPhone|iPad|iPod/i.test(ua)||
      (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))
    setAndroid(/Android/i.test(ua))
    // The beforeinstallprompt event may fire before login; reuse the global
    // capture instead of registering a second browser listener here.
    const unsubscribe=onPwaInstallPrompt(event=>setOffer(Boolean(event)))
    const completed=()=>{setStandalone(true);setOffer(false);setAccepted(false)}
    window.addEventListener('appinstalled',completed)
    return ()=>{
      unsubscribe()
      window.removeEventListener('appinstalled',completed)
    }
  },[])
  async function copyLink(){
    try{
      await navigator.clipboard.writeText('https://holistichouse.vercel.app/'+locale+'/install')
      setCopyResult('ok')
    }catch{setCopyResult('error')}
  }
  async function install(){
    if(installing)return
    if(!ios&&!android){await copyLink();return}
    if(ios){await copyLink();setInstructions(true);return}
    if(!offer){setInstructions(true);return}
    setInstalling(true)
    try{
      const result=await requestPwaInstallation()
      if(result.accepted) setAccepted(true) // NOT proof of actual installation
      else setInstructions(true)
    }finally{setInstalling(false)}
  }
  if(standalone===null||standalone===true&&!landing)return null
  return <section className="hh-panel hh-section" aria-label={c.title} data-hh-install data-hh-free-install>
    <h2>{landing?c.guide:c.title}</h2><p>{c.subtitle}</p>
    {standalone===true?
      <><p role="status">{c.installed}</p><a className="hh-primary" href={'/'+locale+'/app/messages'}>{c.open}</a></>:
      <>
        <button type="button" className="hh-primary" disabled={installing} onClick={install} data-hh-install-action>
          {installing?'…':ios?c.iosHelp:!android?c.desktopButton:!offer?c.androidHelp:c.install}
        </button>
        {ios&&<div data-hh-ios-quicksteps aria-label={c.iosGuide}>
          <strong>{c.iosGuide}</strong>
          <ol>{c.iosSteps.map((step,i)=><li key={i}>{step}</li>)}</ol>
        </div>}
        {accepted&&<p role="status" data-hh-install-accepted>{c.accepted}</p>}
        <p className="hh-fine">{ios?c.ios:android?c.android:c.desktop}</p>
        {instructions&&<div role="status" data-hh-install-guidance>
          <strong>{c.guide}</strong>
          <p>{ios?c.ios:android?c.android:c.desktop}</p>
          <p>{c.browser}</p>
          <button type="button" onClick={copyLink}>{c.copy}</button>
        </div>}
        {copyResult&&<p role="status" data-hh-copy-status>{copyResult==='ok'?c.copied:c.copyFailed}</p>}
      </>}
    {showGuideLink&&<a href={'/'+locale+'/install'}>{c.link} →</a>}
    {landing&&<p className="hh-fine" data-hh-install-privacy>{c.privacy}</p>}
  </section>
}
