import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { createAppRepository } from '@/lib/app/repository'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import { createGuestRepository } from '@/lib/app/guest-repository'
import {
  createGuestCredential,
  guestCookieName,
  parseGuestCookie,
  setGuestCookie,
} from '@/lib/app/guest-session'
import { consumeRate } from '@/lib/app/database'
import {
  clearSaveIntentCookie,
  createGuestSaveIntent,
  createLegacyDocumentSaveIntent,
  createReportSaveIntent,
  readSaveIntent,
  saveIntentBrowserProof,
  setSaveIntentCookie,
} from '@/lib/app/save-intents'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys, requireUUID } from '@/lib/assessments/contracts'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { authorizePrescription, prescriptionSessionCookieName } from '@/lib/prescriptions/session'
import { issueTrustedAdminSession } from '@/lib/prescriptions/admin-session'
import {
  authorizeReportViewer,
  commitReportSaveIntent,
  exchangeReportViewer,
  parseReportViewerCookie,
  readSavedReport,
  removeSavedReport,
  setReportViewerCookie,
} from '@/lib/app/report-flow'
import { practitionerDestination } from '@/lib/app/practitioner-access'
import {
  commitLegacyDocumentSaveIntent,
  readSavedDocument,
  removeSavedDocument,
} from '@/lib/app/legacy-document-flow'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
async function handle(request, { params }) {
  let auth
  try {
    const config = getAppConfig(),
      origin = requestOrigin(request, config),
      path = (await params).path || [],
      method = request.method,
      joined = path.join('/')
    if (method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const json = (data, status = 200) =>
      auth.apply(NextResponse.json(data, { status, headers: PRIVATE_HEADERS }))
    if (joined === 'auth/start' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['locale', 'intentId', 'serviceId', 'continueTo'])
      const locale = body.locale === 'ru' ? 'ru' : 'en'
      const intentId = body.intentId || null,
        serviceId = body.serviceId || null,
        continueTo = body.continueTo || null
      if (continueTo !== null && continueTo !== 'tests') throw new AppError('INVALID_CONTINUATION', 400)
      if (intentId !== null) requireUUID(intentId)
      if (serviceId !== null) requireUUID(serviceId)
      if ((intentId && serviceId) || (continueTo && (intentId || serviceId))) throw new AppError('INVALID_CONTINUATION', 400)
      await consumeRate(
        config,
        {
          op: 'oauth-start',
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        },
        20,
        600,
      )
      const { data, error } = await auth.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile',
          redirectTo: `${origin}/api/app/auth/callback?locale=${locale}${intentId ? `&intent=${encodeURIComponent(intentId)}` : ''}${serviceId ? `&service=${encodeURIComponent(serviceId)}` : ''}${continueTo === 'tests' ? '&continue=tests' : ''}`,
          skipBrowserRedirect: true,
        },
      })
      if (error || !data.url || new URL(data.url).origin !== config.supabaseUrl)
        throw new AppError('SIGN_IN_UNAVAILABLE', 503)
      return json({ redirectUrl: data.url })
    }
    if (joined === 'auth/callback' && method === 'GET') {
      const url = new URL(request.url),
        locale = url.searchParams.get('locale') === 'ru' ? 'ru' : 'en',
        code = url.searchParams.get('code'),
        intentId = url.searchParams.get('intent'),
        serviceId = url.searchParams.get('service'),
        continueTo = url.searchParams.get('continue')
      if (intentId) requireUUID(intentId)
      if (serviceId) requireUUID(serviceId)
      if ((intentId && serviceId) || (continueTo && (continueTo !== 'tests' || intentId || serviceId))) throw new AppError('INVALID_CONTINUATION', 400)
      const destination = intentId
        ? `${origin}/${locale}/app/continue?intent=${encodeURIComponent(intentId)}`
        : serviceId
          ? `${origin}/${locale}/app/consultations?service=${encodeURIComponent(serviceId)}`
          : continueTo === 'tests'
            ? `${origin}/${locale}/app/tests?selection=pending`
            : `${origin}/${locale}/app`
      if (url.searchParams.has('error') || !code || code.length > 4096)
        return auth.apply(
          NextResponse.redirect(destination + (destination.includes('?') ? '&auth=cancelled' : '?auth=cancelled'), {
            status: 303,
            headers: PRIVATE_HEADERS,
          }),
        )
      const flowId = url.searchParams.get('sb_flow_id')
      const { error } = await auth.client.auth.exchangeCodeForSession(
        code,
        flowId === null ? undefined : { flowId },
      )
      if (error)
        return auth.apply(
          NextResponse.redirect(destination + (destination.includes('?') ? '&auth=failed' : '?auth=failed'), {
            status: 303,
            headers: PRIVATE_HEADERS,
          }),
        )
      const actor = await auth.verified()
      await createAppRepository(config).ensureAccount(actor)
      return auth.apply(
        NextResponse.redirect(destination, { status: 303, headers: PRIVATE_HEADERS }),
      )
    }
    if (joined === 'auth/logout' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['allDevices'])
      if (body.allDevices !== undefined && typeof body.allDevices !== 'boolean')
        throw new AppError('INVALID_BODY', 400)
      const { error } = await auth.client.auth.signOut({
        scope: body.allDevices ? 'global' : 'local',
      })
      return auth.clear(json({ signedOut: true, serverSessionEnded: !error }, error ? 503 : 200))
    }

    if (joined === 'report-viewer/exchange' && method === 'POST') {
      if (!config.reportsEnabled) throw new AppError('REPORT_UNAVAILABLE', 503)
      const body = await readBody(request)
      onlyKeys(body, ['selector', 'secret'])
      const store = getPrescriptionStore()
      if (!store?.findClientAssessment) throw new AppError('REPORT_UNAVAILABLE', 404)
      await consumeRate(
        config,
        {
          op: 'report-exchange',
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
          selector: body.selector,
        },
        20,
        300,
      )
      const opened = await exchangeReportViewer(config, store, body)
      const response = json({
        report: opened.report,
        grant: {
          selector: opened.grant.selector,
          saveAllowed: opened.grant.saveAllowed,
          expiresAt: opened.grant.expiresAt,
        },
      })
      return setReportViewerCookie(
        response,
        opened.grant.selector,
        opened.viewer.id,
        opened.viewer.secret,
        opened.viewer.maxAge,
      )
    }
    if (path[0] === 'report-viewer' && path.length === 2 && method === 'GET') {
      if (!config.reportsEnabled) throw new AppError('REPORT_UNAVAILABLE', 503)
      const selector = path[1]
      const viewer = parseReportViewerCookie(request, selector)
      const store = getPrescriptionStore()
      if (!store?.findClientAssessment) throw new AppError('REPORT_UNAVAILABLE', 404)
      return json(await authorizeReportViewer(config, store, selector, viewer))
    }

    if (joined === 'save-intents' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['sourceKind', 'sourceId', 'selector', 'operationId'])
      let intent
      if (body.sourceKind === 'guest_result') {
        if (!config.guestEnabled) throw new AppError('GUEST_UNAVAILABLE', 503)
        const credential = parseGuestCookie(request.cookies.get(guestCookieName())?.value)
        if (!credential) throw new AppError('GUEST_SESSION_REQUIRED', 401)
        intent = await createGuestSaveIntent(config, credential, {
          sourceId: body.sourceId,
          operationId: body.operationId,
        })
      } else if (body.sourceKind === 'delivered_report') {
        if (!config.reportsEnabled) throw new AppError('REPORT_UNAVAILABLE', 503)
        if (typeof body.selector !== 'string') throw new AppError('REPORT_UNAVAILABLE', 404)
        const viewer = parseReportViewerCookie(request, body.selector)
        const store = getPrescriptionStore()
        if (!store?.findClientAssessment) throw new AppError('REPORT_UNAVAILABLE', 404)
        const opened = await authorizeReportViewer(config, store, body.selector, viewer)
        intent = await createReportSaveIntent(config, opened.grant, body.operationId)
      } else if (body.sourceKind === 'legacy_document') {
        if (typeof body.selector !== 'string') throw new AppError('DOCUMENT_UNAVAILABLE', 404)
        const store = getPrescriptionStore()
        const token = request.cookies.get(prescriptionSessionCookieName())?.value
        const record = await authorizePrescription(store, body.selector, token)
        if (!record?.clientId) throw new AppError('DOCUMENT_UNAVAILABLE', 404)
        intent = await createLegacyDocumentSaveIntent(config, record, body.operationId)
      } else {
        throw new AppError('SOURCE_UNAVAILABLE', 400)
      }
      let signedIn = false
      try {
        await auth.verified()
        signedIn = true
      } catch {
        signedIn = false
      }
      return setSaveIntentCookie(json({ ...intent, signedIn }, 201), intent.id, config)
    }
    if (path[0] === 'save-intents' && path.length === 2 && method === 'GET') {
      const proof = saveIntentBrowserProof(request, path[1], config)
      return json(await readSaveIntent(config, path[1], proof, getPrescriptionStore()))
    }

    const guestRepo = createGuestRepository(config)
    if (joined === 'guest/session' && method === 'POST') {
      if (!config.guestEnabled) throw new AppError('GUEST_UNAVAILABLE', 503)
      const body = await readBody(request)
      await consumeRate(
        config,
        {
          op: 'guest-session',
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        },
        12,
        3600,
      )
      const credential = createGuestCredential()
      const session = await guestRepo.createSession(credential, body)
      return setGuestCookie(json(session, 201), credential)
    }
    if (path[0] === 'guest') {
      if (!config.guestEnabled) throw new AppError('GUEST_UNAVAILABLE', 503)
      const credential = parseGuestCookie(request.cookies.get(guestCookieName())?.value)
      if (!credential) throw new AppError('GUEST_SESSION_REQUIRED', 401)
      await consumeRate(
        config,
        { op: 'guest', guest: credential.id },
        joined.includes('/save') ? 240 : 120,
        60,
      )
      if (joined === 'guest/bootstrap' && method === 'GET')
        return json(await guestRepo.bootstrap(credential))
      if (joined === 'guest/test-plans' && method === 'POST')
        return json(await guestRepo.createTestPlan(credential, await readBody(request)), 201)
      if (path[1] === 'test-plans' && path.length === 3 && method === 'GET')
        return json(await guestRepo.getTestPlan(credential, path[2]))
      if (path[1] === 'test-plans' && path.length === 4 && method === 'POST') {
        const body = await readBody(request)
        if (path[3] === 'advance') return json(await guestRepo.advanceTestPlan(credential, path[2], body))
        if (path[3] === 'cancel') return json(await guestRepo.cancelTestPlan(credential, path[2], body))
      }
      if (joined === 'guest/mood' && method === 'POST')
        return json(await guestRepo.moodCheckin(credential, await readBody(request)), 201)
      if (joined === 'guest/runs' && method === 'POST')
        return json(await guestRepo.startRun(credential, await readBody(request)), 201)
      if (path[1] === 'runs' && path.length === 3 && method === 'GET')
        return json(await guestRepo.getRun(credential, path[2]))
      if (path[1] === 'runs' && path.length === 4 && method === 'POST') {
        const body = await readBody(request)
        if (path[3] === 'save') return json(await guestRepo.saveRun(credential, path[2], body))
        if (path[3] === 'submit') return json(await guestRepo.submitRun(credential, path[2], body))
        if (path[3] === 'discard') return json(await guestRepo.discardRun(credential, path[2], body))
      }
      if (path[1] === 'results' && path.length === 3 && method === 'GET')
        return json(await guestRepo.getResult(credential, path[2]))
      if (
        path[1] === 'results' &&
        path.length === 4 &&
        path[3] === 'delete' &&
        method === 'POST'
      )
        return json(await guestRepo.deleteResult(credential, path[2]))
      throw new AppError('NOT_FOUND', 404)
    }

    const actor = await auth.verified(),
      repo = createAppRepository(config),
      practiceRepo = createPractitionerRepository(config)
    await consumeRate(
      config,
      { op: joined === 'export' ? 'export' : 'app', actor: actor.id },
      joined === 'export' ? 3 : 180,
      joined === 'export' ? 3600 : 60,
    )
    if (
      path[0] === 'save-intents' &&
      path.length === 3 &&
      path[2] === 'commit' &&
      method === 'POST'
    ) {
      const body = await readBody(request)
      onlyKeys(body, ['confirmed'])
      if (body.confirmed !== true) throw new AppError('CONFIRMATION_REQUIRED', 400)
      const proof = saveIntentBrowserProof(request, path[1], config)
      const intent = await readSaveIntent(config, path[1], proof)
      let resource
      if (intent.sourceKind === 'guest_result') {
        resource = await repo.commitGuestSaveIntent(actor, {
          intentId: path[1],
          browserProof: proof,
        })
      } else if (intent.sourceKind === 'delivered_report') {
        const store = getPrescriptionStore()
        if (!store?.findClientAssessment) throw new AppError('REPORT_UNAVAILABLE', 404)
        resource = await commitReportSaveIntent(config, store, actor, path[1], proof)
      } else if (intent.sourceKind === 'legacy_document') {
        const store = getPrescriptionStore()
        if (!store?.findById) throw new AppError('DOCUMENT_UNAVAILABLE', 404)
        resource = await commitLegacyDocumentSaveIntent(config, store, actor, path[1], proof)
      } else {
        throw new AppError('SOURCE_UNAVAILABLE', 409)
      }
      return clearSaveIntentCookie(
        json({ saved: true, sourceKind: intent.sourceKind, resource }, 201),
        path[1],
      )
    }
    if (joined === 'bootstrap' && method === 'GET') return json(await repo.bootstrap(actor))
    if (joined === 'test-plans' && method === 'POST')
      return json(await repo.createTestPlan(actor, await readBody(request)), 201)
    if (path[0] === 'test-plans' && path.length === 2 && method === 'GET')
      return json(await repo.getTestPlan(actor, path[1]))
    if (path[0] === 'test-plans' && path.length === 3 && method === 'POST') {
      const body = await readBody(request)
      if (path[2] === 'advance') return json(await repo.advanceTestPlan(actor, path[1], body))
      if (path[2] === 'cancel') return json(await repo.cancelTestPlan(actor, path[1], body))
    }
    if (joined === 'practitioner/open' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['destination'])
      const destination = practitionerDestination[body.destination]
      if (!destination) throw new AppError('NOT_FOUND', 404)
      if (!await repo.isPractitioner(actor)) throw new AppError('NOT_FOUND', 404)
      const response = json({ redirectUrl: destination })
      if (!issueTrustedAdminSession(response, { secure: !config.test }))
        throw new AppError('PRACTITIONER_UNAVAILABLE', 503)
      return response
    }
    if (joined === 'practice' && method === 'GET') return json(await practiceRepo.getMyPractice(actor))
    if (joined === 'export' && method === 'GET') {
      const exported = await repo.exportData(actor)
      const store = getPrescriptionStore()
      const savedReports = []
      for (const ref of exported.savedReports || []) {
        try {
          const opened = await readSavedReport(config, store, actor, ref.id)
          savedReports.push({ ...ref, available: true, report: opened.report })
        } catch {
          savedReports.push({ ...ref, available: false })
        }
      }
      exported.savedReports = savedReports
      const response = json(exported)
      response.headers.set('Content-Disposition', 'attachment; filename="holistic-house-data.json"')
      return response
    }
    if (path[0] === 'runs' && path.length === 2 && method === 'GET')
      return json(await repo.getRun(actor, path[1]))
    if (path[0] === 'results' && path.length === 2 && method === 'GET')
      return json(await repo.getResult(actor, path[1]))
    if (path[0] === 'reports' && path.length === 2 && method === 'GET') {
      const store = getPrescriptionStore()
      if (!store?.findClientAssessment) throw new AppError('REPORT_UNAVAILABLE', 404)
      return json(await readSavedReport(config, store, actor, path[1]))
    }
    if (path[0] === 'documents' && path.length === 2 && method === 'GET') {
      const store = getPrescriptionStore()
      if (!store?.findById) throw new AppError('DOCUMENT_UNAVAILABLE', 404)
      const locale = new URL(request.url).searchParams.get('locale') === 'ru' ? 'ru' : 'en'
      return json(await readSavedDocument(config, store, actor, path[1], locale))
    }
    if (method !== 'POST') throw new AppError('NOT_FOUND', 404)
    const body = await readBody(request)
    if (path[0] === 'reports' && path.length === 3 && path[2] === 'remove')
      return json(await removeSavedReport(config, actor, path[1]))
    if (path[0] === 'documents' && path.length === 3 && path[2] === 'remove')
      return json(await removeSavedDocument(config, actor, path[1]))
    if (joined === 'onboarding') return json(await repo.onboarding(actor, body))
    if (joined === 'preferences') return json(await repo.preferences(actor, body))
    if (joined === 'mood') return json(await repo.moodCheckin(actor, body), 201)
    if (joined === 'runs') return json(await repo.startRun(actor, body), 201)
    if (path[0] === 'runs' && path.length === 3) {
      if (path[2] === 'save') return json(await repo.saveRun(actor, path[1], body))
      if (path[2] === 'submit') return json(await repo.submitRun(actor, path[1], body))
      if (path[2] === 'discard') return json(await repo.discardRun(actor, path[1], body))
    }
    if (joined === 'requests') return json(await repo.createRequest(actor, body), 201)
    if (path[0] === 'requests' && path.length === 2)
      return json(await repo.updateRequest(actor, path[1], body))
    if (joined === 'practice/onboarding') return json(await practiceRepo.onboarding(actor, body))
    if (joined === 'practice/profile') {
      if (body.action === 'submit')
        return json(await practiceRepo.submitProfile(actor, { expectedRevision: body.expectedRevision }))
      return json(await practiceRepo.saveProfile(actor, { profile: body.profile || {}, expectedRevision: body.expectedRevision }))
    }
    if (path[0] === 'practice' && path[1] === 'credentials') {
      if (path.length === 2) return json(await practiceRepo.saveCredential(actor, null, body), 201)
      if (path.length === 3) {
        if (body.action === 'delete') return json(await practiceRepo.deleteCredential(actor, path[2]))
        return json(await practiceRepo.saveCredential(actor, path[2], body))
      }
    }
    if (path[0] === 'practice' && path[1] === 'services') {
      if (path.length === 2) return json(await practiceRepo.saveService(actor, null, body), 201)
      if (path.length === 3) {
        if (body.action === 'submit')
          return json(await practiceRepo.submitService(actor, path[2], { expectedRevision: body.expectedRevision }))
        if (body.action === 'pause')
          return json(await practiceRepo.pauseService(actor, path[2], { expectedRevision: body.expectedRevision }))
        return json(await practiceRepo.saveService(actor, path[2], body))
      }
    }
    if (path[0] === 'practice' && path[1] === 'requests' && path.length === 3)
      return json(await practiceRepo.updateMyRequest(actor, path[2], body))
    if (joined === 'context') return json(await repo.contextEvent(actor, null, body), 201)
    if (path[0] === 'context' && path.length === 2)
      return json(await repo.contextEvent(actor, path[1], body))
    if (joined === 'deletion') {
      const result = await repo.requestDeletion(actor, body)
      await auth.client.auth.signOut({ scope: 'global' })
      return auth.clear(json(result, 202))
    }
    throw new AppError('NOT_FOUND', 404)
  } catch (error) {
    const safe = safeError(error),
      response = NextResponse.json(
        { error: safe.code },
        { status: safe.status, headers: PRIVATE_HEADERS },
      )
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
