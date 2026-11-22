import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {shouldAutoRecoverSafariPlayback} from "../lib/mandala/recording-codecs.mjs";
import {requiresRealMediaWebKit} from "../lib/ci/merge-check-light.mjs";

const helper=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
const presetLoader=readFileSync(new URL("../lib/mandala/first-party-video-audio.ts",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("Safari MP4 uses browser-local WebCodecs rather than MediaRecorder",()=>{
  assert.match(helper,/new CanvasSource\(canvas,/);
  assert.match(helper,/new AudioBufferSource\(\{codec:"aac"/);
  assert.match(helper,/new Mp4OutputFormat\(\{fastStart:"in-memory"\}\)/);
  assert.match(helper,/await output\.finalize\(\)/);
  assert.match(studio,/const useWebCodecsMp4=/);
  assert.match(studio,/await import\("@\/lib\/mandala\/webcodecs-mp4-export"\)/);
  assert.match(studio,/if\(useWebCodecsMp4\)/);
  assert.match(studio,/stream = canvas\.captureStream\(framesPerSecond\)/);
});

test("physical-iPhone Ready repair runs the mandatory macOS WebKit video and AAC E2E",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  const job=workflow.split("  voice-webkit-macos:")[1];
  assert.ok(job,"the real native WebKit job is required");
  const gate=job.slice(0,job.indexOf("\n    needs:"));
  assert.match(gate,/github\.event_name == 'pull_request'/);
  assert.match(gate,/github\.event\.pull_request\.draft == false/);
  assert.match(gate,/needs\.webkit_preflight\.outputs\.media_required == 'true'/);
  assert.equal(requiresRealMediaWebKit([
    {filename:'lib/mandala/webcodecs-mp4-export.ts',status:'M'},
    {filename:'components/mandala-free-video-studio.tsx',status:'M'}]),true,
    'physical iPhone MP4 source still requires real macOS WebKit');
  assert.match(job,/needs: \[webkit_preflight\]/);
  assert.match(job,/runs-on: macos-15/);
  assert.match(job,/Build exact voice release candidate/);
  assert.match(job,/WebKit recorded movie contains video and audible consented voice/);
  assert.doesNotMatch(job,/continue-on-error: true/);
});

test("Safari movie retains the real Canvas scene, story, hypno and stage captions",()=>{
  for(const marker of [
    "paintCinematicFrame(ctx,image,effect,time",
    "paintStoryMotifs(ctx,time,appliedStory)",
    "paintHypnoLightOverlay(ctx,time,hypnoLight)",
    "paintSingleVideoTextOverlay(ctx,time,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips,reelModeActive)",
    "paintStageCaptionOverlay(ctx,time,plan,clips,reelSafe)",
    "if(usingFreeFilmCompilation&&!frame&&!hasStoryboardPhotoAt(time))return false",
  ])assert.ok(studio.includes(marker),marker);
});
test("No customer upload, fake video or unbounded output",()=>{
  assert.doesNotMatch(helper,/XMLHttpRequest|navigator\.sendBeacon|\/api\/render/);
  assert.match(presetLoader,/credentials:"omit"/);
  assert.match(helper,/MAX_DURATION=60/);
  assert.match(helper,/MAX_BYTES=80\*1024\*1024/);
  assert.match(helper,/video_encoder_too_slow/);
  assert.match(helper,/video_encoder_timeline_drift/);
  assert.match(helper,/const maxEncoderPresentationLagMs=3000/);
  assert.match(helper,/time\*1000\+decoderHoldMs\+encoderHoldMs\+maxEncoderPresentationLagMs/);
  assert.doesNotMatch(helper,/time\*1000\+decoderHoldMs\+750/,
    "single Safari encoder stalls are not necessarily corrupted frame timestamps");
  assert.match(helper,/seconds\+20\)\*1000\+decoderHoldMs/,
    "whole-export deadline must still reject unbounded stalls");
  assert.match(studio,/frameRate:Math\.min\(\(safeWebkitRetry\|\|isApplePhone\)\?8:10,framesPerSecond\)/,
    "Safari must pace real 10-second H.264+AAC exports without skipping timed scenes");
  assert.match(helper,/const time=i\/frameRate/);
  assert.match(helper,/audio_decode_invalid/);
  assert.match(helper,/source\.start\(startSeconds\)/,
    "Safari AAC must honor the soundtrack offset on the project clock");
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
  assert.match(helper,/gain\.gain\.linearRampToValueAtTime\(laneGain,startSeconds\+fadeIn\)/);
  assert.match(helper,/const baseGain=\(audio\.volume\/100\)\/Math\.sqrt\(audio\.files\.length\)/);
  assert.match(helper,/const laneGain=baseGain\*lanePercent\/100/);
  assert.match(helper,/lanePercent<0\|\|lanePercent>100/);
  assert.match(helper,/const available=seconds-startSeconds/,"near-end audio fades remain within the remaining time");
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
  assert.match(helper,/const withAudio=Boolean\(audio\|\|audioMaster\)/);
  assert.match(helper,/if\(withAudio\)\{[\s\S]*?await canEncodeAudio\("aac"/);
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
  assert.match(studio,/const safariRetryScale=\(isApplePhone\|\|\(useWebCodecsMp4&&safeWebkitRetry\)\)/);
  assert.match(studio,/540\/\(quality==="fullhd"\?1080:720\)/);
  assert.match(studio,/data-video-webkit-safe-retry/);
  assert.match(studio,/onClick=\{\(\)=>void createVideo\(false,false,true\)\}/);
  assert.match(studio,/code==="webcodecs_aac_unsupported"/);
  assert.match(studio,/setNotice\(hint\+" \("\+code\+"\)\."\)/);
  assert.match(studio,/if\(usingFreeFilmCompilation&&!frame&&!hasStoryboardPhotoAt\(time\)\)return false/);
  assert.match(studio,/audio:files.length\?\{files,volume:soundVolume\}:undefined/);
  assert.doesNotMatch(studio,/safeWebkitRetry\s*\?\s*null\s*:\s*attachedAudio/);
});

test("Safari WebCodecs loads the SAME scenario and classical MP3 URL as native audio",()=>{
  const music=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
  assert.match(music,/isScenarioAudioPreset\(preset\)/);
  assert.match(music,/\/audio\/mandala\/scenarios\/" \+ preset \+ "\.mp3"/);
  assert.match(helper,/import \{loadFirstPartyPresetAudioBlob\} from "\.\/first-party-video-audio"/);
  assert.match(presetLoader,/const audioUrl=presetAudioUrl\(preset\)/);
  assert.match(presetLoader,/fetch\(audioUrl,\{/);
  assert.match(presetLoader,/PACKAGED_SOUNDTRACK\.test\(audioUrl\)/);
  assert.match(presetLoader,/mode:"same-origin"/);
  assert.match(presetLoader,/redirect:"error"/);
  assert.match(helper,/loadFirstPartyPresetAudioBlob\(entry\.preset as Exclude<AmbientMusic,"none">\)/);
  assert.doesNotMatch(helper,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon/);
  assert.match(presetLoader,/credentials:"omit"/);
  assert.match(presetLoader,/first_party_audio_unavailable/);
  assert.match(studio,/code==="first_party_audio_unavailable"/);
});

test("Safari repair branches must reach real macOS WebKit video/audio acceptance",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  const enabled=(workflow.match(/startsWith\(github\.head_ref, 'fix\/webkit-'\)/g)||[]).length;
  assert.ok(enabled>=2,"Safari repair must run scoped build + macOS WebKit media tests");
  const job=workflow.split("  voice-webkit-macos:")[1];
  assert.ok(job,"WebKit must remain an independent real-media job");
  assert.match(job.split("    runs-on:")[0],/needs\.webkit_preflight\.outputs\.media_required == 'true'/);
  assert.equal(requiresRealMediaWebKit([{filename:'lib/mandala/webcodecs-mp4-export.ts',status:'M'}]),true,
    'Safari WebCodecs changes must execute macOS regardless of branch name');
  assert.match(job,/node scripts\/benchmarking\/first-video-live-export\.mjs/);
  assert.match(job,/node scripts\/verify-affirmation-voice-browser\.mjs/);
});

// iPhone regression: the previous alternate-WebM button regenerated MP4
// because the Safari WebCodecs branch ignored createVideo(true).
test("explicit Safari WebM retry uses a different recorder, preserves sound",async()=>{
  const {selectWebCodecsForRecording,orderRecordingMimes}=await import("../lib/mandala/recording-codecs.mjs");
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:true,safariWebKit:true}),true);
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:true,safariWebKit:true,preferWebm:true}),false);
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:true,safariWebKit:true,
    procedural:true,proceduralRoute:"webcodecs",preferWebm:true}),false);
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:true,procedural:true,
    proceduralRoute:"webcodecs"}),true);
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:false,safariWebKit:true}),false);
  const formats=orderRecordingMimes({mp4:["video/mp4"],
    webm:['video/webm;codecs="vp8,opus"',"video/webm"],preferWebm:true,
    userAgent:"Mozilla/5.0 (iPhone) AppleWebKit/605.1.15"});
  assert.deepEqual(formats,[],"iPhone never starts a WebM that it cannot play");
  assert.ok(studio.includes("const useWebCodecsMp4=!forceMp4ForRetry&&selectWebCodecsForRecording({"));
  assert.ok(studio.includes("hasWebCodecs,safariWebKit,procedural,proceduralRoute,preferWebm"));
  assert.ok(studio.includes('const mimeTypes = preferWebm\n        ? recordingMimes(Boolean(musicSession),true).filter(mime=>mime.startsWith("video/webm"))'));
  assert.ok(studio.includes("if (musicSession) stream.addTrack(musicSession.track);"));
  assert.ok(studio.includes("onClick={()=>void createVideo(true)}"));
  assert.ok(studio.includes('const extension=isWebm?"webm":"mp4"'));
  assert.ok(studio.includes('if((isApplePhone&&isWebm)||(!isMp4&&!isWebm)){'));
  assert.ok(studio.includes('playbackStatus==="ready"&&result.mode!=="catalog"'));
});

