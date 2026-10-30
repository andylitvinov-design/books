import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const route=readFileSync(new URL("../app/api/holistic-support/meditation-writer/brief/route.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/[locale]/holistic-support/mandala/page.tsx",import.meta.url),"utf8");
const component=readFileSync(new URL("../components/meditation-writer-preview.tsx",import.meta.url),"utf8");
test("writer preview API is private, session-verified, per-request opt-in and disabled by default",()=>{
  for(const x of ["HH_MEDITATION_WRITER_BRIEF_ENABLED","HH_MEDITATION_WRITER_PRODUCTION_APPROVED",
    "requireSameOrigin","auth.verified()","resourceImageryOptIn!==true",
    "consumeRate(config","PRIVATE_HEADERS","modelUsed:false","generationMode:\"template\"",
    "audioAssetId:null","published:false"])
    assert.ok(route.includes(x),x);
  assert.ok(!route.includes("generateOwnedOllama"));
});
test("preview is hidden without server flag and accurately labelled template-only",()=>{
  assert.ok(page.includes("HH_MEDITATION_WRITER_BRIEF_ENABLED"));
  assert.ok(page.includes("HH_MEDITATION_WRITER_PRODUCTION_APPROVED"));
  assert.ok(component.includes("data.generationMode!==\"template\""));
  assert.ok(component.includes("role=\"alert\""));
  assert.ok(component.includes("resourceImageryOptIn:true"));
});
