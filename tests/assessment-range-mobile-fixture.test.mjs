import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  reportMobileFixtureOrigin, reportMobileFixtureScope, reportMobileWidths, reportMobileCases,
  reportMobileFixturePath, buildReportMobileFixtures, buildReportMobileRenderer,
  requireHostedReportMobile,
} from '../scripts/helpers/assessment-range-mobile-fixture.mjs'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { assessmentResultOverview } from '../lib/assessments/result-overview.js'

const fixtures=buildReportMobileFixtures()
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('14 immutable synthetic test families in EN/RU cover four true mobile/desktop sizes',()=>{
  assert.equal(reportMobileFixtureOrigin,'http://127.0.0.1:3100')
  assert.equal(reportMobileFixtureScope,
    'ACTUAL_COMPACT_ASSESSMENT_REPORT_SSR_WITH_PRODUCTION_STYLES_NO_AUTH_NO_PRIVATE_DATA')
  assert.deepEqual(reportMobileWidths,[320,375,390,1280])
  assert.equal(reportMobileCases.length,14)
  assert.equal(fixtures.length,28)
  assert.equal(new Set(fixtures.map(f=>f.path)).size,28)
  assert.equal(fixtures.length*reportMobileWidths.length,112)
  for(const f of fixtures){
    assert.equal(f.path,reportMobileFixturePath(f))
    assert.ok(f.report.verified!==false)
    assert.ok(f.report.sections.length>0)
    assert.ok(f.result.dimensions.length>0)
  }
})
test('bad public paths and non-isolated browser sessions always fail closed',()=>{
  for(const patch of [
    {key:'not-a-test'},{version:'v8'},{instrumentLocale:'fr'},
    {locale:'fr'},{pattern:'../../api/results'},
  ])assert.throws(()=>reportMobileFixturePath({...fixtures[0],...patch}))
  const required={CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',
    HH_APP_TEST_RUNTIME:'isolated'}
  assert.doesNotThrow(()=>requireHostedReportMobile(required))
  assert.throws(()=>requireHostedReportMobile({}))
  for(const key of Object.keys(required)){
    assert.throws(()=>requireHostedReportMobile({...required,[key]:undefined}))
  }
  assert.throws(()=>requireHostedReportMobile({...required,VERCEL:'1'}))
})
test('SSR uses actual components, immutable instrument results, and exact production source CSS',async()=>{
  const runner=await buildReportMobileRenderer()
  const paths=runner.sourceProof.map(x=>x.path)
  for(const key of [
    'components/app/compact-assessment-report.jsx',
    'components/app/compact-assessment-report.module.css',
    'components/app/assessment-gauge.jsx',
    'components/app/assessment-gauge.module.css',
    'app/globals.css',
    'app/[locale]/app/[[...path]]/workspace.css',
  ])assert.ok(paths.includes(key),key)
  for(const source of runner.sourceProof){
    assert.equal(source.sha256,createHash('sha256').update(read(source.path)).digest('hex'),
      'Never accept a mock or stale CSS file '+source.path)
  }
  for(const f of fixtures){
    const old=JSON.stringify(f.result)
    const html=runner.document(f)
    assert.equal(JSON.stringify(f.result),old)
    assert.match(html,new RegExp('<html lang="'+f.locale+'">'))
    assert.match(html,/data-compact-assessment-report="true"/)
    assert.match(html,/data-personal-result-report="true"/)
    assert.match(html,/data-assessment-range-report="true"/)
    assert.match(html,/data-all-score-ranges="true"/)
    const section=f.report.sections[assessmentResultOverview(f.report,f.result,f.locale).initialIndex]
    const dimension=f.result.dimensions.find(d=>d.key===section.key)
    const model=gaugeModel(dimension,f.result,f.locale)
    assert.ok(model?.rangeReading)
    assert.match(html,new RegExp('data-range-kind="'+model.rangeReading.kind+'"'))
    assert.match(html,new RegExp('data-selected-score-range="true"'))
    const positions=[...html.matchAll(/data-score-range="/g)]
    assert.equal(positions.length,model.rangeReading.rows.length,f.key+' range count')
    assert.ok(html.includes(model.rangeReading.current.note) ||
      html.includes(model.rangeReading.narrative.replaceAll('&','&amp;').replaceAll('«','«')) ||
      model.rangeReading.kind==='published',
      f.key+' selected interpretation not present')
    assert.doesNotMatch(html,/data-unverified-assessment-result="true"/)
  }
})
test('browser script checks native range details, no network, page overflow and keyboard interaction',()=>{
  const script=read('scripts/verify-assessment-range-mobile-browser.mjs')
  assert.match(script,/requireHostedReportMobile\(process\.env\)/)
  assert.ok(script.indexOf('requireHostedReportMobile(process.env)') < script.indexOf('engine.launch()'))
  assert.match(script,/serviceWorkers:'block'/)
  assert.match(script,/return route\.abort\('blockedbyclient'\)/)
  assert.doesNotMatch(script,/route\.continue\(/)
  assert.match(script,/page\.evaluate\(/)
  assert.match(script,/documentWidth>geometry\.viewport\+1/)
  assert.match(script,/data-score-range-descriptions/)
  assert.match(script,/page\.keyboard\.press\('Enter'\)/)
  assert.match(script,/page\.keyboard\.press\('Space'\)/)
  assert.match(script,/failure\.png/)
  assert.doesNotMatch(script,/fullPage:\s*true/)
})
