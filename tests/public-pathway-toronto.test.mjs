import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/[locale]/toronto/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/[locale]/toronto/toronto.module.css", import.meta.url), "utf8");
const parent = readFileSync(new URL("../components/public-pathway-strip.tsx", import.meta.url), "utf8");

test("Toronto reuses one canonical four-sphere public component, not a duplicate selector", () => {
  assert.match(page, /import \{ PublicPathwayStrip \}/);
  assert.equal((page.match(/<PublicPathwayStrip/g) || []).length, 1);
  assert.match(page, /data-public-design-migration="wave2"/);
  for (const direction of ["business", "relationships", "energy_health", "personal_growth"]) {
    assert.ok(parent.includes('id: "' + direction + '"'));
  }
});

test("Toronto preserves its free-review, appointment-request, real portrait and SEO rules", () => {
  assert.match(page, /<FreeReviewQuickRequest locale=\{locale\}/);
  assert.match(page, /<StaticPortrait src="\/images\/holistic-house\/andy-about.png"/);
  assert.match(page, /href="#request"/);
  assert.match(page, /free: "Start with a free written review"/);
  assert.match(page, /a message is a request|message is a request|not an automatic booking/i);
  assert.match(page, /isPublicLocale/);
  assert.match(page, /canonical: path/);
  assert.match(page, /"x-default": "\/en\/toronto"/);
  for (const lang of ["en", "ru", "es"]) assert.match(page, new RegExp("  " + lang + ": \\{"));
});

test("Toronto changes only scoped appearance and keeps mobile controls usable", () => {
  assert.match(css, /\.page \{/);
  assert.match(css, /\.pathway \{/);
  assert.match(css, /background: #087853/);
  assert.match(css, /min-height: 46px/);
  assert.match(css, /@media \(max-width: 580px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
