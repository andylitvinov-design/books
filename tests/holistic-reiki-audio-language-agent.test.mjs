import test from "node:test";
import assert from "node:assert/strict";
import {publicReikiAudioSlots,verifiedPublicReikiIntro} from "../lib/holistic-support/public-reiki-audio-client.mjs";
const src="https://aaaaaaaaaaaaaaaaaaaa.supabase.co/storage/v1/object/public/hh-reiki-course-audio/reiki-practitioner/intros/kundalini/ru/"+ "a".repeat(32)+".mp3";
const row={audio:{src,publishedAt:"2026-10-29T12:00:00.000Z"}};
test("explicit audio requests map to existing course intro slots, maximum two",()=>{
  assert.deepEqual(publicReikiAudioSlots({topic:"energy",locale:"ru"}),["kundalini","tantra"]);
  assert.deepEqual(publicReikiAudioSlots({topic:"money",locale:"ru"}),[]);
  assert.deepEqual(publicReikiAudioSlots({topic:"energy",locale:"es"}),[]);
  assert.deepEqual(publicReikiAudioSlots({topic:"energy",locale:"ru",maxDurationMin:10}),[]);
});
test("only exact published storage paths are rendered as audio",()=>{
  const x=verifiedPublicReikiIntro(row,{lesson:"kundalini",locale:"ru"});
  assert.equal(x?.kind,"audio");
  assert.equal(x?.audioType,"published_course_introduction");
  assert.equal(x?.href,src);
});
test("wrong locale, lesson, unsigned site and query are rejected",()=>{
  assert.equal(verifiedPublicReikiIntro(row,{lesson:"tantra",locale:"ru"}),null);
  assert.equal(verifiedPublicReikiIntro(row,{lesson:"kundalini",locale:"en"}),null);
  assert.equal(verifiedPublicReikiIntro({audio:{...row.audio,src:src+"?token=secret"}},{lesson:"kundalini",locale:"ru"}),null);
  assert.equal(verifiedPublicReikiIntro({audio:{...row.audio,src:src.replace("supabase.co","example.com")}},{lesson:"kundalini",locale:"ru"}),null);
  assert.equal(verifiedPublicReikiIntro({audio:{...row.audio,publishedAt:"bad"}},{lesson:"kundalini",locale:"ru"}),null);
});
test("audio absence is never fabricated",()=>{
  assert.equal(verifiedPublicReikiIntro({audio:null},{lesson:"kundalini",locale:"ru"}),null);
  assert.equal(verifiedPublicReikiIntro({},{lesson:"kundalini",locale:"ru"}),null);
});
