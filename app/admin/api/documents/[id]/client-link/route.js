import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { getOwnerClientLink } from '@/lib/consultations/owner-links'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' }
export async function POST(request, { params }) {
  if (!isSameOriginRequest(request) || !await requireAdminRequest()) return NextResponse.json({ error: 'Unavailable' }, { status: 404, headers })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Unavailable' }, { status: 404, headers })
  const store = getPrescriptionStore()
  try {
    if (!store) throw new Error('Unavailable')
    return NextResponse.json(await getOwnerClientLink(store, id), { headers })
  } catch { return NextResponse.json({ error: 'Link unavailable. Refresh the consultation or use its access settings.' }, { status: 409, headers }) }
}
