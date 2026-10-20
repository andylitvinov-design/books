import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { operationHash, seal, openSealed } from '../app/crypto.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { normalizePublicServiceEnquiry, publicEnquiryReference } from './public-service-enquiry-input.mjs'
import { crmEnabled } from '../crm/repository.js'

const enc = (practitionerId, recordId, field) => ({ accountId: practitionerId, recordId, field })
const notFound = () => { throw new AppError('NOT_FOUND', 404) }

export function publicServiceEnquiryView(row, config) {
  const manuallyRecorded = row.contact_ciphertext
    ? openSealed(row.contact_ciphertext, enc(row.recipient_practitioner_id, row.id, 'public_lead.contact'), config) : null
  return {
    id: row.id,
    requestKind: 'public',
    serviceId: null,
    serviceTitle: row.service_title,
    practitionerId: row.recipient_practitioner_id,
    // Each unverified anonymous enquiry is separate until identity is established by an approved channel.
    clientKey: 'request:' + row.id,
    status: row.status,
    revision: row.revision,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    referenceCode: row.reference_code,
    sourcePath: row.source_path,
    locale: row.locale,
    contactPending: !manuallyRecorded,
    contactProvenance: manuallyRecorded?.submittedByVisitor === true
      ? 'visitor_submitted_unverified' : manuallyRecorded ? 'practitioner_recorded_unverified' : 'pending',
    contact: manuallyRecorded || { displayName: 'Messenger contact pending · ' + row.reference_code },
    message: openSealed(row.description_ciphertext, enc(row.recipient_practitioner_id, row.id, 'public_lead.message'), config),
    sharedExcerpt: null,
    messageCount: 0,
    lastMessageAt: null,
  }
}

export async function createPublicServiceEnquiry(config, rawInput) {
  let input
  try { input = normalizePublicServiceEnquiry(rawInput) }
  catch { throw new AppError('INVALID_SERVICE_ENQUIRY', 400) }
  const { operationId, serviceTitle, description, sourcePath, locale, contact } = input
  if (contact && !crmEnabled()) throw new AppError('CRM_UNAVAILABLE', 503)
  const digest = operationHash(input, config)
  return transaction(config, null, async db => {
    // Public API has no authenticated account. Only the matching unguessable UUID
    // can be read for idempotency; RLS never exposes practitioner client rows.
    await db.query("select set_config('hh.public_enquiry_operation',$1,true)", [operationId])
    const prior = (await db.query(
      'select id,reference_code,operation_hash from app.public_service_enquiries where operation_id=$1',
      [operationId],
    )).rows[0]
    if (prior) {
      if (prior.operation_hash !== digest) throw new AppError('IDEMPOTENCY_CONFLICT', 409)
      return { id: prior.id, referenceCode: prior.reference_code, saved: true, contactPending: !contact }
    }
    const practitioner = (await db.query(
      "select id,trusted_auth_user_id as owner_id from app.practitioners where id=$1 and active and status in ('approved','submitted','changes_requested') and public_profile<>'{}'::jsonb",
      [PRACTITIONER_ID],
    )).rows[0]
    if (!practitioner || (contact && !practitioner.owner_id)) throw new AppError('PRACTICE_UNAVAILABLE', 503)
    const id = randomUUID()
    const referenceCode = publicEnquiryReference(id)
    await db.query(
      `insert into app.public_service_enquiries
        (id,recipient_practitioner_id,service_title,source_path,locale,reference_code,
         description_ciphertext,contact_ciphertext,operation_id,operation_hash)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, PRACTITIONER_ID, serviceTitle, sourcePath, locale, referenceCode,
        seal(description, enc(PRACTITIONER_ID, id, 'public_lead.message'), config),
        contact ? seal({
          displayName: contact.displayName, email: contact.email, phone: contact.phone,
          submittedByVisitor: true, replyConsent: 'website_reply_only_v1',
        }, enc(PRACTITIONER_ID, id, 'public_lead.contact'), config) : null,
        operationId, digest],
    )
    if (contact) {
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
      }, { accountId: ownerId, recordId: crmId, field: 'crm.contact' }, config)
      await db.query(
        `insert into app.crm_contacts
         (id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source)
         values($1,$2,$3,$4,$5,$6,'lead',$7) on conflict do nothing`,
        [crmId,ownerId,crmCiphertext,emailHash,phoneHash,locale,contact.source],
      )
    }
    return { id, referenceCode, saved: true, contactPending: !contact }
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
