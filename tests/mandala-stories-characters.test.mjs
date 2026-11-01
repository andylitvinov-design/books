import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import test from "node:test";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const catalogText=read("lib/mandala/story-addon-catalog.ts");
const compiled=ts.transpileModule(catalogText,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const catalog=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));

test("approved story catalog exposes every category, localized and real first-party assets",()=>{
  const a=catalog.STORY_ADDONS;
  assert.equal(a.length,62);
  for(const [kind,num] of Object.entries({character:14,story:12,place:12,symbol:12,event:12})){
    assert.equal(a.filter(item=>item.kind===kind).length,num,kind);
  }
  const ids=new Set();
  for(const item of a){
    assert.ok(!ids.has(item.id),"duplicate "+item.id);ids.add(item.id);
    for(const locale of ["ru","en","es"]){
      assert.ok(item.title[locale]&&item.title[locale].trim().length>2,item.id+" "+locale);
    }
    assert.match(item.poster,/^\/(images|videos)\/holistic-house\//);
    assert.ok(existsSync(new URL("../public"+item.poster,import.meta.url)),
      "Missing first-party catalog poster "+item.poster);
    assert.ok(["local","planned"].includes(item.capability));
    assert.ok(Number.isFinite(item.estimatedXp)&&item.estimatedXp>=0);
    if(item.capability==="local")assert.equal(item.estimatedXp,0,
      "Never charge for existing licensed footage or simple Canvas motif");
    if(item.capability==="planned")assert.ok(item.estimatedXp>0);
  }
});

test("plan-only XP estimates never grant a paid capability",()=>{
  const free={character:"C01",story:"S01",place:"L02",symbol:"O01"};
  const quote=catalog.storyDraftEstimate(free);
  assert.equal(quote.estimatedXp,0);
  assert.equal(quote.unavailable.length,0);
  assert.deepEqual(catalog.availableStoryScene(free),{theme:"life",id:"coastal-freedom"});
  const future={character:"C02",story:"S03",place:"L05",symbol:"O02",event:"E03"};
  const pending=catalog.storyDraftEstimate(future);
  assert.equal(pending.estimatedXp,150);
  assert.equal(pending.unavailable.length,5);
  assert.equal(catalog.availableStoryScene(future),undefined);
});

test("source maps ready story places to existing licensed film IDs",()=>{
  const film=read("lib/mandala/film-collection-v2.ts");
  for(const item of catalog.STORY_ADDONS.filter(x=>x.capability==="local"&&x.scene)){
    assert.match(film,new RegExp('"'+item.scene.id+'"'));
    assert.ok(["energy","life","health"].includes(item.scene.theme));
  }
});

test("one original video preview and export share the selected symbolic layer",()=>{
  const s=read("components/mandala-free-video-studio.tsx");
  const c=read("components/mandala-stories-characters.tsx");
  const css=read("components/mandala-stories-characters.module.css");
  assert.match(s,/import \{ MandalaStoriesCharacters \}/);
  assert.match(s,/data-workspace-section="characters"/);
  assert.match(s,/data-video-quick-control=\{item\.id\}/);
  assert.match(s,/activeWorkspace==="characters"/);
  assert.match(s,/<MandalaStoriesCharacters locale=\{locale\} theme=\{theme\}/);
  assert.equal((s.match(/<MandalaStoriesCharacters /g)||[]).length,1,"one catalog, same established workspace");
  assert.match(s,/setAppliedStory\(next\)/);
  assert.match(s,/storySelectionItems\(next\)\.some\(item=>item\.capability!=="local"\)/);
  assert.match(s,/storySelectionItems\(appliedStory\)\.length>0\|\|/);
  assert.equal((s.match(/paintStoryMotifs\(ctx,/g)||[]).length,4,
    "first preview + animated preview + first recording frame + recorded frames");
  assert.match(s,/cinematicPlan\?\.shots\.map\(shot=>shot\.sceneId\),appliedStory/);
  assert.match(s,/cinematicPlan, appliedStory\]\);/);
  assert.equal((s.match(/data-video-mandala-hero/g)||[]).length,1);
  assert.match(c,/data-story-addon-capability=\{item\.capability\}/);
  assert.match(c,/disabled=\{disabled\|\|hasPending\}/);
  assert.doesNotMatch(c,/fetch\(|\/api\/app\/xp|checkout|\breserveXp\b/);
  assert.match(css,/grid-auto-columns:clamp\(145px,42%,182px\)/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/@media\(max-width:355px\)/);
  assert.match(css,/@media\(min-width:761px\)/);
});
