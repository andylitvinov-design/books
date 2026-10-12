import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertFallbackPairs,assertNoSensitiveFields} from './fixtures/ga4-rewrite-root/network-checks.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const fixture=path=>read('tests/fixtures/ga4-rewrite-root/'+path);
test('minimal experiment keeps unknown documents in an independent SDK-free root',()=>{
 assert.match(fixture('middleware.js'),/path!=='.*known-public'/);assert.match(fixture('middleware.js'),/NextResponse\.rewrite/);assert.doesNotMatch(fixture('middleware.js'),/NextResponse\.redirect/);
 assert.match(fixture('app/(public)/layout.js'),/<Probe\/>/);
 assert.doesNotMatch(fixture('app/(excluded)/layout.js'),/Probe|gtag|google/);
 assert.match(fixture('app/(excluded)/analytics-excluded-not-found/page.js'),/notFound\(\)/);
});
test('browser proof intercepts every request and never waits for held SDK at initial load',()=>{
 const code=fixture('verify-browser.mjs');assert.match(code,/127\.0\.0\.1:9/);assert.match(code,/request\.allHeaders\(\)/);assert.match(code,/waitUntil:'domcontentloaded'/);
 assert.doesNotMatch(code,/route\.continue|fetch\(request\.url|fetch\(url\.href|ignoreHTTPSErrors|ignore-certificate-errors/);
 assert.match(code,/fetch\(local\+/);assert.match(code,/\['loaded','delayed'\]/);assert.match(code,/\['link','push','replace'\]/);
 assert.match(code,/positive real SDK public view/);assert.match(code,/positive public return/);assert.match(code,/results\.length,7/);
 assert.match(code,/cold-saved-grant-miss/);assert.match(code,/visible requested URL and fragment preserved/);
});
test('orchestrator preserves production hold and exact clean checkout before and after proof',()=>{
 const code=read('scripts/verify-ga4-rewrite-root.mjs');
 assert.equal((code.match(/PUBLIC_ANALYTICS_AVAILABLE = false/g)||[]).length,2);
 assert.match(code,/assert\.equal\(clean\(\),''/);assert.match(code,/--untracked-files=all/);assert.match(code,/HEAD\^\{tree\}/);
 assert.doesNotMatch(code,/\.\.\.process\.env/);assert.match(code,/fixtureOnly:true/);
});
test('negative privacy assertions and raw fallback equality remain active',()=>{
 const clean={url:'https://www.google-analytics.com/g/collect?en=page_view&dt=Holistic%20House',method:'POST',body:null,scenario:'synthetic',headers:{}};
 assert.doesNotThrow(()=>assertNoSensitiveFields(clean));assert.throws(()=>assertNoSensitiveFields({...clean,headers:{referer:'SYNTHETIC_PRIVATE_TOKEN'}}));
 const retry={...clean,url:clean.url.replace('www.google-analytics.com','www.google.com')+'&gaf=1'};
 assert.doesNotThrow(()=>assertFallbackPairs([clean,retry]));assert.throws(()=>assertFallbackPairs([retry]));assert.throws(()=>assertFallbackPairs([clean,{...retry,body:'different'}]));
});

test('scrubbed child environment uses the exact isolated browser installation directory',()=>{
 const path='/tmp/hh-ga4-proof-browsers';
 assert.ok(read('.github/workflows/ga4-rewrite-root-proof.yml').includes('PLAYWRIGHT_BROWSERS_PATH: '+path));
 assert.ok(read('scripts/verify-ga4-rewrite-root.mjs').includes("PLAYWRIGHT_BROWSERS_PATH:'"+path+"'"));
});
