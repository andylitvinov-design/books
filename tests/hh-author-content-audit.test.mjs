import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { auditAuthorItemContent,authorItemContentCsv } from '../lib/assessments/author-item-content-audit.js'

const audit=()=>auditAuthorItemContent(ASSESSMENT_DEFINITIONS,MONITORING_CATALOG)

test('all 73 active HH original families have distinct item-level reviews in both EN/RU source editions',()=>{
  const state=audit()
  assert.equal(state.families,73)
  assert.equal(state.expectedLanguageVersions,146)
  assert.equal(state.languageVersions,146)
  assert.deepEqual(state.missingVersions,[])
  assert.ok(state.itemCount>500)
  assert.equal(state.rows.length,state.itemCount)
  assert.ok(state.rows.every(row=>row.key.startsWith('hh-')&&
    ['en','ru'].includes(row.locale)&&row.text&&row.itemId&&
    row.reviewStatus==='pending_qualified_content_review'&&
    row.dimensionKeys.every(key=>typeof key==='string')))
  const unique=new Set(state.rows.map(row=>[row.key,row.version,row.locale,row.itemId].join('@')))
  assert.equal(unique.size,state.itemCount,'No duplicate source question within exact edition')
})

test('old immutable source wording and source hashes are untouched by item-level triage',()=>{
  const before=JSON.stringify(ASSESSMENT_DEFINITIONS)
  const catalogBefore=JSON.stringify(MONITORING_CATALOG)
  audit()
  assert.equal(JSON.stringify(ASSESSMENT_DEFINITIONS),before)
  assert.equal(JSON.stringify(MONITORING_CATALOG),catalogBefore)
})

test('obvious double-concept current state and weekly questions enter review, not an invalidity category',()=>{
  const state=audit()
  const lookup=(key,locale,itemId)=>state.rows.find(row=>row.key===key&&row.locale===locale&&row.itemId===itemId)
  const resource=lookup('hh-current-state','en','state.resource')
  const resourceRu=lookup('hh-current-state','ru','state.resource')
  const weekly=lookup('hh-weekly-pulse','en','weekly.tension')
  assert.ok(resource?.flags.includes('double_construct_candidate'))
  assert.ok(resourceRu?.flags.includes('double_construct_candidate'))
  assert.ok(weekly?.flags.includes('double_construct_candidate'))
  assert.ok(state.candidatesForReview>=3)
  assert.equal(resource.reviewStatus,'pending_qualified_content_review')
  assert.equal(state.disclaimer.includes('NOT failed validity'),true)
})

test('inactive external or licensed research definitions never enter the authored review export',()=>{
  const state=audit()
  assert.ok(state.rows.every(row=>row.key.startsWith('hh-')))
  assert.ok(!state.rows.some(row=>row.key.startsWith('phq-')||row.key.startsWith('ipip-')))
  assert.ok(!state.rows.some(row=>'accountId' in row || 'patientName' in row ||
    'score' in row || 'email' in row))
})

test('CSV export includes review flags while blocking spreadsheet formula injection',()=>{
  const state=audit()
  const text=authorItemContentCsv(state)
  assert.ok(text.startsWith('key,version,locale,itemId,'))
  assert.equal(text.trimEnd().split('\n').length,state.itemCount+1)
  assert.match(text,/double_construct_candidate/)
  const hostile={rows:[{key:'hh-demo',version:'v1',locale:'en',itemId:'x',
    itemOrder:1,text:'=HYPERLINK("https://example.test","bad")',flags:['review'],
  }]}
  const sanitized=authorItemContentCsv(hostile)
  assert.match(sanitized,/"'=HYPERLINK/)
  assert.doesNotMatch(sanitized,/\n=HYPERLINK/)
})

test('audit module has no storage, network, or database dependencies',()=>{
  const source=readFileSync(new URL('../lib/assessments/author-item-content-audit.js',import.meta.url),'utf8')
  assert.doesNotMatch(source,/\bfetch\s*\(|\bfrom\s+['"]pg['"]|\bprocess\.env\b|client[-_ ]cabinet/i)
  assert.doesNotMatch(source,/test\s*validity\s*percent|autoDiagnos/i)
})
