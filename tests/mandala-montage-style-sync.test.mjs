import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isSafeMontageScene} from "../lib/mandala/video-montage-sources.mjs";
import {verifiedCategorySource} from "../lib/mandala/category-video-storyboard.mjs";
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const scenes=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8")).scenes;
const lookup=new Map(scenes.map(scene=>[scene.id,scene]));
test("all six visual styles for six categories use distinct licensed MP4s",()=>{
 const map=source.slice(source.indexOf("const quickStyleSceneIds:"),source.indexOf("// One verified first-party"));
 const lines=map.split("\n").filter(line=>/^  (energy|money|relationships|goals|life|health):/.test(line));
 assert.equal(lines.length,6);
 for(const line of lines){
   const ids=[...line.matchAll(/"([^"]+)"/g)].map(match=>match[1]);
   assert.equal(ids.length,6,line);
   assert.equal(new Set(ids).size,6,line);
   for(const id of ids){
     const scene=lookup.get(id);
     assert.ok(isSafeMontageScene(scene),id+" licence");
     assert.ok(verifiedCategorySource(scene),id+" physical source");
     assert.ok(scene.poster.startsWith("/videos/holistic-house/"),id+" poster");
   }
 }
});
test("style thumbnails and main Canvas frame use the same media in both encoders",()=>{
 for(const expected of [
   "function quickStyleFilmFor(theme:VideoTheme,index:number)",
   "const selectedStyleFilm=activeMontageStyleId?quickStyleFilmFor(theme,quickStyleIndex):null;",
   "data-video-selected-style={selectedStyleFilm?.sceneId||undefined}",
   "data-video-style-source={selectedStyleFilm.sceneId}","data-video-style-loading",
   "paintSelectedStyleShot(ctx,styleVideo)", "const stylePreparation=selectedStyleFilm",
   "if(!(await stylePreparation))",'throw new Error("selected_style_mp4_not_decoded")',
   "const styleFirstBeat=","const styleBeatReady="
 ])assert.ok(source.includes(expected),expected);
 assert.equal(source.split("activeMontageStyleId,styleFilmRef.current);").length-1,5);
 assert.ok(css.includes(".heroCanvas .heroSelectedStylePoster"));
});
test("style selection preserves the existing four-shot plan, captions and music",()=>{
 const click=source.slice(source.indexOf("const quickPickStyle ="),source.indexOf("// Keep the deep editor tabs",source.indexOf("const quickPickStyle =")));
 assert.ok(click.includes('recordBeforeEditorChange("montage-style")'));
 assert.ok(click.includes("setCinematicPlan(current=>current?{...current,styleId:visualStyleId}:null)"));
 assert.ok(!click.includes("setCinematicPlan(null)"));
});

test("licensed four-scene montage takes precedence over thumbnail-style source",()=>{
 const painter=source.slice(source.indexOf("function paintCinematicFrame("),
   source.indexOf("/** Each authored caption",source.indexOf("function paintCinematicFrame(")));
 assert.match(painter,/storyboard\?\.version!==FREE_FILM_PLAN_VERSION/);
 assert.match(painter,/paintStudioVisualGrade\(ctx,montageStyleId\|\|storyboard\.styleId\)/);
});
