import test from 'node:test';
import assert from 'node:assert/strict';
import {manageAccess,parseAccessArgs,activeAccess} from '../scripts/wave-gemini-public-access.mjs';
const id='a1111111-1111-4111-8111-111111111111',now=1700000000000;
const grant=['grant',id,'--adult-verified','--region-verified','--public-consent-verified'];
const fake=({confirmed=true,anonymous=false}={})=>{
 const user={id,email_confirmed_at:confirmed?'verified':null,is_anonymous:anonymous,app_metadata:{other_role:'unchanged'}};
 let writes=0;
 return {user,get writes(){return writes},async getUserById(){return {data:{user}}},async updateUserById(target,update){assert.equal(target,id);assert.deepEqual(Object.keys(update.app_metadata),['hh_wave_public_gemini']);writes++;Object.assign(user.app_metadata,update.app_metadata);return {data:{user}}}};
};
test('only explicit verified operator grant, exact account and dry run by default',async()=>{
 const a=fake();
 assert.throws(()=>parseAccessArgs(['grant',id,'--apply']),/VERIFICATION_REQUIRED/);
 assert.throws(()=>parseAccessArgs(['grant','all']),/INVALID_ACTION/);
 assert.deepEqual(await manageAccess(a,grant,now),{status:'dry_run',wouldBeEligible:true});
 assert.equal(a.writes,0);
 assert.deepEqual(await manageAccess(a,[...grant,'--apply'],now),{status:'eligible'});
 assert.equal(a.user.app_metadata.other_role,'unchanged');
 assert.equal(activeAccess(a.user.app_metadata.hh_wave_public_gemini,now+30*86400000),false);
 assert.deepEqual(await manageAccess(a,['status',id],now),{status:'eligible'});
 assert.deepEqual(await manageAccess(a,['revoke',id,'--apply'],now),{status:'revoked'});
 assert.deepEqual(await manageAccess(a,['status',id],now),{status:'ineligible'});
});
test('no grant to anonymous or unconfirmed accounts; failure does not report success',async()=>{
 for(const a of [fake({confirmed:false}),fake({anonymous:true})]){
  await assert.rejects(manageAccess(a,[...grant,'--apply'],now),/VERIFIED_ACCOUNT_REQUIRED/);
  assert.equal(a.writes,0);
 }
 const a=fake();a.updateUserById=async()=>({error:{message:'private'}});
 await assert.rejects(manageAccess(a,[...grant,'--apply'],now),/ACCESS_UPDATE_FAILED/);
 const b=fake();b.updateUserById=async()=>({data:{}});
 await assert.rejects(manageAccess(b,[...grant,'--apply'],now),/ACCESS_READBACK_FAILED/);
});
