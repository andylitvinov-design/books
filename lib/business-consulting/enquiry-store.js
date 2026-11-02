import "server-only";
import { randomUUID } from "node:crypto";
import { transaction } from "../app/database.js";
import { seal, openSealed, operationHash } from "../app/crypto.js";
import { AppError, requireUUID } from "../assessments/contracts.js";
import { PRACTITIONER_ID } from "../../data/app-services.js";
import { businessContactFromEnquiry } from "./contact-import.js";
import {smsRecipientFingerprint} from "../crm/sms.js";

const context = id => ({ accountId: PRACTITIONER_ID, recordId: id, field: "business.enquiry" });

/** Anonymous intake: store encrypted opt-in requests under the verified practitioner, not as marketing contacts. */
export async function submitBusinessEnquiry(config, input) {
  const id = randomUUID();
  const payload = { name: input.name, email: input.email, phone: input.phone, question: input.question,
    contactConsent: "business-reply-only-v1", replyChannel: input.replyChannel, attribution: input.attribution };
  const digest = operationHash({ scope: "business-consulting-website-request", operationId: input.operationId }, config);
  return transaction(config, null, async db => {
    const owner = (await db.query(
      "select trusted_auth_user_id as id from app.practitioners where id=$1 and active and status in ('approved','submitted','changes_requested')",
      [PRACTITIONER_ID],
    )).rows[0]?.id;
    if (!owner) throw new AppError("BUSINESS_INTAKE_UNAVAILABLE",503);
    const result = await db.query(
      "insert into app_private.business_consulting_requests " +
      "(id,owner_id,practitioner_id,operation_hash,locale,format,payload_ciphertext) " +
      "values($1,$2,$3,$4,$5,$6,$7) on conflict do nothing",
      [id,owner,PRACTITIONER_ID,digest,input.locale,input.format,seal(payload,context(id),config)],
    );
    return { received: true, duplicate: result.rowCount === 0 };
  }, {inbox:true,practitionerId:PRACTITIONER_ID});
}

