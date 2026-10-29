import "server-only";
import { transaction } from "../app/database.js";
import { seal,openSealed } from "../app/crypto.js";
import { AppError } from "../assessments/contracts.js";
import {
  AGENT_MEMORY_VERSION,AGENT_MEMORY_KEYS,validateMemoryPreference,
} from "./agent-memory-policy.mjs";

/**
 * A server-owned scope from createRequestAuth. No client-supplied account ID,
 * auth/owner boolean, untrusted catalogue row or medical score is accepted.
 * RLS is also checked in transaction() via hh_app_backend and session_active().
 */
const secretContext=(actor,id)=>({
  accountId:actor.id,recordId:id,field:"agent.memory.value",
});
const fields=new Set(AGENT_MEMORY_KEYS);
export async function readMyAgentMemory(config,actor) {
  return transaction(config,actor,async db=>{
    const consentRow=(await db.query(
      "select accepted,use_in_dialogue from app_private.agent_memory_consent where account_id=$1",
      [actor.id])).rows[0];
    const consent=consentRow?.accepted===true;
    if(!consent)return {consent:false,useInDialogue:false,version:AGENT_MEMORY_VERSION,items:[]};
    const rows=(await db.query(
      "select id,kind,value_ciphertext,updated_at from app_private.agent_memory_item "+
      "where account_id=$1 order by updated_at desc,kind asc limit 5",
      [actor.id])).rows;
    const items=rows.flatMap(row=>{
      if(!fields.has(row.kind))return [];
      const value=openSealed(row.value_ciphertext,secretContext(actor,row.id),config);
      return typeof value==="string" && validateMemoryPreference(row.kind,value)===value
        ? [{kind:row.kind,value,updatedAt:row.updated_at}]:[];
    });
    return {consent:true,useInDialogue:consentRow?.use_in_dialogue===true,version:AGENT_MEMORY_VERSION,items};
  });
}
export async function consentToAgentMemory(config,actor,accepted) {
  if(typeof accepted!=="boolean")throw new AppError("INVALID_MEMORY_CONSENT",400);
  return transaction(config,actor,async db=>{
    if(!accepted)await db.query(
      "delete from app_private.agent_memory_item where account_id=$1",[actor.id]);
    await db.query(
      "insert into app_private.agent_memory_consent(account_id,accepted,use_in_dialogue,policy_version) "+
      "values($1,$2,false,$3) on conflict(account_id) do update set "+
      "accepted=excluded.accepted,use_in_dialogue=false,"+
      "policy_version=excluded.policy_version,updated_at=now()",
      [actor.id,accepted,AGENT_MEMORY_VERSION]);
    return {consent:accepted,useInDialogue:false,version:AGENT_MEMORY_VERSION,items:[]};
  });
}
export async function saveOwnAgentMemory(config,actor,kind,value) {
  const validated=validateMemoryPreference(kind,value);
  if(!validated)throw new AppError("INVALID_MEMORY_VALUE",400);
  return transaction(config,actor,async db=>{
    const consent=await db.query(
      "select accepted from app_private.agent_memory_consent where account_id=$1 for update",
      [actor.id]);
    if(consent.rows[0]?.accepted!==true)throw new AppError("MEMORY_CONSENT_REQUIRED",403);
    // Insert placeholder and lock the canonical row *within the transaction*.
    // AAD must use actual row id even under concurrent save requests.
    await db.query(
      "insert into app_private.agent_memory_item(account_id,kind,value_ciphertext,policy_version) "+
      "values($1,$2,$3,$4) on conflict(account_id,kind) do nothing",
      [actor.id,kind,"PENDING-CIPHERTEXT",AGENT_MEMORY_VERSION]);
    const row=(await db.query(
      "select id from app_private.agent_memory_item "+
      "where account_id=$1 and kind=$2 for update",
      [actor.id,kind])).rows[0];
    if(!row?.id)throw new AppError("MEMORY_UNAVAILABLE",503);
    const encrypted=seal(validated,secretContext(actor,row.id),config);
    await db.query(
      "update app_private.agent_memory_item set value_ciphertext=$3,updated_at=now() "+
      "where account_id=$1 and id=$2",
      [actor.id,row.id,encrypted]);
    return {kind,value:validated,version:AGENT_MEMORY_VERSION,saved:true};
  });
}
export async function deleteOwnAgentMemory(config,actor,kind) {
  if(!fields.has(kind))throw new AppError("INVALID_MEMORY_KIND",400);
  return transaction(config,actor,async db=>{
    await db.query(
      "delete from app_private.agent_memory_item where account_id=$1 and kind=$2",
      [actor.id,kind]);
    return {deleted:true,kind};
  });
}
export async function eraseAllOwnAgentMemory(config,actor) {
  return transaction(config,actor,async db=>{
    await db.query("delete from app_private.agent_memory_item where account_id=$1",[actor.id]);
    await db.query("delete from app_private.agent_memory_consent where account_id=$1",[actor.id]);
    return {deleted:true,consent:false};
  });
}

/** Separate, durable opt-in for automatic reuse across browser sessions. */
export async function configureOwnAgentMemoryUse(config,actor,enabled) {
  if(typeof enabled!=="boolean")throw new AppError("INVALID_MEMORY_USE",400);
  return transaction(config,actor,async db=>{
    const result=await db.query(
      "update app_private.agent_memory_consent set use_in_dialogue=$2,updated_at=now() "+
      "where account_id=$1 and accepted=true returning use_in_dialogue",
      [actor.id,enabled]);
    if(!result.rows.length)throw new AppError("MEMORY_CONSENT_REQUIRED",403);
    return {consent:true,useInDialogue:enabled,updated:true};
  });
}
