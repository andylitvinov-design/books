import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { createCrmRepository, crmEnabled } from '@/lib/crm/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Private owner drafts only. "approve_preview" stores an immutable snapshot;
// no customer-facing runtime, webhook, AI, scheduling, CRM lead or dispatch here.
async function handle(request) {
  let auth
  try {
    if (!crmEnabled()) throw new AppError('CRM_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 409)
    if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED', 403)
    const repo = createCrmRepository(config)

    let data
    if (request.method === 'GET') {
      if (new URL(request.url).search)
        throw new AppError('INVALID_SALESBOT_QUERY', 400)
      data = await repo.withOwner(actor, store => store.listSalesbotFlows())
      return auth.apply(NextResponse.json({
        items: data, mode: 'owner_drafts', sendsEnabled: false,
      }, { headers: PRIVATE_HEADERS }))
    }
    const body = await readBody(request, 49152)
    onlyKeys(body, ['action', 'id', 'flow', 'expectedRevision'])
    if (body.action === 'save') {
      if (body.flow === undefined) throw new AppError('INVALID_SALESBOT_FLOW', 400)
      data = await repo.withOwner(actor, store => store.saveSalesbotFlow({
        ...('id' in body ? { id: body.id } : {}),
        ...('expectedRevision' in body ? { expectedRevision: body.expectedRevision } : {}),
        flow: body.flow,
      }))
    } else if (body.action === 'approve_preview') {
      if ('flow' in body) throw new AppError('INVALID_SALESBOT_COMMAND', 400)
      data = await repo.withOwner(actor, store => store.approveSalesbotPreview({
        id: body.id, expectedRevision: body.expectedRevision,
      }))
    } else if (body.action === 'activate_internal') {
      if ('flow' in body) throw new AppError('INVALID_SALESBOT_COMMAND',400)
      data = await repo.withOwner(actor,store => store.activateInternalSalesbotFlow({
        id:body.id,expectedRevision:body.expectedRevision,
      }))
    } else if (body.action === 'pause') {
      if ('flow' in body) throw new AppError('INVALID_SALESBOT_COMMAND', 400)
      data = await repo.withOwner(actor, store => store.pauseSalesbotPreview({
        id: body.id, expectedRevision: body.expectedRevision,
      }))
    } else throw new AppError('INVALID_SALESBOT_ACTION', 400)

    return auth.apply(NextResponse.json({
      ...data, mode: 'owner_drafts', sendsEnabled: false,
    }, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    return auth
      ? auth.apply(NextResponse.json({ error: safe.code }, {
          status: safe.status, headers: PRIVATE_HEADERS,
        }))
      : NextResponse.json({ error: safe.code }, {
          status: safe.status, headers: PRIVATE_HEADERS,
        })
  }
}
export const GET = handle
export const POST = handle
