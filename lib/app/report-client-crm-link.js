import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {seal,operationHash} from './crypto.js'
import {bindLegacyClientToAccount} from './client-account-binding.js'
import {reportRecipientEmailMatches} from './report-google-identity.mjs'
import {crmEnabled} from '../crm/repository.js'

// The legacy report store is the single practice owner's cabinet; never take
// an owner ID or clinical client ID from OAuth query params or request JSON.
// This is the existing primary Holistic House practitioner, also used by
// the existing public service enquiry CRM intake.
const PRACTITIONER_ID='246aa1a3-a371-5a83-9f4b-cd23ff027a76'

export async function registerVerifiedReportClient(db,config,actor,intent,recipient,googleEmail){
  requireUUID(actor?.id);requireUUID(intent?.id);requireUUID(intent?.source_id)
  requireUUID(intent?.source_legacy_client_id);requireUUID(intent?.source_session_grant_id)
  const clientId=intent.source_legacy_client_id
  if(!crmEnabled()||intent.source_kind!=='client_session'||intent.status!=='pending'||
    recipient?.id!==clientId||recipient.status==='archived'||
    !reportRecipientEmailMatches(recipient.email,googleEmail))
    throw new AppError('REPORT_RECIPIENT_MISMATCH',403)
  const name=typeof recipient.fullName==='string'?recipient.fullName.trim().slice(0,120):''
  if(!name||/[\r\n\u0000]/.test(name))throw new AppError('REPORT_RECIPIENT_MISMATCH',403)
  const owner=(await db.query(
    "select trusted_auth_user_id as id from app.practitioners where id=$1 and active and status in ('approved','submitted','changes_requested') and public_profile<>'{}'::jsonb",
    [PRACTITIONER_ID])).rows[0]
  if(!owner?.id||owner.id===actor.id)throw new AppError('CRM_UNAVAILABLE',503)
  requireUUID(owner.id)
  // Serialise same account claims across different reports. The existing
  // binding PK and the new CRM link uniqueness protect concurrent claimants.
  await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['hh-report-account:'+actor.id])
  const other=(await db.query('select legacy_client_id from app_private.client_account_bindings where account_id=$1 and legacy_client_id<>$2 limit 1',[actor.id,clientId])).rows[0]
  if(other)throw new AppError('CLIENT_ACCOUNT_ALREADY_LINKED',409)
  await bindLegacyClientToAccount(db,actor,{legacyClientId:clientId,sourceKind:'client_session',sourceId:intent.source_id})

  // An existing link always wins: preserve its contact and history, including
  // archived/suppressed state. No automatic name matching or marketing grants.
  const prior=(await db.query('select legacy_client_id,contact_id from app_private.client_report_crm_links where account_id=$1 and owner_id=$2',[actor.id,owner.id])).rows[0]
  if(prior){
    if(prior.legacy_client_id!==clientId)throw new AppError('CLIENT_ACCOUNT_ALREADY_LINKED',409)
    return {contactId:prior.contact_id}
  }
  const emailHash=operationHash({scope:'crm-email',owner:owner.id,email:googleEmail},config)
  await db.query("select set_config('hh.report_claim_intent',$1,true),set_config('hh.report_claim_email_hash',$2,true)",[intent.id,emailHash])
  await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['hh-report-email:'+owner.id+':'+emailHash])
  let contact=(await db.query('select id from app.crm_contacts where owner_id=$1 and email_hash=$2',[owner.id,emailHash])).rows[0]
  if(!contact){
    const id=randomUUID()
    const locale=['en','ru','es'].includes(recipient.locale)?recipient.locale:
      ['en','ru','es'].includes(recipient.languagePreference)?recipient.languagePreference:'en'
    const ciphertext=seal({displayName:name,email:googleEmail,phone:''},{accountId:owner.id,recordId:id,field:'crm.contact'},config)
    contact=(await db.query(
      "insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source) values($1,$2,$3,$4,null,$5,'client','website') on conflict(owner_id,email_hash) do nothing returning id",
      [id,owner.id,ciphertext,emailHash,locale])).rows[0]
    if(!contact)contact=(await db.query('select id from app.crm_contacts where owner_id=$1 and email_hash=$2',[owner.id,emailHash])).rows[0]
  }
  if(!contact)throw new AppError('CRM_UNAVAILABLE',503)
  await db.query(
    "insert into app_private.client_report_crm_links(legacy_client_id,account_id,owner_id,contact_id,notice_version) values($1,$2,$3,$4,'hh-report-google-crm-v1')",
    [clientId,actor.id,owner.id,contact.id])
  return {contactId:contact.id}
}
