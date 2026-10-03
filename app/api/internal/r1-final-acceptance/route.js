import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getAppConfig } from '@/lib/app/config'
import { closeDatabase } from '@/lib/app/database'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import { createAppRepository } from '@/lib/app/repository'
import {
  commitReportSaveIntent,
  issueReportGrant,
  readSavedReport,
  removeSavedReport,
  setReportGrantStatus,
} from '@/lib/app/report-flow'
import { createAssessment, transitionAssessment } from '@/lib/clients/assessments'
import { createClient } from '@/lib/clients/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

function authorized(request) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

function requiredUuid(name) {
  const value = process.env[name]
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || ''))
    throw new Error(`Missing ${name}`)
  return value
}

function adminCookie() {
  const credential = process.env.PRESCRIPTIONS_ADMIN_TOKEN || process.env.PRESCRIPTIONS_ADMIN_PIN
  if (!credential) throw new Error('Practitioner credential unavailable')
  const signature = createHmac('sha256', credential)
    .update('prescriptions-admin-v1')
    .digest('base64url')
  return `prescriptions_admin=${signature}`
}

function cookiePairs(response) {
  const headers =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean)
  return headers.map((line) => line.split(';', 1)[0])
}

function cookieValue(pair) {
  const index = pair.indexOf('=')
  return index > 0 ? pair.slice(index + 1) : ''
}

function ensure(condition, label) {
  if (!condition) throw new Error(`Acceptance failed: ${label}`)
}

async function jsonResponse(response) {
  const body = await response.json().catch(() => null)
  return { response, body }
}

