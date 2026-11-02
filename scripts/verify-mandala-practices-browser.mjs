/**
 * True guest UI workflow for the owner's approved Courses & Practices page.
 * Local-only Chromium / WebKit: synthetic goal text, no auth or paid media.
 * The first film may be prepared, but video rendering is never triggered here.
 * This is complementary to the separate real encoded-media browser suite.
 */
import assert from "node:assert/strict";
import {expect} from "@playwright/test";
import {mkdirSync} from "node:fs";
import {join} from "node:path";

export async function verifyGuidedPractices({browser,base,engine}){
  const trustedOrigin=new URL(base).origin;
  for(const [locale,width] of [["ru",320],["en",390],["es",430]]){
    const context=await browser.newContext({
      viewport:{width,height:844},serviceWorkers:"block",acceptDownloads:true,
    });
    context.setDefaultTimeout(20000);
    context.setDefaultNavigationTimeout(70000);
    try{
      const page=await context.newPage(), writes=[],pageErrors=[];
      page.on("pageerror",error=>pageErrors.push(error.message));
      await page.route("**/*",route=>{
        const request=route.request(),url=new URL(request.url());
        if(!["GET","HEAD"].includes(request.method())){
          writes.push(request.method()+" "+url.pathname);
          return route.abort();
        }
        if(url.origin!==trustedOrigin)return route.abort();
        return route.continue();
      });
      await page.goto(base+"/"+locale+"/holistic-support/mandala",{
        waitUntil:"domcontentloaded",timeout:70000,
      });
      await page.locator('[data-video-studio-hydrated="true"]').waitFor({state:"attached",timeout:35000});
      await page.locator('[data-video-quick-control="practices"]').click();
      const course=page.locator("[data-video-guided-course]");
      await course.waitFor({state:"visible",timeout:25000});
      assert.equal(await page.locator('[data-video-quick-control="practices"]').getAttribute("aria-pressed"),"true");
      const generate=course.locator("[data-guided-generate-meditation]");
      assert.equal(await generate.isDisabled(),true,"state mode needs an explicit choice");
      const state=course.locator('[data-guided-focus-state="calm"]');
      await state.click();
      assert.equal(await state.getAttribute("aria-pressed"),"true");
      // Playwright's default page.waitForFunction polls on requestAnimationFrame.
      // Headed macOS WebKit may throttle rAF despite a hydrated and interactive
      // document; poll the SAME live button's enabled state over the protocol.
      // Never bypass a disabled real action or turn this into a time-based sleep.
      try{
        await expect(generate).toBeEnabled({timeout:20000});
      }catch(error){
        const state=await course.evaluate(el=>({
          focusMode:el.querySelector('[data-video-therapy-focus] button[aria-pressed="true"]')?.textContent?.trim(),
          selectedState:el.querySelector('[data-guided-focus-state][aria-pressed="true"]')?.getAttribute("data-guided-focus-state"),
          generateDisabled:el.querySelector('[data-guided-generate-meditation]')?.disabled,
          visibleNote:el.querySelector('[role="alert"],[role="note"]')?.textContent?.trim(),
          meditationResultCount:el.querySelectorAll('[data-guided-meditation-result]').length,
        }));
        throw new Error(engine+" "+locale+" "+width+" state meditation could not enable: "+JSON.stringify(state),{cause:error});
      }
      await generate.click();
      const result=course.locator("[data-guided-meditation-result]");
      await result.waitFor({state:"visible"});
      const script=await result.locator(":scope > div").first().innerText();
      assert.ok(script.length>100,engine+" "+locale+" generated substantive local text");

      const practice=course.locator("[data-guided-practice-step]");
      await practice.waitFor({state:"visible"});
      const kinds=practice.locator('[role="group"] button');
      assert.equal(await kinds.count(),3,"one selectable ritual / exercise / practice row");
      const titles=[];
      for(let i=0;i<3;i++){
        await kinds.nth(i).click();
        assert.equal(await kinds.nth(i).getAttribute("aria-pressed"),"true");
        titles.push(await practice.locator("h5").innerText());
      }
      assert.equal(new Set(titles).size,3,"all three choices produce genuinely different practices");
      await practice.locator("button").last().click();
      assert.notEqual(await practice.locator("h5").innerText(),titles[2],"refresh changes the method");

      await result.locator("[data-guided-add-meditation]").click();
      const voice=page.locator("[data-video-therapy-meditation-audio]");
      await page.waitForFunction(()=>document.querySelector("[data-video-therapy-meditation-audio]")?.open===true);
      await voice.locator("[data-meditation-script]").waitFor({state:"attached"});
      const seeded=await voice.locator("[data-meditation-script]").inputValue();
      assert.equal(seeded.trim(),script.trim(),"approved original script reaches the existing narration editor");
      await result.locator("[data-guided-skip-meditation]").click();
      assert.equal(await result.locator("[data-guided-skip-meditation]").getAttribute("aria-pressed"),"true");
      await page.waitForFunction(()=>document.querySelector("[data-video-therapy-meditation-audio]")?.open===false);
      await voice.locator(":scope > summary").click();
      await page.waitForFunction(()=>document.querySelector("[data-video-therapy-meditation-audio]")?.open===true);
      await page.waitForFunction(()=>!document.querySelector("[data-video-therapy-meditation-audio] [data-meditation-script]"));

      await course.locator("[data-guided-create-plan]").click();
      const programme=course.locator("[data-guided-eight-sessions]");
      await programme.waitFor({state:"visible"});
      assert.equal(await programme.locator("[data-guided-session]").count(),8);
      assert.equal(await programme.locator("[data-guided-free-video]").count(),1);
      assert.ok((await programme.locator("a").last().getAttribute("href")||"").includes("/services/imagery-therapy"),
        "enquiry opens existing course request route without initiating payment");
      const geometry=await course.evaluate((el)=>{
        const rect=el.getBoundingClientRect();
        const selectors=["[data-guided-create-plan]","[data-guided-generate-meditation]","[data-guided-skip-meditation]"];
        return {right:rect.right,left:rect.left,overflow:el.scrollWidth-el.clientWidth,
          hits:selectors.map(sel=>el.querySelector(sel)?.getBoundingClientRect().height||0)};
      });
      assert.ok(geometry.left>=-3&&geometry.right<=width+3,engine+" "+locale+" course fits "+width+"px viewport");
      assert.ok(geometry.overflow<=3,engine+" "+locale+" has no horizontal overflow");
      assert.ok(geometry.hits.every(height=>height>=44),engine+" "+locale+" buttons have >=44px hit targets");
      const screenshotDir=process.env.HH_HYPNO_SCREENSHOT_DIR;
      if(screenshotDir){
        mkdirSync(screenshotDir,{recursive:true});
        await course.screenshot({path:join(screenshotDir,"practices-"+engine+"-"+locale+"-"+width+".png"),
          animations:"disabled",timeout:30000});
      }

      const modes=course.locator('[data-video-therapy-focus] [role="group"]').first().locator("button");
      await modes.nth(1).click();
      assert.equal(await modes.nth(1).getAttribute("aria-pressed"),"true");
      await course.locator("[data-video-key-difficulty]").fill("I feel rushed");
      assert.equal(await generate.isDisabled(),true,"vector requires both fields");
      await course.locator("[data-video-key-goal]").fill("I would like to feel steady");
      // Keep the second, vector-mode enabled gate equally real and WebKit-safe.
      await expect(generate).toBeEnabled({timeout:20000});
      assert.equal(await course.locator("[data-guided-eight-sessions]").count(),0,
        "switching from state invalidates previous eight-session outline");
      await generate.click();
      try{
        await result.waitFor({state:"visible",timeout:15000});
      }catch(error){
        const state=await course.evaluate(el=>({
          mode:el.querySelector('[data-video-therapy-focus] button[aria-pressed="true"]')?.textContent?.trim(),
          difficulty:el.querySelector('[data-video-key-difficulty]')?.value,
          goal:el.querySelector('[data-video-key-goal]')?.value,
          disabled:el.querySelector('[data-guided-generate-meditation]')?.disabled,
          note:el.querySelector('[role="alert"],[role="note"]')?.textContent?.trim(),
          resultCount:el.querySelectorAll('[data-guided-meditation-result]').length,
        }));
        throw new Error(engine+" "+locale+" "+width+" vector generated result missing: "+JSON.stringify(state),{cause:error});
      }
      await course.locator("[data-guided-create-plan]").click();
      await programme.waitFor({state:"visible"});
      await course.locator("[data-video-key-goal]").fill("I want a calmer choice");
      assert.equal(await course.locator("[data-guided-meditation-result]").count(),0,
        "editing a vector invalidates the previous meditation");
      assert.equal(await course.locator("[data-guided-eight-sessions]").count(),0,
        "editing a vector invalidates the previous programme");
      assert.deepEqual(writes,[],"planning and preview must not send data or trigger a render");
      assert.deepEqual(pageErrors,[],"guest workflow must not throw browser errors");
      console.log("PASS guided-practices "+engine+" "+locale+" "+width+"px focus, script, 3 kinds, reversible voice, 8 sessions, privacy");
    }finally{
      await context.close();
    }
  }
}
