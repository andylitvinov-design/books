import "server-only";
import { transaction } from "@/lib/app/database";
import { operationHash } from "@/lib/app/crypto";
import { AppError } from "@/lib/assessments/contracts";
import { PRACTITIONER_ID } from "@/data/app-services";
import {
  normalizeMonthlySupportOwnerAction, MONTHLY_SUPPORT_TITLE,
  MONTHLY_SUPPORT_PRICE_MINOR, MONTHLY_SUPPORT_SLOTS,
} from "./monthly-support-contract.mjs";

const reject = (code, status = 409) => { throw new AppError(code, status); };
const iso = value => value instanceof Date ? value.toISOString() : value;

async function slotsFor(db, ids) {
  if (!ids.length) return new Map();
  const rows = (await db.query(
    "select program_id,ordinal,scheduled_at,completed_at from app_private.personal_support_slots where program_id = any($1::uuid[]) order by program_id,ordinal",
    [ids])).rows;
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.program_id)) map.set(row.program_id,[]);
    map.get(row.program_id).push({ordinal:row.ordinal,scheduledAt:iso(row.scheduled_at),
      completedAt:iso(row.completed_at)});
  }
  return map;
}
function view(row, list, owner=false) {
  const sessions = list || [];
  const completed = sessions.filter(x => x.completedAt).length;
  return {
    id:row.id,format:row.format,status:row.status,
    phase:row.status === "active" && new Date(row.ends_at).getTime() < Date.now() ? "expired" : row.status,
    priceMinor:MONTHLY_SUPPORT_PRICE_MINOR,currency:"EUR",
    includedSessions:MONTHLY_SUPPORT_SLOTS,completedSessions:completed,
    remainingSessions:Math.max(0,MONTHLY_SUPPORT_SLOTS-completed),
    startsAt:iso(row.starts_at),endsAt:iso(row.ends_at),sessions,
    ...(owner ? {clientAccountId:row.client_account_id,
      referenceCode:row.reference_code || null,
      paymentMethod:row.payment_method,
      verifiedAt:iso(row.verified_at),revision:row.revision} : {}),
  };
}
async function ownerPrograms(db) {
  const rows=(await db.query(
    "select p.*,e.reference_code from app_private.personal_support_programs p left join app.public_service_enquiries e on e.id=p.source_public_enquiry_id where p.practitioner_id=$1 order by p.created_at desc limit 100",
    [PRACTITIONER_ID])).rows;
  const sessions=await slotsFor(db,rows.map(x=>x.id));
  return rows.map(row=>view(row,sessions.get(row.id),true));
}
export async function listMonthlySupportOwner(config,actor) {
  return transaction(config,actor,async db=>({programs:await ownerPrograms(db)}));
}
export async function listMonthlySupportClient(config,actor) {
  return transaction(config,actor,async db=>{
    const rows=(await db.query(
      "select * from app_private.personal_support_programs where client_account_id=$1 order by created_at desc limit 25",
      [actor.id])).rows;
    const sessions=await slotsFor(db,rows.map(row=>row.id));
    return {programs:rows.map(row=>view(row,sessions.get(row.id)))};
  });
}

