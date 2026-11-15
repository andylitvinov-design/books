import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {personalizedVideoClosingPhrase} from "../lib/mandala/video-goal-idea-phrases.mjs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("optional name creates a warm final caption in each locale",()=>{
  assert.equal(personalizedVideoClosingPhrase("ru","  Андрей  "),"Андрей, я в тебя верю");
  assert.equal(personalizedVideoClosingPhrase("en","Andrey"),"Andrey, I believe in you");
  assert.equal(personalizedVideoClosingPhrase("es","Andrés"),"Andrés, creo en ti");
  assert.equal(personalizedVideoClosingPhrase("en","Jean-Luc"),"Jean-Luc, I believe in you");
  for(const locale of ["ru","en","es"]){
    assert.equal(personalizedVideoClosingPhrase(locale,""),null);
    assert.equal(personalizedVideoClosingPhrase(locale,"12345"),null);
    assert.equal(personalizedVideoClosingPhrase(locale,undefined),null);
  }
});
test("names stay safe and are not split in the middle of long words",()=>{
  for(const locale of ["ru","en","es"]){
    const line=personalizedVideoClosingPhrase(locale,"Christopher-Alexander-Long");
    assert.ok(line&&line.startsWith("Christopher,"),locale);
    assert.ok(Array.from(line).length<=36,locale);
    assert.ok(!/[<>{}]/u.test(line));
  }
  assert.equal(personalizedVideoClosingPhrase("en","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),null);
  assert.equal(personalizedVideoClosingPhrase("ru","<Анна>"),"Анна, я в тебя верю");
});
test("personalization input is local, optional, accessible and localized",()=>{
  const ui=source("components/mandala-video-personalization.tsx");
  assert.match(ui,/name\?:string/);
  assert.match(ui,/desiredLevel:6,name:""/);
  assert.match(ui,/data-personalization-kind="name"/);
  assert.match(ui,/data-video-personalization-name type="text"/);
  assert.match(ui,/autoComplete="given-name" maxLength=\{20\}/);
  assert.match(ui,/nameQuestion:"Как вас зовут\?"/);
  assert.match(ui,/nameQuestion:"What is your name\?"/);
  assert.match(ui,/nameQuestion:"¿Cómo te llamas\?"/);
  const studio=source("components/mandala-free-video-studio.tsx");
  assert.match(studio,/value=\{ideasProfile\}/);
  assert.match(studio,/profile=\{ideasProfile\}/);
  const summarize=ui.slice(ui.indexOf("export function summarizeVideoGoalProfile"),ui.indexOf("export function MandalaVideoPersonalization"));
  assert.ok(!summarize.includes("value.name"),"do not send name to concept or storyboard summary");
});
test("named seventh idea becomes fifth selected video/export caption",()=>{
  const ui=source("components/mandala-video-ideas.tsx");
  assert.match(ui,/const profileKey=JSON.stringify\(profile\?\?null\)/);
  assert.match(ui,/const closingPhrase=personalizedVideoClosingPhrase\(locale,profile\?\.name\)/);
  assert.match(ui,/visible\[visible.length-1\]=closingPhrase/);
  assert.match(ui,/\[0,1,2,3,suggested.length-1\]:allFive/);
  assert.match(ui,/planIdeaSelection\(suggested,initialChosen,suggested,signature\)/);
  assert.match(ui,/const insertAt=closingIsLast\?options.length-1:options.length/);
  assert.match(ui,/chosen.map\(index=>index>=insertAt\?index\+candidates.length:index\)/);
  assert.match(ui,/isIdeaEditorSnapshot\(remembered,signature\)/);
  const browser=source("scripts/verify-affirmation-voice-browser.mjs");
  assert.ok(browser.includes('await nameInput.fill(testName);'));
  assert.ok(browser.includes('await expect(namedPhraseRows.last()).toContainText(lastWords);'));
  assert.ok(browser.includes('await nameInput.fill("");'));
});
