import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const page = read('app/[locale]/practice/page.jsx')
const showcase = read('components/practice-showcase.jsx')
const css = read('components/practice-showcase.module.css')
const auth = read('app/api/app/[...path]/route.js')
const editor = read('components/app/practice-workspace.jsx')
const rootLayout = read('app/layout.tsx')
const middleware = read('middleware.ts')
const promoBanner = read('components/sitewide-antistress-banner.tsx')
const siteBottomNavigation = read('components/mobile-bottom-navigation.tsx')
const legacyAppRoute = read('app/[locale]/app/[[...path]]/page.jsx')
const accountWorkspace = read('components/app/app-workspace.jsx')
const homePersonalSpace = read('components/home-personal-space.tsx')

test('public practice preview supports EN/RU/ES with request-specific CSP nonces', () => {
  assert.ok(page.includes("['en', 'ru', 'es']"))
  assert.ok(page.includes("export const dynamic = 'force-dynamic'"))
  assert.ok(page.includes('export const revalidate = 0'))
  assert.ok(!page.includes("export const dynamic = 'force-static'"))
  assert.ok(page.includes('<PracticeShowcase locale={locale} />'))
  assert.ok(page.includes('index: false'))
  assert.ok(rootLayout.includes('const nonce = (await headers()).get("x-nonce")'))
  assert.ok(rootLayout.includes('nonce={nonce}'))
  assert.ok(middleware.includes('const nonce = crypto.randomUUID()'))
  assert.ok(middleware.includes("'strict-dynamic'"))
})

test('anonymous guests can view design without private identity and metrics', () => {
  assert.ok(showcase.startsWith("'use client'"))
  assert.ok(showcase.includes("appFetch('bootstrap', undefined, undefined, { signal })"))
  assert.ok(showcase.includes("fetch('/api/app/practice', { credentials:'same-origin', cache:'no-store', signal })"))
  assert.ok(showcase.includes("signedIn && practice ? String(active) : t.countUnknown"))
  assert.ok(showcase.includes("signedIn && practice ? String(newRequests) : t.countUnknown"))
  assert.ok(showcase.includes("countUnknown:'—'"))
  assert.ok(showcase.includes("item.status === 'published'"))
  assert.ok(!showcase.includes('localStorage'))
})

test('guest actions prompt for Google and return to the same showroom after OAuth', () => {
  assert.ok(showcase.includes('setPendingAction(key)'))
  assert.ok(showcase.includes('pendingAction && !signedIn'))
  assert.ok(showcase.includes('aria-modal="true"'))
  assert.ok(showcase.includes('async function confirmSignIn()'))
  assert.ok(showcase.includes("appFetch('auth/start', { locale, continueTo:'practice-preview' })"))
  assert.ok(auth.includes("continueTo === 'practice-preview'"))
  assert.ok(showcase.includes('CREATE.map('))
  assert.ok(showcase.includes('CATEGORIES.map('))
  assert.ok(showcase.includes('TOOLS.map('))
})

test('approved mock owns its five-tab navigation without the sitewide promo', () => {
  assert.ok(promoBanner.includes('The standalone practitioner mockup'))
  assert.ok(promoBanner.includes('/practice'))
  assert.ok(siteBottomNavigation.includes('The public practitioner showcase'))
  assert.ok(siteBottomNavigation.includes('/practice'))
  assert.ok(showcase.includes('className={styles.bottomNav}'))
  assert.ok(showcase.includes('TABS.map('))
  assert.ok(!showcase.includes('className={styles.eyebrow}'))
  assert.ok(!showcase.includes('<h2>{t.creations}</h2>'))
  assert.ok(!showcase.includes('className={styles.gate}'))
})

