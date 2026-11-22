import 'server-only'
import {allowsCoachContextForAct,withCoachContext} from '../coaching/context-cloud-messages.mjs'
import {createCoachContextLoader} from './coach-context-snapshot.js'
import {resolveWisdomRequest} from './coaching-wisdom.js'
import {createHash} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {readPersonalCoaching} from './personal-coaching.js'
import {coachingModelConfig, verifiedFreeReply} from '../agent-director/commander-owned-runtime.mjs'
import {coachingGroqConfig, verifiedGroqCoachingReply} from '../coaching/groq-coach-provider.mjs'
import {verifiedGroqCoachingStream} from '../coaching/groq-coach-stream.mjs'
import {coachLooksLikeProtocolText,coachReviewableStreamReply} from '../coaching/coach-stream-format.mjs'
import {approveCoachEarlySentence} from '../coaching/coach-early-speech.mjs'
import {geminiCoachTextConfig,verifiedGeminiCoachingReply} from '../coaching/gemini-coach-text.mjs'
import {normalizeGenerativeCoachInput} from '../coaching/generative-persona.mjs'
import {conversationalCoachMessages,parseConversationalCoachReply} from '../coaching/conversational-persona.mjs'
import {coachSessionDirective,enforceCoachSessionDirective,directedCoachOfflineReply} from '../coaching/coach-session-director.mjs'
import {coachSessionProgress} from '../coaching/coach-session-progress.mjs'
import {COACH_OPENING_VERSION,coachOpeningSnapshot,coachOpeningResponse} from '../coaching/coach-opening-protocol.mjs'
import {listMyCoachProtocols} from './personal-coaching.js'
import {transaction} from './database.js'
import {
  normalizeCoachingBrainInput, coachingBrainSafety, classifyCoachingResistance,
  coachingBrainBoundary, selectCoachingBrainMethod, coachingBrainStage,
  coachingBrainMessages, parseCoachingBrainReply, offlineCoachingBrainReply,
  normalizeCoachingBrainProbeInput, isCoachingBrainProbeReply,
} from '../personal-coaching/coaching-brain.mjs'



/**
 * Stage-lock only for clients using the new opening contract. Legacy clients
 * retain their old protocol until upgraded; no extra model charge is needed.
 * History is read from the account-encrypted archive ONLY after an explicit
 * opt-in in the current conversation, never because an account has records.
 */
async function coachOpeningForTurn(input,persona,config,actor){
  if(!Array.isArray(input.openingAnswers))return null
  let prior=null
  if(input.reuseHistory===true&&config&&actor){
    try{
      const archive=await listMyCoachProtocols(config,actor)
      const recent=archive?.protocols?.find(p=>p?.opening?.name||p?.goal)
      if(recent)prior={consent:true,name:recent.opening?.name||'',
        topic:recent.opening?.topic||recent.goal||''}
    }catch{/* No unverified history and no implied consent on failure. */}
  }
  const before=coachOpeningSnapshot({answers:input.openingAnswers,prior,locale:input.locale})
  if(before.complete)return null
  const after=coachOpeningSnapshot({answers:input.openingAnswers,
    latest:input.message,prior,locale:input.locale})
  let question=null
  if(config&&actor&&!after.complete&&after.last?.result!=='declined'){
    try{
      const index=Math.min(4,Math.max(1,(after.attempts[after.step]||0)+1))
      const row=await transaction(config,actor,async db=>(await db.query(
        'select prompt_i18n from app_private.coach_opening_questions_v1 where persona_id=$1 and step_key=$2 and variant=$3 and enabled=true',
        [persona.personaId,after.step,index])).rows[0])
      question=row?.prompt_i18n?.[input.locale]||null
    }catch{/* Keep the approved first-party fallback question. */}
  }
  const script=coachOpeningResponse({before,after,locale:input.locale,question})
  return {
    version:COACH_OPENING_VERSION,mode:'opening',method:'opening',stage:'opening',
    reflection:script.reflection,question:script.question,hypothesis:'',
    planSuggestion:'',evidenceQuote:'',openingProgress:after,
    // No AI inference label: these are original curated coaching prompts.
  }
}

