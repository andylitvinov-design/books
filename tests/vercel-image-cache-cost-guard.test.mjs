import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

test("remaining book/media image transforms use a 31-day cache", () => {
  // Vercel charges new transforms on MISS/STALE, not for every srcset candidate.
  // Keep cached, large book images optimized rather than downloading full originals.
  const ttls = [...nextConfig.matchAll(/minimumCacheTTL:\s*(\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(ttls, [2678400]);
  assert.match(nextConfig, /formats:\s*\["image\/webp"\]/);
  assert.doesNotMatch(nextConfig, /images:\s*\{\s*unoptimized:\s*true/);
});
