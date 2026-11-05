import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {UNIFIED_DOCK_IDS,isUnifiedMobileDockHomePath,isUnifiedMobileDockPath,unifiedMobileDockActive,unifiedMobileDockHref} from "../lib/unified-mobile-dock.mjs";
import {buildPublishedVideoIndex} from "../lib/video-discovery/catalog.mjs";
import {rankDiscoveryVideos} from "../lib/video-discovery/ranker.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("owner-approved exact six dock destinations, no seventh or displaced center AI",()=>{
 assert.deepEqual(UNIFIED_DOCK_IDS,["mytube","video","ai","practice","master","profile"]);
 for(const locale of ["en","ru","es"]){
  assert.deepEqual(UNIFIED_DOCK_IDS.map(id=>unifiedMobileDockHref(locale,id)),[
   "/"+locale+"/mytube",
   "/"+locale+"/holistic-support/mandala",
   "/"+locale+"/app/messages?section=ai",
   "/"+locale+"/holistic-support/mobile",
   "/"+locale+"/practice",
   "/"+(locale==="es"?"en":locale)+"/app/portrait"
  ]);
  for(const id of UNIFIED_DOCK_IDS)assert.ok(unifiedMobileDockHref(locale,id));
 }
 assert.equal(unifiedMobileDockHref("ru","unknown"),null);
 assert.equal(unifiedMobileDockHref("../../admin","profile"),null);
});
test("standalone public tabs bypass native link handoff but not private CSP",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 assert.ok(dock.includes('["mytube", "video", "practice", "master"].includes(id)'));
 assert.ok(dock.includes('window.matchMedia?.("(display-mode: standalone)")'));
 assert.ok(dock.includes('(window.navigator as Navigator & {standalone?: boolean}).standalone'));
 assert.ok(dock.includes("event.preventDefault();"));
 assert.ok(dock.includes("router.push(href);"));
 assert.ok(!dock.includes('"ai", "profile"].includes(id)'));
 assert.ok(!dock.includes("window.open("));
 const csp=read("components/csp-navigation-boundary.tsx");
 assert.ok(csp.includes("window.location.assign(url.href)"));
});

