import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_GA4_PLAYWRIGHT_MODULE || "playwright");
const base = new URL("../", import.meta.url);
const output = new URL("../artifacts/ga4-privacy/", import.meta.url);
mkdirSync(output, { recursive: true });
const sdk = readFileSync(process.env.HH_GA4_SDK_PATH || new URL("google-tag-readonly.js", output), "utf8");
const compiled = {};
for (const path of ["lib/public-analytics.ts", "components/ga4-analytics.tsx", "components/analytics-consent.tsx"]) {
  let source = readFileSync(new URL(path, base), "utf8");
  if (path.includes("analytics-consent")) source += "\nexport const applyConsentForFixture = applyConsent;\n";
  compiled[path] = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
}
const id = "G-3WX7PDD52N";
const fixture = `<!doctype html><html><head><title>Public synthetic fixture</title></head><body><h1>Offline-intercepted analytics fixture</h1><script>
(() => {
 const compiled = ${JSON.stringify(compiled)};
 const modules = new Map();
 let pathname = location.pathname, effects = [], refs = [], cursor = 0, cleanup;
 const react = { useEffect: fn => effects.push(fn), useRef: null, useState: initial => [initial,()=>{}] };
 // Preserve hook indexes across renders without mounting React or Next.
 react.useRef = initial => { const i=cursor++; return refs[i] ??= {current:initial}; };
 function evaluate(path) {
  if(modules.has(path)) return modules.get(path);
  const exports={};
  const require=name => name==='react'?react:name==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null}:name==='next/navigation'?{usePathname:()=>pathname}:name==='@/lib/public-analytics'?evaluate('lib/public-analytics.ts'):(()=>{throw Error(name)})();
  new Function('require','exports','process',compiled[path])(require,exports,{env:{NEXT_PUBLIC_GA_MEASUREMENT_ID:'${id}'}});
  modules.set(path,exports);return exports;
 }
 const analytics=evaluate('components/ga4-analytics.tsx');
 const consent=evaluate('components/analytics-consent.tsx');
 const events=evaluate('lib/public-analytics.ts');
 function render(){cleanup?.(); pathname=location.pathname; cursor=0;effects=[];analytics.Ga4Analytics({nonce:'fixture'});cleanup=effects[0]?.();}
 function syncConsent(){effects=[];consent.AnalyticsConsent();effects[0]?.();}
 let fixtureVisibility='visible';
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>fixtureVisibility});
 document.documentElement.dataset.analyticsConsent='denied';
 window.fixture={render,syncConsent,
  grant(){document.cookie='holistic_house_analytics_consent=granted; Path=/; Secure';consent.applyConsentForFixture('granted');},
  revoke(){document.cookie='holistic_house_analytics_consent=denied; Path=/; Secure';consent.applyConsentForFixture('denied');},
  navigateOnly(url){history.pushState({},'',url);},
  navigate(url){history.pushState({},'',url);render();syncConsent();},
  acquire(){events.emitPublicAnalyticsEvent('free_situation_assessment_click');},
  lifecycle(state){fixtureVisibility=state;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent(state==='hidden'?'pagehide':'pageshow',{persisted:false}));},
  unmount(){cleanup?.();cleanup=undefined;},
  queue(){return (window.dataLayer||[]).filter(x=>Object.prototype.toString.call(x)==='[object Arguments]').map(x=>Array.from(x));}
 };
 render(); syncConsent();
})();</script></body></html>`;

