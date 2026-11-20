import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const landing=source("components/app/messenger-ai-landing.tsx");
const css=source("components/app/messenger-ai-landing.module.css");
const chat=source("components/holistic-agent-chat.tsx");
const chatCss=source("components/holistic-agent-chat.module.css");
const header=source("components/app/messages-orders-clients.jsx");

test("First-open Ali Messenger is a REAL message, not a pretend transcript",()=>{
 assert.match(landing,/data-hh-ali-first-message/);
 assert.match(landing,/data-hh-ai-landing-question/);
 assert.match(landing,/persona\.name\[locale\]/);
 for(const sample of ["What would you like to begin with today?","С чего тебе хотелось бы начать сегодня?","¿Por dónde te gustaría empezar hoy?"])
   assert.ok(landing.includes(sample),sample);
 assert.match(header,/data-hh-ali-active-persona=\{persona\.id\}/);
 assert.match(chat,/!messages\.length&&<>/);
 assert.match(chat,/messages\.map\(\(m,index\)=>/);
});

test("Four illustrated suggestions initially; expand to all eight without auto-send",()=>{
 for(const id of ["stress","relationships","energy","direction","confidence","money","business","growth"])
   assert.ok(landing.includes('id:"'+id+'"'),id);
 assert.match(landing,/moreTopics\?TOPICS:TOPICS\.slice\(0,4\)/);
 assert.match(landing,/data-hh-alchemist-visible-topics=\{moreTopics\?8:4\}/);
 assert.match(landing,/data-hh-alchemist-more-topics/);
 assert.match(landing,/onClick=\{\(\)=>onTopicSelect\(topic\.prompt\)\}/);
 assert.match(chat,/onTopicSelect=\{text=>\{setDraft\(text\);window\.requestAnimationFrame/);
 assert.match(landing,/className=\{css\.topicIllustration\}/);
});

test("One real pinned composer, 16px+ chat text, opt-in greeting and video preserved",()=>{
 assert.equal((chat.match(/<form onSubmit=\{submit\} className=\{styles\.form\}/g)||[]).length,1);
 assert.match(chat,/data-hh-ai-chat-composer=\{messengerView\|\|undefined\}/);
 assert.match(chat,/\{!supportQuizOpen&&composer\}/);
 assert.doesNotMatch(landing,/composer=\{composer\}/);
 assert.match(chat,/data-hh-conversation-mic/);
 assert.match(landing,/data-hh-ai-persona-voice-play/);
 assert.match(landing,/data-hh-ai-intro-play onClick=\{start\}/);
 assert.match(landing,/data-hh-ai-intro-fallback="heygen"/);
 assert.match(landing,/moreTopics&&<div className=\{css\.expandedContent\}/);
 assert.match(css,/welcomeBubble/);
 assert.match(css,/font-size:16px/);
 assert.match(chatCss,/font-size:17px;line-height:1\.48/);
 assert.match(chatCss,/background:#dff6d9/);
});
