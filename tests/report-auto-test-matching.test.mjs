import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getRecommendedTestOptions } from '../lib/consultations/recommended-tests.js'
import { REPORT_TEST_SUGGESTION_COUNT, suggestReportTests } from '../lib/consultations/report-test-matcher.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('five owner-only suggestions respond to real report themes in Russian and English',()=>{
  const report = {
    analysis:'Сильная тревога, напряжение и трудности со сном. Бессонница, усталость, мало энергии.',
    additionalNotes:'Важно следить за качеством сна и переживаниями.',
  }
  const options = getRecommendedTestOptions('ru')
  const proposals = suggestReportTests({...report,options,locale:'ru'})
  assert.equal(proposals.length,REPORT_TEST_SUGGESTION_COUNT)
  assert.equal(new Set(proposals.map(item=>item.key)).size,5)
  assert.ok(proposals.every(item=>options.some(option=>option.key===item.key)))
  assert.ok(proposals.every(item=>item.href.startsWith('/')&&item.reason.startsWith('Темы отчёта: ')))
  assert.ok(proposals.some(item=>item.reason.includes('сон')||item.reason.includes('тревож')))
  const again = suggestReportTests({...report,options,locale:'ru'})
  assert.deepEqual(again,proposals,'repeated calls must not silently change recommendations')
  const en = suggestReportTests({
    analysis:'I feel anxious and overwhelmed. Sleep is poor and I am exhausted during the day.',
    options:getRecommendedTestOptions('en'),locale:'en',
  })
  assert.equal(en.length,5)
  assert.ok(en.every(item=>item.reason.startsWith('Report themes: ')))
})


test('repeated candidates with one matching theme do not crash on the second pick',()=>{
  const options=Array.from({length:7},(_,i)=>({
    key:'stress-check-'+i,title:'Stress check '+(i+1),
    href:'/en/client?startTests=stress-check-'+i,
    measurementAxes:['stress'],topics:['stress'],analysisAxes:['stress'],
    durationMinutes:i+2,startLocale:'en',
  }))
  const matches=suggestReportTests({analysis:'High stress, constant pressure and tension.',options,locale:'en'})
  assert.equal(matches.length,5)
  assert.equal(new Set(matches.map(test=>test.key)).size,5)
  assert.ok(matches.every(test=>test.reason.includes('stress')))
})

test('empty or content-free report never invents five arbitrary clinical recommendations',()=>{
  assert.deepEqual(suggestReportTests({options:getRecommendedTestOptions('ru'),locale:'ru'}),[])
  assert.deepEqual(suggestReportTests({analysis:'2026-10-18: 3/10 then 6/10.',options:getRecommendedTestOptions('en')}),[])
  const fixture=[
    {key:'sleep',title:'Sleep score',href:'/en/client?startTests=sleep',measurementAxes:['sleep'],topics:['sleep']},
    {key:'stress',title:'Stress score',href:'/en/client?startTests=stress',measurementAxes:['stress'],topics:['stress']},
  ]
  const matches=suggestReportTests({analysis:'I cannot sleep well',options:fixture,locale:'en'})
  assert.equal(matches.length,1,'never pad to five with unrelated tests')
  assert.equal(matches[0].key,'sleep')
})

test('matching is private and metadata based with no network, no auto-approval and a five-test bound',()=>{
  const matcher=read('lib/consultations/report-test-matcher.js')
  const picker=read('components/consultation-recommended-tests.jsx')
  const owner=read('components/consultation-form.jsx')
  const catalog=read('lib/consultations/recommended-tests.js')
  assert.doesNotMatch(matcher,/fetch\(|XMLHttpRequest|openai\.com|anthropic|ai\.generate|new WebSocket/)
  assert.match(picker,/type="checkbox" checked=\{selected\.has\(test\.key\)\}/)
  assert.match(picker,/onChange=\{event=>choose\(test\.key,event\.target\.checked\)\}/)
  assert.doesNotMatch(picker,/onChange\(results\.map|onChange\(suggested/)
  assert.match(owner,/analysis=\{analysis\} additionalNotes=\{additionalNotes\} generalInstructions=\{note\}/)
  assert.match(owner,/isDraftTemplate=\{!consultation/)
  assert.match(catalog,/measurementAxes:/)
  assert.match(catalog,/entry\.startable === true && entry\.rightsStatus === 'cleared'/)
  assert.equal(REPORT_TEST_SUGGESTION_COUNT,5)
})

test('test links are the last report content in standalone HTML and PDF and session page',()=>{
  const html=read('components/prescription-document.jsx')
  const session=read('components/client-session-page.jsx')
  const pdf=read('lib/prescriptions/pdf.js')
  assert.ok(html.indexOf('canonical-recommended-tests')>html.indexOf('<DistanceHomeopathyGuide'))
  assert.match(html,/!embedded && recommendedTests\.length > 0/)
  assert.ok(session.indexOf('id="session-recommended-tests"')>session.indexOf('data-hh-report-next-actions'))
  assert.ok(session.indexOf('id="session-recommended-tests"')<session.indexOf('<footer className={styles.clientFooter}>'))
  const a4=pdf.indexOf('function buildDocument(')
  const mobile=pdf.indexOf('export function buildPrescriptionMobilePdf(')
  const a4Text=pdf.slice(a4,mobile)
  const mobileText=pdf.slice(mobile)
  assert.ok(a4Text.indexOf("sectionHeader(locale === 'ru' ? 'Рекомендуемые тесты'")>
    a4Text.indexOf("for (const entry of distanceHomeopathyAppendixBlocks(locale))"))
  assert.ok(mobileText.indexOf("heading(ru?'Рекомендуемые тесты'")>
    mobileText.indexOf("for(const entry of distanceHomeopathyAppendixBlocks(locale))"))
  assert.ok(a4Text.indexOf("sectionHeader(locale === 'ru' ? 'Рекомендуемые тесты'")<
    a4Text.indexOf('for (const layout of layouts) {\n      page = layout'))
})
