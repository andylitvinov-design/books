import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIDEO_EFFECT_AXES,beginVideoEffect,advanceVideoEffect,markVideoEffectDelivered,
 videoEffectResults,videoEffectSummary,videoEffectQuestion,videoEffectChoiceKeys}
 from '../lib/crm/telegram-video-effect.mjs';
import {verifyRenderedMp4Metadata} from '../lib/crm/telegram-mp4-metadata.mjs';

const job='123e4567-e89b-42d3-a456-426614174000';
const finishBefore=(locale='ru')=>{
 let state=beginVideoEffect(job,locale);
 for(let i=0;i<7;i++)state=advanceVideoEffect(state,String(i)).state;
 return state;
};
test('exactly seven localized 0..10 scales are asked, all seven required',()=>{
 assert.equal(VIDEO_EFFECT_AXES.length,7);
 assert.equal(new Set(VIDEO_EFFECT_AXES.map(x=>x.id)).size,7);
 for(const axis of VIDEO_EFFECT_AXES)for(const locale of ['ru','en','es'])
  assert.ok(axis[locale].length>3);
 for(const locale of ['ru','en','es']){
  let state=beginVideoEffect(job,locale);
  for(let i=0;i<7;i++){
   assert.ok(videoEffectQuestion(state).includes((i+1)+'/7'));
   state=advanceVideoEffect(state,i%2?'10':'0').state;
  }
  assert.equal(state.phase,'waiting');
  assert.equal(state.before.length,7);
 }
 assert.throws(()=>beginVideoEffect('bad','ru'),/JOB_ID_INVALID/);
});
test('post-view feedback is exactly yes / no / so-so, not a watch confirmation',()=>{
 for(const [locale,response,key] of [['ru','Так себе','so-so'],['en','Yes','yes'],['es','No','no']]){
  let state=markVideoEffectDelivered(finishBefore(locale)).state;
  assert.deepEqual(videoEffectChoiceKeys(locale).length,3);
  assert.equal(state.phase,'reaction');
  const entered=advanceVideoEffect(state,response);
  assert.equal(entered.state.reaction,key);
  assert.equal(entered.state.phase,'watch');
  assert.equal(entered.state.watched,false);
  const prior=advanceVideoEffect(entered.state,'5');
  assert.equal(prior.handled,false);
  const watched=advanceVideoEffect(entered.state,'/watched');
  assert.equal(watched.state.phase,'after');
  assert.equal(watched.state.watched,true);
 }
});
test('signed delta reports improvement, decline and no movement (no causal claims)',()=>{
 let state=markVideoEffectDelivered(finishBefore()).state;
 state=advanceVideoEffect(state,'Так себе').state;
 state=advanceVideoEffect(state,'/watched').state;
 for(let i=0;i<7;i++)state=advanceVideoEffect(state,String(10-i)).state;
 const result=videoEffectResults(state);
 assert.equal(state.phase,'done');
 assert.deepEqual(result.rows.map(x=>x.delta),[10,8,6,4,2,0,-2]);
 assert.equal(result.improved,5);assert.equal(result.unchanged,1);assert.equal(result.decreased,1);
 const summary=videoEffectSummary(state);
 assert.match(summary,/−|-/);
 assert.match(summary,/лечебного|причинного/);
});
test('video delivered before completing initial scores never fabricates baseline',()=>{
 let state=beginVideoEffect(job,'ru');
 state=advanceVideoEffect(state,'10').state;
 const delivered=markVideoEffectDelivered(state);
 assert.equal(delivered.changed,true);
 assert.equal(delivered.state.phase,'reaction');
 state=advanceVideoEffect(delivered.state,'Нет').state;
 state=advanceVideoEffect(state,'/watched').state;
 for(let i=0;i<7;i++)state=advanceVideoEffect(state,'5').state;
 assert.equal(videoEffectResults(state).hasBaseline,false);
 assert.ok(videoEffectResults(state).rows.every(x=>x.delta===null));
 assert.match(videoEffectSummary(state),/Исходные/);
});
test('invalid ratings / stop_checkin / missing data do not count as scores',()=>{
 let s=beginVideoEffect(job,'en');
 for(const input of ['11','-1','5.5','NaN','', 'yes','hello']){
  const result=advanceVideoEffect(s,input);
  assert.equal(result.handled,false);
  assert.equal(result.state.before.length,0);
 }
 s=advanceVideoEffect(s,'/stop_checkin').state;
 assert.equal(s.phase,'cancelled');
 assert.equal(advanceVideoEffect(s,'5').handled,false);
});
test('ffmpeg metadata verifies physical portrait H264 ~20s, not just file name',()=>{
 const valid='Input #0, mov, from output.mp4:\\n  Duration: 00:00:20.01, start: 0.000000\\n Stream #0:0: Video: h264 (High), yuv420p, 360x640';
 assert.equal(verifyRenderedMp4Metadata(valid),true);
 for(const bad of [valid.replace('h264','vp9'),valid.replace('360x640','640x360'),
  valid.replace('20.01','10.00'),'ftyp',valid.replace('20.01','30.00')])
  assert.equal(verifyRenderedMp4Metadata(bad),false);
});
test('secure Telegram queue uses approved account, real status, lease fencing and no new cron',()=>{
 const root=url=>readFileSync(new URL(url,import.meta.url),'utf8');
 const queue=root('../lib/app/telegram-ai-queue.js');
 const worker=root('../lib/app/telegram-ai-worker.js');
 const flow=root('../lib/app/telegram-ai-video-flow.js');
 const security=root('../lib/app/telegram-ai-account-boundary.js');
 const render=root('../lib/app/telegram-ai-video-render.js');
 const cron=root('../app/api/internal/direct-message-push/route.js');
 const migration=root('../supabase/migrations/20261106082000_hh_ai_account_video_consent.sql');
 for(const pattern of [/aiVideoBotIdentityReady/,/aiQueueClientBotIdentityReady/,/telegramPersonalVideoSendReady/])
  assert.match(security,pattern);
 assert.match(root('../lib/app/telegram-bot-token-boundary.mjs'),/timingSafeEqual/);
 assert.match(queue,/aiQueueClientBotIdentityReady\(env\)/);
 for(const pattern of [/currentAiVideoAccount/,/\/confirm/,/planTelegramAiVideo/,
  /video-progress:/,/beginVideoEffect/,/expiresAt/])assert.match(flow,pattern);
 for(const pattern of [/verifyAiVideoBoundAccount/,/lease_until>now\(\)/,
  /queueAiVideoProgress/,/videoEffectDeliveryAccepted/,/getAiVideoProgressMessage/])
  assert.match(queue,pattern);
 for(const pattern of [/editMessageText/,/RENDER_STAGES/,/reply_markup/,
   /renewAiVideoLease/,/videoEffectDeliveryAccepted/])assert.match(worker,pattern);
 assert.match(render,/AI_VIDEO_UNAPPROVED_PLAN/);
 assert.match(render,/inspectRenderedMp4/);
 assert.match(migration,/security definer/);
 assert.match(migration,/from public,anon,authenticated/);
 assert.match(cron,/HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED/);
 assert.doesNotMatch(cron,/setInterval|cron\.schedule/);
 const direct=root('../app/api/internal/telegram-ai-work/route.js');
 const next=root('../next.config.ts');
 assert.match(direct,/HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED/,
  'the direct worker must enforce the same independent render cost approval');
 assert.match(direct,/VERCEL_ENV!=='production'/,
  'preview and nonproduction must never render private Telegram videos');
 assert.match(next,/"\/api\/internal\/direct-message-push": \["\.\/node_modules\/ffmpeg-static\/ffmpeg"\]/,
  'the reused five-minute recovery worker must trace its FFmpeg executable');
});


test('render budget gate is enforced inside queue worker regardless of endpoint',()=>{
 const root=url=>readFileSync(new URL(url,import.meta.url),'utf8');
 const worker=root('../lib/app/telegram-ai-worker.js');
 const bot=root('../lib/app/telegram-ai-account-boundary.js');
 assert.match(worker,/env\.HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED==='true'/);
 assert.match(worker,/aiVideoBotIdentityReady\(env\)\?videos:0/);
 assert.match(worker,/consume\('video',approvedVideos,async job=>\{/);
 assert.doesNotMatch(worker,/consume\('video',videos,async job=>\{/);
 assert.match(bot,/telegramPersonalVideoSendReady\(env\)/);
 assert.match(root('../lib/app/telegram-bot-token-boundary.mjs'),/timingSafeEqual/);
});