test("installed Home uses the six-tab Practice dock but browser keeps seven journeys",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 const shell=read("app/unified-mobile-dock.css");
 const menu=read("components/site-navigation.tsx");
 const routes=read("lib/site-navigation-model.js");
 for(const path of ["/","/ru","/en","/es","/ru/","/en/"]){
  assert.ok(isUnifiedMobileDockHomePath(path),path);
  assert.ok(isUnifiedMobileDockPath(path),path);
  assert.equal(unifiedMobileDockActive(path),null,"homepage is not a selected app tab");
 }
 for(const path of ["/ru/mytube","/en/app/portrait","/ru/practice"])
  assert.equal(isUnifiedMobileDockHomePath(path),false);
 assert.ok(dock.includes("data-hh-home-route={homeRoute || undefined}"));
 assert.ok(shell.includes("@media (display-mode: standalone)"));
 assert.ok(shell.includes("@media not (display-mode: standalone)"));
 assert.ok(shell.includes("[data-hh-unified-dock][data-hh-home-route]"));
 assert.ok(shell.includes("body:has([data-hh-unified-dock]:not([data-hh-home-route])) .mobile-bottom-navigation"));
 assert.ok(routes.includes("compactNavigationIds = ['home', 'analysis', 'courses', 'profile', 'alchemy', 'pro', 'temple']"));
 assert.ok(menu.includes("id: 'practice', label: text.practice, href: '/' + activeLocale + '/holistic-support/mobile'"));
 for(const language of ["Practice","Практика","Práctica"])assert.ok(routes.includes(language));
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
 // Keep the iPhone dock anchored to the viewport; Safari's native bottom
 // controls must never cause an extra JS-computed vertical offset.
 assert.match(css,/translate3d\(-50%,0,0\)/);
 assert.match(css,/position:fixed;z-index:58;bottom:0;/);
 assert.doesNotMatch(css,/--hh-unified-viewport-inset|100vh\s*-\s*100dvh|bottom:max\(/);
 assert.ok(dock.includes('const visualOffsetTop = viewport?.offsetTop ?? 0'));
 assert.match(dock,/visualKeyboardOpen\(/);
 assert.doesNotMatch(dock,/visualDockBottomCorrection\(|mobileVisualBottomGap\(|--hh-unified-viewport-inset/);
 assert.doesNotMatch(hide,/--hh-unified-viewport-inset/);
 assert.doesNotMatch(dock,/addEventListener\("scroll", update/);
 assert.doesNotMatch(dock,/removeEventListener\("scroll", update/);
 assert.match(dock,/hideForKeyboard/);
 assert.match(css,/min-height:52px/);
 for(const former of ["data-support-mobile-bottom-nav","data-mandala-support-bottom-nav",
  ".hh-mobile-app-nav",".hh-practice-inner-dock","data-legacy-practice-bottom-nav",".mobile-bottom-navigation"])
  assert.ok(hide.includes(former),former);
});
test("center AI opens the existing Messenger agent; Video Director is a separate real action",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 assert.match(dock,/data-video-director-chat-details/);
 assert.match(dock,/detail.open = true/);
 const chat=read("components/mandala-video-director-chat.tsx");
 assert.match(chat,/data-video-chat-top-tabs/);
 assert.match(chat,/app\/messages\?section=orders/);
 assert.match(chat,/app\/messages\?section=clients/);
 const privateMessages=read("components/app/messages-orders-clients.jsx");
 assert.match(privateMessages,/data-chat-top-tabs/);
 assert.match(privateMessages,/id="hh-ai-panel"/);
 const assistant=read("components/app/messenger-ai-workspace.jsx");
 assert.match(assistant,/holistic-support\/mandala#video-director-chat/);
 assert.match(assistant,/HolisticAgentChat/);
 assert.match(privateMessages,/role="tab"/);
});
test("both private message composers reserve the real visible dock boundary without spoofed chat delivery",()=>{
 const orders=read("components/app/messages-orders-clients.jsx");
 const clients=read("components/app/messages-simple-inbox.jsx");
 assert.match(orders,/querySelector\('\[data-hh-unified-dock\]'\)/);
 assert.match(orders,/getBoundingClientRect\(\).top/);
 assert.match(clients,/querySelector\('\[data-hh-unified-dock\]'\)/);
 assert.match(clients,/availableInboxHeight\(/);
 assert.match(clients,/navigationTop:navTop/);
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


test("central AI navigates to the single Messenger, original video deep link remains available",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 const agent=read("components/app/messenger-ai-workspace.jsx");
 assert.match(dock,/data-hh-unified-dock/);
 assert.match(dock,/data-video-director-chat-details/);
 assert.match(agent,/holistic-support\/mandala#video-director-chat/);
 assert.doesNotMatch(dock,/onClick=\{id === "ai" \? \(\) =>/);
});

// Keep the original Video Director accordion synchronized with React state.
test("manual Video Director disclosure remains synchronized with React state",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 assert.match(studio,/data-video-director-chat-details/);
 assert.match(studio,/onToggle=\{event=>setDirectorChatOpen\(event\.currentTarget\.open\)\}/);
});


test("Video Mandala uses a compact, public mobile header and Reiki filters cannot lift navigation",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const studioCss=read("components/mandala-video-mobile.module.css");
 const supportCss=read("components/holistic-support-mobile.module.css");
 const originalDock=read("components/holistic-support-mandala-dock.tsx");
 const global=read("app/unified-mobile-dock.css");
 assert.ok(studio.includes('href={"/"+locale+"/holistic-support/mobile"} prefetch={false} className={videoStyles.quickBrandBack}'));
 assert.match(studio,/quickBrandMobileTitle/);
 for(const translated of ["Видео-мандала","Vídeo mandala","Video mandala"])
  assert.ok(studio.includes(translated),translated);
 assert.match(studioCss,/\.quickBrandMobileTitle\{display:none\}/);
 assert.match(studioCss,/\.studio \.quickBrandMobileTitle\{\s*display:block/);
 assert.doesNotMatch(supportCss,/\.page:has\(\[data-support-reiki-central\]\[data-active-tab="filter"\]\) \.bottomNav\s*\{/);
 assert.match(originalDock,/data-mandala-legacy-header/);
 assert.match(global,/data-mandala-legacy-header/);
 assert.match(global,/data-mandala-support-bottom-nav/);
});


test("MyTube stays dark with a swipeable direction rail and expandable deeper filters",()=>{
 const page=read("app/[locale]/mytube/page.tsx");
 const style=read("app/[locale]/mytube/mytube.module.css");
 const discovery=read("components/video-discovery.tsx");
 const css=read("components/video-discovery.module.css");
 const browser=read("scripts/verify-unified-six-dock-browser.mjs");
 assert.match(page,/themeColor:"#0f0f0f"/);
 assert.match(style,/--mytube-bg:#0f0f0f/);
 assert.match(discovery,/data-mytube-category-rail/);
 assert.match(discovery,/data-mytube-filter-toggle/);
 assert.match(discovery,/aria-controls="mytube-refine-controls mytube-more-controls"/);
 assert.match(discovery,/hidden=\{variant==="mytube"&&!filtersOpen\}/);
 assert.match(discovery,/listMyTubeScenarios\(mytubeTopicId,locale\)/);
 for(const name of ["data-mytube-categories","data-mytube-subcategories","data-mytube-topics","data-mytube-scenarios"])
  assert.match(discovery,new RegExp(name));
 assert.match(css,/\.mytube \.mytubeCategoryRail\{/);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/\.mytube \.compactMoreButton\{/);
 assert.match(discovery,/data-mytube-duration-mode=\{mode\}/);
 assert.match(browser,/rail\.evaluate\(el=>el\.scrollLeft\)/);
 assert.match(browser,/refined\.isVisible\(\),false/);
});
test("Shorts / Study are exclusive and do not invent lengths for unverified videos",async()=>{
 const {matchesMyTubeDuration,MYTUBE_STUDY_MIN_SECONDS}=await import("../lib/video-discovery/mytube-duration.mjs");
 assert.equal(MYTUBE_STUDY_MIN_SECONDS,600);
 assert.equal(matchesMyTubeDuration(599,"shorts"),true);
 assert.equal(matchesMyTubeDuration(600,"shorts"),false);
 assert.equal(matchesMyTubeDuration(600,"study"),true);
 assert.equal(matchesMyTubeDuration(601,"study"),true);
 assert.equal(matchesMyTubeDuration(undefined,"all"),true);
 assert.equal(matchesMyTubeDuration(undefined,"shorts"),false);
 assert.equal(matchesMyTubeDuration(null,"study"),false);
});

