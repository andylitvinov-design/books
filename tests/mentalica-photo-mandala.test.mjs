import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  MENTALICA_GEOMETRIES,
  MENTALICA_STYLES,
  mentalicaPhotoSlots,
  defaultMentalicaPhotoProject,
  sanitizeMentalicaPhotoProject
} from "../lib/mandala/mentalica-photo-geometry.mjs";

const root = new URL("../", import.meta.url);
const page = readFileSync(new URL("app/[locale]/holistic-support/mandala/page.tsx", root), "utf8");
const ui = readFileSync(new URL("components/mentalica-photo-mandala.tsx", root), "utf8");
const css = readFileSync(new URL("components/mentalica-photo-mandala.module.css", root), "utf8");

test("port keeps Mentalica's exact five geometries and three source layout styles", () => {
  assert.deepEqual(MENTALICA_GEOMETRIES, [2,4,6,8,12]);
  assert.deepEqual(MENTALICA_STYLES, ["style-1","style-2","style-3"]);
  for (const style of MENTALICA_STYLES) for (const count of MENTALICA_GEOMETRIES) {
    const slots = mentalicaPhotoSlots(count,style);
    assert.equal(slots.length,count);
    assert.deepEqual(slots.map(x=>x.id),Array.from({length:count},(_,i)=>"client-"+(i+1)));
    for (const slot of slots) {
      assert.ok(Number.isInteger(slot.x)&&Number.isInteger(slot.y));
      assert.ok(slot.x>=0&&slot.x<=100&&slot.y>=0&&slot.y<=100);
    }
  }
  // Nontrivial coordinates match Mentalica's src/profileMandalaWorkspace.css exactly.
  assert.deepEqual(mentalicaPhotoSlots(2,"style-1").map(({x,y})=>[x,y]),[[50,15],[50,85]]);
  assert.deepEqual(mentalicaPhotoSlots(4,"style-2").map(({x,y})=>[x,y]),[[25,25],[75,25],[75,75],[25,75]]);
  assert.deepEqual(mentalicaPhotoSlots(4,"style-3").map(({x,y})=>[x,y]),[[50,24],[76,50],[50,76],[24,50]]);
  assert.deepEqual(mentalicaPhotoSlots(12,"style-2").at(-1),{id:"client-12",label:"Источник 12",x:20,y:50});
  assert.equal(mentalicaPhotoSlots(11,"bogus").length,4);
});

test("project schema is local-only and validates image/data boundaries", () => {
  const blank = defaultMentalicaPhotoProject();
  assert.equal(blank.geometry,4);
  assert.deepEqual(blank.assets,[]);
  assert.deepEqual(blank.assignments,{});
  const data = "data:image/jpeg;base64," + "a".repeat(64);
  const clean = sanitizeMentalicaPhotoProject({
    ...blank, id:"local-1", title:"Test",
    assets:[{id:"asset-1",name:"Portrait",data}],
    assignments:{"__center_image":"asset-1","client-1":"asset-1","client-13":"asset-1","evil":"asset-1"},
    transforms:{"client-1":{x:-999,y:999,zoom:50,rotate:999},"bad-key":{x:5,y:5,zoom:1,rotate:0}},
    fieldScale:999, centerImageScale:0
  });
  assert.deepEqual(Object.keys(clean.assignments),["__center_image","client-1"]);
  assert.deepEqual(clean.transforms["client-1"],{x:0,y:100,zoom:4,rotate:180});
  assert.equal(clean.fieldScale,145);
  assert.equal(clean.centerImageScale,.65);
  assert.ok(!("evil" in clean));
  assert.throws(()=>sanitizeMentalicaPhotoProject({assets:[{id:"a",name:"X",data:"https://other-domain.example/picture.jpg"}]}));
  assert.throws(()=>sanitizeMentalicaPhotoProject({assets:[{id:"a",name:"X",data:"data:image/svg+xml;base64,YQ=="}]}));
  assert.throws(()=>sanitizeMentalicaPhotoProject({assets:Array.from({length:41},(_,i)=>({id:"i"+i,data}))}));
  assert.throws(()=>sanitizeMentalicaPhotoProject({assets:[{id:"bad id",data}]}));
});

test("the existing public Mandala route has separate navigable video/photo modes", () => {
  assert.match(page, /const photoMode = query\?\.mode === "photo"/);
  assert.match(page, /data-mentalica-studio-mode/);
  assert.match(page, /mandala\?mode=photo/);
  assert.match(page, /photoMode \? <MentalicaPhotoMandala locale=\{locale\} \/>/);
  assert.match(page, /<MandalaMeditationClient locale=\{locale\}/);
  assert.match(page, /<HolisticSupportMandalaDock locale=\{locale\}/);
  assert.match(page, /isPublicLocale\(locale\)/);
  assert.match(page, /alternates/);
});

test("photo constructor uses the original client-N slot identity, no paid image provider", () => {
  assert.match(ui, /data-mentalica-photo-mandala/);
  assert.match(ui, /data-photo-mandala-slot=\{key\}/);
  assert.match(ui, /data-photo-mandala-library/);
  assert.match(ui, /onDragStart/);
  assert.match(ui, /onDropPhoto/);
  assert.match(ui, /onPointerDown/);
  assert.match(ui, /pinchRef/);
  assert.match(ui, /project\.centerFrameScale/);
  assert.match(ui, /project\.centerImageScale/);
  assert.match(ui, /project\.slotScale/);
  assert.match(ui, /project\.fieldScale/);
  assert.match(ui, /data-photo-mandala-privacy="local"/);
  assert.match(ui, /canvas\.toBlob/);
  assert.match(ui, /ctx\.drawImage/);
  assert.match(ui, /image\/jpeg/);
  assert.match(ui, /indexedDB/);
  assert.match(ui, /sanitizeMentalicaPhotoProject/);
  assert.match(ui, /JSON\.stringify\(project\)/);
  assert.doesNotMatch(ui,/fetch\(|\/api\/|SUPABASE|openrouter|gemini|stripe|cloudinary|localStorage\.setItem/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /\.modeNav a\[aria-current="page"\]/);
});
