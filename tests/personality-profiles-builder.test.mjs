import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
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
