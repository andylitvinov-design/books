import test from "node:test";
import assert from "node:assert/strict";
import {ASSIST_OFFER_CATALOG} from "../lib/assist/service-match.mjs";
import {rankAssistProducts} from "../lib/assist/product-recommendations.mjs";

test("a request about life direction presents requestable offers, not generic categories",()=>{
  assert.deepEqual(rankAssistProducts("growth",{}),["review","therapy","constellation"]);
  assert.deepEqual(rankAssistProducts("relationships",{}),["therapy","constellation","review"]);
  assert.deepEqual(rankAssistProducts("work",{}),["business","review","constellation"]);
});
test("topic changes actual products without unrelated Reiki Academy or mandala",()=>{
  for(const focus of ["stress","relationships","work","growth","health"]){
    const ranked=rankAssistProducts(focus,{});
    assert(ranked.length>0&&ranked.length<=3,focus);
    assert(!ranked.includes("academy")&&!ranked.includes("homeopathy")&&!ranked.includes("mytube"),focus);
  }
  assert.deepEqual(rankAssistProducts("stress",{}),["therapy","opora","reiki"]);
});
test("no offer violates visitor's budget, mode or channel",()=>{
  const scenarios=[
    ["relationships",{mode:"human",channel:"online",budget:"under50"}],
    ["work",{mode:"human",channel:"inperson",budget:"flexible"}],
    ["growth",{mode:"human",channel:"async",budget:"free"}],
    ["stress",{mode:"video",budget:"free"}],
  ];
  for(const [focus,pref] of scenarios)for(const id of rankAssistProducts(focus,pref)){
    const offer=ASSIST_OFFER_CATALOG[id];
    if(pref.mode!=="any")assert(offer.modes.includes(pref.mode));
    if(pref.channel&&pref.channel!=="any")assert(offer.channels.includes(pref.channel));
    if(pref.budget==="free")assert.equal(offer.cost,"free");
    if(pref.budget==="under50")assert(offer.cost==="free"||offer.priceOptions?.some(p=>p.eur<=50));
  }
  assert.deepEqual(rankAssistProducts("stress",{mode:"video",budget:"free"}),[]);
});
