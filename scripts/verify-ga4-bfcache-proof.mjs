// Minimal real transport BFCache research gate via raw CDP, without Playwright Page.
// Uses actual middleware/CSP; not a full application/native/PWA or wire-header claim.
// NOT RUN locally where Chromium socket creation is prohibited. CI only.
// Failure to observe pageshow.persisted=true is a blocker, never a pass.
import assert from 'node:assert/strict';
import {assertFallbackPairs,assertNoSensitiveFields,assertCdpHeaderCoverage} from '../tests/fixtures/ga4-rewrite-root/network-checks.mjs';
import {readFileSync,writeFileSync,mkdtempSync,statSync,lstatSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url), root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'artifacts/ga4-bfcache-proof'), fixture=readFileSync(join(output,'fixture-path.txt'),'utf8').trim();
const sdk=readFileSync(join(output,'google-tag-readonly.js'),'utf8'), id='G-3WX7PDD52N';
const origin='https://holistichouse.vercel.app', local='http://127.0.0.1:3220', publicPath='/privacy/ga4-proof-only';
const sentinel=/SYNTHETIC_PRIVATE|SYNTHETIC_QUERY|SYNTHETIC_FRAGMENT/i;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,message,timeout=30000){const end=Date.now()+timeout;while(!await fn()){assert.ok(Date.now()<end,message);await wait(50);}}
const requests=[],snapshots=[],failures=[],caseResults=[],notRestored=[],extraHeaders=new Map(),networkRequests=new Map();
let browser,browserExit,browserSpawnError,browserVersion,vendorProfileSha256,ws,sessionId,scenario='setup',phase='setup',serverLog='',browserLog='',counter=0;
const pending=new Map(),listeners=new Map(),inflightHandlers=new Set();
function vendorEvidence(executable,vendorProfile){
 const paths=[executable,'/opt/google/chrome/chrome-sandbox','/opt/google/chrome','/opt/google',vendorProfile,'/etc/apparmor.d','/var/lib/dpkg/info/google-chrome-stable.md5sums'];
 const inspect=path=>{try{const brief=info=>({mode:(info.mode&0o7777).toString(8),uid:info.uid,gid:info.gid,size:info.size,symlink:info.isSymbolicLink()});const lstat=lstatSync(path),stat=statSync(path);return {path,realpath:realpathSync(path),lstat:brief(lstat),stat:brief(stat),...(stat.isFile()?{sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}: {})};}catch(error){return {path,error:error.message};}};
 const command=(file,args)=>{try{return {file,args,status:0,stdout:execFileSync(file,args,{encoding:'utf8',timeout:30000,maxBuffer:1024*1024,env:{PATH:process.env.PATH,HOME:tmpdir(),LANG:'C'},stdio:['ignore','pipe','pipe']})};}catch(error){return {file,args,status:error.status,error:error.message,stdout:String(error.stdout||''),stderr:String(error.stderr||'')};}};
 const read=path=>{try{return {path,value:readFileSync(path,'utf8').trim()};}catch(error){return {path,error:error.message};}};
 writeFileSync(join(output,'vendor-browser-preflight.json'),JSON.stringify({readOnly:true,uid:process.getuid(),gid:process.getgid(),files:paths.map(inspect),commands:[command('dpkg-query',['-W','google-chrome-stable','apparmor']),command('dpkg-query',['-S',executable,vendorProfile]),command('dpkg',['--verify','google-chrome-stable']),command('dpkg',['--verify','apparmor'])],namespacePolicy:read('/proc/sys/kernel/apparmor_restrict_unprivileged_userns'),currentProcessProfile:read('/proc/self/attr/current')},null,2)+'\n');
}
const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3220'],{cwd:fixture,env:{PATH:process.env.PATH,HOME:tmpdir(),NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_GA_MEASUREMENT_ID:id},stdio:['ignore','pipe','pipe']});
for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{serverLog+=data;});
function on(method,fn){listeners.set(method,fn);}
function send(method,params={},session=sessionId){return new Promise((resolve,reject)=>{const id=++counter,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timed out: '+method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;}
async function domReady(){await until(async()=>{try{return await evaluate("document.documentElement.dataset.ga4FixtureReady === 'true'");}catch{return false;}},'fixture hydrated');}
async function state(label){const value=await evaluate(`({documentId:window.__bfDocument,path:location.pathname,cspClass:document.body.dataset.cspClass,shows:window.__bfShows,draft:document.getElementById('ga4-draft')?.value,gtag:typeof window.gtag,hasQueue:window.dataLayer!==undefined,hasSdkScript:Boolean(document.querySelector('script[src*=googletagmanager]')),disabled:window['ga-disable-${id}'],notRestored:performance.getEntriesByType('navigation').map(x=>x.notRestoredReasons?.toJSON?.()||x.notRestoredReasons||null)})`);snapshots.push({scenario,label,...value});return value;}
const click=label=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)})?.click()`);
function events(){return requests.filter(e=>new URL(e.url).pathname==='/g/collect'&&new URL(e.url).hostname!=='www.google.com').flatMap(e=>{const common=Object.fromEntries(new URL(e.url).searchParams);return(e.body?e.body.split('\n'):['']).map(line=>({...common,...Object.fromEntries(new URLSearchParams(line)),phase:e.phase,scenario:e.scenario}));});}
function checkRaw(entry){if(new URL(entry.url).origin!==origin){assertNoSensitiveFields(entry);assert.doesNotMatch(JSON.stringify(entry),sentinel,'private data in URL/body/full headers');}}
function assertSafe(){
 assertFallbackPairs(requests);
 for(const entry of requests){checkRaw(entry);assert.notEqual(entry.action,'unknown-aborted','unknown endpoint');}
 for(const e of events()){assert.equal(e.dl,origin+publicPath);assert.equal(e.dt,'Holistic House');assert.ok(!e.dr);}
}
try{
 await until(async()=>{try{return(await fetch(local+'/privacy')).ok;}catch{return false;}},'isolated Next ready',60000);
 // Ubuntu's existing vendor profile covers this installed Chrome path, unlike
 // downloaded developer builds. Never install/modify a profile or disable sandbox.
 const executable='/opt/google/chrome/chrome',vendorProfile='/etc/apparmor.d/chrome';
 vendorEvidence(executable,vendorProfile);
 assert.equal(realpathSync(executable),executable);
 for(const path of [executable,vendorProfile]){const info=statSync(path);assert.equal(info.uid,0,path+' must be root-owned');assert.equal(info.mode&0o022,0,path+' must not be writable by runner or group');}
 vendorProfileSha256=createHash('sha256').update(readFileSync(vendorProfile)).digest('hex');
 const profile=mkdtempSync(join(tmpdir(),'hh-ga4-cdp-profile-'));
 // No --disable-back-forward-cache, no Playwright connect/page objects and no
 // unload listeners. Dead proxy exists before the first browser process starts.
 browser=spawn(executable,['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--proxy-server=http://127.0.0.1:9','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','about:blank'],{env:{PATH:process.env.PATH,HOME:tmpdir(),TMPDIR:tmpdir(),LANG:'en_US.UTF-8'},stdio:['ignore','ignore','pipe']});
 browser.stderr.on('data',data=>{browserLog+=data;});
 browser.on('exit',(code,signal)=>{browserExit={code,signal};});browser.on('error',error=>{browserSpawnError=error.message;});
 await until(()=>{assert.ok(!browserExit&&!browserSpawnError,'raw Chrome stopped before CDP: '+JSON.stringify({browserExit,browserSpawnError,stderr:browserLog}));return /DevTools listening on (ws:\/\/[^\s]+)/.test(browserLog);},'raw Chrome CDP available');
 ws=new WebSocket(browserLog.match(/DevTools listening on (ws:\/\/[^\s]+)/)[1]);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);if(p){pending.delete(data.id);clearTimeout(p.timer);if(data.error)p.reject(Error(JSON.stringify(data.error)));else p.resolve(data.result);}}else{const handler=listeners.get(data.method);if(handler&&(!data.sessionId||data.sessionId===sessionId)){const eventScenario=scenario,eventPhase=phase;const task=Promise.resolve(handler(data.params)).catch(error=>failures.push({scenario:eventScenario,phase:eventPhase,method:data.method,error:error.stack})).finally(()=>inflightHandlers.delete(task));inflightHandlers.add(task);}}});
 browserVersion=await send('Browser.getVersion',{},null);
 on('Page.backForwardCacheNotUsed',params=>notRestored.push({scenario,...params}));
 on('Network.requestWillBeSentExtraInfo',params=>{extraHeaders.set(params.requestId,params.headers);const entry=networkRequests.get(params.requestId);if(entry){entry.headers={...entry.headers,...params.headers};entry.extraInfoReceived=true;checkRaw(entry);}});
 on('Fetch.requestPaused',async params=>{
  const r=params.request,u=new URL(r.url),entry={scenario,phase,networkId:params.networkId,extraInfoReceived:extraHeaders.has(params.networkId),url:r.url,method:r.method,body:r.postData||null,headers:{...r.headers,...extraHeaders.get(params.networkId)},resourceType:params.resourceType};
  requests.push(entry);if(params.networkId)networkRequests.set(params.networkId,entry);
  try{
   checkRaw(entry);
   if(u.origin===origin){
    entry.action='loopback';const forwarded={};for(const [key,value] of Object.entries(r.headers))if(['accept','rsc','next-router-state-tree','next-router-prefetch','next-url','content-type','cookie'].includes(key.toLowerCase()))forwarded[key.toLowerCase()]=value;
    const response=await fetch(local+u.pathname+u.search,{method:r.method,headers:forwarded,body:['GET','HEAD'].includes(r.method)?undefined:r.postData,redirect:'manual'});
    entry.documentPolicy={cacheControl:response.headers.get('cache-control'),referrerPolicy:response.headers.get('referrer-policy'),contentSecurityPolicy:response.headers.get('content-security-policy')};
    const headers=[...response.headers].filter(([key])=>!['content-length','content-encoding','set-cookie'].includes(key)).map(([name,value])=>({name,value}));
    for(const value of response.headers.getSetCookie())headers.push({name:'set-cookie',value});
    await send('Fetch.fulfillRequest',{requestId:params.requestId,responseCode:response.status,responseHeaders:headers,body:Buffer.from(await response.arrayBuffer()).toString('base64')});
   }else if(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtag/js'&&!u.searchParams.has('is_td')){
    assert.ok([id,'GT-KTPSQT8C'].includes(u.searchParams.get('id')));entry.action='frozen-sdk';await send('Fetch.fulfillRequest',{requestId:params.requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/javascript'}],body:Buffer.from(sdk).toString('base64')});
   }else if(/^(?:www\.googletagmanager\.com|www\.google-analytics\.com|region1\.google-analytics\.com|www\.google\.com)$/.test(u.hostname)&&(['/g/collect','/td','/a'].includes(u.pathname)||(u.pathname==='/gtag/js'&&u.searchParams.get('is_td')==='1'))){entry.action='intercepted';await send('Fetch.fulfillRequest',{requestId:params.requestId,responseCode:u.pathname==='/gtag/js'?200:204,body:''});}
   else{entry.action='unknown-aborted';await send('Fetch.failRequest',{requestId:params.requestId,errorReason:'BlockedByClient'});}
  }catch(error){await send('Fetch.failRequest',{requestId:params.requestId,errorReason:'BlockedByClient'}).catch(()=>{});throw error;}
 });
 for (const mode of ['granted-return','withdrawn-regrant']) {
  scenario=mode;phase='setup';extraHeaders.clear();networkRequests.clear();
  const {browserContextId}=await send('Target.createBrowserContext',{},null);
  const target=await send('Target.createTarget',{url:'about:blank',browserContextId},null);
  sessionId=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
  const own=()=>requests.filter(entry=>entry.scenario===mode);
  const ownEvents=()=>events().filter(event=>event.scenario===mode);
  let navigationPassed=false,headerCoveragePassed=false;
  try {
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setBypassServiceWorker',{bypass:true});
 on('Network.webSocketCreated',params=>failures.push({phase,error:'Unexpected WebSocket blocked by dead proxy',url:params.url}));
 await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`if('serviceWorker' in navigator)Object.defineProperty(navigator.serviceWorker,'register',{value:()=>Promise.reject(new Error('Synthetic proof blocks service workers'))});window.__bfDocument=crypto.randomUUID();window.__bfShows=[];window.addEventListener('pageshow',event=>{window.__bfShows.push({persisted:event.persisted,cookieGranted:document.cookie.split(';').some(x=>x.trim()==='holistic_house_analytics_consent=granted'),dataset:document.documentElement.dataset.analyticsConsent,disabled:window['ga-disable-${id}']});},true);`});
 phase='initial-denied';await send('Page.navigate',{url:origin+publicPath+'?gtm_latency=1'});await domReady();assert.equal(own().filter(x=>x.action==='frozen-sdk').length,0);
 phase='public-granted';await click('Allow analytics');await until(()=>ownEvents().some(e=>e.en==='page_view'),'real SDK public pageview');await click('Synthetic acquisition');await until(()=>ownEvents().some(e=>e.en==='free_situation_assessment_click'),'positive acquisition');
 await evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(document.getElementById('ga4-draft'),'SYNTHETIC_PRIVATE_DRAFT');document.getElementById('ga4-draft').dispatchEvent(new Event('input',{bubbles:true}));");
 const publicState=await state('public-with-draft');assert.equal(publicState.draft,'SYNTHETIC_PRIVATE_DRAFT');
 phase='private-document';await evaluate("document.getElementById('ga4-push').click()");await until(async()=>{try{return await evaluate("location.pathname==='/en/app/ga4-proof-only'");}catch{return false;}},'private document');await domReady();
 const privateState=await state('private');assert.notEqual(privateState.documentId,publicState.documentId);assert.equal(privateState.gtag,'undefined');assert.equal(privateState.hasQueue,false);assert.equal(privateState.hasSdkScript,false);
 await wait(65000);
 if(mode==='withdrawn-regrant'){
  phase='withdraw-in-private';await click('Keep analytics off');assert.equal(await evaluate("document.cookie.includes('holistic_house_analytics_consent=denied')"),true);
 }
 const beforeRestore=ownEvents().length;phase=mode==='granted-return'?'back-with-granted-cookie':'back-with-denied-cookie';
 const navigation=await send('Page.getNavigationHistory');assert.ok(navigation.currentIndex>0);await send('Page.navigateToHistoryEntry',{entryId:navigation.entries[navigation.currentIndex-1].id});
 await until(async()=>{try{return await evaluate(`location.pathname===${JSON.stringify(publicPath)}`);}catch{return false;}},'returned public path');await domReady();const restored=await state('restored-public');
 assert.equal(restored.documentId,publicState.documentId,'must restore same document, not reload');assert.ok(restored.shows.some(x=>x.persisted),'genuine pageshow.persisted is mandatory');assert.equal(restored.draft,'SYNTHETIC_PRIVATE_DRAFT','BFCache must preserve user in-memory draft');
 const firstPersisted=restored.shows.filter(x=>x.persisted).at(-1);
 if(mode==='withdrawn-regrant'){
  assert.equal(firstPersisted.cookieGranted,false);assert.equal(firstPersisted.disabled,true,'live cookie boundary closes before app pageshow handlers');
  await wait(5000);assert.equal(ownEvents().length,beforeRestore,'no GA events after withdrawal on stale restored DOM');assertSafe();
  phase='regrant-restored-positive';await click('Allow analytics');await until(()=>ownEvents().slice(beforeRestore).some(e=>e.en==='page_view'),'restored regrant pageview');await click('Synthetic acquisition');await until(()=>ownEvents().slice(beforeRestore).some(e=>e.en==='free_situation_assessment_click'),'restored regrant acquisition');
 }else{
  assert.equal(firstPersisted.cookieGranted,true);assert.equal(firstPersisted.disabled,false);
  await until(()=>ownEvents().slice(beforeRestore).some(e=>e.en==='page_view'),'persisted granted return pageview');
  await click('Synthetic acquisition');await until(()=>ownEvents().slice(beforeRestore).some(e=>e.en==='free_situation_assessment_click'),'persisted granted return acquisition');
 }
 await wait(1500);assert.equal(ownEvents().slice(beforeRestore).filter(e=>e.en==='page_view').length,1,'exactly one resumed view');
 for(const event of ownEvents().slice(beforeRestore))if(event._et)assert.ok(Number(event._et)<15000,'private/off dwell excluded on real BFCache restoration');
 assertSafe();phase='forward-private';const forwardHistory=await send('Page.getNavigationHistory');assert.ok(forwardHistory.currentIndex+1<forwardHistory.entries.length);await send('Page.navigateToHistoryEntry',{entryId:forwardHistory.entries[forwardHistory.currentIndex+1].id});await until(async()=>{try{return await evaluate("location.pathname==='/en/app/ga4-proof-only'");}catch{return false;}},'forward private');await domReady();const forward=await state('forward-private');assert.equal(forward.gtag,'undefined');assert.equal(forward.hasQueue,false);assert.equal(forward.hasSdkScript,false);assertSafe();
 navigationPassed=true;
  } catch(error) { failures.push({scenario,phase,error:error.stack}); }
  finally {
   // ExtraInfo is asynchronous and can be absent for requests fulfilled before
   // network dispatch. Absence is an explicit proof failure, never full-header
   // coverage inferred from Fetch headers or the elapsed wait.
   const deadline=Date.now()+3000;
   while(Date.now()<deadline&&own().some(entry=>new URL(entry.url).origin!==origin&&!entry.extraInfoReceived))await wait(50);
   try{assertCdpHeaderCoverage(own().filter(entry=>new URL(entry.url).origin!==origin));assertSafe();headerCoveragePassed=true;}
   catch(error){failures.push({scenario,phase:'header-coverage',error:error.stack});}
   caseResults.push({scenario,passed:navigationPassed&&headerCoveragePassed,navigationPassed,headerCoveragePassed,headerAttempts:own().filter(entry=>new URL(entry.url).origin!==origin).length,headerCovered:own().filter(entry=>new URL(entry.url).origin!==origin&&entry.extraInfoReceived).length});
   await Promise.all([...inflightHandlers]);
   await send('Target.disposeBrowserContext',{browserContextId},null);
  }
 }
 assert.equal(caseResults.length,2);assert.equal(failures.length,0,JSON.stringify(failures));
}catch(error){failures.push({phase,error:error.stack});process.exitCode=1;}
finally{
 if(ws){await send('Browser.close',{},null).catch(()=>{});ws.close();}if(browser)browser.kill('SIGTERM');server.kill('SIGTERM');for(const p of pending.values())clearTimeout(p.timer);pending.clear();
 const redact=entry=>{const headers={...entry.headers};for(const key of Object.keys(headers))if(key.toLowerCase()==='cookie')headers[key]='[synthetic-cookie-values-omitted]';const clean=text=>text?.replace(/((?:^|[?&])(?:cid|sid|gcid|_gid|_ga)=)[^&\n]*/g,'$1[synthetic-id-omitted]');return {...entry,url:clean(entry.url),body:clean(entry.body),headers};};
 writeFileSync(join(output,'bfcache-server.log'),serverLog);
 writeFileSync(join(output,'bfcache-browser.log'),JSON.stringify({browserExit,browserSpawnError,browserVersion,vendorProfileSha256},null,2)+'\n'+browserLog);
 writeFileSync(join(output,'bfcache-results.json'),JSON.stringify({testedAt:new Date().toISOString(),sdkSha256:createHash('sha256').update(sdk).digest('hex'),passed:failures.length===0,transmittedGoogleRequests:0,driver:'raw CDP without Playwright Page',headerCoverageRequirement:'Network.requestWillBeSentExtraInfo for every intercepted third-party attempt; absence fails',caseResults,serviceWorkers:'blocked in initialization; PWA behavior excluded',persistedRequired:true,snapshots,notRestored,failures,requests:requests.map(redact)},null,2)+'\n');
 console.log(JSON.stringify({passed:failures.length===0,caseResults,snapshots,failures},null,2));
}
