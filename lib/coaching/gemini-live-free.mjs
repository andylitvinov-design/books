import {ANTI_STRESS_SESSION_IDS} from './coach-program-mode.mjs'
import {antiStressLiveInstruction} from './anti-stress-course.mjs'
import {antiStressRunCredentialWindow} from './anti-stress-runs.mjs'
import {clarityCourseDay} from './clarity-course.mjs'
import {clarityRunCredentialWindow,isClarityRunId} from './clarity-course-runs.mjs'
/**
 * Free Gemini Live: a real duplex AUDIO transport, not another TTS/replay call.
 * Ephemeral token is provisioned only for an authenticated/consented actor.
 * All model/persona/method/voice instructions are locked server-side.
 * Never use the Paid key or upgrade a Free request on any failure.
 */
import {setTimeout as wait} from 'node:timers/promises'
import {geminiCoachTextConfig,validGeminiCoachApiKey} from './gemini-coach-text.mjs'
import {allowedGeminiCoachVoice,lockedCoachSessionVoice,coachVocalDelivery} from './gemini-voice-catalog.mjs'
import {getCoachPersona,buildCoachBehaviorPolicy} from './persona-registry.mjs'
import {COACH_STYLE_MOVES} from './conversational-persona.mjs'
import {normalizeGenerativeCoachInput} from './generative-persona.mjs'
import {COACH_PROTOCOL_VERIFICATION_INSTRUCTION} from './coach-protocol-relevance.mjs'
import {coachSessionDirective} from './coach-session-director.mjs'
import {withCoachLivePersonality} from './coach-personality-live.mjs'
import {advanceCoachSession} from './session-authority.mjs'
import {coachMethodAuthorityInput} from './method-session-transport.mjs'
import {coachSessionProgress} from './coach-session-progress.mjs'
import {coachOpeningLiveInstruction,coachOpeningProgress,coachOpeningNextReply} from './coach-opening-protocol.mjs'
import {COACH_PRECONSULTING_GUIDANCE} from './coach-preconsulting.mjs'
import {coachProfileProgress,coachProfileNextReply} from './coach-profile-intake.mjs'
import {normalizeCoachCourseSessionId,coachCourseLiveInstruction} from './coach-course-journey.mjs'
import {coachCourseCheckpointGuidance} from './coach-course-protocol-schema.mjs'

export const GEMINI_FREE_LIVE_MODEL='gemini-3.1-flash-live-preview'
export const GEMINI_FREE_LIVE_MAX_SECONDS=20*60
const tokenEndpoint='https://generativelanguage.googleapis.com/v1beta/auth_tokens'
// REST AuthToken.fieldMask overwrites these WebSocket setup fields, including
// defaults for omitted fields such as tools. Keep this list in sync with v1beta
// BidiGenerateContentSetup. Only sessionResumption (its handle) is client-set.
const serverLockedLiveFields=[
  'model','generationConfig','systemInstruction','tools','realtimeInputConfig',
  'contextWindowCompression','inputAudioTranscription','outputAudioTranscription',
  'proactivity','historyConfig','labels',
].join(',')
const localeNames={en:'English',ru:'Russian',es:'Spanish'}
// Retired archive field names are accepted only for compatibility with cached
// clients. Neither value is inspected, copied, or used to mint a Free Live token.
const starts=new Set(['personaId','locale','settings','voiceName','consent','voiceConsent','trainingUseConsent','openingPrior','allowOpeningPrior','courseSessionId'])
const checkpoints=new Set(['personaId','locale','settings','message','turns','elapsedSeconds','consent','voiceConsent','trainingUseConsent','openingHistory','openingPrior','allowOpeningPrior','courseSessionId','characterSeenIds'])
const settingNames=new Set(['warmth','directness','pace','depth','questionsPerTurn'])
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)

