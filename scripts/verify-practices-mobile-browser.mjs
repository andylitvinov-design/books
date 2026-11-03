/**
 * Mobile-first public Courses & Practices browser acceptance.
 * Real Chromium/WebKit hydration, buttons, state/vector and script handoff.
 * Uses synthetic topics only. No account writes, render, provider or billing.
 */
import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium,webkit} from "@playwright/test";

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
        assert.equal(await page.locator('[data-video-quick-control="practices"]').getAttribute("aria-pressed"),"true");
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
        await course.locator("[data-guided-skip-meditation]").click();
        await page.waitForFunction(()=>{
          const skip=document.querySelector("[data-guided-skip-meditation]");
          const audio=document.querySelector("[data-video-therapy-meditation-audio]");
          return skip?.getAttribute("aria-pressed")==="true" && audio?.open===false;
        },null,{timeout:15000});
        assert.equal(await audio.getAttribute("open"),null,"skip closes the existing audio editor");
        assert.equal(await course.locator("[data-guided-skip-meditation]").getAttribute("aria-pressed"),"true");
        await programmeButton.click();
        assert.equal(await course.locator("[data-guided-session]").count(),8);
        assert.equal(await course.locator("[data-guided-free-video]").count(),1);
        const order=course.locator("[data-meditation-course-order]");
        assert.equal(await order.count(),1,"eight-session offer uses one real CRM form");
        await order.click();
        const form=course.locator("[data-meditation-course-contact]");
        await form.waitFor({state:"visible"});
        const send=form.locator("[data-meditation-course-submit]");
        assert.equal(await send.isDisabled(),true,"one-off reply consent is not prechecked");
        await form.locator('input[type="email"]').fill("synthetic@example.invalid");
        assert.equal(await send.isDisabled(),true);
        // A real mobile visitor taps the full accessible consent label, not
        // an 18px box under the fixed iPhone dock. No force/check JS bypass.
        const consentLabel=form.locator("[data-meditation-course-consent] label");
        assert.equal(await consentLabel.count(),1,"one genuine opt-in label");
        await consentLabel.click();
        const consentBox=form.locator('input[name="contactConsent"][type="checkbox"]');
        assert.equal(await consentBox.isChecked(),true,
          "label tap must actually update the user-controlled consent");
        assert.equal(await send.isEnabled(),true,"explicit consent enables the real request");
        // Deliberately do not submit: no database test account, lead or external delivery.
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
