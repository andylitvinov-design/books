import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { consumeRate } from '@/lib/app/database'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { getNotificationConfig } from '@/lib/notifications/config'
import { defaultNotificationPreferences } from '@/lib/notifications/contracts'
import { createNotificationRepository } from '@/lib/notifications/repository'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
async function handle(request) {
  let auth
  try {
    const config = getAppConfig(), push = getNotificationConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
    const json = value => auth.apply(NextResponse.json(value, { headers: PRIVATE_HEADERS }))
    // A disabled rollout never opens a database connection or asks device permission.
    if (!push.storageAvailable) {
      if (request.method === 'GET') return json({ available: false, deliveryEnabled: false, publicKey: null, preferences: defaultNotificationPreferences(), preferencesStored: false, currentDevice: false, deviceCount: 0 })
      throw new AppError('NOTIFICATIONS_UNAVAILABLE', 503)
    }
    const repository = createNotificationRepository(config, { environment: push.environment })
    if (request.method === 'GET') return json({ available: push.available, deliveryEnabled: push.deliveryEnabled, publicKey: push.publicKey, ...await repository.read(actor, new URL(request.url).searchParams.get('device')) })
    await consumeRate(config, { op: 'course-notification-settings', owner: actor.id }, 30, 60)
    const body = await readBody(request, 8192)
    if (request.method === 'PATCH') return json({ preferences: await repository.updatePreferences(actor, body) })
    if (request.method === 'DELETE') {
      onlyKeys(body, ['scope', 'fingerprint'])
      return json(await repository.unsubscribe(actor, body))
    }
    if (request.method === 'POST') {
      if (!push.available) throw new AppError('NOTIFICATIONS_UNAVAILABLE', 503)
      onlyKeys(body, ['subscription', 'consentVersion'])
      return json(await repository.subscribe(actor, body.subscription, body.consentVersion))
    }
    throw new AppError('METHOD_NOT_ALLOWED', 405)
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE }
