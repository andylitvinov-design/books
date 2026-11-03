// Versioned, source-specific, *display-only* construct contract for the Reports portrait.
// Never guess a person's scale from catalog topics, a source title or a keyword regex.
// Every row pins the scored dimension AND its instrument/version. Original HH scales
// are subjective self-reflections; these mappings are not psychometric validation.
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { getAssessmentDefinition } from './definitions.js'

export const PORTRAIT_CONSTRUCT_VERSION = '2026-10-17.v2'

// [source key, scored dimension, portrait axis, presentation, preference, skill-option, maximum age]
// Presentation: directional=within-questionnaire position; descriptive=raw answer only;
// excluded=not a faithful indicator of the named portrait construct.
const SOURCE_ROWS = [
  ['hh-current-state','state.resource','resource','directional',4,true,14],
  ['hh-current-state','state.tension','anxiety','directional',5,true,14],
  ['hh-current-state','state.fatigue','energy','directional',5,false,14],
  ['hh-current-state','state.life_impact','functioning','directional',5,true,14],
  ['hh-current-state','state.problem_intensity',null,'excluded',99,false,14],
  ['hh-weekly-pulse','weekly.mood','mood','directional',1,false,28],
  ['hh-weekly-pulse','weekly.tension','anxiety','directional',1,true,28],
  ['hh-weekly-pulse','weekly.load','stress','directional',1,true,28],
  ['hh-weekly-pulse','weekly.recovery','sleep','directional',2,true,28],
  ['hh-weekly-pulse','weekly.energy','energy','directional',1,true,28],
  ['hh-weekly-pulse','weekly.clarity','clarity','directional',1,true,28],
  ['hh-weekly-pulse','weekly.connection','relationships','directional',3,false,28],
  ['hh-weekly-pulse','weekly.functioning','functioning','directional',1,true,28],
  ['hh-resource-pulse','resource.energy','energy','directional',2,false,14],
  ['hh-resource-pulse','resource.self_support','self_support','directional',1,true,14],
  ['hh-resource-pulse','resource.support','relationships','directional',2,false,14],
  ['hh-resource-pulse','resource.connection','relationships','directional',1,false,14],
  ['hh-resource-pulse','resource.agency',null,'excluded',99,false,14],
  ['hh-resource-pulse','resource.meaning','meaning','directional',1,false,14],
  ['hh-resource-pulse','resources.overall',null,'excluded',99,false,14],
  ['hh-monthly-profile','resources.monthly.self',null,'excluded',99,false,60],
  ['hh-monthly-profile','resources.monthly.relationships',null,'excluded',99,false,60],
  ['hh-monthly-profile','resources.monthly.body',null,'excluded',99,false,60],
  ['hh-monthly-profile','resources.monthly.work',null,'excluded',99,false,60],
  ['hh-monthly-profile','resources.monthly.meaning','meaning','directional',2,false,60],
  ['hh-monthly-profile','resources.monthly.support','relationships','directional',4,false,60],
  ['hh-monthly-profile','resources.monthly.overall',null,'excluded',99,false,60],
  ['hh-stress-weather','state.stress_weather.overall','stress','directional',2,true,14],
  ['hh-focus-mode','function.focus_mode.overall','focus','directional',1,true,14],
  ['hh-boundary-radar','resources.boundary_radar.overall','boundaries','directional',1,false,28],
  ['hh-sleep-reset','resources.sleep_reset.overall','sleep','directional',1,true,28],
  ['hh-body-signals','state.body_signals.overall','embodiment','directional',1,false,14],
  ['hh-emotion-clarity','resources.emotion_clarity.overall','emotional_regulation','directional',1,true,28],
  ['hh-inner-ally','resources.inner_ally.overall','self_support','directional',2,true,28],
  ['hh-closeness-compass','resources.closeness_compass.overall','intimacy','descriptive',2,false,28],
  ['hh-emotional-intimacy','resources.emotional_intimacy.pacing','intimacy','descriptive',1,false,60],
  ['hh-sexual-self-kindness','resources.sexual_self_kindness.choice','sexual_wellbeing','descriptive',1,false,60],
  ['hh-intimacy-consent','resources.intimacy_consent.agency','boundaries','descriptive',3,false,60],
  // Screeners describe symptoms or risk signals, not a general positive "ability" ray.
  ['phq-4','symptoms.phq4.total',null,'excluded',99,false,45],
  ['phq-4','symptoms.phq4.depression',null,'excluded',99,false,45],
  ['phq-4','symptoms.phq4.anxiety',null,'excluded',99,false,45],
  ['phq-9','symptoms.phq9.total',null,'excluded',99,false,45],
  ['gad-7','symptoms.gad7.total',null,'excluded',99,false,45],
  ['k6','symptoms.k6.total',null,'excluded',99,false,60],
  // ASRS shaded-response count is not an attention ability or severity percentage.
  ['asrs-6','symptoms.asrs6.shaded_count',null,'excluded',99,false,180],
]
// The repaired v2 inventories keep separate, source-verified constructs.
// The old v1 mixed totals remain readable but never become new goal targets.
// A one-item coping response is descriptive self-report only: practice options
// are voluntary, no clinical norms or cross-test growth score.
const SPLIT_V2_ROWS = [
  ['hh-money-pressure','state.money_pressure.difficulty','stress','directional',3,true,28],
  ['hh-money-pressure','resources.money_pressure.coping','resource','directional',5,true,28],
  ['hh-overthinking-loop','state.overthinking_loop.difficulty','anxiety','directional',3,true,14],
  ['hh-overthinking-loop','resources.overthinking_loop.interruptibility','anxiety','directional',6,true,14],
  ['hh-screen-saturation','state.screen_saturation.difficulty','focus','directional',3,true,14],
  ['hh-screen-saturation','context.screen_saturation.offline_relief',null,'excluded',99,false,14],
]
const makeSourceRule = (definitionVersion,[testKey,dimensionKey,axis,mode,priority,goalEligible,freshnessDays]) =>
  Object.freeze({testKey,definitionVersion,scoringVersion:'v1',dimensionKey,axis,mode,priority,goalEligible,freshnessDays})