function coachingProviders(env, personaMode=false) {
  // Groq is enabled only for persona My Coach: Personal Coaching retains its
  // separate previously consented OpenRouter provider and contract.
  const groq=personaMode?coachingGroqConfig(env):null
  const openrouter=coachingModelConfig(env)
  return [groq,openrouter].filter(Boolean)
}

async function coachingProviderReply(provider,messages,fetcher,signal,{probe=false,voiceMode=false}={}) {
  if(provider.provider==='groq')
    return verifiedGroqCoachingReply(provider,{messages,probe,voiceMode},fetcher,signal)
  if(provider.provider==='gemini_free'||provider.provider==='gemini_paid')
    return verifiedGeminiCoachingReply(provider,{messages},fetcher,signal)
  return verifiedFreeReply(provider,{messages,privacyMode:'zdr'},fetcher,signal)
}

function coachingProviderFailure(error) {
  return {
    GEMINI_COACH_RATE_LIMIT:'rate_limited',
    GEMINI_COACH_AUTH_FAILURE:'server_not_configured',
    GEMINI_COACH_RESPONSE_INVALID:'response_unverified',
    GEMINI_COACH_REQUEST_INVALID:'response_unverified',
    GROQ_COACH_RATE_LIMIT:'rate_limited',
    GROQ_COACH_AUTH_FAILURE:'server_not_configured',
    GROQ_COACH_RESPONSE_INVALID:'response_unverified',
    GROQ_COACH_REQUEST_INVALID:'response_unverified',
    OWNED_MODEL_NO_VERIFIED_ZDR_FREE_MODELS:'privacy_model_unavailable',
    OWNED_MODEL_NOT_FREE_IN_CATALOG:'privacy_model_unavailable',
    OWNED_MODEL_FREE_RATE_LIMIT:'rate_limited',
    RATE_LIMITED:'rate_limited',
    OWNED_MODEL_OPENROUTER_KEY_REJECTED:'server_not_configured',
    OWNED_MODEL_COST_UNVERIFIED:'cost_unverified',
    OWNED_MODEL_BILLABLE_RESPONSE_HOLD:'cost_unverified',
    OWNED_MODEL_PRIVACY_POLICY_INVALID:'privacy_model_unavailable',
    COACHING_BRAIN_RESPONSE_INVALID:'response_unverified',
  }[error?.message]||'model_unavailable'
}

// Uses the EXISTING authenticated app and account, and verified no-charge
// inference gateways. No transcripts or AI responses are persisted.
export async function personalCoachingBrainTurn(config,actor,body,{
  env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall,
}={}){
  let input
  try { input=normalizeCoachingBrainInput(body) }
  catch(error){
    throw new AppError(error?.message==='COACHING_BRAIN_SENSITIVE_CONTENT'
      ?'COACHING_BRAIN_SENSITIVE_CONTENT':'COACHING_BRAIN_INPUT_INVALID',400)
  }
  const current=(await readPersonalCoaching(config,actor))?.course?.current
  if(!current||current.id!==input.sessionId)
    throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
  if(current.status!=='active')
    throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
  return runCoachingBrainTurn(input,{env,fetcher,signal,reserveModelCall,
    wisdomLookup:()=>resolveWisdomRequest(config,actor,input)})
}

/**
 * Optional streaming transport for the SAME My Coach route, persona, consent,
 * evidence-led Director and privacy-gated FREE Groq account. One model call.
 * Deltas are provisional. Only a complete phrase separately rechecked by
 * the SAME existing parser and Director may reach early TTS; evidence and
 * stage progress still require final full-turn validation.
 * The canonical strict-JSON /turn endpoint is unchanged.
 */
