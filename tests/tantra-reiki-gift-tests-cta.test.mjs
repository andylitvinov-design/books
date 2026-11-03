import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { normalizeJourneyFocus } from '../lib/assessments/topic-journeys.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Tantra Reiki has three distinct, localized first-screen pathways and separate tests', () => {
  const page = read('components/academy-record-page.tsx')
  const journey = read('components/tantra-reiki-journey.tsx')
  const css = read('app/academy.css')

  for (const label of [
    'Начать БЕСПЛАТНУЮ онлайн-программу',
    'Запросить сеанс Tantra Reiki Healing',
    'Записаться на личную инициацию Тантра Рейки',
    'Start FREE Online Program Tantra Reiki Practitioner',
    'Request Tantra Reiki Healing',
    'Sign up for Live Personal Tantra Reiki Initiation',
    'Empezar el programa online GRATIS',
    'Solicitar una sesión de Tantra Reiki Healing',
    'Inscribirme en una iniciación personal en vivo',
  ]) assert.ok(page.includes(label), 'Missing main CTA: ' + label)

  for (const label of [
    'Получить 1-ю ступень Тантра Рейки в подарок',
    'Пройти бесплатные тантрические тесты',
    'Get Tantra Reiki Level 1 as a gift',
    'Take free Tantra self-reflection tests',
  ]) assert.ok(journey.includes(label), 'Missing lower CTA: ' + label)

  for (const source of [page, journey]) {
    assert.match(source, /href=\{REIKI_FREE_COURSE_PATH\} data-reiki-course-cta/)
    assert.match(source, /"\/" \+ locale \+ "\/client\/tests\?focus=tantra"/)
  }
  const hero = page.indexOf('className="tantra-course-hero__actions"')
  const gift = page.indexOf('className="tantra-course-hero__cta"', hero)
  const healing = page.indexOf('className="tantra-course-hero__healing-cta"', hero)
  const initiation = page.indexOf('className="tantra-course-hero__initiation-cta"', hero)
  const heroEnd = page.indexOf('</section>', initiation)
  assert.ok(hero >= 0 && gift > hero && healing > gift && initiation > healing && heroEnd > initiation)
  assert.doesNotMatch(page.slice(hero, heroEnd), /tantra-course-hero__more|tantra-course-hero__tests-cta|tantra-course-hero__secondary-links/)
  assert.match(page, /data-tantra-healing-request="true"/)
  assert.match(page, /<ContactChannelChooser[\s\S]*?compactPhone[\s\S]*?stayAfterSave[\s\S]*?whatsappUrl=\{whatsappEnquiryUrl\(\{/)
  assert.match(page, /service: "Tantra Reiki Healing"/)
  assert.match(page, /href="#tantra-master-course"/)
  const capture = read('components/reiki-choice-capture.tsx')
  assert.match(capture, /id="tantra-master-course"/)
  assert.match(capture, /window\.location\.hash === "#tantra-master-course"\) setSelected\("personal"\)/)
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-course-hero__healing-request > summary:focus-visible/)

  assert.match(css, /\.tantra-course-hero__actions > a\.tantra-course-hero__initiation-cta:focus-visible/)
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 700px\)/)
  assert.match(css, /\.tantra-journey__first-cta a\.tantra-journey__tests-cta/)
})

test('the linked public Tantra selection is real and preserves guest opt-in', () => {
  const route = read('app/[locale]/client/tests/page.tsx')
  const spanishRoute = read('app/es/client/tests/page.tsx')
  const explorer = read('components/app/test-explorer.jsx')
  assert.match(route, /normalizeJourneyFocus\(typeof query\.focus === 'string' \? query\.focus : ''\)/)
  assert.match(route, /initialPreferences=\{initialPreferences\}/)
  assert.deepEqual(normalizeJourneyFocus('tantra'), ['tantra'])
  assert.deepEqual(normalizeJourneyFocus('unlisted,unsafe,unknown'), [])
  assert.match(spanishRoute, /normalizeJourneyFocus\(typeof query\.focus === "string" \? query\.focus : ""\)/)
  assert.match(spanishRoute, /initialPreferences=\{focus\.length \? \{ focus, problems \} : null\}/)

  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    const available = filterExplorerEntries(entries, { availability: 'available', focus: ['tantra'] })
    for (const key of ['hh-tantra-presence', 'hh-sensual-joy']) {
      assert.ok(available.some((entry) => entry.key === key && entry.selectable), locale + ' / ' + key)
    }
  }

  assert.match(explorer, /const \[selectedKeys, setSelectedKeys\] = useState\(\(\) => recommendedKey \? \[recommendedKey\] : \[\]\)/)
  assert.match(read('components/academy-record-page.tsx'), /subject to Andrey's confirmation/)
})
