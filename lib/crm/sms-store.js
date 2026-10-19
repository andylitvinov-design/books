import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { openSealed, seal } from '../app/crypto.js'
import { marketingEligibility } from './consent.js'
import { smsRecipientFingerprint, validateSmsBody } from './sms.js'

const contactContext=(owner,id)=>({accountId:owner,recordId:id,field:'crm.contact'})
const jobContext=(owner,id)=>({accountId:owner,recordId:id,field:'crm.sms_job'})
const evidenceEvent=row=>({
  id:row.id,contactId:row.contact_id,channel:row.channel,purpose:row.purpose,
  decision:row.decision,occurredAt:new Date(row.occurred_at).toISOString(),
  source:row.source,textVersion:row.text_version,actorKind:row.actor_kind,
})

// Intended for createCrmRepository.withOwner ONLY: same authenticated PostgreSQL
// transaction + SET LOCAL ROLE hh_crm_backend + FORCE RLS policies.
export function createSmsStore(db,actor,config) {
  async function contactForUpdate(id) {
    requireUUID(id)
    const row=(await db.query(
      'select id,contact_ciphertext,locale,lifecycle,suppressed from app.crm_contacts where id=$1 and owner_id=$2 for update',
      [id,actor.id],
    )).rows[0]
    if(!row)throw new AppError('NOT_FOUND',404)
    const details=openSealed(row.contact_ciphertext,contactContext(actor.id,row.id),config)
    return {...row,phone:details.phone}
  }
  async function latestConsent(contact) {
    const events=(await db.query(
      "select id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind " +
      "from app.crm_consent_ledger where owner_id=$1 and contact_id=$2 and channel='sms' " +
      "and purpose='product_updates' order by occurred_at desc,recorded_at desc limit 300",
      [actor.id,contact.id],
    )).rows.map(evidenceEvent)
    const result=marketingEligibility({
      contactId:contact.id,channel:'sms',events,
      suppressed:contact.suppressed,verifiedAddress:!!contact.phone,
    })
    if(!result.allowed)return result
    const hash=smsRecipientFingerprint(contact.phone,config.encryptionKey)
    const blocked=(await db.query(
      'select app_private.crm_sms_is_opted_out($1) as blocked',[hash],
    )).rows[0]?.blocked
    return blocked?{allowed:false,reason:'opted_out'}:{...result,recipientHash:hash}
  }
  return {
    async listSmsEligibility(contacts) {
      if(!contacts.length)return []
      const ids=contacts.map(c=>c.id)
      const rows=(await db.query(
        "select id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind " +
        "from app.crm_consent_ledger where owner_id=$1 and contact_id=any($2::uuid[]) " +
        "and channel='sms' and purpose='product_updates'",
        [actor.id,ids],
      )).rows
      const grouped=new Map()
      const phones=contacts.filter(c=>c.phone).map(c=>smsRecipientFingerprint(c.phone,config.encryptionKey))
      const blockedRows=phones.length?(await db.query(
        'select hash,app_private.crm_sms_is_opted_out(hash) as blocked from unnest($1::text[]) as u(hash)',
        [phones],
      )).rows:[]
      const optouts=new Set(blockedRows.filter(r=>r.blocked).map(r=>r.hash))
      for(const row of rows){
        if(!grouped.has(row.contact_id))grouped.set(row.contact_id,[])
        grouped.get(row.contact_id).push(evidenceEvent(row))
      }
      return contacts.map(contact=>{
        const eligibility=marketingEligibility({
          contactId:contact.id,channel:'sms',events:grouped.get(contact.id)||[],
          suppressed:contact.suppressed,verifiedAddress:!!contact.phone,
        })
        return {...contact,smsEligibility:contact.phone &&
          optouts.has(smsRecipientFingerprint(contact.phone,config.encryptionKey))
          ?{allowed:false,reason:'opted_out'}:eligibility}
      })
    },
    async reserveSms(input) {
      requireUUID(input.requestId)
      requireUUID(input.contactId)
      const text=validateSmsBody({body:input.body})
      // Serializes a repeated request ID across tabs, serverless instances and retries.
      await db.query('select pg_advisory_xact_lock(hashtext($1))',[actor.id+':sms:'+input.requestId])
      const prior=(await db.query(
        'select id,contact_id,status,payload_ciphertext from app.crm_sms_jobs where id=$1 and owner_id=$2',
        [input.requestId,actor.id],
      )).rows[0]
      if(prior){
        const old=openSealed(prior.payload_ciphertext,jobContext(actor.id,prior.id),config)
        if(prior.contact_id!==input.contactId||old.body!==text.body)throw new AppError('CONFLICT',409)
        return {id:prior.id,status:prior.status,duplicate:true}
      }
      const contact=await contactForUpdate(input.contactId)
      if(contact.lifecycle==='archived'||contact.suppressed||!contact.phone)
        throw new AppError('SMS_CONTACT_BLOCKED',403)
      if(input.testPhone&&contact.phone!==input.testPhone)
        throw new AppError('SMS_PILOT_ONLY',403)
      const consent=await latestConsent(contact)
      if(!consent.allowed)throw new AppError('SMS_CONSENT_REQUIRED',403)
      const quota=(await db.query(
        "select count(*)::int as total from app.crm_sms_jobs where owner_id=$1 and created_at>now()-interval '24 hours'",
        [actor.id],
      )).rows[0]?.total || 0
      if(quota>=10)throw new AppError('SMS_DAILY_LIMIT',429)
      // Never send a repeated message to this contact from a different tab by accident.
      const recent=(await db.query(
        "select id,payload_ciphertext,status from app.crm_sms_jobs where owner_id=$1 and contact_id=$2 " +
        "and created_at>now()-interval '5 minutes' and status not in ('blocked','failed','undelivered') " +
        "order by created_at desc limit 10",
        [actor.id,input.contactId],
      )).rows
      for(const item of recent){
        if(openSealed(item.payload_ciphertext,jobContext(actor.id,item.id),config).body===text.body)
          throw new AppError('SMS_RECENT_DUPLICATE',409)
      }
      const payload=seal({body:text.body,formatted:text.formatted},jobContext(actor.id,input.requestId),config)
      await db.query(
        'insert into app.crm_sms_jobs(id,owner_id,contact_id,consent_event_id,payload_ciphertext,recipient_hash,segments) ' +
        'values($1,$2,$3,$4,$5,$6,$7)',
        [input.requestId,actor.id,input.contactId,consent.consentEventId,payload,consent.recipientHash,text.segments],
      )
      return {id:input.requestId,duplicate:false,segments:text.segments}
    },
    async claimSms(requestId) {
      requireUUID(requestId)
      const job=(await db.query(
        'select id,contact_id,recipient_hash,payload_ciphertext,status from app.crm_sms_jobs where id=$1 and owner_id=$2 for update',
        [requestId,actor.id],
      )).rows[0]
      if(!job||job.status!=='reserved')return {allowed:false}
      const contact=await contactForUpdate(job.contact_id)
      const consent=await latestConsent(contact)
      if(!consent.allowed||consent.recipientHash!==job.recipient_hash||contact.lifecycle==='archived'){
        await db.query(
          "update app.crm_sms_jobs set status='blocked',completed_at=now() where id=$1 and owner_id=$2",
          [job.id,actor.id],
        )
        return {allowed:false}
      }
      await db.query(
        "update app.crm_sms_jobs set status='dispatching' where id=$1 and owner_id=$2 and status='reserved'",
        [job.id,actor.id],
      )
      return {allowed:true,to:contact.phone,
        text:openSealed(job.payload_ciphertext,jobContext(actor.id,job.id),config).formatted}
    },
    async finishSms(id,status,providerId=null){
      requireUUID(id)
      if(!['accepted','unknown'].includes(status))throw new AppError('INVALID_SMS_STATUS',400)
      const row=(await db.query(
        "update app.crm_sms_jobs set status=$1,provider_id=$2,completed_at=now() " +
        "where id=$3 and owner_id=$4 and status='dispatching' returning id",
        [status,providerId,id,actor.id],
      )).rows[0]
      if(row&&providerId)await db.query('select app_private.crm_sms_reconcile($1,$2)',[id,actor.id])
      return {id,status}
    },
    async listSmsMessages(){
      const rows=(await db.query(
        'select id,contact_id,status,segments,created_at,completed_at from app.crm_sms_jobs ' +
        'where owner_id=$1 order by created_at desc,id desc limit 100',[actor.id],
      )).rows
      return rows.map(r=>({id:r.id,contactId:r.contact_id,status:r.status,
        segments:r.segments,createdAt:r.created_at,completedAt:r.completed_at}))
    },
  }
}