/** Owner CRM inbox. Call only inside createCrmRepository.withOwner, after verification. */
export function createBusinessEnquiryStore(db, actor, config) {
  return {
    /** Explicit owner-triggered copying of BUSINESS contact fields, never
     * question/attribution/private reports. Not a marketing consent import.
     * The same authenticated DB transaction later calls store.createContact.
     */
    async businessContactDraft(raw) {
      if(!raw||typeof raw!=='object'||Array.isArray(raw)||
         Object.keys(raw).length!==1||typeof raw.id!=='string')
        throw new AppError('INVALID_BUSINESS_CONTACT_IMPORT',400)
      requireUUID(raw.id)
      const row=(await db.query(
        'select id,locale,payload_ciphertext from app_private.business_consulting_requests '+
        'where id=$1 and owner_id=$2 for update',
        [raw.id,actor.id],
      )).rows[0]
      if(!row)throw new AppError('NOT_FOUND',404)
      const details=openSealed(row.payload_ciphertext,context(row.id),config)
      let draft
      try{draft=businessContactFromEnquiry(details,row.locale)}
      catch(error) {
        throw new AppError(error.message==='BUSINESS_CONTACT_NO_REPLY_PERMISSION'?
          'BUSINESS_CONTACT_NO_REPLY_PERMISSION':'INVALID_BUSINESS_CONTACT_IMPORT',
          error.message==='BUSINESS_CONTACT_NO_REPLY_PERMISSION'?403:400)
      }
      return draft
    },
    async listBusinessEnquiries() {
      const rows = (await db.query(
        "select id,locale,format,status,revision,payload_ciphertext,created_at,updated_at " +
        "from app_private.business_consulting_requests where owner_id=$1 order by created_at desc,id desc limit 100",
        [actor.id],
      )).rows;
      const items=rows.map(row => ({
        id:row.id,locale:row.locale,format:row.format,status:row.status,revision:row.revision,
        createdAt:row.created_at,updatedAt:row.updated_at,
        ...openSealed(row.payload_ciphertext,context(row.id),config),
      }));
      // Any assisted reply is permitted for this enquiry only after owner-
      // scoped suppression checks. A personal phone SMS additionally checks
      // the global Twilio STOP registry; no marketing consent is inferred.
      const eligible=items.filter(item=>item.replyChannel &&
        item.contactConsent==='business-reply-only-v1');
      if(!eligible.length)return items.map(item=>({...item,replyBlocked:true,smsReplyBlocked:true}));
      const sms=eligible.filter(item=>item.replyChannel==='sms'&&item.phone);
      let stopped=new Set(),blockedPhones=new Set(),blockedEmails=new Set(),
        verifiedChecks=false;
      try {
        const phoneHash=phone=>operationHash({
          scope:'crm-phone',owner:actor.id,phone,
        },config);
        const emailHash=email=>operationHash({
          scope:'crm-email',owner:actor.id,email:email.toLowerCase(),
        },config);
        const phoneHashes=[...new Set(eligible.filter(item=>item.phone)
          .map(item=>phoneHash(item.phone)))];
        const emailHashes=[...new Set(eligible.filter(item=>item.email)
          .map(item=>emailHash(item.email)))];
        if(sms.length){
          const stopKeys=[...new Set(sms.map(item=>
            smsRecipientFingerprint(item.phone,config.encryptionKey)))];
          const stopRows=(await db.query(
            'select hash,app_private.crm_sms_is_opted_out(hash) as blocked '+
            'from unnest($1::text[]) as u(hash)',[stopKeys],
          )).rows;
          stopped=new Set(stopRows.filter(x=>x.blocked).map(x=>x.hash));
        }
        const suppressedRows=(await db.query(
          'select phone_hash,email_hash from app.crm_contacts '+
          'where owner_id=$1 and suppressed=true and '+
          '((phone_hash is not null and phone_hash=any($2::text[])) '+
          'or email_hash=any($3::text[]))',
          [actor.id,phoneHashes,emailHashes],
        )).rows;
        blockedPhones=new Set(suppressedRows.map(x=>x.phone_hash).filter(Boolean));
        blockedEmails=new Set(suppressedRows.map(x=>x.email_hash).filter(Boolean));
        verifiedChecks=true;
      }catch {
        // Never offer a manual send if suppression lookup is unavailable.
        // The CRM inbox remains readable; only action links fail closed.
      }
      return items.map(item=>{
        const available=verifiedChecks && item.replyChannel &&
          item.contactConsent==='business-reply-only-v1' &&
          (item.phone||item.email) &&
          !(item.phone&&blockedPhones.has(operationHash({
            scope:'crm-phone',owner:actor.id,phone:item.phone,
          },config))) &&
          !(item.email&&blockedEmails.has(operationHash({
            scope:'crm-email',owner:actor.id,email:item.email.toLowerCase(),
          },config)));
        const smsAllowed=available && item.replyChannel==='sms'&&item.phone &&
          !stopped.has(smsRecipientFingerprint(item.phone,config.encryptionKey));
        return {...item,replyBlocked:!available,smsReplyBlocked:!smsAllowed};
      });
    },
    async updateBusinessEnquiry(raw) {
      if (!raw || typeof raw!=="object" || Array.isArray(raw) ||
        Object.keys(raw).some(key=>!["id","status","expectedRevision"].includes(key)) ||
        !["new","contacted","booked","closed"].includes(raw.status) ||
        !Number.isSafeInteger(raw.expectedRevision) || raw.expectedRevision < 0)
        throw new AppError("INVALID_BUSINESS_LEAD",400);
      requireUUID(raw.id);
      const current=(await db.query(
        "select status,revision from app_private.business_consulting_requests where id=$1 and owner_id=$2 for update",
        [raw.id,actor.id],
      )).rows[0];
      if(!current) throw new AppError("NOT_FOUND",404);
      if(current.revision!==raw.expectedRevision) throw new AppError("CONFLICT",409);
      const result=(await db.query(
        "update app_private.business_consulting_requests set status=$3,revision=revision+1,updated_at=now() " +
        "where id=$1 and owner_id=$2 returning revision,status,updated_at",
        [raw.id,actor.id,raw.status],
      )).rows[0];
      return {id:raw.id,revision:result.revision,status:result.status,updatedAt:result.updated_at};
    },
  };
}
