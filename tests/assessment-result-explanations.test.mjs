import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildFixtureReport as buildAssessmentResultReport } from './helpers/interpretation-fixture.mjs'
import { resultDimensionExplanation, resultExplanationSource } from '../lib/assessments/result-explanations.js'

const active = MONITORING_CATALOG.filter(item => item.startable && item.rightsStatus === 'cleared')
const versions = new Set(active.map(item => `${item.key}:${item.version}`))
const definitions = ASSESSMENT_DEFINITIONS.filter(def => versions.has(`${def.key}:${def.version}`))
const sample = (def, position = 0.5) => scoreAssessment(def, Object.fromEntries(def.questions.map(q => {
  const min = q.min ?? def.answerScale.min, max = q.max ?? def.answerScale.max
  return [q.id, Math.round(min + position * (max - min))]
})))
const current = (key, position = 0.5) => {
  const item = active.find(row => row.key === key)
  return sample(getAssessmentDefinition(key, item.version, item.instrumentLocale === 'dynamic' ? 'en' : item.instrumentLocale), position)
}
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('every active version and locale has substantive scale content, not just a range-third template', () => {
  const coverage = new Map()
  for (const def of definitions) for (const position of [0, 0.5, 1]) for (const locale of ['en','ru']) {
    const result = sample(def, position), report = buildAssessmentResultReport(result, locale)
    assert.equal(report.sections.length, result.dimensions.length, def.key)
    const seen = []
    for (const section of report.sections) {
      const bespoke = def.key === 'hh-bach-flower-profile' || ['mhc-sf','scs-sf','compassion-scale'].includes(def.key)
      assert.ok(section.explanation || bespoke, `${def.key}/${section.key} lacks instrument-specific content`)
      if (section.explanation) {
        assert.ok(section.explanation.construct.length > 75)
        assert.ok(section.explanation.calculation.includes(String(section.min)))
        assert.ok(section.explanation.calculation.includes(String(section.max)))
        assert.ok(section.explanation.provenance.includes(def.version))
        assert.ok(section.explanation.sourceReview.status)
        assert.ok(section.explanation.explanationOrigin.length > 40)
        assert.ok(section.explanation.recommendationNote.length > 40)
        assert.doesNotMatch(section.meaning, /part of (this|the).*scale|части шкалы/)
        if (!def.key.startsWith('hh-')) assert.ok(section.source, def.key)
      }
      assert.ok(section.steps.length >= 2)
      seen.push(def.key === 'hh-bach-flower-profile' ? section.construct : section.explanation?.construct || section.meaning)
    }
    assert.equal(new Set(seen).size, seen.length, `Different scales need different meanings: ${def.key}/${locale}`)
    coverage.set(def.key, report.sections.length)
  }
  assert.equal(coverage.size, active.length)
  assert.equal([...coverage.values()].reduce((a,b) => a+b, 0), 232)
})

test('CBI personal has original construct, exact mechanics, full anchors and a score-specific reading', () => {
  const result = current('cbi-personal')
  assert.equal(result.dimensions[0].value, 50)
  const section = buildAssessmentResultReport(result, 'en').sections[0]
  assert.match(section.meaning, /prolonged physical and psychological exhaustion/)
  assert.match(section.meaning, /Mean across 6 items: 50/)
  assert.match(section.meaning, /50 \(sometimes\)/)
  assert.match(section.meaning, /not a percentage of burnout/)
  assert.match(section.explanation.anchors, /0 = Never\/almost never; 25 = Seldom; 50 = Sometimes; 75 = Often; 100 = Always/)
  assert.match(section.explanation.completeness, /stricter than the original CBI rule/)
  assert.match(section.explanation.citation, /Borritz.*2006/)
  assert.equal(section.source, 'https://nfa.dk/media/a4wheblj/cbi-scales.pdf#page=1')
  assert.equal(section.bandBasis, 'descriptive')
  assert.equal(section.band, 'Mean response score')
  assert.equal(section.recommendedReview, false)
  assert.ok(section.steps.every(step => !/middle|upper|lower part/.test(step)))
  const ru = buildAssessmentResultReport(result, 'ru').sections[0]
  assert.match(ru.meaning, /физическое и психологическое истощение/)
  assert.match(ru.meaning, /50 \(иногда\)/)
  assert.match(ru.explanation.languageNote, /английский оригинал/)
})

