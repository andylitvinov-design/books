import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { transaction } from '@/lib/app/database'
import { safePublicPagePath, safePublicSource } from '@/lib/analytics/public-page-traffic.mjs'
import { seoMonitorPeriod } from '@/lib/analytics/seo-monitor-period.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'

const NO_STORE={
  'Cache-Control':'private, no-store, max-age=0, must-revalidate',
  'Vary':'Authorization','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:NO_STORE})
const count=value=>{const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:0}
function tokenMatch(supplied,expected){
  if(typeof supplied!=='string'||typeof expected!=='string'||expected.length<32)return false
  return timingSafeEqual(createHash('sha256').update(supplied).digest(),createHash('sha256').update(expected).digest())
}

/** Private owner-monitor bridge. Aggregate counts only, never visitor data.
 * First-party page events require explicit consent; this is not total traffic. */
export async function GET(request){
  if(process.env.VERCEL_ENV!=='production')return reply({error:'NOT_AVAILABLE'},404)
  const auth=request.headers.get('authorization')||''
  if(!auth.startsWith('Bearer ')||!tokenMatch(auth.slice(7),process.env.HH_PR_MONITOR_ANALYTICS_READ_TOKEN||''))
    return reply({error:'UNAUTHORIZED'},401)
  let period
  try{period=seoMonitorPeriod(new URL(request.url).searchParams.get('period')||'today')}
  catch{return reply({error:'INVALID_PERIOD'},400)}
  try{
    const config=getAppConfig()
    const result=await transaction(config,null,async db=>{
      const totals=await db.query(
        "select coalesce(sum(landings) filter (where day between $1::date and $2::date),0)::bigint as current_landings, "+
        "coalesce(sum(page_views) filter (where day between $1::date and $2::date),0)::bigint as current_views, "+
        "coalesce(sum(action_clicks) filter (where day between $1::date and $2::date),0)::bigint as current_clicks, "+
        "coalesce(sum(landings) filter (where day between $3::date and $4::date),0)::bigint as previous_landings, "+
        "coalesce(sum(page_views) filter (where day between $3::date and $4::date),0)::bigint as previous_views, "+
        "coalesce(sum(action_clicks) filter (where day between $3::date and $4::date),0)::bigint as previous_clicks "+
        "from app_private.public_page_source_daily where day between $3::date and $2::date",
        [period.from,period.to,period.previousFrom,period.previousTo])
      const trend=await db.query(
        "select day::text as day,sum(landings)::bigint as landings,sum(page_views)::bigint as views,"+
        "sum(action_clicks)::bigint as clicks from app_private.public_page_source_daily "+
        "where day between $1::date and $2::date group by day order by day",
        [period.from,period.to])
      const top=await db.query(
        "select page_path as path,sum(landings)::bigint as landings,sum(page_views)::bigint as views,"+
        "sum(action_clicks)::bigint as clicks from app_private.public_page_source_daily "+
        "where day between $1::date and $2::date group by page_path order by views desc,path asc limit 10",
        [period.from,period.to])
      const sources=await db.query(
        "select source,sum(landings)::bigint as landings from app_private.public_page_source_daily "+
        "where day between $1::date and $2::date group by source order by landings desc,source asc limit 14",
        [period.from,period.to])
      return {total:totals.rows[0]||{},trend:trend.rows,top:top.rows,sources:sources.rows}
    },{server:true})
    const t=result.total
    return reply({schema:'HH_SEO_FIRST_PARTY_V1',generatedAt:new Date().toISOString(),
      period,mode:'consent-only',scope:'public-pages-only',uniqueVisitorsTracked:false,
      totals:{
        entrances:{value:count(t.current_landings),previous:count(t.previous_landings)},
        pageViews:{value:count(t.current_views),previous:count(t.previous_views)},
        actionClicks:{value:count(t.current_clicks),previous:count(t.previous_clicks)}},
      trend:result.trend.map(row=>({date:row.day,entrances:count(row.landings),
        pageViews:count(row.views),actionClicks:count(row.clicks)})),
      topPages:result.top.filter(row=>safePublicPagePath(row.path))
        .map(row=>({label:row.path,entrances:count(row.landings),
          pageViews:count(row.views),actionClicks:count(row.clicks)})),
      topSources:result.sources.filter(row=>safePublicSource(row.source))
        .map(row=>({source:row.source,entrances:count(row.landings)}))})
  }catch(error){
    console.error('HH_SEO_FIRST_PARTY_AGGREGATE_FAILED',error instanceof Error?error.name:'UNKNOWN')
    return reply({error:'AGGREGATE_UNAVAILABLE'},503)
  }
}
