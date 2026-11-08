import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('owner login reuses the existing Holistic House Google sign-in page',()=>{
 const auth=src('owner-google-signin.js'),chat=src('chats.html'),editor=src('task-editor.html');
 assert.match(auth,/holistichouse\.vercel\.app\/commander-connect\.html/);
 assert.match(auth,/Продолжить через Google/);
 assert.doesNotMatch(auth,/accounts\.google\.com\/gsi\/client|google\.accounts\.id|localStorage|sessionStorage/);
 assert.match(chat,/id="cc-google-owner"/);assert.match(editor,/id="ac-google-owner"/);
 assert.match(chat,/owner-google-signin\.js/);assert.match(editor,/owner-google-signin\.js/);
});
test('main OAuth callback is a fixed continuation and checks the existing Supabase owner ACL',()=>{
 const route=src('../../app/api/app/[...path]/route.js');
 const session=src('../../app/api/app/commander/session/route.js');
 assert.match(route,/commander-monitor/);assert.match(route,/commander-connect\.html\?finish=1/);
 assert.match(session,/auth\.verified\(\)/);assert.match(session,/AGENT_COMMANDER_PRIVATE_STORE_V1/);
 assert.match(session,/data\?\.owner!==true/);assert.match(session,/requireSameOrigin/);
});
test('one-time token handoff is fragment-only and removed immediately by the monitor',()=>{
 const main=src('../../public/commander-connect.js'),monitor=src('commander-auth.js');
 assert.match(main,/target\.hash = 'token='/);assert.doesNotMatch(main,/searchParams\.set\(['"]token/);
 assert.match(monitor,/location\.hash/);assert.match(monitor,/history\.replaceState/);
 assert.match(monitor,/api\/commander-session/);
});
test('owner-only APIs use the private edge store and do not claim executor dispatch',()=>{
 const chats=src('api/commander-chats.js'),drafts=src('api/commander-drafts.js');
 const helper=src('lib/commander-private-store.js'),ui=src('commander-chats.js');
 assert.match(chats,/commander_from_task/);assert.match(chats,/callStore/);
 assert.match(drafts,/commander_queue_task/);assert.match(drafts,/agentStarted/);
 assert.match(helper,/Authorization:'Bearer '\+token/);
 assert.match(ui,/AWAITING|Не запущен|НЕ ЗАПУЩЕН/);
});
