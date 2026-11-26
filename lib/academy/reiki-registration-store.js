import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { seal, operationHash } from '../app/crypto.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { REIKI_REGISTRATION_NOTICE, verifiedReikiGoogleEmail } from './reiki-registration-proof.mjs'

// Only called after a verified Google OAuth callback or an account-bound retry.
// The server reads the provider identities; no submitted email, owner ID or
// journal is accepted. No CRM marketing consent or email-verification flag
// is changed by operational registration.
export async function syncReikiRegistration(config,actor,authClient,locale,{transact=transaction}={}) {
  if(!['en','ru','es'].includes(locale))throw new AppError('INVALID_REIKI_REGISTRATION',400)
  const {data,error}=await authClient.auth.getUserIdentities()
  if(error||!Array.isArray(data?.identities))throw new AppError('REIKI_REGISTRATION_IDENTITY_UNAVAILABLE',503)
  const email=verifiedReikiGoogleEmail(actor,data.identities)
  if(!email)return false
  return transact(config,actor,async db=>{
    // Serializes the initial link for one Cabinet account. The CRM unique
    // owner/email constraint independently serializes competing contacts.
    const account=(await db.query('select status from app.accounts where id=$1 for update',[actor.id])).rows[0]
    if(account?.status!=='active')throw new AppError('ACCOUNT_UNAVAILABLE',403)
    const linked=(await db.query('select contact_id from app_private.crm_reiki_registrations where account_id=$1',[actor.id])).rows[0]
    if(linked)return true
    const owner=(await db.query(
      "select trusted_auth_user_id as id from app.practitioners where id=$1 and active and public_profile<>'{}'::jsonb and status in ('approved','submitted','changes_requested') and trusted_auth_user_id is not null",
      [PRACTITIONER_ID])).rows[0]?.id
    if(!owner)throw new AppError('REIKI_REGISTRATION_OWNER_UNAVAILABLE',503)
    const emailHash=operationHash({scope:'crm-email',owner,email},config)
    // Transaction-local scope: the existing app backend cannot read contact
    // ciphertext; the migration permits only this owner + exact keyed hash.
    await db.query("select set_config('hh.reiki_registration_hash',$1,true)",[emailHash])
    const id=randomUUID()
    const contact=seal({
      displayName:String(actor.displayName||'').trim().slice(0,120)||email,
      email,phone:'',registration:{program:'reiki-practitioner',noticeVersion:REIKI_REGISTRATION_NOTICE}
    },{accountId:owner,recordId:id,field:'crm.contact'},config)
    await db.query(
      "insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle,source) values($1,$2,$3,$4,$5,'lead','academy') on conflict(owner_id,email_hash) do nothing",
      [id,owner,contact,emailHash,locale])
    const existing=(await db.query('select id from app.crm_contacts where owner_id=$1 and email_hash=$2',[owner,emailHash])).rows[0]
    if(!existing)throw new AppError('REIKI_REGISTRATION_CONTACT_UNAVAILABLE',503)
    await db.query(
      'insert into app_private.crm_reiki_registrations(account_id,owner_id,contact_id,locale,notice_version) values($1,$2,$3,$4,$5) on conflict(account_id) do nothing',
      [actor.id,owner,existing.id,locale,REIKI_REGISTRATION_NOTICE])
    return true
  })
}
