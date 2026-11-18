import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createNativeDialogueSession,readNativeDialogueSession,advanceNativeDialogueTrustedEvent,advanceNativeDialogueMessage,eraseNativeDialogueSession,purgeExpiredNativeDialogueSessions} from '../lib/holistic-support/native-dialogue-session-store.js';
import {closeDatabase,transaction} from '../lib/app/database.js';
import {seal} from '../lib/app/crypto.js';

const raw=process.env.HH_NATIVE_TEST_DATABASE_URL;
if(!raw)throw Error('Set HH_NATIVE_TEST_DATABASE_URL to the isolated local test cluster');
const parsed=new URL(raw);
if(parsed.hostname!=='localhost'||!/^\/tmp\/hh4367-pg-[A-Za-z0-9]+$/.test(parsed.searchParams.get('host')||'')||parsed.port!=='55488')throw Error('Refusing non-isolated database');
const config={databaseUrl:raw,test:true,encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'native-test'};
const actor=(id,session_id)=>({id,claims:{sub:id,session_id,exp:Math.floor(Date.now()/1000)+3600}});
const a=actor('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const b=actor('22222222-2222-4222-8222-222222222222','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const admin=new pg.Client({connectionString:raw});
after(async()=>{await closeDatabase();await admin.end();});

test('encrypted session binds actor and session and atomically rejects concurrent revisions',async()=>{
 await admin.connect();
 const created=await createNativeDialogueSession(config,a);
 assert.equal(created.state.revision,0);
 const event={type:'set_goal',value:'consultation',expectedRevision:0};
 const results=await Promise.allSettled([
  advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{...event,turnId:randomUUID()}),
  advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{...event,turnId:randomUUID()}),
 ]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.code==='REVISION_MISMATCH').length,1);
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,b,created.sessionId,{...event,expectedRevision:1,turnId:randomUUID()}),{code:'NATIVE_SESSION_NOT_FOUND'});
 const row=(await admin.query('select revision,state_ciphertext from app_private.native_dialogue_sessions where id=$1',[created.sessionId])).rows[0];
 assert.equal(row.revision,1);assert.ok(!row.state_ciphertext.includes('consultation'));
});
test('a refusal must originate from a committed turn',async()=>{
 const created=await createNativeDialogueSession(config,a);
 const state={...created.state,declinedMeditation:{value:'meditation',confirmed:true,sourceTurnId:randomUUID()}};
 const ciphertext=seal({version:1,state,turnIds:[]},{accountId:a.id,recordId:created.sessionId,field:'native.dialogue.state'},config);
 await admin.query('update app_private.native_dialogue_sessions set state_ciphertext=$1 where id=$2',[ciphertext,created.sessionId]);
 await assert.rejects(readNativeDialogueSession(config,a,created.sessionId,0),{code:'NATIVE_SESSION_CORRUPT'});
});
test('a stored goal phrase must originate from a committed turn',async()=>{
 const created=await createNativeDialogueSession(config,a);
 const state={...created.state,goalStatement:{value:'I want a calmer conversation.',confirmed:true,sourceTurnId:randomUUID()}};
 const ciphertext=seal({version:1,state,turnIds:[]},{accountId:a.id,recordId:created.sessionId,field:'native.dialogue.state'},config);
 await admin.query('update app_private.native_dialogue_sessions set state_ciphertext=$1 where id=$2',[ciphertext,created.sessionId]);
 await assert.rejects(readNativeDialogueSession(config,a,created.sessionId,0),{code:'NATIVE_SESSION_CORRUPT'});
});
test('an advice refusal must originate from a committed turn',async()=>{
 const created=await createNativeDialogueSession(config,a);
 const state={...created.state,declinedAdvice:{value:'advice',confirmed:true,sourceTurnId:randomUUID()}};
 const ciphertext=seal({version:1,state,turnIds:[]},{accountId:a.id,recordId:created.sessionId,field:'native.dialogue.state'},config);
 await admin.query('update app_private.native_dialogue_sessions set state_ciphertext=$1 where id=$2',[ciphertext,created.sessionId]);
 await assert.rejects(readNativeDialogueSession(config,a,created.sessionId,0),{code:'NATIVE_SESSION_CORRUPT'});
});
test('RU/EN refusal persists encrypted and is cleared only by an explicit reversal',async()=>{
 for(const [locale,refusal,renewal] of [
  ['ru','Не предлагайте мне больше медитации','На самом деле я хочу медитацию'],
  ['en','Please do not suggest meditation anymore','Actually I want a meditation'],
 ]){
  const created=await createNativeDialogueSession(config,a),id=created.sessionId;
  const rejected=await advanceNativeDialogueMessage(config,a,id,{message:refusal,locale,turnId:randomUUID(),expectedRevision:0});
  assert.equal(rejected.state.declinedMeditation?.value,'meditation');
  const next=await advanceNativeDialogueMessage(config,a,id,{message:locale==='ru'?'Продолжим':'Continue',locale,turnId:randomUUID(),expectedRevision:1});
  assert.equal(next.state.declinedMeditation?.value,'meditation');
  assert.equal((await readNativeDialogueSession(config,a,id,2)).declinedMeditation?.value,'meditation');
  const row=(await admin.query('select state_ciphertext from app_private.native_dialogue_sessions where id=$1',[id])).rows[0];
  assert.ok(!row.state_ciphertext.includes(refusal));assert.ok(!row.state_ciphertext.includes('meditation'));
  const renewed=await advanceNativeDialogueMessage(config,a,id,{message:renewal,locale,turnId:randomUUID(),expectedRevision:2});
  assert.equal(renewed.state.declinedMeditation,null);
 }
});

