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
  assert.match(component, /recommendProfileTopThreeTests\(tests, scaleGroups,/)
  // On Tests an explicit guest CTA launches only selected eligible test keys.
  // Ready separately offers one opt-in Google save without a duplicate guest action.
  assert.match(component, /const testHref = base \+ "\/client\?startTests=" \+ encodeURIComponent\(selectedKeys.join\(","\)\)/)
  assert.match(component, /data-profile-start-tests/)
  assert.match(component, /data-profile-google-signin/)
  assert.match(component, /onClick={saveSelectionWithGoogle}/)
  assert.match(component, /makeTestSelectionIntent\(selectedKeys\)/)
  assert.match(component, /PENDING_TEST_SELECTION_KEY/)
  assert.match(component, /continueTo: "tests"/)
  assert.match(component, /app\/tests\?selection=pending/)
  assert.match(component, /data-profile-direct-tests/)
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
  for (const focus of ['wellbeing', 'relationships', 'work', 'identity', 'goal']) {
    assert.ok(component.includes(focus + ': ['), focus)
  }
  for (const token of [
    'data-profile-focus-selection', 'data-profile-focus={key}', 'data-profile-confirm-focus',
    'aria-pressed={focuses.includes(key)}', 'disabled={focuses.length === 0}',
    'setSelectedResearchIds([])', 'data-profile-four-layers', 't.layers.map',
    'ONE PERSONAL PROFILE', 'ОДИН ЛИЧНЫЙ ПРОФИЛЬ', 'UN PERFIL PERSONAL',
  ]) assert.ok(component.includes(token), token)
  assert.ok(!component.includes('data-profile-kind='))
  assert.ok(!component.includes('setTemplate('))
  assert.ok(css.includes('.templateCard[aria-pressed="true"]'))
  assert.ok(css.includes('.layerDetails'))
  assert.ok(css.includes('@media (max-width: 350px)'))
})


