import 'server-only'
import {verifyCoachMemoryTicket} from '../coaching/coach-staged-memory-ticket.mjs'
import {coachOpeningProgress} from '../coaching/coach-opening-protocol.mjs'
import {projectCoachPriorSessions,projectCoachSelectedContext,coachPriorRecapRole,coachPriorRecaps,packCoachDialogueContext} from '../coaching/coach-staged-memory.mjs'
import {listMyCoachProtocols} from './personal-coaching.js'
import {formatCoachPreconsultation} from '../coaching/coach-preconsulting.mjs'
import {readApprovedCoachReviewedFields} from './my-coach-reviewed-field-consent.js'
import {createCoachContextLoader} from './coach-context-snapshot.js'

/**
 * A saved context MUST NOT be loaded during invitation or before name/continuity.
 * Validate the signed phase token on each distinct provider/model attempt;
 * OpenRouter fallback cannot inherit Groq or Gemini consent. Re-read source
 * revision/grants through the existing Context Cloud loader on every request.
 */
export function createStagedCoachModelContextLoader(config,actor,body,env=process.env){
  if(!config?.encryptionKey||!actor?.id||typeof body?.memoryStageToken!=='string'||
     body.memoryStageToken.length>140)return undefined
  const progress=coachOpeningProgress({locale:body.locale,personaId:body.personaId,
    turns:body.openingHistory,allowPrior:body.allowOpeningPrior===true,
    priorSession:body.openingPrior||null})
  if(!progress.checkmarks.invitation||!progress.checkmarks.name||
     !progress.checkmarks.continuity||progress.declined)return undefined
  const existingContext=createCoachContextLoader(config,actor,body,env)
  return async (provider,input)=>{
    if(!verifyCoachMemoryTicket(body.memoryStageToken,{accountId:actor.id,
         provider,secret:config.encryptionKey,
         requirePrior:body.memorySharePrior===true}))return null
    const items=[]
    let reviewedProjection=null
    if(body.memorySharePrior===true&&body.allowOpeningPrior===true&&
       progress.answers.continuity?.kind==='previous'){
      // Never take the recap from openingPrior (browser-controlled metadata).
      const archive=await listMyCoachProtocols(config,actor,{includeFoundation:true})
      const reviewed=projectCoachPriorSessions(archive.protocols,'',archive.foundation)
      const recaps=coachPriorRecaps(reviewed)
      for(const recap of recaps){
        const content=[recap.topic?.slice(0,55),recap.clientConclusions?.slice(0,90),
          recap.clientNextStep?.slice(0,45)].filter(Boolean).join(' · ')
        if(content)items.push({kind:'prior_session',sourceKind:'reviewed_coaching_protocol',
          text:[coachPriorRecapRole(reviewed,recap),recap.date,content].filter(Boolean).join(' · ').slice(0,240)})
      }
      if(body.memoryShareReviewedFields===true&&progress.completed===true&&provider==='groq'&&input?.voiceTurn!==true)
        reviewedProjection=reviewed.reviewedFields
      const analysis=formatCoachPreconsultation(reviewed.preconsultation)
      if(analysis)items.splice(Math.min(1,items.length),0,
        {kind:'preconsulting',sourceKind:'reviewed_coaching_protocol',text:analysis})
    }
    if((body.memoryShareGoals===true||body.memoryShareTests===true)&&existingContext){
      const approved=await existingContext(provider,input)
      const scoped=projectCoachSelectedContext(approved,{
        goals:body.memoryShareGoals===true,
        assessments:body.memoryShareTests===true&&body.contextTopic==='personal_growth',
      })
      items.push(...scoped.items)
    }
    if(reviewedProjection){
      const fields=await readApprovedCoachReviewedFields(config,actor,{
        contextSessionToken:body.contextSessionToken,stageToken:body.memoryStageToken,projection:reviewedProjection,
      },env)
      items.splice(Math.min(1,items.length),0,...fields)
    }
    return packCoachDialogueContext(items)
  }
}
