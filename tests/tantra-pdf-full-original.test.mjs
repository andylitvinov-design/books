import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildReikiCourseGuidePdf,
  getTantraPdfOriginalMaterials,
} from "../lib/academy/reiki-guide-pdf.js";

const normal = (s) => s.normalize("NFC").replace(/\s+/gu, " ").trim();

function extractPdfUnicodeText(pdf) {
  const raw = pdf.toString("latin1");
  const cmap = raw.slice(raw.indexOf("begincmap"), raw.indexOf("endcmap"));
  assert.ok(cmap.length > 100, "PDF must embed a Unicode character map");
  const map = new Map([...cmap.matchAll(/<([0-9A-F]{4})>\s+<([0-9A-F]{4,8})>/g)]
    .map((match) => [match[1], String.fromCodePoint(parseInt(match[2], 16))]));
  const decoded = [...raw.matchAll(/<([0-9A-F]{4,})> Tj/g)].map((match) => {
    const codes = match[1].match(/.{4}/g) ?? [];
    return codes.map((code) => map.get(code) ?? "?").join("");
  });
  return normal(decoded.join(" "));
}

for (const locale of ["en", "ru", "es"]) {
  test("Tantra PDF retains every original author paragraph and all nine traditional settings (" + locale + ")", async () => {
    const materials = getTantraPdfOriginalMaterials(locale);
    const author = locale === "ru"
      ? JSON.parse(await readFile("data/academy/tantra-reiki-full.generated.json", "utf8")).blocks.ru
      : JSON.parse(await readFile("data/academy/tantra-reiki-ru-en.generated.json", "utf8")).blocks;
    assert.equal(materials.levels.length, 9);
    assert.equal(materials.authorLanguage, locale === "ru" ? "ru" : "en");
    assert.equal(materials.masterProgramme.length, 63);
    assert.ok(materials.masterProgramme.some((b) => b.text.includes("Attunement (attunement of a person")));
    assert.ok(materials.masterProgramme.some((b) => b.text.includes("Unity (deeper energy")));
    assert.ok(materials.masterProgramme.some((b) => b.text.includes("After the Level 9")));

    for (const [i, level] of materials.levels.entries()) {
      assert.equal(level.level, i + 1);
      assert.ok(level.research.length >= 1);
      assert.ok(level.settings.length >= 1);
      for (const paragraph of [...level.research, ...level.settings]) {
        assert.ok(paragraph.length >= 7);
        assert.ok(author.some((block) => block.text === paragraph),
          "Stage " + (i + 1) + " must use exact preserved author source text");
      }
    }
    const source = await readFile("public/academy/course-guides/tantra." + locale + ".txt", "utf8");
    const pdf = buildReikiCourseGuidePdf({ course: "tantra", locale, source });
    const decoded = extractPdfUnicodeText(pdf);
    for (const level of materials.levels) {
      // The PDF breaks paragraphs into mobile-width lines; these source phrases
      // verify the emitted glyph streams, not merely an unused archive import.
      for (const paragraph of [...level.research, ...level.settings]) {
        const opening = normal(paragraph).split(" ").slice(0, 4).join(" ");
        assert.ok(decoded.includes(opening), "Missing full source material: " + locale + " level " + level.level + ": " + opening);
      }
    }
    assert.ok(decoded.includes("HOLISTIC HOUSE"));
    assert.ok(decoded.includes("MASTER TEACHER OF TANTRA REIKI"));
    assert.ok(decoded.includes("TANTRA REIKI TUNINGS"));
    assert.ok((pdf.toString("latin1").match(/\/Type \/Page \/Parent/g) ?? []).length >= 16,
      "Nine stage cards plus complete original materials must paginate without truncation");
  });
}

test("Two historical settings sequences stay explicitly distinct rather than silently relabelled", async () => {
  const en = await readFile("public/academy/course-guides/tantra.en.txt", "utf8");
  assert.match(en, /Level 2[\s\S]*?Attunements: Accumulation of energy; Money Magnet; Burn Away Complexes/);
  assert.match(en, /Level 3[\s\S]*?Attunements: Attunement; Luck · acceleration of time; Talisman/);
  const material = getTantraPdfOriginalMaterials("en");
  assert.ok(material.levels[1].settings.some((line) => line === "Burn Away Complexes"));
  assert.ok(material.levels[2].settings.some((line) => line === "Talisman"));
  const enMaster = material.masterProgramme.map((b) => b.text).join(" ");
  assert.match(enMaster, /LEVEL 2[\s\S]*?Attunement \(attunement of a person/);
  assert.match(enMaster, /LEVEL 3[\s\S]*?Unity \(deeper energy actiavation/);
  const generator = await readFile("lib/academy/reiki-guide-pdf.js", "utf8");
  assert.match(generator, /alternative list|alternative English|two original source variants|different Level 2–3/);
  assert.match(generator, /originalMaterials\.masterProgramme/);
});
