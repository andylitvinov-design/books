import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {audioVideoDuration,audioVideoFileAllowed,stageMessengerAudio,
 prepareMessengerAudio} from "../lib/mandala/messenger-audio-video-handoff.mjs";

test("only the existing exact Video Studio duration presets are proposed",()=>{
 for(const [seconds,expected] of [[0,null],[0.01,10],[9.95,10],[10.1,15],
   [14.9,15],[19.5,20],[29.9,30],[30.1,60],[59.9,60],[61,null],
   [Infinity,null],[NaN,null],[-1,null]])assert.equal(audioVideoDuration(seconds),expected);
});
test("private Messenger file types are finite and bounded",()=>{
 for(const name of ["audio.mp3","voice.m4a","voice.wav","voice.aac","voice.mp4",
   "voice.webm"])assert.equal(audioVideoFileAllowed({name,size:24,type:"audio/mpeg"}),true);
 assert.equal(audioVideoFileAllowed({name:"voice.ogg",size:24,type:"audio/ogg"}),false);
 assert.equal(audioVideoFileAllowed({name:"voice.ogg",size:24,type:"audio/ogg"},true),true);
 for(const input of [
   {name:"unsafe.exe",size:24,type:"audio/mpeg"},
   {name:"voice.wav",size:0,type:"audio/wav"},
   {name:"voice.wav",size:16*1024*1024,type:"audio/wav"},
   {name:"voice.m4a",size:24,type:"text/html"},
 ])assert.equal(audioVideoFileAllowed(input,true),false);
});
test("rights denial never opens local IndexedDB or writes an audio handoff",async()=>{
 await assert.rejects(stageMessengerAudio({
  file:{name:"voice.wav",size:100,type:"audio/wav"},
  seconds:12,duration:15,locale:"ru",goal:"calm",rights:false,
 }),/AUDIO_TRANSFER_INVALID/);
 await assert.rejects(stageMessengerAudio({
  file:{name:"voice.wav",size:100,type:"audio/wav"},
  seconds:61,duration:60,locale:"ru",goal:"calm",rights:true,
 }),/AUDIO_TRANSFER_INVALID/);
 await assert.rejects(prepareMessengerAudio({name:"a.txt",size:30,type:"audio/wav"}),
  /AUDIO_INVALID_FILE/);
});
test("AI Studio preserves the audio attachment on scenario confirmation",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const chat=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
 assert.match(chat,/MessengerAudioVideo/);
 assert.match(studio,/consumeMessengerAudio\(locale\)/);
 assert.match(studio,/const preserveMessengerAudio = /);
 assert.match(studio,/if\(!preserveMessengerAudio\)\{/);
 assert.match(studio,/nonLoop:true/);
 assert.match(studio,/importedAudioSeconds/);
 assert.match(studio,/!audioRights/);
});

test("Messenger voice-to-video immediately reveals a single CTA and skips the goal questionnaire",()=>{
 const ui=readFileSync(new URL("../components/app/messenger-audio-video.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../components/app/messenger-audio-video.module.css",import.meta.url),"utf8");
 assert.match(ui,/panel\.scrollTop=panel\.scrollHeight/);
 assert.match(ui,/#video-audio/);
 assert.match(ui,/stageMessengerAudio\(\{\.\.\.prepared,locale,goal,rights:true\}\)/);
 assert.doesNotMatch(ui,/setRights\(|setGoal\(|type="checkbox"|type="text"/);
 assert.match(css,/max-height:min\(46dvh,420px\)/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/max-width:100%/);
});

test("async Messenger audio handoff does not override voice-first route with Goals",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.match(studio,/const voiceFirstEntry=window\.location\.hash==="#video-audio"/);
 assert.match(studio,/setActiveWorkspace\(voiceFirstEntry\?"editor":"video"\)/);
 assert.match(studio,/setMontagePanel\("audio"\);setBasicPanelTab\("music"\)/);
 assert.match(studio,/setDirectorChatOpen\(false\);setVideoScenarioOpen\(false\)/);
});
