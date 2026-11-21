import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  VIDEO_GIFT_DURATION, VIDEO_GIFT_SCENES,VIDEO_GIFT_OCCASIONS,
  giftSceneAt,giftSuggestedText,giftEnding,giftCameraAt,giftCanUsePhoto,
} from "../lib/mandala/personal-video-gift-timeline.mjs";
test("25-second gift beats exactly cover video without gaps",()=>{
  assert.equal(VIDEO_GIFT_DURATION,25);
  assert.deepEqual(VIDEO_GIFT_SCENES.map(s=>[s.start,s.end]),[[0,3],[3,8],[8,19],[19,25]]);
  for(let t=0;t<25;t+=.25)assert.ok(giftSceneAt(t).start<=t&&giftSceneAt(t).end>t);
  assert.equal(giftSceneAt(25).id,"outro");
});
test("all six greetings support three languages and editable copy",()=>{
  for(const language of ["ru","en","es"]){
    assert.ok(giftEnding(language).length>4);
    for(const occasion of VIDEO_GIFT_OCCASIONS){
      const text=giftSuggestedText(language,occasion,"Alex");
      assert.match(text,/Alex/);
      assert.ok(text.length<300);
    }
  }
});
test("photo permissions fail closed for third parties and minors",()=>{
  const basics={hasPhoto:true,rights:true};
  assert.equal(giftCanUsePhoto({...basics,subject:"self"}),true);
  assert.equal(giftCanUsePhoto({...basics,subject:"adult"}),false);
  assert.equal(giftCanUsePhoto({...basics,subject:"adult",subjectPermission:true}),true);
  assert.equal(giftCanUsePhoto({...basics,subject:"minor",subjectPermission:true}),false);
  assert.equal(giftCanUsePhoto({...basics,subject:"minor",subjectPermission:true,guardianPermission:true}),true);
  assert.equal(giftCanUsePhoto({...basics,rights:false,subject:"self"}),false);
});
test("free camera animation never claims to alter a person's expression",()=>{
  assert.equal(giftCameraAt(14,"still").scale,1);
  assert.ok(giftCameraAt(14,"gentle-zoom").scale>1);
  assert.ok(giftCameraAt(17,"soft-pan").dx!==0);
});
test("gift video uses the existing video exporter, private upload and no paid provider",()=>{
  const source=readFileSync(new URL("../components/mandala-personal-video-gift.jsx",import.meta.url),"utf8");
  assert.match(source,/encodeLocalWebCodecsMp4/);
  assert.match(source,/prepareBrowserPhoto/);
  assert.match(source,/savePrivateMp4/);
  assert.match(source,/giftCanUsePhoto/);
  assert.match(source,/supportsProceduralWebCodecsMp4/);
  assert.doesNotMatch(source,/(?:heygen\.com|HEYGEN_API_KEY|\/api\/heygen)/i);
});

test("canonical Studio route hosts gift mode rather than a second editor",()=>{
 const page=readFileSync(new URL("../app/[locale]/holistic-support/mandala/page.tsx",import.meta.url),"utf8");
 assert.match(page,/mode=gift/);
 assert.match(page,/MandalaPersonalVideoGift/);
 assert.match(page,/giftMode/);
 const studio=readFileSync(new URL("../app/[locale]/video-studio/page.tsx",import.meta.url),"utf8");
 assert.match(studio,/holistic-support\/mandala/);
});
test("the same verified MP4 renderer and Safari fallback serve both aspects",()=>{
 const source=readFileSync(new URL("../components/mandala-personal-video-gift.jsx",import.meta.url),"utf8");
 assert.match(source,/normalizeNativeSafariMp4ForPlayback/);
 assert.match(source,/nativeGiftMp4/);
 assert.match(source,/sourceFrameClock:"timestamp-decoded"/);
 assert.match(source,/aspect==="portrait"\?\[360,640\]:\[640,360\]/);
 assert.match(source,/duration:25/);
 const service=readFileSync(new URL("../lib/app/personal-videos.js",import.meta.url),"utf8");
 assert.match(service,/DURATIONS=new Set\(\[10,15,20,25,30,60\]\)/);
});
