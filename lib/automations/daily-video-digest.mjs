/** Public-library-only daily summary; no client history, source filenames or AI prompts. */
export const VIDEO_DIGEST_TASK_ID='video-scout-digest-daily';
export const VIDEO_DIGEST_POLICY='hh-video-scout-digest-v1';
export const VIDEO_DIGEST_CRON='17 15 * * *';
const integer=value=>Number.isSafeInteger(value)&&value>=0?value:0;

/** Daily delivery is a separate single UTC occurrence, never a new Cron. */
export function videoDigestDue(slotUtc){
  const at=Date.parse(slotUtc);
  if(!Number.isFinite(at))return false;
  const d=new Date(at);
  return d.getUTCHours()===15&&d.getUTCMinutes()===17;
}
/** Counter values come exclusively from read-only SQL over the existing run ledger. */
export function safeVideoDigestStats(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('VIDEO_DIGEST_INVALID_COUNTERS');
  const fields=['slots','succeeded','failed','noChange','inserted','duplicates','sourceCalls'];
  if(fields.some(field=>!Number.isSafeInteger(Number(input[field]))||Number(input[field])<0))
    throw Error('VIDEO_DIGEST_INVALID_COUNTERS');
  const x=Object.fromEntries(fields.map(f=>[f,integer(Number(input[f]))]));
  if(x.succeeded+x.failed+x.noChange>x.slots||x.inserted>x.slots*20||x.sourceCalls>x.slots*2)
    throw Error('VIDEO_DIGEST_IMPOSSIBLE_COUNTERS');
  return Object.freeze(x);
}
export function formatVideoDigestMessage(input,{date=new Date()}={}){
  const s=safeVideoDigestStats(input);
  const iso=date instanceof Date&&Number.isFinite(date.getTime())?date.toISOString().slice(0,10):null;
  if(!iso)throw Error('VIDEO_DIGEST_INVALID_DATE');
  return [
    'Holistic House · Video Scout · '+iso+' UTC',
    'Фактические запуски за 24 часа: '+s.slots+' (успешных '+s.succeeded+', без новых '+s.noChange+', ошибок '+s.failed+').',
    'Новых исследовательских кандидатов: '+s.inserted+'. Повторов: '+s.duplicates+'. Запросов к источникам: '+s.sourceCalls+'.',
    'Кандидаты НЕ лицензированы для монтажа: проверка прав, исходных файлов и качества обязательна.',
    'https://holistichouse.vercel.app/admin/automations',
  ].join('\n');
}
