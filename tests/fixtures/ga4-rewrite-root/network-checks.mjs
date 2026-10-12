import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const isFallback = entry => { const url = new URL(entry.url); return url.origin === "https://www.google.com" && url.pathname === "/g/collect"; };
export function assertFallbackPairs(entries) {
  const used = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!isFallback(entry)) continue;
    const retry = new URL(entry.url);
    assert.equal(retry.searchParams.getAll("gaf").length, 1, "exactly one fallback marker");
    assert.equal(retry.searchParams.get("gaf"), "1", "only the observed one-step fallback is recognized");
    // URLSearchParams.delete reserializes %20 as +. Preserve original encoding
    // so payload equality remains byte-for-byte after removing this one marker.
    const originalQuery = retry.search.slice(1).split("&").filter(parameter => parameter !== "gaf=1").join("&");
    const primary = entries.slice(0, index).find(candidate => {
      const url = new URL(candidate.url);
      return !used.has(candidate) && url.origin === "https://www.google-analytics.com"
        && url.pathname === retry.pathname && url.search.slice(1) === originalQuery
        && candidate.body === entry.body && candidate.method === entry.method
        && candidate.scenario === entry.scenario && candidate.phase === entry.phase;
    });
    assert.ok(primary, "fallback must match exactly one earlier primary request, never a new event");
    used.add(primary);
  }
}

export const sensitiveSentinels = ['synthetic_private_email@example.invalid', '+12025550100', '12025550100', 'SYNTHETIC_PRIVATE_NAME', 'SYNTHETIC_PRIVATE_ANSWER'];
export function assertNoSensitiveFields(entry) {
 const serialized = JSON.stringify(entry);
 assert.doesNotMatch(serialized, /SYNTHETIC_PRIVATE|SYNTHETIC_QUERY|SYNTHETIC_FRAGMENT|12025550100/i);
 for (const value of sensitiveSentinels) for (const normalized of [value, value.toLowerCase()]) {
  assert.ok(!serialized.includes(createHash('sha256').update(normalized).digest('hex')), 'synthetic sensitive SHA256 must not be transmitted');
 }
 const params = [new URL(entry.url).searchParams, ...String(entry.body || '').split('\n').map(line => new URLSearchParams(line))];
 for (const query of params) for (const key of query.keys()) assert.doesNotMatch(key, /^(?:uid|user_id|user_data|em|ph|ep\.user_data|ep\.user_id)(?:$|\[|\.)/, 'no user identification fields');
}

// Fetch.requestPaused omits some browser-generated headers. Do not equate
// intercepted Fetch headers with complete request metadata without ExtraInfo.
export function assertCdpHeaderCoverage(entries) {
 assert.ok(entries.length > 0, 'header coverage requires positive intercepted traffic');
 for (const entry of entries) {
  assert.ok(entry.networkId, 'every third-party attempt needs a correlatable Network request ID');
  assert.equal(entry.extraInfoReceived, true, 'missing Network.requestWillBeSentExtraInfo: full-header privacy proof is incomplete');
  assertNoSensitiveFields(entry);
 }
}
