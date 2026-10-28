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

test('public practitioner preview is a dedicated locale page, not the private /app route', () => {
  assert.match(page, /SUPPORTED_LOCALES = \['en', 'ru', 'es'\]/)
  assert.match(page, /<PracticeShowcase locale=\{locale\}/)
  assert.match(page, /index: false/)
  assert.ok(!page.includes('redirect(\'/ru/app/practice\')'))
})

test('public preview renders per request so strict CSP permits interactive hydration', () => {
  // Next.js force-static erases root request headers. The HTML then has no
  // nonce while middleware requires nonce + strict-dynamic for its JS chunks.
  // Static pre-render made all guest buttons inert, despite HTTP 200/build READY.
  assert.match(page, /export const dynamic = 'force-dynamic'/)
  assert.match(page, /export const revalidate = 0/)
  assert.doesNotMatch(page, /force-static/)
  assert.match(rootLayout, /const nonce = \(await headers\(\)\)\.get\("x-nonce"\)/)
  assert.match(rootLayout, /nonce=\{nonce\}/)
  assert.match(middleware, /const nonce = crypto\.randomUUID\(\)/)
  assert.match(middleware, /'strict-dynamic'/)
})

test('guest preview loads no private practitioner data on the server', () => {
  assert.match(showcase, /^\s*'use client'/)
  assert.match(showcase, /appFetch\('bootstrap', undefined, undefined, \{ signal \}\)/)
  assert.match(showcase, /fetch\('\/api\/app\/practice', \{ credentials:'same-origin', cache:'no-store', signal \}\)/)
  assert.match(showcase, /setSession\(error\?\.status === 401 \? 'guest' : 'unavailable'\)/)
  assert.match(showcase, /signedIn && practice \? String\(active\) : t.countUnknown/)
  assert.match(showcase, /signedIn && practice \? String\(newRequests\) : t.countUnknown/)
  assert.doesNotMatch(showcase, /localStorage|service_role|supabaseKey|S[A-Z_]*SECRET/)
})

