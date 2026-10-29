import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPersonalMeditationScript, MEDITATION_ACCENTS, PERSONAL_MEDITATION_VERSION } from "../lib/mandala/personal-meditation-script.mjs";

test("meditation script uses real current editor filters, local goals and optional affirmations",()=>{
  const script=buildPersonalMeditationScript({
    locale:"ru",theme:"money",wish:"хочу спокойно обсуждать гонорар",
    scene:"Золотой портал",sound:"Мягкий дождь",pace:"slow",brightness:"soft",
    focus:{difficulty:"сложно говорить о цене",goal:"спокойно назвать стоимость",goals:["money","relationships"],details:["Уверенность"]},
    accents:["confidence","boundaries"],image:"home",tone:"grounded",length:8,extra:"говорить мягко",
    affirmationsEnabled:true,affirmations:["Я выбираю посильный шаг"]
  });
  for(const value of ["гонорар","Золотой портал","Мягкий дождь","сложно говорить о цене",
    "спокойно назвать стоимость","Уверенность","Я выбираю посильный шаг","уютную комнату","дверь","[Пауза"]) {
    assert.ok(script.includes(value),value);
  }
  assert.ok(script.includes("8 мин"));
  assert.ok(!script.includes("диагноз:"));
});
test("three locales generate meaningful distinct guided texts without provider calls",()=>{
  const en=buildPersonalMeditationScript({locale:"en",theme:"relationships",image:"garden",
    accents:["boundaries"],pace:"dynamic",brightness:"bright",length:3});
  const ru=buildPersonalMeditationScript({locale:"ru",theme:"energy",image:"water",length:5});
  const es=buildPersonalMeditationScript({locale:"es",theme:"goals",image:"light",length:8});
  assert.match(en,/PERSONAL MEDITATION/);assert.match(en,/comfortable door/);assert.match(en,/gentle movement/);
  assert.match(ru,/ПЕРСОНАЛЬНАЯ МЕДИТАЦИЯ/);assert.match(ru,/ручей/);
  assert.match(es,/MEDITACIÓN PERSONAL/);assert.match(es,/paso/);
  assert.notEqual(en,ru);assert.notEqual(ru,es);
  assert.match(es,/Detente si te incomoda/);
  assert.match(PERSONAL_MEDITATION_VERSION,/resource-meditation/);
});
test("local first-party word matching adjusts imagery to a worry without diagnosing",()=>{
  const ru=buildPersonalMeditationScript({locale:"ru",theme:"energy",wish:"я тревожусь перед конфликтами"});
  assert.match(ru,/Следующий момент может стать чуть спокойнее/);
  assert.match(ru,/Уютная дверь/);
  const en=buildPersonalMeditationScript({locale:"en",theme:"money",wish:"I want clarity with decisions"});
  assert.match(en,/Imagine placing several choices/);
  const explicit=buildPersonalMeditationScript({locale:"en",theme:"money",
    wish:"I have anxiety",accents:["gratitude"]});
  assert.match(explicit,/one small thing that has already offered some support/);
  assert.ok(!explicit.includes("the next moment can be a little slower"));
});
test("invalid or harmful text is bounded, stripped, and never emitted as an instruction",()=>{
  const raw="<script>alert(1)</script>"+"a".repeat(2000);
  const text=buildPersonalMeditationScript({locale:"ru",theme:"bogus",wish:raw,
    focus:{goal:"<img src=x onerror=alert(1)>",goals:["money","bogus"],details:[raw]},
    affirmationsEnabled:true,affirmations:[raw,raw,raw,raw],accents:["calm","unknown","rest","gratitude","confidence"],
    image:"bogus",length:999});
  assert.ok(text.length<12000);
  assert.ok(!text.includes("<script>"));assert.ok(!text.includes("<img"));
  assert.ok(!text.includes("a".repeat(300)));
  assert.match(text,/энергия и равновесие/);
  assert.ok(MEDITATION_ACCENTS.includes("rest"));
  const crisis=buildPersonalMeditationScript({locale:"en",wish:"I feel suicidal right now",theme:"energy"});
  assert.ok(!crisis.includes("suicidal"));
  assert.match(crisis,/professional/);
});
test("affirmations are opt-in and file generation is not cloud storage",()=>{
  const off=buildPersonalMeditationScript({locale:"en",affirmations:["MY PRIVATE WORDS"],affirmationsEnabled:false,sound:""});
  const on=buildPersonalMeditationScript({locale:"en",affirmations:["MY PRIVATE WORDS"],affirmationsEnabled:true});
  assert.ok(!off.includes("MY PRIVATE WORDS"));assert.ok(on.includes("MY PRIVATE WORDS"));
  assert.match(off,/Silence/);
  const files=[
    readFileSync(new URL("../components/mandala-personal-meditation.tsx",import.meta.url),"utf8"),
    readFileSync(new URL("../lib/mandala/personal-meditation-script.mjs",import.meta.url),"utf8")
  ];
  assert.ok(!files.some(s=>/fetch\s*\(|localStorage|sessionStorage|sendBeacon|supabase|openai\.com|analytics\.track/.test(s)));
});
test("writer stays at end of existing video studio and receives explicit course context",()=>{
  const parent=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const course=readFileSync(new URL("../components/mandala-guided-course.tsx",import.meta.url),"utf8");
  assert.ok(parent.indexOf("data-video-result")<parent.lastIndexOf("<MandalaPersonalMeditation"));
  assert.ok(parent.includes('studioMode==="therapy" ? <MandalaPersonalMeditation'));
  assert.ok(parent.includes("onContextChange={updateMeditationFocus}"));
  assert.ok(course.includes("details:detailGoals.flatMap"));
  assert.ok(!course.includes("onContextChange?.({portrait"));
  const css=readFileSync(new URL("../components/mandala-personal-meditation.module.css",import.meta.url),"utf8");
  assert.ok(css.includes("@media(max-width:355px)"));
  assert.ok(css.includes("min-height:44px"));
});
