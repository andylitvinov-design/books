import "server-only";
import { transaction } from "../app/database.js";
import { seal, openSealed } from "../app/crypto.js";
import { AppError, requireUUID } from "../assessments/contracts.js";
import { validateMessageText } from "../crm/messenger-policy.js";
import { assertNoRelayContacts, redactRelayContacts } from "./relay-privacy.mjs";

const context = (clientAccountId,messageId) =>
  ({accountId:clientAccountId,recordId:messageId,field:"personal.support.message"});
const reject=(code,status=409)=>{throw new AppError(code,status);};
const iso=value=>value instanceof Date?value.toISOString():value;

function cleanText(raw){
  try{
    const text=validateMessageText(raw);
    if(text.length>1200)throw Error("INVALID_MESSAGE");
    assertNoRelayContacts(text);
    return text;
  }catch(error){
    reject(error?.message==="CONTACT_EXCHANGE_BLOCKED"?"CONTACT_EXCHANGE_BLOCKED":"INVALID_MESSAGE",400);
  }
}
async function participant(db,actor,id){
  const program=(await db.query(
    "select p.id,p.client_account_id,p.practitioner_id,p.status,p.ends_at,"+
    " r.trusted_auth_user_id,r.active as practitioner_active"+
    " from app_private.personal_support_programs p"+
    " join app.practitioners r on r.id=p.practitioner_id"+
    " where p.id=$1 limit 1",[id])).rows[0];
  if(!program)reject("PERSONAL_SUPPORT_NOT_FOUND",404);
  const client=program.client_account_id===actor.id;
  const owner=program.trusted_auth_user_id===actor.id && program.practitioner_active;
  if(!client&&!owner)reject("PERSONAL_SUPPORT_NOT_FOUND",404);
  return {programId:program.id,accountId:program.client_account_id,
    role:client?"client":"practitioner",
    canReply:program.status==="active"&&new Date(program.ends_at).getTime()>Date.now()};
}
function asMessage(row,scope,actor,config){
  const decrypted=openSealed(row.body_ciphertext,context(scope.accountId,row.id),config);
  return {id:row.id,mine:row.author_account_id===actor.id,
    text:redactRelayContacts(typeof decrypted?.text==="string"?decrypted.text:""),
    sentAt:iso(row.created_at)};
}
export async function listMonthlySupportMessages(config,actor,rawId){
  const id=requireUUID(rawId);
  return transaction(config,actor,async db=>{
    const scope=await participant(db,actor,id);
    const rows=(await db.query(
      "select id,author_account_id,body_ciphertext,created_at"+
      " from app_private.personal_support_messages where program_id=$1"+
      " order by created_at desc,id desc limit 50",[scope.programId])).rows;
    return {programId:scope.programId,canReply:scope.canReply,
      messages:rows.reverse().map(row=>asMessage(row,scope,actor,config))};
  });
}
export async function sendMonthlySupportMessage(config,actor,rawId,rawInput){
  const id=requireUUID(rawId);
  if(!rawInput||typeof rawInput!=="object"||Array.isArray(rawInput)||
     Object.keys(rawInput).some(key=>!["operationId","text"].includes(key)))
    reject("INVALID_MESSAGE",400);
  const operationId=requireUUID(rawInput.operationId);
  const text=cleanText(rawInput.text);
  return transaction(config,actor,async db=>{
    const scope=await participant(db,actor,id);
    // Serialize quota and idempotency checks even under rapid concurrent tabs.
    await db.query(
      "select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["hh-personal-support-message:"+scope.programId]);
    const earlier=(await db.query(
      "select id,program_id,author_account_id,body_ciphertext,created_at"+
      " from app_private.personal_support_messages where id=$1",
      [operationId])).rows[0];
    if(earlier){
      const before=openSealed(earlier.body_ciphertext,context(scope.accountId,operationId),config)?.text;
      if(earlier.program_id!==scope.programId||earlier.author_account_id!==actor.id||before!==text)
        reject("IDEMPOTENCY_CONFLICT",409);
      return {saved:true,duplicate:true,message:asMessage(earlier,scope,actor,config)};
    }
    if(!scope.canReply)reject("PERSONAL_SUPPORT_CONVERSATION_CLOSED",409);
    const daily=(await db.query(
      "select count(*)::int as total from app_private.personal_support_messages"+
      " where program_id=$1 and author_account_id=$2"+
      " and created_at>now()-interval '24 hours'",
      [scope.programId,actor.id])).rows[0]?.total||0;
    if(daily>=30)reject("PERSONAL_SUPPORT_MESSAGE_DAILY_LIMIT",429);
    const cipher=seal({text},context(scope.accountId,operationId),config);
    const inserted=(await db.query(
      "insert into app_private.personal_support_messages"+
      " (id,program_id,author_account_id,body_ciphertext)"+
      " values($1,$2,$3,$4) returning id,author_account_id,body_ciphertext,created_at",
      [operationId,scope.programId,actor.id,cipher])).rows[0];
    return {saved:true,duplicate:false,message:asMessage(inserted,scope,actor,config)};
  });
}
