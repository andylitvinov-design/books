import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { authorScoreClusters } from '../lib/assessments/author-score-clusters.js'

const get = (key, version='v1', locale='en', edge='min') => {
  const definition = getAssessmentDefinition(key,version,locale)
  const answers = Object.fromEntries(definition.questions.map((question,index) => {
    const low=question.min??definition.answerScale.min
    const high=question.max??definition.answerScale.max
    return [question.id, edge==='max' ? high : edge==='mid' ? Math.floor((low+high)/2)
      : edge==='mixed' ? (index%2 ? high : low) : low]
  }))
  return {definition,result:scoreAssessment(definition,answers)}
}

function validateClusters(model, dimension) {
  const reading=model?.rangeReading
  assert.ok(reading, dimension.key+' should have score interpretation')
  assert.ok(['source-options','descriptive','continuous'].includes(reading.kind),
    'Authorial scale must not receive fabricated diagnostic categories')
  if (!reading.clusterBasis) return false
  assert.ok(['source-answer-anchors','attainable-score-positions'].includes(reading.clusterBasis))
  assert.ok(reading.sourceQuestions?.length > 0)
  assert.ok(reading.sourceQuestions.every(question=>question.id && question.text))
  assert.ok(reading.scoringNote?.length > 50)
  assert.ok(reading.caution?.match(/not clinical|not a medical|not clinical cutoffs|not clinical norms|не клиническ|не медицинск/))
  assert.ok(reading.rows.length >= 2 && reading.rows.length <= 7)
  assert.equal(reading.rows.filter(row => row.current).length,1)
  const rows=reading.rows
  assert.equal(rows[0].from,dimension.min)
  assert.equal(rows.at(-1).to,dimension.max)
  assert.ok(rows.every((row,i)=>Number.isFinite(row.from)&&Number.isFinite(row.to) &&
    row.from <= row.to && row.displayRange && row.note.length > 65 &&
    (i === 0 || row.from > rows[i-1].to)))
  assert.ok(reading.current.from <= dimension.value && reading.current.to >= dimension.value)
  assert.ok(!reading.caution.includes('diagnostic threshold confirmed'))
  return true
}

test('original mean subscales get real attainable-score intervals, not arbitrary decimal fifths',()=>{
  const {definition,result}=get('hh-money-pressure','v2','en','mixed')
  assert.equal(definition.scoring.dimensions.length,2,'difficulty and coping are independent')
  for(const dimension of result.dimensions){
    const en=gaugeModel(dimension,result,'en')
    const ru=gaugeModel(dimension,result,'ru')
    assert.equal(validateClusters(en,dimension),true)
    assert.equal(validateClusters(ru,dimension),true)
    assert.equal(en.rangeReading.clusterBasis,'source-answer-anchors')
    assert.equal(en.rangeReading.rows.length,5)
    assert.deepEqual(en.rangeReading.rows.map(x=>[x.from,x.to]),
      [[0,.33],[.67,1.33],[1.67,2.33],[2.67,3.33],[3.67,4]])
    assert.deepEqual(en.rangeReading.rows.map(x=>[x.from,x.to]),
      ru.rangeReading.rows.map(x=>[x.from,x.to]))
    assert.notEqual(en.rangeReading.rows[0].label,ru.rangeReading.rows[0].label)
    assert.equal(en.rangeReading.sourceQuestions.length,3)
    assert.equal(ru.rangeReading.sourceQuestions.length,3)
    assert.match(ru.rangeReading.scoringNote,/Среднее по 3 вопросам/)
    assert.match(en.rangeReading.caution,/not clinical norms, clinical cutoffs/)
    assert.notEqual(en.rangeReading.rows[0].note,en.rangeReading.rows[4].note)
    if (dimension.direction.startsWith('lower-reported-')) {
      assert.match(en.rangeReading.rows[0].note,/difficult moments may still occur/)
      assert.match(en.rangeReading.rows[4].note,/professional support/)
    } else {
      assert.match(en.rangeReading.rows[0].note,/named options are weakly endorsed/)
      assert.match(en.rangeReading.rows[4].note,/does not establish stability over time/)
    }
  }
})

