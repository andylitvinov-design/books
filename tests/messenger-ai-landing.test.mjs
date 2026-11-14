import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const landing=read("components/app/messenger-ai-landing.tsx");
const landingCss=read("components/app/messenger-ai-landing.module.css");
const chat=read("components/holistic-agent-chat.tsx");
const chatCss=read("components/holistic-agent-chat.module.css");
const workspace=read("components/app/messenger-ai-workspace.jsx");
const workspaceCss=read("components/app/messenger-ai-workspace.module.css");
const speech=read("components/app/emotional-avatar.tsx");
const page=read("components/app/messages-orders-clients.jsx");

test("one real iChat, one scroll log, 6 first-party actions and always-visible composer",()=>{
 assert.equal((workspace.match(/<HolisticAgentChat\b/g)||[]).length,1);
 assert.match(workspace,/<HolisticAgentChat locale=\{locale\} compact messengerView/);
 assert.doesNotMatch(workspace,/IHelpTopics|fetch\(|new WebSocket|new AudioContext/);
 assert.match(chat,/data-chat-skin=\{messengerView\?"messenger":undefined\}/);
 assert.match(chat,/\{compact&&messengerView&&!pageHelp&&!messages.length&&<>/);
 assert.match(chat,/<MessengerAiLanding locale=\{locale\}/);
 assert.ok(chat.includes('onCreateVideo={()=>startContent()}'), 'Messenger launches the original Video workflow with user gesture');
 assert.match(chat,/onPractice=\{\(\)=>startGuided\("meditation"\)\}/);
 assert.match(chat,/composerRef.current\?\.focus/);
 assert.match(chat,/!pageHelp&&!messengerView&&<div className=\{styles.startActions\}/);
 assert.match(chat,/<form onSubmit=\{submit\} className=\{styles.form\}>/);
 assert.match(chatCss,/\.root\[data-compact\]\[data-chat-skin="messenger"\]>.thread/);
 assert.match(chatCss,/order:4;flex:none;display:flex;align-items:center/);
 assert.match(workspaceCss,/min-height:0;min-width:0;overflow:hidden/);
 for(const id of ["test","video","practice","session","course","ask"])
   assert.ok(landing.includes('id:"'+id+'"'),id);
 for(const path of ["tests","services","academy"])
   assert.ok(landing.includes('href:"'+path+'"'),path);
 assert.equal((landing.match(/<iframe\b/g)||[]).length,0);
 assert.equal((landing.match(/<video\b/g)||[]).length,1);
});

test("illustrated welcome stays at its top on first render; dialogue still scrolls to newest reply",()=>{
 const first=chat.slice(chat.indexOf("const revealLatest=()=>"),chat.indexOf("revealLatest();",chat.indexOf("const revealLatest=()=>")));
 assert.match(first,/messengerView&&messages.length===0/);
 assert.match(first,/thread.scrollTop=0/);
 assert.match(first,/if\(followTail\.current\)/);
 assert.match(first,/programmaticScrollTop.current=target/);
 assert.match(first,/thread.scrollTop=target/);
});

test("focused iPhone composer exposes previous AI reply or welcome question after keyboard resize",()=>{
 assert.match(chat,/const composerFocused=useRef\(false\)/);
 assert.match(chat,/const revealFocusedContext=useCallback\(\(\)=>/);
 assert.ok(chat.includes("querySelectorAll('[data-hh-ai-assistant-message]')"));
 assert.ok(chat.includes("querySelector('[data-hh-ai-landing-question]')"));
 assert.match(chat,/if\(composerFocused.current\)revealFocusedContext\(\)/);
 assert.match(chat,/if\(composerFocused.current\)\{\s*if\(followTail.current\)revealFocusedContext\(\)/);
 assert.doesNotMatch(chat,/if\(!compact\|\|!messengerView\|\|messages.length===0\)return;/);
 assert.match(chat,/onFocus=\{\(\)=>\{/);
 assert.match(chat,/onBlur=\{\(\)=>\{composerFocused.current=false;\}\}/);
 assert.match(chat,/viewport\?\.addEventListener\("resize",revealVisibleReply\)/);
 assert.match(chat,/observer.observe\(thread\)/);
});

test("approved HeyGen exports map EN and RU to distinct captioned MP4s, not YouTube",()=>{
 assert.match(landing,/en:\{\s*src:"https:\/\/resource2\.heygen\.ai\/movio\/video\/8d998c778af3b563aa63233aa4fb4a06\/89b101dc9dbb4fcea06aab3eb6ce5094\/caption\.mp4"/);
 assert.match(landing,/ru:\{\s*src:"https:\/\/resource2\.heygen\.ai\/movio\/video\/72e3e6f45c3664b0b8d75281b1b413a5\/2e30e44294964059b57670860ee3828b\/caption\.mp4"/);
 assert.match(landing,/INTRO\[locale==="ru"\?"ru":"en"\]/);
 assert.match(landing,/durationSeconds:91\.2457/);
 assert.match(landing,/durationSeconds:96\.862/);
 for(const phrase of ["English audio","Русская озвучка","Audio en inglés"])
   assert.ok(landing.includes(phrase),phrase);
 assert.doesNotMatch(landing,/youtube-nocookie|<iframe|approvedTelegramPresentation|autoplay=1/);
 assert.doesNotMatch(landing,/src:"https:\/\/files2\.heygen\.ai/);
 assert.match(landing,/<video ref=\{videoRef\} src=\{introduction\.src\} controls playsInline preload="none"/);
 assert.match(landing,/videoRef\.current\?\.play\(\)/);
 assert.match(landing,/videoRef\.current\?\.pause\(\)/);
 assert.match(landing,/onError=\{\(\)=>setFailed\(true\)\}/);
 assert.match(landing,/data-hh-ai-intro-play onClick=\{start\}/);
 assert.match(landing,/href=\{introduction\.src\} target="_blank" rel="noopener noreferrer"/);
 assert.match(landingCss,/\.hero\[data-playing="true"\] \.player/);
 assert.match(landingCss,/\.player video\{/);
});
test("photo appears in actual reply bubbles, while big avatar and memory button are omitted",()=>{
 assert.match(chat,/data-hh-ai-assistant-message/);
 assert.match(chat,/className=\{styles.messagePortrait\}/);
 assert.match(chat,/reiki-approved-sunrise-v3\.webp/);
 assert.match(landingCss,/reiki-approved-sunrise-v3\.webp/);
 assert.match(chat,/authenticated&&!messengerView&&<HolisticAgentMemoryPanel/);
 assert.match(chat,/!messengerView&&<EmotionalAvatar/);
 assert.match(chat,/messengerView&&<EmotionalAvatar[\s\S]*?iconOnly/);
 assert.match(speech,/if\(iconOnly\)return <div className=\{styles.iconVoiceControls\}>/);
 assert.match(speech,/<button type="button" className=\{styles.iconOnly\}/);
 assert.match(speech,/data-hh-speech-control/);
 assert.match(speech,/createDeviceSpeech/);
 assert.match(chatCss,/\.messageWithAvatar/);
 assert.doesNotMatch(workspace,/HolisticAgentMemoryPanel|IHelpTopics/);
});

test("existing voice recording, upload and consent remain reachable only by user action",()=>{
 assert.match(chat,/onClick=\{\(\)=>setRecorderOpen\(value=>!value\)\}/);
 assert.match(chat,/!contentVoice&&\(!messengerView\|\|recorderOpen\)/);
 assert.match(chat,/autoOpen=\{messengerView&&recorderOpen\}/);
 assert.match(chat,/data-hh-voice-message-upload/);
 assert.match(chat,/type="file"/);
 assert.match(chat,/setVoiceConsent\(false\)/);
 assert.match(chat,/data-hh-voice-stt-consent/);
 assert.match(chat,/data-hh-voice-transcribe/);
 assert.match(chat,/!messengerView&&resetControl/);
 assert.match(chat,/setRecorderOpen\(false\)/);
 assert.match(chatCss,/\.composerMenu/);
 assert.match(chatCss,/data-chat-editing="true"/);
 assert.match(page,/--hh-messenger-height/);
});

test("Messenger hides big Voice strip and keeps the settings behind composer plus",()=>{
 const a=chat.indexOf('data-hh-ai-more');
 const b=chat.indexOf('</details>:voiceAttachment}',a);
 assert.ok(a>0&&b>a);
 const menu=chat.slice(a,b);
 assert.match(menu,/data-hh-voice-settings/);
 assert.match(menu,/\{voiceControls\}/);
 assert.match(menu,/\{voiceAttachment\}/);
 assert.equal((chat.match(/<VoiceCompanionControls\b/g)||[]).length,1);
 assert.match(chat,/privacyOnly=\{Boolean\(pageHelp\)\}/);
 assert.match(chat,/\{compact&&!messengerView&&voiceEnabled&&<details className=\{styles.compactSettings\} data-hh-voice-settings>/);
 assert.match(chat,/\{!compact&&settings\}/);
 assert.match(chat,/data-hh-conversation-mic/);
 assert.match(chatCss,/\.composerMenu \.voiceSettings>summary/);
 assert.match(chatCss,/max-height:min\(65dvh,520px\);overflow-y:auto/);
});

test("EN RU ES, phone widths and syntax of edited React sources",()=>{
 for(const lang of ["en","ru","es"])assert.match(landing,new RegExp(lang+":\\{"));
 for(const id of ["test","video","practice","session","course","ask"])
  assert.ok(landingCss.includes('data-hh-ai-choice="'+id+'"'),id);
 assert.match(landingCss,/@media\(max-width:355px\)/);
 assert.match(chatCss,/@media\(max-width:355px\)/);
 assert.match(chatCss,/font:500 16px\/1\.4 system-ui/);
 assert.match(chatCss,/\.root\[data-compact\]\[data-chat-skin="messenger"\]>.form/);
 for(const path of ["components/app/messenger-ai-landing.tsx",
  "components/holistic-agent-chat.tsx","components/app/emotional-avatar.tsx",
  "components/app/messenger-ai-workspace.jsx"]){
   const out=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
    compilerOptions:{allowJs:true,jsx:ts.JsxEmit.ReactJSX,
      target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
   assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
    .map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[],path);
 }
});


test("Messenger and Goal Studio alone permit direct HeyGen CDN MP4; other private routes stay restricted",()=>{
 const middleware=read("middleware.ts");
 const exactMessenger=/^\/(en|ru|es)\/app\/messages\/?$/;
 const exactStudio=/^\/(en|ru|es)\/holistic-support\/mandala\/?$/;
 const match=middleware.match(/const messengerIntroductionVideo = ([^\n]+)/);
 const studioMatch=middleware.match(/const studioIntroductionVideo = ([^\n]+)/);
 assert.equal(match?.[1],exactMessenger.toString()+".test(pathname)");
 assert.equal(studioMatch?.[1],exactStudio.toString()+".test(pathname)");
 for(const path of ["/en/app/messages","/ru/app/messages","/es/app/messages"])
   assert.equal(exactMessenger.test(path),true,path);
 for(const path of ["/en/holistic-support/mandala","/ru/holistic-support/mandala","/es/holistic-support/mandala"])
   assert.equal(exactStudio.test(path),true,path);
 for(const path of ["/en/app","/en/app/profile","/en/app/orders",
   "/ru/client/session/abc","/api/app/messenger","/admin/videos","/en/app/messages/admin",
   "/en/holistic-support/mandala/edit","/en/services"])
   assert.equal(exactMessenger.test(path)||exactStudio.test(path),false,path);
 assert.match(middleware,/directMessageStorageOrigin \+ \(\(messengerIntroductionVideo\|\|studioIntroductionVideo\) \? ' https:\/\/resource2\.heygen\.ai' : ''\)/);
 assert.doesNotMatch(middleware,/messengerIntroductionEmbed/);
 assert.match(middleware,/practitionerDraftPreview \? "frame-src blob:" : "frame-src 'none'"/);
});


test("initial AI Assistant places its single live composer immediately under the welcome question",()=>{
 assert.ok(chat.includes("const showLandingComposer=compact&&messengerView&&!pageHelp&&!messages.length"));
 assert.ok(chat.includes("<MessengerAiLanding locale={locale} composer={composer}"));
 assert.ok(chat.includes("{!showLandingComposer&&composer}"));
 assert.equal((chat.match(/<form onSubmit=\{submit\} className=\{styles.form\}>/g)||[]).length,1);
 assert.ok(landing.indexOf("data-hh-ai-landing-question")<landing.indexOf("data-hh-ai-inline-composer"));
 assert.ok(landing.indexOf("data-hh-ai-inline-composer")<landing.indexOf("data-hh-ai-quick-actions"));
 assert.ok(chat.includes("messages.length===0?thread.querySelector('[data-hh-ai-inline-composer]'):null"));
 assert.ok(landing.includes("composer?:ReactNode"));
 assert.ok(chatCss.includes("data-hh-ai-inline-composer"));
 assert.ok(landingCss.includes(".inlineComposer{"));
 assert.ok(chatCss.includes("min-width:44px;min-height:44px"));
});
