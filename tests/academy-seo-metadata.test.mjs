import assert from "node:assert/strict";
import test from "node:test";
import { academySeoRouteKeys, seoMetaForAcademyRoute } from "../data/academy/seo-overrides.js";
import { readFileSync } from "node:fs";

test("Reiki and Temple Studies have distinct, genuine EN/RU/ES search metadata", () => {
  assert.deepEqual(academySeoRouteKeys, ["reiki", "reiki/yggdrasil", "reiki/tantra-reiki", "reiki/kundalini-reiki", "temple-studies"]);
  for (const locale of ["en", "ru", "es"]) {
    const titles = new Set();
    for (const routeKey of academySeoRouteKeys) {
      const item = seoMetaForAcademyRoute(locale, routeKey);
      assert.ok(item);
      assert.ok(item.title.length >= 20 && item.title.length <= 90, routeKey);
      assert.ok(item.description.length >= 75 && item.description.length <= 240, routeKey);
      assert.equal(titles.has(item.title), false, "Duplicate title: " + item.title);
      titles.add(item.title);
      assert.doesNotMatch(item.title + " " + item.description, /certified psychotherapist|guaranteed cure|лечит болезни|cura garantizada/i);
    }
  }
  assert.match(seoMetaForAcademyRoute("en", "reiki/tantra-reiki").title, /9-Level/);
  assert.match(seoMetaForAcademyRoute("en", "reiki/yggdrasil").title, /7 Modules/);
  assert.match(seoMetaForAcademyRoute("en", "reiki/kundalini-reiki").title, /3-Level/);
  assert.equal(seoMetaForAcademyRoute("en", "mysteries/egypt"), null);
  assert.equal(seoMetaForAcademyRoute("xx", "temple-studies"), null);
});

test("SEO overrides change metadata only, not the actual Academy curriculum or private routes", () => {
  const page = readFileSync(new URL("../app/[locale]/academy/[[...slug]]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /seoMetaForAcademyRoute\(locale, routeKey\(slug\)\)/);
  assert.match(page, /seoOverride\?\.description \?\? description/);
  assert.match(page, /alternates: \{ canonical: path/);
  assert.match(page, /KundaliniReikiCourse/);
  assert.match(page, /TempleStudies/);
});
