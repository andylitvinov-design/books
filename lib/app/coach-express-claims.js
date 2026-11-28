import 'server-only'
import {transaction} from './database'
import {PUBLIC_COACH_RAIL_IDS} from '../coaching/persona-registry.mjs'
function requirePersona(personaId){
 if(!PUBLIC_COACH_RAIL_IDS.includes(personaId))throw Error('EXPRESS_PERSONA_INVALID')
}
export async function expressClaimUsed(config,actor,personaId){
 requirePersona(personaId)
 return transaction(config,actor,async db=>Boolean((await db.query(
  'select 1 from app_private.coach_express_claims where account_id=$1 and persona_id=$2',
  [actor.id,personaId])).rowCount))
}
export async function claimExpressOnce(config,actor,personaId){
 requirePersona(personaId)
 return transaction(config,actor,async db=>Boolean((await db.query(
  'insert into app_private.coach_express_claims(account_id,persona_id) values($1,$2) on conflict(account_id,persona_id) do nothing returning persona_id',
  [actor.id,personaId])).rowCount))
}
