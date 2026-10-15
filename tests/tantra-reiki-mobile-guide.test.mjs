import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildReikiCourseGuidePdf } from "../lib/academy/reiki-guide-pdf.js";

for (const locale of ["en", "ru", "es"]) {
  test("Tantra Reiki mobile PDF contains nine levels with readable portrait pages (" + locale + ")", () => {
    const source = readFileSync("public/academy/course-guides/tantra." + locale + ".txt", "utf8");
    const pdf = buildReikiCourseGuidePdf({ course: "tantra", locale, source });
    const raw = pdf.toString("latin1");
    const pages = raw.match(/\/Type \/Page \/Parent/g) ?? [];
    assert.ok(raw.startsWith("%PDF-1.7"));
    assert.ok(raw.includes("/MediaBox [0 0 390 694]"));
    assert.ok(pages.length >= 12, "cover, roadmap, nine levels and CTA");
    assert.ok(pages.length <= 30, "large-print bilingual chapters may span multiple phone pages: " + pages.length);
    assert.ok(pdf.length > 25000 && pdf.length < 3000000);
    assert.ok(!raw.includes("/MediaBox [0 0 595.28 841.89]"));
  });
}

test("Reiki Yggdrasil retains the existing A4 layout", () => {
  const source = readFileSync("public/academy/course-guides/yggdrasil.en.txt", "utf8");
  const pdf = buildReikiCourseGuidePdf({ course: "yggdrasil", locale: "en", source });
  assert.ok(pdf.toString("latin1").includes("/MediaBox [0 0 595.28 841.89]"));
});

test("Kundalini Reiki remains the user's unmodified original, not a generated PDF", () => {
  assert.throws(() => buildReikiCourseGuidePdf({ course: "kundalini", locale: "en", source: "" }), /original Paul Crick PDF/);
});