test('CBI work/client never inherit the personal frequency reading or a made-up threshold', () => {
  const work = buildAssessmentResultReport(current('cbi-work'), 'en').sections[0]
  const client = buildAssessmentResultReport(current('cbi-client'), 'en').sections[0]
  assert.match(work.meaning, /7 items/)
  assert.match(work.meaning, /1 item\(s\) are reverse-scored/)
  assert.match(work.explanation.reading, /final item.*reversed/)
  assert.match(work.explanation.anchors, /To a very low degree/)
  for (const section of [work, client]) {
    assert.match(section.explanation.reading, /cannot be translated into one frequency/)
    assert.equal(section.bandBasis, 'descriptive')
    assert.doesNotMatch(section.explanation.reading, /lies between response points/)
    assert.equal(section.recommendedReview, false)
  }
  assert.match(client.meaning, /6 items/)
  assert.notDeepEqual(work.steps, client.steps)
})

test('sum, reversed, ordinal and day-count results retain their own meaning and calculation', () => {
  const cases = [
    ['phq-9','symptoms.phq9.total', /Sum across 9 items/, /safety item must be considered separately/],
    ['erq','resources.erq.suppression', /Mean across 4 items/, /outward display/],
    ['rses-10','resources.rses_10.total', /5 item\(s\) are reverse-scored/, /self-esteem/],
    ['tipi-10','trait.tipi.extraversion', /Mean across 2 items/, /social engagement/],
    ['cdc-hrqol-4','function.hrqol4.general_health', /direct response/, /ordered answer categories/],
    ['cdc-hrqol-4','resources.hrqol4.healthy_days_index', /30 minus/, /not a separate answer/],
  ]
  for (const [key, dimension, calculation, meaning] of cases) {
    const section = buildAssessmentResultReport(current(key), 'en').sections.find(s => s.key === dimension)
    assert.match(section.explanation.calculation, calculation, key)
    assert.match(section.meaning, meaning, key)
    assert.doesNotMatch(section.meaning, /matches the response point|lies between response points/, key)
  }
})

test('mixed original composites and misleading titles are explicitly explained without changing scoring', () => {
  for (const key of ['hh-money-pressure','hh-overthinking-loop','hh-screen-saturation']) {
    const result = current(key), before = JSON.stringify(result)
    const section = buildAssessmentResultReport(result, 'en').sections[0]
    assert.equal(section.explanation.mixed, true)
    assert.match(section.meaning, /without reversal/)
    assert.equal(JSON.stringify(result), before)
  }
  for (const key of ['hh-approval-pressure','hh-perfectionism-pressure','hh-energy-drains']) {
    const section = buildAssessmentResultReport(current(key), 'en').sections[0]
    assert.match(section.explanation.construct, /higher|Higher/)
    assert.match(section.explanation.construct, /do not|does not/)
  }
})

test('source status distinguishes original guidance, original HH items and incomplete source review', () => {
  assert.equal(resultExplanationSource('cbi-personal').status, 'original-guidance')
  assert.equal(resultExplanationSource('hh-inner-ally').status, 'original-hh-definition')
  assert.equal(resultExplanationSource('brcs').status, 'original-publication-abstract')
  assert.equal(resultExplanationSource('ces-d-20').status, 'original-publication-abstract')
  assert.match(buildAssessmentResultReport(current('brcs'), 'en').sections[0].explanation.explanationOrigin, /full original interpretation text has not been reviewed/)
})

test('new source explanations require exact version, language, hash and dimension range', () => {
  const result = current('cbi-personal'), dimension = result.dimensions[0]
  for (const patch of [{definitionVersion:'future'},{contentHash:'wrong'},{instrumentLocale:'ru'},{translationVersion:'changed'}]) {
    assert.equal(resultDimensionExplanation({...result,...patch}, dimension), null)
  }
  assert.equal(resultDimensionExplanation(result, {...dimension,max:200}), null)
  assert.equal(resultDimensionExplanation(result, {...dimension,key:'unknown'}), null)
  for (const value of [undefined, null, '50', NaN, Infinity, -1, 101]) assert.equal(resultDimensionExplanation(result, {...dimension,value}), null)
})

