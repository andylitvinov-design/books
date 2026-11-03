import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parse } from 'acorn'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { descriptiveScorePosition } from '../lib/assessments/descriptive-score-position.js'
import { traitReportCopy } from '../lib/assessments/trait-report-locales.js'
const identities=JSON.parse(fs.readFileSync(new URL('./fixtures/trait-meaning-identities.json',import.meta.url)))
function response(def,dim,position) {
  const spec=def.scoring?.dimensions.find(s=>s.key===dim.key)
  return Object.fromEntries(def.questions.map(q=>{
    const min=q.min??def.answerScale.min,max=q.max??def.answerScale.max
    const reversed=spec?spec.reverseItems?.includes(q.id):q.keyed==='-'
    const p=reversed?1-position:position
    return [q.id,Math.round(min+(max-min)*p)]
  }))
}

test('all 68 identities / 37 versions have distinct bilingual construct meanings and optional actions',()=>{
  assert.equal(identities.length,68)
  assert.equal(new Set(identities.map(x=>x.key)).size,37)
  const summaries={en:new Map(),ru:new Map()}
  for(const row of identities) {
    const def=getAssessmentDefinition(row.key,'v1','en')
    assert.equal(def.id,row.assessment_version_id)
    for(const locale of ['en','ru']) for(const position of [0,.5,1]) {
      const result=scoreAssessment(def,response(def,row.dimension,position))
      const dimension=result.dimensions.find(d=>d.key===row.dimension.key)
      const {value,...signature}=dimension
      assert.deepEqual(signature,row.dimension,'Frozen range/direction/source construct changed')
      if(position===0)assert.equal(value,dimension.min)
      if(position===1)assert.equal(value,dimension.max)
      const model=interpretationBandModel(result,dimension,locale)
      const copy=traitReportCopy(def,dimension,locale)
      assert.ok(copy)
      const positionText=def.key==='tipi-10'?' '+descriptiveScorePosition(dimension,locale,'trait-mean').text:''
      if (def.key === 'tipi-10') assert.equal(model.summary,copy.explanation+positionText)
      else {
        assert.ok(model.summary.endsWith(copy.explanation))
        assert.match(model.summary,locale==='ru'?/Ваш результат по шкале/:/Your score for/)
        assert.ok(model.summary.includes(String(value)))
        assert.equal(model.summary.split(copy.explanation).length,2)
      }
      assert.ok(model.meaning.includes(copy.explanation))
      assert.ok(model.actions[1].includes(copy.reflection))
      assert.ok(model.actions[0].includes(String(value)))
      assert.ok(model.meaning.includes(`${dimension.min}–${dimension.max}`))
      assert.equal(model.basis,'descriptive');assert.equal(model.code,'continuous')
      assert.equal(model.continuous,true);assert.equal(model.verified,true)
      assert.deepEqual(model.bands,[]);assert.equal(model.currentBand,null)
      assert.equal(model.recommendedReview,false)
      assert.equal(model.source,def.source.scoringUrl||def.source.url)
      assert.match(model.summary,/Holistic House/)
      if(locale==='ru')assert.match(model.meaning,/не является валидированной русской адаптацией/)
      assert.doesNotMatch(model.summary,/higher scores mean greater endorsement of the named tendency|большее соответствие описанной особенности/)
      const report=buildAssessmentResultReport(result,locale)
      const section=report.sections.find(s=>s.key===dimension.key)
      assert.equal(section.summary,model.summary)
      assert.equal(section.meaning,model.meaning)
      assert.deepEqual(section.steps.slice(0,model.actions.length),model.actions)
      summaries[locale].set(dimension.key,model.summary)
      const rejected=interpretationBandModel({...result,contentHash:'unverified'},dimension,locale)
      assert.equal(rejected.basis,'unavailable');assert.deepEqual(rejected.actions,[])
      assert.equal(traitReportCopy({...def,id:'future-version'},dimension,locale),null)
    }
  }
  for(const locale of ['en','ru']) {
    assert.equal(summaries[locale].size,44)
    assert.equal(new Set(summaries[locale].values()).size,44,'Every distinct construct has a distinct explanation')
  }
})

test('critical polarity and construct distinctions are explicit in both languages',()=>{
 const copy=(key,locale)=>{const row=identities.find(r=>r.dimension.key===key);return traitReportCopy(getAssessmentDefinition(row.key,'v1','en'),row.dimension,locale).explanation}
 assert.match(copy('trait.tipi.emotional_stability','en'),/Higher scores describe more calm/)
 assert.match(copy('trait.neuroticism','en'),/Higher scores describe more emotional ups and downs/)
 assert.match(copy('trait.tipi.emotional_stability','ru'),/Больший балл описывает больше спокойствия/)
 assert.match(copy('trait.neuroticism','ru'),/Больший балл описывает больше перепадов/)
 assert.match(copy('trait.bfas.withdrawal','en'),/not simply introversion/)
 assert.match(copy('trait.bfas.withdrawal','ru'),/не равна интроверсии/)
 assert.match(copy('trait.bfas.intellect','en'),/do not measure IQ/)
 assert.match(copy('trait.via.core.positivity','en'),/gratitude, forgiveness and accepting love/)
 assert.match(copy('trait.via.core.dependability','en'),/broader than punctuality/)
 assert.match(copy('trait.via.core.mastery','en'),/not an objective measure of competence/)
 assert.match(copy('trait.via.bravery','en'),/speaking up, not all forms/)
 assert.match(copy('trait.via.forgiveness','en'),/does not require reconciliation/)
 assert.match(copy('trait.via.spirituality','en'),/secular person/)
})

test('trait hook preserves exporter numeric substitution contract; no dynamic values in copy module',()=>{
 const source=fs.readFileSync(new URL('../lib/assessments/interpretation-context.js',import.meta.url),'utf8')
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});let count=0
 function walk(node){if(!node||typeof node!=='object')return;if(node.type==='TemplateLiteral')for(const e of node.expressions)if(source.slice(e.start,e.end)==='n(dimension.value)')count++;for(const v of Object.values(node))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(ast)
 assert.equal(count,8)
 const copy=fs.readFileSync(new URL('../lib/assessments/trait-report-locales.js',import.meta.url),'utf8')
 assert.doesNotMatch(copy,/dimension\.value|\{\{value\}\}/)
})
