/**
 * Focused, guest-only visual acceptance for the owner's 02-Nov Holistic Light
 * Video Studio first screen. Real Chromium/WebKit DOM, licensed media images
 * and actual existing buttons; NO video render, provider POST or client data.
 * Use a built local Next server and Playwright installed by the Mandala job.
 */
import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium,webkit,expect} from "@playwright/test";
const base=(process.env.HH_TEST_PUBLIC_ORIGIN||"http://127.0.0.1:3100").replace(/\/$/,"");
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error("Holistic Light QA must use a local built site");
const cases=[
  ["ru",320],["ru",354],["ru",390],["ru",430],["en",390],["es",390]
];
mkdirSync("artifacts/mandala-holistic-light",{recursive:true});
const report=[];
for(const [engine,browserType] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await browserType.launch({headless:true});
  try{
    for(const [locale,width] of cases){
      // Run WebKit at two representative widths + EN/ES to avoid costly
      // duplicate video decoders. All six cases run in Chromium.
      if(engine==="webkit" && !(width===320||width===390))continue;
      const context=await browser.newContext({viewport:{width,height:844},
        deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:"block",
        reducedMotion:"reduce"});
      try{
        const page=await context.newPage(),errors=[],writes=[];
        page.on("pageerror",error=>errors.push(error.message));
        await page.route("**/*",route=>{
          const req=route.request(),url=new URL(req.url());
          if(!["GET","HEAD"].includes(req.method())){
            writes.push(req.method()+" "+url.pathname);
            return route.abort();
          }
          if(url.origin!==new URL(base).origin)return route.abort();
          return route.continue();
        });
        const response=await page.goto(base+"/"+locale+"/holistic-support/mandala",{
          waitUntil:"domcontentloaded",timeout:85000});
        assert.equal(response?.status(),200,engine+" "+locale+" "+width+" route");
        await page.locator('[data-video-studio-hydrated="true"]').waitFor({state:"attached",timeout:45000});
        const root=page.locator("[data-mandala-free-video]");
        const goals=root.locator("[data-video-director-goal-controls] [data-auto-video-category]");
        const topics=root.locator("[data-video-director-topic-controls] [data-auto-video-goal]");
        const stories=root.locator("[data-auto-video-story-options] [data-auto-video-option]");
        const tabs=root.locator("[data-video-quick-control]");
        await expect(goals.first()).toBeVisible({timeout:20000});
        await expect(stories.first()).toBeVisible({timeout:20000});
        assert.equal(await goals.count(),5);
        assert.equal(await topics.count(),6);
        assert.equal(await stories.count(),4);
        assert.equal(await tabs.count(),6);
        const layout=await page.evaluate(()=>{
          const rect=(selector)=>[...document.querySelectorAll(selector)].map(el=>{
            const r=el.getBoundingClientRect();
            return {x:r.x,y:r.y,width:r.width,height:r.height};
          });
          const input=document.querySelector("[data-auto-video-input]");
          return {viewport:document.documentElement.clientWidth,
            scroll:document.documentElement.scrollWidth,
            hero:rect("[data-video-mandala-hero]")[0],
            tabs:rect("[data-video-quick-control]"),
            goals:rect("[data-auto-video-category]"),
            topics:rect("[data-auto-video-goal]"),
            stories:rect("[data-auto-video-story-options] [data-auto-video-option]"),
            confirm:rect("[data-auto-video-confirm]")[0],
            input:input?.getBoundingClientRect().toJSON(),
            inputFont:input?parseFloat(getComputedStyle(input).fontSize):0,
            headlines:rect("[data-video-director-goal-controls], [data-auto-video-topic-panel], [data-auto-video-director]"),
          };
        });
        assert.ok(layout.scroll<=layout.viewport+3,
          engine+"/"+locale+"/"+width+" horizontal overflow: "+JSON.stringify(layout));
        assert.ok(layout.hero && layout.hero.height>=140 &&
          layout.hero.width/layout.hero.height>1.6 &&
          layout.hero.width/layout.hero.height<1.95,
          engine+" "+width+" true 16:9 shared Canvas hero: "+JSON.stringify(layout.hero));
        assert.equal(layout.tabs.length,6);
        assert.ok(layout.tabs.every((item,index)=>item.height>=44&&item.height<=70 &&
          Math.abs(item.y-layout.tabs[0].y)<4 &&
          (index===0||item.x>layout.tabs[index-1].x+38)),
          "six compact workspace tabs share one row: "+JSON.stringify(layout.tabs));
        assert.ok(layout.hero.y>=layout.tabs[0].y+layout.tabs[0].height &&
          layout.hero.y-layout.tabs[0].y-layout.tabs[0].height<32,
          "player appears immediately below the six tabs: "+JSON.stringify(layout));
        assert.equal(await page.locator("[data-video-diagnostic-banner]").count(),0,
          "video editor must have no unsolicited diagnostic ribbon");
        assert.ok(layout.goals.length===5 && layout.goals.every((item,index)=>
          item.height>=44 && Math.abs(item.y-layout.goals[0].y)<4 &&
          (index===0||item.x>layout.goals[index-1].x+30)),
          "five real goal categories appear fully in one row: "+JSON.stringify(layout.goals));
        assert.ok(layout.goals[4].x+layout.goals[4].width<=layout.viewport+2,
          "all five compact goals must be fully visible without horizontal scrolling");
        assert.ok(layout.topics.every(item=>item.height>=44),
          "readable topic cards: "+JSON.stringify(layout.topics));
        assert.ok(layout.stories.length===4 &&
          layout.stories.every((item,index)=>item.width>=70&&item.height>=90 &&
            Math.abs(item.y-layout.stories[0].y)<4 &&
            (index===0||item.x>layout.stories[index-1].x+60)),
          "four licensed story cards form a horizontally browsable rail: "+JSON.stringify(layout.stories));
        assert.ok(layout.input && layout.input.height>=58 && layout.inputFont>=16,
          "iPhone native input: "+JSON.stringify(layout.input));
        assert.ok(layout.confirm?.height>=44,"readable next CTA "+JSON.stringify(layout.confirm));
        const check=page.locator("[data-video-practice-shortcuts]");
        await expect(check).toBeVisible();
        assert.equal(await check.locator("[data-video-practice-shortcut]").count(),3);
        assert.equal(await page.locator("[data-mandala-cinematic-canvas]").count(),1,
          "one native media stage");
        await goals.nth(1).click();
        await expect(goals.nth(1)).toHaveAttribute("aria-pressed","true");
        await root.locator("[data-auto-video-input]").fill(locale==="ru"
          ?"Хочу больше спокойствия":locale==="es"?"Quiero más calma":"I want to feel more calm");
        await expect(stories.first()).toBeVisible();
        await stories.nth(1).click();
        await expect(stories.nth(1)).toHaveAttribute("aria-pressed","true");
        if(locale==="ru" && [320,390,430].includes(width)){
          await page.screenshot({path:"artifacts/mandala-holistic-light/"+engine+"-"+locale+"-"+width+".png",
            fullPage:true,animations:"disabled",timeout:30000});
        }
        await root.locator("[data-auto-video-confirm]").click();
        await expect(root.locator('[data-video-quick-control="phrases"]'))
          .toHaveAttribute("aria-pressed","true",{timeout:18000});
        await root.locator('[data-video-quick-control="video"]').click();
        // Switching the workspace must not shift the shared preview below another intro.
        for(const tab of ["phrases","effects","practices","pro","editor","video"]){
          await root.locator('[data-video-quick-control="'+tab+'"]').click();
          const top=await page.evaluate(()=>{
            const nav=document.querySelector("[data-video-quick-controls]");
            const hero=document.querySelector("[data-video-mandala-hero]");
            const a=nav?.getBoundingClientRect(),b=hero?.getBoundingClientRect();
            return {tabBottom:a?.bottom,playerTop:b?.top,playerWidth:b?.width,
              playerHeight:b?.height,navHeight:a?.height};
          });
          assert.ok(top.navHeight>=44 && top.playerHeight>=140 &&
            top.playerTop>=top.tabBottom && top.playerTop-top.tabBottom<32,
            engine+"/"+locale+"/"+width+"/"+tab+" consistent top video: "+JSON.stringify(top));
        }
        await expect(root.locator('[data-video-practice-shortcut="meditation"]')).toBeVisible();
        // The source-backed shortcut must switch to the ONE existing course.
        await root.locator('[data-video-practice-shortcut="meditation"]').click();
        await expect(root.locator('[data-video-quick-control="practices"]'))
          .toHaveAttribute("aria-pressed","true",{timeout:18000});
        await expect(root.locator("[data-video-guided-course]")).toBeVisible();
        assert.equal(await page.locator("[data-mandala-cinematic-canvas]").count(),1);
        // Real mobile interactions: quick fifth vs professional sixth.
        await root.locator('[data-video-quick-control="editor"]').click();
        await expect(root.locator("[data-video-basic-editor]")).toBeVisible();
        assert.equal(await root.locator("[data-video-basic-tab]").count(),4);
        const styleCards=root.locator("[data-video-basic-style]");
        assert.ok(await styleCards.count()>=4,"source-backed MP4 style choices");
        await styleCards.nth(1).click();
        await expect(styleCards.nth(1)).toHaveAttribute("aria-pressed","true");
        await root.locator('[data-video-basic-tab="photo"]').click();
        await expect(root.locator("[data-video-cover-options]")).toBeVisible();
        await root.locator('[data-video-basic-tab="music"]').click();
        await expect(root.locator("[data-video-audio-section]")).toBeVisible();
        assert.equal(await root.locator("#video-audio").count(),1);
        await root.locator('[data-video-basic-tab="voice"]').click();
        await expect(root.locator("[data-video-voice-studio]")).toBeVisible();
        await root.locator('[data-video-basic-format="portrait"]').click();
        await expect(root.locator('[data-video-basic-format="portrait"]')).toHaveAttribute("aria-pressed","true");
        await root.locator('[data-video-basic-duration="30"]').click();
        await expect(root.locator('[data-video-basic-duration="30"]')).toHaveAttribute("aria-pressed","true");
        await root.locator('[data-video-quick-control="pro"]').click();
        await expect(root.locator("[data-video-stories-characters]")).toBeVisible();
        await expect(root.locator("[data-video-final-editor]")).toBeVisible();
        await expect(root.locator("[data-video-pro-advanced]")).toBeVisible();
        assert.equal(await page.locator("[data-mandala-cinematic-canvas]").count(),1);
        assert.deepEqual(writes,[],"preview and navigation make no external writes");
        assert.deepEqual(errors,[],"no uncaught page errors");
        report.push(engine+"/"+locale+"/"+width+" PASS");
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
console.log("Holistic Light real mobile browser acceptance\n"+report.join("\n"));