// Fixed, non-sensitive readiness reason; no raw keys or customer context.
export function geminiFreeLiveUnavailableReason(env={}){
  if(!geminiCoachTextConfig(env,'gemini_free'))return 'free_model_unverified'
  if(env.HH_MY_COACH_GEMINI_LIVE_FREE_ENABLED!=='true')return 'live_not_enabled'
  if(env.HH_COACHING_BRAIN_ENABLED!=='true')return 'director_not_enabled'
  if(env.HH_COACHING_LIVE_VOICE_ENABLED!=='true'||
     env.HH_COACHING_LIVE_VOICE_APPROVED!=='true')return 'live_voice_not_approved'
  return null
}
export function geminiFreeLiveConfig(env={}){
  if(geminiFreeLiveUnavailableReason(env))return null
  return {provider:'gemini_live_free',model:GEMINI_FREE_LIVE_MODEL,
    apiKey:geminiCoachTextConfig(env,'gemini_free').apiKey}
}
function checkCommon(body,keys){
  if(!isRecord(body)||Object.keys(body).some(key=>!keys.has(key))||
      !getCoachPersona(body.personaId)||!Object.hasOwn(localeNames,body.locale)||
      body.consent!==true||body.voiceConsent!==true||body.trainingUseConsent!==true||
      !isRecord(body.settings||{})||Object.keys(body.settings||{}).some(key=>!settingNames.has(key)))
    throw Error('GEMINI_LIVE_REQUEST_INVALID')
}
export function normalizeGeminiFreeLiveStart(body,{methodSession=null}={}){
  checkCommon(body,starts)
  if(!allowedGeminiCoachVoice(body.personaId,body.voiceName))
    throw Error('GEMINI_LIVE_VOICE_INVALID')
  const policy=buildCoachBehaviorPolicy(body.personaId,body.settings||{},body.locale)
  if(!policy)throw Error('GEMINI_LIVE_REQUEST_INVALID')
  if(methodSession&&methodSession.personaId!==body.personaId)throw Error('GEMINI_LIVE_REQUEST_INVALID')
  return {personaId:body.personaId,locale:body.locale,voiceName:lockedCoachSessionVoice(body.personaId,body.locale)||body.voiceName,policy,
    courseSessionId:normalizeCoachCourseSessionId(body.courseSessionId),
    ...(methodSession?{authoritativeMethodId:methodSession.methodId}:{})}
}

