import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('prescription groups retain original names and keep individual instructions visible', () => {
  const source = read('components/prescription-document.jsx')
  assert.match(source, /'НАЗНАЧЕНИЯ' : 'PRESCRIPTIONS'/)
  assert.match(source, /ГОМЕОПАТИЧЕСКИЕ НАЗНАЧЕНИЯ/)
  assert.match(source, /BACH ESSENCE PRESCRIPTIONS/)
  assert.match(source, /Индивидуальная схема приёма/)
  assert.match(source, /canonical-remedy-section-heading/)
  assert.match(source, /remedySchedule\(item, locale, document\.recommendationType\)/)
  const summary = source.slice(source.indexOf('<summary className="canonical-remedy-unified-summary">'), source.indexOf('</summary>'))
  assert.match(summary, /detailKeys\.length > 0 && <span className="canonical-remedy-fields canonical-remedy-unified-instructions">/)
  assert.match(summary, /detailKeys\.map\(\(key\) => <span/)
  assert.match(summary, /item\[key\]/)
  assert.match(summary, /item\.displayName/)
})

test('mobile prescription cards integrate source images, clickable descriptions and all authored data', () => {
  const source = read('components/prescription-document.jsx')
  assert.match(source, /canonical-remedy--unified/)
  assert.match(source, /canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure/)
  assert.match(source, /RemedyReportThumbnail src=\{remedy\?\.primary_image\}/)
  assert.match(source, /canonical-remedy-schedule-part/)
  assert.match(source, /Описание/)
  assert.match(source, /<RemedyContent locale=\{locale\} remedy=\{remedy\}/)
  assert.doesNotMatch(source, /className="canonical-remedy-profiles"/)
  const css = read('components/consultation-report.css')
  const start = css.indexOf('Unified prescription + remedy library cards — 2026-10-19')
  assert.ok(start > -1)
  const unified = css.slice(start)
  assert.match(unified, /grid-template-columns: 65px minmax\(0, 1fr\) auto/)
  assert.match(unified, /@media screen and \(max-width: 700px\)/)
  assert.match(unified, /@media print/)
  assert.match(unified, /break-inside: auto/)
})

test('fallback session projection uses prescription terminology', () => {
  const fallback = read('components/client-session-prescription.jsx')
  assert.match(fallback, /STEP 1 · PRESCRIPTIONS/)
  assert.match(fallback, /Your prescriptions/)
  const session = read('components/client-session-page.jsx')
  assert.match(session, /View prescriptions ↓/)
})
