/**
 * Isolated, read-only guest browser acceptance for the entire five-lesson
 * Reiki Practitioner course. Never signs in, uploads, or shares journal data.
 * Run with HH_TEST_APP_ORIGIN on local loopback only.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";
import { energyworkLessonRanges, energyworkSequence } from "../data/academy/energywork-ai-schema.js";

const origin = process.env.HH_TEST_APP_ORIGIN || "http://127.0.0.1:3100";
assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):[0-9]+$/, "Never browse a real account or production site");
const engineName = process.env.HH_TEST_BROWSER === "webkit" ? "webkit" : "chromium";
const browser = await (engineName === "webkit" ? webkit : chromium).launch();
const output = "artifacts/reiki-all-slides";
await mkdir(output, { recursive: true });
const expectedSequence = energyworkSequence();
const lessonRanges = energyworkLessonRanges(expectedSequence);
assert.equal(expectedSequence.length, 70, "One consecutive course must have 70 screens");
const milestones = new Set([1,2,4,5,6,8,11,12,14,15,16,19,21,24,25,26,34,41,49,56,62,70]);
const pageErrors = [];

async function inspect(page, { locale, width, index, id, screenshot = false }) {
  const root = page.locator("[data-energywork-ai-learner]");
  const data = await root.evaluate(element => {
    const slide = element.querySelector("[data-energywork-slide-id]");
    const scroller = slide.querySelector('[class*="slideMain"]');
    const primary = element.querySelector("button[data-energywork-next]");
    const progress = element.querySelector('[role="progressbar"]');
    const journey = element.querySelector("nav ol");
    const stageLabels = [...(journey?.querySelectorAll('[class*="journeyLabel"]') || [])].map(label => ({
      text: label.textContent?.trim() || "",
      width: label.getBoundingClientRect().width,
      height: label.getBoundingClientRect().height,
      scrollHeight: label.scrollHeight,
      clientHeight: label.clientHeight,
      clipped: getComputedStyle(label).clipPath,
    }));
    const title = element.querySelector("#energywork-slide-title");
    const rect = primary ? primary.getBoundingClientRect() : null;
    const slideRect = slide.getBoundingClientRect();
    const slideStyle = getComputedStyle(slide);
    return {
      id: slide.dataset.energyworkSlideId,
      kind: slide.dataset.energyworkSlideKind,
      phase: element.dataset.energyworkPhase,
      title: title?.textContent?.trim() || "",
      rootBackground: getComputedStyle(element).backgroundImage,
      slideBackground: slideStyle.backgroundImage,
      slideFill: slideStyle.backgroundColor,
      titleColor: getComputedStyle(title).color,
      progressCurrent: Number(progress?.getAttribute("aria-valuenow")),
      progressMax: Number(progress?.getAttribute("aria-valuemax")),
      progressLabel: element.querySelector('[class*="progressHeader"] span')?.textContent?.trim() || "",
      stageCount: journey?.children.length || 0,
      activeStage: journey?.querySelectorAll('[aria-current="step"]').length || 0,
      stageLabels,
      slideJustify: getComputedStyle(scroller).justifyContent,
      slideHeight: slideRect.height,
      titleHeaderCount: element.querySelectorAll("header").length,
      privateSaveManagerPresent: Boolean(element.querySelector('details[class*="saveManager"] aside[class*="preview"]')),
      programmeOpen: element.querySelector('button[aria-controls="reiki-journey-help"]')?.getAttribute("aria-expanded") === "true",
      programmeHeight: element.querySelector("section[data-expanded]")?.getBoundingClientRect().height ?? 0,
      slideHorizontalOverflow: scroller.scrollWidth-scroller.clientWidth,
      slideVerticalOverflow: scroller.scrollHeight-scroller.clientHeight,
      rootHorizontalOverflow: element.scrollWidth-element.clientWidth,
      ctaTop: rect?.top ?? null,
      ctaBottom: rect?.bottom ?? null,
      viewportHeight: innerHeight,
    };
  });
  const where = locale + " " + width + "px " + index + "/" + expectedSequence.length + " " + id;
  assert.equal(data.id, id, where + ": slide ID");
  assert.ok(data.title.length > 3, where + ": readable title");
  assert.equal(data.progressCurrent, index, where + ": actual slide progress");
  assert.equal(data.progressMax, expectedSequence.length, where + ": total");
  const range = lessonRanges.find(item => index - 1 >= item.start && index - 1 < item.end);
  const expectedLabel = range
    ? (locale === "ru" ? "Урок " : "Lesson ") + range.lesson + " · " + (locale === "ru" ? "Слайд " : "Slide ") +
      (index - range.start) + " " + (locale === "ru" ? "из" : "of") + " " + range.count
    : (locale === "ru" ? "Введение · Слайд " : "Introduction · Slide ") + index +
      " " + (locale === "ru" ? "из " : "of ") + lessonRanges[0].start;
  assert.equal(data.progressLabel, expectedLabel, where + ": exact within-lesson slide counter");
  assert.equal(data.stageCount, 5, where + ": five true lesson circles");
  assert.equal(data.activeStage, 1, where + ": one highlighted current stage, including course welcome");
  assert.equal(data.stageLabels.length, 5, where + ": all five lesson names are rendered");
  for (const label of data.stageLabels) {
    assert.ok(label.text.length > 4, where + ": a meaningful full stage name");
    // Review reading screens deliberately tuck labels off-screen to make space
    // for complete reviews while retaining five dots and SR-accessible names.
    if (data.kind === "voices") continue;
    assert.ok(label.width >= 34 && label.height >= 15, where + ": stage name visibly occupies space, not visually hidden: "+JSON.stringify(label));
    assert.ok(!label.clipped.includes("inset(50%)"), where + ": stage name is not clipped off-screen");
    assert.ok(label.scrollHeight <= label.clientHeight + 2, where + ": stage name is not vertically truncated");
  }
  assert.ok(data.slideJustify.includes("center"), where + ": lesson content is vertically balanced in its available space");
  assert.ok(data.rootBackground.includes("reiki-heaven-sky.svg"), where + ": approved airy-sky background");
  assert.ok(data.privateSaveManagerPresent, where + ": private saving is accessible from the separate progress icon");
  assert.equal(data.programmeOpen, false, where + ": journey hint is collapsed unless requested");
  assert.ok(data.programmeHeight > 25 && data.programmeHeight < 48,
    where + ": collapsed hint keeps a single compact bottom row");
  assert.equal(data.titleHeaderCount, data.kind === "welcome" ? 1 : 0,
    where + ": redundant top buttons hidden on inner slides");
  assert.ok(data.slideHorizontalOverflow <= 2, where + ": no slide horizontal overflow");
  assert.ok(data.rootHorizontalOverflow <= 3, where + ": no root horizontal overflow");
  assert.ok(data.slideHeight >= 80, where + ": visible teaching viewport");
  if (data.kind !== "welcome") {
    assert.ok(data.slideBackground.includes("gradient") || data.slideFill.includes("rgba("), where + ": glass panel background");
  }
  if (index < expectedSequence.length) {
    assert.ok(data.ctaTop >= -1 && data.ctaBottom <= data.viewportHeight + 2,
      where + ": action stays reachable above mobile browser safe area; " + JSON.stringify(data));
  }
  if (data.kind === "practice") await expect(page.locator('[data-energywork-slide-kind="practice"]').locator('[class*="practiceTimer"]')).toBeVisible();
  if (id === "flight-03" || id === "tan-03") {
    await expect(page.locator('[class*="practiceTimer"] strong')).toHaveText("1:00");
    await expect(page.locator('[class*="practiceTimer"] button').first()).toContainText(locale === "ru" ? "1 минуту" : "1 minute");
    await expect(page.locator('input[type="radio"][name="' + id + '"]')).toHaveCount(2);
    assert.ok(data.slideVerticalOverflow <= 2, where + ": practice should fit on one mobile screen: " + JSON.stringify(data));
  }
  if (data.kind === "video") await expect(page.locator('[data-energywork-slide-kind="video"]').locator('div[class*="_video__"]')).toBeVisible();
  if (data.kind === "reflection") await expect(page.locator('[data-energywork-slide-kind="reflection"]').locator('div[class*="_question__"]')).toBeVisible();
  if (data.kind === "finish") await expect(page.locator('[data-energywork-slide-kind="finish"]').locator('div[class*="_final__"]')).toBeVisible();
  if (data.kind === "voices") {
    await expect(page.locator("[data-meditation-voices]")).toBeVisible();
    await expect(root).toHaveAttribute("data-reiki-reviews", "v4");
    const portrait = page.locator('[data-energywork-slide-kind="voices"] img[alt]');
    await expect(portrait).toHaveAttribute("src", /reiki-approved-sunrise-v3\.webp/);
    await expect(portrait).toHaveJSProperty("complete", true);
    const loaded = await portrait.evaluate((image) => image.naturalWidth);
    assert.ok(loaded > 0, where + ": the approved human portrait loads");
    const expectedReviews = id === "ygg-voices" ? 5 : id === "tan-voices" ? 4 : 0;
    const carousel = page.locator("[data-meditation-review-carousel]");
    if (expectedReviews) {
      await expect(carousel).toHaveAttribute("data-review-count", String(expectedReviews));
      await expect(page.locator('[data-meditation-voices] [class*="voicesReferences"] a')).toHaveCount(2);
      await expect(page.locator('[data-meditation-voices] [class*="voicesIndex"]')).toHaveText('01 / 0' + expectedReviews);
      const first = await carousel.locator("blockquote p").innerText();
      await page.locator("button[data-review-next]").click();
      await expect(page.locator("[data-energywork-slide-id]")).toHaveAttribute("data-energywork-slide-id", id);
      await expect(page.locator('[data-meditation-voices] [class*="voicesIndex"]')).toHaveText('02 / 0' + expectedReviews);
      assert.notEqual(await carousel.locator("blockquote p").innerText(), first, where + ": Next switches quote in place");
      await page.locator("button[data-review-prev]").click();
      assert.equal(await carousel.locator("blockquote p").innerText(), first, where + ": Previous restores quote");
    } else {
      await expect(carousel).toHaveCount(0);
      await expect(page.locator('[data-meditation-voices] [class*="voicesReferences"] a')).toHaveCount(1);
      await expect(page.locator("button[data-review-next]")).toHaveCount(0);
      await expect(page.locator("[data-meditation-voices] a[href*='youtube.com/watch']")).toHaveCount(1);
    }
  }
  if (data.kind === "milestone") {
    // A guest can continue without falsely claiming that private progress was saved.
    await expect(page.locator("button[data-energywork-next]")).toHaveText(
      locale === "ru" ? "Перейти к следующему уроку" : "Continue to the next lesson");
    await expect(page.locator("button[data-energywork-save-progress]")).toHaveCount(0);
    await expect(page.locator('[class*="milestoneActions"] button')).toHaveCount(2);
  } else {
    await expect(page.locator("button[data-energywork-save-progress]")).toHaveCount(0);
  }
  if (screenshot) {
    await page.screenshot({ path: output+"/"+engineName+"-"+locale+"-"+width+"-"+String(index).padStart(2,"0")+"-"+id+".png", animations:"disabled", timeout:30000 });
  }
  console.log("REIKI_SCREEN_QA", JSON.stringify({engine:engineName, locale, width, index, id, kind:data.kind, phase:data.phase}));
}

async function exerciseJourney(page, locale, width) {
  await page.setViewportSize({width, height:844});
  await page.goto(origin+"/"+locale+"/academy/principles-of-energywork/learn", { waitUntil:"domcontentloaded",timeout:90000 });
  const root = page.locator("[data-energywork-ai-learner]");
  await expect(root).toBeVisible({timeout:90000});
  await expect(page.locator('button[data-energywork-next]')).toBeEnabled({timeout:60000});
  await expect(root).toHaveAttribute("data-course-version","2026-10-19.p7");

  // Opening the bottom hint should consume height in the flex column,
  // shrinking the slide instead of overlaying its contents.
  const journeyToggle = root.locator('button[aria-controls="reiki-journey-help"]');
  const journeyInfo = root.locator("#reiki-journey-help");
  const slideArea = root.locator("[data-energywork-slide-id]");
  const closedRect = await slideArea.boundingBox();
  assert.ok(closedRect?.height, "Initial lesson must be visible before opening the hint");
  await journeyToggle.click();
  await expect(journeyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(journeyInfo).toBeVisible();
  await expect(root.locator('section[data-expanded]')).toHaveAttribute("data-expanded", "true");
  const openRect = await slideArea.boundingBox();
  assert.ok(openRect && openRect.height < closedRect.height - 30,
    "Journey hint must push the lesson slide upward instead of floating above it");
  const infoRect = await journeyInfo.boundingBox();
  const toggleRect = await journeyToggle.boundingBox();
  const hintLayout = await root.locator("section[data-expanded]").evaluate((element) => ({
    display: getComputedStyle(element).display,
    flexDirection: getComputedStyle(element).flexDirection,
    children: [...element.children].map(child => ({
      tag: child.tagName,
      top: child.getBoundingClientRect().top,
      bottom: child.getBoundingClientRect().bottom,
      position: getComputedStyle(child).position,
      order: getComputedStyle(child).order,
    })),
  }));
  assert.ok(infoRect && toggleRect && infoRect.y + infoRect.height <= toggleRect.y + 2,
    "Explanations appear above the bottom-row toggle: " + JSON.stringify({ infoRect, toggleRect, hintLayout }));
  for (const path of ["reiki/tantra-reiki", "reiki/kundalini-reiki", "reiki/yggdrasil"]) {
    const link = journeyInfo.locator('a[href="/' + locale + '/academy/' + path + '"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("target", "_blank");
  }
  await journeyToggle.click();
  await expect(journeyToggle).toHaveAttribute("aria-expanded", "false");
  await expect(journeyInfo).toBeHidden();
  const restoredRect = await slideArea.boundingBox();
  assert.ok(restoredRect && restoredRect.height >= closedRect.height - 4,
    "Collapsing the hint restores the lesson space");
  const journey = [];
  for (let n=0;n<expectedSequence.length;n++) {
    const index = n+1;
    const id = expectedSequence[n];
    const current = page.locator("[data-energywork-slide-id]");
    await expect(current).toHaveAttribute("data-energywork-slide-id",id,{timeout:30000});
    const capture = milestones.has(index);
    await inspect(page,{locale,width,index,id,screenshot:capture});
    journey.push(id);
    if (id==="welcome-02") {
      await page.locator('input[name="welcome-02"][value="beginner"]').check();
    }
    if (["flight-04","tan-04","kun-04","ygg-04"].includes(id)) {
      // A written review of at least 50 characters is required; no numeric meditation rating.
      const reviewButton = page.locator("button[data-energywork-next]");
      await expect(reviewButton).toBeDisabled();
      await expect(page.locator('[data-meditation-feeling]')).toHaveCount(0);
      await expect(reviewButton).toContainText(locale==="ru" ? "Сохранить отзыв" : "Save review");
      const field = page.locator('textarea[id="answer-'+id+'"]');
      await field.fill('x'.repeat(49));
      await expect(reviewButton).toBeDisabled();
      await expect(page.locator('[class*="feedbackCount"]')).toContainText(locale==='ru' ? 'минимум 50' : 'minimum 50');
      await field.fill('x'.repeat(50));
      await expect(reviewButton).toBeEnabled();
      // A long, detailed review must remain fully editable; 50 is only a minimum.
      const longReview='x'.repeat(2500);
      await field.fill(longReview);
      await expect(field).toHaveValue(longReview);
      await expect(reviewButton).toBeEnabled();
      await expect(page.locator('[class*="feedbackCount"]')).toContainText('2500');
      await field.fill(locale==="ru"
        ? "Я заметил(а), что дыхание стало спокойнее и появилось тепло." : "I noticed my breathing became calmer and I felt warmth and ease.");
      await expect(reviewButton).toBeEnabled();
    }
    if (id.startsWith("kun-question-") || id === "ygg-06" || id.startsWith("ygg-study-")) {
      const nextButton = page.locator("button[data-energywork-next]");
      const hint = page.locator("[data-reiki-study-hint]");
      const source = id.startsWith("kun") ? "kundalini-reiki" : "yggdrasil";
      await expect(hint).toHaveAttribute("href", "/" + locale + "/academy/reiki/" + source);
      await expect(hint).toHaveAttribute("target", "_blank");
      await expect(nextButton).toBeDisabled();
      if (id.startsWith("kun-question-") && id !== "kun-question-06") {
        const choices = page.locator('input[type="radio"][name="'+id+'"]');
        await expect(choices).toHaveCount(id === "kun-question-05" ? 4 : 3);
        await choices.first().check();
        await expect(page.locator("[data-kundalini-answer-explanation]")).toBeVisible();
      } else {
        const answer = page.locator('textarea[id="answer-' + id + '"]');
        await expect(answer).toHaveAttribute("required", "");
        await answer.fill("   ");
        await expect(nextButton).toBeDisabled();
        await answer.fill(locale === "ru" ? "Моё внимание сейчас в плечах." : "I would gently focus on my shoulders.");
        if (id === "kun-question-06")
          await expect(page.locator("[data-kundalini-answer-explanation]")).toBeVisible();
      }
      await expect(nextButton).toBeEnabled();
    }
    if (id === "tan-06" || id.startsWith("tan-study-")) {
      const nextButton = page.locator("button[data-energywork-next]");
      const hint = page.locator("[data-tantra-study-hint]");
      await expect(hint).toHaveAttribute("href", new RegExp("^/" + locale + "/academy/reiki/tantra-reiki#tantra-"));
      await expect(hint).toHaveAttribute("target", "_blank");
      const answer = page.locator('textarea[id="answer-' + id + '"]');
      await expect(answer).toHaveAttribute("required", "");
      await expect(nextButton).toBeDisabled();
      await answer.fill("   ");
      await expect(nextButton).toBeDisabled();
      await answer.fill(locale === "ru" ? "Мой короткий ответ по материалу." : "My short answer from the guide.");
      if (id === "tan-study-02") {
        const second = page.locator('textarea[id="answer-tan-study-03"]');
        await expect(page.locator("[data-tantra-study-combined]")).toHaveCount(1);
        await expect(second).toHaveAttribute("required", "");
        await expect(nextButton).toBeDisabled();
        await second.fill("   ");
        await expect(nextButton).toBeDisabled();
        await second.fill(locale === "ru" ? "Применение системы из материала." : "Uses of the system from the guide.");
      }
      await expect(nextButton).toBeEnabled();
    }
    if (index===expectedSequence.length) break;
    const next = page.locator("button[data-energywork-next]");
    await expect(next).toBeEnabled({timeout:30000});
    await next.click();
  }
  assert.deepEqual(journey,expectedSequence,locale+": all 70 sequential slides reached without picking branches");
  await expect(page.locator("[data-energywork-slide-kind='finish']")).toBeVisible();
  await expect(page.locator("[data-initiation-readiness]")).toHaveCount(0);
  console.log("REIKI_JOURNEY_SUCCESS",JSON.stringify({engine:engineName,locale,width,slides:journey.length}));
}

/* Screenshot-equivalent short mobile viewport: first-view course instructions should
   fit without scrolling the inner teaching panel. Videos and extensive lessons
   remain scrollable, but these introductory controls must fit. */
