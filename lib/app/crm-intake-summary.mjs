// Pure client-side summary of ALREADY authenticated owner request rows.
// This is a bounded loaded-inbox view, never claimed as all-time CRM analytics.
// Unknown attribution stays unknown; no tracking or third-party calls.
export const CRM_INTAKE_PERIODS=Object.freeze({day:1,week:7,month:30})
const cleanText=(value,fallback,max=80)=>
  typeof value==='string'&&value.trim()?value.trim().slice(0,max):fallback

export function summarizeLoadedCrmEnquiries({requests=[],businessEnquiries=[]}={},period='week',now=Date.now()){
  const days=CRM_INTAKE_PERIODS[period]
  if(!days||!Number.isFinite(now))throw new TypeError('Invalid CRM summary interval')
  const from=now-days*86400000
  const collected=[]
  const seen=new Set()
  for(const [kind,items] of [['website',requests],['business',businessEnquiries]]){
    if(!Array.isArray(items))continue
    for(const row of items){
      if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id.trim())continue
      const identity=kind+':'+row.id
      if(seen.has(identity))continue
      seen.add(identity)
      const at=Date.parse(row.createdAt||'')
      if(!Number.isFinite(at)||at<from||at>now+300000)continue
      const rawSource=row.attribution?.trafficSource
      const source=kind==='business'?'business-form':
        (typeof rawSource==='string'&&/^[a-z0-9_-]{1,32}$/.test(rawSource)?rawSource:'unknown')
      const service=kind==='business'?'Business consulting':
        cleanText(row.serviceTitle,'Unspecified service',100)
      collected.push({
        status:row.status,
        source,service,
        requiresReply:kind==='website'?row.status==='requested':row.status==='new',
        // A manually entered phone or email is not a verified messenger.
        noVerifiedMessenger:kind==='website'&&row.requestKind==='public'&&!row.telegramThreadId,
      })
    }
  }
  const bySource=new Map(),byService=new Map()
  for(const row of collected){
    bySource.set(row.source,(bySource.get(row.source)||0)+1)
    byService.set(row.service,(byService.get(row.service)||0)+1)
  }
  const ranked=map=>[...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .map(([name,count])=>({name,count}))
  return {
    period,
    count:collected.length,
    awaitingFirstAction:collected.filter(row=>row.requiresReply).length,
    withoutVerifiedMessenger:collected.filter(row=>row.noVerifiedMessenger).length,
    bySource:ranked(bySource),byService:ranked(byService),
    firstResponseMinutes:null,
    scope:'loaded_rows_only',
  }
}
