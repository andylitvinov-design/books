import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseOwnerVideoUpdate} from '../lib/practitioners/owner-telegram-video-model.mjs';
const now=Date.now(),botUsername='Andydotbot';
const base={update_id:100,message:{message_id:20,date:Math.floor(now/1000),
 chat:{id:123456,type:'private'},from:{id:123456,is_bot:false},text:'/video_story'}};
test('owner story command is recognized without changing legacy /video',()=>{
 assert.equal(parseOwnerVideoUpdate(base,{now,botUsername}).action,'story_start');
 assert.equal(parseOwnerVideoUpdate({...base,message:{...base.message,text:'/video'}},{now,botUsername}).action,'start');
});
test('only bot-authored bounded story callbacks are recognized',()=>{
 const update={update_id:101,callback_query:{id:'callback1',from:{id:123456},
 data:'hh-story:abcdef012345:0:0:0',message:{message_id:50,
 chat:{id:123456,type:'private'},from:{is_bot:true,username:botUsername}}}};
 const event=parseOwnerVideoUpdate(update,{now,botUsername});
 assert.equal(event.action,'story_choice');
 assert.equal(event.storyCallback,update.callback_query.data);
 assert.equal(parseOwnerVideoUpdate({...update,callback_query:{...update.callback_query,
  message:{...update.callback_query.message,from:{is_bot:true,username:'OtherBot'}}}},{now,botUsername}),null);
});
test('owner-only webhook is wired without automatic publication',()=>{
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8');
 assert.ok(service.includes("event.action==='story_start'"));
 assert.ok(service.includes("event.action==='story_choice'"));
 assert.ok(service.includes('applyOwnerStoryChoice(config,event.storyCallback)'));
 assert.ok(service.includes("startJob(config,{...event,action:'story_start'"));
 assert.ok(service.includes("const coverage=plot?inspectStoryPlotCoverage(plot.id)"));
 assert.ok(service.includes("renderOwnerTelegramStoryVideo(batch.parts"));
 assert.ok(service.includes("storyYoutubeDescription("));
 assert.ok(service.includes("source_seconds=$5"));
 assert.ok(service.includes("accepted.seconds+event.part.duration>180"));
 assert.ok(service.includes("state:'story_duration_limit'"));
 assert.ok(service.includes("Этот новый аудиофайл НЕ добавлен"));
 assert.doesNotMatch(service,/Автоматический MP4-монтаж ещё не подключён/);
});
