import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import test from "node:test";
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const view=readFileSync(new URL("../components/mandala-pro-enhance.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-pro-enhance.module.css",import.meta.url),"utf8");
const baseCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
test("PRO is one compact selection panel with six real licensed thumbnails",()=>{
  assert.match(source,/<MandalaProEnhance locale=\{locale\}/);
  assert.match(view,/data-video-pro-enhance/);
  const ids=[...view.matchAll(/\{id:"(cinema|characters|worlds|stories|magic|director)"/g)].map(x=>x[1]);
  assert.deepEqual(ids,["cinema","characters","worlds","stories","magic","director"]);
  const posters=[...view.matchAll(/poster:"(\/(?:videos|images)\/holistic-house\/[^"]+)"/g)].map(x=>x[1]);
  assert.equal(posters.length,6);
  for(const path of posters)assert.ok(existsSync(new URL("../public"+path,import.meta.url)),path);
  assert.match(view,/aria-pressed=\{selected===item\.id\}/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:355px\)/);
});
test("both final controls are localized and only original local renderer is invoked",()=>{
  for(const txt of ["Add selected upgrade and generate PRO video",
    "Добавить выбранный апгрейд и сгенерировать PRO-видео",
    "Сгенерировать видео без ИИ-эффектов","Generar vídeo sin efectos de IA"])
    assert.ok(view.includes(txt),txt);
  assert.match(view,/data-video-generate-pro/);
  assert.match(view,/data-video-generate-without-ai/);
  assert.match(view,/onGenerateFree\(\)/);
  assert.match(source,/onGenerateFree=\{createQuickVideo\}/);
  assert.match(view,/onClick=\{\(\)=>setShowUnavailable\(true\)\}/);
  assert.match(view,/No payment or AI render was initiated/);
  assert.doesNotMatch(view,/fetch\(|checkout|postVideoCreditAction|axios|apiKey/i);
  assert.equal((source.match(/data-video-mandala-hero/g)||[]).length,1);
  assert.equal((source.match(/<MandalaStoriesCharacters locale=/g)||[]).length,1);
  assert.match(view,/data-video-pro-advanced-options/);
  assert.match(baseCss,/data-active-workspace="pro"/);
});
