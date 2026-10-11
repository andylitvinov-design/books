import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("SEO audit command exits nonzero on failures and validates the public keyword/sitemap contract", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-seo.mjs"], { encoding: "utf8", timeout: 20000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS: SEO map, 12 public locale URLs/);
});
