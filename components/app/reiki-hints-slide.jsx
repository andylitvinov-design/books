'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Clock3,Send,Heart,Check} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {REIKI_HINTS_CONSENT_VERSION,reikiHintsCard} from '@/lib/app/reiki-hints-catalog.mjs'
import styles from './reiki-hints-slide.module.css'
const times=['07:00','09:00','12:00','18:00','21:00']
const noTopics={messages:false,booking:false,reports:false,courses:false,news:false}
const words={
 en:{hint:'Today’s hint',sample:'A gentle daily practice, insight or affirmation for your Reiki path.',time:'Choose delivery time',local:'Your local time',confirm:'Confirm in Telegram',verify:'Open Telegram and press Start to verify your account.',consent:'By confirming, you agree to receive 30 daily Reiki Hints and link your verified Telegram to your current account and CRM. You can stop anytime.',wait:'Waiting for Telegram confirmation. Return here after pressing Start.',connected:'Telegram verified. Your chosen time is saved.',off:'Delivery is not enabled yet.',error:'Could not complete confirmation. Please retry.',guest:'Finish the lesson and sign in to subscribe securely in My Courses.',settings:'Reiki Hints settings',done:'Subscription saved',crm:'Telegram verified, CRM linking is not yet available.',stopped:'Messages stopped',complete:'Series completed'},
 ru:{hint:'Подсказка дня',sample:'Мягкая ежедневная практика, мысль или аффирмация Рейки.',time:'Выберите время',local:'Ваше местное время',confirm:'Подтвердить в Telegram',verify:'Откройте Telegram и нажмите Start для подтверждения аккаунта.',consent:'Подтверждая, вы соглашаетесь на 30 ежедневных посланий и привязку подтверждённого Telegram к вашему аккаунту и CRM. Можно отказаться в любое время.',wait:'Ожидаем подтверждения Telegram. Вернитесь после нажатия Start.',connected:'Telegram подтверждён. Время сохранено.',off:'Отправка пока не активирована.',error:'Не удалось подтвердить. Попробуйте ещё раз.',guest:'Завершите урок и войдите в кабинет, чтобы безопасно подписаться.',settings:'Настройки Reiki Hints',done:'Подписка сохранена',crm:'Telegram подтверждён, привязка CRM пока недоступна.',stopped:'Рассылка остановлена',complete:'Серия завершена'}
}
export default function ReikiHintsSlide({accountId,locale='en'}){
 const t=words[locale]||words.en
 const [time,setTime]=useState('09:00'),[zone,setZone]=useState('UTC'),[view,setView]=useState(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[crm,setCrm]=useState(null),[link,setLink]=useState('')
 const storageKey='hh-reiki-crm-link:'+accountId
 useEffect(()=>{
  setZone(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC')
  if(!accountId)return
  let closed=false,running=false
  async function refresh(){
   if(closed||running)return;running=true
   try{
    const data=await appFetch('reiki-hints',undefined,'GET',{accountId})
    if(closed)return
    setView(data);if(data.preferences){setTime(data.preferences.dailyAt);setZone(data.preferences.timezone)}
    if(data.telegramConnected&&data.preferences&&!['stopped','completed','disconnected'].includes(data.preferences.status)){
     let pending=false;try{pending=sessionStorage.getItem(storageKey)==='1'}catch{}
     if(pending){
      const channels=await appFetch('notification-channels',undefined,'GET',{accountId})
      if(closed)return
      if(channels.crmLinked){setCrm(true);try{sessionStorage.removeItem(storageKey)}catch{}}
      else if(channels.crmLinkAvailable){
       const result=await appFetch('notification-channels',{action:'link_crm',channel:'telegram',noticeVersion:'hh-telegram-google-crm-link-v1',permissionAccepted:true},'POST',{accountId})
       if(!closed)setCrm(!!result.crmLinked)
       if(result.crmLinked)try{sessionStorage.removeItem(storageKey)}catch{}
      }else setCrm(false)
     }
    }
   }catch{if(!closed)setError(t.error)}finally{running=false}
  }
  void refresh()
  const visible=()=>{if(document.visibilityState==='visible')void refresh()}
  document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible)
  const interval=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},10000)
  return()=>{closed=true;clearInterval(interval);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible)}
 },[accountId,storageKey,t.error])
 async function confirm(){
  if(!accountId||busy||!view)return
  setBusy(true);setError('')
  try{
   // Consent is conveyed by this explicit button with visible disclosure.
   const data=view.preferences?view:await appFetch('reiki-hints',{enabled:true,permissionAccepted:true,consentVersion:REIKI_HINTS_CONSENT_VERSION,dailyAt:time,timezone:zone,locale},'POST',{accountId})
   setView(data)
   if(data.preferences&&['stopped','completed','disconnected'].includes(data.preferences.status))return
   try{sessionStorage.setItem(storageKey,'1')}catch{}
   if(data.telegramConnected){
    const state=await appFetch('notification-channels',undefined,'GET',{accountId})
    if(state.crmLinked)setCrm(true)
    else if(state.crmLinkAvailable){
     const result=await appFetch('notification-channels',{action:'link_crm',channel:'telegram',noticeVersion:'hh-telegram-google-crm-link-v1',permissionAccepted:true},'POST',{accountId});setCrm(!!result.crmLinked)
    }else setCrm(false)
    return
   }
   const state=await appFetch('notification-channels',undefined,'GET',{accountId})
   const result=await appFetch('notification-channels',{action:'begin_telegram',channel:'telegram',topics:state.channels?.telegram?.topics||noTopics,locale,noticeVersion:'hh-messenger-contact-v1',permissionAccepted:true},'POST',{accountId})
   if(typeof result.linkUrl!=='string'||!result.linkUrl.startsWith('https://t.me/'))throw Error('BAD_LINK')
   setLink(result.linkUrl);window.location.assign(result.linkUrl)
  }catch{setError(t.error)}finally{setBusy(false)}
 }
 const p=view?.preferences, ended=p&&['completed','stopped','disconnected'].includes(p.status)
 const photo=reikiHintsCard(1,locale).photoUrl
 return <div className={styles.root} data-reiki-hints-slide>
   <div className={styles.preview}><img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer"/><div><strong><Heart size={17}/>{t.hint}</strong><p>{t.sample}</p></div></div>
   <div className={styles.time}><div><strong><Clock3 size={17}/>{t.time}</strong><small>{t.local}</small></div><div className={styles.chips}>{times.map(value=><button type="button" key={value} aria-pressed={value===time} disabled={!!p||busy} onClick={()=>setTime(value)}>{value}</button>)}</div></div>
   {accountId?<><p className={styles.consent}>{t.consent}</p>
     {!ended&&<button type="button" className={styles.telegram} onClick={()=>void confirm()} disabled={busy||!view}><Send size={24}/><span><strong>{view?.telegramConnected&&p?t.done:t.confirm}</strong><small>{view?.telegramConnected&&p?t.connected:t.verify}</small></span></button>}
     {link&&!view?.telegramConnected&&<a href={link}>{t.wait}</a>}
     {ended&&<Link href={'/'+locale+'/app/my-coaching-plan#reiki-hints'}>{p.status==='completed'?t.complete:t.settings}</Link>}
     {crm===false&&<small role="status">{t.crm}</small>}
     {view&&!view.deliveryReady&&<small role="status">{t.off}</small>}
   </>:<><p className={styles.consent}>{t.guest}</p><Link href={'/'+locale+'/app/my-coaching-plan#reiki-hints'}>{t.settings}</Link></>}
   {error&&<small role="alert">{error}</small>}
 </div>
}
