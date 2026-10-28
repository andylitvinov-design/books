import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLIENT_GOALS, evaluateClientFit, rankClientServices,
} from "../lib/holistic-support/client-intent-model.mjs";
import { rankMeditationCatalog } from "../lib/holistic-support/meditation-catalog-ranker.mjs";
import {
  classifyDiscoveryIntent, rankDiscoveryServices, rankEditorialDiscovery,
  serviceMatchesDiscoveryFacets,
} from "../lib/practitioners/discovery-intent.js";

const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const catalog=JSON.parse(file("data/academy/meditation-catalog-candidates-20261028.json")).videos;
const options=ids=>ids.map(id=>({id,title:id,promise:"Published "+id,href:"/en/services/"+({
  situation:"free-situation-review",dao:"dao-health-profile",
  alchemy:"alchemy-of-soul",hypnotherapy:"hypnotherapy-course",business:"business-consulting",
}[id])}));
const money=catalog.find(x=>x.youtube_id==="fWfG5gXHK5Y");
const moneyListing={...money,discovery_status:"link_only",metadata_checked_at:"2026-10-28T10:00:00Z"};
const simple=(goal,more={})=>({goal,language:"en",...more});

test("one canonical five-goal model powers videos and services",()=>{
 assert.deepEqual([...CLIENT_GOALS],["money","energy","relationships","goals","meaning"]);
 assert.deepEqual(rankClientServices({offers:options(["business","situation","dao"]),request:simple("money")})
   .map(x=>x.offer.id),["business","situation"]);
});
test("exact match requires the chosen situation AND desired outcome, not just category",()=>{
 const desired={goal:"money",situations:["money_worries"],desiredStates:["calm"]};
 const fit=evaluateClientFit({
  goals:["money"],goalWeights:{money:90},
  situations:["money_worries"],desiredStates:["calm"],techniques:["breath"],
 },desired);
 assert.equal(fit.matchType,"exact");
 assert.ok(fit.reasons.some(x=>x.facet==="situation"&&x.value==="money_worries"));
 const different=evaluateClientFit({
  goals:["money"],goalWeights:{money:90},
  situations:["hard_decision"],desiredStates:["focus"],techniques:["reflection"],
 },desired);
 assert.equal(different.matchType,"related");
 assert.ok(fit.score>different.score);
 const partial=evaluateClientFit({
  goals:["money"],goalWeights:{money:90},situations:["money_worries"],desiredStates:["confidence"],
 },desired);
 assert.equal(partial.matchType,"partial");
 assert.equal(evaluateClientFit({goals:["money"]},{goal:"money"}).matchType,"topic");
});
test("money worry video is not labelled exact for a business decision",()=>{
 const matches=rankMeditationCatalog({videos:[moneyListing],request:simple("money",{
  situations:["hard_decision"],desiredStates:["confidence"],
 })});
 assert.equal(matches.length,1);
 assert.equal(matches[0].matchType,"related");
 assert.deepEqual(rankMeditationCatalog({videos:[moneyListing],request:simple("money",{
  situations:["hard_decision"],desiredStates:["confidence"],exactOnly:true,
 })}),[]);
 assert.equal(rankMeditationCatalog({videos:[moneyListing],request:simple("money",{
  situations:["money_worries"],desiredStates:["calm"],
 })})[0].matchType,"exact");
});
test("incomplete metadata never satisfies strict style or playback limits",()=>{
 assert.equal(rankMeditationCatalog({videos:[moneyListing],request:simple("money",{
   musicStyle:"voice_only",
 })}).length,0);
 assert.equal(rankMeditationCatalog({videos:[moneyListing],request:simple("money",{
   experienceLevel:"beginner",maxDurationMinutes:10,
 })}).length,0);
 const withTitleHint={...moneyListing,duration_hint_minutes:10,duration_basis:"title_only"};
 const titleHint=rankMeditationCatalog({videos:[withTitleHint],request:simple("money",{
  maxDurationMinutes:10,allowUnverifiedDuration:true,
 })});
 assert.equal(titleHint.length,1);
 assert.equal(titleHint[0].durationVerified,false);
 assert.equal(titleHint[0].durationEstimated,true);
 const audited={...moneyListing,duration_verified_seconds:660,duration_hint_minutes:10};
 assert.equal(rankMeditationCatalog({videos:[audited],request:simple("money",{
  maxDurationMinutes:10,allowUnverifiedDuration:true,
 })}).length,0,"real duration overrides an optimistic title hint");
});
test("unreviewed and unrelated YouTube IDs do not become trusted in-site videos",()=>{
 assert.deepEqual(rankMeditationCatalog({videos:[money],request:simple("money")}),[]);
 assert.equal(rankMeditationCatalog({videos:[moneyListing],request:simple("money")})[0].playback,"youtube_only");
 const fake={...moneyListing,editorial_status:"approved",embed_status:"confirmed",rights_status:"embed_approved",content_checked_at:null};
 assert.equal(rankMeditationCatalog({videos:[fake],request:simple("money")}).length,0);
 const high={...moneyListing,claims_risk:"high",editorial_status:"approved",embed_status:"confirmed",rights_status:"embed_approved",content_checked_at:"2026-10-28"};
 assert.equal(rankMeditationCatalog({videos:[high],request:simple("money")}).length,0);
});
test("language, spiritual style and music are actual constraints",()=>{
 const a={...moneyListing,spiritual_style:"open",music_style:"music_under_voice",experience_level:"beginner",posture:"lying"};
 assert.equal(rankMeditationCatalog({videos:[a],request:simple("money",{
  spiritualStyle:"open",musicStyle:"music_under_voice",experienceLevel:"beginner",posture:"lying",
 })}).length,1);
 assert.equal(rankMeditationCatalog({videos:[a],request:{goal:"money",language:"ru"}}).length,0);
 assert.equal(rankMeditationCatalog({videos:[a],request:simple("money",{spiritualStyle:"secular"})}).length,0);
});
test("service requests explain fit and never manufacture prices or practitioners",()=>{
 const ranked=rankClientServices({offers:options(["situation","dao","business","alchemy","hypnotherapy"]),
  request:{goal:"money",situations:["income_uncertainty"],desiredStates:["clarity"]}});
 assert.equal(ranked[0].offer.id,"business");
 assert.ok(ranked[0].reasons.some(x=>x.value==="income_uncertainty"));
 assert.ok(ranked.every(x=>!["dao","alchemy","hypnotherapy"].includes(x.offer.id)));
 assert.ok(ranked.every(x=>!("price" in x)&&!("practitioner" in x)));
 const free=rankClientServices({offers:options(["business","situation","dao"]),
  request:{goal:"money",paymentPreference:"free"}});
 assert.deepEqual(free.map(x=>x.offer.id),["situation"]);
});
test("missing, forged and duplicate offers never enter personalized services",()=>{
 const offers=[
  ...options(["business","business","situation"]),
  {id:"fake",title:"Miracle wealth",href:"/en/services/fake",promise:"Guaranteed wealth"},
  {id:"alchemy",title:"Alchemy",href:"https://not-our-website.example/",promise:"Private link"},
 ];
 const r=rankClientServices({offers,request:{goal:"money"}});
 assert.deepEqual(r.map(x=>x.offer.id),["business","situation"]);
});
test("service discovery rejects negations, stray word fragments, and nonpublished offerings",()=>{
 const neg=classifyDiscoveryIntent("I don't want Reiki, I need business clarity");
 assert.ok(neg.some(x=>x.key==="business_money"));
 const obvious=classifyDiscoveryIntent("not reiki, need business strategy");
 assert.ok(!obvious.some(x=>x.key==="energy_spiritual"));
 assert.ok(!neg.some(x=>x.key==="energy_spiritual"),"apostrophe negation is not a Reiki preference");
 assert.deepEqual(rankDiscoveryServices("not reiki",[
   {id:"r",slug:"reiki",practitionerSlug:"owner",areaKey:"energy_spiritual",
     active:true,status:"published",copy:{title:"Reiki",description:"Reiki"}},
 ]),[],"negative-only request must not return the explicitly rejected service");
 assert.ok(!classifyDiscoveryIntent("не хочу рейки, нужен бизнес").some(x=>x.key==="energy_spiritual"));
 assert.ok(!classifyDiscoveryIntent("sin reiki, busco negocio").some(x=>x.key==="energy_spiritual"));
 assert.ok(!classifyDiscoveryIntent("accountability").some(x=>x.key==="body_somatic"));
 const listed=[{id:"one",slug:"one",practitionerSlug:"owner",areaKey:"business_money",
  status:"published",active:true,copy:{title:"Business strategy",description:"Money decisions"}},
  {id:"two",slug:"two",practitionerSlug:"owner",areaKey:"energy_spiritual",
  status:"draft",active:true,copy:{title:"Reiki",description:"Business help"}},
 ];
 assert.deepEqual(rankDiscoveryServices("business",listed).map(x=>x.service.id),["one"]);
 assert.deepEqual(rankEditorialDiscovery("nonsense without known subject",options(["business","situation"])
   .map(v=>({...v,areaKey:"business_money"}))),[]);
});
test("EUR budget is hard: price-on-request and minimum-from prices cannot be called affordable",()=>{
 const service={deliveryFormat:"online",languages:["en"],locationLabel:"",currency:"EUR",
  pricingMode:"from",confirmedPrice:50};
 const constraints={format:"online",language:"en",price:"50"};
 assert.equal(serviceMatchesDiscoveryFacets(service,constraints),false);
 assert.equal(serviceMatchesDiscoveryFacets({...service,pricingMode:"contact"},constraints),false);
 assert.equal(serviceMatchesDiscoveryFacets({...service,pricingMode:"fixed"},constraints),true);
 assert.equal(serviceMatchesDiscoveryFacets({...service,pricingMode:"fixed",currency:"CAD"},constraints),false);
});
test("all personal criteria remain client-only with direct public service links",()=>{
 const ui=file("components/holistic-meditation-finder.tsx"),css=file("components/holistic-meditation-finder.module.css");
 for(const token of ["data-meditation-match-quality","data-meditation-advanced","data-meditation-related-services",
   "rankClientServices","coreServiceOffers","exactOnly","freeServicesOnly","includeApprox"])
   assert.ok(ui.includes(token),token);
 assert.doesNotMatch(ui,/fetch\(|localStorage|sessionStorage|sendBeacon|window\.location|trackEvent|payment_received/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/\.serviceCards/);
});