async function verifyShortViewport(page,locale) {
  await page.setViewportSize({width:375,height:625});
  await page.goto(origin+"/"+locale+"/academy/principles-of-energywork/learn",{waitUntil:"domcontentloaded",timeout:90000});
  await expect(page.locator("button[data-energywork-next]")).toBeEnabled({timeout:60000});

  async function expectFits(id) {
    await expect(page.locator("[data-energywork-slide-id]")).toHaveAttribute("data-energywork-slide-id",id);
    const dimensions = await page.locator("[data-energywork-slide-id] [class*='slideMain']").evaluate(node=>{
      // Inspect the initial (unscrolled) view, not Playwright's auto-scrolled
      // radio-button state. A choice may technically exist yet be cut off.
      node.scrollTop = 0;
      const panel = node.getBoundingClientRect();
      const within = selector => {
        const item = node.querySelector(selector);
        if (!item) return null;
        const rect = item.getBoundingClientRect();
        return {top:rect.top, bottom:rect.bottom, height:rect.height};
      };
      return {
        used:node.scrollHeight,
        space:node.clientHeight,
        width:innerWidth,
        height:innerHeight,
        justify:getComputedStyle(node).justifyContent,
        panelTop:panel.top,
        panelBottom:panel.bottom,
        benefit:within('[class*="benefits"]'),
        lastChoice:within('[class*="experienceChoice"]:last-child'),
        selectedGuidance:within('[class*="experienceGuidance"]'),
        reviewPortrait:within('[class*="art"]'),
        milestoneBadge:within('[class*="milestoneCard"]'),
      };
    });
    // Welcome and introductory photo/video slides should fit by design.
    // Dense translated answers or timer+reflection may scroll naturally:
    // never make the type tiny or hide the five course stage names to force fit.
    const allowedExtra = id === "flight-done" ? 3 : id === "welcome-02" ? 110 : 35;
    assert.ok(dimensions.used <= dimensions.space + allowedExtra,
      locale+" "+id+" must not require excessive inner scrolling on 375×625: "+JSON.stringify(dimensions));
    assert.ok(dimensions.justify.includes("center"),
      locale+" "+id+" should balance short teaching content vertically");
    const bottomMargin = 3;
    if (id === "welcome-01") {
      assert.ok(dimensions.benefit, locale+" welcome benefits are present");
      assert.ok(dimensions.benefit.bottom <= dimensions.panelBottom + bottomMargin,
        locale+" welcome benefit card must not be cut off: "+JSON.stringify(dimensions));
    }
    if (id === "welcome-02") {
      assert.ok(dimensions.lastChoice, locale+" fourth radio is present");
      assert.ok(dimensions.lastChoice.bottom <= dimensions.panelBottom + bottomMargin,
        locale+" fourth Reiki-experience option must be visible without scrolling: "+JSON.stringify(dimensions));
      if (dimensions.selectedGuidance) {
        assert.ok(dimensions.selectedGuidance.bottom <= dimensions.panelBottom + bottomMargin,
          locale+" selected experience guidance must fit after fourth option: "+JSON.stringify(dimensions));
      }
    }
    if (id === "flight-voices") {
      assert.ok(dimensions.reviewPortrait && dimensions.reviewPortrait.height >= 98,
        locale+" review portrait must be a real recognizable photograph, not a tiny strip: "+JSON.stringify(dimensions));
    }
    if (id === "flight-done") {
      assert.ok(dimensions.reviewPortrait && dimensions.reviewPortrait.height >= 88 &&
        dimensions.reviewPortrait.bottom <= dimensions.panelBottom + bottomMargin,
        locale+" first lesson sunrise photo must fit without scrolling: "+JSON.stringify(dimensions));
      assert.ok(dimensions.milestoneBadge && dimensions.milestoneBadge.bottom <= dimensions.panelBottom + bottomMargin,
        locale+" compact achievement badge must fit without scrolling: "+JSON.stringify(dimensions));
    }
  }

  await expectFits("welcome-01");
  await page.locator("button[data-energywork-next]").click();
  await expectFits("welcome-02");
  await page.locator('input[name="welcome-02"][value="master"]').check();
  await expectFits("welcome-02"); // inspect the longest end-of-list selection
  await page.locator('input[name="welcome-02"][value="beginner"]').check();
  await expectFits("welcome-02"); // and the normal intro choice
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-01");
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-02"); // video poster remains visible without autoplay
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-03"); // one-minute light and warmth practice on slide 3
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-voices");
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-05"); // slide 5: optional Sun symbolism thought
  await page.locator('textarea[id="answer-flight-05"]').fill(locale==="ru"
    ? "Солнце для меня символ ясности." : "The Sun symbolizes clarity for me.");
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-04"); // slide 6: required meditation feedback
  await page.locator('textarea[id="answer-flight-04"]').fill(locale==="ru"
    ? "Я заметил(а), что дыхание стало спокойнее и появилось тепло."
    : "I noticed my breathing became calmer and I felt warmth and ease.");
  await expect(page.locator("button[data-energywork-next]")).toBeEnabled();
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-done");
  const photo = page.locator('[data-energywork-slide-id="flight-done"] img');
  await expect(photo).toHaveAttribute("src",/reiki-approved-sunrise-v3\.webp/);
  await expect(photo).toHaveJSProperty("complete",true);
  assert.ok(await photo.evaluate(node=>node.naturalWidth)>0,locale+": the sunrise portrait must load");
  await expect(page.locator('[data-energywork-slide-id="flight-done"] [class*="milestoneCard"]'))
    .not.toContainText(/Personal initiation and group membership|Инициация и вступление в сообщество/);
  await page.screenshot({path:output+"/"+engineName+"-"+locale+"-375-short-flight-done.png",animations:"disabled",timeout:30000});
  console.log("REIKI_SHORT_VIEWPORT_BALANCE",JSON.stringify({engine:engineName,locale,width:375,height:625,slides:9}));
}

