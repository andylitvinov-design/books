import test from "node:test";
import assert from "node:assert/strict";
import {buildPersonalMeditationScript,isMeditationSafetyResponse} from "../lib/mandala/personal-meditation-script.mjs";

test("Generate again creates different resource-focused passages without changing user settings",()=>{
  for(const locale of ["ru","en","es"]){
    const args={locale,theme:"relationships",wish:locale==="ru"?"хочу общаться спокойнее":"I want to communicate more calmly",
      focus:{goal:"gentle communication",difficulty:"",goals:["relationships"],details:[]},
      technique:"imagery",image:"garden",length:5};
    const texts=[0,1,2].map(variantIndex=>buildPersonalMeditationScript({...args,variantIndex}));
    assert.equal(new Set(texts).size,3);
    assert.ok(texts.every(x=>x.includes(args.wish)&&x.length>500));
    assert.ok(texts.every(x=>!isMeditationSafetyResponse(x,locale)));
    assert.equal(texts[0],buildPersonalMeditationScript(args));
  }
});

test("regeneration cannot turn a crisis response into a commercial meditation",()=>{
  for(const variantIndex of [0,1,2,7]){
    const text=buildPersonalMeditationScript({locale:"ru",wish:"хочу умереть",variantIndex});
    assert.equal(isMeditationSafetyResponse(text,"ru"),true);
    assert.ok(!text.includes("Сад восстановления"));
  }
});
