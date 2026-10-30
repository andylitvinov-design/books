import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildProfessionalPromo, normalizePublicPracticeName, professionalPromoLabels,
  PROFESSIONAL_PROMO_FORMATS, PROFESSIONAL_PROMO_ROLES,
  PROFESSIONAL_PROMO_TOPICS, PROFESSIONAL_PROMO_ACTIONS,
} from "../lib/mandala/professional-promo-director.mjs";

const studio = readFileSync(new URL("../components/mandala-free-video-studio.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/mandala-professional-promo.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/mandala-professional-promo.module.css", import.meta.url), "utf8");

test("all professional formats produce editable local briefs in RU/EN/ES", () => {
  for (const locale of ["ru", "en", "es"]) {
    for (const format of PROFESSIONAL_PROMO_FORMATS) {
      const brief = buildProfessionalPromo({ locale, format, role: "coach", topic: "relationships", displayName: "Anna" });
      assert.equal(brief.mode, "FREE_LOCAL_VISUAL_DRAFT");
      assert.equal(brief.aspect, "portrait");
      assert.equal(brief.durationSeconds, 30);
      assert.equal(brief.format, format);
      assert.equal(brief.beats.length, 4);
      assert.ok(brief.beats.every(beat => beat.label && beat.script));
      assert.ok(brief.voiceScript.includes("Anna"));
      assert.ok(brief.headline.length <= 60);
      assert.ok(brief.presetId);
    }
    const choices = professionalPromoLabels(locale);
    for (const role of PROFESSIONAL_PROMO_ROLES) assert.ok(choices.roles[role]);
    for (const topic of PROFESSIONAL_PROMO_TOPICS) assert.ok(choices.topics[topic]);
    for (const action of PROFESSIONAL_PROMO_ACTIONS) assert.ok(choices.actions[action]);
  }
});

test("all professional ad presets resolve to four DISTINCT existing first-party video clips", () => {
  const match = studio.match(/const FREE_FILM_PRESETS:readonly FreeFilmPreset\[\] = (\[[\s\S]*?\]) as const;/);
  assert.ok(match, "reuse the one existing first-party film catalogue");
  const presets = JSON.parse(match[1]);
  for (const format of PROFESSIONAL_PROMO_FORMATS) {
    const brief = buildProfessionalPromo({format});
    const source = presets.find(preset => preset.id === brief.presetId);
    assert.ok(source, format + " must resolve to a real existing compilation preset");
    assert.equal(source.clips.length, 4, format + " requires four source clips");
    assert.equal(new Set(source.clips).size, 4, format + " must not repeat a clip");
  }
});

test("user-owned public details are sanitized; no arbitrary raw clinical input or diagnosis is required", () => {
  assert.equal(normalizePublicPracticeName(" \n<A>\tDr"), "A Dr");
  assert.ok(normalizePublicPracticeName("a".repeat(100)).length <= 48);
  const fallback = buildProfessionalPromo({ locale: "zzz", role: "invented-title", format: "unknown", topic: "unknown" });
  assert.equal(fallback.locale, "ru");
  assert.equal(fallback.role, "psychologist");
  assert.equal(fallback.format, "introduction");
  assert.equal(fallback.publicName, "");
});

test("scripts avoid treatment guarantees, testimonials and psychological claims", () => {
  for (const locale of ["ru", "en", "es"]) {
    for (const format of PROFESSIONAL_PROMO_FORMATS) {
      const text = buildProfessionalPromo({ locale, format, topic: "stress" }).voiceScript.toLowerCase();
      assert.doesNotMatch(text, /guarantee|guaranteed|testimonial|cure|лечение|гарантир|отзыв клиента|testimonio|curar|garantiz/);
    }
  }
});

test("existing Video Studio and approved three-card accordion are preserved", () => {
  assert.ok(studio.includes("<MandalaProfessionalPromo"));
  assert.ok(studio.includes('applyAutoFilm(presetId,durationSeconds,"portrait")'));
  assert.ok(studio.includes('setPracticeLevels(previous=>({...previous,video:"basic"}))'));
  assert.ok(studio.includes("setAffirmations(previous=>({...previous,enabled:false}))"));
  assert.ok(studio.includes("setBackgroundOnly(true)"));
  assert.ok(studio.includes('onApply={applyAutoFilm}'));
  assert.ok(studio.includes('data-video-practice-accordion'));
  assert.ok(studio.includes('formatPracticeOrder.map(format=>{'));
  assert.ok(!card.includes("fetch("));
  assert.ok(!card.includes("localStorage"));
  assert.ok(!card.includes("sessionStorage"));
  assert.ok(card.includes("data-promo-review"));
  assert.ok(card.includes("!reviewed || !headline.trim() || !script.trim()"));
  assert.ok(card.includes("data-promo-apply"));
  assert.ok(css.includes("@media(max-width:430px)"));
  assert.ok(css.includes("prefers-reduced-motion"));
});
