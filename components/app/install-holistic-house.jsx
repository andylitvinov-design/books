'use client'
import {useEffect,useState} from 'react'

// A real install prompt is available only in browsers that fired
// beforeinstallprompt; on iOS the user must use the native Share sheet.
const COPY={
  en:{title:'Holistic House on your phone',ios:'In Safari: tap Share → Add to Home Screen. Open Holistic House from its new icon, then allow notifications in Settings.',android:'In Chrome: open the browser menu → Install app or Add to Home screen. Then open the app and enable notifications.',install:'Install Holistic House',subtitle:'Get private-message notifications directly on your phone.'},
  ru:{title:'Holistic House на телефоне',ios:'В Safari: Поделиться → На экран «Домой». Откройте Holistic House с появившейся иконки и включите уведомления в настройках.',android:'В Chrome: меню ⋮ → Установить приложение или Добавить на главный экран. Затем откройте приложение и включите уведомления.',install:'Установить Holistic House',subtitle:'Получайте уведомления о новых личных сообщениях.'}
}
export default function InstallHolisticHouse({locale='en'}){
  const c=COPY[locale]||COPY.en
  const [standalone,setStandalone]=useState(null)
  const [ios,setIos]=useState(false)
  const [offer,setOffer]=useState(null)
  useEffect(()=>{
    const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true
    setStandalone(installed())
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent))
    const available=event=>{event.preventDefault();setOffer(event)}
    const completed=()=>{setStandalone(true);setOffer(null)}
    window.addEventListener('beforeinstallprompt',available)
    window.addEventListener('appinstalled',completed)
    return ()=>{
      window.removeEventListener('beforeinstallprompt',available)
      window.removeEventListener('appinstalled',completed)
    }
  },[])
  async function install(){
    if(!offer)return
    try{await offer.prompt();await offer.userChoice}catch{/* Native menu instructions remain visible. */}
    setOffer(null)
  }
  if(standalone!==false)return null
  return <section className="hh-panel hh-section" aria-label={c.title} data-hh-install>
    <h2>{c.title}</h2><p>{c.subtitle}</p>
    {offer&&<button type="button" className="hh-primary" onClick={install}>{c.install}</button>}
    <p className="hh-fine">{ios?c.ios:c.android}</p>
  </section>
}
