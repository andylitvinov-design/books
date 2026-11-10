'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {MessageCircle,ShieldCheck} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './account-messaging-entry.module.css'

const COPY={
 en:{heading:'Keep in touch with your practitioner',description:'Connect your Telegram to receive private-message alerts and replies. Your Google account stays the same, and marketing remains separate and optional.',action:'Connect Telegram',pending:'Finish Telegram verification',site:'Messages on this site',connected:'Telegram connected'},
 ru:{heading:'Оставайтесь на связи с мастером',description:'Подключите Telegram для уведомлений о личных сообщениях и ответах. Google-аккаунт сохранится, а новости и реклама требуют отдельного согласия.',action:'Подключить Telegram',pending:'Завершить подтверждение',site:'Сообщения на сайте',connected:'Telegram подключён'},
 es:{heading:'Mantente en contacto con tu profesional',description:'Conecta Telegram para avisos sobre mensajes privados y respuestas. Tu cuenta Google no cambia; la publicidad requiere consentimiento aparte.',action:'Conectar Telegram',pending:'Terminar verificación',site:'Mensajes en el sitio',connected:'Telegram conectado'},
}
export default function AccountMessagingEntry({accountId,locale='en'}){
 const [status,setStatus]=useState(null)
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController()
  setStatus(null)
  appFetch('notification-channels',undefined,undefined,{accountId,signal:controller.signal})
   .then(data=>{
    if(controller.signal.aborted)return
    const channel=data?.channels?.telegram
    setStatus({connected:channel?.status==='connected',pending:channel?.status==='pending',
     available:data?.verificationAvailable===true})
   })
   .catch(()=>{if(!controller.signal.aborted)setStatus({available:false})})
  return ()=>controller.abort()
 },[accountId])
 if(!accountId||!status||status.connected)return null
 const t=COPY[locale]||COPY.en
 const root='/'+(locale==='es'?'es':locale==='ru'?'ru':'en')+'/app'
 return <aside className={styles.root} aria-label={t.heading}>
  <span className={styles.icon}><MessageCircle size={22}/></span>
  <div className={styles.body}>
   <h2>{t.heading}</h2>
   <p>{t.description}</p>
   <div className={styles.links}>
    {status.available&&<Link href={root+'/settings#hh-telegram-connect'} prefetch={false} className={styles.primary}>{status.pending?t.pending:t.action}</Link>}
    <Link href={root+'/messages'} prefetch={false} className={styles.secondary}>{t.site}</Link>
   </div>
  </div>
  <ShieldCheck size={18} className={styles.shield} aria-hidden="true"/>
 </aside>
}