// The active Current State is v2 (extra context, unchanged scoring). Historical
// v1 results stay readable, but only active v2 may be offered as a new test.
export const PORTRAIT_SOURCE_RULES = Object.freeze([
  ...SOURCE_ROWS.map(row=>makeSourceRule('v1',row)),
  ...SOURCE_ROWS.filter(([key])=>key==='hh-current-state').map(row=>makeSourceRule('v2',row)),
  ...SPLIT_V2_ROWS.map(row=>makeSourceRule('v2',row)),
])
const rules = new Map(PORTRAIT_SOURCE_RULES.map(row=>[row.testKey+'::'+row.definitionVersion+'::'+row.dimensionKey,row]))
export function portraitSourceRule(testKey, dimensionKey, version='v1') {
  return rules.get(testKey+'::'+version+'::'+dimensionKey) || null
}
// Only needed for the standalone geometry helper. Full portraits require an exact result.
export function uniquePortraitRuleForDimension(dimensionKey) {
  const hits = PORTRAIT_SOURCE_RULES.filter(rule=>rule.dimensionKey===dimensionKey)
  // V1 and V2 carry the same meaning for Current State. Return a representative
  // only if all pinned source identities agree on construct and presentation.
  return hits.length && hits.every(row=>row.testKey===hits[0].testKey &&
    row.axis===hits[0].axis && row.mode===hits[0].mode) ? hits[0] : null
}
const choicesCache = new Map()
const axisOrder = ['stress','anxiety','sleep','energy','embodiment','clarity','focus','functioning',
  'relationships','intimacy','boundaries','sexual_wellbeing','mood','emotional_regulation','resource','self_support','meaning']
function sourceIsRunnable(rule) {
  const catalog=MONITORING_CATALOG.find(item=>item.key===rule.testKey && item.version===rule.definitionVersion &&
    item.startable===true && item.rightsStatus==='cleared')
  if(!catalog) return false
  try {
    const def=getAssessmentDefinition(rule.testKey,rule.definitionVersion,catalog.instrumentLocale==='dynamic'?'en':catalog.instrumentLocale)
    if(def.scoringVersion!==rule.scoringVersion || def.scoringKey==='asrs-v1-6-classic') return false
    return def.scoring?.dimensions?.some(item=>item.key===rule.dimensionKey) ||
      ['raw-state','raw-dimensions'].includes(def.scoringKey) &&
      def.questions?.some(question=>question.id===rule.dimensionKey)
  }catch{return false}
}
export function portraitAxisChoices() {
  if(choicesCache.has('ready')) return choicesCache.get('ready')
  const choices=Object.fromEntries(axisOrder.map(axis=>{
    const available=PORTRAIT_SOURCE_RULES
      .filter(row=>row.axis===axis && row.mode!=='excluded' && sourceIsRunnable(row))
      .sort((a,b)=>a.priority-b.priority || b.definitionVersion.localeCompare(a.definitionVersion) || a.testKey.localeCompare(b.testKey))
    return [axis,available.length?Object.freeze({
      testKey:available[0].testKey, dimensionKey:available[0].dimensionKey,
      mode:available[0].mode, sourceVersion:available[0].definitionVersion,
    }):null]
  }))
  const ready=Object.freeze(choices)
  choicesCache.set('ready',ready)
  return ready
}
