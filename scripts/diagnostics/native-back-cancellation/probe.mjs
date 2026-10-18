// Standalone synthetic diagnostic. Does not replace or relax the release audit.
import assert from 'node:assert/strict';
import http from 'node:http';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const fixture = `<!doctype html><title>Synthetic pending script</title><p id="fixture">Synthetic</p><script>
window.__fixtureReady = false;
window.__fixtureLoaded = false;
new Promise((resolve, reject) => {
 const script = document.createElement('script');
 script.src = '/delayed.js';
 script.onload = () => { window.__fixtureLoaded = true; resolve(); };
 script.onerror = () => { window.__probeEvent({type:'script-error',time:Date.now()}); reject(new Error('SYNTHETIC_PENDING_SCRIPT_CANCELLED')); };
 document.head.appendChild(script);
 window.__fixtureReady = true;
});
</script>`;

export async function bounded(operation, timeoutMs, label) {
 let timer;
 try {
  return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
   timer = setTimeout(() => reject(new Error(label + ' deadline')), timeoutMs);
  })]);
 } finally { clearTimeout(timer); }
}

export async function cleanupPreservingError(operation, primaryError, timeoutMs = 5000) {
 try { await bounded(operation, timeoutMs, 'Cleanup'); }
 catch (error) { if (!primaryError) throw error; }
}

export function classifyEvidence(events, mode, returnedHome) {
 const command = events.findIndex(e => e.type === 'back-command');
 const afterCommand = command < 0 ? [] : events.slice(command + 1);
 const cancelled = afterCommand.some(e => e.type === 'requestfailed' && e.path === '/delayed.js' && e.cancelled === true);
 const pageError = afterCommand.some(e => e.type === 'pageerror' && e.category === 'synthetic-script-error');
 if (!returnedHome) return 'navigation-failed';
 if (events.some(e => e.type === 'crash' || (e.type === 'pageerror' && e.category !== 'synthetic-script-error'))) return 'unexpected-error';
 if (mode === 'loaded') return events.some(e => e.type === 'requestfailed' || e.type === 'pageerror') ? 'control-failed' : 'control-passed';
 return command > 0 && events.slice(0, command).some(e => e.type === 'server-script-request') && cancelled && pageError ? 'cancellation-reproduced' : 'not-reproduced';
}

export async function runProbe({ webkit, output }) {
 mkdirSync(output, { recursive: true });
 const summaries = [];
 for (const method of ['protocol-back', 'history-back']) {
  for (const mode of ['pending', 'loaded']) {
   const events = [];
   const name = `${method}-${mode}`;
   writeFileSync(`${output}/${name}.jsonl`, '');
   const record = data => {
    if (events.length >= 100) return;
    const event = { ...data, receivedAt: Date.now() };
    events.push(event);
    appendFileSync(`${output}/${name}.jsonl`, JSON.stringify(event) + '\n');
   };
   let scriptResponse;
   let requested;
   const scriptRequested = new Promise(resolve => { requested = resolve; });
   const server = http.createServer((req, res) => {
    if (req.url === '/delayed.js') {
     record({type:'server-script-request'});
     scriptResponse = res;
     requested();
     return; // Controlled pending response, no artificial polling/delay.
    }
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    res.end(req.url === '/loading' ? fixture : '<!doctype html><title>Home</title><p id="home">Home</p>');
   });
   await bounded(() => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
   }), 5000, 'Loopback listen');
   const origin = `http://127.0.0.1:${server.address().port}`;
   let browser;
   let returnedHome = false;
   let primaryError;
   try {
    await bounded(async () => {
    browser = await webkit.launch({timeout:5000});
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(5000);
    await page.exposeFunction('__probeEvent', data => {
     // Only allowlisted values from our synthetic fixture are persisted.
     if (['script-error', 'navigate', 'pagehide', 'load'].includes(data?.type)) {
      record({type:data.type, time:Number.isFinite(data.time) ? data.time : null});
     }
    });
    await page.addInitScript(() => {
     for (const type of ['pagehide', 'load']) addEventListener(type, () => window.__probeEvent({type,time:Date.now()}));
     globalThis.navigation?.addEventListener('navigate', () => window.__probeEvent({type:'navigate',time:Date.now()}));
    });
    page.on('requestfailed', request => {
     const url = new URL(request.url());
     if (url.origin === origin && url.pathname === '/delayed.js') record({type:'requestfailed',path:'/delayed.js',cancelled:/cancel|abort/i.test(request.failure()?.errorText || '')});
    });
    page.on('pageerror', error => record({type:'pageerror',category:error.message.includes('SYNTHETIC_PENDING_SCRIPT_CANCELLED') ? 'synthetic-script-error' : 'other'}));
    page.on('crash', () => record({type:'crash'}));
    await page.goto(origin + '/home');
    await page.goto(origin + '/loading', { waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => window.__fixtureReady);
    // Browser flag plus actual server arrival proves a pending external script.
    await Promise.race([scriptRequested, new Promise((_, reject) => {
     const timeout = setTimeout(() => reject(new Error('Synthetic request deadline')), 5000);
     timeout.unref();
    })]);
    if (mode === 'loaded') {
     scriptResponse.writeHead(200, {'content-type':'text/javascript'});
     scriptResponse.end('window.__syntheticScriptExecuted=true;');
     await page.waitForFunction(() => window.__fixtureLoaded && window.__syntheticScriptExecuted);
    }
    record({type:'back-command',method,mode});
    if (method === 'protocol-back') await page.goBack({waitUntil:'domcontentloaded'});
    else await Promise.all([page.waitForURL(origin + '/home', {waitUntil:'domcontentloaded'}), page.evaluate(() => history.back())]);
    returnedHome = await page.locator('#home').isVisible();
    record({type:'back-complete',returnedHome});
    const outcome = classifyEvidence(events, mode, returnedHome);
    summaries.push({name,method,mode,outcome,version:browser.version(),events:events.length});
    }, 30000, 'Synthetic case');
   } catch (error) {
    primaryError = error;
    record({type:'probe-failure',category:error?.name === 'TimeoutError' ? 'timeout' : 'error'});
    throw error;
   } finally {
    scriptResponse?.destroy();
    server.closeAllConnections();
    await cleanupPreservingError(async () => {
     await Promise.all([new Promise(resolve => server.close(resolve)), browser?.close()]);
    }, primaryError);
   }
  }
 }
 writeFileSync(`${output}/summary.json`, JSON.stringify({scope:'synthetic-only',summaries}, null, 2));
 assert.ok(summaries.every(s => !['unexpected-error', 'navigation-failed'].includes(s.outcome)), 'Unexpected browser failure invalidates the diagnostic');
 assert.ok(summaries.filter(s => s.mode === 'loaded').every(s => s.outcome === 'control-passed'), 'Loaded controls must pass');
 return summaries;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
 console.log(JSON.stringify(await runProbe({webkit,output:process.env.PROBE_OUTPUT || '/tmp/native-back-cancellation'}), null, 2));
}
