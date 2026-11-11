import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { crmEnabled } from '@/lib/crm/repository'
import { SALESBOT_TEMPLATES, simulateSalesbotFlow } from '@/lib/crm/salesbot-flow.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ONLY simulation. This endpoint must never send a message, mutate CRM,
// schedule tasks, persist draft flows, create a lead or authorize payment.
// All future effects require independent API contracts and release gates.
export async function POST(request) {
  let auth
  try {
    if (!crmEnabled()) throw new AppError('CRM_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 409)
    if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED', 403)

    const body = await readBody(request, 16384)
    onlyKeys(body, ['flow', 'input'])
    let result
    try {
      const flow = body.flow === undefined
        ? SALESBOT_TEMPLATES[0] : body.flow
      result = simulateSalesbotFlow(flow, body.input ?? {})
    } catch (error) {
      if (/^(?:INVALID_SALESBOT_|DUPLICATE_SALESBOT_|MISSING_SALESBOT_|UNREACHABLE_SALESBOT_|SALESBOT_)/.test(error?.message || ''))
        throw new AppError(error.message, 400)
      throw error
    }
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, {
      status: safe.status, headers: PRIVATE_HEADERS,
    })
    return auth ? auth.apply(response) : response
  }
}
