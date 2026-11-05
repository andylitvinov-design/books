import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {seal,openSealed} from '../app/crypto.js'
import {assertNoRelayContacts} from './relay-privacy.mjs'

const ctx=(owner,id)=>({accountId:owner,recordId:id,field:'public_enquiry.chat.message'})
const table='app_private.public_enquiry_chat_messages'

export function validatePublicEnquiryChatText(value){
  if(typeof value!=='string')throw new AppError('INVALID_MESSAGE',400)
  const text=value.trim()
  if(!text||text.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
    throw new AppError('INVALID_MESSAGE',400)
  try{assertNoRelayContacts(text)}
  catch{throw new AppError('CONTACT_EXCHANGE_BLOCKED',400)}
  return text
}
export async function readPublicEnquiryChat(db,{ownerId,enquiryId},config){
  requireUUID(ownerId);requireUUID(enquiryId)
  // Role-restricted SQL and FORCE RLS verify the owner OR signed guest
  // capability set as transaction-local GUCs by the API.
  const rows=(await db.query(
    `select id,author_role,body_ciphertext,created_at from ${table}
      where owner_id=$1 and enquiry_id=$2
      order by created_at desc,id desc limit 101`,[ownerId,enquiryId])).rows
  const latest=rows.slice(0,100).reverse()
  return {messages:latest.map(m=>({
      id:m.id,author:m.author_role,
      text:openSealed(m.body_ciphertext,ctx(ownerId,m.id),config)?.text||'',
      createdAt:m.created_at instanceof Date?m.created_at.toISOString():m.created_at,
    })),hasMore:rows.length>100}
}
export async function writePublicEnquiryChat(db,{
  ownerId,enquiryId,operationId,author,text,
},config){
  requireUUID(ownerId);requireUUID(enquiryId);requireUUID(operationId)
  if(!['guest','operator'].includes(author))
    throw new AppError('INVALID_AUTHOR',400)
  const clean=validatePublicEnquiryChatText(text)
  // Same-request serialization prevents concurrent devices/tabs from exceeding
  // the per-author daily cap. One transaction owns read/quota/insert together.
  await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',
    ['guest-enquiry-message:'+ownerId+':'+enquiryId+':'+author])
  const existing=(await db.query(
    `select id,author_role,body_ciphertext from ${table}
      where owner_id=$1 and enquiry_id=$2 and operation_id=$3 limit 1`,
    [ownerId,enquiryId,operationId])).rows[0]
  if(existing){
    const saved=openSealed(existing.body_ciphertext,ctx(ownerId,existing.id),config)?.text
    if(existing.author_role!==author||saved!==clean)
      throw new AppError('IDEMPOTENCY_CONFLICT',409)
    return {id:existing.id,stored:true,duplicate:true}
  }
  const quota=(await db.query(
    `select count(*)::int as total from ${table}
      where owner_id=$1 and enquiry_id=$2 and author_role=$3
        and created_at>now()-interval '24 hours'`,
    [ownerId,enquiryId,author])).rows[0]?.total||0
  if(Number(quota)>=30)throw new AppError('MESSAGE_LIMIT',429)
  const id=randomUUID()
  const encrypted=seal({text:clean},ctx(ownerId,id),config)
  const inserted=await db.query(
    `insert into ${table}
      (id,enquiry_id,owner_id,author_role,operation_id,body_ciphertext)
      values($1,$2,$3,$4,$5,$6) on conflict(enquiry_id,operation_id) do nothing`,
    [id,enquiryId,ownerId,author,operationId,encrypted])
  if(inserted.rowCount!==1)throw new AppError('IDEMPOTENCY_CONFLICT',409)
  return {id,stored:true,duplicate:false}
}
