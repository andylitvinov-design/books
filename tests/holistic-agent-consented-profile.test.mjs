import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildHolisticGuidedTurn } from "../lib/holistic-support/holistic-guide-adapter.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const audio = {
  lesson:"kundalini",locale:"en",src:"https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/"+
    "hh-reiki-course-audio/reiki-practitioner/intros/kundalini/en/"+"a".repeat(32)+".mp3",
  publishedAt:"2026-10-29T12:00:00.000Z",verifiedPublicManifest:true,
};
const testEvidence = (score=4)=>({
  key:"energy",dimensionKey:"weekly.energy",resultId:"secret-result-001",
  definitionKey:"hh-weekly-pulse",definitionVersion:"v1",instrumentLocale:"en",
  rawValue:score,min:0,max:10,mode:"directional",sourceTitle:"Private score",
  measuredAt:"2026-10-25T10:00:00Z",
});
const video = {
 id:"youtube:HqfixazXqRY",kind:"video",title:"Sun Flight",
 href:"https://www.youtube.com/watch?v=HqfixazXqRY",
 status:"published",free:true,axisLinks:[{ref:"recovery::energy",strength:3}],
};
const input = (score=4)=>({
 locale:"en",
 intent:{goal:"energy",chosenAxes:["recovery::energy"],enabledFormats:["video"],
   preferredFormat:"video"},
 safety:{status:"clear"},
 access:{authenticated:true,ownerScoped:true},
 profile:{measurements:[testEvidence(score)]},
 catalogs:{axisOffers:[video]},
});
test("explicit owner+consent includes verified test presence only and never includes private score",()=>{
 const consent={profilePersonalization:true,measuredPersonalization:true};
 const yes=buildHolisticGuidedTurn({...input(),consent});
 const no=buildHolisticGuidedTurn({...input(),consent:{}});
 const different=buildHolisticGuidedTurn({...input(9),consent});
 assert.equal(yes.status,"recommend");
 assert.equal(yes.primary.id,video.id);
 assert.equal(no.primary.id,video.id);
 assert.equal(different.primary.id,video.id);
 for (const result of [yes,no,different]) {
   const serialized=JSON.stringify(result);
   for(const raw of ["secret-result-001","Private score","rawValue","weekly.energy"])
     assert.ok(!serialized.includes(raw));
 }
 assert.ok(JSON.stringify(yes).includes("goal_and_measured_axis"));
 assert.ok(!JSON.stringify(no).includes("goal_and_measured_axis"));
});
test("no ownership, no consent or urgent intent never allow personal score matching",()=>{
 const approved={profilePersonalization:true,measuredPersonalization:true};
 const missingAccess=buildHolisticGuidedTurn({...input(),access:{},consent:approved});
 const wrongConsent=buildHolisticGuidedTurn({...input(),consent:{profilePersonalization:true}});
 assert.equal(missingAccess.status,"recommend");
 assert.equal(wrongConsent.status,"recommend");
 assert.ok(!JSON.stringify(missingAccess).includes("goal_and_measured_axis"));
 assert.ok(!JSON.stringify(wrongConsent).includes("goal_and_measured_axis"));
 const emergency=buildHolisticGuidedTurn({...input(),consent:approved,
   safety:{status:"urgent"}});
 assert.equal(emergency.status,"safety_handoff");
 assert.deepEqual(emergency.suggestions,[]);
});
test("only manifest-approved playable audio can reach the personal guide",()=>{
 const base={locale:"en",intent:{goal:"energy",enabledFormats:["audio"],preferredFormat:"audio"},
   safety:{status:"clear"}};
 const yes=buildHolisticGuidedTurn({...base,catalogs:{publishedReikiAudio:[audio]}});
 assert.equal(yes.status,"recommend");
 assert.equal(yes.primary.id,"audio:reiki:kundalini:en");
 const no=buildHolisticGuidedTurn({...base,catalogs:{publishedReikiAudio:[{...audio,verifiedPublicManifest:false}]}});
 assert.equal(no.status,"no_match");
 const editor=buildHolisticGuidedTurn({...base,catalogs:{}});
 assert.equal(editor.status,"no_match","nonplayable editor sounds are NOT audio recordings");
});
test("server enforces owner auth and explicit request consent, without client-forged access",()=>{
 const api=read("app/api/holistic-agent/turn/route.js");
 const ui=read("components/holistic-agent-chat.tsx");
 const authenticated=api.indexOf("const actor = await auth.verified()");
 const portrait=api.indexOf("await repository.bootstrap(actor,{view:\"portrait\"})");
 assert.ok(authenticated>=0 && portrait>authenticated,"read authenticated owner only");
 assert.match(api,/requireSameOrigin\(request,config\)/);
 assert.match(api,/body\.usePrivateProfile===true/);
 assert.match(api,/chosenAxes\.length>0 && safety\.status==="clear"/);
 assert.match(api,/profilePersonalization:useMeasurements/);
 assert.match(api,/onlyKeys\(body,/);
 assert.doesNotMatch(api,/body\.ownerScoped|body\.accountId|body\.authenticated/);
 assert.match(ui,/useState\(false\)/);
 assert.match(ui,/chosenAxes:axisRef\?\[axisRef\]:\[\]/);
 assert.match(ui,/usePrivateProfile:useSavedTests&&Boolean\(axisRef\)/);
});
