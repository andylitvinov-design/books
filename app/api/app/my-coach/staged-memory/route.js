import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { readMyCoachStagedMemory } from '@/lib/app/my-coach-staged-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

// Private, owner-only, category-scoped preview. Never call an LLM from here.
export async function POST(request) {
  let auth
  try {
    const config = getAppConfig()
    requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    const provided = request.headers.get('x-hh-account-id')
    if (provided && provided !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
    await consumeRate(config, { op: 'my-coach-staged-memory', actor: actor.id }, 18, 3600)
    const data = await readBody(request, 2048)
    if(data.stage==='reviewed_fields'&&provided!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    const result = await readMyCoachStagedMemory(config, actor, data)
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const result = NextResponse.json({ error: safe.code },
      { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(result) : result
  }
}