test('turn IDs cannot be replayed at a newer revision and deletion is owner scoped',async()=>{
 const created=await createNativeDialogueSession(config,a),turnId=randomUUID();
 await advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'set_goal',value:'consultation',expectedRevision:0,turnId});
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:1,turnId}),{code:'TURN_REPLAY'});
 assert.equal((await eraseNativeDialogueSession(config,b,created.sessionId)).deleted,false);
 assert.equal((await eraseNativeDialogueSession(config,a,created.sessionId)).deleted,true);
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:1,turnId:randomUUID()}),{code:'NATIVE_SESSION_NOT_FOUND'});
});
test('tampered ciphertext fails closed and leaves revision unchanged',async()=>{
 const created=await createNativeDialogueSession(config,a);
 await admin.query("update app_private.native_dialogue_sessions set state_ciphertext='invalid-ciphertext-fixture-000' where id=$1",[created.sessionId]);
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:0,turnId:randomUUID()}),{code:'PRIVATE_DATA_UNAVAILABLE'});
 const row=(await admin.query('select revision from app_private.native_dialogue_sessions where id=$1',[created.sessionId])).rows[0];
 assert.equal(row.revision,0);
});

test('replay is rejected even after the short in-memory turn window',async()=>{
 const created=await createNativeDialogueSession(config,a),first=randomUUID();
 let result=await advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:0,turnId:first});
 for(let i=1;i<34;i++)result=await advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:i,turnId:randomUUID()});
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:result.state.revision,turnId:first}),{code:'TURN_REPLAY'});
});
test('expired sessions cannot be advanced',async()=>{
 const created=await createNativeDialogueSession(config,a);
 await admin.query("update app_private.native_dialogue_sessions set created_at=now()-interval '2 hours',expires_at=now()-interval '90 minutes' where id=$1",[created.sessionId]);
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:0,turnId:randomUUID()}),{code:'NATIVE_SESSION_NOT_FOUND'});
});
test('existing housekeeping removes expired state and preserves active state',async()=>{
 const active=await createNativeDialogueSession(config,a),expired=await createNativeDialogueSession(config,a);
 await admin.query("update app_private.native_dialogue_sessions set created_at=now()-interval '2 hours',expires_at=now()-interval '90 minutes' where id=$1",[expired.sessionId]);
 const count=await transaction(config,null,db=>purgeExpiredNativeDialogueSessions(db,250),{server:true});
 assert.ok(count>=1);
 const remaining=await admin.query('select id from app_private.native_dialogue_sessions where id=any($1::uuid[])',[[active.sessionId,expired.sessionId]]);
 assert.deepEqual(remaining.rows.map(row=>row.id),[active.sessionId]);
});
test('a different login session of the same account cannot access state',async()=>{
 await admin.query("insert into auth.sessions(id,user_id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',$1) on conflict(id) do nothing",[a.id]);
 assert.equal((await admin.query("select user_id from auth.sessions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'")).rows[0].user_id,a.id);
 const created=await createNativeDialogueSession(config,a);
 const other=actor(a.id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,other,created.sessionId,{type:'ordinary',expectedRevision:0,turnId:randomUUID()}),{code:'NATIVE_SESSION_NOT_FOUND'});
});
test('an expired login token cannot create or advance state',async()=>{
 const created=await createNativeDialogueSession(config,a);
 const expiredActor={...a,claims:{...a.claims,exp:Math.floor(Date.now()/1000)-1}};
 await assert.rejects(createNativeDialogueSession(config,expiredActor),{code:'SIGN_IN_REQUIRED'});
 await assert.rejects(advanceNativeDialogueTrustedEvent(config,expiredActor,created.sessionId,{type:'ordinary',expectedRevision:0,turnId:randomUUID()}),{code:'SIGN_IN_REQUIRED'});
});
test('twelve synthetic user turns preserve bounded encrypted state across real transactions',async()=>{
 const created=await createNativeDialogueSession(config,a);
 let state=created.state,choice=null;
 const send=async(message)=>{
  const result=await advanceNativeDialogueMessage(config,a,created.sessionId,{message,locale:'en',turnId:randomUUID(),expectedRevision:state.revision});
  state=result.state;return result;
 };
 await send('I want a consultation');await send('About relationships');await send('In the evening, please');
 await send('How much does it cost?');assert.equal(state.goal?.value,'consultation');assert.equal(state.timePreference?.value,'evening');
 await send('No, do not book, just talk');assert.equal(state.goal?.value,'conversation');
 await send('Thank you, but I have another question');assert.equal(state.goal,null);
 await send('You misunderstood: not coaching, but a consultation');assert.equal(state.goal?.value,'consultation');
 state=(await advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'offer_choices',choiceIds:['first','second'],turnId:randomUUID(),expectedRevision:state.revision})).state;
 choice=(await send('The second option')).choiceId;assert.equal(choice,'second');
 await send('Why?');await send('How?');await send('Thank you');await send('Goodbye');
 assert.equal(state.revision,13);assert.equal(state.goal,null);
 const stored=(await admin.query('select state_ciphertext from app_private.native_dialogue_sessions where id=$1',[created.sessionId])).rows[0];
 assert.ok(!stored.state_ciphertext.includes('relationships'));
});
test('user messages cannot supply fabricated trusted state or server offer events',async()=>{
 const created=await createNativeDialogueSession(config,a);
 const first=await advanceNativeDialogueMessage(config,a,created.sessionId,{message:'In the evening, please',locale:'en',turnId:randomUUID(),expectedRevision:0,state:{goal:{value:'consultation'}},type:'offer_choices',choiceIds:['fake']});
 assert.equal(first.state.timePreference,null);
 assert.deepEqual(first.state.lastOfferedChoices,[]);
 const next=await advanceNativeDialogueMessage(config,a,created.sessionId,{message:'I want a consultation',locale:'en',turnId:randomUUID(),expectedRevision:1});
 assert.equal(next.state.goal?.value,'consultation');
 const timed=await advanceNativeDialogueMessage(config,a,created.sessionId,{message:'In the evening, please',locale:'en',turnId:randomUUID(),expectedRevision:2});
 assert.equal(timed.state.timePreference?.value,'evening');
});
test('server offers and the user event commit atomically; client cannot forge the offer list',async()=>{
 const created=await createNativeDialogueSession(config,a);
 const snapshot=await readNativeDialogueSession(config,a,created.sessionId,0);
 assert.equal(snapshot.revision,0);
 await assert.rejects(readNativeDialogueSession(config,b,created.sessionId,0),{code:'NATIVE_SESSION_NOT_FOUND'});
 const first=await advanceNativeDialogueMessage(config,a,created.sessionId,
  {message:'I want a consultation',locale:'en',turnId:randomUUID(),expectedRevision:0,offeredChoiceIds:['evil']},
  {offeredChoiceIds:['service:first','service:second']});
 assert.deepEqual(first.state.lastOfferedChoices,['service:first','service:second']);
 const picked=await advanceNativeDialogueMessage(config,a,created.sessionId,
  {message:'The second option',locale:'en',turnId:randomUUID(),expectedRevision:1,offeredChoiceIds:['evil']},
  {offeredChoiceIds:[]});
 assert.equal(picked.choiceId,'service:second');assert.deepEqual(picked.state.lastOfferedChoices,[]);
 await assert.rejects(readNativeDialogueSession(config,a,created.sessionId,0),{code:'REVISION_MISMATCH'});
});
test('an explicit cancellation cannot atomically attach new offers and failed commit rolls back',async()=>{
 const created=await createNativeDialogueSession(config,a);
 await assert.rejects(advanceNativeDialogueMessage(config,a,created.sessionId,
  {message:'No, do not book, just talk',locale:'en',turnId:randomUUID(),expectedRevision:0},
  {offeredChoiceIds:['service:first']}),/INVALID_EVENT/);
 const unchanged=await readNativeDialogueSession(config,a,created.sessionId,0);
 assert.equal(unchanged.revision,0);assert.deepEqual(unchanged.lastOfferedChoices,[]);
});
test('topic reset cannot atomically attach new offers',async()=>{
 for(const message of ['Change topic','Not about relationships, but about astronomy']){
  const created=await createNativeDialogueSession(config,a);
  await assert.rejects(advanceNativeDialogueMessage(config,a,created.sessionId,
   {message,locale:'en',turnId:randomUUID(),expectedRevision:0},{offeredChoiceIds:['service:first']}),/INVALID_EVENT/);
  assert.equal((await readNativeDialogueSession(config,a,created.sessionId,0)).revision,0);
 }
});
test('revoking the verified login session deletes state and prevents subsequent use',async()=>{
 const created=await createNativeDialogueSession(config,a);
 try{
  await admin.query('delete from auth.sessions where id=$1',[a.claims.session_id]);
  assert.equal((await admin.query('select count(*)::int n from app_private.native_dialogue_sessions where id=$1',[created.sessionId])).rows[0].n,0);
  await assert.rejects(advanceNativeDialogueTrustedEvent(config,a,created.sessionId,{type:'ordinary',expectedRevision:0,turnId:randomUUID()}),{code:'SIGN_IN_REQUIRED'});
 }finally{
  await admin.query('insert into auth.sessions(id,user_id) values($1,$2) on conflict(id) do nothing',[a.claims.session_id,a.id]);
 }
});
test('housekeeping safely skips the optional table before migration',async()=>{
 await admin.query('begin');
 try{
  await admin.query('drop table app_private.native_dialogue_sessions');
  assert.equal(await purgeExpiredNativeDialogueSessions(admin,250),0);
 }finally{await admin.query('rollback');}
});