test('five life directions retain the original topics and add a goal-support topic', () => {
  const component = read('components/personality-profiles-builder.tsx')
  const sections = [...component.matchAll(/^    focuses: \{\n([\s\S]*?)^    \},/gm)]
  assert.equal(sections.length, 3, 'EN, RU, ES must have matching focus options')
  const directions = ['wellbeing', 'relationships', 'work', 'identity', 'goal']
  for (const section of sections) {
    assert.deepEqual([...section[1].matchAll(/^      ([a-z]+): \[/gm)].map(match => match[1]), directions)
  }
  for (const phrase of [
    'Goal Profile', 'Профиль цели', 'Perfil de la meta',
    'Body, health & energy', 'Relationships & connection',
    'Work, business & money', 'Personality & personal growth',
    'Тело, здоровье и энергия', 'Отношения и близость',
    'Дело, бизнес и деньги', 'Личность и развитие',
    'Cuerpo, salud y energía', 'Relaciones y cercanía',
    'Trabajo, negocios y dinero', 'Personalidad y crecimiento',
  ]) assert.ok(component.includes(phrase), phrase)
  for (const name of ['PROFILE_AREA_AXES', 'profileAreasWithTests'])
    assert.ok(component.includes(name), 'uses shared source-backed taxonomy: ' + name)
  assert.match(component, /\[focuses, setFocuses\] = useState<Focus\[]>\(\[\]\)/)
  assert.match(component, /\[selectedResearchIds, setSelectedResearchIds\] = useState<string\[\]>\(\[\]\)/)
  assert.doesNotMatch(component, /purpose: \[/)
  assert.doesNotMatch(component, /not five diagnoses|пять диагнозов|cinco diagnósticos/)
})

test('browse free tests opens the real catalogue and positions the existing personal review offer once', () => {
  const builder = read('components/personality-profiles-builder.tsx')
  const page = read('app/[locale]/client/tests/page.tsx')
  const explorer = read('components/app/public-test-explorer.jsx')
  const offers = read('components/sitewide-antistress-banner.tsx')
  const link = "href={'/' + locale + '/client/tests'} prefetch={false} data-profile-direct-tests"
  assert.ok(builder.includes(link), 'browse link must go directly to the guest test explorer')
  assert.ok(!builder.includes("href={'/' + locale + '/tests'} prefetch={false} data-profile-direct-tests"))
  assert.ok(page.includes("reviewFirst />"), 'only the standalone tests page moves the offer to the top')
  assert.ok(explorer.includes("reviewFirst && <TestSelectionCourseBanner locale={locale} showCourse={false} showReview />"))
  assert.ok(explorer.includes("<TestSelectionCourseBanner locale={locale} showReview={!reviewFirst} />"))
  assert.ok(offers.includes("showReview = false, showCourse = true"))
  assert.ok(offers.includes("{showCourse && ("))
  assert.ok(offers.includes('const reviewLanding = "/" + locale + "/services/free-situation-review"'))
  assert.ok(offers.includes("data-tests-review-banner"))
  for (const locale of ['en', 'ru', 'es']) {
    assert.ok(builder.includes('  ' + locale + ': {'), locale + ' profile localization')
    assert.ok(offers.includes('  ' + locale + ': {'), locale + ' review localization')
  }
})

test('Tests slide keeps 3+5 suggestions, explicit start and a chosen-scope overflow finder', () => {
  const builder = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')
  const route = read('app/[locale]/personality-profiles/page.tsx')
  const slide = builder.slice(builder.indexOf('{step === 3 && <section'), builder.indexOf('{step === 4 && <section'))
  const primary = slide.indexOf('data-profile-recommended-tests')
  const fiveMore = slide.indexOf('data-profile-five-more-tests')
  const start = slide.indexOf('data-profile-start-tests')
  const overflow = slide.indexOf('data-profile-additional-tests')
  assert.ok(primary > 0 && fiveMore > primary && start > fiveMore && overflow > start)
  for (const phrase of ['type="search"', 'data-profile-test-mode', 'data-profile-extra-selected-scope',
    'value={timeFilter}', 'value={sortFilter}', 'data-profile-mode={mode}',
    'data-profile-extra-toggle', 'aria-controls="profile-builder-extra-results"', 'aria-expanded={showMore}',
    'checked={selectedKeys.includes(test.key)}',
    'disabled={!selectedKeys.includes(test.key) && selectedKeys.length >= 12}'])
    assert.ok(slide.includes(phrase), phrase)
  assert.ok(builder.includes('const displayTests = showMore ? extraMatches : [];'))
  assert.ok(builder.includes('remainingTestKeys.size > 0'))
  assert.ok(builder.includes('if (!eligibleTestKeys.has(key)) return;'))
  assert.ok(builder.includes('keys.length < 12'))
  assert.ok(builder.includes('selectedScaleIds, "pro")'))
  assert.ok(builder.includes('test.key === key &&'))
  assert.ok(route.includes('testKind: entry.testKind'))
  assert.ok(css.includes('.extraFilters {'))
  assert.ok(css.includes('.extraSearch { grid-column: 1 / -1; }'))
  assert.ok(css.includes('.startRow > .primary { width: 100%; }'))
  assert.ok(css.includes('.extraScope{display:grid'))
  for (const phrase of ['start: "Пройти тесты"', 'start: "Take tests"', 'start: "Realizar pruebas"'])
    assert.ok(builder.includes(phrase), phrase)
  assert.ok(builder.includes('data-profile-google-cabinet-offer'))
  assert.ok(!slide.includes('data-profile-test-review-slide'))
})

test('all additional tests inherit only chosen facets and the existing server guest rights', () => {
  const page = read('app/[locale]/personality-profiles/page.tsx')
  const builder = read('components/personality-profiles-builder.tsx')
  for (const flag of ['entry.selectable === true', 'entry.startable === true',
    'entry.guestEligible === true', 'entry.free === true', 'entry.rightsStatus === "cleared"',
    'entry.explicitOptIn !== true']) assert.ok(page.includes(flag), flag)
  assert.ok(builder.includes('rankProfileAxisTests(tests, scaleGroups, selectedScaleIds, batteryMode)'))
  assert.ok(builder.includes('remainingTestKeys.has(test.key) && test.testKind === modeKind'))
  assert.ok(builder.includes('selectedAxisRefs.includes(scale.researchAxisId)'))
  assert.ok(builder.includes('timeFilter === "all" || (test.minutes !== null && test.minutes <= Number(timeFilter))'))
  assert.ok(builder.includes('fitByKey.get(key) ?? 0'))
  assert.ok(builder.includes('candidate.matchPercent'))
  assert.doesNotMatch(builder, /extraProfile|extraScales|extraGroups|effectiveExtraScales|setExtra/)
  assert.ok(!builder.includes('data-profile-extra-profile-filter'))
  assert.ok(!builder.includes('setSelectedAxes('))
  assert.ok(builder.includes('makeTestSelectionIntent(selectedKeys)'))
  assert.ok(builder.includes('selectedKeys.join(",")'))
  for (const phrase of ['Other tests for your topics', 'Дополнительные тесты по вашим темам',
    'Otras pruebas para tus temas', '80%', '20%', 'clinical probability', 'клинический прогноз', 'probabilidad clínica'])
    assert.ok(builder.includes(phrase), phrase)
})

test('Tests step keeps three plus five cards in place when checkboxes change and always displays topic relevance', () => {
  const builder = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')
  const slide = builder.slice(builder.indexOf('{step === 3 && <section'), builder.indexOf('{step === 4 && <section'))
  assert.match(builder, /rankProfileAxisTests\(tests, scaleGroups, selectedScaleIds, batteryMode\)/)
  assert.match(builder, /recommendProfileTopThreeTests\(tests, scaleGroups,/)
  assert.match(builder, /const featuredTestKeys = new Set\(/)
  assert.match(slide, /recommendedTests\.map\(\(\{ test, matchPercent \}\) =>/)
  assert.match(slide, /fiveMoreTests\.map\(\(\{ test, matchPercent \}\) =>/)
  assert.match(slide, /data-profile-five-more-tests/)
  assert.match(slide, /data-profile-additional-suggestion=\{test\.key\}/)
  assert.match(slide, /checked=\{selectedKeys\.includes\(test\.key\)\}/)
  assert.doesNotMatch(slide, /chosenTests\.map\(test\s*=>\s*<label/)
  assert.doesNotMatch(slide, /\.filter\(test => !selectedKeys\.includes\(test\.key\)\)/)
  assert.match(slide, /extraMatchPercent\(test\.key\)/)
  assert.match(slide, /\{matchPercent\}%/)
  assert.match(slide, /\{extraMatchPercent\(test\.key\)\}%/)
  assert.match(builder, /selectedKeys\.join\(","\)/)
  assert.match(builder, /selectedKeys\.length === 0 && recommendedTests\.length > 0/)
  for (const text of ['3 key recommended tests', '5 more tests ranked by topic match',
    '3 основных рекомендованных теста', 'Ещё 5 тестов по проценту соответствия',
    '3 pruebas principales recomendadas', '5 pruebas más, ordenadas por coincidencia']) {
    assert.ok(builder.includes(text), text)
  }
  for (const selector of ['.testSectionHeading', '.fiveMore', '.fitPill', '.fitNote']) {
    assert.ok(css.includes(selector), selector)
  }
})
