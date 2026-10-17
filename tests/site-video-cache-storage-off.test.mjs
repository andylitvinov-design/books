import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Regression: Vercel's background unstable_cache revalidation can invoke the
// previous published-video cache key when optional server storage is disabled.
const source = readFileSync(new URL("../lib/site-videos/public.ts", import.meta.url), "utf8");

test("disabled public-video store no longer throws during stale revalidation", () => {
  assert.match(source, /const readStoredPublishedVideos = unstable_cache\(/);
  assert.match(source, /if \(!store\) return \{\};/);
  assert.doesNotMatch(source, /throw new Error\('Public video storage was disabled before cache fill'\)/);
  assert.match(source, /revalidate: 60/);
  assert.match(source, /store\.list\(\{ timeoutMs: 1200 \}\)/);
});

test("storage-off mode keeps only approved published built-ins and avoids per-request warnings", () => {
  assert.match(source, /if \(!getSiteVideoStore\(\)\) \{\s*return approvedBuiltInVideos\(\);\s*\}/);
  assert.match(source, /toPublishedSiteVideo\(record\)/);
  assert.doesNotMatch(source, /console\.warn\('\[site-videos\] Public video storage is not configured\.'\)/);
  assert.doesNotMatch(source, /force-static|public, max-age|s-maxage/);
  assert.match(source, /noStore\(\)/);
});
