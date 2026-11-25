import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('one inline remedy card combines photo, name, actual regimen and full library disclosure', async () => {
  const source = await readFile('components/prescription-document.jsx', 'utf8')
  const start = source.indexOf('return <section className="canonical-remedy canonical-remedy--unified" key={number}>')
  const end = source.indexOf('</section>\n        })}', start)
  assert.ok(start >= 0 && end > start, 'unified card renders within the actual prescriptions loop')
  const card = source.slice(start, end)
  const summary = card.slice(card.indexOf('<summary'), card.indexOf('</summary>'))

  assert.match(summary, /RemedyReportThumbnail src=\{remedy\?\.primary_image\} number=\{number\}/)
  assert.match(summary, /item\.displayName/)
  assert.match(summary, /canonical-remedy-potency/)
  assert.match(source, /remedySchedule\(item, locale, document\.recommendationType\)/)
  assert.match(summary, /canonical-remedy-schedule/)
  assert.match(summary, /administration\.split\(' · '\)/)
  assert.match(summary, /detailKeys\.map\(\(key\) => <span/)
  assert.match(summary, /item\[key\]/)
  assert.match(summary, /Описание/)
  assert.match(summary, /Details/)
  assert.match(card, /<RemedyContent locale=\{locale\} remedy=\{remedy\}/)
  assert.match(card, /expandSupplementary fullSource/)
  assert.match(card, /item\.remedyPath/)
  assert.doesNotMatch(summary, /<Link|<a\b/, 'summary toggles inline instead of navigating away')
  assert.doesNotMatch(source, /className="canonical-remedy-profiles"/, 'no repeated standalone appendix')
  assert.doesNotMatch(source, /Приложение\./)
})

test('photos have an error fallback, and compact three-column cards work on phones and paper', async () => {
  const [css, thumbnail, expander] = await Promise.all([
    readFile('components/consultation-report.css', 'utf8'),
    readFile('components/remedy-report-thumbnail.jsx', 'utf8'),
    readFile('components/report-appendix-print-expander.jsx', 'utf8'),
  ])
  assert.match(thumbnail, /onError=\{\(\) => setFailedSource\(source\)\}/)
  assert.match(thumbnail, /canonical-remedy-unified-photo-fallback/)
  assert.match(thumbnail, /alt=""/)
  const start = css.indexOf('Unified prescription + remedy library cards — 2026-10-19')
  assert.ok(start >= 0, 'latest unified styles should override the old appendix layout')
  const unified = css.slice(start)
  assert.match(unified, /grid-template-columns: 65px minmax\(0, 1fr\) auto/)
  assert.match(unified, /\.canonical-remedy-unified-instruction/)
  assert.match(unified, /\[open\].*canonical-remedy-unified-chevron/)
  assert.match(unified, /@media screen and \(max-width: 700px\)/)
  assert.match(unified, /@media screen and \(max-width: 360px\)/)
  assert.match(unified, /@media print/)
  assert.match(expander, /querySelectorAll\('details\.canonical-remedy-profile-disclosure'\)/)
})
