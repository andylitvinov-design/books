import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
import { recommendProfileBattery } from '../lib/profile/profile-battery.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('profile selection covers only real declared axes and does not invent financial/health scores', () => {
  const entries = [
    { key: 'body', axes: ['sleep', 'stress'], minutes: 2, free: true, rightsStatus: 'cleared' },
    { key: 'work', axes: ['focus', 'functioning'], minutes: 4, free: true, rightsStatus: 'cleared' },
    { key: 'full', axes: ['stress', 'focus', 'functioning'], minutes: 9, free: true, rightsStatus: 'cleared' },
    { key: 'paid', axes: ['meaning'], free: false },
    { key: 'blocked', axes: ['meaning'], rightsStatus: 'restricted' },
    { key: 'optin', axes: ['meaning'], explicitOptIn: true },
    { key: 'no-access', axes: ['meaning'], selectable: false },
  ]
  assert.deepEqual(recommendProfileBattery(entries, ['sleep', 'stress', 'focus', 'functioning']), ['full', 'body'])
  assert.deepEqual(recommendProfileBattery(entries, ['meaning']), [])
  assert.deepEqual(recommendProfileBattery(entries, ['money', 'health']), [])
  assert.deepEqual(recommendProfileBattery(entries, ['sleep', 'sleep']), ['body'])
  assert.deepEqual(recommendProfileBattery(entries, [], 5), [])
  assert.deepEqual(recommendProfileBattery(entries, ['sleep'], 0), [])
  assert.deepEqual(recommendProfileBattery(entries, ['sleep'], 13), ['body'])
  assert.ok(Object.isFrozen(recommendProfileBattery(entries, ['sleep'])))
})

