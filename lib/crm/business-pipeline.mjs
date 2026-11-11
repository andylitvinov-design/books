// CRM business consultation pipeline. These are manually edited enquiry states,
// not verified appointments, invoices or payments. All rows are supplied only
// by the existing owner-scoped CRM endpoint (up to the latest 100 requests).
export const BUSINESS_PIPELINE_STAGES=Object.freeze(['new','contacted','booked','closed'])
export const BUSINESS_PIPELINE_PAGE_LIMIT=100

export function buildBusinessPipeline(enquiries) {
  const rows=Array.isArray(enquiries)?enquiries:[]
  const buckets=Object.fromEntries(BUSINESS_PIPELINE_STAGES.map(stage=>[stage,[]]))
  let unknown=0
  for(const item of rows) {
    if(!item||typeof item!=='object'||!BUSINESS_PIPELINE_STAGES.includes(item.status)) {
      unknown++
      continue
    }
    buckets[item.status].push(item)
  }
  // Older items first inside each stage, so unanswered enquiries are easier
  // to spot. Source order is only owner-scoped and not evidence of conversion.
  for(const stage of BUSINESS_PIPELINE_STAGES) buckets[stage].sort((a,b)=>{
    const aTime=typeof a.createdAt==='string'?Date.parse(a.createdAt):NaN
    const bTime=typeof b.createdAt==='string'?Date.parse(b.createdAt):NaN
    if(Number.isFinite(aTime)&&Number.isFinite(bTime)) return aTime-bTime
    return 0
  })
  return {
    stages:BUSINESS_PIPELINE_STAGES,
    buckets,
    counts:Object.fromEntries(BUSINESS_PIPELINE_STAGES.map(stage=>[stage,buckets[stage].length])),
    loaded:rows.length,
    partial:rows.length>=BUSINESS_PIPELINE_PAGE_LIMIT,
    unknown,
  }
}
