import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {UNIFIED_DOCK_IDS,isUnifiedMobileDockPath,unifiedMobileDockActive,unifiedMobileDockHref} from "../lib/unified-mobile-dock.mjs";
import {buildPublishedVideoIndex} from "../lib/video-discovery/catalog.mjs";
import {rankDiscoveryVideos} from "../lib/video-discovery/ranker.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("owner-approved exact six dock destinations, no seventh or displaced center AI",()=>{
 assert.deepEqual(UNIFIED_DOCK_IDS,["mytube","video","ai","practice","master","profile"]);
 for(const locale of ["en","ru","es"]){
  assert.deepEqual(UNIFIED_DOCK_IDS.map(id=>unifiedMobileDockHref(locale,id)),[
   "/"+locale+"/mytube",
   "/"+locale+"/holistic-support/mandala",
   "/"+locale+"/holistic-support/mandala#video-director-chat",
   "/"+locale+"/holistic-support/mobile",
   "/"+locale+"/practice",
   "/"+(locale==="es"?"en":locale)+"/app/portrait"
  ]);
  for(const id of UNIFIED_DOCK_IDS)assert.ok(unifiedMobileDockHref(locale,id));
 }
 assert.equal(unifiedMobileDockHref("ru","unknown"),null);
 assert.equal(unifiedMobileDockHref("../../admin","profile"),null);
});
test("route-aware single dock, guest/signed-in consistency and private pages excluded",()=>{
 for(const locale of ["en","ru","es"]){
  for(const path of ["mytube","holistic-support/mandala","holistic-support/mobile","practice",
   "app/messages","app/portrait","app/practice","temple-insights"]){
   assert.ok(isUnifiedMobileDockPath("/"+locale+"/"+path),path);
  }
  assert.equal(unifiedMobileDockActive("/"+locale+"/mytube"),"mytube");
  assert.equal(unifiedMobileDockActive("/"+locale+"/holistic-support/mandala"),"video");
  assert.equal(unifiedMobileDockActive("/"+locale+"/holistic-support/mandala","#video-director-chat"),"ai");
  assert.equal(unifiedMobileDockActive("/"+locale+"/holistic-support/mobile"),"practice");
  assert.equal(unifiedMobileDockActive("/"+locale+"/practice"),"master");
  assert.equal(unifiedMobileDockActive("/"+locale+"/app/practice"),"master");
  assert.equal(unifiedMobileDockActive("/"+locale+"/app/messages"),"ai");
  assert.equal(unifiedMobileDockActive("/"+locale+"/app/portrait"),"profile");
  assert.equal(isUnifiedMobileDockPath("/"+locale+"/app/document-view"),false);
  assert.equal(isUnifiedMobileDockPath("/"+locale+"/client/private-selector"),false);
 }
 assert.equal(isUnifiedMobileDockPath("/admin"),false);
 assert.equal(isUnifiedMobileDockPath("/ru/app/runs"),false);
 assert.equal(isUnifiedMobileDockPath("/ru/holistic-support/mandala-evil"),false);
});
test("one screenshot-1 style six-button dock and protected old docks removed visually",()=>{
 const page=read("app/layout.tsx");
 const dock=read("components/unified-mobile-dock.tsx");
 const css=read("components/unified-mobile-dock.module.css");
 const hide=read("app/unified-mobile-dock.css");
 assert.match(page,/<UnifiedMobileDock initialLocale=\{lang\}/);
 assert.match(page,/unified-mobile-dock.css/);
 assert.match(dock,/UNIFIED_DOCK_IDS.map/);
 assert.match(dock,/data-unified-dock-item=\{id\}/);
 assert.match(dock,/aria-current=\{active === id \? "page" : undefined\}/);
 assert.match(dock,/data-keyboard-open/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/position:fixed/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/min-height:52px/);
 for(const former of ["data-support-mobile-bottom-nav","data-mandala-support-bottom-nav",
  ".hh-mobile-app-nav",".hh-practice-inner-dock","data-legacy-practice-bottom-nav",".mobile-bottom-navigation"])
  assert.ok(hide.includes(former),former);
});
test("AI is the existing video director; top tabs preserve actual private Orders and Clients",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 assert.match(dock,/data-video-director-chat-details/);
 assert.match(dock,/detail.open = true/);
 const chat=read("components/mandala-video-director-chat.tsx");
 assert.match(chat,/data-video-chat-top-tabs/);
 assert.match(chat,/app\/messages\?section=orders/);
 assert.match(chat,/app\/messages\?section=clients/);
 const privateMessages=read("components/app/messages-orders-clients.jsx");
 assert.match(privateMessages,/data-chat-top-tabs/);
 assert.match(privateMessages,/holistic-support\/mandala#video-director-chat/);
 assert.match(privateMessages,/role="tab"/);
});
test("Practice has real Courses and Services choices and Ideas linked to existing editorial route",()=>{
 const support=read("components/holistic-support-mobile.tsx");
 assert.match(support,/data-support-practice-tabs/);
 assert.match(support,/changeChoice\("pump"\)/);
 assert.match(support,/changeChoice\("consultation"\)/);
 assert.match(support,/\/temple-insights/);
});
test("MyTube projects ONLY published public Academy/Library sources; never fabricates private videos",()=>{
 const page=read("app/[locale]/mytube/page.tsx");
 const library=read("components/library-hub.tsx");
 const video=read("components/video-discovery.tsx");
 const feed=read("components/library-feed.tsx");
 assert.match(page,/loadPublicLibraryFeed/);
 assert.match(page,/loadApprovedVideoDiscoveries/);
 assert.match(library,/buildPublicVideoDiscoveryItems/);
 assert.match(video,/data-mytube-search/);
 assert.match(video,/videoLayout=\{variant==="mytube"\?"mytube":"default"\}/);
 assert.match(feed,/https:\/\/www.youtube-nocookie.com\/embed\//);
 assert.match(feed,/playing \? \(/);
 const good={id:"good",kind:"video",youtubeId:"ab123456789",title:"Calm",description:"Practice",
   sourceApproved:true,lifeAreas:["energy_health"],topicTags:["stress"]};
 const candidate={...good,id:"not-approved",youtubeId:"cd123456789",editorial_status:"candidate"};
 const external={...good,id:"external",youtubeId:"ef123456789",source_kind:"external",sourceApproved:false};
 const privateItem={...good,id:"client",youtubeId:"gh123456789",status:"unlisted_private"};
 const rows=buildPublishedVideoIndex([good,candidate,external,privateItem]);
 assert.deepEqual(rows.map(item=>item.youtubeId),["ab123456789"]);
 assert.equal(rankDiscoveryVideos(rows,{area:"energy_health",goal:"stress"}).length,1);
 assert.equal(rankDiscoveryVideos(rows,{area:"business"}).length,0);
});

test("MyTube unified branch triggers real macOS WebKit, without hiding specialist failures",()=>{
 const workflow=read(".github/workflows/holistic-support-mandala.yml");
 const guard=workflow.split("  voice-webkit-macos:")[1]?.split("    runs-on:")[0]||"";
 assert.match(guard,/github.event.pull_request.draft == false/);
 assert.match(guard,/startsWith\(github.head_ref, 'feat\/mytube-unified-six-bottom-'\)/);
 assert.doesNotMatch(guard,/if:\s*\$\{\{\s*always\(\)/);
 assert.match(workflow,/runs-on: macos-15/);
 assert.match(workflow,/HH_VOICE_E2E_ENGINE: webkit/);
});
