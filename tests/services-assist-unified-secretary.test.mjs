import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consultServiceQuestion } from "../lib/assist/consultant-mind.mjs";
import { rankAssistProducts } from "../lib/assist/product-recommendations.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const component=read("components/services-assist-mobile.tsx");
const cards=read("components/assist-top-recommendations.tsx");
const server=read("app/api/holistic-agent/turn/route.js");

test("Services and authenticated Messenger use exactly the same source-bounded Consultant Mind",()=>{
  assert.match(component,/import \{ consultServiceQuestion \} from "@\/lib\/assist\/consultant-mind\.mjs"/u);
  assert.match(server,/consultServiceQuestion\(\{message:body\.message,locale:body\.locale,history:body\.history\}\)/u);
  assert.match(component,/consultServiceQuestion\(\{message:trimmed,locale,history:\[\]\}\)/u);
  assert.match(component,/consultServiceQuestion\(\{message:value,locale,history:turns\.slice\(-6\)\}\)/u);
  assert.match(component,/advice\?\.reply\?\?t\.reply\[focus\]/u);
  assert.doesNotMatch(component,/fetch\(|OPENROUTER|localStorage|sendBeacon/u);
});
test("published catalogue and price rules stay authoritative in both surfaces",()=>{
  for(const [locale,message,priceFragment] of [
    ["ru","Сколько стоит образная психотерапия?","€50"],
    ["en","What is the price of guided imagery therapy?","€50"],
    ["es","¿Cuánto cuesta la psicoterapia?","€50"],
  ]){
    const response=consultServiceQuestion({locale,message});
    assert.equal(response?.intent,"price",locale);
    assert.match(response.reply,new RegExp(priceFragment),locale);
    assert.equal(response.modelUsed,false);
    assert(response.suggestions.every(s=>s.href.startsWith("/"+locale+"/")));
  }
  const res=consultServiceQuestion({locale:"ru",message:"Подбери консультацию по отношениям до €50"});
  const top=res?.suggestions?.[0]?.id?.slice("service:".length);
  const eligible=rankAssistProducts("relationships",{mode:"human",budget:"under50"},20);
  assert(eligible.includes(top),top);
});
test("no treatment claims, emergency recommendations or invented confirmed booking",()=>{
  for(const unsafe of ["Боль в груди, подбери мне услугу","I want to die. Recommend a service","No puedo respirar, necesito terapia"]){
    assert.equal(consultServiceQuestion({message:unsafe,locale:"ru"}),null,unsafe);
  }
  for(const message of ["Не хочу никаких услуг","Don't sell me services"]){
    assert.equal(consultServiceQuestion({message,locale:"en"}),null,message);
  }
  assert.match(component,/chest pain\|cannot breathe/u);
  assert.match(cards,/eligible\.includes\(id as ProductId\)/u);
});
test("same recommendations are still filtered by affordability before rendering Telegram Request",()=>{
  assert.match(cards,/priorityIds\.filter/u);
  assert.match(cards,/matchingIds\?\.length===0\?\[\]/u);
  assert.match(cards,/telegramServiceRequestUrl\(item\.requestId,locale\)/u);
  assert.match(component,/matchingIds=\{suggestions\.map/u);
  assert.match(component,/setConsultantPriority\(\[\]\)/u);
});
