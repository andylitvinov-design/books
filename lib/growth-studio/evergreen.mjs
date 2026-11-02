// Reuse an owner's already-approved public editorial post as separate future drafts.
// Never calls a provider, schedules remotely, changes source approval or auto-publishes.
import {GrowthStudioError,isSavedGrowthPost} from './model.mjs'
import {prepareGrowthBulk} from './bulk.mjs'
import {torontoWallTimeToUtc} from './manual-calendar.mjs'

const CADENCE = Object.freeze({weekly:7,biweekly:14,monthly:null})
const MAX_DRAFTS=10
const MAX_HORIZON_MS=370*86400_000
const MIN_LEAD_MS=60*60_000
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const fail=code=>{throw new GrowthStudioError(code)}
const zoneFormat=new Intl.DateTimeFormat('en-US',{
  timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23',
})
function wallClock(utc) {
  const record=Object.fromEntries(zoneFormat.formatToParts(utc)
    .filter(piece=>piece.type!=='literal')
    .map(piece=>[piece.type,Number(piece.value)]))
  return {year:record.year,month:record.month,day:record.day,
    hour:record.hour,minute:record.minute}
}
const pad=number=>String(number).padStart(2,'0')
function nthLocalDate(origin,index,cadence){
  if(cadence==='monthly'){
    const first=new Date(Date.UTC(origin.year,origin.month-1+index,1))
    const year=first.getUTCFullYear(),month=first.getUTCMonth()+1
    const last=new Date(Date.UTC(year,month,0)).getUTCDate()
    return [year,pad(month),pad(Math.min(origin.day,last))].join('-')
  }
  const shifted=new Date(Date.UTC(origin.year,origin.month-1,origin.day+CADENCE[cadence]*index))
  return shifted.toISOString().slice(0,10)
}
export function prepareEvergreenGrowthDrafts(input,{source,now=new Date()}={}){
  if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(key=>!['batchId','expectedRevision','cadence','count','startAt'].includes(key))||
      typeof input.batchId!=='string'||!UUID.test(input.batchId)||
      !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1 ||
      !Object.hasOwn(CADENCE,input.cadence)||
      !Number.isSafeInteger(input.count)||input.count<1||input.count>MAX_DRAFTS||
      typeof input.startAt!=='string'||!UTC.test(input.startAt)||
      !Number.isFinite(Date.parse(input.startAt))||
      new Date(input.startAt).toISOString()!==input.startAt)
    fail('invalid_recurrence')
  if(!isSavedGrowthPost(source)||input.expectedRevision!==source.revision||
      !['approved','planned_manual','published'].includes(source.status))
    fail('invalid_source')
  const instant=now instanceof Date?now:new Date(now)
  const base=new Date(input.startAt)
  if(!Number.isFinite(instant.getTime())||
      base.getTime()<instant.getTime()+MIN_LEAD_MS)fail('invalid_recurrence')
  const wall=wallClock(base)
  const localTime=pad(wall.hour)+':'+pad(wall.minute)
  // Never guess between two clocks during the autumn DST overlap.
  const originalDate=nthLocalDate(wall,0,input.cadence)
  if(torontoWallTimeToUtc(originalDate,localTime)!==input.startAt)fail('invalid_recurrence')
  const entries=[]
  for(let index=0;index<input.count;index++){
    const day=nthLocalDate(wall,index,input.cadence)
    const scheduledAt=torontoWallTimeToUtc(day,localTime)
    if(!scheduledAt||Date.parse(scheduledAt)>instant.getTime()+MAX_HORIZON_MS)
      fail('invalid_recurrence')
    const suffix=' · repeat '+(index+1)
    entries.push({
      brand:source.brand,channel:source.channel,locale:source.locale,
      title:source.title.slice(0,120-suffix.length)+suffix,
      caption:source.caption,sourceUrl:source.sourceUrl,campaign:source.campaign,
      scheduledAt,mediaUrl:source.mediaUrl,mediaAlt:source.mediaAlt,
    })
  }
  // prepareGrowthBulk only creates status=draft; repetition is never approval.
  return prepareGrowthBulk({batchId:input.batchId,entries},instant)
}
