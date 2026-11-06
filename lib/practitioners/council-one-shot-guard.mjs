// A short-lived manual operator trigger for the existing owner Council cron.
// Proof is stored encrypted in Vercel Production; it is never a Telegram/API key.
// The daily database claim remains the source of truth for at-most-once delivery.
import {createHash,timingSafeEqual} from 'node:crypto'

const ORIGIN='https://holistichouse.vercel.app'
const PATH='/api/internal/council-archive-telegram'
const PROOF=/^[A-Za-z0-9_-]{64,96}$/
const MAX_TTL_MS=90*60*1000

export function councilOneShotAuthorized(request,env={},now=Date.now()){
  if(env.VERCEL_ENV!=='production'||!Number.isFinite(now))return false
  const expires=Number(env.HH_COUNCIL_ONE_SHOT_EXPIRES)
  if(!Number.isSafeInteger(expires)||expires<=now||
    expires-now>MAX_TTL_MS)return false
  const expected=env.HH_COUNCIL_ONE_SHOT_PROOF
  if(typeof expected!=='string'||!PROOF.test(expected))return false
  let url
  try{url=new URL(request.url)}catch{return false}
  if(url.origin!==ORIGIN||url.pathname!==PATH||url.hash||
    url.username||url.password)return false
  const keys=[...url.searchParams.keys()]
  // The Vercel authenticated fetcher may append an optional share marker.
  if(keys.length<2||keys.length>3||
    keys.some(key=>!['proof','mode','_vercel_share'].includes(key))||
    url.searchParams.getAll('proof').length!==1||
    url.searchParams.getAll('mode').length!==1||
    !['probe','send'].includes(url.searchParams.get('mode')))return false
  const provided=url.searchParams.get('proof')
  if(typeof provided!=='string'||!PROOF.test(provided))return false
  const sha=value=>createHash('sha256').update(value).digest()
  return timingSafeEqual(sha(provided),sha(expected))
}
