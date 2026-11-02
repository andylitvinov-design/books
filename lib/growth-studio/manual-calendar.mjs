// Owner-only planning aids. These functions NEVER call a social provider or schedule a remote post.
import {GROWTH_BRANDS,GROWTH_CHANNELS,isSavedGrowthPost,publicCampaignLink} from './model.mjs'

export const MANUAL_CALENDAR_ZONE='America/Toronto'
export const MANUAL_SLOT_WEEKDAYS=Object.freeze([1,2,3,4,5])
export const MANUAL_SLOT_TIMES=Object.freeze(['10:00','17:00'])
const DAY=86400000
const FORMAT=new Intl.DateTimeFormat('en-US',{timeZone:MANUAL_CALENDAR_ZONE,
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
function partsAt(value) {
  const date=value instanceof Date?value:new Date(value)
  if(!Number.isFinite(date.getTime()))return null
  const fields=FORMAT.formatToParts(date)
  const get=key=>Number(fields.find(part=>part.type===key)?.value)
  return {year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute')}
}
function validDate(date) {
  if(typeof date!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(date))return null
  const [year,month,day]=date.split('-').map(Number)
  const utc=new Date(Date.UTC(year,month-1,day))
  if(year<2020||year>2100||utc.getUTCFullYear()!==year||
    utc.getUTCMonth()!==month-1||utc.getUTCDate()!==day)return null
  return {year,month,day,utc}
}
const timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/
export function torontoWallTimeToUtc(day,time) {
  const input=validDate(day)
  if(!input||typeof time!=='string'||!timePattern.test(time))return null
  const [hour,minute]=time.split(':').map(Number)
  const base=Date.UTC(input.year,input.month-1,input.day,hour,minute)
  // America/Toronto observes EST (UTC-5) / EDT (UTC-4) during this planner's horizon.
  // Compare wall-clock parts to IANA timezone rules to reject DST gaps and repeated hours.
  const matches=[4,5].map(offset=>new Date(base+offset*3600000)).filter(date=>{
    const parts=partsAt(date)
    return parts?.year===input.year&&parts.month===input.month&&parts.day===input.day&&
      parts.hour===hour&&parts.minute===minute
  })
  return matches.length===1?matches[0].toISOString():null
}
function matchesTarget(item,brand,channel,excludeId) {
  return item&&item.id!==excludeId&&item.brand===brand&&item.channel===channel&&
    item.status==='planned_manual'&&typeof item.scheduledAt==='string'&&
    Number.isFinite(Date.parse(item.scheduledAt))
}
export function findManualTimeConflicts({records=[],brand,channel,scheduledAt,excludeId=null,minGapMinutes=15}={}) {
  if(!Array.isArray(records)||!Object.hasOwn(GROWTH_BRANDS,brand)||
      !GROWTH_CHANNELS.includes(channel)||!Number.isFinite(Date.parse(scheduledAt||''))||
      !Number.isInteger(minGapMinutes)||minGapMinutes<1||minGapMinutes>1440)return []
  const target=Date.parse(scheduledAt)
  return records.filter(item=>matchesTarget(item,brand,channel,excludeId)&&
    Math.abs(Date.parse(item.scheduledAt)-target)<minGapMinutes*60000)
}
export function nextManualSlot({brand,channel,records=[],now=new Date(),weekdays=MANUAL_SLOT_WEEKDAYS,
 times=MANUAL_SLOT_TIMES,minGapMinutes=15,maxDays=45,excludeId=null}={}) {
  if(!Object.hasOwn(GROWTH_BRANDS,brand)||!GROWTH_CHANNELS.includes(channel)||
     !Array.isArray(records)||!Array.isArray(weekdays)||weekdays.length<1||
     weekdays.some(day=>!Number.isInteger(day)||day<0||day>6)||
     !Array.isArray(times)||times.length<1||times.length>12||
     times.some(time=>typeof time!=='string'||!timePattern.test(time))||
     !Number.isInteger(maxDays)||maxDays<1||maxDays>90||
     !Number.isInteger(minGapMinutes)||minGapMinutes<1||minGapMinutes>1440)return null
  const current=now instanceof Date?now:new Date(now)
  const parts=partsAt(current)
  if(!parts)return null
  const localBase=Date.UTC(parts.year,parts.month-1,parts.day)
  const days=new Set(weekdays)
  const proposedTimes=[...new Set(times)].sort()
  for(let i=0;i<maxDays;i++){
    const calendarDate=new Date(localBase+i*DAY)
    if(!days.has(calendarDate.getUTCDay()))continue
    const day=calendarDate.toISOString().slice(0,10)
    for(const time of proposedTimes){
      const scheduledAt=torontoWallTimeToUtc(day,time)
      if(!scheduledAt||Date.parse(scheduledAt)<current.getTime()+10*60000)continue
      if(findManualTimeConflicts({records,brand,channel,scheduledAt,minGapMinutes,excludeId}).length)continue
      return {scheduledAt,timeZone:MANUAL_CALENDAR_ZONE,localDate:day,localTime:time,delivery:'manual_only'}
    }
  }
  return null
}
function safeText(value,max=150) {
  return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)
}
function icalEscape(value) {
  return String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')
}
function foldLine(line) {
  const encoder=new TextEncoder()
  let out='',bytes=0
  for(const char of line){
    const n=encoder.encode(char).length
    if(bytes+n>75){out+='\r\n ';bytes=1}
    out+=char;bytes+=n
  }
  return out
}
function icalDate(value) {
  const iso=new Date(value).toISOString()
  return iso.slice(0,19).replaceAll('-','').replaceAll(':','')+'Z'
}
export function buildManualCalendarIcs(records,{now=new Date(),reminderMinutes=15}={}) {
  if(!Array.isArray(records)||!Number.isInteger(reminderMinutes)||
      reminderMinutes<0||reminderMinutes>1440||
      !Number.isFinite(new Date(now).getTime()))throw new Error('INVALID_MANUAL_CALENDAR')
  const lines=[
    'BEGIN:VCALENDAR','VERSION:2.0',
    'PRODID:-//Holistic House//Growth Studio Manual Reminders//EN',
    'CALSCALE:GREGORIAN','X-WR-CALNAME:Growth Studio manual posting',
    'X-WR-TIMEZONE:America/Toronto'
  ]
  const posts=records.filter(post=>post?.status==='planned_manual'&&isSavedGrowthPost(post))
    .sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)||a.id.localeCompare(b.id))
  for(const post of posts){
    const title=safeText(post.title,120)
    const label=safeText(post.brand+' / '+post.channel,90)
    const link=publicCampaignLink(post)
    lines.push('BEGIN:VEVENT','UID:'+post.id+'@holistichouse.vercel.app',
      'DTSTAMP:'+icalDate(now),'DTSTART:'+icalDate(post.scheduledAt),
      'DTEND:'+icalDate(new Date(Date.parse(post.scheduledAt)+15*60000)),
      'SUMMARY:'+icalEscape('MANUAL post — '+label+' — '+title),
      'DESCRIPTION:'+icalEscape(['Manual reminder only — NOT published or automatically scheduled.',
         'Target: '+label, link?'Public campaign link: '+link:''].filter(Boolean).join('\n')),
      'STATUS:CONFIRMED','TRANSP:OPAQUE')
    if(reminderMinutes>0)lines.push('BEGIN:VALARM',
      'TRIGGER:-PT'+reminderMinutes+'M','ACTION:DISPLAY',
      'DESCRIPTION:Manual posting reminder (not published)','END:VALARM')
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n')+'\r\n'
}
