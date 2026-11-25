import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { createNotificationRepository } from '@/lib/app/notification-repository'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
// Canonical GET shape. Mutations retain /subscribe, /unsubscribe, /preferences,
// /test, /live-token and /live-stop in the shared authenticated app handler.
export async function GET(request) {
  let auth
  try {
    const config = getAppConfig()
    requestOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
    return auth.apply(NextResponse.json(await createNotificationRepository(config).state(actor), { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
