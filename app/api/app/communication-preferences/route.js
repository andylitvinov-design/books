import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { createCrmRepository, crmEnabled } from '@/lib/crm/repository'
import { telegramDiagnosticPublicUrl } from '@/lib/crm/telegram-diagnostic.mjs'
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
    const repo = createCrmRepository(config)
    const input = request.method === 'GET' ? null : await readBody(request, 2048)
    // The website preference does not enroll a customer in the CRM Telegram
    // bot. That bot requires its own /agree + /subscribe commands.
    if (input?.accepted === true && input.channel !== 'email')
      throw new AppError('SUBSCRIBE_IN_PROVIDER',409)
    if (input?.accepted === true && !actor.email)
      throw new AppError('CHANNEL_NOT_VERIFIED',409)
    const data = await repo.withOwner(actor, (store) => input ? store.setOwnPreference(input) : store.getOwnPreferences())
    const requestedLocale=new URL(request.url).searchParams.get('locale')
    const locale=['en','ru','es'].includes(requestedLocale)?requestedLocale:'en'
    const telegramBotUrl=telegramDiagnosticPublicUrl(locale)
    return auth.apply(NextResponse.json({
      preferences: data, deliveryEnabled: false, emailDeliveryEnabled: false, telegramSubscriptionMethod: 'bot_command',
      telegramBotUrl,
    }, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export const GET = handle
export const POST = handle
