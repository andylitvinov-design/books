'use client'
import {useRef,useState,useEffect} from 'react'
import styles from './crm-manager.module.css'

const TEXT={
 en:{title:'Client Telegram bot',note:'This is separate from the existing owner/CRM bots. Add the three server secrets, then safely register only the new bot webhook. No customer messages are sent by this action.',connect:'Verify and connect bot',ready:'Official client bot callback registered.',error:'Could not connect. Verify the new BotFather token, username, webhook secret and LINK_ENABLED flag.',loading:'Checking the owned bot…',keys:'Required protected Vercel variables:'},
 ru:{title:'Telegram-бот для клиентов',note:'Отдельный бот, не бот мастера/CRM. Добавьте три серверных секрета и безопасно зарегистрируйте webhook нового бота. Эта кнопка не отправляет сообщения клиентам.',connect:'Проверить и подключить бота',ready:'Webhook отдельного клиентского бота зарегистрирован.',error:'Не удалось подключить. Проверьте новый токен BotFather, имя бота, секрет и флаг LINK_ENABLED.',loading:'Проверяем владельца бота…',keys:'Нужные защищённые переменные Vercel:'},
 es:{title:'Bot de Telegram para clientes',note:'Un bot independiente de los bots del profesional/CRM. Añade tres secretos al servidor y registra solo su webhook. Esta acción no envía mensajes a clientes.',connect:'Verificar y conectar bot',ready:'Webhook oficial del bot de clientes registrado.',error:'No se pudo conectar. Revisa BotFather, el nombre del bot, el secreto y LINK_ENABLED.',loading:'Comprobando el bot…',keys:'Variables protegidas necesarias en Vercel:'},
}
export default function CustomerTelegramBotSetup({locale='en',accountId}){
 const t=TEXT[locale]||TEXT.en
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('')
 const operation=useRef(null)
 useEffect(()=>{operation.current=null;setBusy(false);setFeedback('')},[accountId])
 async function connect(){
  if(!accountId||busy)return
  const task=new AbortController();operation.current=task
  setBusy(true);setFeedback('')
  try{
   const response=await fetch('/api/app/notification-channels/telegram/setup',{
    method:'POST',credentials:'same-origin',cache:'no-store',signal:task.signal,
    headers:{'X-HH-Account-Id':accountId},
   })
   const result=await response.json()
   if(!response.ok||result?.webhookRegistered!==true)throw new Error('NOT_CONFIGURED')
   if(operation.current!==task)return
   setFeedback(t.ready)
  }catch{
   if(operation.current===task)setFeedback(t.error)
  }finally{
   if(operation.current===task){operation.current=null;setBusy(false)}
  }
 }
 return <section className={styles.formCard} aria-label={t.title}>
  <h3>{t.title}</h3><p>{t.note}</p>
  <p>{t.keys}</p>
  <code>HH_CLIENT_TG_BOT_TOKEN, HH_CLIENT_TG_BOT_USERNAME, HH_CLIENT_TG_WEBHOOK_SECRET, HH_CLIENT_TG_LINK_ENABLED</code>
  <p><a href="https://t.me/BotFather" target="_blank" rel="noreferrer">BotFather</a></p>
  <button type="button" disabled={busy||!accountId} onClick={connect}>{busy?t.loading:t.connect}</button>
  <p role="status" aria-live="polite">{feedback}</p>
 </section>
}
