// Minimal rewrite/root hypothesis only. No accounts, secrets, or external hits.
import assert from 'node:assert/strict';
import {assertFallbackPairs,assertNoSensitiveFields} from './network-checks.mjs';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url),origin='https://holistichouse.vercel.app',local='http://127.0.0.1:3242';
const sdk=readFileSync(process.env.HH_GA4_FROZEN_SDK,'utf8');
const target='/books/SYNTHETIC_PRIVATE_TOKEN?secret=SYNTHETIC_PRIVATE_QUERY#SYNTHETIC_PRIVATE_FRAGMENT';
const requests=[],observations=[],results=[],errors=[],contexts=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,message){const end=Date.now()+30000;while(!await fn()){assert.ok(Date.now()<end,message);await wait(25);}}
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3242'],{env:{PATH:process.env.PATH,HOME:'/tmp',NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let browser,log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
const isGoogle=url=>/^(www\.googletagmanager\.com|www\.google-analytics\.com|region1\.google-analytics\.com|www\.google\.com)$/.test(url.hostname);
function safe(){assertFallbackPairs(requests);for(const entry of requests)if(new URL(entry.url).origin!==origin){assertNoSensitiveFields(entry);assert.doesNotMatch(JSON.stringify(entry),/SYNTHETIC_PRIVATE/i,'SDK request must never expose excluded URL');}for(const event of events(requests)){assert.ok([origin+'/',origin+'/books/known-public'].includes(event.dl));assert.equal(event.dt,'Holistic House');assert.ok(!event.dr);}for(const value of observations)assert.doesNotMatch(value.url,/SYNTHETIC_PRIVATE/i,'public root probe observed excluded URL');assert.equal(errors.length,0,JSON.stringify(errors));}
function events(own){return own.filter(entry=>new URL(entry.url).pathname==='/g/collect').flatMap(entry=>{const url=new URL(entry.url);return(entry.body?entry.body.split('\n'):['']).map(line=>({...Object.fromEntries(url.searchParams),...Object.fromEntries(new URLSearchParams(line))}));});}
async function context(name,delay=false){
 const context=await browser.newContext({serviceWorkers:'block'});contexts.push(context);let phase='initial',release;const gate=delay?new Promise(r=>release=r):Promise.resolve(),own=[];
 await context.exposeBinding('__reportProof',(_,value)=>observations.push({scenario:name,...value}));
 await context.addInitScript(()=>{window.__miniDocument=crypto.randomUUID();});
 await context.addCookies([{name:'synthetic_analytics_granted',value:'true',url:origin}]);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),headers=await request.allHeaders(),entry={scenario:name,phase,url:request.url(),method:request.method(),headers,body:request.postData()};requests.push(entry);own.push(entry);
  try{
   if(url.origin===origin){
    const forward={};for(const [key,value]of Object.entries(headers))if(['accept','rsc','next-router-state-tree','next-router-prefetch','next-url','cookie'].includes(key))forward[key]=value;
    const response=await fetch(local+url.pathname+url.search,{headers:forward,redirect:'manual'});
    const resultHeaders=Object.fromEntries(response.headers);delete resultHeaders['content-length'];delete resultHeaders['content-encoding'];
    await route.fulfill({status:response.status,headers:resultHeaders,body:Buffer.from(await response.arrayBuffer())});
   }else{
    safe();
    if(url.hostname==='www.googletagmanager.com'&&url.pathname==='/gtag/js'&&!url.searchParams.has('is_td')){
     assert.ok(['G-3WX7PDD52N','GT-KTPSQT8C'].includes(url.searchParams.get('id')));entry.action='sdk-held';await gate;
     try{await route.fulfill({status:200,contentType:'application/javascript',body:`window.__reportProof?.({url:location.href,documentId:window.__miniDocument,kind:'SDK-execution'});\n`+sdk});entry.action='sdk-fulfilled';}catch(error){if(!request.failure())throw error;entry.action='sdk-cancelled';}
    }else if(isGoogle(url)&&(['/g/collect','/td','/a'].includes(url.pathname)||(url.pathname==='/gtag/js'&&url.searchParams.get('is_td')==='1'))){entry.action='intercepted';await route.fulfill({status:url.pathname==='/gtag/js'?200:204,body:''});}
    else{entry.action='unknown-aborted';errors.push({scenario:name,error:'Unknown external endpoint',host:url.hostname,path:url.pathname});await route.abort('blockedbyclient');}
   }
  }catch(error){errors.push({scenario:name,error:error.message});await route.abort('blockedbyclient').catch(()=>{});}
 });
 await context.routeWebSocket('**/*',socket=>{errors.push({scenario:name,error:'Unexpected WebSocket'});socket.close();});
 const page=await context.newPage();page.on('pageerror',error=>errors.push({scenario:name,error:error.message}));return {context,page,own,setPhase:value=>{phase=value;},release:release||(()=>{})};
}
try{
 await until(async()=>{try{return(await fetch(local)).ok;}catch{return false;}},'minimal fixture ready');
 const {chromium}=require(process.env.HH_GA4_PLAYWRIGHT_MODULE||'playwright');browser=await chromium.launch({headless:true,proxy:{server:'http://127.0.0.1:9'},args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
 const cold=await context('cold-saved-grant-miss');const response=await cold.page.goto(origin+target);assert.equal(response.status(),404);await wait(1500);assert.equal(await cold.page.locator('meta[name="robots"][content*="noindex"]').count()>0,true);assert.equal(cold.own.filter(e=>isGoogle(new URL(e.url))).length,0);assert.equal(cold.page.url(),origin+target);results.push({scenario:'cold-saved-grant-miss',passed:true});await cold.context.close();
 for(const mode of ['loaded','delayed'])for(const kind of ['link','push','replace']){
  const name=mode+'-'+kind,s=await context(name,mode==='delayed');await s.page.goto(origin+'/?gtm_latency=1',{waitUntil:'domcontentloaded'});await s.page.waitForFunction(()=>document.documentElement.dataset.controlsReady==='true');
  await until(()=>s.own.some(e=>e.action?.startsWith('sdk-')),'positive SDK request');if(mode==='loaded')await until(()=>events(s.own).some(e=>e.en==='page_view'),'positive real SDK public view');
  s.setPhase('navigate-unknown');const old=await s.page.evaluate(()=>window.__miniDocument);await s.page.locator('#target').fill(target);await s.page.locator('#'+kind).click();
  await s.page.waitForFunction(({old,target})=>window.__miniDocument!==old&&location.pathname===target,{old,target:'/books/SYNTHETIC_PRIVATE_TOKEN'});
  s.release();await wait(2000);assert.equal(s.page.url(),origin+target,'visible requested URL and fragment preserved');
  assert.equal(await s.page.evaluate(()=>typeof window.gtag),'undefined');assert.equal(await s.page.locator('#mini-google-tag').count(),0);safe();
  s.setPhase('public-return');const before=events(s.own).length;await s.page.evaluate(()=>location.assign('/?gtm_latency=1'));await s.page.waitForFunction(()=>document.documentElement.dataset.controlsReady==='true');await until(()=>events(s.own).slice(before).some(e=>e.en==='page_view'),'positive public return');safe();
  results.push({scenario:name,passed:true});await s.context.close();
 }
 assert.equal(results.length,7);safe();
}catch(error){errors.push({error:error.stack});process.exitCode=1;}
finally{
 await Promise.all(contexts.map(context=>context.close().catch(()=>{})));if(browser)await browser.close();server.kill('SIGTERM');
 const redact=entry=>{const clean=value=>value?.replace(/((?:^|[?&])(?:cid|sid|gcid|_gid|_ga)=)[^&\n]*/g,'$1[synthetic-id-omitted]');const headers={...entry.headers};if(headers.cookie)headers.cookie='[synthetic-cookie-omitted]';return {...entry,url:clean(entry.url),body:clean(entry.body),headers};};
 writeFileSync('../rewrite-404-mini-browser-results.json',JSON.stringify({passed:errors.length===0&&results.length===7,sdkSha256:createHash('sha256').update(sdk).digest('hex'),transmittedGoogleRequests:0,results,errors,observations,requests:requests.map(redact),limits:['Minimal Next application only','No BFCache or real-app routing/auth/CSP proof','Playwright complete allHeaders metadata, not raw-CDP wire-header guarantee']},null,2));writeFileSync('../rewrite-404-mini-browser-server.log',log);
}
