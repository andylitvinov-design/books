import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { PROFESSIONAL_BATTERY_2026_DEFINITIONS, PROFESSIONAL_BATTERY_2026_CATALOG } from '../data/assessments/professional-battery-2026.js'
import { PHQ9_EN_V1 } from '../data/assessments/psychic-monitoring-v1.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, buildStarterBattery, coverageForSelection } from '../lib/assessments/test-explorer.js'
const values = (def, value) => Object.fromEntries(def.questions.map(q => [q.id, value]))
const total = (def, answers) => scoreAssessment(def, answers).dimensions[0].value

test('four complete real measures have verifiable provenance, valid ranges and no translated clinical items', () => {
  assert.equal(PROFESSIONAL_BATTERY_2026_DEFINITIONS.length, 4)
  assert.equal(PROFESSIONAL_BATTERY_2026_CATALOG.length, 4)
  assert.equal(new Set(PROFESSIONAL_BATTERY_2026_CATALOG.map(x => x.key)).size, 4)
  assert.equal(MONITORING_CATALOG.filter(x => x.startable).length, 70)
  for (const item of PROFESSIONAL_BATTERY_2026_CATALOG) {
    const d = getAssessmentDefinition(item.key, 'v1', 'en')
    const { contentHash, ...body } = d
    assert.equal(contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex'))
    assert.equal(d.questions.length, item.questionCount)
    assert.equal(d.instrumentLocale, 'en')
    assert.match(d.source.citation, /200(6|9)/)
    assert.ok(d.source.url.startsWith('https://'))
    assert.equal(d.scoring.dimensions.length, 1)
    assert.ok(d.scoring.dimensions[0].direction === 'lower-reported-difficulty')
    assert.ok(d.questions.every(q => q.required && q.text.length > 8))
    assert.equal(item.testStyle, 'professional')
    assert.equal(item.rightsStatus, 'cleared')
    assert.equal(total(d, values(d, 2)) >= 0, true)
  }
})
test('PHQ-8 is validated eight-item PHQ subset with 0–24 score, excluding PHQ-9 safety item', () => {
  const d = getAssessmentDefinition('phq-8', 'v1', 'en')
  assert.deepEqual(d.questions.map(q => q.text), PHQ9_EN_V1.questions.slice(0,8).map(q => q.text))
  assert.equal(d.questions.length,8)
  assert.equal(d.questions.some(q => q.safety?.type === 'self_harm'),false)
  assert.equal(total(d, values(d,0)),0)
  assert.equal(total(d, values(d,3)),24)
  assert.equal(total(d, values(d,1)),8)
  assert.equal(PROFESSIONAL_BATTERY_2026_CATALOG.find(item => item.key === 'phq-8').guestEligible,false)
})
test('CBI personal and client validated 0–100 scores and per-question response categories', () => {
  for (const key of ['cbi-personal','cbi-client']) {
    const d = getAssessmentDefinition(key, 'v1', 'en')
    assert.equal(total(d, values(d,0)),0)
    assert.equal(total(d, values(d,2)),50)
    assert.equal(total(d, values(d,4)),100)
    assert.equal(d.scoring.dimensions[0].multiplier,25)
    assert.match(d.source.permission,/commercial/)
  }
  const client = getAssessmentDefinition('cbi-client', 'v1','en')
  assert.deepEqual(client.questions.slice(0,4).map(q => q.responseAnchors?.[0]),Array(4).fill('To a very low degree'))
  assert.equal(client.questions[4].responseAnchors,undefined)
})
test('CBI work correctly reverses final leisure-energy item and retains the original two response formats', () => {
  const d = getAssessmentDefinition('cbi-work','v1','en')
  assert.deepEqual(d.scoring.dimensions[0].reverseItems,['cbiw.07'])
  assert.equal(d.questions.length,7)
  assert.deepEqual(d.questions.slice(0,3).map(q => q.responseAnchors?.[4]),Array(3).fill('To a very high degree'))
  assert.equal(d.questions[3].responseAnchors,undefined)
  assert.equal(total(d, values(d,2)),50)
  assert.equal(total(d, {...values(d,0),'cbiw.07':4}),0)
  assert.equal(total(d, {...values(d,4),'cbiw.07':0}),100)
  assert.equal(total(d, {...values(d,0),'cbiw.01':4,'cbiw.07':4}),14.29)
})
test('source-backed instruments integrate into locale-aware explorer without leaking PHQ-8 to guests', async () => {
  for (const locale of ['en','ru']) {
    const guest=buildExplorerEntries({locale,audience:'guest'})
    const account=buildExplorerEntries({locale,audience:'account'})
    assert.equal(guest.find(x=>x.key==='phq-8').selectable,false)
    assert.equal(account.find(x=>x.key==='phq-8').selectable,true)
    for (const key of ['cbi-personal','cbi-work','cbi-client']) {
      const item=guest.find(x=>x.key===key)
      assert.equal(item.selectable,true,key)
      assert.equal(item.questionCount,item.definition.questions.length)
    }
    const coverage=coverageForSelection(account,['cbi-personal','phq-8'])
    assert.ok(coverage.axes.stress.coverage>0)
    assert.ok(coverage.axes.mood.coverage>0)
  }
  const component=await readFile(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  const guestComponent=await readFile(new URL('../components/app/cabinet-landing.jsx',import.meta.url),'utf8')
  assert.match(guestComponent, /item\.guestEligible === false/)
  assert.match(guestComponent, /question\.responseAnchors \|\| definition\.responseAnchors/)
  assert.match(component,/question\.responseAnchors \|\| def\.responseAnchors/)
})

test('clinical scales have source attribution and appropriate automatic-battery eligibility', async () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const starter = buildStarterBattery(entries, { focus: ['stress'], depth: 'balanced' })
  assert.ok(starter.every(entry => !['cbi-work','cbi-client','phq-8'].includes(entry.key)))
  for (const key of ['cbi-work','cbi-client','phq-8']) {
    const item = PROFESSIONAL_BATTERY_2026_CATALOG.find(entry => entry.key === key)
    assert.equal(item.starterEligible, false)
  }
  const component = await readFile(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  assert.match(component, /Source and methodology/)
  assert.match(component, /def\.source\.citation/)
  assert.match(component, /Over the past two weeks/)
  const researched = ['ders-16','wemwbs-14','swemwbs-7','bdi-ii','bai-21','maas-15','tas-20','panas-20','gse-10','spane-12']
  for (const key of researched) {
    const instrument = entries.find(entry => entry.key === key)
    assert.ok(instrument && instrument.source === 'research' && !instrument.selectable, key)
    assert.equal(instrument.definition, null, key)
  }
})
