// Run only against the isolated, secret-free production build started by CI.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_GA4_PLAYWRIGHT_MODULE || "playwright");
const output = new URL("../artifacts/ga4-safety-hold/", import.meta.url);
mkdirSync(output, { recursive: true });
const origin = "https://holistichouse.vercel.app";
const loopback = "http://127.0.0.1:3218";
const requests = [], snapshots = [], failures = [];
function allJs(path) { return readdirSync(path, { withFileTypes: true }).flatMap(item => item.isDirectory() ? allJs(join(path, item.name)) : item.name.endsWith(".js") ? [join(path, item.name)] : []); }
const bundles = allJs(new URL("../.next/static/", import.meta.url).pathname);
assert.ok(bundles.length > 0, "inspect actual production client bundles");
const bundleChecks = bundles.map(path => {
  const source = readFileSync(path, "utf8");
  // Webpack can retain dormant code behind an imported false constant. Merely
  // finding a URL in JS is not a network attempt. Execute these exact bundles
  // below and require zero tag/queue/network activity under the safety hold.
  return { file: path.split("/.next/")[1], sha256: createHash("sha256").update(source).digest("hex"), dormantLoaderTextPresent: source.includes("www.googletagmanager.com/gtag/js"), holdCopyPresent: source.includes("Analytics is temporarily unavailable") };
});
assert.ok(bundleChecks.some(bundle => bundle.holdCopyPresent), "generated client bundle includes the temporary-hold UI");
const browser = await chromium.launch({ headless: true, proxy: { server: "http://127.0.0.1:9" }, args: ["--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-first-run"] });
const context = await browser.newContext({ serviceWorkers: "block" });
let page;
try {
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    const entry = { method: request.method(), origin: url.origin, pathname: url.pathname, resourceType: request.resourceType() };
    requests.push(entry);
    if (url.origin === origin) {
      // Node fetch targets this fixed local server only; browser traffic is never
      // continued to the real site. No cookies or credentials are forwarded.
      const headers = {};
      for (const key of ["accept", "rsc", "next-router-state-tree", "next-router-prefetch", "next-url"]) { const value = await request.headerValue(key); if (value) headers[key] = value; }
      const response = await fetch(loopback + url.pathname + url.search, { headers, redirect: "manual" });
      const responseHeaders = Object.fromEntries(response.headers); delete responseHeaders["content-length"]; delete responseHeaders["content-encoding"];
      // The fixture server's relative redirects stay inside this intercepted
      // origin. A real deployment or external destination is never contacted.
      if (responseHeaders.location?.startsWith(loopback)) responseHeaders.location = responseHeaders.location.replace(loopback, origin);
      const body = Buffer.from(await response.arrayBuffer());
      if (request.isNavigationRequest()) assert.doesNotMatch(body.toString(), /<script[^>]+src=["'][^"']*googletagmanager/i, "server HTML must not contain a Google script tag");
      entry.action = "local-production-build";
      await route.fulfill({ status: response.status, headers: responseHeaders, body });
    } else { entry.action = "aborted-before-network"; await route.abort("blockedbyclient"); }
  });
  await context.routeWebSocket("**/*", socket => { failures.push("Unexpected WebSocket"); socket.close(); });
  await context.addCookies([{ name: "holistic_house_analytics_consent", value: "granted", domain: "holistichouse.vercel.app", path: "/", secure: true, sameSite: "Lax" }, { name: "synthetic_unrelated_cookie", value: "preserved", domain: "holistichouse.vercel.app", path: "/", secure: true, sameSite: "Lax" }]);
  page = await context.newPage();
  page.on("pageerror", error => failures.push(error.message));
  await page.goto(origin + "/privacy?synthetic=SYNTHETIC_QUERY");
  await page.getByText("Analytics is temporarily unavailable", { exact: false }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Allow analytics", exact: true }).isDisabled(), true);
  async function check(label, expectedPreference = "granted") {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => ({ gtagPresent: typeof window.gtag === "function", queuePresent: window.dataLayer !== undefined, sdkScripts: document.querySelectorAll('script[src*="googletagmanager"],script#holistic-house-google-tag').length, dataset: document.documentElement.dataset.analyticsConsent }));
    const cookies = await context.cookies();
    assert.equal(cookies.find(cookie => cookie.name === "holistic_house_analytics_consent")?.value, expectedPreference, "saved choice changes only after explicit withdrawal");
    assert.equal(cookies.find(cookie => cookie.name === "synthetic_unrelated_cookie")?.value, "preserved");
    assert.equal(state.gtagPresent, false); assert.equal(state.queuePresent, false); assert.equal(state.sdkScripts, 0);
    snapshots.push({ label, ...state, savedPreference: expectedPreference, cookieNames: cookies.map(cookie => cookie.name) });
    assert.equal(requests.filter(request => /(?:google-analytics|googletagmanager|analytics\.google|www\.google\.com)/.test(request.origin)).length, 0, "no Google SDK or collection network attempts");
  }
  await check("saved-granted-initial");
  await page.evaluate(() => {
    document.documentElement.dataset.analyticsConsent = "granted"; // stale DOM must not lift a compile-time hold
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event: "free_situation_assessment_click" } }));
    window.dispatchEvent(new Event("holistic-house:analytics-consent"));
  });
  await check("synthetic-lifecycle-and-acquisition");
  await page.getByRole("button", { name: "Keep analytics off", exact: true }).click();
  await check("explicit-withdrawal", "denied");
  // This is a synthetic navigation to a local fixture response, not production.
  await page.goto(origin + "/en/app/SYNTHETIC_PRIVATE_ROUTE");
  await check("private-document", "denied");
  await page.goto(origin + "/privacy");
  await check("public-return", "denied");
  assert.deepEqual(failures, []);
} catch (error) { failures.push(error.stack); process.exitCode = 1; }
finally {
  await context.close(); await browser.close();
  writeFileSync(new URL("safety-hold-results.json", output), JSON.stringify({ testedCommit: process.env.GITHUB_SHA || "local-unpublished", productionBuild: true, allBrowserRequestsInterceptedBeforeSending: true, transmittedGoogleRequests: 0, bundleChecks, snapshots, failures, requests }, null, 2) + "\n");
  console.log(JSON.stringify({ bundleCount: bundleChecks.length, snapshots, failures }, null, 2));
}
