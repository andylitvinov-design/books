import test from 'node:test'
import assert from 'node:assert/strict'
import { PUBLISHED_RANGE_COMMENTARY, publishedRangeCommentary } from '../lib/assessments/published-range-commentary.js'
import { assessmentRangeReading } from '../lib/assessments/assessment-range-reading.js'
import { descriptiveScoreLevels } from '../lib/assessments/descriptive-score-levels.js'

const expected = Object.freeze({
  'phq-2': { 'symptoms.phq2.total': ['below_screen','screen_signal'] },
  'gad-2': { 'symptoms.gad2.total': ['below_screen','screen_signal'] },
  'phq-4': {
    'symptoms.phq4.total': ['minimal','mild','moderate','severe'],
    'symptoms.phq4.depression': ['below_screen','screen_signal'],
    'symptoms.phq4.anxiety': ['below_screen','screen_signal'],
  },
  'phq-9': { 'symptoms.phq9.total': ['minimal','mild','moderate','moderately_severe','severe'] },
  'phq-8': { 'symptoms.phq_8.total': ['minimal','mild','moderate','moderately_severe','severe'] },
  'gad-7': { 'symptoms.gad7.total': ['minimal','mild','moderate','severe'] },
  k6: { 'symptoms.k6.total': ['below_screen','screen_signal'] },
  'phq-15': { 'symptoms.phq15.total': ['minimal','low','medium','high'] },
  brcs: { 'resources.brcs.total': ['low_coping','mid_coping','high_coping'] },
  'asrs-6': { 'symptoms.asrs6.shaded_count': ['below_screen','screen_signal'] },
})

// Source cutoffs are already gated by pinned questionnaire identities in
// interpretationBandModel; these checks verify narrative coverage and do not
// promote any unpublished threshold to a validated medical category.
test('37 source-backed score bands have distinct, meaningful bilingual commentary', () => {
  assert.deepEqual(Object.keys(PUBLISHED_RANGE_COMMENTARY).sort(), Object.keys(expected).sort())
  let total = 0
  for (const [key, dimensions] of Object.entries(expected)) {
    assert.deepEqual(Object.keys(PUBLISHED_RANGE_COMMENTARY[key]).sort(), Object.keys(dimensions).sort())
    for (const [dimension, codes] of Object.entries(dimensions)) {
      const commentary = PUBLISHED_RANGE_COMMENTARY[key][dimension]
      assert.deepEqual(Object.keys(commentary).sort(), [...codes].sort())
      const enNotes = [], ruNotes = []
      for (const code of codes) {
        const en = publishedRangeCommentary(key, dimension, code, 'en')
        const ru = publishedRangeCommentary(key, dimension, code, 'ru')
        assert.ok(en?.length >= 80, 'Detailed EN copy missing: ' + key + ':' + code)
        assert.ok(ru?.length >= 80, 'Detailed RU copy missing: ' + key + ':' + code)
        assert.ok(!en.includes('valid diagnosis'), 'Must never give a diagnosis')
        enNotes.push(en); ruNotes.push(ru); total++
      }
      assert.equal(new Set(enNotes).size, enNotes.length, 'Generic repeated EN notes for ' + key)
      assert.equal(new Set(ruNotes).size, ruNotes.length, 'Generic repeated RU notes for ' + key)
    }
  }
  assert.equal(total, 37)
})

test('provenance and unknown codes cannot accidentally receive another measure\'s meanings', () => {
  assert.equal(publishedRangeCommentary('rses-10', 'resources.rses.total', 'high', 'ru'), null)
  assert.equal(publishedRangeCommentary('gad-7', 'symptoms.phq9.total', 'severe', 'en'), null)
  assert.equal(publishedRangeCommentary('brcs', 'resources.brcs.total', 'severe', 'en'), null)
  assert.equal(publishedRangeCommentary('phq-9', 'symptoms.phq9.total', 'unpublished', 'en'), null)
  assert.equal(publishedRangeCommentary(null, null, null), null)
})

function reading(key, dimensionKey, starts, labels, value, basis = 'screening', locale = 'en') {
  const min = starts[0]
  const max = key === 'brcs' ? 20 : key === 'phq-9' ? 27 : key === 'phq-8' ? 24 :
    key === 'gad-7' ? 21 : key === 'phq-4' && dimensionKey.endsWith('.total') ? 12 :
    key === 'phq-15' ? 30 : key === 'k6' ? 24 : 6
  const bands = starts.map((from, i) => ({
    from, to: i === starts.length - 1 ? max : starts[i+1]-1,
    code: labels[i], label: labels[i],
    current: value >= from && value <= (i === starts.length - 1 ? max : starts[i+1]-1),
  }))
  return assessmentRangeReading({
    result: {definitionKey:key},
    dimension: {key:dimensionKey, min,max,value,dimensionClass:basis === 'published-reference' ? 'resources' : 'symptoms',
      direction:basis === 'published-reference' ? 'higher-reported-resource':'lower-reported-difficulty',
      sourceConstruct:dimensionKey},
    interpretation: {verified:true,basis,construct:dimensionKey,summary:'source-verified, not diagnostic'},
    bands, locale,
  })
}

