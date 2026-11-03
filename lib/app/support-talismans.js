import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction } from './database.js'

export const TALISMAN_BUCKET = 'hh-support-talismans'
export const TALISMAN_CATEGORIES = Object.freeze(['protection','energy','harmony','prosperity','wisdom','other'])
export const TALISMAN_LIMIT = 30

export function validateTalismanDetails(title,category){
  if(typeof title!=='string'||title.includes('\0')||title.trim().length<2||title.trim().length>100||
     !TALISMAN_CATEGORIES.includes(category)) throw new AppError('INVALID_TALISMAN',400)
  return {title:title.trim(),category}
}
export async function listMyTalismans(config,actor){
  return transaction(config,actor,async db=>(await db.query(
    "select id,title,category,storage_path,created_at from app.support_talismans where account_id=$1 and state='ready' order by created_at desc limit 30",
    [actor.id]
  )).rows.map(row=>({id:row.id,title:row.title,category:row.category,path:row.storage_path,createdAt:new Date(row.created_at).toISOString()})))
}
export async function reserveTalisman(config,actor,{title,category}){
  const clean=validateTalismanDetails(title,category)
  return transaction(config,actor,async db=>{
    // Serialize quota checks within an account, including parallel device uploads.
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['talisman:'+actor.id])
    // Abandoned, never-public upload reservations must not exhaust the quota.
    await db.query(
      "delete from app.support_talismans where account_id=$1 and state='uploading' and created_at<now()-interval '20 minutes'",
      [actor.id]
    )
    const used=Number((await db.query(
      'select count(*)::int as count from app.support_talismans where account_id=$1',[actor.id]
    )).rows[0]?.count||0)
    if(used>=TALISMAN_LIMIT) throw new AppError('TALISMAN_LIMIT_REACHED',409)
    const id=randomUUID(),path=actor.id+'/'+id+'.jpg'
    await db.query(
      "insert into app.support_talismans(id,account_id,title,category,storage_path,state) values($1,$2,$3,$4,$5,'uploading')",
      [id,actor.id,clean.title,clean.category,path]
    )
    return {id,path}
  })
}
export async function completeTalisman(config,actor,id){
  requireUUID(id)
  return transaction(config,actor,async db=>{
    const row=(await db.query(
      "update app.support_talismans set state='ready' where id=$1 and account_id=$2 and state='uploading' returning id,title,category,storage_path,created_at",
      [id,actor.id]
    )).rows[0]
    if(!row)throw new AppError('NOT_FOUND',404)
    return {id:row.id,title:row.title,category:row.category,path:row.storage_path,createdAt:new Date(row.created_at).toISOString()}
  })
}
export async function getMyTalisman(config,actor,id){
  requireUUID(id)
  return transaction(config,actor,async db=>(await db.query(
    "select id,storage_path from app.support_talismans where id=$1 and account_id=$2 and state='ready'",
    [id,actor.id]
  )).rows[0]||null)
}
export async function removeTalismanRecord(config,actor,id){
  requireUUID(id)
  return transaction(config,actor,async db=>{
    const row=(await db.query(
      "delete from app.support_talismans where id=$1 and account_id=$2 returning id",
      [id,actor.id]
    )).rows[0]
    if(!row)throw new AppError('NOT_FOUND',404)
  })
}
export async function cancelTalismanReservation(config,actor,id){
  return transaction(config,actor,db=>db.query(
    "delete from app.support_talismans where id=$1 and account_id=$2 and state='uploading'",
    [id,actor.id]
  ))
}
