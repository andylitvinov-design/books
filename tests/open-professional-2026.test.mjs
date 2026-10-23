import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import {
  OPEN_PROFESSIONAL_2026_DEFINITIONS as professional,
  OPEN_PROFESSIONAL_2026_CATALOG as addedCatalog,
  OPEN_PROFESSIONAL_INTERPRETATION_ROWS,
  OPEN_PROFESSIONAL_DIMENSION_ROWS,
} from '../data/assessments/open-professional-2026.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { interpretationPlan, interpretationRegistryCoverage, classificationDirection } from '../lib/assessments/interpretation-registry.js'

const SCORE_KEYS = ['trait.bfas.volatility','trait.bfas.withdrawal','trait.bfas.compassion',
  'trait.bfas.industriousness','trait.bfas.orderliness','trait.bfas.intellect','trait.bfas.openness']
const originals = professional.flatMap(d => d.questions)

test('18 complete source-based instruments have 120 real items and 22 scored dimensions', () => {
  assert.equal(professional.length, 18)
  assert.equal(addedCatalog.length, 18)
  assert.equal(originals.length, 120)
  assert.equal(new Set(originals.map(q=>q.id)).size,120)
  assert.equal(professional.reduce((n,d)=>n+d.scoring.dimensions.length,0),22)
  assert.equal(new Set(professional.map(d=>d.id)).size,18)
  assert.equal(new Set(professional.map(d=>d.key)).size,18)
  assert.equal(OPEN_PROFESSIONAL_INTERPRETATION_ROWS.length,18)
  assert.equal(OPEN_PROFESSIONAL_DIMENSION_ROWS.length,22)
  assert.deepEqual(professional.slice(0,7).map(d=>d.scoring.dimensions[0].key),SCORE_KEYS)
  for (const d of professional) {
    assert.equal(d.questions.length, d.key === 'tipi-10' ? 10 : d.key.startsWith('ipip-via-r-') ? 4 : 10)
    assert.ok(d.questions.every(q=>q.required && typeof q.text==='string' && q.text.length>8))
    assert.ok(d.source.url.startsWith('https://'))
    assert.ok(d.source.permissionUrl.includes('ipip.ori.org') || d.key === 'tipi-10')
    assert.equal(d.instrumentLocale,'en')
    assert.equal(d.translationVersion,'original-en-v1')
    assert.equal(d.source.reviewedAt,'2026-10-11')
    assert.equal(getAssessmentDefinition(d.key,d.version,d.instrumentLocale),d)
    const {contentHash,...body}=d
    assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'),d.key)
    for (const dim of d.scoring.dimensions) {
      assert.equal(dim.method,'mean')
      assert.equal(dim.direction,'non-normative')
      assert.equal(dim.dimensionClass,'trait')
      assert.ok(dim.items.length>1)
      assert.ok(dim.reverseItems.every(id=>dim.items.includes(id)))
    }
    const c=MONITORING_CATALOG.find(c=>c.key===d.key)
    assert.ok(c?.startable && c.rightsStatus==='cleared' && c.guestEligible && c.free,c?.key)
    assert.equal(c.starterEligible,false)
    assert.equal(c.questionCount,d.questions.length)
    assert.ok(interpretationPlan(d.key,'v1'))
  }
})

test('TIPI reproduces official 10 item, 5 scale configuration and 1–7 scored endpoints',()=>{
  const d=professional.find(d=>d.key==='tipi-10')
  const keys=d.scoring.dimensions.map(dim=>dim.items.map(id=>Number(id.split('.').at(-1))))
  assert.deepEqual(keys,[[1,6],[2,7],[3,8],[4,9],[5,10]])
  assert.deepEqual(d.scoring.dimensions.map(dim=>dim.reverseItems.map(id=>Number(id.split('.').at(-1)))),[[6],[2],[8],[4],[10]])
  // Higher answers to positive-keyed items, lower answers to reverse-keyed items.
  const allHigh=Object.fromEntries(d.questions.map((q,i)=>[q.id, [1,3,5,7,9].includes(i+1)?7:1]))
  const allLow=Object.fromEntries(d.questions.map((q,i)=>[q.id, [1,3,5,7,9].includes(i+1)?1:7]))
  assert.deepEqual(scoreAssessment(d,allHigh, syntheticTraumaContext(d)).dimensions.map(x=>x.value),[7,7,7,7,7])
  assert.deepEqual(scoreAssessment(d,allLow, syntheticTraumaContext(d)).dimensions.map(x=>x.value),[1,1,1,1,1])
  assert.deepEqual(scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,4])), syntheticTraumaContext(d)).dimensions.map(x=>x.value),[4,4,4,4,4])
})

