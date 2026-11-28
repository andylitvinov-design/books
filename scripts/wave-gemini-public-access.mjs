// Operator-only access provisioning. No browser endpoint or provider requests.
import {pathToFileURL} from 'node:url';
const key='hh_wave_public_gemini';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const day=86400000;
export function parseAccessArgs(args){
 const [action,id,...flags]=args;
 if(!['status','grant','revoke'].includes(action)||!uuid.test(id||''))throw Error('INVALID_ACTION_OR_ACCOUNT');
 const known=new Set(['--apply','--adult-verified','--region-verified','--public-consent-verified']);
 if(flags.some(f=>!known.has(f))||new Set(flags).size!==flags.length)throw Error('INVALID_FLAGS');
 if(action==='grant'&&!['--adult-verified','--region-verified','--public-consent-verified'].every(f=>flags.includes(f)))throw Error('VERIFICATION_REQUIRED');
 if(action!=='grant'&&flags.some(f=>f!=='--apply'))throw Error('UNEXPECTED_ATTESTATION');
 if(action==='status'&&flags.length)throw Error('STATUS_IS_READ_ONLY');
 return {action,id,apply:flags.includes('--apply')};
}
export function activeAccess(meta,now=Date.now()){
 return meta?.version===1&&meta.adultVerified===true&&meta.eligibleRegionVerified===true&&meta.publicGeminiConsent===true&&Number.isSafeInteger(meta.expiresAtMs)&&meta.expiresAtMs>now;
}
export async function manageAccess(admin,args,now=Date.now()){
 const {action,id,apply}=parseAccessArgs(args);
 const read=async()=>{
  const {data,error}=await admin.getUserById(id);
  if(error||data?.user?.id!==id)throw Error('ACCOUNT_LOOKUP_FAILED');
  return data.user;
 };
 const user=await read();
 const current=user.app_metadata?.[key];
 if(action==='status')return {status:activeAccess(current,now)?'eligible':'ineligible'};
 if(action==='grant'&&(user.is_anonymous===true||!user.email_confirmed_at))throw Error('VERIFIED_ACCOUNT_REQUIRED');
 const next=action==='grant'?{version:1,adultVerified:true,eligibleRegionVerified:true,publicGeminiConsent:true,expiresAtMs:now+30*day}:{version:1,adultVerified:false,eligibleRegionVerified:false,publicGeminiConsent:false,expiresAtMs:now};
 if(!apply)return {status:'dry_run',wouldBeEligible:activeAccess(next,now)};
 // Send only the dedicated app_metadata key; Supabase Auth merges app_metadata.
 // Never copy stale unrelated authorization fields into the update.
 const {error}=await admin.updateUserById(id,{app_metadata:{[key]:next}});
 if(error)throw Error('ACCESS_UPDATE_FAILED');
 const after=(await read()).app_metadata?.[key];
 if(!Object.keys(next).every(k=>after?.[k]===next[k]))throw Error('ACCESS_READBACK_FAILED');
 return {status:activeAccess(after,now)?'eligible':'revoked'};
}
async function main(){
 const args=process.argv.slice(2);parseAccessArgs(args);
 const url=new URL(process.env.HH_APP_SUPABASE_URL||'');
 const secret=process.env.HH_APP_SUPABASE_SECRET_KEY;
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!secret)throw Error('ADMIN_CONFIG_REQUIRED');
 const {createClient}=await import('@supabase/supabase-js');
 const client=createClient(url.origin,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 console.log(JSON.stringify(await manageAccess(client.auth.admin,args)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(()=>{console.error('Wave Gemini access operation failed; verify operator authorization, account and flags.');process.exitCode=1;});
}
