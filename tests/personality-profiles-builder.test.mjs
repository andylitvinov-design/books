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
  assert.ok(component.includes('type Focus = "wellbeing" | "relationships" | "work" | "identity"'))
  assert.ok(component.includes('type Area = "traits" | "support" | "emotions" | "recovery"'))
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

test('first visit shows a single clear CTA and explanation before the profile wizard', () => {
  const component = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')

  assert.match(component, /\[started, setStarted\] = useState\(false\)/)
  assert.match(component, /\{!started \? <>/)
  assert.match(component, /data-profile-begin/)
  assert.match(component, /onClick=\{\(\) => setStarted\(true\)\}/)
  assert.match(component, /styles\.roadmapSteps/)
  assert.match(component, /t\.journey\.map/)
  assert.match(component, /setStarted\(false\); setStep\(0\)/)
  assert.match(component, /aria-labelledby="profile-builder-journey-title"/)
  assert.match(component, /styles\.templateBody/)
  assert.ok(component.includes('data-profile-focus-selection'))
  assert.match(component, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/)
  for (const entry of ['entryButton: "Create my profile"',
    'entryButton: "Создать свой профиль"', 'entryButton: "Crear mi perfil"',
    'entryHint: "Пройти тесты и получить рекомендации по развитию"'])
    assert.ok(component.includes(entry), entry)
  assert.ok(css.includes('.begin {'))
  assert.ok(css.includes('.roadmapSteps {'))
  assert.ok(css.includes('.templateGrid { grid-template-columns: 1fr; gap: 8px; }'))
  assert.ok(css.includes('.shell button:focus-visible'))
  assert.ok(!component.includes('["✦", "◈", "◌", "✳"]'))
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

test('unified profile is multi-select and describes four separate analysis layers', () => {
  const component = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')
  for (const focus of ['wellbeing', 'relationships', 'work', 'identity']) {
    assert.ok(component.includes(focus + ': ['), focus)
  }
  for (const token of [
    'data-profile-focus-selection', 'data-profile-focus={key}', 'data-profile-confirm-focus',
    'aria-pressed={focuses.includes(key)}', 'disabled={focuses.length === 0}',
    'const suggested = areasFor(focuses)', 'data-profile-four-layers', 't.layers.map',
    'ONE PERSONAL PROFILE', 'ОДИН ЛИЧНЫЙ ПРОФИЛЬ', 'UN PERFIL PERSONAL',
  ]) assert.ok(component.includes(token), token)
  assert.ok(!component.includes('data-profile-kind='))
  assert.ok(!component.includes('setTemplate('))
  assert.ok(css.includes('.templateCard[aria-pressed="true"]'))
  assert.ok(css.includes('.layerDetails'))
  assert.ok(css.includes('@media (max-width: 350px)'))
})


test('four life directions retain all nine topics, are localized and require an explicit selection', () => {
  const component = read('components/personality-profiles-builder.tsx')
  const sections = [...component.matchAll(/^    focuses: \{\n([\s\S]*?)^    \},/gm)]
  assert.equal(sections.length, 3, 'EN, RU, ES must have matching focus options')
  const directions = ['wellbeing', 'relationships', 'work', 'identity']
  for (const section of sections) {
    assert.deepEqual([...section[1].matchAll(/^      ([a-z]+): \[/gm)].map(match => match[1]), directions)
  }
  for (const phrase of [
    'Body, health & energy', 'Relationships & connection',
    'Work, business & money', 'Personality & personal growth',
    'Тело, здоровье и энергия', 'Отношения и близость',
    'Дело, бизнес и деньги', 'Личность и развитие',
    'Cuerpo, salud y energía', 'Relaciones y cercanía',
    'Trabajo, negocios y dinero', 'Personalidad y crecimiento',
  ]) assert.ok(component.includes(phrase), phrase)
  assert.match(component, /identity: \["traits", "support", "meaning"\]/)
  assert.match(component, /wellbeing: \["emotions", "recovery", "body"\]/)
  assert.match(component, /relationships: \["connection"\]/)
  assert.match(component, /work: \["work", "money"\]/)
  assert.match(component, /\[focuses, setFocuses\] = useState<Focus\[]>\(\[\]\)/)
  assert.match(component, /\[areas, setAreas\] = useState<Area\[]>\(\[\]\)/)
  assert.doesNotMatch(component, /purpose: \[/)
  assert.doesNotMatch(component, /not five diagnoses|пять диагнозов|cinco diagnósticos/)
})
