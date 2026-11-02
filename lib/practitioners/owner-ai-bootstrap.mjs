// One-time operator bootstrap: no BotFather token or user chat ID in URLs.
// The high-entropy proof and deadline exist only in Vercel Production env.
// Expiration permanently disables this maintenance action until owner rekeys.
import {createHash,timingSafeEqual} from 'node:crypto'

const SITE='https://holistichouse.vercel.app'
const PATH='/api/internal/owner-ai-bootstrap'
const STRONG=/^[A-Za-z0-9_-]{64,96}$/
const MAX_WINDOW_MS=2*60*60*1000

export function ownerAiBootstrapAuthorized(input,env={},now=Date.now()){
  if(env.VERCEL_ENV!=='production'||
    env.HH_OWNER_AI_TG_ENABLED!=='true'||!Number.isSafeInteger(now))return false
  const expires=Number(env.HH_OWNER_AI_BOOTSTRAP_EXPIRES)
  if(!Number.isSafeInteger(expires)||expires<=now||
    expires-now>MAX_WINDOW_MS)return false
  let uri
  try{uri=new URL(input)}catch{return false}
  if(uri.origin!==SITE||uri.pathname!==PATH||uri.hash||
     uri.searchParams.size!==1||!uri.searchParams.has('proof'))
    return false
  const proof=uri.searchParams.get('proof')
  const expected=env.HH_OWNER_AI_BOOTSTRAP_SECRET
  if(typeof proof!=='string'||typeof expected!=='string'||
     !STRONG.test(proof)||!STRONG.test(expected))return false
  const digest=x=>createHash('sha256').update(x,'utf8').digest()
  return timingSafeEqual(digest(proof),digest(expected))
}
