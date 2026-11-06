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
