import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('public picker transparently offers tests without registration and advertises scale-first results', () => {
  const source = read('components/app/simple-test-picker.jsx')
  const notice = source.indexOf('data-prelogin-google-notice')
  const firstTopic = source.indexOf('id="hh-simple-topic-title"')
  assert.ok(notice > 0 && firstTopic > notice, 'access information must precede topic selection')
  assert.match(source, /sets start without registration/)
  assert.match(source, /наборы проходятся без регистрации/)
  assert.match(source, /conjuntos disponibles sin registrarte/)
  assert.match(source, /free personal analysis/)
  assert.match(source, /бесплатный анализ/)
})

test('homepage accurately advertises registration-free starts and free Cabinet analysis', () => {
  const source = read('components/home-free-tests-banner.tsx')
  assert.match(source, /Available tests and sets need no registration/)
  assert.match(source, /Доступные тесты и наборы — без регистрации/)
  assert.match(source, /free personal analysis/)
  assert.match(source, /href=\{\`\/\$\{locale\}\/client\`\}/)
})

test('public selector sends startable tests to consent-first guest runner, never automatically to Google OAuth', () => {
  const source = read('components/app/public-test-explorer.jsx')
  assert.match(source, /onGuestStart\(entries\)/)
  assert.match(source, /client\?startTests=/)
  assert.doesNotMatch(source, /auth\/start|PENDING_TEST_SELECTION_KEY|request\('test-plans'/)
  assert.match(source, /entry\?\.rightsStatus === 'cleared'/)
  assert.match(source, /entry\?\.guestEligible === true/)
})

test('guest result displays scale explanations before the optional account action', () => {
  const cabinet = read('components/app/cabinet-landing.jsx')
  const scales = read('components/app/guest-scale-interpretation.jsx')
  const button = read('components/app/test-finish-actions.jsx')
  assert.ok(cabinet.indexOf('<GuestScaleInterpretation') < cabinet.indexOf('data-guest-analysis-gate'))
  assert.match(cabinet, /Создать \/ войти в мой кабинет и получить анализ \(бесплатно\)/)
  assert.match(cabinet, /sourceKind: 'guest_result'/)
  assert.match(cabinet, /onGuestStart=\{beginGuestBattery\}/)
  assert.match(cabinet, /setPhase\('consent'\)/)
  assert.match(scales, /ScoreGauge/)
  assert.doesNotMatch(scales, /section\.steps|<PersonalResultReport/)
  assert.match(button, /guestScaleOnly/)
})