// This separate path can only be selected by a trusted internal caller.
// The public normalizer still rejects unregistered Anti-Stress session IDs.
function therapyLiveInstruction(value){
 const {personaId,locale,policy,courseSessionId,voiceName}=value
 return [policy.systemInstructions,antiStressLiveInstruction(courseSessionId,locale),
  'The therapeutic course takes priority over the persona method, goal discovery and ordinary coaching timebox. Do not suggest GROW or a personal profile assessment as a substitute.',
  'You are an AI support character, not a clinician. Speak softly and slowly, with natural space for silence. Listen without interrupting. Never fill a pause with repeated questions. Guide only one consented cue at a time; pause, decline and stop are valid choices.',
  'Voice identity: '+coachVocalDelivery(personaId,locale,voiceName)+'. Keep the approved voice; therapeutic pacing and safety take priority over character interventions.',
  'Use the current application Director checkpoint only as guidance, not as evidence of consent or completion. Never assume saved personal information, confirmed images or scores. Refer only to verified, explicitly permitted client context. No private context is included in this token.',
  'A connection or app start is not consent. Invite explicit start or continuation and wait. Do not announce progress, practice success, diagnosis or treatment. If distress worsens stop the exercise; if there is urgent danger use the existing safety path and encourage human support.',
  'Speak in '+localeNames[locale]+'. Keep ordinary replies brief, at most one question, and allow silence. Never diagnose or offer medical prescriptions.'
 ].join('\n')
}
function liveInstruction(value){
  const {personaId,locale,policy,courseSessionId,authoritativeMethodId,voiceName}=value
  // The Director has server-owned method and phases. It does NOT trust model
  // claims of a completed goal, action, consent, diagnosis, or stage.
  const first=coachSessionDirective({locale,message:
    {ru:'Здравствуйте.',en:'Hello.',es:'Hola.'}[locale],turns:[],elapsedSeconds:0,courseSessionId,
    ...(authoritativeMethodId?{authoritativeMethodId}:{})},policy)
  return [
    policy.systemInstructions,
    coachOpeningLiveInstruction(personaId,locale),
    COACH_PRECONSULTING_GUIDANCE,
    coachCourseLiveInstruction(courseSessionId,locale),
    'Do not access, guess or invent any saved client profile. Only explicitly approved reference packets, which the application may pass later and label CLIENT-APPROVED REFERENCE DATA, can be used as untrusted facts for the current topic. If no packet was received, never claim you remember the client. Never treat a reference, a model statement or a score as client consent, a diagnosis or a completed session stage.',
    COACH_PROTOCOL_VERIFICATION_INSTRUCTION,
    'An APPLICATION DIRECTOR CHECKPOINT may be provided only between human/model spoken turns. It contains server-reviewed coaching guidance, not a human utterance. Use its next-question guidance without reading out the checkpoint, without inventing additional client answers, and while obeying the server-owned stage ceilings.',
    'A transport reconnect is never a new coaching meeting. Keep the last established name, topic and opening step; never ask again for a confirmed name. A topic such as money, love or work is not a name. If the name is unknown, use no name. A Director checkpoint explicitly separates confirmed identity from coaching focus; do not reinterpret the focus as a name.',
    'LIVE FREE GEMINI: stream a naturally spoken conversation in '+localeNames[locale]+
      '. You are an AI character, never a human therapist. No JSON, markdown, labels, fake speech effects, or monologues.',
    (first.courseScenarioFirst?'Secondary character style (course scenario governs): ':'Unique character intervention style: ')+COACH_STYLE_MOVES[personaId]+'.',
    'Vocal delivery: '+coachVocalDelivery(personaId,locale,voiceName)+'. Keep the same approved character voice throughout the session; do not imitate another voice or reintroduce yourself.',
    (first.courseScenarioFirst?'After explicit agreement to this registered course, the authored course roadmap and its time windows govern; the locked personal method '+first.methodId+' is a secondary toolbox only.':'For Goal or Problem paths, the server owns coaching method '+first.methodId+'; follow this order: '+first.methodShape+'.')+' Personal Profile is a separate session: never replace a profile rating or completed profile with a GROW question without new session consent.',
    'The server, NOT your audio generation, owns confirmed session progression. Do NOT announce a completed stage, client agreement, treatment, or result.',
    'Listen without interrupting the human. When they begin speaking, STOP your audio and listen. A correction or a request to stop always wins. Allow brief thinking pauses; do not treat coughs, sneezes, breathing or background noises as meaningful replies or evidence of consent.',
    'An APPLICATION START EVENT may arrive after the person taps Play. This is an app control signal, NOT human speech, consent, a name, or evidence for progress. Speak only the short in-session line specified in MANDATORY OPENING FIRST, exactly once, without introducing yourself again or adding another question. Wait for actual human speech before advancing.',
    'Speak naturally with a calm, responsive rhythm, short varied sentences and natural space for silence. Avoid formulaic praise, repeated confirmations or artificial empathy. Do not pressure the listener to answer quickly.',
    'Answer the current question directly. Normally speak one or two clear sentences and ask AT MOST ONE gentle question; never push or repeat a questionnaire.',
    'Do not pressure a client to act, reveal trauma, commit to a plan, or disclose sensitive information. Do not diagnose, promise outcomes, or offer medical prescriptions.',
    'Never treat audio transcription, model speech or model output as proof of the clients chosen commitments. Only the client can choose their next action.',
    'The selected conversation language is '+localeNames[locale]+'. Keep this language unless the client explicitly changes it.',
    'If the client asks to end or there is a safety emergency, stop regular coaching and encourage qualified human or emergency assistance when appropriate.',
    first.courseScenarioFirst?'For a confirmed course, use the course checkpoint for ordinary exploration. Follow Director permissions, answer the client first, and return gently to the course only if still agreed.':'When outside the Personal Profile path, your default next move is '+first.interventionId+'; vary phrasing naturally and remain within '+first.methodId+' until client evidence warrants progression.'
  ].join('\n')
}

