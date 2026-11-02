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
      // Headed WebKit can throttle requestAnimationFrame. Check the *real*
      // clickable control via Playwright's protocol-backed enabled assertion.
      try {
        await expect(generate).toBeEnabled({timeout:20000});
      } catch(error) {
        const details=await course.evaluate(el=>({
          selectedState:el.querySelector('[data-guided-focus-state][aria-pressed="true"]')?.getAttribute('data-guided-focus-state'),
          mode:el.querySelector('[data-video-therapy-focus] button[aria-pressed="true"]')?.textContent?.trim(),
          disabled:el.querySelector('[data-guided-generate-meditation]')?.disabled,
          note:el.querySelector('[role="alert"],[role="note"]')?.textContent?.trim(),
          resultCount:el.querySelectorAll('[data-guided-meditation-result]').length,
        }));
        throw new Error(engine+" "+locale+" "+width+" state Generate unavailable "+JSON.stringify(details),{cause:error});
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
      // WebKit may resolve the DOM click before React commits the reversible
      // omission. Wait for both verified effects, never a timed sleep.
      await page.waitForFunction(()=>{
        const skip=document.querySelector("[data-guided-skip-meditation]");
        const audio=document.querySelector("[data-video-therapy-meditation-audio]");
        return skip?.getAttribute("aria-pressed")==="true" && audio?.open===false;
      },null,{timeout:15000});
      assert.equal(await result.locator("[data-guided-skip-meditation]").getAttribute("aria-pressed"),"true");
      // Revoke the seeded narration completely before a visitor reopens the
      // existing details. A rapid re-open must not race React's seed cleanup.
      await page.waitForFunction(()=>
        !document.querySelector("[data-video-therapy-meditation-audio] [data-meditation-script]"),
        null,{timeout:15000});
      // Reopen through the real Personal Meditation CTA in step 03, using
      // the approved visible button instead of a tiny native details summary.
      // This verifies the one existing editor is usable after the skip.
      await course.locator("[data-guided-open-personal-meditation]").click();
      await page.waitForFunction(()=>
        document.querySelector("[data-video-therapy-meditation-audio]")?.open===true,
        null,{timeout:15000});
      assert.equal(await voice.locator("[data-meditation-script]").count(),0,
        "skipped narration stays absent after the Personal Meditation CTA reopens editor");

      await course.locator("[data-guided-create-plan]").click();
      const programme=course.locator("[data-guided-eight-sessions]");
      await programme.waitFor({state:"visible"});
      assert.equal(await programme.locator("[data-guided-session]").count(),8);
      assert.equal(await programme.locator("[data-guided-free-video]").count(),1);
      const enquiry=programme.locator("[data-meditation-course-order]");
      assert.equal(await enquiry.count(),1,"one consented course enquiry");
      await enquiry.click();
      const form=programme.locator("[data-meditation-course-contact]");
      await form.waitFor({state:"visible"});
      assert.equal(await form.locator("[data-meditation-course-submit]").isDisabled(),true,
        "one-off reply consent gates the real course enquiry");
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
      // Confirm actual React state following the WebKit click, never infer
      // success from a sleep, missing control, or a stale aria attribute.
      await page.waitForFunction(()=>
        document.querySelector('[data-video-therapy-focus] [role="group"] button:nth-child(2)')
          ?.getAttribute("aria-pressed")==="true",
        null,{timeout:15000});
      assert.equal(await modes.nth(1).getAttribute("aria-pressed"),"true");
      await course.locator("[data-video-key-difficulty]").fill("I feel rushed");
      assert.equal(await generate.isDisabled(),true,"vector requires both fields");
      await course.locator("[data-video-key-goal]").fill("I would like to feel steady");
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
