import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const encoder=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
const motion=readFileSync(new URL("../lib/mandala/openmotion-preset-export.ts",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");

test("pre-decoded CanvasSink frames opt into non-realtime encoding",()=>{
  assert.match(motion,/new CanvasSink\(track,/);
  assert.match(motion,/sink\.canvasesAtTimestamps\(clocks\.get\(frame\.clipId\)/);
  assert.match(motion,/frameSourceMode:"timestamp"/);
  assert.match(motion,/renderFrame:async time=>/);
  assert.match(encoder,/const timestampFrames=options\.frameSourceMode==="timestamp"/);
  assert.match(encoder,/const remaining=timestampFrames\?0:/);
  assert.match(encoder,/if\(!timestampFrames&&[\s\S]*?time\*1000\+decoderHoldMs\+encoderHoldMs\+maxEncoderPresentationLagMs\)/);
});
test("legacy HTML video and photo previews never opt into an unsafe timestamp clock",()=>{
  assert.doesNotMatch(studio,/frameSourceMode:"timestamp"/);
  assert.match(encoder,/frameSourceMode\?:"live"\|"timestamp"/);
  assert.match(encoder,/invalid_video_frame_mode/);
  assert.match(encoder,/startedAt\+decoderHoldMs\+encoderHoldMs\+\(i\*1000\/frameRate\)-performance\.now\(\)/);
});
test("fast timestamp export retains all audio, PTS and native MP4 proof",()=>{
  assert.match(encoder,/const time=i\/frameRate/);
  assert.match(encoder,/await videoSource\.add\(time,1\/frameRate,/);
  assert.match(encoder,/await audioTask/);
  assert.match(encoder,/new AudioBufferSource\(\{codec:"aac"/);
  assert.match(encoder,/await output\.finalize\(\)/);
  assert.match(encoder,/await verifyDecodableMp4Export\(bytes,/);
  assert.match(encoder,/if\(performance\.now\(\)-startedAt>\(seconds\+20\)\*1000\+decoderHoldMs\)/);
  assert.doesNotMatch(motion,/MediaRecorder|captureStream/);
});