test("hydration progresses Goals → Ideas through a real tap without hidden legacy clicks",()=>{
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const start=browser.indexOf("async function verifyWorkspaceHydration");
  const end=browser.indexOf("// Real guest route browser acceptance",start);
  const flow=browser.slice(start,end);
  const hydrate=flow.indexOf('data-video-studio-hydrated","true"');
  const continueTap=flow.indexOf("await mirror.locator('[data-hh-mirror-next]').click()",hydrate);
  const goal=flow.indexOf('const ideasGoalPane=page.locator',continueTap);
  const chosen=flow.indexOf('data-video-ideas-goal-choice="rest"',goal);
  const next=flow.indexOf('data-video-ideas-goal-next',chosen);
  const personalization=flow.indexOf('data-video-personalization-goal',next);
  const energy=flow.indexOf('data-video-personalization-energy="5"',personalization);
  const montage=flow.indexOf("await montage.tap()",energy);
  assert.ok(start>=0&&end>start&&hydrate>=0&&continueTap>hydrate&&goal>continueTap&&chosen>goal&&next>chosen&&personalization>next&&energy>personalization&&montage>energy,
    "real visitor selects leisure Goal, mood and energy before entering Montage");
  assert.match(flow,/data-video-continue-scenarios/);
  assert.match(flow,/await expect\(allStories\)\.toBeHidden\(\)/);
  assert.doesNotMatch(flow,/await allStories\.click\(\)|\.click\(\{force:true\}\)/);
  assert.match(flow,/data-active-workspace/);
});

