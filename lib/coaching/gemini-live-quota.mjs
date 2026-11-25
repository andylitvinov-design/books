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
export function geminiLiveTokenQuota(accountId,{ownerTrial=false}={}){
  if(typeof accountId!=='string'||!UUID.test(accountId))
    throw Error('GEMINI_LIVE_ACCOUNT_INVALID')
  // Restricted to the server-verified practitioner owner. Twelve one-use
  // Free token allocations let the owner audition every coach during QA.
  // Global service budgets remain 40 attempted / 20 delivered per day.
  // These buckets are not a bypass of Google or service-wide limits.
  const special=ownerTrial===true
  return Object.freeze({
    attempts:Object.freeze([
      row(special?'my-coach-live-owner-trial-attempt-hour-v1':
        'my-coach-live-free-attempt-actor-hour-v1',special?24:4,3600,accountId),
      row(special?'my-coach-live-owner-trial-attempt-day-v1':
        'my-coach-live-free-attempt-actor-day-v1',special?24:8,86400,accountId),
      row('my-coach-live-free-attempt-global-day-v1',40,86400),
    ]),
    successful:Object.freeze([
      row(special?'my-coach-live-owner-trial-success-hour-v1':
        'my-coach-live-free-actor-hour',special?12:2,3600,accountId),
      row(special?'my-coach-live-owner-trial-success-day-v1':
        'my-coach-live-free-actor-day',special?12:4,86400,accountId),
      row('my-coach-live-free-global-day',20,86400),
    ]),
  })
}
