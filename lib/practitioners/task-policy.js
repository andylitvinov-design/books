export const PRACTITIONER_TASK_KINDS=Object.freeze(['reply','call','booking','check_in','general'])
export const PRACTITIONER_TASK_LIMIT_PER_REQUEST=25
const DATE=/^(20\d\d)-(\d\d)-(\d\d)$/
export function torontoToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
  const number=key=>parts.find(part=>part.type===key)?.value||''
  return [number('year'),number('month'),number('day')].join('-')
}
export function validTaskDay(day,today=torontoToday()){
  const match=typeof day==='string'?DATE.exec(day):null
  if(!match)return false
  const year=Number(match[1]),month=Number(match[2]),dayOfMonth=Number(match[3])
  const date=new Date(Date.UTC(year,month-1,dayOfMonth))
  if(date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||
      date.getUTCDate()!==dayOfMonth)return false
  const base=new Date(today+'T00:00:00Z')
  if(!Number.isFinite(base.getTime()))return false
  const gap=(date-base)/86400000
  return Number.isSafeInteger(gap)&&gap>=0&&gap<=730
}
export function taskKindAllowed(kind){return PRACTITIONER_TASK_KINDS.includes(kind)}
