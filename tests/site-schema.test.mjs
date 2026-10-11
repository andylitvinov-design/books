import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("public shell publishes only a minimal canonical WebSite JSON-LD entity", () => {
  assert.match(layout, /type="application\/ld\+json"/);
  assert.match(layout, /"@context": "https:\/\/schema\.org"/);
  assert.match(layout, /"@type": "WebSite"/);
  assert.match(layout, /url: metadataBaseFor\(\)\.toString\(\)/);
  assert.doesNotMatch(layout, /MedicalOrganization|Physician|healthCondition/);
});
