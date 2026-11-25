import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { transaction } from '@/lib/app/database'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { SESSION_BOOKING_COOKIE, verifySessionBooking } from '@/lib/practitioners/public-session-booking.mjs'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** The signed same-browser cookie and operation-scoped FORCE RLS are both required. */
export async function GET(request) {
  try {
    const config = getAppConfig()
    const proof = verifySessionBooking(request.cookies.get(SESSION_BOOKING_COOKIE)?.value, config)
    if (!proof) return NextResponse.json({ error: 'BOOKING_PROOF_REQUIRED' },
      { status: 401, headers: PRIVATE_HEADERS })
    const row = await transaction(config, null, async db => {
      await db.query("select set_config('hh.public_enquiry_operation',$1,true)", [proof.operationId])
      return (await db.query(
        'select reference_code,booking_sku,status,booking_starts_at from app.public_service_enquiries where id=$1 and operation_id=$2',
        [proof.id, proof.operationId],
      )).rows[0] || null
    }, { server: true })
    if (!row || !row.booking_sku)
      return NextResponse.json({ error: 'BOOKING_NOT_FOUND' }, { status: 404, headers: PRIVATE_HEADERS })
    return NextResponse.json({
      referenceCode: row.reference_code,
      bookingSku: row.booking_sku,
      booked: row.status === 'booked',
      startsAt: row.status === 'booked' ? new Date(row.booking_starts_at).toISOString() : null,
    }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
