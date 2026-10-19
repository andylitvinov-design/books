import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { remedySchedule } from '../lib/documents/recommendation.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('potency is rendered beside the remedy title, not repeated in the regimen', () => {
  const html = read('components/prescription-document.jsx')
  assert.match(html, /const potency = recommendationItemType\(item, document\.recommendationType\) === 'homeopathy'/)
  assert.match(html, /const administration = potency \? schedule\.split\(' · '\)\.slice\(1\)\.join\(' · '\) : schedule/)
  assert.match(html, /className="canonical-remedy-potency"/)
  assert.match(html, />\{' '\}\{potency\}<\/span>/)
  assert.match(html, /\{administration && <p className="canonical-remedy-schedule"/)
  assert.doesNotMatch(html, /\{schedule && <p className="canonical-remedy-schedule"/)
  assert.match(html, /\{detailKeys\.map\(\(key\) => <div key=\{key\}>/)
  assert.match(html, /item\[key\]/)
})

test('private session fallback uses the same potency/name arrangement', () => {
  const source = read('components/client-session-prescription.jsx')
  assert.match(source, /const administration=potency \? schedule\.split\(' · '\)\.slice\(1\)\.join\(' · '\) : schedule/)
  assert.match(source, /<strong>\{item\.displayName\}\{potency \? ` \$\{potency\}` : ''\}<\/strong>/)
  assert.match(source, /\{administration&&<small>\{administration\}<\/small>\}/)
})

test('the saved regimen is formatted without modifying a practitioner prescription', () => {
  const source = { itemType: 'homeopathy', displayName: 'Synthetic Remedy', potency: '30', granules: '6', timesPerDay: '3' }
  const ruSchedule = remedySchedule(source, 'ru', 'homeopathy')
  const enSchedule = remedySchedule(source, 'en', 'homeopathy')
  assert.equal(ruSchedule, 'потенция 30 · 6 гранул · 3×/день')
  assert.equal(enSchedule, 'potency 30 · 6 granules · 3×/day')
  assert.equal(ruSchedule.split(' · ').slice(1).join(' · '), '6 гранул · 3×/день')
  assert.equal(enSchedule.split(' · ').slice(1).join(' · '), '6 granules · 3×/day')
  assert.equal(remedySchedule({ itemType: 'bach', potency: '30' }, 'ru', 'mixed'), '')
})

test('compact screen-only treatment keeps accessibility and full printed appendix', () => {
  const css = read('components/consultation-report.css')
  const theme = read('components/client-session.module.css')
  assert.match(css, /Client-report polish 2026-10-19/)
  assert.match(css, /\.canonical-remedy-title h3 \.canonical-remedy-potency\s*\{[\s\S]*?font: inherit/)
  assert.match(css, /details\.canonical-remedy-profile-disclosure > summary\s*\{[\s\S]*?min-height: 0/)
  assert.match(css, /@media print\s*\{[\s\S]*?canonical-remedy-profile-disclosure/)
  assert.match(theme, /Coastal report parity, 2026-10-19/)
})