test('every practitioner action is gated by server-verified Google session', () => {
  assert.match(showcase, /if \(signedIn\) \{\s*router.push\(destination\(locale, key\)\)/)
  assert.match(showcase, /await appFetch\('bootstrap'\)/)
  assert.match(showcase, /if \(error\?\.status !== 401\) throw error/)
  assert.match(showcase, /appFetch\('auth\/start', \{ locale, continueTo:'practice-preview' \}\)/)
  assert.match(showcase, /CREATE\.map\(/)
  assert.match(showcase, /CATEGORIES\.map\(/)
  assert.match(showcase, /TOOLS\.map\(/)
  assert.match(showcase, /TABS\.map\(/)
})

test('anonymous clicks open an explicit Google confirmation instead of navigating immediately', () => {
  assert.match(showcase, /setPendingAction\(key\)/)
  assert.match(showcase, /async function confirmSignIn\(\)/)
  assert.match(showcase, /aria-modal="true"/)
  assert.match(showcase, /onClick=\{\(\) => void confirmSignIn\(\)\}/)
  assert.match(showcase, /onClick=\{\(\) => setPendingAction\(''\)\}/)
})

test('OAuth allowlist returns to exactly the same language-specific public page', () => {
  assert.equal((auth.match(/'practice-preview'/g) || []).length >= 5, true)
  assert.match(auth, /continueTo === 'practice-preview'[\s\S]{0,90}\$\{origin\}\/\$\{locale\}\/practice/)
  assert.match(auth, /\['enquiry','coaching-intake','practice-preview'\]\.includes/)
  assert.doesNotMatch(showcase, /continueTo:\s*window\.location|returnPath:/)
})

test('creation shortcuts use existing protected editors, including meditation type', () => {
  assert.match(showcase, /panel=services&create=1&starter=session/)
  assert.match(showcase, /panel=services&create=1&starter=energy/)
  assert.match(showcase, /panel=materials&materialTab=courses&create=1&meditation=audio/)
  assert.match(showcase, /panel=materials&materialTab=courses&create=1/)
  assert.match(editor, /const meditation=params\.get\('meditation'\)/)
  assert.match(editor, /\['audio','video'\]\.includes\(meditation\)/)
  assert.match(editor, /\['profile','requests','analytics','events'\]\.includes/)
})

test('approved phone mock owns its header and five-tab bar without the sitewide chrome', () => {
  // The public promo and seven-item site navigation previously displaced and
  // obscured the compact practitioner mockup on real iPhone screenshots.
  assert.match(promoBanner, /\\/practice\\/\\?\\
  assert.match(css, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /@media \(max-width: 354px\)/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(showcase, /countUnknown:'—'/)
  assert.match(showcase, /item\.status === 'published'/)
})
|practice\\\\/\\?\\$/)
  assert.ok(siteBottomNavigation.includes('practice\\\\/?
  assert.match(showcase, /<nav className=\\{styles\\.bottomNav\\}/)
  assert.match(showcase, /TABS\\.map\\(/)
  assert.doesNotMatch(showcase, /<div className=\\{styles\\.eyebrow\\}/)
  assert.doesNotMatch(showcase, /<h2>\\{t\\.creations\\}<\\/h2>/)
  assert.doesNotMatch(showcase, /<aside className=\\{styles\\.gate\\}/)
})

test('approved phone mock uses compact one-row profile, six visible category covers and two action rows', () => {
  assert.match(css, /\\.screen \\.identity \\{ grid-template-columns:54px minmax\\(0,1fr\\) 124px/)
  assert.match(css, /\\.screen \\.metrics \\{ grid-column:auto/)
  assert.match(css, /\\.screen \\.quickTile \\{ min-height:63px/)
  assert.match(css, /\\.screen \\.quickTile \\{ display:flex; flex-direction:row/)
  assert.match(css, /\\.screen \\.offerRail \\{ display:grid; grid-template-columns:repeat\\(6,minmax\\(0,1fr\\)\\)/)
  assert.match(css, /\\.screen \\.hero \\{ min-height:190px/)
  assert.match(css, /@media\\(max-width:354px\\)/)
  assert.match(showcase, /pendingAction && !signedIn/)
  assert.match(showcase, /onClick=\\{\\(\\) => void openAction\\(key\\)\\}/)
})

test('mobile design respects iPhone safe area and creates no mock private records', () => {
  assert.match(css, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /@media \(max-width: 354px\)/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(showcase, /countUnknown:'—'/)
  assert.match(showcase, /item\.status === 'published'/)
})
))
  assert.match(showcase, /<nav className=\\{styles\\.bottomNav\\}/)
  assert.match(showcase, /TABS\\.map\\(/)
  assert.doesNotMatch(showcase, /<div className=\\{styles\\.eyebrow\\}/)
  assert.doesNotMatch(showcase, /<h2>\\{t\\.creations\\}<\\/h2>/)
  assert.doesNotMatch(showcase, /<aside className=\\{styles\\.gate\\}/)
})

test('approved phone mock uses compact one-row profile, six visible category covers and two action rows', () => {
  assert.match(css, /\\.screen \\.identity \\{ grid-template-columns:54px minmax\\(0,1fr\\) 124px/)
  assert.match(css, /\\.screen \\.metrics \\{ grid-column:auto/)
  assert.match(css, /\\.screen \\.quickTile \\{ min-height:63px/)
  assert.match(css, /\\.screen \\.quickTile \\{ display:flex; flex-direction:row/)
  assert.match(css, /\\.screen \\.offerRail \\{ display:grid; grid-template-columns:repeat\\(6,minmax\\(0,1fr\\)\\)/)
  assert.match(css, /\\.screen \\.hero \\{ min-height:190px/)
  assert.match(css, /@media\\(max-width:354px\\)/)
  assert.match(showcase, /pendingAction && !signedIn/)
  assert.match(showcase, /onClick=\\{\\(\\) => void openAction\\(key\\)\\}/)
})

test('mobile design respects iPhone safe area and creates no mock private records', () => {
  assert.match(css, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /@media \(max-width: 354px\)/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(showcase, /countUnknown:'—'/)
  assert.match(showcase, /item\.status === 'published'/)
})
