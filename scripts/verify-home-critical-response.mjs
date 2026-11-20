import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export const HOME_ROUTES = ["/", "/ru", "/es", "/?full=1", "/ru?full=1"];

export function summarizeHomeHtml(html, headers = new Headers()) {
  const stylesheetSources = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)]
    .map(match => match[0].match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "unknown");
  const preloads = [...html.matchAll(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi)]
    .map(match => match[0]);
  const heroPreloadHighPriority = preloads.some(tag =>
    /ideas-pine-reference\.webp/.test(tag) &&
    /\bas=["']image["']/.test(tag) &&
    /\bfetchpriority=["']high["']/i.test(tag));
  return {
    decodedHtmlBytes: Buffer.byteLength(html, "utf8"),
    renderBlockingStylesheets: stylesheetSources.length,
    stylesheetSources,
    inlineStyles: (html.match(/<style\b/gi) ?? []).length,
    heroPreloadHighPriority,
    staticFirstScreen: /\bdata-fast-home=["'](?:en|ru)["']/.test(html),
    cacheControl: headers.get("cache-control"),
    vercelCache: headers.get("x-vercel-cache"),
  };
}

export function checkHomeContract(path, snapshot, { inlineReact = false, requireEdgeHit = false } = {}) {
  const fast = path === "/" || path === "/ru";
  assert.equal(snapshot.heroPreloadHighPriority, true, path + ": early high-priority LCP preload required");
  if (fast) {
    assert.equal(snapshot.staticFirstScreen, true, path + ": preserve live CDN-first page");
    assert.equal(snapshot.renderBlockingStylesheets, 0, path + ": no external render-blocking CSS");
    assert.ok(snapshot.inlineStyles >= 1, path + ": inline the original complete stylesheet");
    assert.ok(!/no-store|private/i.test(snapshot.cacheControl ?? ""), path + ": public HTML must be cacheable");
    if (requireEdgeHit)
      assert.equal(snapshot.vercelCache, "HIT", path + ": repeat request must hit Vercel CDN");
  } else {
    assert.equal(snapshot.staticFirstScreen, false, path + ": keep the original React layout");
    if (inlineReact) {
      assert.equal(snapshot.renderBlockingStylesheets, 0, path + ": Next inlineCss emitted CSS links");
      assert.ok(snapshot.inlineStyles >= 1, path + ": Next must inline compiled CSS");
    }
  }
}

async function main() {
  const base = process.argv[2];
  assert.ok(base, "Usage: node scripts/verify-home-critical-response.mjs <http-origin> [--enforce-inline-react] [--require-edge-hit]");
  const options = {
    inlineReact: process.argv.includes("--enforce-inline-react"),
    requireEdgeHit: process.argv.includes("--require-edge-hit"),
  };
  const origin = new URL(base);
  assert.ok(["http:", "https:"].includes(origin.protocol), "HTTP(S) origin required");
  const results = [];
  for (const route of HOME_ROUTES) {
    const uri = new URL(route, origin);
    const attempts = options.requireEdgeHit && ["/", "/ru"].includes(route) ? 3 : 1;
    let row;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const started = performance.now();
      const response = await fetch(uri, {
        headers: { Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(25000),
      });
      assert.equal(response.status, 200, route + ": HTTP " + response.status);
      row = { path: route, attempt: attempt + 1,
        responseMs: Math.round(performance.now() - started),
        ...summarizeHomeHtml(await response.text(), response.headers) };
    }
    checkHomeContract(route, row, options);
    results.push(row);
  }
  process.stdout.write(JSON.stringify({
    base: origin.origin, checkedAt: new Date().toISOString(),
    note: "responseMs is NOT Lighthouse FCP/LCP/full-load; decodedHtmlBytes is uncompressed.",
    results
  }, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
