/**
 * Mocked-Gemini E2E: real Next UI and actual client WAV handling without API
 * credentials, provider billing or customer data. NOT a provider E2E claim.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit,expect} from "@playwright/test";
import {verifyGuidedPractices} from "./verify-mandala-practices-browser.mjs";

const BASE=(process.env.HH_TEST_PUBLIC_ORIGIN||"http://127.0.0.1:3100").replace(/\/$/,"");
/** The new photo-led Ideas screen hides the retired phrase shortcut. Use real
 *  visible studio navigation instead of forcing a hidden button. */
async function openVisibleMontageText(page,engine="chromium"){
  const montage=page.locator('[data-video-quick-control="editor"]');
  await expect(montage).toBeVisible({timeout:15000});
  await expect(montage).toBeEnabled();
  if(engine==="webkit")await montage.tap();
  else await montage.click();
  await expect(montage).toHaveAttribute("aria-pressed","true",{timeout:15000});
  const text=page.locator('[data-video-montage-tab="text"]');
  await expect(text).toBeVisible({timeout:15000});
  if(engine==="webkit")await text.tap();
  else await text.click();
  await expect(text).toHaveAttribute("aria-pressed","true",{timeout:15000});
  await expect(page.locator("[data-video-montage-text]")).toBeVisible({timeout:15000});
}
function wav(seconds=3) {
  const rate=24000,n=rate*seconds,b=Buffer.alloc(44+n*2);
  b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);b.write("fmt ",12);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*280/rate)*8000),44+i*2);
  return b;
}
// A first click must not be offered before React attaches the workspace handlers.
// Hold only this fresh context's same-origin JS, then verify one real tap after
// hydration. All writes and third-party requests remain blocked.
async function verifyWorkspaceHydration(browser,locale){
  const context=await browser.newContext({viewport:{width:390,height:840},isMobile:true,hasTouch:true,serviceWorkers:"block"});
  let release;const hold=new Promise(resolve=>{release=resolve});let held=0;
  try{
    await context.route("**/*",async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==new URL(BASE).origin||!["GET","HEAD"].includes(request.method()))return route.abort();
      if(url.pathname.includes("/_next/static/")&&url.pathname.endsWith(".js")){held++;await hold;}
      return route.continue();
    });
    const page=await context.newPage();
    await page.goto(BASE+"/"+locale+"/holistic-support/mandala",{waitUntil:"commit",timeout:90000});
    const studio=page.locator('[data-video-studio-hydrated]');
    const tabs=page.locator('[data-video-quick-controls] button');
    await expect(studio).toHaveAttribute("data-video-studio-hydrated","false",{timeout:60000});
    await expect(tabs).toHaveCount(6);
    for(let i=0;i<6;i++)await expect(tabs.nth(i)).toBeDisabled();
    // Native first-screen navigation: only real visible clicks.
    const continueToIdeas=page.locator('[data-video-continue-scenarios]');
    const allStories=page.locator('[data-auto-video-all-scenes]');
    await expect(continueToIdeas).toBeDisabled();
    await expect(allStories).toBeHidden();
    await expect.poll(()=>held,{timeout:10000,message:"the test must actually delay JavaScript"}).toBeGreaterThan(0);
    release();
    await expect(studio).toHaveAttribute("data-video-studio-hydrated","true",{timeout:60000});
    // The separately validated Messenger handoff may open this existing
    // compact Goals disclosure; the non-handoff UI remains closed/hidden.
    const handoffPanel=page.locator('[data-video-director-chat-details][data-workspace-section="video"]');
    await expect(handoffPanel).toBeHidden();
    // Compact Mirror must not expose an unrelated Director Chat disclosure
    // before a visitor deliberately enters the advanced editor.
    await expect(handoffPanel).toBeHidden();
    // The approved Goal redesign deliberately gates Personalization behind
    // three explicit selections; hydration alone must NEVER unlock this CTA.
    await expect(continueToIdeas).toBeDisabled();
    const quizProgress=page.locator('[data-video-goal-quiz-progress]');
    await expect(quizProgress).toContainText('1 / 3');
    const mirror=page.locator('[data-hh-mirror-goals]');
    await expect(page.locator('[data-hh-mirror-title]')).toBeVisible();
    await expect(page.locator('[data-video-intro-info]')).toBeHidden();
    await expect(page.locator('[data-video-my-film]')).toBeHidden();
    await expect(mirror).toBeVisible();
    await expect(mirror).toHaveAttribute('data-hh-mirror-step','1');
    await expect(mirror.locator('[data-hh-mirror-goal-choice]')).toHaveCount(4);
    const approvedAxisLabels={
      en:["Ease Stress & Restore Energy","Improve Love & Relationships","Money, Success & Self-Esteem","Personal & Business Growth"],
      ru:["Снизить стресс и восстановить энергию","Улучшить любовь и отношения","Деньги, успех и самооценка","Личностный и бизнес-рост"],
      es:["Aliviar el estrés y recuperar energía","Mejorar el amor y las relaciones","Dinero, éxito y autoestima","Crecimiento personal y empresarial"]
    }[locale];
    for(let index=0;index<4;index++)await expect(mirror.locator('[data-hh-mirror-goal-choice]').nth(index))
      .toContainText(approvedAxisLabels[index]);
    await mirror.locator('[data-hh-mirror-audience="business"]').click();
    await expect(mirror).toHaveAttribute("data-hh-mirror-mode","business");
    const workCards=mirror.locator('[data-hh-mirror-goal-choice]');
    const workLabels={
      en:["Insta Reels","Video About Me","Service Presentation","Client Video Offer"],
      ru:["Insta Reels","Видео обо мне","Презентация услуги","Видео-предложение клиенту"],
      es:["Insta Reels","Vídeo sobre mí","Presentación del servicio","Oferta en vídeo para clientes"]
    }[locale];
    await expect(workCards).toHaveCount(4);
    for(let i=0;i<4;i++)await expect(workCards.nth(i)).toContainText(workLabels[i]);
    for(const width of [320,390,430]){
      await page.setViewportSize({width,height:840});
      for(const image of await workCards.locator('img').all()){
        await image.scrollIntoViewIfNeeded();
        await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0),
          {message:"Work photo loads at "+width,timeout:12000}).toBe(true);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),
        false,"Work cards do not overflow at "+width);
    }
    await page.setViewportSize({width:390,height:840});
    await mirror.locator('[data-hh-mirror-goal-choice="insta-reels"]').click();
    await expect(studio).toHaveAttribute("data-active-workspace","phrases",{timeout:15000});
    await expect(page.locator('[data-video-ideas-goal-panel]')).toBeVisible();
    await page.locator('[data-video-quick-control="video"]').click();
    await expect(mirror).toHaveAttribute("data-hh-mirror-step","1");
    await mirror.locator('[data-hh-mirror-audience="present"]').click();
    await expect(mirror).toHaveAttribute("data-hh-mirror-mode","present");
    await expect(mirror.locator('[data-hh-mirror-goal-choice="stress"]')).toBeVisible();
    await mirror.locator('[data-hh-mirror-audience="me"]').click();
    await expect(mirror).toHaveAttribute("data-hh-mirror-mode","me");
    // One-line Next is a real local taxonomy selection and jumps directly
    // to Goal. No advanced sections, extra copy or paid provider request.
    const customWish=locale==="ru"?"Хочу больше взаимопонимания":locale==="es"
      ?"Quiero tener más comprensión mutua":"I want more mutual understanding";
    await mirror.locator('[data-hh-mirror-wish]').fill(customWish);
    await mirror.locator('[data-hh-mirror-next]').click();
    await expect(studio).toHaveAttribute("data-active-workspace","phrases",{timeout:15000});
    await expect(page.locator('[data-video-ideas-goal-panel]')).toBeVisible();
    await expect(page.locator('[data-video-ideas-tab="goal"]')).toHaveAttribute("aria-pressed","true");
    // Return to the genuine Goal tab to exercise the second path:
    // one selected photograph -> exactly two short choices -> Goal.
    await page.locator('[data-video-quick-control="video"]').click();
    await expect(studio).toHaveAttribute("data-active-workspace","video");
    await expect(studio).toHaveAttribute("data-hh-mirror-advanced","false");
    await mirror.locator('[data-hh-mirror-goal-choice="love"]').click();
    await expect(mirror).toHaveAttribute('data-hh-mirror-step','2');
    const subs=mirror.locator('[data-hh-mirror-subcategory]');
    await expect(subs).toHaveCount(4);
    for(const width of [320,354,390,430]){
      await page.setViewportSize({width,height:840});
      for(const image of await subs.locator('img').all()){
        await image.scrollIntoViewIfNeeded();
        await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0),
          {message:"Mirror quiz image loads at "+width}).toBe(true);
      }
      const metrics=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>window.innerWidth+1,
        controls:[...document.querySelectorAll('[data-hh-mirror-subcategory]')]
          .map(node=>node.getBoundingClientRect().width)
      }));
      assert.equal(metrics.overflow,false,"Mirror quiz no horizontal overflow at "+width);
      assert.ok(metrics.controls.every(value=>value>=125),
        "Mirror quiz cards remain large enough for "+width);
    }
    await page.setViewportSize({width:390,height:840});
    await subs.first().click();
    await expect(mirror).toHaveAttribute('data-hh-mirror-step','3');
    await expect(mirror.locator('[data-hh-mirror-topic]')).toHaveCount(4);
    await mirror.locator('[data-hh-mirror-topic]').first().click();
    await expect(studio).toHaveAttribute("data-active-workspace","phrases",{timeout:15000});
    const ideas=page.locator('[data-video-quick-control="phrases"]');
    await expect(ideas).toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-workspace-section="phrases"][data-video-quick-phrases]')).toBeVisible();
        // Purpose-first Ideas opens Goal, not Personalization. Select an actual
    // goal and complete its short, goal-specific quiz before testing the
    // original optional refinement and Montage text editor.
    const ideasGoalPane=page.locator('[data-video-ideas-goal-panel]');
    await expect(ideasGoalPane).toBeVisible();
    await expect(page.locator('[data-video-ideas-tab="goal"]'))
      .toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-ideas-tab="personalization"]')).toBeDisabled();
    const goalChoices=ideasGoalPane.locator('[data-video-ideas-goal-choice]');
    await expect(goalChoices).toHaveCount(3);
    await ideasGoalPane.locator('[data-video-ideas-goal-choice="rest"]').click();
    await ideasGoalPane.locator('[data-video-ideas-goal-next]').click();
    await expect(page.locator('[data-video-ideas-tab="personalization"]'))
      .toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-ideas-personalization-panel]')).toBeVisible();
    const purposeQuiz=page.locator('[data-video-personalization]');
    await expect(purposeQuiz).toHaveAttribute("data-video-personalization-goal","leisure");
    // Goal-first Personalization permits an optional expanded topic disclosure
    // only AFTER the real Goal selection; it must never replace the five
    // goal-scoped answers or appear as a mandatory extra step.
    const refinement=page.locator('[data-video-ideas-refinement]');
    await expect(refinement).toHaveCount(1);
    await expect(refinement.locator(":scope > summary")).toBeVisible();
    await expect(purposeQuiz).toBeVisible();
    // Complete leisure's three real steps (desired mood, current energy, name)
    // so subsequent Montage assertions start from a confirmed profile.
    await purposeQuiz.locator('[data-video-personalization-choice="desired-calm"]').click();
    await expect(purposeQuiz).toHaveAttribute("data-video-personalization-step","2");
    await purposeQuiz.locator('[data-video-personalization-energy="5"]').click();
    await expect(purposeQuiz).toHaveAttribute("data-video-personalization-step","3");
    // The user's chosen goal must survive every answer, not just the initial
    // category handoff. A late director brief must not invalidate its identity.
    const preservedGoal=ideasGoalPane.locator('[data-video-ideas-goal-choice="rest"]');
    await expect(preservedGoal).toHaveAttribute("aria-pressed","true");
    const finishPersonalization=purposeQuiz.locator('[data-video-personalization-clarify-continue]');
    await expect(finishPersonalization).toBeVisible();
    await expect(finishPersonalization).toBeEnabled();
    await finishPersonalization.tap();
    try{
      await expect(page.locator('[data-video-ideas-tab="concept"]'))
        .toHaveAttribute("aria-pressed","true",{timeout:12000});
      await expect(page.locator('[data-video-ideas-tab="concept"]')).toBeEnabled();
    }catch(error){
      // Structural browser-only diagnostics: never log the private wish,
      // emotional answers, preferred name or media contents.
      const structural=await page.evaluate(()=>({
        stage:document.querySelector('[data-video-quick-phrases]')?.getAttribute('data-ideas-subtab')||null,
        selectedGoal:document.querySelector('[data-video-ideas-goal-choice="rest"][aria-pressed="true"]')!==null,
        quizStep:document.querySelector('[data-video-personalization]')?.getAttribute('data-video-personalization-step')||null,
        conceptDisabled:document.querySelector('[data-video-ideas-tab="concept"]')?.hasAttribute('disabled')??null,
      })).catch(()=>({diagnosticsUnavailable:true}));
      throw new Error("WEBKIT_GOAL_TO_CONCEPT_FAILED "+JSON.stringify(structural),{cause:error});
    }
    // The legacy extra CTA is intentionally hidden: tap the visible Montage rail.
    await openVisibleMontageText(page,browser.browserType().name());
    await expect(page.locator('[data-video-montage-tab="text"]'))
      .toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-montage-text]')).toBeVisible();
    // Two separate actions: the existing guarded render and navigation-only storyboard.
    const textFooter=page.locator('[data-video-ideas-compact] [data-video-stage-actions="ideas"]');
    await expect(textFooter.locator("button")).toHaveCount(2);
    const generateText=textFooter.locator('[data-video-ideas-generate]');
    const reviewStory=textFooter.locator('[data-video-ideas-create]');
    await expect(generateText).toBeEnabled();
    await expect(generateText).toContainText(
      locale==="ru"?"Создать видео":locale==="es"?"Generar vídeo":"Generate Video");
    await expect(reviewStory).toBeEnabled();
    await expect(reviewStory).toContainText(
      locale==="ru"?"Раскадровка":locale==="es"?"Guion visual":"Storyboard");
    for(const width of [320,354,390,430]){
      await page.setViewportSize({width,height:840});
      const layout=await textFooter.evaluate(footer=>{
        const buttons=[...footer.querySelectorAll("button")].map(node=>node.getBoundingClientRect());
        const row=footer.getBoundingClientRect();
        return {top:buttons.map(b=>b.top),widths:buttons.map(b=>b.width),bottom:row.bottom,
          viewport:document.documentElement.clientWidth,doc:document.documentElement.scrollWidth};
      });
      assert.ok(layout.top.length===2&&Math.abs(layout.top[0]-layout.top[1])<3,
        "Text actions remain in one iPhone row: "+width+" "+JSON.stringify(layout));
      assert.ok(layout.widths.every(w=>w>=90),
        "both Text actions remain readable: "+width+" "+JSON.stringify(layout));
      assert.ok(layout.doc<=layout.viewport+2,
        "Text actions do not overflow horizontally: "+width+" "+JSON.stringify(layout));
    }
    await page.setViewportSize({width:390,height:840});
    await reviewStory.tap();
    await expect(page.locator('[data-video-montage-tab="concept"]')).toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-montage-concept]')).toBeVisible();
    // Return to Ideas before testing the independent top-level Montage tap.
    await ideas.tap();
    await expect(studio).toHaveAttribute("data-active-workspace","phrases");
    const montage=page.locator('[data-video-quick-control="editor"]');
    await expect(montage).toBeVisible({timeout:15000});
    await expect(montage).toBeEnabled({timeout:15000});
    // On iPhone WebKit the native touch path is authoritative. One
    // physical user tap, no force, no artificial second click.
    await montage.tap();
    try{
      await expect(studio).toHaveAttribute("data-active-workspace","editor",{timeout:15000});
      await expect(montage).toHaveAttribute("aria-pressed","true");
    }catch(error){
      const state=await page.evaluate(()=>({
        hydrated:document.querySelector('[data-video-studio-hydrated]')?.getAttribute('data-video-studio-hydrated'),
        workspace:document.querySelector('[data-mandala-free-video]')?.getAttribute('data-active-workspace'),
        editorPressed:document.querySelector('[data-video-quick-control="editor"]')?.getAttribute('aria-pressed'),
        editorDisabled:document.querySelector('[data-video-quick-control="editor"]')?.disabled??null,
      })).catch(()=>({diagnosticsUnavailable:true}));
      throw new Error("WEBKIT_MONTAGE_SINGLE_TAP_NOT_COMMITTED "+JSON.stringify(state),{cause:error});
    }
    // Open the independent video storyboard in Montage. The written Concept stays in Ideas.
    const montageStyle=page.locator('[data-video-montage-tab="effects"]');
    await expect(montageStyle).toHaveAttribute("aria-pressed","true");
    const montageStoryboardTab=page.locator('[data-video-montage-tab="concept"]');
    await expect(montageStoryboardTab).toBeVisible();
    await montageStoryboardTab.tap();
    await expect(montageStoryboardTab).toHaveAttribute("aria-pressed","true");
    const montageVideoConcept=page.locator('[data-video-montage-concept]');
    await expect(montageVideoConcept).toBeVisible();
    // Story is the EXISTING automatic storyboard generated from the Ideas concept.
    // No manual prompt/questionnaire: check real scene cards and licensed posters.
    const automaticStoryboard=montageVideoConcept.locator('[data-video-auto-storyboard]');
    await expect(automaticStoryboard).toBeVisible({timeout:20000});
    const cards=automaticStoryboard.locator('[data-video-story-scene]');
    const storyboardShotCount=Number(await automaticStoryboard.getAttribute('data-storyboard-scenes'));
    assert.ok(Number.isSafeInteger(storyboardShotCount) && storyboardShotCount>=0,
      "automatic storyboard must report a finite scene count");
    await expect(cards).toHaveCount(storyboardShotCount);
    assert.equal(await automaticStoryboard.locator("textarea").count(),0,
      "the Story tab must render its proposal, not ask the user to fill it out");
    if(storyboardShotCount>0){
      assert.ok(storyboardShotCount>=4&&storyboardShotCount<=12,
        "storyboard must show every ordered shot, not fold six authored shots into five");
      const authored=await automaticStoryboard.getAttribute('data-storyboard-aligned-to-concept')==='true';
      if(authored){
        assert.equal(storyboardShotCount,6,"a selected 30-second film retains six separate shots");
        for(let i=0;i<6;i++){
          const from=String(i*5).padStart(2,"0"),to=String((i+1)*5).padStart(2,"0");
          await expect(cards.nth(i).locator('[data-storyboard-scene-time]'))
            .toHaveText('00:'+from+'–00:'+to);
          assert.ok((await cards.nth(i).locator('[data-storyboard-scene-action]').innerText()).trim().length>=10,
            "authored physical action must survive the Ideas → Story transition in scene "+(i+1));
        }
        // Metadata relevance is not proof of a filmed action. Do not claim that
        // unrelated stock frames depict the six authored physical events.
        await expect(automaticStoryboard).toHaveAttribute("data-storyboard-action-proof","editorial_unverified");
        await expect(automaticStoryboard).toHaveAttribute("data-storyboard-media-ready","false");
        // Authored scene references must match the actual action. Missing
        // matches show an honest Footage needed sketch, never an unrelated photo.
        const referenceCount=Number(await automaticStoryboard.getAttribute("data-storyboard-reference-count"));
        assert.ok(Number.isSafeInteger(referenceCount)&&referenceCount>=0&&
          referenceCount<=storyboardShotCount,
          "reference count must be bounded by the number of authored scenes");
        await expect(automaticStoryboard).toHaveAttribute("data-storyboard-graphics-mode",
          referenceCount?"licensed-photographic-references":"screenplay-scene-sketch");
        assert.equal(await automaticStoryboard.getAttribute("data-storyboard-reference-status"),
          referenceCount?"editorial_photo_reference_not_action_verified":null);
        const referencePhotos=cards.locator('img[data-storyboard-reference-photo]');
        await expect(referencePhotos).toHaveCount(referenceCount);
        const kinds=await cards.evaluateAll(nodes=>nodes.map(node=>
          node.getAttribute("data-story-media-kind")));
        assert.equal(kinds.filter(kind=>kind==="reference").length,referenceCount,
          "reference images must belong to distinct authored scenes");
        assert.ok(kinds.every(kind=>["reference","missing","video","photo"].includes(kind)),
          "every authored scene must display a recognized honest media state");
        for(let i=0;i<storyboardShotCount;i++){
          if(kinds[i]==="missing"){
            await expect(cards.nth(i).locator('[data-video-story-media-missing="true"]'))
              .toHaveCount(1);
            await expect(cards.nth(i).locator('img[data-storyboard-reference-photo]'))
              .toHaveCount(0);
          }
        }
        for(let i=0;i<referenceCount;i++){
          const photo=referencePhotos.nth(i);
          assert.ok((await photo.getAttribute("src"))?.startsWith("/"),
            "each editorial reference must use a trusted first-party photograph");
          assert.ok((await photo.getAttribute("alt"))?.trim(),
            "each editorial reference must name the illustrated subject");
        }
        await expect(automaticStoryboard.locator('[data-video-auto-storyboard-apply]')).toHaveCount(0);
      }
      await expect(automaticStoryboard.locator('[data-video-auto-storyboard-list]')).toBeVisible();
      await expect(cards.first()).toContainText(
        locale==="ru"?"Сцена 1":locale==="es"?"Escena 1":"Scene 1");
      const firstPoster=cards.first().locator("img");
      if(await firstPoster.count()){
        assert.ok((await firstPoster.getAttribute("src"))?.startsWith("/"),
          "source-backed poster uses an approved local URL");
        assert.ok((await firstPoster.getAttribute("alt"))?.trim(),
          "visible poster retains a meaningful source label");
      }else{
        const missing=await cards.first().getAttribute('data-story-media-kind')==='missing';
        await expect(cards.first()).toContainText(missing?
          (locale==="ru"?"Нужен видеокадр":locale==="es"?"Falta vídeo":"Footage needed"):
          (locale==="ru"?"Превью недоступно":locale==="es"?"Vista previa no disponible":"Preview unavailable"));
      }
    }else{
      // No fictional clips: missing verified footage must fail closed with a
      // visible explanation, not restore the retired manual storyboard editor.
      await expect(automaticStoryboard.getByRole("status")).toBeVisible();
      await expect(automaticStoryboard.locator('[data-video-auto-storyboard-apply]')).toHaveCount(0);
    }
    await montageStyle.tap();
    await expect(montageStyle).toHaveAttribute("aria-pressed","true");
    const ideasTop=page.locator('[data-video-quick-control="phrases"]');
    await ideasTop.tap();
    // Returning from Montage preserves the last selected Ideas panel
    // (Concept), not a fabricated Goal reset. The chosen goal and confirmed
    // Personalization still remain accessible with real taps.
    const ideasGoalTab=page.locator('[data-video-ideas-tab="goal"]');
    const ideasConceptTab=page.locator('[data-video-ideas-tab="concept"]');
    const ideasPersonalTab=page.locator('[data-video-ideas-tab="personalization"]');
    await expect(ideasConceptTab).toHaveAttribute("aria-pressed","true");
    await expect(ideasGoalTab).toBeEnabled();
    await expect(ideasPersonalTab).toBeEnabled();
    await ideasGoalTab.tap();
    await expect(ideasGoalTab).toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-ideas-goal-selected]')).toBeVisible();
    // The previous leisure profile has been confirmed; only changing the goal
    // should reset confirmation and temporarily lock Concept. Exercise an
    // actual visitor switch to emotional support, not a synthetic reset.
    await expect(ideasConceptTab).toBeEnabled();
    const supportGoal=page.locator('[data-video-ideas-goal-choice="accept"]');
    await expect(supportGoal).toBeVisible();
    await supportGoal.tap();
    await expect(supportGoal).toHaveAttribute("aria-pressed","true");
    await expect(ideasConceptTab).toBeDisabled();
    await page.locator('[data-video-ideas-goal-next]').tap();
    await expect(ideasPersonalTab).toHaveAttribute("aria-pressed","true");
    // Support must complete each real required question before Concept unlocks.
    // Never force-tap a disabled tab or substitute synthetic React state.
    const supportQuiz=page.locator('[data-video-personalization][data-video-personalization-goal="support"]');
    await expect(supportQuiz).toBeVisible();
    const currentFeeling=supportQuiz.locator('[data-personalization-kind="current"] [data-video-personalization-choice]').first();
    await expect(currentFeeling).toBeVisible();
    await currentFeeling.tap();
    await expect(supportQuiz).toHaveAttribute("data-video-personalization-step","2");
    const desiredFeeling=supportQuiz.locator('[data-personalization-kind="desired"] [data-video-personalization-choice]').first();
    await expect(desiredFeeling).toBeVisible();
    await desiredFeeling.tap();
    await expect(supportQuiz).toHaveAttribute("data-video-personalization-step","3");
    await supportQuiz.locator('[data-video-personalization-support-need]').first().tap();
    await expect(supportQuiz).toHaveAttribute("data-video-personalization-step","4");
    await supportQuiz.locator('[data-video-personalization-energy="5"]').tap();
    await expect(supportQuiz).toHaveAttribute("data-video-personalization-step","5");
    await supportQuiz.locator('[data-video-personalization-clarify-continue]').tap();
    await expect(ideasConceptTab).toHaveAttribute("aria-pressed","true");
    const concept=page.locator("[data-video-ideas-concept-panel]");
    await expect(concept).toBeVisible();
    // Concept Intelligence: two personalized, touch-operable film choices,
    // not a generic four-beat catalog summary.
    const directionCards=concept.locator("[data-video-concept-direction]");
    if(await directionCards.count()===2){
      const ideaText=await directionCards.first().textContent();
      assert.doesNotMatch(ideaText||"",/→|The story opens with/i);
      const firstStory=await concept.locator("[data-video-concept-paragraph]").textContent();
      await directionCards.nth(1).tap();
      await expect(directionCards.nth(1)).toHaveAttribute("aria-pressed","true");
      const alternative=await concept.locator("[data-video-concept-paragraph]").textContent();
      assert.notEqual(firstStory,alternative,"switching a card changes the actual story");
      await directionCards.first().tap();
      await expect(directionCards.first()).toHaveAttribute("aria-pressed","true");
    }
    // One-screen responsive guard: fixed rail must remain reachable and above
    // the bottom navigation/FAB without horizontal overflow on iPhone sizes.
    for(const width of [320,375,390,430]){
      await page.setViewportSize({width,height:840});
      const measure=await concept.evaluate((element)=>{
        const rail=element.querySelector("[data-video-concept-action-rail]");
        const root=element.querySelector("[data-video-concept-auto]");
        if(!rail||!root)return null;
        const a=rail.getBoundingClientRect(),b=root.getBoundingClientRect();
        return {left:a.left,right:a.right,bottom:a.bottom,bodyLeft:b.left,bodyRight:b.right};
      });
      assert.ok(measure&&measure.left>=-1&&measure.right<=width+1&&
        measure.bodyRight<=width+1&&measure.bottom<810,
        "Concept stays within mobile viewport at width "+width);
    }
    await page.setViewportSize({width:390,height:840});
    const headline=concept.locator("[data-video-concept-main-idea]");
    const narrative=concept.locator("[data-video-concept-paragraph]");
    await expect(headline).toBeVisible();
    await expect(narrative).toBeVisible();
    await expect(concept.locator("[data-video-concept-all-parameters]")).toBeVisible();
    const mainBox=await headline.boundingBox(),storyBox=await narrative.boundingBox();
    assert.ok(mainBox&&storyBox&&mainBox.y<storyBox.y,"Main idea above story on iPhone");
    // Advanced production fields now stay folded under Creative settings;
    // expand the disclosure before checking one-column geometry.
    await concept.locator("[data-video-concept-all-parameters] > summary").click();
    await expect(concept.locator("[data-video-concept-all-parameters]")).toHaveAttribute("open","");
    const rects=await concept.locator("[data-concept-parameter]").evaluateAll(nodes=>
      nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y};}));
    assert.ok(rects.length>=6&&rects.length<=26,"Only visible decision-relevant parameters");
    for(let i=1;i<rects.length;i++)assert.ok(rects[i].y>rects[i-1].y&&
      Math.abs(rects[i].x-rects[0].x)<3,"Parameters stay in one vertical column");
    await concept.locator("[data-video-concept-edit]").click();
    await expect(page.locator("[data-video-concept-auth-overlay]")).toBeVisible();
    await page.locator("[data-video-concept-auth-close]").click();
    await expect(page.locator("[data-video-concept-auth-overlay]")).toHaveCount(0);
    await concept.locator("[data-video-concept-approve]").click();
    await expect(studio).toHaveAttribute("data-active-workspace","editor");
    await expect(montageStyle).toHaveAttribute("aria-pressed","true");
    await ideasTop.tap();
    await expect(ideasConceptTab).toHaveAttribute("aria-pressed","true");
    await expect(page.locator("[data-video-concept-auto]"))
      .toHaveAttribute("data-concept-approved","true");
    await montage.tap();
    // Explicit Style selection remains a real tap, not a render bypass.
    const styleTab=page.locator('[data-video-montage-tab="effects"]');
    await expect(styleTab).toBeVisible();
    await styleTab.tap();
    await expect(styleTab).toHaveAttribute("aria-pressed","true");
    const styles=page.locator("[data-video-montage-style]");
    await expect(styles).toHaveCount(6);
    const minimal=styles.nth(3);
    await expect(minimal).toBeVisible();
    const hero=page.locator("[data-video-mandala-hero]");
    const master=page.locator("[data-mandala-master-mp4]");
    await minimal.tap();
    await expect(minimal).toHaveAttribute("aria-pressed","true");
    await expect(hero).toHaveAttribute("data-video-preview-style","minimal");
    await expect(hero).toHaveAttribute("data-preview-playing","true");
    await expect(master).toHaveCount(1);
    await expect.poll(()=>master.evaluate(video=>video.preload),{timeout:15000}).toBe("auto");
    await expect.poll(()=>master.evaluate(video=>
      video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0&&!video.error),
      {timeout:20000}).toBe(true);
    // Actual route-matched recipient path: ONE header switch, working kind,
    // real occasion and the original Goal→Ideas action. The ordinary visitor
    // must not need a hidden storyboard Confirm to stage these four captions.
    const goalTab=page.locator('[data-video-quick-control="video"]');
    await goalTab.click();
    await expect(goalTab).toHaveAttribute("aria-pressed","true");
    const goalQuiz=page.locator('[data-video-goal-quiz-audience]');
    // Returning from Ideas keeps the completed Self quiz at step 3. Navigate
    // back through its real buttons before asserting step-1 Life/Work controls.
    const backGoal=page.locator('[data-video-goal-quiz-back]');
    for(let step=0;step<2&&await backGoal.count();step++)await backGoal.click();
    await expect(page.locator('[data-video-quick-scope]')).toHaveCount(2);
    const others=page.locator('[data-video-quick-scope="work"]');
    await expect(page.locator('[data-video-goal-audience-option]')).toHaveCount(0);
    await others.click();
    await expect(goalQuiz).toHaveAttribute("data-video-goal-quiz-audience","others");
    const recipientCatalog=page.locator('[data-video-recipient-catalog]');
    await expect(recipientCatalog).toBeVisible();
    await expect(recipientCatalog).toHaveAttribute("data-video-recipient-aspect","portrait");
    await expect(page.locator('[data-video-recipient-format-note]')).toContainText("9:16");
    await expect(page.locator('[data-video-goal-topic-chips]')).toHaveCount(0);
    // Four full-width horizontal format rows; Reels is the existing vertical video
    // pipeline, not a new renderer. Measure actual geometry on mobile WebKit.
    const recipientFormats=page.locator('[data-auto-video-recipient-kind]');
    await expect(recipientFormats).toHaveCount(4);
    for(const width of [320,354,390,430]){
      await page.setViewportSize({width,height:840});
      const boxes=await recipientFormats.evaluateAll(elements=>elements.map(element=>{
        const rect=element.getBoundingClientRect();
        const image=element.querySelector("img")?.getBoundingClientRect();
        const body=element.querySelector("span")?.getBoundingClientRect();
        return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
          width:rect.width,imageRight:image?.right||0,bodyLeft:body?.left||0};
      }));
      assert.equal(boxes.length,4,"four format choices "+width);
      assert.ok(boxes.every((item,index)=>index===0||item.top>=boxes[index-1].bottom-2),
        "one vertical list of horizontal cards "+width+" "+JSON.stringify(boxes));
      assert.ok(boxes.every(item=>item.width>190&&item.imageRight<item.bodyLeft+3&&item.right<=width+1),
        "photo at left, copy at right, no overflow "+width+" "+JSON.stringify(boxes));
    }
    await page.setViewportSize({width:390,height:840});
    const reelsFormat=page.locator('[data-auto-video-recipient-kind="reels"]');
    await reelsFormat.click();
    await expect(reelsFormat).toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-recipient-topic-summary]')).toContainText("Reels");
    await expect(page.locator('[data-auto-video-recipient-occasion]')).toHaveCount(0);
    // Audio is still its original local, opt-in flow.
    const audioFormat=page.locator('[data-auto-video-recipient-kind="audio_visual"]');
    await audioFormat.click();
    await expect(audioFormat).toHaveAttribute("aria-pressed","true");
    const audioFlow=page.locator('[data-video-recipient-audio-panel]');
    await expect(audioFlow).toBeVisible();
    const transcribe=page.locator('[data-video-recipient-audio-transcribe]');
    const nextAudio=page.locator('[data-video-recipient-audio-next]');
    await expect(transcribe).toBeDisabled();
    await expect(nextAudio).toBeDisabled();
    await expect(page.locator('[data-video-recipient-audio-record]')).toBeVisible();
    const outboundStt=[];
    page.on("request",request=>{
      if(request.method()==="POST"&&request.url().includes("/api/holistic-support/audio-storyboard"))
        outboundStt.push(request.url());
    });
    await page.locator('[data-video-recipient-audio-upload]').setInputFiles({
      name:"sample.wav",mimeType:"audio/wav",buffer:wav(2)
    });
    await expect(audioFlow).toContainText("sample.wav");
    await expect(page.locator('[data-video-recipient-audio-rights-notice]')).toBeVisible();
    await expect(page.locator('[data-video-recipient-audio-stt-notice]')).toBeVisible();
    await expect(audioFlow.locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(transcribe).toBeEnabled();
    await expect(nextAudio).toBeDisabled();
    assert.equal(outboundStt.length,0,"no STT request before clicking Transcribe");
    // Moving to a different recipient must discard this local private audio.
    const greeting=page.locator('[data-auto-video-recipient-kind="greeting"]');
    await greeting.click();
    await expect(audioFlow).toBeHidden();
    await expect(greeting).toHaveAttribute("aria-pressed","true");
    const birthday=page.locator('[data-auto-video-recipient-occasion="birthday"]');
    await birthday.click();
    await expect(birthday).toHaveAttribute("aria-pressed","true");
    // Recipient choices can move the shared director's focus. Return via the
    // real visible Goal rail before using its in-panel Continue button.
    await goalTab.click();
    await expect(studio).toHaveAttribute("data-active-workspace","video");
    // For Others, the native compact Goal CTA is the visible navigation entry.
    // The legacy footer Continue button intentionally stays hidden in that mode.
    // Exercise the actual clicked handler rather than unveiling hidden controls.
    await expect(continueToIdeas).toBeHidden();
    const recipientCreate=page.locator('[data-video-goal-create-cta]');
    await expect(recipientCreate).toBeVisible({timeout:15000});
    await expect(recipientCreate).toBeEnabled();
    await recipientCreate.click();
    await expect(ideas).toHaveAttribute("aria-pressed","true");
    await expect(studio).toHaveAttribute("data-active-workspace","phrases");
    // These are the actual source-backed montage title inputs; source edits
    // use the same data fed to compileFreeFilmPreset, not a fake screenshot.
    const firstCaption=page.locator('[data-auto-video-stage-caption="0"]');
    await expect(firstCaption).toHaveValue(locale==="ru"?"День рождения":"Birthday");
    await expect(page.locator('[data-video-mandala-hero]')).toHaveAttribute(
      "data-video-preview-clips",/^(4|5|6|7|8|9|10|11|12)$/);
    // Speech-driven path: one Continue tap, no separate Match Footage gate.
    // The transcription API is intercepted; no provider or paid render is called.
    await page.locator('[data-video-quick-control="video"]').click();
    await page.locator('[data-auto-video-recipient-kind="audio_visual"]').click();
    const sampleLines=locale==="ru"
      ?["Солнце светит утром","Дети улыбаются","Все радуются дню","Тёплый свет вокруг"]
      :locale==="es"
        ?["Brilla el sol","Los niños sonríen","Todos disfrutan del día","Hay luz y alegría"]
        :["The sun shines","Children are happy","They enjoy the day","Warm light surrounds us"];
    const speech={text:sampleLines.join(" "),durationSeconds:16,segments:sampleLines.map((text,i)=>({
      text,startSeconds:i*4,endSeconds:(i+1)*4
    }))};
    let sttMockCalls=0;
    await page.route("**/api/holistic-support/audio-storyboard",async route=>{
      if(route.request().method()!=="POST")return route.abort();
      sttMockCalls++;
      await route.fulfill({status:200,contentType:"application/json",
        body:JSON.stringify({transcript:speech,charged:false,mediaGenerated:false})});
    });
    await page.locator('[data-video-recipient-audio-upload]').setInputFiles({
      name:"sample.wav",mimeType:"audio/wav",buffer:wav(16)
    });
    const nextWithSpeech=page.locator('[data-video-recipient-audio-next]');
    await expect(nextWithSpeech).toBeDisabled();
    await page.locator('[data-video-recipient-audio-transcribe]').click();
    await expect(page.locator('[data-video-recipient-audio-transcript]')).toBeVisible({timeout:30000});
    await expect(page.locator('[data-video-recipient-audio-concept-preview]')).toBeVisible();
    await expect(page.locator('[data-video-recipient-audio-plan]')).toHaveCount(0);
    await expect(nextWithSpeech).toBeEnabled();
    await nextWithSpeech.click();
    await expect(studio).toHaveAttribute("data-active-workspace","editor");
    await expect(page.locator('[data-video-montage-tab="concept"]')).toHaveAttribute("aria-pressed","true");
    assert.equal(sttMockCalls,1,"one explicitly consented mocked transcription, not an automatic provider request");
    await expect(page.locator('[data-video-montage-concept]')).toBeVisible();
  }finally{release();await context.close();}
}
// Real guest route browser acceptance: the fragment carries only optional
// user-approved text; a fresh recipient tab must not inherit consent. No
// provider calls, personal audio upload, paid models or fake recorder output.
async function verifyGuestVoiceConsent(browser,locale){
  const context=await browser.newContext({
    viewport:{width:390,height:840},isMobile:true,hasTouch:true,
    acceptDownloads:true,serviceWorkers:"block",
  });
  const providerPosts=[];
  try{
    const page=await context.newPage();
    page.on("request",request=>{
      if(request.method()==="POST" &&
        /\/api\/holistic-support\/(?:voice|loved-voices)(?:[/?]|$)/.test(request.url()))
        providerPosts.push(request.url());
    });
    await page.goto(BASE+"/"+locale+"/holistic-support/voice-message",{
      waitUntil:"domcontentloaded",timeout:90000,
    });
    const guest=page.locator("[data-guest-voice-message]");
    await expect(guest).toBeVisible({timeout:25000});
    await expect(guest).toHaveAttribute("data-guest-voice-hydrated","true",{timeout:30000});
    const start=page.locator("[data-guest-message-start]");
    await expect(start).toBeDisabled();
    await expect(page.locator("[data-guest-message-consent]")).toHaveAttribute("aria-checked","false");
    const phrase=locale==="ru"?"Я рядом и поддерживаю тебя.":"I am here to support you.";
    await page.locator("[data-guest-message-phrase]").fill(phrase);
    await expect(page.locator("[data-guest-message-phrase]")).toHaveValue(phrase);
    const invitation=page.locator("[data-guest-message-link]");
    await expect(invitation).toBeVisible();
    const uri=new URL(await invitation.inputValue());
    assert.equal(uri.origin,new URL(BASE).origin);
    assert.equal(uri.search,"","the invited phrase must not enter server query or logs");
    assert.equal(uri.hash,"#t="+encodeURIComponent(phrase));
    await expect(page.locator("[data-guest-message-copy]")).toBeEnabled();
    await page.locator("[data-guest-message-phrase]").fill("https://invalid.example");
    await expect(page.locator("[data-guest-message-copy]")).toBeDisabled();
    await page.locator("[data-guest-message-phrase]").fill(phrase);
    // Native Safari implicit-label toggling failed on real macOS WebKit.
    // Check explicit user-triggered React consent and its revocation.
    const consentBox=page.locator("[data-guest-message-consent]");
    await expect(consentBox).toHaveAttribute("role","checkbox");
    await expect(consentBox).toHaveAttribute("aria-checked","false");
    // Mac WebKit is running as an emulated touch iPhone. Use an actual tap,
    // not desktop mouse click on a touch target. Capture events only for
    // non-sensitive CI diagnosis if the React toggle still does not update.
    await page.evaluate(()=>{
      const button=document.querySelector("[data-guest-message-consent]");
      const probe={clicks:0,touches:0};
      window.__guestConsentTapProbe=probe;
      button?.addEventListener("click",()=>{probe.clicks+=1;});
      button?.addEventListener("touchend",()=>{probe.touches+=1;});
    });
    await consentBox.tap();
    try{await expect(consentBox).toHaveAttribute("aria-checked","true",{timeout:10000});}
    catch(error){
      const observed=await page.evaluate(()=>({
        clicks:window.__guestConsentTapProbe?.clicks??null,
        touches:window.__guestConsentTapProbe?.touches??null,
        focused:document.hasFocus(),visible:document.visibilityState,
        value:document.querySelector("[data-guest-message-consent]")?.getAttribute("aria-checked")
      }));
      console.error("VOICE_GUEST_TOUCH_CONSENT_DIAG "+JSON.stringify(observed));
      throw error;
    }
    await expect(start).toBeEnabled();
    await consentBox.tap();
    await expect(consentBox).toHaveAttribute("aria-checked","false");
    await expect(start).toBeDisabled();
    await consentBox.tap();
    await expect(consentBox).toHaveAttribute("aria-checked","true");
    await expect(start).toBeEnabled();
    await expect(page.locator("[data-guest-message-play]")).toHaveCount(0);
    await expect(page.locator("[data-guest-message-save]")).toHaveCount(0);
    // The caller's consent is exercised while its tab has never left the foreground.
    // Only afterwards open the independent recipient and prove no consent inherits.
    const recipient=await context.newPage();
    try{
      await recipient.goto(uri.href,{waitUntil:"domcontentloaded",timeout:90000});
      await expect(recipient.locator("[data-guest-voice-message]")).toHaveAttribute("data-guest-voice-hydrated","true",{timeout:30000});
      await expect(recipient.locator("[data-guest-message-phrase]")).toHaveValue(phrase,{timeout:15000});
      await expect(recipient.locator("[data-guest-message-consent]")).toHaveAttribute("aria-checked","false");
      await expect(recipient.locator("[data-guest-message-start]")).toBeDisabled();
    }finally{await recipient.close();}
    assert.deepEqual(providerPosts,[],"guest invitation or consent cannot call a cloud TTS API");
  }finally{await context.close();}
}