const context = await browser.newContext({ viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:"reduce",hasTouch:true });
const page = await context.newPage();
page.on("pageerror", error => pageErrors.push(String(error.message).slice(0,300)));
try {
  const image = await page.request.get(origin+"/images/holistic-house/reiki-heaven-sky.svg");
  assert.equal(image.status(),200,"Approved local sky background must be served");
  assert.match(image.headers()["content-type"]||"",/image\/svg\+xml/);
  for (const [locale,width] of [["en",390],["ru",320]]) await exerciseJourney(page,locale,width);
  // Additional layout sizes: these reuse the same guest-only route, no persistence.
  for (const [locale,width] of [["en",375],["ru",430]]) {
    await page.setViewportSize({width,height:844});
    await page.goto(origin+"/"+locale+"/academy/principles-of-energywork/learn",{waitUntil:"domcontentloaded",timeout:90000});
    await expect(page.locator('button[data-energywork-next]')).toBeEnabled({timeout:60000});
    await inspect(page,{locale,width,index:1,id:"welcome-01",screenshot:true});
  }
  for (const locale of ["en","ru"]) await verifyShortViewport(page,locale);
  assert.deepEqual(pageErrors,[],"No unexpected browser JavaScript exceptions");
  console.log("REIKI_ALL_SLIDES_BROWSER_PASS", JSON.stringify({engine:engineName,count:70,locales:["en","ru"],mobileWidths:[320,375,390,430]}));
} finally {
  await browser.close();
}
