import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("legacy English Reiki Yggdrasil videos from PsiTrends are restored", async () => {
  const source = await readFile("data/academy/yggdrasil-legacy-english-videos.ts", "utf8");
  for (const id of [
    "XvMdX5czoOc",
    "hjmVJrgEsZ8",
    "u275Zz78vhs",
    "wN_SNwZ1Epo",
    "3Apc8P1Yudc",
    "3msoUyWr6bY",
    "0G_xvbuClII",
    "Hk9XpeUI0BQ",
    "p29qu8-dtZk",
    "Nx8DwWk27VY",
  ]) {
    assert.match(source, new RegExp(id.replace("-", "\\-")));
  }
  assert.match(source, /https:\/\/psitrends\.com\/studies\/master-taory/);
});

test("English attunement videos are mapped to corresponding Reiki Yggdrasil steps", async () => {
  const source = await readFile("data/academy/yggdrasil-legacy-english-videos.ts", "utf8");
  assert.match(source, /"RY-L01-S01"[\s\S]*p29qu8-dtZk/);
  assert.match(source, /"RY-L02-S01"[\s\S]*0G_xvbuClII/);
  assert.match(source, /"RY-L02-S02"[\s\S]*3msoUyWr6bY/);
  assert.match(source, /"RY-L02-S03"[\s\S]*Nx8DwWk27VY/);
});

test("English course pages visibly label Russian archive videos", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /RU · Русский/);
  assert.match(component, /Russian archive videos/);
  assert.match(component, /These source lectures are in Russian/);
  assert.match(component, /yggdrasilEnglishStepVideos/);
  assert.match(component, /yggdrasil-video-language-group--secondary/);
});

test("English overview video guide is surfaced on program, Basic and Instructor landings", async () => {
  const [guide, hub, module] = await Promise.all([
    readFile("components/yggdrasil-english-video-guide.tsx", "utf8"),
    readFile("components/yggdrasil-program-landing.tsx", "utf8"),
    readFile("components/yggdrasil-module-landing.tsx", "utf8"),
  ]);
  assert.match(guide, /Reiki Yggdrasil explained in English/);
  assert.match(hub, /YggdrasilEnglishVideoGuide locale=\{locale\}/);
  assert.match(module, /module\.levelId <= 2 \? <YggdrasilEnglishVideoGuide/);
});
