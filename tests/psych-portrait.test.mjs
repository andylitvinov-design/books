import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildPsychPortrait, scorePortraitDimension } from '../lib/assessments/psych-portrait.js'
import { portraitAxisChoices, PORTRAIT_SOURCE_RULES, portraitSourceRule } from '../lib/assessments/portrait-constructs.js'
import { PORTRAIT_AXIS_ORDER } from '../lib/assessments/portrait-sectors.js'

const NOW = Date.parse('2026-10-17T20:00:00Z')
function saved(key, date, values={}, options={}) {
  const def=getAssessmentDefinition(key,options.version || 'v1',options.locale || 'en')
  const answers=Object.fromEntries(def.questions.map(q=>[q.id,values[q.id] ?? (q.min ?? def.answerScale?.min)]))
  return { ...scoreAssessment(def,answers), id:options.id || key+'-'+date,
    accountId:options.accountId || 'account-a', measurementAt:date }
}
const portrait = results => buildPsychPortrait(results,{now:NOW})

test('within-test direction remains numeric geometry, never a health or population percentile',()=>{
  assert.equal(scorePortraitDimension({key:'weekly.energy',value:8,min:0,max:10,direction:'higher-reported-energy'}).percent,80)
  assert.equal(scorePortraitDimension({key:'weekly.tension',value:8,min:0,max:10,direction:'lower-reported-tension'}).percent,20)
  assert.equal(scorePortraitDimension({key:'symptoms.gad7.total',value:7,min:0,max:21,direction:'non-normative'}),null)
  assert.equal(scorePortraitDimension({key:'symptoms.k6.total',value:7,min:0,max:24,direction:'non-normative'}),null)
  assert.equal(scorePortraitDimension({key:'trait.extraversion',value:15,min:4,max:20,direction:'non-normative'}),null)
  assert.equal(scorePortraitDimension({key:'weekly.energy',value:null,min:0,max:10,direction:'higher-reported-energy'}),null)
  assert.equal(scorePortraitDimension({key:'weekly.energy',value:22,min:0,max:10,direction:'higher-reported-energy'}),null)
})
test('all 17 portrait topics have a real rights-cleared questionnaire candidate or a truthful unavailable state',()=>{
  const choices=portraitAxisChoices()
  assert.deepEqual(Object.keys(choices),[...PORTRAIT_AXIS_ORDER])
  for(const axis of PORTRAIT_AXIS_ORDER) {
    const candidate=choices[axis]
    assert.ok(candidate,axis+' needs an explicitly scored, rights-cleared source')
    const rule=portraitSourceRule(candidate.testKey,candidate.dimensionKey,candidate.sourceVersion)
    assert.ok(rule && rule.axis===axis && rule.mode===candidate.mode,axis)
  }
  assert.equal(choices.intimacy.mode,'descriptive')
  assert.equal(choices.sexual_wellbeing.mode,'descriptive')
  assert.ok(PORTRAIT_SOURCE_RULES.every(item=>item.definitionVersion && item.dimensionKey))
})
test('real saved weekly answers produce typed scores with original numbers and source context',()=>{
  const earlier=saved('hh-weekly-pulse','2026-10-01T12:00:00Z',{'weekly.energy':3,'weekly.tension':8},{id:'earlier'})
  const later=saved('hh-weekly-pulse','2026-10-12T12:00:00Z',{'weekly.energy':7,'weekly.tension':3},{id:'later'})
  const value=portrait([later,earlier])
  assert.equal(value.axes.energy.percent,70)
  assert.equal(value.axes.energy.rawValue,7)
  assert.equal(value.axes.energy.resultId,'later')
  assert.equal(value.axes.energy.previousPercent,30)
  assert.equal(value.axes.energy.change,40)
  assert.equal(value.axes.anxiety.percent,70)
  assert.equal(value.axes.stress.percent,100)
  assert.ok(value.axes.energy.sourceTitle.includes('Holistic House'))
  assert.equal(value.axes.energy.dimensionKey,'weekly.energy')
  assert.equal(value.measuredCount,value.answeredCount)
})
test('reported tension and social support are consistently assigned without claiming inner self-support',()=>{
  const state=saved('hh-current-state','2026-10-15T12:00:00Z',{'state.tension':8},{id:'state'})
  const resource=saved('hh-resource-pulse','2026-10-15T12:00:00Z',{'resource.support':10,'resource.self_support':0},{id:'resources'})
  const value=portrait([state,resource])
  assert.equal(value.axes.anxiety.dimensionKey,'state.tension')
  assert.equal(value.axes.stress,null)
  assert.equal(scorePortraitDimension(resource.dimensions.find(d=>d.key==='resource.support'),resource).axis,'relationships')
  assert.equal(value.axes.relationships.dimensionKey,'resource.connection')
  assert.equal(value.axes.self_support.rawValue,0)
  assert.ok(value.axes.relationships.source.toLowerCase().includes('connection'))
})
test('dedicated sources fill focus, embodiment, boundaries and emotional awareness without inventing norms',()=>{
  const keys=['hh-focus-mode','hh-body-signals','hh-boundary-radar','hh-emotion-clarity']
  const results=keys.map((key,index)=>saved(key,'2026-10-16T12:00:00Z',{}, {id:'saved-'+index}))
  const view=portrait(results)
  for(const axis of ['focus','embodiment','boundaries','emotional_regulation']){
    assert.ok(view.axes[axis],axis)
    assert.equal(view.axes[axis].mode,'directional')
    assert.ok(Number.isFinite(view.axes[axis].rawValue))
    assert.ok(view.axes[axis].resultId)
  }
})
test('intimacy and sexual self-acceptance remain descriptive, even when all questions are answered',()=>{
  const results=[
    saved('hh-emotional-intimacy','2026-10-16T12:00:00Z',{}, {id:'intimacy'}),
    saved('hh-sexual-self-kindness','2026-10-16T12:00:00Z',{}, {id:'sexual'}),
  ]
  const view=portrait(results)
  assert.equal(view.axes.intimacy.mode,'descriptive')
  assert.equal(view.axes.intimacy.percent,null)
  assert.equal(view.axes.sexual_wellbeing.percent,null)
  assert.equal(view.axes.sexual_wellbeing.resultId,'sexual')
  assert.equal(view.measuredCount,0)
  assert.equal(view.descriptiveCount,2)
})
test('screening totals, mixed composites and altered provenance do not become general wellbeing rays',()=>{
  const results=[
    saved('phq-4','2026-10-16T12:00:00Z',{}, {id:'phq'}),
    saved('k6','2026-10-16T12:00:00Z',{}, {id:'k6'}),
    saved('hh-monthly-profile','2026-10-16T12:00:00Z',{}, {id:'month'}),
  ]
  const view=portrait(results)
  assert.equal(view.axes.mood,null)
  assert.equal(view.axes.stress,null)
  assert.equal(view.axes.energy,null) // Monthly "body" includes sleep and comfort.
  assert.equal(view.axes.self_support,null) // Monthly "self" is a mixed construct.
  const real=saved('hh-weekly-pulse','2026-10-16T12:00:00Z',{}, {id:'verified'})
  const falsified={...real,contentHash:'tampered'}
  assert.equal(portrait([falsified]).answeredCount,0)
  const changed={...real,dimensions:real.dimensions.map((d,i)=>i===0?{...d,direction:'non-normative'}:d)}
  assert.equal(portrait([changed]).answeredCount,0)
})
test('stale and future-dated results never appear as a current strength or trouble',()=>{
  const old=saved('hh-weekly-pulse','2026-08-01T12:00:00Z',{'weekly.energy':2},{id:'old'})
  const fresh=saved('hh-resource-pulse','2026-10-16T12:00:00Z',{'resource.energy':8},{id:'new'})
  const view=portrait([old])
  assert.equal(view.axes.energy,null)
  assert.equal(view.staleAxes.energy.resultId,'old')
  assert.equal(view.answeredCount,0)
  const newer=portrait([old,fresh])
  assert.equal(newer.axes.energy.resultId,'new')
  assert.equal(newer.staleAxes.energy,null)
  assert.equal(portrait([saved('hh-weekly-pulse','2026-10-20T12:00:00Z')]).answeredCount,0)
})
test('invalid latest instrument attempt cannot resurrect a misleading older score',()=>{
  const old=saved('hh-weekly-pulse','2026-10-10T12:00:00Z',{'weekly.energy':8},{id:'valid-earlier'})
  const invalid={...saved('hh-weekly-pulse','2026-10-16T12:00:00Z',{'weekly.energy':2},{id:'tampered-latest'}),contentHash:'wrong'}
  const view=portrait([old,invalid])
  assert.equal(view.axes.energy,null)
  assert.equal(view.staleAxes.energy,null)
  assert.equal(view.answeredCount,0)
})
test('active Current State v2 and older v1 are both valid, without rewriting either',()=>{
  const v2=saved('hh-current-state','2026-10-16T12:00:00Z',{'state.tension':8},{id:'v2-current',version:'v2'})
  const v1=saved('hh-current-state','2026-10-10T12:00:00Z',{'state.tension':2},{id:'v1-historical',version:'v1'})
  const view=portrait([v1,v2])
  assert.equal(view.axes.anxiety.definitionVersion,'v2')
  assert.equal(view.axes.anxiety.resultId,'v2-current')
  assert.equal(view.axes.anxiety.previousPercent,null) // Different pinned definition versions.
  assert.equal(portraitAxisChoices().resource.sourceVersion,'v2')
})
test('unrelated questionnaires are not joined as repeated measures or silently substituted for a fresher primary',()=>{
  const weekly=saved('hh-weekly-pulse','2026-10-12T12:00:00Z',{'weekly.energy':6},{id:'weekly'})
  const other=saved('hh-resource-pulse','2026-10-16T12:00:00Z',{'resource.energy':9},{id:'other'})
  const view=portrait([other,weekly])
  assert.equal(view.axes.energy.resultId,'weekly')
  assert.equal(view.axes.energy.previousPercent,null)
  assert.equal(view.axes.energy.change,null)
})
