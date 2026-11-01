import { NextResponse, after } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { readBody, safeError, PRIVATE_HEADERS } from '@/lib/app/http'
import { requireUUID, AppError, onlyKeys } from '@/lib/assessments/contracts'
import { configuredTalismanBasket } from '@/lib/commerce/talisman-checkout'
import { createPublicServiceEnquiry } from '@/lib/practitioners/public-service-enquiry'
import { dispatchPublicServiceEnquiryTelegram } from '@/lib/app/public-enquiry-telegram'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// The only payable route requires a verified Google account and explicit
// reply-only consent. No browser price, provider URL or payment status enters
// the API. A committed CRM order intent precedes the PSP redirect; it is
// never reported as paid until real provider confirmation.
export async function POST(request) {
  let auth
  try {
    const config = getAppConfig()
    requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    const input = await readBody(request, 2200)
    onlyKeys(input, ['operationId','items','locale','method','replyConsent','sourcePath'])
    requireUUID(input.operationId)
    const locale = input.locale
    const sourcePath = input.sourcePath
    if (!['en','ru','es'].includes(locale) ||
        !['paypal','square','wise'].includes(input.method) ||
        sourcePath !== '/' + locale + '/holistic-support' &&
          sourcePath !== '/' + locale + '/holistic-support/mobile' &&
          sourcePath !== '/' + locale + '/talismans/cart' ||
        input.replyConsent !== true) throw new AppError('INVALID_CHECKOUT',400)
    const basket = configuredTalismanBasket(input.items, locale)
    const method = basket?.methods?.[input.method]
    if (!method) throw new AppError('TALISMAN_CHECKOUT_UNAVAILABLE',503)
    const email = typeof actor.email === 'string' ? actor.email.trim() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('SIGN_IN_REQUIRED',401)
    await consumeRate(config,{op:'talisman-checkout',account:actor.id},5,3600)

    const description = [
      'Daoist Fu talisman checkout intent · NOT YET PAID',
      ...basket.items.map(item => item.id + ': ' + item.title + ' · ' + (item.amountMinor / 100).toFixed(2) + ' EUR'),
      'Approved catalog total: ' + (basket.amountMinor / 100).toFixed(2) + ' EUR',
      'Chosen hosted provider: ' + input.method,
      'Payment confirmation requires the independent provider receipt.',
      'No shipping address, medical data, photos or customer notes in this request.',
    ].join('\n')
    const enquiry = await createPublicServiceEnquiry(config, {
      operationId: input.operationId, serviceTitle:'Daoist Fu talismans · checkout pending payment',
      description, sourcePath, locale,
      contact: {email, displayName: '', phone:''}, contactConsent:true, website:'',
    })
    if (enquiry.saved !== true || enquiry.contactPending !== false ||
        !/^HH-[A-F0-9]{12}$/.test(enquiry.referenceCode || ''))
      throw new AppError('CHECKOUT_INTENT_UNCONFIRMED',503)
    after(async () => {
      try { await dispatchPublicServiceEnquiryTelegram(config, enquiry.id) }
      catch { console.error('HH_TALISMAN_ORDER_OWNER_NOTICE_UNCONFIRMED') }
    })
    return auth.apply(NextResponse.json({
      referenceCode: enquiry.referenceCode,
      checkoutUrl: method.url,
      currency: method.currency,
      amountMinor: method.amountMinor,
      status:'payment_not_verified',
    }, {headers:PRIVATE_HEADERS}))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth ? auth.apply(response) : response
  }
}
