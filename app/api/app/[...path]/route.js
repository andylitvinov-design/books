import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { safeEnquiryReturnPath } from '@/lib/app/enquiry-auth-redirect'
import { createAppRepository } from '@/lib/app/repository'
import { readDevelopmentGoals, saveDevelopmentGoals } from '@/lib/app/development-goals'
import { listLabReports, saveLabReport, deleteLabReport } from '@/lib/app/lab-reports'
import { readBusinessCoaching, saveBusinessCoaching } from '@/lib/app/business-coaching'
import { createGrowthCourseRepository } from '@/lib/app/growth-course'
import { createNotificationRepository } from '@/lib/app/notification-repository'
import {createNativePushRepository} from '@/lib/app/native-push-repository'
import {registerLiveActivity,stopLiveActivity,updateLiveActivities} from '@/lib/app/native-live-activity'
import { createDailyCourseRepository } from '@/lib/app/growth-daily'
import { createEnergyworkCourseRepository } from '@/lib/academy/energywork-course-repository'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import { createPresentationUploadIntent, completePresentationUpload } from '@/lib/practitioners/presentation-storage'
import { createArticleRepository } from '@/lib/practitioners/article-repository'
import { createPractitionerEventsRepository } from '@/lib/practitioners/events-repository'
import { createGuestRepository } from '@/lib/app/guest-repository'
import { readAccountTestRating, saveAccountTestRating, readGuestTestRating, saveGuestTestRating } from '@/lib/app/test-catalog-social-proof'
import {
  createGuestCredential,
  guestCookieName,
  parseGuestCookie,
  setGuestCookie,
} from '@/lib/app/guest-session'
import { consumeRate } from '@/lib/app/database'
import { createBillingService } from '@/lib/billing/service'
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
import { ownerClientSummary, ownerClientDirectory, ownerClientDocumentSummary } from '@/lib/clients/owner-client-directory'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { listLegacyClientIdsForAccount } from '@/lib/app/client-account-binding'
import { authorizePrescription, prescriptionSessionCookieName } from '@/lib/prescriptions/session'
import { issueTrustedAdminSession } from '@/lib/prescriptions/admin-session'
import {
  authorizeReportViewer,
  commitReportSaveIntent,
  exchangeReportViewer,
  parseReportViewerCookie,
  listPersonalAnalysisReports,
  readSavedReport,
  removeSavedReport,
  setReportViewerCookie,
} from '@/lib/app/report-flow'
import { practitionerDestination, practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import {
  commitLegacyDocumentSaveIntent,
  readSavedDocument,
  removeSavedDocument,
} from '@/lib/app/legacy-document-flow'
import {createSessionSaveIntent,commitSessionSaveIntent,readSavedSession,removeSavedSession} from '@/lib/app/client-session-save-flow'
import {deliveryEnabled} from '@/lib/clients/delivery-model'
import {readSessionViewerCookie,authorizeSessionGuest} from '@/lib/clients/session-delivery-access'
import {getPublishedClientSession} from '@/lib/clients/session-delivery-service'
import {listPractitionerMaterials,streamReadyMaterial} from '@/lib/clients/material-library'
export const runtime = 'nodejs'
// The Cabinet Postgres and verified Supabase Auth run in ca-central-1.
// Keep only this private API close to its data source (not the whole site).
export const preferredRegion = 'yul1'
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
    if (method !== 'GET' && method !== 'HEAD') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const json = (data, status = 200) =>
      auth.apply(NextResponse.json(data, { status, headers: PRIVATE_HEADERS }))
    if (joined === 'auth/start' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['locale', 'intentId', 'serviceId', 'continueTo', 'program', 'requestId', 'native', 'returnPath'])
      const locale = body.locale === 'ru' ? 'ru' : body.locale === 'es' && body.continueTo === 'enquiry' ? 'es' : 'en'
      const intentId = body.intentId || null,
        serviceId = body.serviceId || null,
        continueTo = body.continueTo || null,
        program = body.program || null,
        requestId = body.requestId || null,
        native = body.native === true,
        returnPath = body.returnPath ?? null
      if (body.native !== undefined && body.native !== true) throw new AppError('INVALID_CONTINUATION',400)
      if (continueTo !== null && !['tests', 'course', 'consultations', 'business', 'enquiry'].includes(continueTo) &&
        !['cabinet','my-tests','my-courses','reports','practitioner-growth','practitioner-seo','practitioner-acquisition','energywork','practitioner'].includes(continueTo)) throw new AppError('INVALID_CONTINUATION', 400)
      if (program !== null && (continueTo !== 'course' || !['stress', 'confidence', 'focus'].includes(program))) throw new AppError('INVALID_CONTINUATION', 400)
      if (intentId !== null) requireUUID(intentId)
      if (serviceId !== null) requireUUID(serviceId)
      if (requestId !== null) requireUUID(requestId)
      if ((continueTo === 'consultations') !== Boolean(requestId)) throw new AppError('INVALID_CONTINUATION', 400)
      if ((intentId && serviceId) || (continueTo && (intentId || serviceId))) throw new AppError('INVALID_CONTINUATION', 400)
      if ((continueTo === 'enquiry' && (!safeEnquiryReturnPath(returnPath, locale) || native)) ||
          (continueTo !== 'enquiry' && returnPath !== null)) throw new AppError('INVALID_CONTINUATION', 400)
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
          redirectTo: `${origin}/api/app/auth/callback?locale=${locale}${native ? '&native=1' : ''}${intentId ? `&intent=${encodeURIComponent(intentId)}` : ''}${serviceId ? `&service=${encodeURIComponent(serviceId)}` : ''}${continueTo ? `&continue=${encodeURIComponent(continueTo)}` : ''}${program ? `&program=${encodeURIComponent(program)}` : ''}${requestId ? `&request=${encodeURIComponent(requestId)}` : ''}${returnPath ? `&returnPath=${encodeURIComponent(returnPath)}` : ''}`,
          skipBrowserRedirect: true,
        },
      })
      if (error || !data.url || new URL(data.url).origin !== config.supabaseUrl)
        throw new AppError('SIGN_IN_UNAVAILABLE', 503)
      return json({ redirectUrl: data.url })
    }
    if (joined === 'auth/callback' && method === 'GET') {
      const url = new URL(request.url),
        locale = url.searchParams.get('locale') === 'ru' ? 'ru' : url.searchParams.get('locale') === 'es' && url.searchParams.get('continue') === 'enquiry' ? 'es' : 'en',
        code = url.searchParams.get('code'),
        intentId = url.searchParams.get('intent'),
        serviceId = url.searchParams.get('service'),
        continueTo = url.searchParams.get('continue'),
        program = url.searchParams.get('program'),
        requestId = url.searchParams.get('request'),
        returnPath = url.searchParams.get('returnPath')
      if ((continueTo === 'enquiry' && !safeEnquiryReturnPath(returnPath, locale)) ||
          (continueTo !== 'enquiry' && returnPath !== null)) throw new AppError('INVALID_CONTINUATION', 400)
      if (program !== null && (continueTo !== 'course' || !['stress', 'confidence', 'focus'].includes(program))) throw new AppError('INVALID_CONTINUATION', 400)
      if (intentId) requireUUID(intentId)
      if (serviceId) requireUUID(serviceId)
      if (requestId !== null) requireUUID(requestId)
      if ((continueTo === 'consultations') !== Boolean(requestId)) throw new AppError('INVALID_CONTINUATION', 400)
      if ((intentId && serviceId) || (continueTo && (!['tests','course','consultations','business','cabinet','my-tests','my-courses','reports','practitioner-growth','practitioner-seo','practitioner-acquisition','energywork','practitioner','enquiry'].includes(continueTo) || intentId || serviceId))) throw new AppError('INVALID_CONTINUATION', 400)
      // Native OAuth runs Google in the system browser. This HTTPS callback
      // merely returns the single-use PKCE authorization code to the app;
      // the WebView's existing HttpOnly PKCE cookie then exchanges it through
      // THIS SAME callback without native=1. Never transfer session tokens.
      if (url.searchParams.get('native') === '1') {
        if (continueTo === 'enquiry') throw new AppError('INVALID_CONTINUATION', 400)
        const handoff = new URL('holistichouse://auth/callback')
        for (const key of ['locale','intent','service','continue','program','request','sb_flow_id']) {
          const value = url.searchParams.get(key)
          if (value !== null) handoff.searchParams.set(key,value)
        }
        if (url.searchParams.has('error')) handoff.searchParams.set('error','cancelled')
        else if (code && code.length <= 4096) handoff.searchParams.set('code',code)
        else handoff.searchParams.set('error','cancelled')
        return auth.apply(NextResponse.redirect(handoff.toString(),{status:303,headers:PRIVATE_HEADERS}))
      }
      const destination = intentId
        ? `${origin}/${locale}/app/continue?intent=${encodeURIComponent(intentId)}&auto=1`
        : serviceId
          ? `${origin}/${locale}/app/consultations?service=${encodeURIComponent(serviceId)}`
          : continueTo === 'consultations'
            ? `${origin}/${locale}/app/consultations?request=${encodeURIComponent(requestId)}`
          : continueTo === 'enquiry'
            ? `${origin}${returnPath}?hh_enquiry=google`
          : continueTo === 'tests'
            ? `${origin}/${locale}/app/tests?selection=pending`
            : continueTo === 'course'
              ? `${origin}/${locale}/app/course${program ? `?program=${encodeURIComponent(program)}` : ''}`
              : continueTo === 'business'
                ? `${origin}/${locale}/app/business`
              : continueTo === 'cabinet'
                ? `${origin}/${locale}/app/portrait`
                : continueTo === 'my-tests'
                  ? `${origin}/${locale}/app/tests`
                  : continueTo === 'my-courses'
                    ? `${origin}/${locale}/app/course`
                    : continueTo === 'reports'
                      ? `${origin}/${locale}/app/portrait#personal-reports`
                      : continueTo === 'practitioner-growth'
                        ? `${origin}/admin/login?destination=growth`
                      : continueTo === 'practitioner-seo'
                        ? `${origin}/admin/login?destination=seo`
                      : continueTo === 'practitioner-acquisition'
                        ? `${origin}/admin/login?destination=acquisition`
                      : continueTo === 'practitioner'
                        ? `${origin}/admin/login`
                        : continueTo === 'energywork'
                          ? `${origin}/${locale}/academy/principles-of-energywork/learn`
                        : `${origin}/${locale}/app`
      if (url.searchParams.has('error') || !code || code.length > 4096)
        return auth.apply(
          NextResponse.redirect((value => { const url = new URL(destination); url.searchParams.set('auth', value); return url.href; })('cancelled'), {
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
          NextResponse.redirect((value => { const url = new URL(destination); url.searchParams.set('auth', value); return url.href; })('failed'), {
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
    if (joined === 'auth/contact-profile' && method === 'GET') {
      // Verified server-side Google identity only. Never create a lead, infer
      // marketing consent or expose access tokens in the public contact form.
      const actor = await auth.verified()
      return json({ email: actor.email, displayName: actor.displayName })
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
      } else if (body.sourceKind === 'client_session') {
        if(!deliveryEnabled())throw new AppError('SESSION_UNAVAILABLE',503)
        if(typeof body.selector!=='string')throw new AppError('SESSION_UNAVAILABLE',404)
        const store=getPrescriptionStore()
        if(!store?.findClientById)throw new AppError('SESSION_UNAVAILABLE',404)
        let access
        if(body.sourceId!==undefined){
          requireUUID(body.sourceId)
          const owner=await authorizeCabinetRequest(body.selector)
          if(!owner?.client?.id)throw new AppError('SESSION_UNAVAILABLE',404)
          await getPublishedClientSession(config,store,owner.client.id,body.sourceId)
          access={clientId:owner.client.id,sessionId:body.sourceId,cabinetSelector:body.selector}
        }else{
          const opened=await authorizeSessionGuest(config,store,body.selector,
            readSessionViewerCookie(request.cookies,body.selector))
          access={clientId:opened.clientId,sessionId:opened.sessionId,
            grantId:opened.grantId,grantVersion:opened.grantVersion}
        }
        intent=await createSessionSaveIntent(config,store,access,body.operationId)
      } else if (body.sourceKind === 'legacy_document') {
        if (typeof body.selector !== 'string') throw new AppError('DOCUMENT_UNAVAILABLE', 404)
        const store = getPrescriptionStore()
        let record
        if (body.sourceId !== undefined) {
          // The stable client-cabinet link authorizes only a document owned by that client.
          // A Google save still needs separate user authentication and confirmation.
          requireUUID(body.sourceId)
          const access = await authorizeCabinetRequest(body.selector, body.sourceId)
          record = access?.record
        } else {
          const token = request.cookies.get(prescriptionSessionCookieName())?.value
          record = await authorizePrescription(store, body.selector, token)
        }
        if (!record?.clientId || record.status !== 'active') throw new AppError('DOCUMENT_UNAVAILABLE', 404)
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
      if (joined === 'guest/test-ratings' && method === 'POST') {
        await consumeRate(config, { op: 'guest-test-rating', guest: credential.id }, 10, 3600)
        return json(await saveGuestTestRating(config, credential, await readBody(request)))
      }
      if (path[1] === 'test-ratings' && path.length === 3 && method === 'GET')
        return json(await readGuestTestRating(config, credential, path[2]))
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
      practiceRepo = createPractitionerRepository(config),
      articleRepo = createArticleRepository(config),
      eventsRepo = createPractitionerEventsRepository(config)
    const expectedAccount = request.headers.get('x-hh-account-id')
    if (expectedAccount && expectedAccount !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
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
      } else if(intent.sourceKind==='client_session'){
        if(!deliveryEnabled())throw new AppError('SESSION_UNAVAILABLE',503)
        const store=getPrescriptionStore()
        if(!store?.findClientById)throw new AppError('SESSION_UNAVAILABLE',404)
        resource=await commitSessionSaveIntent(config,store,actor,path[1],proof)
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
    if (path[0] === 'notifications') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
      const notifications = createNotificationRepository(config)
      const nativePush = createNativePushRepository(config)
      if(joined==='notifications/native' && method==='GET'){
        const query=new URL(request.url).searchParams
        if([...query.keys()].some(k=>k!=='platform')||query.getAll('platform').length!==1)
          throw new AppError('INVALID_REQUEST',400)
        return json(await nativePush.state(actor,query.get('platform')))
      }
      if(joined==='notifications/native/register' && method==='POST')
        return json(await nativePush.register(actor,await readBody(request,8192)),201)
      if(joined==='notifications/native/disable' && method==='POST'){
        onlyKeys(await readBody(request,1024),[])
        return json(await nativePush.disable(actor))
      }
      if (joined === 'notifications' && method === 'GET')
        return json(await notifications.state(actor))
      if (joined === 'notifications/live-token' && method === 'POST')
        return json(await registerLiveActivity(config,actor,await readBody(request, 8192)),201)
      if (joined === 'notifications/live-stop' && method === 'POST')
        return json(await stopLiveActivity(config,actor,await readBody(request, 8192)))
      if (joined === 'notifications/subscribe' && method === 'POST')
        return json(await notifications.subscribe(actor, await readBody(request, 8192)), 201)
      if (joined === 'notifications/unsubscribe' && method === 'POST')
        return json(await notifications.unsubscribe(actor, await readBody(request, 8192)))
      if (joined === 'notifications/preferences' && method === 'POST')
        return json(await notifications.preferences(actor, await readBody(request, 8192)))
      if (joined === 'notifications/test' && method === 'POST') {
        onlyKeys(await readBody(request, 8192), [])
        await consumeRate(config, {op:'push-test',actor:actor.id}, 2, 3600)
        return json(await notifications.sendTest(actor))
      }
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'academy-energywork') {
      if (request.headers.get('x-hh-account-id') && request.headers.get('x-hh-account-id') !== actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      const energywork=createEnergyworkCourseRepository(config)
      if (method === 'GET') return json({ accountId:actor.id, ...await energywork.read(actor) })
      if (method === 'POST') return json({ accountId:actor.id, ...await energywork.command(actor,await readBody(request,32768)) })
      throw new AppError('NOT_FOUND',404)
    }
    if (path[0] === 'course' && request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
    if (path[0] === 'course' && path.length === 2) {
      const daily = createDailyCourseRepository(config)
      const locale = new URL(request.url).searchParams.get('locale') === 'ru' ? 'ru' : 'en'
      if ((path[1] === 'today' || path[1] === 'progress') && method === 'GET')
        return json(await daily.read(actor, locale, new URL(request.url).searchParams.get('courseId')))
      if (method === 'POST' && ['activate','checkin','session','review','preferences','pause','resume','new-cycle','module-retest'].includes(path[1]))
      {
        const updated=await daily.command(actor,path[1],await readBody(request),locale)
        if(['session','pause','resume','review','new-cycle'].includes(path[1]))
          await updateLiveActivities(config,actor,updated).catch(()=>{})
        return json(updated)
      }
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'course') {
      const growth = createGrowthCourseRepository(config)
      if (method === 'GET') return json(await growth.read(actor, new URL(request.url).searchParams.get('courseId')))
      if (method === 'POST') return json(await growth.command(actor, await readBody(request)))
      throw new AppError('NOT_FOUND', 404)
    }
    if(path[0]==='saved-sessions' && path.length===2 && method==='GET'){
      if(!deliveryEnabled())throw new AppError('SESSION_UNAVAILABLE',503)
      const store=getPrescriptionStore()
      const saved=await readSavedSession(config,store,actor,path[1])
      return json({id:saved.id,savedAt:saved.savedAt,session:saved.session})
    }
    // Lightweight, account-authorized freshness check for the Save-on-exit UI.
    // Do not mark an item as opened or disclose private session content.
    // An archived, withdrawn, republished, or foreign Account session fails closed.
    if(path[0]==='saved-sessions' && path.length===3 && path[2]==='status' && method==='GET'){
      if(!deliveryEnabled())throw new AppError('SESSION_UNAVAILABLE',503)
      const saved=await readSavedSession(config,getPrescriptionStore(),actor,path[1],{markOpened:false})
      return json({id:saved.id,available:true})
    }
    if(path[0]==='saved-sessions' && path.length===3 && path[2]==='remove' && method==='POST'){
      if(!deliveryEnabled())throw new AppError('SESSION_UNAVAILABLE',503)
      onlyKeys(await readBody(request),[])
      return json(await removeSavedSession(config,actor,path[1]))
    }
    if (joined === 'labs' || (path[0] === 'labs' && path.length === 3 && path[2] === 'delete')) {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (joined === 'labs' && method === 'GET') return json(await listLabReports(config, actor))
      if (joined === 'labs' && method === 'POST') {
        await consumeRate(config, { op: 'lab-save', actor: actor.id }, 12, 3600)
        return json(await saveLabReport(config, actor, await readBody(request, 40000)), 201)
      }
      if (path.length === 3 && method === 'POST') {
        onlyKeys(await readBody(request, 1024), [])
        return json(await deleteLabReport(config, actor, path[1]))
      }
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'development-goals') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'GET') return json(await readDevelopmentGoals(config, actor))
      if (method === 'POST') return json(await saveDevelopmentGoals(config, actor, await readBody(request, 8192)))
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'business-coaching') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'GET') return json(await readBusinessCoaching(config, actor))
      if (method === 'POST') return json(await saveBusinessCoaching(config, actor, await readBody(request, 32768)))
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'bootstrap' && method === 'GET') {
      // A reduced initial payload is safe only after the normal verified session,
      // account check and private rate limit above. Other tabs stay unchanged.
      const view = new URL(request.url).searchParams.get('view') === 'portrait' ? 'portrait' : 'full'
      return json(await repo.bootstrap(actor, { view }))
    }
    if (joined === 'personal-analysis-reports' && method === 'GET')
      return json(await listPersonalAnalysisReports(config, getPrescriptionStore(), actor))
    if (joined === 'shared-materials' && method === 'GET') {
      const clientIds = await listLegacyClientIdsForAccount(config, actor)
      const store = getPrescriptionStore()
      const materials = []
      if (store) for (const clientId of clientIds) {
        const client = await store.findClientById(clientId)
        if (client?.status === 'active' && !client.cabinetAccess?.revoked) for (const material of client.sharedMaterials ?? []) {
          materials.push({ id: material.id, title: material.title, url: material.url })
        }
      }
      return json({ materials })
    }
    if (joined === 'test-plans' && method === 'POST')
      return json(await repo.createTestPlan(actor, await readBody(request)), 201)
    if (path[0] === 'test-plans' && path.length === 2 && method === 'GET')
      return json(await repo.getTestPlan(actor, path[1]))
    if (path[0] === 'test-plans' && path.length === 3 && method === 'POST') {
      const body = await readBody(request)
      if (path[2] === 'advance') return json(await repo.advanceTestPlan(actor, path[1], body))
      if (path[2] === 'cancel') return json(await repo.cancelTestPlan(actor, path[1], body))
      if (path[2] === 'remove') return json(await repo.removeTestPlanItem(actor, path[1], body))
    }
    // Legacy clinical clients were created manually, often without email.
    // Read the existing encrypted prescription directory; do not treat
    // account-bound service enquiries or owner marketing CRM as its source.
    if (joined === 'practitioner/legacy-clients' && method === 'GET') {
      if (!practitionerEmailAllowed(actor) || !await repo.isPractitioner(actor))
        throw new AppError('NOT_FOUND', 404)
      const store = getPrescriptionStore()
      if (!store) throw new AppError('CLIENT_STORAGE_UNAVAILABLE', 503)
      const query = new URL(request.url).searchParams
      const keys = [...query.keys()]
      if (keys.length > 1 || (keys.length === 1 && keys[0] !== 'clientId'))
        throw new AppError('INVALID_QUERY', 400)
      const clientId = query.get('clientId')
      if (clientId !== null) {
        requireUUID(clientId)
        const client = await store.findClientById(clientId)
        if (!client) throw new AppError('NOT_FOUND', 404)
        const documents = await store.listClientDocuments(clientId)
        return json({ client: ownerClientSummary(client), ...ownerClientDocumentSummary(documents) })
      }
      return json({ clients: ownerClientDirectory(await store.listClients()) })
    }
    if (joined === 'practitioner/open' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['destination', 'clientId'])
      if (!practitionerEmailAllowed(actor) || !await repo.isPractitioner(actor)) throw new AppError('NOT_FOUND', 404)
      const isClient = body.destination === 'client'
      if (isClient) requireUUID(body.clientId)
      else if (body.clientId !== undefined) throw new AppError('INVALID_INPUT', 400)
      const destination = isClient
        ? '/admin/clients/' + body.clientId
        : practitionerDestination[body.destination]
      if (!destination) throw new AppError('NOT_FOUND', 404)
      if (isClient) {
        const store = getPrescriptionStore()
        if (!store) throw new AppError('CLIENT_STORAGE_UNAVAILABLE', 503)
        if (!await store.findClientById(body.clientId)) throw new AppError('NOT_FOUND', 404)
      }
      const response = json({ redirectUrl: destination })
      if (!issueTrustedAdminSession(response, { secure: !config.test }))
        throw new AppError('PRACTITIONER_UNAVAILABLE', 503)
      return response
    }
    // Owner-only PRIVATE report media catalog. This is deliberately distinct
    // from moderated YouTube/Vimeo links on the public practitioner profile.
    if(joined === 'practice/report-materials' && method === 'GET'){
      if(!practitionerEmailAllowed(actor)||!await repo.isPractitioner(actor))
        throw new AppError('NOT_FOUND',404)
      return json({items:await listPractitionerMaterials(config)})
    }
    if(path[0]==='practice'&&path[1]==='report-materials'&&
      path.length===4&&path[3]==='media'&&['GET','HEAD'].includes(method)){
      if(!practitionerEmailAllowed(actor)||!await repo.isPractitioner(actor))
        throw new AppError('NOT_FOUND',404)
      requireUUID(path[2])
      // Byte range and private Storage credentials stay behind the
      // already-tested first-party owner media streaming adapter.
      const streamed=await streamReadyMaterial(config,path[2],request)
      return auth.apply(new NextResponse(streamed.body,{
        status:streamed.status,headers:streamed.headers,
      }))
    }
    if (joined === 'practice' && method === 'GET') {
      const workspace = await practiceRepo.getMyPractice(actor)
      let newServices = null
      try {
        newServices = await practiceRepo.getMarketplaceNewServices()
      } catch {
        // Keep private practitioner tools available if the marketplace view fails.
        // The UI shows "unavailable" instead of a misleading zero.
      }
      return json({ ...workspace, newServices })
    }
    if (joined === 'practice/articles' && method === 'GET') {
      await practiceRepo.requireActivated(actor)
      return json(await articleRepo.library(actor))
    }
    if (joined === 'practice/events' && method === 'GET') {
      await practiceRepo.requireActivated(actor)
      return json({items:await eventsRepo.mine(actor)})
    }
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
      if(deliveryEnabled()){
        const store=getPrescriptionStore()
        const exportedSessions=[]
        for(const row of exported.savedSessions||[]){
          try{
            const saved=await readSavedSession(config,store,actor,row.id,{markOpened:false})
            exportedSessions.push({...row,available:true,session:saved.session})
          }catch{exportedSessions.push({...row,available:false})}
        }
        exported.savedSessions=exportedSessions
      }
      exported.developmentGoals = await readDevelopmentGoals(config, actor)
      exported.labReports = (await listLabReports(config, actor)).reports
      exported.businessCoaching = await readBusinessCoaching(config, actor)
      exported.growthCourse = (await createGrowthCourseRepository(config).read(actor)).course
      exported.growthCourses = await createGrowthCourseRepository(config).exportHistory(actor)
      exported.growthCycles = await createDailyCourseRepository(config).exportHistory(actor)
      const response = json(exported)
      response.headers.set('Content-Disposition', 'attachment; filename="holistic-house-data.json"')
      return response
    }
    if (path[0] === 'test-ratings' && path.length === 2 && method === 'GET')
      return json(await readAccountTestRating(config, actor, path[1]))
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
    if (path[0] === 'documents' && path.length === 3 && path[2] === 'pdf' && method === 'GET') {
      // Account-scoped PDF: do NOT reuse an owner endpoint or a fragment-only link.
      // readSavedDocument checks the signed-in account, source status and hash.
      const store = getPrescriptionStore()
      if (!store?.findById) throw new AppError('DOCUMENT_UNAVAILABLE', 404)
      const locale = new URL(request.url).searchParams.get('locale') === 'ru' ? 'ru' : 'en'
      const saved = await readSavedDocument(config, store, actor, path[1], locale)
      const payment = saved.kind === 'invoice' || saved.kind === 'receipt'
      const [
        { buildPaymentPdf, buildPrescriptionPdf, buildPrescriptionMobilePdf },
        { reportPdfFilename },
        { metadataBaseFor },
      ] = await Promise.all([
        import('@/lib/prescriptions/pdf'),
        import('@/lib/documents/report-filename'),
        import('@/data/site-metadata'),
      ])
      const preview = new URL(request.url).searchParams.get('preview') === '1'
      const layout = new URL(request.url).searchParams.get('layout')
      const mobile = !payment && (preview || layout === 'mobile') && layout !== 'a4'
      const pdf = await (payment ? buildPaymentPdf : mobile ? buildPrescriptionMobilePdf : buildPrescriptionPdf)(
        saved.document, locale, metadataBaseFor().origin,
      )
      const filename = payment
        ? (saved.kind === 'receipt' ? 'receipt.pdf' : 'invoice.pdf')
        : reportPdfFilename(saved.document)
      return auth.apply(new NextResponse(pdf, {
        headers: {
          ...PRIVATE_HEADERS,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${filename}"`,
        },
      }))
    }
    if (method !== 'POST') throw new AppError('NOT_FOUND', 404)
    const body = await readBody(request)
    if (path[0] === 'reports' && path.length === 3 && path[2] === 'remove')
      return json(await removeSavedReport(config, actor, path[1]))
    if (path[0] === 'documents' && path.length === 3 && path[2] === 'remove')
      return json(await removeSavedDocument(config, actor, path[1]))
    if (joined === 'test-ratings') {
      await consumeRate(config, { op: 'account-test-rating', account: actor.id }, 20, 3600)
      return json(await saveAccountTestRating(config, actor, body))
    }
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
    // Keep onboarding and own profile/service drafts available during signup.
    // All other master tools require a submitted profile and first offering.
    if (path[0] === 'practice' && !['onboarding','profile','services'].includes(path[1]))
      await practiceRepo.requireActivated(actor)
    if (joined === 'practice/video-upload/intent') return json(await createPresentationUploadIntent(config, actor, body), 201)
    if (joined === 'practice/video-upload/complete') return json(await completePresentationUpload(config, actor, body))
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
    if (path[0] === 'practice' && path[1] === 'articles') {
      if(path[2] === 'folders'){
        if(path.length===3) return json(await articleRepo.createFolder(actor,body),201)
        if(path.length===4 && body.action==='delete') return json(await articleRepo.removeFolder(actor,path[3]))
        if(path.length===4 && body.action==='rename') return json(await articleRepo.renameFolder(actor,path[3],body))
        throw new AppError('NOT_FOUND',404)
      }
      if(path.length === 2) return json(await articleRepo.save(actor,null,body),201)
      if(path.length === 3){
        if(body.action === 'submit') return json(await articleRepo.submit(actor,path[2],body))
        if(body.action === 'archive') return json(await articleRepo.archive(actor,path[2],body))
        return json(await articleRepo.save(actor,path[2],body))
      }
    }
    if (path[0] === 'practice' && path[1] === 'events') {
      if (path.length === 2) return json(await eventsRepo.save(actor, null, body), 201)
      if (path.length === 3) {
        if (body.action === 'submit') return json(await eventsRepo.submit(actor, path[2], { expectedRevision: body.expectedRevision }))
        if (body.action === 'pause' || body.action === 'archive')
          return json(await eventsRepo.changeVisibility(actor, path[2], body))
        return json(await eventsRepo.save(actor, path[2], body))
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
      await createBillingService(config).guardAccountDeletion(actor)
      const result = await repo.requestDeletion(actor, body)
      await auth.client.auth.signOut({ scope: 'global' })
      return auth.clear(json(result, 202))
    }
    throw new AppError('NOT_FOUND', 404)
  } catch (error) {
    const safe = safeError(error)
    // Production previously hid every unexpected course-start failure behind
    // SERVICE_UNAVAILABLE, making it impossible to distinguish an application
    // defect from a transient SQL connection error. Log only safe error-class
    // metadata: never payloads, account IDs, assessment answers, or SQL text.
    if (safe.code === 'SERVICE_UNAVAILABLE' &&
        new URL(request.url).pathname === '/api/app/course') {
      const name = /^[A-Za-z]{2,45}$/.test(error?.name || '') ? error.name : 'Error'
      const code = /^[A-Za-z0-9_]{2,35}$/.test(error?.code || '') ? error.code : 'UNCLASSIFIED'
      console.error('HH_COURSE_START_UNEXPECTED', name, code)
    }
    const response = NextResponse.json(
      { error: safe.code },
      { status: safe.status, headers: PRIVATE_HEADERS },
    )
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as HEAD, handle as POST }

