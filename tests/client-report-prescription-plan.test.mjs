import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('client report distinguishes practitioner prescriptions from other recommendations', () => {
  const source = read('components/prescription-document.jsx')
  assert.match(source, /'НАЗНАЧЕНИЯ' : 'PRESCRIPTIONS'/)
  assert.match(source, /ГОМЕОПАТИЧЕСКИЕ НАЗНАЧЕНИЯ/)
  assert.match(source, /BACH ESSENCE PRESCRIPTIONS/)
  assert.match(source, /Индивидуальная схема приёма/)
  assert.match(source, /canonical-remedy-section-heading/)
  assert.match(source, /remedySchedule\(item, locale, document\.recommendationType\)/)
  assert.match(source, /detailKeys\.length > 0 && <dl className="canonical-remedy-fields">/)
  assert.match(source, /detailKeys\.map\(\(key\) => <div key=\{key\}>/)
  assert.match(source, /item\[key\]/)
  assert.match(source, /item\.remedyPath && <Link className="canonical-remedy-profile-action"/)
})

test('prescription rows remain image-free, compact and usable on mobile and paper', () => {
  const source = read('components/prescription-document.jsx')
  const first = source.indexOf('return <section className="canonical-remedy" key={number}>')
  const last = source.indexOf('</section>\n        })}', first)
  assert.ok(first > -1 && last > first, 'rendered prescription row should be present')
  const row = source.slice(first, last)
  assert.doesNotMatch(row, /<img|primary_image|canonical-remedy-card-photo/)
  assert.match(row, /canonical-remedy-schedule-part/)
  assert.match(row, /Описание препарата/)

  const css = read('components/consultation-report.css')
  const start = css.indexOf('Prescription-sheet refinement:')
  assert.ok(start > -1)
  const plan = css.slice(start)
  assert.match(plan, /max-width:\s*680px/)
  assert.match(plan, /grid-template-columns:\s*minmax\(0, 1fr\) auto/)
  assert.match(plan, /\.canonical-remedy-schedule-chip\s*\{/)
  assert.match(plan, /@media screen and \(max-width:\s*700px\)/)
  assert.match(plan, /@media print/)
  assert.match(plan, /break-inside:\s*avoid/)
})

test('fallback session projection uses prescription terminology', () => {
  const fallback = read('components/client-session-prescription.jsx')
  assert.match(fallback, /STEP 1 · PRESCRIPTIONS/)
  assert.match(fallback, /Your prescriptions/)
  const session = read('components/client-session-page.jsx')
  assert.match(session, /View prescriptions ↓/)
})
