import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { normalizeEnquiryAttribution } from '../analytics/enquiry-attribution.mjs'
import { operationHash, seal, openSealed } from '../app/crypto.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { normalizePublicServiceEnquiry, publicEnquiryReference } from './public-service-enquiry-input.mjs'
import { crmEnabled } from '../crm/repository.js'
import { websiteMessengerOnly } from '../crm/website-messenger-only.mjs'
import { BOOKABLE_SKUS, validConfirmedSlot } from './public-session-booking.mjs'
import { relayContactView, redactRelayContacts } from './relay-privacy.mjs'

export function buildPublicEnquiryInsert(values,attribution=null,hasAttributionColumn=false,verifiedOfferingId=null,linkedTelegram=null){
  if(!Array.isArray(values)||values.length!==11)throw new TypeError('Invalid public enquiry insert')
  const extraColumn=hasAttributionColumn?',attribution':''
  const extraValue=hasAttributionColumn?',$12::jsonb':''
  const offeringColumn=verifiedOfferingId?',service_offering_id':''
  const offeringValue=verifiedOfferingId?(hasAttributionColumn?',$13::uuid':',$12::uuid'):''
  const linkColumn=linkedTelegram?',telegram_thread_id,telegram_handoff_digest':''
  const linkIndex=12+(hasAttributionColumn?1:0)+(verifiedOfferingId?1:0)
  const linkValue=linkedTelegram?',$'+linkIndex+',$'+(linkIndex+1):''
  return {text:`insert into app.public_service_enquiries
    (id,recipient_practitioner_id,service_title,source_path,locale,reference_code,
     description_ciphertext,contact_ciphertext,operation_id,operation_hash,booking_sku${extraColumn}${offeringColumn}${linkColumn})
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11${extraValue}${offeringValue}${linkValue}) returning created_at`,
    values:[...values,...(hasAttributionColumn?[attribution?JSON.stringify(attribution):null]:[]),
      ...(verifiedOfferingId?[verifiedOfferingId]:[]),
       ...(linkedTelegram?[linkedTelegram.threadId,linkedTelegram.digest]:[])]}
}

const enc = (practitionerId, recordId, field) => ({ accountId: practitionerId, recordId, field })
const notFound = () => { throw new AppError('NOT_FOUND', 404) }

export function publicServiceEnquiryView(row, config) {
  const manuallyRecorded = row.contact_ciphertext
    ? openSealed(row.contact_ciphertext, enc(row.recipient_practitioner_id, row.id, 'public_lead.contact'), config) : null
  return {
    id: row.id,
    requestKind: 'public',
    serviceId: row.service_offering_id||null,
    serviceTitle: row.service_title,
    practitionerId: row.recipient_practitioner_id,
    // Each unverified anonymous enquiry is separate until identity is established by an approved channel.
    clientKey: 'request:' + row.id,
    status: row.status,
    bookingSku: row.booking_sku || null,
    bookingStartsAt: row.status === 'booked' && row.booking_starts_at ? new Date(row.booking_starts_at).toISOString() : null,
    bookingConfirmedAt: row.booking_confirmed_at ? new Date(row.booking_confirmed_at).toISOString() : null,
    revision: row.revision,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    referenceCode: row.reference_code,
    sourcePath: row.source_path,
    attribution: normalizeEnquiryAttribution(row.attribution),
    locale: row.locale,
    contactPending: !manuallyRecorded&&!row.telegram_thread_id,
    ...(row.telegram_thread_id?{telegramThreadId:row.telegram_thread_id}:{}),
    contactProvenance: row.telegram_thread_id?'consented_telegram_thread':
      row.contact_channel==='telegram'&&/^[a-f0-9]{64}$/.test(String(row.telegram_handoff_digest||''))&&
        manuallyRecorded?.replyConsent==='tg_business_single_enquiry_v1'
        ? 'verified_telegram_business_request' :
      manuallyRecorded?.submittedByVisitor === true
      ? 'visitor_submitted_unverified' : manuallyRecorded ? 'practitioner_recorded_unverified' : 'pending',
    contact: relayContactView(manuallyRecorded || { displayName: 'Client' }),
    // Never serialize visitor email or phone in the shared assigned-master
    // view. Even explicit one-off consent is NOT authorization to disclose
    // contact details to every practitioner; only the operator CRM can read it.
    message: redactRelayContacts(openSealed(row.description_ciphertext, enc(row.recipient_practitioner_id, row.id, 'public_lead.message'), config)),
    sharedExcerpt: null,
    messageCount: 0,
    lastMessageAt: null,
  }
}

