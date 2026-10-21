import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getCompactNavigation, navigationCopy } from '../lib/site-navigation-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('bottom-right compact navigation is Cabinet while retaining the existing account routes', () => {
  const labels = { en: 'Cabinet', ru: 'Кабинет', es: 'Gabinete' }
  for (const locale of ['en', 'ru', 'es']) {
    const item = getCompactNavigation(locale).at(-1)
    assert.equal(item.id, 'house')
    assert.equal(item.label, labels[locale])
    assert.equal(item.ariaLabel, labels[locale])
    assert.equal(item.href, '/' + (locale === 'es' ? 'en' : locale) + '/app')
    assert.equal(navigationCopy[locale].house, labels[locale])
  }
  const mobile = read('components/mobile-bottom-navigation.tsx')
  const icons = read('components/compact-navigation-icons.ts')
  assert.match(mobile, /^import \{ compactNavigationIcons \} from '\.\/compact-navigation-icons';$/m,
    'mobile Cabinet imports the shared icon map')
  assert.match(icons, /^import \{[^}\n]*\bLayoutDashboard\b[^}\n]*\} from 'lucide-react';$/m,
    'shared Cabinet icon is the lucide LayoutDashboard')
  assert.match(icons, /export const compactNavigationIcons = \{[^}]*\bhouse: LayoutDashboard,/,
    'shared icon map retains the Cabinet dashboard icon')
  assert.match(mobile, /const mobileItems = getCompactNavigation\(locale\);/,
    'mobile items come from the locale-aware navigation model')
  assert.match(mobile, /\{mobileItems\.map\(item => \{\s*const Icon = compactNavigationIcons\[item\.id as keyof typeof compactNavigationIcons\];\s*const content = <><Icon aria-hidden="true" \/><span>\{item\.label\}<\/span><\/>;/,
    'each rendered mobile item uses its shared icon and localized label')
  assert.match(mobile, /<Link key=\{item\.id\} data-nav-item=\{item\.id\} href=\{item\.href\} prefetch=\{false\}[^>]*>\{content\}<\/Link>/,
    'internal mobile links retain model destinations and shared content without prefetch')
})

test('portrait-only guest welcome explains growth tools and practitioner publishing', () => {
  const page = read('components/app/app-workspace.jsx')
  const portal = read('components/app/cabinet-guest-overview.jsx')
  const styles = read('components/app/cabinet-guest-overview.module.css')

  assert.match(page, /state !== 'ready' && page === 'portrait' && !stressSignup/)
  assert.match(page, /<CabinetGuestOverview/)
  assert.match(page, /onSignin=\{signin\}/)
  assert.match(page, /unavailable=\{state === 'unavailable'\}/)
  assert.match(page, /sessionNotice=\{state === 'error'\}/)
  assert.match(page, /const signinAttempted = useRef\(false\)/)
  assert.match(page, /signinAttempted.current = true/)
  assert.match(page, /errorMessage=\{signinAttempted.current && error \? message\(error, c\)/)
  assert.match(page, /appFetch\('auth\/start'/)
  assert.match(page, /if \(state !== 'ready' && page === 'course'/)
  assert.match(portal, /data-cabinet-guest-overview="true"/)
  assert.match(portal, /Explore free tests/)
  assert.match(portal, /professional questionnaires/)
  assert.match(portal, /progress charts/)
  assert.match(portal, /development programme/)
  assert.match(portal, /Save your courses/)
  assert.match(portal, /Present your services/)
  assert.match(portal, /Share articles and knowledge/)
  assert.match(portal, /ЛИЧНЫЙ КАБИНЕТ/)
  assert.match(portal, /GABINETE PERSONAL/)
  assert.match(portal, /publication review where required/)
  assert.match(portal, /role="alert"/)
  assert.match(portal, /sessionNotice && <p className=\{styles.sessionNotice\} role="status">/)
  assert.match(portal, /Couldn’t check|couldn’t check/iu)
  assert.match(portal, /onClick=\{onSignin\}/)
  assert.match(portal, /selectedLocale \+ '\/client\/tests'/)
  assert.match(styles, /@media \(max-width: 650px\)/)
  assert.match(styles, /grid-template-columns: minmax\(0,1fr\)/)
  assert.match(styles, /prefers-reduced-motion/)
})

test('signed-in Cabinet and course deep links retain private account handling', () => {
  const page = read('app/[locale]/app/[[...path]]/page.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(page, /redirect\('\/' \+ locale \+ '\/app\/portrait'\)/)
  assert.match(workspace, /if \(state !== 'ready' && page === 'portrait' && !stressSignup\)/)
  assert.match(workspace, /if \(state !== 'ready'\)/)
  assert.match(workspace, /const nav = \[/)
  assert.match(workspace, /id: 'practice'/)
})
