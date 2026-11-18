import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const landing=source("components/app/messenger-ai-landing.tsx");
const css=source("components/app/messenger-ai-landing.module.css");
const chat=source("components/holistic-agent-chat.tsx");
const chatCss=source("components/holistic-agent-chat.module.css");
const header=source("components/app/messages-orders-clients.jsx");
const headerCss=source("components/app/messages-orders-clients.module.css");

test("Inner Alchemist welcomes EN/RU/ES in the working Messenger route",()=>{
 for(const sample of ["Hi! I'm Ali.","Привет! Я Али.","¡Hola! Soy Ali.",
   "What would you like to begin with today?","С чего тебе хотелось бы начать сегодня?",
   "¿Por dónde te gustaría empezar hoy?"])assert.ok(landing.includes(sample),sample);
 for(const sample of ["Ali · Inner Alchemist","Ali · Внутренний алхимик",
   "Ali · Alquimista interior"])assert.ok(header.includes(sample),sample);
 assert.match(header,/section==='ai'\?/);
 assert.match(headerCss,/\.root\[data-section="ai"\] \.head h1/);
});

test("Problem chips fill the real composer, not a second chatbot or a navigation",()=>{
 for(const id of ["stress","relationships","confidence","money","energy","direction","business","growth"])
  assert.ok(landing.includes('id:"'+id+'"'),id);
 assert.match(landing,/data-hh-alchemist-topic=\{item\.id\}/);
 assert.match(landing,/onClick=\{\(\)=>onTopicSelect\(topic\.prompt\)\}/);
 assert.match(chat,/onTopicSelect=\{text=>\{setDraft\(text\);window\.requestAnimationFrame/);
 assert.match(chat,/onStartAnalysis=\{\(\)=>\{if\(draft\.trim\(\)\)\{void sendTurn\(draft\);\}else openSupportQuiz\(\);\}\}/);
 assert.equal((chat.match(/<form onSubmit=\{submit\} className=\{styles.form\}>/g)||[]).length,1);
 assert.match(chat,/showLandingComposer\?/);
 assert.match(chat,/data-hh-alchemist-tools/);
 assert.match(chat,/MessengerSixProjects locale=\{locale\} onSelect=\{startProject\}/);
});

test("Trust-first welcome preserves video, mic, keyboard, existing dock and one scrolling thread",()=>{
 assert.match(landing,/data-hh-ai-video-hero/);
 assert.match(landing,/data-hh-ai-intro-play onClick=\{start\}/);
 assert.match(landing,/data-hh-ai-intro-fallback="heygen"/);
 assert.match(landing,/data-hh-ai-landing-question/);
 assert.match(landing,/data-hh-ai-inline-composer/);
 assert.match(landing,/data-hh-alchemist-journey/);
 assert.match(landing,/data-hh-alchemist-start-analysis/);
 assert.match(css,/ali-inner-alchemist-hero\.webp/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(chatCss,/height:112px;min-height:112px;max-height:172px/);
 assert.match(chat,/data-hh-conversation-mic/);
 assert.ok(landing.indexOf("data-hh-ai-landing-question")<landing.indexOf("data-hh-ai-inline-composer"));
 assert.ok(landing.indexOf("data-hh-ai-inline-composer")<landing.indexOf('data-hh-ai-quick-actions'));
});
