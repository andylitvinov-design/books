import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const copy = readFileSync(new URL('../data/personal-service-pages.ts', import.meta.url), 'utf8')
const page = readFileSync(new URL('../app/[locale]/services/systemic-constellations/page.tsx', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../components/personal-service-landing.tsx', import.meta.url), 'utf8')
const chooser = readFileSync(new URL('../components/consultation-choice-capture.tsx', import.meta.url), 'utf8')
const section = copy.slice(copy.indexOf('  "systemic-constellations": {', copy.indexOf('export const personalServiceCopy')), copy.indexOf('  "business-consulting": {', copy.indexOf('export const personalServiceCopy')))

test('one existing Toronto constellation landing, localized transactional intent, no invented results', () => {
  for (const title of ['Индивидуальные системные расстановки в Торонто и онлайн', 'Individual Systemic Constellations in Toronto & Online', 'Constelaciones sistémicas individuales en Toronto y online']) assert.ok(section.includes(title), title)
  const descriptions = [...section.matchAll(/description:"([^"]+)"/g)].map((m) => m[1])
  assert.equal(descriptions.length, 3)
  for (const desc of descriptions) assert.ok(desc.length >= 105 && desc.length <= 160, 'bad SEO description length: ' + desc.length)
  for (const price of ['€50', '€100']) assert.equal(descriptions.filter(d => d.includes(price)).length, 3)
  for (const language of ['ru', 'en', 'es']) assert.match(page, new RegExp('locale: "' + language + '"'))
  assert.match(page, /return <PersonalServiceLanding locale=\{locale as ServicePageLocale\} service=\{service\} \/>/)
})
test('single public canonical with reciprocal locale links and localized OG/Twitter', () => {
  assert.match(page, /canonical: `\/\$\{locale\}\/services\/systemic-constellations`/)
  for(const loc of ['en','ru','es']) assert.ok(page.includes(loc + ': "/' + loc + '/services/systemic-constellations"'))
  assert.match(page, /"x-default": "\/en\/services\/systemic-constellations"/)
  assert.match(page, /openGraph: \{/)
  assert.match(page, /card: "summary_large_image"/)
  assert.match(page, /siteName: "Holistic House"/)
  assert.match(page, /images: \[\{ url: "\/images\/holistic-house\/andy-about\.png"/)
  assert.match(page, /alt: "Andrey Litvinov — Holistic House"/)
  assert.match(page, /description: t\.description/)
  assert.match(page, /robots: \{ index: false \}/)
})
test('one real tariff chooser; free written report separate; enquiry not payment', () => {
  assert.match(landing, /<PersonalConsultationForm locale=\{locale\} service=\{t\.orderLabel\}/)
  assert.match(landing, /href=\{\`\/\$\{locale\}\/services\/free-situation-review\`\}/)
  assert.match(landing, /href="#request-session"/)
  assert.match(chooser, /const isPaidRequest = isService && serviceChoice !== "free"/)
  assert.match(chooser, /publicServiceTitle=\{t\.serviceOptions\[serviceChoice\]\}/)
  for (const phrase of ['не подтверждает бронь', 'does not confirm a booking', 'no confirma una reserva']) assert.ok(section.includes(phrase))
})