test('public route uses existing verified guest catalogue, with strict eligibility and locale parity', () => {
  const page = read('app/[locale]/personality-profiles/page.tsx')
  const component = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')
  const home = read('components/home-featured-workspace.tsx')
  assert.match(page, /isPublicLocale\(locale\)/)
  assert.match(page, /buildExplorerEntries\(\{ locale: catalogueLocale, audience: "guest" \}\)/)
  for (const term of ['entry.selectable === true', 'entry.startable === true',
    'entry.guestEligible === true', 'entry.starterEligible !== false',
    'entry.free === true', 'entry.rightsStatus === "cleared"',
    'entry.explicitOptIn !== true', 'entry.scaleGuide?.measurementAxes?.length'])
    assert.ok(page.includes(term), term)
  assert.match(page, /generateStaticParams/)
  for (const locale of ['en', 'ru', 'es']) {
    assert.match(page, new RegExp('locale: "' + locale + '"'))
    assert.ok(page.includes('/' + locale + '/personality-profiles'))
    assert.ok(component.includes(locale + ': {'))
  }
  assert.match(component, /type Template = "personal" \| "business" \| "wellbeing" \| "comprehensive"/)
  assert.match(component, /type Area = "body" \| "energy" \| "business" \| "money" \| "health" \| "growth"/)
  assert.match(component, /selectAll: "Выбрать все"/)
  assert.match(component, /setSelectedKeys\(\[\.\.\.recommendProfileBattery\(matches, selectedAxes\)\]\)/)
  assert.match(component, /startTests=/)
  assert.match(component, /encodeURIComponent\(selectedKeys.join\(","\)\)/)
  assert.match(component, /data-profile-account-gate/)
  assert.match(component, /data-profile-google-signin/)
  assert.match(component, /data-profile-start-tests/)
  assert.match(component, /data-profile-review-account/)
  assert.match(component, /PENDING_TEST_SELECTION_KEY, makeTestSelectionIntent/)
  assert.match(component, /auth\/contact-profile/)
  assert.match(component, /continueTo: "tests"/)
  assert.match(component, /accountLocale/)
  assert.match(component, /app\/tests\?selection=pending/)
  assert.match(component, /t.gateGuest/)
  assert.match(component, /accountBusy/)
  for (const term of ['gateGoogle:', 'gateGuest:', 'gateGuestNote:', 'gateStorageError:', 'gateCheckError:', 'gateGoogleError:']) {
    assert.equal(component.split(term).length - 1, 3, 'EN/RU/ES must have ' + term)
  }
  assert.match(component, /\[step, setStep\] = useState\(0\)/)
  assert.match(component, /<details className=\{styles.swot\}>/)
  assert.match(component, /data-personality-profile-builder/)
  assert.match(component, /\/app\/portfolio#hh-development-program/)
  assert.match(component, /locale === "es" \? "en" : locale/)
  assert.doesNotMatch(component, /fetch\(|navigator\.sendBeacon|autoEnroll|saveProfile\(|payment_success/)
  assert.match(home, /profile: "\/" \+ locale \+ "\/personality-profiles"/)
  assert.ok(css.includes('@media (max-width: 640px)'))
  assert.ok(css.includes('@media (max-width: 350px)'))
  assert.ok(css.includes('focus-visible'))
  assert.ok(css.includes('prefers-reduced-motion'))
})

test('home Stage 2 is one free service while account reports remain separate and private', () => {
  const source = read('components/home-featured-workspace.tsx')
  const start = source.indexOf('const copy = ') + 'const copy = '.length
  const end = source.indexOf(' as const;', start)
  const copy = JSON.parse(source.slice(start, end))
  for (const locale of ['en', 'ru', 'es']) {
    const personality = copy[locale].modules.personality
    assert.equal(personality.offers.length, 1)
    assert.equal(personality.offers[0].id, 'profile')
    assert.ok(personality.offers[0].cta.match(/free|бесплатно|gratis/i))
  }
  assert.match(source, /data-home-offer-card=\{offer.id\}/)
  assert.match(source, /data-home-reports-cta/)
  assert.match(source, /data-home-development-cta/)
  assert.match(source, /freeOfferIds: ReadonlySet<OfferId>/)
  assert.match(source, /"reiki", "opora", "profile", "review", "aiCoaching"/)
})

function profileBuilderHarness(locale, { authenticated = false, storageBlocked = false, authStatus = 401 } = {}) {
  const ts = require('typescript')
  const source = read('components/personality-profiles-builder.tsx')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const elements = node => node == null || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap(elements)
      : [node, ...elements(node.props?.children)]
  let cursor = 0
  const state = []
  const hooks = {
    useState(initial) {
      const i = cursor++
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial
      return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value }]
    },
    useMemo: callback => callback(),
  }
  const records = new Map()
  const navigation = []
  const calls = []
  const window = {
    sessionStorage: {
      getItem: key => records.get(key) ?? null,
      setItem(key, value) {
        if (storageBlocked) throw new Error('STORAGE_BLOCKED')
        records.set(key, value)
      },
    },
    location: { assign: url => navigation.push(url) },
  }
  const context = { exports: {}, window, console, Date }
  const jsx = (type, props, key) => ({ type, props, key })
  context.require = name => {
    if (name === 'react') return hooks
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (name === 'next/link') return { default: 'Link' }
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key })
    if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) }
    if (name === '@/lib/profile/profile-battery') return { recommendProfileBattery: () => ['hh-resource-pulse'] }
    if (name === '@/lib/app/test-selection-intent') return {
      PENDING_TEST_SELECTION_KEY: 'hh-test-selection-intent-v1',
      makeTestSelectionIntent: keys => JSON.stringify({ keys }),
    }
    if (name === '@/lib/app/client-fetch') return {
      appFetch: async (path, body) => {
        calls.push({ path, body })
        if (path === 'auth/contact-profile') {
          if (authenticated) return { displayName: 'Private user' }
          throw Object.assign(new Error('NO_SESSION'), { status: authStatus })
        }
        if (path === 'auth/start') return { redirectUrl: 'https://auth.example.invalid/oauth' }
        throw new Error('UNEXPECTED_ENDPOINT')
      },
    }
    throw new Error('UNEXPECTED_MODULE: ' + name)
  }
  vm.runInNewContext(compiled, context)
  const input = { locale, tests: [
    { key: 'hh-resource-pulse', title: 'Resources', axes: ['energy', 'resource'], minutes: 1, questions: 6 },
  ] }
  const render = () => {
    cursor = 0
    return elements(context.exports.PersonalityProfilesBuilder(input))
  }
  const find = (nodes, match, message) => {
    const element = nodes.find(match)
    assert.ok(element, message)
    return element
  }
  // Independently exercise the last-step account gate. This harness does
  // not simulate React's full reconciliation across the earlier wizard stages.
  const reachSelection = async () => {
    render()
    state[0] = 3 // final test-selection stage
    state[4] = ['hh-resource-pulse'] // chosen test keys
    assert.ok(find(render(), node => node.props?.['data-profile-review-account'], 'selection CTA'))
  }
  return { render, find, reachSelection, calls, navigation, records }
}

