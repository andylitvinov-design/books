// Synthetic handled-fetch diagnostic; the original script Back probe is unchanged.
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { bounded, cleanupPreservingError } from './probe.mjs';

export const fetchFixture = `<!doctype html><title>Synthetic ratings</title><p id="ratings">Synthetic ratings</p><script>
window.__ratingsController = new AbortController();
window.__ratingsState = 'pending';
fetch('/synthetic-ratings', {credentials:'same-origin',cache:'no-store',signal:window.__ratingsController.signal})
 .then(response => { if (!response.ok) throw new Error('SYNTHETIC_HTTP'); return response.json(); })
 .then(data => { window.__ratingsState = data.rating === 5 ? 'completed' : 'invalid'; window.__ratingsEvent = window.__fetchEvent({type:'fetch-completed',time:Date.now()}); })
 .catch(error => {
  window.__ratingsState = error.name === 'AbortError' ? 'aborted' : 'rejected';
  window.__ratingsEvent = window.__fetchEvent({type:window.__ratingsState === 'aborted' ? 'fetch-aborted' : 'fetch-rejected',time:Date.now()});
 });
</script>`;

export function consoleCategory(message, origin) {
 const text = String(message);
 if (text.includes(origin + '/synthetic-ratings') && /access control/i.test(text)) return 'ratings-access-control';
 return 'other';
}
export function classifyFetch(events, mode, returnedHome) {
 if (!returnedHome) return 'navigation-failed';
 if(events.some(e=>e.type==='fetch-response' && e.status!==200))return 'unexpected-response';
 if (events.some(e => e.type === 'crash' || (['pageerror','console-error'].includes(e.type) && e.category === 'other'))) return 'unexpected-error';
 const command = events.findIndex(e => e.type === 'navigation-command');
 const requested = command >= 0 && events.slice(0, command).some(e => e.type === 'server-fetch-request');
 const warnings = events.filter(e => ['pageerror','console-error'].includes(e.type));
 const cancelled = events.some(e => e.type === 'requestfailed' && e.cancelled);
 if (mode === 'completed') return requested && !warnings.length && !cancelled && events.slice(0,command).some(e => e.type === 'fetch-response' && e.status===200) && events.slice(0,command).some(e => e.type === 'fetch-completed') ? 'completed-control-passed' : 'completed-control-failed';
 if (mode === 'abort-before-navigation') {
  const abort = events.findIndex(e => e.type === 'abort-command');
  const settled = events.findIndex(e => e.type === 'fetch-aborted');
  if (!(requested && events.findIndex(e=>e.type==='server-fetch-request') < abort && abort >= 0 && settled > abort && settled < command)) return 'invalid-abort-control';
  return !warnings.length ? 'abort-control-quiet' : 'abort-control-not-quiet';
 }
 const after = command < 0 ? [] : events.slice(command + 1);
 if (!requested) return 'insufficient-evidence';
 if (after.some(e => ['pageerror','console-error'].includes(e.type) && e.category === 'ratings-access-control')) return after.some(e=>e.type==='requestfailed'&&e.cancelled) ? 'native-access-control-cancellation-observed' : 'access-control-without-cancellation-proof';
 if (after.some(e => e.type === 'requestfailed' && e.cancelled)) return 'native-cancellation-without-access-control';
 return 'not-reproduced';
}

