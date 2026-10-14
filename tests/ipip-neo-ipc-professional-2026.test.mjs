import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, access } from 'node:fs/promises'

import {
  NEW_PROFESSIONAL_NEOPIC_DEFINITIONS as forms,
  NEW_PROFESSIONAL_NEOPIC_CATALOG as newCatalog,
  NEW_PROFESSIONAL_NEOPIC_INTERPRETATION_ROWS as interpretationRows,
  NEW_PROFESSIONAL_NEOPIC_DIMENSION_ROWS as dimensionRows,
} from '../data/assessments/ipip-neo-ipc-professional-2026.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, getDefinitionById } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { interpretationPlan, interpretationRegistryCoverage, classificationDirection } from '../lib/assessments/interpretation-registry.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { assessmentMethodology } from '../lib/assessments/assessment-methodology.js'

const allKeys = new Set(forms.map(f=>f.key))
const neo = forms.filter(d=>d.key.startsWith('ipip-neo120-facet-'))
const ipc = forms.filter(d=>d.key.startsWith('ipip-ipc-')&&d.key!=='ipip-ipc-32')
const full = forms.find(d=>d.key==='ipip-ipc-32')
const answers = (d,number=3)=>Object.fromEntries(d.questions.map(q=>[q.id,number]))

test('29 published nonpolitical IPIP-NEO facets and 9 IPIP-IPC questionnaires, all distinct and startable',()=>{
  assert.equal(forms.length,38)
  assert.equal(newCatalog.length,38)
  assert.equal(interpretationRows.length,38)
  assert.equal(dimensionRows.length,45)
  assert.equal(neo.length,29)
  assert.equal(ipc.length,8)
  assert.equal(full.questions.length,32)
  assert.equal(forms.flatMap(d=>d.questions).length,180)
  assert.equal(new Set(forms.map(d=>d.id)).size,38)
  assert.equal(allKeys.size,38)
  assert.equal(MONITORING_CATALOG.filter(c=>c.startable).length,165)
  assert.equal(MONITORING_CATALOG.filter(c=>c.startable&&c.testStyle==='professional').length,98)
  assert.deepEqual(interpretationRegistryCoverage(MONITORING_CATALOG),{total:165,registered:165,uncovered:[],obsolete:[]})
  assert.ok(neo.every(d=>d.questions.length===4))
  assert.ok(ipc.every(d=>d.questions.length===4))
  assert.equal(full.scoring.dimensions.length,8)
  assert.ok(!forms.some(d=>/facet-o6/.test(d.key)))
  assert.ok(!forms.flatMap(d=>d.questions).some(q=>/vote for|political candidates/i.test(q.text)))
  assert.ok(forms.every(d=>d.suggestedRepeatDays===null))
})

test('versioned source original English, sha256, item keys and source-cleared rights',()=>{
  const refNEO='https://ipip.ori.org/30FacetNEO-PI-RItems.htm'
  const refIPC='https://ipip.ori.org/newIPIP-IPCScoringKey.htm'
  for(const d of forms){
    const base=Object.fromEntries(Object.entries(d).filter(([k])=>k!=='contentHash'))
    assert.equal(d.contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(base)).digest('hex'),d.key)
    assert.equal(d.instrumentLocale,'en')
    assert.equal(d.translationVersion,'original-en-v1')
    assert.deepEqual(d.answerScale,{min:1,max:5})
    assert.equal(d.responseAnchors.length,5)
    assert.ok(d.questions.every(q=>q.required&&q.text?.length>=10),d.key)
    assert.equal(new Set(d.questions.map(q=>q.id)).size,d.questions.length)
    assert.equal(d.scoringKey,'configured')
    assert.equal(d.scoringVersion,'v1')
    assert.equal(d.source.url,d.key.startsWith('ipip-ipc')?refIPC:refNEO)
    assert.equal(d.source.permissionUrl,'https://ipip.ori.org/newPermission.htm')
    assert.equal(getAssessmentDefinition(d.key,d.version,d.instrumentLocale),d)
    assert.equal(getDefinitionById(d.id),d)
    assert.ok(interpretationPlan(d.key,'v1')?.step?.ru.length>24)
    const catalog=MONITORING_CATALOG.find(c=>c.key===d.key)
    assert.ok(catalog&&catalog.startable&&catalog.free&&catalog.rightsStatus==='cleared'&&catalog.guestEligible&&!catalog.starterEligible,d.key)
    assert.equal(catalog.questionCount,d.questions.length)
    for(const spec of d.scoring.dimensions){
      assert.equal(spec.method,'mean')
      assert.equal(spec.dimensionClass,'trait')
      assert.equal(spec.direction,'non-normative')
      assert.equal(spec.min,1)
      assert.equal(spec.max,5)
      assert.ok(spec.items.length===4)
      assert.ok(spec.items.every(id=>d.questions.some(q=>q.id===id)))
      assert.ok(spec.reverseItems.every(id=>spec.items.includes(id)))
    }
  }
  assert.deepEqual(neo.map(d=>d.key).filter(k=>k.startsWith('ipip-neo120-facet-o')),['ipip-neo120-facet-o1','ipip-neo120-facet-o2','ipip-neo120-facet-o3','ipip-neo120-facet-o4','ipip-neo120-facet-o5'])
  assert.deepEqual(neo.find(d=>d.key==='ipip-neo120-facet-c6').scoring.dimensions[0].reverseItems.length,4)
  assert.deepEqual(neo.find(d=>d.key==='ipip-neo120-facet-n1').questions.map(q=>q.text),[
    'Worry about things.','Fear for the worst.','Am afraid of many things.','Get stressed out easily.'
  ])
  assert.deepEqual(neo.find(d=>d.key==='ipip-neo120-facet-n6').questions.map(q=>q.text),[
    'Panic easily.','Become overwhelmed by events.',"Feel that I'm unable to deal with things.",'Remain calm under pressure.'
  ])
})

