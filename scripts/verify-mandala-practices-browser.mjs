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
      await page.goto(base+"/"+locale+"/holistic-support/mandala#guided-video-series",{
        waitUntil:"domcontentloaded",timeout:70000,
      });
      await page.locator('[data-video-studio-hydrated="true"]').waitFor({state:"attached",timeout:35000});
      const studio=page.locator("[data-mandala-free-video]");
      const course=page.locator("[data-video-guided-course]");
      await course.waitFor({state:"visible",timeout:25000});
      // The six-tab Video Studio intentionally has no obsolete seventh
      // "practices" tab. The existing, public #guided-video-series deep link
      // is a real supported route to this same guided course.
      await expect(studio).toHaveAttribute("data-active-workspace","practices");
      await expect(studio).toHaveAttribute("data-video-studio-mode","therapy");
      await expect(page.locator("[data-video-quick-controls] button")).toHaveCount(6);
      await expect(page.locator('[data-video-quick-control="ready"]')).toHaveAttribute("aria-pressed","true");
      const generate=course.locator("[data-guided-generate-meditation]");
      assert.equal(await generate.isDisabled(),true,"state mode needs an explicit choice");
      assert.equal(await course.locator("[data-guided-focus-state]").count(),6,
        "six present-state choices are available");
      const state=course.locator('[data-guided-focus-state="calm"]');
      await state.click();
      assert.equal(await state.getAttribute("aria-pressed"),"true");
      await page.waitForFunction(()=>document.querySelector("[data-guided-generate-meditation]")?.disabled===false);
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
        // WebKit resolves a genuine pointer click before React paints a
        // committed selection on some locales. Require its real pressed state,
        // never a second synthetic click or a weakened assertion.
        const kind=kinds.nth(i);
        await kind.click();
        try{
          await expect(kind).toHaveAttribute("aria-pressed","true",{timeout:15000});
        }catch(error){
          const evidence=await kinds.evaluateAll(nodes=>nodes.map(node=>({
            kind:node.getAttribute("data-guided-practice-kind"),
            pressed:node.getAttribute("aria-pressed"),
            disabled:node.disabled,
          })));
          throw new Error("GUIDED_KIND_DID_NOT_COMMIT "+engine+" "+locale+
            " index="+i+" "+JSON.stringify(evidence),{cause:error});
        }
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
      try{
        await page.waitForFunction(()=>{
          const skip=document.querySelector("[data-guided-skip-meditation]");
          const audio=document.querySelector("[data-video-therapy-meditation-audio]");
          return skip?.getAttribute("aria-pressed")==="true" && audio?.open===false;
        },null,{timeout:15000});
      }catch(error){
        // Evidence only: do not soften the real WebKit fail-closed acceptance.
        // Read no narration, private goal, DOM input values or client content.
        const state=await page.evaluate(()=>{
          const skip=document.querySelector("[data-guided-skip-meditation]");
          const audio=document.querySelector("[data-video-therapy-meditation-audio]");
          return {skipPresent:!!skip,skipPressed:skip?.getAttribute("aria-pressed")??null,
            audioPresent:!!audio,audioOpen:audio?.open??null,
            coursePresent:!!document.querySelector("[data-video-guided-course]")};
        }).catch(()=>({browserStateUnavailable:true}));
        console.error("GUIDED_SKIP_WEBKIT_STATE",JSON.stringify({locale,engine,...state}));
        throw error;
      }
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
      // The details element opens synchronously, but React may still be
      // committing the preceding user action on headed iPhone WebKit.
      // Wait for the REAL rendered step state, never a timer or a second click.
      await expect(course).toHaveAttribute("data-guided-personal-opened","true",{timeout:15000});

      await course.locator("[data-guided-create-plan]").click();
      const programme=course.locator("[data-guided-eight-sessions]");
      try{
        await programme.waitFor({state:"visible"});
      }catch(error){
        // Never mask a missing programme: diagnose the real WebKit UI state
        // before failing, so a second click or weakened gate is unnecessary.
        const snapshot=await page.evaluate(()=>{
          const root=document.querySelector("[data-video-guided-course]");
          const q=(selector)=>root?.querySelector(selector);
          return {
            courseMounted:Boolean(root),
            courseVisible:Boolean(root?.getClientRects().length),
            programmePresent:Boolean(q("[data-guided-eight-sessions]")),
            planOpen:q("[data-guided-plan-open]")?.getAttribute("data-guided-plan-open")??null,
            programmeCurrent:q("[data-guided-programme-current]")?.getAttribute("data-guided-programme-current")??null,
            focusReady:q("[data-guided-focus-ready]")?.getAttribute("data-guided-focus-ready")??null,
            profileStatus:q("[data-guided-profile-status]")?.getAttribute("data-guided-profile-status")??null,
            createButtonDisabled:q("[data-guided-create-plan]")?.disabled??null,
            selectedState:q('[data-guided-focus-state][aria-pressed="true"]')?.getAttribute("data-guided-focus-state")??null,
            selectedVector:q('[data-guided-focus-vector][aria-pressed="true"]')?.getAttribute("data-guided-focus-vector")??null,
            journeyStep:q('[role="progressbar"]')?.getAttribute("aria-valuenow")??null,
            personalOpened:root?.getAttribute("data-guided-personal-opened")??null,
            planRequested:root?.getAttribute("data-guided-plan-requested")??null,
            planCurrent:root?.getAttribute("data-guided-plan-current")??null,
            planOpen:root?.getAttribute("data-guided-plan-open")??null,
            planClickCount:root?.getAttribute("data-guided-plan-click-count")??null,
            planSignatureMatch:root?.getAttribute("data-guided-plan-signature-match")??null,
            programmeReady:root?.getAttribute("data-guided-programme-ready")??null,
            meditationPresent:Boolean(q("[data-guided-meditation-result]")),
            pagePath:location.pathname,
          };
        });
        throw new Error(engine+" "+locale+" "+width+"px programme missing after one click: "+JSON.stringify({...snapshot,pageErrors:pageErrors.slice(-5)}),{cause:error});
      }
      assert.equal(await programme.locator("[data-guided-session]").count(),8);
      assert.equal(await programme.locator("[data-guided-free-video]").count(),1);
      // Messenger-only website policy: the course has one enquiry entrypoint,
      // but personal contact details are not collected in this page. A visitor
      // chooses a channel and explicitly presses Send inside that messenger.
      const enquiry=programme.locator("[data-meditation-course-enquiry]");
      assert.equal(await enquiry.count(),1,"one course enquiry entrypoint");
      assert.equal(await enquiry.locator("[data-messenger-only-contact]").count(),1,
        "mandatory messenger policy is applied to the course enquiry");
      assert.equal(await enquiry.locator("[data-meditation-course-contact]").count(),0,
        "course enquiry never renders a direct personal-data form under messenger-only policy");
      assert.equal(await enquiry.locator("input").count(),0,
        "no email, phone or consent fields are collected on this page");
      const channelDisclosure=enquiry.locator("[data-messenger-only-contact] details");
      assert.equal(await channelDisclosure.count(),1,"one collapsed messenger choice");
      await channelDisclosure.locator(":scope > summary").click();
      const whatsapp=enquiry.locator('[data-messenger-only-channel="whatsapp"]');
      const telegram=enquiry.locator('[data-messenger-only-channel="telegram"]');
      await expect(whatsapp).toBeVisible();
      await expect(telegram).toBeVisible();
      const destinations=await enquiry.locator("a[data-messenger-only-channel]").evaluateAll(links=>
        links.map(link=>({channel:link.getAttribute("data-messenger-only-channel"),
          href:link.getAttribute("href"),target:link.getAttribute("target")})));
      assert.deepEqual(destinations.map(item=>item.channel).sort(),["telegram","whatsapp"]);
      assert.ok(destinations.every(item=>item.href?.startsWith("https://")&&item.target==="_blank"),
        "both channels use secure external links and a separate messenger context");
      const disclosureNote=await enquiry.locator("[data-messenger-only-contact] p").last().innerText();
      assert.match(disclosureNote,/Press Send inside the messenger|Нажмите «Отправить» в самом мессенджере|Pulsa Enviar dentro de la aplicación/,
        "opening a messenger is not treated as a submitted enquiry");
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
      assert.equal(await course.locator("[data-guided-focus-vector]").count(),6,
        "six development directions are available");
      await course.locator('[data-guided-focus-vector="goals"]').click();
      // A WebKit click can resolve before React commits the selected direction.
      // Wait for the actual accessible selection and enabled action, without
      // a second click, sleep, or bypass of the real safety/validation gate.
      await page.waitForFunction(()=>{
        const course=document.querySelector("[data-video-guided-course]");
        return course?.querySelector('[data-guided-focus-vector="goals"][aria-pressed="true"]') &&
          course.getAttribute("data-guided-focus-ready")==="true" &&
          course.querySelector("[data-guided-generate-meditation]")?.disabled===false;
      },null,{timeout:15000});
      assert.equal(await generate.isEnabled(),true,
        "selected direction alone is enough; the context note is optional");
      await course.locator("[data-video-key-difficulty]").fill("I feel rushed");
      // In headed iOS/WebKit the DOM value may update before React's controlled
      // textarea onChange commits. The Generate button was already enabled by
      // the selected vector, so waiting for !disabled could click against a
      // stale focus signature. Assert the real React render has consumed the
      // synthetic text before clicking; no sleep or second-click workaround.
      await page.waitForFunction(expectedLength=>{
        const action=document.querySelector("[data-guided-generate-meditation]");
        const input=document.querySelector("[data-video-key-difficulty]");
        return action?.getAttribute("data-guided-context-committed-length")===String(expectedLength) &&
          input?.value==="I feel rushed" && action?.disabled===false;
      },"I feel rushed".length,{timeout:15000});
      assert.equal(await course.locator("[data-video-key-goal]").count(),0,
        "vector choice replaces the former second blank text area");
      assert.equal(await course.locator("[data-guided-eight-sessions]").count(),0,
        "switching from state invalidates previous eight-session outline");
      await generate.click();
      try{
        await page.waitForFunction(()=>document.querySelector("[data-video-guided-course]")
          ?.getAttribute("data-guided-meditation-ready")==="true",null,{timeout:15000});
        await result.waitFor({state:"visible",timeout:15000});
      }catch(error){
        const state=await course.evaluate(el=>({
          mode:el.querySelector('[data-video-therapy-focus] button[aria-pressed="true"]')?.textContent?.trim(),
          difficulty:el.querySelector('[data-video-key-difficulty]')?.value,
          goal:el.querySelector('[data-guided-focus-vector][aria-pressed="true"]')?.textContent?.trim(),
          disabled:el.querySelector('[data-guided-generate-meditation]')?.disabled,
          note:el.querySelector('[role="alert"],[role="note"]')?.textContent?.trim(),
          resultCount:el.querySelectorAll('[data-guided-meditation-result]').length,
          focusReady:el.getAttribute('data-guided-focus-ready'),
          hasScript:el.getAttribute('data-guided-has-script'),
          meditationOpen:el.getAttribute('data-guided-meditation-open'),
          meditationClickCount:el.getAttribute('data-guided-meditation-click-count'),
          focusResetCount:el.getAttribute('data-guided-focus-reset-count'),
          signatureMatch:el.getAttribute('data-guided-signature-match'),
          meditationReady:el.getAttribute('data-guided-meditation-ready'),
          committedLength:el.querySelector('[data-guided-generate-meditation]')?.getAttribute('data-guided-context-committed-length'),
        }));
        throw new Error(engine+" "+locale+" "+width+" vector generated result missing: "+JSON.stringify({...state,pageErrors:pageErrors.slice(-5)}),{cause:error});
      }
      await course.locator("[data-guided-create-plan]").click();
      await programme.waitFor({state:"visible"});
      await course.locator('[data-guided-focus-vector="relationships"]').click();
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
