'use client'
import { useCallback, useEffect, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import css from './my-page.module.css'
import { DAYBOOK_INSPIRATIONS_CONSENT } from '@/lib/daybook/inspirations-policy.mjs'

const WORDS = {
 ru:{title:'Ежедневное вдохновение',desc:'Одно случайное послание в день, без повторов за предыдущие 30 дней. Только после вашего согласия. Можно выключить в любой момент.',off:'Рассылка выключена',on:'Рассылка включена',link:'Подключить Telegram',linked:'Telegram подтверждён',refresh:'Проверить подключение',time:'Время получения',zone:'Часовой пояс',subscribe:'Получать каждый день',pause:'Остановить рассылку',save:'Сохранить время',consent:'Я разрешаю Daybook ежедневно присылать мне вдохновляющие послания в подключённый Telegram. Согласие можно отозвать.',error:'Не удалось сохранить. Проверьте соединение и настройки.',unavailable:'Отправка ещё не включена на сервере.',whatsapp:'WhatsApp будет доступен после проверки шаблонов доставки.',noTelegram:'Сначала подтвердите Telegram через кнопку ниже. В боте нажмите Start.',saved:'Настройки сохранены.',opening:'Подтвердите подключение через Start в открытом Telegram.'},
 en:{title:'Daily inspiration',desc:'One random daily message, with no repeats from the previous 30 days. Opt-in only; unsubscribe any time.',off:'Off',on:'Daily messages enabled',link:'Connect Telegram',linked:'Telegram verified',refresh:'Check connection',time:'Delivery time',zone:'Time zone',subscribe:'Send me one each day',pause:'Pause messages',save:'Save delivery time',consent:'I agree to receive one daily Daybook inspiration in my verified Telegram. I may revoke this permission at any time.',error:'Could not save. Please check your connection and settings.',unavailable:'Sending has not yet been activated on the server.',whatsapp:'WhatsApp is not yet supported for outbound daily messages.',noTelegram:'Verify Telegram first using the button below and tap Start in the bot.',saved:'Saved.',opening:'Finish verification with Start in Telegram.'},
 es:{title:'Inspiración diaria',desc:'Un mensaje al día, elegido al azar, sin repeticiones durante los últimos 30 días. Suscripción voluntaria.',off:'Desactivado',on:'Mensajes diarios activos',link:'Conectar Telegram',linked:'Telegram verificado',refresh:'Comprobar conexión',time:'Hora de envío',zone:'Zona horaria',subscribe:'Recibir uno al día',pause:'Pausar mensajes',save:'Guardar hora',consent:'Acepto recibir una inspiración diaria de Daybook en mi Telegram verificado. Puedo cancelar el permiso.',error:'No se pudo guardar. Comprueba la conexión.',unavailable:'Los envíos aún no están activados en el servidor.',whatsapp:'WhatsApp aún no admite este envío diario.',noTelegram:'Primero verifica Telegram y pulsa Start en el bot.',saved:'Guardado.',opening:'Finaliza la verificación pulsando Start en Telegram.'}
}
export default function DailyInspirationsSettings({locale='en'}) {
 const w = WORDS[locale] || WORDS.en
 const [data,setData] = useState(null)
 const [time,setTime] = useState('09:00')
 const [zone,setZone] = useState('UTC')
 const [agreed,setAgreed] = useState(false)
 const [busy,setBusy] = useState(false)
 const [notice,setNotice] = useState('')
 const [error,setError] = useState('')
 const load = useCallback(async () => {
  const snapshot = await appFetch('daily-inspirations')
  setData(snapshot)
  setTime(snapshot.dailyAt)
  setZone(snapshot.timeZone)
 },[])
 useEffect(() => {let active=true;appFetch('daily-inspirations').then(s => {
  if (!active)return
  setData(s);setTime(s.dailyAt)
  setZone(s.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
 }).catch(()=>{if(active)setError(w.error)});return()=>{active=false}},[w.error])
 async function act(action) {
  if(busy)return
  setBusy(true);setError('');setNotice('')
  try {
   const payload = action === 'beginTelegram'
    ? {action,permissionAccepted:true}
    : action === 'pause' ? {action}
    : {action,locale,timeZone:zone,dailyAt:time,
       ...(action==='enable'?{noticeVersion:DAYBOOK_INSPIRATIONS_CONSENT,permissionAccepted:agreed}:{})}
   const next = await appFetch('daily-inspirations',payload,'POST')
   if(action==='beginTelegram'){
    if(typeof next.linkUrl!=='string'||!next.linkUrl.startsWith('https://t.me/'))throw Error('UNAVAILABLE')
    window.open(next.linkUrl,'_blank','noopener,noreferrer')
    setNotice(w.opening)
   } else {setData(next);setNotice(w.saved);if(action==='enable')setAgreed(false)}
  }catch{setError(w.error)}
  finally{setBusy(false)}
 }
 async function refresh() {if(busy)return;setBusy(true);setError('');try{await load()}catch{setError(w.error)}finally{setBusy(false)}}
 return <section className={css.card} aria-label={w.title} data-daybook-inspirations>
  <h2>{w.title}</h2><p className={css.small}>{w.desc}</p>
  {!data?<p role="status">{error || '…'}</p>:<>
    <p><strong>{data.enabled ? w.on : w.off}</strong></p>
    {data.telegramConnected?<p>{w.linked}</p>:<><p className={css.small}>{w.noTelegram}</p>
      <button type="button" className={css.secondary} disabled={busy||!data.linkingAvailable}
        onClick={()=>void act('beginTelegram')}>{w.link}</button></>}
    <button className={css.secondary} type="button" disabled={busy} onClick={()=>void refresh()}>{w.refresh}</button>
    <label className={css.label} htmlFor="daybook-daily-at">{w.time}</label>
    <input className={css.field} id="daybook-daily-at" type="time" value={time}
      onChange={e=>setTime(e.target.value)} />
    <label className={css.label} htmlFor="daybook-zone">{w.zone}</label>
    <input className={css.field} id="daybook-zone" value={zone} maxLength={64}
      onChange={e=>setZone(e.target.value)} spellCheck={false}/>
    {data.enabled?<div className={css.actions}>
      <button type="button" className={css.secondary} disabled={busy}
        onClick={()=>void act('preferences')}>{w.save}</button>
      <button type="button" className={css.secondary} disabled={busy}
        onClick={()=>void act('pause')}>{w.pause}</button>
     </div>:
     <><label className={css.label}><input type="checkbox" checked={agreed}
       onChange={e=>setAgreed(e.target.checked)} /> {w.consent}</label>
       <button type="button" className={css.button}
        disabled={busy||!data.telegramConnected||!data.sendingAvailable||!agreed}
        onClick={()=>void act('enable')}>{w.subscribe}</button></>}
    {!data.sendingAvailable?<p className={css.small}>{w.unavailable}</p>:null}
    <p className={css.small}>{w.whatsapp}</p>
  </>}
  {notice?<p role="status" className={css.notice}>{notice}</p>:null}
  {error&&data?<p role="alert" className={css.error}>{error}</p>:null}
 </section>
}
