/** Toronto-local reporting dates with exact, non-overlapping prior periods. */
export const TIME_ZONE = 'America/Toronto';
export const PERIOD_KEYS = Object.freeze(['today', 'yesterday', '7d', '30d']);
function torontoDate(now) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(now).map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
}
export function shiftDate(date,delta) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isSafeInteger(delta))throw TypeError('INVALID_DATE');
  const d=new Date(date+'T12:00:00.000Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw TypeError('INVALID_DATE');
  d.setUTCDate(d.getUTCDate()+delta);
  return d.toISOString().slice(0,10);
}
export function seoMonitorPeriod(key,now=new Date()) {
  if(!PERIOD_KEYS.includes(key)||!(now instanceof Date)||!Number.isFinite(now.getTime()))throw TypeError('INVALID_PERIOD');
  const local=torontoDate(now),days=key==='30d'?30:key==='7d'?7:1;
  const to=key==='yesterday'?shiftDate(local,-1):local,from=shiftDate(to,1-days);
  return Object.freeze({key,from,to,previousFrom:shiftDate(from,-days),previousTo:shiftDate(from,-1),
    partial:key!=='yesterday',timeZone:TIME_ZONE});
}
