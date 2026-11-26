import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {transaction} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

// Lightweight read-only published offering shortlist for the Sessions tab.
// A reduced Profile bootstrap deliberately does NOT return the service catalog.
export async function GET(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(new URL(request.url).search)throw new AppError('INVALID_QUERY',400)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  const services=await transaction(config,actor,async db=>{
   const rows=(await db.query(
    "select s.id,s.slug,s.localized_copy,s.confirmed_price,s.currency,s.duration_minutes,s.pricing_mode,p.slug as practitioner_slug "+
    "from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id "+
    "where s.active and s.localized_copy<>'{}'::jsonb "+
    "and s.status = 'published' "+
    "and p.active and p.public_profile<>'{}'::jsonb "+
    "and p.status = 'approved' "+
    "order by (s.pricing_mode='free') desc,p.is_partner desc,s.created_at,s.id limit 12"
   )).rows
   return rows.map(row=>({
    id:row.id,slug:row.slug,practitionerSlug:row.practitioner_slug,
    copy:row.localized_copy,confirmedPrice:row.confirmed_price==null?null:Number(row.confirmed_price),
    currency:row.currency||'',durationMinutes:row.duration_minutes,pricingMode:row.pricing_mode,
   }))
  })
  return auth.apply(NextResponse.json({services},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
