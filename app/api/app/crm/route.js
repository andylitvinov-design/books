import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { createCrmRepository, crmEnabled } from '@/lib/crm/repository'
import { billingRegistryEnabled } from '@/lib/crm/billing-registry'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request) {
  let auth
  try {
    if (!crmEnabled()) throw new AppError('CRM_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
    if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED', 403)
    const repo = createCrmRepository(config)
    let data
    if (request.method === 'GET') {
      data = await repo.withOwner(actor, async (store) => ({ contacts: await store.listContacts(), drafts: await store.listDrafts(), subscribers: await store.listSubscribers(), subscriberRegistryEnabled: billingRegistryEnabled(), sendingEnabled: false }))
    } else {
      const body = await readBody(request, 8192)
      onlyKeys(body, ['action', 'payload'])
      if (!['create_contact', 'record_consent', 'create_draft'].includes(body.action)) throw new AppError('INVALID_ACTION', 400)
      data = await repo.withOwner(actor, (store) => body.action === 'create_contact' ? store.createContact(body.payload) : body.action === 'record_consent' ? store.recordConsent(body.payload) : store.createDraft(body.payload))
    }
    return auth.apply(NextResponse.json(data, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export const GET = handle
export const POST = handle
