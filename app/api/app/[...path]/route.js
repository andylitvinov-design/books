import { NextResponse, after } from 'next/server'
import { REIKI_CONSENT_COOKIE, reikiConsentCookieOptions, reikiConsentProof, validReikiConsent } from '@/lib/academy/reiki-oauth-consent.js'
import { randomUUID } from 'node:crypto'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { createReikiJoinIntent,verifyReikiJoinIntent,reikiJoinCookieName,createReikiRetryProof,verifyReikiRetryProof,REIKI_RETRY_COOKIE,REIKI_JOIN_TTL,REIKI_RETRY_TTL } from '@/lib/academy/reiki-registration-proof.mjs'
import { syncReikiRegistration } from '@/lib/academy/reiki-registration-store'
import {
  TELEGRAM_OIDC_PROVIDER, IDENTITY_LINK_COOKIE, telegramLoginEnabled, oauthProvider,
  createIdentityLinkProof, verifyIdentityLinkProof,
} from '@/lib/app/telegram-oauth.mjs'
import { safeEnquiryReturnPath } from '@/lib/app/enquiry-auth-redirect'
import { clarityDaybookPath, clarityOnboardingPath } from '@/lib/app/clarity-program.mjs'
import {programFromContinuation,programDaybookPath,programOnboardingPath} from '@/lib/app/program-daybook-entry.mjs'
import {directMessengerRecipient,directMessengerReturnPath,directMessengerSetupPath} from '@/lib/app/direct-messenger-handoff.mjs'
import { createAppRepository } from '@/lib/app/repository'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { videoProfileFocus } from '@/lib/mandala/video-affirmation-focus.mjs'
import { readDevelopmentGoals, saveDevelopmentGoals } from '@/lib/app/development-goals'
import { readLearningJourney } from '@/lib/app/learning-journey-repository'
import { listLabReports, saveLabReport, deleteLabReport } from '@/lib/app/lab-reports'
import { readBusinessCoaching, saveBusinessCoaching } from '@/lib/app/business-coaching'
import { readPersonalCoaching, savePersonalCoaching, readTraditionCoaching, saveTraditionCoaching, readTraditionCoachingSummaries } from '@/lib/app/personal-coaching'
import {personalCoachingBrainTurn,personalCoachingBrainProbe,myCoachGenerativeTurn,myCoachGenerativeStreamTurn,myCoachGenerativeProbe} from '@/lib/app/coaching-brain'
import {geminiCoachTextConfig} from '@/lib/coaching/gemini-coach-text.mjs'
import {geminiCoachTtsConfig} from '@/lib/coaching/gemini-coach-tts.mjs'
import {geminiFreeLiveConfig,geminiFreeLiveUnavailableReason,normalizeGeminiFreeLiveStart,issueGeminiFreeLiveToken,geminiFreeLiveCheckpoint} from '@/lib/coaching/gemini-live-free.mjs'
import { readCoachingReportDraft } from '@/lib/app/coaching-report-v2'
import { listCoachingReports, exportCoachingReports, readCoachingReport, saveCoachingReport, deleteCoachingReport } from '@/lib/app/coaching-report-store'
import { readCoachingLifePlan, updateCoachingLifePlanArea, importCoachingReportActions } from '@/lib/app/coaching-life-plan'
import { readBusinessContext, importPlaudBusinessContext, reviewBusinessInsight } from '@/lib/app/business-context-store'
import { exportCoachingLifePlan } from '@/lib/app/coaching-life-plan'
import { revokeCoachingPlanContext } from '@/lib/app/coaching-life-plan'
import { deleteCoachingPlanAction } from '@/lib/app/coaching-life-plan'
import { issueCoachContextSession } from '@/lib/app/coach-context-session'
import { coachContextConsentOptions, manageCoachContextConsent } from '@/lib/app/coach-context-snapshot'
import { reviewedReportMemoryCandidates } from '@/lib/personal-coaching/context-memory-candidates.mjs'
import {learnerCoachingAudio} from '@/lib/academy/coaching-audio-store'
import { readPersonalCoachingCatalog } from '@/lib/app/personal-coaching-catalog'
import { readCoachingIntake, saveCoachingIntake } from '@/lib/app/coaching-intake'
import { createGrowthCourseRepository } from '@/lib/app/growth-course'
import { createNotificationRepository } from '@/lib/app/notification-repository'
import {createNativePushRepository} from '@/lib/app/native-push-repository'
import {registerLiveActivity,stopLiveActivity,updateLiveActivities} from '@/lib/app/native-live-activity'
import { createDailyCourseRepository } from '@/lib/app/growth-daily'
import { createEnergyworkCourseRepository } from '@/lib/academy/energywork-course-repository'
import { readReikiInitiationPhoto, saveReikiInitiationPhoto, REIKI_INITIATION_PHOTO_MAX_BYTES } from '@/lib/academy/reiki-initiation-photo'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import { createExpressReportRepository } from '@/lib/practitioners/express-report-repository'
import {createPractitionerClientMessages} from '@/lib/practitioners/client-messages'
import {sendBookingMasterEmail} from '@/lib/practitioners/booking-master-email'
import {dispatchClientMessagePush,dispatchPractitionerMessagePush} from '@/lib/app/client-message-push'
import {dispatchNativeClientMessagePush} from '@/lib/app/native-push-dispatch'
import {dispatchClientTelegramNotification} from '@/lib/app/client-telegram-dispatch'
import {dispatchExpressReportTelegramNotice} from '@/lib/app/express-report-telegram-dispatch'
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
import { consumeRate,consumeRateBatch,transaction } from '@/lib/app/database'
import {geminiLiveTokenQuota} from '@/lib/coaching/gemini-live-quota.mjs'
import { operationHash } from '@/lib/app/crypto'
import { verifiedTelegramSubject } from '@/lib/app/telegram-business-identity.mjs'
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
// Only a button on the public practitioner showroom may request one of these
// pre-existing protected destinations after Google OAuth. Never put client data,
// a draft, a URL or an arbitrary return path into the OAuth continuation.
const PRACTICE_PREVIEW_ACTIONS = Object.freeze({
  create:'/app/practice?panel=services&create=1&starter=session',
  service:'/app/practice?panel=services&create=1&starter=session',
  intro:'/app/practice?panel=services&create=1&starter=intro',
  workshop:'/app/practice?panel=services&create=1&starter=workshop',
  diagnostic:'/app/practice?panel=services&create=1&starter=diagnostic',
  energy:'/app/practice?panel=services&create=1&starter=energy',
  personal:'/app/practice?panel=services&create=1&starter=personal',
  session:'/app/practice?panel=services',
  meditation:'/app/practice?panel=materials&materialTab=courses&create=1&meditation=audio',
  talisman:'/app/practice?panel=services&create=1&starter=energy',
  reiki:'/app/practice?panel=services&create=1&starter=reiki',
  course:'/app/practice?panel=materials&materialTab=courses&create=1',
  material:'/app/practice?panel=materials&materialTab=articles',
  meditationList:'/app/practice?panel=materials&materialTab=courses',
  talismanList:'/app/practice?panel=services',
  reikiList:'/app/practice?panel=services',
  courseList:'/app/practice?panel=materials&materialTab=courses',
  clients:'/app/practice?panel=clients',
  requests:'/app/practice?panel=requests',
  messages:'/app/messages?section=clients&tab=chats',
  services:'/app/practice?panel=services',
  materials:'/app/practice?panel=materials',
  analytics:'/app/practice?panel=analytics',
  profile:'/app/practice?panel=profile',
})
const validPracticeContinuation=(continueTo,profi)=>
  profi===null || (continueTo==='practice-preview' && Object.hasOwn(PRACTICE_PREVIEW_ACTIONS,profi)) ||
  (continueTo==='my-practice' && ['session','intro','workshop','diagnostic','energy','personal','course','profile','requests'].includes(profi))
