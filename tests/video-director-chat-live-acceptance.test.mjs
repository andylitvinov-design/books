import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const qa=readFileSync(new URL('../scripts/benchmarking/video-director-chat-live-acceptance.mjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/hh-first-video-live-export.yml',import.meta.url),'utf8');
test('anonymous, consent-safe live chat accepts RU/EN/ES and validates 4 approved sources',()=>{
 assert.match(qa,/for\(const locale of \['en','es','ru'\]\)/);
 assert.match(qa,/\[data-video-director-chat\]/);
 assert.match(qa,/\[data-chat-shot-id\]/);
 assert.match(qa,/\[data-free-film-source\]/);
 assert.match(qa,/4,'FOUR_SHOT_PREVIEW_REQUIRED'/);
 assert.match(qa,/approved\.get\(item\.id\)/);
 assert.match(qa,/EXTERNAL_AI_MUST_REQUIRE_OPT_IN/);
 assert.match(qa,/\['GET','HEAD'\]/);
 assert.match(qa,/EXTERNAL_AI_OR_PAYMENT_CALLED_WITHOUT_OPT_IN/);
 assert.doesNotMatch(qa,/fetch\(['"]\/api\/holistic-support\/video-director/);
});
test('live chat acceptance uses only one renderer and actually downloads playable audio video',()=>{
 for(const marker of ['[data-video-chat-confirm]','[data-video-chat-create]',
  '[data-video-chat-result]','[data-mandala-video-download]','[data-video-result-play]',
  "mediaTool('ffprobe'","mediaTool('ffmpeg'",'decodedAudioRms(mediaFile)',
  'LICENSED_VIDEO_SOURCE_ABSENT_','BLACK_GAP_IN_STITCHED_VIDEO'])
  assert.ok(qa.includes(marker),'missing real acceptance: '+marker);
 assert.match(qa,/report\.sourceIdentityVerified=true/);
 assert.match(qa,/physicalIPhoneVerified:false/);
 assert.match(qa,/CLIENT_JAVASCRIPT_ERROR_/);
 assert.match(qa,/CHAT_MUST_REUSE_SINGLE_CANVAS/);
});
test('legacy prompt-based live benchmark opens its approved advanced disclosure before recording',()=>{
 const legacy=readFileSync(new URL('../scripts/benchmarking/first-video-live-export.mjs',import.meta.url),'utf8');
 assert.match(legacy,/\[data-video-first-video-advanced\]/);
 assert.match(legacy,/advanced\.locator\(':scope > summary'\)\.click\(\)/);
 assert.ok(legacy.indexOf("const advanced=page.locator")<legacy.indexOf("const first = page.locator"));
 assert.match(legacy,/\[data-mandala-video-download\]/);
});
test('cost-bounded existing LIVE video workflow runs the new smoke on real published pages',()=>{
 assert.match(workflow,/scripts\/benchmarking\/video-director-chat-live-acceptance\.mjs/);
 assert.match(workflow,/node scripts\/benchmarking\/video-director-chat-live-acceptance\.mjs/);
 assert.match(workflow,/node --test tests\/video-director-chat-live-acceptance\.test\.mjs/);
 assert.match(workflow,/playwright@1\.63\.0/);
 assert.match(workflow,/HH_LIVE_VIDEO_PLAYWRIGHT/);
 assert.match(workflow,/scripts\/benchmarking\/first-video-live-export\.mjs/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});

test('chat hydration readiness is explicit and preserves early mobile input',()=>{
 const src=readFileSync(new URL('../components/mandala-video-director-chat.tsx',import.meta.url),'utf8');
 assert.match(src,/data-chat-hydrated=\{clientHydrated\?"true":"false"\}/);
 assert.match(src,/composerRef\.current\?\.value/);
 assert.match(src,/setInput\(value=>value\|\|preHydrationText\.slice\(0,800\)\)/);
 assert.match(qa,/LEGACY_CHAT_INTERACTION_NOT_HYDRATED/);
 assert.match(qa,/VIDEO_CHAT_SEND_NOT_READY/);
 assert.match(qa,/hydration==='true'/);
});

test('approved mobile entry opens one shared AI chat from free help; mandatory real media tests are retained',()=>{
 assert.match(qa,/OWNER_FOUR_IMAGE_GOALS_REQUIRED/);
 assert.match(qa,/OWNER_SIX_TEXT_TOPICS_REQUIRED/);
 assert.match(qa,/\[data-auto-video-clarify\]/);
 assert.match(qa,/OWNER_GOAL_FIRST_DID_NOT_PROPOSE_STORY/);
 assert.match(qa,/DUPLICATE_VIDEO_DIRECTOR_CHAT/);
 assert.match(qa,/card\.locator\('\[data-video-chat-confirm\]'\)\.click/);
 assert.match(qa,/await create\.click\(/);
 assert.match(qa,/LICENSED_VIDEO_SOURCE_ABSENT_/);
 assert.match(qa,/EXTERNAL_AI_OR_PAYMENT_CALLED_WITHOUT_OPT_IN/);
});