export async function createPublicServiceEnquiry(config, rawInput, attribution = null, {linkedTelegram=null}={}) {
  let input
  try { input = normalizePublicServiceEnquiry(rawInput) }
  catch { throw new AppError('INVALID_SERVICE_ENQUIRY', 400) }
  const { operationId, serviceTitle, serviceOfferingId = null, description, sourcePath, locale, contact, bookingSku = null } = input
  if ((contact||linkedTelegram) && !crmEnabled()) throw new AppError('CRM_UNAVAILABLE', 503)
  if (linkedTelegram && (
    !/^\/(en|ru|es)\/coaching\/intake$/.test(sourcePath) ||
    typeof linkedTelegram.digest!=='string' || !/^[a-f0-9]{64}$/.test(linkedTelegram.digest) ||
    linkedTelegram.locale!==locale
  )) throw new AppError('INVALID_TELEGRAM_HANDOFF',409)
  if (websiteMessengerOnly() && !linkedTelegram) throw new AppError('MESSENGER_VERIFICATION_REQUIRED',428)
  const cleanAttribution = normalizeEnquiryAttribution(attribution)
  const digest = linkedTelegram
    ? operationHash({...input,telegramHandoffDigest:linkedTelegram.digest},config)
    : operationHash(input, config)
  return transaction(config, null, async db => {
    // Public API has no authenticated account. Only the matching unguessable UUID
    // can be read for idempotency; RLS never exposes practitioner client rows.
    await db.query("select set_config('hh.public_enquiry_operation',$1,true)", [operationId])
    // Serialize concurrent retries before reading the existing operation.
    await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", ['public-enquiry:' + operationId])
    const prior = (await db.query(
      "select id,reference_code,operation_hash,created_at,to_jsonb(e)->'attribution' as attribution from app.public_service_enquiries e where operation_id=$1",
      [operationId],
    )).rows[0]
    if (prior) {
      if (prior.operation_hash !== digest) throw new AppError('IDEMPOTENCY_CONFLICT', 409)
      return { id: prior.id, referenceCode: prior.reference_code, saved: true, contactPending: !contact&&!linkedTelegram, createdAt: new Date(prior.created_at).toISOString(), attributionStatus: prior.attribution?'saved':'not_recorded' }
    }
    const practitioner = (await db.query(
      "select id,trusted_auth_user_id as owner_id from app.practitioners where id=$1 and active and status in ('approved','submitted','changes_requested') and public_profile<>'{}'::jsonb",
      [PRACTITIONER_ID],
    )).rows[0]
    if (!practitioner || ((contact||linkedTelegram) && !practitioner.owner_id)) throw new AppError('PRACTICE_UNAVAILABLE', 503)
    if (linkedTelegram) {
      if (linkedTelegram.ownerId !== practitioner.owner_id)
        throw new AppError('INVALID_TELEGRAM_HANDOFF',409)
      // Re-check the exact still-consented customer at submission, not only
      // the encrypted 60-minute bearer token issued in the signed webhook.
      await db.query("select set_config('hh.coaching_handoff_owner',$1,true)",[linkedTelegram.ownerId])
      await db.query("select set_config('hh.coaching_handoff_thread',$1,true)",[linkedTelegram.threadId])
      await db.query("select set_config('hh.coaching_handoff_user',$1,true)",[linkedTelegram.userHash])
      const thread=(await db.query(
        'select contact_id from app.crm_msg_threads where id=$1 and owner_id=$2 and user_hash=$3 and not suppressed limit 1',
        [linkedTelegram.threadId,linkedTelegram.ownerId,linkedTelegram.userHash],
      )).rows[0]
      if(!thread)throw new AppError('TELEGRAM_HANDOFF_REVOKED',409)
      await db.query("select set_config('hh.coaching_handoff_contact',$1,true)",[thread.contact_id])
      const activeContact=(await db.query(
        'select id from app.crm_contacts where id=$1 and owner_id=$2 and not suppressed limit 1',
        [thread.contact_id,linkedTelegram.ownerId],
      )).rows[0]
      if(!activeContact)throw new AppError('TELEGRAM_HANDOFF_REVOKED',409)
      await db.query("select set_config('hh.coaching_handoff_business',$1,true)",[linkedTelegram.businessHash])
      const session=(await db.query(
        "select stage from app_private.crm_tg_diagnostic_sessions where business_hash=$1 and user_hash=$2 and stage='done' and consent_at is not null limit 1",
        [linkedTelegram.businessHash,linkedTelegram.userHash],
      )).rows[0]
      if(!session)throw new AppError('TELEGRAM_HANDOFF_REVOKED',409)
    }
    // Resolve the offering SERVER-SIDE; a public title, URL or browser UUID
    // never authorizes ownership or assignment. Legacy free-form enquiries
    // remain valid but unlinked if no one published offering matches exactly.
    const offerings=(await db.query(
      `select id from app.service_offerings where practitioner_id=$1 and active=true
         and status='published' and (localized_copy->$2->>'title')=$3
         ${serviceOfferingId?'and id=$4::uuid':''} order by id limit 2`,
      serviceOfferingId?[PRACTITIONER_ID,locale,serviceTitle,serviceOfferingId]:
        [PRACTITIONER_ID,locale,serviceTitle]
    )).rows
    if(serviceOfferingId && offerings.length!==1)
      throw new AppError('SERVICE_OFFERING_NOT_VERIFIED',409)
    const verifiedOfferingId=offerings.length===1?offerings[0].id:null
    const id = randomUUID()
    const referenceCode = publicEnquiryReference(id)
    const supportsAttribution = cleanAttribution && (await db.query(
      "select exists(select 1 from information_schema.columns where table_schema='app' " +
      "and table_name='public_service_enquiries' and column_name='attribution') as supported",
    )).rows[0]?.supported === true
    const insert=buildPublicEnquiryInsert(
      [id, PRACTITIONER_ID, serviceTitle, sourcePath, locale, referenceCode,
        seal(description, enc(PRACTITIONER_ID, id, 'public_lead.message'), config),
        contact ? seal({
          displayName: contact.displayName, email: contact.email, phone: contact.phone,
          submittedByVisitor: true, replyConsent: 'website_reply_only_v1',
        }, enc(PRACTITIONER_ID, id, 'public_lead.contact'), config) : null,
        operationId, digest, bookingSku], cleanAttribution, supportsAttribution, verifiedOfferingId, linkedTelegram,
    )
    // Guest RLS permits INSERT for this operation, not a subsequent UPDATE.
    let inserted
    try { inserted=await db.query(insert.text,insert.values) }
    catch (error) {
      if (error?.code==='23505' && linkedTelegram)
        throw new AppError('TELEGRAM_HANDOFF_ALREADY_USED',409)
      throw error
    }
    if(inserted.rowCount!==1||!inserted.rows[0]?.created_at)throw new AppError('REQUEST_FAILED',500)
    if (contact&&!linkedTelegram) {
      // An unverified CRM lead is visible immediately to the practitioner.
      // No recipient lookup or overwrite: an existing/suppressed contact wins.
      // Both writes commit together; an insert failure rolls back the enquiry.
      const ownerId = practitioner.owner_id
      const crmId = randomUUID()
      const emailHash = contact.email
        ? operationHash({ scope: 'crm-email', owner: ownerId, email: contact.email }, config)
        : operationHash({ scope: 'crm-email-less-contact', owner: ownerId, contactId: crmId }, config)
      const phoneHash = contact.phone
        ? operationHash({ scope: 'crm-phone', owner: ownerId, phone: contact.phone }, config) : null
      const crmCiphertext = seal({
        displayName: contact.displayName, email: contact.email, phone: contact.phone,
        enquiry: { referenceCode, serviceTitle, sourcePath },
      }, { accountId: ownerId, recordId: crmId, field: 'crm.contact' }, config)
      const contactInsert=await db.query(
        `insert into app.crm_contacts
         (id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source)
         values($1,$2,$3,$4,$5,$6,'lead',$7) on conflict do nothing`,
        [crmId,ownerId,crmCiphertext,emailHash,phoneHash,locale,contact.source],
      )
      // Explicit request -> newly-created unverified CRM lead, in the SAME
      // transaction. Never attach a guest request to an existing contact by
      // unverified email/phone: conflict means identity remains unresolved.
      // No external messenger identity or marketing consent is implied.
      if (contactInsert.rowCount === 1) {
        const linked=await db.query(
          `insert into app_private.public_enquiry_contact_links
             (enquiry_id,owner_id,contact_id,evidence)
           values($1,$2,$3,'created_from_this_enquiry')`,
          [id,ownerId,crmId],
        )
        if (linked.rowCount !== 1) throw new AppError('CRM_LINK_FAILED',503)
      }
    }
    if(contact){
      const ownerId=practitioner.owner_id
      // An owner alert is optional transport, but the intent must be durable:
      // transactionally record it with this consented, contact-bearing enquiry.
      const noticeIntent=await db.query(
        'insert into app_private.notification_public_enquiry_intents (enquiry_id,owner_id) values($1,$2)',
        [id,ownerId],
      )
      if(noticeIntent.rowCount!==1)throw new AppError('CRM_NOTICE_INTENT_FAILED',503)
    }
    return { id, referenceCode, saved: true, contactPending: !contact&&!linkedTelegram,
      serviceOfferingId:verifiedOfferingId,
      createdAt:new Date(inserted.rows[0].created_at).toISOString(),
      attributionStatus:cleanAttribution?(supportsAttribution?'saved':'unavailable'):'not_provided' }
  }, { server: true })
}

