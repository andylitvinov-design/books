import assert from 'node:assert/strict'
import { observePortraitNavigation } from './portrait-navigation-diagnostics.mjs'

// Independent expectations for the approved seven-day invitation, not values
// read back from the page or imported from its implementation.
export const OPORA_PUBLIC_ENTRY = Object.freeze({
 en: {
  title: 'What will you learn in week one?', programmeTitle: 'OPORA Stress Relief',
  accept: "I'm interested — sign in to enrol", explore: 'Read the full programme',
  privacy: 'Your first course is free. No automatic enrolment: your choices and progress are saved privately only after sign-in and confirmation.',
  days: ['My personal anchor', 'Notice the chair supporting you', 'Soften one hand a little',
   'Name a feeling and be kind to yourself', '“I am having the thought that…”',
   'Rehearse one supportive request', 'Make a personal OPORA pocket plan'],
 },
 ru: {
  title: 'Что вас ждёт в первую неделю?', programmeTitle: 'ОПОРА Антистресс',
  accept: 'Мне интересно — войти для записи', explore: 'Подробнее о программе',
  privacy: 'Первый курс бесплатно. Никакой автоматической записи: личные данные и прогресс сохраняются только после входа и подтверждения.',
  days: ['Мой знак опоры', 'Почувствовать поддержку стула', 'Чуть мягче в одной кисти',
   'Назвать чувство и поддержать себя', '«Мне пришла мысль, что…»',
   'Найти добрую фразу поддержки', 'Собрать свою маленькую ОПОРУ'],
 },
})

export function assertOporaGuestPreviewSnapshot(snapshot, locale) {
 const t = OPORA_PUBLIC_ENTRY[locale]
 assert.ok(t, 'Only the pinned EN/RU OPORA preview is covered')
 assert.equal(snapshot.title, t.title)
 assert.equal(snapshot.weekCount, '7')
 assert.deepEqual(snapshot.days, t.days.map((title, index) => ({ day: String(index + 1), title })))
 assert.deepEqual(snapshot.accept, { tag: 'BUTTON', type: 'button', google: true, fastConsent: false, disabled: false, text: t.accept })
 assert.deepEqual(snapshot.explore, { tag: 'A', href: '/' + locale + '/courses/antistress', text: t.explore })
 assert.equal(snapshot.privacy, t.privacy)
}

// This anonymous preview must not start OAuth, create a course or send anything
// to a provider. Fall through to existing fences for allowed local reads.
export function createOporaGuestPreviewGuard(origin) {
 assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/)
 assert.equal(new URL(origin).origin, origin)
 const blocked = [], pending = new Set(), handlerErrors = []
 const handle = async route => {
  const request = route.request(), url = new URL(request.url()), method = request.method()
  if (url.origin === origin && ['GET', 'HEAD'].includes(method) && !/^\/api\/app\/auth(?:\/|$)/.test(url.pathname)) return route.fallback()
  // Do not retain bodies, queries, auth handoff URLs, headers or credentials.
  blocked.push({ sameOrigin: url.origin === origin, method })
  return route.abort('blockedbyclient')
 }
 const route = route => {
  const work = handle(route).catch(error => { handlerErrors.push(error) })
  pending.add(work)
  void work.then(() => pending.delete(work))
  return work
 }
 return {
  route, blocked,
  hasPending() { return pending.size > 0 },
  async drain() { while (pending.size) await Promise.all([...pending]) },
  assertUntouched() {
   assert.deepEqual(blocked, [], 'An anonymous programme preview must not attempt authentication, writes or provider requests')
   assert.equal(handlerErrors.length, 0, 'OPORA preview request-fence handlers must finish without errors')
  },
 }
}

