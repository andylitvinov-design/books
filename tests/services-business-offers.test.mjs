import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const quiz=read("components/services-assist-quiz.tsx");
const business=read("components/services-business-menu.tsx");
const css=read("components/services-business-menu.module.css");

test("Business Support replaces problem diagnosis with four format-led categories",()=>{
 assert.match(quiz,/setAudience\("personal"\);setAnswers\(\{topic:"stress_energy"\}\)/);
 assert.match(quiz,/audience === "business" \? <ServicesBusinessMenu locale=\{locale\}/);
 assert.match(quiz,/setAudience\("personal"\)/);
 assert.match(quiz,/setAudience\("business"\)/);
 assert.match(quiz,/businessPrompt\[locale\]/);
 for(const id of ["express","strategy","remedies","hints"]){
  assert.ok(business.includes('id:"'+id+'"'),"business category "+id);
  assert.ok(business.includes('data-services-business-category={id}'));
 }
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/support-business-choice-photos-hd\.webp/);
 assert.match(css,/background-size:200% auto/);
 assert.match(css,/Shared mobile therapy-cabinet proportions/);
 const hdSheet=readFileSync(new URL("../public/images/holistic-house/support-business-choice-photos-hd.webp",import.meta.url));
 assert.ok(hdSheet.length>=20000&&hdSheet.length<=70000,"four HD business photos must be mobile-efficient");
 assert.equal(hdSheet.toString("ascii",0,4),"RIFF");
 assert.match(business,/data-business-step=\{category\?"2":"1"\}/);
});
test("approved Express CAD menu, Strategic topics and four Hints/Coaching formats are complete",()=>{
 for(const offer of ["Express Insight","Advanced Insight","Express Live Consulting","Full Live Consulting","Live Consulting + Support"])
  assert.ok(business.includes('"'+offer+'"'),offer);
 for(const tariff of ["FREE","45 CAD","75 CAD / 30 min","200 CAD / 60 min","300 CAD / 2 weeks"])
  assert.ok(business.includes('"'+tariff+'"'),tariff);
 for(const topic of ["Strategic Goal Review","Business Functions Analyses","Business Teams Review","Growth Strategy & Implementation"])
  assert.ok(business.includes('"'+topic+'"'),topic);
 for(const item of ["Remedies for Clarity & Leadership","Hints & Coaching","AI Coaching","AI Taoist Hints","Human Coaching","Human Taoist Hints"])
  assert.ok(business.includes('"'+item+'"'),item);
 for(const loc of ["ru:","en:","es:"])assert.ok(business.includes(loc));
});
test("Get details is user-triggered with WhatsApp offer draft and existing Telegram Ali bot handoff",()=>{
 assert.match(business,/data-business-get-details/);
 assert.match(business,/collapsed compact/);
 assert.match(business,/label=\{t\.getDetails\}/);
 assert.match(business,/option:optionLabel/);
 assert.match(business,/context:goal\.trim\(\)\|\|undefined/);
 assert.match(business,/telegramServiceRequestUrl\("business",locale\)/);
 assert.doesNotMatch(business,/fetch\(|localStorage|sessionStorage|sendBeacon|\/checkout/);
});