export async function listPublicServiceEnquiries(db, practitionerId, config) {
  requireUUID(practitionerId)
  const rows = (await db.query(
    'select * from app.public_service_enquiries where recipient_practitioner_id=$1 order by created_at desc,id desc limit 250',
    [practitionerId],
  )).rows
  return rows.map(row => publicServiceEnquiryView(row, config))
}

export async function updatePublicServiceEnquiry(db, practitionerId, id, input, config) {
  requireUUID(id)
  const row = (await db.query(
    'select * from app.public_service_enquiries where id=$1 and recipient_practitioner_id=$2 for update',
    [id, practitionerId],
  )).rows[0]
  if (!row) notFound()
  if (row.revision !== input.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
  if (input.action === 'confirm_booking') {
    if (Object.keys(input).some(key => !['action','confirmedStartAt','expectedRevision'].includes(key)) ||
        row.revision !== input.expectedRevision || !row.booking_sku || !row.contact_ciphertext ||
        !['requested','contacted'].includes(row.status)) throw new AppError('INVALID_BOOKING_ACTION', 409)
    const startAt = validConfirmedSlot(input.confirmedStartAt)
    if (!startAt) throw new AppError('INVALID_BOOKING_TIME', 400)
    // Practitioner-level lock serializes overlapping confirmations.
    await db.query('select id from app.practitioners where id=$1 for update', [practitionerId])
    const overlap = (await db.query(
      "select id from app.public_service_enquiries " +
      "where recipient_practitioner_id=$1 and id<>$2 and status='booked' " +
      "and booking_starts_at < $3::timestamptz + ($4 * interval '1 minute') " +
      "and booking_starts_at + " +
      "((case booking_sku when 'express-consultation-30' then 30 else 60 end) * interval '1 minute') " +
      "> $3::timestamptz limit 1",
      [practitionerId, id, startAt, BOOKABLE_SKUS[row.booking_sku]],
    )).rows[0]
    // The existing remote-support calendar also belongs to this practitioner.
    const remoteOverlap = (await db.query(
      "select id from app.consultation_requests " +
      "where recipient_practitioner_id=$1 and remote_booking is not null " +
      "and status in ('confirmed','in_progress') " +
      "and (remote_booking->>'startsAt')::timestamptz " +
      "< $2::timestamptz + ($3 * interval '1 minute') " +
      "and (remote_booking->>'startsAt')::timestamptz " +
      "+ ((remote_booking->>'duration')::int * interval '1 minute') " +
      "> $2::timestamptz limit 1",
      [practitionerId, startAt, BOOKABLE_SKUS[row.booking_sku]],
    )).rows[0]
    if (overlap || remoteOverlap) throw new AppError('SLOT_UNAVAILABLE', 409)
    const confirmed = (await db.query(
      "update app.public_service_enquiries set status='booked', " +
      "booking_starts_at=$3,booking_confirmed_at=now(),revision=revision+1,updated_at=now() " +
      "where id=$1 and recipient_practitioner_id=$2 returning *",
      [id, practitionerId, startAt],
    )).rows[0]
    return publicServiceEnquiryView(confirmed, config)
  }
  if (input.action === 'record_contact') {
    if (Object.keys(input).some(key => !['action','channel','address','expectedRevision'].includes(key)))
      throw new AppError('INVALID_REQUEST', 400)
    const channel = input.channel
    const address = typeof input.address === 'string' ? input.address.trim() : ''
    const valid = channel === 'whatsapp'
      ? /^\+?[0-9 ()-]{8,28}$/.test(address) && address.replace(/\D/g,'').length >= 8
      : channel === 'telegram' && /^@[A-Za-z0-9_]{5,32}$/.test(address)
    if (!valid) throw new AppError('INVALID_CONTACT', 400)
    const existing = row.contact_ciphertext
      ? openSealed(row.contact_ciphertext, enc(practitionerId, id, 'public_lead.contact'), config) : null
    const contact = {
      ...(existing || {}),
      // A practitioner-entered address is not visitor consent. Revoke the
      // original one-off provenance before resealing any manually changed contact.
      submittedByVisitor: false,
      replyConsent: null,
      displayName: existing?.displayName || 'Messenger · ' + row.reference_code,
      ...(channel === 'whatsapp' ? {phone: address} : {telegram: address}),
      channel, address,
    }
    const updated = (await db.query(
      `update app.public_service_enquiries
         set contact_ciphertext=$3,contact_channel=$4,revision=revision+1,updated_at=now()
         where id=$1 and recipient_practitioner_id=$2 returning *`,
      [id, practitionerId, seal(contact, enc(practitionerId, id, 'public_lead.contact'), config), channel],
    )).rows[0]
    return publicServiceEnquiryView(updated, config)
  }
  if (Object.keys(input).some(key => !['status','expectedRevision'].includes(key)) ||
      !['contacted','closed'].includes(input.status) ||
      !['requested','contacted'].includes(row.status)) throw new AppError('INVALID_STATUS', 400)
  const updated = (await db.query(
    'update app.public_service_enquiries set status=$3,revision=revision+1,updated_at=now() where id=$1 and recipient_practitioner_id=$2 returning *',
    [id, practitionerId, input.status],
  )).rows[0]
  return publicServiceEnquiryView(updated, config)
}
