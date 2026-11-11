import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { transaction, consumeRate } from '@/lib/app/database'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { AppError } from '@/lib/assessments/contracts'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { dispatchPublicServiceEnquiryTelegram } from '@/lib/app/public-enquiry-telegram'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Owner-initiated recovery ONLY for post-commit notifications with no prior
// provider claim. Unknown/accepted/failed dispatches are never replayed.
export async function POST(request) {
  let auth
  try {
    const config = getAppConfig()
    requestOrigin(request, config)
    requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED',403)
    await consumeRate(config, {op:'crm-public-notification-manual-recovery',ownerId:actor.id}, 4, 3600)
    // RLS requires the signed-in, active owner and matches the exact recipient.
    // No personal lead body, contact or provider token is read or returned.
    const pending = await transaction(config, actor, async db => (await db.query(
      `select i.enquiry_id as "enquiryId", e.operation_id as "operationId"
         from app_private.notification_public_enquiry_intents i
         join app.public_service_enquiries e on e.id=i.enquiry_id
         join app.practitioners p on p.id=e.recipient_practitioner_id
        where i.owner_id=$1 and p.trusted_auth_user_id=$1
          and e.contact_ciphertext is not null
          and not exists (
            select 1 from app_private.notification_telegram_public_dispatch d
             where d.enquiry_id=i.enquiry_id and d.account_id=$1
          )
        order by i.created_at desc,i.enquiry_id desc limit 3`,
      [actor.id],
    )).rows)
    let attempted=0,accepted=0
    for (const item of pending) {
      // Existing transport checks allowlisted owner, per-hour limits, verified
      // Telegram chat and provider-specific idempotent claim under SQL lock.
      const result = await dispatchPublicServiceEnquiryTelegram(config,item.enquiryId,item.operationId)
      attempted += result.attempted || 0
      accepted += result.accepted || 0
    }
    return auth.apply(NextResponse.json(
      {scanned:pending.length,attempted,accepted,mode:'manual_missing_claims_only'},
      {headers:PRIVATE_HEADERS},
    ))
  } catch (error) {
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