test('profile builder Google gate routes an unsigned visitor through the existing PKCE tests continuation', async () => {
  for (const locale of ['en', 'ru', 'es']) {
    const harness = profileBuilderHarness(locale)
    await harness.reachSelection()
    const review = harness.find(harness.render(), node => node.props?.['data-profile-review-account'], 'review CTA')
    await review.props.onClick()
    assert.ok(harness.find(harness.render(), node => node.props?.['data-profile-account-gate'], 'Google gate'))
    assert.equal(harness.navigation.length, 0, 'no forced OAuth or guest navigation')
    assert.equal(harness.records.size, 0, 'no storage before explicit Google click')
    const guest = harness.find(harness.render(), node => node.props?.['data-profile-start-tests'], 'guest fallback')
    assert.equal(guest.type, 'Link')
    assert.equal(guest.props.href, '/' + (locale === 'es' ? 'en' : locale) +
      '/client?startTests=hh-resource-pulse')
    await harness.find(harness.render(), node => node.props?.['data-profile-google-signin'], 'Google action').props.onClick()
    assert.equal(harness.navigation[0], 'https://auth.example.invalid/oauth')
    assert.deepEqual(JSON.parse(harness.records.get('hh-test-selection-intent-v1')).keys, ['hh-resource-pulse'])
    assert.equal(harness.calls.find(call => call.path === 'auth/start').body.continueTo, 'tests')
    assert.equal(harness.calls.find(call => call.path === 'auth/start').body.locale, locale === 'es' ? 'en' : locale)
  }
})

test('signed-in profile builder saves the existing selection without showing another Google prompt', async () => {
  const harness = profileBuilderHarness('en', { authenticated: true })
  await harness.reachSelection()
  await harness.find(harness.render(), node => node.props?.['data-profile-review-account'], 'selection CTA').props.onClick()
  assert.equal(harness.navigation[0], '/en/app/tests?selection=pending')
  assert.deepEqual(JSON.parse(harness.records.get('hh-test-selection-intent-v1')).keys, ['hh-resource-pulse'])
  assert.ok(!harness.render().some(node => node.props?.['data-profile-account-gate']))
  assert.equal(harness.calls.some(call => call.path === 'auth/start'), false)
})

test('profile builder degrades safely when browser storage or account check fails', async () => {
  const blocked = profileBuilderHarness('en', { storageBlocked: true })
  await blocked.reachSelection()
  await blocked.find(blocked.render(), node => node.props?.['data-profile-review-account']).props.onClick()
  await blocked.find(blocked.render(), node => node.props?.['data-profile-google-signin']).props.onClick()
  assert.equal(blocked.calls.some(call => call.path === 'auth/start'), false)
  assert.equal(blocked.navigation.length, 0)
  assert.ok(blocked.find(blocked.render(), node => node.props?.role === 'alert', 'storage failure'))

  const unavailable = profileBuilderHarness('ru', { authStatus: 503 })
  await unavailable.reachSelection()
  await unavailable.find(unavailable.render(), node => node.props?.['data-profile-review-account']).props.onClick()
  assert.ok(unavailable.find(unavailable.render(), node => node.props?.role === 'alert', 'auth failure'))
  assert.ok(unavailable.find(unavailable.render(), node => node.props?.['data-profile-start-tests'], 'guest fallback'))
})
