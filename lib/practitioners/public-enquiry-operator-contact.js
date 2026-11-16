import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {openSealed} from '../app/crypto.js'
import {practitionerEmailAllowed} from '../app/practitioner-access.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {publicEnquiryReplyContact} from './public-enquiry-reply-links.mjs'

// Only a verified platform operator, who also owns the assigned practitioner,
// can disclose the visitor's reply-only contact. Audit commits before return.
export async function revealPublicEnquiryContact(config,actor,enquiryId){
 requireUUID(enquiryId)
 if(!practitionerEmailAllowed(actor))throw new AppError('NOT_FOUND',404)
 return transaction(config,actor,async db=>{
  const row=(await db.query(
   `select e.id,e.recipient_practitioner_id,e.contact_ciphertext
    from app.public_service_enquiries e
    join app.practitioners p on p.id=e.recipient_practitioner_id
    where e.id=$1 and e.recipient_practitioner_id=$2 and p.trusted_auth_user_id=$3
      -- A legacy record_contact mutation could have preserved visitor-consent
      -- flags while replacing the phone. Deny all such rows, including old ones.
      and e.contact_channel is null
      and p.active and p.status in ('approved','submitted','changes_requested')`,
   [enquiryId,PRACTITIONER_ID,actor.id])).rows[0]
  if(!row?.contact_ciphertext)throw new AppError('NOT_FOUND',404)
  const contact=publicEnquiryReplyContact(openSealed(row.contact_ciphertext,{
   accountId:row.recipient_practitioner_id,recordId:row.id,field:'public_lead.contact',
  },config))
  if(!contact)throw new AppError('NOT_FOUND',404)
  const audit=await db.query(
   'insert into app.public_enquiry_contact_disclosures(id,enquiry_id,operator_id) values($1,$2,$3)',
   [randomUUID(),enquiryId,actor.id])
  if(audit.rowCount!==1)throw new AppError('AUDIT_UNAVAILABLE',503)
  return contact
 })
}