export async function myCoachGenerativeStreamTurn(body,{
  env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall,config,actor,
  loadApprovedContext=createCoachContextLoader(config,actor,body,env)
}={}){
  let normalized
  try{normalized=normalizeGenerativeCoachInput(body)}
  catch(error){throw new AppError(error?.message==='COACHING_BRAIN_SENSITIVE_CONTENT'
    ?'COACHING_BRAIN_SENSITIVE_CONTENT':'COACHING_BRAIN_INPUT_INVALID',400)}
  const {input,persona}=normalized
  const reason=classifyCoachingResistance(input)
  const safety=coachingBrainSafety(input)||coachingBrainBoundary(input,reason)
  const directive=coachSessionDirective(input,persona)
  const progress=coachSessionProgress(directive)
  const offline=why=>({...directedCoachOfflineReply(input,directive,why),
    sessionProgress:progress,personaId:persona.personaId})
  const personaResult=value=>({...value,personaId:persona.personaId})
  const frame=value=>'data: '+JSON.stringify(value)+'\n\n'
  const standalone=value=>new ReadableStream({start(controller){
    controller.enqueue(new TextEncoder().encode(frame({type:'result',result:personaResult(value)})))
    controller.close()
  }})
  if(safety)return standalone(safety)
  const opening=await coachOpeningForTurn(input,persona,config,actor)
  if(opening)return standalone(opening)
  if(config&&actor){
    const wisdom=await resolveWisdomRequest(config,actor,input)
    if(wisdom)return standalone(wisdom)
  }
  if(env.HH_COACHING_BRAIN_ENABLED!=='true')return standalone(offline('feature_disabled'))
  const provider=coachingGroqConfig(env)
  if(!provider)return standalone(offline('server_not_configured'))
  const messages=conversationalCoachMessages(input,persona,directive.methodId,directive.stage,reason)
  let provisional='',approvedSpokenPrefix='',streamPreviewMode='pending',previewStarted=false
  const encoder=new TextEncoder()
  const deadline=AbortSignal.timeout(18000)
  const boundedSignal=signal?AbortSignal.any([signal,deadline]):deadline
  return new ReadableStream({
    async start(controller){
      const send=value=>{
        if(boundedSignal.aborted)return
        try{controller.enqueue(encoder.encode(frame(value)))}catch{}
      }
      try{
        if(typeof reserveModelCall==='function')await reserveModelCall()
        const providerMessages=await approvedCoachMessages(messages,provider,input,directive,loadApprovedContext)
        if(boundedSignal.aborted)return
        const reply=await verifiedGroqCoachingStream(provider,{
          messages:providerMessages,voiceMode:input.voiceTurn===true
        },delta=>{
          // Groq can return a legacy JSON object even when instructed to
          // speak naturally. Never stream those fields to a client or TTS.
          provisional+=delta
          if(streamPreviewMode==='pending'&&provisional.trim())
            streamPreviewMode=coachLooksLikeProtocolText(provisional)?'structured':'natural'
          if(streamPreviewMode!=='natural')return
          send({type:'delta',value:previewStarted?delta:provisional})
          previewStarted=true
          if(input.voiceTurn!==true||approvedSpokenPrefix)return
          const approved=approveCoachEarlySentence({
            draft:provisional,input,directive,
            parseReply:parseConversationalCoachReply,
            enforceDirective:enforceCoachSessionDirective
          })
          if(approved){
            approvedSpokenPrefix=approved
            send({type:'approved_phrase',value:approved})
          }
        },fetcher,boundedSignal)
        if(boundedSignal.aborted)return
        // Never trust a streaming delta as evidence: the final plain-text
        // answer is passed through the EXISTING JSON parser and Director gate.
        const reviewed=parseConversationalCoachReply(
          coachReviewableStreamReply(reply.text),input,directive.methodId,directive.stage)
        const checked=enforceCoachSessionDirective(reviewed,directive)
        const trustedPrefix=approvedSpokenPrefix&&String(checked.message||'').startsWith(approvedSpokenPrefix)
          ?approvedSpokenPrefix:''
        send({type:'result',result:personaResult({...checked,sessionProgress:progress,
          approvedSpokenPrefix:trustedPrefix,
          inference:{provider:'groq',model:reply.model,reasoningEffort:reply.reasoningEffort}})})
      }catch(error){
        if(!boundedSignal.aborted)send({type:'result',result:offline(coachingProviderFailure(error))})
      }finally{try{controller.close()}catch{}}
    },
  })
}

