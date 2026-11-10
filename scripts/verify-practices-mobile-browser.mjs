/**
 * Mobile-first public Courses & Practices browser acceptance.
 * Real Chromium/WebKit hydration, buttons, state/vector and script handoff.
 * Uses synthetic topics only. No account writes, render, provider or billing.
 */
import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium,webkit,expect} from "@playwright/test";

const BASE=(process.env.HH_TEST_PUBLIC_ORIGIN||"http://127.0.0.1:3100").replace(/\/$/,"");
const ORIGIN=new URL(BASE).origin;
const CONSENT_ONLY=process.env.HH_PRACTICES_CONSENT_ONLY==="1";
const ENGINE=process.env.HH_PRACTICES_BROWSER_ENGINE||"all";
const CASES=CONSENT_ONLY?[["ru",320]]:[["ru",320],["ru",390],["ru",430],["en",390],["es",390]];
if(!["all","chromium","webkit"].includes(ENGINE))throw Error("UNKNOWN_PRACTICES_BROWSER_ENGINE");
const LABELS={
  ru:{vector:"Вектор развития",vectorGoal:"Энергия",difficulty:"Трудно расслабиться вечером"},
  en:{vector:"Development direction",vectorGoal:"Energy",difficulty:"Hard to unwind after work"},
  es:{vector:"Dirección de desarrollo",vectorGoal:"Energía",difficulty:"Me cuesta descansar"}
};
mkdirSync("artifacts/practices-mobile",{recursive:true});

