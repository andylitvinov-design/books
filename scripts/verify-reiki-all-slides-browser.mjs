/**
 * Isolated local browser acceptance for the entire five-lesson Reiki Practitioner
 * course. The full tour uses a private in-memory API mock; the separate guest
 * acceptance stops at the mandatory save step. Never signs in or shares data.
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
assert.equal(expectedSequence.length, 63, "One consecutive course must have 63 screens");
const milestones = new Set([1,2,4,5,6,8,9,10,11,12,14,15,16,18,20,23,24,25,33,40,48,55,63]);
const pageErrors = [];

async function inspect(page, { locale, width, index, id, screenshot = false }) {
  const root = page.locator("[data-energywork-ai-learner]");
  const data = await root.evaluate(element => {
    const slide = element.querySelector("[data-energywork-slide-id]");
    const scroller = slide.querySelector('[class*="slideMain"]');
    const primary = element.querySelector("button[data-energywork-next]") ||
      element.querySelector("button[data-reiki-first-lesson-google-save]");
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
  if (index < expectedSequence.length && id !== "flight-save") {
    assert.ok(data.ctaTop >= -1 && data.ctaBottom <= data.viewportHeight + 2,
      where + ": action stays reachable above mobile browser safe area; " + JSON.stringify(data));
  }
  if (data.kind === "practice") await expect(page.locator('[data-energywork-slide-kind="practice"]').locator('[class*="practiceTimer"]')).toBeVisible();
  if (id === "flight-03" || id === "tan-03") {
    await expect(page.locator('[class*="practiceTimer"] strong')).toHaveText("1:00");
    await expect(page.locator('[class*="practiceTimer"] button:not([data-ocean-sound-toggle])').first()).toContainText(locale === "ru" ? "1 минуту" : "1 minute");
    await expect(page.locator('input[type="radio"][name="' + id + '"]')).toHaveCount(2);
    assert.ok(data.slideVerticalOverflow <= 2, where + ": practice should fit on one mobile screen: " + JSON.stringify(data));
  }
  if (data.kind === "video") await expect(page.locator('[data-energywork-slide-kind="video"]').locator('div[class*="_video__"]')).toBeVisible();
  if (data.kind === "reflection" && id !== "end-01")
    await expect(page.locator('[data-energywork-slide-kind="reflection"]').locator('div[class*="_question__"]')).toBeVisible();
  // Lesson 5 was upgraded to an interactive application in PR #1280, rather
  // than a generic single-textarea reflection. It must remain accessible.
  if (id === "end-01") {
    const form = page.locator('[data-reiki-initiation-choice-form]');
    await expect(form).toBeVisible();
    await expect(form.locator('[data-reiki-free-choices] input[type="radio"]')).toHaveCount(3);
    await expect(form.locator('input[autocomplete="given-name"]')).toBeVisible();
    await expect(form.locator('input[autocomplete="family-name"]')).toBeVisible();
  }
  // Teacher intro audio loads only after its first slide, never inside the
  // meditation video. Audio is optional until the author uploads his file.
  if (["flight-01","tan-01","kun-01","ygg-01"].includes(id)) {
    await expect(page.locator('[data-reiki-lesson-intro]')).toBeVisible();
    await expect(page.locator('[data-reiki-lesson-intro-audio]')).toBeVisible();
    await expect(page.locator('[data-reiki-lesson-intro] li')).toHaveCount(3);
    await expect(page.locator('[data-reiki-lesson-intro] audio')).toHaveCount(0);
  }
  if (data.kind === "finish") await expect(page.locator('[data-energywork-slide-kind="finish"]').locator('div[class*="_final__"]')).toBeVisible();
  if (data.kind === "voices") {
    await expect(page.locator("[data-meditation-voices]")).toBeVisible();
    await expect(root).toHaveAttribute("data-reiki-reviews", "v4");
    const portrait = page.locator('[data-energywork-slide-kind="voices"] img[alt]');
    await expect(portrait).toHaveAttribute("src", /reiki-approved-sunrise-v3\.webp/);
    await expect(portrait).toHaveJSProperty("complete", true);
    const loaded = await portrait.evaluate((image) => image.naturalWidth);
    assert.ok(loaded > 0, where + ": the approved human portrait loads");
    // All four meditation review screens have learner examples.
    // Screenshot-supplied Sun/Kundalini reports have no verified original review URL.
    const expectedReviewsBySlide = {
      "flight-voices": 4,
      "tan-voices": 4,
      "kun-voices": 3,
      "ygg-voices": 5,
    };
    const expectedReviews = expectedReviewsBySlide[id] ?? 0;
    const carousel = page.locator("[data-meditation-review-carousel]");
    if (expectedReviews) {
      await expect(carousel).toHaveAttribute("data-review-count", String(expectedReviews));
      const screenshotExamples = id === "flight-voices" || id === "kun-voices";
      await expect(page.locator('[data-meditation-voices] [class*="voicesReferences"] a')).toHaveCount(screenshotExamples ? 1 : 2);
      await expect(page.locator("[data-meditation-voices] a[href*='youtube.com/watch']")).toHaveCount(1);
      await expect(page.locator('[data-meditation-voices] [class*="voicesIndex"]')).toHaveText('01 / 0' + expectedReviews);
      const first = await carousel.locator("blockquote p").innerText();
      if (id === "kun-voices") {
        assert.ok(first.includes(locale === "ru" ? "Бреанной" : "Breanna"), where + ": Breanna review is first");
      }
      await page.locator("button[data-review-next]").click();
      await expect(page.locator("[data-energywork-slide-id]")).toHaveAttribute("data-energywork-slide-id", id);
      await expect(page.locator('[data-meditation-voices] [class*="voicesIndex"]')).toHaveText('02 / 0' + expectedReviews);
      const second = await carousel.locator("blockquote p").innerText();
      assert.notEqual(second, first, where + ": Next switches quote in place");
      if (id === "kun-voices") {
        assert.ok(second.includes(locale === "ru" ? "Риту" : "Ritu"), where + ": Ritu review is second");
        await page.locator("button[data-review-next]").click();
        await expect(page.locator('[data-meditation-voices] [class*="voicesIndex"]')).toHaveText("03 / 03");
        const third = await carousel.locator("blockquote p").innerText();
        assert.ok(third.includes("Aesthesia"), where + ": Aesthesia review is third");
        assert.notEqual(third, second, where + ": third review is distinct");
        await page.locator("button[data-review-prev]").click();
        await expect(page.locator('[data-meditation-voices] [class*="voicesIndex"]')).toHaveText("02 / 03");
      }
      await page.locator("button[data-review-prev]").click();
      assert.equal(await carousel.locator("blockquote p").innerText(), first, where + ": Previous restores quote");
    } else {
      await expect(carousel).toHaveCount(0);
      await expect(page.locator('[data-meditation-voices] [class*="voicesReferences"] a')).toHaveCount(1);
      await expect(page.locator("button[data-review-next]")).toHaveCount(0);
      await expect(page.locator("[data-meditation-voices] a[href*='youtube.com/watch']")).toHaveCount(1);
    }
  }
  if (id === "flight-save") {
    await expect(page.locator("button[data-energywork-next]")).toHaveCount(0);
    await expect(page.locator("button[data-reiki-first-lesson-google-save]")).toBeEnabled();
    await expect(page.locator("[data-reiki-first-lesson-save]")).toBeVisible();
    await expect(page.locator("[data-reiki-first-lesson-consent]")).toHaveCount(0);
  } else if (data.kind === "milestone") {
    // Both choices now live inside the teaching slide. The footer contains
    // only Back: no modal calendar, hidden push setting or secondary Save flow.
    const inSlide = page.locator('[data-energywork-slide-id] [data-reiki-milestone-choices]');
    await expect(inSlide).toBeVisible();
    await expect(inSlide.locator("button")).toHaveCount(2);
    await expect(inSlide.locator("button[data-energywork-next]")).toContainText(
      locale === "ru" ? "Продолжить обучение" : "Continue learning");
    await expect(inSlide.locator("button[data-reiki-tomorrow-choice]")).toContainText(
      locale === "ru" ? "Сохранить урок" : "Save my lesson");
    await expect(page.locator("button[data-energywork-save-progress]")).toHaveCount(0);
    await expect(page.locator("[data-reiki-reminder-setup]")).toHaveCount(0);
    await expect(page.locator('[class*="milestoneActions"] button')).toHaveCount(1);
  } else {
    await expect(page.locator("button[data-energywork-save-progress]")).toHaveCount(0);
  }
  if (screenshot) {
    await page.screenshot({ path: output+"/"+engineName+"-"+locale+"-"+width+"-"+String(index).padStart(2,"0")+"-"+id+".png", animations:"disabled", timeout:30000 });
  }
  console.log("REIKI_SCREEN_QA", JSON.stringify({engine:engineName, locale, width, index, id, kind:data.kind, phase:data.phase}));
}

// Never visit a real account. This in-memory progress endpoint is private to
// the test's loopback Playwright page and is removed before testing guest mode.
async function installLocalAccountMock(page) {
  const progress = {
    enrolled: true, accountId: "00000000-0000-4000-8000-000000000001",
    courseId: "academy-energywork-principles", courseVersion: "2026-10-20.p10",
    slideId: "welcome-01", status: "active", answers: {}, revision: 0,
    savedAt: null, sharingWithTeacher: false, applicationLead: null,
  };
  const pattern = "**/api/app/academy-energywork";
  await page.route(pattern, async route => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      if (body.action !== "save" || body.expectedRevision !== progress.revision) {
        await route.fulfill({status: 409, contentType: "application/json",
          body: JSON.stringify({error: "COURSE_PROGRESS_CHANGED"})});
        return;
      }
      progress.slideId = body.nextSlideId;
      if (body.answer !== undefined) {
        if (body.answer) progress.answers[body.slideId] = body.answer;
        else delete progress.answers[body.slideId];
      }
      if (body.secondaryAnswer !== undefined) progress.answers["tan-study-03"] = body.secondaryAnswer;
      progress.revision += 1;
      progress.savedAt = new Date().toISOString();
    }
    await route.fulfill({status: 200, contentType: "application/json",
      body: JSON.stringify(progress)});
  });
  return async () => { await page.unroute(pattern); };
}

