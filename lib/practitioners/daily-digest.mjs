import { summarizeServiceAnalytics } from './service-analytics.js'

const DAY_MS=86400000
const TZ='America/Toronto'
const FIELDS=['impressions','orders','whatsapp','telegram']
const clamp=value=>{
  const num=Number(value)
  return Number.isSafeInteger(num)&&num>=0?num:0
}
const num=value=>new Intl.NumberFormat('ru-RU').format(clamp(value))
const dayString=date=>date.toISOString().slice(0,10)
function torontoDayParts(now){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(now)
  const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]))
  return [Number(obj.year),Number(obj.month),Number(obj.day)]
}
export function getTorontoCompletedPeriod(now=new Date()){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('INVALID_DATE')
  const [year,month,day]=torontoDayParts(now)
  const today=Date.UTC(year,month-1,day)
  return {timeZone:TZ,today:dayString(new Date(today)),
    yesterday:dayString(new Date(today-DAY_MS)),
    weekStart:dayString(new Date(today-7*DAY_MS))}
}
export function makePracticeDigest(input){
  const {services=[],daily=[],dates,counts={}}=input||{}
  if(!dates||!/\d{4}-\d{2}-\d{2}/.test(dates.yesterday||'')||!/\d{4}-\d{2}-\d{2}/.test(dates.weekStart||''))throw Error('INVALID_PERIOD')
  const analytics=summarizeServiceAnalytics(services,daily,dates)
  const sum=period=>analytics.services.reduce((result,item)=>{
    for(const key of FIELDS)result[key]+=clamp(item[period]?.[key])
    return result
  },{impressions:0,orders:0,whatsapp:0,telegram:0})
  const yesterday=sum('yesterday'),week=sum('week')
  const newApp=clamp(counts.newApp),newPublic=clamp(counts.newPublic)
  const openApp=clamp(counts.openApp),openPublic=clamp(counts.openPublic)
  const published=clamp(counts.published),pending=clamp(counts.pending)
  const clean=s=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,95)
  const sorted=[...analytics.services].sort((a,b)=>
    clamp(b.yesterday.orders)-clamp(a.yesterday.orders)||
    clamp(b.yesterday.impressions)-clamp(a.yesterday.impressions)||
    String(a.title).localeCompare(String(b.title),'ru'))
  const lines=[
    '🏡 Holistic House · My Practice',
    '📅 '+dates.yesterday+' · завершённый день, Торонто',
    '',
    '👁 Показы услуг: '+num(yesterday.impressions),
    '🛒 Нажатия «Заказать»: '+num(yesterday.orders),
    '💬 Переходы в мессенджеры: '+num(yesterday.whatsapp+yesterday.telegram)+
      ' (WhatsApp '+num(yesterday.whatsapp)+' · Telegram '+num(yesterday.telegram)+')',
    '📩 Новые заявки: '+num(newApp+newPublic)+
      ' (в кабинете '+num(newApp)+' · публичные '+num(newPublic)+')',
    '📬 Открытые заявки сейчас: '+num(openApp+openPublic),
    '🧾 Опубликованные услуги: '+num(published)+' · ожидают модерации: '+num(pending),
    '',
    '📊 За 7 завершённых дней ('+dates.weekStart+' — '+dates.yesterday+'):',
    'Показы '+num(week.impressions)+' · «Заказать» '+num(week.orders),
    'WhatsApp '+num(week.whatsapp)+' · Telegram '+num(week.telegram),
    '',
    'По услугам (вчера):'
  ]
  if(!sorted.length)lines.push('Нет услуг, доступных для подсчёта.')
  for(const item of sorted.slice(0,12)){
    const t=clean(item.title)||'Услуга'
    lines.push('• '+t+': '+num(item.yesterday.impressions)+' показов, '+
      num(item.yesterday.orders)+' заказ-кликов, WA '+num(item.yesterday.whatsapp)+
      ', TG '+num(item.yesterday.telegram))
  }
  if(sorted.length>12)lines.push('И ещё '+num(sorted.length-12)+' услуг; подробности в кабинете.')
  if(!yesterday.impressions&&!yesterday.orders&&!yesterday.whatsapp&&!yesterday.telegram)
    lines.push('', '⚠ За этот день нет зарегистрированных действий. Это не доказательство отсутствия посещений.')
  lines.push('','ℹ Переходы и клики не подтверждают отправку сообщения, запись или оплату.',
    '🔐 Только суммарные показатели, без клиентских данных.',
    '📱 https://holistichouse.vercel.app/en/app')
  const text=lines.join('\n')
  if(text.length>3900)throw Error('DIGEST_TOO_LONG')
  return Object.freeze({date:dates.yesterday,weekStart:dates.weekStart,
    text,totals:{yesterday,week},counts:{newApp,newPublic,openApp,openPublic,published,pending}})
}
