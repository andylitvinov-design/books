import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildReikiCourseGuidePdf } from "../lib/academy/reiki-guide-pdf.js";

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
  assert.match(chooser, /Selected option \/ Выбрано/);
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
    });
  }
}

test("Unknown course and language cannot produce a course PDF", () => {
  for (const [course,locale] of [["unknown","en"],["tantra","de"],["yggdrasil","../../etc"]]) {
    assert.throws(() => buildReikiCourseGuidePdf({course,locale,source:"not an allowed course"}), /Unsupported course or locale/);
  }
});
