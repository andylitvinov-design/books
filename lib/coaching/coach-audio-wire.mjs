// Public receipt identifies configuration, not acoustic evidence or permission.
import {COACH_AUDIO_PROFILE_VERSION} from './coach-audio-profiles.mjs'
export {COACH_AUDIO_PROFILE_VERSION}
export function coachAudioWireMode(){return 'coaching'} // Therapy is not enabled on the production course catalogue.
export function coachAudioSilenceMs(mode){if(mode==='coaching')return 900;throw Error('GEMINI_LIVE_SETUP_INVALID')}
export function coachAudioReceipt({personaId,locale,courseSessionId,voiceName,mode}){
 if(mode!==coachAudioWireMode(courseSessionId)||typeof personaId!=='string'||!['ru','en','es'].includes(locale)||typeof courseSessionId!=='string'||typeof voiceName!=='string')throw Error('GEMINI_LIVE_SETUP_INVALID')
 return Object.freeze({version:COACH_AUDIO_PROFILE_VERSION,personaId,locale,courseSessionId,voiceName,mode,silenceDurationMs:coachAudioSilenceMs(mode)})
}
export function verifyCoachAudioReceipt(token,context){
 const a=token?.audioProfile;if(!a||!context||a.version!==COACH_AUDIO_PROFILE_VERSION||a.personaId!==context.personaId||a.locale!==context.locale||a.courseSessionId!==context.courseSessionId||a.voiceName!==token.voiceName||a.mode!==coachAudioWireMode(context.courseSessionId)||a.silenceDurationMs!==coachAudioSilenceMs(a.mode))throw Error('GEMINI_LIVE_SETUP_INVALID')
 return a
}