test('four-item scored personality sum keeps exact 4–20, no clinical personality categories',()=>{
  const {result}=get('hh-socionics-32','v1','en','mid')
  assert.ok(result.dimensions.length>=4)
  for(const dimension of result.dimensions){
    const m=gaugeModel(dimension,result,'en')
    assert.equal(validateClusters(m,dimension),true)
    assert.equal(m.rangeReading.rows[0].from,4)
    assert.equal(m.rangeReading.rows.at(-1).to,20)
    assert.equal(m.rangeReading.sourceQuestions.length,4)
    assert.match(m.rangeReading.scoringNote,/Sum across 4 item/)
    assert.match(m.rangeReading.caution,/not clinical norms, clinical cutoffs/)
  }
})

test('direct Holistic House one-item ratings present only attainable integer scores',()=>{
  const {result}=get('hh-current-state','v2','ru','mixed')
  for(const dimension of result.dimensions){
    const guide=gaugeModel(dimension,result,'ru')?.rangeReading
    assert.ok(guide?.clusterBasis,dimension.key)
    assert.equal(guide.sourceQuestions.length,1)
    assert.equal(guide.rows[0].from,dimension.min)
    assert.equal(guide.rows.at(-1).to,dimension.max)
    assert.equal(guide.rows.filter(v=>v.current).length,1)
    assert.match(guide.scoringNote,/Отдельный ответ/)
    assert.match(guide.rows[0].note,/Полюса исходного вопроса:/)
    assert.match(guide.rows[0].note,/0/)
    assert.match(guide.rows[0].note,/10/)
  }
})

test('all active nontraditional author scales show a numeric map and original item list across languages',()=>{
  const active=new Map(MONITORING_CATALOG.filter(row=>row.startable &&
    row.key.startsWith('hh-') && row.key!=='hh-bach-flower-profile')
    .map(row=>[row.key,row.version]))
  let checked=0,forms=new Set(), dimensions=new Set()
  const excluded=[]
  for(const def of ASSESSMENT_DEFINITIONS) {
    if(active.get(def.key)!==def.version)continue
    forms.add(def.key+':'+def.version+':'+def.instrumentLocale)
    const questions=Object.fromEntries(def.questions.map((q,i)=>{
      const lo=q.min??def.answerScale.min
      const hi=q.max??def.answerScale.max
      return [q.id, i%2===0?lo:hi]
    }))
    const result=scoreAssessment(def,questions)
    for(const dim of result.dimensions){
      // Fixed-score mixed direction versions are intentionally not converted
      // into fabricated severity/resource classifications.
      const interpretation=interpretationBandModel(result,dim,def.instrumentLocale)
      const view=gaugeModel(dim,result,def.instrumentLocale)
      assert.ok(view?.rangeReading,def.id+':'+dim.key)
      if(interpretation.basis!=='descriptive' || interpretation.reliableDirection===false){
        excluded.push(def.key+':'+dim.key+':'+interpretation.basis)
        continue
      }
      if(!view.rangeReading.clusterBasis){
        excluded.push(def.key+':'+dim.key+':no-audited-source-clusters')
        continue
      }
      assert.equal(validateClusters(view,dim),true)
      dimensions.add(def.key+':'+dim.key)
      checked++
    }
  }
  assert.ok(forms.size>=100,'Both EN and RU versioned originals must be covered')
  assert.ok(dimensions.size>=70,'Measure every active authorial subscale, not just a sample')
  assert.deepEqual(excluded,[], 'All active, eligible authored subscales need a score-cluster map')
  assert.ok(checked>120)
})