async function kvCommand(command) {
  const url = process.env.PRESCRIPTIONS_KV_REST_API_URL
  const token = process.env.PRESCRIPTIONS_KV_REST_API_TOKEN
  if (!url || !token || !url.startsWith('https://')) throw new Error('KV cleanup unavailable')
  const response = await fetch(url.replace(/\/$/, ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.error) throw new Error('KV cleanup failed')
  return body?.result
}

async function cleanupLegacyFixture({ clientId, assessmentId, assessmentRequestId }) {
  if (!clientId) return
  const keys = [
    assessmentId ? `client:assessment:${assessmentId}` : null,
    assessmentRequestId
      ? `client:assessment-request:${clientId}:${assessmentRequestId}`
      : null,
    `client:assessments:${clientId}`,
    `client:record:${clientId}`,
  ].filter(Boolean)
  if (keys.length) await kvCommand(['DEL', ...keys])
  await kvCommand(['SREM', 'client:index:v1', clientId])
}

export async function GET(request) {
  if (!authorized(request))
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers: PRIVATE_HEADERS })

  const receipt = {
    status: 'running',
    practitioner: {},
    report: {},
    cleanup: { legacyFixture: false },
  }
  let fixture = {}

  try {
    const config = getAppConfig()
    const origin =
      config.origins.find((value) => new URL(value).hostname === 'holistichouse.vercel.app') ||
      config.origins[0]
    ensure(Boolean(origin), 'canonical origin configured')
    ensure(config.reportsEnabled, 'report delivery enabled')

    const actorId = requiredUuid('HH_QA_OWNER_ACCOUNT_ID')
    const sessionId = requiredUuid('HH_QA_OWNER_SESSION_ID')
    const actor = {
      id: actorId,
      claims: {
        sub: actorId,
        session_id: sessionId,
        exp: Math.floor(Date.now() / 1000) + 45 * 60,
        role: 'authenticated',
      },
      email: '',
      displayName: '',
      signedInAt: new Date().toISOString(),
    }

    const repo = createAppRepository(config)
    const before = await repo.bootstrap(actor)
    ensure(before.account?.status === 'active', 'owner account active')
    ensure(before.account?.onboardingState === 'active', 'owner onboarding active')
    ensure(before.results?.length > 0, 'owner acceptance result exists')
    const sourceResult = before.results.at(-1)
    const portraitBefore = JSON.stringify(before.snapshot?.dimensions || [])

    const requestCreated = await repo.createRequest(actor, {
      serviceId: before.services[0].id,
      operationId: randomUUID(),
      contact: 'qa+holistic-house@invalid.example',
      message: 'Synthetic Production acceptance request. Do not contact. Safe to remove after QA.',
      shareResultId: sourceResult.id,
      shareConfirmed: true,
    })
    fixture.requestId = requestCreated.id
    ensure(Boolean(requestCreated.sharedExcerpt), 'explicit result summary attached')
    ensure(!('answers' in requestCreated), 'request view excludes answers')
    ensure(!('snapshot' in requestCreated), 'request view excludes profile snapshot')

    const unauthInbox = await fetch(`${origin}/admin/app-requests/data`, {
      cache: 'no-store',
      redirect: 'manual',
    })
    receipt.practitioner.unauthenticatedDenied = unauthInbox.status === 401
    ensure(receipt.practitioner.unauthenticatedDenied, 'unauthenticated inbox denied')

    const practitionerCookie = adminCookie()
    const practitionerPage = await fetch(`${origin}/admin/app-requests`, {
      headers: { Cookie: practitionerCookie },
      cache: 'no-store',
      redirect: 'manual',
    })
    receipt.practitioner.protectedPage = practitionerPage.status === 200
    ensure(receipt.practitioner.protectedPage, 'practitioner page authenticated')

    const inbox = await jsonResponse(
      await fetch(`${origin}/admin/app-requests/data`, {
        headers: { Cookie: practitionerCookie },
        cache: 'no-store',
      }),
    )
    ensure(inbox.response.status === 200, 'practitioner inbox data GET')
    const inboxItem = inbox.body?.requests?.find((item) => item.id === requestCreated.id)
    ensure(Boolean(inboxItem), 'synthetic request visible in inbox')
    ensure(Boolean(inboxItem.sharedExcerpt), 'shared summary visible in inbox')
    ensure(!('answers' in inboxItem.sharedExcerpt), 'shared summary excludes raw answers')
    receipt.practitioner.requestVisible = true
    receipt.practitioner.sharedSummaryOnly = true

    const updateInbox = async (item, status) =>
      jsonResponse(
        await fetch(`${origin}/admin/app-requests/data`, {
          method: 'POST',
          headers: {
            Cookie: practitionerCookie,
            Origin: origin,
            'Sec-Fetch-Site': 'same-origin',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: item.id, status, expectedRevision: item.revision }),
          cache: 'no-store',
        }),
      )

    const contacted = await updateInbox(inboxItem, 'contacted')
    ensure(contacted.response.status === 200 && contacted.body?.status === 'contacted', 'mark contacted')
    const closed = await updateInbox(contacted.body, 'closed')
    ensure(closed.response.status === 200 && closed.body?.status === 'closed', 'mark closed')
    receipt.practitioner.statusWorkflow = true

    const store = getPrescriptionStore()
    ensure(Boolean(store?.saveClient && store?.findClientAssessment), 'production legacy store available')

    const client = createClient({
      fullName: 'QA Synthetic Report Recipient',
      preferredLocale: 'en',
      email: '',
      phone: '',
      notes: 'Synthetic Production report-flow fixture. Safe to remove.',
      status: 'active',
    })
    await store.saveClient(client)
    fixture.clientId = client.id

    const assessmentRequestId = randomUUID()
    fixture.assessmentRequestId = assessmentRequestId
    let assessment = await createAssessment(
      store,
      client.id,
      {
        kind: 'research_result',
        title: 'Synthetic Production report acceptance',
        occurredOn: new Date().toISOString().slice(0, 10),
        language: 'en',
        sourceName: 'Holistic House QA',
        sourceVersion: 'r1-final',
        description:
          'Synthetic narrative report used only to verify the report-only Production delivery path.',
        originalResult:
          'Synthetic result: this content is test data and does not represent a diagnosis or recommendation.',
        practitionerComment:
          'Synthetic practitioner note approved for the recipient-visible report. Do not contact.',
        relatedDocumentIds: [],
      },
      assessmentRequestId,
    )
    assessment = await transitionAssessment(
      store,
      client.id,
      assessment.id,
      assessment.revision,
      'share',
    )
    fixture.assessmentId = assessment.id

    const grant = await issueReportGrant(config, store, {
      sourceAssessmentId: assessment.id,
      locale: 'en',
      saveAllowed: true,
      expiresInDays: 1,
    })
    fixture.grantId = grant.id

    const shell = await fetch(`${origin}/en/report/${grant.selector}`, {
      cache: 'no-store',
      redirect: 'manual',
    })
    const shellText = await shell.text()
    ensure(shell.status === 200, 'report shell reachable')
    ensure(!shellText.includes(assessment.title), 'initial report shell does not leak report body')
    receipt.report.genericShell = true

    const exchanged = await jsonResponse(
      await fetch(`${origin}/api/app/report-viewer/exchange`, {
        method: 'POST',
        headers: {
          Origin: origin,
          'Sec-Fetch-Site': 'same-origin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selector: grant.selector, secret: grant.secret }),
        cache: 'no-store',
      }),
    )
    ensure(exchanged.response.status === 200, 'report fragment exchange')
    ensure(exchanged.body?.report?.title === assessment.title, 'exact report returned')
    ensure(!JSON.stringify(exchanged.body.report).includes(client.fullName), 'client identity excluded')
    const viewerCookie = cookiePairs(exchanged.response).find((pair) =>
      pair.startsWith(`__Host-hh_report_${grant.selector}=`),
    )
    ensure(Boolean(viewerCookie), 'viewer HttpOnly cookie issued')
    receipt.report.exchange = true
    receipt.report.clientIdentityExcluded = true

    const reloaded = await jsonResponse(
      await fetch(`${origin}/api/app/report-viewer/${grant.selector}`, {
        headers: { Cookie: viewerCookie },
        cache: 'no-store',
      }),
    )
    ensure(reloaded.response.status === 200, 'clean report URL viewer reload')
    ensure(reloaded.body?.report?.title === assessment.title, 'viewer reload exact report')
    receipt.report.cleanReload = true

    const intentCreated = await jsonResponse(
      await fetch(`${origin}/api/app/save-intents`, {
        method: 'POST',
        headers: {
          Cookie: viewerCookie,
          Origin: origin,
          'Sec-Fetch-Site': 'same-origin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceKind: 'delivered_report',
          selector: grant.selector,
          operationId: randomUUID(),
        }),
        cache: 'no-store',
      }),
    )
    ensure(intentCreated.response.status === 201, 'report save intent created')
    ensure(intentCreated.body?.sourceKind === 'delivered_report', 'report save intent scoped')
    fixture.intentId = intentCreated.body.id
    const saveCookie = cookiePairs(intentCreated.response).find((pair) =>
      pair.startsWith(`__Host-hh_save_${fixture.intentId.replaceAll('-', '')}=`),
    )
    ensure(Boolean(saveCookie), 'browser-bound save intent cookie issued')
    const browserProof = createHash('sha256').update(cookieValue(saveCookie)).digest('hex')
    receipt.report.saveIntent = true

    const saved = await commitReportSaveIntent(config, store, actor, fixture.intentId, browserProof)
    fixture.savedReportId = saved.id
    const repeated = await commitReportSaveIntent(config, store, actor, fixture.intentId, browserProof)
    ensure(repeated.id === saved.id, 'report save idempotent')
    receipt.report.saved = true
    receipt.report.idempotent = true

    const afterSave = await repo.bootstrap(actor)
    const matching = (afterSave.savedReports || []).filter(
      (item) => item.sourceAssessmentId === assessment.id,
    )
    ensure(matching.length === 1 && matching[0].id === saved.id, 'saved report appears exactly once')
    ensure(
      JSON.stringify(afterSave.snapshot?.dimensions || []) === portraitBefore,
      'narrative report does not change portrait',
    )
    receipt.report.historyOnce = true
    receipt.report.portraitUnchanged = true

    const oldViewer = await fetch(`${origin}/api/app/report-viewer/${grant.selector}`, {
      headers: { Cookie: viewerCookie },
      cache: 'no-store',
    })
    ensure(oldViewer.status === 404, 'anonymous viewer revoked after exclusive save')
    receipt.report.anonymousRevokedAfterSave = true

    const savedReadable = await readSavedReport(config, store, actor, saved.id)
    ensure(savedReadable.report?.title === assessment.title, 'saved account report readable')

    await setReportGrantStatus(config, grant.id, 'withdrawn')
    let withdrawnBlocked = false
    try {
      await readSavedReport(config, store, actor, saved.id)
    } catch {
      withdrawnBlocked = true
    }
    ensure(withdrawnBlocked, 'withdrawn report read blocked')
    receipt.report.withdrawal = true

    await removeSavedReport(config, actor, saved.id)
    const afterRemove = await repo.bootstrap(actor)
    ensure(
      !(afterRemove.savedReports || []).some((item) => item.id === saved.id),
      'removed report hidden from account',
    )
    receipt.report.removeReference = true

    receipt.status = 'passed'
    receipt.synthetic = {
      requestId: fixture.requestId,
      grantId: fixture.grantId,
      intentId: fixture.intentId,
      savedReportId: fixture.savedReportId,
    }
    return NextResponse.json(receipt, { status: 200, headers: PRIVATE_HEADERS })
  } catch (error) {
    receipt.status = 'failed'
    receipt.failure = String(error?.message || 'acceptance failure').slice(0, 240)
    receipt.synthetic = {
      requestId: fixture.requestId || null,
      grantId: fixture.grantId || null,
      intentId: fixture.intentId || null,
      savedReportId: fixture.savedReportId || null,
    }
    return NextResponse.json(receipt, { status: 503, headers: PRIVATE_HEADERS })
  } finally {
    if (fixture.clientId) {
      try {
        await cleanupLegacyFixture(fixture)
        receipt.cleanup.legacyFixture = true
      } catch {
        receipt.cleanup.legacyFixture = false
      }
    }
    await closeDatabase()
  }
}
