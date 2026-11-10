'use client'
import {useEffect,useState} from 'react'
import {MessageCircle,Newspaper,Send,ShoppingBag,ShieldCheck} from 'lucide-react'
import {whatsappEnquiryUrl} from '@/lib/whatsapp-enquiry'
import {resolveTelegramFirstEntry} from '@/lib/app/telegram-entry-url.mjs'
import MessengerSignIn from './messenger-sign-in'
import styles from './messenger-guest-gate.module.css'

// Presentation only. Messenger links never create a website session or CRM lead.
const COPY={
 en:{
  orders:{eyebrow:'My orders',title:'Sign in to see your personal orders',body:'Your requests, updates and conversations with practitioners will appear in your private account.'},
  clients:{eyebrow:'Conversations',title:'Stay connected with your practitioner',body:'Continue through your messenger or open your private website account.'},
  news:{eyebrow:'My briefing',title:'Sign in to see your personal briefing',body:'Your news, updates and recommendations are available in your private account.'},
  telegram:'Continue in Telegram',telegramReview:'Telegram · personal review',waiting:'Checking Telegram access…',unavailable:'Telegram is not available right now.',
  whatsapp:'Message us in WhatsApp',whatsappRequest:'I would like to contact Holistic House through WhatsApp.',
  note:'Messenger links open a conversation, not your website account. To see private orders, messages and briefing here, sign in separately.',
  other:'Other sign-in methods',cabinet:'Secure website Cabinet',privacy:'Private information stays inside your protected account.'
 },
 ru:{
  orders:{eyebrow:'Мои заказы',title:'Войдите, чтобы видеть личные заказы',body:'Ваши заявки, обновления и переписка с мастерами появятся в личном кабинете.'},
  clients:{eyebrow:'Переписка',title:'Оставайтесь на связи с вашим мастером',body:'Общайтесь через удобный мессенджер или войдите в защищённый кабинет сайта.'},
  news:{eyebrow:'Мой брифинг',title:'Войдите, чтобы видеть личный брифинг',body:'Персональные новости, обновления и рекомендации доступны в вашем кабинете.'},
  telegram:'Продолжить в Telegram',telegramReview:'Telegram · личный разбор',waiting:'Проверяем Telegram…',unavailable:'Сейчас Telegram недоступен.',
  whatsapp:'Написать в WhatsApp',whatsappRequest:'Хочу связаться с Holistic House через WhatsApp.',
  note:'Ссылки Telegram и WhatsApp открывают переписку, но не выполняют вход на сайт. Для личных заказов, сообщений и брифинга нужен отдельный вход.',
  other:'Другие способы входа',cabinet:'Защищённый кабинет сайта',privacy:'Ваши личные данные остаются в защищённом кабинете.'
 },
 es:{
  orders:{eyebrow:'Mis pedidos',title:'Inicia sesión para ver tus pedidos',body:'Tus solicitudes, novedades y conversaciones con profesionales aparecerán en tu cuenta privada.'},
  clients:{eyebrow:'Conversaciones',title:'Sigue en contacto con tu profesional',body:'Conversa en tu aplicación de mensajería o accede a tu cuenta privada del sitio.'},
  news:{eyebrow:'Mi informe',title:'Inicia sesión para ver tu informe personal',body:'Tus noticias y recomendaciones personales están en tu cuenta privada.'},
  telegram:'Continuar en Telegram',telegramReview:'Telegram · revisión personal',waiting:'Comprobando Telegram…',unavailable:'Telegram no está disponible ahora.',
  whatsapp:'Escribir por WhatsApp',whatsappRequest:'Quiero contactar con Holistic House por WhatsApp.',
  note:'Los enlaces de mensajería abren una conversación, no una sesión web. Para ver pedidos, mensajes e informes privados debes iniciar sesión en el sitio.',
  other:'Otras formas de acceso',cabinet:'Cuenta privada del sitio',privacy:'Tu información privada permanece en tu cuenta protegida.'
 }
}
export default function MessengerGuestGate({locale='en',section='clients'}){
 const copy=COPY[locale]||COPY.en
 const panel=copy[section]||copy.clients
 const Icon=section==='orders'?ShoppingBag:section==='news'?Newspaper:MessageCircle
 const [telegram,setTelegram]=useState({checking:true,href:'',kind:''})
 useEffect(()=>{
  const controller=new AbortController()
  setTelegram({checking:true,href:'',kind:''})
  fetch('/api/public/telegram-diagnostic',{method:'GET',cache:'no-store',signal:controller.signal})
   .then(async response=>response.ok?response.json():null)
   .then(payload=>{
     if(controller.signal.aborted)return
     const entry=resolveTelegramFirstEntry(payload,locale)
     setTelegram({checking:false,href:entry?.href||'',kind:entry?.kind||''})
   })
   .catch(()=>{if(!controller.signal.aborted)setTelegram({checking:false,href:'',kind:''})})
  return()=>controller.abort()
 },[locale])
 // Existing trusted business-contact URL; visitor must choose Send in WhatsApp.
 const whatsappHref=whatsappEnquiryUrl({locale,service:'Holistic House',request:copy.whatsappRequest})
 const titleId='hh-guest-messenger-'+section+'-title'
 return <section className={styles.root} data-hh-messenger-guest-gate data-gate-section={section}
   aria-labelledby={titleId}>
   <div className={styles.artwork} data-image-section={section}>
     <span className={styles.eyebrow}><Icon size={17} aria-hidden="true"/>{panel.eyebrow}</span>
   </div>
   <div className={styles.sheet}>
     <span className={styles.roundIcon}><Icon size={27} aria-hidden="true"/></span>
     <h2 id={titleId}>{panel.title}</h2>
     <p className={styles.description}>{panel.body}</p>
     <div className={styles.channels}>
       {telegram.href?<a className={styles.telegram} href={telegram.href}
         data-hh-guest-telegram data-telegram-route={telegram.kind}
         target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer">
         <Send size={21} aria-hidden="true"/>{telegram.kind==='review'?copy.telegramReview:copy.telegram}
       </a>:<p className={styles.channelStatus} role="status">
         {telegram.checking?copy.waiting:copy.unavailable}
       </p>}
       <a className={styles.whatsapp} href={whatsappHref} data-hh-guest-whatsapp
         target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer">
         <MessageCircle size={22} aria-hidden="true"/>{copy.whatsapp}
       </a>
     </div>
     <p className={styles.disclaimer}><ShieldCheck size={17} aria-hidden="true"/>{copy.note}</p>
     <details className={styles.other}>
       <summary>{copy.other}</summary>
       <div className={styles.websiteLogin}>
         <strong>{copy.cabinet}</strong>
         <MessengerSignIn locale={locale} continueTo="direct-messages" googleOnly/>
         <small>{copy.privacy}</small>
       </div>
     </details>
   </div>
 </section>
}