// Linux WebKit often lacks Canvas capture codecs. Run the very same real
// encoded video+audio acceptance on macOS WebKit and Linux Chromium.
// The default still exercises BOTH engines for developer/manual runs.
const requestedEngine=process.env.HH_VOICE_E2E_ENGINE||"both";
assert.ok(["both","webkit","chromium"].includes(requestedEngine),"unknown test browser");
// Test a real native window/compositor on macOS WebKit only; Chromium stays headless.
// This flag never relaxes downloaded media, PCM, consent or privacy assertions.
const headedWebKit=requestedEngine==="webkit" && process.env.HH_VOICE_E2E_HEADED==="1";
if(process.env.HH_VOICE_E2E_HEADED==="1"){
  assert.equal(requestedEngine,"webkit","headed media acceptance is WebKit-only");
  assert.equal(process.platform,"darwin","headed WebKit acceptance requires macOS");
}
// Fail closed with evidence instead of consuming the entire macOS runner quota.
// Actual encoded 10-second voice video should not run indefinitely.
let lastPhase="not-started";
const phase=(engine,stage)=>{lastPhase=engine+":"+stage;console.log("VOICE_E2E_PHASE "+lastPhase);};
// A frozen WebKit renderer can make page.evaluate or browser.close wait forever.
// Playwright's default action timeout does NOT cover page.evaluate. Keep the
// real-media acceptance red, but surface the original recorder failure promptly.
const withDeadline=(work,ms,label)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error(label+" timed out after "+ms+"ms")),ms);
  Promise.resolve(work).then(
    value=>{clearTimeout(timer);resolve(value);},
    error=>{clearTimeout(timer);reject(error);}
  );
});
const watchdog=setTimeout(()=>{
  console.error("VOICE_E2E_WATCHDOG_TIMEOUT engine="+requestedEngine+" elapsed_seconds=360 last_phase="+lastPhase);
  process.exit(1);
},360000);
for(const [engine,browserType] of [["webkit",webkit],["chromium",chromium]]
  .filter(([name])=>requestedEngine==="both"||name===requestedEngine)) {
  phase(engine,"launch");
  const browser=await browserType.launch({headless:!(engine==="webkit" && headedWebKit)});
  try {
    const locale=engine==="webkit"?"ru":"en";
    phase(engine,"workspace-hydration");
    await verifyWorkspaceHydration(browser,locale);
    phase(engine,"guest-local-recording-invitation");
    await verifyGuestVoiceConsent(browser,locale);
    phase(engine,"guest-local-recording-invitation-passed");
    const context=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true,hasTouch:engine==="webkit",serviceWorkers:"block"});
    // Playwright has no default action timeout: an obscured iPhone control can
    // otherwise hang until the six-minute process watchdog with no locator.
    context.setDefaultTimeout(25000);
    context.setDefaultNavigationTimeout(90000);
    try{
      if(process.env.HH_VOICE_SKIP_GUIDED_PRACTICES==="1"){
        // The workflow runs dedicated consent-only WebKit acceptance separately.
        // Real encoded voice/video media acceptance continues below.
        phase(engine,"guided-practices-skipped-by-exact-ci-only-policy");
      }else{
        phase(engine,"guided-practices-mobile");
        await verifyGuidedPractices({browser,base:BASE,engine});
        phase(engine,"guided-practices-passed");
      }
      // Retain only the REAL File objects created by the browser's own
      // MediaRecorder. Reading blob: URLs through fetch can be blocked by
      // connect-src CSP even while native audio playback works correctly.
      await context.addInitScript(()=>{
        const originalCreate=URL.createObjectURL;
        const recordedFiles=new Map();
        const recordedVideos=new Map();
        window.__hhOwnVoiceFiles=recordedFiles;
        window.__hhRecordedVideoBlobs=recordedVideos;
        URL.createObjectURL=function(blob){
          const uri=originalCreate.call(URL,blob);
          if(blob instanceof File && /^holistic-house-voice-\d+\.(?:m4a|webm)$/.test(blob.name))
            recordedFiles.set(uri,blob);
          if(blob instanceof Blob && blob.type.startsWith("video/"))recordedVideos.set(uri,blob);
          return uri;
        };
      });
      const page=await context.newPage();
      const payloads=[];
      const errors=[];
      const requests=[];
      page.on("request",req=>{if(req.url().includes("/api/holistic-support/voice"))requests.push({method:req.method(),url:req.url()});});
      page.on("requestfailed",req=>{if(req.url().includes("/api/holistic-support/voice"))errors.push("network:"+req.method()+":"+req.failure()?.errorText);});
      page.on("pageerror",e=>errors.push(e.message));
      page.on("console",msg=>{
        const code=msg.text();
        if(code.startsWith("HH_WEBKIT_MP4_EXPORT_FAILURE:"))errors.push(code);
      });
      page.on("crash",()=>phase(engine,"page-crashed"));
      // Single permanent fixture route. Dynamically refuse only Sofia while
      // testing provider errors; stacking/unrouting Playwright handlers can
      // leave the following REAL browser affirmation POST unmatched in WebKit.
      let rejectSofiaSample=false;
      await page.route("**/api/holistic-support/voice",async route=>{
        const req=route.request();
        if(req.method()==="GET"){
          await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({enabled:true,publicAffirmationsEnabled:true,languages:["ru","en","es"]})});
          return;
        }
        const body=req.postDataJSON();
        if(rejectSofiaSample && body?.mode==="sample" && body?.voiceId==="sofia"){
          await route.fulfill({status:503,contentType:"application/json",
            body:JSON.stringify({error:"TTS_PROVIDER_UNAVAILABLE"})});
          return;
        }
        payloads.push(body);
        await route.fulfill({status:200,contentType:"audio/wav",body:wav()});
      });
      phase(engine,"navigate");
      await page.goto(BASE+"/"+locale+"/holistic-support/mandala",{waitUntil:"domcontentloaded",timeout:90000});
      await page.locator("[data-video-quick-builder]").waitFor({state:"visible",timeout:25000});
      // Next renders the workspace tabs before client event handlers hydrate.
      // On Safari an early click can be swallowed and leave Montage hidden.
      await page.locator('[data-video-studio-hydrated="true"]').waitFor({state:"attached",timeout:35000});
      phase(engine,"editor-ready");
      // A real visitor sets duration using Montage → Music, then moves to
      // Phrases. The retired Video quick-audio disclosure is intentionally
      // hidden by the canonical six-workspace layout: do not bypass its CSS.
      const editorTab=page.locator('[data-video-quick-control="editor"]');
      await editorTab.click();
      await expect(editorTab).toHaveAttribute("aria-pressed","true",{timeout:15000});
      // Montage opens on the Style tab, not the retired Concept screen.
      const montageStyleTab=page.locator('[data-video-montage-tab="effects"]');
      await expect(montageStyleTab)
        .toHaveAttribute("aria-pressed","true",{timeout:15000});
      await expect(montageStyleTab).toBeVisible();
      await montageStyleTab.click();
      await expect(montageStyleTab).toHaveAttribute("aria-pressed","true",{timeout:15000});
      // Three in-card choices and no duplicate two-button offer below.
      const montageProTab=page.locator('[data-video-montage-tab="promo"]');
      const montageStoryTab=page.locator('[data-video-montage-tab="concept"]');
      const order=await page.locator('[data-video-montage-tools] [data-video-montage-tab]')
        .evaluateAll(items=>items.map(item=>item.getAttribute("data-video-montage-tab")));
      assert.deepEqual(order,["effects","audio","text","concept","promo"]);
      await montageStoryTab.click();
      await expect(montageStoryTab).toHaveAttribute("aria-pressed","true");
      await expect(page.locator('[data-video-auto-storyboard-list]')).toBeVisible({timeout:20000});
      let sourceReady=await page.locator('[data-video-auto-storyboard]')
        .getAttribute('data-storyboard-media-ready')==='true';
      const chooseQuality=page.locator('[data-video-story-select-quality]');
      await expect(chooseQuality).toBeVisible();
      await expect(chooseQuality).toBeEnabled();
      // Before an ACTUAL MP4 + voice export, explicitly approve all six
      // source-checked reference photos as a symbolic photomontage. Merely
      // choosing Quality is not informed approval and must stay fail-closed.
      let explicitlyApprovedPhotos=false;
      const approveSixPhotos=page.locator('[data-storyboard-apply-reference-photos]');
      if(!sourceReady&&await approveSixPhotos.count()){
        await expect(approveSixPhotos).toBeEnabled({timeout:30000});
        await approveSixPhotos.click();
        await expect(montageProTab).toHaveAttribute('aria-pressed','true',{timeout:15000});
        sourceReady=true;
        explicitlyApprovedPhotos=true;
        phase(engine,'story-six-user-approved-photo-references');
      }
      if(!explicitlyApprovedPhotos){
        if(engine==='webkit')await chooseQuality.tap();
        else await chooseQuality.click();
        if(!sourceReady){
          // Unapproved Story cannot be exported, even by the PRO/Ready path.
          await expect(montageStoryTab).toHaveAttribute('aria-pressed','true');
          await expect(page.locator('[data-video-basic-editor]'))
            .toHaveAttribute('data-montage-panel','concept');
          // Extra is a separate choice and not proof of photo consent.
          await montageProTab.click();
        }
      }
      await expect(montageProTab).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('[data-video-basic-editor]'))
        .toHaveAttribute('data-montage-panel','promo');
      if(!sourceReady)await expect(page.locator('[data-video-montage-pro-offer]')).toBeVisible();
      const montageProOffer=page.locator('[data-video-montage-pro-offer]');
      await expect(montageProOffer).toBeVisible();
      await expect(montageProOffer.locator('[data-video-pro-feature]')).toHaveCount(3);
      await expect(montageProOffer.locator('[data-video-montage-pro-choice]')).toHaveCount(3);
      for(const width of [320,390,430]){
        await page.setViewportSize({width,height:844});
        const geometry=await page.evaluate(()=>({
          viewport:document.documentElement.clientWidth,
          document:document.documentElement.scrollWidth,
          lastCardBottom:document.querySelector('[data-video-pro-feature="cinematic"]')?.getBoundingClientRect().bottom
        }));
        assert.ok(geometry.document<=geometry.viewport+2,
          'MONTAGE_PRO_NO_HORIZONTAL_OVERFLOW_'+width+' '+JSON.stringify(geometry));
        assert.ok(typeof geometry.lastCardBottom==="number"&&geometry.lastCardBottom<844-65,
          'MONTAGE_PRO_LAST_CARD_VISIBLE_'+width+' '+JSON.stringify(geometry));
      }
      await page.setViewportSize({width:390,height:844});
      // Free is verified by a real encoded export later in this same test.
      // Don't start a second chargeable render just to test navigation here.
      await expect(montageProOffer.locator('[data-video-montage-pro-choice="free"]')).toBeEnabled();
      await montageProOffer.locator('[data-video-montage-pro-choice="character"]').click();
      await expect(page.locator('[data-video-quick-control="effects"]')).toHaveAttribute('aria-pressed','true');
      await editorTab.click();await montageProTab.click();
      await montageProOffer.locator('[data-video-montage-pro-choice="cinematic"]').click();
      await expect(page.locator('[data-video-quick-control="pro"]')).toHaveAttribute('aria-pressed','true');
      await editorTab.click();await montageStyleTab.click();
      await expect(montageStyleTab).toHaveAttribute('aria-pressed','true');
      phase(engine,"montage-pro-offer-routes-passed");
      // Reproduce the owner's iPhone case before recording real voice.
      const selectedStyle=page.locator('[data-video-montage-style="3"]');
      const selectedMaster=page.locator("[data-mandala-master-mp4]");
      await expect(selectedStyle).toBeVisible();
      const singleVideoMaster=await selectedMaster.count()>0;
      if(singleVideoMaster)
        await expect(selectedMaster).toHaveAttribute("preload","none");
      else
        await expect(page.locator("[data-free-film-original-masters]")).toHaveCount(1);
      // Six user-approved photos use the existing compiled multi-shot Canvas,
      // not the retired single background MP4. Still exercise an actual Style
      // tap and the same later audible Safari export on this selected source.
      if(engine==="webkit")await selectedStyle.tap();
      else await selectedStyle.click();
      await expect(selectedStyle).toHaveAttribute("aria-pressed","true");
      await expect(page.locator("[data-video-mandala-hero]")).toHaveAttribute("data-video-preview-style","minimal");
      if(singleVideoMaster)
        await expect.poll(()=>selectedMaster.evaluate(video=>video.preload),{timeout:15000}).toBe("auto");
      else
        await expect(page.locator("[data-free-film-original-masters]")).toHaveCount(1);
      // Modern Montage shows the voice and music controls only after choosing Audio.
      // Exercise the real visible tab instead of waiting for an unmounted drawer.
      // Current Montage has four compact tabs. Real duration is under Settings
      // and current sound/library controls are in the independent Audio tab.
      await openMontageSettingsViaQuality(page);
      await expect(page.locator('[data-video-basic-editor]')).toHaveAttribute("data-montage-panel","settings");
      const durationSelect=page.locator('[data-video-montage-preference="duration"]');
      await durationSelect.waitFor({state:"visible",timeout:25000});
      // Six reviewed, user-approved 5-second photographic scenes form a
      // 30-second Story. Changing it to 10 seconds invalidates that consent
      // and correctly fails closed at Ready. Keep the real source duration
      // while testing the native audible WebKit MP4 encoder.
      await durationSelect.selectOption("30");
      await expect(durationSelect).toHaveValue("30");
      const montageAudio=page.locator('[data-video-montage-open-audio]');
      if(engine==="webkit")await montageAudio.tap();
      else await montageAudio.click();
      await expect(page.locator('[data-video-basic-editor]'))
        .toHaveAttribute("data-montage-panel","audio",{timeout:15000});
      // Two native paint frames catch WebKit's delayed compatibility click:
      // it must not ghost-activate the Audio → Text footer after this tap.
      await page.evaluate(()=>new Promise(resolve=>
        requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await expect(page.locator('[data-video-basic-editor]')).toHaveAttribute("data-montage-panel","audio");
      await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
      const compactGrid=page.locator('[data-video-audio-compact-grid]');
      await expect(compactGrid).toBeVisible();
      // Initial filter follows the approved video concept; choose All to
      // inspect the entire approved collection, then prove Focus narrows it.
      const allMusic=page.locator('[data-video-audio-category="all"]');
      const focusMusic=page.locator('[data-video-audio-category="focus"]');
      await allMusic.click();
      await expect(allMusic).toHaveAttribute("aria-pressed","true");
      await expect(compactGrid.locator('[data-video-audio-compact-track]')).toHaveCount(5);
      await focusMusic.click();
      await expect(focusMusic).toHaveAttribute("aria-pressed","true");
      await expect(compactGrid.locator('[data-video-audio-compact-track]')).toHaveCount(1);
      await allMusic.click();
      await expect(compactGrid.locator('[data-video-audio-compact-track]')).toHaveCount(5);
      await expect(page.locator('[data-video-audio-compact-upload]')).toHaveCount(1);
      await expect(page.locator('[data-video-audio-mode]')).toHaveCount(0);
      await page.locator('[data-video-audio-compact-silent]').click();
      const choices=compactGrid.locator('[data-video-audio-compact-select]');
      await choices.nth(0).click();
      await choices.nth(1).click();
      await expect(choices.nth(0)).toHaveAttribute("aria-pressed","true");
      await expect(choices.nth(1)).toHaveAttribute("aria-pressed","true");
      await expect(page.locator('[data-video-audio-compact-selected]')).toContainText("2/3");
      await expect(page.locator('[data-video-stage-actions="montage"] [data-video-quick-generate]')).toBeVisible();
      // Real DOM geometry of the owner-approved Audio first-fold layout.
      // Two actions share one row, Create is the outlined LEFT choice, Text the
      // emerald RIGHT choice. A short horizontal music rail must never push
      // the footer into a second tall section or cause page-wide x-overflow.
      for(const width of [320,354,390,430]){
        await page.setViewportSize({width,height:840});
        const audioLayout=await page.evaluate(()=>{
          const audio=document.querySelector('[data-video-montage-audio]');
          const actions=document.querySelector('[data-video-stage-actions="montage"]');
          const create=actions?.querySelector('[data-video-quick-generate]');
          const next=actions?.querySelector('[data-video-montage-next="text"]');
          const tile=audio?.querySelector('[data-video-audio-compact-track]');
          if(!audio||!actions||!create||!next||!tile)return null;
          const a=audio.getBoundingClientRect(),f=actions.getBoundingClientRect();
          const c=create.getBoundingClientRect(),n=next.getBoundingClientRect();
          const t=tile.getBoundingClientRect();
          return {span:f.bottom-a.top,tileHeight:t.height,
            createLeft:c.left,createTop:c.top,createWidth:c.width,
            nextLeft:n.left,nextTop:n.top,nextWidth:n.width,
            documentWidth:document.documentElement.scrollWidth,
            viewportWidth:document.documentElement.clientWidth};
        });
        assert.ok(audioLayout&&audioLayout.span<570,
          'AUDIO_COMPACT_FIRST_FOLD_SPAN_'+width+' '+JSON.stringify(audioLayout));
        assert.ok(audioLayout.tileHeight<=86&&audioLayout.tileHeight>=70,
          'AUDIO_COMPACT_TRACK_HEIGHT_'+width+' '+JSON.stringify(audioLayout));
        assert.ok(audioLayout.createLeft<audioLayout.nextLeft&&
          Math.abs(audioLayout.createTop-audioLayout.nextTop)<=3&&
          audioLayout.createWidth>=90&&audioLayout.nextWidth>=90,
          'AUDIO_TWO_ACTIONS_CREATE_LEFT_TEXT_RIGHT_'+width+' '+JSON.stringify(audioLayout));
        assert.ok(audioLayout.documentWidth<=audioLayout.viewportWidth+2,
          'AUDIO_NO_PAGE_OVERFLOW_'+width+' '+JSON.stringify(audioLayout));
      }
      await page.setViewportSize({width:390,height:840});
      await page.locator('[data-video-audio-compact-silent]').click();
      await page.locator('[data-video-quick-control="phrases"]').click();
      const phrases=page.locator('[data-workspace-section="phrases"][data-video-quick-phrases]');
      await phrases.waitFor({state:"visible"});
      // Ideas has three tabs. Voice and My Voice remain visible opt-in submodes.
      const ideasModes=phrases.locator("[data-video-ideas-tabs]");
      await expect(ideasModes).toBeVisible();
      const goalTab=ideasModes.locator('[data-video-ideas-tab="goal"]');
      const personalTab=ideasModes.locator('[data-video-ideas-tab="personalization"]');
      const conceptTab=ideasModes.locator('[data-video-ideas-tab="concept"]');
      await expect(goalTab).toHaveAttribute("aria-pressed","true");
      await expect(personalTab).toBeDisabled();
      await expect(conceptTab).toBeDisabled();
      const goalPane=phrases.locator("[data-video-ideas-goal-panel]");
      await expect(goalPane).toBeVisible();
      const goalCards=goalPane.locator("[data-video-ideas-goal-choice]");
      await expect(goalCards).toHaveCount(3);
      await expect(goalCards.nth(0)).toHaveAttribute("data-video-ideas-goal-choice","rest");
      await expect(goalCards.nth(1)).toHaveAttribute("data-video-ideas-goal-choice","accept");
      await expect(goalCards.nth(2)).toHaveAttribute("data-video-ideas-goal-choice","reframe");
      const chooseScenario=goalPane.locator("[data-video-ideas-goal-next]");
      await expect(chooseScenario).toBeDisabled();
      // Support requires current feeling, desired feeling, requested support,
      // current energy and optionally a name, but never a meaning-axis question.
      await goalCards.nth(1).click();
      await expect(goalCards.nth(1)).toHaveAttribute("aria-pressed","true");
      await chooseScenario.click();
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-video-ideas-personalization-panel]")).toBeVisible();
      await expect(phrases.locator("[data-personalization-kind]")).toHaveCount(5);
      const preferredName=locale==="ru"?"Андрей":locale==="es"?"Andrés":"Andy";
      const personalClosing=locale==="ru"?"Андрей, я в тебя верю":
        locale==="es"?"Andrés, creo en ti":"Andy, I believe in you";
      const personalQuiz=phrases.locator("[data-video-personalization]");
      const nextQuiz=personalQuiz.locator("[data-video-personalization-clarify-continue]");
      const backQuiz=personalQuiz.locator("[data-video-personalization-clarify-back]");
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-goal","support");
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-step","1");
      await expect(phrases.locator('[data-personalization-kind="current"]')).toBeVisible();
      await expect(phrases.locator('[data-personalization-kind="desired"]')).toBeHidden();
      await expect(phrases.locator('[data-personalization-kind="strength"]')).toBeHidden();
      await expect(nextQuiz).toHaveCount(0);
      await personalQuiz.locator('[data-video-personalization-choice="current-tension"]').click();
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-step","2");
      await expect(phrases.locator('[data-personalization-kind="desired"]')).toBeVisible();
      await expect(personalQuiz.locator('[data-video-personalization-choice="current-tension"]'))
        .toHaveAttribute("aria-pressed","true");
      await personalQuiz.locator('[data-video-personalization-choice="desired-safe"]').click();
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-step","3");
      await expect(phrases.locator('[data-personalization-kind="support"]')).toBeVisible();
      const supportNeeds=personalQuiz.locator('[data-video-personalization-support-need]');
      await expect(supportNeeds).toHaveCount(6);
      await personalQuiz.locator('[data-video-personalization-support-need="love"]').click();
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-step","4");
      const currentEnergy=personalQuiz.locator('[data-video-personalization-energy-options="current"]');
      await expect(currentEnergy).toBeVisible();
      await expect(currentEnergy.locator("button")).toHaveCount(10);
      // All numerical choices must fit a real narrow iPhone width.
      for(const width of [320,354,390,430]){
        await page.setViewportSize({width,height:840});
        const geometry=await currentEnergy.evaluate(grid=>{
          const rect=grid.getBoundingClientRect();
          const buttons=[...grid.querySelectorAll("button")].map(button=>button.getBoundingClientRect());
          return {count:buttons.length,minWidth:Math.min(...buttons.map(b=>b.width)),
            minHeight:Math.min(...buttons.map(b=>b.height)),
            rightMost:Math.max(...buttons.map(b=>b.right)),gridRight:rect.right};
        });
        assert.equal(geometry.count,10,"Ten score buttons "+width);
        assert.ok(geometry.minWidth>=44&&geometry.minHeight>=44,"Energy touch targets "+width+" "+JSON.stringify(geometry));
        assert.ok(geometry.rightMost<=geometry.gridRight+2,"Energy grid fits iPhone "+width+" "+JSON.stringify(geometry));
      }
      await page.setViewportSize({width:390,height:840});
      await currentEnergy.locator('[data-video-personalization-energy="3"]').click();
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-step","5");
      await expect(currentEnergy.locator('[data-video-personalization-energy="3"]'))
        .toHaveAttribute("aria-pressed","true");
      const firstNameInput=phrases.locator("[data-video-personalization-name]");
      await expect(firstNameInput).toBeVisible();
      await firstNameInput.fill(preferredName);
      await backQuiz.click();
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-step","4");
      await currentEnergy.locator('[data-video-personalization-energy="4"]').click();
      await expect(personalQuiz).toHaveAttribute("data-video-personalization-step","5");
      await expect(firstNameInput).toHaveValue(preferredName);
      await nextQuiz.click();
      await expect(conceptTab).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-video-ideas-concept-panel]")).toBeVisible();
      await personalTab.click();
      const advancedText=phrases.locator('[data-video-phrase-audio-shortcut]');
      await expect(advancedText).toBeVisible();
      await advancedText.click();
      const advancedVoice=phrases.locator('[data-video-ideas-advanced-voice]');
      await expect(advancedVoice).toHaveAttribute("open","");
      const voiceModeButton=phrases.locator('[data-video-ideas-voice-mode="voice"]');
      const myVoiceModeButton=phrases.locator('[data-video-ideas-voice-mode="my-voice"]');
      await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-hypno-voice]")).toBeVisible();
      // Own-file upload belongs only to the explicit My Voice mode, not standard Voice.
      await expect(phrases.locator("[data-video-ideas-own-upload]")).toHaveCount(0);
      await expect(phrases.locator('[data-video-affirmation-gender="male"]')).toBeVisible();
      const compactVoicePanel=phrases.locator('[data-video-affirmation-voice][data-voice-layout="compact"]');
      await expect(compactVoicePanel).toBeVisible();
      await expect(compactVoicePanel.locator('[data-video-affirmation-phrase]')).toBeVisible();
      await expect(compactVoicePanel.locator('[data-video-affirmation-selection-summary]')).toHaveCount(0);
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-consent]')).toHaveCount(1);
      for(const width of [320,354,390,430]){
        phase(engine,"ideas-voice-compact-"+width);
        await page.setViewportSize({width,height:840});
        const shape=await compactVoicePanel.evaluate(panel=>{
          const cards=[...panel.querySelectorAll('[data-video-affirmation-voice-card]')].filter(n=>n.getBoundingClientRect().width>0);
          const genders=[...panel.querySelectorAll('[data-video-affirmation-gender]:not([hidden])')].map(n=>n.getBoundingClientRect());
          return {tops:cards.map(n=>n.getBoundingClientRect().top),widths:cards.map(n=>n.getBoundingClientRect().width),
            genders:genders.map(n=>n.top),
            sampleBottom:panel.querySelector('[data-video-affirmation-voice-select]')?.getBoundingClientRect().bottom,
            consentTop:panel.querySelector('[data-video-affirmation-voice-consent]')?.getBoundingClientRect().top,
            choiceTop:panel.querySelector('[data-video-affirmation-voice-select]')?.getBoundingClientRect().top,
            action:panel.querySelector('[data-video-generate-affirmation-audio]')?.getBoundingClientRect().top,
            doc:document.documentElement.scrollWidth,screen:document.documentElement.clientWidth};
        });
        assert.equal(shape.widths.length,3,"3 voice cards "+width);
        assert.ok(shape.widths.every(x=>x>=60),"readable cards "+width+" "+JSON.stringify(shape));
        assert.ok(shape.tops.every(x=>Math.abs(x-shape.tops[0])<3),"one card row "+width);
        assert.ok(shape.genders.length===3&&shape.genders.every(x=>Math.abs(x-shape.genders[0])<3),"female/male/Fish filters on one row "+width);
        assert.ok(shape.consentTop<shape.choiceTop,"explicit consent precedes voice cards "+width);
        assert.ok(shape.action>=shape.sampleBottom&&shape.action-shape.sampleBottom<32,
          "generation follows voice sample "+width);
        assert.ok(shape.doc<=shape.screen+2,"no horizontal overflow "+width);
        if(engine==="chromium"){mkdirSync("artifacts/hypno-compact",{recursive:true});
          await page.screenshot({path:"artifacts/hypno-compact/ideas-voice-"+locale+"-"+width+".png",fullPage:true});}
      }
      await page.setViewportSize({width:390,height:840});
      // Same original selector is mounted in Therapy -> Voice. Both real
      // Fish reference IDs must appear even when the API is still on hold.
      const fishTab=compactVoicePanel.locator('[data-video-affirmation-gender="fish"]');
      await expect(fishTab).toBeVisible();
      if(engine==="webkit")await fishTab.tap();
      else await fishTab.click();
      await expect(fishTab).toHaveAttribute("aria-pressed","true");
      const rolePicker=compactVoicePanel.locator('[data-fish-voice-purpose]');
      await expect(rolePicker).toBeVisible();
      const coachingRole=rolePicker.locator('[data-fish-purpose="coaching"]');
      const meditationRole=rolePicker.locator('[data-fish-purpose="meditation"]');
      await expect(coachingRole).toBeVisible();
      await expect(meditationRole).toBeVisible();
      if(engine==="webkit")await coachingRole.tap(); else await coachingRole.click();
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-card^="fish-"]')).toHaveCount(4);
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-card="fish-igor"]')).toBeVisible();
      if(engine==="webkit")await meditationRole.tap(); else await meditationRole.click();
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-card^="fish-"]')).toHaveCount(2);
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-card="fish-selene"]')).toBeVisible();
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-card="fish-calm-meditation"]')).toBeDisabled();
      await expect(compactVoicePanel.locator('[data-voice-fish-status]')).toBeVisible();
      for(const item of await compactVoicePanel.locator('[data-video-affirmation-voice-preview^="fish-"]').all())
        await expect(item).toBeDisabled();
      await expect(compactVoicePanel.locator('[data-video-generate-affirmation-audio]')).toBeDisabled();
      await compactVoicePanel.locator('[data-video-affirmation-gender="female"]').click();
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-card="maya"]')).toBeVisible();
      await myVoiceModeButton.click();
      await expect(myVoiceModeButton).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-video-ideas-own-upload]")).toHaveCount(1);
      await expect(phrases.locator("[data-video-ideas-record-voice]")).toHaveCount(1);
      await expect(phrases.locator("[data-video-own-voice-record]")).toBeVisible();
      await expect(phrases.locator("[data-video-generate-affirmation-audio]")).toHaveCount(0);
      await expect(phrases.locator('[data-video-affirmation-voice-card="maya"]')).toBeHidden();
      // Change back to the standard voice while its controls are visible,
      // then return to Personalization for the phrase and idea review.
      await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      await personalTab.click();
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-video-ideas-personalization-panel]")).toBeVisible();
      // Owner-approved Phrases: measure the actual DOM in three iPhone widths.
      // These checks fail on double-row tabs, a tall portrait player or overflow.
      for(const width of [320,390,430]){
        phase(engine,"phrases-geometry-"+width);
        await page.setViewportSize({width,height:840});
        const measured=await page.evaluate(()=>{
          const nav=document.querySelector("[data-video-quick-controls]");
          const photo=document.querySelector("[data-video-ideas-photo]");
          const movie=document.querySelector("[data-video-player-with-controls]");
          const tabsBar=document.querySelector("[data-video-ideas-tabs]");
          const quiz=document.querySelector("[data-video-personalization]");
          if(!nav||!photo||!movie||!tabsBar||!quiz)return null;
          const tabs=[...nav.querySelectorAll("button")].map(node=>{
            const rect=node.getBoundingClientRect();
            return {top:rect.top,bottom:rect.bottom};
          });
          const img=photo.querySelector("img");
          const rect=photo.getBoundingClientRect();
          return {tabs,navBottom:nav.getBoundingClientRect().bottom,
            photoTop:rect.top,photoBottom:rect.bottom,photoWidth:rect.width,
            photoHeight:rect.height,photoVisible:getComputedStyle(photo).display!=="none",
            movieHidden:getComputedStyle(movie).display==="none",
            source:img?.getAttribute("src"),
            ideasTabsTop:tabsBar.getBoundingClientRect().top,
            quizTop:quiz.getBoundingClientRect().top,
            documentWidth:document.documentElement.scrollWidth,
            viewportWidth:document.documentElement.clientWidth};
        });
        assert.ok(measured,"photo/quiz/tab nodes present: "+width);
        assert.equal(measured.tabs.length,6,"six workspace tabs: "+width);
        assert.ok(measured.tabs.every(t=>Math.abs(t.top-measured.tabs[0].top)<3),
          "single row of six workspace tabs: "+width+" "+JSON.stringify(measured));
        assert.ok(measured.navBottom<=measured.photoTop+2,
          "workspace tabs above still photo: "+width+" "+JSON.stringify(measured));
        assert.ok(measured.photoVisible&&measured.movieHidden&&
          measured.photoWidth>=260&&measured.photoHeight>=100,
          "real static photo replaces Ideas player: "+width+" "+JSON.stringify(measured));
        assert.equal(measured.source,"/images/holistic-house/support-mock-hero.webp",
          "one first-party photo rather than remote media");
        assert.ok(measured.photoBottom<=measured.ideasTabsTop+2&&
          measured.ideasTabsTop<=measured.quizTop,
          "Photo → Personalization/Goal/Scenario tabs → active question: "+width+" "+JSON.stringify(measured));
        assert.ok(measured.documentWidth<=measured.viewportWidth+2,
          "one-screen Ideas must not overflow horizontally: "+width+" "+JSON.stringify(measured));
        if(engine==="chromium"){
          mkdirSync("artifacts/hypno-compact",{recursive:true});
          await page.screenshot({path:"artifacts/hypno-compact/phrases-"+locale+"-"+width+".png",fullPage:true});
        }
      }
      await page.setViewportSize({width:390,height:840});
      // The original voice editor was opened by the real opt-in gesture above.
      await expect(advancedVoice).toHaveAttribute("open","");
      // Preserve the user's real touch path through Montage → Text.
      await openVisibleMontageText(page,engine);
      await expect(page.locator('[data-video-montage-tab="text"]')).toHaveAttribute("aria-pressed","true");
      await expect(page.locator('[data-video-montage-text]')).toBeVisible();
      const montageIdeas=page.locator('[data-video-montage-text] [data-video-ideas-compact]');
      await expect(montageIdeas).toBeVisible();
      // The proposed closing is actually included among the selected captions
      // fed to Canvas and export, not merely visible as an unselected suggestion.
      const selectedClosing=montageIdeas.locator("[data-video-idea-phrase]").last();
      await expect(selectedClosing).toContainText(personalClosing);
      await expect(selectedClosing.locator("[data-video-idea-select]"))
        .toHaveAttribute("aria-pressed","true");
      const montageCountLabel=montageIdeas.locator('[data-video-ideas-selected-count]');
      await expect(montageCountLabel).toBeVisible();
      const initialMontageCount=Number(((await montageCountLabel.innerText()).match(/^\s*(\d+)/)||[])[1]||0);
      assert.ok(initialMontageCount>=5,"Montage Text starts with at least five selected phrases");
      const firstIdea=montageIdeas.locator('[data-video-idea-select="0"]');
      await expect(firstIdea).toHaveAttribute("aria-pressed","true");
      // The real text editor owns phrase choice: deselecting the first phrase
      // drops below the minimum; restoring it returns the editor to a valid state.
      await firstIdea.click();
      await expect(firstIdea).toHaveAttribute("aria-pressed","false");
      await expect(montageCountLabel).toHaveText(new RegExp("^\\s*"+(initialMontageCount-1)+"\\s*/\\s*\\d+\\b"));
      await expect(montageIdeas.locator("[data-video-ideas-minimum]")).toBeVisible();
      await firstIdea.click();
      await expect(firstIdea).toHaveAttribute("aria-pressed","true");
      await expect(montageCountLabel).toHaveText(new RegExp("^\\s*"+initialMontageCount+"\\s*/\\s*\\d+\\b"));
      await expect(montageIdeas.locator("[data-video-ideas-minimum]")).toHaveCount(0);
      const recordEntry=page.locator('[data-video-montage-text] [data-video-ideas-record]');
      await expect(recordEntry).toBeVisible();
      await recordEntry.click();
      await expect(advancedVoice).toBeVisible({timeout:15000});
      await expect(advancedVoice).toHaveAttribute("open","");
      await expect(myVoiceModeButton).toHaveAttribute("aria-pressed","true",{timeout:15000});
      await expect(page.locator('[data-video-own-voice-record]')).toBeVisible();
      // My Voice is deliberately only a recorder/uploader. For phrase
      // fine-tuning the visitor returns to Text and opens its visible advanced
      // shortcut: never click controls hidden beneath another tab.
            await personalTab.click();
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
      // Switching back from Montage returns to Personalization with the
      // advanced disclosure collapsed. Reopen it through the same visible
      // shortcut a visitor uses before choosing the standard voice mode.
      await expect(advancedText).toBeVisible();
      await advancedText.click();
      await expect(advancedVoice).toBeVisible({timeout:15000});
      await expect(advancedVoice).toHaveAttribute("open","");
      // On a mobile WebKit handoff, verify the actual user touch interaction.
      // Keep the same strict selected-state assertion: do not bypass the control.
      await expect(voiceModeButton).toBeVisible();
      if(engine==="webkit")await voiceModeButton.tap();
      else await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
            // Voice mode intentionally hides the separate personal-intention editor;
      // that content belongs to Personalization and phrase editing belongs to
      // Montage → Text. Keep this voice-only panel focused on approved speech.
      const intentDetails=phrases.locator('[data-hypno-idea-details]');
      await expect(intentDetails).toBeHidden();
      await expect(phrases.locator('[data-video-ideas-personalization-panel]')).toBeVisible();
      await expect(phrases.locator('[data-ideas-subtab="voice"] [data-hypno-select-tone]')).toBeHidden();
      const voicePhraseSelect=compactVoicePanel.locator("[data-video-affirmation-phrase]");
      await expect(voicePhraseSelect).toBeVisible();
      assert.ok(await voicePhraseSelect.locator("option").count()>=3,
        "compact voice exposes approved phrase choices and All");
      await voicePhraseSelect.selectOption("1");
      await expect(voicePhraseSelect).toHaveValue("1");
      await voicePhraseSelect.selectOption("all");
      await expect(voicePhraseSelect).toHaveValue("all");
      await expect(compactVoicePanel.locator('[data-video-affirmation-transcript-review]')).toHaveCount(1);
      await expect(page.locator("[data-hypno-pending]")).toHaveCount(0);
      await expect(page.locator("[data-video-voice-approval-required]")).toHaveCount(0);
      // iPhone WebKit dispatches native taps; a synthetic click can lose the
      // React gender-filter update during the Voice/My Voice handoff.
      if(engine==="webkit")await voiceModeButton.tap();
      else await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      const chooserPending=page.locator("[data-video-affirmation-voice-select]");
      const maleGender=chooserPending.locator('[data-video-affirmation-gender="male"]');
      await expect(maleGender).toBeEnabled();
      if(engine==="webkit")await maleGender.tap();
      else await maleGender.click();
      await expect(maleGender).toHaveAttribute("aria-pressed","true");
      const leonCard=chooserPending.locator('[data-video-affirmation-voice-card="leon"]');
      await expect(leonCard).toBeVisible();
      if(engine==="webkit")await leonCard.tap();
      else await leonCard.click();
      await expect(chooserPending.locator('[data-video-affirmation-voice-card="leon"]')).toHaveAttribute("aria-pressed","true");
      const previewButton=chooserPending.locator('[data-video-affirmation-voice-preview="leon"]');
      await expect(previewButton).toBeEnabled();
      await previewButton.click();
      await expect(page.locator('[data-video-affirmation-sample-ready] audio')).toBeVisible({timeout:30000});
      const preview=payloads.find(item=>item.mode==="sample"&&item.voiceId==="leon");
      assert.ok(preview,"actual male sample request reaches the TTS route");
      assert.equal(preview.language,locale);
      assert.ok(!("text" in preview)&&!("consent" in preview),"fixed public samples contain no private script");
      // Safari blocks autoplay after network completion. A second real tap
      // must directly invoke native play() on the cached WAV, without TTS.
      await expect(previewButton).toHaveAttribute("aria-busy","false");
      await page.evaluate(()=>{
        const el=document.querySelector('[data-video-affirmation-sample-ready] audio');
        window.__hhPreviewReplayCount=0;
        el.play=()=>{window.__hhPreviewReplayCount++;return Promise.resolve();};
      });
      const beforeReplay=payloads.length;
      await previewButton.click();
      await expect.poll(()=>page.evaluate(()=>window.__hhPreviewReplayCount)).toBe(1);
      assert.equal(payloads.length,beforeReplay,"replay must not spend a second free TTS request");
      await chooserPending.locator('[data-video-affirmation-gender="female"]').click();
      await expect(page.locator("[data-video-affirmation-sample-ready]")).toHaveCount(0);
      await expect(chooserPending.locator('[data-video-affirmation-voice-card="maya"]')).toHaveAttribute("aria-pressed","true");
      // A refused provider response must release all three choices and show
      // the failure, rather than leaving the screenshot's frozen Loading UI.
      rejectSofiaSample=true;
      const sofiaPreview=chooserPending.locator('[data-video-affirmation-voice-preview="sofia"]');
      await sofiaPreview.click();
      await expect(sofiaPreview).toHaveAttribute("aria-busy","false",{timeout:10000});
      await expect(chooserPending.locator('[data-video-affirmation-voice-preview="maya"]')).toBeEnabled();
      await expect(page.locator('[data-video-affirmation-voice-select] [role="status"]'))
        .toContainText(locale==="ru"?"Не удалось прослушать":"Could not load");
      rejectSofiaSample=false;
      await expect(page.locator("[data-video-generate-affirmation-audio]")).toBeDisabled();
      // The live editor commits phrase selection in Montage → Text. Voice has
      // no second Hypno approval control; keep this separate from TTS consent.
      await personalTab.click();
      await expect(advancedVoice).toHaveAttribute("open","");
      await expect(advancedText).toBeVisible();
      await expect(intentDetails).toBeHidden();
      await expect(page.locator("[data-hypno-approve]")).toBeHidden();
      await expect(page.locator("[data-hypno-pending]")).toHaveCount(0);
      await expect(page.locator("[data-video-voice-approval-required]")).toHaveCount(0);
      await voiceModeButton.click();
      await page.locator("[data-video-affirmation-voice]").waitFor({state:"visible"});
      // Record two independent browser-local tracks using the real
      // MediaRecorder and a deterministic WebAudio microphone fixture.
      await myVoiceModeButton.click();
      await expect(myVoiceModeButton).toHaveAttribute("aria-pressed","true");
      const ownPanel=page.locator("[data-video-own-voice]");
      await expect(ownPanel).toBeVisible();
      await expect(page.locator('[data-video-affirmation-voice-card="maya"]')).toBeHidden();
      const beforeOwnRequests=payloads.length;
      if(engine==="chromium"){
        const available=await page.evaluate(()=>{
          if(!navigator.mediaDevices||typeof MediaRecorder==="undefined"||
            !["audio/mp4","audio/webm;codecs=opus","audio/webm"].some(
              type=>MediaRecorder.isTypeSupported(type)))return false;
          const ctx=new AudioContext(),tone=ctx.createOscillator(),
            gain=ctx.createGain(),destination=ctx.createMediaStreamDestination();
          gain.gain.value=.2;tone.frequency.value=330;
          tone.connect(gain);gain.connect(destination);tone.start();
          Object.defineProperty(navigator.mediaDevices,"getUserMedia",{
            configurable:true,value:async()=>destination.stream.clone()});
          window.__hhSyntheticMic={ctx,tone};
          return true;
        });
        assert.ok(available,"real Chromium audio MediaRecorder is available");
        const record=ownPanel.locator("[data-video-own-voice-record]");
        for(let count=1;count<=2;count++){
          await record.click();
          await expect(record).toHaveAttribute("aria-pressed","true");
          await page.evaluate(()=>window.__hhSyntheticMic.ctx.resume());
          await page.waitForTimeout(900);
          await record.click();
          await expect(ownPanel.locator("[data-video-own-voice-track]")).toHaveCount(count,{timeout:15000});
        }
        const tracks=ownPanel.locator("[data-video-own-voice-track]");
        const file=await tracks.nth(1).locator("audio").evaluate(async audio=>{
          const source=window.__hhOwnVoiceFiles?.get(audio.src);
          if(!(source instanceof File))return {size:0,type:"",containerValid:false};
          const header=new Uint8Array(await source.slice(0,12).arrayBuffer());
          const webm=header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3;
          const mp4=String.fromCharCode(...header.slice(4,8))==="ftyp";
          return {size:source.size,type:source.type,containerValid:webm||mp4};
        });
        assert.ok(file.size>128&&file.type.startsWith("audio/")&&file.containerValid,
          "real MediaRecorder wrote a playable local file "+JSON.stringify(file));
        await tracks.nth(1).locator("[data-video-own-voice-attach]").click();
        await expect(page.locator("[data-video-live-audio]")).toContainText("holistic-house-voice-2");
        // Confirm the chosen recorded track survives the ACTUAL local MP4/WebM
        // export. Reading a selection badge or blob URL is not E2E evidence.
        await page.locator('[data-video-quick-control="editor"]').click();
        // The original recorder's export button is available in the real
        // Montage Audio step, never in the intentionally hidden Style footer.
        await openMontageSettingsViaQuality(page);
        const ownAudioStep=page.locator('[data-video-montage-open-audio]');
        if(engine==="webkit")await ownAudioStep.tap();
        else await ownAudioStep.click();
        await expect(page.locator('[data-video-basic-editor]')).toHaveAttribute("data-montage-panel","audio");
        await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
        const ownCreate=page.locator("[data-video-quick-generate]");
        await expect(ownCreate).toBeEnabled({timeout:30000});
        await ownCreate.click();
        const ownDownload=page.locator("[data-mandala-video-download]");
        await ownDownload.waitFor({state:"visible",timeout:45000});
        // Primary Save opens the real choice of Files / Telegram / WhatsApp.
        // The download event belongs to the next explicit Files choice.
        await ownDownload.click();
        const ownDelivery=page.locator("[data-video-messenger-delivery]");
        await expect(ownDelivery).toBeVisible({timeout:10000});
        await expect(ownDelivery.locator("[data-video-telegram-share]")).toBeVisible();
        await expect(ownDelivery.locator("[data-video-whatsapp-share]")).toBeVisible();
        const [ownFile]=await Promise.all([
          page.waitForEvent("download",{timeout:20000}),
          ownDelivery.locator("[data-video-save-direct-choice]").click(),
        ]);
        const ownBytes=[];
        for await(const chunk of await ownFile.createReadStream())
          ownBytes.push(Buffer.from(chunk));
        const ownedVideo=Buffer.concat(ownBytes);
        assert.ok(ownedVideo.length>10000,"recorded personal voice produced a real movie");
        const ownProbe=spawnSync("ffprobe",["-v","error",
          "-show_entries","stream=codec_type","-of","json","-"],
          {input:ownedVideo,encoding:"utf8",timeout:15000});
        assert.equal(ownProbe.status,0,"own-voice movie decodes: "+ownProbe.stderr);
        const ownStreams=JSON.parse(ownProbe.stdout).streams.map(x=>x.codec_type);
        assert.ok(ownStreams.includes("video")&&ownStreams.includes("audio"),
          "personal track exported as a real movie with audio");
        const ownPcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0",
          "-map","0:a:0","-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
          {input:ownedVideo,maxBuffer:1024*1024,timeout:20000});
        assert.equal(ownPcm.status,0,"own-voice audio decodes: "+ownPcm.stderr);
        assert.ok(ownPcm.stdout.some(byte=>byte!==0),"recorded voice is audible, not silent");
        phase(engine,"own-voice-encoded-video-passed");
        await page.locator('[data-video-quick-control="phrases"]').click();
        await expect(ownPanel).toBeVisible();

        await tracks.nth(1).locator("button").last().click();
        await expect(tracks).toHaveCount(1);
        await expect(page.locator("[data-video-live-audio]")).toHaveCount(0);
        await tracks.nth(0).locator("[data-video-own-voice-attach]").click();
        await expect(page.locator("[data-video-live-audio]")).toContainText("holistic-house-voice-1");
        await tracks.nth(0).locator("button").last().click();
        await expect(tracks).toHaveCount(0);
        await expect(page.locator("[data-video-live-audio]")).toHaveCount(0);
        await page.evaluate(async()=>{
          const mic=window.__hhSyntheticMic;
          if(mic){mic.tone.stop();await mic.ctx.close();}
        });
      }
      assert.equal(payloads.length,beforeOwnRequests,"local voice cannot leak to a TTS provider");
      await voiceModeButton.click();
      await expect(ownPanel).toBeHidden();
      // Compact Voice deliberately omits the old permanent selectedPhrase
      // summary. Its approved phrase is always visible in the native selector;
      // the full transcript is an opt-in disclosure ONLY for "All phrases".
      await expect(page.locator("[data-video-affirmation-selection-summary]")).toHaveCount(0);
      await expect(page.locator("[data-video-affirmation-voice-advanced]")).toHaveCount(1);
      await expect(page.locator("[data-video-generate-affirmation-audio]")).toBeDisabled();
      const phraseSelector=page.locator("[data-video-affirmation-phrase]");
      await phraseSelector.waitFor({state:"visible"});
      assert.ok((await phraseSelector.locator("option").count())>=3,
        "the visitor can choose one of their approved phrases or all");
      // A single approved phrase stays compact; the full transcript is
      // available only when the visitor explicitly chooses All phrases.
      await phraseSelector.selectOption("1");
      await expect(phraseSelector).toHaveValue("1");
      await expect(page.locator("[data-video-affirmation-transcript-review]")).toBeHidden();
      await phraseSelector.selectOption("all");
      await expect(page.locator("[data-video-affirmation-transcript-review]")).toBeVisible();
      await phraseSelector.selectOption("1");
      await expect(page.locator("[data-video-affirmation-transcript-review]")).toBeHidden();
      const approved=(await phraseSelector.locator('option[value="1"]').innerText())
        .replace(/^2\.\s*/,"").trim();
      const expectedSpeech=/[.!?…]$/u.test(approved)?approved:approved+".";
      assert.ok(expectedSpeech.length>5&&expectedSpeech.length<=45,
        "one visible approved phrase fits the free narrator");
      await phraseSelector.selectOption("all");
      await expect(phraseSelector).toHaveValue("all");
      const transcriptDisclosure=page.locator("[data-video-affirmation-transcript-review]");
      await expect(transcriptDisclosure).toHaveCount(1);
      await transcriptDisclosure.locator(":scope > summary").click();
      const speech=transcriptDisclosure.locator("[data-video-affirmation-spoken-text]");
      await expect(speech).toBeVisible();
      const allTranscript=((await speech.textContent())||"").trim();
      assert.ok(allTranscript.length>expectedSpeech.length&&allTranscript.includes(expectedSpeech),
        "the optional review contains the exact selected phrase plus approved alternatives");
      await phraseSelector.selectOption("1");
      await expect(phraseSelector).toHaveValue("1");
      await expect(transcriptDisclosure).toHaveCount(0);
      const transcript=expectedSpeech;
      const chooser=page.locator("[data-video-affirmation-voice-select]");
      assert.equal(await chooser.locator("[data-video-affirmation-voice-card]").count(),3);
      // The same real touch path already passed on the earlier compact
      // Voice pane. Desktop-style click can lose the state change in WebKit.
      const maleTab=chooser.locator('[data-video-affirmation-gender="male"]');
      await expect(maleTab).toBeEnabled();
      if(engine==="webkit")await maleTab.tap();
      else await maleTab.click();
      try{
        await expect(maleTab).toHaveAttribute("aria-pressed","true",{timeout:15000});
        await expect(chooser.locator("[data-video-affirmation-voice-card]")).toHaveCount(3);
        await expect(chooser.locator('[data-video-affirmation-voice-card="leon"]')).toBeVisible({timeout:15000});
      }catch(error){
        // Structural, non-sensitive telemetry: never print a user's phrase.
        const state=await page.evaluate(()=>({
          activeGender:document.querySelector('[data-video-affirmation-gender][aria-pressed="true"]')
            ?.getAttribute("data-video-affirmation-gender")||null,
          visibleVoiceIds:[...document.querySelectorAll('[data-video-affirmation-voice-card]')]
            .map(node=>node.getAttribute("data-video-affirmation-voice-card")),
        })).catch(()=>({diagnosticsUnavailable:true}));
        throw new Error("VOICE_MALE_SELECTION_NOT_COMMITTED "+JSON.stringify(state),{cause:error});
      }
      const leon=chooser.locator('[data-video-affirmation-voice-card="leon"]');
      if(engine==="webkit")await leon.tap();
      else await leon.click();
      await expect(leon).toHaveAttribute("aria-pressed","true");
      await expect(page.locator("[data-video-affirmation-voice-consent]")).not.toBeChecked();
      const voiceOptions=page.locator("[data-video-affirmation-voice] details")
        .filter({has:page.locator("[data-video-affirmation-bed]")});
      if(await voiceOptions.getAttribute("open")===null){
        if(engine==="webkit")await voiceOptions.locator(":scope > summary").tap();
        else await voiceOptions.locator(":scope > summary").click();
      }
      // Verify that Safari committed native disclosure, not only the click.
      await expect(voiceOptions).toHaveAttribute("open","",{timeout:15000});
      await expect(page.locator("[data-video-affirmation-bed]")).toBeVisible({timeout:15000});
      await page.locator("[data-video-affirmation-bed]").selectOption("ocean");
      const narrationConsent=page.locator("[data-video-affirmation-voice-consent]");
      // Physical consent, revoke, then re-consent: never inject or synthesize opt-in.
      if(engine==="webkit")await narrationConsent.tap();
      else await narrationConsent.click();
      await expect(narrationConsent).toHaveAttribute("aria-checked","true",{timeout:15000});
      if(engine==="webkit")await narrationConsent.tap();
      else await narrationConsent.click();
      await expect(narrationConsent).toHaveAttribute("aria-checked","false");
      if(engine==="webkit")await narrationConsent.tap();
      else await narrationConsent.click();
      await expect(narrationConsent).toHaveAttribute("aria-checked","true");
      const generateNarration=page.locator("[data-video-generate-affirmation-audio]");
      await expect(generateNarration).toBeEnabled();
      // Observe real user input on macOS without recording the approved text,
      // credentials, media or account data in any CI log.
      await page.evaluate(()=>{
        const button=document.querySelector("[data-video-generate-affirmation-audio]");
        window.__hhVoiceSubmitProbe={pointers:0,clicks:0,touches:0};
        button?.addEventListener("pointerup",()=>{window.__hhVoiceSubmitProbe.pointers++;});
        button?.addEventListener("click",()=>{window.__hhVoiceSubmitProbe.clicks++;});
        button?.addEventListener("touchend",()=>{window.__hhVoiceSubmitProbe.touches++;});
      });
      if(engine==="webkit")await generateNarration.tap();
      else await generateNarration.click();
      try {
        await page.locator("[data-video-affimations-audio-ready]").waitFor({state:"visible",timeout:30000});
        phase(engine,"voice-wav-ready");
      }catch(error){
        // Preserve the original WAV timeout: the TTS button may have been
        // unmounted, and Playwright's isDisabled() adds an unrelated 25s wait.
        const status=await page.locator('[data-video-affirmation-voice] [role="status"]')
          .allTextContents().catch(()=>[]);
        const state=await page.evaluate(()=>{
          const editor=document.querySelector("[data-video-affirmation-voice]");
          const button=document.querySelector("[data-video-generate-affirmation-audio]");
          return {
            gesture:window.__hhVoiceSubmitProbe??null,
            consented:document.querySelector("[data-video-affirmation-voice-consent]")
              ?.getAttribute("aria-checked")==="true",
            wordsLength:document.querySelector("[data-video-affirmation-spoken-text]")
              ?.textContent?.trim().length??0,
            readyNodes:document.querySelectorAll("[data-video-affimations-audio-ready]").length,
            mountedPanels:document.querySelectorAll("[data-video-affirmation-voice]").length,
            buttonCount:document.querySelectorAll("[data-video-generate-affirmation-audio]").length,
            buttonDisabled:button instanceof HTMLButtonElement?button.disabled:null,
            phase:editor?.getAttribute("data-video-affirmation-phase")||null,
            ownVoiceOnly:editor?.getAttribute("data-own-voice-only")||null,
            voiceModeSelected:document.querySelector('[data-video-ideas-voice-mode="voice"]')
              ?.getAttribute("aria-pressed")||null,
            voiceDisclosureOpen:document.querySelector("[data-video-ideas-advanced-voice]")
              ?.hasAttribute("open")??null
          };
        }).catch(()=>({diagnosticsUnavailable:true}));
        throw new Error(engine+" voice WAV did not become ready: "+
          JSON.stringify({primaryFailure:error instanceof Error?error.name:"unknown",
            status,state,providerModes:payloads.map(item=>item.mode),
            providerRequests:payloads.length,networkRequests:requests,jsErrors:errors}),{cause:error});
      }
      const affirmationRequests=payloads.filter(item=>item.mode==="affirmations");
      assert.equal(affirmationRequests.length,1);
      assert.equal(affirmationRequests[0].text,transcript);
      assert.equal(affirmationRequests[0].voiceId,"leon");
      assert.equal(affirmationRequests[0].consent,true);
      assert.equal(affirmationRequests[0].language,locale);
      const expectedFileName="holistic-house-affirmations-"+locale+"-leon.wav";
      // Real attached WAV is reflected on the shared live video stage, not
      // merely in a hidden legacy audio panel or a transient preview label.
      await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName);
      // Rights-reviewed recordings only: the legacy five synthesized music
      // beds are not permitted as new suggestions after the voice WAV is
      // attached. The separately consented Voice Background control already
      // selected above remains the real, existing remix path.
      const personalMusic=page.locator('[data-hypno-music][data-personalized-music-match]');
      await expect(personalMusic).toBeVisible({timeout:15000});
      await expect(personalMusic.locator('[role="radio"]')).toHaveCount(0);
      await expect(personalMusic.locator('[data-phrase-music-attach]')).toHaveCount(0);
      const qualityNotice=personalMusic.locator('[data-phrase-music-guidance="voice"]');
      await expect(qualityNotice).toBeVisible();
      await expect(qualityNotice).toContainText(
        locale==="ru"?"Голос сохранён.":locale==="es"?"La voz está guardada.":"Your voice stays attached.");
      await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName);
      const firstAudio=await page.locator("[data-video-affimations-audio-ready] audio").getAttribute("src");
      assert.equal(await page.locator("[data-video-affirmation-bed] option").count(),14,
        "the first-party library offers none and thirteen backgrounds");
      await page.locator("[data-video-voice-volume]").focus();
      await page.keyboard.press("ArrowLeft");
      await page.locator("[data-video-bed-volume]").focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(previous=>{
        const audio=document.querySelector("[data-video-affimations-audio-ready] audio");
        return audio?.getAttribute("src") && audio.getAttribute("src")!==previous;
      },firstAudio,{timeout:25000});
      phase(engine,"offline-remix-ready");
      assert.equal(payloads.filter(item=>item.mode==="affirmations").length,1,
        "remixing voice/music must not invoke voice generation again");
      // Exercise the actual third-workspace Audio cards in real WebKit.
      // The approved TTS track is already attached; both effects must render
      // locally into a real stereo WAV before the movie export starts.
      await page.locator('[data-video-quick-control="effects"]').click();
      const therapyEffectsPractice=page.locator('[data-therapy-subtab="practice"]');
      if(engine==="webkit")await therapyEffectsPractice.tap();
      else await therapyEffectsPractice.click();
      await expect(therapyEffectsPractice).toHaveAttribute("aria-selected","true");
      const therapyEffectsSummary=page.locator('[data-therapy-effects-toggle]');
      if(engine==="webkit")await therapyEffectsSummary.tap();
      else await therapyEffectsSummary.click();
      await expect(page.locator('[data-therapy-advanced-effects]')).toHaveAttribute("open","");
      // The original advanced effects engine remains under Therapy > Practice.
      // Hypno has three exclusive subtabs: Visual, Audio effects and Effects.
      // Verify the relocated effect presets in macOS WebKit before the audio mixer.
      const hypnoTabs=page.locator('[data-hypno-tabs]');
      await hypnoTabs.waitFor({state:"visible",timeout:10000});
      const visualTab=hypnoTabs.locator('[data-hypno-tab="visual"]');
      const audioTab=hypnoTabs.locator('[data-hypno-tab="audio"]');
      const effectsTab=hypnoTabs.locator('[data-hypno-tab="effects"]');
      await expect(hypnoTabs.getByRole("tab")).toHaveCount(3);
      await expect(visualTab).toBeVisible();
      await expect(audioTab).toBeVisible();
      await expect(effectsTab).toBeVisible();
      await expect(visualTab).toHaveAttribute("aria-selected","true");
      const visualGroup=page.locator('[data-hypno-group="visual"]');
      const audioGroup=page.locator('[data-hypno-group="audio"]');
      const effectsGroup=page.locator('[data-hypno-group="effects"]');
      await expect(visualGroup).toBeVisible();
      await expect(audioGroup).toBeHidden();
      await expect(effectsGroup).toBeHidden();
      const lightPresets=visualGroup.locator('[data-hypno-light-preset]');
      await expect(lightPresets).toHaveCount(3);
      const balancedLight=lightPresets.nth(1);
      await expect(balancedLight).toBeEnabled();
      await balancedLight.click();
      await expect(balancedLight).toHaveAttribute("aria-pressed","true");
      await expect(visualGroup.locator('[data-hypno-card]').first().getByRole("switch"))
        .toHaveAttribute("aria-checked","true");
      const textPosition=visualGroup.locator('[data-hypno-text-position="top"]');
      await expect(textPosition).toBeVisible();
      await textPosition.click();
      await expect(textPosition).toHaveAttribute("aria-pressed","true");
      await expect(page.locator('[data-hypno-summary]')).toContainText(
        locale==="ru"?"Выбрано":locale==="es"?"Elegidos":"Selected");
      // Exercise the experimental short-frame control, then restore its
      // initial OFF state; its effect is never presented as clinical proof.
      const briefFrame=visualGroup.locator('[data-hypno-card]').nth(2).getByRole("switch");
      await briefFrame.click();
      await expect(briefFrame).toHaveAttribute("aria-checked","true");
      await briefFrame.click();
      await expect(briefFrame).toHaveAttribute("aria-checked","false");
      // Exercise the new Effects tab and its original no-flash Canvas presets.
      await effectsTab.click();
      await expect(effectsTab).toHaveAttribute("aria-selected","true");
      await expect(visualGroup).toBeHidden();
      await expect(effectsGroup).toBeVisible();
      const sunlight=effectsGroup.locator('[data-hypno-visual-effect="sunlight"]');
      await sunlight.click();
      await expect(sunlight).toHaveAttribute("aria-pressed","true");
      await expect(effectsGroup.locator("#video-hypno-effect-strength")).toBeEnabled();
      const waves=effectsGroup.locator('[data-hypno-visual-effect="waves"]');
      await waves.click();
      await expect(waves).toHaveAttribute("aria-pressed","true");
      await audioTab.click();
      await expect(effectsGroup).toBeHidden();
      await expect(audioTab).toHaveAttribute("aria-selected","true");
      await expect(visualGroup).toBeHidden();
      await expect(audioGroup).toBeVisible();
      const speechCard=audioGroup.locator("[data-hypno-card]").first();
      await speechCard.locator("button").first().click();
      await expect(audioGroup.locator("[data-hypno-speech-settings] [data-hypno-voice]"))
        .toBeVisible({timeout:10000});
      // Opening voice settings can start an async local preparation pass.
      // Wait until the real busy indicator is gone and the switch is enabled;
      // never force-click a disabled effect control.
      await expect(page.locator("[data-hypno-audio-effect-busy]")).toHaveCount(0,{timeout:60000});
      const whisperName=locale==="ru"?"Гипнозвук":locale==="es"?"Voz tenue":"Quiet speech";
      const binauralName=locale==="ru"?"Бинауральные ритмы":locale==="es"?"Ritmos binaurales":"Binaural beats";
      const whisperSwitch=audioGroup.getByRole("switch",{name:whisperName,exact:true});
      const binauralSwitch=audioGroup.getByRole("switch",{name:binauralName,exact:true});
      await expect(whisperSwitch).toHaveAttribute("aria-checked","false");
      await expect(whisperSwitch).toBeEnabled({timeout:30000});
      await whisperSwitch.click();
      await expect(whisperSwitch).toHaveAttribute("aria-checked","true",{timeout:30000});
      await binauralSwitch.click();
      await expect(binauralSwitch).toHaveAttribute("aria-checked","true",{timeout:30000});
      await expect(page.locator("[data-hypno-audio-effect-busy]")).toHaveCount(0);
      phase(engine,"hypno-audio-effects-rendered");
      await page.locator('[data-video-quick-control="video"]').click();
      await page.locator('[data-video-quick-control="editor"]').click();
      // #3933 introduced TWO explicit actions: Generate Video exports on tap;
      // Add Effects navigates. Never tap Generate merely to advance a tab.
      // Exercise the visible Style and Audio controls, then create exactly once
      // below at phase(start-media-recorder).
      const creationStyleTab=page.locator('[data-video-montage-tab="effects"]');
      await expect(creationStyleTab).toBeVisible();
      await creationStyleTab.click();
      await expect(creationStyleTab).toHaveAttribute("aria-pressed","true");
      await openMontageSettingsViaQuality(page);
      const montageAudioTab=page.locator('[data-video-montage-open-audio]');
      await expect(montageAudioTab).toBeVisible();
      if(engine==="webkit")await montageAudioTab.tap();
      else await montageAudioTab.click();
      await expect(page.locator('[data-video-basic-editor]')).toHaveAttribute("data-montage-panel","audio");
      await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
      const generate=page.locator("[data-video-quick-generate]");
      await expect(generate).toBeVisible({timeout:30000});
      await expect(generate).not.toHaveAttribute("data-video-montage-next",/./);
      await expect(generate).toBeEnabled({timeout:30000});
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),false,
        "newly remixed WAV must automatically attach to local movie");
      // One Create tap decodes the idle MP4 and exports the actual voice video.
      if(engine==="chromium"||engine==="webkit") {
        const sourceVideo=page.locator("[data-mandala-master-mp4]");
        if(await sourceVideo.count()) {
          assert.equal(await sourceVideo.getAttribute("preload"),"auto",
            "the user's earlier Style tap must already prime the real MP4");
        }
        // Real locally encoded file: not a mere blob preview or a silent fake.
        await expect(generate).toBeEnabled({timeout:30000});
        const mediaCapabilities=await page.evaluate(()=>({
          userAgent:navigator.userAgent,
          canvasCapture:typeof HTMLCanvasElement.prototype.captureStream==="function",
          supportedMimes:['video/webm;codecs="vp8,opus"','video/webm',
            'video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4'].filter(
              mime=>typeof MediaRecorder!=="undefined" && MediaRecorder.isTypeSupported(mime)),
        }));
        console.log("VOICE_E2E_MEDIA_CAPABILITIES "+engine+" "+JSON.stringify(mediaCapabilities));
        phase(engine,"start-media-recorder");
        // The Free card only navigates to Ready. The separate Ready button
        // starts the real local encoder with a second trusted user gesture.
        await montageProTab.click();
        await expect(montageProOffer.locator('[data-video-montage-pro-choice="free"]')).toBeEnabled();
        await montageProOffer.locator('[data-video-montage-pro-choice="free"]').click();
        await expect(page.locator("[data-mandala-free-video]")).toHaveAttribute("data-active-workspace","ready");
        await expect(page.locator("[data-video-ready]")).toHaveAttribute("data-ready-state","choose");
        // Safari cannot export from a display:none Canvas; visually keep only
        // Ready's single public player, and preserve the hidden compositor.
        const readySourceStage=page.locator("[data-video-live-stage]");
        const sourceCompositor=await readySourceStage.evaluate(node=>{
          const box=node.getBoundingClientRect();
          return {display:getComputedStyle(node).display,width:box.width,height:box.height,
            canvas:Boolean(node.querySelector("canvas[data-mandala-cinematic-canvas]"))};
        });
        assert.notEqual(sourceCompositor.display,"none","Ready must retain Safari's real Canvas");
        assert.ok(sourceCompositor.canvas&&sourceCompositor.width>0&&sourceCompositor.width<=4&&
          sourceCompositor.height>0&&sourceCompositor.height<=4,
          "Ready encoder must remain mounted at 2px without a duplicate visible player");
        await expect(page.locator("[data-ready-video-tiers]")).toHaveCount(0);
        const readyGenerate=page.locator("[data-ready-generate]");
        // The primary action must follow the player immediately on phone.
        const readyPreview=page.locator("[data-video-ready] [data-aspect]");
        const previewBox=await readyPreview.boundingBox();
        const buttonBox=await readyGenerate.boundingBox();
        if(previewBox&&buttonBox)assert.ok(buttonBox.y>=previewBox.y+previewBox.height-2,
          "Ready Generate must sit directly beneath the video");
        await expect(readyGenerate).toBeEnabled({timeout:30000});
        phase(engine,"montage-free-navigated-ready");
        // Real mobile click contract: the two Ready cards switch to sixth
        // Therapy workspace and select its format, with no Ready expansion.
        await page.locator("[data-ready-meditation]").click();
        await expect(page.locator("[data-mandala-free-video]"))
          .toHaveAttribute("data-active-workspace","effects");
        await expect(page.locator("[data-therapy-studio]"))
          .toHaveAttribute("data-therapy-course","false");
        await expect(page.locator('[data-therapy-subtab="meditation"]'))
          .toHaveAttribute("aria-selected","true");
        await expect(page.locator("[data-ready-offer-panel]")).toHaveCount(0);
        await page.locator('[data-video-quick-control="ready"]').click();
        await page.locator("[data-ready-journey]").click();
        await expect(page.locator("[data-mandala-free-video]"))
          .toHaveAttribute("data-active-workspace","effects");
        await expect(page.locator("[data-therapy-studio]"))
          .toHaveAttribute("data-therapy-course","true");
        await expect(page.locator("[data-therapy-script-host]")).toBeVisible();
        await expect(page.locator("[data-ready-offer-panel]")).toHaveCount(0);
        await page.locator('[data-video-quick-control="ready"]').click();
        await expect(readyGenerate).toBeEnabled({timeout:30000});
        phase(engine,"ready-therapy-one-tap-navigation-verified");
        // A later Style/Audio edit changes the Story source signature.
        // Approve the final six decoded photographs AFTER those edits, just
        // like a real visitor. An old approval must never silently authorize
        // a changed video, and this step cannot charge or start the encoder.
        await editorTab.click();
        await expect(editorTab).toHaveAttribute("aria-pressed","true");
        await montageStoryTab.click();
        await expect(montageStoryTab).toHaveAttribute("aria-pressed","true");
        const finalStoryboard=page.locator('[data-video-auto-storyboard]');
        await expect(finalStoryboard).toBeVisible();
        const finalApproval=page.locator('[data-storyboard-apply-reference-photos]');
        if(await page.locator('[data-storyboard-photo-approval-required]').count()){
          await expect(finalApproval).toBeVisible({timeout:20000});
          await expect(finalApproval).toBeEnabled({timeout:30000});
          await finalApproval.click();
          phase(engine,"final-six-photo-consent-after-audio-style-edits");
          await expect(montageProTab).toHaveAttribute("aria-pressed","true");
        }else{
          // An authored screenplay may have no action-matching licensed photos.
          // The editor must NOT claim media is ready or auto-approve unrelated
          // pictures. This Story integrity check is independent of the genuine
          // local MP4 encoder exercised below through the existing Free path.
          const count=Number(await finalStoryboard.getAttribute("data-storyboard-reference-count"));
          assert.ok(Number.isInteger(count)&&count>=0&&count<=6,
            "Storyboard reference count must be finite and bounded");
          if(count<6){
            await expect(finalStoryboard).toHaveAttribute("data-storyboard-media-ready","false");
            await expect(finalStoryboard).toHaveAttribute("data-storyboard-action-proof","editorial_unverified");
            await expect(finalStoryboard.locator('[data-story-media-kind="missing"]'))
              .toHaveCount(6-count);
            await expect(finalStoryboard.locator('[data-storyboard-apply-reference-photos]'))
              .toHaveCount(0);
            // A no-match Story is explicitly blocked: no simulated reference
            // consent and no claim that its six physical actions were filmed.
            phase(engine,"story-action-media-missing-fail-closed");
            // No substitute photograph is passed off as a filmed screenplay.
            // The visitor may instead intentionally choose a DIFFERENT,
            // already licensed local compilation. Its actual decoded movie,
            // consented voice, and credits still face every native WebKit gate.
            await page.locator('[data-video-quick-control="video"]').click();
            const filmCatalogue=page.locator(
              '[data-free-film-compilation-catalog] [data-free-film-preset]');
            if(!await filmCatalogue.first().isVisible()){
              const moreGoals=page.locator('[data-hh-mirror-more-goals]');
              await expect(moreGoals).toBeVisible({timeout:15000});
              if(engine==="webkit")await moreGoals.tap();
              else await moreGoals.click();
            }
            await expect(filmCatalogue.first()).toBeVisible({timeout:15000});
            // Some approved masters cannot fill the visitor's current
            // duration/aspect. A visible tile may legitimately reject that
            // combination. Try the actual catalogue selections (including
            // its explicit All control), but require one genuinely validated
            // set of distinct, licensed physical source frames. No fake
            // pressed state, no unlicensed replacement, no waived WebKit.
            const portraitRetry=page.locator('[data-video-portrait-retry]');
            let chosenId=null;
            for(let expanded=0;expanded<2&&!chosenId;expanded++){
              if(expanded){
                const moreFilms=page.locator('[data-free-film-more]');
                await expect(moreFilms).toBeVisible({timeout:15000});
                if(await moreFilms.getAttribute('aria-expanded')!=='true'){
                  if(engine==="webkit")await moreFilms.tap();
                  else await moreFilms.click();
                }
              }
              const ids=await filmCatalogue.evaluateAll(nodes=>nodes.map(node=>
                node.getAttribute('data-free-film-preset')).filter(Boolean));
              assert.ok(ids.length>0&&ids.length<3000&&
                ids.every(id=>/^[a-z0-9-]+$/.test(id)),
                "Approved catalogue IDs must remain bounded and immutable");
              // The expanded licensed library legitimately exceeds 100
              // entries. Prioritize independently generated approved motion
              // masters, then stock compilations, but cap physical user taps.
              // Every candidate still must pass actual source validation.
              const tried=expanded?[
                ...ids.filter(id=>id.startsWith("motion-film-")),
                ...ids.filter(id=>!id.startsWith("motion-film-")),
              ]:ids;
              for(const id of tried.slice(0,expanded?45:4)){
                if(chosenId)break;
                const option=page.locator(
                  '[data-free-film-compilation-catalog] [data-free-film-preset="'+id+'"]');
                if(!await option.isVisible()||!await option.isEnabled())continue;
                if(engine==="webkit")await option.tap();
                else await option.click();
                const selected=page.locator(
                  '[data-free-film-compilation-catalog] [data-free-film-preset="'+id+'"]');
                // Wait for the React selection or its authentic approved
                // portrait-only fallback. Neither outcome is manufactured.
                try{
                  await expect.poll(async()=>(
                    await selected.getAttribute('aria-pressed')==='true'||
                    await portraitRetry.isVisible()),
                    {timeout:1500,intervals:[100,250,500]}).toBe(true);
                }catch{}
                if(await selected.getAttribute('aria-pressed')==='true'){
                  chosenId=id;break;
                }
                if(await portraitRetry.isVisible()&&await portraitRetry.isEnabled()){
                  if(engine==="webkit")await portraitRetry.tap();
                  else await portraitRetry.click();
                  if(await selected.getAttribute('aria-pressed')==='true'){
                    chosenId=id;
                    phase(engine,"explicit-reviewed-portrait-masters-selected");
                  }
                }
              }
            }
            assert.ok(chosenId,
              "No licensed first-party film could be selected at available verified aspect/duration; fail closed");
            const chosenFilm=page.locator(
              '[data-free-film-compilation-catalog] [data-free-film-preset="'+chosenId+'"]');
            await expect(chosenFilm).toHaveAttribute('aria-pressed','true',{timeout:15000});
            await expect(page.locator('[data-free-film-readiness]')).toBeVisible();
            phase(engine,"explicit-reviewed-film-compilation-selected");
            await page.locator('[data-video-quick-control="editor"]').click();
            await expect(page.locator('[data-mandala-free-video]'))
              .toHaveAttribute('data-active-workspace','editor');
          }else{
            await expect(finalStoryboard).toHaveAttribute("data-storyboard-media-ready","true");
          }
          await montageProTab.click();
        }
        await montageProOffer.locator('[data-video-montage-pro-choice="free"]').click();
        await expect(page.locator("[data-mandala-free-video]"))
          .toHaveAttribute("data-active-workspace","ready");
        await expect(readyGenerate).toBeEnabled({timeout:30000});
        // Capture transient real Ready progress before the trusted Generate tap:
        // a fast local export may unmount the seven-question panel immediately.
        await page.evaluate(()=>{
          const evidence={progress:false,step:false,scoreButtons:0,photo:false};
          window.__hhReadyInlineCheckInEvidence=evidence;
          const scan=()=>{
            const progress=document.querySelector('[data-ready-generating]');
            const step=document.querySelector('[data-ready-checkin] [data-ready-sequential-checkin]');
            const scoreButtons=step?.querySelectorAll('[data-ready-checkin-score]').length??0;
            const photo=Boolean(step?.querySelector('img[src^="/videos/holistic-house/film-collection-v2/"]'));
            if(progress)evidence.progress=true;
            if(progress&&step&&scoreButtons===11&&photo){
              evidence.step=true;evidence.scoreButtons=scoreButtons;evidence.photo=true;
              window.__hhReadyCheckInObserver?.disconnect();
            }
          };
          window.__hhReadyCheckInObserver?.disconnect();
          window.__hhReadyCheckInObserver=new MutationObserver(scan);
          window.__hhReadyCheckInObserver.observe(document.body,{childList:true,subtree:true});
          scan();
        });
        await readyGenerate.click();
        phase(engine,"ready-free-render-requested");
        try{
          await expect.poll(()=>page.evaluate(()=>
            Boolean(window.__hhReadyInlineCheckInEvidence?.progress&&
              window.__hhReadyInlineCheckInEvidence?.step)),
            {timeout:20000,intervals:[100,250,500]}).toBe(true);
        }catch(error){
          // Report only bounded structural state, not private speech or media.
          const gate=await page.evaluate(()=>({
            workspace:document.querySelector('[data-mandala-free-video]')?.getAttribute('data-active-workspace')||null,
            readyState:document.querySelector('[data-video-ready]')?.getAttribute('data-ready-state')||null,
            generating:Boolean(document.querySelector('[data-ready-generating]')),
            firstVideoApproval:document.querySelector('[data-video-auto-storyboard]')?.getAttribute('data-storyboard-media-ready')||null,
            hasSelectedFilm:Boolean(document.querySelector('[data-free-film-preset][aria-pressed="true"]')),
            hasCheckin:Boolean(document.querySelector('[data-ready-sequential-checkin]')),
            observed:window.__hhReadyInlineCheckInEvidence||null
          }));
          throw new Error("READY_CHECKIN_REAL_EXPORT_NOT_STARTED "+JSON.stringify(gate),{cause:error});
        }
        const observation=await page.evaluate(()=>{
          window.__hhReadyCheckInObserver?.disconnect();
          return window.__hhReadyInlineCheckInEvidence;
        });
        assert.equal(observation.scoreButtons,11,
          "Ready shows all 0–10 score choices during real encoding");
        assert.equal(observation.photo,true,
          "Ready check-in displays a genuine first-party scene photo");
        // Verify the approved seven-picture Ready check-in, not the old Goal
        // sliders: one real 0–10 tap must advance to a distinct licensed image.
        await expect(page.locator("[data-ready-generating]")).toBeVisible({timeout:20000});
        const readyCheckin=page.locator("[data-ready-checkin] [data-ready-sequential-checkin]");
        await expect(readyCheckin).toBeVisible({timeout:20000});
        await expect(readyCheckin).toContainText("1 / 7");
        await expect(readyCheckin.locator("[data-ready-checkin-score]")).toHaveCount(11);
        const firstTone=await readyCheckin.getAttribute("data-checkin-tone");
        const firstImage=await readyCheckin.locator("img").getAttribute("src");
        assert.ok(firstTone&&firstImage?.startsWith("/videos/holistic-house/"),
          "Ready must show a real first-party picture and named question");
        await readyCheckin.locator('[data-ready-checkin-score="5"]').click();
        await expect(readyCheckin).not.toHaveAttribute("data-checkin-tone",firstTone,{timeout:5000});
        await expect(readyCheckin.locator("img")).not.toHaveAttribute("src",firstImage,{timeout:5000});
        await expect(readyCheckin).toContainText("2 / 7");
        // No unsolicited optional survey should cover the intentional export.
        // No retired floating survey or overlay may block the actual export.
        await expect(page.locator("[data-video-effect-overlay]")).toHaveCount(0);
        await expect(page.locator("[data-video-effect-reopen]")).toBeHidden();
        // The idle source remains preload=none until the user's actual Create
        // gesture; Safari must then start a physical decode, never a CSS-only
        // preview or an unverified download.
        if(await sourceVideo.count()){
          await expect.poll(()=>sourceVideo.evaluate(video=>video.preload),
            {timeout:5000}).toBe("auto");
        }
        phase(engine,"recording-started");
        const output=page.locator("[data-mandala-video-download]");
        // Authenticated visitors can download; a first-time guest can watch a
        // real encoded local film but MUST sign in before Save, share or upload.
        const guestPreview=page.locator("[data-video-guest-preview-actions]");
        // The verified film can auto-open Ready and hide legacy Result actions.
        const readyView=page.locator("[data-video-ready]");
        const readyVideo=readyView.locator("video");
        const readyPlay=readyView.locator("[data-ready-play-verify]");
        phase(engine,"waiting-for-export");
        try {
          // An iPhone/WebKit MP4 can require a physical Play gesture before
          // the native video element decodes its first frame. The export is NOT
          // considered ready or downloadable before native playback succeeds.
          let verificationTapped=false;
          const verifyPlayback=page.locator("[data-video-verify-playback]");
          await expect.poll(async()=>{
            if(await output.isVisible()||await guestPreview.isVisible()||
              await readyView.getAttribute("data-ready-state")==="complete")return true;
            if(!verificationTapped&&await readyVideo.isVisible()&&await readyPlay.isVisible()){
              try{
                await readyPlay.click({timeout:2000});
                verificationTapped=true;
              }catch(error){
                if(await readyView.getAttribute("data-ready-state")==="complete")return true;
                if(await readyPlay.isVisible())throw error;
              }
            }
            if(!verificationTapped&&await verifyPlayback.isVisible()){
              try{
                await verifyPlayback.click({timeout:2000});
                verificationTapped=true;
              }catch(error){
                // Native MP4 may become playable between isVisible and click:
                // React then unmounts this optional button. Require the real
                // download control, never accept a status label or mock file.
                if(await output.isVisible())return true;
                if(await verifyPlayback.isVisible())throw error;
              }
            }
            return await output.isVisible()||await guestPreview.isVisible()||
              await readyView.getAttribute("data-ready-state")==="complete";
          },{timeout:45000,intervals:[250,500,1000]}).toBe(true);
          if(!await guestPreview.isVisible()&&
            await readyView.getAttribute("data-ready-state")!=="complete")
            await output.waitFor({state:"visible",timeout:45000});
        } catch (error) {
          phase(engine,"download-control-timed-out");
          let uiState;
          try {
            uiState=await withDeadline(page.evaluate(()=>{
            const video=document.querySelector("[data-mandala-master-mp4]");
            const create=document.querySelector("[data-video-quick-generate]");
            const result=document.querySelector("[data-video-result]");
            return {
              canClick:create instanceof HTMLButtonElement ? !create.disabled : null,
              source:video instanceof HTMLVideoElement ? {
                readyState:video.readyState,width:video.videoWidth,height:video.videoHeight,
                error:video.error?.code??null,networkState:video.networkState,
                preload:video.preload,sourceLoaded:Boolean(video.currentSrc)
              } : null,
              resultHidden:result instanceof HTMLElement ? result.hidden : null,
              progress:document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")??null,
              notices:[...document.querySelectorAll('[role="status"],[role="alert"]')].map(x=>x.textContent?.trim()).filter(Boolean).slice(0,8),
            };
          }),4000,engine+" media-state evaluation");
          } catch (diagnosticError) {
            uiState={diagnosticsUnavailable:diagnosticError instanceof Error
              ? diagnosticError.message:"WebKit renderer did not respond"};
          }
          phase(engine,"recording-error-reported");
          throw new Error(engine+" recorded video never became downloadable: "+
            JSON.stringify({...uiState,encoderFailureCodes:errors.filter(item=>
              item.startsWith("HH_WEBKIT_MP4_EXPORT_FAILURE:")).slice(-5)}),{cause:error});
        }
        let bytes;
        if(await readyVideo.isVisible()){
          // The actual verified export was promoted to the approved Ready tab.
          // Legacy Result is deliberately CSS-hidden in Ready; never click it.
          await expect(readyView).toHaveAttribute("data-ready-view","home");
          await expect(page.locator("[data-mandala-video-preview]")).toHaveCount(1);
          await expect(readyVideo).toHaveAttribute("data-ready-native-player","true");
          await expect(page.locator("[data-video-result]"))
            .toHaveAttribute("data-video-result-mode","rendered");
          await expect(output).toBeHidden();
          await expect(page.locator("[data-video-save-direct]")).toBeHidden();
          await expect(readyView.locator("[data-ready-save]")).toBeVisible();
          // The during-render reflection cannot intercept the real Ready
          // Save click; never force-click around an inaccessible overlay.
          await expect(page.locator("[data-video-effect-overlay]"))
            .toHaveCount(0,{timeout:10000});
          // Read native decoded media, not just a Ready label or simulated file.
          await expect.poll(()=>page.locator("[data-mandala-video-preview]").evaluate(video=>
            video instanceof HTMLVideoElement&&video.readyState>=2&&
            video.videoWidth>0&&video.videoHeight>0&&!video.error),
            {timeout:20000}).toBe(true);
          // Guest Save/Download must invoke actual login gate, not a download.
          // The optional progress/check-in overlay must get out of the way
          // automatically when verified Ready appears, without bypassing the UI.
          await expect(page.locator("[data-video-effect-overlay]")).toHaveCount(0);
          await expect(page.locator("[data-video-effect-reopen]")).toBeHidden();
          await expect(readyCheckin).toBeVisible();
          await expect(readyCheckin).toContainText("2 / 7");
          // The visitor-started check-in can remain inline, never above Save.
          // Clicking Save below proves it does not intercept the actual action.
          await readyView.locator("[data-ready-save]").click();
          await expect(readyView.locator("[data-ready-save-gate]")).toBeVisible();
          await expect(readyView.locator("[data-ready-save-gate-signin]")).toBeVisible();
          await readyView.locator("[data-ready-save-close]").click();
          await expect(readyView.locator("[data-ready-save-gate]")).toHaveCount(0);
          // Exercise the real rendered MP4's DOM ended handler without a
          // second paid render. Finishing playback must not auto-open the
          // optional effects survey over Save / Telegram.
          await page.locator("[data-mandala-video-preview]").evaluate(video=>{
            if(!(video instanceof HTMLVideoElement)||video.readyState<2)
              throw Error("REAL_MEDIA_MISSING_BEFORE_ENDED");
            video.dispatchEvent(new Event("ended"));
          });
          await expect(page.locator("[data-video-effect-overlay]"))
            .toHaveCount(0,{timeout:10000});
          await readyView.locator("[data-ready-save]").click();
          await expect(readyView.locator("[data-ready-save-gate]")).toBeVisible();
          await readyView.locator("[data-ready-save-close]").click();
          await expect(readyView.locator("[data-ready-save-gate]")).toHaveCount(0);
          // The original exact Blob is retained in this test tab by the
          // createObjectURL wrapper; CSP does not need to allow fetch(blob:).
          const readyMovie=await page.evaluate(async()=>{
            const video=document.querySelector("[data-mandala-video-preview]");
            if(!(video instanceof HTMLVideoElement)||!video.currentSrc.startsWith("blob:")||
               video.readyState<2||video.videoWidth===0||video.videoHeight===0||video.error)
              throw Error("GUEST_REAL_VIDEO_PREVIEW_INVALID");
            const blob=window.__hhRecordedVideoBlobs?.get(video.currentSrc);
            if(!(blob instanceof Blob))throw Error("GUEST_REAL_VIDEO_BLOB_UNAVAILABLE");
            if(blob.size<10000||blob.size>16000000)
              throw Error("GUEST_REAL_VIDEO_BYTES_INVALID");
            const dataUrl=await new Promise((resolve,reject)=>{
              const reader=new FileReader();
              reader.onerror=()=>reject(Error("GUEST_REAL_VIDEO_BLOB_READ_FAILED"));
              reader.onload=()=>resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            return {base64:String(dataUrl).split(",")[1],
              width:video.videoWidth,height:video.videoHeight};
          });
          assert.ok(readyMovie.width>0&&readyMovie.height>0&&readyMovie.base64?.length>15000);
          bytes=Buffer.from(readyMovie.base64,"base64");
          phase(engine,"ready-real-encoded-mp4-auth-gate-verified");
        }else if(await guestPreview.isVisible()){
          // This is a synthetic test-owned in-memory Blob; exposing the normal
          // Save/Telegram/YouTube controls to an anonymous visitor is forbidden.
          await expect(page.locator("[data-video-result]"))
            .toHaveAttribute("data-video-result-mode","rendered");
          await expect(output).toBeHidden();
          await expect(page.locator("[data-video-save-direct]")).toBeHidden();
          await expect(page.locator("[data-video-guest-save-hint]")).toBeVisible();
          const player=page.locator("[data-mandala-video-preview]");
          await expect(player).toBeVisible();
          // User Play is the required Safari decode gesture; never fake loadeddata.
          await guestPreview.locator("[data-video-guest-play]").click();
          await expect.poll(()=>player.evaluate(video=>
            video instanceof HTMLVideoElement&&video.readyState>=2&&
            video.videoWidth>0&&video.videoHeight>0&&!video.error),{timeout:20000}).toBe(true);
          // Inspect the genuine locally rendered movie without invoking a
          // privileged download, network upload or fake signed-in session.
          const localMovie=await page.evaluate(async()=>{
            const video=document.querySelector("[data-mandala-video-preview]");
            if(!(video instanceof HTMLVideoElement)||!video.currentSrc.startsWith("blob:")||
               video.readyState<2||video.videoWidth===0||video.videoHeight===0)
              throw Error("GUEST_REAL_VIDEO_PREVIEW_INVALID");
            const blob=window.__hhRecordedVideoBlobs?.get(video.currentSrc);
            if(!(blob instanceof Blob))throw Error("GUEST_REAL_VIDEO_BLOB_UNAVAILABLE");
            if(blob.size<10000||blob.size>16000000)
              throw Error("GUEST_REAL_VIDEO_BYTES_INVALID");
            const dataUrl=await new Promise((resolve,reject)=>{
              const reader=new FileReader();
              reader.onerror=()=>reject(Error("GUEST_REAL_VIDEO_BLOB_READ_FAILED"));
              reader.onload=()=>resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            return {base64:String(dataUrl).split(",")[1],mime:blob.type,
              width:video.videoWidth,height:video.videoHeight};
          });
          assert.ok(localMovie.base64?.length>15000);
          assert.ok(localMovie.width>0&&localMovie.height>0);
          bytes=Buffer.from(localMovie.base64,"base64");
          phase(engine,"guest-real-encoded-mp4-auth-gate-verified");
        }else{
          phase(engine,"download-control-ready");
          // Signed-in visitors open the actual Save chooser, then choose the
          // physical file. This path remains required when authorized.
          await output.click();
          const delivery=page.locator("[data-video-messenger-delivery]");
          await expect(delivery).toBeVisible({timeout:10000});
          await expect(delivery.locator("[data-video-telegram-share]")).toBeVisible();
          await expect(delivery.locator("[data-video-whatsapp-share]")).toBeVisible();
          phase(engine,"delivery-chooser-open");
          const [download]=await Promise.all([
            page.waitForEvent("download",{timeout:20000}),
            delivery.locator("[data-video-save-direct-choice]").click(),
          ]);
          phase(engine,"download-started");
          const parts=[];
          for await(const chunk of await download.createReadStream())parts.push(Buffer.from(chunk));
          bytes=Buffer.concat(parts);
        }
        assert.ok(bytes.length>10000,"real video must be recorded");
        const probe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_type,channels",
          "-of","json","-"],{input:bytes,encoding:"utf8",timeout:15000});
        assert.equal(probe.status,0,"real video container must decode: "+probe.stderr);
        const streams=JSON.parse(probe.stdout).streams;
        const tracks=streams.map(row=>row.codec_type);
        assert.ok(tracks.includes("video"),"real video stream present");
        const audioTrack=streams.find(row=>row.codec_type==="audio");
        assert.ok(audioTrack,"generated affirmation WAV survived into exported video");
        assert.equal(Number(audioTrack.channels),2,"real encoded audio track must remain stereo");
        const pcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0","-map","0:a:0",
          "-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
          {input:bytes,maxBuffer:1024*1024,timeout:20000});
        assert.equal(pcm.status,0,"generated voice audio decodes: "+pcm.stderr);
        assert.ok(pcm.stdout.some(value=>value!==0),"the encoded audio must not be silent");
        phase(engine,"encoded-audio-verified");
      }
      // Adding another approved phrase must preserve the WAV of the
      // exact one-line text already spoken and encoded in the exported MP4.
      await page.locator('[data-video-quick-control="phrases"]').click();
      // The subsequent stale-WAV safety cases change approved phrases, not
      // narration options, so expose Text's real advanced editor first.
      await personalTab.click();
      await expect(advancedText).toBeVisible();
      await advancedText.click();
      // My Voice intentionally hides the Hypno phrase picker. Return to the
      // standard Voice mode before testing the real selected-phrase editor.
      const standardVoiceMode=advancedVoice.locator('[data-video-ideas-voice-mode="voice"]');
      await expect(standardVoiceMode).toBeVisible();
      if(await standardVoiceMode.getAttribute("aria-pressed")!=="true"){
        if(engine==="webkit")await standardVoiceMode.tap();
        else await standardVoiceMode.click();
      }
      await expect(standardVoiceMode).toHaveAttribute("aria-pressed","true");
      // Phrase selection is now owned by the real Montage → Text editor.
      // Do not use the retired hidden Ideas/Hypno phrase picker. WebKit needs
      // the visitor's real touch gesture after recording and switching modes:
      // a synthetic click can leave Ideas selected with Text hidden.
      await openVisibleMontageText(page,engine);
      await expect(page.locator('[data-video-quick-control="editor"]'))
        .toHaveAttribute("aria-pressed","true",{timeout:15000});
      await expect(page.locator('[data-video-montage-tab="text"]'))
        .toHaveAttribute("aria-pressed","true",{timeout:15000});
      const phraseEditor=page.locator('[data-video-montage-text] [data-video-ideas-phrases]');
      await expect(phraseEditor).toBeVisible({timeout:15000});
      const phraseRows=phraseEditor.locator('[data-video-idea-phrase]');
      const spokenPhrase=phraseRows.filter({hasText:approved});
      await expect(spokenPhrase).toHaveCount(1);
      const spokenToggle=spokenPhrase.locator('[data-video-idea-select]');
      await expect(spokenToggle).toHaveAttribute('aria-pressed','true');
      // Adding an unspoken phrase must preserve the WAV already approved for
      // the spoken line. This uses the same visible control as a real visitor.
      const unselectedToggle=phraseEditor.locator('[data-video-idea-select][aria-pressed="false"]').first();
      await expect(unselectedToggle).toBeEnabled();
      const unselectedIndex=await unselectedToggle.getAttribute('data-video-idea-select');
      assert.ok(unselectedIndex!==null,"unselected phrase has a stable source index");
      const countBeforeAddition=Number(((await montageCountLabel.innerText()).match(/^\s*(\d+)/)||[])[1]||0);
      const optionCountBeforeAddition=await phraseRows.count();
      assert.ok(countBeforeAddition>=5,"approved phrase selection remains above the five-phrase minimum");
      assert.ok(countBeforeAddition<10,"an additional phrase can be selected below the hard maximum");
      if(engine==="webkit")await unselectedToggle.tap();
      else await unselectedToggle.click();
      await expect(phraseEditor.locator(`[data-video-idea-select="${unselectedIndex}"]`)).toHaveAttribute('aria-pressed','true');
      await expect(montageCountLabel).toHaveText(new RegExp("^\\s*"+(countBeforeAddition+1)+"\\s*/\\s*"+optionCountBeforeAddition+"\\b"));
      assert.ok(countBeforeAddition+1<=10,"adding a phrase never exceeds the ten-phrase export limit");
      assert.equal(await page.locator('[data-video-narration-stale]').isVisible(),false,
        "adding an unspoken phrase does not invalidate the actual WAV");
      await expect(page.locator('[data-video-live-audio]')).toContainText("holistic-house-hypno-audio.wav");
      // A removed spoken phrase must block stale WAV reuse or detach it before export.
      // The exact approved text remains the safety boundary; no silent reuse is allowed.
      await spokenToggle.click();
      await expect(spokenToggle).toHaveAttribute('aria-pressed','false');
      // Montage Text owns phrase selection. Its current, visible release
      // contract is a reapproval notice; navigation to Ready remains enabled.
      // Only the Ready renderer rejects stale, unapproved narration.
      await expect(page.locator('[data-video-narration-reapproval]')).toBeVisible({timeout:15000});
      await expect(page.locator('[data-video-quick-generate]')).toBeEnabled({timeout:15000});
      assert.equal(await page.locator('[data-video-live-audio]').count(),1,
        "the old WAV may remain attached, but must be unusable until narration is regenerated");
      // The explicit cloud-voice consent control belongs to its dedicated
      // Voice editor and is not mounted in Montage Text. The isolated Voice
      // component and opt-in browser tests cover that consent gate; here the
      // real Montage path must remain fail-closed while its narration is stale.
      await expect(page.locator("[data-video-narration-reapproval]")).toBeVisible();
      await expect(page.locator('[data-video-quick-generate]')).toBeEnabled();
      await page.locator('[data-video-quick-control="editor"]').click();
      await openMontageSettingsViaQuality(page);
      const montageAudioAfterExport=page.locator('[data-video-montage-open-audio]');
      if(engine==="webkit")await montageAudioAfterExport.tap();
      else await montageAudioAfterExport.click();
      await expect(page.locator('[data-video-basic-editor]')).toHaveAttribute("data-montage-panel","audio");
      await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
      // Leaving an attached stale voice invalidates export; selected music is independent.
      const soundtrackLabels=await page.locator("[data-video-live-audio]").allTextContents();
      const stillHasOldVoice=soundtrackLabels.some(label=>
        label.includes("holistic-house-hypno-audio.wav")||label.includes(expectedFileName));
      if(stillHasOldVoice)await expect(page.locator("[data-video-quick-generate]")).toBeEnabled();
      // User opens optional audio effects through Therapy > Practice.
      // All controls are real visible gestures; no synthetic consent/provider state.
      const therapyWorkspace=page.locator('[data-video-quick-control="effects"]');
      if(engine==="webkit")await therapyWorkspace.tap();
      else await therapyWorkspace.click();
      const therapyPractice=page.locator('[data-therapy-subtab="practice"]');
      await expect(therapyPractice).toBeVisible();
      if(engine==="webkit")await therapyPractice.tap();
      else await therapyPractice.click();
      await expect(therapyPractice).toHaveAttribute("aria-selected","true");
      const optionalEffects=page.locator('[data-therapy-advanced-effects]');
      const effectsSummary=optionalEffects.locator(':scope > summary');
      if(await optionalEffects.getAttribute("open")===null){
        if(engine==="webkit")await effectsSummary.tap();
        else await effectsSummary.click();
      }
      await expect(optionalEffects).toHaveAttribute("open","");
      await expect(page.locator("[data-video-hypnocorrection-panel]")).toBeVisible();
      const hypnoAudioTab=page.locator('[data-hypno-tab="audio"]');
      if(engine==="webkit")await hypnoAudioTab.tap();
      else await hypnoAudioTab.click();
      await expect(hypnoAudioTab).toHaveAttribute("aria-selected","true",{timeout:15000});
      await expect(page.locator('[data-hypno-group="audio"]')).toBeVisible({timeout:15000});
      const speechConfigure=page.locator('[data-hypno-group="audio"] [data-hypno-card] button').first();
      await expect(speechConfigure).toBeEnabled();
      if(engine==="webkit")await speechConfigure.tap();
      else await speechConfigure.click();
      await expect(page.locator("[data-hypno-speech-settings]")).toBeVisible({timeout:15000});
      const voicePanel=page.locator("[data-video-voice-studio]");
      await voicePanel.waitFor({state:"visible",timeout:25000});
      const voiceSummary=voicePanel.locator(":scope > summary");
      await expect(voiceSummary).toBeVisible();
      if(await voicePanel.getAttribute("open")===null){
        if(engine==="webkit")await voiceSummary.tap();
        else await voiceSummary.click();
      }
      // The real gesture must commit React lazy editor state, not just HTML open.
      await expect(voicePanel).toHaveAttribute("open","",{timeout:15000});
      const studio=voicePanel.locator("[data-voice-studio]");
      await studio.waitFor({state:"visible",timeout:25000});
      assert.equal(await studio.locator("[data-voice-id]").count(),6);
      await studio.locator("[data-voice-studio-generate]").click();
      await studio.locator("[data-voice-studio-audio]").waitFor({state:"visible",timeout:30000});
      const sample=payloads.find(item=>item.mode==="sample"&&item.voiceId==="mark");
      assert.ok(sample,engine+" free text-to-speech sample reached provider");
      assert.equal(sample.voiceId,"mark");
      assert.equal(sample.language,locale);
      assert.ok(!("text" in sample),"public voice sample never sends private content");
      await studio.getByRole("button",{name:locale==="ru"?"Мой текст":"My own script",exact:true}).click();
      const customText=locale==="ru"?"Сегодня я выбираю спокойствие.":"Today I choose calm.";
      await studio.locator("textarea").fill(customText);
      const studioConsent=studio.locator('input[type="checkbox"]');
      await expect(studioConsent).not.toBeChecked({timeout:10000});
      await expect(studio.locator("[data-voice-studio-generate]")).toBeDisabled();
      // Use a genuine label tap on touch WebKit: fixed bottom navigation can
      // overlap the checkbox's 19px hit area after scrolling a long editor.
      // Never set checked in page.evaluate, force a click, or waive consent.
      const consentLabel=studioConsent.locator("..");
      await consentLabel.scrollIntoViewIfNeeded();
      if(engine==="webkit")await consentLabel.tap();
      else await studioConsent.check();
      await expect(studioConsent).toBeChecked();
      await studio.locator("[data-voice-studio-generate]").click();
      await studio.locator("[data-voice-studio-audio]").waitFor({state:"visible",timeout:30000});
      const typed=payloads.find(item=>item.mode==="short_text");
      assert.ok(typed,engine+" guest short text reached TTS API");
      assert.equal(typed.text,customText);
      assert.equal(typed.consent,true);
      assert.deepEqual(errors,[],engine+" should not log client exceptions");
      phase(engine,"all-assertions-passed");
      process.stdout.write("PASS "+engine+" "+locale+" mocked TTS + locally encoded video/audio + nature WAV attachment + stale guard\n");
    }finally{phase(engine,"closing-context");await withDeadline(context.close(),10000,engine+" context.close");}
  }finally{phase(engine,"closing-browser");await withDeadline(browser.close(),10000,engine+" browser.close");phase(engine,"closed");}
}
clearTimeout(watchdog);


// Access detailed video settings through the new fifth Montage step.
// Story stays one-screen with its single quality-selection CTA.
async function openMontageSettingsViaQuality(page){
  await page.locator('[data-video-montage-tab="concept"]').click();
  await page.locator('[data-video-story-open-settings]').click();
  const advanced=page.locator('[data-video-stories-advanced]');
  await advanced.waitFor({state:"visible",timeout:20000});
  if(!await advanced.evaluate(node=>node.open))
    await advanced.locator(':scope > summary').click();
  const settings=advanced.locator('[data-video-stories-settings]');
  await settings.waitFor({state:"visible",timeout:20000});
  await settings.click();
  await expect(page.locator('[data-video-basic-editor]'))
    .toHaveAttribute("data-montage-panel","settings");
}
