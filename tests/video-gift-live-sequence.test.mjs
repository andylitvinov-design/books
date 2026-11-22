import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {giftApprovedSceneById,GIFT_APPROVED_SCENES,GIFT_VISUAL_GROUPS}
  from "../lib/mandala/video-gift-clip-catalog.mjs";
import {giftLiveSegmentAt,planGiftLiveSequence}
  from "../lib/mandala/video-gift-live-sequence.mjs";

test("live opening is exactly 5s, followed by four approved distinct 5s sources",()=>{
  assert.equal(giftLiveSegmentAt(0),0);
  assert.equal(giftLiveSegmentAt(4.999),0);
  assert.equal(giftLiveSegmentAt(5),1);
  assert.equal(giftLiveSegmentAt(20),4);
  assert.equal(giftLiveSegmentAt(25),4);
  assert.throws(()=>giftLiveSegmentAt(-1),/time_invalid/);
  const available=GIFT_APPROVED_SCENES.filter(x=>x.clientReady);
  assert.ok(available.length>=4,"need four approved same-origin clips");
  for(const group of GIFT_VISUAL_GROUPS){
    for(const aspect of ["portrait","landscape"]){
      const film=planGiftLiveSequence({group:group.id,occasion:"support",aspect});
      assert.deepEqual(film.map(x=>[x.from,x.to]),[[5,10],[10,15],[15,20],[20,25]]);
      assert.equal(new Set(film.map(x=>x.id)).size,4);
      assert.ok(film.every(x=>giftApprovedSceneById(x.id)&&x.clientReady&&
        x.video.startsWith("/videos/holistic-house/film-collection-v3/")&&
        x.credit.includes("CC BY 4.0")));
    }
  }
});
test("selected stock clip is first after intro and no unlicensed ids are permitted",()=>{
  const scene=GIFT_APPROVED_SCENES[0];
  assert.equal(planGiftLiveSequence({sceneId:scene.id})[0].id,scene.id);
  assert.throws(()=>planGiftLiveSequence({sceneId:"https://evil.example/a.mp4"}),/not_approved/);
});
test("live MP4 pipeline preserves consented private fetch and existing free export",()=>{
  const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const engine=read("lib/mandala/video-gift-browser.ts");
  const ui=read("components/mandala-video-gift.tsx");
  const picker=read("components/mandala-gift-live-intro.tsx");
  assert.match(engine,/BlobSource/);
  assert.match(engine,/liveIntroClip/);
  assert.match(engine,/gift_live_fragment_invalid/);
  assert.match(engine,/verifyNativeSafariMp4Tracks/);
  assert.match(engine,/encodeLocalWebCodecsMp4/);
  assert.match(ui,/MandalaGiftLiveIntro/);
  assert.match(picker,/data-video-gift-live-intro/);
  assert.match(ui,/exportVideoGiftMp4/);
  assert.match(ui,/download="holistic-house-personal-gift.mp4"/);
  assert.match(picker,/\/api\/app\/live-photos/);
  assert.match(picker,/consentAi/);
  assert.match(picker,/consentXp/);
  assert.match(picker,/creationEnabled/);
  assert.doesNotMatch(picker,/HEYGEN_API_KEY|service_role/i);
});
