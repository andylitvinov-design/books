import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('approved coastal report option 2 is scoped to authorized consultation viewers', () => {
  const page = source('components/client-session-page.jsx')
  const document = source('components/prescription-document.jsx')
  const styles = source('components/client-session.module.css')

  assert.match(page, /data-hh-report-theme="coastal-v2"/)
  assert.match(page, /className=\{styles\.fullReportContent\}>\{reportContent\}/)
  assert.match(page, /SessionExitSaveGuard/)
  assert.match(page, /SessionYouTubePlayer/)
  assert.match(page, /PrivatePlayer/)
  assert.match(page, /SaveClientSessionToAccount/)
  assert.match(page, /href=\{pdfPath\}/)
  assert.ok(page.indexOf('id="session-materials-title"') < page.indexOf('href={pdfPath}'), 'PDF follows curated materials in approved option 2')
  assert.ok(page.indexOf('href={pdfPath}') < page.indexOf('data-hh-report-next-actions'), 'PDF precedes save-and-continue actions')
  assert.match(document, /<div className="canonical-report-cover">/)
  assert.match(document, /<DocumentSignature date=\{document\.dateIssued\}/)
  assert.match(document, /document\.analysis/)
  assert.match(document, /document\.additionalNotes/)
  assert.match(document, /document\.generalInstructions/)
  assert.match(document, /canonical-recommended-tests/)
  assert.match(styles, /Client report coastal v2/)
  assert.match(styles, /\.sessionSiteShell\[data-hh-report-theme="coastal-v2"\]/)
  assert.match(styles, /@media screen and \(max-width:700px\)/)
  assert.match(styles, /@media screen and \(max-width:355px\)/)
  assert.match(styles, /@media screen \{/)
  assert.match(styles, /sessionBottomPrimary/)
  assert.match(styles, /sessionBottomSecondary/)
  assert.doesNotMatch(styles.slice(styles.indexOf('Client report coastal v2')), /\@media print\s*\{/)
})

test('coastal hero is lightweight, same-origin and free of client data', () => {
  const image = source('public/images/holistic-house/report-lighthouse-coast.svg')
  const css = source('components/client-session.module.css')
  assert.match(image, /<svg[^>]+viewBox="0 0 1600 1050"/)
  assert.match(image, /Lighthouse above a peaceful blue sea at sunrise/)
  assert.match(image, /<path/)
  assert.doesNotMatch(image.replace('xmlns="http://www.w3.org/2000/svg"', ''), /<script|<foreignObject|https?:\/\/|SYNTHETIC_PRIVATE_NAME|client selector/i)
  assert.match(css, /url\('\/images\/holistic-house\/report-lighthouse-coast\.svg'\)/)
  assert.doesNotMatch(css.slice(css.indexOf('Client report coastal v2')), /youtube\.com|unsplash\.com|drive\.google\.com/)
})

test('factual report remains separate from the responsive theme and can still print as before', () => {
  const document = source('components/prescription-document.jsx')
  const pdf = source('lib/prescriptions/pdf.js')
  const print = source('components/consultation-report.css')
  const styles = source('components/client-session.module.css')
  assert.match(document, /key: 'before'/)
  assert.match(document, /key: 'after'/)
  assert.doesNotMatch(document, /key: 'target'/)
  assert.match(document, /canonical-remedy-profile-disclosure/)
  assert.ok(document.includes("canonical-remedy-schedule-chip"))
  assert.ok(document.includes("canonical-remedy-schedule-dot"))
  assert.ok(styles.includes(".canonical-remedy-schedule-chip"))

  assert.match(document, /expandSupplementary fullSource/)
  assert.match(document, /ReportAppendixPrintExpander/)
  assert.match(pdf, /buildPrescriptionPdf/)
  assert.match(print, /@media print/)
  assert.match(print, /details\.canonical-remedy-profile-disclosure/)
})


test('recommended test cards follow materials without changing signed PDF recommendation content', () => {
  const page = source('components/client-session-page.jsx')
  const document = source('components/prescription-document.jsx')
  const styles = source('components/client-session.module.css')
  const materials=page.indexOf('id="session-resources"')
  const tests=page.indexOf('id="session-recommended-tests"')
  const pdf=page.indexOf("id={hasFullReport?'session-download':'session-report'}")
  const actions=page.indexOf('data-hh-report-next-actions')
  assert.ok(materials>=0 && tests>materials && pdf>tests && actions>pdf,
    'expected order: materials → separate recommended test cards → PDF → next steps')
  assert.match(page, /recommendedTests.length>0&&<section id="session-recommended-tests"/)
  assert.match(page, /reportRecommendedTestCard/)
  assert.match(document, /canonical-recommended-tests/, 'source recommendation survives for PDF and print')
  assert.match(document, /!embedded && recommendedTests.length > 0/, 'embedded reader avoids test duplication')
  assert.match(styles, /\.reportRecommendedTestCard/, 'production test cards are styled')
})
