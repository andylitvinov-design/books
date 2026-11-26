import 'server-only'
import {timingSafeEqual} from 'node:crypto'
import {operationHash} from './crypto.js'
import {buildCoachProfileArchiveV3,validateCoachProfileArchiveV3,coachProfileArchiveEnvelope} from '../coaching/coach-profile-archive-v3.mjs'
const domain='hh-my-coach-profile-server-replay-v3'
const actorId=actor=>typeof actor?.id==='string'&&/^[0-9a-f-]{36}$/iu.test(actor.id)?actor.id.toLowerCase():null
const invalid=()=>{throw Error('COACH_PROFILE_ARCHIVE_INVALID')}
const message=(accountId,block,prefix)=>({domain,accountId,block,prefix})
/** SERVER ONLY. No HTTP route may call this with caller-authored ledger data.
 * The existing authenticated Director owns issued questions and actual turns;
 * prior observations must come from its separately approved owner archive.
 * Receipt is a content proof, NOT an authentication token or provider grant.
 */
export function issueCoachProfileArchiveProof(config,actor,serverLedger){
 const owner=actorId(actor)
 if(!owner||!config?.encryptionKey)invalid()
 const block=buildCoachProfileArchiveV3(serverLedger)
 const protocol={id:block.sessionId,courseSessionId:block.courseSessionId,locale:block.locale,turns:[...(serverLedger.acknowledgedPrefix||[]),...serverLedger.transcript]}
 const {prefix}=validateCoachProfileArchiveV3(block,protocol)
 const receipt=operationHash(message(owner,block,prefix),config)
 return {block,receipt}
}
/** Gate for the existing protocol/draft writer: signed profile results may
 * be retained only for the same account, session, course, locale and exact
 * source transcript prefix. Appended turns are permitted; edits are not.
 * Never expose receipt or source text in telemetry or AI context.
 */
export function verifyCoachProfileArchiveProof(config,actor,protocol,value){
 try{
  const owner=actorId(actor)
  if(!owner||!config?.encryptionKey||typeof value?.receipt!=='string'||
    !/^[0-9a-f]{64}$/.test(value.receipt))return false
  const {block,prefix}=validateCoachProfileArchiveV3(value.block,protocol)
  const expected=operationHash(message(owner,block,prefix),config)
  return timingSafeEqual(Buffer.from(value.receipt,'hex'),Buffer.from(expected,'hex'))
 }catch{return false}
}

/** Shared persistence gate: caller-supplied scores are never promoted solely
 * because the shape matched the transcript. This is called by both writers.
 */
export function assertCoachProfileArchiveProof(config,actor,protocol){
 const envelope=coachProfileArchiveEnvelope(protocol)
 if(envelope&&!verifyCoachProfileArchiveProof(config,actor,protocol,envelope.value))invalid()
 return protocol
}
