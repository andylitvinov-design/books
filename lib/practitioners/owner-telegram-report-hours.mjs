// Vercel cron uses UTC. Trigger each slot at both possible UTC hours and
// admit only the actual America/Toronto local hour (DST-safe year round).
// Authentication and one-per-day DB receipts remain mandatory downstream.
const HOURS=Object.freeze({revenue:9,strategy:12,operations:15})
export function torontoReportHour(now=new Date()){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('INVALID_DATE')
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'America/Toronto',hour:'2-digit',hourCycle:'h23'
  }).formatToParts(now)
  return Number(parts.find(x=>x.type==='hour')?.value)
}
export function torontoReportDue(slot,now=new Date()){
  if(!Object.hasOwn(HOURS,slot))throw Error('INVALID_REPORT_SLOT')
  return torontoReportHour(now)===HOURS[slot]
}
