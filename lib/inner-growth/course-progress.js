// Pure, deterministic day and measurement calculations. No clinical inference.
// All daily observations refer to a fixed 24-hour recall window.
export function validTimeZone(zone) {
  if (typeof zone!=='string' || zone.length>100 || !zone.trim()) return false
  try { new Intl.DateTimeFormat('en-US',{timeZone:zone}).format(new Date());return true }
  catch { return false }
}
export function localDateKey(timestamp=Date.now(),timeZone='UTC') {
  if(!validTimeZone(timeZone)) throw new Error('INVALID_TIMEZONE')
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(timestamp))
  const pick=(key)=>parts.find(p=>p.type===key)?.value
  return [pick('year'),pick('month'),pick('day')].join('-')
}
export function addCalendarDays(dateKey,amount) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)||!Number.isInteger(amount)) throw new Error('INVALID_DATE')
  const date=new Date(dateKey+'T00:00:00.000Z')
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==dateKey) throw new Error('INVALID_DATE')
  date.setUTCDate(date.getUTCDate()+amount)
  return date.toISOString().slice(0,10)
}
export function courseDayFromDates(startLocalDay,todayLocalDay,duration=14) {
  if(![14,28].includes(duration)) throw new Error('INVALID_DURATION')
  const start=Date.parse(startLocalDay+'T00:00:00Z'),today=Date.parse(todayLocalDay+'T00:00:00Z')
  if(!Number.isFinite(start)||!Number.isFinite(today)) throw new Error('INVALID_DATE')
  return Math.min(duration,Math.max(1,Math.round((today-start)/86400000)+1))
}
export function courseToday(startLocalDay,timeZone,duration=14,now=Date.now()) {
  const today=localDateKey(now,timeZone), day=courseDayFromDates(startLocalDay,today,duration)
  return {date:today,day,dayStart:addCalendarDays(startLocalDay,day-1),isAfterCycle:today>addCalendarDays(startLocalDay,duration-1)}
}
// The active lesson follows server-confirmed completions, not elapsed dates.
// On its saved local day, show that lesson's result; never unlock two lessons
// in one local day, and never expire unfinished lessons after calendar gaps.
export function courseLessonProgress({sessions=[],timeZone='UTC',duration=14,now=Date.now(),completed=false}={}) {
  if(![14,28].includes(duration))throw new Error('INVALID_DURATION')
  const date=localDateKey(now,timeZone)
  const rows=(Array.isArray(sessions)?sessions:[]).filter(row=>
    Number.isInteger(row?.dayNumber)&&row.dayNumber>=1&&row.dayNumber<=duration&&
    typeof row.localDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.localDate)&&Boolean(row.completedAt))
  const saved=new Set(rows.map(row=>row.dayNumber))
  let consecutive=0
  while(consecutive<duration&&saved.has(consecutive+1))consecutive++
  const savedToday=rows.filter(row=>row.localDate===date)
    .sort((x,y)=>y.dayNumber-x.dayNumber)[0]||null
  const day=savedToday?.dayNumber??(completed?duration:Math.min(duration,consecutive+1))
  const dates=new Set(rows.filter(row=>row.localDate<=date).map(row=>row.localDate))
  let cursor=dates.has(date)?date:addCalendarDays(date,-1),streak=0
  while(dates.has(cursor)&&streak<duration){streak++;cursor=addCalendarDays(cursor,-1)}
  return {date,day,completedToday:Boolean(savedToday),
    isAfterCycle:(completed||consecutive===duration)&&!savedToday,
    nextAvailableLocalDate:savedToday?addCalendarDays(date,1):date,streak}
}

export function optionalRating(value) {
  return value===null||value===undefined ? null : Number.isInteger(value)&&value>=0&&value<=10 ? value : undefined
}
export function validateDailyRatings({severity,interference=null,resource=null}) {
  const a=optionalRating(severity),b=optionalRating(interference),c=optionalRating(resource)
  if(a===null||[a,b,c].some(x=>x===undefined)) throw new Error('INVALID_DAILY_RATING')
  return {severity:a,interference:b,resource:c}
}
function median(values) {
  if(values.length<4)return null
  const s=[...values].sort((a,b)=>a-b)
  return s.length%2 ? s[(s.length-1)/2] : (s[s.length/2-1]+s[s.length/2])/2
}
export function describeCycle({startLocalDay,duration=14,checkins=[],sessions=[]}) {
  const days=Array.from({length:duration},(_,index)=>{
    const day=index+1,date=addCalendarDays(startLocalDay,index)
    const checkin=checkins.find(row=>row.localDate===date)
    const session=sessions.find(row=>row.dayNumber===day)
    return {day,date,severity:checkin?.severity??null,interference:checkin?.interference??null,
      resource:checkin?.resource??null,sessionCompleted:Boolean(session?.completedAt),
      beforeNow:optionalRating(session?.beforeNow)??null,
      afterNow:optionalRating(session?.afterNow)??null,
      comfort:session?.feedback??null}
  })
  const observed=days.filter(d=>d.severity!==null)
  const first=observed[0],last=observed[observed.length-1]
  return {
    days,observations:observed.length,practiceCount:days.filter(d=>d.sessionCompleted).length,
    initial:first ? {date:first.date,value:first.severity}:null,
    latest:last ? {date:last.date,value:last.severity}:null,
    weeklyMedian:[
      median(days.slice(0,7).filter(d=>d.severity!==null).map(d=>d.severity)),
      median(days.slice(7,14).filter(d=>d.severity!==null).map(d=>d.severity)),
    ],
    comparison: first&&last&&first.date!==last.date
      ? {from:first.severity,to:last.severity,change:last.severity-first.severity}
      : null,
    helpful:days.filter(d=>d.comfort==='helped').length,
    uncomfortable:days.filter(d=>d.comfort==='uncomfortable').length,
  }
}
