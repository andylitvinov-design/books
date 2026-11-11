import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),gateway=require('../api/pm-agent-chat.js');
const t=gateway.__test;
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('price guard allows only currently catalog-verified zero priced :free model',()=>{
 assert.equal(t.freePrice({id:'vendor/model:free',pricing:{prompt:'0',completion:'0',request:'0'}}),true);
 assert.equal(t.freePrice({id:'vendor/model',pricing:{prompt:'0',completion:'0'}}),false);
 assert.equal(t.freePrice({id:'vendor/model:free',pricing:{prompt:'0',completion:'0.01'}}),false);
 assert.equal(t.freePrice({id:'vendor/model:free',pricing:{prompt:'0'}}),false);
 assert.equal(t.freePrice({id:'vendor/model:free',pricing:{prompt:'0',completion:'0',unknown:'priced'}}),false);
});
test('invalid owner cookies denied and origin enforced',async()=>{
 assert.equal(await t.isOwner({headers:{cookie:'hh_seo_owner=invalid'}}),false);
 assert.equal(t.correctOrigin({headers:{origin:'https://evil.example',host:'holistic-house-pr-monitor.vercel.app'}}),false);
 assert.equal(t.correctOrigin({headers:{origin:'https://holistic-house-pr-monitor.vercel.app',host:'holistic-house-pr-monitor.vercel.app'}}),true);
});
test('trusted bot/connector only, not arbitrary commenter impersonation',()=>{
 const app={slug:'github-actions',id:15368};
 assert.equal(t.reporter({user:{login:'github-actions[bot]',type:'Bot'},performed_via_github_app:app}),'GitHub Actions');
 assert.equal(t.reporter({user:{login:'attacker',type:'User'},performed_via_github_app:app}),null);
 assert.equal(t.reporter({user:{login:'andylitvinov-design',type:'User'},performed_via_github_app:{slug:'chatgpt-codex-connector'}}),'ChatGPT Triage');
});
test('public page preserved and private chat uses existing owner session',()=>{
 const api=read('api/pm-agent-chat.js'),ui=read('pm-agent-chat.js'),html=read('project-management-public.html');
 assert.match(api,/SEO_SESSION_SECRET/);
 assert.match(api,/await isOwner\(req\)/);
 assert.match(api,/commander-private-store/);
 assert.match(api,/OPENROUTER_KEY_NOT_CONFIGURED/);
 assert.match(api,/provider:\{allow_fallbacks:false,max_price/);
 assert.doesNotMatch(api,/workflow_dispatch|service_role/);
 assert.doesNotMatch(ui,/innerHTML|localStorage|Authorization|openrouter\.ai\/api/);
 assert.match(html,/pm-agent-chat\.js/);
 assert.match(html,/pm-agent-chat\.css/);
});
test('GitHub report status is not proof of source commit',()=>{
 const rows=t.reportEntries([{id:1,user:{login:'andylitvinov-design',type:'User'},performed_via_github_app:{slug:'chatgpt-codex-connector'},created_at:'2026-11-07T17:00:00Z',body:'Agent prepared; no commit'}],1419);
 assert.equal(rows.length,1);
 assert.match(rows[0].status,/NOT_PROOF_OF_SOURCE_COMMIT/);
 assert.match(rows[0].url,/issuecomment-1/);
});

test('owner free chat can answer public general questions without implying real-time browsing or paid model use',()=>{
 const api=read('api/pm-agent-chat.js');
 assert.ok(api.includes('general non-sensitive questions (including AI trends)'));
 assert.ok(api.includes('You do not have live browsing or real-time verification'));
 assert.ok(api.includes('If a prompt contains sensitive content, ask for a redacted version'));
 assert.ok(api.includes('allow_fallbacks:false,max_price:{prompt:0,completion:0}'));
});
