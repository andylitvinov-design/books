'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {safePath,scopeFromEnv,sanitizeDiagnostic,extractReply,buildCandidate,hasDeniedEffectiveTools}=
 require('../scripts/ci-pr-free-ai-code-candidate.cjs');
const sha='a'.repeat(40),pr={sha,files:['components/public-card.tsx']};
const src=[{path:pr.files[0],original_sha:'b'.repeat(40),content:'export const x = 1;\n'}];
test('free-model scope is narrow and excludes credentials, CI, private routes and traversal',()=>{
 for(const p of ['components/public-card.tsx','app/[locale]/about/page.tsx','lib/seo-helper.mjs','scripts/public-smoke.cjs'])
  assert.equal(safePath(p),true,p);
 for(const p of ['.github/workflows/a.yml','app/api/route.ts','app/[locale]/account/page.tsx',
  'components/payment-card.tsx','lib/private/secret.ts','scripts/ci-run.mjs','tests/hello.test.mjs',
  'components/../outside.ts','components/.env.ts','/tmp/a.ts','lib/config.mjs',
  'components/consent-form.tsx','components/token-card.tsx','lib/health-records.ts'])
  assert.equal(safePath(p),false,p);
 assert.deepEqual(scopeFromEnv({REPAIR_SHA:sha,REPAIR_FILES_JSON:JSON.stringify(pr.files)}),pr);
 assert.throws(()=>scopeFromEnv({REPAIR_SHA:sha,REPAIR_FILES_JSON:'["lib/secret.ts"]'}),/SCOPE/);
 assert.throws(()=>scopeFromEnv({REPAIR_SHA:sha,REPAIR_FILES_JSON:'[]'}),/SCOPE/);
});
test('free provider events must contain valid text and no error events',()=>{
 assert.deepEqual(extractReply(JSON.stringify({type:'text',part:{text:'{"files":[]}'}})),{files:[]});
 assert.throws(()=>extractReply(JSON.stringify({type:'error',error:{code:429}})),/PROVIDER/);
 assert.throws(()=>extractReply('NOT JSON'),/STREAM/);
 assert.throws(()=>extractReply(JSON.stringify({type:'text',part:{text:'not json'}})),/JSON/);
});
test('candidate builder accepts only changed existing scoped source and exact original blobs',()=>{
 const ok=buildCandidate({files:[{path:pr.files[0],content:'export const x = 2;\n'}]},pr,src);
 assert.equal(ok.repair_kind,'free_ai');
 assert.equal(ok.head_sha,sha);
 assert.equal(ok.files[0].original_sha,'b'.repeat(40));
 assert.equal(Buffer.from(ok.files[0].base64,'base64').toString(),'export const x = 2;\n');
 for(const r of [{files:[]},{files:[{path:'components/new.tsx',content:'x'}]},
  {files:[{path:'components/public-card.tsx',content:'export const x = 1;\n'}]},
  {files:[{path:'components/public-card.tsx',content:'ok'},{path:'components/public-card.tsx',content:'ok'}]}])
  assert.throws(()=>buildCandidate(r,pr,src),/FREE_AI_/);
});

test('model effective permissions must be deny-all with no inherited tool allow',()=>{
 const deny={action:'*',resource:'*',effect:'deny'};
 const actual=[{name:'hh-free-repair-text',permissions:[deny]}];
 assert.equal(hasDeniedEffectiveTools(JSON.stringify(actual)),true);
 assert.equal(hasDeniedEffectiveTools(JSON.stringify([{...actual[0],permissions:[
  deny,{action:'shell',resource:'*',effect:'allow'}]}])),false);
 assert.equal(hasDeniedEffectiveTools('[]'),false);
 assert.equal(hasDeniedEffectiveTools('invalid'),false);
});
test('provider diagnostic scrubs credential-shaped values and sensitive lines',()=>{
 const out=sanitizeDiagnostic('Bearer abcdef123456\nsecret: token is test\nsk-verylongstring0000');
 assert.doesNotMatch(out,/abcdef123456|verylongstring0000|secret: token/);
});
test('control-plane workflow keeps free inference read-only and separate from publisher',()=>{
 const w=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const codeFix=w.split('\n  code_fix:')[1]?.split('\n  code_verify:')[0]||'';
 const codeVerify=w.split('\n  code_verify:')[1]?.split('\n  publish:')[0]||'';
 assert.match(codeFix,/HH_OPENCODE_BIN/);
 assert.match(codeFix,/ci-pr-free-ai-code-candidate\.cjs/);
 assert.match(codeFix,/contents: read/);
 assert.doesNotMatch(codeFix,/HH_AUTOMERGE_TOKEN|contents: write|if: false|codex exec/);
 assert.match(codeVerify,/ci-pr-repair-code-candidate\.cjs verify/);
 assert.match(codeVerify,/contents: read/);
 assert.doesNotMatch(codeVerify,/HH_AUTOMERGE_TOKEN|contents: write|if: false/);
 assert.match(w,/code_available'.*'true'/);
 assert.match(w,/hh-code-repair-verified/);
});
