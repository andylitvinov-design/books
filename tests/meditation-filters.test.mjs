import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMeditationNarrativeBlocks,MEDITATION_TECHNIQUES,MEDITATION_ATTENTION,MEDITATION_DEPTHS,MEDITATION_ENDINGS,MEDITATION_MOMENTS
} from "../lib/mandala/meditation-narrative-blocks.mjs";
import {buildPersonalMeditationScript} from "../lib/mandala/personal-meditation-script.mjs";
import {parseMeditationNarration,meditationNarrationEstimate} from "../lib/mandala/meditation-narration.mjs";

const opts={locale:"ru",theme:"relationships",wish:"трудно сказать нет",
  scene:"Лес",caption:"Я выбираю дистанцию",sound:"Мягкий дождь",
  focus:{difficulty:"боюсь осуждения",goal:"говорить о границах спокойно",goals:["relationships"],details:["Личные границы"]},
  image:"forest",length:5};
test("six practices produce six meaningfully distinct step sequences, not metadata-only switches",()=>{
  assert.equal(MEDITATION_TECHNIQUES.length,6);
  const variants=MEDITATION_TECHNIQUES.map(technique=>buildPersonalMeditationScript({...opts,technique}));
  assert.equal(new Set(variants).size,6);
  const signatures=["Заметьте место внутри образа","Посмотрите на реальную комнату",
    "опору под ладонями или стопами","обращаетесь к себе","Заметьте один цвет",
    "небольшой повседневный момент"];
  variants.forEach((script,index)=>assert.ok(script.includes(signatures[index]),MEDITATION_TECHNIQUES[index]));
});
test("five sensory filters, depth and ending alter spoken paragraphs",()=>{
  assert.equal(MEDITATION_ATTENTION.length,5);
  assert.equal(new Set(MEDITATION_ATTENTION.map(attention=>buildPersonalMeditationScript({...opts,attention}))).size,5);
  assert.equal(MEDITATION_DEPTHS.length,2);
  assert.equal(MEDITATION_ENDINGS.length,3);
  const light=buildPersonalMeditationScript({...opts,depth:"light"});
  const deep=buildPersonalMeditationScript({...opts,depth:"reflective"});
  assert.notEqual(light,deep);assert.match(deep,/о каком уже доступном вам ресурсе/);
  assert.equal(new Set(MEDITATION_ENDINGS.map(ending=>buildPersonalMeditationScript({...opts,ending}))).size,3);
});
test("8 settings meaningfully change the imagery in all 3 locales",()=>{
  const settings=["video","garden","water","light","home","forest","coast","mountain"];
  for(const locale of ["en","ru","es"]){
    const bodies=settings.map(image=>buildMeditationNarrativeBlocks({locale,setting:image}).join(" "));
    assert.equal(new Set(bodies).size,settings.length,locale);
  }
});
test("independent meditation topic and time-of-day change real paragraphs",()=>{
  const independent=buildPersonalMeditationScript({...opts,theme:"money",moment:"evening"});
  assert.match(independent,/работа и деньги/);
  assert.match(independent,/Когда день подходит к концу/);
  assert.equal(MEDITATION_MOMENTS.length,4);
  const variants=MEDITATION_MOMENTS.map(moment=>buildPersonalMeditationScript({...opts,moment}));
  assert.equal(new Set(variants).size,4);
});
test("3/5/8/12 minutes have increasing real spoken steps and timed pauses",()=>{
  const lengths=[3,5,8,12];
  const scripts=lengths.map(length=>buildPersonalMeditationScript({...opts,length,technique:"grounding"}));
  const speech=scripts.map(script=>parseMeditationNarration(script).filter(x=>x.kind==="speech").length);
  const estimates=scripts.map(script=>meditationNarrationEstimate(script));
  assert.deepEqual(speech.slice().sort((a,b)=>a-b),speech);
  assert.deepEqual(estimates.slice().sort((a,b)=>a-b),estimates);
  assert.ok(speech[3]>speech[0],"longer format must include more real guidance");
  assert.ok(estimates[3]>estimates[0]+180,"longer format must actually last longer in supported voice estimate");
  lengths.forEach((minutes,index)=>assert.ok(Math.abs(estimates[index]-minutes*60)<40,
    "real estimated narration should approximate "+minutes+" minutes"));
});
test("crisis-related requests, including free text and affirmations, do not produce a guided exercise",()=>{
  for(const locale of ["en","ru","es"]){
    const risky=buildPersonalMeditationScript({
      locale,theme:"energy",focus:{difficulty:"",goal:"",details:[]},
      affirmationsEnabled:true,affirmations:["suicidal thoughts"],
      wish:"beautiful forest",length:12
    });
    assert.ok(!risky.includes("beautiful forest"));
    assert.ok(!risky.includes("suicidal thoughts"));
    assert.ok(!risky.includes("[Пауза"),locale);
    assert.ok(/emergency|экстренные|emergencia/.test(risky),locale);
  }
});
test("unknown filters fail closed to safe validated settings",()=>{
  const output=buildPersonalMeditationScript({...opts,technique:"trauma-exposure",image:"unsafe",
    attention:"hyperventilation",ending:"force",depth:"deep"}); 
  assert.match(output,/ПЕРСОНАЛЬНАЯ МЕДИТАЦИЯ/);
  assert.ok(!output.includes("trauma-exposure"));
  assert.ok(!output.includes("hyperventilation"));
  assert.ok(output.includes("Заметьте место внутри образа"));
});