async function assertInvite(page, expect, origin, locale) {
 const t = OPORA_PUBLIC_ENTRY[locale]
 await expect(page).toHaveURL(origin + '/' + locale + '/app/course?program=stress')
 const landing = page.locator('[data-opora-guest-landing]')
 await expect(landing).toBeVisible({ timeout: 20000 })
 const preview = landing.locator('[data-opora-first-week-intro]')
 await expect(preview).toBeVisible()
 await expect(preview.getByRole('heading', { name: t.title, level: 1, exact: true })).toBeVisible()
 await expect(preview.locator('[data-opora-preview-day]')).toHaveCount(7)
 await expect(preview.locator('[data-opora-preview-day] strong')).toHaveText(t.days)
 await expect(preview.getByRole('button', { name: t.accept, exact: true })).toBeVisible()
 await expect(preview.locator('button[data-opora-week-one-accept][data-course-google-signin]')).toBeEnabled()
 await expect(preview.getByText(t.privacy, { exact: true })).toBeVisible()
 const explore = preview.getByRole('link', { name: t.explore, exact: true })
 await expect(explore).toBeVisible()
 await expect(explore).toHaveAttribute('href', '/' + locale + '/courses/antistress')
 const snapshot = await preview.evaluate(element => {
  const accept = element.querySelector('[data-opora-week-one-accept]'), explore = element.querySelector('a')
  return {
   title: element.querySelector('h1')?.textContent, weekCount: element.getAttribute('data-opora-week-one-count'),
   days: [...element.querySelectorAll('[data-opora-preview-day]')].map(day => ({ day: day.getAttribute('data-opora-preview-day'), title: day.querySelector('strong')?.textContent })),
   accept: accept && { tag: accept.tagName, type: accept.getAttribute('type'), google: accept.hasAttribute('data-course-google-signin'), fastConsent: accept.hasAttribute('data-opora-fast-consent'), disabled: accept.disabled, text: accept.textContent },
   explore: explore && { tag: explore.tagName, href: explore.getAttribute('href'), text: explore.textContent },
   privacy: [...element.querySelectorAll('p')].find(p => p.querySelector('svg'))?.textContent,
  }
 })
 assertOporaGuestPreviewSnapshot(snapshot, locale)
 return { landing, explore }
}

