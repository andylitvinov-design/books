import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { createDaybookCoachRepository } from '@/lib/app/daybook-coach'
import { createDaybookCoachHandler } from '@/lib/app/daybook-coach-handler.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const POST = createDaybookCoachHandler({
  getConfig: getAppConfig, origin: requestOrigin, sameOrigin: requireSameOrigin,
  auth: createRequestAuth, rate: consumeRate, repository: createDaybookCoachRepository,
  json: (body, options) => NextResponse.json(body, options),
})
