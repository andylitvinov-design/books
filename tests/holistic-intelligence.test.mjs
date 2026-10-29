import test from "node:test";
import assert from "node:assert/strict";
import { buildHolisticIntelligencePlan, editorSoundtrackRecommendations,
  publishedReikiAudioRecommendations, HI_FORMATS } from "../lib/holistic-support/holistic-intelligence.mjs";

const sample = (rawValue=3)=>({
  key:"energy",dimensionKey:"weekly.energy",resultId:"owned-result",
  definitionKey:"hh-weekly-pulse",definitionVersion:"v1",instrumentLocale:"en",
  rawValue,min:0,max:10,mode:"directional",sourceTitle:"Weekly Pulse",
  measuredAt:"2026-10-25T10:00:00Z",
});
const axisOffer = (id="video:sun")=>({
  id,kind:"video",title:"Verified Sun",
  href:"https://www.youtube.com/watch?v=HqfixazXqRY",
  status:"published",free:true,axisLinks:[{ref:"recovery::energy",strength:3}],
});
const approvedMeditation = (overrides={})=>({
  youtube_id:"fWfG5gXHK5Y",title:"Approved money meditation",creator:"Owner",
  source_url:"https://www.youtube.com/watch?v=fWfG5gXHK5Y",
  source_kind:"original",audio_language:"en",content_type:"guided",
  goals:["money"],goal_weights:{money:85},
  user_situations:["money_worries"],desired_states:["calm"],techniques:["relaxation"],
  claims_risk:"low",metadata_confidence:"owner_source",editorial_status:"approved",
  embed_status:"confirmed",rights_status:"embed_approved",content_checked_at:"2026-10-29",
  duration_verified_seconds:300,...overrides,
});
const service = (id,slug) => ({id,title:id,href:"/en/services/"+slug});
const audio = (overrides={})=>({
  lesson:"kundalini",locale:"en",src:
    "https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/hh-reiki-course-audio/" +
    "reiki-practitioner/intros/kundalini/en/"+"a".repeat(32)+".mp3",
  publishedAt:"2026-10-29T12:00:00.000Z",verifiedPublicManifest:true,...overrides,
});

test("one intent contract orchestrates the existing topic, axis, catalog and service engines",()=>{
  const plan=buildHolisticIntelligencePlan({
    locale:"en",intent:{goal:"money",situations:["money_worries"],desiredStates:["calm"],
      enabledFormats:["meditation","service"]},
    catalogs:{meditationVideos:[approvedMeditation()],services:[
      service("business","business-consulting"),service("situation","free-situation-review"),
    ]},
  });
  assert.equal(plan.status,"ready");
  assert.deepEqual(plan.meditations.map(item=>item.video.youtube_id),["fWfG5gXHK5Y"]);
  assert.equal(plan.services[0].offer.id,"business");
  assert.deepEqual(plan.axisOffers,[]);
  assert.deepEqual(plan.audio,[]);
  assert.equal(plan.primary?.kind,"meditation");
  assert.equal(plan.primary?.href,"https://www.youtube.com/watch?v=fWfG5gXHK5Y");
  assert.ok(plan.meditations[0].reasons.some(x=>x.value==="money_worries"));
  assert.deepEqual([...HI_FORMATS],["meditation","video","audio","test","course","service"]);
});