test('tampering with version, hash or numeric point never generates plausible clusters',()=>{
  const {result}=get('hh-money-pressure','v2','en','mid')
  const dimension=result.dimensions[0]
  const classification=interpretationBandModel(result,dimension,'en')
  assert.equal(classification.verified,true)
  assert.equal(authorScoreClusters({result,dimension,interpretation:classification,locale:'en'})?.rows.length,5)
  for(const tamper of [
    {...result,contentHash:'altered'},
    {...result,definitionId:'not-an-id'},
    {...result,definitionVersion:'v99'},
  ]) assert.equal(authorScoreClusters({result:tamper,dimension,interpretation:classification,locale:'en'}),null)
  assert.equal(authorScoreClusters({result,dimension:{...dimension,value:99},interpretation:classification}),null)
  assert.equal(authorScoreClusters({result,dimension,interpretation:{...classification,verified:false}}),null)
})

test('historical mixed-polarity and symbolic weights do not receive invented orderings',()=>{
  const old=get('hh-money-pressure','v1','en','mixed')
  for(const dimension of old.result.dimensions){
    const m=gaugeModel(dimension,old.result,'en')
    assert.ok(m)
    assert.equal(m?.rangeReading?.clusterBasis, 'historical-mixed-mean-v1')
    assert.equal(m.rangeReading.kind, 'historical-mixed')
    assert.equal(m.rangeReading.rows.length, 5)
    assert.match(m.rangeReading.caution,/None of these intervals indicates severity/)
    assert.ok(!m.bands.length)
  }
  const bach=get('hh-bach-flower-profile','v2','en','min')
  for(const dimension of bach.result.dimensions.slice(0,4)){
    const model=gaugeModel(dimension,bach.result,'en')
    assert.equal(model?.rangeReading?.clusterBasis??null,null)
  }
})

