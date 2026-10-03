/** Isolated provider protocol double. NOT Google/Supabase Auth verification.
 * Standalone CI process; never imported into application routes or deployed.
 */
import {createServer} from 'node:http'
import {createHash,randomBytes,createHmac} from 'node:crypto'
import {adminClient,assertIsolated,A,B,SA,SB} from './app-db-setup.mjs'
assertIsolated()
const port=Number(process.env.HH_TEST_AUTH_PORT||54329)
const origin=process.env.HH_TEST_APP_ORIGIN||'http://127.0.0.1:3100'
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error('Loopback app origin required')
const secret=randomBytes(32),codes=new Map(),tokens=new Map(),refreshTokens=new Map()
const uid=[A,B],sid=[SA,SB]
function user(id){return{id,aud:'authenticated',role:'authenticated',email:id===A?'a@example.invalid':'b@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z',last_sign_in_at:new Date().toISOString(),created_at:'2026-01-01T00:00:00Z',updated_at:new Date().toISOString(),app_metadata:{provider:'google',providers:['google']},user_metadata:{full_name:'Synthetic Test'},identities:[]}}
function issue(index){const payload={sub:uid[index],session_id:sid[index],exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated'};const parts=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify(payload)).toString('base64url')];const token=parts.join('.')+'.'+createHmac('sha256',secret).update(parts.join('.')).digest('base64url'),refresh=randomBytes(32).toString('hex');tokens.set(token,index);refreshTokens.set(refresh,index);return{access_token:token,token_type:'bearer',expires_in:3600,expires_at:payload.exp,refresh_token:refresh,user:user(uid[index])}}
async function active(index){const db=await adminClient();try{return Boolean((await db.query('select 1 from auth.sessions where id=$1 and user_id=$2',[sid[index],uid[index]])).rowCount)}finally{await db.end()}}
const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,`http://127.0.0.1:${port}`)
  if(url.pathname==='/health')return send(res,200,{kind:'test-protocol-double'})
  if(url.pathname==='/auth/v1/authorize'&&req.method==='GET'){
   const redirect=url.searchParams.get('redirect_to'),challenge=url.searchParams.get('code_challenge'),method=url.searchParams.get('code_challenge_method')
   if(!redirect||new URL(redirect).origin!==origin||new URL(redirect).pathname!=='/api/app/auth/callback'||!challenge||!['s256','S256'].includes(method))return send(res,400,{message:'Invalid PKCE test request'})
   const index=req.headers.cookie?.includes('hh_test_actor=b')?1:0,code=randomBytes(24).toString('hex')
   const db=await adminClient();try{await db.query('insert into auth.sessions(id,user_id) values($1,$2) on conflict(id) do nothing',[sid[index],uid[index]])}finally{await db.end()}
   codes.set(code,{challenge,index});const target=new URL(redirect);target.searchParams.set('code',code);res.writeHead(303,{Location:target.toString(),'Cache-Control':'no-store'});return res.end()
  }
  if(url.pathname==='/auth/v1/token'&&req.method==='POST'){
   const chunks=[];let size=0;for await(const part of req){size+=part.length;if(size>8192)return send(res,413,{message:'too large'});chunks.push(part)}
   const body=JSON.parse(Buffer.concat(chunks).toString()),grant=url.searchParams.get('grant_type')
   if(grant==='pkce'){const saved=codes.get(body.auth_code);codes.delete(body.auth_code);if(!saved||createHash('sha256').update(body.code_verifier||'').digest('base64url')!==saved.challenge)return send(res,400,{error_code:'bad_code_verifier',msg:'invalid code'});return send(res,200,issue(saved.index))}
   if(grant==='refresh_token'){const index=refreshTokens.get(body.refresh_token);if(index===undefined||!await active(index))return send(res,400,{error_code:'refresh_token_not_found',msg:'invalid refresh'});return send(res,200,issue(index))}
  }
  if(url.pathname==='/auth/v1/user'&&req.method==='GET'){const index=tokens.get((req.headers.authorization||'').replace(/^Bearer /,''));if(index===undefined||!await active(index))return send(res,401,{code:'session_not_found',message:'Session missing'});return send(res,200,user(uid[index]))}
  if(url.pathname==='/auth/v1/logout'&&req.method==='POST'){const index=tokens.get((req.headers.authorization||'').replace(/^Bearer /,''));if(index!==undefined){const db=await adminClient();try{await db.query('delete from auth.sessions where user_id=$1',[uid[index]])}finally{await db.end()}}res.writeHead(204,{'Cache-Control':'no-store'});return res.end()}
  return send(res,404,{message:'Test endpoint not found'})
 } catch {send(res,500,{message:'Test provider failed'})}
})
server.listen(port,'127.0.0.1',()=>console.log('Loopback provider protocol double ready. No live Google test.'))
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)))