// A dead local proxy is a second boundary if any request ever misses routing.
const browser = await chromium.launch({
  ...(process.env.HH_GA4_CHROMIUM_PATH ? { executablePath: process.env.HH_GA4_CHROMIUM_PATH } : {}),
  headless: true,
  proxy: { server: "http://127.0.0.1:9" },
  args: ["--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-default-apps", "--no-first-run"],
});
const requests = [], errors = [], results = [], contexts = [];
const collection = (entries = requests) => entries.filter(entry => /(?:^|\.)google-analytics\.com$|^analytics\.google\.com$/.test(new URL(entry.url).hostname));
function decodedEvents(entries = requests) {
  return collection(entries).flatMap(entry => {
    if (!new URL(entry.url).pathname.endsWith("/g/collect")) return [];
    const common = Object.fromEntries(new URL(entry.url).searchParams);
    return (entry.body ? entry.body.split("\n") : [""]).map(line => ({ scenario: entry.scenario, phase: entry.phase, ...common, ...Object.fromEntries(new URLSearchParams(line)) }));
  });
}
const sentinel = /SYNTHETIC_QUERY|SYNTHETIC_FRAGMENT|SYNTHETIC_PRIVATE|SYNTHETIC_RETURN_QUERY/;
async function waitUntil(predicate, message, timeout = 10000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) assert.fail(message);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
async function scenario(name, { holdSdk = false, path = "/en?private_query=SYNTHETIC_QUERY#SYNTHETIC_FRAGMENT" } = {}) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  contexts.push(context);
  const own = [];
  let phase = "initial-no-consent", releaseSdk;
  const sdkGate = holdSdk ? new Promise(resolve => { releaseSdk = resolve; }) : Promise.resolve();
  // Register before page creation. NEVER continue or fetch a routed request.
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    const headers = request.headers();
    if (headers.cookie) headers.cookie = "[isolated synthetic cookies omitted]";
    const entry = { scenario: name, phase, url: request.url(), method: request.method(), resourceType: request.resourceType(), body: request.postData(), headers };
    own.push(entry); requests.push(entry);
    if (url.hostname === "holistichouse.vercel.app" && request.isNavigationRequest()) {
      entry.action = "local-fixture";
      // Do not impose a safer response referrer policy than the application.
      await route.fulfill({ status: 200, contentType: "text/html", body: fixture });
    } else if (url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js" && [id, "GT-KTPSQT8C"].includes(url.searchParams.get("id"))) {
      entry.action = "local-frozen-sdk";
      await sdkGate;
      await route.fulfill({ status: 200, contentType: "application/javascript", body: sdk });
    } else if (collection([entry]).length) {
      entry.action = "intercepted-local-204";
      await route.fulfill({ status: 204, body: "" });
    } else {
      entry.action = "aborted-no-network";
      await route.abort("blockedbyclient");
    }
  });
  // Block sockets too; the SDK has no reason to create one for this flow.
  await context.routeWebSocket("**/*", socket => {
    errors.push({ scenario: name, phase, message: `Unexpected WebSocket: ${socket.url()}` });
    socket.close();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push({ scenario: name, phase, message: error.message }));
  await page.goto("https://holistichouse.vercel.app" + path);
  return {
    page, own, context,
    phase(value) { phase = value; },
    releaseSdk() { releaseSdk?.(); },
    events: () => decodedEvents(own),
    collects: () => collection(own),
    checkpoint(label) { results.push({ scenario: name, checkpoint: label, passed: true, intendedCollectionRequests: collection(own).length }); },
  };
}
async function settled(page, ms = 2300) { await page.waitForTimeout(ms); }
function assertSafe(entries) {
  const outbound = entries.filter(entry => entry.action !== "local-fixture");
  assert.doesNotMatch(JSON.stringify(outbound), sentinel, "no synthetic sensitive values in external URL, body or headers");
  assert.equal(outbound.filter(entry => entry.action === "aborted-no-network").length, 0, "unknown destinations must be investigated");
  for (const event of decodedEvents(entries)) {
    assert.equal(event.tid, id);
    assert.equal(event.dl, "https://holistichouse.vercel.app/en");
    assert.ok(!event.dr);
    assert.equal(event.dt, "Holistic House");
    assert.ok(!["generate_lead", "purchase", "lead_received_verified"].includes(event.en));
  }
}

