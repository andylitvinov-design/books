import 'server-only'
import {verifyCoachMemoryTicket} from '../coaching/coach-staged-memory-ticket.mjs'
import {coachOpeningProgress} from '../coaching/coach-opening-protocol.mjs'
import {projectCoachPriorSessions,projectCoachSelectedContext,coachPriorRecapRole,coachPriorRecaps} from '../coaching/coach-staged-memory.mjs'
import {listMyCoachProtocols} from './personal-coaching.js'
import {formatCoachPreconsultation,coachReviewedFieldContext} from '../coaching/coach-preconsulting.mjs'
import {coachingGroqConfig} from '../coaching/groq-coach-provider.mjs'
import {clientMemoryEnabled,readClientMemoryConsentForAccount} from './client-memory-store.js'
import {createCoachContextLoader,readCoachEntrySources} from './coach-context-snapshot.js'

/**
 * Ordinary staged context waits for identity and continuity. The separate
 * pre-greeting grant authorizes reviewed history only, for its exact provider.
 * Validate the signed phase token on each distinct provider/model attempt;
 * OpenRouter fallback cannot inherit Groq or Gemini consent. Re-read source
 * revision/grants through the existing Context Cloud loader on every request.
 */
export function createStagedCoachModelContextLoader(config,actor,body,env=process.env){
  if(!config?.encryptionKey||!actor?.id)return undefined
  const staged=typeof body?.memoryStageToken==='string'&&body.memoryStageToken.length<=140
  const entry=typeof body?.memoryEntryStageToken==='string'&&body.memoryEntryStageToken.length<=140
  if(!staged&&!entry)return undefined
  const progress=coachOpeningProgress({locale:body.locale,personaId:body.personaId,
    turns:body.openingHistory,allowPrior:body.allowOpeningPrior===true,
    priorSession:body.openingPrior||null})
  const reachedContextStage=progress.checkmarks.invitation&&progress.checkmarks.name&&progress.checkmarks.continuity
  const explicitNew=progress.answers.continuity?.kind==='new'&&progress.answers.continuity.automatic!==true
  if(progress.declined||(!entry&&!reachedContextStage))return undefined
  const existingContext=staged&&reachedContextStage?createCoachContextLoader(config,actor,body,env):null
  return async (provider,input)=>{
    const stagedGrant=staged&&reachedContextStage&&verifyCoachMemoryTicket(body.memoryStageToken,{accountId:actor.id,
      provider,secret:config.encryptionKey,requirePrior:body.memorySharePrior===true})
    const entryConsent=entry&&!explicitNew&&clientMemoryEnabled(env)?await readClientMemoryConsentForAccount(config,actor):null
    const entryGrant=entryConsent?.memory_enabled===true&&verifyCoachMemoryTicket(body.memoryEntryStageToken,{accountId:actor.id,
      provider,secret:config.encryptionKey,requireEntry:true,consentRevision:entryConsent.revision,
      topicKey:body.memoryEntryTopic,contextSessionToken:body.memoryEntryContextSessionToken})
    const stagedPrior=stagedGrant&&body.memorySharePrior===true&&body.allowOpeningPrior===true&&progress.answers.continuity?.kind==='previous'
    if(!stagedGrant&&!entryGrant)return null
    const items=[]
    if(entryGrant||stagedPrior){
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
      const supplemental=[]
      // New field-level opt-in never authorizes another provider or Gemini Live.
      if(stagedGrant&&body.memoryShareReviewedFields===true&&progress.completed===true&&provider==='groq'&&coachingGroqConfig(env))
        supplemental.push(...coachReviewedFieldContext(reviewed.reviewedFields))
      const analysis=formatCoachPreconsultation(reviewed.preconsultation)
      if(analysis)supplemental.push({kind:'preconsulting',sourceKind:'reviewed_coaching_protocol',text:analysis})
      items.splice(Math.min(1,items.length),0,...supplemental)
    }
    if(stagedGrant&&(body.memoryShareGoals===true||body.memoryShareTests===true)&&existingContext){
      const approved=await existingContext(provider,input)
      const scoped=projectCoachSelectedContext(approved,{
        goals:body.memoryShareGoals===true,
        assessments:body.memoryShareTests===true&&body.contextTopic==='personal_growth',
      })
      items.push(...scoped.items)
    }
    if(entryGrant){
      const sources=body.memoryEntryTopic?await readCoachEntrySources(config,actor,provider,env,{
        topicKey:body.memoryEntryTopic,contextSessionToken:body.memoryEntryContextSessionToken,
      }):[]
      if((await readClientMemoryConsentForAccount(config,actor)).revision!==entryConsent.revision)return null
      items.splice(Math.min(1,items.length),0,...sources)
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
