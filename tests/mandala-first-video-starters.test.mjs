import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIRST_VIDEO_STARTER_TEMPLATES, resolveFirstVideoStarterTemplate } from "../lib/mandala/first-video-starter-templates.mjs";
import { buildFirstVideoDraft } from "../lib/mandala/first-video-director.mjs";

const locales = ["ru", "en", "es"];

test("six optional starter designs are unique, localized and can be edited", () => {
  assert.equal(FIRST_VIDEO_STARTER_TEMPLATES.length, 6);
  assert.equal(new Set(FIRST_VIDEO_STARTER_TEMPLATES.map(item => item.id)).size, 6);
  assert.equal(resolveFirstVideoStarterTemplate("unknown", "ru"), null);
  assert.equal(resolveFirstVideoStarterTemplate("meditation", "unsupported").label, "Meditation");
  for (const preset of FIRST_VIDEO_STARTER_TEMPLATES) {
    for (const locale of locales) {
      const resolved = resolveFirstVideoStarterTemplate(preset.id, locale);
      assert.ok(resolved);
      assert.ok(resolved.wish.length >= 25 && resolved.wish.length <= 800);
      assert.ok(resolved.label.length >= 3);
      assert.notEqual(resolved.label, "undefined");
      assert.notEqual(resolved.wish, preset.wishes.en === resolved.wish && locale !== "en" ? "" : null);
      assert.ok(["landscape", "portrait", "square"].includes(resolved.preferences.aspect));
      assert.ok([20, 30, 60].includes(resolved.preferences.durationSeconds));
      assert.ok(["slow", "dynamic"].includes(resolved.preferences.motion));
      assert.ok(["none", "harmony", "meditation"].includes(resolved.preferences.music));
    }
  }
});

test("every localized starter design compiles into actual approved local scenes", () => {
  for (const preset of FIRST_VIDEO_STARTER_TEMPLATES) {
    for (const locale of locales) {
      const { wish, preferences } = resolveFirstVideoStarterTemplate(preset.id, locale);
      const draft = buildFirstVideoDraft({ locale, wish, ...preferences });
      assert.equal(draft.theme, preferences.theme, `${preset.id} ${locale}: theme`);
      assert.equal(draft.aspect, preferences.aspect, `${preset.id} ${locale}: aspect`);
      assert.equal(draft.durationSeconds, preferences.durationSeconds);
      assert.equal(draft.plan.shots.reduce((total, shot) => total + shot.durationSeconds, 0),
        preferences.durationSeconds);
      assert.equal(draft.plan.paidRenderApproved, false);
      assert.equal(draft.aiMediaGenerated, false);
      assert.equal(draft.mediaSource, "local_canvas");
      assert.equal(draft.descriptionLimited, false);
      assert.equal(new Set(draft.plan.shots.map(shot => shot.sceneId)).size, draft.plan.shotCount);
      assert.ok(draft.plan.shots.every(shot =>
        draft.plan.sceneChoices.some(choice => choice.sceneId === shot.sceneId)));
    }
  }
});

test("preset click and aspect changes use the existing MediaRecorder path", () => {
  const ui = readFileSync(new URL("../components/mandala-first-video-start.tsx", import.meta.url), "utf8");
  const src = readFileSync(new URL("../components/mandala-free-video-studio.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../components/mandala-first-video-start.module.css", import.meta.url), "utf8");
  const presets = readFileSync(new URL("../lib/mandala/first-video-starter-templates.mjs", import.meta.url), "utf8");
  assert.match(ui, /data-first-video-starter=\{template\.id\}/);
  assert.match(ui, /onClick=\{\(\) => selectStarter\(template\.id\)\}/);
  assert.match(ui, /onWishChange\(selected\.wish\)/);
  assert.match(ui, /apply\(selected\.wish, nextPrefs, "", 0\)/);
  assert.match(ui, /data-first-video-quick-aspect=\{format\}/);
  assert.match(ui, /changePreferences\(\{aspect: format\}\)/);
  assert.match(ui, /aria-pressed=\{prefs\.aspect === format\}/);
  assert.match(css, /\.quickTools\{/);
  assert.match(css, /overflow-x:auto/);
  assert.match(src, /onApply=\{applyFirstVideoDraft\}/);
  assert.match(src, /new MediaRecorder\(/);
  assert.doesNotMatch(presets, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|FormData/);
});