test('current and historical scores are not rescored; report discloses item mappings accessibly',()=>{
  const source=readFileSync(new URL('../components/app/compact-assessment-report.jsx',import.meta.url),'utf8')
  assert.match(source,/data-author-cluster-source-items/)
  assert.match(source,/data-author-cluster-scoring/)
  assert.match(source,/data-author-cluster-items/)
  assert.match(source,/rangeReading\.sourceQuestions\.map/)
  const modelSource=readFileSync(new URL('../lib/assessments/dashboard-gauges.js',import.meta.url),'utf8')
  assert.match(modelSource,/authorScoreClusters\(\{result, dimension, interpretation, locale\}\)/)
  assert.doesNotMatch(modelSource,/scoreAssessment\(/)
})

test('every audited source cluster publishes exact attainable score points without gaps disguised as scores', () => {
  let count = 0
  const active = new Map(MONITORING_CATALOG.filter(row=>row.startable &&
    row.key.startsWith('hh-') && row.key !== 'hh-bach-flower-profile')
    .map(row=>[row.key,row.version]))
  for (const def of ASSESSMENT_DEFINITIONS.filter(d=>active.get(d.key) === d.version)) {
    const answers = Object.fromEntries(def.questions.map(q => [q.id,q.min ?? def.answerScale.min]))
    const result = scoreAssessment(def,answers)
    for (const dimension of result.dimensions) {
      const reading = gaugeModel(dimension,result,def.instrumentLocale)?.rangeReading
      assert.ok(reading?.clusterBasis,def.key+'/'+dimension.key+' has documented source intervals')
      const points = reading.rows.flatMap(row => {
        assert.ok(Object.isFrozen(row.scorePoints), 'reported attainable points must be immutable')
        assert.equal(row.attainableCount,row.scorePoints.length)
        assert.equal(row.scorePoints[0],row.from)
        assert.equal(row.scorePoints.at(-1),row.to)
        assert.deepEqual(row.scorePoints,[...new Set(row.scorePoints)].sort((a,b)=>a-b))
        return row.scorePoints
      })
      assert.deepEqual(points,[...new Set(points)].sort((a,b)=>a-b),'no overlap between score clusters')
      assert.equal(points[0],dimension.min)
      assert.equal(points.at(-1),dimension.max)
      assert.ok(points.includes(dimension.value))
      assert.equal(reading.rows.filter(row=>row.scorePoints.includes(dimension.value)).length,1)
      assert.match(reading.scoringNote,def.instrumentLocale==='ru'
        ? /Формула:|один ответ|не среднее/ : /Formula:|one direct response/)
      assert.ok(reading.contentBoundary?.length > 60)
      count++
    }
  }
  assert.ok(count>120,'all active authored subscales covered by attainable scores and construct warnings')
})

test('money-pressure v2 explains every coded answer, each attainable mean and the exact 3-item formula', () => {
  for (const locale of ['en','ru']) {
    const {result}=get('hh-money-pressure','v2',locale,'mid')
    for (const dimension of result.dimensions) {
      const reading=gaugeModel(dimension,result,locale)?.rangeReading
      assert.deepEqual(reading.sourceResponseOptions.map(option=>option.value),[0,1,2,3,4])
      assert.deepEqual(reading.rows.map(row=>row.originalAnswerCode),[0,1,2,3,4])
      assert.deepEqual(reading.rows.map(row=>row.scorePoints),[
        [0,.33],[.67,1,1.33],[1.67,2,2.33],[2.67,3,3.33],[3.67,4],
      ])
      assert.match(reading.scoringNote,locale==='ru'
        ? /Формула: сумма кодов ответов ÷ 3/
        : /Formula: sum of coded responses ÷ 3/)
      assert.match(reading.contentBoundary,locale==='ru'
        ? /разные подшкалы/ : /separately/)
    }
  }
})

test('direct ratings stay standalone values; mixed-domain author scales disclose what total cannot measure', () => {
  for (const locale of ['en','ru']) {
    const {result}=get('hh-current-state','v2',locale,'mid')
    for (const dimension of result.dimensions) {
      const reading=gaugeModel(dimension,result,locale)?.rangeReading
      assert.equal(reading.sourceResponseOptions,null)
      assert.deepEqual(reading.rows.flatMap(row=>row.scorePoints),Array.from({length:11},(_,i)=>i))
      assert.match(reading.scoringNote,locale==='ru' ? /один ответ/ : /one direct response/)
      assert.match(reading.contentBoundary,locale==='ru' ? /Пять отдельных вопросов/ : /Five separate questions/)
    }
    for (const [key,version,keyword] of [
      ['hh-felt-safety','v1',locale==='ru'?/объективную безопасность/:/objective safety/],
      ['hh-body-mind-context','v1',locale==='ru'?/тяжесть болезни/:/illness severity/],
      ['hh-overthinking-loop','v2',locale==='ru'?/раздельно/:/separate/],
      ['hh-screen-saturation','v2',locale==='ru'?/отдельно/:/separately/],
    ]) {
      const {result}=get(key,version,locale,'mid')
      for (const dimension of result.dimensions) {
        const reading=gaugeModel(dimension,result,locale)?.rangeReading
        assert.ok(reading?.contentBoundary,key+'/'+dimension.key)
        assert.match(reading.contentBoundary,keyword)
        assert.doesNotMatch(reading.contentBoundary,/diagnos(?:is|ed) confirmed|клинический диагноз подтвержден/)
      }
    }
  }
})

test('full report shows original 0–4 response codes, exact attainable points and construct limitations', () => {
  const view=readFileSync(new URL('../components/app/compact-assessment-report.jsx',import.meta.url),'utf8')
  const source=readFileSync(new URL('../lib/assessments/assessment-range-reading.js',import.meta.url),'utf8')
  assert.match(view,/data-author-response-codes/)
  assert.match(view,/data-attainable-score-points/)
  assert.match(view,/data-author-construct-boundary/)
  assert.match(view,/rangeReading\.sourceResponseOptions\.map/)
  assert.match(view,/band\.scorePoints\.map/)
  assert.match(source,/sourceResponseOptions: authorClusters\?\.responseOptions/)
  assert.match(source,/contentBoundary: authorClusters\?\.contentBoundary/)
})