export async function runFetchProbe({webkit,output}) {
 mkdirSync(output,{recursive:true});
 const summaries=[];
 for (const mode of ['no-abort','abort-before-navigation','completed']) {
  const name='fetch-'+mode;
  const events=[];
  let dropped=0;
  writeFileSync(`${output}/${name}.jsonl`,'');
  const record=data=>{
   if(events.length>=100){dropped++;return;}
   const event={...data,receivedAt:Date.now()};events.push(event);
   appendFileSync(`${output}/${name}.jsonl`,JSON.stringify(event)+'\n');
  };
  let response,browser,primaryError,requested;
  const pending=new Promise(resolve=>{requested=resolve;});
  const server=http.createServer((req,res)=>{
   if(req.url==='/synthetic-ratings'){
    record({type:'server-fetch-request'});response=res;requested();return;
   }
   res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});
   res.end(req.url==='/ratings'?fetchFixture:'<!doctype html><title>Home</title><button id="home">Usable home</button>');
  });
  try {
   await bounded(async()=>{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const origin=`http://127.0.0.1:${server.address().port}`;
    browser=await webkit.launch({timeout:5000});
    const page=await browser.newPage();
    page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(5000);
    await page.exposeFunction('__fetchEvent',data=>{
     if(['fetch-completed','fetch-aborted','fetch-rejected','navigate','pagehide','beforeunload','load'].includes(data?.type))record({type:data.type,time:Number.isFinite(data.time)?data.time:null});
    });
    await page.addInitScript(()=>{
     for(const type of ['beforeunload','pagehide','load'])addEventListener(type,()=>window.__fetchEvent({type,time:Date.now()}));
     globalThis.navigation?.addEventListener('navigate',()=>window.__fetchEvent({type:'navigate',time:Date.now()}));
    });
    page.on('console',message=>{if(message.type()==='error')record({type:'console-error',category:consoleCategory(message.text(),origin)});});
    page.on('pageerror',error=>record({type:'pageerror',category:consoleCategory(error.message,origin)}));
    page.on('crash',()=>record({type:'crash'}));
    page.on('response',res=>{if(res.url()===origin+'/synthetic-ratings')record({type:'fetch-response',status:res.status()});});
    page.on('requestfailed',req=>{if(req.url()===origin+'/synthetic-ratings')record({type:'requestfailed',cancelled:/abort|cancel/i.test(req.failure()?.errorText||'')});});
    await page.goto(origin+'/home');
    await page.goto(origin+'/ratings',{waitUntil:'domcontentloaded'});
    await bounded(()=>pending,5000,'Synthetic fetch request');
    await page.waitForFunction(()=>window.__ratingsState==='pending');
    if(mode==='abort-before-navigation'){
     record({type:'abort-command'});
     await page.evaluate(()=>window.__ratingsController.abort());
     await page.waitForFunction(()=>window.__ratingsState==='aborted');
     // Flush the fixture event binding before recording the navigation command.
     await page.evaluate(()=>window.__ratingsEvent);
    }else if(mode==='completed'){
     response.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
     response.end(JSON.stringify({rating:5,count:1}));
     await page.waitForFunction(()=>window.__ratingsState==='completed');
     await page.evaluate(()=>window.__ratingsEvent);
    }
    record({type:'navigation-command',mode,method:'page-goto'});
    await page.goto(origin+'/home',{waitUntil:'domcontentloaded'});
    await page.locator('#home').click();
    const returnedHome=await page.locator('#home').isVisible();
    record({type:'navigation-complete',returnedHome});
    const outcome=classifyFetch(events,mode,returnedHome);
    summaries.push({mode,outcome,version:browser.version(),events:events.length,dropped});
    writeFileSync(`${output}/fetch-summary.json`,JSON.stringify({scope:'synthetic-handled-fetch-only',summaries},null,2));
   },30000,'Fetch case');
  }catch(error){primaryError=error;record({type:'probe-failure'});throw error;}
  finally{
   response?.destroy();server.closeAllConnections();
   await cleanupPreservingError(()=>Promise.all([new Promise(resolve=>server.close(resolve)),browser?.close()]),primaryError);
  }
 }
 assert.ok(summaries.every(s=>s.dropped===0&&!['invalid-abort-control','unexpected-response','unexpected-error','navigation-failed','insufficient-evidence','completed-control-failed'].includes(s.outcome)),'Synthetic diagnostic controls and evidence must remain valid');
 return summaries;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
 console.log(JSON.stringify(await runFetchProbe({webkit,output:process.env.PROBE_OUTPUT||'/tmp/native-back-cancellation'}),null,2));
}
