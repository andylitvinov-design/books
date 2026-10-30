import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consultPsychologistMind } from "../lib/holistic-support/psychologist-mind.mjs";

const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const safe=({focus="stress",locale="en",imagery=false}={})=>consultPsychologistMind({
 task:"video_course",locale,
 intent:{focus,durationMinutes:12,noImagery:!imagery},
 safety:{status:"clear"},access:{authenticated:true,ownerScoped:true},
 consent:{resourceImagery:imagery},
});

test("existing Psychologist Mind creates eight original educational steps, not imaginary video assets",()=>{
 for(const locale of ["en","ru","es"]){
  const plan=safe({locale});
  assert.equal(plan.status,"draft_ready");
  assert.equal(plan.lessons.length,8);
  assert.equal(plan.published,false);
  assert.equal(plan.rendered,false);
  assert.equal(plan.mediaAssetsVerified,false);
  assert.equal(plan.requiresClinicalAndEditorialReview,true);
  assert.ok(plan.lessons.every(x=>x.videoPlayable===false&&x.videoAssetId===null&&x.audioAssetId===null));
  assert.ok(plan.lessons.every(x=>Array.isArray(x.practicalSteps)&&x.practicalSteps.length>0));
 }
});
test("the self-guided authoring gate refuses unreviewed trauma processing and urgent turns",()=>{
 assert.notEqual(safe({focus:"trauma_support"}).status,"draft_ready");
 const emergency=consultPsychologistMind({task:"video_course",locale:"ru",
   safety:{status:"urgent"},intent:{focus:"stress"}});
 assert.notEqual(emergency.status,"draft_ready");
 assert.equal(emergency.published,undefined);
});
test("new protected endpoint requires authenticated owner, same origin, explicit readiness and excludes free-text",()=>{
 const src=file("app/api/holistic-agent/program/route.js");
 const ui=file("components/holistic-agent-chat.tsx");
 assert.match(src,/HH_AGENT_CHAT_ENABLED/);
 assert.match(src,/HH_AGENT_PRODUCTION_APPROVED/);
 assert.match(src,/requireSameOrigin\(request,config\)/);
 assert.match(src,/await auth\.verified\(\)/);
 assert.match(src,/body\.safetyAcknowledged!==true/);
 assert.match(src,/const FOCI=new Set\(\["stress","relationships","self_worth","meaning"\]\)/);
 assert.match(src,/onlyKeys\(body,\["locale","focus","courseId","resourceImagery","safetyAcknowledged","minutes"\]\)/);
 assert.doesNotMatch(src,/body\.(?:message|history|patientId|clientId|results|profile)/);
 assert.match(src,/saved:false/);
 assert.match(src,/generatedMediaCount:0/);
 assert.match(src,/requiresPractitionerOrEditorialReview:true/);
 assert.match(ui,/data-hh-eight-session-preview/);
 assert.match(ui,/safetyAcknowledged:previewReady/);
 assert.match(ui,/\[previewReady,setPreviewReady\]=useState\(false\)/);
});
