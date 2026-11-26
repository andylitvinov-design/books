'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Sparkles,Bell} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {REIKI_HINTS_CONSENT_VERSION,reikiHintsCard} from '@/lib/app/reiki-hints-catalog.mjs'
import css from './daybook-daily-settings.module.css'

const copy={
 ru:{title:'Reiki Hints · 30 дней',lead:'Одно фото и одна подсказка Рейки ежедневно. Через 30 дней рассылка завершится автоматически.',time:'Время',zone:'Часовой пояс',language:'Язык',consent:'Хочу получать ежедневную фотографию и послание Рейки в Telegram в течение 30 дней. Могу отказаться в любое время.',save:'Подписаться бесплатно',stop:'Остановить рассылку',connect:'Подтвердить Telegram',error:'Не удалось загрузить или сохранить настройки.',loading:'Загрузка…',pending_link:'Запрос сохранён. Подтвердите Telegram через бота.',pending_start:'Запрос сохранён. Серия начнётся после активации отправки.',active:'Серия активна',completed:'30-дневная серия завершилась',stopped:'Рассылка остановлена',disconnected:'Связь с подтверждённым Telegram утрачена. Отправка остановлена.',accepted:'Принято Telegram',disabled:'Доставка пока не активирована. Сообщения ещё не отправляются.',preview:'Пример сообщения'},
 en:{title:'Reiki Hints · 30 days',lead:'One photo and one Reiki hint each day. The series ends automatically after 30 days.',time:'Time',zone:'Time zone',language:'Language',consent:'I want one daily Reiki photo and message in Telegram for 30 days. I can unsubscribe anytime.',save:'Subscribe free',stop:'Stop messages',connect:'Verify Telegram',error:'Could not load or save settings.',loading:'Loading…',pending_link:'Request saved. Verify Telegram through the bot.',pending_start:'Request saved. The series will start when delivery is enabled.',active:'Series active',completed:'30-day series ended',stopped:'Messages stopped',disconnected:'Verified Telegram connection changed. Delivery is stopped.',accepted:'Accepted by Telegram',disabled:'Delivery is not enabled yet. No messages are being sent.',preview:'Example message'},
 es:{title:'Reiki Hints · 30 días',lead:'Una foto y un consejo de Reiki cada día. La serie finaliza automáticamente después de 30 días.',time:'Hora',zone:'Zona horaria',language:'Idioma',consent:'Quiero una foto y un mensaje de Reiki diarios por Telegram durante 30 días. Puedo cancelar en cualquier momento.',save:'Suscribirme gratis',stop:'Detener mensajes',connect:'Verificar Telegram',error:'No se pudieron cargar o guardar los ajustes.',loading:'Cargando…',pending_link:'Solicitud guardada. Verifica Telegram con el bot.',pending_start:'Solicitud guardada. La serie empezará al activarse el envío.',active:'Serie activa',completed:'Serie de 30 días finalizada',stopped:'Mensajes detenidos',disconnected:'La conexión verificada cambió. Envíos detenidos.',accepted:'Aceptados por Telegram',disabled:'El envío aún no está activado. No se están enviando mensajes.',preview:'Ejemplo de mensaje'}
}
export default function ReikiHintsSettings({accountId,locale='en'}){
 const lang=Object.hasOwn(copy,locale)?locale:'en',t=copy[lang]
 const [view,setView]=useState(null),[draft,setDraft]=useState({dailyAt:'09:00',timezone:'UTC',locale:lang})
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{
  if(!accountId)return
  const controller=new AbortController()
  setView(null);setConsent(false);setError('')
  appFetch('reiki-hints',undefined,'GET',{accountId,signal:controller.signal}).then(data=>{
   if(controller.signal.aborted)return
   setView(data)
   const p=data.preferences
   const zone=data.defaultTimezone==='UTC'?(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'):data.defaultTimezone
   setDraft({dailyAt:p?.dailyAt||'09:00',timezone:p?.timezone||zone||'UTC',locale:p?.locale||lang})
  }).catch(()=>{if(!controller.signal.aborted)setError(t.error)})
  return ()=>controller.abort()
 },[accountId,lang,t.error])
 async function save(enabled){
  if(!accountId||busy)return
  setBusy(true);setError('')
  try{
   const next=await appFetch('reiki-hints',enabled?{...draft,enabled:true,permissionAccepted:consent,consentVersion:REIKI_HINTS_CONSENT_VERSION}:{enabled:false},'POST',{accountId})
   setView(next);setConsent(false)
  }catch{setError(t.error)}finally{setBusy(false)}
 }
 const p=view?.preferences
 const stopAllowed=p&&['active','pending_link','pending_start','disconnected'].includes(p.status)
 const sample=reikiHintsCard(1,draft.locale)
 return <section id="reiki-hints" className={css.root} aria-label={t.title}>
  <header className={css.heading}><span className={css.symbol}><Sparkles size={24} aria-hidden="true"/></span><div><span className={css.eyebrow}>MY REIKI</span><h2>{t.title}</h2><p>{t.lead}</p></div></header>
  {!view&&!error&&<p role="status">{t.loading}</p>}
  {view&&<>
   {p&&<div role="status" className={css.status}><span>{t[p.status]}</span><span>{t.accepted}: {p.accepted}/30</span></div>}
   {!view.telegramConnected&&<p className={css.hint}><Link prefetch={false} href={'/'+(lang==='es'?'en':lang)+'/app/settings#hh-telegram-connect'}>{t.connect}</Link></p>}
   {!p&&<>
    <div className={css.controls}>
     <label><span>{t.time}</span><input type="time" min="07:00" max="22:00" value={draft.dailyAt} onChange={e=>setDraft(v=>({...v,dailyAt:e.target.value}))}/></label>
     <label><span>{t.language}</span><select value={draft.locale} onChange={e=>setDraft(v=>({...v,locale:e.target.value}))}><option value="ru">Русский</option><option value="en">English</option><option value="es">Español</option></select></label>
     <label className={css.full}><span>{t.zone}</span><input value={draft.timezone} maxLength={100} spellCheck={false} onChange={e=>setDraft(v=>({...v,timezone:e.target.value}))}/></label>
    </div>
    <div className={css.preview}><div className={css.previewHeading}>{t.preview}</div><div className={css.bubble}><p style={{whiteSpace:'pre-line',margin:0}}>{sample.caption}</p></div></div>
    <label className={css.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{t.consent}</span></label>
    <div className={css.actions}><button type="button" className={css.primary} disabled={busy||!consent||!draft.timezone} onClick={()=>void save(true)}><Bell size={17}/>{t.save}</button></div>
   </>}
   {stopAllowed&&<div className={css.actions}><button type="button" className={css.secondary} disabled={busy} onClick={()=>void save(false)}>{t.stop}</button></div>}
   {!view.deliveryReady&&<p className={css.hint}>{t.disabled}</p>}
  </>}
  {error&&<p role="alert" className={css.error}>{error}</p>}
 </section>
}
