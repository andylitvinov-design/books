import {summarizeServiceAnalytics} from './service-analytics.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'

export const MASTER_ANALYTICS_CONSENT='hh-master-aggregate-stats-v1'
export const MASTER_ANALYTICS_CHANNELS=Object.freeze(['telegram','whatsapp'])
export const MASTER_ANALYTICS_FREQUENCIES=Object.freeze(['daily','weekly'])
export function validateMasterAnalyticsInput(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_PREFERENCES')
  if(raw.action==='disable'&&Object.keys(raw).length===1)return {action:'disable'}
  if(raw.action!=='save'||Object.keys(raw).some(k=>!['action','channel','frequency','locale','accepted','consentVersion'].includes(k))||
    !MASTER_ANALYTICS_CHANNELS.includes(raw.channel)||
    !MASTER_ANALYTICS_FREQUENCIES.includes(raw.frequency)||
    !['en','ru','es'].includes(raw.locale)||
    raw.accepted!==true||raw.consentVersion!==MASTER_ANALYTICS_CONSENT)
    throw Error('INVALID_PREFERENCES')
  return {action:'save',channel:raw.channel,frequency:raw.frequency,locale:raw.locale}
}
export function dueMasterAnalytics(frequency,now=new Date()){
  if(frequency==='daily')return true
  if(frequency!=='weekly'||!(now instanceof Date)||!Number.isFinite(now.getTime()))return false
  return new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'America/Toronto'}).format(now)==='Mon'
}
const safeNum=value=>Math.max(0,Number.isFinite(Number(value))?Math.floor(Number(value)):0)
const cleanTitle=value=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,85)
export function makeMasterAnalyticsText({services=[],daily=[],locale='en',frequency='daily',now=new Date()}={}){
  if(!MASTER_ANALYTICS_FREQUENCIES.includes(frequency))throw Error('INVALID_FREQUENCY')
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  const dates=getTorontoCompletedPeriod(now)
  const analytics=summarizeServiceAnalytics(services,daily,dates)
  const period=frequency==='weekly'?'week':'yesterday'
  const totals={impressions:0,orders:0,whatsapp:0,telegram:0}
  for(const item of analytics.services)
    for(const field of Object.keys(totals))totals[field]+=safeNum(item[period]?.[field])
  const number=value=>new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-CA').format(value)
  const range=frequency==='weekly'?dates.weekStart+' — '+dates.yesterday:dates.yesterday
  const vocab={
    en:{title:'Service views',orders:'Order clicks',handoffs:'Messenger link clicks',period:'Completed days · Toronto',per:'By service',none:'No tracked activity for this period. This does not prove there were no visits.',note:'Link clicks are not messages, bookings or payments.',privacy:'Aggregated counts only. No client details.',service:'Service'},
    ru:{title:'Показы услуг',orders:'Клики «Заказать»',handoffs:'Переходы в мессенджеры',period:'Завершённые дни · Торонто',per:'По услугам',none:'Нет зарегистрированных действий. Это не означает, что посещений не было.',note:'Клик не подтверждает сообщение, запись или оплату.',privacy:'Только общие счётчики, без данных клиентов.',service:'Услуга'},
    es:{title:'Vistas de servicios',orders:'Clics en Reservar',handoffs:'Clics a mensajeros',period:'Días completos · Toronto',per:'Por servicio',none:'Sin actividad registrada. Esto no demuestra que no hubo visitas.',note:'Un clic no confirma mensajes, reservas ni pagos.',privacy:'Solo cifras agregadas, sin datos de clientes.',service:'Servicio'},
  }[lang]
  const lines=['🏡 Holistic House · My Practice','📅 '+range+' · '+vocab.period,'',
    '👁 '+vocab.title+': '+number(totals.impressions),
    '🛒 '+vocab.orders+': '+number(totals.orders),
    '💬 '+vocab.handoffs+': '+number(totals.whatsapp+totals.telegram),
    'WhatsApp '+number(totals.whatsapp)+' · Telegram '+number(totals.telegram),'',vocab.per+':']
  const ranked=[...analytics.services].sort((a,b)=>safeNum(b[period]?.impressions)-safeNum(a[period]?.impressions))
  for(const row of ranked.slice(0,10)){
    const name=cleanTitle(row.title)||vocab.service
    lines.push('• '+name+': '+number(safeNum(row[period]?.impressions))+' / '+number(safeNum(row[period]?.orders)))
  }
  if(ranked.length>10)lines.push('+'+number(ranked.length-10))
  if(!totals.impressions&&!totals.orders&&!totals.whatsapp&&!totals.telegram)lines.push('',vocab.none)
  lines.push('',vocab.note,vocab.privacy,'https://holistichouse.vercel.app/'+lang+'/app/practice')
  const text=lines.join('\n')
  if(text.length>3900)throw Error('DIGEST_TOO_LONG')
  return {text,totals,day:dates.yesterday,weekStart:dates.weekStart,frequency,locale:lang}
}
