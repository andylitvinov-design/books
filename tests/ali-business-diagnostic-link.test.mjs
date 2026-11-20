import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliBusinessLinkReference,aliBusinessLinkCopy}
 from '../lib/assist/ali-business-diagnostic-link.mjs';
import {v3Context} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {telegramBusinessConversationReply} from '../lib/assist/telegram-business-request.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('cross-channel link parses ONLY an explicit anchored command',()=>{
 assert.equal(aliBusinessLinkReference('/link HH-ABCDEF123456'),'HH-ABCDEF123456');
 assert.equal(aliBusinessLinkReference('/link hh-abcdef123456'),'HH-ABCDEF123456');
 for(const input of [
  'HH-ABCDEF123456','link HH-ABCDEF123456','/link HH-123',
  '/link HH-ABCDEF123456 copy', '/link HH-ABCDEF123456\n/stop',
  '/link HH-ABCDEF123456?token=private','/link HH-ABCDEF123456;DELETE',
  '/link HH-ABCDEF12345Z'
 ])assert.equal(aliBusinessLinkReference(input),null,input);
});

test('encrypted V3 allowlist retains ONLY valid Free Diagnostic link evidence',()=>{
 const good=v3Context({turns:[],mode:'free_diagnostic',
   linkedBusinessReference:'HH-ABCDEF123456'});
 assert.equal(good.linkedBusinessReference,'HH-ABCDEF123456');
 for(const opts of [{mode:'secretary'},{mode:'secretary_psychologist'},
   {mode:'free_diagnostic',linkedBusinessReference:'HH-INVALIDCODE'}]){
   const ctx=v3Context({turns:[],linkedBusinessReference:'HH-ABCDEF123456',...opts});
   if(opts.mode!=='free_diagnostic')assert.equal(ctx.linkedBusinessReference,undefined);
 }
 assert.equal(v3Context({turns:[],mode:'free_diagnostic',
  linkedBusinessReference:'HH-ABCDEF12345Z'}).linkedBusinessReference,undefined);
});

