import { NextResponse, after } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { createPublicServiceEnquiry } from '@/lib/practitioners/public-service-enquiry'
import { dispatchPublicServiceEnquiryTelegram } from '@/lib/app/public-enquiry-telegram'
import { SESSION_BOOKING_COOKIE, SESSION_BOOKING_TTL, isAlchemyBooking, signSessionBooking } from '@/lib/practitioners/public-session-booking.mjs'
import { FREE_EXPRESS_COOKIE, FREE_EXPRESS_TTL_SECONDS, createFreeExpressToken, isFreeExpressRequest } from '@/lib/practitioners/free-express-continuation.mjs'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request) {
  try {
    const config = getAppConfig()
    requestOrigin(request, config)
    requireSameOrigin(request, config)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await consumeRate(config, { op: 'guest-service-enquiry', ip }, 6, 3600)
    const payload = await readBody(request, 8192)
    const result = await createPublicServiceEnquiry(config, payload)
    if (result.saved === true && result.contactPending === false) {
      // The committed enquiry is authoritative; optional provider work must
      // never turn a saved lead into a browser-side error or leak private text.
      after(async () => {
        try {
          const delivery = await dispatchPublicServiceEnquiryTelegram(config, result.id)
          if (delivery.attempted > 0 && delivery.accepted !== 1)
            console.error('HH_PUBLIC_ENQUIRY_OWNER_TG_UNCONFIRMED')
        } catch {
          console.error('HH_PUBLIC_ENQUIRY_OWNER_TG_DISPATCH_FAILED')
        }
      })
    }
    const response = NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS })
    // A committed, consented Alchemy request gets an HttpOnly status proof.
    // This is not payment, a guest login, or a claim to someone else's records.
    if (result.saved === true && isAlchemyBooking(payload)) {
      const createdAt = Date.parse(result.createdAt || '')
      if (Number.isFinite(createdAt) && Date.now() - createdAt < SESSION_BOOKING_TTL * 1000) {
        response.cookies.set(SESSION_BOOKING_COOKIE,
          signSessionBooking({ id: result.id, operationId: payload.operationId, createdAt }, config), {
            httpOnly: true, secure: !config.test, sameSite: 'strict',
            path: '/api/service-enquiries/booking-status', maxAge: SESSION_BOOKING_TTL,
          })
      }
    }
    // A confirmed, consented free express request gets a scoped 1-hour
    // continuation cookie even when the optional v2 media wizard is disabled.
    // This allows an explicitly signed-in client to save the original request
    // to their account without enabling private media or unverified flows.
    // The public HH reference is never an auth token.
    if (result.saved === true && isFreeExpressRequest(payload)) {
      const createdAt = Date.parse(result.createdAt || '')
      if (Number.isFinite(createdAt) && Date.now() - createdAt < FREE_EXPRESS_TTL_SECONDS * 1000) {
        response.cookies.set(FREE_EXPRESS_COOKIE,
          createFreeExpressToken({ id: result.id, operationId: payload.operationId, createdAt }, config), {
            httpOnly: true, secure: !config.test, sameSite: 'strict',
            path: '/api/free-express', maxAge: Math.max(1, Math.floor(
              (FREE_EXPRESS_TTL_SECONDS * 1000 - (Date.now() - createdAt)) / 1000)),
          })
      }
    }
    return response
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
