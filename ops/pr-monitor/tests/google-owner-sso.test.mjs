import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('owner login reuses the existing Holistic House Google sign-in page',()=>{
 const auth=src('owner-google-signin.js'),chat=src('chats.html'),editor=src('task-editor.html');
 assert.match(auth,/const MAIN='https:\/\/holistichouse\.vercel\.app'/);
 assert.match(auth,/link\.href=MAIN\+'\/commander-connect\.html\?next='/);
 assert.match(auth,/Продолжить через Google/);
 assert.doesNotMatch(auth,/accounts\.google\.com\/gsi\/client|google\.accounts\.id|localStorage|sessionStorage/);
 assert.match(chat,/id="cc-google-owner"/);assert.match(editor,/id="ac-google-owner"/);
 assert.match(chat,/owner-google-signin\.js/);assert.match(editor,/owner-google-signin\.js/);
});
test('monitor accepts only the one-time fragment handoff and removes it immediately',()=>{
 const monitor=src('commander-auth.js'),session=src('api/commander-session.js');
 assert.match(monitor,/location\.hash/);assert.match(monitor,/history\.replaceState/);
 assert.match(monitor,/api\/commander-session/);
 assert.match(session,/HttpOnly/);assert.match(session,/SameSite=Strict/);
 assert.match(session,/REFRESH_COOKIE/);
 assert.ok(session.includes('/auth/v1/token?grant_type=refresh_token'));
 assert.match(session,/callStore/);
});
test('owner-only APIs use the private edge store and do not claim executor dispatch',()=>{
 const chats=src('api/commander-chats.js'),drafts=src('api/commander-drafts.js');
 const helper=src('lib/commander-private-store.js'),ui=src('commander-chats.js');
 assert.match(chats,/commander_from_task/);assert.match(chats,/callStore/);
 assert.match(drafts,/commander_queue_task/);assert.match(drafts,/SUPABASE_PRIVATE/);
 assert.match(helper,/Authorization:'Bearer '\+token/);
 assert.match(ui,/Assignment and AI answers are NOT agent execution/);
 assert.match(chats,/return sendJson\(res,result\.status,result\.data\)/);
});
