import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 VIDEO_GIFT_DURATION,VIDEO_GIFT_BEATS,VIDEO_GIFT_OCCASIONS,
 VIDEO_GIFT_FREE_MOTIONS,VIDEO_GIFT_AI_MOTIONS,
 suggestVideoGiftText,validateVideoGiftDraft,videoGiftStage
} from "../lib/mandala/video-gift-contract.mjs";

import {VIDEO_GIFT_EMOTIONS,VIDEO_GIFT_STYLES,getGiftEmotionMessage,suggestGiftEmotionText} from "../lib/mandala/video-gift-emotions.mjs";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const valid={
 locale:"ru",occasion:"birthday",recipient:"София",
 sourceOwner:"self",rightsConfirmed:true,subjectConsent:false,
 guardianConsent:false,motion:"zoom",palette:"sunrise",aspect:"portrait",
 requestMusic:"forest",message:"С любовью и благодарностью!",
 finalWish:"Пусть всё будет хорошо!"
};
test("25-second template has four contiguous beats",()=>{
 assert.equal(VIDEO_GIFT_DURATION,25);
 assert.deepEqual(VIDEO_GIFT_BEATS.map(x=>[x.from,x.to]),[[0,3],[3,8],[8,19],[19,25]]);
 assert.equal(videoGiftStage(0),"intro");
 assert.equal(videoGiftStage(3),"portrait");
 assert.equal(videoGiftStage(8),"message");
 assert.equal(videoGiftStage(19),"outro");
 assert.equal(videoGiftStage(25),"outro");
});
test("occasion defaults exist for Russian, English and Spanish",()=>{
 assert.equal(VIDEO_GIFT_OCCASIONS.length,6);
 for(const locale of ["ru","en","es"])
  for(const occasion of VIDEO_GIFT_OCCASIONS){
   const suggestion=suggestVideoGiftText(locale,occasion);
   assert.ok(suggestion.message.length>15);
   assert.ok(suggestion.finalWish.length>7);
  }
});
test("owner rights are always required; other people's consent and minors' guardians are additional",()=>{
 assert.throws(()=>validateVideoGiftDraft({...valid,rightsConfirmed:false}),/gift_consent_required/);
 assert.throws(()=>validateVideoGiftDraft({...valid,sourceOwner:"other"}),/gift_consent_required/);
 assert.doesNotThrow(()=>validateVideoGiftDraft({...valid,sourceOwner:"other",subjectConsent:true}));
 assert.throws(()=>validateVideoGiftDraft({...valid,sourceOwner:"minor",subjectConsent:true}),/gift_consent_required/);
 assert.doesNotThrow(()=>validateVideoGiftDraft({...valid,sourceOwner:"minor",subjectConsent:true,guardianConsent:true}));
});
test("free camera motions cannot pretend to animate a human face",()=>{
 for(const motion of VIDEO_GIFT_FREE_MOTIONS)
  assert.equal(validateVideoGiftDraft({...valid,motion}).requiresPaidAnimation,false);
 for(const motion of VIDEO_GIFT_AI_MOTIONS)
  assert.equal(validateVideoGiftDraft({...valid,motion}).requiresPaidAnimation,true);
 assert.equal(VIDEO_GIFT_AI_MOTIONS.length,4);
});
test("untrusted labels cannot overflow the scene or mutate the manifest",()=>{
 assert.throws(()=>validateVideoGiftDraft({...valid,recipient:"A".repeat(65)}),/invalid_gift_text/);
 assert.throws(()=>validateVideoGiftDraft({...valid,aspect:"square"}),/invalid_gift_choice/);
 const clean=validateVideoGiftDraft({...valid,message:" Привет!\u0000 Спасибо! "});
 assert.ok(!clean.message.includes("\u0000"));
 assert.ok(Object.isFrozen(clean));
});
test("one canonical Studio route, no second editor and both formats",()=>{
 const page=file("app/[locale]/holistic-support/mandala/page.tsx");
 const redirect=file("app/[locale]/video-studio/page.tsx");
 const component=file("components/mandala-video-gift.tsx");
 assert.match(page,/giftMode/);assert.match(page,/MandalaVideoGift/);
 assert.match(redirect,/mode=gift/);assert.match(component,/setAspect/);
 assert.match(component,/preview/);assert.match(component,/Cloud|cloudConsent/);
 assert.match(component,/prepareBrowserPhoto/);
});
test("MP4 export checks H.264/AAC through shared native and WebCodecs paths",()=>{
 const code=file("lib/mandala/video-gift-browser.ts");
 assert.match(code,/encodeLocalWebCodecsMp4/);
 assert.match(code,/verifyNativeSafariMp4Tracks/);
 assert.match(code,/normalizeNativeSafariMp4ForPlayback/);
 assert.match(code,/audioMaster/);
 assert.match(code,/sourceFrameClock:"timestamp-decoded"/);
 assert.match(code,/gift_paid_fragment_required/);
});
test("My Videos accepts 25 seconds and gift metadata with private upload consent",()=>{
 const backend=file("lib/app/personal-videos.js");
 const cabinet=file("components/app/my-personal-videos.jsx");
 assert.match(backend,/\b25\b/);assert.match(backend,/'gift'/);
 assert.match(cabinet,/\b25\b/);assert.match(cabinet,/themes\.gift/);
 const gift=file("components/mandala-video-gift.tsx");
 assert.match(gift,/savePrivateMp4/);
 assert.match(gift,/cloudConsent/);
 assert.match(gift,/theme:"gift",sceneId:"personal-gift"/);
});
test("paid jobs are private, RLS-owned, fail-closed and idempotent",()=>{
 const migration=file("supabase/migrations/20261121211000_hh_video_gift_jobs_v1.sql");
 assert.match(migration,/app_private\.video_gift_jobs/);
 assert.match(migration,/UNIQUE\(account_id,idempotency_key\)/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/FORCE ROW LEVEL SECURITY/);
 assert.match(migration,/payment_verified_at/);
 assert.match(migration,/guardian_consent/);
 assert.match(migration,/mode='free' AND status='draft'/);
 assert.doesNotMatch(migration,/CREATE\s+POLICY\s+\S+\s+FOR\s+ALL\s+TO\s+anon/i);
});