test('original IPIP IPC 32 item order and eight positive-keyed four-item octants match published key',()=>{
  const patterns={pa:[6,14,22,30],bc:[7,15,23,31],de:[8,16,24,32],fg:[1,9,17,25],
    hi:[2,10,18,26],jk:[3,11,19,27],lm:[4,12,20,28],no:[5,13,21,29]}
  assert.deepEqual(full.questions.map(q=>Number(q.id.slice(-2))),Array.from({length:32},(_,i)=>i+1))
  assert.deepEqual(full.scoring.dimensions.map(x=>x.key),Object.keys(patterns).map(code=>'trait.ipipipc.'+code))
  assert.equal(full.scoring.dimensions.reduce((n,d)=>n+d.items.length,0),32)
  for(const [code,numbers] of Object.entries(patterns)){
    const short=ipc.find(d=>d.key==='ipip-ipc-'+code+'-4')
    const dimension=full.scoring.dimensions.find(x=>x.key==='trait.ipipipc.'+code)
    assert.ok(short&&dimension)
    assert.deepEqual(dimension.items.map(id=>Number(id.slice(-2))),numbers)
    assert.deepEqual(short.questions.map(q=>Number(q.id.slice(-2))),numbers)
    assert.deepEqual(short.questions.map(q=>q.text),numbers.map(n=>full.questions[n-1].text))
    assert.deepEqual(dimension.reverseItems,[])
    assert.deepEqual(short.scoring.dimensions[0].reverseItems,[])
    assert.equal(short.scoring.dimensions[0].key,'trait.ipipipc.short.'+code)
    assert.notEqual(short.scoring.dimensions[0].key,dimension.key,'The full IPC and brief IPC scores need globally distinct IDs in combined client PDFs')
  }
  assert.equal(full.questions[0].text,'Am quiet around strangers')
  assert.equal(full.questions[31].text,"Am not interested in other people's problems")
})

