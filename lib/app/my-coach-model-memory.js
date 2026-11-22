import 'server-only'
import {verifyCoachMemoryTicket} from '../coaching/coach-staged-memory-ticket.mjs'
import {coachOpeningProgress} from '../coaching/coach-opening-protocol.mjs'
import {projectCoachPriorSessions,projectCoachSelectedContext} from '../coaching/coach-staged-memory.mjs'
import {listMyCoachProtocols} from './personal-coaching.js'
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
         provider,secret:config.encryptionKey}))return null
    const items=[]
    if(body.memorySharePrior===true&&body.allowOpeningPrior===true&&
       progress.answers.continuity?.kind==='previous'){
      // Never take the recap from openingPrior (browser-controlled metadata).
      const archive=await listMyCoachProtocols(config,actor)
      const reviewed=projectCoachPriorSessions(archive.protocols)
      const latest=reviewed.previous[0]
      if(latest?.provenance==='client_reviewed_dialogue'){
        const value=[latest.topic?.slice(0,65),latest.clientConclusions?.slice(0,110),
          latest.clientNextStep?.slice(0,60)].filter(Boolean).join(' · ')
        if(value)items.push({kind:'prior_session',sourceKind:'reviewed_coaching_protocol',text:value})
      }
    }
    if((body.memoryShareGoals===true||body.memoryShareTests===true)&&existingContext){
      const approved=await existingContext(provider,input)
      const scoped=projectCoachSelectedContext(approved,{
        goals:body.memoryShareGoals===true,
        assessments:body.memoryShareTests===true&&body.contextTopic==='personal_growth',
      })
      items.push(...scoped.items)
    }
    const selected=[]
    for(const row of items){
      if(selected.length>=6)break
      const candidate={version:2,purpose:'coaching_dialogue',items:[...selected,row]}
      if(Buffer.byteLength(JSON.stringify(candidate))<=1200)selected.push(row)
    }
    return {version:2,purpose:'coaching_dialogue',items:selected}
  }
}
