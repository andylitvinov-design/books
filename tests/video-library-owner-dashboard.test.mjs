import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../app/admin/video-library/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/admin/video-library/video-library.module.css",import.meta.url),"utf8");

test("private coverage dashboard requires an authorized owner before reading report",()=>{
 assert.match(page,/requireAdminRequest/);
 assert.match(page,/if\(!await requireAdminRequest\(\)\)redirect\("\/admin\/login"\)/);
 assert.match(page,/auditVideoSiteCoverage\(\{aspect\}\)/);
 assert.match(page,/export const dynamic="force-dynamic"/);
 assert.match(page,/robots:\{index:false,follow:false\}/);
 assert.doesNotMatch(page,/service_role|r2\.dev|NEXT_PUBLIC_|localStorage|trackingId|autoplay/i);
});
test("dashboard displays source distinctions, topic gaps and site placements in three locales",()=>{
 for(const key of ["ru:","en:","es:"])assert.ok(page.includes(key));
 for(const key of ["report.inventory.localLicensedCatalogRows",
  "report.inventory.proceduralAnimationCatalogRows",
  "count.mytubeTopicsWithFourTaggedOptions",
  "report.categories.map","report.sourcingQueue","report.sites.map",
  "slots.rows.filter","slotStatus","SITE_VIDEO_SLOTS"])
  assert.ok(page.includes(key),key);
 assert.match(page,/studioShots|480 individual Studio story beats/);
 assert.match(page,/\/api\/admin\/video-library\/coverage/);
});
test("mobile owner dashboard preserves clear controls and warm neutral tokens",()=>{
 assert.match(css,/var\(--hh-light-canvas,#fbf5e9\)/);
 assert.match(css,/var\(--hh-light-surface,#fffcf7\)/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/position:fixed|100vw|display:none/);
});
