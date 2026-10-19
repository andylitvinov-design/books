import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { createCrmRepository, crmEnabled } from '@/lib/crm/repository'
import { billingRegistryEnabled } from '@/lib/crm/billing-registry'
import { getCrmEmailConfig } from '@/lib/crm/email'
import { sendCrmMessage, sendCrmVerification } from '@/lib/crm/email-dispatch'
import { getSmsConfig, smsSetupStatus } from '@/lib/crm/sms'
import { probeTwilioSmsConnection } from '@/lib/crm/sms-setup'
import { sendCrmSms } from '@/lib/crm/sms-dispatch'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request) {
  let auth
  try {
    if (!crmEnabled()) throw new AppError('CRM_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
    if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED', 403)
    const repo = createCrmRepository(config)
    let data
    if (request.method === 'GET') {
      const url=new URL(request.url)
      const cursor=url.searchParams.get('contactsCursor')
      if(cursor!==null) {
        if([...url.searchParams.keys()].some(key=>key!=='contactsCursor')||
           url.searchParams.getAll('contactsCursor').length!==1)
          throw new AppError('INVALID_CONTACT_CURSOR',400)
        data=await repo.withOwner(actor,async store=>({
          ...await store.listContactsPage(cursor),pageOnly:true,
        }))
      } else {
        data=await repo.withOwner(actor,async store=>{
          const page=await store.listContactsPage(null)
          return {
            contacts:page.contacts,contactsNextCursor:page.nextCursor,
            businessEnquiries:await store.listBusinessEnquiries(),
            overview:await store.overview(),
            followups:await store.listFollowups(),
            activity:await store.listRecentActivity(),
            recentExports:await store.listOwnerExportAudit(),
            drafts:await store.listDrafts(),
            emailMessages:await store.listEmailMessages(),
            smsMessages:await store.listSmsMessages(),
            subscribers:await store.listSubscribers(),
            subscriberRegistryEnabled:billingRegistryEnabled(),
            sendingEnabled:false,
            emailEnabled:getCrmEmailConfig().enabled,
            emailStatus:getCrmEmailConfig().reason||'ready',
            smsEnabled:getSmsConfig().enabled,
            smsStatus:getSmsConfig().reason||'ready',
            smsLive:getSmsConfig().live||false,
            smsSetup:smsSetupStatus(),
          }
        })
      }
    } else {
      const body = await readBody(request, 8192)
      onlyKeys(body, ['action', 'payload'])
      if (!['create_contact', 'record_consent', 'create_draft', 'suppress_contact', 'set_lifecycle', 'send_verification', 'send_email', 'send_sms', 'check_sms_connection', 'create_followup', 'change_followup', 'log_activity', 'update_business_enquiry', 'edit_contact'].includes(body.action)) throw new AppError('INVALID_ACTION', 400)
      if (body.action === 'send_verification') data = await sendCrmVerification({repo,actor,payload:body.payload})
      else if (body.action === 'send_email') data = await sendCrmMessage({repo,actor,payload:body.payload})
      else if (body.action === 'send_sms') data = await sendCrmSms({repo,actor,payload:body.payload})
      else if (body.action === 'check_sms_connection') {
        if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload) || Object.keys(body.payload).length)
          throw new AppError('INVALID_SMS_SETUP_REQUEST',400)
        data=await probeTwilioSmsConnection()
      }
      else data = await repo.withOwner(actor, (store) => {
        if (body.action === 'update_business_enquiry') return store.updateBusinessEnquiry(body.payload)
        if (body.action === 'create_followup') return store.createFollowup(body.payload)
        if (body.action === 'change_followup') return store.changeFollowup(body.payload)
        if (body.action === 'log_activity') return store.logBusinessActivity(body.payload)
        if (body.action === 'edit_contact') return store.editContact(body.payload)
        if (body.action === 'create_contact') return store.createContact(body.payload)
        if (body.action === 'record_consent') return store.recordConsent(body.payload)
        if (body.action === 'suppress_contact') {
          onlyKeys(body.payload, ['id'])
          return store.suppressContact(body.payload.id)
        }
        if (body.action === 'set_lifecycle') {
          onlyKeys(body.payload, ['id','lifecycle','expectedRevision'])
          return store.setLifecycle(body.payload)
        }
        return store.createDraft(body.payload)
      })
    }
    return auth.apply(NextResponse.json(data, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export const GET = handle
export const POST = handle
