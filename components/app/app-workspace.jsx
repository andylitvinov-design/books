'use client'
import { TraumaFrontMatter, TraumaSectionInstructions } from './trauma-administration'
import { hasTraumaAdministration, traumaContextReady } from '@/lib/assessments/trauma-administration'
import { canAutoContinueSave, savedResourcePath } from '@/lib/app/client-handoff'
import {consumeSessionSaveTarget} from '@/lib/app/session-exit-navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './saved-document-reader.css'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Activity, BarChart3, BookOpen, Brain, ClipboardList, Compass, ChevronDown, FileText, Heart, House, Leaf, Moon, Smile, SlidersHorizontal, Sparkles, ShieldCheck, Sun, Target, Users, UserRound, Zap } from 'lucide-react'
import Link from 'next/link'
import PracticeRequestConversation from './practice-request-conversation'
import { useRouter, useSearchParams } from 'next/navigation'
import { COPY, labelFor, explanationFor } from './copy'
import { getAssessmentDefinition, getDefinitionById } from '@/lib/assessments/definitions'
import { compareResults, seriesFor, chronological } from '@/lib/profile/history'
import { assessmentHistoryGroups, assessmentHistoryTitle, nextPersonalRecommendation, resultChangeSummary } from '@/lib/assessments/personal-guidance'
import { profileCompletionRecommendations } from '@/lib/profile/summary'
import { profileScreeningPresentation } from '@/lib/profile/profile-scale-presentation'
import { AssessmentReading } from '@/components/assessment-reading'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { ClientReportActions } from '@/components/app/client-report-actions'
import { PersonalResultReport } from '@/components/app/personal-result-report'
import { Asrs6SourceNotice, Asrs6ChoiceMarker, asrs6ChoiceClass } from '@/components/app/asrs6-source-notice'
import { ScoreGauge, ScoreTrend } from '@/components/app/assessment-gauge'
import { TestDynamics } from '@/components/app/test-dynamics'
import { periodComparison } from '@/lib/assessments/dashboard-gauges'
import { TestFinishActions } from '@/components/app/test-finish-actions'
import { TestRatingCard } from '@/components/app/test-rating-card'
import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import { ProfileAssessmentOverview } from '@/components/app/profile-assessment-overview'
import { TestExplorerVisual } from '@/components/app/test-explorer-visual'
import { buildExplorerEntries, coverageForFocus } from '@/lib/assessments/test-explorer'
import { HOME_TEST_TOPICS, INSIGHTS_TEST_CATEGORIES, buildInsightsCategorySections } from '@/lib/assessments/insights-categories'
import { buildInsightsSummary } from '@/lib/assessments/insights-summary'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { PortraitRecommendations } from '@/components/app/portrait-recommendations'
import { MONITORING_CATALOG, monitoringCatalogItem } from '@/data/assessments/catalog'
import { assessmentMethodology } from '@/lib/assessments/assessment-methodology'
import {
  TEST_LENGTH_FILTERS,
  TEST_RECOMMENDATION_FOCUS,
  TEST_STYLE_FILTERS,
  rankAssessmentDefinitions,
} from '@/lib/assessments/test-recommendations'
import { SAFETY_COPY } from '@/lib/assessments/safety'
import { SubscriptionProvider, SubscriptionSettings, useSubscription } from '@/components/app/subscription-access'
import CommunicationPreferences from '@/components/app/communication-preferences'
import NotificationSettings from '@/components/app/notification-settings'
import MessengerNotificationSettings from '@/components/app/messenger-notification-settings'
import InstallHolisticHouse from '@/components/app/install-holistic-house'
import { isNativePsiAlchemy, isNativeHolisticHouse } from '@/lib/native/client'
import courseQuizStyles from './course-quiz.module.css'
import Course14DayOverview from '@/components/app/course-14-day-overview'
import CourseGuestLanding from '@/components/app/course-guest-landing'
import CabinetGuestOverview from '@/components/app/cabinet-guest-overview'
import { DownloadPractitionerReport, PersonalAnalysisPanel } from '@/components/app/personal-analysis-panel'
import { formatReportDate, getPortraitNextStep, latestCompatibleChange, reportTimeline } from '@/lib/app/cabinet-ux'

import { appFetch } from '@/lib/app/client-fetch'
import { REMOTE_SUPPORT_DRAFT_KEY, readRemoteSupportDraft, formatRemoteSupportDraft } from '@/lib/practitioners/remote-energy-support'
import { coursePendingKeys, isCourseTest, startOrResumeCourseTest } from '@/lib/app/course-test-flow'
export { appFetch }

// The Cabinet shares one catch-all route, but its tabs have independent large
// feature trees. Load only the active tab rather than hydrating every feature
// (courses, tests, practice, and personal reports) on the first visit.
const PsiMonitoring = dynamic(() => import('@/components/app/psi-monitoring'))
const AccountTestBattery = dynamic(() => import('@/components/app/account-test-battery').then(module => module.AccountTestBattery))
const ProfileDomains = dynamic(() => import('@/components/app/profile-domains').then(module => module.ProfileDomains))
const DevelopmentProgram = dynamic(() => import('@/components/app/development-program'), { ssr: false })
const MyCourse = dynamic(() => import('@/components/app/my-course'))
const BusinessCoaching = dynamic(() => import('@/components/app/business-coaching'), { ssr: false })
const PracticeWorkspace = dynamic(() => import('@/components/app/practice-workspace'))

