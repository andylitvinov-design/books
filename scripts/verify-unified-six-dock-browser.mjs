import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3100";
const url=new URL(origin);
if(!["localhost","127.0.0.1"].includes(url.hostname)||
 !["http:","https:"].includes(url.protocol))throw Error("Use an isolated local QA server");
const folder="artifacts/unified-six-dock";
mkdirSync(folder,{recursive:true});
const results=[];
const ids=["mytube","video","ai","practice","master","profile","analysis"];

// The fixed dock belongs to the ROOT shell, not to individual pages. Check
// every user-reported route: guest public Studio/Practice/Master, public MyTube,
// and the signed-out shell for protected AI Messenger/Profile. Authenticated
// iPhone E2E is a separate acceptance requirement, never impersonated here.
async function assertPinnedSixDock(page, id, active) {
  const dock=page.locator("[data-hh-unified-dock]");
  await dock.waitFor({state:"visible",timeout:30000});
  await page.waitForFunction(expected=>{
    const node=document.querySelector("[data-hh-unified-dock]");
    return !!node?.querySelector('[data-unified-dock-item="'+expected+'"][aria-current="page"]');
  },active,{timeout:15000});
  const buttons=await dock.locator("[data-unified-dock-item]").evaluateAll(
    els=>els.map(el=>el.dataset.unifiedDockItem));
  assert.deepEqual(buttons,ids,id+" one consistent seven-item navigation");
  const oldDock='[data-support-mobile-bottom-nav]:visible,'+
    '[data-mandala-support-bottom-nav]:visible,.hh-mobile-app-nav:visible,'+
    '.hh-practice-inner-dock:visible,[data-legacy-practice-bottom-nav]:visible,'+
    '.mobile-bottom-navigation:visible';
  assert.equal(await page.locator(oldDock).count(),0,id+" no duplicated legacy footer");
  for(const point of ["top","middle","bottom","top"]){
    await page.evaluate(async point=>{
      const root=document.scrollingElement||document.documentElement;
      const max=Math.max(0,root.scrollHeight-window.innerHeight);
      const top=point==="bottom"?max:point==="middle"?max/2:0;
      window.scrollTo({top,behavior:"instant"});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    },point);
    const position=await dock.evaluate(node=>{
      const rect=node.getBoundingClientRect(),v=window.visualViewport;
      const style=window.getComputedStyle(node);
      return {css:style.position,bottom:style.bottom,rectBottom:rect.bottom,
        visibleBottom:v?v.offsetTop+v.height:window.innerHeight,
        staleInset:document.body.style.getPropertyValue("--hh-unified-viewport-inset"),
        height:rect.height};
    });
    assert.equal(position.css,"fixed",id+" "+point+" dock is fixed");
    assert.equal(position.bottom,"0px",id+" "+point+" no viewport offset");
    assert.equal(position.staleInset,"",id+" "+point+" no stale JS correction");
    assert.ok(position.height>=52,id+" "+point+" accessible dock height");
    assert.ok(Math.abs(position.rectBottom-position.visibleBottom)<=3,
      id+" "+point+" dock stays at the visual bottom: "+JSON.stringify(position));
  }
}

