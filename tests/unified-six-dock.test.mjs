import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {UNIFIED_DOCK_IDS,isUnifiedMobileDockHomePath,isUnifiedMobileDockPath,unifiedMobileDockActive,unifiedMobileDockHref} from "../lib/unified-mobile-dock.mjs";
import {buildPublishedVideoIndex} from "../lib/video-discovery/catalog.mjs";
import {rankDiscoveryVideos} from "../lib/video-discovery/ranker.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("one seven-button dock includes Services and My Coach on existing destinations",()=>{
 assert.deepEqual(UNIFIED_DOCK_IDS,["mytube","video","coach","ai","services","practice","profile"]);
 for(const locale of ["en","ru","es"]){
  assert.deepEqual(UNIFIED_DOCK_IDS.map(id=>unifiedMobileDockHref(locale,id)),[
   "/"+locale+"/mytube",
   "/"+locale+"/holistic-support/mandala",
   "/"+locale+"/my-coach",
   "/"+locale+"/app/messages?section=ai",
   "/"+locale+"/services",
   "/"+locale+"/holistic-support/mobile",
   "/"+(locale==="es"?"en":locale)+"/app/portrait"
  ]);
  for(const id of UNIFIED_DOCK_IDS)assert.ok(unifiedMobileDockHref(locale,id));
 }
 assert.equal(unifiedMobileDockHref("ru","unknown"),null);
 assert.equal(unifiedMobileDockHref("../../admin","profile"),null);
});
test("shared seven-tab dock has the approved labels in every language",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 const expected={
  en:{mytube:"MyTube",video:"MyVideo",coach:"My Coach",ai:"AI/Chat",services:"Services",practice:"Study",profile:"Profile"},
  ru:{mytube:"MyTube",video:"MyVideo",coach:"Мой коуч",ai:"ИИ/Чат",services:"Услуги",practice:"Обучение",profile:"Профиль"},
  es:{mytube:"MyTube",video:"MyVideo",coach:"Mi coach",ai:"IA/Chat",services:"Servicios",practice:"Estudiar",profile:"Perfil"}
 };
 for(const [locale,names] of Object.entries(expected)){
  const row=dock.split("\n").find(line=>line.trimStart().startsWith(locale+": {"));
  assert.ok(row,locale+" labels exist");
  for(const id of UNIFIED_DOCK_IDS)
   assert.ok(row.includes(id+': "'+names[id]+'"'),locale+" label for "+id);
 }
 assert.match(dock,/Выбор коуча/);
 assert.match(dock,/Choose a coach/);
});

test("standalone public tabs bypass native link handoff but not private CSP",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 assert.ok(dock.includes('["mytube", "video", "practice", "coach", "services"].includes(id)'));
 assert.ok(dock.includes('window.matchMedia?.("(display-mode: standalone)")'));
 assert.ok(dock.includes('(window.navigator as Navigator & {standalone?: boolean}).standalone'));
 assert.ok(dock.includes("event.preventDefault();"));
 assert.ok(dock.includes("router.push(href);"));
 assert.ok(!dock.includes('"ai", "profile"].includes(id)'));
 assert.ok(!dock.includes("window.open("));
 const csp=read("components/csp-navigation-boundary.tsx");
 assert.ok(csp.includes("window.location.assign(url.href)"));
});

test("Holistic House Home and Free Analysis share exactly one fixed seven-button dock",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 const shell=read("app/unified-mobile-dock.css");
 const legacy=read("components/mobile-bottom-navigation.tsx");
 const review=read("app/[locale]/services/free-situation-review/page.tsx");
 const menu=read("components/site-navigation.tsx");
 const model=read("lib/site-navigation-model.js");
 for(const path of ["/","/ru","/en","/es","/ru/","/en/"]){
  assert.ok(isUnifiedMobileDockHomePath(path),path);
  assert.ok(isUnifiedMobileDockPath(path),path);
  assert.equal(unifiedMobileDockActive(path),null,"homepage has no artificially selected app tab");
 }
 for(const path of ["/ru/mytube","/en/app/portrait","/ru/practice"])
  assert.equal(isUnifiedMobileDockHomePath(path),false);
 assert.ok(dock.includes("data-hh-home-route={homeRoute || undefined}"));
 assert.ok(shell.includes("body:has([data-hh-unified-dock]) .mobile-bottom-navigation{display:none!important}"));
 assert.ok(!shell.includes("@media not (display-mode: standalone)"));
 assert.ok(shell.includes("body:has([data-hh-unified-dock][data-hh-home-route])"));
 assert.ok(shell.includes('[data-free-entry-landing="situation"]'));
 assert.ok(legacy.includes("isUnifiedMobileDockPath(pathname)"));
 assert.ok(review.includes('FreeEntryLanding locale={locale} kind="situation"'));
 assert.ok(model.includes("compactNavigationIds = ['home', 'analysis', 'courses', 'profile', 'alchemy', 'pro', 'temple']"));
 assert.ok(menu.includes("id: 'practice', label: text.practice, href: '/' + activeLocale + '/holistic-support/mobile'"));
 assert.ok(menu.includes("id: 'my-coach', label: myCoachMenuCopy[activeLocale], href: '/' + activeLocale + '/my-coach'"));
 assert.ok(menu.includes('data-nav-item="services"'), 'Public Services remains a reachable menu item');
 for(const language of ["Practice","Практика","Práctica"])assert.ok(model.includes(language));
});

