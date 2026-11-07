import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('central Create differentiates tap, 420ms hold, pointer release and cancellation',()=>{
 const nav=src('project-management-nav.js'),css=src('commander-shell.css');
 for(const k of ['pointerdown','pointerup','pointercancel','setPointerCapture','HOLD_DELAY=420',
  'HHBeginHoldVoiceTask','HHFinishHoldVoiceTask','HHCancelHoldVoiceTask','ignoreClickUntil'])
  assert.ok(nav.includes(k),k);
 assert.match(nav,/e\.pointerType==='mouse'/);
 assert.match(nav,/button\.addEventListener\('click'/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(nav,/aria-description/);
});
test('on release Web Speech finalizes without aborting, then displays an editable second screen',()=>{
 const client=src('commander-task-input.js');
 for(const k of ['next.onresult','next.onend','current.stop()','global.setTimeout',
  'showHoldReview','reviewText.maxLength=2500','Сделать промпт','Спросить Совет ИИ',
  'aria-live','voiceEpoch','dialog.hidden'])
  assert.ok(client.includes(k),k);
 assert.match(client,/},2000\)/);
 assert.match(client,/Этот браузер не поддерживает Web Speech/);
 assert.match(client,/Аудиофайл не отправляется и не хранится/);
 assert.doesNotMatch(client,/MediaRecorder|audio\/wav|localStorage|sessionStorage|workflow_dispatch|service_role/);
});
test('Council route remains owner-only and verifies :free model price',async()=>{
 const client=src('commander-task-input.js'),api=src('api/pm-agent-chat.js');
 assert.match(client,/action=council/);
 assert.match(client,/credentials:'same-origin'/);
 assert.match(api,/COUNCIL_SYSTEM/);
 assert.match(api,/ONE_VERIFIED_FREE_MODEL_THREE_PERSPECTIVES/);
 assert.match(api,/ONE free AI model/i);
 assert.match(api,/if\(!isOwner\(req\)\)/);
 assert.match(api,/if\(!correctOrigin\(req\)\)/);
 assert.match(api,/provider:\{allow_fallbacks:false,max_price:\{prompt:0,completion:0\}\}/);
 assert.doesNotMatch(api,/workflow_dispatch|service_role/);
 const handler=require('../api/pm-agent-chat.js');
 const headers={},res={statusCode:200,setHeader(k,v){headers[k]=v},end(s){this.body=JSON.parse(s)}};
 await handler({method:'POST',url:'/api/pm-agent-chat?action=council',
  headers:{host:'holistic-house-pr-monitor.vercel.app',origin:'https://holistic-house-pr-monitor.vercel.app'},
  body:{message:'Сделать голосовую постановку задач для Agent Commander'}},res);
 assert.equal(res.statusCode,401);
 assert.equal(res.body.error,'OWNER_SESSION_REQUIRED');
 assert.equal(headers['Cache-Control'],'private, no-store, max-age=0');
});
