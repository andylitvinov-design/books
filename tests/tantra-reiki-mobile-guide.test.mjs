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

test("Tantra Reiki keeps the same working PDF route in both upper and lower capture", () => {
  const page = readFileSync("components/academy-record-page.tsx", "utf8");
  const lower = readFileSync("components/tantra-reiki-lead-forms.tsx", "utf8");
  const chooser = readFileSync("components/reiki-choice-capture.tsx", "utf8");
  const style = readFileSync("components/reiki-choice-capture.module.css", "utf8");
  const endpoint = readFileSync("app/api/academy/reiki-guide/route.js", "utf8");
  assert.match(page, /<ReikiChoiceCapture locale=\{locale\} course="tantra" placement="top"/);
  assert.match(page, /<TantraReikiLeadForms locale=\{locale\}/);
  assert.match(lower, /<ReikiChoiceCapture locale=\{locale\} course="tantra"/);
  assert.match(chooser, /const guideUrl = "\/api\/academy\/reiki-guide\?course=" \+ course \+ "&locale=" \+ locale/);
  assert.match(chooser, /const \[selected, setSelected\] = useState<Choice>\(isTop \? "guide" : "express"\)/);
  assert.match(chooser, /data-reiki-capture-placement=\{placement\}/);
  assert.match(chooser, /href=\{guideUrl\}/);
  assert.match(chooser, /course === "tantra" && !download/);
  assert.match(chooser, /download=\{download \? true : undefined\}/);
  assert.match(chooser, /id="reiki-free-consultation"/);
  assert.match(chooser, /\{isTop\s*\?/);
  assert.match(style, /\.topCapture \.choices/);
  assert.match(style, /\.alwaysDownload/);
  assert.match(endpoint, /tantra-reiki-mobile-study-guide-/);
  assert.match(endpoint, /"Content-Type": "application\/pdf"/);
  assert.match(endpoint, /"Content-Disposition": 'attachment/);
  assert.match(endpoint, /"Cache-Control": "no-store/);
});

