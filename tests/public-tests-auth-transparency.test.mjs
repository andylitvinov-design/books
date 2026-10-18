import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('public picker transparently offers tests without registration and advertises scale-first results', () => {
  const source = read('components/app/simple-test-picker.jsx')
  const note = source.indexOf('data-test-access-note>{c.heroFootnote}')
  const firstTopic = source.indexOf('className={styles.testEntry}')
  assert.ok(note > 0 && firstTopic > note, 'access information must precede the test cards')
  assert.match(source, /heroFootnote:'Available tests and sets start without registration/)
  assert.match(source, /heroFootnote:'Доступные тесты и наборы проходятся без регистрации/)
  assert.match(source, /heroFootnote:'Puedes hacer pruebas y conjuntos disponibles sin registrarte/)
  assert.match(source, /free personal analysis/)
  assert.match(source, /бесплатные пояснения и анализ/)
  assert.ok(source.includes('className={styles.testEntry}'))
})

test('home retains its direct free-test entry without the retired promo', () => {
  const source = read('components/holistic-house-home.tsx')
  assert.doesNotMatch(source, /HomeFreeTestsBanner/)
  assert.ok(source.includes('"data-hero-cta": "free-tests"'))
  assert.ok(source.includes('/client/tests'))
  const picker = read('components/app/simple-test-picker.jsx')
  assert.match(picker, /Available tests and sets start without registration/)
  assert.match(picker, /free personal analysis/)
})

test('public selector sends startable tests directly to guest runner, never automatically to Google OAuth', () => {
  const source = read('components/app/public-test-explorer.jsx')
  assert.match(source, /onGuestStart\(entries\)/)
  assert.match(source, /client\?startTests=/)
  assert.doesNotMatch(source, /auth\/start|PENDING_TEST_SELECTION_KEY|request\('test-plans'/)
  assert.match(source, /entry\?\.rightsStatus === 'cleared'/)
  assert.match(source, /entry\?\.guestEligible === true/)
})

test('guest results display only compact scored gauges followed immediately by Google explanations and next steps', () => {
  const cabinet = read('components/app/cabinet-landing.jsx')
  const scales = read('components/app/guest-scale-interpretation.jsx')
  const button = read('components/app/test-finish-actions.jsx')
  assert.ok(cabinet.indexOf('<GuestScaleInterpretation') < cabinet.indexOf('data-guest-analysis-gate'))
  assert.match(cabinet, /Создать кабинет и получить пояснения/)
  assert.match(cabinet, /Что означают ваши результаты\?/)
  assert.match(cabinet, /courses\/antistress/)
  assert.match(cabinet, /continuePlan : resetToCatalog/)
  assert.match(cabinet, /sourceKind: 'guest_result'/)
  assert.match(cabinet, /onGuestStart=\{beginGuestBattery\}/)
  assert.doesNotMatch(cabinet, /setPhase\('consent'\)/)
  assert.match(scales, /ScoreGauge/)
  assert.match(scales, /data-score-only/)
  assert.match(scales, /section\.bandBasis === 'screening'/)
  assert.doesNotMatch(scales, /section\.meaning|report\.methodology|styles\.caution|styles\.support|styles\.footer/)
  const scoreStyles = read('components/app/guest-scale-interpretation.module.css')
  const actionStyles = read('components/app/guest-result-actions.module.css')
  assert.match(scoreStyles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(actionStyles, /\.googleButton/)
  assert.match(actionStyles, /\.nextActions/)
  assert.match(cabinet, /Этот тест сохраняется в аккаунте только после вашего подтверждения/)
  assert.doesNotMatch(scales, /section\.steps|<PersonalResultReport/)
  assert.match(button, /guestScaleOnly/)
})
