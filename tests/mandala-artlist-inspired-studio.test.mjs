import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseSavedStoryCharacters,addSavedStoryCharacter,removeSavedStoryCharacter,serializeSavedStoryCharacters,SAVED_STORY_CHARACTERS_LIMIT}
  from "../lib/mandala/saved-story-characters.mjs";
import {VIDEO_QUICK_TEMPLATES,getVideoQuickTemplateDraft}
  from "../lib/mandala/video-quick-templates.mjs";
import {getStoryExecutionPolicy} from "../lib/mandala/stories-studio.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const approved=["C01","C02","C03","C04","C05","C06"];
test("saved public character selections survive a new video without storing personal data",()=>{
  const saved=addSavedStoryCharacter(["C02","C01"],"C02",approved);
  assert.deepEqual(saved,["C02","C01"]);
  assert.deepEqual(parseSavedStoryCharacters(serializeSavedStoryCharacters(saved,approved),approved),saved);
  assert.deepEqual(removeSavedStoryCharacter(saved,"C02",approved),["C01"]);
  assert.equal(SAVED_STORY_CHARACTERS_LIMIT,5);
  assert.deepEqual(parseSavedStoryCharacters('{"version":1,"characterIds":["C01"],"image":"https://untrusted"}',approved),[]);
  assert.deepEqual(parseSavedStoryCharacters("bad json",approved),[]);
  assert.deepEqual(parseSavedStoryCharacters(JSON.stringify({version:1,
    characterIds:["C99","https://bad","C01","C01","C02","C03","C04","C05","C06"]}),approved),
  ["C01","C02","C03","C04","C05"]);
  assert.deepEqual(addSavedStoryCharacter(["C01"],"C99",approved),["C01"]);
  assert.deepEqual(parseSavedStoryCharacters("X".repeat(1025),approved),[]);
});
test("Artlist-inspired story, practitioner and meditation presets use only existing local authoring flow",()=>{
  for(const id of ["choice-story","guide-introduction","forest-breath"]){
    const entry=VIDEO_QUICK_TEMPLATES.find(item=>item.id===id);
    assert.ok(entry,id);
    for(const locale of ["ru","en","es"]){
      assert.ok(entry.title[locale].length>4);
      const draft=getVideoQuickTemplateDraft(id,locale,"no red flash");
      assert.ok(draft);
      assert.equal(draft.preferences.avoid,"no red flash");
      assert.equal(draft.preferences.durationSeconds,entry.durationSeconds);
      assert.equal(draft.preferences.aspect,entry.aspect);
      assert.equal(draft.preferences.music,entry.music);
    }
  }
  assert.equal(new Set(VIDEO_QUICK_TEMPLATES.map(item=>item.id)).size,VIDEO_QUICK_TEMPLATES.length);
});
test("character library exposes clear device-only semantics and preserves existing no-charge export",()=>{
  const ui=read("components/mandala-stories-characters.tsx");
  const css=read("components/mandala-stories-characters.module.css");
  const renderer=read("components/mandala-free-video-studio.tsx");
  assert.match(ui,/data-local-character-library/);
  assert.match(ui,/data-character-library-save/);
  assert.match(ui,/data-saved-character-list/);
  assert.match(ui,/window\.localStorage\.setItem/);
  assert.match(ui,/savedDevice/);
  assert.match(ui,/hasPending/);
  assert.doesNotMatch(ui,/fetch\(|new WebSocket\(|\/api\/app\/xp/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(renderer,/paintStoryMotifs\(ctx,time,appliedStory\)/);
  assert.equal(getStoryExecutionPolicy({format:"ai_cinematic",ownerOptIn:true,
    featureEnabled:false}).mayCallPaidProvider,false);
});