test("physical voice WebKit checks real Settings and Audio, exclusive Hypno tabs and Voice",()=>{
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 const settings=browser.indexOf('await openMontageSettingsViaQuality(page);');
 const selectDuration=browser.indexOf('await durationSelect.selectOption("30")',settings);
 const openAudio=browser.indexOf('await montageAudio.click()',selectDuration);
 const phrases=browser.indexOf("const phrases=page.locator",openAudio);
 const reenter=browser.indexOf('await montageAudioAfterExport.click()',phrases);
 const voice=browser.indexOf('const voicePanel=page.locator("[data-video-voice-studio]")',reenter);
 assert.ok(settings>=0&&selectDuration>settings&&openAudio>selectDuration&&phrases>openAudio&&reenter>phrases&&voice>reenter,
   "visitor must use the actual Settings, Audio and Voice before recording the real MP4");
 assert.match(browser,/const hypnoTabs=page\.locator\('\[data-hypno-tabs\]'\)/);
 assert.match(browser,/const visualTab=hypnoTabs\.locator\('\[data-hypno-tab="visual"\]'\)/);
 assert.match(browser,/const audioTab=hypnoTabs\.locator\('\[data-hypno-tab="audio"\]'\)/);
 assert.match(browser,/await expect\(hypnoTabs\.getByRole\("tab"\)\)\.toHaveCount\(3\)/);
  assert.match(browser,/const effectsTab=hypnoTabs\.locator\('\[data-hypno-tab="effects"\]'\)/);
  assert.match(browser,/await effectsTab\.click\(\)/);
  assert.match(browser,/await expect\(effectsGroup\)\.toBeVisible\(\)/);
 assert.match(browser,/await expect\(visualTab\)\.toHaveAttribute\("aria-selected","true"\)/);
 assert.match(browser,/await expect\(audioTab\)\.toHaveAttribute\("aria-selected","true"\)/);
 assert.match(browser,/await balancedLight\.click\(\)/);
 assert.match(browser,/await textPosition\.click\(\)/);
 assert.match(browser,/await expect\(visualGroup\)\.toBeHidden\(\)/);
 assert.match(browser,/await expect\(audioGroup\)\.toBeVisible\(\)/);
 assert.doesNotMatch(browser,/data-video-montage-settings|data-video-basic-tab=|data-video-audio-length="/);
 assert.match(browser,/encoded-audio-verified/);
 // The required browser export must exercise the real Goal → Just make it
 // Express route, then inspect the actual encoded 30-second H.264/AAC file.
 const firstVideo=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
 assert.match(firstVideo,/data-video-request-design\]\[data-video-request-flow="instant"\]/);
 assert.match(firstVideo,/await instant\.tap\(\)/,
   "WebKit physically taps the visible Just make it option");
 assert.match(firstVideo,/await generate\.tap\(\)/,
   "WebKit physically taps the visible one-click Express Generate control");
 assert.doesNotMatch(firstVideo,/data-video-continue-scenarios/,
   "required export does not depend on a hidden legacy Continue button");
 assert.match(firstVideo,/EXPRESS_VIDEO_MUST_BE_30_SECONDS/);
 assert.match(firstVideo,/EXPRESS_VIDEO_MUST_USE_H264/);
 assert.match(firstVideo,/EXPRESS_AUDIO_MUST_USE_AAC/);
 assert.match(firstVideo,/EXPRESS_SCENE_NOT_MOVING/);
 assert.match(firstVideo,/readRealGuestVideo\(page,\{timeout:80000\}\)/);
 assert.match(browser,/assert\.ok\(pcm\.stdout\.some\(value=>value!==0\)/);
});

test("native MP4 retry does not silently rerun Safari WebCodecs after failed WebM",()=>{
  assert.match(studio,/const useWebCodecsMp4=!forceMp4ForRetry&&selectWebCodecsForRecording\(\{/);
  assert.match(studio,/result\.extension==="webm"[\s\S]*?createVideo\(false,true\)/);
  assert.match(studio,/recordingMimes\(Boolean\(musicSession\), preferWebm, forceMp4ForRetry\)/);
  assert.match(studio,/const mimeTypes = preferWebm[\s\S]*?recordingMimes\(Boolean\(musicSession\),true\)\.filter/);
});


test("Safari deferred MP4 decoding requires a real user Play gesture, not a false timeout failure",()=>{
  const start=studio.indexOf('if (!result || playbackStatus !== "checking") return;');
  const end=studio.indexOf('},[result,playbackStatus,locale]);',start);
  assert.ok(start>0&&end>start,"the bounded deferred-decoding check is retained");
  const timer=studio.slice(start,end);
  assert.match(timer,/setNotice\(/,"20s only provides useful visitor guidance");
  assert.doesNotMatch(timer,/setPlaybackStatus\("failed"\)/,
    "a timer cannot pronounce a valid deferred iPhone video corrupt");
  assert.match(studio,/data-video-verify-playback/);
  assert.match(studio,/player\.play\(\)\.then\(\(\)=>confirmVideoPlayback\(player\)\)/);
  assert.match(studio,/video\.videoWidth>0 && video\.videoHeight>0/);
  assert.match(studio,/onError=\{event=>handleNativeVideoPlaybackFailure\(event\.currentTarget\)\}/);
  assert.match(studio,/function handleNativeVideoPlaybackFailure\([\s\S]*?setPlaybackStatus\("failed"\)/,
    "visible and hidden native decoder failures must both reject bad media");
  assert.match(studio,/playbackStatus==="ready"&&\(result\.mode==="catalog"\|\|creditConfirmed\)/,
    "a finished download remains gated by real playback and confirmed video credits");
  const e2e=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.match(e2e,/await verifyPlayback\.click\(\{timeout:2000\}\)/,
    "WebKit acceptance performs a bounded real Play click, never a mock frame");
  assert.match(e2e,/if\(await output\.isVisible\(\)\)return true;/,
    "a playback-ready unmount must require the visible real download control");
  assert.match(e2e,/if\(await verifyPlayback\.isVisible\(\)\)throw error;/,
    "a persistent non-clickable Play button remains a test failure");
  assert.match(e2e,/await output\.waitFor\(\{state:"visible",timeout:45000\}\)/);
});

test("Safari MP4 requires real H264/AAC tracks and decoded beginning/middle/end frames",()=>{
  for(const marker of [
    "new Input({","new BlobSource(new Blob([bytes]",
    "formats:[MP4]","await input.canRead()",
    "input.getPrimaryVideoTrack()","track.getDurationFromMetadata()",
    "input.getPrimaryAudioTrack()","track.canDecode()",
    "new VideoSampleSink(track)","await track.getFirstTimestamp()",
    "input.dispose()","await output.getMimeType()",
    "verifyDecodableMp4Export(bytes,{",
  ])assert.ok(helper.includes(marker),marker);
  const verify=helper.slice(helper.indexOf("async function verifyDecodableMp4Export("),
    helper.indexOf("export async function verifyNativeSafariMp4Tracks"));
  for(const marker of [
    "const checkpoints=[","Math.max(0,first+.05)",
    "Math.max(0,expected.seconds/2)","Math.max(0,expected.seconds-.5)",
    "for(const at of checkpoints)","await sink.getSample(at)",
    "sample.timestamp<at-1.25","sample?.close()",
  ])assert.ok(verify.includes(marker),marker);
  assert.match(helper,/document.createElement\("video"\).canPlayType\(expected.mime\)/);
  assert.match(helper,/video_output_codec_unsupported/);
  assert.match(helper,/video_output_invalid_tracks/);
  assert.match(helper,/video_output_decoder_failed/);
  const verifyAt=helper.indexOf("await verifyDecodableMp4Export(bytes,{");
  assert.ok(verifyAt>helper.indexOf("await output.finalize()"));
  assert.ok(verifyAt<helper.indexOf("onProgress?.(100)"));
});

test("Safari failed encoded MP4 offers native WebM without lost credits",()=>{
  assert.match(helper,/verifyDecodableMp4Export\(bytes,\{/);
  assert.match(studio,/video_output_codec_unsupported/);
  assert.match(studio,/video_output_invalid_tracks/);
  assert.match(studio,/video_output_decoder_failed/);
  assert.match(studio,/canRetryWebm/);
  assert.match(studio,/data-video-webkit-webm-retry/);
  assert.match(studio,/void createVideo\(true\)/);
  assert.match(studio,/if\(playbackStatus==="failed"\)\{/);
  assert.match(studio,/HH_SAFARI_FINAL_PLAYBACK:/);
});

test("real Safari MEDIA_ERR_SRC_NOT_SUPPORTED gets exactly one on-device WebM recovery",async()=>{
  const {shouldAutoRecoverSafariPlayback:recover}=await import("../lib/mandala/recording-codecs.mjs");
  const params={safariWebKit:true,format:"mp4",errorCode:4,nativeWebm:true,
    userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15"};
  assert.equal(recover(params),true);
  assert.equal(recover({...params,errorCode:3}),true,"actual native decode errors also permit one WebM retry");
  for(const invalid of [
    {alreadyAttempted:true},{format:"webm"},
    {errorCode:0},{nativeWebm:false},{safariWebKit:false},{catalog:true},
    {userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15"},
    {userAgent:"Mozilla/5.0 (iPad; CPU OS 26_1 like Mac OS X) AppleWebKit/605.1.15"},
    {userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15",maxTouchPoints:5},
  ])assert.equal(recover({...params,...invalid}),false,JSON.stringify(invalid));
  assert.match(studio,/const autoWebmRetryForRef=useRef<string\|null>\(null\)/);
  assert.match(studio,/autoWebmRetryForRef\.current=signature/);
  assert.match(studio,/autoWebmRetryUrlRef\.current=result\.url/);
  assert.match(studio,/if\(held&&creditValidRef\.current&&!\(await releaseCredit\(held\)\)\)return;/);
  assert.match(studio,/setPendingCompatibleRetry\(signature\)/);
  assert.match(studio,/void createVideo\(true\)/);
  assert.match(studio,/HH_SAFARI_FINAL_PLAYBACK:/);
});

test("guest real encoded video must keep Save behind sign-in and preserve physical codec acceptance",()=>{
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 const guest=browser.indexOf('const guestPreview=page.locator("[data-video-guest-preview-actions]")');
 const auth=browser.indexOf('await expect(output).toBeHidden()',guest);
 const blob=browser.indexOf('const localMovie=await page.evaluate(async()=>',auth);
 const parsed=browser.indexOf('bytes=Buffer.from(localMovie.base64,"base64")',blob);
 const realProbe=browser.indexOf('const probe=spawnSync("ffprobe"',parsed);
 const realAudio=browser.indexOf('const pcm=spawnSync("ffmpeg"',realProbe);
 assert.ok(guest>=0&&auth>guest&&blob>auth&&parsed>blob&&realProbe>parsed&&realAudio>realProbe);
 assert.match(browser,/data-video-guest-save-hint/);
 assert.match(browser,/data-video-save-direct/);
 assert.match(browser,/GUEST_REAL_VIDEO_PREVIEW_INVALID/);
 assert.match(browser,/GUEST_REAL_VIDEO_BLOB_UNAVAILABLE/);
 assert.match(browser,/video\.readyState<2/);
 assert.match(browser,/video\.videoWidth===0/);
 assert.match(browser,/!video\.currentSrc\.startsWith\("blob:"\)/);
 assert.match(browser,/guest-real-encoded-mp4-auth-gate-verified/);
 assert.match(browser,/data-video-ready/);
 assert.match(browser,/data-ready-save/);
 assert.match(browser,/data-ready-save-gate/);
 assert.match(browser,/ready-real-encoded-mp4-auth-gate-verified/);
 assert.match(browser,/__hhRecordedVideoBlobs/);
 assert.match(browser,/await output\.click\(\)/);
 assert.match(browser,/delivery\.locator\("\[data-video-save-direct-choice\]"\)\.click\(\)/);
 assert.match(browser,/assert\.ok\(pcm\.stdout\.some\(value=>value!==0\)/);
 assert.doesNotMatch(browser,/force:true|setCreditSession\("signed_in"\)/);
});


test("Stories WebKit enters Ideas via visible controls after native Goal quiz",()=>{
 const source=readFileSync(new URL("../scripts/benchmarking/verify-five-scene-stories-browser.mjs",import.meta.url),"utf8");
 assert.match(source,/completeThreeStepGoalsQuiz\(page,\{engine:'webkit'\}\)/);
 assert.match(source,/const visibleNext=await advance\.isVisible\(\)\?advance:page\.locator\('\[data-video-quick-control="phrases"\]'\)/);
 assert.match(source,/await visibleNext\.tap\(\)/);
 assert.match(source,/getAttribute\('aria-pressed'\)==='true'/);
 assert.match(source,/readRealGuestVideo/);
 assert.doesNotMatch(source,/await advance\.waitFor\(\{state:'visible'|advance\.tap\(\{force:true\}\)/);
});

test("Stories WebKit requires filmed source selection before Extra, not blocked editorial Quality",()=>{
 const source=readFileSync(new URL("../scripts/benchmarking/verify-five-scene-stories-browser.mjs",import.meta.url),"utf8");
 const settings=source.indexOf("const storySettings=page.locator");
 const open=source.indexOf("await storySettings.tap()",settings);
 const choose=source.indexOf("await page.locator('[data-video-stories-create]').click()",open);
 const licensed=source.indexOf("assert.ok(approved.has(id)",choose);
 const extra=source.indexOf("data-video-stories-to-extra",licensed);
 const generate=source.indexOf('data-video-montage-pro-choice="free"',extra);
 assert.ok(settings>=0&&open>settings&&choose>open&&licensed>choose&&extra>licensed&&generate>extra,
  "must select real reviewed films before Extra and generation");
 assert.doesNotMatch(source,/await quality\.tap\(\)|\.(?:click|tap)\(\{[^}]*\bforce:\s*true/,
  "never force the pending Story Quality CTA or synthetic source state");
 assert.match(source,/readRealGuestVideo/,"real WebKit movie and audio remain mandatory");
});

test("five-scene Story accepts two real touches: FREE to Ready, then Generate before MP4",()=>{
 const source=readFileSync(new URL("../scripts/benchmarking/verify-five-scene-stories-browser.mjs",import.meta.url),"utf8");
 const stages=[
   "const free=page.locator", "await free.tap({timeout:30000})",
   "const readyChoice=page.locator", "const readyGenerate=readyChoice.locator",
   "await readyGenerate.tap({timeout:30000})", "const safeExportState=",
   "captured=await readRealGuestVideo", "assert.equal(captured.extension,'mp4'",
   "assert.equal(video.codec_name,'h264'", "assert.equal(audio.codec_name,'aac'",
 ];
 let previous=-1;
 for(const marker of stages){const i=source.indexOf(marker,previous+1);
  assert.ok(i>previous,"must require real Ready gesture and physically decoded video: "+marker);
  previous=i;}
 assert.match(source,/STORIES_READY_GENERATE_MUST_BE_ENABLED/);
 assert.match(source,/STORIES_READY_MUST_KEEP_ALL_FIVE_LICENSED_SOURCES/);
 assert.match(source,/STORIES_READY_GENERATE_NOT_STARTED/);
 assert.doesNotMatch(source,/STORIES_FREE_NATIVE_TAP_NOT_STARTED|\.tap\(\{force:true\}\)/);
});

test("original-motion WebKit uses native Goal and personalization before actual export",()=>{
 const script=readFileSync(new URL("../scripts/benchmarking/verify-original-motion-export.mjs",import.meta.url),"utf8");
 const markers=["await completeThreeStepGoalsQuiz", "const ideasGoal=", "const quiz=", "const conceptPanel=", "const addVideo=", "const readyGenerate", "let captured", "readRealGuestVideo(page,{timeout: 150000})"];
 let prev=-1;
 for(const marker of markers){const at=script.indexOf(marker,prev+1);
  assert.ok(at>prev,"real guest MP4 journey preserves "+marker);prev=at;}
 assert.match(script,/GOALS_MUST_OPEN_IDEAS/);
 assert.match(script,/APPROVED_CONCEPT_MUST_PERSIST/);
 assert.doesNotMatch(script,/\.(?:click|tap)\(\{[^}]*\bforce:\s*true|setIdeasProfileConfirmed\(true\)/,
  "do not force browser gestures or mutate user consent");
});

test("WebKit traverses Ideas Personalization and Concept before consented Voice/My Voice",()=>{
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 const modes=browser.indexOf('const ideasModes=phrases.locator("[data-video-ideas-tabs]")');
 const personal=browser.indexOf('const personalTab=ideasModes.locator',modes);
 const quiz=browser.indexOf('const nextQuiz=personalQuiz.locator',personal);
 const fourth=browser.indexOf('toHaveAttribute("data-video-personalization-step","4")',quiz);
 const concept=browser.indexOf('await expect(conceptTab).toHaveAttribute("aria-pressed","true")',fourth);
 const back=browser.indexOf('await personalTab.click()',concept);
 const opened=browser.indexOf('await advancedText.click()',back);
 const voice=browser.indexOf('await voiceModeButton.click()',opened);
 const my=browser.indexOf('await myVoiceModeButton.click()',voice);
 const record=browser.indexOf('const recordEntry=page.locator',my);
 const tap=browser.indexOf('await recordEntry.click()',record);
 const phrase=browser.indexOf('const phraseSelector=page.locator',tap);
 const consent=browser.indexOf('await narrationConsent.tap()',phrase);
 assert.ok(modes>=0&&personal>modes&&quiz>personal&&fourth>quiz&&concept>fourth&&back>concept&&
   opened>back&&voice>opened&&my>voice&&record>my&&tap>record&&
   phrase>tap&&consent>phrase,"real WebKit route must use visible controls before TTS consent");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,3);
 assert.match(studio,/data-video-ideas-goal-panel hidden=\{ideasSubtab!=="goal"\}/);
 assert.match(studio,/data-video-ideas-recording-open=\{ideasVoiceAdvancedOpen\?"true":"false"\}/);
 assert.match(studio,/data-video-ideas-voice-mode="my-voice"/);
 assert.doesNotMatch(browser,/await advancedVoice\.locator\(":scope > summary"\)\.click\(\)/);
 for(const required of ["data-video-affirmation-voice-preview","data-hypno-approve",
  "voice-wav-ready","hypno-audio-effects-rendered","encoded-audio-verified",
  'spawnSync("ffprobe"','spawnSync("ffmpeg"'])
  assert.ok(browser.includes(required),"do not lose real media, rights and consent proof: "+required);
});

test("failed Safari output hides guest Watch and labels the result as a playback failure",()=>{
  const result=studio.slice(studio.indexOf('id="personal-video-result"'));
  assert.match(result,/playbackStatus==="failed"\?\(locale==="ru"\?"Ошибка воспроизведения видео"/);
  assert.match(result,/locale==="es"\?"Error al reproducir el vídeo":"Video playback failed"/);
  assert.match(result,/playbackStatus!=="failed"&&result\.mode!=="catalog"&&creditCatalog\?\.chargeRequired&&creditSession!=="signed_in"/);
  // Until the first decoded frame Safari still needs an explicit user Play gesture.
  assert.match(result,/data-video-guest-play/);
  assert.match(result,/data-video-verify-playback/);
  assert.match(result,/data-video-playback-error/);
  assert.match(result,/playbackStatus==="ready"&&result\.mode!=="catalog"&&creditConfirmed/);
});


test("iPhone encoder backlog is budgeted consistently with the pacing clock",()=>{
  // At 20% of a 20-second film, 3.5s of actual native H.264 encoder work
  // used to be counted as corrupt PTS although the frame timestamps are valid.
  const ptsMs=4000,decoderHoldMs=0,encoderHoldMs=3500,elapsedMs=7600;
  assert.ok(elapsedMs>ptsMs+decoderHoldMs+3000,"the old guard falsely rejects this movie");
  assert.ok(elapsedMs<ptsMs+decoderHoldMs+encoderHoldMs+3000,"encoder work is already paced");
  assert.match(helper,/time\*1000\+decoderHoldMs\+encoderHoldMs\+maxEncoderPresentationLagMs/);
  assert.match(helper,/seconds\+20\)\*1000\+decoderHoldMs/,"whole-export deadline remains bounded");
  assert.match(helper,/const time=i\/frameRate/,"presentation timestamps stay real");
  assert.match(helper,/if\(!decodedRealFrame\)throw new Error\("licensed_scene_frame_unavailable"\)/);
});


test("native Safari decode errors recover only into a verified alternate and never loop",()=>{
 for(const errorCode of [3,4]){
  assert.equal(shouldAutoRecoverSafariPlayback({safariWebKit:true,format:"mp4",errorCode,
    nativeWebm:true,alreadyAttempted:false,catalog:false}),true);
  assert.equal(shouldAutoRecoverSafariPlayback({safariWebKit:true,format:"mp4",errorCode,
    nativeWebm:true,alreadyAttempted:true}),false);
  assert.equal(shouldAutoRecoverSafariPlayback({safariWebKit:true,format:"mp4",errorCode,
    nativeWebm:false}),false);
 }
 assert.equal(shouldAutoRecoverSafariPlayback({safariWebKit:true,format:"webm",errorCode:3,nativeWebm:true}),false);
 assert.equal(shouldAutoRecoverSafariPlayback({safariWebKit:true,format:"mp4",errorCode:2,nativeWebm:true}),false);
 assert.equal(shouldAutoRecoverSafariPlayback({safariWebKit:false,format:"mp4",errorCode:4,nativeWebm:true}),false);
});


test("one iPhone hardware fallback keeps the same reserved credit and every real scene",()=>{
 const start=studio.indexOf("if(useWebCodecsMp4){");
 const end=studio.indexOf("stream = canvas.captureStream(framesPerSecond)",start);
 assert.ok(start>0&&end>start);
 const branch=studio.slice(start,end);
 assert.match(branch,/const encodeCanvasMovie=async \(lighter=false\)=>\{/);
  assert.match(branch,/const blob=await encodeLocalWebCodecsMp4\(\{/);
  assert.match(branch,/renderFrame:time=>\{/);
 assert.match(branch,/blob=await encodeCanvasMovie\(\)/);
 assert.match(branch,/blob=await encodeCanvasMovie\(true\)/);
  assert.match(branch,/\.\.\.\(lighter\?\{frameRate:8\}:\{\}\)/);
 assert.match(branch,/const scale=540\/\(quality==="fullhd"\?1080:720\)/);
 assert.match(branch,/compatibilityExportRef\.current=true/);
 assert.match(branch,/controller\.signal\.aborted/);
 assert.doesNotMatch(branch,/videoCreditRequest\("hold"|appFetch\("render"/);
 assert.match(branch,/if\(usingFreeFilmCompilation&&!frame&&!hasStoryboardPhotoAt\(time\)\)return false/);
 assert.match(branch,/paintSingleVideoTextOverlay\(ctx,time,singleTextSource/);
 assert.match(branch,/audio:files\.length\?\{files,volume:soundVolume\}:undefined/);
});

test("Safari accepts longer-than-180s licensed MP3 music and retains only its audible excerpt",()=>{
  // This formerly rejected valid 4–8-minute classical scores even when the
  // requested MP4 was only 20–30 seconds long.
  assert.doesNotMatch(helper,/decoded\.duration>180/);
  assert.match(helper,/decoded\.duration<=0/);
  assert.match(helper,/if\(entry\.loop && decoded\.duration>seconds-startSeconds\)/);
  assert.match(helper,/Math\.ceil\(\(seconds-startSeconds\)\*decoded\.sampleRate\)/);
  assert.match(helper,/offline\.createBuffer\(decoded\.numberOfChannels,frames,decoded\.sampleRate\)/);
  assert.match(helper,/excerpt\.copyToChannel\(decoded\.getChannelData\(channel\)\.subarray\(0,frames\),channel\)/);
  assert.match(helper,/decoded=excerpt/);
  assert.match(helper,/source\.loop=entry\.loop/);
  assert.match(helper,/if\(!entry\.loop && "file" in entry && decoded\.duration > seconds-startSeconds \+ \.10\)/,
    "non-looped narration must still reject truncation");
  assert.match(helper,/narration_longer_than_video/);
  assert.match(helper,/audio_size_invalid/);
  assert.match(presetLoader,/first_party_audio_unavailable/);
  assert.match(helper,/audioSource\.add\(audioBuffer\)/,"AAC remains required for selected music");
});

test("physical iPhone gets one 540p H264/AAC encode, never auto-unplayable WebM",async()=>{
  const {orderRecordingMimes,prefersSafariWebm,isAppleMobileDevice,
    shouldAutoRecoverSafariPlayback}=await import("../lib/mandala/recording-codecs.mjs");
  const iphone="Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15";
  const ipadDesktop="Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15";
  assert.equal(isAppleMobileDevice(iphone,0),true);
  assert.equal(isAppleMobileDevice(ipadDesktop,5),true);
  assert.equal(prefersSafariWebm(iphone,0),false);
  assert.equal(prefersSafariWebm(ipadDesktop,5),false);
  const args={mp4:['video/mp4;codecs="avc1.42E01E,mp4a.40.2"'],
    webm:['video/webm;codecs="vp8,opus"'],userAgent:iphone};
  assert.deepEqual(orderRecordingMimes(args),args.mp4);
  assert.deepEqual(orderRecordingMimes({...args,preferWebm:true}),[]);
  assert.deepEqual(orderRecordingMimes({...args,userAgent:ipadDesktop,maxTouchPoints:5,preferWebm:true}),[]);
  assert.equal(shouldAutoRecoverSafariPlayback({safariWebKit:true,format:"mp4",errorCode:4,
    nativeWebm:true,userAgent:iphone}),false);
  assert.match(studio,/const isApplePhone=\/iPhone\|iPad\|iPod\/i.test\(ua\)/);
  assert.match(studio,/safariRetryScale=\(isApplePhone\|\|\(useWebCodecsMp4&&safeWebkitRetry\)\)/);
  assert.match(studio,/if\(!safariWebKit\|\|isApplePhone\|\|safeWebkitRetry\|\|!recoverable/);
  assert.match(studio,/userAgent:ua,maxTouchPoints:navigator.maxTouchPoints/);
  assert.match(helper,/avc1\.42001f/);
  assert.match(helper,/selectedAvcCodec\?\{fullCodecString:selectedAvcCodec\}:\{\}/);
  assert.match(helper,/const h264=baselineSupported\|\|await canEncodeVideo\("avc",videoConfig\)/);
  assert.match(studio,/creditValidRef\.current=Boolean\(creditOpRef\.current\)/);
  assert.match(studio,/if\(creditOpRef\.current&&!creditValidRef\.current\)/);
});

test("real iPhone prefers native playable MP4 and uses WebCodecs only as an explicit alternate",async()=>{
  const {selectWebCodecsForRecording:select}=await import("../lib/mandala/recording-codecs.mjs");
  const phone="Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15";
  const ipad="Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15";
  const safari={hasWebCodecs:true,safariWebKit:true,procedural:true,proceduralRoute:"native"};
  assert.equal(select({...safari,nativeMp4Available:true,userAgent:phone}),false,
    "native AVC/AAC source is the FIRST, single iPhone encoder");
  assert.equal(select({...safari,nativeMp4Available:false,userAgent:phone}),true,
    "missing native MP4 retains the existing WebCodecs path");
  assert.equal(select({...safari,nativeMp4Available:true,userAgent:phone,forceWebCodecs:true}),true,
    "a user explicitly chooses the different fallback encoder, never an automatic duplicate");
  assert.equal(select({...safari,nativeMp4Available:true,userAgent:ipad,maxTouchPoints:5}),false);
  assert.equal(select({...safari,nativeMp4Available:true,userAgent:ipad,maxTouchPoints:0}),true,
    "desktop macOS WebKit keeps its existing real-media CI path");
  assert.equal(select({...safari,nativeMp4Available:true,userAgent:phone,preferWebm:true}),false,
    "iPhone WebM is never an automatic escape hatch");
  assert.match(studio,/MediaRecorder\.isTypeSupported\("video\/mp4"\)/);
  assert.match(studio,/nativeMp4Available:nativeAppleMp4Available/);
  assert.match(studio,/lastExportEngineRef\.current=useWebCodecsMp4\?"webcodecs":"native"/);
  assert.match(studio,/const framesPerSecond=isApplePhone\?8/);
  assert.match(studio,/videoBitsPerSecond:isApplePhone\?1_400_000/);
  assert.match(studio,/mime===explicitAvcMime\|\|\(nativeAppleMp4Available&&mime==="video\/mp4"\)/);
  assert.match(studio,/if\(iphoneWebCodecsFallbackAvailable\)void createVideo\(false,false,true,true\)/);
  assert.match(studio,/if\(creditOpRef\.current\)return/);
  assert.match(studio,/if\(held&&creditValidRef\.current&&!\(await releaseCredit\(held\)\)\)return;/);
});

test("Safari native MP4 completion is bounded after 97% and releases failed holds",()=>{
 assert.match(studio,/finalizeTimeout\?: number/);
 assert.match(studio,/job\.finalizeTimeout=window\.setTimeout\(/);
 assert.match(studio,/\(duration\+25\)\*1000/);
 assert.match(studio,/if\(job\.finalizeTimeout!==undefined\)window\.clearTimeout\(job\.finalizeTimeout\)/);
 assert.match(studio,/HH_SAFARI_MP4_FINALIZATION_TIMEOUT/);
 assert.match(studio,/recorder\.ondataavailable=null;recorder\.onerror=null;recorder\.onstop=null/);
 assert.match(studio,/setRecording\(false\);setReadyGenerationPending\(false\)/);
 assert.match(studio,/setProgress\(0\);setPlaybackStatus\("failed"\);setExportUnavailable\(true\)/);
 assert.match(studio,/withLocalMediaDeadline\(\s*verifyNativeSafariMp4Tracks\(blob,Boolean\(job\.musicSession\)\),15000\)/);
 assert.match(studio,/withLocalMediaDeadline\(encoded\.slice\(0,12\)\.arrayBuffer\(\),12000\)/);
 assert.match(studio,/if\(now-start>=duration\*1000\)/);
});

test("iPhone native stop is idempotent: do not kill tracks before final MP4 onstop",()=>{
 assert.match(studio,/stopRequested\?: boolean/);
 const start=studio.indexOf("function stopJob(job: Job, cancelled: boolean)");
 const end=studio.indexOf("\n}\n",start);
 assert.ok(start>0&&end>start,"one original MediaRecorder stop helper");
 const functionBody=studio.slice(start,end);
 assert.match(functionBody,/job\.cancelled=job\.cancelled\|\|cancelled/);
 assert.match(functionBody,/if\(job\.stopRequested\)return;/);
 assert.match(functionBody,/job\.stopRequested=true;/);
 assert.ok(functionBody.indexOf("if(job.stopRequested)return;")<
   functionBody.indexOf("job.recorder.stop()"),
   "a repeated timeout or frame callback cannot stop input tracks before onstop");
 assert.match(studio,/recorder\.onstop = async \(\) => \{\s*if\(job\.finalizeTimeout!==undefined\)/);
 assert.match(studio,/job\.stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\);/);
 assert.match(studio,/job\.finalizeTimeout=window\.setTimeout\(/);
});

test("physical iPhone native MP4 is fast-start normalized and genuinely decoded before Ready",()=>{
  assert.match(helper,/export async function normalizeNativeSafariMp4ForPlayback/);
  assert.match(helper,/new Mp4OutputFormat\(\{fastStart:"in-memory"\}\)/);
  assert.match(helper,/const conversion=await Conversion\.init\(/);
  assert.match(helper,/await conversion\.execute\(\)/);
  assert.match(helper,/new Blob\(\[bytes\],\{type:"video\/mp4"\}\)/);
  assert.match(helper,/const sink=new VideoSampleSink\(track\)/);
  assert.match(helper,/await sink\.getSample\(at\)/);
  assert.match(helper,/sample\?\.close\(\)/);
  assert.match(helper,/end<expectedSeconds-2\|\|end>expectedSeconds\+2/);
  assert.match(helper,/requireAudio&&\(!audio\|\|await audio\.getCodec\(\)!=="aac"\)/);
  assert.match(studio,/normalizeNativeSafariMp4ForPlayback\(blob,Boolean\(job\.musicSession\),duration\),30000/);
  assert.match(studio,/blob=await withLocalMediaDeadline\(/);
  assert.match(studio,/setResult\(\{url:URL\.createObjectURL\(blob\)/);
  assert.match(studio,/const nativeSafariMp4RejectedRef=useRef\(false\)/);
  assert.match(studio,/nativeSafariMp4RejectedRef\.current=true/);
  assert.doesNotMatch(studio,/hh_safari_native_mp4_rejected_v1|sessionStorage/);
  assert.match(studio,/forceWebCodecs:forceWebCodecs\|\|nativeRejectedOnThisDevice/);
  // No automatic second video export, URL upload, or second credit reservation.
  assert.doesNotMatch(helper,/fetch\(\s*["']\/api\/render|navigator\.sendBeacon/);
});

test("native finalization holds the export slot and discards a cancelled MP4", async () => {
  const start = studio.indexOf("      recorder.onstop = async () => {");
  const body = studio.slice(start, studio.indexOf("\n      };", start) + 8)
    .replaceAll('await import("@/lib/mandala/webcodecs-mp4-export")', "media");
  const run = new Function("env", `with (env) { ${body} }`);
  const job = {stream:{getTracks:()=>[]}, musicSession:null, cancelled:false};
  const jobRef = {current:job};
  const chunks = [new Blob([Uint8Array.of(0,0,0,12,102,116,121,112,0,0,0,0)])];
  let settle;
  let entered;
  const normalizing = new Promise(resolve => { entered = resolve; });
  const pending = new Promise(resolve => { settle = resolve; });
  const released = [];
  const recording = [];
  const readyPending = [];
  const recorder = {mimeType:"video/mp4"};
  run({
    recorder, job, jobRef, chunks, Blob, Uint8Array,
    aliveRef:{current:true}, sourceRef:{current:"source"}, snapshotKey:"source",
    setProgress:()=>{}, isApplePhone:true, duration:30,
    withLocalMediaDeadline:promise=>promise,
    media:{
      verifyNativeSafariMp4Tracks:async()=>{},
      normalizeNativeSafariMp4ForPlayback:()=>{ entered(); return pending; }
    },
    creditOpRef:{current:"reservation"}, creditValidRef:{current:false},
    releaseCredit:id=>released.push(id), setRecording:value=>recording.push(value),
    setReadyGenerationPending:value=>readyPending.push(value),
    setResult:()=>assert.fail("cancelled export must never publish")
  });
  const finished = recorder.onstop();
  await normalizing;
  assert.equal(jobRef.current, job);
  assert.deepEqual(recording, []);
  job.cancelled = true;
  settle(new Blob(["normalized"]));
  await finished;
  assert.equal(jobRef.current, null);
  assert.equal(chunks.length, 0);
  assert.deepEqual(released, ["reservation"]);
  assert.deepEqual(recording, [false]);
  assert.deepEqual(readyPending, [false]);
});

test("Safari and local WebCodecs exports decode first/middle/last actual MP4 samples before Ready",()=>{
  const verify=helper.split("async function verifyDecodableMp4Export(")[1]
    .split("export async function verifyNativeSafariMp4Tracks")[0];
  const native=helper.split("export async function normalizeNativeSafariMp4ForPlayback(")[1]
    .split("/** A real H.264/AAC video/audio MP4.")[0];
  assert.match(verify,/const checkpoints=\[/);
  assert.match(verify,/expected\.seconds\/2/);
  assert.match(verify,/expected\.seconds-\.5/);
  assert.match(verify,/await sink\.getSample\(at\)/);
  assert.match(verify,/sample\.codedWidth!==expected\.width/);
  assert.match(verify,/sample\.timestamp<at-1\.25/);
  assert.match(verify,/sample\?\.close\(\)/);
  assert.match(native,/Math\.max\(0,end\/2\)/);
  assert.match(native,/Math\.max\(0,end-\.5\)/);
  assert.match(native,/sample\.timestamp<at-1\.25/);
  assert.match(native,/sample\?\.close\(\)/);
  assert.match(studio,/playbackStatus==="ready"/,
    "Ready continues to require actual playback and credit confirmation");
});

test("iPhone native MP4 preserves a verified playable file before remux",()=>{
  const part=helper.split("export async function normalizeNativeSafariMp4ForPlayback(")[1]
    .split("/** A real H.264/AAC video/audio MP4.")[0];
  for(const text of ["nativeSafariMp4HasPlayableTimeline","await awaitEvent(\"loadeddata\"",
    "await awaitEvent(\"seeked\"","seconds/2","seconds-.55",
    "URL.revokeObjectURL(objectUrl)"])
    assert.ok(helper.includes(text),text);
  assert.ok(part.includes('requireAudio&&(!audio||await audio.getCodec()!=="aac")'));
  assert.ok(part.includes("if(await nativeSafariMp4HasPlayableTimeline(nativeBlob,expectedSeconds))"));
  assert.ok(part.includes("return nativeBlob;"));
  assert.ok(part.indexOf("nativeSafariMp4HasPlayableTimeline(nativeBlob,expectedSeconds)")<
    part.indexOf("Conversion.init("));
  assert.ok(part.includes("await conversion.execute()"));
  assert.ok(studio.includes("HH_SAFARI_NATIVE_MP4_FINALIZE:"));
  assert.ok(studio.includes('"native_mp4_remux_failed"'));
  assert.ok(studio.includes('"native_mp4_output_unplayable"'));
});
test("verified Ready file offers real local Download and iOS Share",()=>{
  const ready=readFileSync(new URL("../components/mandala-video-ready.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  for(const text of ["const completed=Boolean(verified&&video)",
    "{video?.blob?<div className={css.localFileActions}","data-ready-direct-download",
    "download={\"holistic-house-personal.\"+video.extension}","data-ready-share-file",
    "files:[file]","navigator.canShare(payload)","navigator.share(payload)"])
    assert.ok(ready.includes(text),text);
  assert.ok(css.includes(".localFileActions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))"));
});

test("real WebKit Ready export downloads actual encoded MP4 bytes, not just preview",()=>{
  const acceptance=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
  for(const marker of [
    "data-ready-direct-download",
    '[data-ready-state="complete"]',
    "page.waitForEvent('download'",
    "directDownload.tap()",
    "download.suggestedFilename()",
    "download.createReadStream()",
    "assert.deepEqual(savedBytes,bytes",
    "row.downloadedVideo=true",
  ])assert.ok(acceptance.includes(marker),marker);
  assert.match(acceptance,/row\.anonymousSaveAuthGateVerified=captured\.authGateVerified/);
  assert.match(acceptance,/assert\.deepEqual\(savedBytes,bytes,'VERIFIED_READY_DOWNLOAD_BYTES_DIFFER_FROM_MP4'\)/);
});

test("WebKit voice transcription continues to Montage via genuine visible touch",()=>{
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const flow=browser.split("async function verifyWorkspaceHydration(browser,locale)")[1]
    .split("// Real guest route browser acceptance")[0];
  assert.ok(flow.includes('if(browser.browserType().name()==="webkit")await nextWithSpeech.tap()'),
    "native WebKit touch must invoke original audio-to-montage handler");
  assert.ok(flow.includes('else await nextWithSpeech.click()'));
  assert.ok(flow.includes('await expect(nextWithSpeech).toBeEnabled()'));
  assert.ok(flow.includes('await expect(studio).toHaveAttribute("data-active-workspace","editor")'));
  assert.ok(flow.includes('await expect(page.locator(\'[data-video-montage-tab="concept"]\')).toHaveAttribute("aria-pressed","true")'));
  assert.doesNotMatch(flow,/nextWithSpeech\.click\(\{force:true\}\)|nextWithSpeech\.evaluate\(/);
});
