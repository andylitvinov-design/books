import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {initialReadyCheckIn,scoreReadyCheckIn,READY_CHECKIN_MEDIA}
  from "../lib/mandala/ready-generation-checkin.mjs";

const source=readFileSync(new URL("../components/mandala-video-ready-checkin.tsx",import.meta.url),"utf8");

test("Ready step 1/7 score stays on device and advances once",()=>{
  const original=initialReadyCheckIn();
  const next=scoreReadyCheckIn(original,5);
  assert.equal(original.index,0);
  assert.equal(next.index,1);
  assert.equal(next.answers[0],5);
  assert.equal(original.answers[0],null);
  assert.equal(READY_CHECKIN_MEDIA.length,7);
});

test("Safari pointerup or touchend can finish the tap, synthetic click cannot answer twice",()=>{
  for(const anchor of [
    "scoreTapRef=useRef<","function beginScoreTap","function endScoreTap",
    "onPointerDown={event=>","onPointerUp={event=>",
    "onTouchStart={event=>","onTouchEnd={event=>",
    "onPointerCancel={()=>","onTouchCancel={()=>",
    "Math.hypot(x-tap.x,y-tap.y)>12",
    "tap.handled=true;","answer(value);",
    "event.detail>0&&tap?.value===value&&(tap.handled||tap.moved)",
  ])assert.ok(source.includes(anchor),anchor);
  assert.match(source,/onClick=\{event=>\{[\s\S]*?answer\(value\);/);
  assert.doesNotMatch(source,/preventDefault\(\)/);
});

test("existing real macOS WebKit export still clicks score 5 and checks second photograph",()=>{
  const script=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.match(script,/await readyCheckin\.locator\('\[data-ready-checkin-score="5"\]'\)\.click\(\)/);
  assert.match(script,/not\.toHaveAttribute\("data-checkin-tone",firstTone/);
  assert.match(script,/not\.toHaveAttribute\("src",firstImage/);
  assert.match(script,/toContainText\("2 \/ 7"\)/);
});
