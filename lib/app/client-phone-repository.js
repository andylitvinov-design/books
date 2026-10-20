import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {seal,operationHash} from './crypto.js'
import {PHONE_STORAGE_CONSENT_VERSION,maskClientPhone,
 validateClientPhoneSave,validateClientPhoneRemoval} from './client-phone-policy.js'

const ctx=id=>({accountId:id,recordId:id,field:'client.phone'})

// Authentication + account status are checked on every read and mutation.
// A phone is *always* unverified until a separately reviewed OTP/inbound
// verification workflow exists. Never return it to practitioner CRM automatically.
export function createClientPhoneRepository(config) {
 async function owned(actor,callback) {
  return transaction(config,actor,async db=>{
   const a=(await db.query('select status,onboarding_state from app.accounts where id=$1',[actor.id])).rows[0]
   if(a?.status!=='active'||a.onboarding_state!=='active')
    throw new AppError('ACCOUNT_UNAVAILABLE',403)
   return callback(db)
  })
 }
 async function state(actor) {
  return owned(actor,async db=>{
   const record=(await db.query(
    'select phone_last4,verified_at,consented_at,updated_at '+
    'from app_private.client_contact_phones where account_id=$1',[actor.id]
   )).rows[0]
   // Verified_at is deliberately NULL for all user-saved or replaced phones.
   // The profile does not grant a commercial message or delivery consent.
   return {stored:Boolean(record),maskedPhone:record?maskClientPhone(record.phone_last4):'',
    verified:record?.verified_at!=null,
    smsMarketingOptIn:false,smsSendingAvailable:false,
    storageConsentVersion:record?PHONE_STORAGE_CONSENT_VERSION:null,
    savedAt:record?.updated_at||null}
  })
 }
 return Object.freeze({
  state,
  async save(actor,raw) {
   let value
   try{value=validateClientPhoneSave(raw)}
   catch{throw new AppError('PHONE_STORAGE_CONSENT_REQUIRED',400)}
   await owned(actor,async db=>{
    // Lock own account to serialize concurrent phone replacement and revocation.
    await db.query('select id from app.accounts where id=$1 for update',[actor.id])
    const encrypted=seal({phone:value.phone},ctx(actor.id),config)
    const fingerprint=operationHash({scope:'client-contact-phone',accountId:actor.id,phone:value.phone},config)
    await db.query('insert into app_private.client_contact_phones '+
      '(account_id,phone_ciphertext,phone_fingerprint,phone_last4,consent_version,consented_at) '+
      'values($1,$2,$3,$4,$5,now()) '+
      'on conflict(account_id) do update set '+
       'phone_ciphertext=excluded.phone_ciphertext, '+
       'phone_fingerprint=excluded.phone_fingerprint, '+
       'phone_last4=excluded.phone_last4, '+
       'consent_version=excluded.consent_version, '+
       'consented_at=now(),verified_at=null,updated_at=now()',
       [actor.id,encrypted,fingerprint,value.phone.slice(-4),value.consentVersion])
   })
   return state(actor)
  },
  async remove(actor,raw) {
   try{validateClientPhoneRemoval(raw)}catch{throw new AppError('INVALID_PHONE_REMOVAL',400)}
   await owned(actor,async db=>{
    await db.query('delete from app_private.client_contact_phones where account_id=$1',[actor.id])
   })
   return state(actor)
  },
 })
}