try {
  const s = await scenario("consent-and-spa");
  const { page } = s;
  await settled(page, 800);
  assert.equal(s.own.filter(entry => entry.action === "local-frozen-sdk").length, 0);
  assert.equal(s.collects().length, 0); s.checkpoint("no script or collection without consent");

  s.phase("public-grant");
  await page.evaluate(() => window.fixture.grant());
  await waitUntil(() => s.events().some(event => event.en === "page_view"), "positive control: full SDK public pageview");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "page_view").length, 1); s.checkpoint("exactly one initial manual pageview");

  s.phase("public-acquisition");
  await page.evaluate(() => window.fixture.acquire());
  await waitUntil(() => s.events().some(event => event.en === "free_situation_assessment_click"), "positive control: acquisition event");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "free_situation_assessment_click").length, 1); s.checkpoint("secondary public event arrives");

  s.phase("private-before-react-effect");
  const beforePrivate = s.collects().length;
  await page.evaluate(() => {
    window.fixture.navigateOnly("/en/app/SYNTHETIC_PRIVATE_PATH?token=SYNTHETIC_PRIVATE_QUERY");
    document.title = "SYNTHETIC_PRIVATE_TITLE";
    window.fixture.acquire();
  });
  // Exercise autonomous SDK timers across a real one-minute interval, without
  // attributing those callbacks to our manual event handlers.
  await settled(page, 65000);
  await page.evaluate(() => window.fixture.lifecycle("hidden"));
  await settled(page);
  assert.equal(await page.evaluate(id => window["ga-disable-" + id], id), true);
  assert.equal(s.collects().length, beforePrivate); s.checkpoint("private route blocks stale handlers, autonomous timers and lifecycle before React effects");

  s.phase("private-after-consent-sync");
  await page.evaluate(() => { window.fixture.render(); window.fixture.syncConsent(); window.fixture.lifecycle("visible"); window.fixture.lifecycle("hidden"); });
  await settled(page);
  assert.equal(s.collects().length, beforePrivate); s.checkpoint("private consent synchronization creates no collection");

  s.phase("return-same-public");
  await page.evaluate(() => { window.fixture.navigate("/en?private_query=SYNTHETIC_RETURN_QUERY"); window.fixture.lifecycle("visible"); window.fixture.acquire(); });
  await waitUntil(() => s.events().filter(event => event.en === "page_view").length >= 2 && s.events().filter(event => event.en === "free_situation_assessment_click").length >= 2, "positive control: return public view and acquisition");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "page_view").length, 2);
  assert.equal(s.events().filter(event => event.en === "free_situation_assessment_click").length, 2); s.checkpoint("same public return restores exactly one view and event");

  s.phase("withdrawal");
  const beforeWithdrawal = s.collects().length;
  await page.evaluate(() => { window.fixture.revoke(); window.fixture.acquire(); window.fixture.lifecycle("hidden"); });
  await settled(page);
  assert.equal(s.collects().length, beforeWithdrawal); s.checkpoint("withdrawal suppresses collection");

  s.phase("regrant-public");
  await page.evaluate(() => { window.fixture.grant(); window.fixture.lifecycle("visible"); window.fixture.acquire(); });
  await waitUntil(() => s.events().filter(event => event.en === "page_view").length >= 3 && s.events().filter(event => event.en === "free_situation_assessment_click").length >= 3, "positive control: regrant resumes public pageview and acquisition");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "page_view").length, 3);
  assert.equal(s.events().filter(event => event.en === "free_situation_assessment_click").length, 3); s.checkpoint("regrant resumes exactly once");
  assertSafe(s.own);
  await s.context.close();

  for (const transition of ["private", "withdrawal"]) {
    const q = await scenario(`queued-grant-then-${transition}`, { holdSdk: true });
    q.phase("grant-while-sdk-delayed");
    await q.page.evaluate(() => { window.fixture.grant(); document.getElementById("holistic-house-google-tag").addEventListener("load", () => { window.fixtureSdkLoaded = true; }); });
    await waitUntil(() => q.own.some(entry => entry.action === "local-frozen-sdk"), "SDK request is held before execution");
    assert.equal(q.collects().length, 0);
    q.phase(`change-${transition}-before-sdk-execution`);
    await q.page.evaluate(transition => {
      if (transition === "private") { window.fixture.navigateOnly("/en/app/SYNTHETIC_PRIVATE_QUEUED?token=SYNTHETIC_PRIVATE_QUERY"); document.title = "SYNTHETIC_PRIVATE_TITLE"; }
      else window.fixture.revoke();
    }, transition);
    q.releaseSdk();
    await q.page.waitForFunction(() => window.fixtureSdkLoaded === true);
    await settled(q.page);
    await q.page.evaluate(() => window.fixture.lifecycle("hidden"));
    await settled(q.page);
    assert.equal(q.collects().length, 0);
    assertSafe(q.own); q.checkpoint("queued initial commands are blocked after state changes before SDK execution");
    await q.context.close();
  }

  const foreign = await scenario("foreign-gtag");
  await foreign.page.evaluate(() => { window.foreignCalls = []; window.gtag = (...args) => window.foreignCalls.push(args); window.fixture.grant(); window.fixture.acquire(); });
  await settled(foreign.page);
  assert.equal(foreign.collects().length, 0);
  assert.equal(foreign.own.filter(entry => entry.action === "local-frozen-sdk").length, 0);
  assert.ok(await foreign.page.evaluate(() => window.foreignCalls.every(args => args[0] === "consent")));
  foreign.checkpoint("unknown global cannot masquerade as initialized destination");
  await foreign.context.close();
  assertSafe(requests);
  assert.equal(errors.length, 0, JSON.stringify(errors));
} catch (error) {
  results.push({ passed: false, error: error.stack }); process.exitCode = 1;
} finally {
  await Promise.all(contexts.map(context => context.close().catch(() => {})));
  // All browser state is freshly synthetic. Cookies themselves are never saved.
  const evidence = { testedAt: new Date().toISOString(), testedCommit: process.env.GITHUB_SHA || "local-unpublished", browserVersion: browser.version(), googleScriptSha256: createHash("sha256").update(sdk).digest("hex"), everyPageRequestFulfilledOrAbortedBeforeSend: true, deadProxyDefense: "127.0.0.1:9", transmittedAnalyticsRequests: 0, results, errors, requests, decodedEvents: decodedEvents() };
  writeFileSync(new URL("full-sdk-intercept-results.json", output), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify({ results, errors, requestCount: requests.length, collectionCount: collection().length }, null, 2));
  await browser.close();
}

