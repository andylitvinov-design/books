/**
 * Server-only Gemini Live token budgets. Failed Google token requests do not
 * consume successful session slots. Distinct attempt caps prevent repeated
 * provider failure from creating an unbounded free-token request stream.
 * Existing 2/hour, 4/day, global 20/day delivered-token buckets stay intact.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const row=(op,limit,seconds,accountId)=>{
  const bucket=accountId?{op,actor:accountId}:{op}
  return Object.freeze({bucket:Object.freeze(bucket),limit,seconds})
}
export function geminiLiveTokenQuota(accountId){
  if(typeof accountId!=='string'||!UUID.test(accountId))
    throw Error('GEMINI_LIVE_ACCOUNT_INVALID')
  return Object.freeze({
    // All attempted token mints, including provider 5xx. No extra paid
    // generation; at most four attempts/hour and eight/day per account.
    attempts:Object.freeze([
      row('my-coach-live-free-attempt-actor-hour-v1',4,3600,accountId),
      row('my-coach-live-free-attempt-actor-day-v1',8,86400,accountId),
      row('my-coach-live-free-attempt-global-day-v1',40,86400),
    ]),
    // Original owner-approved delivery ceilings. Only a valid token that is
    // actually about to be returned counts as a successful allocation.
    successful:Object.freeze([
      row('my-coach-live-free-actor-hour',2,3600,accountId),
      row('my-coach-live-free-actor-day',4,86400,accountId),
      row('my-coach-live-free-global-day',20,86400),
    ]),
  })
}
