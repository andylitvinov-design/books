import { NextResponse } from 'next/server'

import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { issuePrescriptionAccess } from '@/lib/prescriptions/access'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

export async function POST(request, { params }) {
  if (!isSameOriginRequest(request) || !await requireAdminRequest()) {
    return NextResponse.json({ error: 'Unavailable' }, { status: 404, headers })
  }
  const { id } = await params
  if (!idPattern.test(id)) return NextResponse.json({ error: 'Unavailable' }, { status: 404, headers })
  const store = getPrescriptionStore()
  const existing = store ? await store.findById(id) : undefined
  if (!existing || existing.status !== 'active') {
    return NextResponse.json({ error: 'Unavailable' }, { status: 404, headers })
  }
  const { record, selector, secret } = issuePrescriptionAccess(existing)
  await store.save(record, existing)
  return NextResponse.json({ selector, secret }, { headers })
}
