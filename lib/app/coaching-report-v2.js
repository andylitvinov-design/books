import 'server-only'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { readPersonalCoaching, readPersonalCoachingInTransaction } from './personal-coaching.js'
import { transaction } from './database.js'
import { loadSchemeQuestions } from './personal-coaching-catalog.js'
import { PERSONAL_COACH_QUESTIONS } from '../personal-coaching/questions.js'
import { buildCoachingReportV2Draft } from '../personal-coaching/report-v2.js'

// Preview only: never accept session content, evidence, approval or report JSON
// from the caller. Persistence/import require separate consent and provenance.
export async function readCoachingReportDraft(config,actor,input,db=null){
  onlyKeys(input,['sessionId','revision','locale'])
  requireUUID(input.sessionId)
  if(!Number.isSafeInteger(input.revision)||input.revision<0)throw new AppError('PERSONAL_COACH_REVISION_REQUIRED',400)
  if(!['en','ru','es'].includes(input.locale))throw new AppError('COACHING_REPORT_LOCALE_INVALID',400)
  const saved=db?await readPersonalCoachingInTransaction(db,config,actor):await readPersonalCoaching(config,actor)
  if(saved.revision!==input.revision)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
  if(saved.course?.current?.status==='safety_hold')throw new AppError('PERSONAL_COACH_SAFETY_HOLD',409)
  const sessions=[saved.course?.current,...(saved.course?.history||[])].filter(item=>item?.id===input.sessionId)
  if(sessions.length>1)throw new AppError('COACHING_REPORT_SESSION_UNAVAILABLE',503)
  const session=sessions[0]
  if(!session||session.status!=='completed')throw new AppError('COACHING_REPORT_SESSION_NOT_FOUND',404)
  let questions=PERSONAL_COACH_QUESTIONS
  if(session.schemeKey){
    const scheme=db?await loadSchemeQuestions(db,session.schemeKey,{publishedOnly:true}):await transaction(config,actor,tx=>loadSchemeQuestions(tx,session.schemeKey,{publishedOnly:true}))
    if(!scheme||scheme.modelKey!==session.modelKey||!Array.isArray(scheme.questions)||!scheme.questions.length)
      throw new AppError('COACHING_REPORT_CATALOG_UNAVAILABLE',503)
    questions=scheme.questions
  }
  const result={report:buildCoachingReportV2Draft({session,questions,locale:input.locale,sourceRevision:saved.revision}),revision:saved.revision,updatedAt:saved.updatedAt}
  // Only the in-transaction server caller receives provenance metadata.
  if(db)result.sourceSession={id:session.id,schemeKey:session.schemeKey||null,modelKey:session.modelKey||null,startedAt:session.startedAt||null,completedAt:session.completedAt||null}
  return result
}
