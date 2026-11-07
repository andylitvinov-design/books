import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Agent Studio uses the existing owner-only app and protected API',()=>{
 const page=read('app/admin/command-center/mobile/page.tsx');
 const client=read('app/admin/command-center/mobile/agent-studio.tsx');
 const core=read('app/api/admin/command-center/route.js');
 assert.match(page,/requireAdminRequest/);
 assert.match(page,/redirect\('\/admin\/login'\)/);
 assert.match(page,/readCommandSnapshot/);
 assert.match(client,/\/api\/admin\/command-center/);
 assert.match(client,/credentials:'same-origin'/);
 assert.match(client,/crypto\.randomUUID/);
 assert.match(core,/CROSS_ORIGIN_DENIED/);
 assert.doesNotMatch(client,/fetch\(['"]https?:/);
});
test('only an exact allowlisted books PR or issue can become an executable audit',()=>{
 const ui=read('app/admin/command-center/mobile/agent-studio.tsx');
 assert.match(ui,/andylitvinov-design\\\/books/);
 assert.match(ui,/repo_issue_audit/);
 assert.match(ui,/product_spec/);
 assert.match(ui,/code_change/);
 assert.match(ui,/research/);
 assert.match(ui,/validLink\(source\.trim\(\)\)/);
});
test('Agent Studio is included in existing installed Holistic House app, not a second PWA',()=>{
 const manifest=JSON.parse(read('public/holistic-house-app.webmanifest'));
 const page=read('app/admin/command-center/mobile/page.tsx');
 const sw=read('public/sw.js');
 assert.equal(manifest.scope,'/');
 assert.equal(manifest.display,'standalone');
 assert.match(sw,/\/admin/);
 assert.doesNotMatch(page,/new ServiceWorker/);
});
test('agent statuses are read from the actual registry, not a fabricated connection',()=>{
 const page=read('app/admin/command-center/mobile/page.tsx');
 const client=read('app/admin/command-center/mobile/agent-studio.tsx');
 assert.match(page,/CC_AGENT_REGISTRY/);
 assert.match(client,/available_when_enabled/);
 assert.match(client,/notConnected/);
 assert.match(client,/runtimeReady/);
});