export function geminiFreeLiveSetup(input,{trustedTherapy=false}={}){
  if(!input||!allowedGeminiCoachVoice(input.personaId,input.voiceName)||
    !Object.hasOwn(localeNames,input.locale)||!input.policy)
    throw Error('GEMINI_LIVE_REQUEST_INVALID')
  const therapy=ANTI_STRESS_SESSION_IDS.includes(input.courseSessionId)
  if(therapy!==trustedTherapy)throw Error('GEMINI_LIVE_REQUEST_INVALID')
  // Token constraints fix all these fields; the client cannot request Paid or
  // rewrite the system prompt through its browser WebSocket.
  return {
    model:'models/'+GEMINI_FREE_LIVE_MODEL,
    responseModalities:['AUDIO'],
    systemInstruction:{parts:[{text:therapy?therapyLiveInstruction(input):liveInstruction(input)}]},
    speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:lockedCoachSessionVoice(input.personaId,input.locale)||input.voiceName}}},
    inputAudioTranscription:{},
    outputAudioTranscription:{},
    realtimeInputConfig:{
      automaticActivityDetection:{startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',
        endOfSpeechSensitivity:'END_SENSITIVITY_LOW',prefixPaddingMs:160,
        silenceDurationMs:therapy?1400:900},
      activityHandling:'START_OF_ACTIVITY_INTERRUPTS',
    },
    sessionResumption:{},
    contextWindowCompression:{slidingWindow:{}},
    // This model defaults to minimal thinking for speech latency; an
    // unverified level enum must not break session token creation.
    generationConfig:{maxOutputTokens:1100},
  }
}