test('actual shared report places construct, mechanics, score reading and source outside closed details', () => {
  const ui = read('components/app/compact-assessment-report.jsx')
  const details = ui.indexOf('<details className={styles.details}>')
  for (const marker of ['data-scale-construct','data-score-calculation','data-score-reading','data-explanation-source','data-explanation-origin']) {
    assert.ok(ui.indexOf(marker) > 0 && ui.indexOf(marker) < details, marker)
  }
  assert.match(ui, /section\.explanation\?\.mixed/)
  assert.match(read('components/app/personal-result-report.jsx'), /<CompactAssessmentReport/)
  for (const path of ['components/app/app-workspace.jsx','components/app/cabinet-landing.jsx']) assert.match(read(path), /<PersonalResultReport result=/)
  assert.match(read('lib/profile/client-report.js'), /const interpretation = buildAssessmentResultReport/)
})


test('BRCS preserves the separate category reference and money pressure keeps financial context', () => {
  for (const locale of ['en', 'ru']) {
    const brcs = buildAssessmentResultReport(current('brcs'), locale).sections[0]
    assert.equal(brcs.explanation.sourceReview.status, 'original-publication-abstract')
    assert.equal(brcs.classificationSource, 'https://cih.jhu.edu/measurement/brief-resilient-coping-scale-brcs/')
    assert.ok(brcs.explanation.classificationNote.length > 100)
    const money = buildAssessmentResultReport(current('hh-money-pressure'), locale).sections[0]
    assert.doesNotMatch(money.steps.join(' ') + money.followUp, /work demands|workplace diagnosis|deadline|рабочие требования|рабочем месте/)
    assert.match(money.followUp, locale === 'en' ? /does not assess ability to pay/ : /не оценивает платёжеспособность/)
  }
  assert.match(buildAssessmentResultReport(current('rses-10')).sections[0].meaning, /Higher totals indicate greater reported global self-esteem/)
})


test('whole report rejects incompatible provenance and shape before any published or bespoke interpretation', () => {
  for (const key of ['phq-9', 'cbi-personal', 'scs-sf', 'compassion-scale', 'mhc-sf', 'hh-bach-flower-profile']) {
    const valid = current(key)
    const mutations = [
      {contentHash: 'wrong'}, {definitionVersion: 'v999'}, {instrumentLocale: 'unknown'},
      {translationVersion: 'wrong'}, {scoringKey: 'wrong'}, {scoringVersion: 'v999'}, {resultVersion: 'v999'},
      {definitionId: 'wrong'}, {timeframe: 'wrong'}, {dimensions: []},
      {dimensions: valid.dimensions.map((d,i) => i ? d : {...d, max: d.max + 1})},
      {dimensions: valid.dimensions.map((d,i) => i ? d : {...d, value: NaN})},
      {dimensions: valid.dimensions.map((d,i) => i ? d : {...d, direction: 'invented'})},
    ]
    for (const patch of mutations) for (const locale of ['en','ru']) {
      const report = buildAssessmentResultReport({...valid, ...patch}, locale)
      assert.equal(report.status, 'unavailable', key + JSON.stringify(patch))
      assert.deepEqual(report.sections, [])
      assert.equal(report.contextNote, null)
    }
  }
  const brcs = buildAssessmentResultReport(current('brcs')).sections[0]
  assert.match(brcs.meaning, /full original interpretation text has not been reviewed/)
  assert.match(brcs.meaning, /Johns Hopkins measurement page/)
  assert.ok(brcs.meaning.includes(brcs.classificationSource))
})


test('whole report rejects mathematically impossible numeric score increments', () => {
  for (const [key, value] of [['phq-9', 1.5], ['cbi-personal', 51], ['erq', 3.01], ['mini-ipip-20', 4.5]]) {
    const result = current(key)
    const report = buildAssessmentResultReport({...result, dimensions: result.dimensions.map((d,i) => i ? d : {...d,value})})
    assert.equal(report.status, 'unavailable', key)
    assert.deepEqual(report.sections, [])
  }
})
