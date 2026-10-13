import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import { getNotificationDispatchConfig } from '@/lib/notifications/config'
import { createNotificationDispatchRepository } from '@/lib/notifications/dispatch-repository'
import { createNotificationDispatcher } from '@/lib/notifications/dispatcher'
import { notificationDispatchAuthorized } from '@/lib/notifications/authorization'
import { createWebPushTransport } from '@/lib/notifications/transport'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request) {
  const config = getNotificationDispatchConfig()
  if (!config.deliveryEnabled) return NextResponse.json({ error: 'NOTIFICATIONS_UNAVAILABLE' }, { status: 503, headers: PRIVATE_HEADERS })
  if (!notificationDispatchAuthorized(request.headers.get('authorization'), config.cronSecret)) return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403, headers: PRIVATE_HEADERS })
  try {
    const appConfig = getAppConfig()
    requestOrigin(request, appConfig)
    const summary = await createNotificationDispatcher({ config, repository: createNotificationDispatchRepository(appConfig, config), transport: createWebPushTransport(config), maxBatch: 50 }).run()
    return NextResponse.json(summary, { headers: PRIVATE_HEADERS })
  } catch {
    // Never return or log raw endpoint, auth key, DB values or provider response.
    return NextResponse.json({ error: 'NOTIFICATIONS_UNAVAILABLE' }, { status: 503, headers: PRIVATE_HEADERS })
  }
}
