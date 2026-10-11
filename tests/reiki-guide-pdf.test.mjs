import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildReikiCourseGuidePdf } from "../lib/academy/reiki-guide-pdf.js";
import { getReikiLevelPrice, formatReikiLevelPrice } from "../lib/academy/reiki-level-pricing.js";

test("confirmed prices are recorded for one personal initiation level, not an invented full-course fee", () => {
  assert.deepEqual(getReikiLevelPrice("tantra"), { amountEur: 50, durationMinutes: 30 });
  assert.deepEqual(getReikiLevelPrice("yggdrasil"), { amountEur: 100, durationMinutes: 60 });
  assert.equal(formatReikiLevelPrice("tantra", "en"), "€50 / 30 min / level");
  assert.equal(formatReikiLevelPrice("yggdrasil", "ru"), "€100 / 60 мин / ступень");
  assert.equal(formatReikiLevelPrice("tantra", "es"), "€50 / 30 min / nivel");
});

test("Reiki PDF endpoint validates all six localized course selections", async () => {
  const [route, chooser] = await Promise.all([
    readFile("app/api/academy/reiki-guide/route.js", "utf8"),
    readFile("components/reiki-choice-capture.tsx", "utf8"),
  ]);
  assert.match(route, /new Uint8Array\(buffer\)/);
  assert.match(route, /"Content-Type": "application\/pdf"/);
  assert.match(route, /"Content-Disposition": 'attachment/);
  assert.match(route, /Object\.hasOwn\(coursePaths, course\)/);
  assert.match(route, /locales\.has\(locale\)/);
  assert.match(route, /buildReikiCourseGuidePdf/);
  assert.match(chooser, /Download study material and prices/);
  assert.match(chooser, /Request free express Level 1 initiation/);
  assert.match(chooser, /Request full personal Level 1 initiation/);
  assert.match(chooser, /WhatsAppMark/);
  assert.match(chooser, /option: t\.common\.options\[selected\]/);
  assert.match(chooser, /\/api\/academy\/reiki-guide\?course=/);
  assert.doesNotMatch(chooser, /course-guides.*\.txt"/);
});

for (const course of ["tantra", "yggdrasil"]) {
  for (const locale of ["en", "ru", "es"]) {
    test("Reiki "+course+" "+locale+" PDF is a real Unicode PDF with pricing details", async () => {
      const source = await readFile("public/academy/course-guides/"+course+"."+locale+".txt", "utf8");
      assert.ok(source.length > 1100);
      const pdf = buildReikiCourseGuidePdf({course,locale,source});
      assert.ok(Buffer.isBuffer(pdf));
      assert.ok(pdf.length > 20000, "Expected an embedded font and real document");
      assert.equal(pdf.subarray(0,8).toString("latin1"), "%PDF-1.7");
      assert.ok(pdf.toString("latin1").includes("/ToUnicode"));
      assert.ok(pdf.toString("latin1").includes("/FontFile2"));
      assert.ok(pdf.toString("latin1").includes("%%EOF"));
      assert.match(pdf.toString("latin1"), /\/Count [1-9][0-9]* >>/);
      assert.ok(pdf.toString("latin1").includes("/Type /Page "));
      assert.ok(pdf.toString("latin1").includes("/Info "));
      const rate = getReikiLevelPrice(course);
      assert.ok(pdf.toString("latin1").includes("EUR " + rate.amountEur + " per " + rate.durationMinutes + " minutes per level"));
      assert.match(pdf.toString("latin1"), /0\.115 0\.263 0\.333 rg/); // dark branded cover
      assert.match(pdf.toString("latin1"), /0\.886 0\.954 0\.941 rg/); // highlighted learning sections
      assert.match(pdf.toString("latin1"), /\/Count [2-9][0-9]* >>/); // separate cover + syllabus
    });
  }
}

test("Unknown course and language cannot produce a course PDF", () => {
  for (const [course,locale] of [["unknown","en"],["tantra","de"],["yggdrasil","../../etc"]]) {
    assert.throws(() => buildReikiCourseGuidePdf({course,locale,source:"not an allowed course"}), /Unsupported course or locale/);
  }
});
