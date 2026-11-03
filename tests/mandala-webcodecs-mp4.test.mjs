import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const helper=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("Safari MP4 uses browser-local WebCodecs rather than MediaRecorder",()=>{
  assert.match(helper,/new CanvasSource\(canvas,/);
  assert.match(helper,/new AudioBufferSource\(\{codec:"aac"/);
  assert.match(helper,/new Mp4OutputFormat\(\)/);
  assert.match(helper,/await output\.finalize\(\)/);
  assert.match(studio,/const useWebCodecsMp4=/);
  assert.match(studio,/await import\("@\/lib\/mandala\/webcodecs-mp4-export"\)/);
  assert.match(studio,/if\(useWebCodecsMp4\)/);
  assert.match(studio,/stream = canvas\.captureStream\(framesPerSecond\)/);
});
test("Safari movie retains the real Canvas scene, story, hypno and stage captions",()=>{
  for(const marker of [
    "paintCinematicFrame(ctx,image,effect,time",
    "paintStoryMotifs(ctx,time,appliedStory)",
    "paintHypnoLightOverlay(ctx,time,hypnoLight)",
    "paintVideoAffirmations(ctx,time,affirmationLines,affirmations)",
    "paintStageCaptionOverlay(ctx,time,cinematicPlan)",
    "if(usingFreeFilmCompilation&&!frame)return false",
  ])assert.ok(studio.includes(marker),marker);
});
test("No customer upload, fake video or unbounded output",()=>{
  assert.doesNotMatch(helper,/XMLHttpRequest|navigator\.sendBeacon|\/api\/render/);
  assert.match(helper,/credentials:"same-origin"/);
  assert.match(helper,/MAX_DURATION=60/);
  assert.match(helper,/MAX_BYTES=80\*1024\*1024/);
  assert.match(helper,/video_encoder_too_slow/);
  assert.match(helper,/video_encoder_timeline_drift/);
  assert.match(studio,/frameRate:Math\.min\(safeWebkitRetry\?8:10,framesPerSecond\)/,
    "Safari must pace real 10-second H.264+AAC exports without skipping timed scenes");
  assert.match(helper,/const time=i\/frameRate/);
  assert.match(helper,/audio_decode_invalid/);
  assert.match(helper,/video_output_not_mp4/);
  assert.match(studio,/HH_WEBKIT_MP4_EXPORT_FAILURE:/);
  assert.match(helper,/await output\.cancel\(\)/);
});
test("WebKit mixes local audio to stereo before AAC encoding",()=>{
  assert.match(helper,/new OfflineAudioContext\(2,Math\.ceil\(SAMPLE_RATE\*seconds\),SAMPLE_RATE\)/,
    "mixing into stereo prevents Safari from silently collapsing the encoded AAC track to mono");
  assert.match(helper,/sampleRate:SAMPLE_RATE,numberOfChannels:2,/,
    "AAC capability preflight must request the same two-channel stream that is encoded");
  assert.match(helper,/new AudioBufferSource\(\{codec:"aac"/);
});
test("Narration does not loop and actual user gain is mastered into AAC",()=>{
  assert.match(studio,/loop:attachedAudio\.narration!==true&&attachedAudio\.nonLoop!==true/);
  assert.match(studio,/audio:files\.length\?\{files,volume:soundVolume\}:undefined/);
  assert.match(helper,/source\.loop=entry\.loop/);
  assert.match(helper,/gain\.gain\.linearRampToValueAtTime\(gainValue,fadeIn\)/);
  assert.match(helper,/narration_longer_than_video/);
  assert.match(helper,/offline\.startRendering\(\)/);
  assert.match(helper,/audioSource\.add\(audioBuffer\)/);
});
test("Real browser validation still requires downloaded video and non-silent audio",()=>{
  const script=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  for(const required of [
    'tracks.includes("video")','const audioTrack=streams.find(row=>row.codec_type==="audio")',
    'assert.ok(audioTrack',
    'Number(audioTrack.channels),2',
    "pcm.stdout.some(value=>value!==0)","await output.waitFor(",
    "assert.equal(affirmationRequests.length,1)",
  ])assert.ok(script.includes(required),required);
});


test("WebKit export can be cancelled, and microphone speech is not looped",()=>{
  assert.match(studio,/webCodecJobRef\.current\?\.abort\(\)/);
  assert.match(studio,/shouldContinue:\(\)=>!controller\.signal\.aborted/);
  assert.match(studio,/nonLoop:true as const/);
  assert.match(helper,/gain\.gain\.linearRampToValueAtTime\(0,seconds\)/);
});

test("silent WebKit exports H.264 even without AudioEncoder, never fakes voice AAC",()=>{
  assert.match(helper,/supportsLocalWebCodecsMp4\(needsAudio=false\)/);
  assert.match(helper,/!needsAudio \|\| \(/);
  assert.match(helper,/if\(audio\)\{/);
  assert.match(helper,/webcodecs_h264_unsupported/);
  assert.match(helper,/webcodecs_aac_unsupported/);
  assert.match(studio,/!attachedAudio \|\| \(typeof AudioEncoder/);
  assert.match(studio,/typeof VideoFrame!=="undefined"/);
  assert.match(helper,/await canEncodeAudio\("aac",\{/);
  assert.match(helper,/await canEncodeVideo\("avc",\{/);
  assert.match(helper,/quality:new Quality\(\{bitrate:videoBitrate\}\)/);
  assert.doesNotMatch(helper,/codec:"avc1\.42E01E"/,
    "A fixed H.264 level 3.0 rejects portrait Full HD on some WebKit encoders");
  // Only user-selected soundtrack triggers the AAC track; no silent substitution.
  assert.match(helper,/audioBuffer&&audioSource/);
  assert.match(studio,/if\(attachedAudio && !musicSession\)/);
});

test("Safari failure exposes a safe code and an explicit lighter same-renderer retry",()=>{
  assert.match(studio,/const \[webkitRecoveryReason,setWebkitRecoveryReason\] = useState<string\|null>\(null\)/);
  assert.match(studio,/setWebkitRecoveryReason\(null\)/);
  assert.match(studio,/const safariRetryScale=useWebCodecsMp4&&safeWebkitRetry/);
  assert.match(studio,/540\/\(quality==="fullhd"\?1080:720\)/);
  assert.match(studio,/data-video-webkit-safe-retry/);
  assert.match(studio,/onClick=\{\(\)=>void createVideo\(false,false,true\)\}/);
  assert.match(studio,/code==="webcodecs_aac_unsupported"/);
  assert.match(studio,/setNotice\(hint\+" \("\+code\+"\)\."\)/);
  assert.match(studio,/if\(usingFreeFilmCompilation&&!frame\)return false/);
  assert.match(studio,/audio:files.length\?\{files,volume:soundVolume\}:undefined/);
  assert.doesNotMatch(studio,/safeWebkitRetry\s*\?\s*null\s*:\s*attachedAudio/);
});

test("Safari WebCodecs loads the SAME scenario and classical MP3 URL as native audio",()=>{
  const music=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
  assert.match(music,/isScenarioAudioPreset\(preset\)/);
  assert.match(music,/\/audio\/mandala\/scenarios\/" \+ preset \+ "\.mp3"/);
  assert.match(helper,/import \{presetAudioUrl\} from "\.\/local-video-music"/);
  assert.match(helper,/const audioUrl=presetAudioUrl\(entry\.preset as Exclude<AmbientMusic,"none">\)/);
  assert.match(helper,/fetch\(audioUrl,\{/);
  assert.doesNotMatch(helper,/fetch\("\/audio\/mandala\/"\+entry\.preset\+"\.wav"/);
  assert.match(helper,/credentials:"same-origin"/);
  assert.match(helper,/first_party_audio_unavailable/);
  assert.match(studio,/code==="first_party_audio_unavailable"/);
});

test("Safari repair branches must reach real macOS WebKit video/audio acceptance",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  const enabled=(workflow.match(/startsWith\(github\.head_ref, 'fix\/webkit-'\)/g)||[]).length;
  assert.ok(enabled>=2,"Safari repair must run scoped build + macOS WebKit media tests");
  const job=workflow.split("  voice-webkit-macos:")[1];
  assert.ok(job,"WebKit must remain an independent real-media job");
  assert.match(job.split("    runs-on:")[0],/startsWith\(github\.head_ref, 'fix\/webkit-'\)/);
  assert.match(job,/node scripts\/benchmarking\/first-video-live-export\.mjs/);
  assert.match(job,/node scripts\/verify-affirmation-voice-browser\.mjs/);
});
