import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLiveGiftXpEnabled, LIVE_GIFT_XP, reserveLiveGiftXp, settleLiveGiftXp } from '../lib/video-credits/live-gift-wallet.mjs';

const env={
 HH_LIVE_PHOTOS_XP_BRIDGE_ENABLED:'true',HH_VIDEO_XP_V2_ENABLED:'true',
 HH_VIDEO_XP_V2_SCHEMA_APPROVED:'true',HH_VIDEO_CREDITS_ENABLED:'true',
 HH_VIDEO_CREDITS_SCHEMA_APPROVED:'true',HH_APP_ENABLED:'true',
 HH_APP_PRODUCTION_APPROVED:'true',VERCEL_ENV:'production',
 HH_VIDEO_XP_V2_CUTOVER_UTC:'2026-11-22T01:00:00Z',
};
test('live photo requires full wallet v2 activation in addition to the HeyGen budget gates',()=>{
 assert.equal(LIVE_GIFT_XP,500);
 assert.equal(isLiveGiftXpEnabled(env),true);
 for(const key of Object.keys(env)){
   if(key==='VERCEL_ENV')continue;
   const partial={...env};delete partial[key];
   assert.equal(isLiveGiftXpEnabled(partial),false,key);
 }
 assert.equal(isLiveGiftXpEnabled({...env,HH_LIVE_PHOTOS_XP_BRIDGE_ENABLED:'false'}),false);
});
function mockReserve({starter=1900,monthly=0,spentStarter=0,spentMonthly=0}={}){
 const calls=[];
 const db={query:async(sql,args)=>{
   calls.push({sql,args});
   if(sql.includes('from app.accounts'))return {rows:[{status:'active',onboarding_state:'active'}]};
   if(sql.startsWith('select credits,sku,price_version from'))return {rows:[]};
   if(sql.includes('from app_private.video_credit_grants'))return {rows:[{starter,monthly}]};
   if(sql.includes('coalesce(sum(starter_used)'))return {rows:[{starter:spentStarter,monthly:spentMonthly}]};
   if(sql.includes('insert into app_private.video_credit_charges'))return {rows:[{operation_id:args[1]}]};
   throw Error('unexpected query: '+sql);
 }};
 return {db,calls};
}
test('500-XP hold uses the existing charges ledger, fixed SKU and serialized app account lock',async()=>{
 const fixture=mockReserve({starter:1900,spentStarter:250});
 const id='6b7efdac-7ee6-4a89-8c3a-dd7d47d8781c';
 assert.deepEqual(await reserveLiveGiftXp(fixture.db,'account',id),{operationId:id,priceXp:500});
 const insertion=fixture.calls.find(x=>x.sql.includes('insert into app_private.video_credit_charges'));
 assert.deepEqual(insertion.args.slice(2,7),[500,0,500,'live_gift','xp-v2-20261121']);
 assert.match(insertion.sql,/30 days/);
 assert.match(fixture.calls[0].sql,/for update/);
});
test('insufficient wallet cannot send a billable provider request',async()=>{
 await assert.rejects(reserveLiveGiftXp(mockReserve({starter:250}).db,'account','job'),
  error=>error.code==='VIDEO_CREDITS_INSUFFICIENT'&&error.status===402);
});
function mockSettle(state='held'){
 const calls=[];const db={query:async(sql,args)=>{
   calls.push({sql,args});
   if(sql.includes('from app.accounts'))return {rows:[{status:'active',onboarding_state:'active'}]};
   if(sql.startsWith('select credits,sku,price_version,status,artifact_bytes'))return {rows:[{credits:500,sku:'live_gift',price_version:'xp-v2-20261121',status:state,artifact_bytes:2048}]};
   if(sql.includes('update app_private.video_credit_charges'))return {rows:[{status:'completed'}]};
   throw Error('unexpected query: '+sql);
 }};
 return {db,calls};
}
test('capture happens only for verified MP4 length, and cannot capture after a release',async()=>{
 const f=mockSettle();
 assert.equal(await settleLiveGiftXp(f.db,'account','job','completed',2048),'completed');
 assert.match(f.calls.at(-1).sql,/status='completed'/);
 await assert.rejects(settleLiveGiftXp(mockSettle('released').db,'account','job','completed',2048),/VIDEO_CREDIT_OPERATION_MISMATCH/);
 await assert.rejects(settleLiveGiftXp(mockSettle().db,'account','job','completed',500),/VIDEO_CREDIT_ARTIFACT_INVALID/);
});
test('release uses the exact same reserved operation and never authorizes client ledger endpoints',async()=>{
 const f=mockSettle();
 assert.equal(await settleLiveGiftXp(f.db,'account','job','released'),'released');
 assert.match(f.calls.at(-1).sql,/status='released'/);
 const migration=readFileSync('supabase/migrations/20261122011500_hh_client_live_photo_xp_bridge_v1.sql','utf8');
 assert.match(migration,/foreign key \(account_id,xp_operation_id\)/i);
 assert.match(migration,/billing_kind='xp'/);
 assert.doesNotMatch(migration,/grant.*(?:anon|authenticated)/i);
 const service=readFileSync('lib/app/live-photo-service.js','utf8');
 assert.match(service,/reserveLiveGiftXp/);
 assert.match(service,/settleLiveGiftXp/);
 assert.match(service,/billing_kind,xp_operation_id/);
});