// The primary My Coach dialogue has no saved Personal Coaching session and
// requires a separately authenticated, account-rate-limited server route.
// Persona settings are allowlisted editorial policies, never client prompts.
export async function myCoachGenerativeTurn(body,{env=process.env,fetcher=globalThis.fetch,
  signal,reserveModelCall,config,actor,
  loadApprovedContext=createCoachContextLoader(config,actor,body,env)}={}) {
  let parsed
  try { parsed=normalizeGenerativeCoachInput(body) }
  catch(error) {
    throw new AppError(error?.message==='COACHING_BRAIN_SENSITIVE_CONTENT'
      ?'COACHING_BRAIN_SENSITIVE_CONTENT':'COACHING_BRAIN_INPUT_INVALID',400)
  }
  const boundary=coachingBrainSafety(parsed.input)||
    coachingBrainBoundary(parsed.input,classifyCoachingResistance(parsed.input))
  const opening=boundary?null:await coachOpeningForTurn(parsed.input,parsed.persona,config,actor)
  if(opening)return {...opening,personaId:parsed.persona.personaId}
  const result=await runCoachingBrainTurn(parsed.input,{env,fetcher,signal,reserveModelCall,
    engine:body.engine||null,loadApprovedContext,
    wisdomLookup:config&&actor?()=>resolveWisdomRequest(config,actor,parsed.input):null},parsed.persona)
  return {...result,personaId:parsed.persona.personaId}
}

async function approvedCoachMessages(messages,provider,input,directive,loadApprovedContext) {
  if (typeof loadApprovedContext !== 'function' ||
      !allowsCoachContextForAct(directive?.conversationAct)) return messages
  try {
    return withCoachContext(messages, await loadApprovedContext(provider.provider,input))
  } catch {
    return messages
  }
}

async function runCoachingBrainTurn(input,{env,fetcher,signal,reserveModelCall,wisdomLookup,engine=null,loadApprovedContext},persona=null) {
  const interruption=coachingBrainSafety(input)
  if(interruption)return interruption
  const resistance=classifyCoachingResistance(input)
  const boundary=coachingBrainBoundary(input,resistance)
  if(boundary)return boundary
  // A wisdom request must be explicit. Safety and stop/skip boundaries win.
  // Retrieval never sends user messages to a provider and consumes no model credit.
  if(typeof wisdomLookup==='function'){
    const wisdom=await wisdomLookup()
    if(wisdom)return wisdom
  }
  const directive=persona?coachSessionDirective(input,persona):null
  const method=directive?.methodId||selectCoachingBrainMethod(input)
  const stage=directive?.stage||coachingBrainStage(input)
  const sessionProgress=directive?coachSessionProgress(directive):null
  // A separate explicit coaching gate prevents Agent Director enabling from
  // silently transmitting any client coaching text to its model provider.
  // Do not transmit personal coaching text unless the independent owner gate
  // and the existing free-only gateway are both configured.
  // Provider-free turns follow the SAME server-owned move as model turns.
  const offline=reason=>directive
    ? {...directedCoachOfflineReply(input,directive,reason),sessionProgress}
    : {...offlineCoachingBrainReply(input,method,stage,resistance),offlineReason:reason}
  if(env.HH_COACHING_BRAIN_ENABLED!=='true')return offline('feature_disabled')
  const providers=engine?[geminiCoachTextConfig(env,engine)].filter(Boolean):
    coachingProviders(env,Boolean(persona))
  if(!providers.length)return offline('server_not_configured')
  const timeout=AbortSignal.timeout(18000)
  const boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout
  // Both providers receive the SAME reviewed method/persona instructions;
  // no client-controlled model selection or duplicate client database.
  const messages=persona
    ? conversationalCoachMessages(input,persona,method,stage,resistance)
    : coachingBrainMessages(input,method,stage,resistance)
  let lastError=null
  for(const provider of providers){
    let attemptedWithContext=false
    try {
      // Existing shared DB-backed budget charges every actual provider call.
      if(typeof reserveModelCall==='function')await reserveModelCall()
      const providerMessages=persona
        ? await approvedCoachMessages(messages,provider,input,directive,loadApprovedContext)
        : messages
      boundedSignal.throwIfAborted()
      attemptedWithContext=providerMessages!==messages
      const reply=await coachingProviderReply(provider,providerMessages,fetcher,boundedSignal,{voiceMode:persona!==null&&input.voiceTurn===true})
      const parsed=persona
        ? parseConversationalCoachReply(
            provider.provider==='groq'?coachReviewableStreamReply(reply.text):reply.text,
            input,method,stage)
        : parseCoachingBrainReply(reply.text,input,method,stage)
      if(!persona)return parsed
      const checked=enforceCoachSessionDirective(parsed,directive)
      // Per-turn provenance appears only after the Director accepts the output.
      // A synthetic probe is never proof of the provider that answered this turn.
      return {...checked,sessionProgress,inference:{provider:provider.provider,model:reply.model,
        ...(provider.provider==='groq'?{reasoningEffort:reply.reasoningEffort}:{})}}
    }catch(error){
      // No private content, provider errors or keys appear in logs/responses.
      // The second provider is only the explicitly consented FREE ZDR fallback.
      lastError=error
      // A turn that attempted a private-context request stays with that provider.
      if(attemptedWithContext)break
      if(error?.message==='RATE_LIMITED')break
      // Invalid AI output must not trigger a second provider call.
      if(persona&&error?.message==='COACHING_BRAIN_RESPONSE_INVALID')break
    }
  }
  // Existing authored coaching question remains safe when both clouds fail.
  return offline(coachingProviderFailure(lastError))
}

 
// A short-lived best-effort cache saves the daily quota from repeated opens.
// Keyed by a one-way credential fingerprint, never by a raw key or client text.
const verifiedProbeCache=new Map()
const VERIFIED_PROBE_TTL_MS=60_000

