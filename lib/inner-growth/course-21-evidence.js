// Exact-result boundary for the21-day extension of accepted R3. No I/O or prose fallback.
import { getDefinitionById, validateProvenance, provenance } from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { getTestScaleGuide } from '../assessments/scale-guides.js'
import { goalForChosenScale } from './course-strategy.js'

import { COURSE_STRATEGY_VERSION } from './course-21-contract.js'
const SHAPE_FIELDS = ['key','min','max','unit','timeframe','direction','dimensionClass','sourceConstruct']
const SCREENING_ONLY = new Set(['phq-2','phq-4','phq-8','phq-9','phq-15','gad-2','gad-7','k6','k10','ces-d-20'])
const MIXED_KEYS = new Set(['hh-money-pressure','hh-overthinking-loop','hh-screen-saturation'])
// Historical v1 definitions omitted this direction. This course-only rule does not
// change scoring, cutoffs or immutable definition hashes. Verified 2026-10-12.
const MANUAL = 'https://case.edu/medicine/wellness-pathway/sites/default/files/2018-05/instructions.pdf'
const KESSLER = 'https://rckessler.scholars.harvard.edu/sites/g/files/omnuum8166/files/2026-03/Scoring_K6_K10.pdf'
const DIRECTION_RULES = Object.freeze({
  'phq-2': ['symptoms.phq2.total'], 'phq-4': ['symptoms.phq4.total','symptoms.phq4.depression','symptoms.phq4.anxiety'],
  'phq-9': ['symptoms.phq9.total'], 'gad-2': ['symptoms.gad2.total'], 'gad-7': ['symptoms.gad7.total'],
  k6: ['symptoms.k6.total'], k10: ['symptoms.k10.total'],
})
function reviewedDirection(dimension, key, version) {
  if(version==='v1'&&DIRECTION_RULES[key]?.includes(dimension.key))return {direction:'lower-reported-difficulty',source:key.startsWith('k')?KESSLER:MANUAL}
  return {direction:dimension.direction,source:null}
}
const samples = new Map()
const possibleValues = new Map()
function reachable(definition, dimension) {
  const key=definition.id+'/'+dimension.key
  if(definition.scoringKey==='bach-flower'){
    if(!possibleValues.has(key)){
      let states=new Set(['0:0'])
      const flags={situation:1,character:2,control:4},weights={situation:2,character:2,control:3}
      for(const question of definition.questions.filter(q=>q.remedy===dimension.sourceConstruct)){
        const next=new Set()
        for(const entry of states){const [total,mask]=entry.split(':').map(Number)
          for(let v=0;v<=5;v++)next.add((total+v*weights[question.section]+(v===4?2:v===5?4:0))+':'+(v?mask|flags[question.section]:mask))
        }
        states=next
      }
      possibleValues.set(key,new Set([...states].map(entry=>{const [total,mask]=entry.split(':').map(Number),count=[1,2,4].filter(f=>mask&f).length;return (total+(count===3?8:count===2?4:0)+(mask&4?3:0))/2})))
    }
    return possibleValues.get(key).has(dimension.value)
  }
  if(definition.scoringKey!=='configured')return Number.isInteger(dimension.value)
  if(!possibleValues.has(key)){
    const spec=definition.scoring.dimensions.find(s=>s.key===dimension.key)
    const questions=spec.items.map(id=>definition.questions.find(q=>q.id===id))
    const min=questions.reduce((n,q)=>n+(q.min??definition.answerScale.min),0)
    const max=questions.reduce((n,q)=>n+(q.max??definition.answerScale.max),0)
    const divisor=spec.method==='mean'?questions.length:1
    const values=new Set()
    for(let sum=min;sum<=max;sum++){
      const total=spec.method==='capped_sum'?Math.min(spec.cap,sum):spec.method==='healthy_days'?spec.cap-Math.min(spec.cap,sum):sum/divisor
      values.add(Math.round(total*(spec.multiplier??1)*100)/100)
    }
    possibleValues.set(key,values)
  }
  return possibleValues.get(key).has(dimension.value)
}
const fail = code => { throw new Error(code) }
const localeOf = value => {if(!['en','ru'].includes(value))fail('UNSUPPORTED_LOCALE');return value}
const milliseconds = value => {const t=Date.parse(value);if(!Number.isFinite(t))fail('INVALID_TIME');return t}
const uniqueStrings = values => Array.isArray(values) && values.every(x=>typeof x==='string') && new Set(values).size===values.length
const byDate = (a,b) => Date.parse(b.measurementAt)-Date.parse(a.measurementAt)||String(a.id).localeCompare(String(b.id))
function shape(definition) {
  if(!samples.has(definition.id))samples.set(definition.id,scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q.min??definition.answerScale.min]))).dimensions)
  return samples.get(definition.id)
}
// Registered aggregate identities supplement scalar attainability. This does not
// claim to recover questionnaire answers or validate arbitrary future scorers.
function aggregatesAgree(definition,dimensions){
  const values=Object.fromEntries(dimensions.map(d=>[d.key,d.value])),round=n=>Math.round(n*100)/100
  const equalSum=(total,parts)=>values[total]===parts.reduce((n,k)=>n+values[k],0)
  const equalMean=(total,parts,itemCount)=>values[total]===round(parts.reduce((n,k)=>n+Math.round(values[k]*itemCount),0)/(parts.length*itemCount))
  switch(definition.key){
    case 'phq-4':return equalSum('symptoms.phq4.total',['symptoms.phq4.depression','symptoms.phq4.anxiety'])
    case 'mhc-sf':return equalSum('resources.mhc_sf.total',['resources.mhc_sf.emotional','resources.mhc_sf.social','resources.mhc_sf.psychological'])
    case 'hh-resource-pulse':return equalMean('resources.overall',['resource.energy','resource.self_support','resource.support','resource.connection','resource.agency','resource.meaning'],1)
    case 'hh-monthly-profile':return equalMean('resources.monthly.overall',['resources.monthly.self','resources.monthly.relationships','resources.monthly.body','resources.monthly.work','resources.monthly.meaning','resources.monthly.support'],3)
    case 'mspss':return equalMean('resources.mspss.overall',['resources.mspss.significant_other','resources.mspss.family','resources.mspss.friends'],4)
    case 'compassion-scale':return equalMean('resources.cs.total',['resources.cs.kindness','resources.cs.common_humanity','resources.cs.mindfulness','resources.cs.indifference_reversed'],4)
    case 'cdc-hrqol-4':{
      const physical=values['symptoms.hrqol4.physically_unhealthy_days'],mental=values['symptoms.hrqol4.mentally_unhealthy_days'],unhealthy=Math.min(30,physical+mental)
      return values['symptoms.hrqol4.unhealthy_days_index']===unhealthy&&values['resources.hrqol4.healthy_days_index']===30-unhealthy&&
        (physical!==0||mental!==0||values['function.hrqol4.activity_limitation_days']===0)
    }
    default:return true
  }
}
// The repository must supply ONLY its already-authorised persisted result rows.
// Ownership is independently checked here; unfinished runs are not result rows.
export function usableCourseResult(result, ownerId, now) {
  try {
    if(!ownerId || result?.accountId!==ownerId || typeof result.id!=='string' || !result.id ||
      (result.status!==undefined&&result.status!=='completed') || milliseconds(result.measurementAt)>milliseconds(now))return false
    const definition=validateProvenance(result), expected=shape(definition)
    if(!Array.isArray(result.dimensions)||result.dimensions.length!==expected.length||new Set(result.dimensions.map(d=>d?.key)).size!==expected.length)return false
    return expected.every(d=>{
      const actual=result.dimensions.find(x=>x.key===d.key)
      return actual&&SHAPE_FIELDS.every(k=>actual[k]===d[k])&&Number.isFinite(actual.value)&&actual.value>=d.min&&actual.value<=d.max&&reachable(definition,actual)
    })&&aggregatesAgree(definition,result.dimensions)
  } catch { return false }
}

