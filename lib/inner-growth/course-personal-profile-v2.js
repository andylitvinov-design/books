// Pure display/choice DTO over already-authorised result evidence. A registry is
// server-owned editorial input, never client JSON. This does not activate a course.
import { getTestScaleGuide } from '../assessments/scale-guides.js'
import { personalCourseEvidenceFromResults } from './course-personal-evidence-v2.js'
import { personalCourseObjective, personalCourseScaleCatalog, personalCourseReferencesReady } from './course-personal-plan-v2.js'

const TOPICS = new Set(['energy_agency','inner_support','connection_boundaries','calm_regulation','emotional_flexibility','attention_clarity'])
const clone = value => structuredClone(value)
const fail = code => { throw new Error(code) }
const text = value => typeof value === 'string' && value.trim().length > 0
const exact = (a,b) => a && b && Object.keys(b).every(key => a[key] === b[key])
export function personalCourseProfileV2({ registry = null, focusTopicIds = [], ...input } = {}) {
  if (!Array.isArray(focusTopicIds) || new Set(focusTopicIds).size !== focusTopicIds.length || focusTopicIds.some(id => !TOPICS.has(id))) fail('INVALID_FOCUS_TOPICS')
  const evidence = personalCourseEvidenceFromResults(input), locale = evidence.uiLocale
  const mappings = registry?.status === 'reviewed' && Array.isArray(registry.mappings) ? registry.mappings : []
  const catalog = personalCourseScaleCatalog({ scales:evidence.scales,mappings })
  const reviews = registry?.reviewMapping
  const reviewsReady = reviews?.status === 'reviewed' && reviews.coversAllSelectedGoals === true &&
    reviews.curriculumVersion === personalCourseObjective(7,locale).curriculumVersion &&
    text(reviews.mappingVersion) && text(reviews.source) && personalCourseReferencesReady(reviews.practices,[7,14,21],locale)
  const practiceDays = Array.from({length:21},(_,i)=>i+1).filter(day=>day%7!==0)
  const rows = catalog.map((row,index) => {
    const scale=evidence.scales[index],guide=getTestScaleGuide(scale.identity.definitionKey,locale)
    const display=guide?.version === scale.identity.definitionVersion ? guide.scales.find(d=>d.key === scale.identity.dimensionKey) : null
    const mapping=mappings.find(item=>exact(item.identity,scale.identity))
    const contentReady=row.status === 'available' && personalCourseReferencesReady(mapping?.practices,practiceDays,locale) && reviewsReady
    return { id:row.scaleId,r3ScaleKey:scale.identity.definitionKey+'::'+scale.identity.dimensionKey,
      definitionId:scale.identity.definitionId,definitionKey:scale.identity.definitionKey,definitionVersion:scale.identity.definitionVersion,
      dimensionKey:scale.identity.dimensionKey,resultId:scale.resultId,identity:clone(scale.identity),
      label:display?.label || scale.sourceConstruct || scale.identity.dimensionKey,testTitle:guide?.title || scale.identity.definitionKey,
      value:scale.value,min:scale.min,max:scale.max,unit:scale.unit,timeframe:scale.timeframe,
      measurementAt:scale.measurementAt,instrumentLocale:scale.identity.instrumentLocale,
      direction:scale.direction,dimensionClass:scale.dimensionClass,referenceStatus:scale.referenceStatus,
      meaning:scale.interpretation.status === 'available' ? scale.interpretation.meaning : null,
      source:clone(scale.interpretation.sourceMetadata ?? null),interpretationStatus:scale.interpretation.status,
      interpretationVersion:row.interpretationVersion,interpretationContentHash:row.interpretationContentHash,
      rawPosition:row.rawPosition,supportPosition:row.supportPosition,coursePolarity:contentReady ? scale.direction : 'not-ranked',
      track:row.topicId,canChoosePractice:contentReady,practiceStatus:contentReady ? 'available' : 'unsupported',
      practiceReason:contentReady ? null : row.reason || (reviewsReady ? 'reviewed-objective-practice-unavailable' : 'review-material-unavailable'),
      mappingVersion:row.mappingVersion,mappingSource:mapping?.source ?? null,mappingLimitations:clone(row.mappingLimitations),
      mappingRationale:clone(row.mappingRationale),mappingSourceMetadata:clone(row.mappingSourceMetadata),familyReuse:clone(row.familyReuse),
      clinicalSeverityComparison:false,automaticDeficit:false }
  })
  const available=rows.filter(row=>row.canChoosePractice),suggested=[]
  // Focus fit and distinct-topic coverage, not a normalized score ordering.
  for (const topic of [...focusTopicIds,...new Set(available.map(row=>row.track))]) {
    const row=available.find(item=>item.track === topic)
    if(row&&!suggested.includes(row.id))suggested.push(row.id)
  }
  for(const row of available)if(!suggested.includes(row.id)&&suggested.length<7)suggested.push(row.id)
  return {version:'hh-personal-course-profile-v2',status:evidence.status!=='ready'?evidence.status:available.length?'ready-to-review':'no-practice-mapping',
    rows,missingDefinitionIds:evidence.missingDefinitionIds,minimumChoices:Math.min(3,available.length),maximumChoices:5,
    priorityScaleIds:suggested.slice(0,7),priorityLimit:7,priorityBasis:'confirmed-focus-then-distinct-topics-not-severity',
    clinicalSeverityComparison:false,healthPercentage:null,evidence,
    unsupportedCount:rows.length-available.length,availablePracticeCount:available.length,productionIntegrated:false}
}
