import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

function assertCoastalScreenScope(styles) {
  let themedRules = 0
  postcss.parse(styles).walkRules(rule => {
    if (!rule.selector.includes('[data-hh-report-theme="coastal-v2"]')) return
    themedRules += 1
    const media = []
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params)
    }
    assert.ok(media.some(query => query.split(',').every(part => /^screen(?:\s+and\b|$)/.test(part.trim()))),
      'coastal theme rules must be restricted to screen media')
    assert.ok(media.every(query => !/\bprint\b/.test(query)),
      'coastal theme must not restyle the signed print document')
  })
  assert.ok(themedRules > 0, 'the coastal theme must still be present')
}

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
  assert.ok(page.indexOf('data-hh-report-next-actions') < page.indexOf('id="session-recommended-tests"') &&
    page.indexOf('id="session-recommended-tests"') < page.indexOf('href={pdfPath}'),
    'Cabinet save and recommended tests precede final PDF actions')
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
  assertCoastalScreenScope(styles)
})

test('coastal scope rejects print leakage while allowing unrelated voice print controls', () => {
  const styles = source('components/client-session.module.css')
  assertCoastalScreenScope(styles + '\n@media print {.reportVoiceSection {display:none!important}}')
  assert.throws(() => assertCoastalScreenScope(styles +
    '\n@media print {.sessionSiteShell[data-hh-report-theme="coastal-v2"] {color:red}}'),
  /restricted to screen/)
  assert.throws(() => assertCoastalScreenScope(styles +
    '\n.sessionSiteShell[data-hh-report-theme="coastal-v2"] {color:red}'),
  /restricted to screen/)
  assert.throws(() => assertCoastalScreenScope(styles +
    '\n@media screen, all {.sessionSiteShell[data-hh-report-theme="coastal-v2"] {color:red}}'),
  /restricted to screen/)
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
  assert.ok(materials>=0 && actions>materials && tests>actions && pdf>tests,
    'expected order: materials → Cabinet save → recommended tests → PDF')
  assert.match(page, /<section id="session-recommended-tests"/)
  assert.match(page, /reportRecommendedTestCard/)
  assert.match(document, /canonical-recommended-tests/, 'source recommendation survives for PDF and print')
  assert.match(document, /!embedded && recommendedTests.length > 0/, 'embedded reader avoids test duplication')
  assert.match(styles, /\.reportRecommendedTestCard/, 'production test cards are styled')
})
