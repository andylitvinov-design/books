import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  VIDEO_QUICK_TEMPLATES,
  getVideoQuickTemplateDraft,
} from "../lib/mandala/video-quick-templates.mjs";
import { buildFirstVideoDraft } from "../lib/mandala/first-video-director.mjs";

const locales = ["ru", "en", "es"];
const expectedIds = [
  "morning-light", "gentle-pause", "inner-confidence",
  "heart-connection", "quiet-evening", "work-possibilities",
];

test("six unique, complete RU/EN/ES video templates are local and free", () => {
  assert.deepEqual(VIDEO_QUICK_TEMPLATES.map(template => template.id), expectedIds);
  assert.equal(new Set(VIDEO_QUICK_TEMPLATES.map(t => t.id)).size, expectedIds.length);
  assert.ok(Object.isFrozen(VIDEO_QUICK_TEMPLATES));
  for (const template of VIDEO_QUICK_TEMPLATES) {
    for (const locale of locales) {
      assert.ok(template.title[locale].length > 3);
      assert.ok(template.hint[locale].length > 3);
      assert.ok(template.wish[locale].length > 25);
      assert.ok(template.wish[locale].length <= 800);
      const ready = getVideoQuickTemplateDraft(template.id, locale);
      assert.equal(ready.id, template.id);
      assert.equal(ready.wish, template.wish[locale]);
      assert.equal(ready.preferences.avoid, "");
      assert.deepEqual(
        Object.keys(ready.preferences).sort(),
        ["theme", "style", "aspect", "durationSeconds", "motion", "music", "caption", "avoid"].sort(),
      );
      const draft = buildFirstVideoDraft({
        locale, wish: ready.wish, ...ready.preferences,
      });
      assert.equal(draft.aiMediaGenerated, false);
      assert.equal(draft.mediaSource, "local_canvas");
      assert.equal(draft.plan.paidRenderApproved, false);
      assert.equal(draft.plan.localPreview, true);
      assert.equal(draft.theme, ready.preferences.theme);
      assert.equal(draft.aspect, ready.preferences.aspect);
      assert.equal(draft.durationSeconds, ready.preferences.durationSeconds);
      assert.equal(draft.plan.shots.length, ready.preferences.durationSeconds === 60 ? 6 : 4);
      assert.ok(draft.plan.shots.every(shot => shot.sceneId && shot.durationSeconds > 0));
      assert.equal(
        draft.plan.shots.reduce((total, shot) => total + shot.durationSeconds, 0),
        ready.preferences.durationSeconds,
      );
    }
  }
});

test("one-tap presets preserve the user's exclusions and reject unknown templates", () => {
  const exclusions = "Море, волны, темнота";
  const selected = getVideoQuickTemplateDraft("inner-confidence", "ru", exclusions);
  assert.equal(selected.preferences.avoid, exclusions);
  assert.equal(selected.preferences.caption, true);
  assert.equal(selected.preferences.aspect, "portrait");
  assert.equal(getVideoQuickTemplateDraft("not-a-template", "ru"), null);
  assert.equal(getVideoQuickTemplateDraft("gentle-pause", "unknown").wish,
    VIDEO_QUICK_TEMPLATES.find(item => item.id === "gentle-pause").wish.en);
  assert.equal(getVideoQuickTemplateDraft("gentle-pause", "en", "x".repeat(500)).preferences.avoid.length, 140);
});

test("same approved renderer and real export receive the template selection", () => {
  const ui = readFileSync(new URL("../components/mandala-first-video-start.tsx", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../components/mandala-free-video-studio.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../components/mandala-first-video-start.module.css", import.meta.url), "utf8");
  const presets = readFileSync(new URL("../lib/mandala/video-quick-templates.mjs", import.meta.url), "utf8");
  assert.match(ui, /data-first-video-templates/);
  assert.match(ui, /data-first-video-template=\{template\.id\}/);
  assert.match(ui, /aria-pressed=\{selectedTemplateId===template\.id\}/);
  assert.match(ui, /disabled=\{disabled \|\| !hydrated\}/);
  assert.match(ui, /getVideoQuickTemplateDraft\(templateId, locale, prefs\.avoid\)/);
  assert.match(ui, /setMode\("local"\); setPromptOverride\(""\)/);
  assert.match(ui, /onWishChange\(choice\.wish\)/);
  assert.match(ui, /apply\(choice\.wish, nextPrefs, "", 0\)/);
  assert.match(studio, /onApply=\{applyFirstVideoDraft\}/);
  assert.match(studio, /setCinematicPlan\(draft\.plan\)/);
  assert.match(studio, /new MediaRecorder\(/);
  assert.match(css, /\.templateStrip\{display:flex;gap:7px;overflow-x:auto/);
  assert.match(css, /\.templateCard\[aria-pressed="true"\]/);
  assert.doesNotMatch(presets, /\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|localStorage|checkout|xpDebit/);
  assert.ok(ui.indexOf("data-first-video-wish") < ui.indexOf("data-first-video-templates"),
    "user's own goal is still the primary input");
  assert.ok(ui.indexOf("data-first-video-templates") < ui.indexOf("data-first-video-filters"),
    "fast path appears before optional advanced filters");
});
