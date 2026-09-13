import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public routes retain the baseline response-header contract", async () => {
  const source = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(source, /poweredByHeader:\s*false/);
  for (const header of [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
  ]) {
    assert.match(source, new RegExp(header));
  }
});