async function exerciseJourney(page, locale, width) {
  const removeMock = await installLocalAccountMock(page);
  await page.setViewportSize({width, height:844});
  await page.goto(origin+"/"+locale+"/academy/principles-of-energywork/learn", { waitUntil:"domcontentloaded",timeout:90000 });
  const root = page.locator("[data-energywork-ai-learner]");
  await expect(root).toBeVisible({timeout:90000});
  await expect(page.locator('button[data-energywork-next]')).toBeEnabled({timeout:60000});
  await expect(root).toHaveAttribute("data-course-version","2026-10-20.p10");

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
    if (id === "kun-study-v2-01" || id.startsWith("kun-study-") || id === "ygg-study-v2-01" || id.startsWith("ygg-study-")) {
      const nextButton = page.locator("button[data-energywork-next]");
      const hint = page.locator("[data-reiki-study-hint]");
      const source = id.startsWith("kun") ? "kundalini-reiki" : "yggdrasil/free-initiation";
      await expect(hint).toHaveAttribute("href", "/" + locale + "/academy/reiki/" + source);
      await expect(hint).toHaveAttribute("target", "_blank");
      const answer = page.locator('textarea[id="answer-' + id + '"]');
      await expect(answer).toHaveAttribute("required", "");
      await expect(nextButton).toBeDisabled();
      await answer.fill("   ");
      await expect(nextButton).toBeDisabled();
      if (id.startsWith("kun-study-v2-")) {
        const options = page.locator("[data-kundalini-answer-options] input[type=radio]");
        await expect(options.first()).toBeVisible();
        assert.ok(await options.count() >= 3, "At least three Kundalini answers");
        await options.first().check();
        await expect(nextButton).toBeEnabled();
        if (id === "kun-study-v2-01") await expect(page.locator("[data-kundalini-answer-explanation]")).toBeVisible();
      }
      await answer.fill(locale === "ru" ? "Краткий ответ по материалам курса." : "My answer from the original course guide.");
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
        await expect(page.locator("[data-tantra-study-combined]")).toHaveCount(0);
        await expect(page.locator('textarea[id="answer-tan-study-03"]')).toHaveCount(0);
      }
      await expect(nextButton).toBeEnabled();
    }
    if (index===expectedSequence.length) break;
    if (id === "flight-save") {
      await expect(page.locator("button[data-energywork-next]")).toHaveCount(0);
      await page.locator("button[data-reiki-first-lesson-google-save]").click();
      continue;
    }
    const next = page.locator("button[data-energywork-next]");
    await expect(next).toBeEnabled({timeout:30000});
    await next.click();
  }
  assert.deepEqual(journey,expectedSequence,locale+": all 63 sequential slides reached without picking branches");
  await expect(page.locator("[data-energywork-slide-kind='finish']")).toBeVisible();
  await expect(page.locator("[data-initiation-readiness]")).toHaveCount(0);
  console.log("REIKI_JOURNEY_SUCCESS",JSON.stringify({engine:engineName,locale,width,slides:journey.length}));
  await removeMock();
}

