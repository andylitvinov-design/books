// Optional end-of-course measurement review. No retest schedule or causal inference.
import {getDefinitionById,provenance} from '../assessments/definitions.js'
import {MONITORING_CATALOG} from '../../data/assessments/catalog.js'
import {courseProfile,usableCourseResult} from './course-21-evidence.js'
import {courseInterpretationFromResult} from './course-interpretation-adapter.js'

export function courseReassessment21({state,ownerId,initialResults=[],latestResults=[],locale='en',now}={}){
 if(state?.journey?.status!=='finished')return null
 const finishedAt=state.journey.sessions?.[21]?.at
 if(!Number.isFinite(Date.parse(finishedAt)))throw Error('INVALID_COURSE_COMPLETION')
 const selected=state.source.selectedForms
 const initial=courseProfile({selection:{confirmed:true,selected},ownerId,results:initialResults,locale,now,
  interpretationFor:(r,lang)=>{
   const report=courseInterpretationFromResult(r,lang),expected=state.source.bindings.find(b=>b.resultId===r.id)?.interpretations?.[lang]
   return expected&&report?.revision===expected.revision&&report?.contentHash===expected.contentHash?report:null
  }})
 // A measurement made during the course is not described as an end-of-course repeat.
 const later=latestResults.filter(r=>usableCourseResult(r,ownerId,now)&&Date.parse(r.measurementAt)>Date.parse(finishedAt))
 const latest=courseProfile({selection:{confirmed:true,selected},ownerId,results:later,locale,now,interpretationFor:courseInterpretationFromResult})
 const forms=selected.map(form=>{
  const definition=getDefinitionById(form.definitionId),identity=provenance(definition)
  const original=initial.rows.filter(r=>r.definitionId===definition.id),after=latest.rows.filter(r=>r.definitionId===definition.id)
  const binding=state.source.bindings.find(b=>b.identity?.definitionId===definition.id)
  const exact=original.length>0&&original.every(r=>r.resultId===binding?.resultId)
  const meanings=exact&&after.length===original.length&&original.every(r=>r.meaning&&after.find(n=>n.dimensionKey===r.dimensionKey)?.meaning)
  const catalog=MONITORING_CATALOG.find(t=>t.key===definition.key)
  return {definitionId:definition.id,definitionKey:definition.key,definitionVersion:definition.version,instrumentLocale:definition.instrumentLocale,
   title:original[0]?.testTitle||after[0]?.testTitle||definition.key,identity,
   initialResultId:binding?.resultId??null,initialMeasurementAt:original[0]?.measurementAt??null,
   latestResultId:after[0]?.resultId??null,latestMeasurementAt:after[0]?.measurementAt??null,
   repeatAvailable:Boolean(exact&&catalog?.startable&&catalog.version===definition.version&&catalog.rightsStatus==='cleared'&&catalog.free!==false),
   status:!exact?'source-unavailable':!after.length?'not-repeated':meanings?'ready':'interpretations-unavailable',
   timeframes:[...new Set(original.map(r=>r.timeframeLabel||r.timeframe).filter(Boolean))],
   scales:original.map(r=>{const n=after.find(v=>v.dimensionKey===r.dimensionKey)
    return {key:r.dimensionKey,label:r.label,min:r.min,max:r.max,unit:r.unit,initialValue:r.value,latestValue:n?.value??null,
     change:meanings&&n?Math.round((n.value-r.value)*100)/100:null,initialMeaning:r.meaning,latestMeaning:n?.meaning??null,
     source:n?.source??r.source??null}
   })}
 })
 return {forms,finishedAt,automaticRetest:false,clinicalChangeAssessment:false,causalAttribution:false,missingIsZero:false}
}
