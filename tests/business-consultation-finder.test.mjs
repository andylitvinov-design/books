import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BUSINESS_FINDER_ISSUES, BUSINESS_FINDER_OUTCOMES, BUSINESS_FINDER_FORMATS,
  suggestBusinessConsultation,
} from '../lib/business-consulting/consultation-finder.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('consultation matching maps real topics only to the four approved intake formats', () => {
  const expected = {
    gentle: 'free', 'one-step': 'express', deeper: 'full', ongoing: 'mentoring',
  }
  for (const [area, issues] of Object.entries(BUSINESS_FINDER_ISSUES)) {
    assert.equal(issues.length, 4)
    for (const issue of issues) {
      for (const outcome of BUSINESS_FINDER_OUTCOMES) {
        const format = suggestBusinessConsultation({area, issue, outcome})
        assert.ok(BUSINESS_FINDER_FORMATS.includes(format), area + '/' + issue + '/' + outcome)
        if (!['team', 'partnership'].includes(issue) || outcome !== 'one-step') {
          assert.equal(format, expected[outcome], area + '/' + issue + '/' + outcome)
        }
      }
    }
  }
  assert.equal(suggestBusinessConsultation({area:'business',issue:'team',outcome:'one-step'}), 'full')
  assert.equal(suggestBusinessConsultation({area:'project',issue:'partnership',outcome:'one-step'}), 'full')
})

test('unsupported topics never silently route users to a paid offer', () => {
  const invalid = [
    {}, {area:'money',issue:'not-a-topic',outcome:'deeper'},
    {area:'medical',issue:'diagnosis',outcome:'deeper'},
    {area:'business',issue:'launch',outcome:'gentle'},
    {area:'business',issue:'strategy',outcome:'investment-advice'},
  ]
  for (const entry of invalid) assert.equal(suggestBusinessConsultation(entry), null)
})

test('Business-only wizard is localised, progressive, accessible and reuses consent-gated enquiry', () => {
  const finder = read('components/business-consultation-finder.tsx')
  const finderCss = read('components/business-consultation-finder.module.css')
  const selector = read('components/topic-journey-selector.tsx')
  const route = read('app/[locale]/explore/[theme]/page.tsx')
  const enquiry = read('components/business-website-enquiry.tsx')
  assert.match(selector,/journey\.id === 'business' && <BusinessConsultationFinder locale=\{language\}/)
  assert.match(route,/theme === 'business' && <div/)
  assert.match(route,/<BusinessWebsiteEnquiry locale=/)
  assert.match(finder,/data-business-consultation-finder/)
  assert.match(finder,/data-business-finder-step="area"/)
  assert.match(finder,/data-business-finder-step="issue"/)
  assert.match(finder,/data-business-finder-step="outcome"/)
  assert.match(finder,/aria-pressed=\{area===key\}/)
  assert.match(finder,/aria-pressed=\{issue===key\}/)
  assert.match(finder,/aria-valuenow=\{answered\}/)
  assert.match(finder,/href="#business-direct-request"/)
  assert.match(finder,/data-business-finder-context/)
  assert.match(finder,/businessConsultingCopy\[locale\]\.offers/)
  assert.match(finder,/t\.areas\[area\]\.label/)
  assert.match(enquiry,/data-business-finder-context/)
  assert.match(enquiry,/previous\.trim\(\)\?previous:context/)
  assert.match(enquiry,/contactConsent:consent/)
  assert.match(enquiry,/type="checkbox" required/)
  assert.match(finderCss,/@media\(max-width:650px\)/)
  for (const lang of ['en', 'ru', 'es']) assert.match(finder,new RegExp('\\b'+lang+': \\{'))
  for (const phrase of ['Business & work','Money & income','For myself','My project / own venture',
    'Бизнес и работа','Деньги и доход','Для себя','Для своего дела']) assert.ok(finder.includes(phrase))
  assert.doesNotMatch(finder,/fetch\(|localStorage|sessionStorage|accountId|clientId|testResults|diagnose\(/)
})