export async function issueGeminiFreeLiveToken(config,start,{
  fetcher=globalThis.fetch,signal,now=Date.now(),clarityLease=null,antiStressLease=null,
  pause=milliseconds=>wait(milliseconds,undefined,{signal})
}={}){
  if(config?.provider!=='gemini_live_free'||config.model!==GEMINI_FREE_LIVE_MODEL||
    !validGeminiCoachApiKey(config.apiKey))throw Error('GEMINI_LIVE_DISABLED')
  const therapy=ANTI_STRESS_SESSION_IDS.includes(start?.courseSessionId)
  if(therapy&&!antiStressLease)throw Error('GEMINI_LIVE_ANTI_STRESS_LEASE_REQUIRED')
  if((!therapy&&antiStressLease)||(therapy&&clarityLease))throw Error('GEMINI_LIVE_REQUEST_INVALID')
  // A Clarity mint must never silently fall back to a fresh full window.
  // The future trusted adapter supplies a persisted account-wide lease and
  // holds its mint lock until the possible expiry is durably reserved.
  // Browser request normalization cannot supply this server-only option.
  const day=clarityCourseDay(start.courseSessionId)
  if(day&&!clarityLease)throw Error('GEMINI_LIVE_CLARITY_LEASE_REQUIRED')
  if(!day&&clarityLease)throw Error('GEMINI_LIVE_REQUEST_INVALID')
  let window
  if(day){
    try{
      // The durable reservation, not this later mint call, owns the expiry.
      // An internal lease is not accepted from normalized browser JSON.
      if(!isClarityRunId(clarityLease.leaseId)||clarityLease.day!==day||
        !Number.isSafeInteger(now)||!Number.isSafeInteger(clarityLease.now)||now<clarityLease.now)
        throw Error('CLARITY_LEASE_INVALID')
      window=clarityRunCredentialWindow(clarityLease.run,{day,protocolId:clarityLease.protocolId,now:clarityLease.now,
        previousCredentialExpiresAt:clarityLease.previousCredentialExpiresAt})
      if(clarityLease.expiresAt!==window.expiresAt||
        clarityLease.newSessionExpireTime!==window.newSessionExpireTime||
        now>=Date.parse(window.newSessionExpireTime))throw Error('CLARITY_LEASE_INVALID')
    }catch{throw Error('GEMINI_LIVE_CLARITY_LEASE_REJECTED')}
  }
  if(therapy){
    try{window=antiStressRunCredentialWindow(antiStressLease.run,{sessionId:start.courseSessionId,protocolId:antiStressLease.protocolId,now,
      previousCredentialExpiresAt:antiStressLease.previousCredentialExpiresAt})}
    catch{throw Error('GEMINI_LIVE_ANTI_STRESS_LEASE_REJECTED')}
    // Internal caller must durably reserve this exact expiry under the shared owner lock before minting.
    if(antiStressLease.reservedExpiresAt!==window.expiresAt)throw Error('GEMINI_LIVE_ANTI_STRESS_LEASE_REJECTED')
  }
  const setup=geminiFreeLiveSetup(start,{trustedTherapy:therapy})
  const expiresAt=window?.expiresAt||new Date(now+21*60*1000).toISOString()
  const newSessionExpireTime=window?.newSessionExpireTime||new Date(now+45*1000).toISOString()
  const tokenRequest={
      method:'POST',cache:'no-store',redirect:'error',signal,
      headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},
      body:JSON.stringify({
        uses:1,expireTime:expiresAt,newSessionExpireTime,
        // An empty mask makes Google ignore even a valid resume handle from
        // the socket. Keep the native REST structure and all policy server-side.
        fieldMask:serverLockedLiveFields,
        bidiGenerateContentSetup:{
          model:setup.model,
          generationConfig:{...setup.generationConfig,
            responseModalities:setup.responseModalities,
            speechConfig:setup.speechConfig},
          systemInstruction:setup.systemInstruction,
          inputAudioTranscription:setup.inputAudioTranscription,
          outputAudioTranscription:setup.outputAudioTranscription,
          realtimeInputConfig:setup.realtimeInputConfig,
          // Course windows can exceed the uncompressed audio context limit.
          ...(day?{contextWindowCompression:setup.contextWindowCompression}:{}),
        },
      }),
    }
  let response
  // One bounded retry for Google's transient 5xx during token provisioning.
  // This is still the SAME authenticated Free token request, not another
  // coaching turn, inference, paid tier or unrestricted browser credential.
  // Do not retry 400/401/403/404/422/429 or transport/abort failures.
  for(let attempt=0;attempt<2;attempt++){
    try{response=await fetcher(tokenEndpoint,tokenRequest)}
    catch{throw Error('GEMINI_LIVE_TOKEN_UNAVAILABLE')}
    const transient=[500,502,503,504].includes(response?.status)
    if(!day&&!therapy&&attempt===0&&transient&&!signal?.aborted){
      try{await pause(800+Math.floor(Math.random()*300))}
      catch{throw Error('GEMINI_LIVE_TOKEN_UNAVAILABLE')}
      continue
    }
    break
  }
  // Classify by status only. Never inspect or log provider response bodies.
  if(response?.status===429)throw Error('GEMINI_LIVE_RATE_LIMIT')
  if(response?.status===401||response?.status===403)throw Error('GEMINI_LIVE_AUTH_FAILURE')
  if(response?.status===400||response?.status===422)throw Error('GEMINI_LIVE_PROVIDER_BAD_REQUEST')
  if(response?.status===404)throw Error('GEMINI_LIVE_PROVIDER_MODEL_UNAVAILABLE')
  if(response?.status>=500)throw Error('GEMINI_LIVE_PROVIDER_UNAVAILABLE')
  if(!response?.ok)throw Error('GEMINI_LIVE_TOKEN_UNAVAILABLE')
  const reply=await response.json().catch(()=>null)
  if(typeof reply?.name!=='string'||reply.name.length<12||reply.name.length>8192)
    throw Error('GEMINI_LIVE_TOKEN_INVALID')
  // This token only works for one Gemini Live session; never send the API key.
  return {schema:'HH_GEMINI_LIVE_FREE_TOKEN_V1',token:reply.name,
    model:GEMINI_FREE_LIVE_MODEL,voiceName:start.voiceName,expiresAt}
}

// Keep all thematic labels and safeguards intact within the existing sideband
// limit. A long name must never clip the instruction to honor client choice.
export function geminiLiveThematicCheckpointGuidance(namePrefix,directive,courseHint){
 const method=directive.courseScenarioFirst?'Director: course scenario first; move '+directive.interventionId+'.':'Director: method '+directive.methodId+', step '+directive.methodStepId+', move '+directive.interventionId+'.'
 const combined=namePrefix+method+courseHint
 return combined.length<=620?combined:method+courseHint
}