test("missing explicit goal/axis never turns test values into an automatic medical need",()=>{
  const plan=buildHolisticIntelligencePlan({locale:"ru",intent:{},
    profile:{ownerAuthorized:true,consentToUseResults:true,measurements:[sample()]},
    catalogs:{axisOffers:[axisOffer()],meditationVideos:[approvedMeditation()]},
  });
  assert.equal(plan.status,"needs_focus");
  assert.equal(plan.primary,null);
  assert.deepEqual(plan.axisOffers,[]);
  assert.deepEqual(plan.meditations,[]);
  assert.deepEqual(plan.audio,[]);
});
test("source scores remain private and do not change relevance by severity",()=>{
  const input=rawValue=>buildHolisticIntelligencePlan({locale:"en",
    intent:{chosenAxes:["recovery::energy"],enabledFormats:["video"]},
    profile:{ownerAuthorized:true,consentToUseResults:true,measurements:[sample(rawValue)]},
    catalogs:{axisOffers:[axisOffer()]},
  });
  const a=input(2),b=input(9);
  assert.equal(a.status,"ready");
  assert.equal(a.axisOffers[0].score,b.axisOffers[0].score);
  assert.equal(a.axisOffers[0].hasSourceMeasurement,true);
  assert.equal(a.context.usedVerifiedSourceEvidence,true);
  assert.ok(!JSON.stringify(a).includes("rawValue"));
  const noConsent=buildHolisticIntelligencePlan({locale:"en",
    intent:{chosenAxes:["recovery::energy"],enabledFormats:["video"]},
    profile:{ownerAuthorized:true,consentToUseResults:false,measurements:[sample()]},
    catalogs:{axisOffers:[axisOffer()]},
  });
  assert.equal(noConsent.axisOffers[0].hasSourceMeasurement,false);
  assert.equal(noConsent.context.usedVerifiedSourceEvidence,false);
  const stranger=buildHolisticIntelligencePlan({locale:"en",
    intent:{chosenAxes:["recovery::energy"],enabledFormats:["video"]},
    profile:{ownerAuthorized:false,consentToUseResults:true,measurements:[sample()]},
    catalogs:{axisOffers:[axisOffer()]},
  });
  assert.equal(stranger.axisOffers[0].hasSourceMeasurement,false);
});
test("explicit format opt-outs, free-only and primary format preference are binding",()=>{
  const base={locale:"en",catalogs:{meditationVideos:[approvedMeditation()],
    services:[service("business","business-consulting"),service("situation","free-situation-review")]}};
  const empty=buildHolisticIntelligencePlan({...base,intent:{goal:"money",enabledFormats:[]}});
  assert.equal(empty.status,"no_reviewed_match");
  assert.deepEqual(empty.services,[]);
  assert.deepEqual(empty.meditations,[]);
  assert.equal(empty.primary,null);
  const free=buildHolisticIntelligencePlan({...base,
    intent:{goal:"money",enabledFormats:["service"],paymentPreference:"free"}});
  assert.deepEqual(free.services.map(x=>x.offer.id),["situation"]);
  const paidFirst=buildHolisticIntelligencePlan({...base,
    intent:{goal:"money",enabledFormats:["meditation","service"],preferredFormat:"service"}});
  assert.equal(paidFirst.primary?.kind,"service");
  assert.equal(paidFirst.services[0].offer.id,"business");
  assert.equal(paidFirst.meditations.length,1);
});
test("safety stop is before recommendations and omits the utterance",()=>{
  const text="Хочу покончить с собой";
  const plan=buildHolisticIntelligencePlan({locale:"ru",
    intent:{goal:"money",rawUtterance:text},catalogs:{meditationVideos:[approvedMeditation()]}});
  assert.equal(plan.status,"safety_stop");
  assert.equal(plan.safetyAction,"human_support_required");
  assert.equal(plan.primary,null);
  assert.deepEqual(plan.services,[]);
  assert.deepEqual(plan.audio,[]);
  assert.ok(!JSON.stringify(plan).includes(text));
  assert.equal(buildHolisticIntelligencePlan({intent:{goal:"energy",safetyStop:true}}).status,"safety_stop");
});
test("unapproved videos, wrong language and dismissed IDs never leak into selection",()=>{
  const base={locale:"en",intent:{goal:"money",enabledFormats:["meditation"]}};
  assert.deepEqual(buildHolisticIntelligencePlan({...base,
    catalogs:{meditationVideos:[approvedMeditation({content_checked_at:null})]}}).meditations,[]);
  assert.deepEqual(buildHolisticIntelligencePlan({...base,
    catalogs:{meditationVideos:[approvedMeditation({audio_language:"ru"})]}}).meditations,[]);
  assert.deepEqual(buildHolisticIntelligencePlan({...base,
    intent:{...base.intent,dismissedIds:["youtube:fWfG5gXHK5Y"]},
    catalogs:{meditationVideos:[approvedMeditation()]}}).meditations,[]);
  assert.deepEqual(buildHolisticIntelligencePlan({...base,
    intent:{...base.intent,exactOnly:true,situations:["hard_decision"]},
    catalogs:{meditationVideos:[approvedMeditation()]}}).meditations,[]);
});
test("only real published Reiki course audio with a verified manifest and matching locale is playable",()=>{
  const matches=publishedReikiAudioRecommendations({locale:"en",chosenAxes:["recovery::energy"],
    publishedAudio:[audio(),audio({lesson:"flight"}),audio({verifiedPublicManifest:false})]});
  assert.equal(matches.length,1);
  assert.equal(matches[0].id,"audio:reiki:kundalini:en");
  assert.equal(matches[0].playable,true);
  assert.deepEqual(publishedReikiAudioRecommendations({locale:"es",goal:"energy",
    publishedAudio:[audio()]}),[]);
  assert.deepEqual(publishedReikiAudioRecommendations({locale:"en",goal:"energy",
    publishedAudio:[audio({src:"https://evil.example.com/public.mp3"})]}),[]);
  assert.deepEqual(publishedReikiAudioRecommendations({locale:"en",goal:"energy",
    publishedAudio:[audio({lesson:"flight"})]}),[]);
});
test("original on-site soundtracks are editor picks, not standalone recorded meditations",()=>{
  const selected=editorSoundtrackRecommendations({
    locale:"ru",goal:"energy",audioPreferences:{voiceFriendly:true,pace:"slow"},
  });
  assert.ok(selected.length>=1);
  assert.ok(selected.every(x=>x.playable===false&&x.href==="/ru/holistic-support/mandala"));
  assert.ok(selected.every(x=>x.audioType==="on_site_video_soundtrack"));
  assert.deepEqual(editorSoundtrackRecommendations({locale:"en"}),[]);
  const plan=buildHolisticIntelligencePlan({locale:"en",
    intent:{chosenAxes:["recovery::energy"],enabledFormats:["audio"]},
    catalogs:{publishedReikiAudio:[audio()]},
  });
  assert.equal(plan.status,"ready");
  assert.ok(plan.audio.some(x=>x.playable&&x.audioType==="approved_course_introduction"));
  assert.ok(plan.audio.some(x=>!x.playable&&x.audioType==="on_site_video_soundtrack"));
});
test("the output exposes editorial reasons, never source notes, client identifiers or questionnaire responses",()=>{
  const plan=buildHolisticIntelligencePlan({locale:"en",
    intent:{goal:"energy",chosenAxes:["recovery::energy"],
      rawUtterance:"I want more energy",goalRatings:{"recovery::energy":{current:2,desired:8}},
      enabledFormats:["video"]},
    profile:{ownerAuthorized:true,consentToUseResults:true,measurements:[sample()]},
    catalogs:{axisOffers:[axisOffer()]},
  });
  const serialized=JSON.stringify(plan);
  assert.equal(plan.primary?.kind,"video");
  assert.ok(!serialized.includes("rawValue"));
  assert.ok(!serialized.includes("owned-result"));
  assert.ok(!serialized.includes("I want more energy"));
  assert.ok(!serialized.includes("Weekly Pulse"));
});
