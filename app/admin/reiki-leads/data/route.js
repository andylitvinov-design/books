import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { createReikiLeadInbox } from '@/lib/academy/reiki-course-leads'
import { createReikiReviewModeration } from '@/lib/academy/reiki-public-reviews'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request) {
  try {
    if (!await requireAdminRequest()) throw new AppError('SIGN_IN_REQUIRED', 401)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    await consumeRate(config, { op: 'reiki-leads-inbox' }, 60, 60)
    const inbox = createReikiLeadInbox(config)
    const reviews = createReikiReviewModeration(config)
    if (request.method === 'GET') {
      return NextResponse.json({ leads: await inbox.list(), reviews: await reviews.list() }, { headers: PRIVATE_HEADERS })
    }
    const body = await readBody(request, 4096)
    if (body.action === 'moderate-review') {
      onlyKeys(body,['action','id','status','expectedRevision'])
      return NextResponse.json(await reviews.moderate(body),{headers:PRIVATE_HEADERS})
    }
    onlyKeys(body, ['id','status','expectedRevision'])
    return NextResponse.json(await inbox.update(body), { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, {
      status: safe.status, headers: PRIVATE_HEADERS,
    })
  }
}
export { handle as GET, handle as POST }