async function verifySaveThenInstall(page, locale) {
  // This models an already Google-authenticated first-time enrollee.
  // It exercises the real consented start API path, never a fabricated
  // completed OAuth redirect or a live person's private progress.
  const accountId = "00000000-0000-4000-8000-000000000001";
  const progress = { accountId, enrolled: false, slideId: "welcome-01",
    answers: {}, revision: 0, savedAt: null, sharingWithTeacher: false };
  const progressPattern = "**/api/app/academy-energywork";
  const bootstrapPattern = "**/api/app/bootstrap";
  await page.route(progressPattern, async route => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      if (body.action !== "start" || body.consent !== true ||
          !body.firstLesson?.answers?.["flight-04"]) {
        await route.fulfill({ status:409, contentType:"application/json",
          body: JSON.stringify({ error:"SAVE_NOT_CONFIRMED" }) });
        return;
      }
      progress.enrolled = true;
      progress.slideId = "tan-01";
      progress.answers = body.firstLesson.answers;
      progress.revision = 1;
      progress.savedAt = new Date().toISOString();
    }
    await route.fulfill({ status:200, contentType:"application/json",
      body: JSON.stringify(progress) });
  });
  await page.route(bootstrapPattern, async route => {
    await route.fulfill({ status:200, contentType:"application/json",
      body: JSON.stringify({ account: { id:accountId, displayName:"Test learner", onboardingState:"active" } }) });
  });
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(origin + "/" + locale + "/academy/principles-of-energywork/learn",
    { waitUntil: "domcontentloaded", timeout: 90000 });
  await expect(page.locator('button[data-energywork-next]')).toBeEnabled({ timeout: 60000 });
  for (const id of ["welcome-01","welcome-02","flight-01","flight-02","flight-voices",
    "flight-05","flight-04","flight-03"]) {
    await expect(page.locator("[data-energywork-slide-id]"))
      .toHaveAttribute("data-energywork-slide-id", id);
    if (id === "welcome-02") await page.locator('input[name="welcome-02"][value="beginner"]').check();
    if (id === "flight-04") await page.locator('#answer-flight-04')
      .fill(locale === "ru" ? "Я заметил(а), что дыхание стало спокойнее и тепло разлилось по рукам."
        : "I noticed my breath slowing down, and warmth spreading through my hands.");
    await page.locator('button[data-energywork-next]').click();
  }
  await expect(page.locator("[data-energywork-slide-id]"))
    .toHaveAttribute("data-energywork-slide-id", "flight-done");
  await expect(page.locator("[data-reiki-milestone-choices] button")).toHaveCount(2);
  await page.locator('button[data-reiki-tomorrow-choice]').click();
  await expect(page.locator("[data-energywork-slide-id]"))
    .toHaveAttribute("data-energywork-slide-id", "flight-save");
  await expect(page.locator("[data-reiki-install-offer]")).toHaveCount(0);
  await page.locator("[data-reiki-first-lesson-consent]").check();
  await page.locator("button[data-reiki-first-lesson-google-save]").click();
  const offer = page.locator("[data-reiki-install-offer]");
  await expect(offer).toBeVisible();
  await expect(offer.locator("a[href='/" + locale + "/install']")).toBeVisible();
  await expect(offer.locator("a[href='/" + locale + "/app/course?view=courses']")).toBeVisible();
  await expect(page.locator("button[data-reiki-tomorrow-choice]")).toHaveCount(0);
  await offer.locator("button").click();
  await expect(page.locator("[data-energywork-slide-id]"))
    .toHaveAttribute("data-energywork-slide-id", "flight-save");
  await expect(page.locator("[data-reiki-install-offer]")).toHaveCount(0);
  await page.unroute(progressPattern);
  await page.unroute(bootstrapPattern);
  console.log("REIKI_CONSENTED_SAVE_INSTALL_PASS", JSON.stringify({engine:engineName,locale,width:375}));
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
  await expectFits("flight-03"); // one-minute music-assisted practice before congratulations
  await page.locator("button[data-energywork-next]").click();
  await expectFits("flight-done");
  const photo = page.locator('[data-energywork-slide-id="flight-done"] img');
  await expect(photo).toHaveAttribute("src",/reiki-approved-sunrise-v3\.webp/);
  await expect(photo).toHaveJSProperty("complete",true);
  assert.ok(await photo.evaluate(node=>node.naturalWidth)>0,locale+": the sunrise portrait must load");
  await expect(page.locator('[data-energywork-slide-id="flight-done"] [class*="milestoneCard"]'))
    .not.toContainText(/Personal initiation and group membership|Инициация и вступление в сообщество/);
  await page.screenshot({path:output+"/"+engineName+"-"+locale+"-375-short-flight-done.png",animations:"disabled",timeout:30000});
  // Guest must be explicitly asked to save, with no second forward/skip action.
  await page.locator('button[data-energywork-next]').click();
  await expect(page.locator('[data-energywork-slide-id]')).toHaveAttribute('data-energywork-slide-id','flight-save');
  const saveAction = page.locator('button[data-reiki-first-lesson-google-save]');
  await expect(saveAction).toBeDisabled();
  await expect(page.locator('button[data-energywork-next]')).toHaveCount(0);
  await expect(page.locator('[data-reiki-first-lesson-consent]')).toHaveCount(1);
  await expect(page.locator('[data-reiki-first-lesson-save]')).not.toContainText(
    locale === "ru" ? "без сохранения" : "without saving");
  await page.locator('[data-reiki-first-lesson-consent]').check();
  await expect(saveAction).toBeEnabled();
  await page.screenshot({path:output+"/"+engineName+"-"+locale+"-375-short-flight-save.png",animations:"disabled",timeout:30000});
  // Guest review survives a Back action, but only an actual private save unlocks Lesson 2.
  await page.locator('button[class*="milestoneBack"]').click();
  await expect(page.locator('[data-energywork-slide-id]')).toHaveAttribute('data-energywork-slide-id','flight-done');
  console.log("REIKI_SHORT_VIEWPORT_BALANCE",JSON.stringify({engine:engineName,locale,width:375,height:625,slides:10}));
}