for(const [engine,browserType] of [["chromium",chromium],["webkit",webkit]].filter(([name])=>ENGINE==="all"||ENGINE===name)){
  const browser=await browserType.launch({headless:true});
  try{
    for(const [locale,width] of CASES){
      const context=await browser.newContext({
        viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:"block",
      });
      context.setDefaultTimeout(18000);
      context.setDefaultNavigationTimeout(90000);
      try{
        const page=await context.newPage(),writes=[],errors=[];
        page.on("pageerror",err=>errors.push(err.message));
        await page.route("**/*",route=>{
          const request=route.request(),url=new URL(request.url());
          if(!["GET","HEAD"].includes(request.method())){
            writes.push(request.method()+" "+url.pathname);
            return route.abort();
          }
          return url.origin===ORIGIN?route.continue():route.abort();
        });
        await page.goto(BASE+"/"+locale+"/holistic-support/mandala#guided-video-series",{
          waitUntil:"domcontentloaded",timeout:90000
        });
        const studio=page.locator("[data-mandala-free-video]");
        const course=page.locator("[data-video-guided-course]");
        await course.waitFor({state:"visible",timeout:50000});
        assert.equal(await studio.getAttribute("data-active-workspace"),"practices",
          "deep link must activate the existing Practices workspace");
        assert.equal(await studio.getAttribute("data-video-studio-mode"),"therapy");
        assert.equal(await page.locator('[data-video-quick-controls] button').count(),6,
          "the current six workspaces are visible without fabricating an obsolete Course tab");
        assert.equal(await page.locator('[data-video-quick-control="ready"]').getAttribute("aria-pressed"),"true",
          "Ready is the visible tab alias while the existing guided course is active");
        const primary=course.locator("[data-guided-generate-meditation]");
        const programmeButton=course.locator("[data-guided-create-plan]");
        assert.equal(await primary.isDisabled(),true,"require an explicit focus");
        assert.equal(await programmeButton.isDisabled(),true);
        assert.equal(await course.locator("[data-guided-focus-state]").count(),6,
          "state mode must present six large choice cards");
        const state=course.locator('[data-guided-focus-state="calm"]');
        await state.click();
        assert.equal(await state.getAttribute("aria-pressed"),"true");
        assert.equal(await primary.isEnabled(),true);
        await primary.click();
        const result=course.locator("[data-guided-meditation-result]");
        await result.waitFor({state:"visible"});
        const personal=course.locator("[data-guided-personal-meditation-step]");
        assert.equal(await personal.count(),1,"personal meditation reuses one existing editor");
        await personal.locator("[data-guided-open-personal-meditation]").click();
        const existingEditor=page.locator("[data-video-therapy-meditation-audio]");
        assert.equal(await existingEditor.getAttribute("open"),"",
          "personal meditation CTA opens the existing editor");
        await existingEditor.evaluate(el=>{el.open=false;});
        const practice=course.locator("[data-guided-practice-step]");
        await practice.waitFor({state:"visible"});
        const moments=practice.locator("[data-guided-ritual-moment]");
        assert.equal(await moments.count(),4,"four ritual moment cards");
        await practice.locator('[data-guided-ritual-moment="evening"]').click();
        assert.equal(await practice.locator('[data-guided-ritual-moment="evening"]').getAttribute("aria-pressed"),"true");
        await practice.locator("[data-guided-create-ritual]").click();
        assert.ok((await practice.locator("ol").innerText()).length>20,
          "ritual button shows generated meaningful steps");
        const kinds=practice.locator('[role="group"] button');
        assert.equal(await kinds.count(),3);
        const names=[];
        for(let i=0;i<3;i++){
          await kinds.nth(i).click();
          assert.equal(await kinds.nth(i).getAttribute("aria-pressed"),"true");
          names.push(await practice.locator("h5").innerText());
        }
        assert.equal(new Set(names).size,3,"ritual, exercise and practice need distinct real content");
        const prior=await practice.locator("ol").innerText();
        await practice.locator("button").last().click();
        assert.notEqual(await practice.locator("ol").innerText(),prior,"changing variant must update practice");
        await course.locator("[data-guided-add-meditation]").click();
        const audio=page.locator("[data-video-therapy-meditation-audio]");
        await audio.locator("[data-meditation-script]").waitFor({state:"visible",timeout:20000});
        const seeded=await audio.locator("[data-meditation-script]").inputValue();
        assert.ok(seeded.length>100,"actual generated text transferred to existing editor");
        const skipButton=course.locator("[data-guided-skip-meditation]");
        await skipButton.click();
        // WebKit may suspend requestAnimationFrame polling in backgrounded
        // windows. Assert BOTH actual user-visible states independently using
        // Playwright's native locator polling, then the native details.open
        // property through a Node-side expect.poll (not browser RAF).
        // Neither outcome is assumed, forced, retried or written by this test.
        try {
          await expect(skipButton).toHaveAttribute("aria-pressed","true",{timeout:15000});
          await expect(audio).not.toHaveAttribute("open","",{timeout:15000});
          await expect.poll(
            ()=>audio.evaluate(node=>node instanceof HTMLDetailsElement ? node.open : null),
            {timeout:15000,message:"opt-out must close the real narration details"}
          ).toBe(false);
        } catch(error) {
          // Synthetic-only state diagnostics, no private script or contact data.
          const observed=await page.evaluate(()=>({
            skipped:document.querySelector("[data-guided-skip-meditation]")?.getAttribute("aria-pressed"),
            detailsOpen:document.querySelector("[data-video-therapy-meditation-audio]")?.open,
            detailElement:document.querySelector("[data-video-therapy-meditation-audio]")?.tagName,
          }));
          throw new Error("Real meditation opt-out did not fully commit: "+JSON.stringify(observed),{cause:error});
        }
        assert.equal(await audio.getAttribute("open"),null,"skip closes the existing audio editor");
        assert.equal(await skipButton.getAttribute("aria-pressed"),"true");
        await programmeButton.click();
        assert.equal(await course.locator("[data-guided-session]").count(),8);
        assert.equal(await course.locator("[data-guided-free-video]").count(),1);
        const messengerOnly=course.locator("[data-messenger-only-contact]");
        const order=course.locator("[data-meditation-course-order]");
        const form=course.locator("[data-meditation-course-contact]");
        const send=form.locator("[data-meditation-course-submit]");
        const consentBox=form.locator('input[name="contactConsent"][type="checkbox"]');
        if(await messengerOnly.count()===1){
          // In messenger-only mode the product deliberately does NOT create a
          // direct CRM form or treat a link open as a submitted lead. The
          // handoff is collapsed by default; open it with one real visitor click.
          assert.equal(await course.locator("[data-meditation-course-order]").count(),0);
          assert.equal(await form.count(),0);
          const disclosure=messengerOnly.locator("details");
          assert.equal(await disclosure.count(),1);
          await disclosure.locator("summary").click();
          const whatsapp=messengerOnly.locator('[data-messenger-only-channel="whatsapp"]');
          const telegram=messengerOnly.locator('[data-messenger-only-channel="telegram"]');
          await expect(whatsapp).toBeVisible();
          await expect(telegram).toBeVisible();
          const note=(await messengerOnly.innerText()).toLowerCase();
          assert.ok(/opening a link|открытие ссылки|abrir el enlace/.test(note),
            "messenger handoff must explain that opening a link is not a submitted enquiry");
          assert.ok(/send|отправ|enviar/.test(note),
            "visitor must explicitly send the message inside the messenger");
        }else{
          assert.equal(await order.count(),1,"eight-session offer uses one real CRM form when messenger-only mode is off");
          await order.click();
        try{
          // A completed Playwright click alone does not prove React committed
          // the form. Verify the real button state and its visible consent form.
          await expect(order).toHaveAttribute("aria-expanded","true",{timeout:8000});
          await form.waitFor({state:"visible",timeout:12000});
        }catch(error){
          const diagnostic=await page.evaluate(()=>{
            const course=document.querySelector("[data-video-guided-course]");
            const button=course?.querySelector("[data-meditation-course-order]");
            const form=course?.querySelector("[data-meditation-course-contact]");
            const rect=button?.getBoundingClientRect();
            const hit=rect?document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2):null;
            return {planCurrent:course?.getAttribute("data-guided-plan-current"),
              programmeSignature:course?.getAttribute("data-guided-programme-signature-match"),
              planClicks:course?.getAttribute("data-guided-plan-click-count"),
              buttonCount:course?.querySelectorAll("[data-meditation-course-order]").length??0,
              expanded:button?.getAttribute("aria-expanded")??null,
              formCount:course?.querySelectorAll("[data-meditation-course-contact]").length??0,
              formVisible:Boolean(form&&form.getBoundingClientRect().height>0),
              hitTag:hit?.tagName??null,hitDock:Boolean(hit?.closest(".mobile-bottom-navigation,[data-hh-unified-dock]")),
              viewportWidth:innerWidth};
          });
          throw new Error(engine+" "+locale+" "+width+"px course form not opened by one genuine click: "+
            JSON.stringify(diagnostic),{cause:error});
        }
        assert.equal(await send.isDisabled(),true,"one-off reply consent is not prechecked");
        await form.locator('input[type="email"]').fill("synthetic@example.invalid");
        assert.equal(await send.isDisabled(),true);
        // A real mobile visitor taps the full accessible consent label, not
        // an 18px box under the fixed iPhone dock. No force/check JS bypass.
        const consentLabel=form.locator("[data-meditation-course-consent] label");
        assert.equal(await consentLabel.count(),1,"one genuine opt-in label");
        // Diagnostics record only trusted-event types, geometry and element identities;
        // never capture contact values or replace/retry the real user click.
        await page.evaluate(()=>{
          const events=[];
          const describe=node=>node instanceof Element?{tag:node.tagName,id:node.id||null,
            consent:Boolean(node.closest("[data-meditation-course-consent]")),
            dock:Boolean(node.closest(".mobile-bottom-navigation,[data-hh-unified-dock]"))}:null;
          const record=event=>{if(events.length<24)events.push({type:event.type,trusted:event.isTrusted,
            phase:event.eventPhase,target:describe(event.target),defaultPrevented:event.defaultPrevented});};
          for(const type of ["pointerdown","pointerup","click","change"])document.addEventListener(type,record,true);
          window.__hhConsentClickDiagnostic={events,record};
        });
        try{
          await consentLabel.click();
          // Await the actual checkbox AND submit state; no forced click or retry.
          await expect(consentBox).toBeChecked({timeout:12000});
          await expect(send).toBeEnabled({timeout:12000});
        }catch(error){
          const diagnostic=await page.evaluate(()=>{
            const state=window.__hhConsentClickDiagnostic;
            const label=document.querySelector("[data-meditation-course-contact] [data-meditation-course-consent] label");
            const rect=label?.getBoundingClientRect();
            const hit=rect?document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2):null;
            return {events:state?.events||[],label:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,
              hit:hit?{tag:hit.tagName,id:hit.id||null,consent:Boolean(hit.closest("[data-meditation-course-consent]")),
                dock:Boolean(hit.closest(".mobile-bottom-navigation,[data-hh-unified-dock]"))}:null,
              viewport:{width:innerWidth,height:innerHeight,scrollY}};
          });
          throw new Error(engine+" "+locale+" "+width+"px one-click consent failed: "+JSON.stringify(diagnostic),{cause:error});
        }finally{
          await page.evaluate(()=>{
            const state=window.__hhConsentClickDiagnostic;
            if(state)for(const type of ["pointerdown","pointerup","click","change"])document.removeEventListener(type,state.record,true);
            delete window.__hhConsentClickDiagnostic;
          });
        }
        if(locale==="ru"&&width===320){
          // Preserve keyboard access and reproduce Safari's focus-loss scroll:
          // move the viewport between real pointerdown and pointerup. The
          // same label must receive the one trusted click; no retry or force.
          await consentBox.focus();
          await consentBox.press("Space");
          await expect(consentBox).not.toBeChecked();
          await expect(send).toBeDisabled();
          await consentLabel.evaluate(label=>{
            label.addEventListener("pointerdown",()=>{
              const before=window.scrollY;
              window.scrollTo({top:Math.max(0,before-120),behavior:"instant"});
              window.__hhConsentScrollCheck={before,after:window.scrollY};
            },{once:true});
          });
          await consentLabel.click();
          await expect(consentBox).toBeChecked({timeout:12000});
          const scroll=await page.evaluate(()=>window.__hhConsentScrollCheck);
          assert.ok(scroll&&scroll.before-scroll.after>=50,"the test must actually move the viewport during the tap");
          await consentBox.focus();
          await consentBox.press("Space");
          await expect(consentBox).not.toBeChecked();
          await consentLabel.tap();
          await expect(consentBox).toBeChecked({timeout:12000});
        }
        assert.equal(await consentBox.isChecked(),true,
          "label tap must actually update the user-controlled consent");
        assert.equal(await send.isEnabled(),true,"explicit consent enables the real request");
        // Deliberately do not submit: no database test account, lead or external delivery.
        }
        await course.screenshot({
          path:"artifacts/practices-mobile/"+engine+"-"+locale+"-"+width+".png",
          animations:"disabled",timeout:30000
        });
        if(CONSENT_ONLY){
          console.log("PRACTICES_MOBILE_CONSENT_PASS "+engine+" "+locale+" "+width);
          continue;
        }
        const geometry=await course.evaluate(el=>({
          client:el.clientWidth,scroll:el.scrollWidth,
          buttons:[...el.querySelectorAll('[data-guided-generate-meditation],[data-guided-create-plan],[data-guided-add-meditation],[data-guided-skip-meditation]')]
            .map(b=>Math.round(b.getBoundingClientRect().height))
        }));
        assert.ok(geometry.scroll<=geometry.client+3,
          "course must fit "+width+"px without horizontal clipping: "+JSON.stringify(geometry));
        assert.ok(geometry.buttons.every(v=>v>=44),
          "main mobile tap targets >=44px: "+JSON.stringify(geometry));
        const vector=course.getByRole("button",{name:LABELS[locale].vector,exact:true});
        await vector.click();
        assert.equal(await course.locator("[data-guided-focus-vector]").count(),6,
          "vector mode must present six direction cards, not two empty fields");
        const vectorChoice=course.locator('[data-guided-focus-vector="energy"]');
        await vectorChoice.click();
        assert.equal(await vectorChoice.getAttribute("aria-pressed"),"true");
        assert.equal(await primary.isEnabled(),true,
          "a selected direction alone is sufficient; the context note is optional");
        const difficulty=course.locator("[data-video-key-difficulty]");
        await difficulty.fill(LABELS[locale].difficulty);
        assert.equal(await course.locator("[data-video-key-goal]").count(),0,
          "desired direction is supplied by the selected card; only one optional note remains");
        assert.equal(await primary.isEnabled(),true);
        await primary.click();
        await result.waitFor({state:"visible"});
        assert.ok((await result.innerText()).includes(LABELS[locale].vectorGoal),
          "generated meditation must use the selected goal card");
        await programmeButton.click();
        assert.equal(await course.locator("[data-guided-session]").count(),8);
        await course.locator('[data-guided-focus-vector="money"]').click();
        assert.equal(await result.count(),0,"changing direction invalidates previously generated meditation");
        assert.equal(await course.locator("[data-guided-session]").count(),0,
          "edited goal invalidates the old eight-session outline");
        assert.deepEqual(writes,[],"no guest API writes, external rendering or payment");
        assert.deepEqual(errors,[],"no uncaught client errors");
        console.log("PRACTICES_MOBILE_PASS "+engine+" "+locale+" "+width);
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