test("Gift has four unique emotional categories, four messages each and four styles in EN/RU/ES",()=>{
 assert.equal(VIDEO_GIFT_EMOTIONS.length,4);
 assert.deepEqual(VIDEO_GIFT_EMOTIONS.map(x=>x.id),[
  "miss-you","thank-you","support-motivation","congratulations"
 ]);
 assert.equal(VIDEO_GIFT_STYLES.length,4);
 const all=VIDEO_GIFT_EMOTIONS.flatMap(cat=>cat.messages.map(message=>[cat,message]));
 assert.equal(all.length,16);
 assert.equal(new Set(all.map(([,m])=>m.id)).size,16);
 for(const [cat,message] of all){
  assert.equal(getGiftEmotionMessage(cat.id,message.id)?.id,message.id);
  for(const locale of ["en","ru","es"]){
   assert.ok(cat.label[locale]);
   assert.ok(message.label[locale]);
   const copy=suggestGiftEmotionText(locale,cat.id,message.id);
   assert.ok(copy.message.length>40&&copy.message.length<=500);
   assert.ok(copy.finalWish.length>3&&copy.finalWish.length<=140);
  }
 }
 for(const locale of ["en","ru","es"]){
  assert.equal(new Set(all.map(([c,m])=>suggestGiftEmotionText(locale,c.id,m.id).message)).size,16);
 }
 assert.throws(()=>suggestGiftEmotionText("ru","miss-you","happy-birthday"),/invalid_gift_emotion/);
});
test("Gift emotion identity is preserved in the manifest and mismatched selections fail closed",()=>{
 const selected={...valid,occasion:"support",giftCategoryId:"support-motivation",
   giftMessageId:"youre-not-alone",giftStyleId:"gentle"};
 const manifest=validateVideoGiftDraft(selected);
 assert.equal(manifest.giftCategoryId,"support-motivation");
 assert.equal(manifest.giftMessageId,"youre-not-alone");
 assert.equal(manifest.giftStyleId,"gentle");
 assert.throws(()=>validateVideoGiftDraft({...selected,giftMessageId:"happy-birthday"}),/invalid_gift_emotion_choice/);
 assert.throws(()=>validateVideoGiftDraft({...selected,giftStyleId:"missing"}),/invalid_gift_emotion_choice/);
 assert.throws(()=>validateVideoGiftDraft({...selected,occasion:"birthday"}),/invalid_gift_emotion_choice/);
});
test("Gift wizard shows category, message and style before recipient and photo",()=>{
 const source=file("components/mandala-video-gift.tsx");
 assert.match(source,/data-video-gift-quiz="category"/);
 assert.match(source,/data-video-gift-quiz="message"/);
 assert.match(source,/data-video-gift-quiz="style"/);
 assert.match(source,/chooseGiftCategory\(choice\.id\)/);
 assert.match(source,/chooseGiftMessage\(choice\.id\)/);
 assert.match(source,/chooseGiftStyle\(choice\.id\)/);
 assert.match(source,/if\(step===0&&!recipient\.trim\(\)\)/);
 assert.doesNotMatch(source,/OCCASIONS\.map/);
});
