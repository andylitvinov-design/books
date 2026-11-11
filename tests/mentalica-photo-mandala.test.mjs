import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  MENTALICA_GEOMETRIES,
  MENTALICA_STYLES,
  MENTALICA_CONSTRUCTOR_TYPES,
  MENTALICA_LAYOUT_VARIANTS,
  MENTALICA_BACKGROUND_TONES,
  mentalicaPhotoLayout,
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
  assert.match(page, /<HolisticSupportMandalaDock locale=\{locale\} photoMode=\{photoMode\}/);
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


test("Mentalica family engine keeps original eight constructor names and source slot identities",()=>{
  assert.deepEqual(MENTALICA_CONSTRUCTOR_TYPES,
    ["client","altar","business","zodiac","star","chess","dao","dao-layout"]);
  const sizes=[
    ["client", "classic", 8, "client-8"],
    ["altar", "classic", 7, "altar-support-2"],
    ["business","one-zone",3,"business-structure-1"],
    ["business","three-zones",9,"business-structure-3"],
    ["zodiac","classic",12,"zodiac-12"],
    ["zodiac","zodiac-2-12",24,"zodiac-inner-12"],
    ["zodiac","plus-8",12,"zodiac-plus-4"],
    ["star","closed",5,"star-5"],
    ["star","open",5,"star-5"],
    ["star","star-2-10",10,"star-extra-5"],
    ["chess","classic-14",14,"chess-14"],
    ["chess","classic-8",8,"chess-8"],
    ["chess","plus-8",8,"chess-8"],
    ["chess","compact-5",5,"chess-5"],
    ["dao","style-1",5,"dao-metal"],
    ["dao","talisman-2",5,"dao-metal"],
    ["dao-layout","roof_double_line",5,"dao-metal"]
  ];
  for(const [constructorType,variant,count,lastId] of sizes){
    const project={...defaultMentalicaPhotoProject(),constructorType,variant,geometry:constructorType==="client"?8:12};
    const layout=mentalicaPhotoLayout(project);
    assert.equal(layout.slots.length,count,constructorType+"/"+variant);
    assert.equal(layout.slots.at(-1).id,lastId,constructorType+"/"+variant);
    assert.equal(layout.type,constructorType);
    assert.equal(layout.variant,variant);
    assert.equal(new Set(layout.slots.map(s=>s.id)).size,count,"unique refs "+constructorType+"/"+variant);
    assert.ok(layout.slots.every(slot=>
      Number.isFinite(slot.x)&&Number.isFinite(slot.y)&&
      slot.x>=0&&slot.x<=100&&slot.y>=0&&slot.y<=100&&
      slot.diameter>0&&["circle","square"].includes(slot.shape)),constructorType+"/"+variant);
    assert.ok(Number.isFinite(layout.center.x)&&Number.isFinite(layout.center.y));
  }
  for(const type of MENTALICA_CONSTRUCTOR_TYPES)
    for(const variant of MENTALICA_LAYOUT_VARIANTS[type]){
      const layout=mentalicaPhotoLayout({constructorType:type,variant,geometry:8});
      assert.equal(layout.type,type);
      assert.equal(layout.variant,variant);
      assert.ok(layout.slots.length>=2);
    }
  assert.deepEqual(MENTALICA_BACKGROUND_TONES,
    ["mentalica","gold","forest","night","fire","water"]);
});
test("original Mentalica non-client geometry landmarks",()=>{
  const preview=(constructorType,variant)=>mentalicaPhotoLayout({constructorType,variant,geometry:8});
  assert.deepEqual(preview("star","closed").slots.slice(0,2).map(s=>[s.x,s.y]),
    [[50,8],[87,36]]);
  assert.deepEqual(preview("chess","plus-8").slots.slice(0,4).map(s=>[s.x,s.y]),
    [[15,15],[85,15],[15,85],[85,85]]);
  assert.deepEqual(preview("chess","compact-5").slots.at(0).x,50);
  assert.deepEqual(preview("altar","classic").center,{x:50,y:58,diameter:30});
  assert.deepEqual(preview("business","three-zones").slots.map(s=>s.id).slice(0,3),
    ["business-goal-1","business-goal-2","business-goal-3"]);
  assert.deepEqual(preview("dao","style-1").slots.map(s=>s.id),
    ["dao-water","dao-wood","dao-fire","dao-earth","dao-metal"]);
});
test("saved original projects migrate safely and new types survive JSON export/import",()=>{
  const legacy=defaultMentalicaPhotoProject();
  delete legacy.constructorType;delete legacy.variant;delete legacy.tone;
  const migrated=sanitizeMentalicaPhotoProject(legacy);
  assert.equal(migrated.constructorType,"client");
  assert.equal(migrated.variant,"classic");
  assert.equal(migrated.tone,"mentalica");
  const data="data:image/jpeg;base64,"+"a".repeat(64);
  const fresh=sanitizeMentalicaPhotoProject({
    ...defaultMentalicaPhotoProject(),constructorType:"dao-layout",variant:"roof_double_line",tone:"forest",
    assets:[{id:"avatar",name:"Test",data}],
    assignments:{"dao-water":"avatar","__center_image":"avatar","client-99":"avatar"},
    transforms:{"dao-water":{x:22,y:78,zoom:1.25,rotate:-15}}
  });
  assert.equal(fresh.variant,"roof_double_line");
  assert.equal(fresh.constructorType,"dao-layout");
  assert.equal(fresh.tone,"forest");
  assert.equal(fresh.assignments["dao-water"],"avatar");
  assert.equal(fresh.assignments["client-99"],undefined);
  assert.deepEqual(sanitizeMentalicaPhotoProject(JSON.parse(JSON.stringify(fresh))),fresh);
  assert.equal(sanitizeMentalicaPhotoProject({...fresh,constructorType:"wrong",tone:"danger"}).constructorType,"client");
});
test("PNG and live preview use one scene plan, position/rotation and tone",()=>{
  assert.match(ui,/const layout = useMemo\(\(\) => mentalicaPhotoLayout\(project\)/);
  assert.match(ui,/layout\.slots\.forEach/);
  assert.match(ui,/slots\.map\(slot=>imageButton/);
  assert.match(ui,/layout\.guides\.map/);
  assert.match(ui,/data-photo-mandala-constructor=\{layout\.type\}/);
  assert.match(ui,/data-photo-mandala-tone=\{project\.tone\}/);
  assert.match(ui,/const size=2048/);
  assert.match(ui,/function drawCover/);
  assert.match(ui,/objectPosition:transform\.x/);
  assert.match(ui,/layout\.center\.x/);
  assert.match(ui,/MENTALICA_CONSTRUCTOR_TYPES\.map/);
  assert.match(ui,/MENTALICA_LAYOUT_VARIANTS\[layout\.type\]/);
  assert.match(css,/\.constructorPills/);
  assert.match(css,/\.guides polyline/);
  assert.match(css,/data-photo-mandala-tone="forest"/);
});
