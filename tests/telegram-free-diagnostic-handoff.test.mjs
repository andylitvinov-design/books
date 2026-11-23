import test from 'node:test';
import assert from 'node:assert/strict';
import {issueTelegramFreeDiagnosticHandoff,verifyTelegramFreeDiagnosticHandoff,
  freeDiagnosticFormUrl} from '../lib/coaching/telegram-free-diagnostic-handoff.mjs';
const config={encryptionKey:Buffer.alloc(32,21)};
const identity={
 ownerId:'f8b971c5-c4d7-4d90-a88f-e2e9bff2688e',
 contextId:'947a8c21-8055-4b20-9f90-310404ad1321',
 businessHash:'a'.repeat(64),userHash:'b'.repeat(64),locale:'en',
};
const NOW=Date.UTC(2026,10,17,18,0);
test('explicit authenticated one-hour V3 form link contains no plaintext private client information',()=>{
 const token=issueTelegramFreeDiagnosticHandoff(identity,config,NOW);
 assert.match(token,/^h2\.[A-Za-z0-9_-]{120,1200}$/);
 assert.doesNotMatch(token,/947a8c21|f8b971c5|aaaaa|bbbb|@|email|chat/);
 const proof=verifyTelegramFreeDiagnosticHandoff(token,config,NOW+100);
 assert.equal(proof.ownerId,identity.ownerId);
 assert.equal(proof.contextId,identity.contextId);
 assert.equal(proof.locale,'en');
 assert.equal(proof.scope,'free_diagnostic_form');
 const url=freeDiagnosticFormUrl('en',token);
 assert.match(url,/^https:\/\/holistichouse\.vercel\.app\/en\/coaching\/intake\?topic=other#handoff=h2\./);
 assert.equal(new URL(url).searchParams.get('handoff'),null,'bearer must stay in fragment');
});
test('expired, forged, foreign or altered handoffs fail closed',()=>{
 const token=issueTelegramFreeDiagnosticHandoff(identity,config,NOW);
 assert.equal(verifyTelegramFreeDiagnosticHandoff(token,config,NOW+60*60*1000+1),null);
 assert.equal(verifyTelegramFreeDiagnosticHandoff(token,
   {encryptionKey:Buffer.alloc(32,22)},NOW),null);
 assert.equal(verifyTelegramFreeDiagnosticHandoff(
   token.slice(0,95)+(token[95]==='X'?'Y':'X')+token.slice(96),config,NOW),null);
 assert.equal(verifyTelegramFreeDiagnosticHandoff('h1.'+token.slice(3),config,NOW),null);
 assert.equal(verifyTelegramFreeDiagnosticHandoff('',config,NOW),null);
 assert.equal(freeDiagnosticFormUrl('xx',token),null);
 assert.throws(()=>issueTelegramFreeDiagnosticHandoff({
   ...identity,userHash:'not-a-hash'},config,NOW),/INVALID_FREE_HANDOFF/);
});
test('RU and EN links retain locale; token cannot substitute another owner or thread',()=>{
 for(const locale of ['ru','en']){
  const link=issueTelegramFreeDiagnosticHandoff({...identity,locale},config,NOW);
  const verified=verifyTelegramFreeDiagnosticHandoff(link,config,NOW+200);
  assert.equal(verified.locale,locale);
  assert.equal(verified.businessHash,identity.businessHash);
  assert.equal(verified.userHash,identity.userHash);
  assert.ok(freeDiagnosticFormUrl(locale,link)?.includes('/'+locale+'/coaching/intake'));
 }
});
