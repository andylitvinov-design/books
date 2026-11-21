import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const encoder=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
const openMotion=readFileSync(new URL("../lib/mandala/openmotion-preset-export.ts",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");

test("timestamp-decoded approved OpenMotion source bypasses wall-clock pacing, not exact PTS",()=>{
  assert.match(openMotion,/new CanvasSink\(track,\{width:canvas\.width,height:canvas\.height,fit:"cover",poolSize:2\}\)/);
  assert.match(openMotion,/sink\.canvasesAtTimestamps\(clocks\.get\(frame\.clipId\) \?\? \[\]\)/);
  assert.match(openMotion,/sourceFrameClock:"timestamp-decoded"/);
  assert.match(encoder,/const timestampDecoded=options\.sourceFrameClock==="timestamp-decoded"/);
  assert.match(encoder,/const remaining=timestampDecoded\?0:/);
  assert.match(encoder,/if\(!timestampDecoded&&\s*performance\.now\(\)-startedAt > time\*1000\+decoderHoldMs\+encoderHoldMs\+maxEncoderPresentationLagMs\)/);
  assert.match(encoder,/const time=i\/frameRate/);
  assert.match(encoder,/await videoSource\.add\(time,1\/frameRate,/);
});

test("HTMLVideoElement-based customer movies retain paced source playback and strict decoder lag",()=>{
  assert.doesNotMatch(studio,/sourceFrameClock:"timestamp-decoded"/);
  assert.match(studio,/freeFilmVideoAt\(time,true\)/);
  assert.match(encoder,/sourceFrameClock\?:"native-playback"\|"timestamp-decoded"/);
  assert.match(encoder,/timestamp_frame_clock_requires_verified_source/);
  assert.match(encoder,/video_frame_clock_invalid/);
  assert.match(encoder,/const maxFrameDecoderWaitMs=1400/);
  assert.match(encoder,/const maxTotalDecoderWaitMs=4800/);
  assert.match(encoder,/if\(!decodedRealFrame\)throw new Error\("licensed_scene_frame_unavailable"\)/);
  assert.match(encoder,/video_encoder_timeline_drift/);
  assert.match(encoder,/video_encoder_too_slow/);
});

test("timestamp export still requires actual H264/AAC, source/caption quality and real MP4 decode",()=>{
  assert.match(encoder,/await canEncodeVideo\("avc"/);
  assert.match(encoder,/await canEncodeAudio\("aac"/);
  assert.match(encoder,/new Mp4OutputFormat\(\{fastStart:"in-memory"\}\)/);
  assert.match(encoder,/audioSource\.add\(audioBuffer\)/);
  assert.match(encoder,/await audioTask/);
  assert.match(encoder,/await output\.finalize\(\)/);
  assert.match(encoder,/await verifyDecodableMp4Export\(bytes,/);
  assert.match(encoder,/if\(!shouldContinue\(\)\)throw new Error\("export_cancelled"\)/);
  assert.match(openMotion,/signal\.throwIfAborted\(\)/);
  assert.match(openMotion,/paintVideoProjectV3Frame\(ctx,plan,projectMs/);
  assert.match(openMotion,/if\(painted\)paintVideoBrandStamp\(ctx,brandVariant\)/);
  assert.match(openMotion,/input\.dispose\(\)/);
  assert.doesNotMatch(encoder,/navigator\.sendBeacon|\/api\/render|XMLHttpRequest/);
});
