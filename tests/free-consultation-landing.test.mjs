import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const landing = read('app/[locale]/services/free-consultation/page.tsx')
const css = read('app/[locale]/services/free-consultation/free-consultation.module.css')
const profile = read('components/app/profile-domains.jsx')
const publicLocales = read('lib/public-locales.ts')

test('one localized landing is the Cabinet free consultation destination, never an instant booking', () => {
  assert.ok(profile.includes("href={'/' + locale + '/services/free-consultation'}"))
  assert.match(profile, /data-report-archive-always-open/)
  assert.doesNotMatch(profile, /setArchiveOpen|hh-account-report-toggle|freeIntroConsultationHref/)
  assert.match(landing, /data-free-consultation-hub/)
  assert.match(landing, /publicLocales\.map\(locale => \(\{ locale \}\)\)/)
  assert.match(landing, /data-free-introduction-enquiry/)
  assert.match(landing, /whatsappEnquiryUrl\(\{/)
  assert.match(landing, /target="_blank" rel="noopener noreferrer"/)
  assert.match(landing, /not a confirmed appointment/)
  assert.match(landing, /не подтверждённая запись/)
  assert.match(landing, /no una reserva confirmada/)
})

test('all three verified free paths lead to existing pages, not a new clinical or payment flow', () => {
  assert.match(landing, /data-free-consultation-option=\{offer\.id\}/)
  assert.match(landing, /"situation" \| "wu" \| "tests"/)
  assert.match(landing, /\/services\/free-situation-review#request-free-review/)
  assert.match(landing, /\/services\/dao-health-profile/)
  assert.match(landing, /\/client\/tests/)
  assert.match(landing, /<Link className=\{styles\.offerAction\} href=\{destination\(lang, offer\.id\)\}/)
  assert.match(landing, /"en"/)
  assert.match(publicLocales, /free-situation-review\|free-consultation\|imagery-therapy/)
  for (const phrase of [
    'Free situation review',
    'Free Wu Xing resource assessment',
    'Free stress and personality tests',
    'Бесплатный анализ ситуации',
    'Бесплатный анализ ресурсов У-Син',
    'Тесты стресса и личности',
    'Revisión gratuita de tu situación',
    'Perfil gratuito de recursos Wu Xing',
    'Pruebas gratuitas de estrés y personalidad',
  ]) assert.ok(landing.includes(phrase), 'missing localized offer: ' + phrase)
  assert.doesNotMatch(landing, /€50|€100|fetch\(|post\(|localStorage|sessionStorage/)
  assert.match(landing, /not medical or mental-health diagnoses/)
  assert.match(landing, /не для медицинской или психиатрической диагностики/)
})

test('the one landing is readable with existing mobile cards and direct CTAs', () => {
  assert.match(landing, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/)
  assert.match(landing, /<Image src=\{media\[offer\.id\]\}/)
  assert.match(landing, /id="free-options"/)
  assert.match(landing, /id="intro-request"/)
  assert.match(css, /@media\(max-width:760px\)/)
  assert.match(css, /@media\(max-width:390px\)/)
  assert.match(css, /\.offerAction/)
  assert.match(css, /\.page a:focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
})