export function courseScalePosition(dimension,definitionKey,definitionVersion) {
  if(!dimension||!Number.isFinite(dimension.value)||!Number.isFinite(dimension.min)||!Number.isFinite(dimension.max)||dimension.max<=dimension.min||dimension.value<dimension.min||dimension.value>dimension.max)return {rawPosition:null,supportPosition:null,reason:'missing-or-invalid'}
  const rawPosition=(dimension.value-dimension.min)/(dimension.max-dimension.min)
  if(MIXED_KEYS.has(definitionKey))return {rawPosition,supportPosition:null,reason:'mixed-direction-composite'}
  const reviewed=reviewedDirection(dimension,definitionKey,definitionVersion)
  if(dimension.dimensionClass==='trait'||reviewed.direction==='non-normative')return {rawPosition,supportPosition:null,reason:'descriptive-not-deficit'}
  if(reviewed.direction?.startsWith('higher-reported-'))return {rawPosition,supportPosition:rawPosition,reason:'more-reported-resource'}
  if(reviewed.direction?.startsWith('lower-reported-'))return {rawPosition,supportPosition:1-rawPosition,reason:'less-reported-difficulty',directionSource:reviewed.source}
  return {rawPosition,supportPosition:null,reason:'no-reviewed-direction'}
}
export function courseProfile({selection,ownerId,results=[],locale='en',now,interpretationFor=()=>null}={}) {
  localeOf(locale);milliseconds(now)
  if(!selection?.confirmed)fail('TEST_SELECTION_NOT_CONFIRMED')
  const rows=[],missing=[]
  const usable=results.filter(r=>usableCourseResult(r,ownerId,now)).sort(byDate)
  for(const selected of selection.selected){
    const definition=getDefinitionById(selected.definitionId)
    if(selected.definitionKey!==definition.key||Object.entries(provenance(definition)).some(([k,v])=>selected.identity?.[k]!==v))fail('INVALID_SELECTION_IDENTITY')
    const result=usable.find(r=>r.definitionId===selected.definitionId)
    // A display-language change must never select another instrument form.
    const guide=getTestScaleGuide(selected.definitionKey,definition.instrumentLocale)
    const displayGuide=getTestScaleGuide(selected.definitionKey,locale)
    if(!result){missing.push(selected.definitionId);continue}
    const interpretation=interpretationFor(result,locale)
    // Adapter must use the reviewed, DB-origin report from PR388 after its release.
    const reportMatches=interpretation?.origin==='database'&&interpretation.status==='available'&&typeof interpretation.revision==='string'&&interpretation.revision.length>0&&/^[a-f0-9]{64}$/.test(interpretation.contentHash||'')&&interpretation.uiLocale===locale&&Object.entries(provenance(validateProvenance(result))).every(([k,v])=>interpretation.identity?.[k]===v)
    for(const d of result.dimensions){
      const meta=guide?.version===result.definitionVersion&&guide?.instrumentLanguage===result.instrumentLocale?guide.scales.find(s=>s.key===d.key&&s.min===d.min&&s.max===d.max):null,position=courseScalePosition(d,result.definitionKey,result.definitionVersion)
      const section=reportMatches?interpretation.sections?.find(s=>s.key===d.key&&s.value===d.value):null
      const displayMeta=displayGuide?.scales.find(s=>s.key===d.key&&s.min===d.min&&s.max===d.max)
      const track=meta&&meta.canChooseSkill&&!SCREENING_ONLY.has(result.definitionKey)&&!MIXED_KEYS.has(result.definitionKey)?goalForChosenScale(result.definitionKey+'::'+d.key,result.instrumentLocale):null
      const hasMeaning=Boolean(section&&typeof section.compact?.meaning==='string'&&section.compact.meaning.trim())
      rows.push({id:result.definitionId+'/'+d.key,resultId:result.id,definitionId:result.definitionId,definitionKey:result.definitionKey,
        definitionVersion:result.definitionVersion,testTitle:displayGuide?.title||guide?.title||result.definitionKey,
        dimensionKey:d.key,label:displayMeta?.label||meta?.label||d.sourceConstruct||d.key,axis:meta?.axis??null,track,
        value:d.value,min:d.min,max:d.max,unit:d.unit,timeframe:d.timeframe,timeframeLabel:displayMeta?.timeframe??meta?.timeframe??null,direction:d.direction,
        measurementAt:result.measurementAt,instrumentLocale:result.instrumentLocale,...position,
        coursePolarity:position.supportPosition===null?'not-ranked':reviewedDirection(d,result.definitionKey,result.definitionVersion).direction,
        referenceStatus:'norms-and-clinical-bands-not-used-for-ordering',
        meaning:hasMeaning?section.compact.meaning:null,source:hasMeaning?section.source??null:null,interpretationStatus:hasMeaning?'available':'unavailable',
        eligibleForPriority:Boolean(hasMeaning&&track&&position.supportPosition!==null),canChoosePractice:Boolean(hasMeaning&&track),
        comparisonBasis:'position-in-own-registered-range-not-clinical-comparability'})
    }
  }
  const priority=rows.filter(r=>r.eligibleForPriority).sort((a,b)=>a.supportPosition-b.supportPosition||a.id.localeCompare(b.id)).slice(0,7)
  return {version:COURSE_STRATEGY_VERSION,status:missing.length?'tests-remaining':rows.some(r=>r.interpretationStatus!=='available')?'interpretations-unavailable':!rows.some(r=>r.canChoosePractice)?'no-practice-mapping':'ready-to-review',rows,missingDefinitionIds:missing,
    priorityScaleIds:priority.map(r=>r.id),priorityLimit:7,clinicalSeverityComparison:false,healthPercentage:null,
    minimumChoices:Math.min(3,rows.filter(r=>r.canChoosePractice).length),maximumChoices:5}
}
export function chooseCourseScales(profile,ids,{consent=false}={}) {
  if(consent!==true)fail('CONSENT_REQUIRED')
  if(profile.status!=='ready-to-review')fail(profile.status==='interpretations-unavailable'?'INTERPRETATIONS_UNAVAILABLE':profile.status==='no-practice-mapping'?'NO_REVIEWED_PRACTICE_MAPPING':'TESTS_REMAINING')
  if(!uniqueStrings(ids)||!ids.length||ids.length<profile.minimumChoices||ids.length>5)fail('CHOOSE_THREE_TO_FIVE_WHEN_AVAILABLE')
  const rows=ids.map(id=>profile.rows.find(r=>r.id===id&&r.canChoosePractice)||fail('UNAVAILABLE_PRACTICE_SCALE'))
  return {version:COURSE_STRATEGY_VERSION,confirmed:true,durationDays:21,selectedScaleIds:[...ids],
    topics:rows.map(r=>({scaleId:r.id,resultId:r.resultId,track:r.track,definitionId:r.definitionId,dimensionKey:r.dimensionKey})),
    automaticDiagnosis:false,automaticTreatment:false}
}
