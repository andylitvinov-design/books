import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const source=readFileSync(new URL('../app/api/agent-director/commander-run/route.js',import.meta.url),'utf8');
const executable=source.replace(/^import .+;\s*$/gm,'')
  .replace(/\bexport const /g,'const ').replace(/\bexport async function /g,'async function ');
const key='sk-or-v1-'+'Z'.repeat(40);
const token='Bearer '+('a'.repeat(150));
const baseEnv={
  HH_APP_SUPABASE_URL:'https://shervdixkaxurnaecioe.supabase.co',
  HH_APP_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'P'.repeat(35),
  HH_AGENT_OPENROUTER_ENABLED:'true'
};
function request({tokenValue=token,origin=null,site=null}={}){
 return {headers:{get(key){
  if(key==='authorization')return tokenValue;
  if(key==='origin')return origin;
  if(key==='sec-fetch-site')return site;
  return null;
 }}};
}
function makeApi(env,storeData={ok:true,owner:true,canWrite:true,
 privateStoreConfigured:true,service:'AGENT_COMMANDER_PRIVATE_STORE_V1'},storeStatus=200){
 const calls=[];
 const mocks={
  NextResponse:{json:(body,options)=>({body,status:options.status,headers:options.headers})},
  ownedModelConfig:(values)=>values.HH_AGENT_OPENROUTER_ENABLED==='true'&&
    /^sk-or-v1-[A-Za-z0-9_-]{24,}$/.test(values.HH_AGENT_OPENROUTER_API_KEY||'')?{provider:'openrouter'}:null,
  fetch:async(url,opts)=>{
   calls.push({url,opts});
   return {ok:storeStatus>=200&&storeStatus<300,status:storeStatus,
      json:async()=>storeData};
  },
  process:{env},
  AbortSignal:{timeout(){return {}}},
  getAppConfig(){throw Error('GET cannot run the POST configuration path')},
  async consumeRate(){throw Error('GET cannot consume paid model quota')},
  async executeOwnedCommanderRun(){throw Error('GET must never invoke inference')},
  Buffer,
 };
 const api=new Function('NextResponse','executeOwnedCommanderRun','ownedModelConfig',
  'getAppConfig','consumeRate','fetch','process','Buffer','AbortSignal',
  executable+';return {GET,POST};')(
   mocks.NextResponse,mocks.executeOwnedCommanderRun,mocks.ownedModelConfig,
   mocks.getAppConfig,mocks.consumeRate,mocks.fetch,mocks.process,
   mocks.Buffer,mocks.AbortSignal);
 return {api,calls};
}
test('status is owner-only: no token or cross-origin request never makes network calls',async()=>{
 const {api,calls}=makeApi({...baseEnv,HH_AGENT_OPENROUTER_API_KEY:key});
 assert.equal((await api.GET(request({tokenValue:''}))).status,401);
 assert.equal((await api.GET(request({origin:'https://attacker.invalid'}))).status,403);
 assert.equal((await api.GET(request({site:'cross-site'}))).status,403);
 assert.equal(calls.length,0);
});
test('Supabase owner read/write ACL is required before disclosing provider readiness',async()=>{
 const denied=makeApi({...baseEnv,HH_AGENT_OPENROUTER_API_KEY:key},
  {ok:true,owner:true,canWrite:false,privateStoreConfigured:true,
   service:'AGENT_COMMANDER_PRIVATE_STORE_V1'});
 const response=await denied.api.GET(request());
 assert.equal(response.status,403);
 assert.equal(response.body.error,'OWNER_ACCESS_DENIED');
 assert.equal(denied.calls.length,1);
 assert.match(denied.calls[0].url,/^https:\/\/shervdixkaxurnaecioe\.supabase\.co\/functions/);
 assert.equal(JSON.parse(denied.calls[0].opts.body).action,'status');
 assert.equal(denied.calls[0].opts.headers.Authorization,token);
});
test('missing key is visible only to owner as NOT_CONFIGURED, without a paid request',async()=>{
 const {api,calls}=makeApi(baseEnv);
 const response=await api.GET(request());
 assert.equal(response.status,200);
 assert.equal(response.body.schema,'HH_AGENT_DIRECTOR_PROVIDER_STATUS_V1');
 assert.equal(response.body.provider,'OPENROUTER_FREE');
 assert.equal(response.body.configured,false);
 assert.equal(response.body.providerVerified,false);
 assert.equal(response.body.reasonCode,'OPENROUTER_KEY_NOT_CONFIGURED');
 assert.equal(calls.length,1);
 assert.ok(!JSON.stringify(response.body).includes('sk-or-'));
});
test('valid server-only key is readiness, not an invented LIVE model completion',async()=>{
 const {api,calls}=makeApi({...baseEnv,HH_AGENT_OPENROUTER_API_KEY:key});
 const response=await api.GET(request());
 assert.equal(response.status,200);
 assert.equal(response.body.configured,true);
 assert.equal(response.body.providerVerified,false);
 assert.equal(response.body.reasonCode,'OPENROUTER_CONFIGURED_AWAITING_LIVE_VERIFICATION');
 assert.equal(calls.length,1);
 assert.ok(calls.every(c=>!String(c.url).includes('openrouter.ai')));
 assert.ok(!JSON.stringify(response).includes(key));
 assert.match(response.headers['Cache-Control'],/no-store/);
});
test('untrusted upstream status never reveals key and does not mark provider configured',async()=>{
 const api=makeApi({...baseEnv,HH_AGENT_OPENROUTER_API_KEY:key},
  {ok:false,owner:false,canWrite:false,privateStoreConfigured:false,service:null},401);
 const response=await api.api.GET(request());
 assert.equal(response.status,401);
 assert.equal(response.body.error,'OWNER_ACCESS_DENIED');
 assert.ok(!JSON.stringify(response).includes(key));
});
test('missing mandatory service configuration is blocked before any network call',async()=>{
 const api=makeApi({HH_AGENT_OPENROUTER_ENABLED:'true',HH_AGENT_OPENROUTER_API_KEY:key});
 const response=await api.api.GET(request());
 assert.equal(response.status,503);
 assert.equal(response.body.error,'OWNER_AUTH_NOT_CONFIGURED');
 assert.equal(api.calls.length,0);
});
