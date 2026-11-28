import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {isMyCoachProtocolId} from '../personal-coaching/protocol-archive.mjs'
const invalid=()=>new AppError('COACHING_FREE_DAY_INVALID',400)
const limit=()=>new AppError('COACHING_FREE_DAILY_LIMIT',409)
const unavailable=()=>new AppError('COACHING_FREE_DAY_UNAVAILABLE',503)
const date=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00.000Z'))&&new Date(value+'T00:00:00.000Z').toISOString().slice(0,10)===value
// Read-only preflight before spending a provider credential. A successful
// preflight is NOT a daily claim: the trusted begin transaction must still
// claim the day atomically with the server clock write.
export async function assertFreeCoachingDayAvailable(db,actor,{calendarDay,protocolId}={}){
 if(!actor?.id||!date(calendarDay)||!isMyCoachProtocolId(protocolId))throw invalid()
 const rows=(await db.query('select protocol_id from app_private.coaching_free_session_days where account_id=$1 and calendar_day=$2::date',[actor.id,calendarDay])).rows
 if(rows.length>1)throw unavailable()
 if(rows.length===1&&String(rows[0].protocol_id).toLowerCase()!==protocolId.toLowerCase())throw limit()
 return true
}
// INTERNAL ONLY: all free coaching transports must call this from their
// authenticated server observation/consent transaction. No public POST.
// A day is immutable, keyed only by owner and UTC date, never by persona,
// provider, device or course. The same protocol may continue without charge.
export async function claimTrustedFreeCoachingDays(db,actor,claims){
 if(!actor?.id||!Array.isArray(claims)||claims.length>4||claims.some(c=>!c||!date(c.calendarDay)||!isMyCoachProtocolId(c.protocolId)))throw invalid()
 const seen=new Map()
 for(const claim of claims){
  const protocolId=claim.protocolId.toLowerCase()
  if(seen.has(claim.calendarDay)&&seen.get(claim.calendarDay)!==protocolId)throw limit()
  seen.set(claim.calendarDay,protocolId)
 }
 // Deterministic ordering prevents opposite-order multi-day row locks.
 for(const [calendarDay,protocolId] of [...seen].sort(([a],[b])=>a.localeCompare(b))){
  const values=[actor.id,calendarDay,protocolId]
  const inserted=(await db.query('insert into app_private.coaching_free_session_days(account_id,calendar_day,protocol_id) values($1,$2::date,$3::uuid) on conflict(account_id,calendar_day) do nothing returning protocol_id',values)).rows
  if(inserted.length===1){
   if(String(inserted[0].protocol_id).toLowerCase()!==protocolId)throw unavailable()
   continue
  }
  if(inserted.length!==0)throw unavailable()
  const rows=(await db.query('select protocol_id from app_private.coaching_free_session_days where account_id=$1 and calendar_day=$2::date',[actor.id,calendarDay])).rows
  if(rows.length!==1)throw unavailable()
  if(String(rows[0].protocol_id).toLowerCase()!==protocolId)throw limit()
 }
}
