import 'server-only';
import {randomUUID} from 'node:crypto';
import {transaction} from '../app/database.js';
import {seal,openSealed} from '../app/crypto.js';
import {AppError} from '../assessments/contracts.js';
import {CHAT_HISTORY_VERSION,CHAT_HISTORY_MAX_PAIRS,validateChatPair,validChatTurnId} from './agent-chat-history-policy.mjs';

// Never reuse the optional agent-memory grant; chat retention is separate.
const consentTable='app_private.agent_chat_history_consent';
const transcriptTable='app_private.agent_chat_history_pairs';
const context=(actor,id)=>({accountId:actor.id,recordId:id,field:'agent.chat_history.pair'});

export async function readOwnChatHistory(config,actor){
 return transaction(config,actor,async db=>{
  const row=(await db.query('select accepted from '+consentTable+' where account_id=$1',[actor.id])).rows[0];
  if(row?.accepted!==true)return {consent:false,version:CHAT_HISTORY_VERSION,items:[]};
  const rows=(await db.query(
   'select id,payload_ciphertext,created_at from '+transcriptTable+
   ' where account_id=$1 order by created_at desc,id desc limit $2',
   [actor.id,CHAT_HISTORY_MAX_PAIRS])).rows;
  const items=[];
  for(const entry of rows.reverse()){
   // An invalid/corrupted ciphertext is never rendered as plaintext.
   try{
    const opened=openSealed(entry.payload_ciphertext,context(actor,entry.id),config);
    const valid=validateChatPair(opened?.user,opened?.assistant);
    if(valid)items.push({...valid,createdAt:entry.created_at});
   }catch{}
  }
  return {consent:true,version:CHAT_HISTORY_VERSION,items};
 });
}
export async function setOwnChatHistoryConsent(config,actor,accepted){
 if(typeof accepted!=='boolean')throw new AppError('INVALID_CHAT_HISTORY_CONSENT',400);
 return transaction(config,actor,async db=>{
  await db.query('select account_id from '+consentTable+' where account_id=$1 for update',[actor.id]);
  if(!accepted)await db.query('delete from '+transcriptTable+' where account_id=$1',[actor.id]);
  await db.query(
   'insert into '+consentTable+'(account_id,accepted,policy_version) values($1,$2,$3) '+
   'on conflict(account_id) do update set accepted=excluded.accepted,'+
   'policy_version=excluded.policy_version,updated_at=now()',
   [actor.id,accepted,CHAT_HISTORY_VERSION]);
  return {consent:accepted,version:CHAT_HISTORY_VERSION,items:[]};
 });
}
export async function appendOwnChatHistory(config,actor,turnId,user,assistant){
 const pair=validateChatPair(user,assistant);
 if(!pair||!validChatTurnId(turnId))throw new AppError('INVALID_CHAT_HISTORY_PAIR',400);
 return transaction(config,actor,async db=>{
  const consent=(await db.query(
   'select accepted from '+consentTable+' where account_id=$1 for update',[actor.id])).rows[0];
  if(consent?.accepted!==true)throw new AppError('CHAT_HISTORY_CONSENT_REQUIRED',403);
  const id=randomUUID();
  const ciphertext=seal(pair,context(actor,id),config);
  await db.query(
   'insert into '+transcriptTable+'(id,account_id,client_turn_id,payload_ciphertext) '+
   'values($1,$2,$3,$4) on conflict(account_id,client_turn_id) do nothing',
   [id,actor.id,turnId,ciphertext]);
  // Bound permanent storage without another worker or cron; account-locked.
  await db.query('delete from '+transcriptTable+' where account_id=$1 and id in ('+
   'select id from '+transcriptTable+' where account_id=$1 '+
   'order by created_at desc,id desc offset $2)',[actor.id,CHAT_HISTORY_MAX_PAIRS]);
  return {saved:true};
 });
}
export async function eraseOwnChatHistory(config,actor){
 return transaction(config,actor,async db=>{
  await db.query('select account_id from '+consentTable+' where account_id=$1 for update',[actor.id]);
  await db.query('delete from '+transcriptTable+' where account_id=$1',[actor.id]);
  await db.query('delete from '+consentTable+' where account_id=$1',[actor.id]);
  return {deleted:true,consent:false};
 });
}
