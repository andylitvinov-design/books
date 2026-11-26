/** Pure validation for the private, owner-scoped My Coach protocol archive. */
export const MY_COACH_PROTOCOL_PAGE_SIZE = 20
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isMyCoachProtocolId = value => typeof value === 'string' && uuid.test(value)
const strictIso = value => typeof value === 'string' && value.length <= 35 &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

// PostgreSQL timestamps have microsecond precision; JS Date does not.
// Require a strict six-digit UTC value for page cursors, while preserving
// historical millisecond-only savedAt values in the legacy migration.
const strictCursor = value => typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value.replace(/(\.\d{3})\d{3}Z$/, '$1Z')

/** Keyset pagination; nothing user-authored is concatenated into SQL. */
export function normalizeMyCoachProtocolCursor({before = null, beforeId = null} = {}) {
  if (before === null && beforeId === null) return null
  if (!strictCursor(before) || !isMyCoachProtocolId(beforeId))
    throw Error('MY_COACH_PROTOCOL_CURSOR_INVALID')
  return {before, beforeId}
}

/** Remove only the legacy envelope's storage timestamp, not client content. */
export function unpackLegacyMyCoachProtocol(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    !isMyCoachProtocolId(value.id) || value.provenance !== 'client_reviewed_dialogue')
    throw Error('MY_COACH_PROTOCOL_UNAVAILABLE')
  const {savedAt, ...protocol} = value
  const time = strictIso(savedAt) ? savedAt : protocol.completedAt
  if (!strictIso(time)) throw Error('MY_COACH_PROTOCOL_UNAVAILABLE')
  return {protocol, savedAt: time}
}

/** Exact saved retries are idempotent; altered content with the same ID is not. */
export function sameMyCoachProtocol(a, b) {
  return Boolean(a && b && a.id === b.id && JSON.stringify(a) === JSON.stringify(b))
}

/** Find the earliest reviewed introductory record, independent of recent pages.
 * Oldest-first pages must come from the same authenticated owner transaction.
 * An incomplete, bounded search never proves absence of an introduction.
 */
export async function selectCoachArchiveFoundation(readPage,{maxPages=6}={}){
 if(typeof readPage!=='function'||!Number.isInteger(maxPages)||maxPages<1||maxPages>6)
  throw Error('MY_COACH_PROTOCOL_CURSOR_INVALID')
 let cursor=null,oldest=null,complete=false
 for(let n=0;n<maxPages;n++){
  const page=await readPage(cursor)
  if(!page||!Array.isArray(page.protocols)||page.protocols.length>MY_COACH_PROTOCOL_PAGE_SIZE||
     typeof page.hasMore!=='boolean')throw Error('MY_COACH_PROTOCOL_UNAVAILABLE')
  for(const record of page.protocols){
   if(record?.provenance!=='client_reviewed_dialogue'||!isMyCoachProtocolId(record.id))continue
   if(!oldest)oldest=record
   if(record.courseSessionId==='introductory')
    return {record,kind:'introductory',searchComplete:true}
  }
  if(!page.hasMore){complete=true;break}
  if(!page.nextCursor||!page.protocols.length)break
  const next=normalizeMyCoachProtocolCursor(page.nextCursor)
  if(!next||(cursor&&(next.before<cursor.before||
    (next.before===cursor.before&&next.beforeId.toLowerCase()<=cursor.beforeId.toLowerCase()))))break
  cursor=next
 }
 return {record:oldest,kind:oldest?(oldest.courseSessionId?'earliest_reviewed':'legacy_untyped'):'none',searchComplete:complete}
}