export const runtime = 'nodejs'
// The Cabinet Postgres and verified Supabase Auth run in ca-central-1.
// Keep only this private API close to its data source (not the whole site).
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0
const notifyBookingParticipants=(config,actor,requestId,recipient,{event='update',revision=null,practitionerId=null,messageId=null}={})=>{
  // A committed booking status change is the source of truth. Notifications
  // contain only neutral text; private goals, photos and contacts stay in Cabinet.
  after(async()=>{
    try{
      const result=messageId?{id:messageId,duplicate:false}:await createPractitionerClientMessages(config).send(actor,{
        requestId,operationId:randomUUID(),visibility:'participants',
        text:recipient==='client'
          ? 'Your Holistic House booking has an update. Open your secure Cabinet for details.'
          : event==='new'
            ? 'You received a new Holistic House booking request. Open My Practice to respond.'
            : event==='enquiry'
              ? 'You received a new Holistic House service enquiry. Open My Practice to respond.'
              : 'A Holistic House booking request changed. Open My Practice for details.',
      })
      if(result.duplicate===false){
        const messageId=result.id
        const outcomes=await Promise.allSettled(recipient==='client'?[
          dispatchClientMessagePush(config,messageId),
          dispatchNativeClientMessagePush(config,messageId),
          dispatchClientTelegramNotification(config,messageId),
        ]:[
          dispatchPractitionerMessagePush(config,messageId),
          dispatchClientTelegramNotification(config,messageId),
        ])
        if(outcomes.some(outcome=>outcome.status==='rejected'||
          (outcome.value?.attempted>0&&outcome.value?.accepted<outcome.value.attempted)||
          (outcome.value?.claimed>0&&outcome.value?.accepted<outcome.value.claimed)))
          console.error('HH_BOOKING_EXTERNAL_NOTIFICATION_UNCONFIRMED')
      }
    }catch{
      // A neutral error code for operations, never a sensitive request payload.
      console.error('HH_BOOKING_IN_APP_NOTIFICATION_FAILED')
    }
    // This is an independent, optional transactional channel. A failed email
    // must not block an already accepted booking or its in-app notification.
    if(recipient==='master'&&Number.isSafeInteger(revision)){
      try{
        await sendBookingMasterEmail({requestId,revision,practitionerId,event})
      }catch{
        console.error('HH_BOOKING_EMAIL_DELIVERY_UNCONFIRMED')
      }
    }
  })
}
// Verified Telegram OIDC is the only bridge from Business messages to Cabinet.
// Never derive Supabase Auth from bot messages, usernames, phones or profile text.
async function syncVerifiedTelegramBusinessEnquiries(config,actor,identities,{reactivate=false}={}){
 const subject=verifiedTelegramSubject(identities)
 if(!subject)return {verified:false,linked:0,disabled:false}
 const peerHash=operationHash({scope:'hh-telegram-business-peer',id:subject},config)
 return transaction(config,actor,async db=>{
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
   ['hh-tg-cabinet-autolink:'+actor.id])
  if(reactivate)await db.query(
   'delete from app_private.crm_tg_business_cabinet_optouts where account_id=$1',[actor.id])
  const stopped=await db.query(
   'select account_id from app_private.crm_tg_business_cabinet_optouts where account_id=$1',
   [actor.id])
  if(stopped.rowCount)return {verified:true,linked:0,disabled:true}
  await db.query("select set_config('hh.telegram_verified_peer_hash',$1,true)",[peerHash])
  const updated=await db.query(
   'update app_private.crm_tg_business_service_sessions '+
   'set account_id=$1,linked_at=coalesce(linked_at,now()) '+
   "where telegram_peer_hash=$2 and contact_id is not null and stage='submitted' "+
   'and account_id is null returning contact_id',
   [actor.id,peerHash])
  await recordReikiBusinessPeer(db,config,subject,peerHash)
  return {verified:true,linked:updated.rowCount,disabled:false}
 })
}
async function recordReikiBusinessPeer(db,config,subject,peerHash){
 const {verifiedBusinessThreadProof}=await import('@/lib/crm/telegram-business-inbox')
 const proof=verifiedBusinessThreadProof(subject,config)
 if(!proof)return
 // Roll out independently of the existing Cabinet account-link feature.
 const ready=(await db.query(
   "select pg_catalog.to_regprocedure('app_private.reiki_record_business_peer(text,text,text)') is not null as ready"
 )).rows[0]?.ready===true
 if(ready)await db.query('select app_private.reiki_record_business_peer($1,$2,$3)',[peerHash,proof.accountHash,proof.userHash])
}

