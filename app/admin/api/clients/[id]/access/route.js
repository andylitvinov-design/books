import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { getOwnerCabinetLink } from '@/lib/clients/access'
import { privateHeaders } from '@/lib/clients/session'
export const dynamic = 'force-dynamic'
export async function POST(request, { params }) {
  if (!isSameOriginRequest(request) || !await requireAdminRequest()) return new NextResponse(null, { status: 404, headers: privateHeaders })
  try {
    const { id } = await params
    return NextResponse.json(await getOwnerCabinetLink(getPrescriptionStore(), id), { headers: privateHeaders })
  } catch { return NextResponse.json({ error: 'Cabinet link unavailable' }, { status: 409, headers: privateHeaders }) }
}
