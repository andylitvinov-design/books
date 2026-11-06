import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {pageHelpFromRoute} from "../lib/ihelp/page-context.mjs";

test("sitewide iHelp responds to route, selected editor tab and locale",()=>{
 const scenarios=[
  ["/ru/holistic-support/mandala","ideas","ideas","ru"],
  ["/en/holistic-support/mandala","effects","effects","en"],
  ["/es/video-studio","audio","audio","es"],
  ["/ru/holistic-support/mandala","editor","montage","ru"],
  ["/en/tests/stress",null,"tests","en"],
  ["/es/academy",null,"learning","es"],
  ["/en/mytube",null,"mytube","en"],
  ["/ru/services/free-situation-review",null,"services","ru"],
  ["/es/shop",null,"shop","es"],
  ["/en/app/private",null,"account","en"],
 ];
 for(const [pathname,activeTab,section,locale] of scenarios){
  const reply=pageHelpFromRoute({pathname,locale,activeTab});
  assert.equal(reply.section,section,pathname);
  assert.ok(reply.greeting.length>15);
  assert.equal(reply.actions.length,3);
  for(const item of reply.actions){
   assert.ok(item.label&&item.prompt&&item.reply);
   if(item.href)assert.match(item.href,new RegExp("^/"+locale+"/"));
  }
 }
});
test("private or arbitrary URL/query/tab content never enters suggestions",()=>{
 const secret="MY_PRIVATE_REPORT_SECRET_999";
 const answer=pageHelpFromRoute({locale:"ru",pathname:"/ru/app/"+secret,
   hash:"#"+secret,activeTab:secret});
 assert.equal(answer.section,"account");
 assert.doesNotMatch(JSON.stringify(answer),new RegExp(secret));
 assert.equal(pageHelpFromRoute({locale:"en",pathname:"/en/holistic-support/mandala",
   activeTab:"malicious-tab"}).section,"video");
 assert.equal(pageHelpFromRoute({locale:"es",pathname:"/es/holistic-support/mandala",
   activeTab:"audio"}).section,"audio");
 assert.equal(pageHelpFromRoute({locale:"ru",pathname:"/ru/video-studio",
   hash:"#video-audio"}).section,"audio");
});
test("all suggested routes are allowlisted internal paths with no side effects",()=>{
 for(const locale of ["ru","en","es"]){
  for(const pathname of ["/"+locale,"/"+locale+"/holistic-support/mandala",
    "/"+locale+"/services","/"+locale+"/mytube","/"+locale+"/app/messages"]){
   const context=pageHelpFromRoute({locale,pathname});
   for(const action of context.actions){
    if(action.href){
     assert.ok(action.href.startsWith("/"+locale+"/"));
     assert.doesNotMatch(action.href,/\?|#|\/\/|token|accountId|email/i);
    }
   }
  }
 }
});

test("video-page iHelp opens the existing single Director, not a parallel chat",()=>{
 const trigger=readFileSync(new URL("../components/sitewide-ihelp.tsx",import.meta.url),"utf8");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const native=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
 assert.match(trigger,/hh:ihelp-open-video-director/);
 assert.match(trigger,/request\.detail\.handled/);
 assert.match(studio,/hh:ihelp-open-video-director/);
 assert.match(studio,/request\.detail\.handled=true/);
 assert.match(studio,/setVideoIHelpOpen\(true\)/);
 assert.match(studio,/data-hh-video-ihelp-open/);
 assert.equal((studio.match(/<MandalaVideoDirectorChat\b/g)||[]).length,1);
 assert.match(native,/data-video-director-chat/);
 assert.match(native,/helpVisible=|helpVisible\?:boolean/);
 assert.match(native,/data-video-ihelp-context/);
 assert.doesNotMatch(trigger,/createVideo\(|renderVideo\(|\bfetch\(/);
});
test("changing video wizard tabs updates help without restarting prior answers",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const native=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
 const source=studio.slice(studio.indexOf('const openVideoHelp='),studio.indexOf('const [phraseAudioExpanded',studio.indexOf('const openVideoHelp=')));
 assert.doesNotMatch(source,/setActiveWorkspace|setWish|setCinematicPlan|setTheme|setDuration|setMusic/);
 assert.match(native,/\[locale,helpTab,helpVisible\]/);
 const contextual=native.slice(native.indexOf("{pageHelp&&<section"),native.indexOf('<div ref={threadRef}',native.indexOf("{pageHelp&&<section")));
 assert.match(contextual,/data-video-ihelp-choice/);
 assert.match(contextual,/addLine\("assistant"/);
 assert.doesNotMatch(contextual,/setDraft\(|setStep\(|setAiConsent\(|onConfirm\(|onCreate\(/);
 for(const tab of ["ideas","effects","audio","text","settings","video"]){
   const help=pageHelpFromRoute({locale:"ru",pathname:"/ru/holistic-support/mandala",activeTab:tab});
   assert.equal(help.actions.length,3,tab);
 }
});
test("native Director retains protected real-video finalization and dismisses safely",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const native=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 assert.match(studio,/aria-modal=\{videoIHelpOpen\?"true":undefined\}/);
 assert.match(studio,/event\.key==="Escape"/);
 assert.match(studio,/data-video-ihelp-backdrop/);
 assert.match(studio,/data-hh-ihelp-trigger/);
 assert.match(native,/onConfirm\(\{scenario:executable\}\)/);
 assert.match(native,/onCreate\(\)/);
 assert.match(native,/data-video-chat-result/);
 assert.match(native,/const next=\{\.\.\.draft,goal:goal\.trim\(\)\.slice\(0,800\)\} as Draft/);
 assert.match(studio,/applyAutoFilm\(scenario\.presetId/);
 assert.match(studio,/onCreate=\{createQuickVideo\}/);
 assert.match(css,/data-hh-video-ihelp-open/);
 assert.match(css,/position:fixed!important/);
 const overlay=css.slice(css.lastIndexOf("/* iHelp opens the ONE existing Director"));
 assert.doesNotMatch(overlay,/pointer-events:none/);
});
