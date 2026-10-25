import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { consumeRate, transaction } from '@/lib/app/database'
import { readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { safePublicPagePath, safePublicSource } from '@/lib/analytics/public-page-traffic.mjs'
import { publicStatsExclusion, applyOwnerStatsSkip } from '@/lib/analytics/public-stats-owner.js'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'

export async function POST(request) {
  try {
    const config=getAppConfig()
    requireSameOrigin(request,config)
    // The standalone first-party opt-in is independent from the GA4/Meta hold.
    if (request.cookies.get('hh_public_stats_consent')?.value !== 'v1')
      return new NextResponse(null,{status:204,headers:{'Cache-Control':'no-store'}})
    const {exclude,verifiedOwner}=await publicStatsExclusion(request,config)
    if (exclude) {
      const response=new NextResponse(null,{status:204,headers:{'Cache-Control':'no-store'}})
      return verifiedOwner?applyOwnerStatsSkip(response):response
    }
    const input=await readBody(request,384)
    onlyKeys(input,['path','source','event'])
    const path=safePublicPagePath(input.path)
    const source=safePublicSource(input.source)
    if(!path||!source||!['landing','view','click'].includes(input.event))
      throw new AppError('INVALID_PUBLIC_STAT',400)
    // Existing HMAC/TTL rate limiter. IP is never saved in analytics rows.
    const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown')
      .split(',')[0].trim().slice(0,70)
    await consumeRate(config,{op:'public-page-stats',ip},120,60)
    await transaction(config,null,async db=>{
      const result=await db.query(
        `insert into app_private.public_page_source_daily
          (day,page_path,source,landings,page_views,action_clicks)
         values((now() at time zone 'America/Toronto')::date,$1,$2,
           case when $3='landing' then 1 else 0 end,
           case when $3 in ('landing','view') then 1 else 0 end,
           case when $3='click' then 1 else 0 end)
         on conflict(day,page_path,source) do update set
           landings=app_private.public_page_source_daily.landings+excluded.landings,
           page_views=app_private.public_page_source_daily.page_views+excluded.page_views,
           action_clicks=app_private.public_page_source_daily.action_clicks+excluded.action_clicks,
           updated_at=now()`,
        [path,source,input.event])
      return result.rowCount===1
    },{server:true})
    return new NextResponse(null,{status:204,headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    const {status,code}=safeError(error)
    return NextResponse.json({error:code},{status,headers:{'Cache-Control':'no-store'}})
  }
}