async function ownedProgram(db,programId) {
  const row=(await db.query(
    "select * from app_private.personal_support_programs where id=$1 and practitioner_id=$2 for update",
    [programId,PRACTITIONER_ID])).rows[0];
  if (!row) reject("PERSONAL_SUPPORT_NOT_FOUND",404);
  return row;
}
export async function changeMonthlySupportOwner(config,actor,raw) {
  let input;
  try { input=normalizeMonthlySupportOwnerAction(raw); }
  catch { reject("PERSONAL_SUPPORT_INVALID_REQUEST",400); }
  return transaction(config,actor,async db=>{
    const practitioner=(await db.query(
      "select id from app.practitioners where id=$1 and trusted_auth_user_id=$2 and active",
      [PRACTITIONER_ID,actor.id])).rows[0];
    if (!practitioner) reject("ACCESS_DENIED",403);
    if (input.action === "activate") {
      const receiptDigest=operationHash({
        scope:"personal-support-receipt-v1",paymentMethod:input.paymentMethod,
        reference:input.receiptReference},config);
      const operationDigest=operationHash({
        kind:"personal-support-activation-v1",operationId:input.operationId,
        sourceEnquiryId:input.sourceEnquiryId,clientAccountId:input.clientAccountId,
        format:input.format,paymentMethod:input.paymentMethod,receiptDigest},config);
      const previous=(await db.query(
        "select * from app_private.personal_support_programs where operation_id=$1 for update",
        [input.operationId])).rows[0];
      if (previous) {
        if (previous.operation_hash!==operationDigest) reject("IDEMPOTENCY_CONFLICT",409);
        return {created:false,program:view(previous,(await slotsFor(db,[previous.id])).get(previous.id),true)};
      }
      const enquiry=(await db.query(
        "select id,service_title,contact_ciphertext from app.public_service_enquiries where id=$1 and recipient_practitioner_id=$2 for share",
        [input.sourceEnquiryId,PRACTITIONER_ID])).rows[0];
      if (!enquiry || enquiry.service_title!==MONTHLY_SUPPORT_TITLE || !enquiry.contact_ciphertext)
        reject("PERSONAL_SUPPORT_ENQUIRY_UNAVAILABLE",404);
      const duplicate=(await db.query(
        "select id from app_private.personal_support_programs where source_public_enquiry_id=$1 or receipt_digest=$2 limit 1",
        [input.sourceEnquiryId,receiptDigest])).rows[0];
      if (duplicate) reject("PERSONAL_SUPPORT_ALREADY_VERIFIED",409);
      // Account eligibility is checked by the narrow DB integrity trigger. This
      // endpoint cannot SELECT another customer's account or bypass private RLS.
      const row=(await db.query(
        "insert into app_private.personal_support_programs (client_account_id,practitioner_id,source_public_enquiry_id,operation_id,operation_hash,format,payment_method,receipt_digest,verified_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",
        [input.clientAccountId,PRACTITIONER_ID,input.sourceEnquiryId,input.operationId,
          operationDigest,input.format,input.paymentMethod,receiptDigest,actor.id])).rows[0];
      for (const ordinal of [1,2]) {
        await db.query("insert into app_private.personal_support_slots (program_id,ordinal) values($1,$2)",[row.id,ordinal]);
      }
      await db.query("insert into app_private.personal_support_events(program_id,actor_id,action) values($1,$2,'payment_manually_attested')",
        [row.id,actor.id]);
      return {created:true,program:view(row,(await slotsFor(db,[row.id])).get(row.id),true)};
    }
    const row=await ownedProgram(db,input.programId);
    if (row.status!=="active") reject("PERSONAL_SUPPORT_NOT_ACTIVE",409);
    if (row.revision!==input.expectedRevision) reject("REVISION_CONFLICT",409);
    if (new Date(row.ends_at).getTime()<Date.now()) reject("PERSONAL_SUPPORT_EXPIRED",409);
    const slot=(await db.query(
      "select * from app_private.personal_support_slots where program_id=$1 and ordinal=$2 for update",
      [row.id,input.ordinal])).rows[0];
    if (!slot) reject("PERSONAL_SUPPORT_SLOT_MISSING",404);
    let action;
    if (input.action === "schedule") {
      const when=new Date(input.scheduledAt).getTime();
      if (slot.completed_at || when<Date.now()-5*60*1000 ||
          when < new Date(row.starts_at).getTime() ||
          when > new Date(row.ends_at).getTime()) reject("PERSONAL_SUPPORT_TIME_INVALID",400);
      await db.query(
        "update app_private.personal_support_slots set scheduled_at=$3,updated_at=now() where program_id=$1 and ordinal=$2",
        [row.id,input.ordinal,input.scheduledAt]);
      action="slot_scheduled";
    } else if (input.action === "complete") {
      if (!slot.scheduled_at || new Date(slot.scheduled_at).getTime()>Date.now())
        reject("PERSONAL_SUPPORT_NOT_OCCURRED",409);
      if (slot.completed_at) return {created:false,program:view(row,(await slotsFor(db,[row.id])).get(row.id),true)};
      await db.query(
        "update app_private.personal_support_slots set completed_at=now(),updated_at=now() where program_id=$1 and ordinal=$2 and completed_at is null",
        [row.id,input.ordinal]);
      action="slot_completed";
    } else reject("PERSONAL_SUPPORT_INVALID_ACTION",400);
    await db.query(
      "update app_private.personal_support_programs set revision=revision+1,updated_at=now() where id=$1",
      [row.id]);
    await db.query(
      "insert into app_private.personal_support_events(program_id,actor_id,action,slot_ordinal) values($1,$2,$3,$4)",
      [row.id,actor.id,action,input.ordinal]);
    const updated=await ownedProgram(db,row.id);
    return {created:false,program:view(updated,(await slotsFor(db,[row.id])).get(row.id),true)};
  });
}