export function geminiFreeLiveCheckpoint(body,{methodSession=null,now=Date.now()}={}){
  checkCommon(body,checkpoints)
  if(typeof body.message!=='string'||!body.message.trim())
    throw Error('GEMINI_LIVE_REQUEST_INVALID')
  // Reuse the exact existing signed-in Coach Director input, evidence and
  // safety validators. No model invocation, second fee, DB transcript or IO.
  const parsed=normalizeGenerativeCoachInput({
    personaId:body.personaId,locale:body.locale,settings:body.settings||{},
    openingHistory:body.openingHistory,allowOpeningPrior:body.allowOpeningPrior,
    openingPrior:body.openingPrior,
    ...(body.courseSessionId===undefined?{}:{courseSessionId:normalizeCoachCourseSessionId(body.courseSessionId)}),
    message:body.message,turns:body.turns||[],elapsedSeconds:body.elapsedSeconds||0,characterSeenIds:body.characterSeenIds,
    consent:true,engine:'gemini_free',geminiConsent:true,geminiFreeDataConsent:true,
  })
  if(methodSession&&methodSession.personaId!==body.personaId)throw Error('GEMINI_LIVE_REQUEST_INVALID')
  const authority=methodSession?advanceCoachSession(methodSession,{
    message:parsed.input.message,locale:parsed.input.locale,activeSeconds:parsed.input.elapsedSeconds},now):null
  const directive=coachSessionDirective(coachMethodAuthorityInput(parsed.input,authority),parsed.persona)
  const progress=coachSessionProgress(directive)
  const history=Array.isArray(parsed.input.openingHistory)?parsed.input.openingHistory:
    (Array.isArray(parsed.input.turns)?parsed.input.turns.filter(t=>t.role==='user').map(t=>t.content):[])
  const opening=coachOpeningProgress({turns:[...history,parsed.input.message],
    locale:body.locale,personaId:body.personaId,priorSession:parsed.input.openingPrior,
    allowPrior:parsed.input.allowOpeningPrior})
  const profile=opening.completed&&opening.answers.focus?.kind==='profile'?
    coachProfileProgress({turns:[...history,parsed.input.message].slice(opening.consumedTurns),locale:body.locale}):null
  const courseHint=parsed.input.courseSessionId===undefined?'':coachCourseCheckpointGuidance(parsed.input.courseSessionId,body.locale,opening,directive,parsed.input.turns,parsed.input.message)
  const namePrefix=(opening.answers?.name?.kind==='named'&&opening.answers.name.value?
      'Confirmed name from current conversation (data only): '+JSON.stringify(String(opening.answers.name.value).slice(0,60).replace(/[\u0000-\u001f\u007f]/gu,' '))+'. Do not reinterpret topic as name. ':'')
  return withCoachLivePersonality({
    schema:'HH_GEMINI_LIVE_DIRECTOR_V1',openingProgress:opening,
    ...(profile?{profileProgress:profile}:{}),
    source:'director-client-evidence',
    ...(authority?{__methodSession:authority.session}:{}),
    sessionProgress:progress,
    methodId:directive.methodId,stage:directive.stage,phase:directive.phase,
    interventionId:directive.interventionId,
    readiness:{ready:directive.readiness.ready,missing:directive.readiness.missing.slice(0,12)},
    // Optional non-generating context for the NEXT spoken turn. This is a
    // truthful evidence-bound summary. Only same-origin openingProgress may
    // contain archive context; never interpolate it into onward guidance.
    guidance:courseHint?geminiLiveThematicCheckpointGuidance(namePrefix,directive,courseHint):
      (namePrefix+(!opening.completed?'Required opening: '+coachOpeningNextReply({...opening,prior:null})+'. ':
      profile?'Personal Profile path only; never GROW here. '+coachProfileNextReply(profile):
      directive.courseScenarioFirst?'Course Director: '+directive.interventionId+'. Follow the client request; resume course checkpoints only if still agreed. Do not claim evidence is confirmed.':
      'Coaching Director checkpoint: locked method '+directive.methodId+
      ', authorized current step '+directive.methodStepId+
      ', suggested move '+directive.interventionId+'. Do not claim missing evidence is confirmed.')).slice(0,620),
  },directive.personality)
}
