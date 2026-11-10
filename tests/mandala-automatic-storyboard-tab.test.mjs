import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {planMyTubeCategory} from "../lib/mandala/category-video-storyboard.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const tab=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
test("Montage Story shows automatic film storyboard, not a questionnaire",()=>{
 const montage=studio.split("data-video-montage-concept aria-label=")[1].split("</section> : null}")[0];
 assert.match(montage,/MandalaAutomaticStoryboard/);
 assert.doesNotMatch(montage,/deepVideoDirectorPane/);
 assert.match(tab,/suggestVideoConcept/);
 assert.match(tab,/planMyTubeCategory/);
 assert.match(tab,/data-video-auto-storyboard-list/);
 assert.match(tab,/data-video-story-scene/);
 assert.match(studio,/applyAutoFilm\(preset.id,duration,edit,"portrait",true\)/);
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 assert.match(browser,/automaticStoryboard=montageVideoConcept\.locator/);
 assert.match(browser,/data-video-story-scene/);
 assert.doesNotMatch(browser,/data-cinematic-director/,
   "WebKit acceptance must not call the retired manual scene editor");
});
test("30-second relationship concept yields six unique real five-second shots",()=>{
 const c=suggestVideoConcept({locale:"ru",goal:"любовь и отношения",theme:"relationships"});
 assert.equal(c.categoryId,"love-relationships");
 const plan=planMyTubeCategory({categoryId:c.categoryId,locale:"ru",aspect:"portrait",
   durationSeconds:30,scenes:[...catalog.scenes,...original.scenes]});
 assert.equal(plan.ok,true,plan.status);
 assert.deepEqual(plan.shots.map(x=>x.startMs),[0,5000,10000,15000,20000,25000]);
 assert.ok(plan.shots.every(x=>x.durationMs===5000));
 assert.equal(new Set(plan.shots.map(x=>x.sourceMasterKey)).size,6);
});