import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createAppRepository } from '@/lib/app/repository'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
async function handle(request) {
  try {
    if (!(await requireAdminRequest())) throw new AppError('SIGN_IN_REQUIRED', 401)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    await consumeRate(config, { op: 'practitioner-inbox' }, 60, 60)
    const repo = createAppRepository(config)
    if (request.method === 'GET')
      return NextResponse.json({ requests: await repo.inbox() }, { headers: PRIVATE_HEADERS })
    const body = await readBody(request)
    onlyKeys(body, ['id', 'status', 'expectedRevision'])
    return NextResponse.json(
      await repo.inboxUpdate(body.id, {
        status: body.status,
        expectedRevision: body.expectedRevision,
      }),
      { headers: PRIVATE_HEADERS },
    )
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json(
      { error: safe.code },
      { status: safe.status, headers: PRIVATE_HEADERS },
    )
  }
}
export { handle as GET, handle as POST }