test('reverse coding, valid ranges and 8 profile axes are deterministic and nonclinical',()=>{
  for(const d of forms){
    const baseline=scoreAssessment(d,answers(d,3))
    assert.equal(baseline.dimensions.length,d.scoring.dimensions.length)
    assert.ok(baseline.dimensions.every(dim=>dim.value===3),d.key)
    const pos=new Set(d.scoring.dimensions.flatMap(dim=>dim.reverseItems))
    const high=Object.fromEntries(d.questions.map(q=>[q.id,pos.has(q.id)?1:5]))
    const low=Object.fromEntries(d.questions.map(q=>[q.id,pos.has(q.id)?5:1]))
    const up=scoreAssessment(d,high),down=scoreAssessment(d,low)
    assert.ok(up.dimensions.every(dim=>dim.value===5),d.key)
    assert.ok(down.dimensions.every(dim=>dim.value===1),d.key)
    assert.ok(up.dimensions.every(dim=>classificationDirection(dim)==='neutral'))
    assert.throws(()=>scoreAssessment(d,answers(d,6)))
    assert.throws(()=>scoreAssessment(d,Object.fromEntries(d.questions.slice(1).map(q=>[q.id,3]))))
    for(const locale of ['en','ru']){
      const guide=getTestScaleGuide(d.key,locale)
      assert.equal(guide.scales.length,d.scoring.dimensions.length,d.key+'/'+locale)
      assert.equal(guide.instrumentLanguage,'en')
      assert.ok(guide.scales.every(s=>s.type==='trait'&&!s.canChooseSkill))
      assert.ok(guide.scales.every(s=>s.action.length>=25))
      const report=buildAssessmentResultReport(up,locale)
      assert.equal(report.sections.length,d.scoring.dimensions.length,d.key+'/'+locale)
      assert.ok(report.sections.every(s=>s.bandBasis==='descriptive'&&!s.recommendedReview&&s.steps.length>=2))
      assert.ok(report.sections.every(s=>s.meaning.length>40&&s.followUp.length>25))
      assert.match(report.note,locale==='en'?/not a clinical cutoff|not a diagnosis/i:/не клинический порог|не устанавливают диагноз/i)
    }
  }
})

test('guest and account test explorers expose full professional batch with topic filters and transparent language',()=>{
  for(const locale of ['en','ru'])for(const audience of ['guest','account']){
    const entries=buildExplorerEntries({locale,audience})
    const added=entries.filter(e=>allKeys.has(e.key))
    assert.equal(added.length,38,locale+'/'+audience)
    assert.ok(added.every(e=>e.source==='product'&&e.startable&&e.selectable&&e.definition&&e.testKind==='professional'))
    assert.ok(added.every(e=>e.questionCount===e.definition.questions.length))
    assert.ok(added.every(e=>e.testStyle==='professional'&&e.rightsStatus==='cleared'))
    const available=filterExplorerEntries(entries,{availability:'available',styles:['professional']})
    assert.equal(available.filter(e=>allKeys.has(e.key)).length,38)
    assert.ok(added.some(e=>e.topics.includes('relationships')))
    assert.ok(added.some(e=>e.topics.includes('work')))
    assert.ok(added.some(e=>e.topics.includes('attention')))
    assert.ok(added.some(e=>e.topics.includes('stress')))
    assert.ok(added.every(e=>e.measurementAxes.includes('personality')))
    if(locale==='ru')assert.ok(added.every(e=>/EN/.test(e.title)))
    for(const key of ['ipip-ipc-32','ipip-neo120-facet-n3']){
      const method=assessmentMethodology({key,definition:forms.find(f=>f.key===key),locale})
      assert.equal(method.status,'traits')
      assert.ok(method.text.length>120)
      assert.ok(method.sourceUrl?.startsWith('https://ipip.ori.org/'))
    }
  }
})

test('38 individual bilingual evidence guides and immutable additive SQL exactly match scored definitions',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/20261014143000_hh_ipip_neo_ipc_professional.sql',import.meta.url),'utf8')
  const embedded=JSON.parse(sql.split('$ipipneoipc$')[1])
  assert.deepEqual(embedded,forms)
  assert.match(sql,/insert into app\.assessment_versions/)
  assert.match(sql,/Conflicting immutable NEO\/IPC/)
  assert.match(sql,/on conflict \(id\) do nothing/)
  assert.doesNotMatch(sql,/^\s*(?:update app\.|delete from|truncate|alter table|grant|create policy)/im)
  for(const d of forms){
    const path='../docs/assessments/guides/'+d.key+'.md'
    await access(new URL(path,import.meta.url))
    const doc=await readFile(new URL(path,import.meta.url),'utf8')
    assert.ok(doc.includes('**Instrument ID:** `'+d.key+'`'),d.key)
    assert.ok(doc.includes('What this test explores'))
    assert.ok(doc.includes('Что исследует тест'))
    assert.ok(doc.includes('Шкалы, наблюдение и добровольная работа'))
    for(const dim of d.scoring.dimensions)assert.ok(doc.includes('`'+dim.key+'`'),d.key+'/'+dim.key)
    assert.ok(sql.includes(d.contentHash))
  }
})
