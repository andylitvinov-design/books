// Small structural experiment; never enables the main application's transport.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,cpSync,mkdtempSync,symlinkSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
assert.match(readFileSync(join(root,'lib/public-analytics.ts'),'utf8'),/PUBLIC_ANALYTICS_AVAILABLE = false;/);
const dir=mkdtempSync(join(tmpdir(),'hh-ga4-rewrite-')),fixture=join(dir,'app'),output=join(root,'artifacts/ga4-rewrite-proof');mkdirSync(output,{recursive:true});
cpSync(join(root,'tests/fixtures/ga4-rewrite-root'),fixture,{recursive:true});symlinkSync(resolve(root,'node_modules'),join(fixture,'node_modules'),'dir');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const clean=()=>git('status','--porcelain','--untracked-files=all','--','.',':(exclude)artifacts/**');
assert.equal(clean(),'','proof must start from an exact clean checkout');
writeFileSync(join(output,'provenance.json'),JSON.stringify({commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),parents:git('show','-s','--format=%P','HEAD'),next:require('next/package.json').version,react:require('react/package.json').version,sdkSha256:createHash('sha256').update(readFileSync(join(output,'google-tag-readonly.js'))).digest('hex'),applicationHold:false,fixtureOnly:true},null,2));
const env={PATH:process.env.PATH,HOME:tmpdir(),NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:'--max-old-space-size=512',CIRCLE_NODE_TOTAL:'2',HH_GA4_PLAYWRIGHT_MODULE:process.env.HH_GA4_PLAYWRIGHT_MODULE,HH_GA4_FROZEN_SDK:join(output,'google-tag-readonly.js')};
let failed=false;
for(const [name,args]of [['build',[require.resolve('next/dist/bin/next'),'build']],['http',['verify-http.mjs']],['browser',['verify-browser.mjs']]]){
 const result=spawnSync(process.execPath,args,{cwd:fixture,env,encoding:'utf8',timeout:300000,maxBuffer:20*1024*1024});writeFileSync(join(output,name+'.log'),(result.stdout||'')+(result.stderr||''));
 if(result.status!==0){failed=true;break;}
}
for(const file of ['rewrite-404-mini-http-results.json','rewrite-404-mini-server.log','rewrite-404-mini-browser-results.json','rewrite-404-mini-browser-server.log'])if(existsSync(join(dir,file)))cpSync(join(dir,file),join(output,file));
assert.match(readFileSync(join(root,'lib/public-analytics.ts'),'utf8'),/PUBLIC_ANALYTICS_AVAILABLE = false;/);
assert.equal(clean(),'','proof must not mutate tracked, staged or untracked application source');
assert.equal(failed,false,'minimal rewrite experiment did not pass all build/HTTP/browser gates');
