import 'server-only'
import {randomBytes} from 'node:crypto'
import {transaction} from './database.js'
import {operationHash} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {businessHash} from '../crm/messenger-store.js'
import {whatsappLinkReady,whatsappLinkUrl} from '../crm/whatsapp-account-link.mjs'
const SCHEMA="select pg_catalog.to_regclass('app_private.crm_whatsapp_link_challenges') is not null " +
 "and pg_catalog.to_regclass('app_private.crm_google_whatsapp_links') is not null " +
 "and pg_catalog.to_regprocedure('app_private.crm_whatsapp_claim_verified(text,text,text)') is not null as ok"
async function schema(db){return (await db.query(SCHEMA)).rows[0]?.ok===true}
export function createWhatsAppAccountLinkRepository(config){
 async function status(actor){
  return transaction(config,actor,async db=>{
   if(!(await schema(db)))return {available:false,linked:false,hasLink:false}
   const row=(await db.query('select business_hash from app_private.crm_google_whatsapp_links where account_id=$1',
    [actor.id])).rows[0]
   const phoneId=process.env.HH_CRM_MSG_WHATSAPP_PHONE_ID
   return {available:whatsappLinkReady(),hasLink:!!row,
    linked:!!row&&!!phoneId&&row.business_hash===businessHash('whatsapp',phoneId,config)}
  })
 }
 async function begin(actor){
  if(!whatsappLinkReady())throw new AppError('WHATSAPP_NOT_CONFIGURED',503)
  const token=randomBytes(32).toString('base64url')
  const hash=operationHash({scope:'hh-wa-account-link',token},config)
  await transaction(config,actor,async db=>{
   if(!(await schema(db)))throw new AppError('WHATSAPP_SCHEMA_NOT_READY',503)
   const acct=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',
    [actor.id])).rows[0]
   if(acct?.status!=='active'||acct.onboarding_state!=='active')
    throw new AppError('ACCOUNT_UNAVAILABLE',403)
   const recent=(await db.query("select 1 from app_private.crm_whatsapp_link_challenges "+
    "where account_id=$1 and created_at>clock_timestamp()-interval '45 seconds'",[actor.id])).rowCount
   if(recent)throw new AppError('RATE_LIMITED',429)
   await db.query("insert into app_private.crm_whatsapp_link_challenges(account_id,token_hash,expires_at) "+
    "values($1,$2,clock_timestamp()+interval '15 minutes') "+
    "on conflict(account_id) do update set token_hash=excluded.token_hash,"+
    "expires_at=excluded.expires_at,created_at=clock_timestamp()",[actor.id,hash])
  })
  return {...await status(actor),linkUrl:whatsappLinkUrl(token)}
 }
 async function unlink(actor){
  await transaction(config,actor,async db=>{
   if(!(await schema(db)))return
   await db.query('delete from app_private.crm_whatsapp_link_challenges where account_id=$1',[actor.id])
   await db.query('delete from app_private.crm_google_whatsapp_links where account_id=$1',[actor.id])
  })
  return status(actor)
 }
 return {status,begin,unlink}
}