test('matching a reference alone NEVER authorizes cross-transport identity',()=>{
 const s=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(s,/if\(row.stage==='done'\)/);
 assert.match(s,/if\(!row.consent_at\)return \{handled:true\}/);
 assert.match(s,/if\(\/\^\\\/link\\b\/i\.test\(raw\)\)/);
 assert.match(s,/ctx\.verifiedTelegramUserId===String\(event\.userId\)/);
 assert.match(s,/scope:'hh-telegram-business-peer'/);
 assert.match(s,/b\.telegram_peer_hash=\$2/);
 assert.match(s,/b\.reference_code=\$1/);
 assert.match(s,/p\.trusted_auth_user_id=\$3/);
 assert.match(s,/pg_catalog\.set_config\('hh\.practitioner_id'/);
 assert.match(s,/String\(PRACTITIONER_ID\)/);
 assert.match(s,/b\.stage='submitted'/);
 assert.match(s,/b\.consent_at is not null/);
 assert.match(s,/ALI_BUSINESS_LINK_CRM_CONFIRM_FAILED/);
 assert.match(s,/ingestMessengerEventInTransaction/);
 assert.match(s,/linkedBusinessReference:ref/);
});

test('submitted Business reviews explain independent package and verified one-time link',()=>{
 for(const [locale,title] of [
  ['ru','Расширенная диагностика'],['en','Extended review'],['es','Revisión ampliada']
 ]){
  const message=telegramBusinessConversationReply('submitted',{
   locale,service:'personal_review',offerId:'personal_extended_review',
   referenceCode:'HH-ABCDEF123456'});
  assert.ok(message.length>70&&message.length<=600,locale);
  assert.match(message,/\/link HH-ABCDEF123456/);
  assert.match(message,/https:\/\/t\.me\/holistichouse_bot\?start=hhreview_/);
  assert.match(message,new RegExp(title));
 }
});
test('uniform safe responses do not reveal strangers references or status',()=>{
 for(const locale of ['ru','en','es']){
  assert.equal(aliBusinessLinkCopy(locale,'unverified','HH-ABCDEF123456')
   .includes('HH-ABCDEF123456'),false);
  assert.equal(aliBusinessLinkCopy(locale,'linked','HH-ABCDEF123456')
   .includes('HH-ABCDEF123456'),true);
 }
});


/** Execute the actual protected /link branch under a synthetic transaction.
 * No Telegram messages, client accounts, production database, file uploads,
 * paid providers or real customer text are used in this runtime proof.
 */
const simulatedVerifiedLink = (eventLog,options={}) => {
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const begin=service.indexOf("        if(/^\\/link\\b/i.test(raw)){");
 const end=service.indexOf("        if(action==='status'||freePackageStatusIntent(raw))",begin);
 assert.ok(begin>0&&end>begin&&end-begin<5000,'exact protected branch was found');
 const code=service.slice(begin,end);
 const deps={
  PRACTITIONER_ID:'246aa1a3-a371-5a83-9f4b-cd23ff027a76',
  aliBusinessLinkReference,aliBusinessLinkCopy,
  operationHash:({scope,id})=>{
   assert.equal(scope,'hh-telegram-business-peer');
   return 'peer:'+id;
  },
  updateRow:async(_db,business,user,sql,args)=>{
   eventLog.push({kind:'update',business,user,sql,args});
  },
  response:(_event,language,reply)=>({language,reply}),
  ingestMessengerEventInTransaction:async(_db,channel,event)=>{
   assert.equal(channel,'telegram');
   eventLog.push({kind:'receipt',body:event.body,fileId:event.telegramPhotoFileId});
   return options.storageOk!==false;
  },
  encryptContext:(_current,ctx)=>JSON.stringify({protected:true,reference:ctx.linkedBusinessReference}),
 };
 const factory=new Function('deps',
  'return async function simulate(input){'+
  ' const {ctx,raw,event,lang,updateId,db,keys,connected,config,current}=input;'+
  ' const {PRACTITIONER_ID,aliBusinessLinkReference,aliBusinessLinkCopy,operationHash,'+
  ' updateRow,response,ingestMessengerEventInTransaction,encryptContext}=deps;'+
  code+' return {notHandled:true};'+
  '}');
 return factory(deps);
};
const linkFixture=async(overrides={})=>{
 const log=[],ref='HH-ABCDEF123456';
 const userId=overrides.userId||'1111111';
 const owner=overrides.ownerId||'11111111-1111-4111-8111-111111111111';
 const db={query:async(sql,args=[])=>{
  if(sql.includes("pg_catalog.set_config('hh.practitioner_id'")){
   assert.deepEqual(args,['246aa1a3-a371-5a83-9f4b-cd23ff027a76']);
   log.push({kind:'rls_scope'});return {rows:[{set_config:''}]};
  }
  assert.equal(log.some(x=>x.kind==='rls_scope'),true,
    'scope must precede protected practitioner SELECT');
  assert.match(sql,/b\.reference_code=\$1/);
  assert.match(sql,/b\.telegram_peer_hash=\$2/);
  assert.match(sql,/p\.trusted_auth_user_id=\$3/);
  assert.match(sql,/b\.stage='submitted'/);
  assert.match(sql,/b\.consent_at is not null/);
  assert.match(sql,/b\.delivery_format='async'/);
  log.push({kind:'select',sql,args});
  const match=overrides.selectExists!==false&&
   args[0]===ref&&args[1]==='peer:'+userId&&args[2]===owner;
  return {rows:match?[{reference_code:ref}]:[]};
 }};
 const app=simulatedVerifiedLink(log,overrides);
 const input={
  ctx:{verifiedTelegramUserId:overrides.contextUserId||'1111111',
   ...(overrides.linkedBusinessReference
    ?{linkedBusinessReference:overrides.linkedBusinessReference}:{})},
  raw:overrides.raw||'/link '+ref,
  event:{userId,eventId:'tg:333',messageId:'tg:msg:333',type:'incoming'},
  lang:overrides.locale||'en',updateId:333,db,
  keys:{business:'safebusiness',user:'safeuser'},
  connected:{owner_id:owner},config:{},current:{ai_context_id:'synthetic-context'}
 };
 const response=await app(input);
 return {response,log};
};

test('runtime: verified matching Telegram identity makes exactly one neutral CRM reference',async()=>{
 for(const locale of ['ru','en','es']){
  const {response,log}=await linkFixture({locale});
  assert.match(response.reply,/HH-ABCDEF123456/);
  assert.deepEqual(log.map(x=>x.kind),['rls_scope','select','receipt','update']);
  const receipt=log[2];
  assert.equal(receipt.fileId,null,'a cross-reference cannot fabricate a photo receipt');
  assert.match(receipt.body,/client-authorized cross-channel link/i);
  assert.doesNotMatch(receipt.body,/clinical|diagnos(?:is|tic result)|account ID|private photo/i);
  assert.equal(log[3].args[0]?.includes('HH-ABCDEF123456'),true,
    'encrypted V3 allowlist stores the verified reference only');
 }
});

test('runtime: a foreign Telegram ID, unmatched Business peer, owner or reference NEVER link',async()=>{
 for(const options of [
  {userId:'2222222'},
  {selectExists:false},
  {raw:'/link not-a-reference'},
  {raw:'/link HH-ABCDEF123456 extra'},
  {linkedBusinessReference:'HH-111111111111'}
 ]){
  const {response,log}=await linkFixture(options);
  assert.ok(response?.reply,'unverified link has a neutral reply');
  assert.equal(log.some(x=>x.kind==='receipt'),false,JSON.stringify(options));
  assert.equal(log.some(x=>x.kind==='update'&&x.sql.includes('ai_context_ciphertext')),false);
  if(options.userId)assert.equal(log.some(x=>x.kind==='select'),false);
 }
});

test('runtime: approved link replay is idempotent; failed CRM write does not commit context',async()=>{
 const prior=await linkFixture({linkedBusinessReference:'HH-ABCDEF123456'});
 assert.deepEqual(prior.log.map(x=>x.kind),['rls_scope','select','update'],
  'replaying verified command creates no additional CRM event');
 const log=[];
 await assert.rejects(()=>linkFixture({storageOk:false}),/ALI_BUSINESS_LINK_CRM_CONFIRM_FAILED/);
 // Production webhookTransaction handles the rollback after thrown failure;
 // the actual branch must not update encrypted context before CRM acceptance.
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const begin=service.indexOf("        if(/^\\/link\\b/i.test(raw)){");
 const end=service.indexOf("        if(action==='status'||freePackageStatusIntent(raw))",begin);
 const linkBlock=service.slice(begin,end);
 assert.ok(linkBlock.indexOf('if(stored!==true)throw') <
   linkBlock.indexOf('encryptContext(current,{...ctx,linkedBusinessReference:ref},config)'));
});
