import 'server-only'
import {createHash} from 'node:crypto'
import {canonicalJSON} from '../assessments/contracts.js'
import {PERSONAL_COURSE_PILOT_CONTENT,PERSONAL_COURSE_PILOT_DRAFT_BUNDLE,PERSONAL_COURSE_PILOT_VERSION} from '../../data/inner-growth/course-personal-practices-v2.js'
import {PERSONAL_COURSE_MAPPING_EXTENSIONS} from '../../data/inner-growth/course-personal-mapping-extensions-v2.js'
import {PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT,PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS} from '../../data/inner-growth/course-personal-support-families-v2.js'
import {PERSONAL_LESSON_FRAMES,PERSONAL_LESSON_FRAME_VERSION} from '../../data/inner-growth/course-personal-lesson-frame-v2.js'

import {COURSE_GOAL_STATEMENTS_V1,COURSE_GOAL_STATEMENTS_VERSION,COURSE_GOAL_AGREEMENT_ANCHORS,COURSE_GOAL_OBSERVATION_COPY} from '../../data/inner-growth/course-goal-statements-v1.js'

export const PERSONAL_COURSE_REGISTRY_VERSION='hh-personal-two-pulse-registry-v2-2026-10-12'
// Set only after review of these exact bytes and the documented bounded scope.
// A request-body flag, current definition hash or generic source review cannot
// approve educational cards. Draft source modules remain preserved unchanged.
export const PERSONAL_COURSE_REGISTRY_APPROVAL=Object.freeze({
 status:'reviewed-original-educational',registryVersion:PERSONAL_COURSE_REGISTRY_VERSION,
 materialDigest:'47aa5ac960c61ab6c0c1100af159af8298be6fe8988f1d7f6b162f7fd085c740',
 reviewId:'hh-personal-v2-editorial-2026-10-12',reviewedAt:'2026-10-12T23:46:00Z',
 source:'Holistic House original educational material; bilingual editorial and source-fit review, 12 October 2026',
 evidence:'docs/inner-growth/personal-course-v2-scope.md',
 scope:'14 original pulse constructs; bilingual clarity, voluntary practice boundaries, exact mapping and wording fidelity',
 clinicalValidation:false,psychometricValidation:false,efficacyClaim:false,professionalCatalogCoverage:false,
})
const clone=value=>structuredClone(value)
const material={version:PERSONAL_COURSE_REGISTRY_VERSION,contentVersion:PERSONAL_COURSE_PILOT_VERSION,
 mappings:[...PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.mappings,...PERSONAL_COURSE_MAPPING_EXTENSIONS,...PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS],
 reviewMapping:PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.reviewMapping,
 cards:[...PERSONAL_COURSE_PILOT_CONTENT,...PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT],
 frameVersion:PERSONAL_LESSON_FRAME_VERSION,frames:PERSONAL_LESSON_FRAMES,goalStatements:COURSE_GOAL_STATEMENTS_V1,goalStatementsVersion:COURSE_GOAL_STATEMENTS_VERSION,goalAnchors:COURSE_GOAL_AGREEMENT_ANCHORS,goalCopy:COURSE_GOAL_OBSERVATION_COPY}
export const PERSONAL_COURSE_MATERIAL_DIGEST=createHash('sha256').update(canonicalJSON(material),'utf8').digest('hex')
export function personalCourseRegistryReviewSummary(){
 return {version:material.version,contentVersion:material.contentVersion,materialDigest:PERSONAL_COURSE_MATERIAL_DIGEST,
  exactFormCount:new Set(material.mappings.map(mapping=>mapping.identity.definitionId)).size,
  constructCount:new Set(material.mappings.map(mapping=>mapping.identity.definitionKey+'::'+mapping.identity.dimensionKey)).size,
  mappingCount:material.mappings.length,cardCount:material.cards.length,
  definitionKeys:[...new Set(material.mappings.map(mapping=>mapping.identity.definitionKey))],
  aggregateGoalIncluded:material.mappings.some(mapping=>mapping.identity.dimensionKey==='resources.overall'),
  clinicalValidation:false,professionalCatalogCoverage:false}
}
// Trusted server composition only. This export allows isolated review tests;
// no HTTP route accepts an approval object or calls it with client input.
export function reviewedPersonalCourseRegistry(approval){
 if(approval?.status!=='reviewed-original-educational'||approval.clinicalValidation!==false||approval.psychometricValidation!==false||approval.efficacyClaim!==false||approval.materialDigest!==PERSONAL_COURSE_MATERIAL_DIGEST||
  approval.registryVersion!==PERSONAL_COURSE_REGISTRY_VERSION||typeof approval.reviewId!=='string'||!approval.reviewId.trim()||
  typeof approval.source!=='string'||!approval.source.trim()||!Number.isFinite(Date.parse(approval.reviewedAt)))return null
 const mappings=clone(material.mappings),reviewMapping=clone(material.reviewMapping)
 for(const mapping of [...mappings,reviewMapping]){
  mapping.status='reviewed';mapping.editorialReview=clone(approval)
  for(const reference of mapping.practices)reference.reviewStatus='reviewed'
 }
 const cards=new Map(material.cards.map(card=>[card.practiceId+'\0'+card.contentVersion+'\0'+card.contentLocale,card]))
 if(cards.size!==material.cards.length)return null
 return {id:'hh-personal-two-pulse',version:material.version,contentVersion:material.contentVersion,
  status:'reviewed',source:approval.source,mappings,reviewMapping,editorialReview:clone(approval),
  goalStatements:clone(material.goalStatements),
  frameApproval:{version:material.frameVersion,status:'reviewed',source:approval.source},
  getContent({practiceId,contentVersion,contentLocale}={}){
   const card=cards.get(practiceId+'\0'+contentVersion+'\0'+contentLocale)
   return card?{...clone(card),source:approval.source,originalAuthorshipSource:card.source,reviewStatus:'reviewed',contentStatus:'REVIEWED',editorialReview:clone(approval),clinicalValidation:false,efficacyClaim:false}:null
  }}
}
const reviewed=reviewedPersonalCourseRegistry(PERSONAL_COURSE_REGISTRY_APPROVAL)
export function getReviewedPersonalCourseRegistry(){return reviewed}
