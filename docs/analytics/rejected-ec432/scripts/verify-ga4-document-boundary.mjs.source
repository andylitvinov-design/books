// Architecture proof only: a real, isolated Next app. No production route moves.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, symlinkSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "artifacts/ga4-privacy");
mkdirSync(output, { recursive: true });
const fixture = mkdtempSync(join(tmpdir(), "hh-ga4-document-proof-"));
const put = (path, content) => { mkdirSync(dirname(join(fixture, path)), { recursive: true }); writeFileSync(join(fixture, path), content); };
const sdk = readFileSync(process.env.HH_GA4_SDK_PATH || join(output, "google-tag-readonly.js"), "utf8");
const id = "G-3WX7PDD52N";
for (const path of ["components/ga4-analytics.tsx", "components/analytics-consent.tsx", "components/csp-navigation-boundary.tsx", "lib/public-analytics.ts", "lib/csp-prehydration.js"]) {
  mkdirSync(dirname(join(fixture, path)), { recursive: true }); copyFileSync(join(root, path), join(fixture, path));
}
put("lib/native/client.ts", "export function isNativePsiAlchemy() { return false; }\n");
put("package.json", JSON.stringify({ name: "ga4-synthetic-document-proof", private: true, version: "0.0.0", dependencies: { next: require("next/package.json").version, react: require("react/package.json").version, "react-dom": require("react-dom/package.json").version } }));
put("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["dom", "dom.iterable", "esnext"], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", incremental: true, plugins: [{ name: "next" }], paths: { "@/*": ["./*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }));
put("next.config.mjs", "export default { poweredByHeader: false, experimental: { cpus: 1 } };\n");
symlinkSync(join(root, "node_modules"), join(fixture, "node_modules"), "dir");
put("components/synthetic-controls.tsx", `"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AnalyticsPreferences } from '@/components/analytics-consent';
import { emitPublicAnalyticsEvent } from '@/lib/public-analytics';
export function SyntheticControls() {
 const router=useRouter(), pathname=usePathname(); const [draft,setDraft]=useState('');
 const target=pathname.startsWith('/en/app/')?'/en?gtm_latency=1':'/en/app/SYNTHETIC_PRIVATE_DOCUMENT?gtm_latency=1';
 useEffect(()=>{ document.documentElement.dataset.fixtureReady='true'; },[]);
 return <main><h1>{pathname}</h1><AnalyticsPreferences />
 <label>Synthetic in-memory draft<input id="draft" value={draft} onChange={e=>setDraft(e.target.value)} /></label>
 <Link id="next-link" href={target} prefetch={false}>Next Link</Link>
 <button id="router-push" onClick={()=>router.push(target)}>Router push</button>
 <button id="router-replace" onClick={()=>router.replace(target)}>Router replace</button>
 <button id="acquire" onClick={()=>emitPublicAnalyticsEvent('free_situation_assessment_click')}>Synthetic acquisition</button>
 </main>;
}`);
put("components/synthetic-shell.tsx", `import { AnalyticsConsent } from '@/components/analytics-consent';
import { Ga4Analytics } from '@/components/ga4-analytics';
import { CspNavigationBoundary } from '@/components/csp-navigation-boundary';
import { CSP_PREHYDRATION_SCRIPT } from '@/lib/csp-prehydration';
export function SyntheticShell({children, publicDocument}: {children:React.ReactNode, publicDocument:boolean}) {
 return <html lang="en"><head><title>Holistic House synthetic proof</title><script dangerouslySetInnerHTML={{__html:CSP_PREHYDRATION_SCRIPT}} /></head>
 <body data-csp-class={publicDocument?'public-video':'private'}><CspNavigationBoundary />{publicDocument&&<Ga4Analytics />}{children}<AnalyticsConsent /></body></html>;
}`);
for (const [group, publicDocument] of [["public", true], ["private", false]]) {
  put(`app/(${group})/layout.tsx`, `import { SyntheticShell } from '@/components/synthetic-shell';\nexport default function Root({children}:{children:React.ReactNode}) { return <SyntheticShell publicDocument={${publicDocument}}>{children}</SyntheticShell>; }\n`);
}
for (const path of ["app/(public)/en/page.tsx", "app/(private)/en/app/[synthetic]/page.tsx"]) put(path, "import { SyntheticControls } from '@/components/synthetic-controls';\nexport default function Page(){return <SyntheticControls/>;}\n");
put("app/(public)/page.tsx", "export default function Page(){return <p>Synthetic fixture only</p>;}\n");
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_GA_MEASUREMENT_ID: id };
const built = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", fixture], { cwd: fixture, env, encoding: "utf8", timeout: 180000 });
writeFileSync(join(output, "document-boundary-build.log"), (built.stdout || "") + (built.stderr || ""));
assert.equal(built.status, 0, "synthetic Next build must pass; see build log");
if (process.env.HH_GA4_BUILD_ONLY === "1") { console.log("Synthetic Next production build passed"); process.exit(0); }
const port = 3217;
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", fixture, "--hostname", "127.0.0.1", "--port", String(port)], { cwd: fixture, env, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", data => { serverLog += data; }); server.stderr.on("data", data => { serverLog += data; });
async function waitUntil(predicate, message, timeout=20000) {
 const start=Date.now(); while (!await predicate()) { if(Date.now()-start>timeout) throw Error(message); await new Promise(r=>setTimeout(r,100)); }
}
let browser;
const results=[], requests=[], errors=[], history=[], contexts=[];
const sentinel=/SYNTHETIC_PRIVATE|SYNTHETIC_QUERY|SYNTHETIC_FRAGMENT|synthetic_private_email/i;
const isGoogle=url=>/^(?:www\.googletagmanager\.com|www\.google-analytics\.com|region1\.google-analytics\.com|www\.google\.com)$/.test(url.hostname);
const isSdk=url=>url.hostname==='www.googletagmanager.com'&&url.pathname==='/gtag/js'&&!url.searchParams.has('is_td');
function events(entries) { return entries.filter(e=>new URL(e.url).pathname==='/g/collect'&&new URL(e.url).hostname!=='www.google.com').flatMap(e=>{const common=Object.fromEntries(new URL(e.url).searchParams);return(e.body?e.body.split('\n'):['']).map(line=>({...common,...Object.fromEntries(new URLSearchParams(line)),phase:e.phase}));}); }
function checkSafe(entries) {
 for(const entry of entries.filter(e=>e.action!=='loopback-fixture')) {
  assert.doesNotMatch(JSON.stringify(entry),sentinel,'no private path/query/form data in third-party URL, body, or full headers');
  assert.notEqual(entry.action,'aborted-unknown','unknown third-party endpoint needs investigation');
  const url=new URL(entry.url); if(url.searchParams.has('dl')) {
   const dl=url.searchParams.get('dl'); assert.ok(['https://holistichouse.vercel.app/en','holistichouse.vercel.app/en'].includes(dl),'only public document location allowed');
  }
 }
 for(const event of events(entries)) { assert.equal(event.dl,'https://holistichouse.vercel.app/en'); assert.equal(event.dt,'Holistic House'); assert.ok(!event.dr); }
}
async function scenario(name,{holdSdk=false}={}) {
 const context=await browser.newContext({serviceWorkers:'block'});contexts.push(context);
 const own=[];let phase='initial',release;
 const gate=holdSdk?new Promise(r=>{release=r;}):Promise.resolve();
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()); const headers=await request.allHeaders();
  if(url.hostname!=='holistichouse.vercel.app')assert.doesNotMatch(JSON.stringify(headers),sentinel);
  if(headers.cookie)headers.cookie='[synthetic cookie values omitted]';
  const entry={scenario:name,phase,url:request.url(),method:request.method(),body:request.postData(),headers,resourceType:request.resourceType()};own.push(entry);requests.push(entry);
  if(url.origin==='https://holistichouse.vercel.app') {
   entry.action='loopback-fixture';
   // Only this fixed loopback server is fetched by Node. Browser traffic is
   // never continued, and no real first-party backend is contacted.
   const allowedHeaders={};for(const key of ['accept','rsc','next-router-state-tree','next-router-prefetch','next-url']) { const value=await request.headerValue(key);if(value)allowedHeaders[key]=value; }
   const response=await fetch('http://127.0.0.1:'+port+url.pathname+url.search,{headers:allowedHeaders,redirect:'manual'});
   const responseHeaders=Object.fromEntries(response.headers);delete responseHeaders['content-encoding'];delete responseHeaders['content-length'];
   await route.fulfill({status:response.status,headers:responseHeaders,body:Buffer.from(await response.arrayBuffer())});
  } else if(isSdk(url)) {
   assert.ok([id,'GT-KTPSQT8C'].includes(url.searchParams.get('id')));entry.action='local-frozen-sdk';await gate;
   try { await route.fulfill({status:200,contentType:'application/javascript',body:sdk}); } catch(error) { if(!request.failure())throw error;entry.action='sdk-cancelled-with-old-document'; }
  } else if(isGoogle(url)&&(['/g/collect','/td','/a'].includes(url.pathname)||(url.pathname==='/gtag/js'&&url.searchParams.get('is_td')==='1'))) {
   entry.action='intercepted-local';await route.fulfill({status:url.pathname==='/gtag/js'?200:204,contentType:'application/javascript',body:''});
  } else { entry.action='aborted-unknown';await route.abort('blockedbyclient'); }
 });
 await context.routeWebSocket('**/*',socket=>{errors.push({scenario:name,message:'Unexpected WebSocket'});socket.close();});
 await context.addInitScript(()=>{
  window.syntheticDocumentId=crypto.randomUUID();window.syntheticPageShows=[];
  window.addEventListener('pageshow',event=>window.syntheticPageShows.push({persisted:event.persisted}));
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push({scenario:name,message:error.message,stack:error.stack}));
 await page.goto('https://holistichouse.vercel.app/en?gtm_latency=1&private_query=SYNTHETIC_QUERY#SYNTHETIC_FRAGMENT');
 await page.waitForFunction(()=>document.documentElement.dataset.fixtureReady==='true');
 return {context,page,own,phase(value){phase=value;},release(){release?.();},events(){return events(own);}};
}
async function snapshot(s,label) {
 const state=await s.page.evaluate(()=>({documentId:window.syntheticDocumentId,pageShows:window.syntheticPageShows,path:location.pathname,gtagPresent:typeof window.gtag==='function',scriptPresent:!!document.getElementById('holistic-house-google-tag'),draft:document.getElementById('draft')?.value}));
 history.push({scenario:s.own[0]?.scenario,label,...state});return state;
}
async function grant(s) {await s.page.getByRole('button',{name:'Allow analytics',exact:true}).click();}
async function readyPrivate(s,oldDocument) {
 await s.page.waitForFunction(old=>window.syntheticDocumentId!==old&&location.pathname.startsWith('/en/app/')&&document.documentElement.dataset.fixtureReady==='true',oldDocument);
 const state=await snapshot(s,'private');assert.equal(state.gtagPresent,false);assert.equal(state.scriptPresent,false);
}
try {
 await waitUntil(async()=>{try{return(await fetch('http://127.0.0.1:'+port+'/en')).ok;}catch{return false;}},'loopback Next server ready');
 const {chromium}=require(process.env.HH_GA4_PLAYWRIGHT_MODULE||'playwright');
 browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--disable-back-forward-cache'],proxy:{server:'http://127.0.0.1:9'},args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
 for(const kind of ['next-link','router-push','router-replace']) {
  const s=await scenario('delayed-sdk-'+kind,{holdSdk:true});
  assert.equal(s.own.filter(e=>isGoogle(new URL(e.url))).length,0,'no Google code before consent');
  const before=await snapshot(s,'public-before-grant');await grant(s);
  await waitUntil(()=>s.own.some(e=>e.action==='local-frozen-sdk'),'SDK held before execution');
  s.phase('navigate-private-before-sdk');await s.page.locator('#'+kind).click();await readyPrivate(s,before.documentId);
  s.release();await s.page.waitForTimeout(2500);
  assert.equal(s.events().length,0,'cancelled old-document SDK must not send queued pageviews');
  checkSafe(s.own);
  s.phase('return-public-positive');await s.page.locator('#router-push').click();
  await s.page.waitForFunction(()=>location.pathname==='/en'&&document.documentElement.dataset.fixtureReady==='true');
  await waitUntil(()=>s.events().filter(e=>e.en==='page_view').length===1,'fresh public return sends one pageview');
  await s.page.locator('#acquire').click();await waitUntil(()=>s.events().some(e=>e.en==='free_situation_assessment_click'),'public return acquisition positive');
  await s.page.waitForTimeout(2300);checkSafe(s.own);
  results.push({scenario:'delayed-sdk-'+kind,passed:true});await s.context.close();
 }
 const loaded=await scenario('loaded-sdk-router-history');await grant(loaded);
 await waitUntil(()=>loaded.events().some(e=>e.en==='page_view'),'loaded SDK positive control');
 const publicState=await snapshot(loaded,'public-loaded');await loaded.page.locator('#draft').fill('SYNTHETIC_PRIVATE_DRAFT');
 loaded.phase('loaded-public-departure');await loaded.page.locator('#router-push').click();await readyPrivate(loaded,publicState.documentId);
 await snapshot(loaded,'private-dwell');await loaded.page.waitForTimeout(65000);
 const beforeBack=loaded.events().length;loaded.phase('history-back-public');await loaded.page.goBack();await loaded.page.waitForFunction(()=>location.pathname==='/en'&&document.documentElement.dataset.fixtureReady==='true');
 const restored=await snapshot(loaded,'back-public');
 if(restored.pageShows.some(e=>e.persisted))assert.equal(restored.draft,'SYNTHETIC_PRIVATE_DRAFT','actual BFCache must preserve public in-memory draft');
 await loaded.page.locator('#acquire').click();await waitUntil(()=>loaded.events().slice(beforeBack).some(e=>e.en==='free_situation_assessment_click'),'Back positive acquisition');
 for(const event of loaded.events().slice(beforeBack))if(event._et)assert.ok(Number(event._et)<15000,'private dwell must not enter resumed public engagement');
 loaded.phase('history-forward-private');await loaded.page.goForward();await readyPrivate(loaded,restored.documentId);await loaded.page.waitForTimeout(2300);
 await snapshot(loaded,'forward-private');
 checkSafe(loaded.own);results.push({scenario:'loaded-sdk-router-history',passed:true,bfcacheObserved:restored.pageShows.some(e=>e.persisted)});await loaded.context.close();
 const off=await scenario('delayed-sdk-withdrawal',{holdSdk:true});await grant(off);await waitUntil(()=>off.own.some(e=>e.action==='local-frozen-sdk'),'withdrawal holds SDK');
 const beforeOff=await snapshot(off,'before-withdrawal');off.phase('withdrawal-before-execution');await off.page.getByRole('button',{name:'Keep analytics off',exact:true}).click();
 await off.page.waitForFunction(old=>window.syntheticDocumentId!==old&&document.documentElement.dataset.fixtureReady==='true',beforeOff.documentId);
 off.release();await off.page.waitForTimeout(2500);assert.equal(off.events().length,0);checkSafe(off.own);
 off.phase('regrant-positive');await grant(off);await waitUntil(()=>off.events().some(e=>e.en==='page_view'),'regrant positive pageview');await off.page.locator('#acquire').click();await waitUntil(()=>off.events().some(e=>e.en==='free_situation_assessment_click'),'regrant positive event');checkSafe(off.own);
 results.push({scenario:'delayed-sdk-withdrawal',passed:true});await off.context.close();
 assert.equal(errors.length,0,JSON.stringify(errors));
} catch(error) {results.push({passed:false,error:error.stack});process.exitCode=1;}
finally {
 await Promise.all(contexts.map(context=>context.close().catch(()=>{})));if(browser)await browser.close();server.kill('SIGTERM');
 writeFileSync(join(output,'document-boundary-server.log'),serverLog);
 writeFileSync(join(output,'document-boundary-results.json'),JSON.stringify({testedCommit:process.env.GITHUB_SHA||'local-unpublished',testedAt:new Date().toISOString(),nextVersion:require('next/package.json').version,googleScriptSha256:createHash('sha256').update(sdk).digest('hex'),transmittedGoogleRequests:0,firstPartyResponses:'isolated loopback Next server only',results,errors,history,requests,decodedEvents:events(requests)},null,2)+'\n');
 console.log(JSON.stringify({results,errors,requests:requests.length},null,2));
}
