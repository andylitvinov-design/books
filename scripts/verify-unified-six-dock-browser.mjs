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
const ids=["mytube","reiki","coach","ai","services","practice","profile"];
const labels={
  en:["MyTube","My Reiki","My Coach","AI/Chat","Support","Shamanic","Profile"],
  ru:["MyTube","My Reiki","Мой коуч","ИИ/Чат","Поддержка","Шаманик","Профиль"],
  es:["MyTube","My Reiki","Mi coach","IA/Chat","Apoyo","Shamanic","Perfil"],
};

// The fixed dock belongs to the ROOT shell, not to individual pages. Check
// every user-reported route: guest public Studio/Practice/Master, public MyTube,
// and the signed-out shell for protected AI Messenger/Profile. Authenticated
// iPhone E2E is a separate acceptance requirement, never impersonated here.
async function assertPinnedSixDock(page, id, active) {
  const dock=page.locator("[data-hh-unified-dock]");
  try { await dock.waitFor({state:"visible",timeout:30000}); }
  catch(error) {
    console.error("Pinned dock diagnostic",id,await page.evaluate(()=>{
      const el=document.querySelector("[data-hh-unified-dock]");
      return {path:location.pathname,width:innerWidth,height:innerHeight,viewport:visualViewport?.height,
        display:el?getComputedStyle(el).display:null,keyboard:el?.getAttribute("data-keyboard-open"),
        editorial:el?.getAttribute("data-hh-editorial-dock"),
        immersive:!!document.querySelector("main[data-energywork-ai-learner],[data-my-coach-immersive-session]")};
    }));
    throw error;
  }
  if(active)await page.waitForFunction(expected=>{
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
  const dockPalette=await dock.evaluate(el=>{
    const ai=el.querySelector('[data-unified-dock-item="ai"] svg');
    const current=getComputedStyle(el);
    return {background:current.backgroundImage,
      aiBackground:ai?getComputedStyle(ai).backgroundImage:""};
  });
  assert.match(dockPalette.background,/radial-gradient/,
    id+" approved mint waves on the shared ivory dock");
  assert.match(dockPalette.aiBackground,/radial-gradient/,
    id+" teal illuminated AI button visible above the dock");
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
    ["practices","courses","masters","videos"],id+" four approved MyTube content modes are visible");
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
  // Four mutually exclusive modes; no invented videos required for acceptance.
  for(const mode of ["practices","courses","masters","videos"]){
    const control=page.locator('[data-mytube-format-mode="'+mode+'"]');
    await control.click();
    assert.equal(await control.getAttribute("aria-pressed"),"true",id+" selected "+mode);
    assert.equal(await page.locator('[data-mytube-course-navigation]').isVisible(),mode==="courses",
      id+" course-type navigation belongs only to Courses");
  }
  // Four-category taxonomy is a Practices subfilter; restore it before testing.
  await page.locator('[data-mytube-format-mode="practices"]').click();
  await rail.waitFor({state:"visible",timeout:15000});
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
  assert.equal(await area.getAttribute("aria-pressed"),"true",id+" selected category");
  assert.equal(await topicRail.count(),0,id+" removed second taxonomy menu stays absent");
  assert.equal(await refined.isVisible(),false,id+" no duplicate subcategory panel");
  // Product collections are based only on approved PsiMaster originals.
  // A CI fixture with no reviewed recordings must not invent placeholders.
  const realCollections=page.locator('[data-mytube-practice-collection]');
  const realCount=await realCollections.count();
  if(realCount>0){
    const firstCollection=realCollections.first();
    await firstCollection.click();
    assert.equal(await firstCollection.getAttribute("aria-pressed"),"true",
      id+" real collection filters the existing feed");
    await firstCollection.click();
    assert.equal(await firstCollection.getAttribute("aria-pressed"),"false",
      id+" tapping an active collection clears its filter");
  }else{
    assert.equal(await page.locator('[data-mytube-practice-collections]').count(),0,
      id+" no made-up collection without published source");
  }
  await page.locator('[data-mytube-category="all"]').click();
  assert.equal(await topicRail.count(),0,id+" old taxonomy menu does not reappear");
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
      ["practice",prefix+"/shamanica","practice"],
      ["reiki",prefix+"/academy/principles-of-energywork","reiki"],
      ["video-profile",prefix+"/holistic-support/mandala","profile"],
      ["ai",prefix+"/app/messages?section=ai","ai"],
      ["coach",prefix+"/my-coach","coach"],
      ["profile","/"+(locale==="es"?"en":locale)+"/app/portrait","profile"],
      ["development-vectors",prefix+"/development-vectors","profile"],
      ["services",prefix+"/services","services"],
      ["services-review",prefix+"/services/free-situation-review","services"],
    ];
    for(const [caseName,path,active] of routeCases){
      const marker=id+":"+caseName;
      await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:75000});
      if(caseName==="ai"){
        // The untouched AI landing intentionally hides the dock. Verify the
        // exact exception and real accessible navigation, not a visible footer.
        const landing=page.locator("[data-hh-ai-landing]");
        await expect(landing).toBeVisible({timeout:30000});
        await expect(page.locator("[data-hh-unified-dock]")).toHaveCount(1);
        await expect(page.locator("[data-hh-unified-dock]")).toBeHidden();
        await expect(landing.locator("[data-hh-genie-persona-shortcut]")).toBeVisible();
        await expect(landing.locator("[data-hh-genie-path-choice]")).toHaveCount(3);
        const extra=landing.locator("[data-hh-genie-extra-directions]");
        if(!await extra.evaluate(el=>el.open))await extra.locator("summary").click();
        for(const section of ["ai","page","orders","clients"]){
          await expect(extra.locator('[data-hh-chat-shortcut="'+section+'"]')).toBeVisible();
        }
        await expect(extra.locator('[data-hh-chat-shortcut="orders"]')).toHaveAttribute("href",prefix+"/app/messages?section=orders");
        results.push({id:marker,immersive:true,dockHidden:true,route:path,authenticated:false});
      }else{
        await assertPinnedSixDock(page,marker,active);
        if(caseName==="development-vectors"){
          const root=page.locator("main[data-daybook-vectors]");
          await expect(root).toHaveAttribute("data-cabinet-theme","daybook");
          const stage=root.locator('a[href*="/app/daybook?start=vector"]');
          await expect(stage).toBeVisible();
          const geometry=await stage.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,display:getComputedStyle(el).display,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
          assert.equal(geometry.display,"flex",marker+" stage action is a real wrapping block");
          assert.ok(geometry.height>=44&&geometry.width<=geometry.clientWidth,marker+" stage action fits");
          assert.ok(geometry.scrollWidth<=geometry.clientWidth+1,marker+" no document overflow");
        }
        results.push({id:marker,pinned:true,route:path,authenticated:false});
      }
      if(browserType===webkit && locale==="ru" && width===390)
        await page.screenshot({path:folder+"/"+active+"-webkit-ru-390-guest.png",fullPage:false});
    }
    if(width===390){
      // Verify the identical sitewide dock on three ordinary editorial pages.
      for(const section of ["about","library","tests",...(locale==="es"?[]:["client"])]){
        const route=prefix+"/"+section;
        await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:75000});
        await assertPinnedSixDock(page,id+":editorial:"+section,null);
        assert.equal(await page.locator("[data-hh-unified-dock]").getAttribute("data-hh-editorial-dock"),"true");
        results.push({id:id+":editorial:"+section,pinned:true,route,authenticated:false});
      }
    }
  }
  // Owner-approved 07 Nov Ideas → Voice Warm Peach color QA. Same real
  // public Studio/editor, never a painted mock or an extra test server.
  if(browserType===webkit && (width===390 || (locale==="ru" && width===320))){
    await page.goto(origin+"/"+locale+"/holistic-support/mandala",{
      waitUntil:"domcontentloaded",timeout:75000,
    });
    const ideaButton=page.locator('[data-video-quick-control="phrases"]');
    // Follow the same visible Magic Mirror path as the existing voice E2E.
    // Selecting the format does not generate a video or spend credits.
    if(!await ideaButton.isVisible()){
      const mirror=page.locator('[data-hh-mirror-goals]');
      const entry=mirror.locator('[data-hh-mirror-enter="me"]');
      await expect(entry).toBeVisible({timeout:30000});
      await entry.click();
      // Current owner-approved sequence: audience → format → topic → purpose.
      // Selecting Basic is only a planning preference; it never renders media.
      await expect(mirror).toHaveAttribute("data-hh-mirror-screen","format");
      await mirror.locator('[data-hh-mirror-video-format="basic"]').click();
      await expect(mirror).toHaveAttribute("data-hh-mirror-screen","topic");
      await expect(mirror).toHaveAttribute("data-hh-mirror-step","1");
      await expect(mirror.locator('[data-hh-mirror-goal-choice]')).toHaveCount(4);
      await mirror.locator('[data-hh-mirror-goal-choice="stress"]').click();
      await expect(mirror).toHaveAttribute("data-hh-mirror-step","2");
      await mirror.locator('[data-hh-mirror-subcategory="vital-energy"]').click();
      await expect(mirror).toHaveAttribute("data-hh-mirror-step","3");
      await mirror.locator('[data-hh-mirror-topic="low-energy"]').click();
      await expect(mirror).toHaveAttribute("data-hh-mirror-screen","purpose");
      const goal=mirror.locator('[data-hh-mirror-purpose-step]');
      await goal.locator('[data-video-ideas-goal-choice="rest"]').click();
      const next=goal.locator('[data-video-ideas-goal-next]');
      await expect(next).toBeEnabled();
      await next.click();
      await expect(page.locator('[data-mandala-free-video]'))
        .toHaveAttribute("data-active-workspace","editor",{timeout:15000});
    }
    await ideaButton.waitFor({state:"visible",timeout:30000});
    await page.waitForFunction(()=>{
      const link=document.querySelector('[data-video-quick-control="phrases"]');
      return link&&Object.keys(link).some(k=>k.startsWith("__reactProps$"));
    },null,{timeout:20000});
    await ideaButton.click();
    // The approved Magic Mirror sequence is Goal → Personalization → Concept.
    // Test the REAL visitor's choice instead of assuming the retired
    // Personalization-first interface, especially on 320px iPhone Safari.
    const goalTab=page.locator('[data-video-ideas-tab="goal"]');
    await expect(goalTab).toHaveAttribute("aria-pressed","true",{timeout:15000});
    const goalPicker=page.locator('[data-video-ideas-goal-picker]');
    await goalPicker.waitFor({state:"visible",timeout:30000});
    const goalChoice=goalPicker.locator('[data-video-ideas-goal-choice]').first();
    await goalChoice.click();
    await expect(goalChoice).toHaveAttribute("aria-pressed","true",{timeout:15000});
    const goalNext=goalPicker.locator('[data-video-ideas-goal-next]');
    await expect(goalNext).toBeEnabled();
    await goalNext.click();
    const personalizationTab=page.locator('[data-video-ideas-tab="personalization"]');
    await expect(personalizationTab).toHaveAttribute("aria-pressed","true",{timeout:15000});
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
      // In the approved compact Video/Magic Mirror entrance the workspace
      // rail closes after a real tool selection. It is reopened only by a
      // visible "More goals" tap, never via forced clicks or DOM mutation.
      if(!await nav.isVisible()){
        const studio=page.locator('[data-mandala-free-video]');
        assert.equal(await studio.getAttribute("data-active-workspace"),"video",
          "Only the compact Magic Mirror Video entrance may hide the tool rail");
        const mirror=page.locator('[data-hh-mirror-goals]');
        const legacyMore=mirror.locator('[data-hh-mirror-more-goals]');
        if(await legacyMore.isVisible()){
          await legacyMore.click();
        }else{
          const entry=mirror.locator('[data-hh-mirror-enter="me"]');
          if(await entry.isVisible())await entry.click();
          const format=mirror.locator('[data-hh-mirror-video-format="basic"]');
          if(await format.isVisible())await format.click();
          const purposeBack=mirror.locator('[data-hh-mirror-back-purpose]');
          if(await purposeBack.isVisible())await purposeBack.click();
          await expect(mirror).toHaveAttribute("data-hh-mirror-screen","topic");
          for(let step=0;step<3&&await mirror.getAttribute("data-hh-mirror-step")!=="1";step++){
            const back=mirror.locator('[data-hh-mirror-back]');
            await expect(back).toBeVisible();
            await back.click();
          }
          await expect(mirror).toHaveAttribute("data-hh-mirror-step","1");
          const description=mirror.locator('[data-hh-mirror-own-description]');
          if(!await description.evaluate(node=>node.open))await description.locator(':scope > summary').click();
          const composer=mirror.locator('[data-hh-mirror-composer]');
          await expect(composer).toBeVisible();
          const advanced=composer.locator('[data-hh-mirror-open-advanced]');
          await expect(advanced).toBeVisible();
          await expect(advanced).toBeEnabled();
          await advanced.click();
        }
        await expect(studio).toHaveAttribute("data-hh-mirror-advanced","true",{timeout:15000});
        await nav.waitFor({state:"visible",timeout:15000});
      }
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
      // Switching workspaces can retire/collapse the original rail after
      // its real click. The selected workspace surface remains visible:
      // capture THAT rendered view, not the detached/hidden old tab node.
      const visibleStudio=page.locator('[data-mandala-free-video][data-active-workspace="'+tab+'"]');
      await visibleStudio.waitFor({state:"visible",timeout:15000});
      await visibleStudio.scrollIntoViewIfNeeded({timeout:15000});
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
      const link=document.querySelector('[data-unified-dock-item="reiki"]');
      return link && Object.keys(link).some(key=>key.startsWith("__reactProps$"));
    },null,{timeout:15000});
    const initialDocument=await page.evaluate(()=>performance.timeOrigin);
    let popups=0;
    page.on("popup",()=>{popups++});
    for(const [tab,path] of [
      ["reiki","/ru/academy/principles-of-energywork"],
      ["mytube","/ru/mytube"],
      ["coach","/ru/my-coach"],
      ["services","/ru/services"],
      ["practice","/ru/shamanica"],
    ]){
      await page.locator('[data-unified-dock-item="'+tab+'"]').click();
      await page.waitForURL(url=>url.pathname===path||url.pathname===path+"/",{timeout:45000});
      assert.equal(await page.evaluate(()=>performance.timeOrigin),initialDocument,
        tab+" standalone public navigation must stay in the same document");
    }
    assert.equal(popups,0,"standalone public tabs must not open another page");
    results.push({journey:"Simulated iOS standalone Practice → My Reiki → MyTube → My Coach → Services → Practice",sameDocument:true});
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
 await dock.locator('[data-unified-dock-item="reiki"]').click();
 await page.waitForURL(/\/ru\/academy\/principles-of-energywork\/?$/,{timeout:45000});
 await expect(page.locator('[data-unified-dock-item="reiki"]')).toHaveAttribute("aria-current","page");
 await expect(page.locator('[data-energywork-screen="intro"]')).toBeVisible({timeout:30000});
 await page.locator('[data-unified-dock-item="profile"]').click();
 await page.waitForURL(/\/ru\/app\/portrait\/?$/,{timeout:45000});
 const myVideo=page.locator('[data-profile-my-video]');
 await expect(myVideo).toBeVisible({timeout:45000});
 await expect(myVideo).toHaveAttribute("href","/ru/holistic-support/mandala");
 await myVideo.click();
 await page.waitForURL(/\/ru\/holistic-support\/mandala\/?$/,{timeout:45000});
 await expect(page.locator('[data-unified-dock-item="profile"]')).toHaveAttribute("aria-current","page");
 assert.equal(await page.locator('dialog[data-profile-auth-dialog]:visible').count(),0);
 results.push({journey:"MyTube → My Reiki landing → Profile → original MyVideo Studio",passed:true});
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
 const helpMirror=page.locator('[data-hh-mirror-goals]');
 const headerHelp=page.locator('[data-video-ihelp-header-trigger]');
 await expect(helpMirror).toHaveAttribute('data-hh-mirror-screen','landing');
 await expect(headerHelp).toHaveCount(1);
 await expect(headerHelp).toBeHidden();
 const helpEntry=helpMirror.locator('[data-hh-mirror-enter="me"]');
 await expect(helpEntry).toBeVisible();
 await expect(helpEntry).toBeEnabled();
 await helpEntry.click();
 await expect(helpMirror).toHaveAttribute('data-hh-mirror-screen','format');
 await helpMirror.locator('[data-hh-mirror-video-format="basic"]').click();
 await expect(helpMirror).toHaveAttribute('data-hh-mirror-screen','topic');
 await expect(helpMirror).toHaveAttribute('data-hh-mirror-step','1');
 await expect(headerHelp).toBeVisible();
 await expect(headerHelp).toBeEnabled();
 await headerHelp.click();
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
 // The approved untouched landing hides the header and dock. Reach the real
 // Orders tab through its accessible disclosure, then exercise News and AI.
 const messengerTabs=page.locator("[data-chat-top-tabs]");
 const messengerMenu=page.locator("[data-hh-ai-chat-menu]");
 const firstLanding=page.locator("[data-hh-ai-landing]");
 await expect(firstLanding).toBeVisible({timeout:30000});
 await expect(messengerMenu).toBeHidden();
 await expect(messengerTabs).toBeHidden();
 const firstSections=firstLanding.locator("[data-hh-genie-extra-directions]");
 assert.equal(await firstSections.evaluate(node=>node.open),false);
 await firstSections.locator(":scope > summary").click();
 const ordersShortcut=firstSections.locator('[data-hh-chat-shortcut="orders"]');
 await expect(ordersShortcut).toBeVisible();
 await ordersShortcut.click();
 await expect(page.locator('[data-orders-clients-hub][data-section="orders"]')).toBeVisible({timeout:30000});
 await expect(page.locator("#hh-orders-panel")).toBeVisible();
 await expect(messengerTabs).toBeVisible();
 assert.equal(await messengerTabs.locator("button").count(),4,
   "Messenger retains AI, Orders, Clients and News");
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
 const journeyLabels=["Поговорить и снять напряжение","Понять, что происходит","Найти и достичь цель"];
 const journeyChoices=chat.locator('[data-hh-genie-path-choice]');
 assert.deepEqual(await journeyChoices.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-hh-genie-path-choice"))),
   ["therapy","consultation","goal"],"the first choice is the person's need");
 for(let i=0;i<3;i++)await expect(journeyChoices.nth(i)).toHaveText(journeyLabels[i]);
 const projectGrid=chat.locator('[data-hh-messenger-six-projects]');
 // Inner Alchemist begins with an inviting question, not a wall of service cards.
 // Keep the entire canonical six-project catalogue available after user intent.
 const alchemistTools=chat.locator('[data-hh-alchemist-tools]');
 await alchemistTools.waitFor({state:"attached",timeout:15000});
 assert.equal(await alchemistTools.evaluate(node=>node.open),false,
   "six legacy service cards are tucked away until requested");
 assert.equal(await chat.locator('[data-hh-alchemist-topic]').count(),4,
   "four optional topic suggestions remain available in More topics");
 const extraDirections=chat.locator('[data-hh-genie-extra-directions]');
 // Initial collapse was verified on firstLanding before opening Orders.
 // Returning from Orders/News may preserve the user's intentionally opened
 // native details element. Exercise an actual close and reopen in that case.
 if(await extraDirections.evaluate(node=>node.open)){
   await extraDirections.locator(':scope > summary').click();
 }
 await expect(extraDirections.locator(':scope > summary')).toBeVisible();
 assert.equal(await extraDirections.evaluate(node=>node.open),false,
   "optional topic suggestions can be collapsed after returning to AI");
 await extraDirections.locator(':scope > summary').click();
 assert.equal(await extraDirections.evaluate(node=>node.open),true,
   "optional topic suggestions reopen on explicit user action");
 const moreTopics=chat.locator('[data-hh-alchemist-more-topics]');
 await moreTopics.click();
 assert.equal(await chat.locator('[data-hh-alchemist-topic]').count(),8,
   "More topics reveals the remaining four conversational suggestions");
 await moreTopics.click();
 await expect(chat.locator('[data-hh-alchemist-topic]')).toHaveCount(4);
 await extraDirections.locator(':scope > summary').click();
 await chat.locator('[data-hh-ai-chat-composer] textarea').waitFor({state:"visible",timeout:15000});
 assert.equal(await chat.locator('[data-hh-ai-chat-composer]').count(),1,
   "first screen owns one real pinned message composer");
 // "More ways Ali can help" is nested in the real composer More actions menu.
 // Verify both disclosures start closed, then open them through visible summaries.
 const composerMore=chat.locator('[data-hh-ai-more]');
 await composerMore.waitFor({state:"visible",timeout:15000});
 assert.equal(await composerMore.evaluate(node=>node.open),false,
   "More actions starts collapsed to keep the first-screen composer compact");
 await composerMore.locator(':scope > summary').click();
 await alchemistTools.waitFor({state:"visible",timeout:15000});
 await alchemistTools.locator(':scope > summary').click();
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
   ["stress-anxiety","love-relationships","goals-money","energy-confidence"]);
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
 // Assert a fresh assistant turn, not one fixed/repetitive greeting.
 const beforeGreeting=await chat.locator(
   '[data-hh-ai-assistant-message], [data-hh-chat-turn="assistant"]').count();
 await agentComposer.fill("Привет Ау");
 await chat.locator('button[type="submit"]').click();
 await page.waitForFunction(previous=>{
   const thread=document.querySelector('[data-hh-agent-preview] [role="log"]');
   const replies=thread?.querySelectorAll(
     '[data-hh-ai-assistant-message], [data-hh-chat-turn="assistant"]');
   return Boolean(replies&&replies.length>previous&&
     replies[replies.length-1]?.textContent?.trim());
 },beforeGreeting,{timeout:15000});
 await page.waitForFunction(()=>[...document.querySelectorAll(
   '[data-hh-agent-preview] [data-hh-chat-turn="user"]')]
   .some(node=>node.textContent?.includes("Привет Ау")),null,{timeout:10000});
 const latestGreeting=chat.locator(
   '[data-hh-ai-assistant-message], [data-hh-chat-turn="assistant"]').last();
 assert.ok((await latestGreeting.innerText()).trim().length>1,
   "a new visible, nonempty assistant answer follows the guest greeting");
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
 await page.waitForFunction(()=>document.querySelector('[data-hh-agent-preview] textarea')?.getAttribute("aria-label")==="Что сейчас для вас важно?",null,{timeout:10000});
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-hh-agent-preview] [data-hh-chat-turn="user"]')]
   .some(node=>node.textContent?.includes("Хочу денег")),null,{timeout:10000});
 // The exact owner screenshot phrase must open the real menu, not just appear in the transcript.
 const moneyWishMenu=chat.locator('[data-hh-wave-goal-menu]');
 await expect(moneyWishMenu).toBeVisible();
 await expect(moneyWishMenu.locator('[data-hh-wave-goal-step]')).toHaveCount(7);
 await expect(moneyWishMenu.locator('[data-hh-wave-goal-closing]')).toHaveText("Можем начать с 1 пункта.");
 await bilingualInput.fill("I want to discuss my income");
 await chat.locator('button[type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-hh-agent-preview]')?.getAttribute("lang")==="en",null,{timeout:15000});
 await page.waitForFunction(()=>document.querySelector('[data-hh-agent-preview] textarea')?.getAttribute("aria-label")==="What's on your mind?",null,{timeout:10000});
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
   if(await more.evaluate(node=>!node.open)) await more.locator(":scope > summary").click();
   // The More menu also contains legitimate voice/psychologist actions.
   // Require exactly one accessible Reset, not exactly one button total.
   const resetButtons=more.getByRole("button",{name:"Новый разговор",exact:true});
   await expect(resetButtons).toHaveCount(1);
   await resetButtons.click();
   if(await more.evaluate(node=>node.open)) await more.locator(":scope > summary").click();
   await chat.locator('[data-hh-ai-landing]').waitFor({state:"visible",timeout:15000});
   await expect.poll(()=>chat.locator('[data-hh-chat-turn="user"]').count()).toBe(0);
 };
 // Owner screenshot regression, on this isolated guest WebKit session only.
 const assistantReplies=log.locator('[data-hh-ai-assistant-message], [data-hh-chat-turn="assistant"]');
 const sendDialogue=async(text)=>{
   const before=await assistantReplies.count();
   await chat.locator('[data-hh-ai-chat-composer] textarea').fill(text);
   await chat.locator('[data-hh-ai-chat-composer] button[type="submit"]').click();
   await expect.poll(()=>assistantReplies.count()).toBeGreaterThan(before);
 };
 for(const path of ["therapy","consultation","goal"]){
   await resetViaMore();
   await chat.locator('[data-hh-genie-path-choice="'+path+'"]').click();
   if(path==="goal")await expect(chat.locator('[data-hh-wave-goal-menu]')).toBeVisible();
   else{
     await expect(assistantReplies.last()).toContainText(path==="therapy"?"выслушать":"разберёмся");
     await expect(chat.locator('[data-hh-wave-goal-menu]')).toHaveCount(0);
   }
 }
 await resetViaMore();
 await sendDialogue("Привет");
 const entryMenu=chat.locator('[data-hh-wave-entry-menu]');
 await expect(entryMenu).toBeVisible();
 assert.deepEqual(await entryMenu.locator('[data-hh-wave-journey]').allTextContents(),journeyLabels);
 await entryMenu.locator('[data-hh-wave-journey="consultation"]').click();
 await expect(assistantReplies.last()).toContainText("разберёмся");
 for(let step=1;step<=7;step++){
   await resetViaMore();
   await sendDialogue(step%2===1?"Хочу денег":"Дай денег");
   const menu=chat.locator('[data-hh-wave-goal-menu]');
   await expect(menu).toBeVisible();
   await expect(menu.locator('[data-hh-wave-goal-step]')).toHaveCount(7);
   await expect(menu.locator('[data-hh-wave-goal-closing]')).toHaveText("Можем начать с 1 пункта.");
   const choice=menu.locator('[data-hh-wave-goal-step="'+step+'"]');
   const rect=await choice.boundingBox();
   assert.ok(rect&&rect.height>=44,"goal step "+step+" remains touch accessible");
   await choice.click();
   await expect(assistantReplies.last()).toContainText(/финанс/iu);
   await expect(choice).toBeDisabled();
 }
 await resetViaMore();
 await sendDialogue("Хочу денег");
 await sendDialogue("Да");
 await expect(assistantReplies.last()).toContainText("Понять, что происходит, и выбрать цель");
 await sendDialogue("Доход");
 await expect(chat.locator('[data-hh-wave-goal-menu]')).toHaveCount(1);
 results.push({journey:"Three needs → money → seven real clickable stages and Yes → retained financial conversation",passed:true});
 await resetViaMore();
 const openProject=async(id)=>{
   await resetViaMore();
   // The six legacy projects are intentionally inside a collapsed accessible
   // “More ways Ali can help” disclosure on the conversation-first landing.
   // Test the real disclosure, rather than waiting for a hidden button.
   const tools=chat.locator("details[data-hh-alchemist-tools]");
   const more=chat.locator("details[data-hh-ai-more]");
   await more.waitFor({state:"visible",timeout:15000});
   if(await more.evaluate(node=>!node.open))await more.locator(":scope > summary").click();
   await tools.waitFor({state:"visible",timeout:15000});
   if(await tools.evaluate(node=>!node.open))await tools.locator(":scope > summary").click();
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
 await expect(sessionComposer).toBeEnabled({timeout:15000});
 await sessionComposer.focus();
 await expect(sessionComposer).toBeFocused({timeout:10000});
 await page.setViewportSize({width:390,height:360});
 await page.waitForFunction(()=>{
   const thread=document.querySelector('[data-hh-agent-preview] [role="log"]');
   const replies=thread?.querySelectorAll('[data-hh-ai-assistant-message]');
   const reply=replies?.[replies.length-1];
   if(!thread||!reply)return false;
   const bounds=thread.getBoundingClientRect(),bubble=reply.getBoundingClientRect();
   // The end of the latest answer must be visible above the composer.
   // A user-action card can follow the answer, so requiring the entire
   // transcript to be at its scroll tail rejects a usable, focused chat.
   return thread.clientHeight>0&&bubble.height>0&&
     bubble.bottom<=bounds.bottom+2&&bubble.bottom>=bounds.top+8;
 },null,{timeout:15000});
 assert.equal(await fullAssistantReply.evaluate(node=>getComputedStyle(node).flexShrink),"0",
   "iPhone keyboard must not shrink or clip the assistant reply");
 await sessionComposer.blur();
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('.hh-messages-page')?.dataset.hhMobileKeyboardOpen==='false');
 results.push({journey:"Sessions goal-first → keyboard viewport → full AI reply visible",passed:true});

 // After the goal-first Sessions exchange, Ali's mobile sections remain
 // a deliberate disclosure. Expand them with a real user tap before Orders.
 await messengerMenu.waitFor({state:"visible",timeout:30000});
 if(!(await messengerTabs.isVisible())){
   assert.equal(await messengerMenu.getAttribute("aria-expanded"),"false",
     "Ali menu must report collapsed state after the Sessions conversation");
   await messengerMenu.click();
 }
 await messengerTabs.waitFor({state:"visible",timeout:30000});
 assert.equal(await messengerMenu.getAttribute("aria-expanded"),"true",
   "Orders and Clients stay behind the mobile menu until expanded");
 await page.locator('[data-chat-top-tabs] button[aria-controls="hh-orders-panel"]').click();
 await page.locator("#hh-orders-panel").waitFor({state:"visible"});
 await page.locator('[data-chat-top-tabs] button[aria-controls="hh-clients-panel"]').click();
 await page.locator("#hh-clients-panel").waitFor({state:"visible"});
 await page.locator("[data-hh-unified-dock]").waitFor({state:"visible",timeout:15000});
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 await page.locator("[data-unified-dock-item=practice]").click();
 await page.waitForURL(/\/ru\/shamanica\/?$/,{timeout:30000});

 const shamanicaHome=page.locator("[data-shamanica-mobile]");
 await shamanicaHome.waitFor({state:"visible",timeout:30000});
 // The approved first viewport is a six-object alchemist cabinet; the
 // unchanged three-step quiz and film open only when the user expands details.
 await page.evaluate(async()=>{
  window.scrollTo({top:0,behavior:"instant"});
  await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
 });
 const mirrorScreen=await page.evaluate(()=>{
  const cards=[...document.querySelectorAll("[data-shamanica-service]")];
  const answers=[...document.querySelectorAll("[data-shamanica-answer]")];
  const video=document.querySelector("[data-shamanica-mobile] video");
  return {
   cards:cards.length,choices:answers.length,
   photoCards:answers.every(a=>!!a.querySelector("img")),
   video:!!video&&video.getAttribute("preload")==="none",
   next:!!document.querySelector("[data-shamanica-next]"),
   promo:!!document.querySelector("[data-sitewide-antistress-banner]"),
   overflowX:document.documentElement.scrollWidth-innerWidth
  };
 });
 assert.equal(mirrorScreen.cards,6,"Shamanic retains all six photographic service entrances");
 assert.equal(mirrorScreen.choices,4,"Shamanic initial question keeps four real goals");
 assert.ok(mirrorScreen.photoCards&&mirrorScreen.video&&mirrorScreen.next,
  "Shamanic must show playable media, visual answers and Next: "+JSON.stringify(mirrorScreen));
 assert.equal(mirrorScreen.promo,false,"Shamanic must not show the redundant promo ribbon");
 assert.ok(mirrorScreen.overflowX<=2,"Shamanic must not scroll horizontally: "+JSON.stringify(mirrorScreen));
 await page.screenshot({path:folder+"/shamanica-first-screen-ru-390-webkit.png",fullPage:false,animations:"disabled"});
 results.push({journey:"Shamanic six-shelf alchemist first screen",mirrorScreen,passed:true});
 const geanieAsk=shamanicaHome.locator('[data-shamanica-genie-ask]');
 await geanieAsk.waitFor({state:"visible",timeout:15000});
 assert.ok((await geanieAsk.innerText()).trim().length>0);
 assert.equal(await shamanicaHome.locator('[data-shamanica-ai-geanie] img').count(),1);
 await geanieAsk.click();
 const geanieHelp=page.locator('[data-hh-ihelp-dialog]:visible');
 await geanieHelp.waitFor({state:"visible",timeout:15000});
 await geanieHelp.locator('header button[aria-label]').first().click();
 await geanieHelp.waitFor({state:"hidden",timeout:15000});
 results.push({journey:"Shamanic Geanie opens existing real iHelp dialog",passed:true});


 // Browser-rendered iPhone first-fold acceptance for BOTH audiences.
 // No CSS-only or screenshot-of-the-other-view substitute is accepted:
 // all six photo tiles must clear the same fixed seven-item dock.
 const verifyLoungeFold=async(cardSelector,atlas)=>{
   const previous=page.viewportSize();
   const folds=[];
   for(const width of [320,353,390,430]){
     await page.setViewportSize({width,height:768});
     await page.evaluate(async()=>{
       window.scrollTo({top:0,behavior:"instant"});
       await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
     });
     const fold=await page.evaluate(selector=>{
       const tiles=[...document.querySelectorAll(selector)];
       const nav=document.querySelector("[data-hh-unified-dock]");
       const heading=document.getElementById("shamanica-hero-title");
       const room=heading?.closest("section");
       const image=tiles[0]?.firstElementChild;
       return {
         tiles:tiles.length,
         firstTop:tiles[0]?.getBoundingClientRect().top??-1,
         lastBottom:tiles.at(-1)?.getBoundingClientRect().bottom??Infinity,
         dockTop:nav?.getBoundingClientRect().top??-1,
         room:room?getComputedStyle(room,"::before").backgroundImage:"",
         atlas:image?getComputedStyle(image).backgroundImage:"",
         overflowX:document.documentElement.scrollWidth-innerWidth
       };
     },cardSelector);
     assert.equal(fold.tiles,6,"Both Shamanic audiences retain six real buttons: "+width);
     assert.ok(fold.firstTop>=0&&fold.lastBottom<=fold.dockTop-4,
       "All six cards must clear the dock on "+width+"x768: "+JSON.stringify(fold));
     assert.ok(fold.overflowX<=2,"No sideways overflow at "+width+": "+JSON.stringify(fold));
     assert.match(fold.room,/shamanic-genie-lounge\.webp/,
       "Both tabs must show the same HD lounge background");
     assert.ok(fold.atlas.includes(atlas),"Photo atlas must stay HD: "+JSON.stringify(fold));
     folds.push({width,firstTop:fold.firstTop,lastBottom:fold.lastBottom,dockTop:fold.dockTop});
   }
   if(previous)await page.setViewportSize(previous);
   return folds;
 };
 const personalFolds=await verifyLoungeFold("[data-shamanica-service]",
   "shamanic-genie-cards-personal.webp");
 results.push({journey:"Shamanic personal one-screen HD photos at 320/353/390/430",folds:personalFolds,passed:true});
 await shamanicaHome.locator('nav[aria-label="Audience"] a[href="/ru/shamanica/business"]').click();
 await page.waitForURL(/\/ru\/shamanica\/business\/?$/,{timeout:45000});
 const businessCabinet=page.locator("[data-shamanica-business] [data-business-cabinet-shelves]");
 await businessCabinet.waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator('[data-shamanica-ai-geanie] [data-shamanica-genie-ask]:visible').count(),1,
 "Business shares the interactive Geanie help action");
 const businessCards=businessCabinet.locator("[data-business-shelf]");
 assert.deepEqual(await businessCards.evaluateAll(nodes=>nodes.map(node=>node.dataset.businessShelf)),
   ["express","remedies","strategy","artifacts","energy","energywork"],
   "Business uses the same six-tile lounge with approved distinct categories");
 const businessFolds=await verifyLoungeFold("[data-business-shelf]",
   "shamanic-cards-business-hd.avif");
 await page.screenshot({path:folder+"/shamanica-business-first-screen-ru-390-webkit.png",
   fullPage:false,animations:"disabled"});
 await businessCards.first().click();
 const businessExpress=businessCabinet.locator('[data-business-second-level="express"]');
 await businessExpress.waitFor({state:"visible",timeout:15000});
 const expressChoices=await businessExpress.locator("[data-business-subservice]").allTextContents();
 assert.equal(expressChoices.length,5,"Express business opens five real pricing choices");
 for(const price of ["FREE","45 CAD","75 CAD","200 CAD","300 CAD"]){
   assert.ok(expressChoices.some(label=>label.includes(price)),"Approved business offer price: "+price);
 }
 assert.equal(await businessCabinet.locator('[data-business-get-details="express"]').count(),1,
   "Express options retain their existing WhatsApp/Telegram Get details handoff");
 await businessCabinet.locator("[data-business-back-to-shelves]").click();
 assert.equal(await businessCabinet.locator("[data-business-shelf]").count(),6,
   "Business Back returns to the six categories");
 await page.locator('[data-shamanica-mobile] nav[aria-label="Audience"] a[href="/ru/shamanica"]').click();
 await page.waitForURL(/\/ru\/shamanica\/?$/,{timeout:45000});
 await shamanicaHome.waitFor({state:"visible",timeout:30000});
 results.push({journey:"Shamanic Business same HD lounge → 5 priced suboptions → Back → Personal",
   folds:businessFolds,passed:true});

 const originalShamanicaViewport=page.viewportSize();
 await shamanicaHome.locator("[data-shamanica-extras] > summary").click();
 await page.setViewportSize({width:353,height:768});
 await page.evaluate(async()=>{
  window.scrollTo({top:0,behavior:"instant"});
  await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
 });
 const readablePhone=await page.evaluate(()=>{
  const answers=[...document.querySelectorAll("[data-shamanica-answer]")];
  const services=[...document.querySelectorAll("[data-shamanica-service]")];
  const labels=[...document.querySelectorAll("[data-hh-unified-dock] [data-unified-dock-item] span")];
  const measure=element=>element?parseFloat(getComputedStyle(element).fontSize):0;
  return {
   minAnswerFont:Math.min(...answers.map(measure)),
   minAnswerPhoto:Math.min(...answers.map(x=>x.querySelector("img")?.getBoundingClientRect().height??0)),
   minServiceHeading:Math.min(...services.map(x=>measure(x.querySelector("strong")))),
   minDockLabel:Math.min(...labels.map(measure)),
   overflowX:document.documentElement.scrollWidth-innerWidth
  };
 });
 assert.ok(readablePhone.minAnswerFont>=12.5,"Shamanic choices must remain readable: "+JSON.stringify(readablePhone));
 assert.ok(readablePhone.minAnswerPhoto>=60,"Shamanic option photos must remain visible: "+JSON.stringify(readablePhone));
 assert.ok(readablePhone.minServiceHeading>=12,"Shamanic categories must remain readable: "+JSON.stringify(readablePhone));
 assert.ok(readablePhone.minDockLabel>=10,"Shamanic dock labels must remain readable: "+JSON.stringify(readablePhone));
 assert.ok(readablePhone.overflowX<=2,"Shamanic phone has no horizontal overflow: "+JSON.stringify(readablePhone));
 // Selection is explicit. No old automatic jump on card tap.
 await shamanicaHome.locator('[data-shamanica-answer="relationships"]').click();
 assert.equal(await shamanicaHome.locator("[data-shamanica-quiz]").getAttribute("data-quiz-step"),"1");
 assert.equal(await shamanicaHome.locator('[data-shamanica-answer="relationships"]').getAttribute("aria-pressed"),"true");
 await shamanicaHome.locator("[data-shamanica-next]").click();
 assert.equal(await shamanicaHome.locator("[data-shamanica-quiz]").getAttribute("data-quiz-step"),"2");
 await shamanicaHome.locator('[data-shamanica-quiz] button[aria-label="Назад"]').click();
 assert.equal(await shamanicaHome.locator("[data-shamanica-quiz]").getAttribute("data-quiz-step"),"1");
 await page.screenshot({path:folder+"/shamanica-readable-353x768-webkit.png",fullPage:false,animations:"disabled"});
 results.push({journey:"Shamanic readable photo quiz with explicit Next and back",readablePhone,passed:true});
 if(originalShamanicaViewport)await page.setViewportSize(originalShamanicaViewport);
 assert.equal(await shamanicaHome.locator("[data-shamanica-service]").count(),6,
   "Shamanic has exactly six approved functional shelves");
 // The approved Shamanic category is an in-page two-stage selector, not
 // the old immediate navigation. Exercise category → subcategories → the
 // unchanged three concrete priced Details/Order offers without quiz answers.
 const energyEntrance=shamanicaHome.locator('[data-shamanica-service="energy"]');
 assert.equal(await energyEntrance.evaluate(node=>node.tagName),"BUTTON",
   "Category is an interactive in-page selector, not a stale direct href");
 await energyEntrance.click();
 const energySubcategories=shamanicaHome.locator('[data-shamanica-subcategories="energy"]');
 await energySubcategories.waitFor({state:"visible",timeout:30000});
 assert.equal(new URL(page.url()).pathname,"/ru/shamanica",
   "Category tap reveals a local second level, not another page");
 assert.equal(await shamanicaHome.locator("[data-shamanica-service]").count(),0,
   "Subcategory choices replace the six category buttons");
 assert.equal(await energySubcategories.locator("[data-shamanica-subcategory]").count(),3,
   "Energy shows three real next-step service choices");
 assert.equal(await energySubcategories.locator('[data-shamanica-subcategory="energy-0"]').getAttribute("href"),
   "/ru/services/remote-energy-support",
   "First energy choice opens the existing booking service");
 const energyAll=energySubcategories.locator('a[href="/ru/shamanica/results?category=energy"]');
 assert.equal(await energyAll.count(),1,
   "All-services action keeps the original three priced offer page reachable");
 await energySubcategories.locator("button").click();
 assert.equal(await shamanicaHome.locator("[data-shamanica-service]").count(),6,
   "Back restores all six category buttons");
 await shamanicaHome.locator('[data-shamanica-service="academy"]').click();
 const academySubcategories=shamanicaHome.locator('[data-shamanica-subcategories="academy"]');
 await academySubcategories.waitFor({state:"visible",timeout:15000});
 assert.equal(await academySubcategories.locator("[data-shamanica-subcategory]").count(),4,
   "Academy keeps the four existing course pathways");
 await academySubcategories.locator("button").click();
 await shamanicaHome.locator('[data-shamanica-service="guidance"]').click();
 const guidanceSubcategories=shamanicaHome.locator('[data-shamanica-subcategories="guidance"]');
 await guidanceSubcategories.waitFor({state:"visible",timeout:15000});
 assert.equal(await guidanceSubcategories.locator("[data-shamanica-subcategory]").count(),3,
   "Guidance exposes three published readings");
 await guidanceSubcategories.locator("button").click();
 await shamanicaHome.locator('[data-shamanica-service="energy"]').click();
 await shamanicaHome.locator('[data-shamanica-subcategories="energy"] a[href="/ru/shamanica/results?category=energy"]').click();
 await page.waitForURL(url => url.pathname==="/ru/shamanica/results" &&
   url.searchParams.get("category")==="energy",{timeout:45000});
 const categoryOffers=page.locator('[data-shamanica-category-offers="energy"]');
 await categoryOffers.waitFor({state:"visible",timeout:30000});
 assert.equal(await categoryOffers.locator("[data-support-uniform-card]").count(),3);
 assert.equal(await categoryOffers.locator("[data-service-price]").count(),3);
 assert.equal(await categoryOffers.locator("[data-support-uniform-photo] img").count(),3);
 assert.equal(await categoryOffers.locator("[data-service-card-controls]").count(),3);
 assert.equal(await page.locator("[data-recommended-service]").count(),0,
   "Clicking a category shows only that category's concrete offers, not quiz priorities");
 const firstOffer=categoryOffers.locator("[data-support-uniform-card]").first();
 await firstOffer.locator("[data-service-card-controls] button").first().click();
 assert.equal(await firstOffer.locator("[data-service-card-details]:visible").count(),1);
 await firstOffer.locator("[data-service-card-controls] button").nth(1).click();
 assert.equal(await firstOffer.locator("[data-service-card-order]:visible").count(),1);
 assert.ok(await firstOffer.locator("[data-messenger-only-channel]").count()>=1,
   "Order must expose a real messenger handoff");
 // The 320px first-fold acceptance measures the compact, *collapsed* list.
 // First prove the real Order panel and messenger handoff, then close it using
 // the same accessible user control; do not fake visibility or change styles.
 await firstOffer.locator("[data-service-card-controls] button").nth(1).click();
 assert.equal(await firstOffer.locator('[data-service-card-controls] button').nth(1).getAttribute("aria-expanded"),"false",
   "Order control must collapse back to the one-screen service cards");
 assert.equal(await firstOffer.locator("[data-service-card-order]:visible").count(),0,
   "Expanded Order panel must close before compact first-fold acceptance");
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2),
   "Shamanic service list must not overflow mobile width");
 // The 3 compact offers AND their category heading must fit above the fixed
 // dock in the collapsed state on a normal iPhone (including the owner 353px).
 const originalCategoryViewport=page.viewportSize();
 for(const width of [320,353,390,430]){
   await page.setViewportSize({width,height:768});
   await page.evaluate(async()=>{
     window.scrollTo({top:0,behavior:"instant"});
     await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
   });
   const geometry=await page.evaluate(()=>{
     const boxes=[...document.querySelectorAll('[data-shamanica-category-offers="energy"] [data-support-uniform-card]')];
     const nav=document.querySelector("[data-hh-unified-dock]");
     const title=document.querySelector("[data-shamanica-results-title]");
     const tabs=document.querySelector("[data-shamanica-category-nav]");
     const inside=(child,parent)=>{
       const a=child?.getBoundingClientRect(),b=parent?.getBoundingClientRect();
       return !!a&&!!b&&a.left>=b.left-2&&a.right<=b.right+2&&a.top>=b.top-2&&a.bottom<=b.bottom+2;
     };
     return {
       titleTop:title?.getBoundingClientRect().top,
       tabsBottom:tabs?.getBoundingClientRect().bottom,
       dockTop:nav?.getBoundingClientRect().top,
       overflowX:document.documentElement.scrollWidth-innerWidth,
       cards:boxes.map(el=>({
         top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,
         buttonsInside:inside(el.querySelector("[data-service-card-controls]"),el),
         photoInside:inside(el.querySelector("[data-support-uniform-photo]"),el),
         priceInside:inside(el.querySelector("[data-service-price]"),el)
       }))
     };
   });
   assert.equal(geometry.cards.length,3,"Category always contains three real services");
   assert.ok(geometry.cards.every(c=>c.buttonsInside&&c.photoInside&&c.priceInside),
     "Compact Shamanic controls/photos/prices must remain inside their own cards: "+
       width+" "+JSON.stringify(geometry));
   assert.ok(geometry.titleTop>=-1 && geometry.cards[2].bottom<=geometry.dockTop-4,
     "Shamanic category header + all three cards must clear fixed dock at "+width+
     "x768: "+JSON.stringify(geometry));
   assert.ok(geometry.overflowX<=2,
     "Shamanic category has no page overflow at "+width+": "+JSON.stringify(geometry));
   await page.screenshot({path:folder+"/shamanica-category-energy-"+width+"-webkit.png",
     fullPage:false,animations:"disabled"});
 }
 if(originalCategoryViewport)await page.setViewportSize(originalCategoryViewport);
 for(const lang of ["en","es"]){
   await page.goto(origin+"/"+lang+"/shamanica/results?category=learning",
     {waitUntil:"domcontentloaded",timeout:75000});
   await page.locator('[data-shamanica-category-offers="learning"]').waitFor({state:"visible",timeout:30000});
   assert.equal(await page.locator("[data-support-uniform-card]").count(),3,
     "Localized Shamanic category must contain three offers in "+lang);
 }
 await page.goto(origin+"/ru/shamanica",{waitUntil:"domcontentloaded",timeout:75000});
 await shamanicaHome.waitFor({state:"visible",timeout:30000});
 results.push({journey:"Shamanic category → three live priced offers → Details/Order; EN/ES routes",passed:true});

 await shamanicaHome.locator("[data-shamanica-extras] > summary").click();
 const shamanicaQuiz=shamanicaHome.locator("[data-shamanica-quiz]");
 await expect(shamanicaQuiz).toHaveAttribute("data-quiz-step","1");
 assert.equal(await shamanicaQuiz.locator("[data-shamanica-answer]").count(),4,
   "Shamanica asks the four requested goals in a compact 2-by-2 mobile quiz");
 await shamanicaQuiz.locator('[data-shamanica-answer="energy"]').click();
 await expect(shamanicaQuiz).toHaveAttribute("data-quiz-step","1");
 await expect(shamanicaQuiz.locator('[data-shamanica-answer="energy"]')).toHaveAttribute("aria-pressed","true");
 await shamanicaQuiz.locator("[data-shamanica-next]").click();
 await expect(shamanicaQuiz).toHaveAttribute("data-quiz-step","2");
 await shamanicaQuiz.locator('[data-shamanica-answer="learning"]').click();
 await expect(shamanicaQuiz.locator('[data-shamanica-answer="learning"]')).toHaveAttribute("aria-pressed","true");
 await shamanicaQuiz.locator("[data-shamanica-next]").click();
 await expect(shamanicaQuiz).toHaveAttribute("data-quiz-step","3");
 await shamanicaQuiz.locator('[data-shamanica-answer="free"]').click();
 await expect(shamanicaQuiz.locator('[data-shamanica-answer="free"]')).toHaveAttribute("aria-pressed","true");
 await shamanicaQuiz.locator("[data-shamanica-next]").click();
 await page.waitForURL(/\/ru\/shamanica\/results(?:\?|\/$)/,{timeout:45000});
 await page.locator("[data-shamanica-results]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-recommended-service]").count(),2,
   "Shamanica shows exactly two personal directions on a separate screen");
 // The previous Academy and its five-question learning quiz remain available
 // through their explicit legacy address; the new dock no longer targets it.
 await page.goto(origin+"/ru/holistic-support/mobile",{waitUntil:"domcontentloaded",timeout:75000});
 // Legacy Study offers the approved five-question learning quiz above the three Academy schools.
 // Verify the first question requires a real choice before advancing.
 const studyEntry=page.locator("[data-holistic-study-academy]");
 await studyEntry.waitFor({state:"visible",timeout:30000});
 assert.equal(await studyEntry.locator("[data-study-school-nav]").count(),3,
   "Practice opens three approved Academy learning pathways");
 assert.equal(await studyEntry.locator("[data-study-academy-group]").count(),3,
   "Practice lists the three grouped Academy programs");
 assert.equal(await studyEntry.locator("[data-study-academy-course]").count(),8,
   "Practice links to eight source-backed courses");
 const academyQuiz=studyEntry.locator('[data-study-mobile-quiz] [data-study-personalized-path]');
 await academyQuiz.waitFor({state:"visible",timeout:30000});
 assert.equal(await academyQuiz.getAttribute("data-study-step"),"1",
   "Approved Academy quiz starts at the first question");
 assert.equal(await academyQuiz.locator('[aria-current="step"]').count(),1,
   "The quiz exposes exactly one active step");
 const choices=academyQuiz.locator('[role="group"]').first().locator('button[aria-pressed]');
 assert.equal(await choices.count(),4,
   "The active first question offers four genuine choices, excluding the four recommendation-tab buttons");
 const nextStep=academyQuiz.locator('[data-study-next]');
 // Academy intentionally presets the published stress goal. Verify that
 // the selected choice enables Next and a real different answer replaces it.
 await expect(choices.first()).toHaveAttribute("aria-pressed","true");
 await expect(nextStep).toBeEnabled();
 await choices.nth(1).click();
 await expect(choices.first()).toHaveAttribute("aria-pressed","false");
 await expect(choices.nth(1)).toHaveAttribute("aria-pressed","true");
 await expect(nextStep).toBeEnabled();
 await nextStep.click();
 assert.equal(await academyQuiz.getAttribute("data-study-step"),"2",
   "Only a genuine selected first answer advances the Academy quiz");
 await studyEntry.locator('[data-study-school-nav="free"]').click();
 assert.equal(new URL(page.url()).hash,"#study-free",
   "Public Academy navigation reaches the free programs without a fake request");
 // The older consultation tabs are still accessible on their explicit view.
 await page.goto(origin+"/ru/holistic-support/mobile?view=meditation",
   {waitUntil:"domcontentloaded",timeout:75000});
 await page.locator("[data-support-practice-tabs]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-support-practice-tabs] > *").count(),3);
 await page.locator('[data-support-practice-tabs] button').nth(1).click();
 assert.equal(await page.locator('[data-support-practice-tabs] button').nth(1).getAttribute("aria-pressed"),"true");
 results.push({journey:"MyTube → Video → six real iChat choices → Orders/Clients → Shamanica quiz → published Academy",passed:true});
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
 await page.waitForURL(/\/ru\/shamanica\/?$/,{timeout:45000});
 await page.locator("[data-shamanica-mobile]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-shamanica-service]").count(),6);
 await expect(page.locator("[data-shamanica-quiz]")).toHaveAttribute("data-quiz-step","1");
 assert.equal(await page.locator("[data-support-practice-tabs]:visible").count(),0,
   "the approved Shamanica landing does not show the old Support top menu");
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 assert.equal(await page.locator('[data-hh-unified-dock] [data-unified-dock-item]').count(),7);
 results.push({journey:"Holistic House Home → Services → Shamanica with one seven-tab dock",passed:true});

 // Profile unification: both Home and Practice open the existing private hub.
 // The protected CSP transition must remain a full server-authorized reload.
 await page.goto(origin+"/ru",{waitUntil:"domcontentloaded",timeout:75000});
 const unifiedProfile=page.locator('[data-hh-unified-dock] [data-unified-dock-item="profile"]');
 await unifiedProfile.waitFor({state:"visible",timeout:30000});
 assert.equal(await unifiedProfile.getAttribute("href"),"/ru/app/portrait");
 await unifiedProfile.click();
 await page.waitForURL(/\/ru\/app\/portrait\/?$/,{timeout:45000});
 await page.locator('[data-profile-hub-tabs]').waitFor({state:"visible",timeout:45000});
 // #4301 restored My Space / Today as the canonical Profile landing.
 // A signed-out visitor sees the public Cabinet overview and may deliberately
 // open guest Tests; the old auto-opened Tests-first page is no longer mounted.
 assert.equal(await page.locator('[data-profile-hub-tabs][data-profile-active="today"]').count(),1,
   "guest Profile opens the current My Space Today dashboard, not the retired Tests-first view");
 await page.locator('[data-profile-space-dashboard]').waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator('[data-goal-profile-tab="clarity"][aria-pressed="true"]').count(),1,
   "Clarity is the current guest dashboard mode");
 await expect(page.locator('[data-profile-my-video]')).toBeVisible();
 const guestOverview=page.locator('[data-cabinet-guest-overview="true"]');
 await guestOverview.waitFor({state:"visible",timeout:45000});
 const publicTests=guestOverview.locator('a[href="/ru/client/tests"]');
 await publicTests.waitFor({state:"visible",timeout:15000});
 assert.equal(await page.locator('[data-profile-tests-first]').count(),0,
   "retired standalone test-first component must not replace the My Space overview");
 // Today's approved layout uses the scenic My Space dashboard, not the
 // retired horizontal tab bar. Assert its exact routes and four real cards.
 assert.equal(await page.locator('[data-profile-hub-tabs] [data-profile-tab]').count(),0,
   "Today uses the photographic dashboard instead of duplicate tabs");
 assert.deepEqual(await page.locator('[data-profile-space-card]').evaluateAll(
   links=>links.map(link=>link.dataset.profileSpaceCard)),
   ["state","courses","reports","sessions"],
   "The four signed-in-capable sections remain visible as honest guest entries");
 assert.deepEqual(await page.locator('[data-goal-profile-tab]').evaluateAll(els=>els.map(el=>el.dataset.goalProfileTab)),["clarity","goals","business"]);
 await expect(page.locator('[data-profile-my-video]')).toHaveAttribute("href","/ru/holistic-support/mandala");
 assert.equal(await page.locator('[data-hh-unified-dock] [data-unified-dock-item="profile"][aria-current="page"]').count(),1);
 assert.equal(await page.locator('.mobile-bottom-navigation:visible').count(),0);
 // In Profile, every account action is gated on an explicit guest click.
 // The sitewide public test catalogue remains accessible outside My Space.
 await publicTests.click();
 const login=page.locator('dialog[data-profile-auth-dialog]');
 await login.waitFor({state:"visible",timeout:45000});
 assert.equal(await login.getByRole('button',{name:'Продолжить через Google'}).isVisible(),true,
   'Profile guest action offers the existing Google OAuth entry');
 assert.match(page.url(),/\/ru\/app\/portrait\/?$/,
   'clicking a Profile action keeps the guest on Life until authenticated');
 await login.getByRole('button',{name:'Продолжить просмотр'}).click();
 await login.waitFor({state:'hidden',timeout:15000});
 // All program modes keep the same public MyVideo tool available.
 for(const mode of ["goals","business","clarity"]){
   await page.locator('[data-goal-profile-tab="'+mode+'"]').click();
   await expect(page.locator('[data-goal-profile-tab="'+mode+'"]')).toHaveAttribute("aria-pressed","true");
   await expect(page.locator('[data-profile-my-video]')).toBeVisible();
   assert.equal(await page.locator('dialog[data-profile-auth-dialog]:visible').count(),0);
 }
 await page.locator('[data-profile-my-video]').click();
 await page.waitForURL(/\/ru\/holistic-support\/mandala\/?$/,{timeout:45000});
 results.push({journey:"Public Profile → private action opens OAuth choice → dismiss → program modes → public MyVideo",passed:true});

}finally{await browser.close();}
writeFileSync(folder+"/results.json",JSON.stringify(results,null,2));
console.log("Unified six-dock browser acceptance passed",results.length);
