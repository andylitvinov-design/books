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
const fixture = `<!doctype html><html><head><title>Public synthetic fixture</title></head><body><h1>Offline-intercepted analytics fixture</h1>
<form id="synthetic-form"><input name="email" type="email" value="synthetic_private_email@example.invalid"><input name="phone" type="tel" value="+12025550100"><input name="name" value="SYNTHETIC_PRIVATE_NAME"><textarea name="answer">SYNTHETIC_PRIVATE_ANSWER</textarea><button>Submit synthetic form</button></form><script>
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
 document.getElementById('synthetic-form').addEventListener('submit',event=>event.preventDefault());
 function render(){cleanup?.(); pathname=location.pathname; cursor=0;effects=[];analytics.Ga4Analytics({nonce:'fixture'});cleanup=effects[0]?.();}
 function syncConsent(){effects=[];consent.AnalyticsConsent();effects[0]?.();}
 let fixtureVisibility='visible';
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>fixtureVisibility});
 document.documentElement.dataset.analyticsConsent='denied';
 window.fixture={documentId:crypto.randomUUID(),render,syncConsent,
  grant(){document.cookie='holistic_house_analytics_consent=granted; Path=/; Secure';consent.applyConsentForFixture('granted');},
  revoke(){document.cookie='holistic_house_analytics_consent=denied; Path=/; Secure';consent.applyConsentForFixture('denied');},
  navigateOnly(url){history.pushState({},'',url);},
  navigate(url){history.pushState({},'',url);render();syncConsent();},
  acquire(){events.emitPublicAnalyticsEvent('free_situation_assessment_click');},
  formInteractions(){const form=document.getElementById('synthetic-form');for(const field of form.querySelectorAll('input,textarea')){field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));field.dispatchEvent(new Event('blur',{bubbles:true}));}form.requestSubmit();},
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
const requests = [], errors = [], results = [], contexts = [], cookieChecks = [];
// Google currently retries a failed GA transport on this exact fallback URL.
// It is not a blanket allowance for google.com traffic: each retry must match
// an earlier primary request byte-for-byte, apart from the host and gaf=1.
const isFallback = entry => {
  const url = new URL(entry.url);
  return url.origin === "https://www.google.com" && url.pathname === "/g/collect";
};
const collection = (entries = requests) => entries.filter(entry => /(?:^|\.)google-analytics\.com$|^analytics\.google\.com$/.test(new URL(entry.url).hostname) || isFallback(entry));
function assertFallbackPairs(entries) {
  const used = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!isFallback(entry)) continue;
    const retry = new URL(entry.url);
    assert.equal(retry.searchParams.get("gaf"), "1", "only the observed one-step fallback is recognized");
    retry.searchParams.delete("gaf");
    const primary = entries.slice(0, index).find(candidate => {
      const url = new URL(candidate.url);
      return !used.has(candidate) && url.origin === "https://www.google-analytics.com"
        && url.pathname === retry.pathname && url.search === retry.search
        && candidate.body === entry.body && candidate.method === entry.method
        && candidate.scenario === entry.scenario && candidate.phase === entry.phase;
    });
    assert.ok(primary, "fallback must match exactly one earlier primary request, never a new event");
    used.add(primary);
  }
}
function decodedEvents(entries = requests, includeRetries = false) {
  return collection(entries).filter(entry => includeRetries || !isFallback(entry)).flatMap(entry => {
    if (!new URL(entry.url).pathname.endsWith("/g/collect")) return [];
    const common = Object.fromEntries(new URL(entry.url).searchParams);
    return (entry.body ? entry.body.split("\n") : [""]).map(line => ({ scenario: entry.scenario, phase: entry.phase, ...common, ...Object.fromEntries(new URLSearchParams(line)) }));
  });
}
const sentinel = /SYNTHETIC_QUERY|SYNTHETIC_FRAGMENT|SYNTHETIC_PRIVATE|SYNTHETIC_RETURN_QUERY|12025550100/i;
const syntheticPersonalValues = ["synthetic_private_email@example.invalid", "+12025550100", "12025550100", "synthetic_private_name", "synthetic_private_answer"];
const syntheticPersonalHashes = syntheticPersonalValues.map(value => createHash("sha256").update(value).digest("hex"));
function assertNoPersonalData(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, sentinel, "no synthetic personal values in outbound payload or headers");
  for (const hash of syntheticPersonalHashes) assert.ok(!serialized.includes(hash), "no hashed synthetic personal values");
}
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
    const headers = await request.allHeaders();
    // Assert before redaction: omitted security headers are not a valid test.
    if (!(url.hostname === "holistichouse.vercel.app" && request.isNavigationRequest())) {
      assertNoPersonalData(headers);
    }
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
      if (request.failure()) { entry.action = "sdk-cancelled-by-document-reset"; return; }
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
async function resetAction(s, action) {
  const documentId = await s.page.evaluate(() => window.fixture.documentId);
  const navigation = s.page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await s.page.evaluate(action);
  await navigation;
  assert.notEqual(await s.page.evaluate(() => window.fixture.documentId), documentId, "fresh document clears the SDK lifecycle");
}
async function inspectCookies(s, label, expectedPresent) {
  const all = await s.context.cookies();
  const ga = all.filter(cookie => cookie.name === "_ga" || cookie.name.startsWith("_ga_"));
  cookieChecks.push({ scenario: label, count: ga.length, cookies: ga.map(({ name, domain, path }) => ({ name, domain, path })) });
  assert.equal(ga.length > 0, expectedPresent, label);
  return all;
}
function assertSafe(entries) {
  assertFallbackPairs(entries);
  const outbound = entries.filter(entry => entry.action !== "local-fixture");
  assertNoPersonalData(outbound);
  assert.equal(outbound.filter(entry => entry.action === "aborted-no-network").length, 0, "unknown destinations must be investigated");
  for (const event of decodedEvents(entries, true)) {
    assert.equal(event.tid, id);
    assert.equal(event.dl, "https://holistichouse.vercel.app/en");
    assert.ok(!event.dr);
    assert.equal(event.dt, "Holistic House");
    assert.ok(["page_view", "free_situation_assessment_click"].includes(event.en), "only intended manual synthetic events");
    for (const key of Object.keys(event)) assert.ok(!/^(?:user_data|user_id|uid|em|ph|phone_number|email|sha256_email_address|sha256_phone_number)$/.test(key), "no user-identifying event parameters");
  }
}

try {
  const s = await scenario("consent-and-spa");
  const { page } = s;
  await settled(page, 800);
  assert.equal(s.own.filter(entry => entry.action === "local-frozen-sdk").length, 0);
  assert.equal(s.collects().length, 0); s.checkpoint("no script or collection without consent");
  await inspectCookies(s, "initial-denied", false);
  await s.context.addCookies([{ name: "hh_synthetic_auth_guard", value: "synthetic-preserve", url: "https://holistichouse.vercel.app" }]);

  s.phase("public-grant");
  await page.evaluate(() => window.fixture.grant());
  await waitUntil(() => s.events().some(event => event.en === "page_view"), "positive control: full SDK public pageview");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "page_view").length, 1); s.checkpoint("exactly one initial manual pageview");
  await inspectCookies(s, "public-granted", true);
  // Exercise both legacy domain and host-only cookie cleanup, never real cookies.
  await s.context.addCookies([
    { name: "_ga_legacy_host", value: "synthetic-host", url: "https://holistichouse.vercel.app" },
    { name: "_ga_legacy_domain", value: "synthetic-domain", domain: ".holistichouse.vercel.app", path: "/", secure: true },
  ]);

  s.phase("public-acquisition");
  await page.evaluate(() => { window.fixture.formInteractions(); window.fixture.acquire(); });
  await waitUntil(() => s.events().some(event => event.en === "free_situation_assessment_click"), "positive control: acquisition event");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "free_situation_assessment_click").length, 1); s.checkpoint("secondary public event arrives without synthetic form values or hashes");

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
  await resetAction(s, () => { window.fixture.render(); window.fixture.syncConsent(); });
  await page.evaluate(() => { window.fixture.lifecycle("visible"); window.fixture.lifecycle("hidden"); });
  await settled(page);
  assert.equal(s.collects().length, beforePrivate); s.checkpoint("private consent synchronization creates no collection");
  const privateCookies = await inspectCookies(s, "private-after-reset", false);
  assert.ok(privateCookies.some(cookie => cookie.name === "hh_synthetic_auth_guard"), "unrelated/auth cookie preserved");

  s.phase("return-same-public");
  await page.evaluate(() => { window.fixture.navigate("/en?private_query=SYNTHETIC_RETURN_QUERY"); window.fixture.lifecycle("visible"); window.fixture.acquire(); });
  await waitUntil(() => s.events().filter(event => event.en === "page_view").length >= 2 && s.events().filter(event => event.en === "free_situation_assessment_click").length >= 2, "positive control: return public view and acquisition");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "page_view").length, 2);
  assert.equal(s.events().filter(event => event.en === "free_situation_assessment_click").length, 2); s.checkpoint("same public return restores exactly one view and event");
  const returnView = s.events().filter(event => event.en === "page_view").at(-1);
  assert.ok(Number(returnView._et || 0) < 5000, "65 seconds of private dwell must not appear as public engagement");

  s.phase("withdrawal");
  const beforeWithdrawal = s.collects().length;
  await resetAction(s, () => { window.fixture.revoke(); });
  await page.evaluate(() => { window.fixture.acquire(); window.fixture.lifecycle("hidden"); });
  await settled(page);
  assert.equal(s.collects().length, beforeWithdrawal); s.checkpoint("withdrawal suppresses collection");
  const deniedCookies = await inspectCookies(s, "withdrawal-after-reset", false);
  assert.ok(deniedCookies.some(cookie => cookie.name === "hh_synthetic_auth_guard"));

  s.phase("regrant-public");
  await page.evaluate(() => { window.fixture.grant(); window.fixture.lifecycle("visible"); window.fixture.acquire(); });
  await waitUntil(() => s.events().filter(event => event.en === "page_view").length >= 3 && s.events().filter(event => event.en === "free_situation_assessment_click").length >= 3, "positive control: regrant resumes public pageview and acquisition");
  await settled(page);
  assert.equal(s.events().filter(event => event.en === "page_view").length, 3);
  assert.equal(s.events().filter(event => event.en === "free_situation_assessment_click").length, 3); s.checkpoint("regrant resumes exactly once");
  assert.ok(Number(s.events().filter(event => event.en === "page_view").at(-1)._et || 0) < 5000);
  await inspectCookies(s, "regrant-public", true);
  assertSafe(s.own);
  await s.context.close();

  for (const transition of ["private", "withdrawal"]) {
    const q = await scenario(`queued-grant-then-${transition}`, { holdSdk: true });
    q.phase("grant-while-sdk-delayed");
    await q.page.evaluate(() => { window.fixture.grant(); document.getElementById("holistic-house-google-tag").addEventListener("load", () => { window.fixtureSdkLoaded = true; }); });
    await waitUntil(() => q.own.some(entry => entry.action === "local-frozen-sdk"), "SDK request is held before execution");
    assert.equal(q.collects().length, 0);
    q.phase(`change-${transition}-before-sdk-execution`);
    if (transition === "private") {
      await q.page.evaluate(() => { window.fixture.navigateOnly("/en/app/SYNTHETIC_PRIVATE_QUEUED?token=SYNTHETIC_PRIVATE_QUERY"); document.title = "SYNTHETIC_PRIVATE_TITLE"; });
    } else {
      await resetAction(q, () => window.fixture.revoke());
    }
    q.releaseSdk();
    if (transition === "private") await q.page.waitForFunction(() => window.fixtureSdkLoaded === true);
    await settled(q.page);
    await q.page.evaluate(() => window.fixture.lifecycle("hidden"));
    await settled(q.page);
    assert.equal(q.collects().length, 0);
    assertSafe(q.own); q.checkpoint("queued initial commands are blocked after state changes before SDK execution");
    if (transition === "private") {
      await resetAction(q, () => { window.fixture.render(); window.fixture.syncConsent(); });
    }
    await inspectCookies(q, `queued-${transition}-blocked`, false);
    q.phase("positive-resume-after-queued-block");
    await q.page.evaluate(() => { window.fixture.navigate("/en"); window.fixture.grant(); window.fixture.acquire(); });
    await waitUntil(() => q.events().some(event => event.en === "page_view") && q.events().some(event => event.en === "free_situation_assessment_click"), "blocked delayed-SDK flow must recover with a fresh SDK");
    await settled(q.page);
    assert.equal(q.events().filter(event => event.en === "page_view").length, 1);
    assert.equal(q.events().filter(event => event.en === "free_situation_assessment_click").length, 1);
    assertSafe(q.own); q.checkpoint("delayed-SDK negative control has a positive resumed flow");
    await q.context.close();
  }

  for (const transition of ["private", "withdrawal"]) {
    const q = await scenario(`loaded-sdk-pending-public-batch-then-${transition}`);
    q.phase("positive-loaded-sdk");
    await q.page.evaluate(() => window.fixture.grant());
    await waitUntil(() => q.events().some(event => event.en === "page_view"), "loaded SDK positive control");
    await settled(q.page);
    q.phase("queue-consented-public-event-then-change-state");
    if (transition === "private") {
      await q.page.evaluate(() => {
        window.fixture.acquire(); // Explicitly consented public event before URL change.
        window.fixture.navigateOnly("/en/app/SYNTHETIC_PRIVATE_BATCH?token=SYNTHETIC_PRIVATE_QUERY");
        document.title = "SYNTHETIC_PRIVATE_TITLE";
        window.fixture.acquire(); // Must be dropped after the URL change.
        window.fixture.lifecycle("hidden");
      });
    } else {
      await resetAction(q, () => { window.fixture.acquire(); window.fixture.revoke(); });
      await q.page.evaluate(() => window.fixture.acquire());
    }
    await settled(q.page);
    const previouslyConsentedPublicEvents = q.events().filter(event => event.en === "free_situation_assessment_click").length;
    assert.ok(previouslyConsentedPublicEvents <= 1, "no extra private/off event; at most the earlier consented public event may drain");
    assertSafe(q.own);
    results.push({ scenario: `loaded-sdk-pending-public-batch-then-${transition}`, checkpoint: "previously consented public batch distinguished from prohibited private/off events", passed: true, previouslyConsentedPublicEvents });
    if (transition === "private") await resetAction(q, () => { window.fixture.render(); window.fixture.syncConsent(); });
    await inspectCookies(q, `loaded-batch-${transition}-after-reset`, false);
    q.phase("positive-resume-after-pending-batch");
    await q.page.evaluate(() => { window.fixture.navigate("/en"); window.fixture.grant(); window.fixture.acquire(); });
    await waitUntil(() => q.events().filter(event => event.en === "page_view").length >= 2 && q.events().filter(event => event.en === "free_situation_assessment_click").length >= previouslyConsentedPublicEvents + 1, "pending-batch flow resumes after document reset");
    await settled(q.page);
    assert.equal(q.events().filter(event => event.en === "page_view").length, 2);
    assert.equal(q.events().filter(event => event.en === "free_situation_assessment_click").length, previouslyConsentedPublicEvents + 1);
    assert.ok(Number(q.events().filter(event => event.en === "page_view").at(-1)._et || 0) < 5000);
    assertSafe(q.own); q.checkpoint("pending-batch boundary has a positive resumed flow");
    await q.context.close();
  }

  const foreign = await scenario("foreign-gtag");
  await foreign.page.evaluate(id => {
    window.foreignCalls = []; window.dataLayer = [];
    window.gtag = function () { window.foreignCalls.push(Array.from(arguments)); window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date()); window.gtag("config", id, { send_page_view: false });
    const script = document.createElement("script"); script.async = true; script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    script.onload = () => { window.foreignSdkLoaded = true; }; document.head.appendChild(script);
  }, id);
  await foreign.page.waitForFunction(() => window.foreignSdkLoaded === true);
  const foreignBootstrapCommands = await foreign.page.evaluate(() => window.foreignCalls.length);
  await foreign.page.evaluate(() => { window.fixture.grant(); window.fixture.acquire(); window.fixture.navigate("/en/app/SYNTHETIC_PRIVATE_FOREIGN"); window.fixture.grant(); });
  await settled(foreign.page);
  assert.equal(foreign.collects().length, 0);
  assert.equal(await foreign.page.evaluate(() => window.foreignCalls.length), foreignBootstrapCommands, "app sends no consent or event commands to a foreign real SDK");
  assert.equal(await foreign.page.evaluate(id => window["ga-disable-" + id], id), true);
  await inspectCookies(foreign, "foreign-tag-stays-disabled", false);
  foreign.checkpoint("unknown global cannot masquerade as initialized destination");
  await foreign.context.close();
  assertSafe(requests);
  assert.equal(errors.length, 0, JSON.stringify(errors));
} catch (error) {
  results.push({ passed: false, error: error.stack }); process.exitCode = 1;
} finally {
  await Promise.all(contexts.map(context => context.close().catch(() => {})));
  // All browser state is freshly synthetic. Cookies themselves are never saved.
  const evidence = { testedAt: new Date().toISOString(), testedCommit: process.env.GITHUB_SHA || "local-unpublished", browserVersion: browser.version(), googleScriptSha256: createHash("sha256").update(sdk).digest("hex"), everyPageRequestFulfilledOrAbortedBeforeSend: true, deadProxyDefense: "127.0.0.1:9", transmittedAnalyticsRequests: 0, results, errors, cookieChecks, requests, decodedEvents: decodedEvents(), decodedTransportAttempts: decodedEvents(requests, true), fallbackRequestCount: requests.filter(isFallback).length };
  writeFileSync(new URL("full-sdk-intercept-results.json", output), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify({ results, errors, requestCount: requests.length, collectionCount: collection().length }, null, 2));
  await browser.close();
}

