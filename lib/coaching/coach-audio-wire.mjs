// Small, public non-personal metadata contract; no prompts or credentials.
import {ANTI_STRESS_SESSION_IDS} from './coach-program-mode.mjs'
export const COACH_AUDIO_PROFILE_VERSION='hh-coach-audio-identity-v1'
export function coachAudioWireMode(courseSessionId){return ANTI_STRESS_SESSION_IDS.includes(courseSessionId)?'therapy':'coaching'}
export function coachAudioSilenceMs(mode){if(mode==='therapy')return 1400;if(mode==='coaching')return 900;throw Error('GEMINI_LIVE_SETUP_INVALID')}
export function coachAudioReceipt({personaId,locale,courseSessionId,voiceName,mode}){
 if(mode!==coachAudioWireMode(courseSessionId)||typeof personaId!=='string'||!['ru','en','es'].includes(locale)||typeof courseSessionId!=='string'||typeof voiceName!=='string')throw Error('GEMINI_LIVE_SETUP_INVALID')
 return Object.freeze({version:COACH_AUDIO_PROFILE_VERSION,personaId,locale,courseSessionId,voiceName,mode,silenceDurationMs:coachAudioSilenceMs(mode)})
}
export function verifyCoachAudioReceipt(token,context){
 const a=token?.audioProfile;if(!a||!context||a.version!==COACH_AUDIO_PROFILE_VERSION||a.personaId!==context.personaId||a.locale!==context.locale||a.courseSessionId!==context.courseSessionId||a.voiceName!==token.voiceName||a.mode!==coachAudioWireMode(context.courseSessionId)||a.silenceDurationMs!==coachAudioSilenceMs(a.mode))throw Error('GEMINI_LIVE_SETUP_INVALID')
 return a
}