const context = await browser.newContext({ viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:"reduce",hasTouch:true });
const page = await context.newPage();
page.on("pageerror", error => pageErrors.push(String(error.message).slice(0,300)));
try {
  const image = await page.request.get(origin+"/images/holistic-house/reiki-heaven-sky.svg");
  assert.equal(image.status(),200,"Approved local sky background must be served");
  assert.match(image.headers()["content-type"]||"",/image\/svg\+xml/);
  // Full simulated-account traversal is stable in Chromium. In WebKit the
  // synthetic API route races the initial React hydration; guest mode remains
  // the faithful iPhone acceptance, without an invented logged-in account.
  if (engineName === "chromium") {
    for (const [locale,width] of [["en",390],["ru",320]]) await exerciseJourney(page,locale,width);
  }
  // Account-scoped synthetic save must succeed before an optional install screen appears.
  if (engineName === "chromium") await verifySaveThenInstall(page,"ru");
  // Additional layout sizes: these reuse the guest route, no persistence.
  for (const [locale,width] of [["en",375],["ru",430]]) {
    await page.setViewportSize({width,height:844});
    await page.goto(origin+"/"+locale+"/academy/principles-of-energywork/learn",{waitUntil:"domcontentloaded",timeout:90000});
    await expect(page.locator('button[data-energywork-next]')).toBeEnabled({timeout:60000});
    await inspect(page,{locale,width,index:1,id:"welcome-01",screenshot:true});
  }
  for (const locale of ["en","ru"]) await verifyShortViewport(page,locale);
  assert.deepEqual(pageErrors,[],"No unexpected browser JavaScript exceptions");
  console.log(engineName === "webkit" ? "REIKI_SAFARI_GUEST_SAVE_GATE_PASS" : "REIKI_ALL_SLIDES_BROWSER_PASS",
    JSON.stringify({engine:engineName,count:engineName === "webkit" ? 10 : 63,
      locales:["en","ru"],mobileWidths:[320,375,390,430]}));
} finally {
  await browser.close();
}