test('iPhone 320–430 mock has inline profile, six horizontal actions and six visible covers', () => {
  assert.ok(css.includes('.screen .identity { grid-template-columns:54px minmax(0,1fr) 124px'))
  assert.ok(css.includes('.screen .metrics { grid-column:auto'))
  assert.ok(css.includes('.screen .quickTile { display:flex; flex-direction:row'))
  assert.ok(css.includes('.screen .offerRail { display:grid; grid-template-columns:repeat(6,minmax(0,1fr))'))
  assert.ok(css.includes('.screen .hero { min-height:190px'))
  assert.ok(css.includes('@media(max-width:354px)'))
  assert.ok(css.includes('safe-area-inset-bottom'))
})

test('existing protected service, meditation and course editors remain available', () => {
  assert.ok(showcase.includes('panel=services&create=1&starter=session'))
  assert.ok(showcase.includes('panel=services&create=1&starter=energy'))
  assert.ok(showcase.includes('panel=materials&materialTab=courses&create=1&meditation=audio'))
  assert.ok(showcase.includes('panel=materials&materialTab=courses&create=1'))
  assert.ok(showcase.includes("practice:'/' + locale + '/practice'"))
  assert.ok(editor.includes("const meditation=params.get('meditation')"))
  assert.ok(editor.includes('setMeditationType(meditation)'))
})

test('the Practice tab remains on the approved screen, without Google or a personal-login detour', () => {
  assert.ok(showcase.includes("if (key === 'practice') {"))
  assert.ok(showcase.includes("window.scrollTo({ top: 0, behavior: 'smooth' })"))
  assert.ok(showcase.includes("home:'/' + locale"))
  assert.ok(!showcase.includes("home:'/' + appLocale + '/app/portrait'"))
  assert.ok(showcase.includes("practice:'/' + locale + '/practice'"))
})

test('every old plain My Practice link now resolves to the new public screen', () => {
  assert.ok(legacyAppRoute.includes("path[0] === 'practice' && path.length === 1"))
  assert.ok(legacyAppRoute.includes("const privateEditorIntent = ['panel','materialTab','create','starter','meditation','requestId']"))
  assert.ok(legacyAppRoute.includes("if (!privateEditorIntent) redirect('/' + locale + '/practice')"))
  assert.ok(accountWorkspace.includes("href: '/' + locale + '/practice'"))
  assert.ok(accountWorkspace.includes("href={'/' + locale + '/practice'}"))
  assert.ok(homePersonalSpace.includes('href={"/" + activeLocale + "/practice"}'))
  assert.ok(editor.includes("href={'/'+locale+'/practice'}"))
})

test('Google My Practice callback goes to new screen except for explicit protected editors', () => {
  assert.ok(auth.includes("continueTo === 'practice-preview'"))
  assert.ok(auth.includes("continueTo === 'my-practice'"))
  assert.ok(auth.includes("? profi"))
  assert.ok(auth.includes(": `${origin}/${locale}/practice`"))
  assert.ok(auth.includes("? `${origin}/${locale}/app/practice${profi === 'course'"))
  assert.ok(showcase.includes("panel=services&create=1&starter=session"))
})

test('plain legacy Practice URL redirects before the private Account streams HTML', () => {
  // A Next.js redirect inside a streamed page otherwise returns HTTP 200 and a delayed meta refresh.
  assert.ok(middleware.includes('const oldPractice = request.nextUrl.pathname.match'))
  assert.ok(middleware.includes("oldPractice && ['GET', 'HEAD'].includes(request.method)"))
  assert.ok(middleware.includes("'panel', 'materialTab', 'create', 'starter', 'meditation', 'requestId'"))
  assert.ok(middleware.includes('request.nextUrl.searchParams.has(key)'))
  assert.ok(middleware.includes("new URL('/' + oldPractice[1] + '/practice', request.url)"))
  assert.ok(middleware.includes('status: 307'))
  assert.ok(middleware.includes("'Cache-Control': 'private, no-store'"))
  assert.ok(legacyAppRoute.includes("if (!privateEditorIntent) redirect('/' + locale + '/practice')"))
})
