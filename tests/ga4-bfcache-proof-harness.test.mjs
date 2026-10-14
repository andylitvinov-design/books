import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('BFCache candidate snapshots are exact, production-disabled, and only the copy is activated',()=>{
 const hashes=JSON.parse(read('tests/fixtures/ga4-bfcache-transport/source-manifest.json'));assert.equal(Object.keys(hashes).length,3);
 for(const[path,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(read('tests/fixtures/ga4-bfcache-transport/'+path+'.source')).digest('hex'),hash);
 assert.match(read('tests/fixtures/ga4-bfcache-transport/lib/public-analytics.ts.source'),/PUBLIC_ANALYTICS_AVAILABLE = false;/);
 const prepare=read('scripts/prepare-ga4-bfcache-proof.mjs');assert.match(prepare,/mkdtempSync/);assert.match(prepare,/policyHashes/);assert.match(prepare,/source remains exact and disabled/);assert.doesNotMatch(prepare,/\.\.\.process\.env/);
});
test('current middleware, cache policy and CSP are preserved without private-folder route mistakes',()=>{
 const prepare=read('scripts/prepare-ga4-bfcache-proof.mjs');
 for(const file of ['middleware.ts','lib/canonical-redirect.js','components/csp-navigation-boundary.tsx','lib/csp-prehydration.js'])assert.ok(prepare.includes("'"+file+"'"));
 assert.match(prepare,/await headers\(\)/);assert.match(prepare,/Ga4Analytics nonce=/);assert.match(prepare,/compiled\[route\]/);assert.match(prepare,/app-paths-manifest\.json/);
 assert.doesNotMatch(prepare,/\/__ga4-proof/);assert.doesNotMatch(prepare,/cache-control|Cache-Control/,'never override actual policy to make BFCache pass');
});
test('genuine BFCache is mandatory in two separate contexts with positive return and draft proof',()=>{
 const code=read('scripts/verify-ga4-bfcache-proof.mjs');
 assert.match(code,/\['granted-return','withdrawn-regrant'\]/);assert.match(code,/Target\.createBrowserContext/);
 assert.match(code,/assert\.equal\(restored\.documentId,publicState\.documentId/);assert.match(code,/assert\.ok\(restored\.shows\.some\(x=>x\.persisted\)/);
 assert.match(code,/BFCache must preserve user in-memory draft/);assert.match(code,/restored regrant pageview/);assert.match(code,/persisted granted return pageview/);
 assert.match(code,/Number\(event\._et\)<15000/);assert.match(code,/Page\.backForwardCacheNotUsed/);
 assert.match(code,/assert\.equal\(privateState\.hasSdkScript,false\)/);assert.match(code,/assert\.equal\(forward\.hasQueue,false\)/);
 assert.doesNotMatch(code,/--enable-features|--disable-features|--ignore-certificate-errors|\.launch\(/);
});
test('incomplete header coverage cannot become a navigation-only overall pass',()=>{
 const code=read('scripts/verify-ga4-bfcache-proof.mjs');assert.match(code,/assertCdpHeaderCoverage/);assert.match(code,/passed:navigationPassed&&headerCoveragePassed/);
 assert.match(code,/Network\.requestWillBeSentExtraInfo/);assert.match(code,/extraInfoReceived=true/);assert.match(code,/127\.0\.0\.1:9/);
 assert.doesNotMatch(code,/Fetch\.continueRequest|fetch\(r\.url/);assert.match(code,/env:\{PATH:process\.env\.PATH,HOME:tmpdir\(\)/);
 assert.match(code,/bfcache-browser\.log/);assert.match(code,/browser\.on\('exit'/);assert.match(code,/browser\.on\('error'/);
 assert.match(code,/executable='\/opt\/google\/chrome\/chrome'/);assert.match(code,/vendorProfile='\/etc\/apparmor\.d\/chrome'/);assert.match(code,/info\.uid,0/);assert.match(code,/Browser\.getVersion/);
 const workflow=read('.github/workflows/ga4-bfcache-proof.yml');assert.doesNotMatch(workflow,/sysctl|apparmor reload|chmod|sudo|install-deps|--with-deps/);assert.doesNotMatch(code,/--no-sandbox|--disable-setuid-sandbox/);
 assert.match(code,/vendor-browser-preflight\.json/);assert.match(code,/lstatSync\(path\)/);assert.match(code,/\['--verify','google-chrome-stable'\]/);assert.match(code,/info\.mode&0o022,0/);
 assert.ok(code.indexOf('vendorEvidence(executable,vendorProfile);')<code.lastIndexOf('assert.equal(realpathSync(executable)'));
});
test('limited hosted-runner alternative retains strict private-install provenance and sandbox gates',()=>{
 const code=read('scripts/verify-ga4-bfcache-proof.mjs'),workflow=read('.github/workflows/ga4-bfcache-proof.yml');
 assert.match(workflow,/runs-on: ubuntu-22\.04/);assert.match(workflow,/deprecated 2026-09-17, retires 2027-04-17/);
 assert.match(workflow,/--registry=https:\/\/registry\.npmjs\.org --ignore-scripts/);assert.match(workflow,/playwright@1\.57\.0/);assert.match(workflow,/mkdtempSync/);
 assert.match(code,/rootInfo\.mode&0o077,0/);assert.match(code,/parseInt\(file\.mode,8\)&0o022,0/);assert.match(code,/file\.uid,process\.getuid\(\)/);
 assert.match(code,/private-browser-provenance\.json/);assert.match(code,/lockSha256/);assert.match(code,/unknown browser source is forbidden/);
 assert.match(code,/info\.uid,0/,'original vendor guard remains intact');assert.match(code,/info\.mode&0o022,0/);
});
test('raw commit parent headers remain provable with shallow checkout',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ga4-shallow-parent-'));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 try{git('init','--quiet');for(const name of ['parent','child'])git('-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','--allow-empty','--quiet','-m',name);
 const parent=git('rev-parse','HEAD^'),tip=git('rev-parse','HEAD');writeFileSync(join(dir,'.git/shallow'),tip+'\n');assert.equal(git('show','-s','--format=%P','HEAD'),'');
 const parents=git('cat-file','-p','HEAD').split('\n\n')[0].split('\n').filter(line=>line.startsWith('parent ')).map(line=>line.slice(7));assert.deepEqual(parents,[parent]);
 for(const path of ['scripts/prepare-ga4-bfcache-proof.mjs','scripts/verify-ga4-rewrite-root.mjs'])assert.ok(read(path).includes("git('cat-file','-p','HEAD')"));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
