import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {pageHelpFromRoute} from "../lib/ihelp/page-context.mjs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const surface=read("../components/ihelp-welcome.tsx");
const design=read("../components/ihelp-welcome.module.css");
const dialog=read("../components/sitewide-ihelp.tsx");
const dialogCss=read("../components/sitewide-ihelp.module.css");
const messages=read("../components/app/messenger-ai-workspace.jsx");

test("one reusable photo-first iHelp welcome on every existing page family",()=>{
 assert.match(surface,/export function IHelpWelcome/);
 assert.match(surface,/export function IHelpTopics/);
 assert.match(design,/reiki-approved-sunrise-v3\.webp/);
 for(const locale of ["en","ru","es"]){
  assert.match(surface,new RegExp(locale+":\\{"));
  for(const path of ["/"+locale,"/"+locale+"/tests","/"+locale+"/academy",
    "/"+locale+"/mytube","/"+locale+"/services","/"+locale+"/library",
    "/"+locale+"/app/private","/"+locale+"/shop"]){
   const context=pageHelpFromRoute({locale,pathname:path});
   assert.equal(context.actions.length,3,path);
   assert.ok(["general","tests","learning","mytube","services",
     "library","account","shop"].includes(context.section));
  }
 }
 for(const id of ["general","tests","learning","mytube","services","library","account","shop"]){
  assert.ok(surface.includes(id+":"));
 }
 assert.match(design,/--hh-light-canvas/);
 assert.match(design,/--hh-light-focus/);
 assert.match(design,/@media\(max-width:355px\)/);
});

test("sitewide iHelp keeps its single actual chat and functional contextual actions",()=>{
 assert.equal((dialog.match(/<HolisticAgentChat\b/g)||[]).length,1);
 assert.match(dialog,/pageHelp=\{context\}/);
 assert.match(dialog,/quickPrompt=\{quickPrompt\}/);
 assert.match(dialog,/<IHelpWelcome locale=\{locale\} section=\{context\.section\}/);
 assert.match(dialog,/<IHelpTopics locale=\{locale\} onSelect=\{chooseTopic\}/);
 assert.match(dialog,/hh:ihelp-open-video-director/);
 assert.match(dialog,/request\.detail\.handled/);
 assert.match(dialog, /\[data-orders-clients-hub\]/);
 assert.ok(dialog.includes("setOpen(false)"));
 assert.ok(dialog.includes("<nav className={styles.bottomNav}"));
 assert.ok(dialog.includes("section=orders"));
 assert.ok(dialog.includes("section=clients"));
 assert.doesNotMatch(dialog,/\bfetch\(/);
 assert.match(dialogCss,/data-hh-ihelp-option/);
 assert.match(dialogCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(dialogCss, /min-height:44px/);
});

test("Messages iHelp reuses the same view and one protected AI conversation",()=>{
 assert.equal((messages.match(/<HolisticAgentChat\b/g)||[]).length,1);
 assert.match(messages,/messengerView/);
 assert.doesNotMatch(messages,/<IHelpTopics/);
 assert.match(read("../components/holistic-agent-chat.tsx"),/<MessengerAiLanding/);
 assert.match(messages,/authenticated=\{authenticated\}/);
 assert.match(messages,/onAuthRetry=\{onAuthRetry\}/);
 assert.doesNotMatch(messages,/new WebSocket|createClient\(|\bfetch\(/);
});

test("iHelp has permissions-only voice settings, never a voice-type dropdown",()=>{
 const chat=read("../components/holistic-agent-chat.tsx");
 const controls=read("../components/voice-companion-controls.tsx");
 assert.match(dialog,/<HolisticAgentChat locale=\{locale\} compact messengerView pageHelp=\{context\}/);
 assert.match(chat,/privacyOnly=\{Boolean\(pageHelp\)\}/);
 assert.match(chat,/pageHelp\?voice\.t\.settings/);
 const a=controls.indexOf("if(privacyOnly)return");
 const b=controls.indexOf("const controlStyle=",a);
 assert.ok(a>0&&b>a);
 const privacy=controls.slice(a,b);
 assert.match(privacy,/data-hh-voice-permissions-only/);
 assert.match(privacy,/setPlayback/);
 assert.match(privacy,/setRecognitionConsent/);
 assert.doesNotMatch(privacy,/<select|data-hh-voice-selector|data-hh-voice-preview/);
 assert.match(chat,/data-hh-voice-message-upload/);
 assert.match(chat,/data-hh-conversation-mic/);
});

test("topic taps fill an unsent draft, never auto-send or read private DOM",()=>{
 assert.match(dialog,/setQuickPrompt\(previous=>/);
 assert.match(read("../components/holistic-agent-chat.tsx"),/onCreateVideo={startContent}/);
 assert.match(surface,/onSelect\(t\.topics\[key\]\.prompt\)/);
 assert.doesNotMatch(surface,/window\.|document\.|fetch\(|localStorage|sessionStorage/);
 assert.match(dialog,/\[data-mandala-free-video\]/);
 assert.match(dialogCss,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(dialogCss,/@media\(max-width:760px\)/);
 assert.match(dialogCss,/@media\(max-width:355px\)/);
});

test("iHelp chat is loaded only after user opens its single dialog",()=>{
 assert.match(dialog,/import dynamic from "next\/dynamic"/)
 assert.match(dialog,/import type \{HolisticAgentQuickPrompt\} from "@\/components\/holistic-agent-chat"/)
 assert.match(dialog,/const HolisticAgentChat = dynamic\(/)
 assert.match(dialog,/import\("@\/components\/holistic-agent-chat"\)\.then\(module => module\.HolisticAgentChat\)/)
 assert.match(dialog,/\{ ssr: false \}/)
 assert.match(dialog,/mounted&&<div/)
 assert.doesNotMatch(dialog,/import \{HolisticAgentChat/)
 assert.equal((dialog.match(/<HolisticAgentChat\b/g)||[]).length,1)
})