async function inspect(browserType,locale,width){
 const browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,
  locale:locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-US"});
 const page=await context.newPage();
 const id=browserType.name()+":"+locale+":"+width;
 try{
  await page.goto(origin+"/"+locale+"/mytube",{waitUntil:"domcontentloaded",timeout:75000});
  await page.locator("[data-mytube-page]").waitFor({timeout:45000});
  assert.equal(await page.locator("[data-sitewide-antistress-banner]").count(),0,
    id+" video feed must not display the global free-review promotion");
  const dock=page.locator("[data-hh-unified-dock]");
  await dock.waitFor({state:"visible",timeout:20000});
  await page.waitForFunction(()=>{
    const page=document.querySelector("[data-mytube-page]");
    return page && getComputedStyle(page).backgroundColor==="rgb(15, 15, 15)";
  },null,{timeout:20000});
  const dockBackground=await dock.evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.match(dockBackground,/^rgba?\(15, 15, 15/,
    id+" dark dock applies only to MyTube");
  const moreFilters=page.locator("[data-mytube-filter-toggle]");
  const rail=page.locator("[data-mytube-category-rail]");
  const refined=page.locator("#mytube-refine-controls");
  const moreControls=page.locator("#mytube-more-controls");
  assert.equal(await moreFilters.getAttribute("aria-expanded"),"false",
    id+" deeper filters are initially collapsed");
  assert.equal(await rail.isVisible(),true,
    id+" selected direction is always directly visible");
  assert.equal(await refined.isVisible(),false,
    id+" deeper taxonomy must not push videos down by default");
  assert.deepEqual(
    await page.locator("[data-mytube-format-tabs] button").evaluateAll(els=>els.map(el=>el.dataset.mytubeFormatMode)),
    ["all","shorts","courses","study"],id+" four functional editorial shelves are visible");
  const filterBounds=await moreFilters.boundingBox();
  assert.ok(filterBounds&&filterBounds.height>=44&&filterBounds.height<=60,
    id+" single slim accessible taxonomy bar");
  const links=dock.locator("[data-unified-dock-item]");
  assert.deepEqual(await links.evaluateAll(els=>els.map(el=>el.dataset.unifiedDockItem)),ids,id);
  const bounds=await links.evaluateAll(els=>els.map(el=>{
   const r=el.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};
  }));
  assert.ok(bounds.every(b=>b.height>=44),id+" 44px touch height");
  assert.ok(bounds.every(b=>b.right-b.left>=44),id+" 44px touch width even with seven tabs");
  assert.ok(bounds.every((b,i)=>i===0||b.left>=bounds[i-1].right-1),id+" no dock overlap");
  const geometry=await dock.evaluate(el=>{
   const r=el.getBoundingClientRect(),v=window.visualViewport;
   return {bottom:r.bottom,visibleBottom:v?v.offsetTop+v.height:innerHeight,
     position:getComputedStyle(el).position};
  });
  assert.equal(geometry.position,"fixed",id+" six-tab dock must never scroll in page flow");
  assert.ok(Math.abs(geometry.bottom-geometry.visibleBottom)<=3,id+" footer must be pinned to Safari visual viewport");
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>{
    const el=document.querySelector("[data-hh-unified-dock]");
    if(!el)return false;
    const v=window.visualViewport;
    return Math.abs(el.getBoundingClientRect().bottom-(v?v.offsetTop+v.height:innerHeight))<=3;
  },null,{timeout:10000});
  // Regression for iPhone Safari URL-bar resizing: viewport geometry changes
  // must not leave the six-tab dock stranded above the bottom edge.
  if(browserType===webkit&&locale==="ru"&&width===390){
   for(const height of [720,844]){
    await page.setViewportSize({width,height});
    await page.waitForFunction(()=>{
     const el=document.querySelector("[data-hh-unified-dock]");
     if(!el)return false;
     const v=window.visualViewport;
     return Math.abs(el.getBoundingClientRect().bottom-(v?v.offsetTop+v.height:innerHeight))<=3;
    },null,{timeout:10000});
   }
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,id+" horizontal overflow "+overflow);
  // MyTube now uses the approved 4×4×4 editorial hierarchy, rather than the
  // retired general-library four life-area filter. Wait for hydration so Safari
  // cannot swallow the real first click on a server-rendered category.
  const categories=page.locator('[data-mytube-categories] [data-mytube-category]:not([data-mytube-category="all"])');
  assert.equal(await categories.count(),4,id+" four unique swipeable directions");
  assert.ok(await rail.evaluate(el=>el.scrollWidth>el.clientWidth),
    id+" direction choices must be horizontally scrollable");
  await rail.evaluate(el=>{el.scrollLeft=el.scrollWidth;});
  assert.ok(await rail.evaluate(el=>el.scrollLeft)>0,id+" swipe rail actually scrolls");
  await rail.evaluate(el=>{el.scrollLeft=0;});
  await page.waitForFunction(()=>{
    const button=document.querySelector("[data-mytube-category]");
    return !!button && Object.keys(button).some(key=>key.startsWith("__reactProps$"));
  },null,{timeout:15000});
  const topicRail=page.locator("[data-mytube-subcategory-rail]");
  assert.equal(await topicRail.isVisible(),true,id+" topic shortcuts remain visible above videos");
  assert.equal(await topicRail.locator('[data-mytube-subcategory]:not([data-mytube-subcategory="all"])').count(),4,
    id+" four genuine quick topics are visible before a category is selected");
  const quickLanguage=page.locator("[data-mytube-quick-language]");
  assert.equal(await quickLanguage.isVisible(),true,id+" language switcher visible");
  for(const value of ["ru","en","es","all"]){
    await quickLanguage.selectOption(value);
    assert.equal(await quickLanguage.inputValue(),value,id+" quick language "+value);
  }
  const quickDuration=page.locator("[data-mytube-duration]");
  assert.equal(await quickDuration.count(),1,id+" inline verified-duration switcher");
  if(await quickDuration.isEnabled()){
    await quickDuration.selectOption("under4");
    assert.equal(await quickDuration.inputValue(),"under4",id+" duration filters verified source length");
    await quickDuration.selectOption("all");
  }
  if(browserType===webkit&&locale==="ru"&&width===390){
   await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
   await page.screenshot({path:folder+"/mytube-webkit-ru-390.png",fullPage:false});
  }
  for(const mode of ["shorts","courses","study","all"]){
    const control=page.locator('[data-mytube-format-mode="'+mode+'"]');
    await control.click();
    assert.equal(await control.getAttribute("aria-pressed"),"true",id+" active "+mode);
    if(locale==="en" && (mode==="shorts"||mode==="study")){
      await page.waitForFunction(()=>Number(document.querySelector("[data-mytube-result-count]")?.textContent)>0,
        null,{timeout:15000});
    }
  }
  await moreFilters.click();
  assert.equal(await moreFilters.getAttribute("aria-expanded"),"true",
    id+" one filter action reveals additional filters");
  await moreControls.waitFor({state:"visible",timeout:15000});
  assert.ok(await moreControls.locator("select").count()>=1,
    id+" sort and advanced selectors remain available after opening filters");
  assert.equal(await quickLanguage.isVisible(),true,
    id+" original-audio language remains available inline");
  // Subcategory controls are intentionally empty until a direction is chosen.
  assert.equal(await refined.isVisible(),false,
    id+" no empty subcategory panel when all directions are selected");
  const area=page.locator('[data-mytube-category="energy-confidence"]');
  await area.click();
  await refined.waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>document.querySelector('[data-mytube-category="energy-confidence"]')
    ?.getAttribute("aria-pressed")==="true",null,{timeout:15000});
  const subcategories=topicRail.locator('[data-mytube-subcategory]:not([data-mytube-subcategory="all"])');
  assert.equal(await refined.locator('[data-mytube-subcategory]:not([data-mytube-subcategory="all"])').count(),4,
    id+" advanced and quick taxonomy share four genuine subcategories");
  await subcategories.first().waitFor({state:"visible",timeout:15000});
  assert.equal(await subcategories.count(),4,id+" four unambiguous subcategories");
  await subcategories.first().click();
  await page.waitForFunction(()=>{
    const first=document.querySelector('[data-mytube-subcategory-rail] [data-mytube-subcategory]:not([data-mytube-subcategory="all"])');
    return first?.getAttribute("aria-pressed")==="true";
  },null,{timeout:15000});
  const topics=page.locator('[data-mytube-topics] [data-mytube-topic]:not([data-mytube-topic="all"])');
  await topics.first().waitFor({state:"visible",timeout:15000});
  assert.equal(await topics.count(),4,id+" four distinct topics");
  await page.locator('[data-mytube-category="all"]').click();
  await page.waitForFunction(()=>{
    const rail=document.querySelector("[data-mytube-subcategory-rail]");
    return !!rail && rail.querySelector('[data-mytube-subcategory="all"]')?.getAttribute("aria-pressed")==="true" &&
      !document.querySelector("#mytube-refine-controls [data-mytube-subcategories]");
  },null,{timeout:15000});
  await moreFilters.click();
  assert.equal(await moreFilters.getAttribute("aria-expanded"),"false",
    id+" closing filters restores the compact video-first layout");
  assert.equal(await refined.isVisible(),false,
    id+" additional filters are hidden after collapse");
  assert.equal(await rail.isVisible(),true,
    id+" horizontal directions remain visible");
  const cards=page.locator('[data-video-layout="mytube"] article');
  const publishedCount=await cards.count();
  // A local CI server without approved database content must show an honest
  // empty state. It must not invent public media just to satisfy browser QA.
  if(process.env.HH_REQUIRE_APPROVED_PLAYBACK==="1")
    assert.ok(publishedCount>0,id+" published-video fixture required by release QA");
  let playerClick=false;
  if(publishedCount===0){
    assert.equal(await page.locator('[data-mytube-empty="true"]').count(),1,
      id+" honest empty reviewed catalog");
    assert.equal(await page.locator('[data-mytube-empty="true"]').isVisible(),true,
      id+" visitor sees verified empty state");
    assert.equal(await page.locator('iframe[src*="youtube-nocookie.com"]').count(),0,
      id+" no phantom/unapproved playback");
    const search=page.locator("[data-mytube-search]");
    await search.fill("source-backed-video");
    assert.equal(await search.inputValue(),"source-backed-video");
    assert.equal(await cards.count(),0,id+" empty source remains empty under search");
    await search.fill("");
  }else{
    const first=cards.first();
    const title=(await first.locator("h2").innerText()).trim();
    const search=page.locator("[data-mytube-search]");
    await search.fill(title.slice(0,Math.min(6,title.length)));
    assert.ok(await cards.count()>=1,id+" search");
    await search.fill("");
    const visual=await first.locator('[class*="visual"]').first().boundingBox();
    assert.ok(visual&&Math.abs(visual.width/visual.height-16/9)<.23,id+" 16:9 poster");
    assert.equal(await page.locator('iframe[src*="youtube-nocookie.com"]').count(),0,id+" no autoplay or pre-consent embed");
    await first.locator("button").first().click();
    await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').first().waitFor({timeout:12000});
    playerClick=true;
  }
  if(browserType===webkit&&locale==="ru"&&width===390)
   await page.screenshot({path:folder+"/mytube-webkit-ru-390-filtered.png",fullPage:false});
  results.push({id,bottom:geometry.bottom,visibleBottom:geometry.visibleBottom,
    overflow,publishedCards:publishedCount,playerClick,approvedCatalogEmpty:publishedCount===0});
  // Route matrix reuses the existing WebKit/Chromium context, avoiding another
  // runner or browser launch. Exercise Safari scrolling at 320/390/430 in RU,
  // and check EN/ES at 390. ES Profile intentionally uses the existing EN
  // account route; never add an unauthorised new private locale.
  if(locale==="ru" || width===390){
    const prefix="/"+locale;
    const routeCases=[
      ["practice",prefix+"/holistic-support/mobile"],
      ["video",prefix+"/holistic-support/mandala"],
      ["ai",prefix+"/app/messages?section=ai"],
      ["master",prefix+"/practice"],
      ["profile","/"+(locale==="es"?"en":locale)+"/app/portrait"],
      ["analysis",prefix+"/services/free-situation-review"],
    ];
    for(const [active,path] of routeCases){
      const marker=id+":"+active;
      await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:75000});
      await assertPinnedSixDock(page,marker,active);
      if(browserType===webkit && locale==="ru" && width===390)
        await page.screenshot({path:folder+"/"+active+"-webkit-ru-390-guest.png",fullPage:false});
      results.push({id:marker,pinned:true,route:path,authenticated:false});
    }
  }
  if(browserType===webkit && locale==="ru" && width===390){
    // Simulates navigator.standalone, not Safari View Controller on a phone.
    await page.addInitScript(()=>Object.defineProperty(navigator,"standalone",{
      configurable:true,value:true,
    }));
    await page.goto(origin+"/ru/holistic-support/mobile",{waitUntil:"domcontentloaded",timeout:75000});
    await page.locator("[data-hh-unified-dock]").waitFor({state:"visible"});
    // The root dock is server-rendered; wait until React owns the click
    // before testing same-document navigation (no pre-hydration hard link).
    await page.waitForFunction(()=>{
      const link=document.querySelector('[data-unified-dock-item="video"]');
      return link && Object.keys(link).some(key=>key.startsWith("__reactProps$"));
    },null,{timeout:15000});
    const initialDocument=await page.evaluate(()=>performance.timeOrigin);
    let popups=0;
    page.on("popup",()=>{popups++});
    for(const [tab,path] of [
      ["video","/ru/holistic-support/mandala"],
      ["mytube","/ru/mytube"],
      ["master","/ru/practice"],
      ["analysis","/ru/services/free-situation-review"],
      ["practice","/ru/holistic-support/mobile"],
    ]){
      await page.locator('[data-unified-dock-item="'+tab+'"]').click();
      await page.waitForURL(url=>url.pathname===path||url.pathname===path+"/",{timeout:45000});
      assert.equal(await page.evaluate(()=>performance.timeOrigin),initialDocument,
        tab+" standalone public navigation must stay in the same document");
    }
    assert.equal(popups,0,"standalone public tabs must not open another page");
    results.push({journey:"Simulated iOS standalone Practice → Video → MyTube → Master → Free Analysis → Practice",sameDocument:true});
  }
 }finally{await context.close();await browser.close();}
}
for(const locale of ["ru","en","es"]){
 for(const width of [320,390,430])await inspect(webkit,locale,width);
}
await inspect(chromium,"ru",390);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(origin+"/ru/mytube",{waitUntil:"domcontentloaded",timeout:75000});
 const dock=page.locator("[data-hh-unified-dock]");
 await dock.waitFor({state:"visible"});
 await dock.locator('[data-unified-dock-item="video"]').click();
 await page.waitForURL(/\/ru\/holistic-support\/mandala\/?$/,{timeout:45000});
 await page.locator("[data-hh-unified-dock]").waitFor({state:"visible"});
 const videoHeader=page.locator("[data-video-hypno-scroll-start]");
 await videoHeader.waitFor({state:"visible",timeout:45000});
 // The approved compact video-first header deliberately hides its older
 // standalone title and shows the branded studio identity instead. Assert
 // the ACTUAL visible mobile design, not a retired screenshot-era label.
 const studioIdentity=videoHeader.locator('[class*="quickBrandIdentity"]');
 assert.equal((await studioIdentity.innerText()).trim(),"Holistic House\nВидеостудия · Создание видео",
   "Video has the approved compact Holistic House studio identity");
 assert.equal(await videoHeader.locator('[class*="quickBrandMobileTitle"]').isVisible(),false,
   "the retired alternate mobile title stays hidden to avoid double heading");
 assert.equal(await page.locator("[data-mandala-legacy-header]:visible").count(),0,
   "no duplicate end-of-page header");
 assert.equal(await page.locator("[data-mandala-support-bottom-nav]:visible").count(),0,
   "no legacy footer alongside the unified dock");
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 await page.waitForFunction(()=>{
   const el=document.querySelector("[data-hh-unified-dock]");
   if(!el)return false;
   const v=window.visualViewport;
   return Math.abs(el.getBoundingClientRect().bottom-(v?v.offsetTop+v.height:innerHeight))<=3;
 },null,{timeout:10000});
 await page.locator('[data-unified-dock-item="ai"]').click();
 await page.waitForURL(/\/ru\/app\/messages\?section=ai/,{timeout:30000});
 await page.locator("[data-chat-top-tabs]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-chat-top-tabs] > *").count(),4,
   "Messenger rail now has AI, Orders, Clients and News");
 const news=page.locator('[data-chat-top-tabs] button[aria-controls="hh-news-panel"]');
 assert.equal(await news.count(),1,"News tab is visible and uniquely addressable");
 await news.click();
 await page.locator('[data-orders-clients-hub][data-section="news"]').waitFor({state:"visible",timeout:30000});
 await page.locator("#hh-news-panel").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("#hh-ai-panel").isVisible(),false,
   "the private News panel does not overlay the AI conversation");
 await page.locator('[data-chat-top-tabs] button[aria-controls="hh-ai-panel"]').click();
 await page.locator("#hh-ai-panel").waitFor({state:"visible",timeout:30000});
 const chat=page.locator("[data-hh-agent-preview]");
 await chat.waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-chat-menu-rail]").count(),0,
   "obsolete five-button rail must not consume transcript space");
 await chat.locator("[data-hh-ai-welcome]").waitFor({state:"visible"});
 const log=chat.locator('[role="log"]');
 const starters=chat.locator('[data-hh-ai-start]');
 assert.equal(await starters.count(),4,"real video, meditation, test and master start actions");
 for(const id of ["video","meditation","hint","master"]){
   const item=chat.locator('[data-hh-ai-start="'+id+'"]');
   await item.waitFor({state:"visible"});
   const rect=await item.boundingBox();
   assert.ok(rect&&rect.width>=44&&rect.height>=44,id+" accessible start button");
 }
 const before=await log.locator("p").count();
 await chat.locator('[data-hh-ai-start="video"]').click();
 await page.waitForFunction(count=>{
   const root=document.querySelector("[data-hh-agent-preview]");
   return root?.getAttribute("data-has-messages")==="true"
     && root.querySelectorAll('[role="log"] p').length>=count+2;
 },before,{timeout:10000});
 assert.equal(await starters.count(),0,"introduction gives way to the live transcript");
 // The current Create Content entry deliberately asks format -> source -> short
 // personal idea BEFORE the canonical video goal tree. Earlier browser QA
 // expected the retired one-tap goal branch and timed out without testing it.
 const contentKinds=chat.locator('[data-hh-content-step="kind"] [data-hh-content-kind]');
 await contentKinds.first().waitFor({state:"visible",timeout:15000});
 assert.deepEqual(await contentKinds.evaluateAll(nodes=>nodes.map(node=>
   node.getAttribute("data-hh-content-kind"))),
   ["video","audio","meditation","message"],
   "Create Content exposes four real formats before video planning");
 assert.equal(await chat.locator("[data-hh-video-sign-in]").count(),0,
   "no Google login at content-format choice");
 await chat.locator('[data-hh-content-step="kind"] [data-hh-content-kind="video"]').click();
 const contentSources=chat.locator('[data-hh-content-step="source"] [data-hh-content-source]');
 await contentSources.first().waitFor({state:"visible",timeout:15000});
 assert.deepEqual(await contentSources.evaluateAll(nodes=>nodes.map(node=>
   node.getAttribute("data-hh-content-source"))),
   ["text","voice"],"video supports the two approved input methods");
 await chat.locator('[data-hh-content-step="source"] [data-hh-content-source="text"]').click();
 await chat.locator('[data-hh-content-step="brief"]').waitFor({state:"attached",timeout:15000});
 await chat.locator("textarea").fill("Хочу больше спокойствия и уверенности");
 await chat.locator('button[type="submit"]').click();
 await chat.locator('[data-hh-video-chat-step="category"]').waitFor({state:"visible",timeout:15000});
 // Personal-video creation has the exact MyTube four-goal hierarchy, no
 // unrelated ready-made-video CTA and no Google wall before the brief.
 const videoGoals=chat.locator("[data-hh-video-chat-options] [data-hh-video-chat-choice]");
 await videoGoals.first().waitFor({state:"visible"});
 assert.deepEqual(await videoGoals.evaluateAll(nodes=>nodes.map(node=>
   node.getAttribute("data-hh-video-chat-choice"))),
   ["goals-money","love-relationships","energy-confidence","stress-anxiety"]);
 assert.equal(await chat.locator("[data-hh-guest-ready-videos]").count(),0,
   "personal video branch must not offer ready-made videos");
 assert.equal(await chat.locator("[data-hh-video-sign-in]").count(),0,
   "guest prepares the personal video without premature Google login");
 const personal=chat.locator("[data-hh-personal-video-request]");
 assert.equal(await personal.isDisabled(),true,"pick a video goal before continuing");
 await videoGoals.nth(1).click();
 assert.equal(await personal.isEnabled(),true,"selected video goal enables personal brief");
 await personal.click();
 await chat.locator('[data-hh-video-chat-step="subcategory"]').waitFor({state:"visible"});
 const subcategoryChoices=chat.locator('[data-hh-video-chat-step="subcategory"] [data-hh-video-chat-choice]');
 assert.equal(await subcategoryChoices.count(),4,"chosen category owns four exclusive subcategories");
 await subcategoryChoices.first().click();
 await chat.locator('[data-hh-video-chat-step="mytube-topic"]').waitFor({state:"visible"});
 const canonicalTopics=chat.locator('[data-hh-video-chat-step="mytube-topic"] [data-hh-video-chat-choice]');
 assert.equal(await canonicalTopics.count(),4,"chosen subcategory owns four exact canonical topics");
 await canonicalTopics.first().click();
 await chat.locator('[data-hh-video-chat-step="topic"]').waitFor({state:"visible"});
 await page.waitForFunction(()=>{
   const el=document.querySelector('[data-hh-agent-preview] [role="log"]');
   return !!el&&el.scrollHeight-el.scrollTop-el.clientHeight<12;
 },null,{timeout:10000});
 assert.equal(await chat.locator("[data-hh-video-sign-in]").count(),0,
   "no login before the creative questionnaire");
 const agentComposer=chat.locator("textarea");
 await agentComposer.waitFor({state:"visible"});
 assert.equal((await agentComposer.inputValue()).trim(),"",
   "clicking Video asks a question in chat, not a fake prepared send");
 await agentComposer.fill("Привет Ау");
 await chat.locator('button[type="submit"]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-hh-agent-preview] [role="log"] p')]
   .some(node=>node.textContent?.includes("Я здесь!")),null,{timeout:10000});
 assert.equal(await chat.locator("video").count(),0,
   "no completed video is claimed before rendering");
 // Test every starter against its real route or visible live message.
 await chat.getByRole("button",{name:"Новый разговор"}).click();
 await chat.locator('[data-hh-ai-start="meditation"]').click();
 await chat.getByText(/сколько минут у вас есть/).waitFor({state:"visible"});
 await chat.getByRole("button",{name:"Новый разговор"}).click();
 await chat.locator('[data-hh-ai-start="hint"]').click();
 const testLink=chat.locator("[data-hh-ai-tests-link]");
 await testLink.waitFor({state:"visible"});
 assert.equal(await testLink.getAttribute("href"),"/ru/tests");
 await testLink.click();
 await page.waitForURL(/\/ru\/tests\/?$/,{timeout:45000});
 await page.locator('[data-free-entry-landing="tests"]').waitFor({state:"visible",timeout:30000});
 await page.goto(origin+"/ru/app/messages?section=ai",{waitUntil:"domcontentloaded",timeout:75000});
 await chat.locator('[data-hh-ai-start="master"]').waitFor({state:"visible",timeout:30000});
 await chat.locator('[data-hh-ai-start="master"]').click();
 await page.waitForURL(/\/ru\/services\/free-situation-review\/?$/,{timeout:45000});
 await page.locator('[data-free-entry-landing="situation"]').waitFor({state:"visible",timeout:30000});
 await page.goto(origin+"/ru/app/messages?section=ai",{waitUntil:"domcontentloaded",timeout:75000});
 await page.locator("[data-chat-top-tabs]").waitFor({state:"visible",timeout:30000});
 await page.locator('[data-chat-top-tabs] button[aria-controls="hh-orders-panel"]').click();
 await page.locator("#hh-orders-panel").waitFor({state:"visible"});
 await page.locator('[data-chat-top-tabs] button[aria-controls="hh-clients-panel"]').click();
 await page.locator("#hh-clients-panel").waitFor({state:"visible"});
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 await page.locator("[data-unified-dock-item=practice]").click();
 await page.waitForURL(/\/ru\/holistic-support\/mobile\/?$/,{timeout:30000});
 await page.locator("[data-support-practice-tabs]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-support-practice-tabs] > *").count(),3);
 await page.locator('[data-support-practice-tabs] button').nth(1).click();
 assert.equal(await page.locator('[data-support-practice-tabs] button').nth(1).getAttribute("aria-pressed"),"true");
 results.push({journey:"MyTube → Video → live AI transcript and four active starters → private Orders/Clients → Practice",passed:true});
 // Both Home and Practice now share the original Practice visual dock,
 // with one seventh link to the REAL free express-review page.
 await page.goto(origin+"/ru",{waitUntil:"domcontentloaded",timeout:75000});
 const homeDock=page.locator("[data-hh-unified-dock]");
 await homeDock.waitFor({state:"visible",timeout:30000});
 assert.deepEqual(await homeDock.locator("[data-unified-dock-item]").evaluateAll(
   els=>els.map(el=>el.dataset.unifiedDockItem)),ids,
   "ordinary iPhone homepage has the same seven destinations as Practice");
 assert.equal(await page.locator(".mobile-bottom-navigation:visible").count(),0,
   "homepage does not mount a second old editorial footer");
 for(const at of ["bottom","top"]){
   await page.evaluate(value=>{
     const root=document.scrollingElement||document.documentElement;
     window.scrollTo({top:value==="bottom"?root.scrollHeight:0,behavior:"instant"});
   },at);
   await page.waitForFunction(()=>{
     const nav=document.querySelector("[data-hh-unified-dock]");
     const v=window.visualViewport;
     return nav && getComputedStyle(nav).position==="fixed" &&
       Math.abs(nav.getBoundingClientRect().bottom-(v?v.offsetTop+v.height:innerHeight))<=3;
   },null,{timeout:15000});
 }

 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 await homeDock.locator('[data-unified-dock-item="analysis"]').click();
 await page.waitForURL(/\/ru\/services\/free-situation-review\/?$/,{timeout:45000});
 await page.locator('[data-free-entry-landing="situation"]').waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator('[data-unified-dock-item="analysis"][aria-current="page"]').count(),1);
 assert.equal(await page.locator(".mobile-bottom-navigation:visible").count(),0);
 await homeDock.locator('[data-unified-dock-item="practice"]').click();
 await page.waitForURL(/\/ru\/holistic-support\/mobile\/?$/,{timeout:45000});
 await page.locator("[data-support-practice-tabs]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 assert.equal(await page.locator('[data-hh-unified-dock] [data-unified-dock-item]').count(),7);
 results.push({journey:"Holistic House Home → original Free Analysis → Practice with one seven-tab dock",passed:true});

 // Profile unification: both Home and Practice open the existing private hub.
 // The protected CSP transition must remain a full server-authorized reload.
 await page.goto(origin+"/ru",{waitUntil:"domcontentloaded",timeout:75000});
 const unifiedProfile=page.locator('[data-hh-unified-dock] [data-unified-dock-item="profile"]');
 await unifiedProfile.waitFor({state:"visible",timeout:30000});
 assert.equal(await unifiedProfile.getAttribute("href"),"/ru/app/portrait");
 await unifiedProfile.click();
 await page.waitForURL(/\/ru\/app\/portrait\/?$/,{timeout:45000});
 await page.locator('[data-profile-hub-tabs]').waitFor({state:"visible",timeout:45000});
 assert.equal(await page.locator('[data-profile-tab="view"][aria-current="page"]').count(),1);
 await page.locator('[data-profile-tab="create"]').click();
 await page.waitForURL(/\/ru\/personality-profiles\/?$/,{timeout:45000});
 await page.locator('[data-profile-hub-tabs][data-profile-active="create"]').waitFor({state:"visible",timeout:45000});
 assert.equal(await page.locator('[data-hh-unified-dock] [data-unified-dock-item="profile"][aria-current="page"]').count(),1);
 assert.equal(await page.locator('.mobile-bottom-navigation:visible').count(),0);
 assert.equal(await page.locator('[data-profile-tab]').count(),4);
 results.push({journey:"Public Profile → private guest hub → existing four-area creator with one seven-tab dock",passed:true});

}finally{await browser.close();}
writeFileSync(folder+"/results.json",JSON.stringify(results,null,2));
console.log("Unified six-dock browser acceptance passed",results.length);