function message(error, c) {
  return error?.code === 'REVISION_CONFLICT' || error?.code === 'CONFLICT'
    ? c.conflict
    : error?.code === 'RECENT_SIGN_IN_REQUIRED'
      ? c.reauth
      : error?.code === 'NOT_FOUND'
        ? c.notFound
        : c.error
}
function dateLabel(value, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
function shortDateLabel(value, locale) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
}
function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
function goSignedOut(setData) {
  setData(null)
  try {
    const channel = new BroadcastChannel('hh-app-session')
    channel.postMessage('signed-out')
    channel.close()
  } catch {
    /* No persistent browser fallback. */
  }
}
export default function AppWorkspace({ locale, path = [] }) {
  const c = COPY[locale],
    router = useRouter(),
    searchParams = useSearchParams(),
    [data, setData] = useState(null),
    [state, setState] = useState('loading'),
    [error, setError] = useState(null)
  const [busy, setBusy] = useState(false),
    [deleted, setDeleted] = useState(false)
  const quickAuthAttempted = useRef(false)
  const signinAttempted = useRef(false)
  const page = path[0] || 'portrait',
    recordId = path[1],
    root = `/${locale}/app`
  const retestLifetime = useRef({ mounted: false, epoch: 0 })
  const retestScope = useRef(null)
  retestScope.current = { accountId: data?.account?.id, page, recordId,
    courseId: searchParams.get('courseId'), cycleId: searchParams.get('cycleId'), courseMode: searchParams.get('course') }
  useEffect(() => {
    const lifetime = retestLifetime.current
    lifetime.mounted = true; lifetime.epoch += 1
    return () => { lifetime.mounted = false; lifetime.epoch += 1 }
  }, [])
  const stressSignup = page === 'course' && searchParams.get('program') === 'stress'
  // Tab changes can race an earlier bootstrap; never show a stale account snapshot.
  const loadEpoch = useRef(0)
  const load = useCallback(async () => {
    const epoch = ++loadEpoch.current
    setError(null)
    try {
      const fresh = await appFetch(page === 'portrait' ? 'bootstrap?view=portrait' : 'bootstrap')
      if (epoch !== loadEpoch.current) return
      setData(fresh)
      setState('ready')
    } catch (e) {
      if (epoch !== loadEpoch.current) return
      setData(null)
      setError(e)
      setState(
        e.status === 401
          ? 'signed-out'
          : e.code === 'DELETION_REQUESTED'
            ? 'deletion'
            : e.code === 'APP_UNAVAILABLE'
              ? 'unavailable'
              : 'error',
      )
    }
  }, [page])
  useEffect(() => {
    setState('loading')
    void load()
    return () => { loadEpoch.current += 1 }
  }, [load])
  useEffect(() => {
    let channel
    try {
      channel = new BroadcastChannel('hh-app-session')
      channel.onmessage = (e) => {
        if (e.data === 'signed-out') {
          retestLifetime.current.epoch += 1
          setData(null)
          setState('signed-out')
          router.refresh()
        }
      }
    } catch {
      /* No browser storage fallback. */
    }
    const restore = (e) => {
        if (e.persisted) {
          setData(null)
          setState('loading')
          load()
        }
      },
      hide = () => {
        retestLifetime.current.epoch += 1
        setData(null)
        setState('loading')
      }
    window.addEventListener('pageshow', restore)
    window.addEventListener('pagehide', hide)
    return () => {
      channel?.close()
      window.removeEventListener('pageshow', restore)
      window.removeEventListener('pagehide', hide)
    }
  }, [load, router])
  async function signin() {
    signinAttempted.current = true
    setBusy(true)
    setError(null)
    try {
      const native = isNativeHolisticHouse()
      const result = await appFetch('auth/start', {
        locale,
        ...(native ? { native: true } : {}),
        serviceId: searchParams.get('service') || null,
        ...(page === 'tests' && searchParams.get('selection') === 'pending' ? { continueTo: 'tests' } : {}),
        ...(page === 'course' ? { continueTo: 'course', ...(['stress','confidence','focus'].includes(searchParams.get('program')) ? { program: searchParams.get('program') } : {}) } : {}),
        ...(page === 'business' ? { continueTo: 'business' } : {}),
        ...(page === 'consultations' && searchParams.get('request')
          ? { continueTo: 'consultations', requestId: searchParams.get('request') } : {}),
      })
      if (native) {
        // Google OAuth uses Chrome Custom Tabs / Safari View Controller,
        // not the app's credential-readable embedded WebView.
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: result.redirectUrl })
        setBusy(false)
      } else window.location.assign(result.redirectUrl)
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }
  // The user already opted to enter OPORA by clicking the sitewide
  // Start free CTA. Open existing OAuth once without requiring another
  // intermediate guest marketing screen. Authentication itself remains real.
  useEffect(() => {
    if (state === 'signed-out' && stressSignup &&
        searchParams.get('entry') === 'quick' && !quickAuthAttempted.current) {
      quickAuthAttempted.current = true
      void signin()
    }
  // The auth request is intentionally single-shot. On an error the visible
  // guest screen retains its ordinary retry button, not a redirect loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stressSignup, searchParams])

  async function logout(allDevices = false) {
    setBusy(true)
    try {
      // End account-bound Live Activities before clearing the verified session.
      if (isNativePsiAlchemy()) {
        try {
          const { Capacitor, registerPlugin } = await import('@capacitor/core')
          if (Capacitor.getPlatform() === 'ios') {
            await appFetch('notifications/live-stop', { activityId: null }, 'POST', { accountId: data.account.id })
            await registerPlugin('HHCourseActivity').stop({})
          }
        } catch { /* Sign-out must still complete even if iOS is offline. */ }
      }
      // An installed device must not remain subscribed to a previous account
      // after sign-out or account switching. Keep failures non-blocking.
      try {
        const registration = 'serviceWorker' in navigator
          ? await navigator.serviceWorker.getRegistration('/') : null
        const subscription = await registration?.pushManager?.getSubscription()
        if (subscription) {
          await appFetch('notifications/unsubscribe', { endpoint: subscription.endpoint },
            'POST', { accountId: data.account.id })
          await subscription.unsubscribe()
        }
      } catch { /* Do not block sign-out for an unavailable push service. */ }
      await appFetch('auth/logout', { allDevices })
    } catch (e) {
      setError(e)
    } finally {
      goSignedOut(setData)
      setState('signed-out')
      setBusy(false)
      router.replace(root)
    }
  }
  const renderedRetestScope = retestScope.current, renderedRetestEpoch = retestLifetime.current.epoch
  async function returnFromFinalRetest(completed = false) {
    const scope = renderedRetestScope, epoch = renderedRetestEpoch
    const isCurrent = () => retestLifetime.current.mounted && retestLifetime.current.epoch === epoch &&
      Object.keys(scope).every(key => retestScope.current?.[key] === scope[key])
    if (!scope.accountId || !scope.courseId || !scope.cycleId || !isCurrent()) return
    const today = await appFetch('course/today?locale=' + encodeURIComponent(locale) + '&courseId=' + encodeURIComponent(scope.courseId),
      undefined, undefined, { accountId: scope.accountId })
    if (!isCurrent() || today?.courseId !== scope.courseId || today?.cycle?.id !== scope.cycleId || today.readOnly) return
    const fresh = await appFetch('bootstrap', undefined, undefined, { accountId: scope.accountId })
    if (!isCurrent() || fresh?.account?.id !== scope.accountId) return
    setData(fresh); setState('ready')
    router.push(root + '/course?courseId=' + encodeURIComponent(scope.courseId) + (completed ? '&retest=updated' : ''))
  }
  async function continueCoursePlan(result) {
    const scope = renderedRetestScope, epoch = renderedRetestEpoch
    const isCurrent = () => retestLifetime.current.mounted && retestLifetime.current.epoch === epoch &&
      Object.keys(scope).every(key => retestScope.current?.[key] === scope[key])
    if (!scope.accountId || scope.courseMode !== '1' || !isCurrent() ||
        (scope.recordId && result.runId !== scope.recordId)) return
    const request = async (path, body, method) => {
      if (!isCurrent()) throw new Error('COURSE_SELECTION_CHANGED')
      const response = await appFetch(path, body, method, { accountId: scope.accountId })
      if (!isCurrent() || (path === 'bootstrap' && response?.account?.id !== scope.accountId))
        throw new Error('COURSE_SELECTION_CHANGED')
      return response
    }
    const refreshCourseOwner = async () => {
      const fresh = await request('bootstrap')
      if (!isCurrent()) return
      setData(fresh); setState('ready')
    }
    try {
      const requestedCourseId = scope.courseId
      const courseState = await request('course' + (requestedCourseId ? '?courseId=' + encodeURIComponent(requestedCourseId) : ''))
      if (requestedCourseId && courseState.course?.id !== requestedCourseId) return
      const courseQuery = courseState.course?.id ? '&courseId=' + encodeURIComponent(courseState.course.id) : ''
      // Validate membership against the server-owned confirmed set, not only
      // the URL. Normal non-course tests still use their original result flow.
      if (isCourseTest(courseState, result.definitionKey)) {
        // A course owns its NEXT-test choice, but a completed test must still
        // count in the ordinary account-wide selection. Sync that ledger
        // independently; stale plan revisions never block course progression.
        try {
          const snapshot = await request('bootstrap')
          const active = snapshot.activeTestPlan
          if (active?.status === 'active' && active.definitionIds?.includes(result.definitionId)) {
            const plan = await request('test-plans/' + encodeURIComponent(active.id))
            await request('test-plans/' + encodeURIComponent(active.id) + '/advance', {
              completedRunId: result.runId,
              expectedRevision: plan.revision,
            })
          }
        } catch (error) {
          if (error.message === 'COURSE_SELECTION_CHANGED') throw error
          // The saved result and authoritative course state remain intact.
        }
        if (!isCurrent()) return
        const nextKey = coursePendingKeys(courseState)[0]
        if (nextKey) {
          const nextRun = await startOrResumeCourseTest({
            courseState, key: nextKey, locale, request,
          })
          await refreshCourseOwner()
          if (!isCurrent()) return
          // The approved OPORA starter battery stays in quick mode between
          // all three check-ins. Other course batteries keep guided mode.
          const oporaStarter=['hh-weekly-pulse','gad-7','hh-resource-pulse']
          const isOporaStarter=oporaStarter.every(key=>courseState.course?.testKeys?.includes(key))
          const nextMode=isOporaStarter&&oporaStarter.includes(nextKey)?'quick':'guided'
          router.push(root + '/runs/' + encodeURIComponent(nextRun.id) + '?mode=' + nextMode + '&course=1' + courseQuery)
        } else {
          await refreshCourseOwner()
          if (!isCurrent()) return
          router.push(root + '/course?tests=complete' + courseQuery)
        }
        return
      }
      await refreshCourseOwner()
      if (!isCurrent()) return
      router.push(root + '/results/' + encodeURIComponent(result.id))
    } catch (error) {
      if (isCurrent()) throw error
    }
  }
  async function completePlan(result, destination = 'report') {
    if (searchParams.get('course') === 'retest') {
      await returnFromFinalRetest(true)
      return
    }
    if (searchParams.get('course') === '1') {
      await continueCoursePlan(result)
      return
    }
    const planId = searchParams.get('plan')
    let advanced = null
    if (planId) {
      const plan = await appFetch('test-plans/' + encodeURIComponent(planId))
      advanced = plan.completedRunIds?.includes(result.runId) ? plan : await appFetch('test-plans/' + encodeURIComponent(planId) + '/advance', {
        completedRunId: result.runId,
        expectedRevision: plan.revision,
      })
    }
    // Reporting always opens the actual persisted result, even for the last
    // assessment in a selected battery. Navigation never loses its result.
    if (destination !== 'next') {
      await load()
      router.push(root + '/results/' + encodeURIComponent(result.id) +
        (planId ? '?plan=' + encodeURIComponent(planId) : ''))
      return
    }
    if (advanced?.status === 'active' && advanced.definitionIds?.[advanced.currentIndex]) {
      const nextDefinition = getDefinitionById(advanced.definitionIds[advanced.currentIndex])
      const snapshot = await appFetch('bootstrap')
      const existing = (snapshot.runs || []).find(candidate =>
        candidate.definitionId === nextDefinition.id &&
        ['draft', 'in_progress'].includes(candidate.status))
      const nextRun = existing || await appFetch('runs', {
        definitionKey: nextDefinition.key,
        definitionVersion: nextDefinition.version,
        instrumentLocale: nextDefinition.instrumentLocale,
        operationId: crypto.randomUUID(),
      })
      await load()
      router.push(root + '/runs/' + encodeURIComponent(nextRun.id) +
        '?mode=quick&plan=' + encodeURIComponent(planId))
      return
    }
    await load()
    router.push(advanced?.status === 'completed'
      ? root + '/tests?plan=' + encodeURIComponent(planId) + '&summary=1'
      : root + '/tests?filter=remaining')
  }
  if (deleted || state === 'deletion')
    return (
      <main className="hh-app">
        <section className="hh-panel">
          <p className="hh-kicker">Holistic House</p>
          <h1>{c.deletion}</h1>
          <p role="status">{c.deletionReceived}</p>
          <a href={`/${locale}/client`}>{c.legacy}</a>
        </section>
      </main>
    )
  if (state === 'loading')
    return (
      <main className="hh-app" aria-busy="true">
        <p className="hh-kicker">Holistic House</p>
        <h1>{c.loading}</h1>
      </main>
    )
  if (state === 'ready' && !data)
    return (
      <main className="hh-app" aria-busy="true">
        <p className="hh-kicker">Holistic House</p>
        <h1>{c.loading}</h1>
      </main>
    )
  if (state !== 'ready' && page === 'course' && state !== 'unavailable')
    return (
      <main className="hh-app hh-app--course-guest">
        <CourseGuestLanding locale={locale} onStart={signin} busy={busy} stressSignup={stressSignup} compact
          errorMessage={error ? message(error, c) : undefined}
          onRetry={state === 'error' ? load : undefined}
          legacyText={c.legacy} nonDiagnostic={c.nonDiagnostic} />
      </main>
    )
  // Public Cabinet entry explains the personal and practitioner spaces only to
  // signed-out visitors. Authenticated accounts keep their existing workspace.
  // Course/test deep links retain the dedicated Google handoff flows above.
  if (state !== 'ready' && page === 'portrait' && !stressSignup)
    return (
      <main className="hh-app hh-app--cabinet-guest">
        <CabinetGuestOverview
          locale={locale} busy={busy} onSignin={signin}
          unavailable={state === 'unavailable'}
          onRetry={state === 'error' ? load : undefined}
          sessionNotice={state === 'error'}
          errorMessage={signinAttempted.current && error ? message(error, c) : undefined}
        />
      </main>
    )
  if (state !== 'ready')
    return (
      <main className="hh-app">
        <section className="hh-entry hh-panel">
          <p className="hh-kicker">Holistic House · {c.portrait}</p>
          <h1>{state === 'unavailable' ? c.unavailable : stressSignup
            ? (locale === 'ru' ? 'ОПОРА — Антистресс: сначала тесты' : 'OPORA Stress Relief: assessments first')
            : page === 'course'
              ? (locale === 'ru' ? 'Личный курс на 14 дней' : 'Your personal 14-day course') : c.welcome}</h1>
          <p>{state === 'unavailable' ? c.unavailableText : stressSignup
            ? (locale === 'ru'
              ? 'После входа: основной исходный HH Weekly Pulse (8 вопросов) до урока 1, дополнительные GAD-7 и Resource Pulse — по желанию. Уже пройденный совместимый результат учитывается.'
              : 'After sign-in: complete HH Weekly Pulse (8 questions) before lesson 1. GAD-7 and Resource Pulse are optional; recent compatible results count.')
            : page === 'course'
              ? (locale === 'ru' ? 'Узнайте план курса до входа в кабинет. Вы сами выбираете темы, тесты и ежедневные практики.'
                : 'Explore the course plan before signing in. You choose the focus, tests and daily practices.') : c.intro}</p>
          <p className="hh-muted">{c.private}</p>
          {state !== 'unavailable' && (
            <button className="hh-primary" onClick={signin} disabled={busy}>
              {stressSignup ? (locale === 'ru' ? 'Войти и перейти к стартовым тестам' : 'Sign in to start the assessments') : c.signin}
            </button>
          )}
          {page === 'course' && (stressSignup
            ? <Course14DayOverview locale={locale} programId="stress" compact />
            : <Course14DayOverview locale={locale} compact />)}
          {state === 'error' && <button onClick={load}>{c.retry}</button>}
          {error && state !== 'signed-out' && state !== 'unavailable' && (
            <p role="alert">{message(error, c)}</p>
          )}
          <a className="hh-text-link" href={`/${locale}/client`}>
            {c.legacy}
          </a>
          <p className="hh-fine">{c.nonDiagnostic}</p>
        </section>
      </main>
    )
  // Shared private navigation for desktop, mobile and the Account dropdown.
// Reports reuses the existing Insights/portfolio screen; Practice is the master cabinet.
  const nav = [
    { id: 'portrait', label: locale === 'ru' ? 'Профиль' : 'Profile', href: root + '/portrait', icon: UserRound },
    { id: 'tests', label: locale === 'ru' ? 'Тесты' : 'Tests', href: root + '/tests', icon: ClipboardList },
    { id: 'portfolio', label: locale === 'ru' ? 'Отчёты' : 'Reports', href: root + '/portfolio', icon: BarChart3 },
    { id: 'course', label: locale === 'ru' ? 'Курсы' : 'Courses', href: root + '/course?view=courses', icon: BookOpen },
    { id: 'practice', label: locale === 'ru' ? 'Практика' : 'Practice', href: root + '/practice', icon: Users },
  ]
  const navIsActive = (id) => page === id ||
    (id === 'course' && page === 'business') ||
    (id === 'portfolio' && ['reports', 'history', 'monitoring', 'results'].includes(page))
  const documentReader = Boolean(recordId) &&
    data.account.onboardingState === 'active' &&
    page === 'reports'
  return (
    <SubscriptionProvider key={data.account.id} accountId={data.account.id} locale={locale}>
    <main className={documentReader ? 'hh-app hh-app--document-reader' : 'hh-app'}>
      {!documentReader && <header className="hh-header">
        <Link href={root} prefetch={false} className="hh-brand">
          Holistic House<span>{nav.find(item => navIsActive(item.id))?.label || c.account}</span>
        </Link>
        {(data.practitioner || data.practice) && <Link className="hh-master-header-link" href={root + '/practice'} prefetch={false}>{locale === 'ru' ? 'Практика' : 'Practice'}</Link>}
        <details className="hh-account-menu">
          <summary>{data.account.displayName || c.account}</summary>
          <div>
            {nav.map(({ id, label, href }) => (
              <Link key={id} href={href} prefetch={false}
                aria-current={navIsActive(id) ? 'page' : undefined}
                onClick={(event) => event.currentTarget.closest('details.hh-account-menu')?.removeAttribute('open')}
              >{label}</Link>
            ))}
            <div className="hh-account-menu-secondary">
              <details className="hh-account-more">
                <summary>{locale === 'ru' ? 'Дополнительно' : 'More options'}</summary>
                <Link href={root + '/history'} prefetch={false}>{c.history}</Link>
                <Link href={root + '/monitoring'} prefetch={false}>{c.monitoring}</Link>
                <Link href={root + '/settings'} prefetch={false}>{c.settings}</Link>
              </details>
              <Link
                href={`/${locale === 'en' ? 'ru' : 'en'}/app/${page}${recordId ? `/${recordId}` : ''}`}
                prefetch={false}
              >{locale === 'en' ? 'Русский' : 'English'}</Link>
              <button onClick={() => logout()} disabled={busy}>{c.signout}</button>
            </div>
          </div>
        </details>
      </header>}
      {!documentReader && page !== 'runs' && (
        <nav className="hh-nav" aria-label={c.account}>
          {nav.map(({ id, label, href }) => (
            <Link key={id} href={href} prefetch={false}
              aria-current={navIsActive(id) ? 'page' : undefined}
            >{label}</Link>
          ))}
        </nav>
      )}
      {data.account.onboardingState !== 'active' ? (
        <Preferences data={data} locale={locale} onboarding onDone={load} />
      ) : (
        <>
          {page === 'continue' && (
            <SaveContinuation data={data} locale={locale} reload={load} />
          )}
          {page === 'portrait' && (
            <ProfileDomains locale={locale} mode="account" accountId={data.account.id} results={data.results || []} savedReports={data.savedReports || []} savedDocuments={data.savedDocuments || []}
              reportsContent={<PersonalAnalysisPanel key={data.account.id} locale={locale} reports={reportTimeline(data.savedReports)} savedSessions={data.savedSessions || []} embedded />} />
          )}
          {page === 'portfolio' && <PortfolioPage data={data} locale={locale} />}
          {page === 'course' && <MyCourse data={data} locale={locale} />}
          {page === 'business' && <BusinessCoaching key={data.account.id} accountId={data.account.id} locale={locale} />}
          {page === 'practice' && <PracticeWorkspace locale={locale} ownerTools={data.practitioner ? <OwnerTools locale={locale} /> : null} accountId={data.account.id} key={data.account.id} />}
          {page === 'monitoring' && (
            <PsiMonitoring
              data={data}
              locale={locale}
              instrumentKey={recordId}
              onStarted={(run) => router.push(root + '/runs/' + run.id)}
            />
          )}
          {page === 'tests' && (
            searchParams.get('summary')
              ? <TestPlanSummary locale={locale} planId={searchParams.get('plan')} results={data.results} onBack={() => router.push(root + '/tests')} />
              : <>
                  {!searchParams.get('courseId') && (
                    <details className="hh-tests-mood-disclosure" data-cabinet-mood-checkin>
                      <summary>
                        <span className="hh-tests-mood-symbol" aria-hidden="true">🙂</span>
                        <strong>{locale === 'ru' ? 'Настроение сегодня' : 'Today\u2019s mood'}</strong>
                        <small>{locale === 'ru' ? 'Отметить самочувствие' : 'Quick check-in'}</small>
                        <ChevronDown size={18} aria-hidden="true" />
                      </summary>
                      <MoodCheckIn
                        locale={locale}
                        compact
                        latestMood={data.moodCheckins?.[0] || null}
                        onMoodChange={(payload) =>
                          appFetch('mood', {
                            ...payload,
                            timezone: localZone(),
                            sourceSurface: 'monitoring',
                          }).then((savedMood) => {
                            if (savedMood?.id) {
                              setData((current) => current
                                ? {
                                    ...current,
                                    moodCheckins: [
                                      savedMood,
                                      ...(current.moodCheckins || []).filter((item) => item.id !== savedMood.id),
                                    ],
                                  }
                                : current)
                            }
                            return savedMood
                          })
                        }
                        onQuickCheckin={async () => {
                          try {
                            const def = getAssessmentDefinition('hh-current-state', 'v2', locale)
                            const run = await appFetch('runs', {
                              definitionKey: def.key,
                              definitionVersion: def.version,
                              instrumentLocale: def.instrumentLocale,
                              operationId: crypto.randomUUID(),
                            })
                            window.location.assign('/' + locale + '/app/runs/' + run.id)
                          } catch {
                            window.location.assign(root + '/monitoring/hh-current-state')
                          }
                        }}
                      />
                    </details>
                  )}
                  <AccountTestBattery key={data.account.id + ':' + (searchParams.get('courseId') || '')} data={data} locale={locale}
                    requestedPlanId={searchParams.get('plan')}
                    recommendedKey={searchParams.get('suggest')}
                    initialStatusFilter={searchParams.get('filter')}
                    reload={load} />
                </>
          )}
          {page === 'runs' && (
            <Runner
              key={recordId}
              id={recordId}
              locale={locale}
              initialMode={searchParams.get('mode') === 'quick' ? 'quick' : searchParams.get('mode') === 'guided' ? 'guided' : null}
              courseMode={searchParams.get('course') === '1'}
              onExit={async () => {
                if (searchParams.get('course') === 'retest') { await returnFromFinalRetest(); return }
                await load()
                router.push(searchParams.get('course') === '1' ? root + '/course' + (searchParams.get('courseId') ? '?courseId=' + encodeURIComponent(searchParams.get('courseId')) : '') : root + '/tests')
              }}
              onComplete={async (result, destination) => {
                await completePlan(result, destination)
              }}
            />
          )}
          {page === 'results' && (
            <ResultPage key={recordId} id={recordId} locale={locale} data={data} />
          )}
          {page === 'reports' && (
            recordId ? (
              <SavedReportPage key={recordId} id={recordId} locale={locale} reload={load} />
            ) : (
              <ReportsIndex data={data} locale={locale} />
            )
          )}
          {page === 'history' && <><HistoryView data={data} locale={locale} reload={load} /><ClientMaterialsFromAndy locale={locale} /></>}
          {page === 'consultations' && <Consultations data={data} locale={locale} reload={load} initialServiceId={searchParams.get('service') || ''} source={searchParams.get('source') || ''} requestedMessageId={searchParams.get('request') || ''} />}
          {page === 'settings' && (
            <>
              <Preferences data={data} locale={locale} onDone={load} />
              <SubscriptionSettings />
              <CommunicationPreferences key={data.account.id} accountId={data.account.id} locale={locale} />
              <InstallHolisticHouse locale={locale} />
              <NotificationSettings key={"push:" + data.account.id} accountId={data.account.id} locale={locale} />
              <MessengerNotificationSettings key={"messenger:" + data.account.id} accountId={data.account.id} locale={locale} />
              <Privacy
                locale={locale}
                logout={logout}
                onDeleted={() => {
                  goSignedOut(setData)
                  setDeleted(true)
                }}
              />
            </>
          )}
        </>
      )}
      {!documentReader && page !== 'portrait' && <footer className="hh-footer">
        <p>{c.nonDiagnostic}</p>
        <a href={`/${locale}/client`}>{c.legacy}</a>
      </footer>}
      {!documentReader && page !== 'runs' && <nav className="hh-mobile-app-nav" aria-label={locale === 'ru' ? 'Быстрая навигация' : 'Quick navigation'}>
        {nav.map(({ id, label, href, icon: Icon }) => (
          <Link key={id} href={href} prefetch={false}
            aria-current={navIsActive(id) ? 'page' : undefined}
          ><Icon aria-hidden="true" size={22} /><span>{label}</span></Link>
        ))}
        <Link href={locale === 'ru' ? '/ru' : '/'} prefetch={false}
          className="hh-mobile-app-nav-home"
          aria-label={locale === 'ru' ? 'На главную страницу Holistic House' : 'Go to Holistic House homepage'}
        ><House aria-hidden="true" size={22} /><span>{locale === 'ru' ? 'Главная' : 'Home'}</span></Link>
      </nav>}
    </main>
    </SubscriptionProvider>
  )
}

function SaveContinuation({ data, locale, reload }) {
  const params = useSearchParams()
  const router = useRouter()
  const intentId = params.get('intent') || ''
  const autoSave = params.get('auto') === '1'
  const authFailure = params.get('auth') || ''
  const autoStarted = useRef('')
  const committing = useRef(false)
  const [intent, setIntent] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ru = locale === 'ru'

  useEffect(() => {
    let live = true
    if (!intentId) {
      setError(ru ? 'Не найден результат для сохранения.' : 'No result was selected for saving.')
      return
    }
    appFetch('save-intents/' + intentId)
      .then((value) => {
        if (!live) return
        setIntent(value)
        if (value.expired)
          setError(ru ? 'Время подтверждения истекло. Вернитесь к результату и нажмите «Сохранить» ещё раз.' : 'This confirmation expired. Return to the result and choose Save again.')
        else if (authFailure)
          setError(ru ? 'Вход через Google не был завершён. Документ ещё не сохранён.' : 'Google sign-in was not completed. Your document has not been saved.')
      })
      .catch(() => {
        if (live) setError(ru ? 'Не удалось открыть подтверждение сохранения.' : 'This save confirmation is unavailable.')
      })
    return () => {
      live = false
    }
  }, [intentId, ru, authFailure])

  const commit = useCallback(async () => {
    if (!intentId || committing.current) return
    committing.current = true
    setBusy(true)
    setError('')
    try {
      const saved = await appFetch('save-intents/' + intentId + '/commit', { confirmed: true })
      await reload()
      // A confirmed session Save may have been initiated by a navigation click.
      // Continue to exactly the first-party section selected before OAuth.
      const next=saved.sourceKind==='client_session' && typeof window!=='undefined'
        ? consumeSessionSaveTarget(intentId,locale,window.location.origin,window.sessionStorage)
        : null
      router.replace(next||savedResourcePath(locale,saved.sourceKind,saved.resource.id))
    } catch (e) {
      setError(
        e?.code === 'SAVE_INTENT_EXPIRED'
          ? ru
            ? 'Время подтверждения истекло. Вернитесь к исходному документу и повторите сохранение.'
            : 'This confirmation expired. Return to the original item and save again.'
          : e?.code === 'CLIENT_ACCOUNT_ALREADY_LINKED'
            ? ru
              ? 'Эта карточка клиента уже связана с другим Google-аккаунтом. Свяжитесь с Andy, чтобы проверить привязку.'
              : 'This client profile is already linked to another Google Account. Contact Andy to review the link.'
            : ru
              ? 'Не удалось сохранить выбранный материал.'
              : 'The selected item could not be saved.',
      )
    } finally {
      committing.current = false
      setBusy(false)
    }
  }, [intentId, locale, reload, router, ru])

  // The explicit recipient click created an item-scoped HttpOnly save intent.
  // Resume only that selection after Google sign-in (and any new-account consent).
  useEffect(() => {
    if (!canAutoContinueSave({ automatic: autoSave, authStatus: authFailure, intent })) return
    if (autoStarted.current === intentId) return
    autoStarted.current = intentId
    if (intent.status === 'committed' && intent.resourceId) {
      const next=intent.sourceKind==='client_session' && typeof window!=='undefined'
        ? consumeSessionSaveTarget(intentId,locale,window.location.origin,window.sessionStorage)
        : null
      router.replace(next||savedResourcePath(locale,intent.sourceKind,intent.resourceId))
      return
    }
    void commit()
  }, [autoSave, authFailure, intent, intentId, commit, locale, router])

  const sourceTitle =
    intent?.sourceKind === 'client_session'
      ? ru ? 'Сохранение одной консультации' : 'Save one consultation'
      : intent?.sourceKind === 'delivered_report'
      ? ru
        ? 'Полученный отчёт'
        : 'Received report'
      : intent?.sourceKind === 'legacy_document'
        ? intent?.source?.documentKind === 'receipt'
          ? ru ? 'Квитанция' : 'Receipt'
          : intent?.source?.documentKind === 'invoice'
            ? ru ? 'Счёт' : 'Invoice'
            : ru ? 'Рекомендация' : 'Recommendation'
      : intent?.sourceKind === 'guest_result'
        ? (monitoringCatalogItem(intent?.source?.definitionKey)?.title?.[locale] ||
            monitoringCatalogItem(intent?.source?.definitionKey)?.title?.en ||
            (ru ? 'Результат теста' : 'Test result'))
        : (ru ? 'Документ' : 'Document')
  // After the guest explicitly clicked Get free analysis, the item-scoped
  // HttpOnly intent is sufficient consent to save that one result. Keep the
  // OAuth handoff visually transitional, never expose a second Save form.
  if (autoSave && !authFailure && !error &&
      (!intent || canAutoContinueSave({ automatic: autoSave, authStatus: authFailure, intent }))) {
    return (
      <section className="hh-panel hh-entry" aria-busy="true">
        <p className="hh-kicker">Holistic House</p>
        <h1>{ru ? 'Открываем ваш результат' : 'Opening your result'}</h1>
        <p role="status">{ru
          ? 'Сохраняем выбранный тест в кабинете и открываем пояснения шкал и рекомендации…'
          : 'Saving your selected test and opening your scale explanations and recommendations…'}</p>
      </section>
    )
  }
  if (autoSave && intent?.sourceKind === 'guest_result') {
    // A failed OAuth or import does not require asking for Save consent again.
    // Keep the selected result in guest storage and offer safe recovery.
    return (
      <section className="hh-panel hh-entry">
        <p className="hh-kicker">Holistic House</p>
        <h1>{ru ? 'Не удалось открыть анализ' : 'Could not open your analysis'}</h1>
        <p role="alert">{error || (ru
          ? 'Вернитесь к результату теста и повторите вход через Google.'
          : 'Return to your test result and try Google sign-in again.')}</p>
        {!authFailure && !intent.expired && intent.status === 'pending' && (
          <button type="button" className="hh-primary" disabled={busy} onClick={commit}>
            {busy ? (ru ? 'Повторяем…' : 'Retrying…')
              : (ru ? 'Повторить открытие анализа' : 'Retry opening analysis')}
          </button>
        )}
        <Link href={`/${locale}/client?result=${encodeURIComponent(intent.sourceId)}`} prefetch={false}>
          {ru ? 'Вернуться к результату теста' : 'Back to my test result'}
        </Link>
      </section>
    )
  }
  return (
    <section className="hh-panel hh-entry">
      <p className="hh-kicker">{ru ? 'Подтверждение' : 'Confirmation'}</p>
      <h1>{ru ? 'Сохранить в личном кабинете' : 'Save to your Cabinet'}</h1>
      {canAutoContinueSave({automatic:autoSave,authStatus:authFailure,intent}) && (
        <p role="status">{ru ? 'Сохраняем и открываем ваш документ в личном кабинете…' : 'Saving and opening your document in your personal Cabinet…'}</p>
      )}
      {intent && !intent.expired && (
        <>
          <p><strong>{sourceTitle}</strong></p>
          {intent?.source?.title && <p>{ru ? 'Название отчёта' : 'Report title'}: <strong>{intent.source.title}</strong></p>}
          {intent?.source?.occurredOn && <p>{ru ? 'Дата отчёта' : 'Report date'}: {formatReportDate(intent.source.occurredOn, locale)}</p>}
          {intent.source?.measurementAt && (
            <p>{ru ? 'Пройдено' : 'Measured'}: {dateLabel(intent.source.measurementAt, locale)}</p>
          )}
          <p>
            {ru ? 'Получающий Google-аккаунт' : 'Receiving Google Account'}: {data.email || data.account.displayName || (ru ? 'текущий Google-аккаунт' : 'current Google account')}
          </p>
          <p className="hh-muted">
            {intent?.sourceKind === 'client_session'
              ? (ru
                  ? 'Вы подтверждаете сохранение только этой консультации в показанный Google-аккаунт. Остальные записи клиента не будут привязаны или открыты автоматически.'
                  : 'You are confirming this one consultation for the Google Account shown above. No other client records will be linked or unlocked automatically.')
              : intent?.sourceKind === 'guest_result'
              ? (ru
                  ? 'Будет сохранён только этот выбранный результат.'
                  : 'Only this selected result will be saved.')
              : (ru
                  ? 'Будет сохранён только этот выбранный материал. Ваша карточка клиента у Andy будет связана с этим Google-аккаунтом; остальные старые документы автоматически не открываются.'
                  : 'Only this selected item will be saved. Your client profile with Andy will be linked to this Google Account; other legacy documents are not opened automatically.')}
          </p>
          {intent.status === 'committed' && intent.resourceId ? (
            <Link
              className="hh-primary"
              href={savedResourcePath(locale, intent.sourceKind, intent.resourceId)}
              prefetch={false}
            >
              {intent.sourceKind === 'guest_result' ? (ru ? 'Открыть бесплатный анализ' : 'Open my free analysis') : (ru ? 'Открыть сохранённый материал' : 'Open saved item')}
            </Link>
          ) : (
            <button className="hh-primary" type="button" disabled={busy} onClick={commit}>
              {busy ? (ru ? 'Сохраняем…' : 'Saving…') : intent.sourceKind === 'guest_result' ? (ru ? 'Сохранить результат и открыть бесплатный анализ' : 'Save my result and open free analysis') : (ru ? 'Сохранить' : 'Save')}
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="hh-fine">
        {ru
          ? 'Если вы выбрали не тот Google-аккаунт, вернитесь к исходному результату и начните сохранение заново.'
          : 'If this is not the Google account you intended, return to the original result and start Save again.'}
      </p>
    </section>
  )
}

function Preferences({ data, locale, onboarding = false, onDone }) {
  const c = COPY[locale],
    [values, setValues] = useState({
      displayName: data.account.displayName,
      uiLocale: onboarding ? locale : data.account.uiLocale,
      timezone: onboarding ? localZone() : data.account.timezone,
      goal: data.account.goal || 'explore',
      adult: false,
      necessary: false,
      marketing:
        [...(data.consents || [])].reverse().find((x) => x.purpose === 'marketing')?.accepted ||
        false,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [saved, setSaved] = useState(false)
  const change = (key, value) => {
    setSaved(false)
    setValues((v) => ({ ...v, [key]: value }))
  }
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = onboarding
        ? {
            adult: values.adult,
            necessary: values.necessary,
            marketing: false,
            uiLocale: locale,
            timezone: localZone(),
          }
        : Object.fromEntries(
            Object.entries(values).filter(([k]) => !['adult', 'necessary'].includes(k)),
          )
      await appFetch(onboarding ? 'onboarding' : 'preferences', body)
      setSaved(true)
      await onDone()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-panel">
      <h1>{onboarding ? c.continue : c.settings}</h1>
      <p>{c.privacy}</p>
      <form className="hh-form" onSubmit={submit}>
        {!onboarding && (
          <>
            <label>
              {c.name}
              <input
                value={values.displayName}
                maxLength={120}
                onChange={(e) => change('displayName', e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              {c.timezone}
              <input
                value={values.timezone}
                required
                maxLength={100}
                onChange={(e) => change('timezone', e.target.value)}
              />
            </label>
            <label>
              Language / Язык
              <select value={values.uiLocale} onChange={(e) => change('uiLocale', e.target.value)}>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </label>
            <label>
              {c.goal}
              <select value={values.goal} onChange={(e) => change('goal', e.target.value)}>
                {['explore', 'body', 'relationships', 'resource', 'business'].map((key) => (
                  <option value={key} key={key}>
                    {c[key]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {onboarding && (
          <>
            <label className="hh-check">
              <input
                type="checkbox"
                checked={values.adult}
                onChange={(e) => change('adult', e.target.checked)}
                required
              />
              {c.adult}
            </label>
            <label className="hh-check">
              <input
                type="checkbox"
                checked={values.necessary}
                onChange={(e) => change('necessary', e.target.checked)}
                required
              />
              {c.necessary}
            </label>
          </>
        )}
        {!onboarding && (
          <label className="hh-check">
            <input
              type="checkbox"
              checked={values.marketing}
              onChange={(e) => change('marketing', e.target.checked)}
            />
            {c.marketing}
          </label>
        )}
        <button className="hh-primary" disabled={busy}>
          {busy ? c.saving : onboarding ? c.continue : c.save}
        </button>
        {saved && <p role="status">{c.saved}</p>}
        {error && <p role="alert">{message(error, c)}</p>}
      </form>
    </section>
  )
}
function TestCatalog({ data, locale, onStarted }) {
  const c = COPY[locale]
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState(mode === 'all' ? 'all' : 'recommended')
  const [showRecommender, setShowRecommender] = useState(mode === 'recommendations')
  const [selectedFocus, setSelectedFocus] = useState([])
  const [testStyles, setTestStyles] = useState(() => TEST_STYLE_FILTERS.map((item) => item.key))
  const [testLengths, setTestLengths] = useState(() => TEST_LENGTH_FILTERS.map((item) => item.key))
  const [personalized, setPersonalized] = useState(null)
  const ru = locale === 'ru'
  const entries = MONITORING_CATALOG.filter((item) => item.startable).map((item) => ({
    item,
    def: getAssessmentDefinition(
      item.key,
      item.version,
      item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
    ),
  }))
  const definitions = entries.map(({ def }) => def)
  const monitoringIntro = ru
    ? 'Начните с одного полезного замера. Более глубокие тесты проходите только когда они действительно нужны.'
    : 'Start with one useful measurement. Take deeper checks only when they are actually useful.'
  const recommendationCopy = ru
    ? {
        action: 'Подобрать тесты',
        title: 'Какие темы сейчас важнее?',
        text: 'Выберите одну или несколько зон, тип теста и длину. Доступные тесты будут расставлены по приоритету.',
        style: 'Тип теста',
        engaging: 'Лёгкие / игровые',
        professional: 'Профессиональные',
        length: 'Длина',
        short: 'Короткие',
        medium: 'Средние',
        comprehensive: 'Комплексные',
        build: 'Показать рекомендации',
        ranked: 'Ваш рекомендуемый порядок',
        rankedText: 'Порядок основан только на выбранных темах и глубине. Это навигация по тестам, а не диагноз.',
        rank: 'Приоритет',
        choose: 'Выберите хотя бы одну тему.',
        privacy: 'Выбранные зоны используются только для этой сортировки и не сохраняются в профиле.',
        forMe: 'Для меня',
      }
    : {
        action: 'Get test recommendations',
        title: 'What matters most right now?',
        text: 'Choose one or more areas, the test style and length. Available tests will be ranked for you.',
        style: 'Test style',
        engaging: 'Fun / engaging',
        professional: 'Professional',
        length: 'Length',
        short: 'Short',
        medium: 'Medium',
        comprehensive: 'Comprehensive',
        build: 'Show my recommendations',
        ranked: 'Your recommended order',
        rankedText: 'The order is based only on the themes and depth you selected. It helps navigate tests; it is not a diagnosis.',
        rank: 'Priority',
        choose: 'Choose at least one area.',
        privacy: 'Your selected areas are used only for this ranking and are not saved to your profile.',
        forMe: 'For me',
      }
  const tabs = [
    ...(personalized ? [['personalized', recommendationCopy.forMe]] : []),
    ...(ru
      ? [['recommended', 'Рекомендуем'], ['all', 'Все доступные'], ['areas', 'По областям'], ['completed', 'Пройденные']]
      : [['recommended', 'Recommended'], ['all', 'All available'], ['areas', 'By area'], ['completed', 'Completed']]),
  ]
  const recommended = entries
    .filter(({ item }) => ['state', 'symptoms', 'resources'].includes(item.axis))
    .slice(0, 3)
  const completedDefinitions = definitions.filter((def) =>
    data.results.some((result) => result.definitionId === def.id),
  )
  const axisGroups = [
    ['state', ru ? 'Состояние' : 'State'],
    ['symptoms', ru ? 'Симптомы и нагрузка' : 'Symptoms & load'],
    ['function', ru ? 'Функционирование' : 'Functioning'],
    ['resources', ru ? 'Ресурсы и восстановление' : 'Resources & recovery'],
    ['baseline', 'Baseline'],
  ]

  async function start(def) {
    setBusy(true)
    setError(null)
    try {
      onStarted(await appFetch('runs', {
        definitionKey: def.key,
        definitionVersion: def.version,
        instrumentLocale: def.instrumentLocale,
        operationId: crypto.randomUUID(),
      }))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  function toggleFocus(key) {
    setSelectedFocus((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
    setPersonalized(null)
  }

  function toggleFacet(setter, key) {
    setter((current) => {
      if (!current.includes(key)) return [...current, key]
      return current.length > 1 ? current.filter((item) => item !== key) : current
    })
    setPersonalized(null)
  }

  function buildRecommendations() {
    if (!selectedFocus.length) return
    setPersonalized(rankAssessmentDefinitions(definitions, {
      focus: selectedFocus,
      styles: testStyles,
      lengths: testLengths,
    }))
    setView('personalized')
  }

  function cardFor(def, { recommendedNow = false, rank = null } = {}) {
    const item = monitoringCatalogItem(def.key)
    const draft = data.runs.find((x) => x.definitionId === def.id)
    const completed = data.results.filter((x) => x.definitionId === def.id).at(-1)
    const title = item?.title?.[locale] || item?.title?.en || def.title
    const description = item?.description?.[locale] || item?.description?.en || ''
    const methodology = assessmentMethodology({key: def.key, catalog: item, definition: def, locale}).text
    const image =
      item?.axis === 'baseline'
        ? (ru ? '/images/holistic-house/video-posters/services-ru-v1.webp' : '/images/holistic-house/video-posters/services-en-v2.webp')
        : (ru ? '/images/holistic-house/video-posters/home-ru-v1.webp' : '/images/holistic-house/video-posters/home-en-v2.webp')

    return (
      <article className={`hh-monitoring-card${recommendedNow ? ' hh-monitoring-card--recommended' : ''}`} key={def.id}>
        <div className="hh-monitoring-photo" aria-hidden="true">
          <Image alt="" fill sizes="(max-width: 600px) 76px, 128px" src={image} />
        </div>
        <div className="hh-monitoring-card-body">
          {rank && <p className="hh-monitoring-rank">{recommendationCopy.rank} #{rank}</p>}
          {recommendedNow && <p className="hh-monitoring-recommended">{ru ? 'Рекомендуем сейчас' : 'Recommended now'}</p>}
          <p className="hh-monitoring-meta">
            {item?.questionCount || def.questions.length} {ru ? 'вопросов' : 'questions'} · ~{item?.durationMinutes || 2} {ru ? 'мин' : 'min'}
            {def.instrumentLocale !== locale ? ` · ${def.instrumentLocale.toUpperCase()}` : ''}
          </p>
          <h2>{title}</h2>
          <p>{description}</p>
          <p className="hh-fine">{methodology}</p>
          {/^https:\/\//.test(def.source?.url || '') && <a className="hh-fine" href={def.source.url} rel="noopener noreferrer" target="_blank">{ru ? 'Источник методики' : 'Instrument source'}</a>}
          {def.source?.copyright && <p className="hh-fine">{def.source.copyright}</p>}
          {completed && <p className="hh-fine">{c.latest}: {dateLabel(completed.measurementAt, locale)}</p>}
          <div className="hh-actions">
            <button className="hh-primary" disabled={busy} onClick={() => (draft ? onStarted(draft) : start(def))}>
              {draft ? c.resume : completed ? c.repeat : c.start}
            </button>
            {completed && <Link href={`/${locale}/app/results/${completed.id}`} prefetch={false}>{c.view}</Link>}
          </div>
        </div>
      </article>
    )
  }

  return (
    <section className="hh-monitoring">
      <div className="hh-heading hh-monitoring-heading">
        <p className="hh-kicker">{ru ? 'Монитор состояния' : 'Mind–Body Monitor'}</p>
        <h1>{ru ? 'Тесты и самонаблюдение' : 'Tests & self-checks'}</h1>
        <p>{monitoringIntro}</p>
        <p className="hh-fine">{c.continueLater}</p>
        <button className="hh-secondary hh-recommendation-toggle" type="button" onClick={() => setShowRecommender((value) => !value)}>
          {recommendationCopy.action}
        </button>
      </div>

      {showRecommender && (
        <section className="hh-test-recommender" aria-labelledby="test-recommender-title">
          <div>
            <p className="hh-kicker">{recommendationCopy.action}</p>
            <h2 id="test-recommender-title">{recommendationCopy.title}</h2>
            <p>{recommendationCopy.text}</p>
          </div>
          <div className="hh-test-focus-grid">
            {TEST_RECOMMENDATION_FOCUS.map((item) => (
              <button type="button" key={item.key} aria-pressed={selectedFocus.includes(item.key)} onClick={() => toggleFocus(item.key)}>
                {item.label[locale] || item.label.en}
              </button>
            ))}
          </div>
          <div className="hh-test-facets">
            <fieldset className="hh-test-filter">
              <legend>{recommendationCopy.style}</legend>
              {TEST_STYLE_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  aria-pressed={testStyles.includes(item.key)}
                  onClick={() => toggleFacet(setTestStyles, item.key)}
                >
                  {item.key === 'engaging' ? recommendationCopy.engaging : recommendationCopy.professional}
                </button>
              ))}
            </fieldset>
            <fieldset className="hh-test-filter">
              <legend>{recommendationCopy.length}</legend>
              {TEST_LENGTH_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  aria-pressed={testLengths.includes(item.key)}
                  onClick={() => toggleFacet(setTestLengths, item.key)}
                >
                  {item.key === 'short'
                    ? recommendationCopy.short
                    : item.key === 'medium'
                      ? recommendationCopy.medium
                      : recommendationCopy.comprehensive}
                </button>
              ))}
            </fieldset>
          </div>
          <div className="hh-test-recommender-footer">
            <button className="hh-primary" type="button" disabled={!selectedFocus.length} onClick={buildRecommendations}>
              {recommendationCopy.build}
            </button>
            {!selectedFocus.length && <span>{recommendationCopy.choose}</span>}
            <small>{recommendationCopy.privacy}</small>
          </div>
        </section>
      )}

      <nav className="hh-monitoring-tabs" aria-label={ru ? 'Фильтр тестов' : 'Test filters'}>
        {tabs.map(([id, label]) => (
          <button type="button" key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>

      {view === 'personalized' && personalized && (
        <section className="hh-ranked-tests" aria-labelledby="ranked-tests-title">
          <header>
            <h2 id="ranked-tests-title">{recommendationCopy.ranked}</h2>
            <p>{recommendationCopy.rankedText}</p>
          </header>
          <div className="hh-monitoring-grid">
            {personalized.map((item, index) => cardFor(item.definition, { recommendedNow: index === 0, rank: index + 1 }))}
          </div>
        </section>
      )}

      {view === 'recommended' && <div className="hh-monitoring-grid">{recommended.map(({ def }, index) => cardFor(def, { recommendedNow: index === 0 }))}</div>}
      {view === 'all' && <div className="hh-monitoring-grid">{definitions.map((def) => cardFor(def))}</div>}

      {view === 'areas' && (
        <div className="hh-monitoring-areas">
          {axisGroups.map(([axis, title]) => {
            const group = entries.filter(({ item }) => item.axis === axis || item.resultAxes?.includes(axis))
            return group.length ? (
              <section key={axis}>
                <h2>{title}</h2>
                <div className="hh-monitoring-grid">{group.map(({ def }) => cardFor(def))}</div>
              </section>
            ) : null
          })}
        </div>
      )}

      {view === 'completed' && (
        completedDefinitions.length
          ? <div className="hh-monitoring-grid">{completedDefinitions.map((def) => cardFor(def))}</div>
          : <article className="hh-panel hh-empty"><h2>{ru ? 'Пока нет пройденных тестов' : 'No completed tests yet'}</h2></article>
      )}
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}

function TestPlanSummary({ locale, planId, results, onBack }) {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!planId) return
    appFetch('test-plans/' + encodeURIComponent(planId)).then(setPlan).catch(setError)
  }, [planId])
  if (!plan) return <section className="hh-panel"><h1>{locale === 'ru' ? 'Загрузка набора…' : 'Loading set…'}</h1>{error && <p role="alert">{message(error, COPY[locale])}</p>}</section>
  const completed = results.filter((result) => plan.completedRunIds?.includes(result.runId))
  return <section className="hh-panel hh-test-plan-summary"><p className="hh-kicker">{locale === 'ru' ? 'Набор завершён' : 'Set complete'}</p><h1>{locale === 'ru' ? 'Ваш общий обзор' : 'Your combined overview'}</h1><p>{locale === 'ru' ? 'Каждый инструмент остаётся отдельным результатом: здесь нет синтетического медицинского балла или диагноза.' : 'Each instrument remains a separate result: this page does not create a synthetic medical score or diagnosis.'}</p><div className="hh-history-list">{completed.map((result) => <Link key={result.id} href={`/${locale}/app/results/${result.id}`} prefetch={false}>{getDefinitionById(result.definitionId).title} · {new Date(result.measurementAt).toLocaleDateString(locale)}</Link>)}</div><button type="button" onClick={onBack}>{locale === 'ru' ? 'К базе тестов' : 'Back to test explorer'}</button></section>
}


function RunnerAnswerChoices({ definition, question, selected, onChoose, locale, disabled }) {
  const min = question.min ?? definition.answerScale?.min
  const max = question.max ?? definition.answerScale?.max
  const anchors = question.responseAnchors || definition.responseAnchors
  // ONS4 asks eleven choices; a numeric selector prevents mobile overflow.
  if (question.inputType === 'scale-select') return (
    <label className="hh-day-count-select">
      <span>{locale === 'ru' ? 'Оценка по шкале (0–10)' : 'Rating on a 0–10 scale'}</span>
      <select aria-label={locale === 'ru' ? 'Оценка от 0 до 10' : 'Rating from 0 to 10'}
        value={selected ?? ''} disabled={disabled}
        onChange={event => { if (event.target.value !== '') void onChoose(Number(event.target.value)) }}>
        <option value="" disabled>{locale === 'ru' ? 'Выберите оценку' : 'Select a rating'}</option>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(value => (
          <option value={value} key={value}>
            {value}{anchors?.[value - min] ? ' — ' + anchors[value - min] : ''}
          </option>
        ))}
      </select>
    </label>
  )
  if (question.inputType === 'day-count') return (
    <label className="hh-day-count-select">
      <span>{locale === 'ru' ? 'Количество дней за последние 30 дней (0–30)' : 'Number of days in the past 30 days (0–30)'}</span>
      <select aria-label={locale === 'ru' ? 'Количество дней' : 'Number of days'}
        value={selected ?? ''} disabled={disabled}
        onChange={event => { if (event.target.value !== '') void onChoose(Number(event.target.value)) }}>
        <option value="" disabled>{locale === 'ru' ? 'Выберите число дней' : 'Select number of days'}</option>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(value => (
          <option value={value} key={value}>{value}</option>
        ))}
      </select>
    </label>
  )
  return (
    <>
      <div className={anchors ? 'hh-scale hh-scale-words' : 'hh-scale'}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(value => (
          <button key={value} type="button" aria-pressed={selected === value}
            className={asrs6ChoiceClass(definition, question, value)}
            disabled={disabled} onClick={() => void onChoose(value)}>
            {definition.key !== 'asrs-6' && <strong>{value}</strong>}
            {anchors && <span lang={definition.instrumentLocale}>{anchors[value - min]}</span>}
            <Asrs6ChoiceMarker definition={definition} question={question} value={value} />
          </button>
        ))}
      </div>
      {question.anchors && !anchors && (
        <div className="hh-anchors">
          <span>{question.anchors[0]}</span><span>{question.anchors.at(-1)}</span>
        </div>
      )}
    </>
  )
}

function Runner({ id, locale, onExit, onComplete, initialMode = null, courseMode = false }) {
  const { offerAfterCompletion } = useSubscription()
  const c = COPY[locale],
    [run, setRun] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [context, setContext] = useState({}),
    [showDiscard, setShowDiscard] = useState(false),
    [mode, setMode] = useState(initialMode === 'guided' ? 'guided' : 'quick'),
    [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const operation = useRef(null),
    inflight = useRef(false),
    completion = useRef(null),
    finishing = useRef(false)
  const modeCopy =
    locale === 'ru'
      ? {
          title: 'Как пройти этот тест?',
          intro: 'Выберите темп. Вопросы и расчёт результата в обоих режимах одинаковые.',
          quick: 'Quick',
          quickTitle: 'Быстро',
          quickText: 'Все вопросы на одной странице. Ответы сохраняются при выборе.',
          guided: 'Guided',
          guidedTitle: 'С сопровождением',
          guidedText: 'Один вопрос на экране, затем кнопка «Далее».',
          same: 'В обоих режимах используются те же вопросы и тот же расчёт результата.',
          tap: 'Ответы сохраняются автоматически, без перехода между вопросами.',
          guidedPrompt: 'Не спешите. Выберите вариант, который ближе всего к вашему ощущению.',
          part: 'Часть',
          question: 'Вопрос',
          switch: 'Режим прохождения',
        }
      : {
          title: 'How would you like to take this test?',
          intro: 'Choose your pace. Both modes use the same questions and the same scoring.',
          quick: 'Quick',
          quickTitle: 'Fast & simple',
          quickText: 'All questions on one scrollable page, with automatic saving.',
          guided: 'Guided',
          guidedTitle: 'Calm & guided',
          guidedText: 'One question per screen, with a clear Next button.',
          same: 'Both use the same questions and produce the same result.',
          tap: 'Answers save automatically without changing pages.',
          guidedPrompt: 'Take your time. Choose the answer that feels closest to your experience.',
          part: 'Part',
          question: 'Question',
          switch: 'Test mode',
        }

  async function load() {
    setError(null)
    try {
      const value = await appFetch('runs/' + id)
      operation.current = null
      completion.current = null
      setRun(value)
      if (value.safetySignal) setSafetyAcknowledged(false)
      setContext(value.context || {})
      setStatus('')
    } catch (e) {
      setError(e)
    }
  }
  useEffect(() => {
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const def = run ? getDefinitionById(run.definitionId) : null,
    index = run?.progress || 0,
    question = def?.questions[index],
    isContext = def && index >= def.questions.length,
    answeredCount = def ? def.questions.filter(item => Object.prototype.hasOwnProperty.call(run.answers || {}, item.id)).length : 0,
    allAnswered = def ? answeredCount === def.questions.length : false,
    quickMinutes = def ? Math.max(1, Number(monitoringCatalogItem(def.key)?.durationMinutes) || Math.ceil(def.questions.length / 5)) : 1,
    guidedMinutes = Math.max(quickMinutes + 1, Math.ceil(quickMinutes * 1.4)),
    timeUnit = locale === 'ru' ? 'мин' : 'min',
    timeframe = def?.key === 'hh-bach-flower-profile'
      ? (locale === 'ru' ? 'Часть ответов относится к текущей ситуации, часть — к привычным эмоциональным реакциям. Отвечайте без спешки.' : 'Some statements describe your present situation; others concern your recurring emotional patterns. Answer at your own pace.')
      : def?.timeframe === 'past-6-months'
        ? (locale === 'ru' ? 'За последние 6 месяцев' : 'Over the past 6 months')
      : def?.timeframe === 'past-2-weeks'
      ? (locale === 'ru' ? 'За последние 2 недели' : 'Over the past 2 weeks')
      : def?.timeframe === 'past-30-days'
        ? (locale === 'ru' ? 'За последние 30 дней' : 'Over the past 30 days')
        : def?.timeframe === 'past-month'
          ? (locale === 'ru' ? 'За последний месяц' : 'During the past month')
        : def?.timeframe === 'past-7-days'
          ? (locale === 'ru' ? 'За последние 7 дней' : 'Over the past 7 days')
          : def?.timeframe === 'right-now'
            ? (locale === 'ru' ? 'Как вы чувствуете себя сейчас' : 'How you feel right now')
            : (locale === 'ru' ? 'В целом, не только сегодня' : 'In general, not only today')
  async function save(answers = {}, progress = index) {
    if (inflight.current || completion.current) return null
    inflight.current = true
    setBusy(true)
    setError(null)
    setStatus(c.saving)
    const body = {
        answers,
        context,
        progress,
        expectedRevision: run.revision,
        operationId: operation.current?.id || crypto.randomUUID(),
      },
      payload = operation.current?.body || body
    operation.current = { id: payload.operationId, body: payload }
    try {
      const next = await appFetch(`runs/${id}/save`, payload)
      operation.current = null
      setRun(next)
      if (next.safetySignal) setSafetyAcknowledged(false)
      setContext(next.context || {})
      setStatus(c.saved)
      return next
    } catch (e) {
      setError(e)
      setStatus(c.saveError)
      return null
    } finally {
      inflight.current = false
      setBusy(false)
    }
  }
  async function chooseAnswer(value, questionId = question?.id) {
    if (!questionId) return
    const answers = { ...(run.answers || {}), [questionId]: value }
    const firstMissing = def.questions.findIndex(item => !Object.prototype.hasOwnProperty.call(answers, item.id))
    const progress = mode === 'quick' ? (firstMissing < 0 ? def.questions.length : firstMissing) : index
    await save({ [questionId]: value }, progress)
  }
  async function next() {
    if (!question || run.answers[question.id] === undefined) return
    await save({}, index + 1)
  }
  async function finish(destination = 'report') {
    if (finishing.current || inflight.current) return
    finishing.current = true
    try {
      // Keep the exact submitted revision across an uncertain response. Never
      // attempt to edit an already completed run just to recover its report.
      if (!completion.current) {
        const saved = await save({}, def.questions.length)
        if (!saved) return
        completion.current = { revision: saved.revision, destination, result: null }
      }
      setBusy(true)
      setError(null)
      const pending = completion.current
      const result = pending.result || await appFetch(`runs/${id}/submit`, { expectedRevision: pending.revision })
      pending.result = result
      // The offer is queued only after server persistence. Course sequencing stays nonblocking.
      if (result?.id) offerAfterCompletion(`test:${result.id}`)
      await onComplete(result, pending.destination)
    } catch (e) {
      setError(e)
    } finally {
      finishing.current = false
      setBusy(false)
    }
  }
  async function exit() {
    if (await save()) await onExit()
  }
  async function discard() {
    if (completion.current || inflight.current || finishing.current) return
    setBusy(true)
    try {
      await appFetch(`runs/${id}/discard`, { expectedRevision: run.revision })
      await onExit()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  if (!run)
    return (
      <section className="hh-panel">
        <h1>{c.loading}</h1>
        {error && (
          <>
            <p role="alert">{message(error, c)}</p>
            <button onClick={load}>{c.retry}</button>
          </>
        )}
      </section>
    )
  if (!['draft', 'in_progress'].includes(run.status))
    return (
      <section className="hh-panel">
        <p>{c.result}</p>
        <Link href={`/${locale}/app/history`} prefetch={false}>
          {c.history}
        </Link>
      </section>
    )

  if (run.safetySignal && !safetyAcknowledged) {
    const safety = SAFETY_COPY[locale] || SAFETY_COPY.en
    return (
      <section className="hh-panel hh-safety" role="alert" aria-live="assertive">
        <p className="hh-kicker">Holistic House</p>
        <h1>{safety.title}</h1>
        <p>{safety.text}</p>
        <p><strong>{safety.urgent}</strong></p>
        <p>{safety.support}</p>
        <div className="hh-actions">
          <a className="hh-primary" href="tel:988">988</a>
          <a href="sms:988">{locale === 'ru' ? 'Написать 988' : 'Text 988'}</a>
          <button type="button" onClick={() => setSafetyAcknowledged(true)}>{safety.continue}</button>
        </div>
      </section>
    )
  }

  if (hasTraumaAdministration(def) && !traumaContextReady(def, run.context || {})) {
    return <TraumaFrontMatter definition={def} context={context} onChange={setContext}
      onContinue={() => save({}, index)} onExit={onExit} busy={busy || Boolean(operation.current) || Boolean(completion.current)} error={error} />
  }

  const min = question?.min ?? def.answerScale?.min,
    max = question?.max ?? def.answerScale?.max,
    partCount = def.key === 'hh-bach-flower-profile' ? 3 : Math.min(4, Math.max(1, def.questions.length)),
    partSize = Math.ceil(def.questions.length / partCount),
    currentPart = def.key === 'hh-bach-flower-profile'
      ? (index < 38 ? 1 : index < 77 ? 2 : 3)
      : Math.min(partCount, Math.floor(Math.min(index, def.questions.length - 1) / partSize) + 1),
    bachSectionName = section => {
      const names = locale === 'ru'
        ? { situation: '1/3 · Текущая ситуация', character: '2/3 · Эмоциональные паттерны', control: '3/3 · Проверка и поддержка' }
        : { situation: '1/3 · Current situation', character: '2/3 · Recurring patterns', control: '3/3 · Cross-check & support' }
      return names[section] || ''
    }

  return (
    <section className={`hh-runner hh-panel hh-runner--${mode} ${courseMode && mode !== 'quick' ? courseQuizStyles.questRunner : ''}`} data-course-quiz={courseMode ? 'true' : undefined}>
      <header className="hh-runner-head">
        <div className="hh-runner-topline">
          <p className="hh-kicker">
            {monitoringCatalogItem(def.key)?.title?.[locale] || monitoringCatalogItem(def.key)?.title?.en || def.title} ·{' '}
            {def.instrumentLocale.toUpperCase()}
          </p>
          {(!isContext || mode === 'quick') && (
            <div className="hh-test-mode-toggle" role="group" aria-label={modeCopy.switch}>
              <button type="button" aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>
                ⚡ {modeCopy.quick} <small>~{quickMinutes} {timeUnit}</small>
              </button>
              <button type="button" aria-pressed={mode === 'guided'} onClick={() => setMode('guided')}>
                ✦ {modeCopy.guided} <small>~{guidedMinutes} {timeUnit}</small>
              </button>
            </div>
          )}
        </div>
        <div className="hh-runner-segments" role="progressbar" aria-label={c.tests}
          aria-valuemin="0" aria-valuemax={def.questions.length}
          aria-valuenow={mode === 'quick' ? answeredCount : Math.min(index, def.questions.length)}>
          {def.questions.map((item, step) => (
            <span key={item.id}
              className={mode === 'quick'
                ? (Object.prototype.hasOwnProperty.call(run.answers || {}, item.id) ? 'is-done' : '')
                : step < index ? 'is-done' : step === index ? 'is-current' : ''}
              aria-hidden="true" />
          ))}
        </div>
        <div className="hh-runner-progress-copy">
          <span>{mode === 'quick'
            ? `${answeredCount} / ${def.questions.length} ${locale === 'ru' ? 'ответов' : 'answered'}`
            : `${modeCopy.question} ${Math.min(index + 1, def.questions.length)} / ${def.questions.length}`}</span>
          <span role="status" aria-live="polite" className="hh-runner-save-state">{status}</span>
        </div>
      </header>

      <p className="hh-runner-instructions">{hasTraumaAdministration(def) ? (def.key === 'itq-adult' ? 'Follow the instructions for each section below.' : 'During the past month') : timeframe}</p>
      {hasTraumaAdministration(def) && <p lang="en">{def.safetyText}</p>}
      {def.instructions && <p className="hh-runner-instructions" lang={def.instrumentLocale}>{def.instructions}</p>}
      <Asrs6SourceNotice definition={def} startedAt={run.startedAt} locale={locale} />

      {mode === 'quick' ? (
        <div className="hh-quick-form" aria-label={locale === 'ru' ? 'Все вопросы теста' : 'All test questions'}>
          {def.questions.map((item, step) => (
            <fieldset className="hh-quick-question" key={item.id} disabled={busy || Boolean(operation.current) || Boolean(completion.current)}>
              <legend>
                <span className="hh-quick-number">{modeCopy.question} {step + 1} / {def.questions.length}</span>
                {def.key === 'hh-bach-flower-profile' && <span className="hh-kicker">{bachSectionName(item.section)}</span>}
                <TraumaSectionInstructions question={item} />
                <h2>{item.text}</h2>
              </legend>
              {def.key === 'cdc-hrqol-4' && item.id === 'hrqol4.04' && run.answers['hrqol4.02'] === 0 && run.answers['hrqol4.03'] === 0 && (
                <p className="hh-muted">{locale === 'ru' ? 'По правилам CDC, если физически и психологически нездоровых дней не было, здесь выберите 0.' : 'CDC guidance: if physical and mental unhealthy days were both 0, select 0 here.'}</p>
              )}
              <RunnerAnswerChoices definition={def} question={item}
                selected={run.answers[item.id]} onChoose={value => chooseAnswer(value, item.id)}
                locale={locale} disabled={busy || Boolean(operation.current) || Boolean(completion.current)} />
            </fieldset>
          ))}
          <p className="hh-quick-hint">{modeCopy.tap}</p>
        </div>
      ) : question ? (
        <fieldset className="hh-runner-question" disabled={busy || Boolean(operation.current) || Boolean(completion.current)}>
          <legend>
            {def.key === 'hh-bach-flower-profile' && <p className="hh-kicker">{bachSectionName(question.section)}</p>}
            <TraumaSectionInstructions question={question} />
            <h1>{question.text}</h1>
          </legend>
          {def.key === 'cdc-hrqol-4' && question.id === 'hrqol4.04' && run.answers['hrqol4.02'] === 0 && run.answers['hrqol4.03'] === 0 && (
            <p className="hh-muted">{locale === 'ru' ? 'По правилам CDC, если физически и психологически нездоровых дней не было, здесь выберите 0.' : 'CDC guidance: if physical and mental unhealthy days were both 0, select 0 here.'}</p>
          )}
          <RunnerAnswerChoices definition={def} question={question}
            selected={run.answers[question.id]} onChoose={value => chooseAnswer(value)}
            locale={locale} disabled={busy || Boolean(operation.current) || Boolean(completion.current)} />
        </fieldset>
      ) : (
        <div className="hh-runner-complete">
          <h1>{def.optionalContext.length ? c.optional : c.result}</h1>
          <p>{def.optionalContext.length ? c.skip : c.nonDiagnostic}</p>
        </div>
      )}

      {(mode === 'quick' ? allAnswered : isContext) && def.optionalContext.length > 0 && (
        <details className="hh-secondary hh-runner-context">
          <summary>{locale === 'ru' ? 'Добавить необязательный контекст' : 'Add optional context'}</summary>
          <div className="hh-form">
            {[
              ['current_focus', c.focus],
              ['trigger', c.trigger],
              ['what_helps', c.helps],
              ['desired_change', c.desiredChange],
              ['note', c.note],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  maxLength={1000}
                  value={context[key] || ''}
                  disabled={busy || Boolean(operation.current) || Boolean(completion.current)}
                  onChange={e => { setContext(value => ({ ...value, [key]: e.target.value })); setStatus(c.unsaved) }}
                />
              </label>
            ))}
          </div>
        </details>
      )}

      {error && (
        <div role="alert" className="hh-notice">
          <p>{message(error, c)}</p>
          {['REVISION_CONFLICT', 'CONFLICT', 'IMMUTABLE_RUN'].includes(error.code) ? (
            <button
              onClick={() => {
                operation.current = null
                load()
              }}
            >
              {c.reload}
            </button>
          ) : (
            <button disabled={busy} onClick={() => completion.current ? finish(completion.current.destination) : save()}>
              {c.retry}
            </button>
          )}
        </div>
      )}
      {(isContext || (mode === 'quick' && allAnswered) ||
        (mode === 'guided' && index === def.questions.length - 1 && allAnswered && !def.optionalContext.length)) && (
        <TestFinishActions locale={locale} courseMode={courseMode}
          disabled={busy || Boolean(operation.current) || Boolean(completion.current) || !allAnswered}
          onReport={() => finish('report')} onNext={() => finish('next')} />
      )}
      <div className="hh-actions hh-runner-actions">
        {mode !== 'quick' && (
          <button
            disabled={busy || index === 0 || Boolean(operation.current) || Boolean(completion.current)}
            onClick={() => save({}, index - 1)}
          >
            {c.back}
          </button>
        )}
        {!isContext && mode === 'guided' &&
          !(index === def.questions.length - 1 && allAnswered && !def.optionalContext.length) && (
          <button
            className="hh-primary"
            disabled={busy || run.answers[question.id] === undefined || Boolean(operation.current) || Boolean(completion.current)}
            onClick={next}
          >
            {c.next}
          </button>
        )}
        <button disabled={busy || Boolean(operation.current) || Boolean(completion.current)} onClick={exit}>
          {c.saveExit}
        </button>
      </div>
      <details className="hh-secondary">
        <summary>{c.decline}</summary>
        {showDiscard ? (
          <div>
            <p>{c.decline}?</p>
            <button disabled={busy} onClick={discard}>
              {c.delete}
            </button>
            <button onClick={() => setShowDiscard(false)}>{c.cancel}</button>
          </div>
        ) : (
          <button onClick={() => setShowDiscard(true)}>{c.decline}</button>
        )}
      </details>
      {(def.source?.copyright || def.source?.citation) && (
        <details className="hh-secondary hh-runner-methodology">
          <summary>{locale === 'ru' ? 'Источник и методика' : 'Source and methodology'}</summary>
          {def.source.copyright && <small>{def.source.copyright}</small>}
          {def.source.citation && <small>{def.source.citation}</small>}
          {def.source.url && <a href={def.source.url} target="_blank" rel="noopener noreferrer">{locale === 'ru' ? 'Открыть оригинал' : 'Open original source'}</a>}
        </details>
      )}
    </section>
  )
}
function profileNumber(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, '')
}
function profileDelta(value) {
  if (value === null || value === undefined) return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${numeric > 0 ? '+' : ''}${profileNumber(numeric)}`
}
function profileDashboardNextStep({ data, locale, nextStep }) {
  const ru = locale === 'ru'
  const root = `/${locale}/app`
  const draft = (data.runs || []).find((run) => ['draft', 'in_progress'].includes(run.status))

  if (draft) {
    const definition = getDefinitionById(draft.definitionId)
    const item = monitoringCatalogItem(definition.key)
    const title = item?.title?.[locale] || item?.title?.en || definition.title
    return {
      eyebrow: ru ? 'Продолжить' : 'Continue',
      title: ru ? `Закончить: ${title}` : `Finish: ${title}`,
      text: ru
        ? 'У вас есть незавершённый тест. Лучше закончить его, прежде чем начинать новый.'
        : 'You have an unfinished assessment. Finish it before starting another one.',
      action: ru ? 'Продолжить тест' : 'Continue test',
      href: `${root}/runs/${draft.id}`,
    }
  }

  const table = {
    state: {
      eyebrow: ru ? 'Рекомендуем сейчас' : 'Recommended now',
      title: ru ? 'Проверить текущее состояние' : 'Check your current state',
      text: ru
        ? 'Начните с короткого замера состояния — он создаст первую точку для дальнейшего сравнения.'
        : 'Start with a short current-state check. It creates a useful baseline for later comparison.',
      action: ru ? 'Начать мониторинг' : 'Start monitoring',
      href: `${root}/monitoring/hh-current-state`,
    },
    tendencies: {
      eyebrow: ru ? 'Рекомендуем дальше' : 'Recommended next',
      title: ru ? 'Добавить базовый профиль' : 'Add your baseline profile',
      text: ru
        ? 'Добавьте более устойчивые личностные показатели, чтобы профиль был не только про состояние сегодня.'
        : 'Add more stable personal measures so your profile is not based only on how you feel today.',
      action: ru ? 'Дополнить профиль' : 'Complete profile',
      href: `${root}/tests?mode=all`,
    },
    history: {
      eyebrow: ru ? 'Следующий полезный шаг' : 'Useful next step',
      title: ru ? 'Посмотреть динамику' : 'Review your changes',
      text: ru
        ? 'У вас уже есть базовые данные. Посмотрите историю и сравните повторные измерения.'
        : 'You already have useful baseline data. Review your history and compare repeat measurements.',
      action: ru ? 'Открыть динамику' : 'Open history',
      href: `${root}/history`,
    },
    report: {
      eyebrow: ru ? 'Новое для вас' : 'New for you',
      title: ru ? 'Открыть новый отчёт' : 'Open your new report',
      text: ru
        ? 'В кабинете есть непрочитанный материал от специалиста.'
        : 'There is an unread practitioner report waiting in your Cabinet.',
      action: ru ? 'Открыть отчёт' : 'Open report',
      href: `${root}${nextStep.href}`,
    },
    consultation: {
      eyebrow: ru ? 'Есть активное обращение' : 'Active request',
      title: ru ? 'Вернуться к консультации' : 'Return to your consultation',
      text: ru
        ? 'У вас уже есть открытый запрос. Можно посмотреть его статус и продолжить отсюда.'
        : 'You already have an open consultation request. Review its status and continue from here.',
      action: ru ? 'Открыть консультации' : 'Open consultations',
      href: `${root}/consultations`,
    },
    checkin: {
      eyebrow: ru ? 'Пора обновить данные' : 'Time for an update',
      title: ru ? 'Повторить текущий замер' : 'Repeat your current check',
      text: ru
        ? 'С момента прошлого измерения прошло достаточно времени — новый замер поможет увидеть динамику.'
        : 'Enough time has passed since your previous measurement. A new check can show meaningful change.',
      action: ru ? 'Повторить мониторинг' : 'Repeat monitoring',
      href: `${root}/monitoring/hh-current-state`,
    },
  }

  return table[nextStep.kind] || table.state
}

function ProfileActionHub({ data, locale, profile, nextStep }) {
  const ru = locale === 'ru'
  const root = `/${locale}/app`
  const resultCount = (data.results || []).length
  const requestCount = (data.requests || []).filter((request) => ['requested', 'contacted'].includes(request.status)).length
  const activeReports = (data.savedReports || []).filter((report) => report.available !== false).length
  const next = profileDashboardNextStep({ data, locale, nextStep })
  const latestResult = [...(data.results || [])].sort(
    (a, b) => Date.parse(b.measurementAt || 0) - Date.parse(a.measurementAt || 0),
  )[0]
  const latestLabel = latestResult
    ? dateLabel(latestResult.measurementAt, locale)
    : (ru ? 'пока нет' : 'none yet')

  const commonActions = ru
    ? [
        {
          id: 'state',
          group: 'monitor',
          title: 'Пройти бесплатный тест-анализ состояния и получить рекомендации',
          description: 'Короткий тест текущего состояния с результатом и понятным следующим шагом.',
          meta: 'Бесплатно · ~1 мин',
          href: `${root}/monitoring/hh-current-state`,
          image: '/images/holistic-house/video-posters/home-ru-v1.webp',
        },
        {
          id: 'recommendations',
          group: 'monitor',
          title: 'Подобрать персональную батарею тестов',
          description: 'Отметьте несколько важных зон и формат — система расставит подходящие тесты по приоритету.',
          meta: 'Персональный подбор',
          href: `${root}/tests?mode=recommendations`,
          image: '/images/holistic-house/video-posters/services-ru-v1.webp',
        },
        {
          id: 'portfolio',
          group: 'data',
          title: 'Портфель результатов',
          description: 'Графики, шкалы, сравнения и все измерения в одном месте.',
          meta: `Заполнено ${profile.coveragePercent}%`,
          href: `${root}/portfolio`,
          image: '/images/holistic-house/video-posters/homeopathy-ru-v1.webp',
        },
        {
          id: 'history',
          group: 'data',
          title: 'Динамика',
          description: 'Сравнить повторные замеры и изменения со временем.',
          meta: resultCount ? `${resultCount} результатов` : 'История появится после тестов',
          href: `${root}/history`,
          image: '/images/holistic-house/hero-olive-incense.webp',
        },
        {
          id: 'complete',
          group: 'grow',
          title: 'Дополнить профиль',
          description: 'Добавить недостающие слои через короткие или глубокие тесты.',
          meta: `${profile.coveredAxes.length} из 5 слоёв`,
          href: `${root}/tests?mode=all`,
          image: '/images/holistic-house/books-library.webp',
        },
        {
          id: 'consultations',
          group: 'support',
          title: 'Консультации',
          description: 'Обсудить результаты или вернуться к уже созданному обращению.',
          meta: requestCount ? `${requestCount} активных` : 'Связаться со специалистом',
          href: `${root}/consultations`,
          image: '/images/holistic-house/video-posters/services-ru-v1.webp',
        },
      ]
    : [
        {
          id: 'state',
          group: 'monitor',
          title: 'Take a free state analysis and get recommendations',
          description: 'A short current-state check with your result and a clear next step.',
          meta: 'Free · ~1 min',
          href: `${root}/monitoring/hh-current-state`,
          image: '/images/holistic-house/video-posters/home-en-v2.webp',
        },
        {
          id: 'recommendations',
          group: 'monitor',
          title: 'Build a personal test battery',
          description: 'Choose several priority areas and format preferences, then see the most relevant tests first.',
          meta: 'Personal selection',
          href: `${root}/tests?mode=recommendations`,
          image: '/images/holistic-house/video-posters/services-en-v2.webp',
        },
        {
          id: 'portfolio',
          group: 'data',
          title: 'Results portfolio',
          description: 'Charts, scales, comparisons and all measurements in one place.',
          meta: `${profile.coveragePercent}% complete`,
          href: `${root}/portfolio`,
          image: '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
        },
        {
          id: 'history',
          group: 'data',
          title: 'Changes over time',
          description: 'Compare repeat measurements and review your history.',
          meta: resultCount ? `${resultCount} results` : 'History appears after tests',
          href: `${root}/history`,
          image: '/images/holistic-house/hero-olive-incense.webp',
        },
        {
          id: 'complete',
          group: 'grow',
          title: 'Complete my profile',
          description: 'Add missing layers with short or in-depth assessments.',
          meta: `${profile.coveredAxes.length} of 5 layers`,
          href: `${root}/tests?mode=all`,
          image: '/images/holistic-house/books-library.webp',
        },
        {
          id: 'consultations',
          group: 'support',
          title: 'Consultations',
          description: 'Discuss results or return to an existing request.',
          meta: requestCount ? `${requestCount} active` : 'Talk to a practitioner',
          href: `${root}/consultations`,
          image: '/images/holistic-house/video-posters/services-en-v2.webp',
        },
      ]

  const actions = activeReports
    ? [
        ...commonActions,
        {
          id: 'reports',
          group: 'support',
          title: ru ? 'Мои отчёты' : 'My reports',
          description: ru
            ? 'Материалы и отчёты, которые вы сохранили от специалиста.'
            : 'Reports and materials you saved from your practitioner.',
          meta: ru ? `${activeReports} сохранено` : `${activeReports} saved`,
          href: `${root}/reports`,
          image: ru
            ? '/images/holistic-house/video-posters/homeopathy-ru-v1.webp'
            : '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
        },
      ]
    : commonActions

  const groups = ru
    ? [
        ['monitor', 'Сейчас'],
        ['data', 'Мои данные'],
        ['grow', 'Развивать профиль'],
        ['support', 'Поддержка'],
      ]
    : [
        ['monitor', 'Now'],
        ['data', 'My data'],
        ['grow', 'Build my profile'],
        ['support', 'Support'],
      ]

  return (
    <section className="hh-profile-dashboard" aria-labelledby="profile-dashboard-title">
      <div className="hh-profile-summary">
        <div>
          <span>{ru ? 'Профиль' : 'Profile'}</span>
          <strong>{profile.coveragePercent}%</strong>
          <small>{profile.coveredAxes.length} / 5 {ru ? 'слоёв' : 'layers'}</small>
        </div>
        <div>
          <span>{ru ? 'Результаты' : 'Results'}</span>
          <strong>{resultCount}</strong>
          <small>{ru ? 'сохранено' : 'saved'}</small>
        </div>
        <div>
          <span>{ru ? 'Последний замер' : 'Last check'}</span>
          <strong className="hh-profile-summary-date">{latestLabel}</strong>
          <small>{ru ? 'обновляется после теста' : 'updates after a test'}</small>
        </div>
      </div>

      <article className="hh-profile-next" aria-labelledby="profile-dashboard-title">
        <div className="hh-profile-next-copy">
          <p className="hh-kicker">{next.eyebrow}</p>
          <h2 id="profile-dashboard-title">{next.title}</h2>
          <p>{next.text}</p>
        </div>
        <Link className="hh-primary hh-profile-next-action" href={next.href} prefetch={false}>
          {next.action}
        </Link>
      </article>

      <div className="hh-profile-action-groups">
        {groups.map(([group, title]) => {
          const groupActions = actions.filter((action) => action.group === group)
          if (!groupActions.length) return null
          return (
            <section className="hh-profile-action-group" key={group}>
              <h3>{title}</h3>
              <div className="hh-profile-actions-grid">
                {groupActions.map((action) => (
                  <Link className="hh-profile-action-card" href={action.href} prefetch={false} key={action.id}>
                    <span className="hh-profile-action-photo" aria-hidden="true">
                      <Image alt="" fill sizes="(max-width: 760px) 76px, 96px" src={action.image} />
                    </span>
                    <span className="hh-profile-action-copy">
                      <strong>{action.title}</strong>
                      <span>{action.description}</span>
                      <small>{action.meta}</small>
                    </span>
                    <b aria-hidden="true">›</b>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

function readableScaleName(dimension, locale) {
  const raw = String(dimension?.sourceConstruct || dimension?.key || '').trim()
  if (raw && !/^[a-z_-]+[.][a-z0-9_.-]+$/i.test(raw)) return raw
  const localized = labelFor(dimension?.key || raw, locale)
  if (localized && localized !== (dimension?.key || raw)) return localized
  return raw.split('.').pop().replace(/[_-]+/g, ' ').replace(/^./, letter => letter.toUpperCase())
}

const INSIGHTS_CATEGORY_ICONS = {
  stress: Zap, anxiety: Heart, mood: Smile, sleep: Moon, body: Sun,
  relationships: Users, resources: Leaf, attention: Target, personality: Brain,
  function: Activity, meaning: Compass, 'wu-xing': Sparkles, other: ClipboardList,
}

function PortfolioPage({ data, locale }) {
  const ru = locale === 'ru'
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab') === 'dynamics' ? 'dynamics' : 'values'
  const [activeTab, setActiveTab] = useState(requestedTab)
  const [retakeBusy, setRetakeBusy] = useState(false)
  const [retakeError, setRetakeError] = useState('')
  const accountId = data.account?.id
  const retakeScope = useRef(null), retakeOperation = useRef(null)
  const retakeLifetime = useRef({ mounted: false, epoch: 0 })
  if (!retakeScope.current || retakeScope.current.accountId !== accountId ||
      retakeScope.current.tab !== activeTab || retakeScope.current.locale !== locale) {
    retakeScope.current = { accountId, tab: activeTab, locale }
    retakeOperation.current = null
  }
  const renderedRetakeScope = retakeScope.current
  useEffect(() => {
    retakeLifetime.current.mounted = true
    return () => { retakeLifetime.current.mounted = false; retakeLifetime.current.epoch += 1; retakeOperation.current = null }
  }, [])
  useEffect(() => { setRetakeBusy(false); setRetakeError('') }, [accountId, activeTab, locale])
  useEffect(() => { setActiveTab(requestedTab) }, [requestedTab])
  const [recommendationScrollRequest, setRecommendationScrollRequest] = useState(0)
  const [analysisScrollRequest, setAnalysisScrollRequest] = useState(0)
  useEffect(() => {
    if (!recommendationScrollRequest || activeTab !== 'values') return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('hh-portrait-recommendations')
      if (!target) return
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      target.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [recommendationScrollRequest, activeTab])

  useEffect(() => {
    if (!analysisScrollRequest || activeTab !== 'values') return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('hh-insights-title')
      if (!target) return
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      target.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [analysisScrollRequest, activeTab])
  const retakeDefinitions = useMemo(() => {
    const definitions = new Map()
    for (const result of data.results || []) {
      if (!result.definitionId || definitions.has(result.definitionId)) continue
      try {
        const definition = getDefinitionById(result.definitionId)
        if (definition) definitions.set(result.definitionId, definition)
      } catch { /* Old or retired assessments remain readable but cannot be retaken. */ }
    }
    return definitions
  }, [data.results])
  function chooseView(next) {
    if (next === activeTab) return
    retakeScope.current = null; retakeOperation.current = null
    setActiveTab(next)
    setRetakeError('')
    const query = new URLSearchParams(searchParams.toString())
    if (next === 'dynamics') query.set('tab', 'dynamics')
    else query.delete('tab')
    router.replace('/' + locale + '/app/portfolio' + (query.toString() ? '?' + query.toString() : ''), { scroll: false })
  }
  async function retakeTest(definitionId) {
    const definition = retakeDefinitions.get(definitionId)
    const scope = renderedRetakeScope, epoch = retakeLifetime.current.epoch
    const isCurrent = () => retakeLifetime.current.mounted && retakeLifetime.current.epoch === epoch &&
      retakeScope.current === scope && scope.accountId === accountId
    if (!definition || !accountId || !isCurrent() || retakeOperation.current) return
    const operation = {}; retakeOperation.current = operation
    setRetakeBusy(true)
    setRetakeError('')
    try {
      const draft = (data.runs || []).find(run =>
        run.definitionId === definitionId && ['draft', 'in_progress'].includes(run.status))
      const run = draft || await appFetch('runs', {
        definitionKey: definition.key,
        definitionVersion: definition.version,
        instrumentLocale: definition.instrumentLocale,
        operationId: crypto.randomUUID(),
      }, 'POST', { accountId })
      if (!isCurrent() || retakeOperation.current !== operation) return
      const plan = data.activeTestPlan
      const planSuffix = plan?.status === 'active' && plan.definitionIds?.includes(definitionId)
        ? '&plan=' + encodeURIComponent(plan.id) : ''
      router.push('/' + locale + '/app/runs/' + encodeURIComponent(run.id) + '?mode=quick' + planSuffix)
    } catch (cause) {
      if (!isCurrent() || retakeOperation.current !== operation) return
      retakeOperation.current = null
      setRetakeError((ru ? 'Не удалось открыть тест повторно.' : 'Could not open the retake.') +
        ' (' + (cause.code || 'SERVICE_UNAVAILABLE') + ')')
      setRetakeBusy(false)
    }
  }
  const allGroups = assessmentHistoryGroups(data.results || [], [], locale).filter(group => group.latest)
  const summary = buildInsightsSummary(allGroups)
  const [selectedCategories, setSelectedCategories] = useState([])
  const entriesByKey = useMemo(() => new Map(
    buildExplorerEntries({ locale, audience: 'account' }).map((entry) => [entry.key, entry]),
  ), [locale])
  const groups = allGroups.map(group => {
    const history = group.history
    const { current, previous } = periodComparison(history)
    return { ...group, latest: current, periodPrior: previous, history, count: history.length }
  }).filter(group => group.latest)
  const { counts: categoryCounts, sections: categorySections } = buildInsightsCategorySections(groups, entriesByKey, selectedCategories)
  const categoryFilters = INSIGHTS_TEST_CATEGORIES.filter((category, index) =>
    index < HOME_TEST_TOPICS.length || categoryCounts[category.key] > 0 || selectedCategories.includes(category.key))
  const activeFilters = selectedCategories.length
  const visibleCount = categorySections.reduce((sum, section) => sum + section.groups.length, 0)
  function toggleCategory(key) {
    setSelectedCategories((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])
  }
  const profile = profileCompletionRecommendations({ snapshot: data.snapshot, results: data.results, locale })
  const dimensions = data.snapshot?.dimensions || []
  const [selected, setSelected] = useState(null)

  return (
    <section className="hh-insights-page"
      aria-labelledby={activeTab === 'values' ? 'hh-insights-title' : 'hh-test-dynamics-title'}
      data-testid="completed-test-insights">
      {/* Put the same saved-result portrait at the start of Insights, open by default. */}
      <details className="hh-insights-portrait" open data-testid="insights-psychological-portrait">
        <summary className="hh-insights-portrait-toggle">
          <Brain size={20} aria-hidden="true" />
          <strong>{ru ? 'Мой психологический портрет' : 'My psychological portrait'}</strong>
          <span className="hh-insights-portrait-collapse">{ru ? 'Свернуть' : 'Collapse'}</span>
          <span className="hh-insights-portrait-expand">{ru ? 'Раскрыть' : 'Expand'}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <TestExplorerVisual locale={locale} coverage={coverageForFocus([])}
          portrait={buildPsychPortrait(data.results || [])}
          portraitActions={<nav className="hh-portrait-quick-actions"
            aria-label={ru ? 'Действия с психологическим портретом' : 'Psychological portrait actions'}
            data-testid="portrait-quick-actions">
            <Link href={`/${locale}/app/tests?profile=missing`} prefetch={false}
              className="hh-portrait-quick-primary" data-testid="portrait-completion-action">
              <ClipboardList size={18} aria-hidden="true" />
              {ru ? 'Тесты' : locale === 'es' ? 'Tests' : 'Tests'}
            </Link>
            <button type="button" className="hh-portrait-quick-secondary hh-portrait-quick-analyses"
              data-testid="portrait-analyses-action"
              onClick={() => {
                chooseView('values')
                setAnalysisScrollRequest(current => current + 1)
              }}>
              <BarChart3 size={18} aria-hidden="true" />
              {ru ? 'Анализы' : locale === 'es' ? 'Análisis' : 'Analyses'}
            </button>
            <button type="button" className="hh-portrait-quick-secondary"
              data-testid="portrait-recommendations-action"
              onClick={() => {
                chooseView('values')
                setRecommendationScrollRequest(current => current + 1)
              }}>
              <Sparkles size={18} aria-hidden="true" />
              {ru ? 'Рекомендации' : 'Recommendations'}
            </button>
          </nav>} />
      </details>
      {/* Programme is part of Reports, independently available in either Values or Dynamics. */}
      <DevelopmentProgram accountId={accountId} locale={locale} results={data.results || []} />
      <nav className="hh-insights-view-tabs" role="tablist"
        aria-label={ru ? 'Представление результатов' : 'Results view'} data-results-view-tabs>
        {[
          ['values', ru ? 'Значения' : 'Values'],
          ['dynamics', ru ? 'Динамика' : 'Dynamics'],
        ].map(([key, label]) => <button key={key} type="button"
          id={'hh-results-tab-' + key} role="tab"
          aria-selected={activeTab === key} aria-controls={'hh-results-panel-' + key}
          tabIndex={activeTab === key ? 0 : -1}
          onClick={() => chooseView(key)}
          onKeyDown={event => {
            if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return
            event.preventDefault()
            const next = event.key === 'Home' ? 'values' : event.key === 'End' ? 'dynamics'
              : key === 'values' ? 'dynamics' : 'values'
            chooseView(next)
            event.currentTarget.parentElement?.querySelector('#hh-results-tab-' + next)?.focus()
          }}>
          {key === 'values' ? <ClipboardList size={18} aria-hidden="true" /> : <Activity size={18} aria-hidden="true" />}
          {label}
        </button>)}
      </nav>
      {activeTab === 'dynamics'
        ? <div role="tabpanel" id="hh-results-panel-dynamics" aria-labelledby="hh-results-tab-dynamics">
            <TestDynamics results={data.results || []} locale={locale}
              busy={retakeBusy} canRetake={id => retakeDefinitions.has(id)}
              onRetake={retakeTest} />
            {retakeError && <p role="alert" className="hh-insights-retake-error">{retakeError}</p>}
          </div>
        : <div role="tabpanel" id="hh-results-panel-values" aria-labelledby="hh-results-tab-values">
      <header className="hh-insights-intro">
        <p className="hh-kicker">{ru ? 'Кабинет · Insights' : 'Dashboard · Insights'}</p>
        <h1 id="hh-insights-title" tabIndex={-1}>{ru ? 'Мои результаты' : 'My results'}</h1>
        <p>{ru ? 'Ваши пройденные тесты, результаты и динамика.' : 'Your completed tests, scores and trends.'}</p>
      </header>
      <details className="hh-insights-portrait-details" data-insights-detailed-scales>
        <summary><Brain size={18} aria-hidden="true" />{ru ? 'Подробные шкалы и инструменты' : 'Detailed scales and profile tools'}<ChevronDown size={17} aria-hidden="true" /></summary>
        <Portrait data={data} locale={locale} />
      </details>
      <dl className="hh-insights-quickstats" data-testid="insights-summary" aria-label={ru ? 'Общая статистика тестов' : 'All-time test statistics'}>
        <div><dt>{ru ? 'Пройдено тестов' : 'Tests completed'}</dt><dd>{summary.tests}</dd></div>
        <div><dt>{ru ? 'Всего прохождений' : 'Total sessions'}</dt><dd>{summary.attempts}</dd></div>
        <div><dt>{ru ? 'Измерено шкал' : 'Measured scales'}</dt><dd>{summary.scales}</dd></div>
      </dl>
      {summary.latestAt && <p className="hh-insights-last-date">{ru ? 'Последний тест' : 'Last test'}: <time dateTime={summary.latestAt}>{shortDateLabel(summary.latestAt, locale)}</time></p>}
      <details className="hh-insights-filter-disclosure" data-testid="insights-filters">
        <summary className="hh-insights-filter-toggle">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <strong>{ru ? 'Фильтры' : 'Filters'}</strong>
          {activeFilters > 0 && <span className="hh-insights-active-count">{activeFilters}</span>}
          <small>{selectedCategories.length ? (ru ? 'Темы выбраны' : 'Topics selected') : (ru ? 'Все темы' : 'All topics')}</small>
          <ChevronDown className="hh-insights-filter-chevron" size={17} aria-hidden="true" />
        </summary>
        <div className="hh-insights-filter-panel">
          <div className="hh-insights-filter-heading">
            <span>{ru ? 'Категории' : 'Categories'}</span>
            {activeFilters > 0 && <button type="button" className="hh-insights-reset"
              onClick={() => setSelectedCategories([])}>
              {ru ? 'Сбросить' : 'Reset filters'}</button>}
          </div>
      <div className="hh-insights-category-filters" role="group" aria-label={ru ? 'Фильтр по категориям тестов' : 'Filter completed tests by category'} data-testid="insights-category-filters">
        <button type="button" className="hh-insights-category-filter" aria-pressed={selectedCategories.length === 0} onClick={() => setSelectedCategories([])}>
          <ClipboardList size={20} aria-hidden="true" />
          <span>{ru ? 'Все категории' : 'All categories'}</span>
          <small>{groups.length}</small>
        </button>
        {categoryFilters.map((category) => {
          const Icon = INSIGHTS_CATEGORY_ICONS[category.key] || ClipboardList
          return <button type="button" key={category.key} className="hh-insights-category-filter"
            aria-pressed={selectedCategories.includes(category.key)} onClick={() => toggleCategory(category.key)}>
            <Icon size={20} aria-hidden="true" />
            <span>{category[locale] || category.en}</span>
            <small>{categoryCounts[category.key]}</small>
          </button>
        })}
      </div>
        </div>
      </details>
      {activeFilters > 0 && <p className="hh-insights-filter-status" role="status">
        {ru ? 'Показано тестов:' : 'Showing tests:'} {visibleCount} / {summary.tests}
      </p>}
      {groups.length || selectedCategories.length > 0 ? (
        <div className="hh-insights-categories">
          {categorySections.map(({ category, groups: categoryGroups }) => {
            const CategoryIcon = INSIGHTS_CATEGORY_ICONS[category.key] || ClipboardList
            return <section className="hh-insights-category" key={category.key} aria-label={category[locale] || category.en}>
              <header className="hh-insights-category-heading">
                <div className="hh-insights-category-heading-title">
                  <span className="hh-insights-category-icon"><CategoryIcon size={22} aria-hidden="true" /></span>
                  <h2>{category[locale] || category.en}</h2>
                </div>
                <div className="hh-insights-category-tools">
                  <span>{categoryGroups.length} {ru ? 'тестов' : 'tests'}</span>
                  <Link className="hh-insights-add-test" prefetch={false}
                    href={'/' + locale + '/app/tests?explore=1&filters=topics&category=' + encodeURIComponent(category.key)}
                    aria-label={(ru ? 'Добавить тест по теме ' : 'Add test in ') + (category[locale] || category.en)}>
                    <span aria-hidden="true">+</span>{ru ? 'Тест' : 'Add test'}
                  </Link>
                </div>
              </header>
              {categoryGroups.length === 0 && <p className="hh-insights-category-empty">
                {ru ? 'В этой категории пока нет результатов. Можно добавить подходящий тест.' : 'No results in this category yet. You can choose a test for this topic.'}
              </p>}
              <div className="hh-insights-test-list">
                {categoryGroups.map(group => {
            const latest = group.latest
            const report = buildAssessmentResultReport(latest, locale)
            const first = report.sections[0]
            const main = first?.bandBasis === 'unavailable' ? null : latest.dimensions?.[0]
            return (
              <article className="hh-insights-test-card" key={group.key}>
                <Link href={`/${locale}/app/results/${encodeURIComponent(latest.id)}`} className="hh-insights-test-link" prefetch={false}
                  aria-label={(ru ? 'Открыть отчёт и рекомендации: ' : 'Open analysis & recommendations: ') + group.title}>
                  <div className="hh-insights-test-gauge"><ScoreGauge dimension={main} locale={locale} compact result={latest}
                    showLegend={false} showScaleNote={false} /></div>
                  <div className="hh-insights-test-body">
                    <div className="hh-insights-test-meta">
                      <time dateTime={latest.measurementAt}>{shortDateLabel(latest.measurementAt, locale)}</time>
                    </div>
                    <h2>{group.title}</h2>
                    {first?.band && <p className="hh-insights-test-summary">{first.band}</p>}
                    {main && <ScoreTrend current={latest} previous={group.periodPrior} dimensionKey={main.key} locale={locale} compact />}
                    {latest.dimensions?.length > 1 &&
                      <p className="hh-insights-test-scores">+ {latest.dimensions.length - 1} {ru ? 'дополнительных шкал' : 'more scales'}</p>}
                    <strong className="hh-insights-open">{ru ? 'Отчёт и рекомендации' : 'View report & guidance'} <span aria-hidden="true">→</span></strong>
                  </div>
                </Link>
                {group.count > 1 && (
                  <details className="hh-insights-history">
                    <summary>{ru ? `История прохождений (${group.count})` : `Assessment history (${group.count})`}</summary>
                    <ul>{group.history.map(attempt => <li key={attempt.id}>
                      <time dateTime={attempt.measurementAt}>{dateLabel(attempt.measurementAt, locale)}</time>
                      <Link href={`/${locale}/app/results/${encodeURIComponent(attempt.id)}`} prefetch={false}>{ru ? 'Посмотреть отчёт' : 'View report'}</Link>
                    </li>)}</ul>
                  </details>
                )}
              </article>
            )
                })}
              </div>

            </section>
          })}
        </div>
      ) : (
        <div className="hh-insights-empty hh-panel">
          <h2>{allGroups.length
            ? (ru ? 'Нет тестов по выбранным темам' : 'No assessments for these topics')
            : (ru ? 'Отчётов пока нет' : 'No reports yet')}</h2>
          <p>{allGroups.length
            ? (ru ? 'Попробуйте изменить категории — результаты сохранены.' : 'Try other topic categories; your results are still saved.')
            : (ru ? 'Завершите первый тест — здесь появятся показатели и рекомендации.' : 'Finish your first assessment to see your gauges and recommendations here.')}</p>
          {allGroups.length
            ? <button type="button" onClick={() => setSelectedCategories([])}>{ru ? 'Показать все категории' : 'Show all categories'}</button>
            : <Link href={`/${locale}/app/tests?explore=1&filters=topics`} className="hh-primary">{ru ? 'Выбрать тест' : 'Choose a test'}</Link>}
        </div>
      )}

      {allGroups.length > 0 && <p className="hh-insights-scale-note">{ru ? 'Показатели относятся к отдельным шкалам, а не к проценту здоровья.' : 'Scores reflect individual scales, not an overall health percentage.'}</p>}
      <PortraitRecommendations results={data.results || []} locale={locale} />
      {allGroups.length > 0 && (
        <details className="hh-insights-export">
          <summary>{ru ? 'Скачать общий отчёт по всем тестам (PDF)' : 'Download a complete PDF report'}</summary>
          <ClientReportActions data={data} locale={locale} />
        </details>
      )}
      <div className="hh-insights-links">
        <Link href={`/${locale}/app/portfolio?tab=dynamics`} prefetch={false}>{ru ? 'Динамика тестов' : 'Test dynamics'}</Link>
        <Link href={`/${locale}/app/tests?explore=1&filters=topics`} prefetch={false}>{ru ? 'Пройти ещё тест' : 'Take another test'}</Link>
      </div>

      {allGroups.length > 0 && (
        <details className="hh-insights-advanced">
          <summary>{ru ? 'Дополнительно: общие графики и таблица измерений' : 'Advanced: combined charts and measurements'}</summary>
          <ProfileOverview profile={profile} locale={locale} results={data.results} />
          {dimensions.length > 0 && (
            <div className="hh-insights-advanced-metrics">
              <h2>{ru ? 'Все измеренные шкалы' : 'All recorded scales'}</h2>
              <div className="hh-metrics">
                {dimensions.map(d => <MetricCard key={`${d.sourceDefinitionId}::${d.key}`} dimension={d} locale={locale} onSelect={setSelected} />)}
              </div>
              <PortraitGuide locale={locale} dimensions={dimensions} />
              <LatestChange locale={locale} results={data.results} />
            </div>
          )}
          {selected && (
            <div className="hh-panel hh-detail">
              <button type="button" onClick={() => setSelected(null)}>{ru ? 'Закрыть' : 'Close'}</button>
              <h2>{readableScaleName(selected, locale)}</h2>
              <p>{explanationFor(selected.key, locale)}</p>
              <Link href={`/${locale}/app/results/${selected.sourceResultId}`} prefetch={false}>{ru ? 'Полный отчёт' : 'Full report'}</Link>
            </div>
          )}
        </details>
      )}
        </div>}
    </section>
  )
}

function ProfileOverview({ profile, locale, results = [] }) {
  const ru = locale === 'ru'
  const axisCopy = {
    state: ru ? 'Состояние' : 'State',
    symptoms: ru ? 'Симптомы и нагрузка' : 'Symptoms & load',
    function: ru ? 'Функционирование' : 'Functioning',
    resources: ru ? 'Ресурсы' : 'Resources',
    trait: ru ? 'Личностные особенности' : 'Personality',
  }
  const axisOrder = new Map(Object.keys(axisCopy).map((key, index) => [key, index]))
  const rows = profile.rows.map(row => ({ ...row, screening: profileScreeningPresentation(row, results, locale) })).sort(
    (a, b) =>
      (axisOrder.get(a.dimensionClass) ?? 99) - (axisOrder.get(b.dimensionClass) ?? 99) ||
      String(a.sourceConstruct || a.key).localeCompare(String(b.sourceConstruct || b.key)),
  )

  return (
    <section className="hh-profile-overview" aria-labelledby="profile-overview-title">
      <header className="hh-profile-overview-head">
        <div>
          <p className="hh-kicker">{ru ? 'Портфель результатов' : 'Results portfolio'}</p>
          <h2 id="profile-overview-title">
            {ru ? 'Все результаты в одной схеме' : 'All your results in one view'}
          </h2>
          <p>
            {ru
              ? 'Последние результаты по всем доступным шкалам собраны вместе. Предыдущее значение появляется только тогда, когда версия теста и сама шкала совместимы.'
              : 'Your latest measurements across available scales are brought together here. A previous value appears only when the test version and scale are compatible.'}
          </p>
        </div>
        <div className="hh-profile-coverage" aria-label={ru ? 'Заполненность профиля' : 'Profile coverage'}>
          <strong>{profile.coveragePercent}%</strong>
          <span>{profile.coveredAxes.length} / 5 {ru ? 'слоёв' : 'layers'}</span>
        </div>
      </header>

      <div className="hh-profile-progress" aria-hidden="true">
        <i style={{ width: `${profile.coveragePercent}%` }} />
      </div>

      <section className="hh-profile-map" aria-labelledby="profile-map-title">
        <div className="hh-profile-section-heading">
          <div>
            <p className="hh-kicker">{ru ? 'График' : 'Profile map'}</p>
            <h3 id="profile-map-title">{ru ? 'Последнее и предыдущее' : 'Latest vs previous'}</h3>
          </div>
          <p>
            {ru
              ? 'Непрерывные шкалы показаны на собственной позиции 0–100 только для графика. Скрининговый подсчёт ASRS показан отдельным числом без процентной полосы. Это не общий балл здоровья.'
              : 'Continuous scales are mapped to their own 0–100 position for visualization only. The ASRS screening count is shown separately without a percentage bar. This is not a combined health score.'}
          </p>
        </div>
        {rows.length ? (
          <div className="hh-profile-chart-list">
            {rows.map((row) => (
              <div className="hh-profile-chart-row" key={`${row.sourceDefinitionId}::${row.key}`}>
                <div className="hh-profile-chart-label">
                  <small>{axisCopy[row.dimensionClass] || row.dimensionClass}</small>
                  <strong>{readableScaleName(row, locale)}</strong>
                </div>
                {row.screening ? (
                  <span data-screening-count data-screening-verified={row.screening.verified}>{row.screening.label}</span>
                ) : Number.isFinite(row.currentPercent) ? <div
                  className="hh-profile-chart-track"
                  role="img"
                  aria-label={
                    `${readableScaleName(row, locale)}: ${profileNumber(row.value)} / ${row.max}`
                  }
                >
                  <i style={{ width: `${row.currentPercent}%` }} />
                  {Number.isFinite(row.priorPercent) && (
                    <b
                      style={{ left: `${row.priorPercent}%` }}
                      title={
                        ru
                          ? `Предыдущее: ${profileNumber(row.priorValue)} / ${row.max}`
                          : `Previous: ${profileNumber(row.priorValue)} / ${row.max}`
                      }
                    />
                  )}
                </div> : <span>{ru ? 'Позиция недоступна' : 'Position unavailable'}</span>}
                <div className="hh-profile-chart-values">
                  <strong>{profileNumber(row.value)} / {row.max}</strong>
                  <span>
                    {row.priorValue !== null
                      ? `${ru ? 'было' : 'was'} ${profileNumber(row.priorValue)} · ${profileDelta(row.delta)}`
                      : ru
                        ? 'первый замер'
                        : 'first measurement'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="hh-fine">
            {ru ? 'После первого теста здесь появится сводный график.' : 'Your combined chart will appear after the first completed check.'}
          </p>
        )}
      </section>

      <section className="hh-profile-table-section" aria-labelledby="profile-table-title">
        <div className="hh-profile-section-heading">
          <div>
            <p className="hh-kicker">{ru ? 'Таблица' : 'Table'}</p>
            <h3 id="profile-table-title">{ru ? 'Все шкалы' : 'All measurements'}</h3>
          </div>
          <p>
            {ru
              ? 'В таблице остаются исходные баллы каждой шкалы, дата последнего замера и корректное сравнение с предыдущим.'
              : 'The table keeps each scale’s original score, latest date and a compatible comparison with the previous measurement.'}
          </p>
        </div>
        {rows.length ? (
          <div className="hh-profile-table-wrap">
            <table className="hh-profile-table">
              <thead>
                <tr>
                  <th>{ru ? 'Показатель' : 'Measure'}</th>
                  <th>{ru ? 'Последнее' : 'Latest'}</th>
                  <th>{ru ? 'Предыдущее' : 'Previous'}</th>
                  <th>{ru ? 'Разница' : 'Difference'}</th>
                  <th>{ru ? 'Дата' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const definition = getDefinitionById(row.sourceDefinitionId)
                  return (
                    <tr key={`${row.sourceDefinitionId}::${row.key}`}>
                      <th scope="row">
                        <small>{axisCopy[row.dimensionClass] || row.dimensionClass}</small>
                        <strong>{readableScaleName(row, locale)}</strong>
                        <span>{definition.title || definition.key}</span>
                      </th>
                      <td><strong>{profileNumber(row.value)}</strong><small>{row.min}–{row.max}</small></td>
                      <td>
                        {row.priorValue !== null ? (
                          <>
                            <strong>{profileNumber(row.priorValue)}</strong>
                            <small>{row.priorMeasurementAt ? dateLabel(row.priorMeasurementAt, locale) : ''}</small>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td>{row.delta !== null ? <strong>{profileDelta(row.delta)}</strong> : <span>—</span>}</td>
                      <td><time dateTime={row.measurementAt}>{dateLabel(row.measurementAt, locale)}</time></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hh-fine">{ru ? 'Пока нет завершённых тестов.' : 'No completed tests yet.'}</p>
        )}
      </section>

      <section className="hh-profile-recommendations" aria-labelledby="profile-recommendations-title">
        <div className="hh-profile-section-heading">
          <div>
            <p className="hh-kicker">{ru ? 'Что ещё пройти' : 'What to add next'}</p>
            <h3 id="profile-recommendations-title">
              {profile.complete
                ? ru ? 'Основные слои профиля собраны' : 'Core profile layers are covered'
                : ru ? 'Тесты, которые лучше всего достроят профиль' : 'Tests that best complete your profile'}
            </h3>
          </div>
          <p>
            {profile.complete
              ? ru
                ? 'Обязательных следующих тестов нет. Повторные замеры нужны только для наблюдения динамики.'
                : 'There is no required next test. Repeat measurements are useful only when you want to track change.'
              : ru
                ? 'Приоритет учитывает, сколько недостающих слоёв добавит тест. Не нужно проходить все тесты подряд.'
                : 'Priority reflects how many missing layers a test adds. You do not need to take every test.'}
          </p>
        </div>
        {profile.recommendations.length ? (
          <div className="hh-profile-recommendation-grid">
            {profile.recommendations.map((recommendation, index) => (
              <article key={recommendation.key}>
                <div>
                  <small>{ru ? `Приоритет ${index + 1}` : `Priority ${index + 1}`}</small>
                  <h4>{recommendation.item.title[locale] || recommendation.item.title.en}</h4>
                  <p>{recommendation.reason}</p>
                  <span>
                    {recommendation.item.questionCount} {ru ? 'вопросов' : 'questions'} · ~{recommendation.item.durationMinutes} {ru ? 'мин' : 'min'}
                    {recommendation.item.instrumentLocale === 'en' && locale === 'ru' ? ' · EN' : ''}
                  </span>
                </div>
                <Link
                  className="hh-primary"
                  href={`/${locale}/app/monitoring/${recommendation.key}`}
                  prefetch={false}
                >
                  {ru ? 'Открыть тест' : 'Open test'}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="hh-profile-complete">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{ru ? 'Профиль можно развивать через динамику' : 'Your profile can now grow through history'}</strong>
              <p>
                {ru
                  ? 'Следующий полезный шаг — повторять совместимые шкалы со временем и смотреть изменения.'
                  : 'The next useful step is to repeat compatible scales over time and compare changes.'}
              </p>
            </div>
          </div>
        )}
      </section>
    </section>
  )
}

function MetricCard({ dimension, locale, onSelect }) {
  const c = COPY[locale],
    def = getDefinitionById(dimension.sourceDefinitionId)
  return (
    <button className="hh-metric" onClick={() => onSelect(dimension)}>
      <span>{readableScaleName(dimension, locale)}</span>
      <strong>
        {dimension.value}
        <small> / {dimension.max}</small>
      </strong>
      {dimension.displayKind === 'screening-count' || dimension.key === 'symptoms.asrs6.shaded_count' ? (
        <span data-screening-count>{locale === 'ru' ? 'Скрининговый подсчёт; порог 4. Не шкала тяжести.' : 'Screening count; threshold 4. Not a severity scale.'}</span>
      ) : <span className="hh-meter" aria-hidden="true">
        <i
          style={{
            width: `${(100 * (dimension.value - dimension.min)) / (dimension.max - dimension.min)}%`,
          }}
        />
      </span>}
      <small>
        {dateLabel(dimension.measurementAt, locale)} · {def.instrumentLocale.toUpperCase()}
      </small>
      {!dimension.remeasured && <small>{c.oldMeasure}</small>}
      <em>{c.details} →</em>
    </button>
  )
}
function Portrait({ data, locale }) {
  const c = COPY[locale]
  const router = useRouter()
  const root = '/' + locale + '/app'
  const dimensions = data.snapshot?.dimensions || []
  const nextStep = getPortraitNextStep({
    ...data,
    dimensions: dimensions.map((dimension) => {
      const result = data.results.find((candidate) => candidate.id === dimension.sourceResultId)
      return result
        ? { ...dimension, measurementAt: result.measurementAt, suggestedRepeatDays: getDefinitionById(result.definitionId)?.suggestedRepeatDays }
        : dimension
    }),
  })
  const profile = profileCompletionRecommendations({ snapshot: data.snapshot, results: data.results, locale })

  async function beginSelectedTest(item) {
    const run = item.runId ? { id: item.runId } : await appFetch('runs', {
      definitionKey: item.definitionKey,
      definitionVersion: item.definitionVersion,
      instrumentLocale: item.instrumentLocale,
      operationId: crypto.randomUUID(),
    })
    const active = data.activeTestPlan
    const planSuffix = active?.definitionIds?.includes(item.id)
      ? '?plan=' + encodeURIComponent(active.id) : ''
    router.push(root + '/runs/' + encodeURIComponent(run.id) + planSuffix)
  }

  return (
    <section data-profile-page>
      <div className="hh-heading hh-profile-heading">
        <p className="hh-kicker">
          {data.account.displayName
            ? (locale === 'ru' ? 'Здравствуйте, ' : 'Hello, ') + data.account.displayName
            : 'Holistic House'}
        </p>
        <h1>{c.portrait}</h1>
        <p>{locale === 'ru'
          ? 'Ваш психологический портрет: измеренные шкалы, ожидающие тесты и понятные следующие шаги.'
          : 'Your psychological portrait: measured scales, selected tests still to complete and clear next steps.'}</p>
        <p className="hh-fine">{c.private}</p>
      </div>

      <details className="hh-domain-psych-details" data-profile-deep-dive>
        <summary>{locale === 'ru' ? 'Подробные шкалы, непройденные тесты и инструменты' : 'Detailed scales, pending tests and profile tools'}<ChevronDown size={17} aria-hidden="true" /></summary>
      <ProfileAssessmentOverview data={data} locale={locale} onBeginTest={beginSelectedTest} showPortrait={false}>
        <ProfileActionHub data={data} locale={locale} profile={profile} nextStep={nextStep} />
        {data.practitioner && <OwnerTools locale={locale} />}
        <ReportsFromAndy data={data} locale={locale} />
        <ClientMaterialsFromAndy locale={locale} />
      </ProfileAssessmentOverview>
      </details>
    </section>
  )
}
function OwnerTools({ locale }) {
  const ru = locale === 'ru'
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const actions = [
    ['clients', ru ? 'Клиенты' : 'Clients', ru ? 'База клиентов, история и документы.' : 'Client database, history and documents.'],
    ['consultation', ru ? 'Новая консультация' : 'New consultation', ru ? 'Клиент → назначение → квитанция или счёт.' : 'Client → recommendation → receipt or invoice.'],
    ['recommendation', ru ? 'Рекомендация / рецепт' : 'Recommendation / prescription', ru ? 'Создать отдельный документ назначения.' : 'Create a standalone recommendation document.'],
    ['payment', ru ? 'Квитанция / счёт' : 'Receipt / Invoice', ru ? 'Создать отдельный платёжный документ.' : 'Create a standalone payment document.'],
  ]

  async function open(destination) {
    if (busy) return
    setBusy(destination)
    setError('')
    try {
      const result = await appFetch('practitioner/open', { destination })
      window.location.assign(result.redirectUrl)
    } catch {
      setBusy('')
      setError(ru ? 'Не удалось открыть рабочий кабинет. Попробуйте ещё раз.' : 'Practitioner tools could not be opened. Please retry.')
    }
  }

  return (
    <section className="hh-panel hh-owner-tools" aria-labelledby="owner-tools-title">
      <div className="hh-owner-tools-heading">
        <div>
          <p className="hh-kicker">{ru ? 'Практика' : 'Practice'}</p>
          <h2 id="owner-tools-title">{ru ? 'Кабинет практика' : 'Practitioner tools'}</h2>
          <p>{ru ? 'Клиенты, назначения, квитанции и счета из вашей существующей базы.' : 'Clients, recommendations, receipts and invoices from your existing practice database.'}</p>
        </div>
        <button className="hh-owner-cabinet-link" type="button" disabled={Boolean(busy)} onClick={() => open('cabinet')}>
          {ru ? 'Весь кабинет' : 'Open cabinet'}
        </button>
      </div>
      <div className="hh-owner-tools-grid">
        {actions.map(([id, title, description]) => (
          <button type="button" key={id} disabled={Boolean(busy)} onClick={() => open(id)}>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        ))}
      </div>
      {error && <p className="hh-owner-tools-error" role="alert">{error}</p>}
    </section>
  )
}
function PortraitGuide({ locale, dimensions = [] }) {
  const c = COPY[locale]
  const complete = (kind) => dimensions.some((dimension) => dimension.dimensionClass === kind)
  return (
    <section className="hh-portrait-guide" aria-labelledby="portrait-guide-title">
      <h2 id="portrait-guide-title">{c.guideTitle}</h2>
      <ul>
        <li data-state={complete('state') ? 'complete' : 'current'}><strong>{c.state}</strong> — {c.guideState}</li>
        <li data-state={complete('trait') ? 'complete' : complete('state') ? 'current' : 'future'}><strong>{c.personality}</strong> — {c.guideTendencies}</li>
        <li><strong>{c.history}</strong> — {c.guideHistory}</li>
        <li><strong>{c.reports}</strong> — {c.guideReports}</li>
      </ul>
    </section>
  )
}
function LatestChange({ locale, results }) {
  const changes = latestCompatibleChange(results)
  if (!changes.length) return null
  return <section className="hh-section hh-panel"><h2>{locale === 'ru' ? 'Последнее изменение' : 'Latest change'}</h2><p className="hh-fine">{locale === 'ru' ? 'Последний совместимый замер рядом с предыдущим; это не объяснение причин или тренд.' : 'Latest compatible measurement beside the previous one; this does not state a cause or trend.'}</p><ul className="hh-change-list">{changes.map((change) => <li key={change.key}>{labelFor(change.key, locale)} <strong>{change.previous} → {change.value}</strong></li>)}</ul></section>
}
function ClientMaterialsFromAndy({ locale }) {
  const [materials, setMaterials] = useState([])
  useEffect(() => {
    let active = true
    appFetch('shared-materials')
      .then(value => { if (active) setMaterials(Array.isArray(value.materials) ? value.materials : []) })
      .catch(() => { if (active) setMaterials([]) })
    return () => { active = false }
  }, [])
  if (!materials.length) return null
  return <section className="hh-section hh-client-shared-materials" aria-label={locale === 'ru' ? 'Материалы от специалиста' : 'Materials from practitioner'}>
    <p className="hh-kicker">{locale === 'ru' ? 'От Andy' : 'From Andy'}</p>
    <h2>{locale === 'ru' ? 'Материалы для вас' : 'Your study materials'}</h2>
    <p>{locale === 'ru' ? 'Ссылки от вашего специалиста. Сохранённые рецепты и счета находятся в истории кабинета.' : 'Links shared by your practitioner. Documents you explicitly saved are in your account history.'}</p>
    <div className="hh-client-shared-materials-grid">{materials.map(material => <a key={material.id} href={material.url} target="_blank" rel="noopener noreferrer"><span>{material.title}</span><span aria-hidden="true">↗</span></a>)}</div>
  </section>
}
function ReportsFromAndy({ data, locale }) {
  const reports = reportTimeline(data.savedReports).filter((report) => report.available !== false).slice(0, 3)
  const ru = locale === 'ru'
  if (!reports.length) return null
  return <section className="hh-section hh-account-reports"><h2>{ru ? 'Отчёты от Andy' : 'Reports from Andy'}</h2><div className="hh-grid">{reports.map((report) => <article className="hh-panel" key={report.id}><p className="hh-kicker">{ru ? 'Полученный отчёт' : 'Received report'}</p><h3>{formatReportDate(report.occurredOn, locale)}</h3><p>{ru ? 'Дата отчёта' : 'Report date'}: {formatReportDate(report.occurredOn, locale)}</p><Link href={`/${locale}/app/reports/${report.id}`} prefetch={false}>{ru ? 'Открыть отчёт' : 'Open report'}</Link></article>)}</div></section>
}
function ResultConsultationCta({ locale }) {
  const copy =
    locale === 'ru'
      ? {
          kicker: 'Личная поддержка',
          title: 'Заказать консультацию специалиста',
          text: 'Разберите показатели и возможные следующие шаги вместе с практиком.',
          privacy: 'Результаты приватны и не передаются автоматически.',
          action: 'Выбрать специалиста',
        }
      : {
          kicker: 'Personal guidance',
          title: 'Book a consultation with a specialist',
          text: 'Talk through your scores and possible next steps with a practitioner.',
          privacy: 'Your result stays private and is not shared automatically.',
          action: 'Choose a specialist',
        }

  return (
    <aside className="hh-result-consultation" aria-label={copy.title}>
      <span className="hh-result-consultation-icon" aria-hidden="true">
        <Sparkles size={21} strokeWidth={1.9} />
      </span>
      <div className="hh-result-consultation-copy">
        <p className="hh-kicker">{copy.kicker}</p>
        <h2>{copy.title}</h2>
        <p className="hh-result-consultation-description">{copy.text}</p>
        <p className="hh-result-consultation-privacy">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{copy.privacy}</span>
        </p>
      </div>
      <Link className="hh-result-consultation-action" href={`/${locale}/services`} prefetch={false}>
        <span>{copy.action}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  )
}

function ResultPage({ id, locale, data }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusScaleKey = searchParams?.get('scale') || null
  const [retaking, setRetaking] = useState(false)
  const [retakeError, setRetakeError] = useState(null)
  const c = COPY[locale],
    [result, setResult] = useState(data.results.find((r) => r.id === id) || null),
    [error, setError] = useState(null)
  useEffect(() => {
    let live = true
    appFetch('results/' + id)
      .then((r) => {
        if (live) setResult(r)
      })
      .catch((e) => {
        if (live) setError(e)
      })
    return () => {
      live = false
    }
  }, [id])
  if (error) return <p role="alert">{message(error, c)}</p>
  if (!result) return <p>{c.loading}</p>
  const changeSummary = resultChangeSummary(result, data.results, locale)
  const series = seriesFor(data.results, result),
    previous = series
      .filter(
        (r) =>
          r.id !== result.id && Date.parse(r.measurementAt) <= Date.parse(result.measurementAt),
      )
      .at(-1),
    diff = previous ? compareResults(result, previous) : [],
    title =
      monitoringCatalogItem(result.definitionKey)?.title?.[locale] ||
      monitoringCatalogItem(result.definitionKey)?.title?.en ||
      result.definitionKey
  const repeatDefinition = getDefinitionById(result.definitionId)
  const canRepeat = Boolean(repeatDefinition && MONITORING_CATALOG.some(item =>
    item.startable && item.key === result.definitionKey && item.version === result.definitionVersion))
  async function repeatTest() {
    if (retaking || !canRepeat) return
    setRetaking(true)
    setRetakeError(null)
    try {
      const draft = (data.runs || []).find(run =>
        run.definitionId === result.definitionId && ['draft', 'in_progress'].includes(run.status))
      const run = draft || await appFetch('runs', {
        definitionKey: repeatDefinition.key,
        definitionVersion: repeatDefinition.version,
        instrumentLocale: repeatDefinition.instrumentLocale,
        operationId: crypto.randomUUID(),
      })
      router.push('/' + locale + '/app/runs/' + encodeURIComponent(run.id) + '?mode=quick')
    } catch (cause) {
      setRetakeError(cause)
      setRetaking(false)
    }
  }
  return (
    <article className="hh-result-page">
      <header className="hh-result-hero">
        <div>
          <p className="hh-kicker">{c.result}</p>
          <h1>{title}</h1>
        </div>
        <div className="hh-result-meta">
          <span>{dateLabel(result.measurementAt, locale)}</span>
        </div>
      </header>

      {result.definitionKey === 'mini-ipip-20' && <p className="hh-notice">{c.traitNotice}</p>}

      <PersonalResultReport result={result} locale={locale} previous={previous} focusScaleKey={focusScaleKey} />
      <TestRatingCard locale={locale} definitionKey={result.definitionKey} />
      <div className="hh-result-repeat">
        {canRepeat
          ? <button type="button" onClick={repeatTest} disabled={retaking}>
              {retaking ? (locale === 'ru' ? 'Открываем тест…' : 'Opening test…')
                : (locale === 'ru' ? '↻ Пройти тест ещё раз' : '↻ Retake this test')}
            </button>
          : <Link href={'/' + locale + '/app/tests'} prefetch={false}>
              {locale === 'ru' ? 'Подобрать доступный тест →' : 'Choose an available assessment →'}
            </Link>}
        {retakeError && <p role="alert">{message(retakeError, c)}</p>}
      </div>
      <details className="hh-result-raw-details">
        <summary>{locale === 'ru' ? 'Посмотреть все исходные баллы и шкалы' : 'View all recorded scores and scales'}</summary>
      <section className="hh-result-section" aria-labelledby="result-values-title">
        <div className="hh-result-section-heading">
          <div>
            <p className="hh-kicker">{locale === 'ru' ? 'Результаты' : 'Results'}</p>
            <h2 id="result-values-title">{locale === 'ru' ? 'Ваши показатели' : 'Your measurements'}</h2>
          </div>
          <p className="hh-result-section-note">
            {previous
              ? locale === 'ru'
                ? 'Изменение показано только относительно совместимого предыдущего замера.'
                : 'Change is shown only against a compatible previous measurement.'
              : locale === 'ru'
                ? 'Это первый совместимый замер — он станет вашей личной точкой отсчёта.'
                : 'This is your first compatible measurement and becomes your personal baseline.'}
          </p>
        </div>

        <div className="hh-result-metrics" data-count={Math.min(result.dimensions.length, 3)}>
          {result.dimensions.map((d) => {
            const delta = diff.find((x) => x.key === d.key)?.delta
            return (
              <section className="hh-result-metric" key={d.key}>
                <div className="hh-result-metric-copy">
                  <h3>{readableScaleName(d, locale)}</h3>
                  {explanationFor(d.key, locale) && <p>{explanationFor(d.key, locale)}</p>}
                </div>
                <div className="hh-result-score">
                  <strong>{d.value}</strong>
                  <span>/ {d.max}</span>
                </div>
                <div className="hh-result-metric-foot">
                  <span>{c.scale} {d.min}–{d.max}</span>
                  <span className="hh-result-delta">
                    {delta === undefined ? c.baseline : `${c.change}: ${delta > 0 ? '+' : ''}${delta}`}
                  </span>
                </div>
              </section>
            )
          })}
        </div>
      </section>

      </details>
      <section className="hh-result-comparison" aria-label={locale === 'ru' ? 'История и повторные измерения' : 'Progress and previous assessments'}>
        <span className="hh-result-comparison-icon" aria-hidden="true">
          <BarChart3 size={21} strokeWidth={1.9} />
        </span>
        <div className="hh-result-comparison-copy">
          <h2>{locale === 'ru' ? 'Динамика результата' : 'Your result over time'}</h2>
          {changeSummary.previous
            ? <p>{locale === 'ru' ? 'Предыдущий совместимый замер' : 'Previous comparable assessment'}: {dateLabel(changeSummary.previous.measurementAt, locale)}</p>
            : <p>{locale === 'ru' ? 'Это первый совместимый замер. Повторите ту же версию теста позже, чтобы увидеть изменения.' : 'Your first baseline is recorded. Repeat this version later to see changes.'}</p>}
          {changeSummary.changes.length > 0 && <ul>{changeSummary.changes.map(change => (
            <li key={change.key}>{readableScaleName({key:change.key,sourceConstruct:change.label},locale)}: {change.from} → {change.to}</li>
          ))}</ul>}
          <small>{locale === 'ru' ? 'Баллы описывают ответы на тест, а не медицинский диагноз.' : 'Scores reflect questionnaire answers, not a medical diagnosis.'}</small>
        </div>
        <Link className="hh-result-comparison-action" href={`/${locale}/app/portfolio`} prefetch={false}>
          <span>{locale === 'ru' ? 'Все мои отчёты' : 'All my reports'}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
      {Object.entries(result.context || {}).length > 0 && (
        <aside className="hh-context-at-checkin hh-result-context">
          <p className="hh-kicker">{locale === 'ru' ? 'Ваш контекст' : 'Your context'}</p>
          <h2>{c.contextAtCheckIn}</h2>
          <dl>
            {[
              ['current_focus', c.focus],
              ['trigger', c.trigger],
              ['what_helps', c.helps],
              ['desired_change', c.desiredChange],
              ['note', c.note],
            ].map(([key, label]) =>
              result.context[key] ? (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{result.context[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </aside>
      )}

      <ResultConsultationCta locale={locale} />

      <footer className="hh-result-footer">
        <p className="hh-result-source">
          {c.source}: {result.definitionKey} · {result.definitionVersion} · {result.instrumentLocale.toUpperCase()}
        </p>
        <p className="hh-fine">{c.versionBoundary}</p>
        <div className="hh-result-footer-actions">
          <Link className="hh-primary" href={'/' + locale + '/app/monitoring/' + result.definitionKey} prefetch={false}>
            {c.viewTrend}
          </Link>
          <Link href={'/' + locale + '/app/history'} prefetch={false}>{c.history}</Link>
          <Link href={'/' + locale + '/app/tests'} prefetch={false}>{locale === 'ru' ? 'Все тесты' : 'All tests'}</Link>
        </div>
      </footer>
    </article>
  )
}
function SavedReportPage({ id, locale, reload }) {
  const router = useRouter()
  const [value, setValue] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const ru = locale === 'ru'
  useEffect(() => {
    let live = true
    appFetch('reports/' + id)
      .then((result) => {
        if (live) setValue(result)
      })
      .catch((e) => {
        if (live) setError(e)
      })
    return () => {
      live = false
    }
  }, [id])
  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await appFetch('reports/' + id + '/remove', {})
      await reload()
      router.replace('/' + locale + '/app/portrait#personal-reports')
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }
  if (error?.code === 'REPORT_UNAVAILABLE' || error?.code === 'NOT_FOUND')
    return (
      <section className="hh-panel">
        <h1>{ru ? 'Отчёт больше недоступен' : 'Report no longer available'}</h1>
        <p>{ru ? 'Ссылка в истории может оставаться как запись, но содержимое было отозвано или исходный отчёт больше недоступен.' : 'The history reference may remain, but the content was withdrawn or the source report is no longer available.'}</p>
        <Link className="hh-primary" href={'/' + locale + '/app/portrait#personal-reports'} prefetch={false}>
          {ru ? 'К моим отчётам' : 'Back to My Reports'}
        </Link>
      </section>
    )
  if (error) return <p role="alert">{ru ? 'Не удалось открыть отчёт.' : 'The report could not be opened.'}</p>
  if (!value) return <p>{ru ? 'Загружаем отчёт…' : 'Loading report…'}</p>
  return (
    <article className="hh-saved-document-reader" data-canonical-saved-report>
      <nav className="hh-saved-document-reader__toolbar" aria-label={ru ? 'Действия с отчётом' : 'Report actions'}>
        <Link href={'/' + locale + '/app/portrait#personal-reports'} prefetch={false}>
          {ru ? '← Мои отчёты' : '← My reports'}
        </Link>
        <Link href={'/' + (ru ? 'en' : 'ru') + '/app/reports/' + encodeURIComponent(id)} prefetch={false}>
          {ru ? 'EN' : 'RU'}
        </Link>
      </nav>
      <div className="hh-saved-document-reader__assessment">
        <AssessmentReading record={value.report} locale={locale} />
        <div className="hh-analysis-detail-download">
          <DownloadPractitionerReport reportId={id} locale={locale} />
        </div>
      </div>
      <details className="hh-saved-document-reader__management">
        <summary>{ru ? 'Управление сохранением' : 'Manage saved copy'}</summary>
        <p>{ru ? 'Сохранено' : 'Saved'}: {dateLabel(value.savedAt, locale)}</p>
        <button type="button" disabled={busy} onClick={remove}>
          {ru ? 'Убрать из моего кабинета' : 'Remove from my Cabinet'}
        </button>
      </details>
    </article>
  )
}

function ReportsIndex({ data, locale }) {
  const c = COPY[locale]
  const reports = reportTimeline(data.savedReports)
  return (
    <section>
      <div className="hh-heading">
        <p className="hh-kicker">Holistic House</p>
        <h1>{c.reports}</h1>
        <p>{c.reportsIntro}</p>
      </div>
      {!reports.length ? (
        <article className="hh-panel hh-empty">
          <h2>{c.reportsEmpty}</h2>
          <p>{c.reportsEmptyText}</p>
        </article>
      ) : (
        <div className="hh-report-list">
          {reports.map((report) => (
            <article className="hh-panel" key={report.id}>
              <p className="hh-kicker">{c.reportFromAndy}</p>
              <h2>{formatReportDate(report.occurredOn, locale)}</h2>
              <p className="hh-fine">{c.saved}: {dateLabel(report.savedAt, locale)}</p>
              {report.available === false ? <p className="hh-fine">{locale === 'ru' ? 'Отчёт был отозван или больше недоступен.' : 'This report was withdrawn or is no longer available.'}</p> : <Link className="hh-primary" href={`/${locale}/app/reports/${report.id}`} prefetch={false}>{c.openReport}</Link>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function HistoryView({ data, locale, reload }) {
  const c = COPY[locale],
    results = chronological(data.results),
    [latestId, setLatestId] = useState(results.at(-1)?.id || ''),
    [priorId, setPriorId] = useState(''),
    [dimensionKey, setDimensionKey] = useState(''),
    [error, setError] = useState(null)
  const latest = results.find((r) => r.id === latestId) || results.at(-1),
    series = latest ? seriesFor(results, latest) : [],
    prior = series.find((r) => r.id === priorId) || series.filter((r) => r.id !== latest?.id && Date.parse(r.measurementAt) <= Date.parse(latest.measurementAt)).at(-1)
  const dimension = latest?.dimensions.find((d) => d.key === dimensionKey) || latest?.dimensions[0],
    delta = latest && prior && latest.id !== prior.id ? compareResults(latest, prior) : []
  const points = dimension
    ? series.map((r) => ({
        id: r.id,
        date: r.measurementAt,
        value: r.dimensions.find((d) => d.key === dimension.key).value,
      }))
    : []
  const x = (p) =>
    30 +
    (580 * (Date.parse(p.date) - Date.parse(points[0].date))) /
      Math.max(1, Date.parse(points.at(-1).date) - Date.parse(points[0].date))
  const y = (p) => 170 - (140 * (p.value - dimension.min)) / (dimension.max - dimension.min)
  const testGroups = assessmentHistoryGroups(data.results, data.runs, locale)
  const personalNext = nextPersonalRecommendation({ results: data.results, snapshot: data.snapshot, locale })
  const timeline = [
    ...results.map((r) => ({
      id: r.id,
      date: r.measurementAt,
      title: assessmentHistoryTitle(r, locale),
      href: `/${locale}/app/results/${r.id}`,
    })),
    ...(data.moodCheckins || []).map((mood) => ({
      id: 'mood:' + mood.id,
      date: mood.occurredAt,
      title:
        (mood.mood === 'sad' ? '😔 ' : mood.mood === 'neutral' ? '😐 ' : '🙂 ') +
        (locale === 'ru' ? 'Настроение' : 'Mood'),
      note: mood.category
        ? (locale === 'ru' ? 'Контекст: ' : 'Context: ') + mood.category
        : undefined,
    })),
    ...reportTimeline(data.savedReports).map((report) => ({
      id: report.id,
      date: `${report.occurredOn}T00:00:00.000Z`,
      title: c.reportFromAndy,
      href: `/${locale}/app/reports/${report.id}`,
      note: `${c.saved}: ${dateLabel(report.savedAt, locale)}`,
    })),
    ...(data.savedSessions || []).map(session=>({
      id:session.id,date:session.occurredOn+'T00:00:00.000Z',
      title:locale==='ru'?'Сохранённая консультация':'Saved consultation',
      href:'/'+locale+'/app/sessions/'+session.id,
      note:(locale==='ru'?'Сохранено: ':'Saved: ')+dateLabel(session.savedAt,locale)
    })),
    ...(data.savedDocuments || []).map((document) => ({
      id: document.id,
      date: `${document.occurredOn}T00:00:00.000Z`,
      title:
        document.kind === 'receipt'
          ? (locale === 'ru' ? 'Квитанция от Andy' : 'Receipt from Andy')
          : document.kind === 'invoice'
            ? (locale === 'ru' ? 'Счёт от Andy' : 'Invoice from Andy')
            : (locale === 'ru' ? 'Рекомендация от Andy' : 'Recommendation from Andy'),
      href: `/${locale}/app/document-view/${document.id}`,
      note: `${c.saved}: ${dateLabel(document.savedAt, locale)}`,
    })),
    ...data.requests.map((r) => ({
      id: r.id,
      date: r.createdAt,
      title: `${c.request}: ${c[r.status]}`,
      href: `/${locale}/app/consultations`,
    })),
    ...data.contextEvents.map((e) => ({
      id: e.id,
      date: e.occurredAt,
      title: e.label,
      note: e.note,
      event: e,
    })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id))
  async function deleteEvent(event) {
    try {
      await appFetch('context/' + event.id, { action: 'delete', expectedRevision: event.revision })
      await reload()
    } catch (e) {
      setError(e)
    }
  }
  return (
    <section>
      <div className="hh-heading">
        <h1>{c.history}</h1>
        <p>{c.historyIntro}</p>
        <p className="hh-fine">{c.versionBoundary}</p>
      </div>
      <section className="hh-assessment-history" aria-labelledby="hh-past-tests-title">
        <div className="hh-assessment-history-heading">
          <div><p className="hh-kicker">{locale === 'ru' ? 'Мои сохранённые замеры' : 'My saved measurements'}</p>
          <h2 id="hh-past-tests-title">{locale === 'ru' ? 'Результаты прошлых тестов' : 'Past test results'}</h2>
          <p>{locale === 'ru' ? 'Вся история сохраняется по датам. Каждый тест можно открыть, сравнить с совместимым предыдущим результатом или пройти повторно.' : 'Your results are kept by date. Open any result, compare compatible measurements, or take the test again.'}</p></div>
          <Link className="hh-primary" href={`/${locale}/app/tests`}>{locale === 'ru' ? 'Подобрать тесты' : 'Find tests'}</Link>
        </div>
        {testGroups.length ? <div className="hh-assessment-history-list">{testGroups.map((group) => (
          <article className="hh-assessment-history-item" key={group.key}>
            <div className="hh-assessment-history-item-head"><div><h3>{group.title}</h3>
              <p>{locale === 'ru' ? 'Прохождений' : 'Completed'}: <strong>{group.count}</strong>{group.latest && <> · {locale === 'ru' ? 'Последний' : 'Most recent'}: <time>{dateLabel(group.latest.measurementAt, locale)}</time></>}</p></div>
              {group.latest && <Link href={`/${locale}/app/results/${group.latest.id}`}>{locale === 'ru' ? 'Последний результат →' : 'Latest result →'}</Link>}</div>
            {group.latest && <div className="hh-assessment-history-dimensions">{group.latest.dimensions.map((d) => (
              <div key={d.key}><span>{readableScaleName(d, locale)}</span><strong>{d.value} <small>/ {d.max}</small></strong></div>
            ))}</div>}
            {group.count > 1 && <details className="hh-assessment-history-previous"><summary>{locale === 'ru' ? `Все прохождения (${group.count})` : `All attempts (${group.count})`}</summary><ul>{group.history.map((result) => <li key={result.id}><time>{dateLabel(result.measurementAt, locale)}</time> <Link href={`/${locale}/app/results/${result.id}`}>{locale === 'ru' ? 'Открыть результат' : 'Open result'}</Link></li>)}</ul></details>}
            <div className="hh-actions">{group.draft && <Link href={`/${locale}/app/runs/${group.draft.id}`}>{locale === 'ru' ? 'Продолжить начатый тест' : 'Resume unfinished test'}</Link>}
              <Link href={`/${locale}/app/tests?suggest=${encodeURIComponent(group.key)}`}>{group.count ? (locale === 'ru' ? 'Пройти ещё раз' : 'Retake test') : (locale === 'ru' ? 'Начать тест' : 'Start test')}</Link></div>
          </article>
        ))}</div> : <p className="hh-panel">{locale === 'ru' ? 'Пока нет завершённых тестов. Начните с короткого замера: он станет вашей личной точкой отсчёта.' : 'No completed tests yet. Start with a short check-in to create your personal baseline.'}</p>}
        <aside className="hh-assessment-history-next"><div><p className="hh-kicker">{locale === 'ru' ? 'Персональная подсказка' : 'Personal next step'}</p><h3>{personalNext.title}</h3><p>{personalNext.reason}</p>{personalNext.observation && <p className="hh-fine">{personalNext.observation}</p>}{personalNext.reflection && <p><strong>{locale === 'ru' ? 'Практическая подсказка: ' : 'Something to try: '}</strong>{personalNext.reflection}</p>}<small>{locale === 'ru' ? 'Это навигация по самонаблюдению, а не медицинская оценка. Ваши результаты не отправляются специалисту автоматически.' : 'Guidance for self-monitoring, not a medical judgement. Your results are not automatically sent to a practitioner.'}</small></div><Link href={personalNext.key ? `/${locale}/app/tests?suggest=${encodeURIComponent(personalNext.key)}` : `/${locale}/app/history`}>{personalNext.key ? (locale === 'ru' ? 'Выбрать тест' : 'Choose test') : (locale === 'ru' ? 'Моя история' : 'My history')}</Link></aside>
      </section>
      {latest ? (
        <article className="hh-panel">
          <h2>{c.compare}</h2>
          <div className="hh-filter-grid">
            <label>
              {c.to}
              <select
                value={latest.id}
                onChange={(e) => {
                  setLatestId(e.target.value)
                  setPriorId('')
                  setDimensionKey('')
                }}
              >
                {results.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.definitionKey} · {dateLabel(r.measurementAt, locale)} · {r.instrumentLocale}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {c.from}
              <select
                value={prior?.id || ''}
                onChange={(e) => setPriorId(e.target.value)}
                disabled={series.length < 2}
              >
                {series
                  .filter((r) => r.id !== latest.id)
                  .map((r) => (
                    <option value={r.id} key={r.id}>
                      {dateLabel(r.measurementAt, locale)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {c.dimension}
              <select value={dimension.key} onChange={(e) => setDimensionKey(e.target.value)}>
                {latest.dimensions.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.sourceConstruct || labelFor(d.key, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="hh-actions">
            <button
              disabled={series.length < 2 || series[0]?.id === latest.id}
              onClick={() => setPriorId(series[0].id)}
            >
              {c.baseline}
            </button>
            <button
              disabled={series.indexOf(latest) < 1}
              onClick={() => setPriorId(series[Math.max(0, series.indexOf(latest) - 1)].id)}
            >
              {c.previous}
            </button>
          </div>
          {delta.length ? (
            <p className="hh-change">
              {c.since} {dateLabel(prior.measurementAt, locale)}: {dimension.sourceConstruct || labelFor(dimension.key, locale)}{' '}
              {delta.find((d) => d.key === dimension.key)?.prior} → {dimension.value}{' '}
              <span>
                ({delta.find((d) => d.key === dimension.key)?.delta > 0 ? '+' : ''}
                {delta.find((d) => d.key === dimension.key)?.delta} {c.points})
              </span>
            </p>
          ) : (
            <p>{c.noChange}</p>
          )}
          {points.length >= 3 && (
            <svg
              className="hh-chart"
              viewBox="0 0 640 200"
              role="img"
              aria-label={`${dimension.sourceConstruct || labelFor(dimension.key, locale)} — ${c.history}`}
            >
              <line x1="30" y1="170" x2="610" y2="170" />
              <polyline points={points.map((p) => `${x(p)},${y(p)}`).join(' ')} />
              {points.map((p) => (
                <circle key={p.id} cx={x(p)} cy={y(p)} r="5">
                  <title>
                    {dateLabel(p.date, locale)}: {p.value}
                  </title>
                </circle>
              ))}
            </svg>
          )}
          <table className="hh-table">
            <caption>
              {dimension.sourceConstruct || labelFor(dimension.key, locale)} · {c.scale} {dimension.min}–{dimension.max}
            </caption>
            <thead>
              <tr>
                <th>{c.date}</th>
                <th>{c.value}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{dateLabel(p.date, locale)}</th>
                  <td>{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ) : (
        <p>{c.noResults}</p>
      )}
      <ContextForm locale={locale} reload={reload} />
      <div className="hh-timeline">
        {timeline.map((item) => (
          <article key={item.id}>
            <time>{dateLabel(item.date, locale)}</time>
            <h3>
              {item.href ? (
                <Link href={item.href} prefetch={false}>
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </h3>
            {item.note && <p>{item.note}</p>}
            {item.event && (
              <details>
                <summary>{c.editJournal}</summary>
                <ContextForm locale={locale} reload={reload} event={item.event} />
                <button onClick={() => deleteEvent(item.event)}>{c.delete}</button>
              </details>
            )}
          </article>
        ))}
      </div>
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}
function ContextForm({ locale, reload, event }) {
  const c = COPY[locale],
    [show, setShow] = useState(Boolean(event)),
    [label, setLabel] = useState(event?.label || ''),
    [note, setNote] = useState(event?.note || ''),
    [date, setDate] = useState(
      event
        ? new Date(
            new Date(event.occurredAt).getTime() -
              new Date(event.occurredAt).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : '',
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await appFetch(event ? 'context/' + event.id : 'context', {
        action: 'save',
        label,
        note,
        occurredAt: new Date(date).toISOString(),
        timezone: localZone(),
        ...(event ? { expectedRevision: event.revision } : {}),
      })
      if (!event) {
        setLabel('')
        setNote('')
        setShow(false)
      }
      await reload()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-context">
      {!show ? (
        <button onClick={() => setShow(true)}>＋ {c.addEvent}</button>
      ) : (
        <form onSubmit={submit} className="hh-form hh-panel">
          <h2>{c.context}</h2>
          <p>{c.contextNote}</p>
          <label>
            {c.label}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            {c.date}
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            {c.note}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </label>
          <button className="hh-primary" disabled={busy}>
            {c.save}
          </button>
          {!event && (
            <button type="button" onClick={() => setShow(false)}>
              {c.cancel}
            </button>
          )}
          {error && <p role="alert">{message(error, c)}</p>}
        </form>
      )}
    </section>
  )
}
function Consultations({ data, locale, reload, initialServiceId = '', source = '', requestedMessageId = '' }) {
  const c = COPY[locale],
    [selected, setSelected] = useState(null),
    [error, setError] = useState(null)
  useEffect(() => {
    if (!initialServiceId || selected) return
    const service = (data.services || []).find((item) => item.id === initialServiceId)
    if (service) setSelected(service)
  }, [data.services, initialServiceId, selected])
  async function updateRequest(request, action) {
    try {
      await appFetch('requests/' + request.id, { action, expectedRevision: request.revision })
      await reload()
    } catch (e) {
      setError(e)
    }
  }
  return (
    <section>
      <div className="hh-heading">
        <h1>{c.consultations}</h1>
        <p>{c.consultationsIntro}</p>
        <p className="hh-fine">{locale === 'ru' ? 'Чтобы получать сообщения на телефон:' : 'To receive phone alerts for replies:'}{' '}
          <Link href={`/${locale}/app/settings#hh-phone-notifications`} prefetch={false}>
            {locale === 'ru' ? 'Включить уведомления' : 'Enable notifications'}
          </Link>
        </p>
        {source === 'test-results' && <aside className="hh-panel hh-consult-test-source">
          <h2>{locale === 'ru' ? 'Личные рекомендации по вашим тестам' : 'Personal recommendations about your test results'}</h2>
          <p>{locale === 'ru'
            ? 'Выберите специалиста и отправьте запрос на обсуждение результатов. Данные тестов не передаются автоматически — вы сами решаете, чем поделиться.'
            : 'Choose a specialist and request a personal review. Your private test scores are not shared automatically; you decide what to share.'}</p>
          <Link className="hh-primary" href={'/' + locale + '/services/free-situation-review?topic=test-results'} prefetch={false}>
            {locale === 'ru' ? 'Запросить личную консультацию' : 'Request a personal consultation'} →
          </Link>
        </aside>}
      </div>
      <InstallHolisticHouse locale={locale} />
      <div className="hh-grid hh-services">
        {!(data.services || []).length && <p>{c.emptyServices || c.emptyRequests}</p>}
        {(data.services || []).map((service) => (
          <article className="hh-panel" key={service.id}>
            <p className="hh-kicker">{service.practitionerName}{service.professionalTitle ? ` · ${service.professionalTitle}` : ''}</p>
            <h2>{service.copy[locale].title}</h2>
            <p>{service.copy[locale].description}</p>
            <p className="hh-fine">{service.pricingMode !== 'contact' && service.confirmedPrice != null ? `${service.pricingMode === 'from' ? (locale === 'ru' ? 'от ' : 'from ') : ''}${service.currency || ''} ${service.confirmedPrice}` : c.price}{service.durationMinutes ? ` · ${service.durationMinutes} min` : ''}</p>
            <button className="hh-primary" onClick={() => setSelected(service)}>
              {c.request}
            </button>
          </article>
        ))}
      </div>
      {selected && (
        <RequestForm
          key={selected.id}
          service={selected}
          locale={locale}
          data={data}
          close={() => setSelected(null)}
          onDone={async () => {
            setSelected(null)
            await reload()
          }}
        />
      )}
      <section className="hh-section">
        <h2>{c.requests}</h2>
        {!data.requests.length && <p>{c.emptyRequests}</p>}
        {data.requests.map((request) => (
          <article className="hh-panel" key={request.id} id={'hh-consultation-' + request.id}>
            <span className="hh-badge">{c[request.status]}</span>
            <h3>
              {(data.services || []).find((s) => s.id === request.serviceId)?.copy?.[locale]?.title ||
                c.request}
            </h3>
            <p>
              {dateLabel(request.createdAt, locale)} · {request.contact}
            </p>
            {request.message && <p>{request.message}</p>}
            <PracticeRequestConversation key={request.id} requestId={request.id}
              autoOpen={requestedMessageId === request.id}
              accountId={data.account.id} locale={locale}
              initialMessage={typeof request.message==='string'?request.message:''}
              createdAt={request.createdAt}/>
            {request.sharedExcerpt && (
              <>
                <p>{c.sharingNote}</p>
                <button onClick={() => updateRequest(request, 'unshare')}>{c.unshare}</button>
              </>
            )}
            {['requested', 'contacted'].includes(request.status) && (
              <button onClick={() => updateRequest(request, 'cancel')}>{c.withdraw}</button>
            )}
            <p className="hh-fine">{c.requestNote}</p>
          </article>
        ))}
      </section>
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}
function RequestForm({ service, locale, data, close, onDone }) {
  const c = COPY[locale],
    [contact, setContact] = useState(data.email || ''),
    [note, setNote] = useState(''),
    [shareId, setShareId] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    operation = useRef(null),
    [energyPrefill, setEnergyPrefill] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft = readRemoteSupportDraft(window.sessionStorage, service.id)
    if (!draft) return
    setNote((current) => current || formatRemoteSupportDraft(draft))
    setEnergyPrefill(true)
  }, [service.id])
  const shared = data.results.find((r) => r.id === shareId)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const body = operation.current || {
      serviceId: service.id,
      operationId: crypto.randomUUID(),
      contact,
      message: note,
      shareResultId: shareId || null,
      shareConfirmed: confirmed,
    }
    operation.current = body
    try {
      await appFetch('requests', body)
      if (energyPrefill && typeof window !== 'undefined' && readRemoteSupportDraft(window.sessionStorage, service.id)) {
        window.sessionStorage.removeItem(REMOTE_SUPPORT_DRAFT_KEY)
      }
      operation.current = null
      await onDone()
    } catch (e) {
      setError(e)
      if (e.status && e.status < 500) operation.current = null
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-panel hh-detail">
      <button className="hh-close" onClick={close} disabled={busy}>
        {c.close}
      </button>
      <h2>{service.copy[locale].title}</h2>
      {energyPrefill && <p className="hh-fine">{locale === 'ru'
        ? 'Ваш выбор мастера, метода, длительности и времени добавлен в сообщение. Это запрос, а не оплаченная или подтверждённая запись.'
        : 'Your preferences for practitioner, method, duration and time are in the message. This is a request, not a paid or confirmed booking.'}</p>}
      <p>{c.requestNote}</p>
      <form className="hh-form" onSubmit={submit}>
        <label>
          {c.contact}
          <input
            required
            maxLength={500}
            value={contact}
            disabled={busy || Boolean(operation.current)}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
        <label>
          {c.message}
          <textarea
            maxLength={2000}
            value={note}
            disabled={busy || Boolean(operation.current)}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label>
          {c.share}
          <select
            value={shareId}
            disabled={busy || Boolean(operation.current)}
            onChange={(e) => {
              setShareId(e.target.value)
              setConfirmed(false)
            }}
          >
            <option value="">{c.shareNone}</option>
            {data.results.map((result) => (
              <option key={result.id} value={result.id}>
                {result.definitionKey} · {dateLabel(result.measurementAt, locale)}
              </option>
            ))}
          </select>
        </label>
        {shared && (
          <>
            <div className="hh-notice">
              <p>
                {shared.definitionKey} · {shared.instrumentLocale} ·{' '}
                {dateLabel(shared.measurementAt, locale)}
              </p>
              {shared.dimensions.map((d) => (
                <p key={d.key}>
                  {d.sourceConstruct || labelFor(d.key, locale)}: {d.value} / {d.max}
                </p>
              ))}
            </div>
            <label className="hh-check">
              <input
                type="checkbox"
                required
                checked={confirmed}
                disabled={busy || Boolean(operation.current)}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {c.shareConfirm}
            </label>
          </>
        )}
        <p className="hh-fine">{c.sharingNote}</p>
        <button className="hh-primary" disabled={busy}>
          {busy ? c.saving : c.submitRequest}
        </button>
        {error && <p role="alert">{message(error, c)}</p>}
      </form>
    </section>
  )
}
function Privacy({ locale, logout, onDeleted }) {
  const c = COPY[locale],
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(''),
    [opened, setOpened] = useState(false)
  async function exportData() {
    setBusy(true)
    try {
      const data = await appFetch('export'),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        ),
        a = document.createElement('a')
      a.href = url
      a.download = 'holistic-house-data.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  async function requestDeletion(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await appFetch('deletion', { confirmation: confirm })
      onDeleted()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-panel hh-section">
      <h2>{c.settings}</h2>
      <p>{c.privacy}</p>
      <div className="hh-actions">
        <button disabled={busy} onClick={exportData}>
          {c.export}
        </button>
        <button disabled={busy} onClick={() => logout(true)}>
          {c.allDevices}
        </button>
      </div>
      <details open={opened} onToggle={(e) => setOpened(e.currentTarget.open)}>
        <summary>{c.deletion}</summary>
        <p>{c.deletionNote}</p>
        <form onSubmit={requestDeletion} className="hh-form">
          <label>
            {c.deletionConfirm}
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              maxLength={6}
            />
          </label>
          <button className="hh-danger" disabled={busy || confirm !== 'DELETE'}>
            {c.deletion}
          </button>
        </form>
      </details>
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}