async function assertMobileWidth(page, locale, phase) {
 for (const width of [320, 390]) {
  await page.setViewportSize({ width, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
   locale + ' OPORA ' + phase + ' must fit ' + width + 'px without horizontal document scrolling')
 }
}

export async function verifyOporaPublicEntry(callerPage, expect, { origin, screenshotEvidence, output,
 runtime = process.env.HH_APP_TEST_RUNTIME,
}) {
 const guard = createOporaGuestPreviewGuard(origin), context = callerPage.context()
 // Limits bound failure cleanup, not successful programme/content assertions.
 // Unknown ancestry is never treated as unrelated merely because time expired.
 const maxPages = 32, maxCloses = 16, closureTimeoutMs = 5000
 const owned = new Set(), watched = new Map(), parents = new Map(), ownershipChecks = new Set(), pageErrors = [], cleanupErrors = []
 let page, primaryError, primaryFailed = false, routeInstalled = false, generation = 0, ownershipFailure
 let navigation, diagnosticLocale = null, diagnosticStage = 'owned-page'
 let reconciling = false
 const ownershipFault = message => { ownershipFailure ||= new Error(message) }
 const watch = target => {
  if (target === callerPage) { ownershipFault('Caller cannot become an owned OPORA preview page'); return false }
  if (watched.has(target)) return true
  if (watched.size >= maxPages) { ownershipFault('OPORA preview observed-page cap reached; request fence retained'); return false }
  const errors = [], onError = error => { errors.push(error); if (owned.has(target)) pageErrors.push(error) }
  watched.set(target, { errors, onError, openerStarted: false, onPopup: null })
  generation++
  target.on('pageerror', onError)
  return true
 }
 const addParent = (target, opener) => {
  if (!opener || !watch(target)) return
  const edges = parents.get(target) || new Set()
  if (!edges.has(opener)) { edges.add(opener); parents.set(target, edges); generation++ }
 }
 const adopt = target => {
  if (!watch(target) || owned.has(target)) return false
  owned.add(target); generation++
  const record = watched.get(target)
  // Earlier pageerrors were buffered while ancestry was unknown. Transfer
  // them exactly once when the retained graph proves ownership.
  pageErrors.push(...record.errors)
  record.onPopup = child => { addParent(child, target); reconcile() }
  target.on('popup', record.onPopup)
  return true
 }
 const reconcile = () => {
  if (reconciling) return
  reconciling = true
  try {
   let changed
   do {
    changed = false
    for (const [target, openers] of parents) {
     if (!owned.has(target) && [...openers].some(opener => owned.has(opener))) changed = adopt(target) || changed
    }
   } while (changed)
  } finally { reconciling = false }
 }
 const own = target => { adopt(target); reconcile() }
 const observePage = target => {
  if (target === callerPage || !watch(target)) return
  const record = watched.get(target)
  if (record.openerStarted) return
  record.openerStarted = true
  const work = (async () => {
   const opener = await target.opener()
   addParent(target, opener)
   reconcile()
  })().catch(() => { ownershipFault('OPORA preview ancestry check failed; request fence retained') })
  ownershipChecks.add(work)
  void work.then(() => ownershipChecks.delete(work))
 }
 const until = async (work, deadline, label) => {
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new Error('OPORA preview closure deadline reached during ' + label + '; request fence retained')
  let timer
  try {
   return await Promise.race([typeof work === 'function' ? work() : work, new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('OPORA preview closure deadline reached during ' + label + '; request fence retained')), remaining)
   })])
  } finally { clearTimeout(timer) }
 }
 const drain = async deadline => {
  do {
   if (ownershipFailure) throw ownershipFailure
   while (ownershipChecks.size) await until(Promise.all([...ownershipChecks]), deadline, 'ancestry drain')
   reconcile()
   if (ownershipFailure) throw ownershipFailure
   await until(guard.drain(), deadline, 'request drain')
  } while (ownershipChecks.size)
  reconcile()
  if (ownershipFailure) throw ownershipFailure
 }
 const assertClean = () => {
  guard.assertUntouched()
  assert.equal(pageErrors.length, 0, 'OPORA preview pages and popups must not raise page errors')
 }
 const detach = () => {
  context.off('page', observePage)
  for (const [target, { onError, onPopup }] of watched) {
   target.off('pageerror', onError)
   if (onPopup) target.off('popup', onPopup)
  }
 }
 // Install the fence before creating/navigating any owned page. Existing
 // context-wide diagnostics still see requests; local pageerrors need their
 // own listeners because the caller's listener does not cover a new page.
 await context.route('**/*', guard.route)
 routeInstalled = true
 context.on('page', observePage)
 try {
  page = await context.newPage()
  assert.notEqual(page, callerPage, 'The OPORA preview must not reuse the caller page')
  own(page)
  // Reuse the existing bounded passive navigation/HMR observer. This does not
  // warm, retry, navigate, intercept requests or excuse any original failure.
  // A missing observer is diagnostic-only; it must not replace the real gate.
  try { navigation = observePortraitNavigation(page, { origin, runtime }) } catch {}
  const viewport = callerPage.viewportSize()
  assert.ok(viewport, 'The OPORA preview requires the caller mobile viewport')
  await page.setViewportSize(viewport)
  for (const locale of ['en', 'ru']) {
   diagnosticLocale = locale
   diagnosticStage = 'invitation-entry'
   const t = OPORA_PUBLIC_ENTRY[locale], entry = '/' + locale + '/app/course?program=stress'
   // Keep the original anonymous course deep link; it must show the mandatory
   // seven-day invitation before the visitor elects to sign in.
   await page.goto(origin + entry)
   const { explore } = await assertInvite(page, expect, origin, locale)
   await assertMobileWidth(page, locale, 'first-week invitation')
   await screenshotEvidence(page, { path: output + '/course-invite-' + locale + '.png', fullPage: false })
   assertClean()
   // The full curriculum now lives behind this actual native programme link.
   // Do not replace it with page.goto or recreate the obsolete noncompact UI.
   diagnosticStage = 'programme-link'
   await explore.click()
   await expect(page).toHaveURL(origin + '/' + locale + '/courses/antistress')
   diagnosticStage = 'programme-content'
   const programme = page.locator('[data-opora-antistress-landing]')
   await expect(programme).toBeVisible()
   await expect(programme.getByRole('heading', { name: t.programmeTitle, level: 1, exact: true })).toBeVisible()
   const enrollment = programme.locator('a[data-antistress-start]').first()
   await expect(enrollment).toBeVisible()
   await expect(enrollment).toHaveAttribute('href', entry)
   const overview = programme.locator('[data-course-before-signup="guest"]')
   await expect(overview).toBeVisible()
   await expect(overview.locator('[data-course-phase]')).toHaveCount(7)
   await expect(overview.locator('[data-course-skill-accordion]')).toHaveCount(7)
   const firstStage = overview.locator('[data-course-skill-accordion]').first()
   await firstStage.locator('summary').click()
   await expect(firstStage).toHaveAttribute('open', '')
   const detailed = overview.locator('[data-course-14-day-list]')
   await detailed.locator('summary').first().click()
   await expect(detailed).toHaveAttribute('open', '')
   await expect(detailed.locator('[data-course-day]')).toHaveCount(14)
   assert.deepEqual(await detailed.locator('[data-course-day]').evaluateAll(days => days.map(day => day.getAttribute('data-course-day'))),
    Array.from({ length: 14 }, (_, index) => String(index + 1)))
   // The baseline remains Weekly Pulse; GAD-7 and Resource Pulse stay optional.
   // Viewing their descriptions is not choosing, starting or submitting tests.
   const questionnaires = programme.locator('[data-antistress-test]')
   await expect(questionnaires).toHaveCount(3)
   assert.deepEqual(await questionnaires.evaluateAll(cards => cards.map(card => card.getAttribute('data-antistress-test'))),
    ['hh-weekly-pulse', 'gad-7', 'hh-resource-pulse'])
   for (const [key, count, core] of [['hh-weekly-pulse', 8, true], ['gad-7', 7, false], ['hh-resource-pulse', 6, false]]) {
    const card = programme.locator('[data-antistress-test="' + key + '"]')
    await expect(card.getByText(locale === 'ru' ? core ? 'Основной' : 'По желанию' : core ? 'Core' : 'Optional', { exact: true })).toBeVisible()
    await expect(card.getByText(count + (locale === 'ru' ? ' вопросов' : ' questions'), { exact: true })).toBeVisible()
   }
   await assertMobileWidth(page, locale, 'full programme')
   await screenshotEvidence(page, { path: output + '/course-public-' + locale + '.png', fullPage: false })
   assertClean()
   // This public link only returns to the invitation. Never click its OAuth
   // button or submit affirmative enrolment in this anonymous coverage.
   diagnosticStage = 'enrollment-backlink'
   await enrollment.click()
   await assertInvite(page, expect, origin, locale)
   assertClean()
  }
 } catch (error) {
  primaryFailed = true
  primaryError = error
  // Capture before closing the owned page. Only the observer's allowlisted,
  // bounded evidence is emitted; never the original error, URL query or body.
  try {
   navigation?.mark('failure')
   console.log('SYNTHETIC_OPORA_NAVIGATION_DIAGNOSTIC', JSON.stringify({ locale: diagnosticLocale, stage: diagnosticStage,
    observation: navigation ? navigation.stop() : { unavailable: true } }))
  } catch { /* Diagnostics must preserve the original assertion. */ }
 } finally {
  // Successful journeys stay quiet. Stop even if evidence recording failed;
  // the separate ownership/pageerror guards remain active through cleanup.
  try { navigation?.stop() } catch {}
  // Only a bounded closure of the observed owned-page graph is certified.
  // Failed/incomplete ancestry, caps or closes retain the fence and listeners.
  const deadline = Date.now() + closureTimeoutMs
  let closes = 0
  const liveOwned = () => [...owned].filter(target => !target.isClosed())
  const restoreFence = async () => {
   if (!routeInstalled) {
    // Reserve at most one second for restoring an uncertain removed fence,
    // even if the closure deadline itself has just elapsed.
    await until(() => context.route('**/*', guard.route), Math.max(deadline, Date.now() + 1000), 'fence restoration')
    routeInstalled = true
   }
  }
  const closeOwned = async () => {
   for (;;) {
    // An early grandchild edge must settle/reconcile BEFORE its parent closes.
    await drain(deadline)
    const target = liveOwned()[0]
    if (!target) return
    if (closes++ >= maxCloses) throw new Error('OPORA preview close-operation cap reached; request fence retained')
    await until(() => target.close({ runBeforeUnload: false }), deadline, 'owned page close')
    if (!target.isClosed()) throw new Error('Owned OPORA preview page did not close; request fence retained')
   }
  }
  try {
   await closeOwned()
   await drain(deadline)
   const beforeRemoval = generation
   try { await until(() => context.unroute('**/*', guard.route), deadline, 'fence removal'); routeInstalled = false }
   catch (error) {
    // Removal failure has an uncertain result, so restore rather than assume
    // the previous handler survived. Do not replace an earlier assertion.
    routeInstalled = false
    await restoreFence()
    throw error
   }
   // Page/popup events can be delivered during unroute. Never use a stale
   // pre-removal live set or silently detach a newly adopted descendant.
   if (generation !== beforeRemoval || ownershipChecks.size || guard.hasPending() || liveOwned().length) {
    await restoreFence()
    await closeOwned()
    await drain(deadline)
    assertClean()
    throw new Error('OPORA preview fence removal was not quiescent; request fence retained')
   }
   await drain(deadline)
   if (generation !== beforeRemoval || ownershipChecks.size || liveOwned().length) {
    await restoreFence()
    await closeOwned()
    await drain(deadline)
    assertClean()
    throw new Error('OPORA preview late ownership after removal; request fence retained')
   }
   assertClean()
   detach()
  } catch (error) {
   cleanupErrors.push(error)
   // A failed request/page assertion after all pages closed need not leave a
   // guard behind; uncertain/living ownership always must. No caller is closed.
   if (ownershipFailure || ownershipChecks.size || liveOwned().length) {
    try { await restoreFence() } catch (restoreError) { cleanupErrors.push(restoreError) }
   }
   if (!routeInstalled && !ownershipFailure && !ownershipChecks.size && !liveOwned().length) {
    try { detach() } catch (detachError) { cleanupErrors.push(detachError) }
   }
  }
 }
 if (primaryFailed) throw primaryError
 if (cleanupErrors.length) throw cleanupErrors[0]
}
