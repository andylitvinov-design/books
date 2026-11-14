'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'), read=f=>fs.readFileSync(path.join(root,f),'utf8');
const page=read('index.html'),cfg=JSON.parse(read('vercel.json'));
test('one full PR Monitor page, no Commander parser and no startup spinner',()=>{
 assert.equal(page,read('pr-monitor.html'));
 assert.match(page,/<main class="wrap">/);
 assert.match(page,/pr-stage-dashboard\.js/);
 assert.match(page,/pr-merge-velocity-ui\.js/);
 assert.match(page,/pr-error-funnel\.js/);
 assert.match(page,/pr-recommendations\.js/);
 assert.doesNotMatch(page,/Загружаю проверенный монитор|document\.write/);
 assert.doesNotMatch(page,/src="\/project-management-nav\.js/);
});
test('full 30 JS references (29 distinct) and original CSS self-hosted, all defer',()=>{
 const scripts=[...page.matchAll(/<script\b[^>]*src="\/([^"?]+)/g)].map(m=>m[1]);
 assert.equal(scripts.length,30);assert.equal(new Set(scripts).size,29);
 assert.ok(scripts.every(n=>fs.existsSync(path.join(root,n)),n=>n));
 assert.equal((page.match(/rel="stylesheet"/g)||[]).length,1);
 assert.ok(read('pr-monitor-yesterday.css').length>100000);
});
test('cross-project links and public-only API bridge',()=>{
 assert.match(page,/holistic-house-agents-director\.vercel\.app\/agents\.html/);
 assert.ok(cfg.rewrites.length>=20);
 assert.ok(cfg.rewrites.every(r=>!/(commander-|seo-auth|google-owner-auth)/.test(r.source)));
});

test('current production cohort uses no-store, visible freshness and explicit manual resume',()=>{
 const js=read('pr-two-screen.js'), funnel=read('pr-error-funnel.js');
 assert.match(js,/readCurrentCohort\(\)/);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/data\.coverage\?\.complete!==true/);
 assert.match(js,/УСТАРЕВШИЙ СРЕЗ/);
 assert.match(js,/visibilitychange/);
 assert.match(js,/Production Created→Merged/);
 assert.match(funnel,/CI_INBOX_HTTP_404/);
 assert.match(funnel,/Приватный CI Inbox не подключён/);
 assert.match(funnel,/holistic-house-agents-director\.vercel\.app\/commander-auth\.html/);
});

test('strict production cohort shared by lifecycle view and merge velocity graph',()=>{
 const code=read('pr-two-screen.js'),chart=read('pr-merge-velocity-ui.js');
 assert.match(code,/HH_STRICT_CREATED_MERGED_COHORT_V1_BEGIN/);
 assert.match(code,/window\.HHStrictCohort=strictCohort/);
 assert.match(code,/cohortRaw=data;window\.__HH_STRICT_COHORT_SOURCE__=data/);
 assert.match(code,/chooseStrictPeriod\(cohortHours,false\)/);
 assert.match(code,/cohortHours===24/);
 assert.match(code,/72 часа пока не покрыты/);
 assert.match(chart,/env\.fetch\('\/api\/pr-created-cohort'/);
 assert.doesNotMatch(chart,/\/api\/pr-stage-timeline\?hours=/);
 assert.match(chart,/STRICT_COHORT_MODEL_UNAVAILABLE/);
 const begin=code.indexOf('/* HH_STRICT_CREATED_MERGED_COHORT_V1_BEGIN */'),
       end=code.indexOf('/* HH_STRICT_CREATED_MERGED_COHORT_V1_END */',begin);
 assert.ok(begin>0 && end>begin);
 const fn=new Function(code.slice(begin,end)+';return strictCohort')();
 const fixture={schema:'HH_PR_CREATED_COHORT_V1',generated_at:'2026-11-13T20:00:00Z',
   coverage:{complete:true},cohort_max_hours:48,rows:[
    {number:11,base:'codex/public-book-library',created_at:'2026-11-13T19:00:00Z',merged_at:'2026-11-13T19:10:00Z'},
    {number:12,base:'codex/public-book-library',created_at:'2026-11-13T18:00:00Z',merged_at:'2026-11-13T19:10:00Z'}
   ]};
 assert.equal(fn(fixture,null,1).n,1);
 assert.equal(fn(fixture,null,6).n,2);
 assert.throws(()=>fn(fixture,null,72),/NOT_COVERED/);
});

test('the graph and lifecycle table reconcile the same frozen raw source snapshot',()=>{
 const code=read('pr-two-screen.js'),graph=read('pr-merge-velocity-ui.js');
 assert.match(code,/window\.__HH_STRICT_COHORT_SOURCE__=data/);
 assert.match(code,/hh-pr-strict-source/);
 assert.match(graph,/env\.__HH_STRICT_COHORT_SOURCE__/);
 assert.match(graph,/cache\.delete\(hours\);void load\(false\)/);
});

test('owner CI funnel uses protected Agent Director origin, never public Observatory',()=>{
 const ownerRoot=path.resolve(root,'..','agents-director-standalone');
 const ownerRead=f=>fs.readFileSync(path.join(ownerRoot,f),'utf8');
 const monitor=read('pr-error-funnel.js'),privatePanel=ownerRead('pr-error-funnel.js');
 const page=ownerRead('ci-errors.html');
 const privateStore=ownerRead('lib/commander-private-store.js');
 assert.match(monitor,/PUBLIC_OWNER_PORTAL=true/);
 assert.match(monitor,/if\(PUBLIC_OWNER_PORTAL\)\{showOwnerPortal\(\);return;\}/);
 assert.match(monitor,/window\.location\.assign\(OWNER_PORTAL\)/);
 assert.match(monitor,/Открыть статистику и обновить данные в Agents Director/);
 assert.match(page,/\/pr-error-funnel\.js/);
 assert.match(page,/\/pr-error-funnel\.css/);
 assert.match(page,/noindex,nofollow,noarchive/);
 assert.match(privatePanel,/\/api\/commander-chats\?action=ci_events/);
 assert.doesNotMatch(privatePanel,/PUBLIC_OWNER_PORTAL=true/);
 assert.match(privatePanel,/\[1,6,24,168,336,720\]/);
 assert.match(privateStore,/const HOST='holistic-house-agents-director\.vercel\.app'/);
 assert.doesNotMatch(privateStore,/const HOST='holistic-house-pr-monitor\.vercel\.app'/);
 const {isOriginAllowed}=require(path.join(ownerRoot,'lib','commander-private-store.js'));
 assert.equal(isOriginAllowed({headers:{host:'holistic-house-agents-director.vercel.app',origin:'https://holistic-house-agents-director.vercel.app','sec-fetch-site':'same-origin'}}),true);
 assert.equal(isOriginAllowed({headers:{host:'holistic-house-agents-director.vercel.app',origin:'https://attacker.example','sec-fetch-site':'cross-site'}}),false);
 assert.equal(isOriginAllowed({headers:{host:'holistic-house-pr-observatory.vercel.app',origin:'https://holistic-house-pr-observatory.vercel.app','sec-fetch-site':'same-origin'}}),false);
 assert.match(ownerRead('commander-auth.js'),/\/ci-errors\.html/);
 assert.match(ownerRead('owner-google-signin.js'),/\/ci-errors\.html/);
 assert.match(ownerRead('chats.html'),/href="\/ci-errors\.html"/);
});
