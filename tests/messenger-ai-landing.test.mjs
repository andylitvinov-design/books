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
 assert.match(chat,/messengerView&&!messages.length&&<MessengerAiLanding/);
 assert.match(chat,/onCreateVideo=\{startContent\}/);
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
 assert.equal((landing.match(/<iframe\b/g)||[]).length,1);
});

test("illustrated welcome stays at its top on first render; dialogue still scrolls to newest reply",()=>{
 const first=chat.slice(chat.indexOf("const revealLatest=()=>"),chat.indexOf("revealLatest();",chat.indexOf("const revealLatest=()=>")));
 assert.match(first,/messengerView&&messages.length===0/);
 assert.match(first,/thread.scrollTop=0/);
 assert.match(first,/if\(followTail\.current\)/);
 assert.match(first,/thread.scrollTop=thread.scrollHeight/);
});

test("approved video only: click-to-load Russian source, no fake English/Spanish render",()=>{
 assert.match(landing,/approvedTelegramPresentation\("ru"\)/);
 assert.match(landing,/playing&&introduction\?/);
 assert.match(landing,/setPlaying\(true\)/);
 assert.match(landing,/setPlaying\(false\)/);
 assert.match(landing,/data-hh-ai-intro-play/);
 assert.match(landing,/youtube-nocookie\.com\/embed/);
 assert.match(landing,/referrerPolicy="strict-origin-when-cross-origin"/);
 for(const text of ["Russian audio","Русская озвучка","Audio en ruso"])
  assert.ok(landing.includes(text),text);
 assert.doesNotMatch(landing,/useEffect|autoplay\s*\>|api\/heygen|private.*mp4/i);
});

test("photo appears in actual reply bubbles, while big avatar and memory button are omitted",()=>{
 assert.match(chat,/data-hh-ai-assistant-message/);
 assert.match(chat,/className=\{styles.messagePortrait\}/);
 assert.match(chat,/reiki-approved-sunrise-v3\.webp/);
 assert.match(landingCss,/reiki-approved-sunrise-v3\.webp/);
 assert.match(chat,/authenticated&&!messengerView&&<HolisticAgentMemoryPanel/);
 assert.match(chat,/!messengerView&&<EmotionalAvatar/);
 assert.match(chat,/messengerView&&<EmotionalAvatar[\s\S]*?iconOnly/);
 assert.match(speech,/if\(iconOnly\)return <button/);
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


test("private Messenger allows only the approved nocookie intro iframe, with an explicit iPhone escape link",()=>{
 const middleware=read("middleware.ts");
 const exactMessenger=/^\/(en|ru|es)\/app\/messages\/?$/;
 const match=middleware.match(/const messengerIntroductionEmbed = ([^\n]+)/);
 assert.equal(match?.[1],exactMessenger.toString()+".test(pathname)");
 for(const path of ["/en/app/messages","/ru/app/messages/","/es/app/messages"])
   assert.equal(exactMessenger.test(path),true,path);
 for(const path of ["/en/app","/en/app/profile","/en/app/orders",
   "/ru/client/session/abc","/api/app/messenger","/admin/videos","/en/app/messages/admin"])
   assert.equal(exactMessenger.test(path),false,path);
 assert.match(middleware,/sessionEducationEmbed \? "frame-src https:\/\/www\.youtube-nocookie\.com" : messengerIntroductionEmbed \? "frame-src https:\/\/www\.youtube-nocookie\.com" : practitionerDraftPreview/);
 assert.match(middleware,/practitionerDraftPreview \? "frame-src blob:" : "frame-src 'none'"/);
 assert.match(landing,/href=\{introduction\.url\} className=\{css\.externalYouTube\} target="_blank"/);
 assert.match(landing,/rel="noopener noreferrer">\{t\.openOnYouTube\}/);
 assert.match(landingCss,/\.externalYouTube\{/);
 for(const name of ["Open on YouTube","Открыть на YouTube","Abrir en YouTube"])
   assert.ok(landing.includes(name),name);
});
