import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const parent=read("components/mandala-free-video-studio.tsx");
const ui=read("components/mandala-therapy-studio.tsx");
const writer=read("components/mandala-personal-meditation.tsx");
const css=read("components/mandala-therapy-studio.module.css");
test("Therapy is sixth, after Ready; six original destinations remain intact",()=>{
 const block=parent.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(block);
 assert.deepEqual([...block.matchAll(/id:"([a-z]+)"/g)].map(x=>x[1]),
  ["video","phrases","editor","pro","ready","effects"]);
 for(const l of ["ru","en","es"])assert.match(parent,new RegExp(l+":\\{[\\s\\S]*?effects:\\{tab:\"Therapy\""));
 assert.match(parent,/data-video-quick-control=\{item\.id\}/);
 assert.equal((parent.match(/<MandalaTherapyStudio /g)||[]).length,1);
});
test("Single and eight sessions selector appears BEFORE Meditation Voice Practice subtabs",()=>{
 assert.ok(ui.indexOf("data-therapy-format-switch")<ui.indexOf("data-therapy-tabs"));
 for(const format of ["single","course"])assert.match(ui,new RegExp('data-therapy-format="'+format+'"'));
 for(const tab of ["meditation","voice","practice"])assert.ok(ui.includes('data-therapy-subtab={id}'));
 assert.match(ui,/editor\(isCourse\)/);
 assert.match(parent,/coursePreview=\{isCourse\}/);
 assert.match(ui,/role="tablist"/);
 assert.match(ui,/role="tabpanel"/);
});
test("Source stays one existing private local meditation generator and one real phrase narrator",()=>{
 assert.match(parent,/editor=\{isCourse=><MandalaPersonalMeditation/);
 assert.match(parent,/voiceEditor=\{hypnoVoiceEditor\}/);
 assert.match(parent,/onVideoPhrases=\{\(\)=>\{/);
 assert.match(writer,/buildPersonalMeditationScript/);
 assert.match(writer,/buildAdaptiveMeditationOutline/);
 assert.match(writer,/data-meditation-topic/);
 assert.match(writer,/data-meditation-method/);
 assert.match(writer,/data-meditation-length/);
 assert.match(writer,/data-meditation-extra/);
 assert.match(writer,/Generate meditation text/);
 assert.match(writer,/data-meditation-result/);
 assert.match(writer,/data-meditation-voice/);
 assert.match(writer,/MandalaCloudVoiceStudio/);
 assert.match(ui,/data-therapy-script-host data-pane=\{pane\}/);
});
test("Existing visual, quiet and binaural effects remain optional with no automatic rendering",()=>{
 assert.match(parent,/data-video-hypnocorrection-panel/);
 assert.match(parent,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
 assert.match(ui,/data-therapy-advanced-effects/);
 assert.match(ui,/effectsOpen\?advancedEffects:null/);
 assert.doesNotMatch(ui,/fetch\(|checkout|supabase|createQuickVideo|localStorage/);
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(browser,/data-therapy-subtab="practice"/);
 assert.match(browser,/data-therapy-effects-toggle/);
});
test("Mobile visuals have roomy touch targets and correct eight-draft disclosure",()=>{
 assert.match(css,/min-height:74px/);
 assert.match(css,/min-height:50px/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(ui,/Eight-session mode initially creates a plan and the first editable script/);
 assert.match(ui,/Курс сначала создаёт план из 8 сессий и текст первой медитации/);
});

test("Therapy WebKit preserves voice and reviewed recording rights",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.ok(browser.includes("await expect(personalMusic.locator('[role=\"radio\"]')).toHaveCount(0);"));
 assert.ok(browser.includes("data-phrase-music-guidance=\"voice\""));
 assert.ok(browser.includes("data-therapy-subtab=\"practice\""));
 assert.ok(browser.includes("data-therapy-effects-toggle"));
});
