import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {resolveVideoGoalTopic} from "../lib/mandala/video-goal-taxonomy.mjs";
import {GOAL_IDEA_LINES,resolveVideoIdeaContext,suggestVideoGoalPhrases}
 from "../lib/mandala/video-goal-idea-phrases.mjs";
import {planIdeaSelection,isIdeaEditorSnapshot} from "../lib/mandala/video-idea-selection.mjs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ideas=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");

test("Love, любовь and amor select the Love category regardless of screen locale",()=>{
 for(const locale of ["ru","en","es"]){
  for(const request of ["love","любовь","amor","найти любовь"]){
   const goal=resolveVideoIdeaContext({locale,request,theme:"energy"});
   assert.equal(goal.categoryId,"love",locale+" "+request);
   const phrases=suggestVideoGoalPhrases({locale,request,theme:"energy"});
   assert.equal(phrases.length,7,locale+" "+request);
   assert.ok(phrases.every(text=>GOAL_IDEA_LINES[locale].love.includes(text)),JSON.stringify(phrases));
   assert.ok(!phrases.some(text=>/steady ground|нахожу опору|punto de calma/i.test(text)));
  }
 }
});

test("Goal classifier handles short Love aliases without matching unrelated substrings",()=>{
 assert.equal(resolveVideoGoalTopic({locale:"en",request:"love"}).categoryId,"love");
 assert.equal(resolveVideoGoalTopic({locale:"es",request:"amor"}).categoryId,"love");
 assert.equal(resolveVideoGoalTopic({locale:"en",request:"glove"}).status,"needs_category");
 assert.equal(resolveVideoGoalTopic({locale:"es",request:"enamorado"}).status,"needs_category");
 // Two Love subtopics can tie. The client's category must not be lost.
 assert.equal(resolveVideoGoalTopic({locale:"ru",request:"любовь"}).status,"ambiguous");
 assert.equal(resolveVideoIdeaContext({locale:"ru",request:"любовь",theme:"energy"}).categoryId,"love");
});

test("Explicit relationships film theme also offers Love instead of ground when request is blank",()=>{
 const goal=resolveVideoIdeaContext({locale:"en",request:"",theme:"relationships"});
 assert.equal(goal.categoryId,"love");
 assert.deepEqual(goal.axisIds,["connection"]);
 assert.equal(goal.desiredId,"connection");
 const suggestions=suggestVideoGoalPhrases({locale:"en",theme:"relationships"});
 assert.equal(suggestions.length,7);
 assert.ok(suggestions[0].includes("love"));
});

test("All five categories have seven usable first-screen phrases and three novel More choices",()=>{
 const themes={love:"relationships",business:"money",body:"health",energy:"energy",stress:"health"};
 for(const locale of ["ru","en","es"]){
  for(const category of Object.keys(themes)){
   const request=category==="stress"?{
    ru:"Меньше тревоги",en:"less anxiety",es:"menos ansiedad"
   }[locale]:"";
   const theme=category==="stress"?"health":themes[category];
   // For Stress the canonical text overrides the generic health fallback.
   const result=resolveVideoIdeaContext({locale,request,theme});
   if(category!=="stress")assert.equal(result.categoryId,category);
   const first=suggestVideoGoalPhrases({locale,request,theme,limit:7});
   assert.equal(first.length,7,category+" "+locale);
   assert.equal(new Set(first).size,7);
   assert.ok(first.every(line=>line.trim()&&Array.from(line).length<=36),JSON.stringify(first));
   const more=suggestVideoGoalPhrases({locale,request,theme,excluded:first,limit:3,revision:1});
   assert.equal(more.length,3,category+" "+locale);
   assert.ok(more.every(line=>!first.includes(line)),JSON.stringify(more));
  }
 }
});

test("Changing the goal invalidates automatic drafts without destroying manual edits on revisits",()=>{
 const love=resolveVideoIdeaContext({locale:"en",request:"love",theme:"relationships"});
 const stress=resolveVideoIdeaContext({locale:"en",request:"less anxiety",theme:"health"});
 assert.notEqual(love.key,stress.key);
 const loveLines=suggestVideoGoalPhrases({locale:"en",request:"love",theme:"relationships"});
 const signature=JSON.stringify([love.key,love.axisIds,"fatigue",love.desiredId,4,6,0]);
 const planned=planIdeaSelection(loveLines,[0,1,2,3,4],loveLines,signature);
 assert.equal(isIdeaEditorSnapshot(planned.editor,signature),true);
 assert.equal(isIdeaEditorSnapshot(planned.editor,
  JSON.stringify([stress.key,stress.axisIds,"fatigue",stress.desiredId,4,6,0])),false);
 // Editing words and returning to the same topic preserves the cached editor.
 const revised=planIdeaSelection(["Love is possible for me",...loveLines.slice(1)],[0,1,2,3,4],
  loveLines,signature);
 assert.equal(isIdeaEditorSnapshot(revised.editor,signature),true);
 assert.equal(revised.settingsPatch.presetOverride[0],"Love is possible for me");
});

test("One shared Montage Text editor receives the actual Goal request and keeps original render path",()=>{
 assert.match(studio,/<MandalaVideoIdeas locale=\{locale\} theme=\{theme\} requestText=\{wish\}/);
 assert.match(ideas,/resolveVideoIdeaContext\(\{locale,request:requestText,theme\}\)/);
 assert.match(ideas,/data-video-ideas-goal-category=\{goalContext.categoryId\|\|"neutral"\}/);
 assert.match(ideas,/const signature=JSON.stringify\(\[goalContext.key,/);
 assert.match(ideas,/onChange\(old=>\(\{\.\.\.old,\.\.\.initial.settingsPatch,ideasDraft:initial.editor,/);
 assert.match(ideas,/planIdeaSelection\(candidates,indices,suggested,signature\)/);
 assert.match(ideas,/onResetPreview\(\);/);
 assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
 assert.match(studio,/onCreate=\{\(\)=>\{setMontagePanel\("audio"\);setBasicPanelTab\("music"\);setPreviewPlaying\(false\);\}\}/);
 assert.equal((studio.match(/<MandalaVideoIdeas locale/g)||[]).length,1,
   "only one shared phrases editor; no duplicate video caption or recorder");
 assert.doesNotMatch(ideas,/fetch\(|localStorage|navigator\.sendBeacon|SpeechSynthesisUtterance/);
});