test('exact PHQ-9 boundaries produce five specific explanations in both languages', () => {
  const starts = [0,5,10,15,20]
  const codes = expected['phq-9']['symptoms.phq9.total']
  for (const [from,to,code] of [[0,4,'minimal'],[5,9,'mild'],[10,14,'moderate'],[15,19,'moderately_severe'],[20,27,'severe']]) {
    for (const value of [from,to]) {
      for (const locale of ['en','ru']) {
        const view = reading('phq-9','symptoms.phq9.total',starts,codes,value,'screening',locale)
        assert.equal(view.kind,'published')
        assert.equal(view.rows.length,5)
        assert.equal(view.current.code,code)
        assert.ok(view.current.note.includes(publishedRangeCommentary('phq-9','symptoms.phq9.total',code,locale)))
        assert.ok(view.caution)
        assert.equal(view.rows.filter(row=>row.current).length,1)
      }
    }
  }
})

test('BRCS is explicitly published descriptive reference, not clinical screening', () => {
  for(const [from,to,code] of [[4,13,'low_coping'],[14,16,'mid_coping'],[17,20,'high_coping']]) {
    const view = reading('brcs','resources.brcs.total',[4,14,17],
      expected.brcs['resources.brcs.total'],to,'published-reference','en')
    assert.equal(view.current.code,code)
    assert.equal(view.rangeTitle,'Published reference ranges')
    assert.match(view.caution,/not a medical screening result/)
    assert.match(view.current.note,/coping/)
    assert.ok(from <= to)
  }
})

test('PHQ-8 notes clarify the optional five-band convention and missing safety item', () => {
  const bands = expected['phq-8']['symptoms.phq_8.total']
  assert.match(publishedRangeCommentary('phq-8','symptoms.phq_8.total',bands[3],'en'),/some published PHQ-8 surveillance reports/)
  assert.match(publishedRangeCommentary('phq-8','symptoms.phq_8.total',bands[4],'en'),/does not assess safety/)
})

test('out-of-range and unverified models never create a confident band narrative', () => {
  const valid = reading('gad-7','symptoms.gad7.total',[0,5,10,15],
    expected['gad-7']['symptoms.gad7.total'],21,'screening','en')
  assert.equal(valid.current.code,'severe')
  const notValid = assessmentRangeReading({
    result:{definitionKey:'gad-7'},
    dimension:{key:'symptoms.gad7.total',min:0,max:21,value:22},
    interpretation:{verified:true,basis:'screening',construct:'Anxiety'},
    bands:[{code:'severe',from:15,to:21,label:'severe',current:true}],
  })
  assert.equal(notValid,null)
  const noProvenance = assessmentRangeReading({
    result:{definitionKey:'gad-7'},
    dimension:{key:'symptoms.gad7.total',min:0,max:21,value:15},
    interpretation:{verified:false,basis:'screening',construct:'Anxiety'},
    bands:[{code:'severe',from:15,to:21,label:'severe',current:true}],
  })
  assert.equal(noProvenance,null)
})

test('original HH resource means are descriptions of this run, not claims of temporal stability', () => {
  const score = descriptiveScoreLevels({
    result: {definitionKey:'hh-resource-pulse'},
    section: {key:'resource.support',construct:'Available support',value:5,min:0,max:5,bandBasis:'descriptive'},
    model: {verified:true,bandBasis:'descriptive',bands:[],answerBands:[],reliableDirection:true,orientation:'resource'},
    locale:'en',
  })
  assert.ok(score)
  assert.equal(score.bands.length,5)
  assert.equal(score.bands.filter(row=>row.current).length,1)
  assert.match(score.current.label, /Consistently reported/)
  assert.match(score.current.note, /need not be available all the time/)
  assert.match(score.caveat, /not published norms/)
  const ru = descriptiveScoreLevels({
    result: {definitionKey:'hh-resource-pulse'},
    section: {key:'resource.support',construct:'Поддержка',value:5,min:0,max:5,bandBasis:'descriptive'},
    model: {verified:true,bandBasis:'descriptive',bands:[],answerBands:[],reliableDirection:true,orientation:'resource'},
    locale:'ru',
  })
  assert.match(ru.current.label, /Отмечается устойчиво/)
  assert.match(ru.current.note, /не означает/)
})

test('nonclinical editorial parts never invent category levels for mixed-polarity HH scales', () => {
  const model = {verified:true,bandBasis:'descriptive',bands:[],answerBands:[],reliableDirection:false,orientation:'neutral'}
  assert.equal(descriptiveScoreLevels({
    result:{definitionKey:'hh-original-incompatible-v1'},
    section:{key:'some.dimension',value:3,min:1,max:5,bandBasis:'descriptive'},
    model,locale:'en',
  }),null)
})