// Client-triggered synthetic readiness check: no client text, transcript,
// saved answers, plans or other identifiers sent to the external provider.
export async function personalCoachingBrainProbe(config,actor,body,{
  env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall,
}={}) {
  let input
  try { input=normalizeCoachingBrainProbeInput(body) }
  catch { throw new AppError('COACHING_BRAIN_PROBE_INVALID',400) }
  const current=(await readPersonalCoaching(config,actor))?.course?.current
  if(!current || current.id!==input.sessionId)
    throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
  if(current.status!=='active')
    throw new AppError('PERSONAL_COACH_INCOMPLETE',409)
  return runCoachingBrainProbe({env,fetcher,signal,reserveModelCall})
}

// Signed-in public My Coach probe. It sends a synthetic "OK" only: never
// personal messages or transcript. Used before enabling the primary composer.
export async function myCoachGenerativeProbe({env=process.env,fetcher=globalThis.fetch,signal,reserveModelCall}={}){
  return runCoachingBrainProbe({env,fetcher,signal,reserveModelCall,personaMode:true})
}

async function runCoachingBrainProbe({env,fetcher,signal,reserveModelCall,personaMode=false}){
  const unavailable=reason=>({schema:'HH_COACHING_BRAIN_PROBE_V1',status:'unavailable',reason})
  if(env.HH_COACHING_BRAIN_ENABLED!=='true')return unavailable('feature_disabled')
  const providers=coachingProviders(env,personaMode)
  if(!providers.length)return unavailable('server_not_configured')
  // Cache is synthetic-only and short-lived. Never key on client text.
  const allowCache=env===process.env&&fetcher===globalThis.fetch
  const fingerprint=allowCache?createHash('sha256').update(providers
    .map(p=>p.apiKey+'|'+(p.preferredModel||'')).join('|')).digest('hex'):null
  const cached=fingerprint?verifiedProbeCache.get(fingerprint):null
  if(cached&&cached.expires>Date.now())return cached.result
  let lastError=null
  for(const provider of providers){
    try {
      if(typeof reserveModelCall==='function')await reserveModelCall()
      const timeout=AbortSignal.timeout(12000)
      const boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout
      const reply=await coachingProviderReply(provider,[
        {role:'system',content:'This is a synthetic connectivity check. Answer exactly OK in uppercase. No other text.'},
        {role:'user',content:'Reply OK.'},
      ],fetcher,boundedSignal,{probe:true})
      if(!isCoachingBrainProbeReply(reply.text))throw Error('COACHING_BRAIN_RESPONSE_INVALID')
      const verified={schema:'HH_COACHING_BRAIN_PROBE_V1',status:'verified',
        model:reply.model,
        privacyRouting:provider.provider==='groq'?'account_zdr_owner_confirmed':'zdr',
        cost:provider.provider==='groq'?'owner_confirmed_free_tier':'zero_verified'}
      if(fingerprint){
        if(verifiedProbeCache.size>12)verifiedProbeCache.clear()
        verifiedProbeCache.set(fingerprint,{result:verified,expires:Date.now()+VERIFIED_PROBE_TTL_MS})
      }
      return verified
    }catch(error){
      lastError=error
      if(error?.message==='RATE_LIMITED')break
    }
  }
  return unavailable(coachingProviderFailure(lastError))
}
