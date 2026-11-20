// Only explicit, bounded subjective client ratings; never transcript or coaching proof.
import {getCoachPersona} from '../coaching/persona-registry.mjs'

const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const numeric=['stars','character','intelligence','impression']
const keys=['sessionId','personaId',...numeric]
export const MY_COACH_RATING_VERSION='hh-my-coach-session-rating-v1'
export function normalizeMyCoachRating(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    Object.keys(raw).length!==keys.length||
    !Object.keys(raw).every(key=>keys.includes(key))||
    typeof raw.sessionId!=='string'||!ID.test(raw.sessionId)||
    typeof raw.personaId!=='string'||!getCoachPersona(raw.personaId))
    throw Error('MY_COACH_RATING_INVALID')
  for(const key of numeric){
    if(!Number.isInteger(raw[key])||raw[key]<1||raw[key]>5)
      throw Error('MY_COACH_RATING_INVALID')
  }
  return Object.freeze({version:MY_COACH_RATING_VERSION,
    sessionId:raw.sessionId,personaId:raw.personaId,
    stars:raw.stars,character:raw.character,
    intelligence:raw.intelligence,impression:raw.impression})
}
