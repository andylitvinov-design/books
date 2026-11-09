// Pure, read-only calculations. Input observations must be backed by the
// provider and a saved delivery receipt; this module never fetches or publishes.
const freshCount=(metrics,key)=>{
  const item=metrics?.[key]
  return item?.status==='FRESH'&&Number.isSafeInteger(item.value)&&item.value>=0?item.value:null
}
const ratio=(numerator,denominator)=>numerator!==null&&denominator!==null&&denominator>0
  ? numerator/denominator : null

export function instagramPerformanceRates(metrics={}) {
  const reach=freshCount(metrics,'reach'),likes=freshCount(metrics,'likes')
  const comments=freshCount(metrics,'comments'),shares=freshCount(metrics,'shares')
  const saves=freshCount(metrics,'saves'),views=freshCount(metrics,'views')
  const components=[likes,comments,shares,saves]
  const total=components.every(value=>value!==null)?components.reduce((sum,value)=>sum+value,0):null
  return {
    engagementByReach:ratio(Number.isSafeInteger(total)?total:null,reach),
    savesPerReach:ratio(saves,reach),sharesPerReach:ratio(shares,reach),
    commentsPerReach:ratio(comments,reach),viewsPerReach:ratio(views,reach),
  }
}

const RATES=new Set(['engagementByReach','savesPerReach','sharesPerReach','commentsPerReach','viewsPerReach'])
const FORMATS=new Set(['IMAGE','REEL','STORY','CAROUSEL'])
const LOCALES=new Set(['en','ru','es'])
const WINDOWS=new Set(['24h','72h','7d','30d'])
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const time=value=>typeof value==='string'&&ISO.test(value)&&Number.isFinite(Date.parse(value))&&
  new Date(value).toISOString()===value
// Meta timestamps can use an explicit offset without a colon (e.g. +0000).
const providerTime=value=>typeof value==='string'&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)&&
  Number.isFinite(Date.parse(value))

export function rankInstagramPerformance({cohort,observations,metric,minimumSample}={}) {
  if(!cohort||cohort.socialAccountId!=='wizards_secrets'||!FORMATS.has(cohort.format)||
    !LOCALES.has(cohort.locale)||!WINDOWS.has(cohort.ageBucket)||
    !/^v\d+\.\d+$/.test(cohort.apiVersion||''))throw new Error('invalid_cohort')
  if(!Array.isArray(observations)||observations.length>1200||!RATES.has(metric)||
    !Number.isSafeInteger(minimumSample)||minimumSample<2||minimumSample>1200)throw new Error('invalid_ranking')
  const seen=new Set(),rows=[]
  for(const observation of observations){
    if(!observation||observation.socialAccountId!==cohort.socialAccountId||
      observation.format!==cohort.format||observation.locale!==cohort.locale||
      observation.ageBucket!==cohort.ageBucket||observation.source!=='meta_graph_api'||
      observation.apiVersion!==cohort.apiVersion||!time(observation.capturedAt))continue
    const receipt=observation.receipt
    if(receipt?.provider!=='meta_graph_api'||receipt.accountId!==cohort.socialAccountId||
      typeof receipt.providerPostId!=='string'||!/^\d{5,40}$/.test(receipt.providerPostId)||
      typeof receipt.url!=='string'||!/^https:\/\/www\.instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?$/.test(receipt.url)||
      !providerTime(receipt.publishedAt)||Date.parse(observation.capturedAt)<Date.parse(receipt.publishedAt))continue
    if(seen.has(receipt.providerPostId))throw new Error('duplicate_observation')
    seen.add(receipt.providerPostId)
    const value=instagramPerformanceRates(observation.metrics)[metric]
    if(value!==null)rows.push({providerPostId:receipt.providerPostId,url:receipt.url,
      capturedAt:observation.capturedAt,publishedAt:receipt.publishedAt,value})
  }
  if(rows.length<minimumSample)return {status:'INSUFFICIENT_EVIDENCE',sampleSize:rows.length,rows:[]}
  rows.sort((a,b)=>b.value-a.value||a.providerPostId.localeCompare(b.providerPostId))
  return {status:'READY',sampleSize:rows.length,rows}
}
