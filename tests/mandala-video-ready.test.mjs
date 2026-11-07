import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectResourcePractice} from "../lib/mandala/resource-practice-selector.mjs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ready=readFileSync(new URL("../components/mandala-video-ready.tsx",import.meta.url),"utf8");
const delivery=readFileSync(new URL("../components/mandala-video-delivery.tsx",import.meta.url),"utf8");

test("Ready is the sixth existing editor tab, never a seventh or a parallel renderer",()=>{
  assert.match(studio,/type StudioWorkspace =[^;]*"ready"/);
  const rail=studio.slice(studio.indexOf("const workspaceTabs=["),studio.indexOf("] as const;",studio.indexOf("const workspaceTabs=[")));
  assert.equal((rail.match(/id:"/g)||[]).length,6);
  assert.match(rail,/id:"pro"[^]*id:"ready"/);
  assert.doesNotMatch(rail,/id:"practices"/);
  assert.match(studio,/data-active-workspace=\{activeWorkspace/);
  assert.match(ready,/data-ready-view=\{view\}/);
});
test("Video must be verified; guests get login before save, and existing signed upload is reused",()=>{
  assert.match(ready,/if\(!verified\|\|!video\|\|disabled\)return/);
  assert.match(ready,/if\(!signedIn\)\{setView\("login"\);return;\}/);
  assert.match(studio,/<MandalaVideoReady/);
  assert.match(ready,/data-video-ready/);
  assert.match(delivery,/data-video-save-to-library/);
  assert.match(delivery,/await privateUpload\(\)/);
  assert.match(delivery,/uploadToSignedUrl/);
  assert.match(delivery,/appFetch\("personal-videos\/"\+created.id,undefined,"POST"\)/);
});
test("Ritual uses existing no-provider safety selector in three languages",()=>{
  for(const locale of ["en","ru","es"]){
    const ordinary=selectResourcePractice({locale,theme:"energy",kind:"ritual",focus:{goal:"calm and balance"}});
    assert.equal(ordinary.status,"ready");
    assert.equal(ordinary.steps.length,3);
    const urgent=selectResourcePractice({locale,theme:"energy",kind:"ritual",focus:{goal:"I want to die"}});
    assert.equal(urgent.status,"blocked");
    const unsafeAnchor=selectResourcePractice({locale,theme:"energy",kind:"ritual",
      focus:{goal:"calm and balance",details:["I want to die"]}});
    assert.equal(unsafeAnchor.status,"blocked","the optional anchor must be screened");
  }
  assert.match(ready,/selectResourcePractice/);
  assert.match(ready,/details:\[anchor,\.\.\.focus\.details\]/);
  assert.match(ready,/focus\.details,anchor,wish/);
  assert.match(ready,/navigator\.clipboard\.writeText/);
  assert.match(ready,/onOpenCourse/);
});
