// Production-build first-screen acceptance for the dialogue-first public Home.
// No form is submitted to a provider, no account is created or charged.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("First-screen QA accepts only the isolated local production server");
const output = "artifacts/home-first-screen";
await mkdir(output, {recursive:true});

const evidence = [];
for (const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try {
    for(const [locale,path,labels] of [
      ["en","/",["For myself","For business"]],
      ["ru","/ru",["Для себя","Для бизнеса"]],
      ["es","/es",["Para mí","Para mi negocio"]],
    ]){
      for(const width of [320,390,430]){
        const page=await browser.newPage({
          viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,
          hasTouch:true,reducedMotion:"reduce",
        });
        const label=engine.name()+":"+locale+":"+width;
        const scriptEvents=[];
        page.on("pageerror",error=>scriptEvents.push("pageerror:"+error.message.slice(0,240)));
        page.on("console",message=>{
          if(message.type()==="error")scriptEvents.push("console:"+message.text().slice(0,360));
        });
        page.on("requestfailed",request=>{
          if(request.url().includes("/instant-home/fast.js"))
            scriptEvents.push("script-request-failed:"+String(request.failure()?.errorText).slice(0,160));
        });
        page.on("response",response=>{
          if(response.url().includes("/instant-home/fast.js"))
            scriptEvents.push("script-status:"+response.status());
        });
        try {
          const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
          assert.equal(response?.status(),200,label+": Home HTTP 200");
          // Canonical EN/RU/ES must show the owner-approved React Home.
          // The legacy CDN shell is opt-in only and must never pass this default-route QA.
          assert.equal(await page.locator('body[data-fast-home]').count(),0,
            label+": approved React Home is the default on all locales");
          const root=page.locator("[data-home-dialogue-entry]");
          await root.waitFor({state:"visible",timeout:30000});
          // React must be hydrated before exercising the actual mode click.
          await page.locator('[data-home-dialogue-entry][data-home-interactive="true"]')
            .waitFor({state:"visible",timeout:15000});
          const header=root.locator("[data-home-dialogue-header]");
          await header.locator("h1").waitFor({state:"visible"});
          assert.equal((await header.locator("h1").innerText()).trim(),"Holistic House",
            label+": one-line identity");
          assert.equal(await page.locator("header.house-header--services").count(),0,
            label+": no old Holistic House top header");
          assert.equal(await page.locator("[data-sitewide-antistress-banner]").count(),0,
            label+": no generic promo ribbon");
          assert.equal(await page.locator("[data-profile-hub-tabs]").count(),0,
            label+": no second profile heading");
          const language=header.locator("[data-home-language-switch]");
          assert.equal(await language.locator('a[aria-current="page"]').getAttribute("lang"),locale,
            label+": language stays localized");
          assert.equal(await language.locator("a[lang]").count(),3,label+": three languages");
          const headerRect=await header.boundingBox();
          const titleRect=await header.locator("h1").boundingBox();
          const actionRect=await header.locator(".site-navigation").boundingBox();
          assert.ok(headerRect&&titleRect&&actionRect&&titleRect.y<headerRect.y+headerRect.height&&
            titleRect.x+titleRect.width<=actionRect.x+1,
            label+": header keeps Holistic House and search/menu on the same row");
          const personal=root.locator('[data-home-mode-button="self"]');
          const business=root.locator('[data-home-mode-button="business"]');
          assert.equal(await personal.innerText(),labels[0],label+": personal label");
          assert.equal(await business.innerText(),labels[1],label+": business label");
          assert.equal(await personal.getAttribute("aria-pressed"),"true");
          await business.click();
          assert.equal(await root.getAttribute("data-home-mode"),"business",
            label+": switch updates composer context without leaving Home");
          assert.equal(await root.locator("[data-home-intent-option]").count(),4,
            label+": four needs including business support");
          const review=root.locator("[data-home-free-review]");
          assert.equal(await review.count(),1,label+": one primary free review entry");
          assert.equal(await review.getAttribute("href"),"/"+locale+"/explore/business",
            label+": real localized business review route");
          // The approved 2026 Home is dialogue-first: Ali composer first,
          // then four directions, three steps, Get Ideas and Get Support.
          // Measure every block together before mobile keyboard auto-scroll.
          const layout=await root.evaluate(element=>{
            const selectors=['[data-home-intent-form]','[data-home-focus-grid]',
              '[data-home-how-it-works]','[data-home-free-review]',
              '[data-home-request-session]'];
            const nodes=selectors.map(selector=>element.querySelector(selector));
            if(nodes.some(node=>!node))return null;
            return nodes.map(node=>{const {top,bottom}=node.getBoundingClientRect();return {top,bottom}});
          });
          assert.ok(layout&&layout.length===5&&
            layout[0].bottom<=layout[1].top+1&&
            layout[1].bottom<=layout[2].top+1&&
            layout[2].bottom<=layout[3].top+1&&
            layout[2].bottom<=layout[4].top+1,
            label+": Ali composer → four directions → three steps → Get Ideas / Get Support "+
              JSON.stringify(layout));
          assert.equal(await root.locator("[data-home-focus-grid]").count(),1,label+": grouped choices");
          await personal.click();
          assert.equal(await root.getAttribute("data-home-mode"),"self");
          assert.equal(await review.getAttribute("href"),"/"+locale+"/services/free-situation-review",
            label+": personal mode restores real free review route");
          const hero=root.locator("[data-home-dialogue-hero]");
          const heroRect=await hero.boundingBox();
          assert.ok(heroRect&&heroRect.y<600,label+": dialogue takes the first viewport");
          const input=root.locator("[data-home-intent-composer]");
          const send=root.locator("[data-home-send-to-ali]");
          await input.waitFor({state:"visible"});
          assert.equal(await send.isEnabled(),true,label+": free Ali chat starts without a typed goal");
          await input.fill(locale==="ru"?"Хочу создать курс":locale==="es"?"Quiero crear un curso":"I want to create a course");
          assert.equal(await send.isEnabled(),true,label+": real editable composer");
          await input.fill("");
          assert.equal(await send.isEnabled(),true,label+": free Ali chat remains open after clearing goal");
          const search=header.locator("[data-site-search-trigger]");
          await search.click();
          await header.locator("[data-site-search-panel]").waitFor({state:"visible"});
          await page.keyboard.press("Escape");
          assert.equal(await header.locator("[data-site-search-panel]").count(),0,
            label+": site search closes on Escape");
          const menu=header.locator("details.site-main-menu");
          await menu.locator("summary").click();
          assert.equal(await menu.getAttribute("open"),"",label+": menu opens");
          await menu.locator('.site-main-menu-panel [data-nav-item="services"]').waitFor({state:"visible"});
          await page.keyboard.press("Escape");
          assert.equal(await menu.getAttribute("open"),null,label+": menu closes");
          const dock=page.locator("[data-hh-unified-dock]");
          await dock.waitFor({state:"visible",timeout:30000});
          const tabs=dock.locator("[data-unified-dock-item]");
          assert.deepEqual(await tabs.evaluateAll(items=>items.map(x=>x.getAttribute("data-unified-dock-item"))),
            ["mytube","video","coach","ai","services","practice","profile"],
            label+": exactly seven existing mobile destinations, unchanged");
          assert.equal(await page.locator("[data-home-deferred-sections]").count(),1,
            label+": below-the-fold catalogue is deferred");
          assert.equal(await page.locator("iframe").count(),0,
            label+": no external video frame on first paint");
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
          assert.ok(overflow<=1,label+": no iPhone horizontal overflow: "+overflow);
          const box=await root.boundingBox();
          assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1,label+": Home inside viewport");
          const renderResources=await page.evaluate(()=>({
             stylesheets:document.querySelectorAll('link[rel="stylesheet"]').length,
             cssRequests:performance.getEntriesByType('resource').filter(item=>new URL(item.name).pathname.endsWith('.css')).length,
             heroFetchPriority:document.querySelector('[data-home-dialogue-hero] img')?.getAttribute('fetchpriority')||null,
           }));
           evidence.push({engine:engine.name(),locale,width,mode:"dialogue-first",sevenButtons:7,
             ...renderResources,
            firstScreenStart:Math.round(heroRect.y),heroHeight:Math.round(heroRect.height)});
          if(engine===webkit&&width===390)
            await page.screenshot({path:output+"/home-"+locale+"-webkit-390.png",fullPage:false});
        } finally { await page.close(); }
      }
    }
  } finally { await browser.close(); }
}
await writeFile(output+"/first-screen-results.json",JSON.stringify(evidence,null,2));
console.log("Dialogue-first Home first-screen QA passed in Chromium/WebKit, EN/RU/ES, 320/390/430px:",evidence.length);