// Old verified Business links predate the CRM-thread HMAC fields. Repair only
// an already-linked account after fresh course consent, without creating a
// channel link or sending any message to a provider.
async function recoverReikiBusinessLink(config,actor,auth,view){
 if(!view.sharingWithMessenger||view.messengerLinked)return view
 try{
   const eligible=await transaction(config,actor,async db=>(await db.query(
     `select exists(select 1 from app_private.crm_tg_business_service_sessions
       where account_id=$1 and linked_at is not null and stage='submitted'
         and crm_thread_user_hash is null) as eligible`,[actor.id]
   )).rows[0]?.eligible)
   if(!eligible)return view
   const {data,error}=await auth.client.auth.getUserIdentities()
   const subject=!error&&verifiedTelegramSubject(data?.identities)
   if(!subject)return view
   const peerHash=operationHash({scope:'hh-telegram-business-peer',id:subject},config)
   const linked=await transaction(config,actor,async db=>{
     await db.query("select set_config('hh.telegram_verified_peer_hash',$1,true)",[peerHash])
     await recordReikiBusinessPeer(db,config,subject,peerHash)
     return (await db.query('select app_private.reconcile_my_reiki_messenger() as linked')).rows[0]?.linked===true
   })
   return linked?{...view,messengerLinked:true}:view
 }catch{
   // The committed course snapshot remains valid and can retry on the next visit.
   return view
 }
}
async function disableVerifiedTelegramBusinessSync(config,actor){
 return transaction(config,actor,async db=>{
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
   ['hh-tg-cabinet-autolink:'+actor.id])
  await db.query(
   'insert into app_private.crm_tg_business_cabinet_optouts(account_id) values($1) '+
   'on conflict(account_id) do nothing',[actor.id])
  const result=await db.query(
   'update app_private.crm_tg_business_service_sessions '+
   'set account_id=null,linked_at=null where account_id=$1 returning contact_id',
   [actor.id])
  return result.rowCount
 })
}

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
    if (joined === 'auth/providers' && method === 'GET')
      return json({ google: true, telegram: telegramLoginEnabled() })
    if (joined === 'auth/status' && method === 'GET') {
      await auth.verified()
      return json({ authenticated: true })
    }
    if (joined === 'auth/start' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['locale', 'intentId', 'serviceId', 'continueTo', 'program', 'requestId', 'native', 'returnPath', 'profi', 'coachingMode', 'coachingLang', 'recipientSlug', 'provider', 'reikiSharing', 'reikiRegistration'])
      const authChoice = body.provider ?? 'google'
      if(body.reikiRegistration!==undefined && (authChoice!=='google'||body.continueTo!=='energywork-daybook'||!['en','ru','es'].includes(body.reikiRegistration)))
        throw new AppError('INVALID_REIKI_REGISTRATION',400)
      const reikiJoin=body.reikiRegistration===undefined?null:createReikiJoinIntent(body.reikiRegistration,config)
      if (authChoice !== 'google' && authChoice !== 'telegram')
        throw new AppError('INVALID_AUTH_PROVIDER', 400)
      if (body.reikiSharing !== undefined && (body.reikiSharing !== true || !['energywork','energywork-daybook'].includes(body.continueTo) || authChoice !== 'google' || body.native)) throw new AppError('INVALID_CONTINUATION',400)
      const reikiFlow = body.reikiSharing === true ? randomUUID() : null
      const selectedProvider = oauthProvider(authChoice)
      if (!selectedProvider) throw new AppError('TELEGRAM_LOGIN_UNAVAILABLE', 503)
      const locale = body.locale === 'ru' ? 'ru' : body.locale === 'es' && ['enquiry','coaching-intake','practice-preview','direct-messages','video-studio','cabinet','course','tests','my-tests','my-courses','business','my-coach-mira','clarity-daybook','goal-daybook','business-daybook'].includes(body.continueTo) ? 'es' : 'en'
      const intentId = body.intentId || null,
        serviceId = body.serviceId || null,
        continueTo = body.continueTo || null,
        program = body.program || null,
        requestId = body.requestId || null,
        native = body.native === true,
        returnPath = body.returnPath ?? null,
        profi = body.profi ?? null,
        coachingMode = body.coachingMode ?? null,
        coachingLang = body.coachingLang ?? null,
        recipientSlug = body.recipientSlug ?? null
      if (body.native !== undefined && body.native !== true) throw new AppError('INVALID_CONTINUATION',400)
      if (continueTo !== null && !['tests', 'course', 'consultations', 'business', 'coaching', 'coaching-intake', 'enquiry', 'my-coach-mira', 'clarity-daybook','goal-daybook','business-daybook'].includes(continueTo) &&
        !['commander-monitor','cabinet','my-practice','practice-preview','direct-messages','video-studio','my-tests','my-courses','reports','practitioner-growth','practitioner-seo','practitioner-acquisition','practitioner-tools','practitioner-youtube','practitioner-youtubeConnect','practitioner-youtubeConnectEn','energywork-daybook','energywork','practitioner'].includes(continueTo)) throw new AppError('INVALID_CONTINUATION', 400)
      if (coachingMode !== null && (continueTo !== 'coaching' || !['egyptian','greek'].includes(coachingMode))) throw new AppError('INVALID_CONTINUATION', 400)
      if (coachingLang !== null && (continueTo !== 'coaching' || coachingLang !== 'es' || coachingMode === null)) throw new AppError('INVALID_CONTINUATION', 400)
      if (recipientSlug !== null) {
        if (continueTo !== 'direct-messages') throw new AppError('INVALID_CONTINUATION',400)
        try { directMessengerRecipient(recipientSlug) }
        catch { throw new AppError('INVALID_RECIPIENT',400) }
      }
      if (!validPracticeContinuation(continueTo,profi)) throw new AppError('INVALID_CONTINUATION', 400)
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
      // One verified Telegram OAuth action, with no second confirmation:
      // when Google is already signed in, link to that account, not a new one.
      if(authChoice==='telegram'&&!native){
        let existingActor=null
        try{existingActor=await auth.verified()}
        catch(e){if(e?.code!=='SIGN_IN_REQUIRED')throw e}
        if(existingActor){
          const {data:existingIdentities,error:identityError}=await auth.client.auth.getUserIdentities()
          if(identityError||!Array.isArray(existingIdentities?.identities))
            throw new AppError('IDENTITY_LIST_UNAVAILABLE',503)
          if(!existingIdentities.identities.some(item=>item.provider===TELEGRAM_OIDC_PROVIDER)){
            const {data:linked,error:linkError}=await auth.client.auth.linkIdentity({
              provider:TELEGRAM_OIDC_PROVIDER,
              options:{
                scopes:selectedProvider.scopes,
                redirectTo:origin+'/api/app/auth/callback?locale='+locale+'&continue=cabinet&link=1&quick=1',
                skipBrowserRedirect:true,
              },
            })
            if(linkError||!linked?.url||new URL(linked.url).origin!==config.supabaseUrl)
              throw new AppError('IDENTITY_LINK_UNAVAILABLE',503)
            const response=json({redirectUrl:linked.url})
            response.cookies.set(IDENTITY_LINK_COOKIE,
              createIdentityLinkProof(existingActor.id,TELEGRAM_OIDC_PROVIDER,config),{
                path:'/api/app/auth',maxAge:600,httpOnly:true,secure:!config.test,sameSite:'lax',
              })
            return response
          }
        }
      }
      const { data, error } = await auth.client.auth.signInWithOAuth({
        provider: selectedProvider.provider,
        options: {
          ...(authChoice === 'google' ? { scopes: 'openid email profile' } : { scopes: selectedProvider.scopes }),
          redirectTo: `${origin}/api/app/auth/callback?locale=${locale}${reikiFlow ? '&reikiFlow=' + reikiFlow : ''}${native ? '&native=1' : ''}${intentId ? `&intent=${encodeURIComponent(intentId)}` : ''}${serviceId ? `&service=${encodeURIComponent(serviceId)}` : ''}${continueTo ? `&continue=${encodeURIComponent(continueTo)}` : ''}${program ? `&program=${encodeURIComponent(program)}` : ''}${requestId ? `&request=${encodeURIComponent(requestId)}` : ''}${returnPath ? `&returnPath=${encodeURIComponent(returnPath)}` : ''}${profi ? `&profi=${encodeURIComponent(profi)}` : ''}${coachingMode ? `&coachingMode=${encodeURIComponent(coachingMode)}` : ''}${coachingLang ? `&coachingLang=${encodeURIComponent(coachingLang)}` : ''}${recipientSlug ? `&recipientSlug=${encodeURIComponent(recipientSlug)}` : ''}${reikiJoin ? `&reikiJoin=${reikiJoin.nonce}` : ''}`,
          skipBrowserRedirect: true,
        },
      })
      if (error || !data.url || new URL(data.url).origin !== config.supabaseUrl)
        throw new AppError('SIGN_IN_UNAVAILABLE', 503)
      const response = json({ redirectUrl: data.url, ...(reikiFlow ? { reikiFlow } : {}) })
      if (['energywork','energywork-daybook'].includes(continueTo) && (reikiFlow || request.cookies?.get(REIKI_CONSENT_COOKIE)?.value)) response.cookies.set(REIKI_CONSENT_COOKIE,
        reikiFlow ? reikiConsentProof(reikiFlow,null,config) : '', reikiConsentCookieOptions(config,reikiFlow ? undefined : 0))
      if(reikiJoin)response.cookies.set(reikiJoin.cookieName,reikiJoin.value,{
        path:'/api/app/auth',maxAge:REIKI_JOIN_TTL,httpOnly:true,secure:!config.test,sameSite:'lax',
      })
      return response
    }
    if (joined === 'auth/callback' && method === 'GET') {
      const url = new URL(request.url),
        locale = url.searchParams.get('locale') === 'ru' ? 'ru' : url.searchParams.get('locale') === 'es' && ['enquiry','coaching-intake','practice-preview','direct-messages','video-studio','cabinet','course','tests','my-tests','my-courses','business','my-coach-mira','clarity-daybook','goal-daybook','business-daybook'].includes(url.searchParams.get('continue')) ? 'es' : 'en',
        code = url.searchParams.get('code'),
        intentId = url.searchParams.get('intent'),
        serviceId = url.searchParams.get('service'),
        continueTo = url.searchParams.get('continue'),
        program = url.searchParams.get('program'),
        requestId = url.searchParams.get('request'),
        returnPath = url.searchParams.get('returnPath'),
        profi = url.searchParams.get('profi'),
        coachingMode = url.searchParams.get('coachingMode'),
        coachingLang = url.searchParams.get('coachingLang'),
        recipientSlug = url.searchParams.get('recipientSlug')
      const reikiJoinNonce=url.searchParams.get('reikiJoin')
      const reikiCookie=reikiJoinNonce===null?null:reikiJoinCookieName(reikiJoinNonce)
      if(reikiJoinNonce!==null && (!reikiCookie||continueTo!=='energywork-daybook'||url.searchParams.getAll('reikiJoin').length!==1))
        throw new AppError('INVALID_REIKI_REGISTRATION',400)
      const reikiLocale=reikiCookie?verifyReikiJoinIntent(reikiJoinNonce,request.cookies.get(reikiCookie)?.value,config):null
      let reikiRetryUpdate
      const linkMode = url.searchParams.get('link')
      if (linkMode !== null && linkMode !== '1') throw new AppError('INVALID_LINK_FLOW',400)
      const linkProof = linkMode === '1'
        ? verifyIdentityLinkProof(request.cookies.get(IDENTITY_LINK_COOKIE)?.value,config)
        : null
      const linkedAccount=linkProof?.accountId??null
      if (linkMode === '1' && !linkedAccount) throw new AppError('INVALID_LINK_FLOW',400)
      if (linkedAccount && (await auth.verified()).id !== linkedAccount)
        throw new AppError('INVALID_LINK_FLOW',403)
      const finishAuth = response => {
        const applied = auth.apply(response)
        if(reikiCookie&&url.searchParams.get('native')!=='1')applied.cookies.set(reikiCookie,'',{
          path:'/api/app/auth',maxAge:0,httpOnly:true,secure:!config.test,sameSite:'lax',
        })
        if(reikiRetryUpdate!==undefined)applied.cookies.set(REIKI_RETRY_COOKIE,reikiRetryUpdate||'',{
          path:'/api/app',maxAge:reikiRetryUpdate?REIKI_RETRY_TTL:0,httpOnly:true,secure:!config.test,sameSite:'lax',
        })
        if (linkedAccount) applied.cookies.set(IDENTITY_LINK_COOKIE,'',{
          path:'/api/app/auth',maxAge:0,httpOnly:true,secure:!config.test,sameSite:'lax',
        })
        return applied
      }
      if (coachingMode !== null && (continueTo !== 'coaching' || !['egyptian','greek'].includes(coachingMode))) throw new AppError('INVALID_CONTINUATION', 400)
      if (coachingLang !== null && (continueTo !== 'coaching' || coachingLang !== 'es' || coachingMode === null)) throw new AppError('INVALID_CONTINUATION', 400)
      if (url.searchParams.getAll('recipientSlug').length>1) throw new AppError('INVALID_CONTINUATION',400)
      if (recipientSlug !== null) {
        if (continueTo !== 'direct-messages') throw new AppError('INVALID_CONTINUATION',400)
        try { directMessengerRecipient(recipientSlug) }
        catch { throw new AppError('INVALID_RECIPIENT',400) }
      }
      if (!validPracticeContinuation(continueTo,profi)) throw new AppError('INVALID_CONTINUATION', 400)
      if ((continueTo === 'enquiry' && !safeEnquiryReturnPath(returnPath, locale)) ||
          (continueTo !== 'enquiry' && returnPath !== null)) throw new AppError('INVALID_CONTINUATION', 400)
      if (program !== null && (continueTo !== 'course' || !['stress', 'confidence', 'focus'].includes(program))) throw new AppError('INVALID_CONTINUATION', 400)
      if (intentId) requireUUID(intentId)
      if (serviceId) requireUUID(serviceId)
      if (requestId !== null) requireUUID(requestId)
      if ((continueTo === 'consultations') !== Boolean(requestId)) throw new AppError('INVALID_CONTINUATION', 400)
      if ((intentId && serviceId) || (continueTo && (!['commander-monitor','tests','course','consultations','business','coaching','cabinet','my-practice','practice-preview','my-tests','my-courses','reports','practitioner-growth','practitioner-seo','practitioner-acquisition','practitioner-tools','practitioner-youtube','practitioner-youtubeConnect','practitioner-youtubeConnectEn','energywork-daybook','energywork','practitioner','enquiry','coaching-intake','direct-messages','video-studio','my-coach-mira','clarity-daybook','goal-daybook','business-daybook'].includes(continueTo) || intentId || serviceId))) throw new AppError('INVALID_CONTINUATION', 400)
      // Native OAuth runs Google in the system browser. This HTTPS callback
      // merely returns the single-use PKCE authorization code to the app;
      // the WebView's existing HttpOnly PKCE cookie then exchanges it through
      // THIS SAME callback without native=1. Never transfer session tokens.
      if (url.searchParams.get('native') === '1') {
        if (linkedAccount) throw new AppError('INVALID_LINK_FLOW',400)
        if (continueTo === 'enquiry') throw new AppError('INVALID_CONTINUATION', 400)
        const handoff = new URL('holistichouse://auth/callback')
        for (const key of ['locale','intent','service','continue','program','request','profi','coachingMode','coachingLang','recipientSlug','sb_flow_id','reikiJoin']) {
          const value = url.searchParams.get(key)
          if (value !== null) handoff.searchParams.set(key,value)
        }
        if (url.searchParams.has('error')) handoff.searchParams.set('error','cancelled')
        else if (code && code.length <= 4096) handoff.searchParams.set('code',code)
        else handoff.searchParams.set('error','cancelled')
        return finishAuth(NextResponse.redirect(handoff.toString(),{status:303,headers:PRIVATE_HEADERS}))
      }
      const destination = intentId
        ? `${origin}/${locale}/app/continue?intent=${encodeURIComponent(intentId)}&auto=1`
        : serviceId
          ? `${origin}/${locale}/app/consultations?service=${encodeURIComponent(serviceId)}`
          : continueTo === 'commander-monitor'
            ? `${origin}/commander-connect.html?finish=1`
        : continueTo === 'consultations'
            ? `${origin}/${locale}/app/consultations?request=${encodeURIComponent(requestId)}`
          : continueTo === 'enquiry'
            ? `${origin}${returnPath}?hh_enquiry=google`
          : continueTo === 'direct-messages'
            ? `${origin}${directMessengerReturnPath(locale,recipientSlug)}`
          : continueTo === 'video-studio'
            ? `${origin}/${locale}/holistic-support/mandala`
          : continueTo === 'clarity-daybook'
            ? origin+clarityDaybookPath(locale)
          : programFromContinuation(continueTo)
            ? origin+programDaybookPath(locale,programFromContinuation(continueTo))
          : continueTo === 'my-coach-mira'
            ? `${origin}/${locale}/coaching/sessions?coach=mira`
          : continueTo === 'tests'
            ? `${origin}/${locale}/app/tests?selection=pending`
            : continueTo === 'course'
              ? `${origin}/${locale}/app/course${program ? `?program=${encodeURIComponent(program)}` : ''}`
              : continueTo === 'business'
                ? `${origin}/${locale}/app/business`
              : continueTo === 'coaching'
                ? `${origin}/${locale}/app/coaching${coachingMode ? '/'+coachingMode : ''}${coachingLang==='es'?'?lang=es':''}`
              : continueTo === 'coaching-intake'
                ? `${origin}/${locale}/coaching/intake?private=1`
              : continueTo === 'practice-preview'
                // Return to the identical canonical Practice dashboard for
                // guest and signed-in users. Older action-code continuations
                // stay allowlisted but never inject a layout-shifting banner.
                // The user explicitly chooses a protected editor after login.
                ? `${origin}/${locale}/practice`
              : continueTo === 'cabinet'
                ? `${origin}/${locale}/app/portrait?space=today`
                : continueTo === 'my-practice'
                  ? profi
                    ? `${origin}/${locale}/app/practice${profi === 'course' ? '?panel=materials&materialTab=courses&create=1' : profi === 'profile' ? '?panel=profile' : profi === 'requests' ? '?panel=requests' : ['session','intro','workshop','diagnostic','energy','personal'].includes(profi) ? '?panel=services&create=1&starter=' + profi : ''}`
                    : `${origin}/${locale}/practice`
                : continueTo === 'my-tests'
                  ? `${origin}/${locale}/app/tests`
                  : continueTo === 'my-courses'
                    ? `${origin}/${locale}/app/course`
                    : continueTo === 'reports'
                      ? `${origin}/${locale}/app/portrait?space=reports#personal-reports`
                      : continueTo === 'practitioner-growth'
                        ? `${origin}/admin/login?destination=growth`
                      : continueTo === 'practitioner-seo'
                        ? `${origin}/admin/login?destination=seo`
                      : continueTo === 'practitioner-acquisition'
                        ? `${origin}/admin/login?destination=acquisition`
                      : continueTo === 'practitioner-tools'
                        ? `${origin}/admin/login?destination=tools`
                      : continueTo === 'practitioner-youtube'
                        ? `${origin}/admin/login?destination=youtube`
                      : continueTo === 'practitioner-youtubeConnect'
                        ? `${origin}/admin/login?destination=youtubeConnect`
                      : continueTo === 'practitioner-youtubeConnectEn'
                        ? `${origin}/admin/login?destination=youtubeConnectEn`
                      : continueTo === 'practitioner'
                        ? `${origin}/admin/login`
                        : continueTo === 'energywork-daybook'
                          ? `${origin}/${locale}/academy/principles-of-energywork/daybook`
                        : continueTo === 'energywork'
                          ? `${origin}/${locale}/academy/principles-of-energywork/learn`
                        : `${origin}/${locale}/app`
      // Failed Google login returns to the guest-visible approved design,
      // not a private editor that can only show an old sign-in shell.
      const failedPracticeDestination = continueTo === 'practice-preview'
        ? `${origin}/${locale}/practice`
        : continueTo === 'my-coach-mira' ? `${origin}/${locale}/my-coach` : destination
      if (url.searchParams.has('error') || !code || code.length > 4096)
        return finishAuth(
          NextResponse.redirect((value => { const url = new URL(failedPracticeDestination); if(linkedAccount) { url.pathname=`/${locale}/app/settings`; url.search=''; url.hash=''; } url.searchParams.set('auth', value); return url.href; })('cancelled'), {
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
        return finishAuth(
          NextResponse.redirect((value => { const url = new URL(failedPracticeDestination); if(linkedAccount) { url.pathname=`/${locale}/app/settings`; url.search=''; url.hash=''; } url.searchParams.set('auth', value); return url.href; })('failed'), {
            status: 303,
            headers: PRIVATE_HEADERS,
          }),
        )
      const actor = await auth.verified()
      if (linkedAccount && actor.id !== linkedAccount) {
        await auth.client.auth.signOut({scope:'local'})
        const denied=NextResponse.redirect(`${origin}/${locale}/app?auth=link-mismatch`,{
          status:303,headers:PRIVATE_HEADERS,
        })
        return auth.clear(finishAuth(denied))
      }
      if (linkProof) {
        const {data:linkedIdentities,error:identityError}=await auth.client.auth.getUserIdentities()
        if (identityError || !linkedIdentities?.identities?.some(item=>item.provider===linkProof.provider))
          return finishAuth(NextResponse.redirect(`${origin}/${locale}/app/settings?identity=failed`,{
            status:303,headers:PRIVATE_HEADERS,
          }))
      }
      const account=await createAppRepository(config).ensureAccount(actor)
      if(reikiLocale&&!linkedAccount){
        try{
          await syncReikiRegistration(config,actor,auth.client,reikiLocale)
          reikiRetryUpdate=null
        }catch{
          // Preserve verified login; a scoped, signed account-bound cookie
          // retries the operational registration on the next Cabinet bootstrap.
          if(actor.email)reikiRetryUpdate=createReikiRetryProof(actor,reikiLocale,config)
          console.error('HH_REIKI_CRM_REGISTRATION_RETRY')
        }
      }
      // Auto-attach only proven Business enquiries; never invalidate login
      // on a transient CRM error. Settings retries an authenticated POST.
      if(telegramLoginEnabled()){
        try{
          const {data:verifiedIdentities,error:telegramIdentityError}=
            await auth.client.auth.getUserIdentities()
          if(!telegramIdentityError&&Array.isArray(verifiedIdentities?.identities))
            await syncVerifiedTelegramBusinessEnquiries(config,actor,verifiedIdentities.identities)
        }catch{
          console.error('HH_TELEGRAM_BUSINESS_CABINET_AUTOLINK_RETRY_ON_SETTINGS')
        }
      }
      // On first Google sign-in, the client must finish explicit account
      // consent before a private thread is created. Keep the chosen master's
      // public slug through this existing Cabinet onboarding, never in storage.
      const verifiedDestination=linkedAccount ? (url.searchParams.get('quick')==='1' ? destination : origin+'/'+locale+'/app/settings?identity=linked') : continueTo==='direct-messages'&&account.onboardingState!=='active'
        ? origin+directMessengerSetupPath(locale,recipientSlug) : continueTo==='clarity-daybook'&&account.onboardingState!=='active'
        ? origin+clarityOnboardingPath(locale) : programFromContinuation(continueTo)&&account.onboardingState!=='active'
        ? origin+programOnboardingPath(locale,programFromContinuation(continueTo)) : destination
      const response = finishAuth(NextResponse.redirect(verifiedDestination, { status: 303, headers: PRIVATE_HEADERS }))
      const reikiFlow = url.searchParams.get('reikiFlow')
      if (['energywork','energywork-daybook'].includes(continueTo) && !linkedAccount && reikiFlow &&
          validReikiConsent(request.cookies?.get(REIKI_CONSENT_COOKIE)?.value,reikiFlow,null,config)) {
        response.cookies.set(REIKI_CONSENT_COOKIE,reikiConsentProof(reikiFlow,actor.id,config),reikiConsentCookieOptions(config))
      }
      return response
    }
    if (joined === 'auth/identities' && method === 'GET') {
      const actor=await auth.verified()
      if (request.headers.get('x-hh-account-id') !== actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      const {data,error}=await auth.client.auth.getUserIdentities()
      if (error || !Array.isArray(data?.identities))
        throw new AppError('IDENTITY_LIST_UNAVAILABLE',503)
      const providers=new Set(data.identities.map(item=>item.provider))
      return json({
        google:providers.has('google'),
        telegram:providers.has(TELEGRAM_OIDC_PROVIDER),
        telegramAvailable:telegramLoginEnabled(),
      })
    }
    if (joined === 'auth/link' && method === 'POST') {
      const actor=await auth.verified()
      if (request.headers.get('x-hh-account-id') !== actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      const body=await readBody(request,1024)
      onlyKeys(body,['provider','locale','confirm'])
      if (body.confirm !== true || !['google','telegram'].includes(body.provider))
        throw new AppError('IDENTITY_LINK_CONSENT_REQUIRED',400)
      const selected=oauthProvider(body.provider)
      if (!selected) throw new AppError('TELEGRAM_LOGIN_UNAVAILABLE',503)
      const {data:identities,error:readError}=await auth.client.auth.getUserIdentities()
      if (readError || !Array.isArray(identities?.identities))
        throw new AppError('IDENTITY_LIST_UNAVAILABLE',503)
      if (identities.identities.some(item=>item.provider===selected.provider))
        return json({alreadyLinked:true})
      await consumeRate(config,{
        op:'oauth-link',ip:request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown',
      },10,600)
      const locale=['ru','en','es'].includes(body.locale) ? body.locale : 'en'
      const {data,error}=await auth.client.auth.linkIdentity({
        provider:selected.provider,
        options:{
          scopes:selected.scopes,
          redirectTo:`${origin}/api/app/auth/callback?locale=${locale}&continue=cabinet&link=1`,
          skipBrowserRedirect:true,
        },
      })
      if (error || !data?.url || new URL(data.url).origin !== config.supabaseUrl)
        throw new AppError('IDENTITY_LINK_UNAVAILABLE',503)
      const response=json({redirectUrl:data.url})
      response.cookies.set(IDENTITY_LINK_COOKIE,createIdentityLinkProof(actor.id,selected.provider,config),{
        path:'/api/app/auth',maxAge:600,httpOnly:true,secure:!config.test,sameSite:'lax',
      })
      return response
    }

    // Business messages are not Auth sessions. The client explicitly requests
    // association AFTER Supabase verifies the official Telegram OIDC identity.
    if (joined === 'auth/telegram-business-link' && method === 'POST') {
      const actor=await auth.verified()
      if(request.headers.get('x-hh-account-id')!==actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      const body=await readBody(request,1024)
      onlyKeys(body,['reactivate'])
      if(body.reactivate!==undefined&&body.reactivate!==true)
        throw new AppError('INVALID_AUTOLINK_REQUEST',400)
      const {data,error}=await auth.client.auth.getUserIdentities()
      if(error||!verifiedTelegramSubject(data?.identities))
        throw new AppError('TELEGRAM_IDENTITY_REQUIRED',428)
      await consumeRate(config,{op:'telegram-business-cabinet-sync',account:actor.id},12,600)
      // A plain POST retries the automatic association; only an explicit
      // Resume action overrides a durable user opt-out.
      const result=await syncVerifiedTelegramBusinessEnquiries(
        config,actor,data.identities,{reactivate:body.reactivate===true})
      return json(result)
    }
    if (joined === 'auth/telegram-business-unlink' && method === 'POST') {
      const actor=await auth.verified()
      if(request.headers.get('x-hh-account-id')!==actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      const body=await readBody(request,1024)
      onlyKeys(body,[])
      const unlinked=await disableVerifiedTelegramBusinessSync(config,actor)
      return json({unlinked,disabled:true})
    }
    if (joined === 'auth/telegram-business-enquiries' && method === 'GET') {
      const actor=await auth.verified()
      if(request.headers.get('x-hh-account-id')!==actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      const enquiries=await transaction(config,actor,async db=>{
        const result=await db.query(
          "select distinct e.id,e.reference_code,e.service_title,e.locale,e.status,e.created_at "+
          "from app.public_service_enquiries e "+
          "join app_private.public_enquiry_contact_links l on l.enquiry_id=e.id "+
          "join app_private.crm_tg_business_service_sessions s on s.contact_id=l.contact_id "+
          "where s.account_id=$1 and l.evidence='verified_telegram_business_enquiry' "+
          "order by e.created_at desc,e.id desc limit 100",[actor.id])
        return result.rows.map(row=>({referenceCode:row.reference_code,
          serviceTitle:row.service_title,locale:row.locale,status:row.status,
          createdAt:row.created_at}))
      })
      return json({enquiries})
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
    if (joined === 'intelligence/plan' && method === 'POST') {
      const body = await readBody(request, 16384)
      const { planIntelligenceRequest } = await import('@/lib/holistic-support/intelligence-plan.mjs')
      const { loadMeditationDiscovery } = await import('@/lib/holistic-support/meditation-discovery-server')
      try {
        return json(await planIntelligenceRequest(body, { loadCatalog: loadMeditationDiscovery }))
      } catch (error) {
        if (error?.message === 'INVALID_INTELLIGENCE_REQUEST')
          throw new AppError('INVALID_INTELLIGENCE_REQUEST', 400)
        throw error
      }
    }
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
    if (joined === 'academy-energywork/verify-sharing' && method === 'POST') {
      const body = await readBody(request,512)
      onlyKeys(body,['reikiFlow'])
      if (expectedAccount !== actor.id ||
          !validReikiConsent(request.cookies?.get(REIKI_CONSENT_COOKIE)?.value,body.reikiFlow,actor.id,config))
        throw new AppError('COURSE_SHARING_LOGIN_EXPIRED',409)
      return json({verified:true})
    }
    if (joined === 'academy-energywork/photo') {
      if (request.headers.get('x-hh-account-id') && request.headers.get('x-hh-account-id') !== actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      if (method === 'GET') return json(await readReikiInitiationPhoto(config, actor))
      if (method === 'POST') {
        await consumeRate(config, {op:'reiki-photo-upload',actor:actor.id}, 6, 3600)
        const claimedBytes = Number(request.headers.get('content-length') || 0)
        if (claimedBytes > REIKI_INITIATION_PHOTO_MAX_BYTES + 8192)
          throw new AppError('INVALID_INITIATION_PHOTO', 413)
        const form = await request.formData()
        if (form.getAll('photo').length !== 1 || [...form.keys()].some(key => key !== 'photo'))
          throw new AppError('INVALID_INITIATION_PHOTO', 400)
        return json(await saveReikiInitiationPhoto(config, actor, form.get('photo')))
      }
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'academy-energywork') {
      if (request.headers.get('x-hh-account-id') && request.headers.get('x-hh-account-id') !== actor.id)
        throw new AppError('ACCOUNT_CHANGED',409)
      const energywork=createEnergyworkCourseRepository(config)
      if (method === 'GET') {
        const progress=await energywork.read(actor)
        return json({accountId:actor.id,...await recoverReikiBusinessLink(config,actor,auth,progress)})
      }
      if (method === 'POST') {
        const body = await readBody(request,32768)
        if ((body.messengerConsent === true || body.reikiFlow !== undefined || body.action === 'withdraw-sharing') && expectedAccount !== actor.id)
          throw new AppError('ACCOUNT_CHANGED',409)
        if (body.reikiFlow !== undefined) {
          if (body.action !== 'start' || body.consent !== true ||
              !validReikiConsent(request.cookies?.get(REIKI_CONSENT_COOKIE)?.value,body.reikiFlow,actor.id,config))
            throw new AppError('COURSE_SHARING_LOGIN_EXPIRED',409)
          delete body.reikiFlow
          body.teacherConsent = true
          body.messengerConsent = true
        }
        const progress=await energywork.command(actor,body)
        const view=['start','share'].includes(body.action)
          ?await recoverReikiBusinessLink(config,actor,auth,progress):progress
        const response=json({accountId:actor.id,...view})
        if (['start','delete','withdraw-sharing'].includes(body.action) && request.cookies?.get(REIKI_CONSENT_COOKIE)?.value)
          response.cookies.set(REIKI_CONSENT_COOKIE,'',reikiConsentCookieOptions(config,0))
        return response
      }
      throw new AppError('NOT_FOUND',404)
    }
    if (path[0] === 'course' && request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
    if (path[0] === 'course' && path.length === 2) {
      const daily = createDailyCourseRepository(config)
      const locale = new URL(request.url).searchParams.get('locale') === 'ru' ? 'ru' : 'en'
      if ((path[1] === 'today' || path[1] === 'progress') && method === 'GET')
        return json(await daily.read(actor, locale, new URL(request.url).searchParams.get('courseId'),
          new URL(request.url).searchParams.get('reviewDay')))
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
    if (joined === 'journey' && method === 'GET') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      return json(await readLearningJourney(config, actor))
    }
    if (joined === 'development-goals') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'GET') return json(await readDevelopmentGoals(config, actor))
      if (method === 'POST') return json(await saveDevelopmentGoals(config, actor, await readBody(request, 8192)))
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'personal-coaching-catalog') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'GET') return json(await readPersonalCoachingCatalog(config,actor))
      throw new AppError('NOT_FOUND',404)
    }
    // One conservative shared free-model budget across the two coaching paths.
    // The gateway invokes it only when an actual provider request is attempted.
    const reserveCoachingFreeCall=()=>consumeRate(config,
      {op:'coaching-openrouter-shared-daily'},40,86400)
    // Signed-in, stateless dialogue for the selected My Coach persona. Client
    // history is not stored; auth, same-origin protection and DB throttles apply.
    if (joined === 'my-coach/stream') {
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      await consumeRate(config,{op:'my-coach-generative-turn',actor:actor.id},40,3600)
      const stream=await myCoachGenerativeStreamTurn(await readBody(request,16384),
        {signal:request.signal,reserveModelCall:reserveCoachingFreeCall,config,actor})
      return new Response(stream,{status:200,headers:{
        ...PRIVATE_HEADERS,
        'Content-Type':'text/event-stream; charset=utf-8',
        'Cache-Control':'private, no-store, max-age=0',
        'X-Accel-Buffering':'no',
      }})
    }
    // An authenticated, one-use credential constrained to a single FREE
    // Gemini Live model, chosen fictional persona and allowed voice.
    // The browser never receives the permanent API key. The audio WebSocket
    // then goes straight to Google, avoiding a billable Vercel audio proxy.
    if (joined === 'my-coach/live-token') {
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      const vendor=geminiFreeLiveConfig(process.env)
      if (!vendor) throw new AppError('MY_COACH_GEMINI_LIVE_DISABLED',503)
      let start
      try{start=normalizeGeminiFreeLiveStart(await readBody(request,2048))}
      catch{throw new AppError('MY_COACH_GEMINI_LIVE_INVALID',400)}
      // Abuse control remains before Google, but a failed token mint must not
      // consume the real 2/hour, 4/day and 20/day successful-session quota.
      const liveQuota=geminiLiveTokenQuota(actor.id,{
        ownerTrial:practitionerEmailAllowed(actor),
      })
      await consumeRateBatch(config,liveQuota.attempts)
      let token
      try{token=await issueGeminiFreeLiveToken(vendor,start,{
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(12000)])})}
      catch(error){
        // Fixed allowlist only: NEVER log API key, token, URL, personal data,
        // request payload, upstream response body or a raw exception message.
        const reasons={
          GEMINI_LIVE_RATE_LIMIT:['MY_COACH_GEMINI_LIVE_RATE_LIMIT',429],
          GEMINI_LIVE_AUTH_FAILURE:['MY_COACH_GEMINI_LIVE_AUTH_FAILURE',503],
          GEMINI_LIVE_PROVIDER_BAD_REQUEST:['MY_COACH_GEMINI_LIVE_SETUP_REJECTED',503],
          GEMINI_LIVE_PROVIDER_MODEL_UNAVAILABLE:['MY_COACH_GEMINI_LIVE_MODEL_UNAVAILABLE',503],
          GEMINI_LIVE_PROVIDER_UNAVAILABLE:['MY_COACH_GEMINI_LIVE_PROVIDER_UNAVAILABLE',503],
          GEMINI_LIVE_TOKEN_INVALID:['MY_COACH_GEMINI_LIVE_BAD_TOKEN_REPLY',503],
        }
        const [safeCode,status]=reasons[error?.message]||
          ['MY_COACH_GEMINI_LIVE_UNAVAILABLE',503]
        console.warn('HH_MY_COACH_LIVE_TOKEN_FAILURE',safeCode)
        throw new AppError(safeCode,status)
      }
      // Three original delivered-token limits are an atomic DB commit. A
      // rejected rate dimension rolls back all of them; invalid Google
      // setup/auth/outage (G-L1..G-L7) never reaches this point.
      await consumeRateBatch(config,liveQuota.successful)
      return json(token)
    }
    // Server-only evidence checkpoint for the transcript of a Free Live call.
    // Absolutely no second Google model call, persistence or client history log.
    if (joined === 'my-coach/live-checkpoint') {
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      if (!geminiFreeLiveConfig(process.env))throw new AppError('MY_COACH_GEMINI_LIVE_DISABLED',503)
      await consumeRate(config,{op:'my-coach-live-evidence-hour',actor:actor.id},65,3600)
      let progress
      try{progress=geminiFreeLiveCheckpoint(await readBody(request,8192))}
      catch{throw new AppError('MY_COACH_GEMINI_LIVE_INVALID',400)}
      return json(progress)
    }
    // Metadata-only check: no client transcript, API key or test generation.
    if (joined === 'my-coach/engines') {
      if (method !== 'GET') throw new AppError('NOT_FOUND',404)
      return json({schema:'HH_MY_COACH_ENGINES_V1',
        gemini_free:Boolean(geminiCoachTextConfig(process.env,'gemini_free')),
        gemini_paid:Boolean(geminiCoachTextConfig(process.env,'gemini_paid')),
        gemini_tts_free:Boolean(geminiCoachTtsConfig(process.env,'gemini_tts_free')),
        gemini_tts_paid:Boolean(geminiCoachTtsConfig(process.env,'gemini_tts_paid')),
        gemini_live_free:Boolean(geminiFreeLiveConfig(process.env)),
        gemini_live_reason:geminiFreeLiveUnavailableReason(process.env),
        live:false})
    }
    if (joined === 'my-coach/turn') {
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      await consumeRate(config,{op:'my-coach-generative-turn',actor:actor.id},40,3600)
      const body=await readBody(request,16384)
      const geminiMode=['gemini_free','gemini_paid'].includes(body?.engine)?body.engine:null
      // Per-user + global limits are consumed BEFORE a model request. No
      // chargeable second provider call or automatic upgrade on error.
      const reserveGeminiCall=async()=>{
        await consumeRate(config,{op:'my-coach-'+geminiMode+'-global-day'},
          geminiMode==='gemini_paid'?12:30,86400)
        await consumeRate(config,{op:'my-coach-'+geminiMode+'-actor-day',actor:actor.id},
          geminiMode==='gemini_paid'?6:16,86400)
      }
      return json(await myCoachGenerativeTurn(body,
        {signal:request.signal,reserveModelCall:geminiMode?reserveGeminiCall:reserveCoachingFreeCall,
          config,actor}))
    }
    // A synthetic preflight proves verified ZDR free-model access before any
    // visitor text can reach a provider. The call is authenticated and bounded.
    if (joined === 'my-coach/probe') {
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      await consumeRate(config,{op:'my-coach-generative-probe',actor:actor.id},12,3600)
      onlyKeys(await readBody(request,512),[])
      return json(await myCoachGenerativeProbe({
        signal:request.signal,reserveModelCall:reserveCoachingFreeCall
      }))
    }
    if (joined === 'personal-coaching/brain-probe') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      await consumeRate(config, {op:'coaching-brain-probe',actor:actor.id},3,3600)
      return json(await personalCoachingBrainProbe(config,actor,
        await readBody(request,512),{signal:request.signal,reserveModelCall:reserveCoachingFreeCall}))
    }
    if (joined === 'personal-coaching/brain') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method !== 'POST') throw new AppError('NOT_FOUND', 404)
      await consumeRate(config, {op:'coaching-brain-turn', actor:actor.id}, 40, 3600)
      return json(await personalCoachingBrainTurn(config,actor,
        await readBody(request,16384),{signal:request.signal,reserveModelCall:reserveCoachingFreeCall}))
    }
    if (joined === 'personal-coaching') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'GET') return json(await readPersonalCoaching(config, actor))
      if (method === 'POST') return json(await savePersonalCoaching(config, actor, await readBody(request, 8192)))
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'personal-coaching-report') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'POST') return json(await readCoachingReportDraft(config,actor,await readBody(request,2048)))
      throw new AppError('NOT_FOUND',404)
    }
    if (path[0] === 'personal-coaching-reports') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
      if (path.length===1 && method==='GET') return json(await listCoachingReports(config,actor))
      if (path.length===1 && method==='POST') return json(await saveCoachingReport(config,actor,await readBody(request,4096)))
      if (path.length===2 && method==='GET') return json(await readCoachingReport(config,actor,path[1]))
      if (path.length===3 && path[2]==='memory-candidates' && method==='GET') {
        await consumeRate(config,{op:'coaching-memory-review',actor:actor.id},60,3600)
        const {report}=await readCoachingReport(config,actor,path[1])
        return json({candidates:reviewedReportMemoryCandidates(report)})
      }
      if (path.length===3 && path[2]==='delete' && method==='POST') return json(await deleteCoachingReport(config,actor,path[1],await readBody(request,1024)))
      throw new AppError('NOT_FOUND',404)
    }
    if (joined === 'coaching-context/session') {
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
      await consumeRate(config,{op:'coaching-context-session',actor:actor.id},30,3600)
      return json(issueCoachContextSession(config,actor))
    }
    if (joined === 'coaching-context/consent') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
      if (method === 'GET') return json(await coachContextConsentOptions(config,actor))
      if (method !== 'POST') throw new AppError('NOT_FOUND',404)
      await consumeRate(config,{op:'coaching-context-consent',actor:actor.id},60,3600)
      const body=await readBody(request,2048)
      if (body?.operation === 'options' && typeof body.contextSessionToken === 'string')
        return json(await coachContextConsentOptions(config,actor,process.env,body.contextSessionToken))
      return json(await manageCoachContextConsent(config,actor,body))
    }
    if (path[0] === 'coaching-life-plan') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
      if (path.length===1 && method==='GET') {
        const locale=new URL(request.url).searchParams.get('locale')||'en'
        return json(await readCoachingLifePlan(config,actor,{locale}))
      }
      if (path.length===3 && path[1]==='areas' && method==='POST') {
        return json(await updateCoachingLifePlanArea(config,actor,{...await readBody(request,8192),areaKey:path[2]}))
      }
      if (path.length===2 && path[1]==='import' && method==='POST') {
        return json(await importCoachingReportActions(config,actor,await readBody(request,2048)))
      }
      if (path.length===2 && path[1]==='revoke-context' && method==='POST') {
        return json(await revokeCoachingPlanContext(config,actor,await readBody(request,1024)))
      }
      if (path.length===4 && path[1]==='actions' && path[3]==='delete' && method==='POST') {
        return json(await deleteCoachingPlanAction(config,actor,path[2],await readBody(request,1024)))
      }
      throw new AppError('NOT_FOUND',404)
    }
    if (path[0] === 'business-context') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
      if (path.length===1 && method==='GET') return json(await readBusinessContext(config,actor))
      if (path.length===2 && path[1]==='plaud-import' && method==='POST') return json(await importPlaudBusinessContext(config,actor,await readBody(request,131072)));
      if (path.length===2 && path[1]==='review' && method==='POST') return json(await reviewBusinessInsight(config,actor,await readBody(request,1024)));
      throw new AppError('NOT_FOUND',404)
    }
    if (joined === 'tradition-coaching-summary') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'GET') return json(await readTraditionCoachingSummaries(config, actor))
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'tradition-coaching') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      const template = new URL(request.url).searchParams.get('template')
      if (method === 'GET') return json(await readTraditionCoaching(config, actor, template))
      if (method === 'POST') return json(await saveTraditionCoaching(config, actor, template, await readBody(request, 8192)))
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'tradition-coaching-audio') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method !== 'GET') throw new AppError('NOT_FOUND', 404)
      const params = new URL(request.url).searchParams
      return json(await learnerCoachingAudio(config,
        params.get('template'), params.get('question'), params.get('locale')))
    }
    if (joined === 'business-coaching') {
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (method === 'GET') return json(await readBusinessCoaching(config, actor))
      if (method === 'POST') return json(await saveBusinessCoaching(config, actor, await readBody(request, 32768)))
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'coaching-intake') {
      // Never create CRM contacts, messages, bookings or practitioner access by saving a draft.
      if (method === 'GET') return json(await readCoachingIntake(config, actor))
      if (method === 'POST') {
        if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
        await consumeRate(config, { op: 'coaching-intake-save', actor: actor.id }, 20, 3600)
        return json(await saveCoachingIntake(config, actor, await readBody(request, 40000)))
      }
      throw new AppError('NOT_FOUND', 404)
    }
    if (joined === 'video-affirmation-focus' && method === 'GET') {
      // Verifies Supabase identity and owner-scope before reading private results.
      // No raw answers, scores or clinical notes are sent to the video editor.
      const data = await repo.bootstrap(actor, { view: 'portrait' })
      return json(videoProfileFocus(buildPsychPortrait(data.results)))
    }
    if (joined === 'bootstrap' && method === 'GET') {
      // A reduced initial payload is safe only after the normal verified session,
      // account check and private rate limit above. Other tabs stay unchanged.
      const requestedView = new URL(request.url).searchParams.get('view')
      const view = requestedView === 'portrait' || requestedView === 'practice' ? requestedView : 'full'
      const data=await repo.bootstrap(actor, { view })
      const retryCookie=request.cookies?.get(REIKI_RETRY_COOKIE)?.value
      const retryLocale=retryCookie?verifyReikiRetryProof(actor,retryCookie,config):null
      let clearRetry=Boolean(retryCookie&&!retryLocale)
      if(retryLocale){
        try{
          await syncReikiRegistration(config,actor,auth.client,retryLocale)
          clearRetry=true
        }catch{console.error('HH_REIKI_CRM_REGISTRATION_RETRY')}
      }
      const response=json(data)
      if(clearRetry)response.cookies.set(REIKI_RETRY_COOKIE,'',{
        path:'/api/app',maxAge:0,httpOnly:true,secure:!config.test,sameSite:'lax',
      })
      return response
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
      if (!await issueTrustedAdminSession(response, { actor, secure: !config.test }))
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
    if (joined === 'express-reports' && method === 'GET')
      return json(await createExpressReportRepository(config).listForClient(actor))
    if (joined === 'practice/express-reports' && method === 'GET') {
      await practiceRepo.requireActivated(actor)
      return json(await createExpressReportRepository(config).listForPractitioner(actor))
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
      return json({ ...workspace, newServices, freeExpressV2Enabled: process.env.HH_FREE_EXPRESS_V2_ENABLED === 'true' })
    }
    if (joined === 'practice/alias' && method === 'GET') {
      await consumeRate(config,{op:'practitioner-alias-check',account:actor.id},30,3600)
      return json(await practiceRepo.checkPublicAlias(actor,new URL(request.url).searchParams.get('alias')))
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
      exported.personalCoaching = await readPersonalCoaching(config, actor)
      exported.coachingReports = (await exportCoachingReports(config, actor)).reports
      exported.coachingLifePlan = await exportCoachingLifePlan(config, actor)
      exported.egyptianCoaching = await readTraditionCoaching(config, actor, 'hh-egyptian-goal-planning-v1')
      exported.greekCoaching = await readTraditionCoaching(config, actor, 'hh-greek-goal-planning-v1')
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
    if (joined === 'practice/alias') {
      await consumeRate(config,{op:'practitioner-alias-save',account:actor.id},5,3600)
      return json(await practiceRepo.savePublicAlias(actor,body))
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
    if (joined === 'requests') {
      const result=await repo.createRequest(actor,body)
      if(result.bookingNotice===true)
        notifyBookingParticipants(config,actor,result.id,'master',{
          event:'new',revision:result.revision,practitionerId:result.practitionerId,
          messageId:result.bookingMessageId,
        })
      if(result.enquiryNotice===true)
        notifyBookingParticipants(config,actor,result.id,'master',{
          event:'enquiry',practitionerId:result.practitionerId,
          messageId:result.enquiryMessageId,
        })
      delete result.bookingNotice
      delete result.bookingMessageId
      delete result.enquiryNotice
      delete result.enquiryMessageId
      return json(result,201)
    }
    if (path[0] === 'requests' && path.length === 2) {
      const result=await repo.updateRequest(actor,path[1],body)
      if(result.bookingNotice===true)
        notifyBookingParticipants(config,actor,path[1],'master',{
          event:'update',revision:result.revision,practitionerId:result.practitionerId,
        })
      delete result.bookingNotice
      return json(result)
    }
    // Keep onboarding and own profile/service drafts available during signup.
    // All other master tools require a submitted profile and first offering.
    if (path[0] === 'practice' && !['onboarding','profile','services','video-upload'].includes(path[1]))
      await practiceRepo.requireActivated(actor)
    if (path[0] === 'practice' && path[1] === 'express-reports') {
      await consumeRate(config,{op:'express-report-write',actor:actor.id},18,3600)
      const reports = createExpressReportRepository(config)
      if (path.length === 2) return json(await reports.create(actor,body),201)
      if (path.length === 3) {
        requireUUID(path[2])
        if (body.action === 'publish' || body.action === 'send' || body.action === 'revoke') {
          const result = await reports.changeStatus(actor,path[2],body)
          if (result.dispatchRequested === true) {
            const reportId = result.report.id
            after(async () => {
              try { await dispatchExpressReportTelegramNotice(config,reportId) }
              catch { console.error('HH_EXPRESS_REPORT_TG_DISPATCH_FAILED') }
            })
          }
          delete result.dispatchRequested
          return json(result)
        }
        return json(await reports.edit(actor,path[2],body))
      }
      throw new AppError('NOT_FOUND',404)
    }
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
    if (path[0] === 'practice' && path[1] === 'requests' && path.length === 3) {
      const result=await practiceRepo.updateMyRequest(actor,path[2],body)
      if(result.bookingNotice===true)notifyBookingParticipants(config,actor,path[2],'client')
      delete result.bookingNotice
      return json(result)
    }
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

