import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url));
const mirror=read("components/mandala-magic-mirror-goal.tsx").toString("utf8");
const styles=read("components/mandala-magic-mirror-goal.module.css").toString("utf8");
const studio=read("components/mandala-free-video-studio.tsx").toString("utf8");
const sprite=read("public/images/holistic-house/magic-mirror-owner-cards-20261123.avif");

test("approved mobile reference renders three separate photo regions and real tap destinations",()=>{
 assert.equal(sprite.toString("ascii",4,12),"ftypavif","first-party asset must be a valid AVIF header");
 assert.ok(sprite.length>4000&&sprite.length<15000,"compressed asset retains meaningful image data without large page weight");
 assert.equal((mirror.match(/className=\{css\.destinationImage\}/g)||[]).length,3);
 for(const scope of ["me","others","work"])assert.match(mirror,new RegExp('data-hh-mirror-enter="'+scope+'"'));
 for(const keyword of ["Видео терапия для себя","Видео для других","Видео для работы","Video Therapy for Myself","Videoterapia para mí"])assert.ok(mirror.includes(keyword),keyword);
 for(const keyword of [".destinationCards",".destinationImage","background-position:center top","background-position:center center","background-position:center bottom","max-width:359px","max-height:740px"])assert.ok(styles.includes(keyword),keyword);
 assert.match(styles,/\.title:has\(\+ \.goals\.landing\)/);
 assert.match(styles,/data-video-quick-builder\]:has\(> \.goals\.landing\)/);
 assert.match(studio,/HeaderCreditProfile locale=\{locale\}/);
});
test("landing polish preserves three-screen purpose and format flow without touching render, debit or login",()=>{
 for(const s of ['"landing"|"purpose"|"format"|"topic"','data-hh-mirror-screen="purpose"','data-hh-mirror-screen="format"','MandalaVideoIdeaGoal','onClick={()=>enterScreen("me")}', 'onClick={()=>enterScreen("present")}', 'onClick={()=>enterScreen("business")}'])assert.ok(mirror.includes(s),s);
 assert.doesNotMatch(mirror,/fetch\(|localStorage|createQuickVideo\(/);
 assert.doesNotMatch(styles,/\.goals\[data-hh-mirror-screen="topic"\]\s*\{\s*display:none/);
});
