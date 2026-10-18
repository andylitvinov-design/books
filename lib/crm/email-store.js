import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { openSealed, seal } from '../app/crypto.js'
import { marketingEligibility } from './consent.js'
import { validateEmailMessage } from './email.js'

// Restricted to the same authenticated, owner-scoped DB transaction as CRM contacts.
export function createEmailStore(db, actor, config) {
  const scope = { accountId: actor.id, field: 'crm.contact' }
  async function getContact(contactId) {
    requireUUID(contactId)
    const row = (await db.query(
      'select id,contact_ciphertext,locale,lifecycle,email_verified,suppressed,revision from app.crm_contacts where id=$1 and owner_id=$2 for update',
      [contactId, actor.id],
    )).rows[0]
    if (!row) throw new AppError('NOT_FOUND', 404)
    const details = openSealed(row.contact_ciphertext, { ...scope, recordId: row.id }, config)
    return { ...row, email: details.email }
  }
  async function emailConsent(contact, verified = contact.email_verified) {
    const rows = (await db.query(
      "select id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind from app.crm_consent_ledger where owner_id=$1 and contact_id=$2 and channel='email' and purpose='product_updates' order by occurred_at desc,recorded_at desc limit 300",
      [actor.id, contact.id],
    )).rows
    const events = rows.map(row => ({
      id: row.id, contactId: row.contact_id, channel: row.channel, purpose: row.purpose,
      decision: row.decision, occurredAt: new Date(row.occurred_at).toISOString(),
      source: row.source, textVersion: row.text_version, actorKind: row.actor_kind,
    }))
    return marketingEligibility({ contactId: contact.id, channel: 'email',
      events, suppressed: contact.suppressed, verifiedAddress: verified })
  }
  return {
    async listEmailEligibility(contacts) {
      if (!contacts.length) return []
      const ids = contacts.map(c => c.id)
      const rows = (await db.query(
        "select id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind from app.crm_consent_ledger where owner_id=$1 and contact_id=any($2::uuid[]) and channel='email' and purpose='product_updates'",
        [actor.id, ids],
      )).rows
      const byContact = new Map()
      for (const row of rows) {
        const event = { id: row.id,contactId:row.contact_id,channel:row.channel,purpose:row.purpose,
          decision:row.decision,occurredAt:new Date(row.occurred_at).toISOString(),source:row.source,
          textVersion:row.text_version,actorKind:row.actor_kind }
        if (!byContact.has(row.contact_id)) byContact.set(row.contact_id, [])
        byContact.get(row.contact_id).push(event)
      }
      return contacts.map(contact => {
        const events = byContact.get(contact.id) || []
        const evidence = marketingEligibility({contactId:contact.id,channel:'email',events,
          suppressed:contact.suppressed,verifiedAddress:true})
        const current = marketingEligibility({contactId:contact.id,channel:'email',events,
          suppressed:contact.suppressed,verifiedAddress:contact.emailVerified})
        return { ...contact, emailConsentReady:evidence.allowed, emailEligibility:current }
      })
    },
    async reserveVerification(contactId, tokenDigest) {
      const contact = await getContact(contactId)
      if (!contact.email) throw new AppError('EMAIL_ADDRESS_REQUIRED',400)
      if (contact.lifecycle === 'archived' || contact.suppressed) throw new AppError('EMAIL_CONTACT_BLOCKED',403)
      if (contact.email_verified) throw new AppError('EMAIL_ALREADY_VERIFIED',409)
      const check = await emailConsent(contact, true)
      if (!check.allowed) throw new AppError('EMAIL_CONSENT_REQUIRED',403)
      const recent = (await db.query(
        "select id from app.crm_email_tokens where owner_id=$1 and contact_id=$2 and kind='verify' and created_at>now()-interval '24 hours' limit 1",
        [actor.id, contactId],
      )).rows[0]
      if (recent) throw new AppError('EMAIL_VERIFICATION_RECENT',429)
      const id = randomUUID()
      await db.query(
        "insert into app.crm_email_tokens(id,owner_id,contact_id,kind,token_hash,expires_at) values($1,$2,$3,'verify',$4,now()+interval '7 days')",
        [id,actor.id,contactId,tokenDigest],
      )
      return { id, email:contact.email, locale:contact.locale }
    },
    async finishVerification(id, status, providerId) {
      requireUUID(id)
      if (!['accepted','unknown'].includes(status)) throw new AppError('INVALID_EMAIL_STATUS',400)
      await db.query(
        "update app.crm_email_tokens set status=$1,provider_id=$2 where id=$3 and owner_id=$4 and kind='verify' and status='reserved'",
        [status,providerId,id,actor.id],
      )
      return { id, status }
    },
    async reserveMessage(input, unsubscribeDigest) {
      requireUUID(input.requestId)
      requireUUID(input.contactId)
      const payload = validateEmailMessage({ subject:input.subject, body:input.body })
      const old = (await db.query(
        'select id,status from app.crm_email_jobs where id=$1 and owner_id=$2',
        [input.requestId,actor.id],
      )).rows[0]
      if (old) return { duplicate:true, id:old.id,status:old.status }
      const contact = await getContact(input.contactId)
      if (contact.lifecycle === 'archived' || contact.suppressed || !contact.email_verified)
        throw new AppError('EMAIL_CONTACT_BLOCKED',403)
      const eligible = await emailConsent(contact)
      if (!eligible.allowed) throw new AppError('EMAIL_CONSENT_REQUIRED',403)
      const quota = (await db.query(
        "select count(*)::int as used from app.crm_email_jobs where owner_id=$1 and created_at>now()-interval '24 hours'",
        [actor.id],
      )).rows[0]?.used || 0
      if (quota >= 20) throw new AppError('EMAIL_DAILY_LIMIT',429)
      const ciphertext = seal(payload,{accountId:actor.id,recordId:input.requestId,field:'crm.email_job'},config)
      const tokenId = randomUUID()
      await db.query(
        "insert into app.crm_email_tokens(id,owner_id,contact_id,kind,token_hash) values($1,$2,$3,'unsubscribe',$4)",
        [tokenId,actor.id,contact.id,unsubscribeDigest],
      )
      await db.query(
        "insert into app.crm_email_jobs(id,owner_id,contact_id,consent_event_id,payload_ciphertext) values($1,$2,$3,$4,$5)",
        [input.requestId,actor.id,contact.id,eligible.consentEventId,ciphertext],
      )
      return { duplicate:false,id:input.requestId,tokenId }
    },
    async claimMessage(requestId) {
      requireUUID(requestId)
      const job = (await db.query(
        "select id,contact_id,payload_ciphertext,status from app.crm_email_jobs where id=$1 and owner_id=$2 for update",
        [requestId,actor.id],
      )).rows[0]
      if (!job || job.status !== 'reserved') return {allowed:false}
      const contact = await getContact(job.contact_id)
      const eligibility = await emailConsent(contact)
      if (contact.suppressed || contact.lifecycle==='archived' || !contact.email_verified || !eligibility.allowed) {
        await db.query(
          "update app.crm_email_jobs set status='blocked',completed_at=now() where id=$1 and owner_id=$2",
          [job.id,actor.id],
        )
        return {allowed:false}
      }
      await db.query(
        "update app.crm_email_jobs set status='dispatching' where id=$1 and owner_id=$2 and status='reserved'",
        [job.id,actor.id],
      )
      return {allowed:true,to:contact.email,locale:contact.locale,
        content:openSealed(job.payload_ciphertext,{accountId:actor.id,recordId:job.id,field:'crm.email_job'},config)}
    },
    async finishMessage(id,status,providerId=null) {
      requireUUID(id)
      if (!['accepted','unknown'].includes(status)) throw new AppError('INVALID_EMAIL_STATUS',400)
      await db.query(
        "update app.crm_email_jobs set status=$1,provider_id=$2,completed_at=now() where id=$3 and owner_id=$4 and status='dispatching'",
        [status,providerId,id,actor.id],
      )
      return { id,status }
    },
    async listEmailMessages() {
      const rows = (await db.query(
        'select id,contact_id,status,created_at,completed_at from app.crm_email_jobs where owner_id=$1 order by created_at desc,id desc limit 100',
        [actor.id],
      )).rows
      return rows.map(x=>({id:x.id,contactId:x.contact_id,status:x.status,createdAt:x.created_at,completedAt:x.completed_at}))
    },
  }
}
