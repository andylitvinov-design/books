import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const helper=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
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
test("Safari movie retains the real Canvas scene, story, hypno and stage captions",()=>{
  for(const marker of [
    "paintCinematicFrame(ctx,image,effect,time",
    "paintStoryMotifs(ctx,time,appliedStory)",
    "paintHypnoLightOverlay(ctx,time,hypnoLight)",
    "paintSingleVideoTextOverlay(ctx,time,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips)",
    "paintStageCaptionOverlay(ctx,time,plan,clips)",
    "if(usingFreeFilmCompilation&&!frame&&!hasStoryboardPhotoAt(time))return false",
  ])assert.ok(studio.includes(marker),marker);
});
test("No customer upload, fake video or unbounded output",()=>{
  assert.doesNotMatch(helper,/XMLHttpRequest|navigator\.sendBeacon|\/api\/render/);
  assert.match(helper,/credentials:"same-origin"/);
  assert.match(helper,/MAX_DURATION=60/);
  assert.match(helper,/MAX_BYTES=80\*1024\*1024/);
  assert.match(helper,/video_encoder_too_slow/);
  assert.match(helper,/video_encoder_timeline_drift/);
  assert.match(helper,/const maxEncoderPresentationLagMs=3000/);
  assert.match(helper,/time\*1000\+decoderHoldMs\+maxEncoderPresentationLagMs/);
  assert.doesNotMatch(helper,/time\*1000\+decoderHoldMs\+750/,
    "single Safari encoder stalls are not necessarily corrupted frame timestamps");
  assert.match(helper,/seconds\+20\)\*1000\+decoderHoldMs/,
    "whole-export deadline must still reject unbounded stalls");
  assert.match(studio,/frameRate:Math\.min\(safeWebkitRetry\?8:10,framesPerSecond\)/,
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
  assert.match(studio,/if\(usingFreeFilmCompilation&&!frame&&!hasStoryboardPhotoAt\(time\)\)return false/);
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
  assert.deepEqual(formats,['video/webm;codecs="vp8,opus"',"video/webm"]);
  assert.ok(studio.includes("const useWebCodecsMp4=!forceMp4ForRetry&&selectWebCodecsForRecording({"));
  assert.ok(studio.includes("hasWebCodecs,safariWebKit,procedural,proceduralRoute,preferWebm"));
  assert.ok(studio.includes('const mimeTypes = preferWebm\n        ? recordingMimes(Boolean(musicSession),true).filter(mime=>mime.startsWith("video/webm"))'));
  assert.ok(studio.includes("if (musicSession) stream.addTrack(musicSession.track);"));
  assert.ok(studio.includes("onClick={()=>void createVideo(true)}"));
  assert.ok(studio.includes('const extension=isWebm?"webm":"mp4"'));
  assert.ok(studio.includes('if(!isMp4&&!isWebm){'));
  assert.ok(studio.includes('playbackStatus==="ready"&&result.mode!=="catalog"'));
});

test("hydration progresses Goals → Ideas through a real tap without hidden legacy clicks",()=>{
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const start=browser.indexOf("async function verifyWorkspaceHydration");
  const end=browser.indexOf("// Real guest route browser acceptance",start);
  const flow=browser.slice(start,end);
  const hydrate=flow.indexOf('data-video-studio-hydrated","true"');
  const continueTap=flow.indexOf("await continueToIdeas.click()",hydrate);
  const refinement=flow.indexOf('await refinement.locator(":scope > summary").click()',continueTap);
  const montage=flow.indexOf("await montage.tap()",refinement);
  assert.ok(start>=0&&end>start&&hydrate>=0&&continueTap>hydrate&&refinement>continueTap&&montage>refinement,
    "actual visible Goals tap must reveal Ideas then the user-opened refinement before Montage");
  assert.match(flow,/data-video-continue-scenarios/);
  assert.match(flow,/await expect\(allStories\)\.toBeHidden\(\)/);
  assert.doesNotMatch(flow,/await allStories\.click\(\)|\.click\(\{force:true\}\)/);
  assert.match(flow,/data-active-workspace/);
});

