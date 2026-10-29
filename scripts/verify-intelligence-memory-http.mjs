// Only synthetic users, loopback OAuth and an isolated local test database.
import http from 'node:http'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server.js'
import {getAppConfig} from '../lib/app/config.js'
import {createRequestAuth} from '../lib/app/session.js'
import {createAppRepository} from '../lib/app/repository.js'
import {closeDatabase} from '../lib/app/database.js'
import {B,SB,actor} from '../tests/helpers/app-db-setup.mjs'

const origin='http://127.0.0.1:3187', config=getAppConfig(), db=new URL(config.databaseUrl)
if(!config.test || !config.intelligenceMemoryEnabled || config.supabaseUrl!=='http://127.0.0.1:54329' ||
   !['127.0.0.1','localhost'].includes(db.hostname) || db.pathname!=='/hh_app_test' || !config.origins.includes(origin))
  throw new Error('ISOLATED_TEST_CONFIGURATION_REQUIRED')
const ids={a:['10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'],
  b:['10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002']}
// The preceding database regression deletes B to test cascade. Restore this
// synthetic app account only; the test helper has already created its auth user.
const repo=createAppRepository(config), bActor=actor(B,SB)
await repo.ensureAccount(bActor)
await repo.onboarding(bActor,{adult:true,necessary:true,marketing:false,displayName:'Synthetic',uiLocale:'en',timezone:'America/Toronto',goal:'explore'})
const challenges=new Map()
const user=kind=>({id:ids[kind][0],aud:'authenticated',email:'synthetic@example.invalid',user_metadata:{}})
const token=kind=>{const [sub,session_id]=ids[kind];return 'synthetic.'+Buffer.from(JSON.stringify({sub,session_id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature'}
const provider=http.createServer(async(req,res)=>{
  res.setHeader('content-type','application/json')
  if(req.url?.includes('/token')){
    let body='';for await(const chunk of req)body+=chunk
    let parsed;try{parsed=JSON.parse(body)}catch{res.writeHead(400);res.end('{}');return}
    const kind=parsed.auth_code==='synthetic-code-a'?'a':parsed.auth_code==='synthetic-code-b'?'b':null
    const verifier=typeof parsed.code_verifier==='string'?parsed.code_verifier:''
    if(!kind||!verifier||createHash('sha256').update(verifier).digest('base64url')!==challenges.get(kind)){res.writeHead(400);res.end('{}');return}
    res.end(JSON.stringify({access_token:token(kind),refresh_token:'synthetic-refresh-'+kind,token_type:'bearer',expires_in:3600,user:user(kind)}));return
  }
  if(req.url?.endsWith('/user')){
    let claims;try{claims=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1],'base64url').toString())}catch{/* reject */}
    const kind=Object.keys(ids).find(key=>claims?.sub===ids[key][0]&&claims?.session_id===ids[key][1])
    if(!kind){res.writeHead(401);res.end('{}');return}
    res.end(JSON.stringify(user(kind)));return
  }
  res.writeHead(404);res.end('{}')
})
await new Promise((resolve,reject)=>provider.listen(54329,'127.0.0.1',resolve).once('error',reject))
try {
  for(let attempt=0;attempt<60;attempt++){
    try {await fetch(origin+'/api/app/intelligence/feedback/export',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});break}
    catch {if(attempt===59)throw new Error('LOCAL_SITE_UNAVAILABLE');await new Promise(resolve=>setTimeout(resolve,1000))}
  }
  async function cookie(kind){
    const request=(values=[])=>new NextRequest(origin+'/api/app/auth/callback',{headers:{cookie:values.map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')}})
    const start=createRequestAuth(request(),config)
    const started=await start.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/api/app/auth/callback',skipBrowserRedirect:true}})
    assert.equal(started.error,null);challenges.set(kind,new URL(started.data.url).searchParams.get('code_challenge'))
    const exchange=createRequestAuth(request(start.apply(NextResponse.json({})).cookies.getAll()),config)
    const completed=await exchange.client.auth.exchangeCodeForSession('synthetic-code-'+kind)
    assert.equal(completed.error,null)
    return exchange.apply(NextResponse.json({})).cookies.getAll().map(c=>`${c.name}=${encodeURIComponent(c.value)}`).join('; ')
  }
  const a=await cookie('a'), b=await cookie('b')
  async function call(action,cookies,body={},headers={}){
    const response=await fetch(`${origin}/api/app/intelligence/feedback/${action}`,{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookies,...headers},body:JSON.stringify(body)})
    return {status:response.status,cache:response.headers.get('cache-control'),body:await response.json()}
  }
  const guest=await call('export','');assert.equal(guest.status,401);assert.match(guest.cache,/no-store/)
  assert.equal((await call('save',a,{}, {origin:'https://hostile.example.invalid'})).status,403)
  assert.equal((await call('export',a,{}, {'x-hh-account-id':ids.b[0]})).status,409)
  const before=await call('export',a), otherBefore=await call('export',b)
  assert.equal(before.status,200);assert.match(before.cache,/no-store/)
  assert.equal(otherBefore.status,200);assert.equal(otherBefore.body.records.length,0)
  const input={operationId:randomUUID(),consent:true,expectedRevision:before.body.revision,itemId:'youtube:HqfixazXqRY',feedback:'not_useful'}
  assert.equal((await call('save',a,{...input,consent:false})).status,400)
  assert.equal((await call('save',a,input)).status,200)
  assert.equal((await call('save',a,input)).status,200)
  assert.equal((await call('save',a,{...input,feedback:'useful'})).status,409)
  assert.equal((await call('export',a)).body.records.some(row=>row.operationId===input.operationId),true)
  assert.equal((await call('export',b)).body.records.length,0)
  assert.equal((await call('delete',b,{operationId:input.operationId,expectedRevision:otherBefore.body.revision})).body.deleted,false)
  assert.equal((await call('export',a)).body.records.some(row=>row.operationId===input.operationId),true)
  assert.equal((await call('delete',a,{all:true,expectedRevision:before.body.revision})).body.deleted,true)
  assert.equal((await call('save',a,input)).status,409)
  assert.equal((await call('export',a)).body.records.length,0)
  console.log(JSON.stringify({auth:'synthetic-loopback-provider',database:'isolated-postgresql',owners:2,consent:'passed',isolation:'passed',revocation:'passed',cache:'passed'}))
} finally {await closeDatabase();await new Promise(resolve=>provider.close(resolve))}
