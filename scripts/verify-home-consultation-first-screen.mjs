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
          // Direct EN/RU HTML is intentionally CDN-first: verify the real
          // browser-visible static controls, not the obsolete React header.
          if (locale !== "es") {
            // A rewrite must not accidentally deindex the canonical public
            // Home by inheriting headers from its internal static document.
            assert.doesNotMatch(response.headers()["x-robots-tag"]||"",/noindex/i,
              label+": canonical Home must remain indexable");
            const documentCsp=response.headers()["content-security-policy"]||"";
            assert.match(documentCsp,/script-src 'self'/,label+": first-party fast JS allowed");
            assert.doesNotMatch(documentCsp,/nonce-|strict-dynamic/,label+": static Home must not get private CSP");
            const fast=page.locator('body[data-fast-home="'+locale+'"]');
            await fast.waitFor({state:"attached",timeout:20000});
            try {
              await page.locator('html[data-home-interactive="true"]').waitFor({state:"attached",timeout:12000});
            } catch(error) {
              // Fail closed with the actual first-party asset/CSP diagnostics.
              // The form and intent controls are NOT considered working without executed JS.
              const asset=await page.request.get(origin+"/instant-home/fast.js",{timeout:12000}).catch(()=>null);
              const state=await page.evaluate(()=>({
                script:document.querySelector('script[src*="instant-home/fast.js"]')?.getAttribute("src")||null,
                composer:Boolean(document.getElementById("ali-form")),
                input:Boolean(document.getElementById("ali-message")),
              }));
              const servedCsp=response?.headers()["content-security-policy"]||"missing";
              throw Error(label+": CDN Home JS did not initialize; asset="+(asset?.status()??"unavailable")+
                " csp="+servedCsp.slice(0,900)+
                " document="+JSON.stringify(state)+" events="+JSON.stringify(scriptEvents)+
                " original="+error.message.slice(0,160));
            }
            const first=fast.locator('[data-home-dialogue-entry]');
            await first.waitFor({state:"visible"});
            const brand=fast.locator('header.header .brand');
            await brand.waitFor({state:"visible"});
            assert.match(await brand.innerText(),/Holistic House/,label+": brand present");
            const language=fast.locator('[data-home-language-switch]');
            await language.locator('summary').click();
            assert.equal(await language.locator('a[aria-current="page"]').getAttribute('lang'),locale);
            assert.equal(await language.locator('a[lang]').count(),3);
            await page.keyboard.press("Escape");
            assert.equal(await language.getAttribute('open'),null);
            const personal=first.locator('[data-home-mode-button="self"]');
            const business=first.locator('[data-home-mode-button="business"]');
            assert.equal(await personal.innerText(),labels[0]);
            assert.equal(await business.innerText(),labels[1]);
            assert.equal(await personal.getAttribute("aria-pressed"),"true");
            await business.click();
            assert.equal(await business.getAttribute("aria-pressed"),"true",label+": business mode selected");
            const tiles=first.locator('[data-home-intent-option]');
            assert.equal(await tiles.count(),4,label+": four contextual choices");
            assert.match(await tiles.first().locator(".label").innerText(),
              locale==="ru"?/Клиенты/:/Clients/,label+": business choices change");
            const review=first.locator('[data-home-free-review]');
            assert.equal(await review.getAttribute("href"),"/"+locale+"/explore/business",
              label+": verified business review");
            await personal.click();
            assert.equal(await personal.getAttribute("aria-pressed"),"true");
            assert.equal(await review.getAttribute("href"),"/"+locale+"/services/free-situation-review");
            const input=first.locator('[data-home-intent-composer]');
            const send=first.locator('[data-home-send-to-ali]');
            await input.waitFor({state:"visible"});
            assert.equal(await send.isDisabled(),true);
            await input.fill(locale==="ru"?"Помогите с работой":"Please help with my work");
            assert.equal(await send.isEnabled(),true,label+": true interactive composer");
            await input.fill("");
            const hero=first.locator('[data-home-dialogue-hero]');
            const heroRect=await hero.boundingBox();
            assert.ok(heroRect&&heroRect.y<600,label+": Hero visible in first viewport");
            const navigation=fast.locator('header.header details').last();
            await navigation.locator('summary').click();
            assert.equal(await navigation.getAttribute("open"),"");
            await page.keyboard.press("Escape");
            assert.equal(await navigation.getAttribute("open"),null);
            const dock=page.locator('[data-hh-unified-dock] [data-unified-dock-item]');
            assert.deepEqual(await dock.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-unified-dock-item"))),
              ["mytube","video","coach","ai","services","practice","profile"]);
            assert.equal(await fast.locator('[data-home-deferred-sections]').count(),1);
            assert.equal(await page.locator('[data-home-deferred-sections]').count(),1);
            assert.equal(await page.locator("iframe").count(),0,label+": no iframe before video opt-in");
            const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
            assert.ok(overflow<=2,label+": no horizontal overflow "+overflow);
            const box=await first.boundingBox();
            assert.ok(box&&box.x>=-1&&box.x+box.width<=width+2,label+": fits mobile viewport");
            evidence.push({engine:engine.name(),locale,width,mode:"cdn-interactive",sevenButtons:7,
              firstScreenStart:Math.round(heroRect.y),heroHeight:Math.round(heroRect.height)});
            if(engine===webkit&&width===390)
              await page.screenshot({path:output+"/home-"+locale+"-webkit-390.png",fullPage:false});
            continue;
          }
          assert.equal(await page.locator('body[data-fast-home]').count(),0,
            label+": Spanish remains explicit Next.js Home");
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
          assert.equal(await root.locator("[data-home-focus-grid]").count(),1,label+": grouped choices");
          // The approved photo-led Home displays Ali's composer first, four
          // topic choices next, and the free-review/support cards below.
          // Older dialogue-first Home used a different order. Keep the real
          // 320px non-overlap invariant, not a stale DOM/visual-order contract.
          const layout=await root.evaluate(node=>{
            const select=selector=>{
              const element=node.querySelector(selector);
              if(!element)return null;
              const rect=element.getBoundingClientRect();
              return {top:rect.top,bottom:rect.bottom};
            };
            return {
              review:select("[data-home-free-review]"),
              cards:select("[data-home-focus-grid]"),
              composer:select("[data-home-intent-composer]"),
            };
          });
          const separated=(a,b)=>a&&b&&(a.bottom<=b.top+1||b.bottom<=a.top+1);
          assert.ok(separated(layout.review,layout.cards),
            label+": free review and four topics must not overlap "+JSON.stringify(layout));
          assert.ok(separated(layout.cards,layout.composer),
            label+": four topics and Ali composer must not overlap "+JSON.stringify(layout));
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
          // ES Next.js Home has a separate Start free chat action even without a typed wish.
          // CDN-first EN/RU checks above retain the existing empty-input contract.
          assert.equal(await send.isEnabled(),true,label+": Start free chat works without a prefilled goal");
          await input.fill(locale==="ru"?"Хочу создать курс":locale==="es"?"Quiero crear un curso":"I want to create a course");
          assert.equal(await send.isEnabled(),true,label+": real editable composer");
          await input.fill("");
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
          evidence.push({engine:engine.name(),locale,width,mode:"dialogue-first",sevenButtons:7,
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
