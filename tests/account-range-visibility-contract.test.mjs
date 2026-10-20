import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('account visibility checks follow the same source-aware range model as exact snapshot checks',()=>{
 const source=readFileSync(new URL('../scripts/helpers/guest-scale-verifier.mjs',import.meta.url),'utf8')
 const browser=source.slice(source.indexOf('export async function assertAccountScaleReport('))
 assert.match(browser,/const reading = gaugeModel\(dimension, result, locale\)\?\.rangeReading/)
 assert.match(browser,/const anchor = reading \? null : interpretationBandModel/)
 for(const selector of ['data-assessment-range-report','data-range-characterization','data-all-score-ranges','data-range-evidence-status','data-answer-interpretation','data-answer-ranges'])assert.ok(browser.includes(selector),selector)
 assert.ok(browser.includes('toHaveCount(reading.rows.length)'))
 assert.ok(browser.includes('assertAccountReportSnapshot({ ...snapshot, scales }, result, locale)'))
})