test("route-aware single dock, guest/signed-in consistency and private pages excluded",()=>{
 for(const locale of ["en","ru","es"]){
  for(const path of ["mytube","holistic-support/mandala","holistic-support/mobile","practice",
   "app/messages","app/portrait","app/practice","temple-insights","masters","my-coach","services","services/free-situation-review"]){
   assert.ok(isUnifiedMobileDockPath("/"+locale+"/"+path),path);
  }
  assert.equal(unifiedMobileDockActive("/"+locale+"/mytube"),"mytube");
  assert.equal(unifiedMobileDockActive("/"+locale+"/holistic-support/mandala"),"video");
  assert.equal(unifiedMobileDockActive("/"+locale+"/holistic-support/mandala","#video-director-chat"),"ai");
  assert.equal(unifiedMobileDockActive("/"+locale+"/holistic-support/mobile"),"practice");
  assert.equal(unifiedMobileDockActive("/"+locale+"/practice"),"practice");
  assert.equal(unifiedMobileDockActive("/"+locale+"/app/practice"),"practice");
  assert.equal(unifiedMobileDockActive("/"+locale+"/app/messages"),"ai");
  assert.equal(unifiedMobileDockActive("/"+locale+"/app/portrait"),"profile");
  assert.equal(unifiedMobileDockActive("/"+locale+"/masters"),null);
  assert.equal(unifiedMobileDockActive("/"+locale+"/my-coach"),"coach");
   assert.equal(unifiedMobileDockActive("/"+locale+"/masters"),null);
  assert.equal(unifiedMobileDockActive("/"+locale+"/services"),"services");
  assert.equal(unifiedMobileDockActive("/"+locale+"/services/free-situation-review"),"services");
  assert.equal(isUnifiedMobileDockPath("/"+locale+"/app/document-view"),false);
  assert.equal(isUnifiedMobileDockPath("/"+locale+"/client/private-selector"),false);
 }
 assert.equal(isUnifiedMobileDockPath("/admin"),false);
 assert.equal(isUnifiedMobileDockPath("/ru/app/runs"),false);
 assert.equal(isUnifiedMobileDockPath("/ru/holistic-support/mandala-evil"),false);
});
test("one screenshot-1 style seven-button dock and protected old docks removed visually",()=>{
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
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
 assert.match(css,/position:fixed/);
 assert.match(css,/safe-area-inset-bottom/);
 // Center fixed UI without a translated compositing layer on iPhone Safari.
 assert.match(css,/left:0;right:0;margin-inline:auto/);
 assert.doesNotMatch(css,/translate3d/);
 assert.match(css,/position:fixed;z-index:58;bottom:0;/);
 assert.doesNotMatch(css,/--hh-unified-viewport-inset|100vh\s*-\s*100dvh|bottom:max\(/);
 assert.ok(dock.includes('const visualOffsetTop = viewport?.offsetTop ?? 0'));
 assert.match(dock,/visualKeyboardOpen\(/);
 assert.match(dock,/visualDockBottomOffset\(/);
 assert.doesNotMatch(dock,/visualDockBottomCorrection\(|mobileVisualBottomGap\(|--hh-unified-viewport-inset/);
 assert.doesNotMatch(hide,/--hh-unified-viewport-inset/);
 assert.match(dock,/viewport\?\.addEventListener\("scroll", update/);
 assert.match(dock,/viewport\?\.removeEventListener\("scroll", update/);
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
 assert.doesNotMatch(assistant,/holistic-support\/mandala#video-director-chat/);
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
 assert.doesNotMatch(agent,/holistic-support\/mandala#video-director-chat/);
 assert.match(agent,/HolisticAgentChat/);
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


test("MyTube keeps all real directions in one row and expands true subcategories only on demand",()=>{
 const page=read("app/[locale]/mytube/page.tsx");
 const style=read("app/[locale]/mytube/mytube.module.css");
 const discovery=read("components/video-discovery.tsx");
 const css=read("components/video-discovery.module.css");
 const browser=read("scripts/verify-unified-six-dock-browser.mjs");
 const iHelpCss=read("components/sitewide-ihelp.module.css");
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
 assert.match(css,/\.mytube \.mytubeCategoryRail\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css.slice(css.indexOf("/* MyTube-only compact five-choice editorial taxonomy.")),/overflow-x:auto/);
 assert.match(discovery,/data-mytube-language-control/);
 assert.match(discovery,/mytubeCategoryId!=="all"&&<div className=\{styles\.mytubeSubcategoryRail\}/);
 assert.match(css,/\.mytube \.compactMoreButton\{/);
 assert.match(discovery,/data-mytube-format-mode=\{mode\}/);
 assert.match(browser,/rail\.evaluate\(el=>el\.scrollWidth<=el\.clientWidth\+2\)/);
 assert.ok(iHelpCss.includes(":global(body:has([data-mytube-page])) .launcher{"));
 assert.match(browser,/floating iHelp must not block original-language choices/);
 assert.match(browser,/refined\.isVisible\(\),false/);
});
test("Shorts / Study are exclusive editorial shelves and unknown lengths remain available",async()=>{
 const {classifyMyTubeFormat,matchesMyTubeFormat,myTubeFormatCounts}=await import("../lib/video-discovery/mytube-duration.mjs");
 const cards=[
  {sourceGroup:"site-introduction",title:"Introduction",durationVerifiedSeconds:null},
  {sourceGroup:"tantra-reiki",title:"Tantra Reiki Practice",durationVerifiedSeconds:null},
  {contentType:"course_lesson",title:"Course day 1",durationVerifiedSeconds:120},
 ];
 assert.deepEqual(cards.map(classifyMyTubeFormat),["shorts","study","study"]);
 assert.deepEqual(myTubeFormatCounts(cards),{all:3,shorts:1,study:2});
 assert.equal(matchesMyTubeFormat(cards[0],"shorts"),true);
 assert.equal(matchesMyTubeFormat(cards[0],"study"),false);
 assert.equal(matchesMyTubeFormat(cards[1],"study"),true);
 assert.equal(matchesMyTubeFormat(cards[1],"all"),true);
});