test("physical voice WebKit checks real Settings and Audio, exclusive Hypno tabs and Voice",()=>{
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 const settings=browser.indexOf('await openMontageSettingsViaQuality(page);');
 const selectDuration=browser.indexOf('await durationSelect.selectOption("10")',settings);
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
 // Preserve the real first guest movie flow on the current tabbed Montage.
 const firstVideo=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
 assert.match(firstVideo,/const montageStyle=page\.locator\('\[data-video-montage-tab="effects"\]'\)/);
 assert.match(firstVideo,/await montageStyle\.click\(\)/);
 assert.match(firstVideo,/await page\.locator\('\[data-video-ideas-tab="concept"\]'\)\.click\(\)/,
   "visitor can review the preserved Concept through the visible Ideas tab");
 assert.match(firstVideo,/const concept=page\.locator\('\[data-video-ideas-concept-panel\]'\)/);
 assert.match(firstVideo,/await concept\.waitFor\(\{state:'visible',timeout:15000\}\)/,
   "the actual Concept panel is visible before explicit guest approval");
 assert.match(firstVideo,/await concept\.locator\('\[data-video-concept-approve\]'\)\.click\(\)/,
   "guest explicitly approves Concept before timeline editing");
 assert.match(firstVideo,/const textTools=page\.locator\('\[data-video-concept-text-tools\]'\)/,
   "original timeline is reachable through the Concept disclosure");
 assert.match(firstVideo,/await addVideo\.click\(\)/,
   "real source picker must remain accessible after Concept approval");
 assert.match(firstVideo,/readRealGuestVideo\(page,\{timeout:80000\}\)/);
 assert.match(firstVideo,/FOUR_DISTINCT_SOURCES_REQUIRED/);
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
  assert.match(studio,/onError=\{event=>\{[\s\S]*?setPlaybackStatus\("failed"\)/,
    "genuine native media decoding errors must still be rejected");
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

test("Safari MP4 finalized bytes require real tracks and a decoded first frame",()=>{
  for(const marker of [
    "new Input({","new BlobSource(new Blob([bytes]",
    "formats:[MP4]","await input.canRead()",
    "input.getPrimaryVideoTrack()","track.getDurationFromMetadata()",
    "input.getPrimaryAudioTrack()","track.canDecode()",
    "new VideoSampleSink(track)","sink.getSample(await track.getFirstTimestamp())",
    "frame.close()","input.dispose()","await output.getMimeType()",
    "verifyDecodableMp4Export(bytes,{",
  ])assert.ok(helper.includes(marker),marker);
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
  const params={safariWebKit:true,format:"mp4",errorCode:4,nativeWebm:true};
  assert.equal(recover(params),true);
  for(const invalid of [
    {alreadyAttempted:true},{format:"webm"},{errorCode:3},
    {errorCode:0},{nativeWebm:false},{safariWebKit:false},{catalog:true},
  ])assert.equal(recover({...params,...invalid}),false,JSON.stringify(invalid));
  assert.match(studio,/const autoWebmRetryForRef=useRef<string\|null>\(null\)/);
  assert.match(studio,/autoWebmRetryForRef\.current=signature/);
  assert.match(studio,/autoWebmRetryUrlRef\.current=result\.url/);
  assert.match(studio,/if\(held&&creditValidRef\.current\)await releaseCredit\(held\)/);
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


test("WebKit traverses Ideas Personalization and Concept before consented Voice/My Voice",()=>{
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 const modes=browser.indexOf('const ideasModes=phrases.locator("[data-video-ideas-tabs]")');
 const personal=browser.indexOf('const personalTab=ideasModes.locator',modes);
 const concept=browser.indexOf('await conceptTab.click()',personal);
 const back=browser.indexOf('await personalTab.click()',concept);
 const opened=browser.indexOf('await advancedText.click()',back);
 const voice=browser.indexOf('await voiceModeButton.click()',opened);
 const my=browser.indexOf('await myVoiceModeButton.click()',voice);
 const record=browser.indexOf('const recordEntry=page.locator',my);
 const tap=browser.indexOf('await recordEntry.click()',record);
 const phrase=browser.indexOf('const phraseSelector=page.locator',tap);
 const consent=browser.indexOf('await narrationConsent.check()',phrase);
 assert.ok(modes>=0&&personal>modes&&concept>personal&&back>concept&&
   opened>back&&voice>opened&&my>voice&&record>my&&tap>record&&
   phrase>tap&&consent>phrase,"real WebKit route must use visible controls before TTS consent");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,2);
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
