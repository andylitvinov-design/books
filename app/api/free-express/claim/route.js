import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate, transaction } from '@/lib/app/database'
import { openSealed } from '@/lib/app/crypto'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { freeExpressProof, withFreeExpressRequest } from '@/lib/practitioners/free-express-enquiry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

async function handle(request) {
  let auth
  try {
    if (process.env.HH_FREE_EXPRESS_V2_ENABLED !== 'true')
      throw new AppError('FEATURE_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method === 'POST') requireSameOrigin(request, config)
    else if (request.headers.get('sec-fetch-site') === 'cross-site')
      throw new AppError('ORIGIN_DENIED', 403)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id')
        && request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 409)
    await consumeRate(config, { op: 'free-express-account-save', actor: actor.id }, 12, 3600)
    let result
    if (request.method === 'GET') {
      const rows = await transaction(config, actor, async db =>
        (await db.query(
          `select reference_code,locale,saved_at
           from app_private.free_express_account_links
           where account_id=$1 order by saved_at desc limit 10`,
          [actor.id],
        )).rows)
      result = { saved: rows.map(row => ({
        referenceCode: row.reference_code, locale: row.locale, savedAt: row.saved_at,
      })) }
    } else {
      const input = await readBody(request, 512)
      if (!input || typeof input !== 'object' || Array.isArray(input)
        || typeof input.referenceCode !== 'string'
        || !/^HH-[A-F0-9]{12}$/.test(input.referenceCode))
        throw new AppError('INVALID_REQUEST', 400)
      if (input.action === 'read') {
        if (Object.keys(input).some(key => !['action','referenceCode'].includes(key)))
          throw new AppError('INVALID_REQUEST', 400)
        const found = await transaction(config, actor, async db =>
          (await db.query(
            `select e.id,e.recipient_practitioner_id,e.description_ciphertext
             from app_private.free_express_account_links l
             join app.public_service_enquiries e on e.id=l.enquiry_id
             where l.account_id=$1 and l.reference_code=$2 limit 1`,
            [actor.id, input.referenceCode],
          )).rows[0])
        if (!found) throw new AppError('NOT_FOUND', 404)
        const description = openSealed(found.description_ciphertext, {
          accountId: found.recipient_practitioner_id, recordId: found.id,
          field: 'public_lead.message',
        }, config)
        if (typeof description !== 'string') throw new AppError('PRIVATE_DATA_UNAVAILABLE', 503)
        result = { saved: true, referenceCode: input.referenceCode, description }
      } else {
        if (Object.keys(input).some(key => !['consent','referenceCode'].includes(key))
          || input.consent !== true)
          throw new AppError('EXPLICIT_CONSENT_REQUIRED', 400)
        const proof = freeExpressProof(request, config)
        const row = await withFreeExpressRequest(config, proof, ({ row }) => row)
        if (input.referenceCode !== row.reference_code)
          throw new AppError('ENQUIRY_CONTINUATION_MISMATCH', 409)
        const linked = await transaction(config, actor, async db => {
        // The row may be claimed by one and only one verified account.
        await db.query(
          `insert into app_private.free_express_account_links
             (enquiry_id,account_id,reference_code,locale,recipient_practitioner_id)
           values($1,$2,$3,$4,$5) on conflict (enquiry_id) do nothing`,
          [row.id, actor.id, row.reference_code, row.locale, row.recipient_practitioner_id],
        )
        return (await db.query(
          'select enquiry_id from app_private.free_express_account_links where enquiry_id=$1 and account_id=$2',
          [row.id, actor.id],
        )).rows[0]
      })
      if (!linked) throw new AppError('ENQUIRY_ALREADY_CLAIMED', 409)
        result = { saved: true, referenceCode: row.reference_code }
      }
    }
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
