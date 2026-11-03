import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path,"utf8");

test("Basic Course uses a dedicated premium landing without changing other Reiki modules", async () => {
  const [modulePage,style,main,visual,source] = await Promise.all([
    read("components/yggdrasil-module-landing.tsx"),
    read("components/yggdrasil-basic-landing.module.css"),
    read("components/yggdrasil-curriculum.tsx"),
    read("components/yggdrasil-curriculum-visual.module.css"),
    read("data/academy/yggdrasil-curriculum.json"),
  ]);
  const original = JSON.parse(source);
  assert.equal(original.levels[0].steps.length,5);
  assert.equal(original.levels[0].steps.reduce((sum,step)=>sum+step.settings.length,0),23);
  assert.match(modulePage,/const isBasic = module\.slug === "basic-course"/);
  assert.match(modulePage,/isBasic \?[\s\S]*?styles\.hero/);
  assert.match(modulePage,/styles\.roadmapGrid/);
  assert.match(modulePage,/level\.steps\.map\(\(step\)/);
  assert.match(modulePage,/basicLevelIntroductions\[locale\]\[step\.number\]/);
  assert.match(modulePage,/href=\{"#" \+ step\.id\.toLowerCase\(\)\}/);
  assert.match(modulePage,/styles\.endCta/);
  assert.match(modulePage,/baseUrl \+ "\/free-initiation"/);
  assert.match(modulePage,/baseUrl \+ "\/basic-course\/description"/);
  assert.match(modulePage,/YggdrasilEnglishVideoGuide locale=\{locale\} scope="basic"/);
  assert.match(modulePage,/visualTheme=\{isBasic \? "navy" : undefined\}/);
  assert.match(modulePage,/isBasic \? null : <PublicConsultationCta/);
  assert.match(main,/export const basicLevelIntroductions/);
  assert.match(main,/data-visual-theme=\{visualTheme\}/);
  assert.match(main,/step\.settings\.map\(\(setting\)/);
  assert.match(main,/russianVideos\.map/);
  assert.match(style,/\.basicPage :global\(\.academy-course-layout\)/);
  assert.match(style,/\.hero/);
  assert.match(style,/\.roadmapCard/);
  assert.match(style,/@media \(max-width: 600px\)/);
  assert.match(visual,/\.curriculum\[data-visual-theme="navy"\] \.stepCard/);
  assert.match(visual,/\.curriculum\[data-visual-theme="navy"\] \.stageNavigation \{ display: none/);
});

test("Every translated landing preserves the teacher-led boundaries and mobile design", async () => {
  const [page,css,form,freePage] = await Promise.all([
    read("components/yggdrasil-module-landing.tsx"),
    read("components/yggdrasil-basic-landing.module.css"),
    read("components/yggdrasil-initiation-form.tsx"),
    read("components/yggdrasil-free-initiation.tsx"),
  ]);
  for(const x of ["en: {","ru: {","es: {","Personal training","Доступен и личный формат","formato"]) assert.ok(page.includes(x),x);
  assert.match(page,/Source descriptions are spiritual education, not treatment/);
  assert.match(page,/Наличие мест и формат подтверждает Андрей/);
  assert.match(freePage,/href="#apply-free">\{t\.answersAction\}/);
  assert.doesNotMatch(form, /<input|type="file"|setAttachment|setName/);
  assert.match(form,/whatsappEnquiryUrl/);
  assert.match(css,/@media \(max-width: 1140px\)/);
  assert.match(css,/@media \(max-width: 600px\)/);
  assert.match(css,/focus-visible/);
});