test('BFAS and VIA-R use complete official positive/negative keyed forms; no clinical cutoffs',()=>{
  for (const d of professional.filter(x=>x.key!=='tipi-10')) {
    const dim=d.scoring.dimensions[0]
    assert.equal(dim.items.length,d.key.startsWith('ipip-via-r-')?4:10)
    assert.equal(dim.reverseItems.length,d.key.startsWith('ipip-via-r-')?2:d.key.includes('compassion')?5:d.key.includes('industriousness')?6:4)
    const high=Object.fromEntries(d.questions.map(q=>[q.id,dim.reverseItems.includes(q.id)?1:5]))
    const low=Object.fromEntries(d.questions.map(q=>[q.id,dim.reverseItems.includes(q.id)?5:1]))
    for(const [answers,expect] of [[high,5],[low,1]]) {
      const result=scoreAssessment(d,answers, syntheticTraumaContext(d))
      assert.equal(result.dimensions.length,1,d.key)
      assert.equal(result.dimensions[0].value,expect,d.key)
      assert.equal(classificationDirection(result.dimensions[0]),'neutral',d.key)
      for(const locale of ['en','ru']){
        const report=buildAssessmentResultReport(result,locale)
        assert.equal(report.sections.length,1,d.key+'/'+locale)
        assert.equal(report.sections[0].bandBasis,'descriptive',d.key)
        assert.ok(report.sections[0].meaning.length>65,d.key)
        assert.ok(report.sections[0].steps.length>=2,d.key)
        assert.ok(report.sections[0].construct.length>=5,d.key)
        assert.match(report.note,locale==='en'?/clinical cutoff|diagnosis/:/диагноз|клинический порог/)
      }
    }
  }
})

test('all runnable 150 now have exact-version score interpretation plans and per-scale guidance',()=>{
  const c=interpretationRegistryCoverage(MONITORING_CATALOG)
  assert.deepEqual({total:c.total,registered:c.registered,uncovered:c.uncovered,obsolete:c.obsolete},
    {total:150,registered:150,uncovered:[],obsolete:[]})
  assert.equal(new Set(MONITORING_CATALOG.filter(c=>c.startable).map(c=>c.key)).size,150)
  for(const def of professional){
    const guideEN=getTestScaleGuide(def.key,'en')
    const guideRU=getTestScaleGuide(def.key,'ru')
    assert.equal(guideEN.scales.length,def.scoring.dimensions.length)
    assert.equal(guideRU.scales.length,def.scoring.dimensions.length)
    assert.ok(guideEN.scales.every(s=>s.type==='trait' && !s.canChooseSkill))
    assert.ok(guideRU.scales.every(s=>s.watch.length>=30 && s.action.length>=30))
    if(def.key==='tipi-10'){
      const scored=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,4])), syntheticTraumaContext(def))
      assert.equal(buildAssessmentResultReport(scored,'en').sections.length,5)
      assert.equal(buildAssessmentResultReport(scored,'ru').sections.length,5)
    }
  }
})

test('all new instruments are actually selectable in guest and authenticated test explorer',()=>{
  const keys=new Set(professional.map(d=>d.key))
  for(const audience of ['guest','account']){
    const entries=buildExplorerEntries({locale:'en',audience})
    assert.equal(entries.filter(x=>keys.has(x.key)).length,18)
    assert.ok(entries.filter(x=>keys.has(x.key)).every(x=>x.source==='product' && x.startable && x.selectable && x.definition))
    const filtered=filterExplorerEntries(entries,{availability:'available',styles:['professional']})
    assert.ok([...keys].every(k=>filtered.some(e=>e.key===k)))
  }
})

test('18 immutable registry versions have additive SQL, safety documentation and no schema/auth changes',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/20261012033000_hh_18_official_professional_tests.sql',import.meta.url),'utf8')
  assert.match(sql,/on conflict \(id\) do nothing/)
  assert.match(sql,/definition_key=d->>'key'/)
  assert.doesNotMatch(sql,/drop table|disable row level security|alter policy|service_role/i)
  for(const d of professional){
    assert.ok(sql.includes(d.id),d.key)
    assert.ok(sql.includes(d.contentHash),d.key)
    const guide=await readFile(new URL('../docs/assessments/guides/'+d.key+'.md',import.meta.url),'utf8')
    assert.ok(guide.includes(d.source.url))
    assert.ok(guide.includes(d.source.permissionUrl))
    assert.ok(guide.includes(d.key))
  }
  assert.equal(ASSESSMENT_DEFINITIONS.filter(d=>professional.some(n=>n.id===d.id)).length,18)
})
