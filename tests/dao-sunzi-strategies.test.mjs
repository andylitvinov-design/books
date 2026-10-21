import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getSunTzuStrategy, sunTzuHexagramStrategies, sunTzuPassages } from "../data/dao-sunzi-strategies.mjs";
import { getDaoEditorialHexagramText } from "../data/dao-hexagrams-editorial.mjs";
import { prepareDaoReadingForSunTzu, SUN_TZU_PLACEHOLDER } from "../data/dao-sunzi-display.mjs";

test("all 64 numbered King Wen hexagrams have a curated sourced strategy in RU/EN/ES",()=>{
  assert.deepEqual(sunTzuHexagramStrategies.map(x=>x.number),Array.from({length:64},(_,i)=>i+1));
  for(const n of Array.from({length:64},(_,i)=>i+1)){
    for(const locale of ["ru","en","es"]){
      const x=getSunTzuStrategy(n,locale);
      assert.equal(x.number,n);
      assert.match(x.original,/^[\u3400-\u9fff，。、；：？！\s]+$/u);
      assert.ok(x.quote.length>15 && x.strategy.length>45,`${n} ${locale}`);
      assert.ok(x.strategy.length<250,`${n} ${locale} compact`);
      assert.match(x.source,/^https:\/\/zh\.wikisource\.org\/wiki\//);
      assert.ok(Number.isInteger(x.chapter) && x.chapter>=1 && x.chapter<=13);
    }
  }
  assert.equal(getSunTzuStrategy(0,"ru"),null);
  assert.equal(getSunTzuStrategy(65,"ru"),null);
  assert.equal(getSunTzuStrategy(1,"fr"),null);
  assert.ok(Object.keys(sunTzuPassages).length>=25);
});
test("36: agreed concise quotation is canonical chapter III passage",()=>{
  const x=getSunTzuStrategy(36,"ru");
  assert.equal(x.original,"知可以戰與不可以戰者勝");
  assert.equal(x.chapter,3);
  assert.equal(x.quote,"Побеждает тот, кто знает, когда следует сражаться, а когда — нет.");
  assert.match(x.strategy,/внутренний свет/);
});
test("display removes original unverified pastiche but does not rewrite source records",()=>{
  const original=JSON.parse(readFileSync(new URL("../data/dao-hexagram-author.json",import.meta.url)));
  for (const entry of original) {
    const displayed=prepareDaoReadingForSunTzu(entry.text);
    assert.equal(displayed.split(SUN_TZU_PLACEHOLDER).length,2,"one sourced slot "+entry.number);
    assert.ok(displayed.split(/\n\n+/).some(part=>part.trim()===SUN_TZU_PLACEHOLDER),"standalone block "+entry.number);
    assert.ok(!/Сунь-Цзы — стратегия|Императорская стратегия в духе Сунь-цзы/u.test(displayed),"no unsourced strategy "+entry.number);
    assert.ok(displayed.length>350,"keep full author reading "+entry.number);
  }
  assert.ok(prepareDaoReadingForSunTzu(original.find(x=>x.number===9).text).includes("🧠 Смысл:"));
  for(const n of [1,33,36,64]){
    const text=getDaoEditorialHexagramText(n);
    if(text){
      assert.ok(text.includes(SUN_TZU_PLACEHOLDER),`missing slot ${n}`);
      assert.ok(!text.includes("Стратегия в духе Сунь-цзы"),`old label ${n}`);
    }
  }
});
