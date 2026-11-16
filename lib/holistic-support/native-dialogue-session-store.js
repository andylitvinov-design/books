import 'server-only';
import {randomUUID} from 'node:crypto';
import {transaction} from '../app/database.js';
import {seal,openSealed} from '../app/crypto.js';
import {AppError,requireUUID} from '../assessments/contracts.js';
import {emptyNativeDialogueState,isValidNativeDialogueState,transitionNativeDialogueState} from './native-dialogue-state.mjs';
import {nativeDialogueEventFromUtterance} from './conversation-intelligence.mjs';

// Only trusted server-side detectors may construct events. This storage layer
// never authorizes bookings, payments, memory use or any external action.
const table='app_private.native_dialogue_sessions';
const encryptionContext=(actor,id)=>({accountId:actor.id,recordId:id,field:'native.dialogue.state'});
const fail=(code,status)=>{throw new AppError(code,status);};
function actorSession(actor){requireUUID(actor?.id);return requireUUID(actor?.claims?.session_id);}
function validStored(value,revision){
 if(!value||value.version!==1||!isValidNativeDialogueState(value.state)||value.state.revision!==revision||
   !Array.isArray(value.turnIds)||value.turnIds.length!==revision||value.turnIds.length>256||
   new Set(value.turnIds).size!==value.turnIds.length)return false;
 return value.turnIds.every(x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))&&
   JSON.stringify(value.state.recentTurnIds)===JSON.stringify(value.turnIds.slice(-32))&&
   [value.state.goal,value.state.goalStatement??null,value.state.topic,value.state.timePreference,value.state.declinedMeditation??null,value.state.declinedAdvice??null]
    .every(slot=>slot===null||value.turnIds.includes(slot.sourceTurnId));
}
export async function createNativeDialogueSession(config,actor){
 const session=actorSession(actor),id=randomUUID(),state=emptyNativeDialogueState();
 const encrypted=seal({version:1,state,turnIds:[]},encryptionContext(actor,id),config);
 return transaction(config,actor,async db=>{
  await db.query('insert into '+table+'(id,account_id,session_id,state_ciphertext,expires_at) '+
   "values($1,$2,$3,$4,now()+interval '30 minutes')",[id,actor.id,session,encrypted]);
  return {sessionId:id,state};
 });
}
// Read only after actor/session checks; caller must still perform an atomic
// expected-revision commit before sending any state-derived response.
export async function readNativeDialogueSession(config,actor,id,expectedRevision){
 const session=actorSession(actor);requireUUID(id);
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)fail('INVALID_REVISION',400);
 return transaction(config,actor,async db=>{
  const row=(await db.query('select revision,state_ciphertext from '+table+
   ' where id=$1 and account_id=$2 and session_id=$3 and expires_at>now()',
   [id,actor.id,session])).rows[0];
  if(!row)fail('NATIVE_SESSION_NOT_FOUND',404);
  const payload=openSealed(row.state_ciphertext,encryptionContext(actor,id),config);
  if(!validStored(payload,row.revision))fail('NATIVE_SESSION_CORRUPT',503);
  if(row.revision!==expectedRevision)fail('REVISION_MISMATCH',409);
  return payload.state;
 });
}
async function advanceNativeDialogue(config,actor,id,metadata,eventForState,transitionOptions){
 const session=actorSession(actor);requireUUID(id);requireUUID(metadata?.turnId);
 if(!Number.isSafeInteger(metadata?.expectedRevision)||metadata.expectedRevision<0)fail('INVALID_REVISION',400);
 return transaction(config,actor,async db=>{
  const row=(await db.query('select revision,state_ciphertext from '+table+
   ' where id=$1 and account_id=$2 and session_id=$3 and expires_at>now() for update',
   [id,actor.id,session])).rows[0];
  if(!row)fail('NATIVE_SESSION_NOT_FOUND',404);
  const payload=openSealed(row.state_ciphertext,encryptionContext(actor,id),config);
  if(!validStored(payload,row.revision))fail('NATIVE_SESSION_CORRUPT',503);
  if(row.revision!==metadata.expectedRevision)fail('REVISION_MISMATCH',409);
  if(payload.turnIds.includes(metadata.turnId))fail('TURN_REPLAY',409);
  if(row.revision>=256)fail('NATIVE_SESSION_LIMIT',409);
  const event={...eventForState(payload.state),turnId:metadata.turnId,expectedRevision:metadata.expectedRevision};
  const result=transitionNativeDialogueState(payload.state,event,transitionOptions);
  const encrypted=seal({version:1,state:result.state,turnIds:[...payload.turnIds,metadata.turnId]},encryptionContext(actor,id),config);
  const updated=await db.query('update '+table+' set revision=$1,state_ciphertext=$2,updated_at=now() '+
   'where id=$3 and account_id=$4 and session_id=$5 and revision=$6 and expires_at>now() returning revision',
   [result.state.revision,encrypted,id,actor.id,session,row.revision]);
  if(updated.rowCount!==1)fail('REVISION_MISMATCH',409);
  return result;
 });
}
// Only server-created and verified events (for example published offers) may
// use this entry point. Never map an untrusted request body into `event`.
export async function advanceNativeDialogueTrustedEvent(config,actor,id,event){
 return advanceNativeDialogue(config,actor,id,event,()=>event);
}
// Request-facing adapter: extra client-provided event/state fields are ignored.
// The event is derived inside the transaction from decrypted server state.
export async function advanceNativeDialogueMessage(config,actor,id,input,serverOptions={}){
 if(typeof input?.message!=='string'||!input.message.trim()||input.message.length>3000||
   !['ru','en','es'].includes(input.locale))fail('INVALID_NATIVE_MESSAGE',400);
 return advanceNativeDialogue(config,actor,id,input,state=>nativeDialogueEventFromUtterance({message:input.message,locale:input.locale,state}),serverOptions);
}
export async function eraseNativeDialogueSession(config,actor,id){
 const session=actorSession(actor);requireUUID(id);
 return transaction(config,actor,async db=>{
  const deleted=await db.query('delete from '+table+' where id=$1 and account_id=$2 and session_id=$3',
   [id,actor.id,session]);
  return {deleted:deleted.rowCount===1};
 });
}
/** Called only by the existing trusted housekeeping transaction. */
export async function purgeExpiredNativeDialogueSessions(db,limit){
 if(!Number.isInteger(limit)||limit<1||limit>1000)fail('INVALID_BATCH',400);
 const exists=(await db.query("select to_regclass('app_private.native_dialogue_sessions') as sessions")).rows[0];
 if(!exists?.sessions)return 0;
 const removed=await db.query(
  `with doomed as (
     select id from app_private.native_dialogue_sessions
     where expires_at<=now() order by expires_at,id limit $1
   )
   delete from app_private.native_dialogue_sessions s using doomed d
   where s.id=d.id and s.expires_at<=now() returning s.id`,[limit]);
 return removed.rowCount;
}
