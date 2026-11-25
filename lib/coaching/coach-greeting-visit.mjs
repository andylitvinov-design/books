// Non-sensitive per-tab indicator of a completed Gemini Live handshake.
// This does NOT contain, persist or restore any transcript, name, goal,
// medical data, session context, audio, or provider token. Changing accounts
// cannot reveal anything beyond a transient "continue coaching" label.
import {PUBLIC_COACH_PERSONA_IDS} from './persona-registry.mjs'

const KEY='hh-coach-connected-v1-'
export function hasCoachGreetingConnection(personaId){
 if(!PUBLIC_COACH_PERSONA_IDS.includes(personaId)||typeof window==='undefined')return false
 try{return window.sessionStorage.getItem(KEY+personaId)==='1'}catch{return false}
}
export function markCoachGreetingConnected(personaId){
 if(!PUBLIC_COACH_PERSONA_IDS.includes(personaId)||typeof window==='undefined')return
 try{window.sessionStorage.setItem(KEY+personaId,'1')}catch{}
}
