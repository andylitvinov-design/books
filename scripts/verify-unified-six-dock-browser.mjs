import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit,expect}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3100";
const url=new URL(origin);
if(!["localhost","127.0.0.1"].includes(url.hostname)||
 !["http:","https:"].includes(url.protocol))throw Error("Use an isolated local QA server");
const folder="artifacts/unified-six-dock";
mkdirSync(folder,{recursive:true});
const results=[];
const ids=["mytube","video","coach","ai","services","practice","profile"];
const labels={
  en:["MyTube","MyVideo","My Coach","AI/Chat","Services","Study","Profile"],
  ru:["MyTube","MyVideo","Мой коуч","ИИ/Чат","Услуги","Обучение","Профиль"],
  es:["MyTube","MyVideo","Mi coach","IA/Chat","Servicios","Estudiar","Perfil"],
};

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
    assert.ok(Number.isFinite(Number.parseFloat(position.bottom)) &&
      Math.abs(Number.parseFloat(position.bottom))<=320,
      id+" "+point+" bounded Safari visual-viewport correction");
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
  assert.deepEqual((await links.locator("span").allTextContents()).map(label=>label.trim()),
    labels[locale],id+" approved localized labels");
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
  // The dock is tested after a bottom scroll. Return to the top before testing
  // the filter controls; a sticky masthead cannot be the click target.
  await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
  await page.waitForFunction(()=>window.scrollY<=3,null,{timeout:10000});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,id+" horizontal overflow "+overflow);
  // Exactly All plus the four canonical category names must fit without a swipe.
  const categories=page.locator('[data-mytube-category-rail] [data-mytube-category]');
  assert.equal(await categories.count(),5,id+" All plus four real categories");
  const categoryGeometry=await categories.evaluateAll(els=>els.map(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  }));
  assert.ok(categoryGeometry.every((b,i)=>b.left>=0&&b.right<=width+1&&
    Math.abs(b.top-categoryGeometry[0].top)<=2),id+" all category chips fit in one row");
  assert.ok(await rail.evaluate(el=>el.scrollWidth<=el.clientWidth+2),
    id+" categories are never hidden by horizontal scrolling");
  await page.waitForFunction(()=>{
    const button=document.querySelector("[data-mytube-category]");
    return !!button&&Object.keys(button).some(key=>key.startsWith("__reactProps$"));
  },null,{timeout:15000});
  const topicRail=page.locator("[data-mytube-subcategory-rail]");
  assert.equal(await topicRail.count(),0,id+" no subcategories before category selection");
  const quickLanguage=page.locator("[data-mytube-language-control]");
  assert.equal(await quickLanguage.isVisible(),true,id+" original audio languages at top");
  const helpLauncher=page.locator("[data-hh-ihelp-trigger]");
  assert.equal(await helpLauncher.count(),1,id+" iHelp launcher preserved");
  const [languageBounds,helpBounds]=await Promise.all([quickLanguage.boundingBox(),helpLauncher.boundingBox()]);
  assert.ok(languageBounds&&helpBounds,id+" iHelp and language controls measurable");
  const overlapsHelp=languageBounds.x<helpBounds.x+helpBounds.width&&
    languageBounds.x+languageBounds.width>helpBounds.x&&
    languageBounds.y<helpBounds.y+helpBounds.height&&
    languageBounds.y+languageBounds.height>helpBounds.y;
  assert.equal(overlapsHelp,false,id+" floating iHelp must not block original-language choices");
  for(const value of ["ru","en","es","all"]){
    const button=quickLanguage.locator('[data-mytube-audio-language="'+value+'"]');
    await button.click();
    assert.equal(await button.getAttribute("aria-pressed"),"true",id+" language "+value);
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
  assert.equal(await moreFilters.getAttribute("aria-expanded"),"true",id+" icon expands filters");
  await moreControls.waitFor({state:"visible",timeout:15000});
  assert.ok(await moreControls.locator("select").count()>=1,id+" sort remains accessible");
  const quickDuration=page.locator("[data-mytube-duration]");
  assert.equal(await quickDuration.count(),1,id+" duration moved into advanced filters");
  if(await quickDuration.isEnabled()){
    await moreControls.locator("details summary").first().click();
    await quickDuration.selectOption("under4");
    assert.equal(await quickDuration.inputValue(),"under4",id+" verified-duration selection");
    await quickDuration.selectOption("all");
  }
  assert.equal(await quickLanguage.isVisible(),true,id+" EN/RU switch still visible");
  assert.equal(await refined.isVisible(),false,id+" deeper taxonomy hidden by default");
  const area=page.locator('[data-mytube-category="energy-confidence"]');
  await area.click();
  await topicRail.waitFor({state:"visible",timeout:15000});
  assert.equal(await area.getAttribute("aria-pressed"),"true",id+" selected category");
  const subcategories=topicRail.locator('[data-mytube-subcategory]:not([data-mytube-subcategory="all"])');
  assert.equal(await subcategories.count(),4,id+" four real subcategories on demand");
  assert.equal(await refined.isVisible(),false,id+" no duplicate subcategory panel");
  await subcategories.first().click();
  await refined.waitFor({state:"visible",timeout:15000});
  assert.equal(await subcategories.first().getAttribute("aria-pressed"),"true",id+" selected subcategory");
  const topics=page.locator('[data-mytube-topics] [data-mytube-topic]:not([data-mytube-topic="all"])');
  assert.equal(await topics.count(),4,id+" deeper topics remain accessible");
  await page.locator('[data-mytube-category="all"]').click();
  await topicRail.waitFor({state:"detached",timeout:15000});
  assert.equal(await topicRail.count(),0,id+" subcategories disappear after All");
  assert.equal(await refined.isVisible(),false,id+" related filters reset");
  await moreFilters.click();
  assert.equal(await moreFilters.getAttribute("aria-expanded"),"false",id+" advanced filters close");
  assert.equal(await refined.isVisible(),false,id+" advanced filters collapsed");
  assert.equal(await rail.isVisible(),true,id+" category row stays visible");
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
      ["practice",prefix+"/holistic-support/mobile","practice"],
      ["video",prefix+"/holistic-support/mandala","video"],
      ["ai",prefix+"/app/messages?section=ai","ai"],
      ["coach",prefix+"/my-coach","coach"],
      ["profile","/"+(locale==="es"?"en":locale)+"/app/portrait","profile"],
      ["services",prefix+"/services","services"],
      ["services-review",prefix+"/services/free-situation-review","services"],
    ];
    for(const [caseName,path,active] of routeCases){
      const marker=id+":"+caseName;
      await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:75000});
      await assertPinnedSixDock(page,marker,active);
      if(browserType===webkit && locale==="ru" && width===390)
        await page.screenshot({path:folder+"/"+active+"-webkit-ru-390-guest.png",fullPage:false});
      results.push({id:marker,pinned:true,route:path,authenticated:false});
    }
  }
  // Owner-approved 07 Nov Ideas → Voice Warm Peach color QA. Same real
  // public Studio/editor, never a painted mock or an extra test server.
  if(browserType===webkit && (width===390 || (locale==="ru" && width===320))){
    await page.goto(origin+"/"+locale+"/holistic-support/mandala",{
      waitUntil:"domcontentloaded",timeout:75000,
    });
    const ideaButton=page.locator('[data-video-quick-control="phrases"]');
    await ideaButton.waitFor({state:"visible",timeout:30000});
    await page.waitForFunction(()=>{
      const link=document.querySelector('[data-video-quick-control="phrases"]');
      return link&&Object.keys(link).some(k=>k.startsWith("__reactProps$"));
    },null,{timeout:20000});
    await ideaButton.click();
    const personalizationTab=page.locator('[data-video-ideas-tab="personalization"]');
    await personalizationTab.waitFor({state:"visible",timeout:30000});
    assert.equal(await personalizationTab.getAttribute("aria-pressed"),"true",
      id+" Ideas opens on the current Personalization tab");
    // Advanced voice is hidden by design until the visitor opens its visible
    // audio-guidance shortcut. Do not bypass the UI or force hidden controls.
    const voiceShortcut=page.locator('[data-video-phrase-audio-shortcut]');
    await voiceShortcut.waitFor({state:"visible",timeout:30000});
    await voiceShortcut.click();
    const advancedVoice=page.locator('details[data-video-ideas-advanced-voice]');
    await advancedVoice.waitFor({state:"visible",timeout:30000});
    assert.equal(await advancedVoice.getAttribute("open"),"",
      id+" advanced Voice opens from an actual visible audio shortcut");
    const voiceButton=advancedVoice.locator('[data-video-ideas-voice-mode="voice"]');
    await voiceButton.waitFor({state:"visible",timeout:30000});
    await voiceButton.click();
    assert.equal(await voiceButton.getAttribute("aria-pressed"),"true",
      id+" real Voice mode is selected");
    const voice=page.locator('[data-ideas-subtab="voice"] [data-hypno-voice]');
    await voice.waitFor({state:"visible",timeout:30000});
    const palette=await page.evaluate(()=>{
      const root=document.querySelector('[data-mandala-mode="video"]');
      const card=document.querySelector('[data-ideas-subtab="voice"] [data-hypno-voice]');
      const picker=document.querySelector('[data-ideas-subtab="voice"] [data-video-affirmation-voice]');
      const phrase=document.querySelector('[data-ideas-subtab="voice"] [data-video-affirmation-phrase]');
      const selected=document.querySelector('[data-video-ideas-tab="personalization"]');
      const c=node=>node?getComputedStyle(node):null;
      return {background:c(root)?.backgroundImage||"",card:c(card)?.backgroundColor||"",
        border:c(card)?.borderTopColor||"",ink:c(picker)?.color||"",
        pickerBackground:c(picker)?.backgroundColor||"",
        pickerBorder:c(picker)?.borderTopColor||"",
        phrase:c(phrase)?.backgroundColor||"",
        selected:c(selected)?.backgroundImage||"",
        width:document.documentElement.scrollWidth,
        viewport:window.innerWidth,
        dockCount:document.querySelectorAll('[data-hh-unified-dock]').length};
    });
    assert.match(palette.background,/rgb\(255,\s*247,\s*243\)/,
      id+" Voice page must use peach-ivory canvas");
    assert.equal(palette.card,"rgb(255, 252, 250)",
      id+" Voice neutral card must be warm near-white");
    assert.equal(palette.border,"rgb(234, 223, 217)",
      id+" neutral card border must not be sage green");
    assert.equal(palette.ink,"rgb(20, 43, 61)",
      id+" original voice picker has Studio ink");
    assert.equal(palette.pickerBackground,"rgb(255, 252, 250)",
      id+" the nested TTS picker must not inherit green sage gradient");
    assert.equal(palette.pickerBorder,"rgb(234, 223, 217)",
      id+" TTS picker neutral border is warm not green");
    assert.equal(palette.phrase,"rgb(255, 249, 245)",
      id+" phrase inset stays warm, not green");
    assert.match(palette.selected,/rgb\((?:18,\s*169,\s*135|3,\s*121,\s*96)\)/,
      id+" active Ideas Personalization tab preserves accessible emerald");
    assert.ok(palette.width<=palette.viewport+2,
      id+" Ideas Voice has no horizontal document overflow");
    assert.equal(palette.dockCount,1,id+" one fixed Holistic House dock");
    await voice.scrollIntoViewIfNeeded({timeout:15000});
    await page.screenshot({
      path:folder+"/ideas-voice-warm-peach-"+locale+"-"+width+"-webkit.png",
      fullPage:false,animations:"disabled",
    });
    results.push({id:id+":ideas-voice-color",palette,passed:true});
  }
  // Design Bible §10.13: inspect the REAL six-workspace Studio DOM in one
  // WebKit RU390 session without calling any TTS/video render provider.
  if(browserType===webkit && locale==="ru" && width===390){
    for(const tab of ["video","phrases","editor","effects","pro","ready"]){
      const nav=page.locator('[data-video-quick-control="'+tab+'"]');
      await nav.click({timeout:30000});
      await page.waitForFunction(expected=>{
        return document.querySelector('[data-active-workspace]')?.getAttribute("data-active-workspace")===expected;
      },tab,{timeout:20000});
      const palette=await page.evaluate(tab=>{
        const root=document.querySelector('[data-mandala-mode="video"]');
        const studio=document.querySelector('[data-active-workspace="'+tab+'"]');
        const active=document.querySelector('[data-video-quick-control="'+tab+'"]');
        const computed=studio?getComputedStyle(studio):null;
        return {background:root?getComputedStyle(root).backgroundImage:"",
          surface:computed?.getPropertyValue("--hh-studio-surface").trim()||"",
          ink:computed?.getPropertyValue("--hh-studio-ink").trim()||"",
          border:computed?.getPropertyValue("--hh-studio-border").trim()||"",
          muted:computed?.getPropertyValue("--hh-studio-muted").trim()||"",
          primary:computed?.getPropertyValue("--hh-studio-primary").trim()||"",
          active:active?.getAttribute("aria-pressed"),
          activeInk:active?getComputedStyle(active).color:"",
          width:document.documentElement.scrollWidth, viewport:innerWidth,
          dockCount:document.querySelectorAll("[data-hh-unified-dock]").length,
        };
      },tab);
      assert.match(palette.background,/rgb\(255,\s*247,\s*243\)/,
        id+" "+tab+" warm Studio canvas");
      assert.deepEqual(
        [palette.surface,palette.ink,palette.border,palette.muted,palette.primary],
        ["#FFFCFA","#142B3D","#EADFD9","#5D6A71","#087E61"],
        id+" "+tab+" inherits the SAME Design Bible palette");
      assert.equal(palette.active,"true",id+" "+tab+" is the selected real workspace");
      assert.equal(palette.activeInk,"rgb(255, 255, 255)",
        id+" "+tab+" active control remains readable");
      assert.ok(palette.width<=palette.viewport+2,id+" "+tab+" no document overflow");
      assert.equal(palette.dockCount,1,id+" "+tab+" one fixed Holistic House dock");
      await nav.scrollIntoViewIfNeeded();
      await page.screenshot({
        path:folder+"/studio-palette-"+tab+"-ru-390-webkit.png",
        fullPage:false,animations:"disabled",
      });
      results.push({id:id+":studio-"+tab,palette,passed:true});
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
      ["coach","/ru/my-coach"],
      ["services","/ru/services"],
      ["practice","/ru/holistic-support/mobile"],
    ]){
      await page.locator('[data-unified-dock-item="'+tab+'"]').click();
      await page.waitForURL(url=>url.pathname===path||url.pathname===path+"/",{timeout:45000});
      assert.equal(await page.evaluate(()=>performance.timeOrigin),initialDocument,
        tab+" standalone public navigation must stay in the same document");
    }
    assert.equal(popups,0,"standalone public tabs must not open another page");
    results.push({journey:"Simulated iOS standalone Practice → Video → MyTube → My Coach → Services → Practice",sameDocument:true});
  }
 }finally{
  // WebKit may dispose a context as part of a crash/teardown race after the
  // scenario has completed. Treat an already-disposed context as closed, but
  // surface every other cleanup error and always close the owning browser.
  try{await context.close();}
  catch(error){
    if(!/Failed to find context with id|Target page, context or browser has been closed/.test(String(error?.message)))throw error;
  }
  try{await browser.close();}
  catch(error){
    if(!/Target page, context or browser has been closed|Browser has been closed/.test(String(error?.message)))throw error;
  }
 }
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
 // Owner-approved iHelp first turn: browser geometry is checked on the real
 // Video Studio route, not a static mock. No media render or external AI call.
 await page.locator('[data-video-ihelp-header-trigger]').click();
 const iHelpDialog=page.locator('[data-video-director-chat-details][role="dialog"]');
 await iHelpDialog.waitFor({state:'visible',timeout:30000});
 const iHelpWelcome=iHelpDialog.locator('[data-video-chat-welcome]');
 await iHelpWelcome.waitFor({state:'visible',timeout:30000});
 for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   const geometry=await page.evaluate(()=>{
     const root=document.querySelector('[data-video-director-chat]');
     const thread=root?.querySelector('[class*="thread"]');
     const welcome=root?.querySelector('[data-video-chat-welcome]');
     const form=welcome?.querySelector('form[data-video-chat-composer]');
     const nav=root?.querySelector('[data-video-chat-top-tabs]');
     const hero=welcome?.querySelector('h2');
     if(!root||!thread||!welcome||!form||!nav||!hero)return null;
     const a=thread.getBoundingClientRect(),b=form.getBoundingClientRect(),
       c=nav.getBoundingClientRect(),d=hero.getBoundingClientRect();
     return {width:root.getBoundingClientRect().width,formCount:root.querySelectorAll('form[data-video-chat-composer]').length,
       topicIds:[...welcome.querySelectorAll('[data-video-chat-welcome-goal]')].map(x=>x.getAttribute('data-video-chat-welcome-goal')),
       formVisible:b.height>=43&&b.top>=a.top-2&&b.bottom<=a.bottom+3,
       titleVisible:d.top>=a.top-3&&d.top<a.bottom-20,
       navBottom:c.top>=a.bottom-3,
       horizontalOverflow:root.scrollWidth-root.clientWidth};
   });
   assert.ok(geometry,'IHELP_MOBILE_GEOMETRY_NOT_READY_'+width);
   assert.ok(geometry.width<=width+2,'IHELP_MOBILE_WINDOW_OVERFLOW_'+width);
   assert.equal(geometry.formCount,1,'IHELP_ONE_REAL_COMPOSER_'+width);
   assert.deepEqual(geometry.topicIds,['body','energy','love','business','stress'],
     'IHELP_TOPIC_CHIPS_MUST_FOLLOW_REFERENCE_'+width);
   assert.ok(geometry.formVisible,'IHELP_INPUT_MUST_BE_VISIBLE_ABOVE_DOCK_'+width);
   assert.ok(geometry.titleVisible,'IHELP_HERO_MUST_START_IN_VIEW_'+width);
   assert.ok(geometry.navBottom,'IHELP_TABS_MUST_FOLLOW_WELCOME_'+width);
   assert.ok(geometry.horizontalOverflow<=2,'IHELP_OVERFLOW_'+width);
   if(width===390)await page.screenshot({path:folder+'/ihelp-approved-welcome-390.png'});
 }
 await page.setViewportSize({width:390,height:844});
 await iHelpWelcome.locator('[data-video-chat-welcome-create]').click();
 await iHelpDialog.locator('[data-chat-inline-choices]').waitFor({state:'visible',timeout:15000});
 assert.equal(await iHelpDialog.locator('form[data-video-chat-composer]').count(),1,
   'IHELP_COMPOSER_STAYS_SINGLE_AFTER_START');
 await iHelpDialog.locator('[data-video-ihelp-header] button').click();
 await iHelpDialog.waitFor({state:'hidden',timeout:15000});
 results.push({journey:"Owner iHelp screenshot → visible composer and category chips at 320/390/430 → real Director choices",passed:true});
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
 await chat.locator('[data-hh-ai-landing]').waitFor({state:"visible",timeout:15000});
 const log=chat.locator('[role="log"]');
 const projectGrid=chat.locator('[data-hh-messenger-six-projects]');
 await projectGrid.waitFor({state:"visible",timeout:15000});
 const projects=chat.locator('[data-hh-messenger-six-projects] [data-hh-ai-project]');
 const six=["hint","test","mytube","sessions","practice","ai-video"];
 assert.deepEqual(await projects.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-hh-ai-project"))),
   six,"Messenger shows the six current project entries in canonical order");
 assert.equal(await chat.locator("iframe").count(),0,"approved introduction video needs a deliberate Play click");
 for(const id of six){
   const item=chat.locator('[data-hh-ai-project="'+id+'"]');
   await item.waitFor({state:"visible",timeout:15000});
   const rect=await item.boundingBox();
   assert.ok(rect&&rect.width>=44&&rect.height>=44,id+" accessible project card");
 }
 // The former generic quick-action landing is intentionally retired; its
 // hidden links must not be mistaken for the six visible project cards.
 assert.equal(await chat.locator('[data-hh-ai-quick-actions] [data-hh-ai-choice]:visible').count(),0,
   "retired generic quick actions remain hidden");
 // AI-Video opens the existing in-chat format selector through the approved
 // six-project entry. No generation, payment or external request occurs here.
 await chat.locator('[data-hh-ai-project="ai-video"]').click();
 const initialContentKinds=chat.locator('[data-hh-content-step="kind"] [data-hh-content-kind]');
 await initialContentKinds.first().waitFor({state:"visible",timeout:15000});
 assert.deepEqual(await initialContentKinds.evaluateAll(nodes=>nodes.map(node=>
   node.getAttribute("data-hh-content-kind"))),["video","audio","meditation","message"],
   "Video opens the four approved formats inside the same chat");
  assert.equal(await chat.locator('[data-hh-ai-quick-actions] [data-hh-ai-choice]').count(),0,"landing yields to the original one chat transcript");
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

 // Language follows the message, not the /en route. Keep both turns in one
 // transcript and verify the composer/region language changes without navigation.
 await page.goto(origin+"/en/app/messages?section=ai",{waitUntil:"domcontentloaded",timeout:75000});
 await chat.locator('[data-hh-ai-landing]').waitFor({state:"visible",timeout:30000});
 const bilingualInput=chat.locator("textarea");
 const bilingualLog=chat.locator('[role="log"]');
 await bilingualInput.fill("Хочу денег");
 await chat.locator('button[type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-hh-agent-preview]')?.getAttribute("lang")==="ru",null,{timeout:15000});
 await page.waitForFunction(()=>document.querySelector('[data-hh-agent-preview] textarea')?.getAttribute("placeholder")==="Что сейчас для вас важно?",null,{timeout:10000});
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-hh-agent-preview] [data-hh-chat-turn="user"]')]
   .some(node=>node.textContent?.includes("Хочу денег")),null,{timeout:10000});
 await bilingualInput.fill("I want to discuss my income");
 await chat.locator('button[type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-hh-agent-preview]')?.getAttribute("lang")==="en",null,{timeout:15000});
 await page.waitForFunction(()=>document.querySelector('[data-hh-agent-preview] textarea')?.getAttribute("placeholder")==="What's on your mind?",null,{timeout:10000});
 assert.equal(new URL(page.url()).pathname,"/en/app/messages",
   "switching dialogue language does not navigate away from the original route");
 const retainedTurns=await bilingualLog.locator('[data-hh-chat-turn="user"]').allTextContents();
 assert.ok(retainedTurns.some(text=>text.includes("Хочу денег")),"Russian turn remains in the same transcript");
 assert.ok(retainedTurns.some(text=>text.includes("I want to discuss my income")),"English turn is appended, not substituted");
 assert.equal(await bilingualLog.locator('[data-hh-chat-turn="user"]').count(),2,
   "two language changes preserve exactly the two submitted user turns");
 results.push({journey:"English Messenger route → Russian message → English message; transcript retained without route navigation",passed:true});
 // The bilingual journey deliberately ends in English. Begin a separate RU
 // project-entry journey so project-link assertions verify locale propagation,
 // not the stale locale from the prior test case.
 await page.goto(origin+"/ru/app/messages?section=ai",{waitUntil:"domcontentloaded",timeout:75000});
 await chat.waitFor({state:"visible",timeout:30000});
 await expect.poll(()=>chat.getAttribute("lang")).toBe("ru");
 await chat.locator('[data-hh-ai-landing]').waitFor({state:"visible",timeout:15000});
 // Exercise the six current project cards and their one-question / four-choice
 // flows. The retired generic data-hh-ai-choice links stay hidden by design.
 const resetViaMore=async()=>{
   const more=chat.locator('details[data-hh-ai-more]');
   await more.waitFor({state:"visible",timeout:15000});
   if(await more.evaluate(node=>!node.open)) await more.locator("summary").click();
   const resetButtons=more.locator("button");
   await expect.poll(()=>resetButtons.count()).toBe(1);
   await resetButtons.first().click();
   if(await more.evaluate(node=>node.open)) await more.locator("summary").click();
   await chat.locator('[data-hh-ai-landing]').waitFor({state:"visible",timeout:15000});
   await expect.poll(()=>chat.locator('[data-hh-chat-turn="user"]').count()).toBe(0);
 };
 const openProject=async(id)=>{
   await resetViaMore();
   await chat.locator('[data-hh-ai-project="'+id+'"]').waitFor({state:"visible",timeout:15000});
   await chat.locator('[data-hh-ai-project="'+id+'"]').click();
   // Sessions has a goal-first two-step intake; other projects use one-step choices.
   const options=id==="sessions"?
     chat.locator("[data-hh-session-goal-options]"):
     chat.locator('[data-hh-project-step="'+id+'"]');
   await options.waitFor({state:"visible",timeout:15000});
   const choices=id==="sessions"?
     chat.locator("[data-hh-session-goal-choice]"):
     chat.locator("[data-hh-project-choice]");
   assert.ok(await choices.count()<=4,
     id+" must expose no more than four short choices");
 };
 await openProject("practice");
 await chat.locator('[data-hh-project-choice="stress"]').click();
 const practiceLink=chat.locator('[data-hh-ihelp-link]');
 await practiceLink.waitFor({state:"visible",timeout:15000});
 await expect.poll(()=>chat.getAttribute("lang")).toBe("ru");
 assert.equal(await practiceLink.getAttribute("href"),"/ru/courses/antistress",
   "Practice route follows the Russian conversation language");

 await openProject("hint");
 await chat.locator('[data-hh-project-choice="life"]').click();
 await expect.poll(()=>chat.locator('[data-hh-ai-assistant-message]').count()).toBeGreaterThan(0);
 assert.equal(await chat.locator("textarea").evaluate(node=>document.activeElement===node),
   true,"Get a hint asks one question and focuses the same unsent composer");

 await openProject("test");
 await chat.locator('[data-hh-project-choice="stress"]').click();
 const testJourney=chat.locator('[data-hh-messenger-test-chat]');
 await testJourney.waitFor({state:"visible",timeout:15000});

 await openProject("mytube");
 await chat.locator('[data-hh-project-choice="calm"]').click();
 const mytubeLink=chat.locator('[data-hh-ihelp-link]');
 await mytubeLink.waitFor({state:"visible",timeout:15000});
 assert.equal(await mytubeLink.getAttribute("href"),"/ru/mytube?goal=stress",
   "MyTube uses the existing topic-filtered catalogue in Russian");

 await openProject("sessions");
 await chat.locator('[data-hh-session-goal-choice="personal"]').click();
 const sessionComposer=chat.locator("textarea");
 await sessionComposer.fill("Хочу разобраться в сложном личном выборе и понять, как поступить дальше.");
 await chat.locator('button[type="submit"]').click();
 const sessionLink=chat.locator('[data-hh-session-offer="free-review"]');
 await sessionLink.waitFor({state:"visible",timeout:15000});
 assert.equal(await sessionLink.getAttribute("href"),"/ru/services/free-situation-review",
   "Sessions asks for a goal and outcome before offering the free review route in Russian");

 // iPhone keyboard regression: after the goal-first Sessions dialogue and the
 // actual assistant's response, keep the whole reply visible above the composer.
 const fullAssistantReply=chat.locator('[data-hh-ai-assistant-message]').last();
 await fullAssistantReply.waitFor({state:"visible",timeout:15000});
 await sessionComposer.focus();
 await page.setViewportSize({width:390,height:360});
 await page.waitForFunction(()=>{
   const thread=document.querySelector('[data-hh-agent-preview] [role="log"]');
   const replies=thread?.querySelectorAll('[data-hh-ai-assistant-message]');
   const reply=replies?.[replies.length-1];
   if(!thread||!reply)return false;
   const bounds=thread.getBoundingClientRect(),bubble=reply.getBoundingClientRect();
   const end=Math.max(0,thread.scrollHeight-thread.clientHeight);
   return Math.abs(thread.scrollTop-end)<=3&&bubble.bottom<=bounds.bottom+2;
 },null,{timeout:15000});
 assert.equal(await fullAssistantReply.evaluate(node=>getComputedStyle(node).flexShrink),"0",
   "iPhone keyboard must not shrink or clip the assistant reply");
 await page.setViewportSize({width:390,height:844});
 results.push({journey:"Sessions goal-first → keyboard viewport → full AI reply visible",passed:true});

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
 results.push({journey:"MyTube → Video → six real iChat choices → one protected transcript → private Orders/Clients → Practice",passed:true});
 // Both Home and Practice now share the original Practice visual dock,
 // with canonical Services and My Coach destinations.
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
 await homeDock.locator('[data-unified-dock-item="services"]').click();
 await page.waitForURL(/\/ru\/services\/?$/,{timeout:45000});
 await page.locator('[data-unified-dock-item="services"][aria-current="page"]').waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator('[data-unified-dock-item="services"][aria-current="page"]').count(),1);
 assert.equal(await page.locator(".mobile-bottom-navigation:visible").count(),0);
 await homeDock.locator('[data-unified-dock-item="practice"]').click();
 await page.waitForURL(/\/ru\/holistic-support\/mobile\/?$/,{timeout:45000});
 await page.locator("[data-support-practice-tabs]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 assert.equal(await page.locator('[data-hh-unified-dock] [data-unified-dock-item]').count(),7);
 results.push({journey:"Holistic House Home → Services → Practice with one seven-tab dock",passed:true});

 // Profile unification: both Home and Practice open the existing private hub.
 // The protected CSP transition must remain a full server-authorized reload.
 await page.goto(origin+"/ru",{waitUntil:"domcontentloaded",timeout:75000});
 const unifiedProfile=page.locator('[data-hh-unified-dock] [data-unified-dock-item="profile"]');
 await unifiedProfile.waitFor({state:"visible",timeout:30000});
 assert.equal(await unifiedProfile.getAttribute("href"),"/ru/app/portrait");
 await unifiedProfile.click();
 await page.waitForURL(/\/ru\/app\/portrait\/?$/,{timeout:45000});
 await page.locator('[data-profile-hub-tabs]').waitFor({state:"visible",timeout:45000});
 assert.equal(await page.locator('[data-profile-tab="tests"][aria-current="page"]').count(),1,
   "guest Profile intentionally opens its public Tests-first section");
 // The protected #3909 profile has six real sections; old View/Create tabs
 // and /personality-profiles were replaced. Test the visible DOM and navigation,
 // not a hidden fallback or loosened count.
 assert.deepEqual(await page.locator('[data-profile-hub-tabs] [data-profile-tab]').evaluateAll(
   links=>links.map(link=>link.dataset.profileTab)),
   ["today","tests","state","path","courses","reports"],
   "the guest and signed-in My Space show the same six canonical sections");
 await page.locator('[data-profile-tab="tests"]').click();
 await page.waitForFunction(()=>location.hash==="#profile-free-tests",{},{timeout:15000});
 await page.locator('[data-profile-hub-tabs][data-profile-active="tests"]').waitFor({state:"visible",timeout:45000});
 assert.equal(await page.locator('[data-profile-tab="tests"][aria-current="page"]').count(),1);
 assert.equal(await page.locator('[data-hh-unified-dock] [data-unified-dock-item="profile"][aria-current="page"]').count(),1);
 assert.equal(await page.locator('.mobile-bottom-navigation:visible').count(),0);
 assert.equal(await page.locator('[data-profile-hub-tabs] [data-profile-tab]').count(),6);
 results.push({journey:"Public Profile → six-tab My Space Today → protected Tests with one seven-tab dock",passed:true});

}finally{await browser.close();}
writeFileSync(folder+"/results.json",JSON.stringify(results,null,2));
console.log("Unified six-dock browser acceptance passed",results.length);
