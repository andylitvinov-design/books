// Pure date and rating helpers. Explicit IANA timezones; no UTC-midnight drift.
export function validatedTimezone(value) {
  if(typeof value!=='string' || value.length>80 || !/^[A-Za-z0-9_+\/-]+$/.test(value)) throw new Error('INVALID_TIMEZONE')
  try { new Intl.DateTimeFormat('en-US',{timeZone:value}).format(new Date()) } catch { throw new Error('INVALID_TIMEZONE') }
  return value
}
export function localDateAt(now,timezone) {
  const zone=validatedTimezone(timezone)
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(new Date(now)).map(({type,value})=>[type,value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
function civilTime(date) {
  if(typeof date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) throw new Error('INVALID_DATE')
  const [year,month,day]=date.split('-').map(Number)
  const time=Date.UTC(year,month-1,day)
  if(new Date(time).toISOString().slice(0,10)!==date) throw new Error('INVALID_DATE')
  return time
}
export function localDayNumber(start, current, durationDays=14) {
  const delta=Math.round((civilTime(current)-civilTime(start))/86400000)+1
  return Math.max(1,Math.min(durationDays,delta))
}
export function dayAvailable(start,current,durationDays=14) {
  const delta=Math.round((civilTime(current)-civilTime(start))/86400000)+1
  return delta>=1 && delta<=durationDays
}
export function validRating(value,{optional=false}={}) {
  if(optional&&(value===null||value===undefined)) return null
  if(!Number.isInteger(value)||value<0||value>10) throw new Error('INVALID_RATING')
  return value
}
export function localTrend(checkins=[],key='severity24h') {
  return (Array.isArray(checkins)?checkins:[])
    .filter(row=>typeof row.localDate==='string' && row.localDate.length===10)
    .sort((a,b)=>a.localDate.localeCompare(b.localDate))
    .map(row=>({date:row.localDate,value:Number.isInteger(row[key])?row[key]:null}))
}
export function median(values=[]) {
  const numbers=values.filter(Number.isFinite).sort((a,b)=>a-b)
  if(!numbers.length) return null
  const half=Math.floor(numbers.length/2)
  return numbers.length%2?numbers[half]:(numbers[half-1]+numbers[half])/2
}
export function trendReview(checkins=[],sessions=[],days=14) {
  const sorted=localTrend(checkins)
  const within=sorted.slice(-days)
  const valid=within.filter(entry=>Number.isInteger(entry.value))
  return {
    first:valid[0]||null,last:valid.at(-1)||null,
    medianLastWeek:valid.slice(-7).length>=4?median(valid.slice(-7).map(x=>x.value)):null,
    ratings:within,ratingsCount:valid.length,practicesCount:sessions.length,
    cannotInferCause:true,measurementType:'original-non-diagnostic-24h-self-monitoring',
  }
}
