import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("large Academy CSS and admin video styling are code-split from the public root", () => {
  const root = read("app/layout.tsx");
  const academy = read("app/[locale]/academy/[[...slug]]/page.tsx");
  const admin = read("app/admin/videos/page.tsx");
  for (const file of ["academy.css", "yggdrasil-basic-description.css", "temple-studies.css", "site-video-admin.css"]) {
    assert.ok(!root.includes('import "./' + file + '"'), file + " is still loaded on every page");
  }
  for (const file of ["academy.css", "yggdrasil-basic-description.css", "temple-studies.css"]) {
    assert.ok(academy.includes('import "@/app/' + file + '"'), file + " no longer included on Academy");
  }
  assert.ok(admin.includes('import "@/app/site-video-admin.css"'), "Video management styling missing");
  assert.match(root, /import "\.\/holistic-house-home\.css"/);
  assert.match(root, /import "\.\/ia-v2\.css"/);
});
