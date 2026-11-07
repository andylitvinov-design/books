import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHAT_HISTORY_MAX_PAIRS,validateChatPair,validChatTurnId} from '../lib/holistic-support/agent-chat-history-policy.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('dialogue storage validates bounded text and randomized version-four request ids',()=>{
 assert.equal(CHAT_HISTORY_MAX_PAIRS,30);
 assert.deepEqual(validateChatPair('hello','answer'),{user:'hello',assistant:'answer'});
 assert.equal(validateChatPair('','reply'),null);
 assert.equal(validateChatPair('a'.repeat(2001),'reply'),null);
 assert.equal(validateChatPair('question','b'.repeat(4001)),null);
 assert.equal(validateChatPair('question','x\u0000'),null);
 assert.equal(validChatTurnId('00000000-0000-4000-8000-000000000001'),true);
 assert.equal(validChatTurnId('00000000-0000-1000-8000-000000000001'),false);
});
test('private transcript has FORCE RLS, no client grants, explicit consent and ciphertext-only storage',()=>{
 const sql=source('supabase/migrations/20261107075500_hh_agent_chat_history_opt_in_v1.sql');
 const store=source('lib/holistic-support/agent-chat-history-store.js');
 const api=source('app/api/app/agent-chat-history/route.js');
 assert.match(sql,/agent_chat_history_consent enable row level security/);
 assert.match(sql,/agent_chat_history_pairs force row level security/);
 assert.match(sql,/revoke all on app_private\.agent_chat_history_consent,app_private\.agent_chat_history_pairs/);
 assert.match(sql,/from public,anon,authenticated/);
 assert.match(store,/seal\(pair,context\(actor,id\),config\)/);
 assert.match(store,/openSealed\(entry\.payload_ciphertext/);
 assert.match(store,/select accepted from .*for update/);
 assert.match(store,/CHAT_HISTORY_CONSENT_REQUIRED/);
 assert.match(api,/auth=createRequestAuth\(request,config\)/);
 assert.match(api,/await auth\.verified\(\)/);
 assert.match(api,/requireSameOrigin\(request,config\)/);
 assert.match(api,/x-hh-chat-owner/);
 assert.doesNotMatch(store,/audio[_-]?bytes|audio[_-]?blob|microphoneMedia/iu);
});
test('client history requires separate opt-in and never uses localStorage for transcripts',()=>{
 const client=source('components/holistic-agent-history.tsx');
 assert.match(client,/NEXT_PUBLIC_HH_AGENT_CHAT_HISTORY_ENABLED/);
 assert.match(client,/consentRef\.current/);
 assert.match(client,/onChange=\{event=>void history\.changeConsent/);
 assert.match(client,/history\.erase\(\)/);
 assert.doesNotMatch(client,/localStorage|sessionStorage/);
});
