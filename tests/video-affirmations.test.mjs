import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path,import.meta.url),"utf8");
const library = read("lib/mandala/video-affirmations.ts");
const panel = read("components/mandala-video-affirmations.tsx");
const css = read("components/mandala-video-affirmations.module.css");
const studio = read("components/mandala-free-video-studio.tsx");
const transpile = ts.transpileModule(library,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
  reportDiagnostics:true,
});
assert.deepEqual(transpile.diagnostics || [],[]);
const exposed = {};
new Function("exports",transpile.outputText)(exposed);
const {defaultAffirmations,suggestedVideoAffirmations,linesForVideoAffirmations,paintVideoAffirmations} = exposed;

test("three locales and all four site themes have five ready-to-select, non-clinical phrases", () => {
  for(const locale of ["en","ru","es"]){
    for(const theme of ["energy","money","relationships","goals"]){
      const choices=suggestedVideoAffirmations[locale][theme];
      assert.equal(choices.length,5,locale+" "+theme);
      assert.ok(choices.every(text=>text.trim().length>10 && text.length<=90));
    }
  }
  assert.deepEqual(defaultAffirmations.selected,[0,1,2]);
  assert.equal(defaultAffirmations.enabled,false);
});

test("selected presets and custom lines are local-only, normalized and bounded", () => {
  const settings={...defaultAffirmations,enabled:true,selected:[0,1,1,2,3,4,10],custom:"  Моя фраза\n\n<личная> фраза\n" + "а".repeat(500)};
  const lines=linesForVideoAffirmations("ru","energy",settings);
  assert.equal(lines.length,7);
  assert.equal(lines[0],suggestedVideoAffirmations.ru.energy[0]);
  assert.equal(lines[4],"Моя фраза");
  assert.equal(lines[5],"личная фраза");
  assert.equal(lines[6].length,90);
  assert.ok(lines.every(line=>!/[<>]/.test(line)));
});

test("the renderer draws only when enabled, uses visible readable text, and keeps brief frames brief", () => {
  const drawn=[];
  const context={
    canvas:{width:720,height:1280},
    save(){},restore(){},fillRect(){},
    fillText(value){drawn.push(value);},
    set textAlign(value){},set textBaseline(value){},set font(value){},
    set fillStyle(value){},set shadowBlur(value){},set shadowColor(value){},
  };
  const words=["A thoughtful personal message"];
  paintVideoAffirmations(context,0,words,defaultAffirmations);
  assert.equal(drawn.length,0);
  paintVideoAffirmations(context,2,words,{...defaultAffirmations,enabled:true,visibility:["large"]});
  assert.ok(drawn.includes(words[0]));
  drawn.length=0;
  const frame={...defaultAffirmations,enabled:true,visibility:["frame"]};
  paintVideoAffirmations(context,1.02,words,frame);
  assert.equal(drawn.length,1);
  drawn.length=0;
  paintVideoAffirmations(context,1.20,words,frame);
  assert.equal(drawn.length,0);
});

test("existing video preview and export use identical overlays; frame mode requests 25fps", () => {
  assert.match(studio,/MandalaVideoAffirmations locale=\{locale\} theme=\{theme\}/);
  assert.match(studio,/const \[affirmations,setAffirmations\]/);
  assert.match(studio,/caption,affirmations\]\)/);
  assert.equal((studio.match(/paintVideoAffirmations\(ctx,/g)||[]).length,4);
  assert.match(studio,/affirmations\.enabled && affirmations\.visibility\.includes\("frame"\)/);
  assert.match(studio,/\? 25 : quality === "fullhd" \? 12 : 15/);
  assert.match(studio,/setAffirmations\(defaultAffirmations\)/);
  assert.match(panel,/data-video-affirmations-enable/);
  assert.match(panel,/data-video-affirmation-preset/);
  assert.match(panel,/data-video-custom-affirmations/);
  assert.match(panel,/data-video-affirmation-frequency/);
  assert.match(panel,/data-video-affirmation-density/);
  assert.match(panel,/data-video-affirmation-visibility/);
  assert.match(panel,/checked=\{settings\.visibility\.includes\(item\)\}/);
  assert.doesNotMatch(panel+library,/\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon/i);
});

test("affirmation panel uses original light cream and green UI with narrow iPhone controls", () => {
  assert.match(css,/background:\s*#fffdf6/);
  assert.match(css,/background:\s*#0d9d75/);
  assert.match(css,/@media \(max-width: 360px\)/);
  assert.match(css,/min-width:\s*0/);
  assert.match(css,/grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  const component=ts.transpileModule(panel,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
  assert.deepEqual(component.diagnostics || [],[]);
});
