import { assertAlchemyPaymentsExpanded } from './helpers/alchemy-payment-disclosure-verifier.mjs';
import { assertMessengerOnlyCapture } from './helpers/messenger-only-contract.mjs';
import { captureAlchemyPanelOverflow } from './helpers/alchemy-panel-overflow-diagnostics.mjs';
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const { expect } = require((process.env.HH_PLAYWRIGHT_PACKAGE || "playwright") + "/test");
import assert from "node:assert/strict";
import { inferAssistPreferences } from "../lib/assist/service-match.mjs";
import { rankAssistProducts } from "../lib/assist/product-recommendations.mjs";
import { rankDiscoveryVideos } from "../lib/video-discovery/ranker.mjs";
import { telegramServiceRequestUrl } from "../lib/assist/telegram-business-request.mjs";
import { resolveTelegramServiceHandoffUrl } from "../lib/app/telegram-entry-url.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Public acceptance may run only against an isolated loopback server");
}
const output = "artifacts/public-services-production";
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const diagnostics = { runtime: "next-start production", console: [], pageErrors: [], devIssueOverlay: false };
const responseEvidence = [];
// Isolated CI: only these audited read-only endpoints may lack the database.
const noDatabase503Paths = new Set([
  "/api/catalog/ratings",
  "/api/service-enquiries/booking-status",
  "/api/app/bootstrap",
  "/api/public/remote-energy-support-masters",
]);
let failure;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  // Page-level synthetic mocks may fulfill requests; all unmocked API writes
  // fail closed rather than reaching any configured provider or database.
  await context.route('**/api/**', route =>
    ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  // Third-party YouTube thumbnails are not part of our public service API.
  // Unreliable outbound connectivity in the isolated runner can close a
  // perfectly valid img request. Use one inert image fixture ONLY for these
  // external thumbnails; never mask first-party browser errors or APIs.
  const youtubeThumbnail=/^https:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/[A-Za-z0-9_-]{11}\/hqdefault\.jpg(?:\?.*)?$/;
  // A first-party request, arbitrary host or non-thumbnail must never be stubbed.
  assert.ok(youtubeThumbnail.test('https://i.ytimg.com/vi/m9RfDgK76PU/hqdefault.jpg'));
  assert.equal(youtubeThumbnail.test(origin + '/vi/m9RfDgK76PU/hqdefault.jpg'), false);
  assert.equal(youtubeThumbnail.test('https://example.com/vi/m9RfDgK76PU/hqdefault.jpg'), false);
  await context.route(youtubeThumbnail, route => {
    if (route.request().resourceType() !== 'image') return route.continue();
    return route.fulfill({
      status: 200, contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#e1e4e6"/></svg>',
    });
  });
  const pages = new Set();
  const attachDiagnostics = (page) => {
    pages.add(page);
    page.on("response", response => {
      const url = new URL(response.url());
      if (response.request().method() === "GET" && response.status() === 503 &&
          url.origin === origin && url.pathname.startsWith("/api/")) {
        // Record all first-party read failures, including any unexpected new endpoint.
        responseEvidence.push(url.pathname);
      }
    });
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        let path = "";
        try { path = new URL(message.location().url).pathname; } catch {}
        diagnostics.console.push({ type: message.type(), text: message.text(), path });
      }
    });
    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  };
  const assertNoDevIssueOverlay = async (page, label) => {
    const overlayCount = await page.locator("nextjs-portal").count();
    const issueBadgeCount = await page.getByText("1 Issue", { exact: true }).count();
    assert.equal(overlayCount, 0, "next dev overlay must not appear in production: " + label);
    assert.equal(issueBadgeCount, 0, "next dev issue badge must not appear in production: " + label);
  };
  const assertViewport = async (page, label) => {
    const [width, scrollWidth] = await Promise.all([
      page.evaluate(() => window.innerWidth),
      page.evaluate(() => document.documentElement.scrollWidth),
    ]);
    if (scrollWidth > width + 1) {
      const offenders = await page.evaluate(() => Array.from(document.querySelectorAll("body *")).map(node => {
        const rect = node.getBoundingClientRect();
        return { tag: node.tagName.toLowerCase(), className: String(node.className?.baseVal ?? node.className ?? "").slice(0, 100), x: Math.round(rect.x), right: Math.round(rect.right), width: Math.round(rect.width) };
      }).filter(item => item.right > innerWidth + 1 && item.width > 0 && item.x < innerWidth).slice(0, 15));
      console.error("Overflow elements " + label, JSON.stringify(offenders));
    }
    assert.ok(scrollWidth <= width + 1, "Horizontal overflow: " + label + " (" + scrollWidth + " > " + width + ")");
  };
  const visible = async (locator) => locator.waitFor({ state: "visible", timeout: 30000 });
  const createPage = async (width) => {
    const page = await context.newPage();
    attachDiagnostics(page);
    // The draft-link assertions exercise the private-browsing fallback. The
    // regular receipt redirect has a separate synthetic release-audit case.
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'hh-service-enquiry-receipt:v1') throw new DOMException('blocked', 'SecurityError');
        return set.call(this, key, value);
      };
    });
    await page.setViewportSize({ width, height: 844 });
    return page;
  };

 // Approved Shamanica Business cabinet now has SIX expandable photo shelves
 // after the hero, 3-step quiz and featured section (not an old all-on-fold
 // six-service grid). Keep real mobile interactions and privacy assertions.
 async function checkCompactBusiness(page,locale,width){
  await page.goto(origin+"/"+locale+"/shamanica/business",{waitUntil:"domcontentloaded",timeout:75000});
  const section=page.locator("[data-shamanica-business]");
  await visible(section);
  await expect(page.locator("[data-sitewide-antistress-banner]")).toHaveCount(0);
  await expect(page.locator("[data-hh-ihelp-trigger]:visible")).toHaveCount(0);
  await expect(page.locator("[data-shamanica-ihelp-trigger]")).toBeVisible();
  const shelves=section.locator("[data-business-cabinet-shelves]");
  const cards=shelves.locator("[data-business-shelf]");
  await expect(cards).toHaveCount(6);
  await expect(cards.locator("img")).toHaveCount(6);
  assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(node=>node.dataset.businessShelf)),
    ["express","remedies","strategy","artifacts","energy","energywork"],
    "Business shelves must preserve the six owner-approved categories");
  await expect(page.locator("[data-hh-unified-dock]")).toHaveCount(1);
  const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(horizontalOverflow<=2,"Business horizontal overflow "+locale+"/"+width+" "+horizontalOverflow);
  if(locale==="ru"&&width===390)await page.screenshot({path:output+"/shamanica-business-ru-390.png",fullPage:false});
  await expect.poll(()=>page.evaluate(()=>history.pushState.toString().includes("__NA")),
    {timeout:30000,message:"Business quiz hydration"}).toBe(true);
  if(width===390){
   await shelves.locator('[data-business-shelf="express"]').click();
   const express=shelves.locator('[data-business-second-level="express"]');
   await expect(express.locator("[data-business-subservice]")).toHaveCount(5);
   await expect(shelves.locator('[data-business-get-details="express"]')).toBeVisible();
   await express.locator('[data-business-subservice="express-1"]').click();
   await expect(express.locator('[data-business-subservice="express-1"]')).toHaveAttribute("aria-pressed","true");
   if(locale==="en")assert.match(await express.innerText(),/FREE[\s\S]*45 CAD[\s\S]*75 CAD[\s\S]*200 CAD[\s\S]*300 CAD/);
   await shelves.locator("[data-business-back-to-shelves]").click();
   await expect(cards).toHaveCount(6);
   await shelves.locator('[data-business-shelf="strategy"]').click();
   await expect(shelves.locator('[data-business-second-level="strategy"] [data-business-subservice]')).toHaveCount(4);
   await expect(shelves.locator('[data-business-get-details="strategy"]')).toBeVisible();
   await shelves.locator("[data-business-back-to-shelves]").click();
   await expect(cards).toHaveCount(6);
  }
  const quiz=section.locator("[data-business-quiz]");
  await expect(quiz).toHaveAttribute("data-quiz-step","1");
  await quiz.locator('[data-business-answer="express"]').click();
  await expect(quiz).toHaveAttribute("data-quiz-step","2");
  await quiz.locator('[data-business-answer="unclear"]').click();
  await expect(quiz).toHaveAttribute("data-quiz-step","3");
  await quiz.locator('[data-business-answer="free"]').click();
  await expect(section.locator("[data-business-recommendations]")).toBeVisible();
  await expect(section.locator("[data-recommended-business-service]")).toHaveCount(2);
 }

  // Mobile Assist keeps issues, questions, answers, and reset in one messenger.
  // The three responsive recommendations are separate small cards BELOW the chat.
  // Preserve all locale/desktop/privacy contracts; never navigate Telegram in CI.
  const verifyMobileAssist = async (page, locale, width) => {
    // Owner's screenshot: one question per green panel with four progress dots,
    // six photographic category cards, and the existing shared seven-item dock.
    await page.goto(origin + "/" + locale + "/services", { waitUntil: "domcontentloaded" });
    const quiz = page.locator("[data-services-quiz]");
    await visible(quiz.locator("#services-quiz-title"));
    await expect(quiz).toHaveAttribute("data-services-quiz-questions", "4");
    await expect(quiz).toHaveAttribute("data-services-quiz-step", "1");
    await expect(page.locator("[data-hh-ihelp-trigger]")).toHaveCount(0);
    await expect(quiz.locator("[data-quiz-dot]")).toHaveCount(4);
    await expect(quiz.locator("[data-services-quiz-question]")).toHaveCount(1);
    await expect(quiz.locator('[data-services-quiz-question="topic"] [data-services-quiz-choice]')).toHaveCount(4);
    await expect(quiz.locator("[data-services-quiz-category]")).toHaveCount(6);
    await expect(quiz.locator("[data-services-card-photo]")).toHaveCount(6);
    assert.deepEqual(await quiz.locator("[data-services-quiz-category]").evaluateAll(cards =>
      cards.map(card => card.getAttribute("data-services-quiz-category"))),
      ["diagnostics", "business", "homeopathy", "coaching", "psychotherapy", "video"],
      "The six owner-prioritized Support cards must remain in 3×2 order");
    await expect(quiz.locator("[data-services-shamanica-link]"))
      .toHaveAttribute("href", "/"+locale+"/shamanica");
    assert.equal(await page.locator("[data-hh-unified-dock]").count(), 1,
      "Keep the real site dock; never add a second mock dock");
    // The approved screenshot is 390px wide. At smaller widths content may
    // scroll, but no controls may disappear sideways or behind a fixed rail.
    const firstScreen = await page.evaluate(() => {
      const last = document.querySelector('[data-services-quiz-category="video"]');
      const dock = document.querySelector("[data-hh-unified-dock]");
      if (!last || !dock) return null;
      return {
        lastBottom: last.getBoundingClientRect().bottom,
        dockTop: dock.getBoundingClientRect().top,
        width: document.documentElement.scrollWidth, viewport: innerWidth,
      };
    });
    assert.ok(firstScreen && firstScreen.width <= firstScreen.viewport + 1,
      "Services screenshot UI must not overflow horizontally: " + locale + "/" + width);
    if (width >= 390) assert.ok(firstScreen.lastBottom <= firstScreen.dockTop + 12,
      "At 390+ the six image cards should fit above the site dock: " +
        locale + "/" + width + " " + JSON.stringify(firstScreen));
    if (locale === "es") await expect(quiz.locator("#services-quiz-title"))
      .toHaveText("Encontremos tu apoyo");
    await expect(quiz.locator("[data-services-quiz-submit]")).toHaveCount(0);
    if (width === 390) {
      await page.screenshot({ path: output + "/services-" + locale + "-step1-390.png" });
      await quiz.screenshot({ path: output + "/services-" + locale + "-quiz-390.png" });
    }

    // Money/business was an explicit owner requirement even though the visual
    // reference shows only four primary topic buttons; reveal the two extra topics.
    // Retain current Production React hydration guard before any quiz click.
    await expect.poll(
      () => page.evaluate(() => history.pushState.toString().includes("__NA")),
      { timeout: 30000, message: "Services quiz must hydrate before the first answer" },
    ).toBe(true);
    // Six photographic first-screen categories stay on /services and expose exactly three matching options.
    const quickTargets = {
      diagnostics: "consultation", business: "business", homeopathy: "homeopathy",
      coaching: "coach", psychotherapy: "services", video: "video",
    };
    for (const [category, group] of Object.entries(quickTargets)) {
      const card = quiz.locator('[data-services-quiz-category="' + category + '"]');
      await expect(card).toHaveAttribute("href", "#service-group-" + group);
      await card.click();
      const location = new URL(page.url());
      assert.equal(location.pathname, "/" + locale + "/services", "First-screen card must never leave Services: " + category);
      assert.equal(location.hash, "#service-group-" + group);
      const target = page.locator("#service-group-" + group);
      await visible(target);
      await expect(target.locator(':scope > [data-services-three-visible] > [data-service-variant]')).toHaveCount(3);
      await expect(target.locator(':scope > [data-services-three-visible] > [data-service-variant]').first()).toBeVisible();
    }
    await expect(quiz.locator("[data-services-shamanica-link]")).toHaveAttribute("href", "/" + locale + "/shamanica");
    await expect(quiz.locator("[data-services-extra-categories]")).toHaveCount(1);
    const more = quiz.locator("[data-services-extra-categories]");
    await more.locator("summary").click();
    await expect(more.locator("nav a")).toHaveCount(4);
    await expect(more.locator('nav a[href="#service-group-browse"]')).toHaveCount(1);
    await more.locator("summary").click();
    await expect(quiz.locator('[data-services-quiz-category="business"]')).toHaveAttribute("href", "#service-group-business");
    // Business has its own topic, need and start-format branching.
    await quiz.locator('[data-services-quiz-question="topic"] [data-services-quiz-choice="business_support"]').click();
    await expect(quiz).toHaveAttribute("data-services-quiz-step", "2");
    await expect(quiz.locator('[data-services-quiz-question="need"] [data-services-quiz-choice]')).toHaveCount(4);
    await quiz.locator('[data-services-quiz-question="need"] [data-services-quiz-choice="business_strategy"]').click();
    await expect(quiz).toHaveAttribute("data-services-quiz-step", "3");
    await quiz.locator('[data-services-quiz-question="mode"] [data-services-quiz-choice="consultation"]').click();
    await expect(quiz).toHaveAttribute("data-services-quiz-step", "4");
    const submitQuiz = quiz.locator("[data-services-quiz-submit]");
    await expect(submitQuiz).toBeDisabled();
    await quiz.locator('[data-services-quiz-question="budget"] [data-services-quiz-choice="flexible"]').click();
    await expect(submitQuiz).toBeEnabled();
    await quiz.locator('[data-quiz-dot="3"]').click();
    await expect(quiz).toHaveAttribute("data-services-quiz-step", "3");
    await quiz.locator('[data-services-quiz-choice="consultation"]').click();
    await submitQuiz.click();
    await visible(page.locator("[data-services-quiz-results]"));
    await visible(quiz.locator("[data-services-quiz-summary]"));
    const businessGroup = page.locator('[data-services-quiz-results] [data-services-priority-category="business"]');
    await expect(businessGroup).toHaveCount(1);
    await expect(businessGroup).toHaveAttribute("data-priority-offer-count", "3");
    if (width === 390) {
      await quiz.locator('[data-quiz-dot="1"]').click();
      await quiz.locator('[data-services-quiz-question="topic"] [data-services-quiz-choice="money_growth"]').click();
      await expect(quiz).toHaveAttribute("data-services-quiz-step", "2");
      await expect(quiz.locator('[data-quiz-dot="4"]')).toBeDisabled();
      await quiz.locator('[data-services-quiz-question="need"] [data-services-quiz-choice="growth_ideas"]').click();
      await quiz.locator('[data-services-quiz-question="mode"] [data-services-quiz-choice="any"]').click();
      await quiz.locator('[data-services-quiz-question="budget"] [data-services-quiz-choice="flexible"]').click();
      await submitQuiz.click();
      await visible(page.locator("[data-services-quiz-results]"));
      await expect(page.locator('[data-services-quiz-results] [data-services-priority-category="business"]')).toHaveCount(0);
    }
    await assertViewport(page, locale + "/services/quiz/" + width);
    // The original locally-scoped Ali messenger remains reachable by an
    // explicit guest action, preserving all existing messenger regression tests.
    await page.goto(origin + "/" + locale + "/services?assist=chat", { waitUntil: "domcontentloaded" });

    const assist = page.locator("[data-assist-mobile]");
    const legacy = page.locator("[data-services-showcase-hero]");
    await visible(assist.locator("h1#assist-title"));
    await expect(assist).toHaveAttribute("lang", locale);
    await expect(legacy).toBeHidden();
    await expect(page.locator("#services-conversion-title")).toBeHidden();
    // Keep the new single-messenger Assist; hide all superseded giant cards.
    const legacyPhoneSelectors = [
      "#consultation", "[data-services-studio-free]", "[data-services-studio-card]",
      "[data-services-studio-paid] > header", "[data-services-studio-paid] > div:last-child",
      "[data-services-meet]", '[data-personal-testimonials="services"]',
      "#method-videos", "[data-services-directory-invitation]"
    ];
    for (const selector of legacyPhoneSelectors) {
      await expect(page.locator(selector + ":visible")).toHaveCount(0);
    }
    // The approved 10-category shelf has no duplicate large featured cards.
    // Older diagnostic formats remain accessible inside the consultation disclosure.
    await expect(page.locator("[data-assist-personal-consultation]")).toHaveCount(0);
    await expect(page.locator("[data-services-unified-catalog] [data-service-lead-capture]:visible")).toHaveCount(0);
    await expect(page.locator("[data-services-directory-invitation]")).toHaveCount(0);
    const catalog = page.locator("[data-services-unified-catalog]");
    await visible(catalog);
    // Browser acceptance must exercise hydrated React handlers, not
    // accidentally tap static SSR buttons before Next router readiness.
    await expect.poll(
      () => page.evaluate(() => history.pushState.toString().includes("__NA")),
      { timeout: 30000, message: 'Mobile Services catalogue must hydrate before interactions' },
    ).toBe(true);
    const panelIds = [
      "consultation", "homeopathy", "services", "business", "browse", "courses",
      "video", "coach", "reiki", "reading", "about", "testimonials", "mytube", "directory",
    ];
    const servicePanelIds = new Set(panelIds.slice(0, 10));
    await expect(catalog.locator("[data-services-unified-panel]")).toHaveCount(panelIds.length);
    for (const id of panelIds) {
      const panel = catalog.locator('[data-services-unified-panel="' + id + '"]');
      const isService = servicePanelIds.has(id);
      const variants = panel.locator(':scope > [data-services-three-visible] > [data-service-variant]');
      await expect(variants).toHaveCount(isService ? 3 : 0);
      if (isService) {
        // Three source-backed choices and their prices are visible without opening old tabs.
        await expect(panel).toHaveAttribute("data-services-has-three", "true");
        for (const offer of await variants.all()) {
          await visible(offer);
          await visible(offer.locator("[data-service-price]"));
          await visible(offer.locator("img"));
        }
      }
      const hosts = isService
        ? variants.locator(':scope > [data-service-card-actions]')
        : panel.locator(':scope > [data-service-card-actions]');
      await expect(hosts).toHaveCount(isService ? 3 : 1);
      for (const host of await hosts.all()) {
        const controls = host.locator(':scope > div[role="group"] > button');
        await expect(controls).toHaveCount(2);
        for (const control of await controls.all()) {
          await visible(control);
          await expect(control).toHaveAttribute("aria-expanded", "false");
          const bounds = await control.boundingBox();
          assert.ok(bounds && bounds.height >= 44 && bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
            "Every variant action must fit the phone: " + locale + "/" + width + "/" + id);
        }
      }
    }
    if (width === 390) {
      // Regression for the approved three-horizontal-offers mock: no extra
      // giant category card or duplicate price/action header.
      const geometry = await catalog.locator(
        '[data-services-unified-panel][data-services-has-three="true"]'
      ).evaluateAll(nodes => nodes.map(node => {
        const measure = element => {
          if (!element) return null;
          const r = element.getBoundingClientRect();
          return { x:r.x, y:r.y, width:r.width, height:r.height };
        };
        const direct = selector => node.querySelector(':scope > ' + selector);
        const headerPrice = direct('[data-support-uniform-preview]')
          ?.querySelector(':scope > [data-support-uniform-price]');
        return {
          id: node.getAttribute("data-services-unified-panel"),
          overall: measure(node),
          heading: measure(direct('[data-support-uniform-preview]')),
          topActions: getComputedStyle(direct('[data-service-card-actions]')).display,
          headingPrice: getComputedStyle(headerPrice).display,
          offers: [...node.querySelectorAll(
            ':scope > [data-services-three-visible] > [data-service-variant]'
          )].map(measure),
        };
      }));
      assert.equal(geometry.length, 10);
      for (const group of geometry) {
        assert.ok(group.overall.height < 700, "Oversized service category: " + locale + "/" + group.id + " " + group.overall.height);
        assert.ok(group.heading.height < 120, "Oversized service header: " + locale + "/" + group.id);
        assert.equal(group.topActions, "none", "Duplicate category action row: " + group.id);
        assert.equal(group.headingPrice, "none", "Duplicate category price badge: " + group.id);
        assert.equal(group.offers.length, 3);
        for (const [i, offer] of group.offers.entries()) {
          assert.ok(offer.height >= 100 && offer.height < 220,
            "Offer should be a compact horizontal card: " + group.id + "/" + i + " " + offer.height);
          assert.ok(offer.x >= -1 && offer.x + offer.width <= width + 1, "Offer overflows viewport: " + group.id);
          if (i) assert.ok(offer.y >= group.offers[i-1].y + group.offers[i-1].height - 1,
            "Three offers must stack vertically: " + group.id);
        }
      }
    }
    for (const selector of [
      "[data-assist-spiritual-entry]", "[data-assist-video-generation]",
      "[data-assist-course-shelf]", "[data-assist-magical-help]",
      "[data-assist-reiki-session]", "[data-assist-coach-therapist]"
    ]) {
      await expect(page.locator(selector)).toHaveCount(1);
      await expect(page.locator(selector)).toBeHidden();
    }
    if (width === 390) {
      // Exercise first option end-to-end; validate all 3 variants above.
      for (const id of panelIds) {
        const panel = catalog.locator('[data-services-unified-panel="' + id + '"]');
        const cardActions = servicePanelIds.has(id)
          ? panel.locator(':scope > [data-services-three-visible] > [data-service-variant]').first()
            .locator(':scope > [data-service-card-actions]')
          : panel.locator(':scope > [data-service-card-actions]');
        const controls = cardActions.locator(':scope > div[role="group"] > button');
        const details = controls.first();
        const order = controls.nth(1);
        await details.click();
        await expect(details).toHaveAttribute("aria-expanded", "true");
        const openedBounds = await panel.boundingBox();
        const catalogBounds = await catalog.boundingBox();
        assert.ok(openedBounds && catalogBounds && openedBounds.width >= catalogBounds.width - 6,
          "Expanded cards must occupy the full mobile catalogue width: " + id);
        await visible(cardActions.locator(":scope > [data-service-card-details] > p"));
        await expect(cardActions.locator(":scope > [data-service-card-order]")).toBeHidden();
        const landing = cardActions.locator(":scope > [data-service-card-details] a[href]").first();
        assert.ok((await landing.getAttribute("href"))?.startsWith("/" + locale + "/"),
          "A full-description link must lead to a published localized route: " + id);
        await order.click();
        await expect(details).toHaveAttribute("aria-expanded", "false");
        await expect(order).toHaveAttribute("aria-expanded", "true");
        await expect(cardActions.locator(":scope > [data-service-card-details]")).toBeHidden();
        await visible(cardActions.locator(':scope > [data-service-card-order] [data-messenger-only-channel="whatsapp"]'));
        await visible(cardActions.locator(':scope > [data-service-card-order] [data-messenger-only-channel="telegram"]'));
        await order.click();
        await expect(order).toHaveAttribute("aria-expanded", "false");
        await assertViewport(page, locale + "/services/unified/" + id);
      }
      await expect(catalog.locator('[data-services-unified-panel][data-expanded="true"]')).toHaveCount(0);
      // The legacy directory is voluntary, not a second giant service card.
      // A real click still restores the previously published contact actions.
      const directory = catalog.locator('[data-services-unified-panel="directory"]');
      await directory.locator(':scope > [data-support-uniform-preview]').click();
      await expect(directory).toHaveAttribute("data-expanded", "true");
      await expect(directory.locator('[data-service-lead-capture]')).toHaveCount(0);
      await visible(directory.locator('[data-services-directory-invitation]'));
      await directory.locator(':scope > [data-support-uniform-preview]').click();
      await expect(directory).toHaveAttribute("data-expanded", "false");
      await expect(page.locator('[data-services-unified-catalog] [data-service-lead-capture]:visible')).toHaveCount(0);
      // The real prior flows remain mounted for stable site deep links.
      for (const selector of [
        "[data-assist-reiki-session]", "[data-assist-spiritual-entry]", "[data-assist-video-generation]",
        "[data-assist-course-shelf]", "[data-assist-coach-therapist]", "[data-assist-magical-help]",
      ]) await expect(page.locator(selector)).toHaveCount(1);
    }

    // Coach/Mira and Reiki are separate mobile categories, never extra chat steps.
    const coach=page.locator("[data-assist-coach-therapist]");
    await expect(coach).toHaveCount(1);
    assert.ok(await coach.locator("[data-assist-coach-master]").count() >= 2,
      "Andrey and AI Mira remain without optional published specialists");
    await expect(coach.locator('[data-assist-coach-ai="mira"]')).toHaveCount(1);
    await expect(coach.locator('select[data-assist-coach-topic]')).toHaveCount(1);

    // The reiki picker is a distinct mounted mobile category, not another chat step.
    const reiki=page.locator("[data-assist-reiki-session]");
    await expect(reiki).toHaveCount(1);
    await expect(reiki.locator('button[aria-pressed]')).toHaveCount(3);
    await expect(reiki.locator('input[type="date"]')).toHaveCount(1);
    await expect(reiki.locator('input[type="time"]')).toHaveCount(1);
    await expect(reiki.locator('a[href*="holistic-support/mobile"]')).toHaveCount(1);

    const conversation = assist.locator("[data-assist-dialogue]");
    const log = conversation.locator("#assist-results");
    await visible(conversation);
    await expect(log).toHaveAttribute("role", "log");
    const question = conversation.locator("textarea#assist-question");
    const submit = conversation.locator('form button[type="submit"]');
    await visible(question);
    // The owner saw the whole iPhone Services page zoom/crop when the keyboard
    // appeared. A focused textarea below 16px triggers iOS Safari auto-zoom.
    // Check computed text size AND viewport geometry, without disabling pinch zoom.
    await question.focus();
    const focusGeometry=await question.evaluate(element=>{
      const input=element.getBoundingClientRect();
      const form=element.form?.getBoundingClientRect();
      return {fontSize:parseFloat(getComputedStyle(element).fontSize),
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:document.documentElement.clientWidth,
        formLeft:form?.left??-1,formRight:form?.right??Infinity,
        inputRight:input.right};
    });
    assert.ok(focusGeometry.fontSize>=16,
      "iPhone keyboard must not zoom Services textarea: "+JSON.stringify(focusGeometry));
    assert.ok(focusGeometry.formLeft>=-1 &&
      focusGeometry.formRight<=focusGeometry.viewportWidth+1 &&
      focusGeometry.inputRight<=focusGeometry.formRight+1 &&
      focusGeometry.documentWidth<=focusGeometry.viewportWidth+1,
      "Focused Services composer must fit phone width: "+JSON.stringify(focusGeometry));
    await question.evaluate(element=>element.blur());
    await expect(submit).toBeDisabled();
    const topics = conversation.locator("[data-assist-issue-suggestions] button");
    const issueToggle = conversation.locator('button[aria-expanded]');
    await expect(topics).toHaveCount(6);
    await expect(issueToggle).toHaveAttribute("aria-expanded", "false");
    await issueToggle.click();
    await expect(topics).toHaveCount(12);
    await expect(issueToggle).toHaveAttribute("aria-expanded", "true");
    await issueToggle.click();
    await expect(topics).toHaveCount(6);

    const shelf = assist.locator("[data-assist-best-three]");
    const bestCards = shelf.locator("[data-assist-best-card]");
    await expect(shelf).toHaveCount(0); // No generic cards before a real request.

    const tools = assist.locator("a[data-assist-tool]");
    const toolsToggle = assist.locator('section[aria-labelledby="assist-tools-title"] button[aria-expanded]');
    await expect(tools).toHaveCount(4);
    await expect(toolsToggle).toHaveAttribute("aria-expanded", "false");
    await toolsToggle.click();
    await expect(tools).toHaveCount(8);
    const expectedTools = {
      therapy: "services/imagery-therapy",
      homeopathy: "services/psychohomeopathy",
      reiki: "services/remote-energy-support",
      mandala: "holistic-support/mandala",
      talisman: "holistic-support/mobile",
      constellation: "services/systemic-constellations",
      academy: "academy/reiki",
      masters: "masters",
    };
    for (const [key,route] of Object.entries(expectedTools)) {
      await expect(assist.locator('a[data-assist-tool="' + key + '"]'))
        .toHaveAttribute("href", "/" + locale + "/" + route);
    }
    await toolsToggle.click();
    await expect(tools).toHaveCount(4);
    assert.equal(await assist.locator('input[type="email"],input[type="tel"]').count(), 0,
      "Assist cannot silently collect contact details");

    // The public MyTube endpoint accepts locale only; no private question text.
    const publishedVideoPending=page.waitForResponse(response=>
      response.url().includes("/api/assist/public-mytube?locale="+locale) &&
      response.request().method()==="GET",{timeout:25000});
    // One issue enters a user bubble, followed by a helper reply and one question.
    await topics.first().click();
    await expect(conversation.locator("[data-assist-topic-suggestions]")).toHaveCount(0);
    await expect(log.locator('[data-assist-message="user"]')).toHaveCount(1);
    // The approved messenger preserves its opening question before the visitor reply.
    await expect(log.locator('[data-assist-message="assistant"]')).toHaveCount(2);
    await expect(log.locator("[data-assist-message]").first()).toHaveAttribute("data-assist-message", "assistant");
    await expect(log.locator("[data-assist-message]").nth(1)).toHaveAttribute("data-assist-message", "user");
    await expect(log.locator('[data-assist-question="mode"]')).toHaveCount(1);
    await expect(log.locator("a[data-assist-recommendation]")).toHaveCount(0);
    await expect(question).toHaveValue("");
    await visible(shelf.locator("#assist-best-three-title"));
    const homeopathy=assist.locator("[data-assist-homeopathy]");
    await visible(homeopathy);
    await expect(homeopathy.locator("a[data-assist-remedy]")).toHaveCount(3);
    const libraryLocale=locale==="es"?"en":locale;
    for(const slug of ["gelsemium","ignatia-amara","nux-vomica"]){
      const link=homeopathy.locator('a[data-assist-remedy="'+slug+'"]');
      await expect(link).toHaveAttribute("href","/"+libraryLocale+"/homeopathy/remedies/"+slug);
      await expect(link.locator("img")).toHaveAttribute("src",new RegExp("^/media/remedies/"+slug+"/message"));
      const box=await link.boundingBox();
      assert.ok(box&&box.height>=44,"Homeopathy library touch target");
    }
    await expect(homeopathy.locator('a[href="/'+locale+'/services/psychohomeopathy"]')).toHaveCount(1);
    const publishedVideoResponse=await publishedVideoPending;
    const publishedVideoUrl=new URL(publishedVideoResponse.url());
    assert.equal(publishedVideoUrl.pathname,"/api/assist/public-mytube");
    assert.equal(publishedVideoUrl.search,"?locale="+locale,
      "No private question text is sent to MyTube");
    assert.equal(publishedVideoResponse.status(),200);
    const publicVideos=await publishedVideoResponse.json();
    assert.ok(Array.isArray(publicVideos?.videos),"Published video catalog must be an array");
    const expectedVideos=rankDiscoveryVideos(publicVideos.videos,{goal:"stress",sort:"for-you"}).slice(0,3);
    const videoShelf=assist.locator("[data-assist-mytube]");
    await visible(videoShelf);
    await expect(videoShelf.locator("[data-assist-mytube-more]"))
      .toHaveAttribute("href","/"+locale+"/mytube?goal=stress");
    const videoCards=videoShelf.locator("[data-assist-mytube-card]");
    await expect(videoCards).toHaveCount(expectedVideos.length,{timeout:25000});
    assert.equal(new Set(expectedVideos.map(video=>video.youtubeId)).size,expectedVideos.length,
      "MyTube recommendations must use distinct published YouTube identifiers");
    for(const video of expectedVideos){
      const card=videoShelf.locator('[data-assist-mytube-card="'+video.youtubeId+'"]');
      await expect(card).toHaveCount(1);
      const links=card.locator("a[href]");
      await expect(links).toHaveCount(2);
      for(const link of [links.first(),links.last()])
        await expect(link).toHaveAttribute("href","/"+locale+"/mytube?video="+video.youtubeId);
      const bounds=await links.last().boundingBox();
      assert.ok(bounds&&bounds.height>=44,"MyTube Watch target must remain accessible");
    }
    const expectedStress = rankAssistProducts("stress", {});
    const actualStress = await bestCards.evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-assist-best-card")));
    assert.deepEqual(actualStress,expectedStress,
      "Matching real products, not directions, for the selected problem");
    // Preserve the previously approved exact Telegram link/locale assertion,
    // now mapping concrete offered products onto the existing service codes.
    const requestIds = {therapy:"coaching",constellation:"constellations",business:"business",reiki:"reiki"};
    for(const key of expectedStress){
      const code=requestIds[key];
      const detail=shelf.locator('[data-assist-product-link="'+key+'"]');
      await expect(detail).toHaveAttribute("href",new RegExp("^/"+locale+"/[a-z0-9/-]+$"));
      const action=shelf.locator('[data-assist-best-card="'+key+'"] [data-assist-best-action="'+key+'"]');
      await expect(action).toHaveAttribute("aria-expanded","false");
      const box=await action.boundingBox();
      assert.ok(box&&box.height>=44,"Mobile product touch target: "+locale+"/"+width+"/"+key);
      await action.click();
      await expect(action).toHaveAttribute("aria-expanded","true");
      const card=shelf.locator('[data-assist-best-card="'+key+'"]');
      const whatsapp=card.locator('[data-service-card-order] [data-messenger-only-channel="whatsapp"]');
      const telegram=card.locator('[data-service-card-order] [data-messenger-only-channel="telegram"]');
      await visible(whatsapp);
      await visible(telegram);
      if(code){
        const url=telegramServiceRequestUrl(code,locale);
        assert.ok(url,"No unapproved Telegram request: "+key);
        await expect(telegram).toHaveAttribute("href",resolveTelegramServiceHandoffUrl(url,locale));
        assert.equal(new URL(url).searchParams.get("text")?.split(String.fromCharCode(10)).at(-1),
          "[HH-REQ:"+code+":"+locale+"]","Deep link contains no private problem text");
      }
      const photoBounds=await card.locator('[data-support-uniform-photo]').boundingBox();
      const expandedBounds=await card.locator('[data-service-card-order]').boundingBox();
      assert.ok(photoBounds&&expandedBounds&&expandedBounds.x <= photoBounds.x+8,
        "Inline messenger choices span the full card, under the photo: "+key);
      await action.click();
      await expect(action).toHaveAttribute("aria-expanded","false");
    }

    // A reply stays in the chat and reranks the service cards without a page jump.
    await log.locator('[data-assist-question="mode"] div button').nth(2).click();
    await expect(log.locator('[data-assist-message="user"]')).toHaveCount(2);
    await expect(log.locator('[data-assist-question="budget"]')).toHaveCount(1);
    // An explicit video-only choice may suggest ONLY actually matching
    // self/video materials: a symbolic video and free MyTube, not paid sessions.
    const videoIds=await bestCards.evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-assist-best-card")));
    assert.deepEqual(videoIds,rankAssistProducts("stress",{mode:"video"}));
    assert.deepEqual(videoIds,["mandala","mytube"],
      "Video mode offers actual video routes, never human session sales");
    await expect(shelf.locator('[data-assist-best-card="therapy"],[data-assist-best-card="business"],[data-assist-best-card="constellation"]')).toHaveCount(0);
    await log.locator('[data-assist-question="budget"] div button').first().click();
    await expect(log.locator('[data-assist-message="user"]')).toHaveCount(3);
    await expect(log.locator('[data-assist-question]')).toHaveCount(0);
    const freeVideoIds=await bestCards.evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-assist-best-card")));
    assert.deepEqual(freeVideoIds,rankAssistProducts("stress",{mode:"video",budget:"free"}));
    assert.deepEqual(freeVideoIds,["mytube"],
      "Explicit free budget excludes unpriced video generators");

    // Switching intent resets only the conversation, never opens another page.
    const reset = conversation.locator("button[data-assist-reset]");
    await reset.click();
    await expect(topics).toHaveCount(6);
    await expect(log.locator("[data-assist-message]")).toHaveCount(0);
    await expect(question).toHaveValue("");
    await expect(submit).toBeDisabled();
    await topics.nth(4).click();
    const actualWork = await bestCards.evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-assist-best-card")));
    const expectedWork=rankAssistProducts("work",{});
    assert.deepEqual(actualWork,expectedWork,"Work cards rerank without appending the prior intent");
    if (expectedWork.includes("business")) {
      // Order is now a disclosure button, NOT an anchor: the verified
      // Telegram link appears inside the opened full-width messenger panel.
      const businessCard=shelf.locator('[data-assist-best-card="business"]');
      const orderButton=businessCard.locator('[data-assist-best-action="business"]');
      await expect(orderButton).toHaveAttribute("aria-expanded","false");
      await orderButton.click();
      await expect(orderButton).toHaveAttribute("aria-expanded","true");
      const telegram=businessCard.locator(
        '[data-service-card-order] [data-messenger-only-channel="telegram"]');
      await visible(telegram);
      const businessUrl=telegramServiceRequestUrl("business",locale);
      assert.ok(businessUrl,"Business link must use the approved public service code");
      await expect(telegram).toHaveAttribute("href",
        resolveTelegramServiceHandoffUrl(businessUrl,locale));
      await orderButton.click();
      await expect(orderButton).toHaveAttribute("aria-expanded","false");
    }
    await reset.click();
    await expect(topics).toHaveCount(6);

    // "Other" is revealed deliberately and focuses typing instead of inventing a complaint.
    await issueToggle.click();
    await expect(topics).toHaveCount(12);
    await topics.last().click();
    await expect(question).toBeFocused();
    await expect(log.locator("[data-assist-message]")).toHaveCount(0);
    await expect(question).toHaveValue("");
    const typedStress = locale === "ru" ? "Меня тревожит стресс" :
      locale === "es" ? "Tengo estrés" : "I feel stress";
    await question.fill(typedStress);
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(question).toHaveValue("");
    await expect(log.locator('[data-assist-message="user"]')).toHaveCount(1);
    await expect(bestCards).toHaveCount(3);
    const typedRanking=rankAssistProducts("stress",inferAssistPreferences(typedStress));
    const actualTyped = await bestCards.evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-assist-best-card")));
    assert.deepEqual(actualTyped,typedRanking,
      "Typed question applies live deterministic matching without storing the text");

    // Source-backed match on actual RU/EN/ES free-text input, not a fabricated diagnosis.
    await reset.click();
    await question.fill(locale==="ru" ? "Стеснение в груди при волнении, дрожь при общении, запор на фоне стресса"
      :locale==="es" ? "Temblor en compañía, opresión en el pecho y estreñimiento por tensión"
      :"Chest tightness when anxious, trembling in company and stress related constipation");
    await submit.click();
    await visible(homeopathy);
    await expect(assist.locator("[data-assist-homeopathy-mind]")).toHaveCount(1);
    await expect(homeopathy.locator('a[data-assist-remedy="ambra-grisea"]')).toHaveCount(1);
    const sourceProfileKeys=await homeopathy.locator("a[data-assist-remedy]").evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-assist-remedy")));
    assert.ok(sourceProfileKeys.length>=1 && sourceProfileKeys.length<=3 &&
      !sourceProfileKeys.includes("gelsemium"), "Ranked homeopathy archive evidence must replace the static showcase");

    // A medical red flag must suppress paid recommendations and all tool links.
    await reset.click();
    await question.fill(locale==="ru" ? "Боль в груди и трудно дышать"
      :locale==="es" ? "No puedo respirar" : "Chest pain and trouble breathing");
    await submit.click();
    await visible(log.locator('[role="alert"]'));
    await expect(assist.locator("[data-assist-homeopathy]")).toHaveCount(0);
    await expect(assist.locator("[data-assist-mytube]")).toHaveCount(0);
    await expect(shelf).toHaveCount(0);
    await expect(assist.locator("a[data-assist-tool]")).toHaveCount(0);

    // The owner's real life-direction example must produce purchasable/requestable offers.
    await reset.click();
    await question.fill(locale==="ru"?"Я потерял направление и не знаю куда двигаться":
      locale==="es"?"Me siento perdido, sin rumbo":
      "I feel lost and lack a sense of direction");
    await submit.click();
    const actualGrowth=await bestCards.evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-assist-best-card")));
    assert.deepEqual(actualGrowth,["review","therapy","constellation"],
      "Life direction needs review, guided imagery therapy, constellations, not Reiki Academy");

    // Crisis safety takes precedence over sales even after a previous question.
    await question.fill(locale === "ru" ? "Хочу убить себя" :
      locale === "es" ? "Quiero morir" : "I want to kill myself");
    await submit.click();
    await visible(log.locator('[role="alert"]'));
    await expect(assist.locator("[data-assist-mytube]")).toHaveCount(0);
    await expect(assist.locator("[data-assist-homeopathy]")).toHaveCount(0);
    await expect(shelf).toHaveCount(0);
    await expect(log.locator("a[data-assist-recommendation]")).toHaveCount(0);
    await assertNoDevIssueOverlay(page, locale + "/services/assist/" + width);
    await assertViewport(page, locale + "/services/assist/" + width);
    await reset.click();
    await expect(question).toHaveValue("");
    await expect(submit).toBeDisabled();
    await expect(shelf).toHaveCount(0);
    await expect(tools).toHaveCount(4);
  };

  // Spanish Alchemy has its own route. Check its untouched default state too;
  // do not navigate payment links or enable optional payment providers.
  {
    const locale = "es";
    for (const width of [320, 360, 390, 1188]) {
      const page = await createPage(width);
      const pageErrorStart = diagnostics.pageErrors.length;
      await page.goto(origin + "/es/services/alchemy-of-soul", { waitUntil: "domcontentloaded" });
      const main = page.locator('main[data-core-service-detail="alchemy"]');
      await visible(main.locator("h1"));
      await expect(main).toHaveAttribute("lang", "es");
      await expect(main.locator('[data-alchemy-format="60"]')).toHaveAttribute("aria-pressed", "true");
      await assertNoDevIssueOverlay(page, "es/alchemy-of-soul/" + width);
      await assertViewport(page, "es/alchemy-of-soul/" + width);
      assert.equal(await main.locator('[data-alchemy-payment-disclosure]').count(), 0,
        "Spanish booking does not expose payment methods before confirmed time");
      const panelHeights = await main.locator("[data-alchemy-panel]").evaluateAll((nodes) =>
        nodes.map(node => ({name: node.getAttribute("data-alchemy-panel"), height: Math.ceil(node.getBoundingClientRect().height), max: window.innerHeight - 80})));
      assert.equal(panelHeights.length, 10, "Ten Alchemy chapters including video and public sample report");
      if (width <= 390) {
        if (panelHeights.some(p => p.name !== "reviews" && p.height > p.max)) {
          try {
            await captureAlchemyPanelOverflow({ page, output, locale, width, panelHeights });
          } catch (error) {
            console.error("Alchemy overflow diagnostics could not be saved:", error);
          }
        }
        assert.deepEqual(panelHeights.filter(p => p.name !== "reviews" && p.height > p.max), [],
          "One semantic section per mobile viewport: " + JSON.stringify(panelHeights));
      }
      assert.equal(await page.locator('details[data-alchemy-extended-guide]').evaluate(node => node.open), false, "Spanish long guide is initially collapsed");
      assert.equal(await page.locator('[data-sitewide-capture="core-service"]').count(), 0, "No duplicate Spanish global enquiry panel");
      assert.equal(await main.locator('[data-alchemy-lead-form="single"]').count(), 1, "Exactly one Spanish enquiry form");
      await main.locator('[data-alchemy-panel="formats"]').screenshot({
        path: output + "/alchemy-es-formats-default-" + width + ".png",
      });
      await assertAlchemyPaymentsExpanded(main, expect, width);
      assert.deepEqual(diagnostics.pageErrors.slice(pageErrorStart), [], "Unexpected Spanish Alchemy browser page errors: " + width);
      await page.close();
    }
  }

  for (const locale of ["en", "ru"]) {
    for (const width of [320, 360, 390, 430, 1188]) {
      const page = await createPage(width);
      await page.goto(origin + "/" + locale + "/services", { waitUntil: "domcontentloaded" });
      if (width <= 760) {
        await verifyMobileAssist(page, locale, width);
      } else {
        await expect.poll(
          () => page.evaluate(() => history.pushState.toString().includes("__NA")),
          { timeout: 30000, message: "Desktop Services catalogue must hydrate before interactions" },
        ).toBe(true);
        // Existing full modules are opt-in on desktop; test them after opening.
        for (const id of ["browse", "consultation", "services", "about", "testimonials", "mytube", "directory"]) {
          const category = page.locator('[data-services-unified-panel="' + id + '"]');
          await category.locator(':scope > button').first().click();
          await expect(category).toHaveAttribute("data-expanded", "true");
        }
        await visible(page.locator("#services-conversion-title"));
        await expect(page.locator("[data-services-showcase-hero]")).toBeVisible();
        await expect(page.locator("[data-assist-mobile]")).toBeHidden();
        const freeCta = page.locator('[data-service-hero-cta="free"]');
        const paidCta = page.locator('[data-service-hero-cta="paid"]');
        await visible(freeCta);
        await visible(paidCta);
        assert.equal(await freeCta.getAttribute("href"), "#free-insights");
        assert.equal(await paidCta.getAttribute("href"), "#consultation");
        for (const action of [freeCta, paidCta]) {
          const bounds = await action.boundingBox();
          assert.ok(bounds && bounds.height >= 44,
            "Desktop Services first-screen actions must be usable at " + locale + "/" + width);
        }
      }
      // The old catalog is still regression-tested on desktop, not on phones.
      const free = page.locator('[data-services-studio-free]#free-insights');
      const paid = page.locator('[data-services-studio-paid]#solutions');
      const monthlySupport = paid.locator('[data-services-studio-card="monthly-support"]');
      if (width > 760) {
        await visible(free.locator("h2#services-free-title"));
        await visible(paid.locator("h2#services-personal-title"));
        assert.equal(await free.locator('[data-services-studio-card]').count(), 3);
        assert.equal(await paid.locator('[data-services-studio-card]').count(), 6);
        await visible(monthlySupport);
        await expect(monthlySupport).toContainText(locale === "ru" ? "€200 / месяц" : locale === "es" ? "200 € / mes" : "€200 / month");
        assert.equal(await monthlySupport.locator('[data-service-card-details] a[href="/' + locale + '/services/personal-support"]').getAttribute("href"),
          "/" + locale + "/services/personal-support", "Approved monthly support must reach its own terms page");
        assert.equal(await page.locator("#find-your-service").count(), 0,
          "Detailed practitioner search belongs on the separate directory");
        const testAction = free.locator('[data-services-studio-card="tests"] [data-service-card-details] a[href="/' + locale + '/tests"]');
        assert.equal(await testAction.getAttribute("href"), "/" + locale + "/tests");
        await visible(free.locator('a[href="/' + locale + '/services/free-situation-review"]').first());
        await visible(free.locator('a[href="/' + locale + '/services/dao-health-profile"]').first());
        await visible(free.locator('a[href="/' + locale + '/courses/antistress"]'));
        assert.equal(await page.locator("h1#services-conversion-title").count(), 1);
        // Ten main categories with three real offers each; esoteric extras
        // stay inside the voluntary Spiritual Reading disclosure / Shamanica.
        const visibleVariants=page.locator('[data-services-unified-catalog] [data-services-three-visible]');
        await expect(visibleVariants).toHaveCount(10);
        await expect(visibleVariants.locator('[data-service-variant]')).toHaveCount(30);
        const actualGroups=await visibleVariants.evaluateAll(nodes=>
          nodes.map(node=>({id:node.getAttribute("data-services-three-visible"),
            declared:node.getAttribute("data-services-offer-count"),
            visible:node.getClientRects().length>0,
            options:node.querySelectorAll("[data-service-variant]").length})));
        assert.deepEqual(actualGroups.map(x=>x.id),
          ["consultation","homeopathy","services","business","browse","courses","video","coach","reiki","reading"],
          "The first six category targets must remain visible in their approved order");
        assert.ok(actualGroups.every(x=>x.declared==="3"&&x.visible&&x.options===3),
          "Each of the ten service panels displays all three choices without opening an accordion");
        assert.equal(await page.evaluate(() => {
          const selectors = ["#consultation","#free-insights","#solutions","#services-conversion-title",
            "[data-services-meet]",'[data-personal-testimonials="services"]',
            "#method-videos","[data-services-directory-invitation]"];
          const sections=selectors.map(selector=>[...document.querySelectorAll(selector)]);
          if(sections.some(matches=>matches.length!==1))return false;
          return sections.every((matches,index)=>index===0||
            Boolean(sections[index-1][0].compareDocumentPosition(matches[0])&Node.DOCUMENT_POSITION_FOLLOWING));
        }),true,"Approved Services sequence: booking, 3 free, personal offers, Browse hero, intro, reviews, methods, directory");
        await expect(page.locator("#method-videos")).toHaveAttribute("open", "",
          { timeout: 15000 });
        // Method posters are visible, while third-party players stay opt-in.
        assert.equal(await page.locator("#method-videos iframe").count(), 0,
          "Method videos must not eagerly load third-party players");
        await visible(page.locator('a[href="/' + locale + '/services/free-situation-review"]').first());
      } else {
        await expect(free).toBeHidden();
        await expect(paid.locator("h2#services-personal-title")).toBeHidden();
        await expect(paid.locator("[data-services-studio-card]:visible")).toHaveCount(0);
        await expect(page.locator('[data-services-unified-panel="video"] [data-assist-video-generation]')).toBeHidden();
        // Legacy panel-level actions are hidden by the approved three-offer layout.
        // Require a real visible action within the first of the three video offers.
        await visible(page.locator('[data-services-unified-panel="video"] > [data-services-three-visible] > [data-service-variant] [data-service-card-actions] button').first());
        assert.equal(await page.locator("#find-your-service").count(), 0);
      }
      await assertNoDevIssueOverlay(page, locale + "/services/" + width);
      // RootLayout provides My Space: the canonical header opens an accessible
      // account dialog, not a direct Cabinet link. Never bypass sign-in here.
      // The owner retired the site header on mobile Services only.
      // The desktop header and its real My Space and menu remain verified.
      const header = page.locator("header.house-header--services");
      if (width <= 760) {
        await expect(header).toBeHidden();
        await visible(page.locator("[data-assist-first-tabs]"));
        const dashboard = page.locator("[data-assist-study-dashboard]");
        await visible(dashboard);
        await expect(dashboard.locator('input[type="range"]')).toHaveCount(4);
        for (const slider of await dashboard.locator('input[type="range"]').all()) {
          await expect(slider).toHaveAttribute("min", "1");
          await expect(slider).toHaveAttribute("max", "10");
        }
        await visible(dashboard.getByRole("button", { name: locale === "ru" ? "Подобрать" : locale === "es" ? "Buscar opciones" : "Find matches" }));
      } else {
  const cabinetEntry = header.locator("button.site-cabinet-entry");
        await expect(cabinetEntry).toHaveCount(1);
        await visible(cabinetEntry);
        await expect(cabinetEntry).toHaveAttribute("aria-haspopup", "dialog");
        await expect(cabinetEntry).toHaveAttribute("aria-controls", "home-personal-space-dialog");
        await expect(cabinetEntry).toHaveAttribute("aria-expanded", "false");
        const cabinetBounds = await cabinetEntry.boundingBox();
        assert.ok(cabinetBounds && cabinetBounds.x >= 0 && cabinetBounds.x + cabinetBounds.width <= width + 1, "My Space entry must fit the visible header: " + locale + "/" + width);
        await cabinetEntry.click();
        const privateSpaceDialog = page.locator("dialog#home-personal-space-dialog");
        await expect(privateSpaceDialog).toHaveAttribute("open", "");
        await visible(privateSpaceDialog.locator("#hh-my-space-title"));
        await expect(cabinetEntry).toHaveAttribute("aria-expanded", "true");
        await privateSpaceDialog.locator('header button[type="button"]').first().click();
        await expect(privateSpaceDialog).not.toHaveAttribute("open", "");
        await expect(cabinetEntry).toHaveAttribute("aria-expanded", "false");
        const siteMenu = header.locator("details.site-main-menu");
        await expect(siteMenu).not.toHaveAttribute("open", "");
        const menuTrigger = siteMenu.locator("summary.site-main-menu-trigger");
        await visible(menuTrigger);
        const menuBounds = await menuTrigger.boundingBox();
        assert.ok(menuBounds && menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= width + 1,
          "Public site menu must fit the header: " + locale + "/" + width);
        await siteMenu.locator("summary.site-main-menu-trigger").click();
        await expect(siteMenu).toHaveAttribute("open", "");
        // The canonical expanded-menu destination is the Library hub;
        // /books remains a separate editorial route, not this menu entry.
        const libraryEntry = siteMenu.locator('.site-main-menu-panel a[href="/' + locale + '/library"]');
        await expect(libraryEntry).toHaveCount(1);
        await visible(libraryEntry);
        await expect(libraryEntry).toHaveText(locale === "ru" ? "Библиотека" : locale === "es" ? "Biblioteca" : "Library");
        assert.equal(await libraryEntry.getAttribute("href"), "/" + locale + "/library", "Library opens the localized editorial hub");
        const libraryBounds = await libraryEntry.boundingBox();
        assert.ok(libraryBounds && libraryBounds.x >= 0 && libraryBounds.x + libraryBounds.width <= width + 1, "Library entry must fit the opened menu: " + locale + "/" + width);
        await siteMenu.locator("summary.site-main-menu-trigger").click();
        await expect(siteMenu).not.toHaveAttribute("open", "");
      }
      await assertViewport(page, locale + "/services/" + width);
      if (width === 390 || width === 1188) {
        await page.screenshot({ path: output + "/services-" + locale + "-hero-" + width + ".png", fullPage: false });
      }
      if (width === 390) {
        // The homepage's existing #consultation link must reveal real paid/express
        // booking choices instead of landing on a hidden collapsed mobile panel.
        await page.goto(origin + "/" + locale + "/services#consultation", { waitUntil: "domcontentloaded" });
        const linkedPanel = page.locator('[data-services-unified-panel="consultation"]');
        await expect(linkedPanel).toHaveAttribute("data-expanded", "true");
        await visible(linkedPanel.locator("#consultation"));
        assert.ok(await linkedPanel.locator("[data-service-product]").count() >= 2,
          "Deep link preserves express/paid consultation offers: " + locale);
        await assertViewport(page, locale + "/services#consultation");
        const consultation = page.locator("[data-assist-personal-consultation]");
        await expect(consultation).toBeVisible();
        await consultation.scrollIntoViewIfNeeded();
        await consultation.screenshot({ path: output + "/services-" + locale + "-compact-consultation-390.png" });
      }
      // Category slider and Online/Toronto choice: real client interactions,
      // never registering a lead, sending messages or initiating payment.
      if (width === 1188) {
        const showcase = page.locator("[data-services-showcase-hero]");
        await showcase.locator('[data-services-slide-dot="personal"]').click();
        await visible(showcase.locator('[data-services-slide="personal"]'));
        assert.equal(await showcase.locator("[data-services-slide-dot]").count(), 5);
        await showcase.locator('[data-services-slide-dot="business"]').click();
        await visible(showcase.locator('[data-services-slide="business"]'));
        const businessAction = showcase.locator('[data-services-slide-action="business"]');
        // Use the live desktop action, falling back to its visible category filter.
        if (await businessAction.isVisible()) await businessAction.click();
        else await showcase.locator('[data-services-kind="business"]').click();
        await expect(page.locator('[data-services-kind="business"]')).toHaveAttribute("aria-pressed", "true");
        // Business has TWO approved offers: a one-off consultation and €200/month support.
        // Keep both discoverable; do not hide the support card to satisfy an obsolete count.
        const businessOffers = page.locator('[data-services-studio-paid] [data-services-studio-card]:visible');
        await expect(businessOffers).toHaveCount(2);
        await expect(page.locator('[data-services-studio-card="business"]')).toBeVisible();
        await expect(monthlySupport).toBeVisible();
        await showcase.locator('[data-services-mode="toronto"]').click();
        await expect(page.locator("[data-services-studio-free]")).toBeHidden();
        await expect(page.locator('[data-services-studio-card="business"]')).toBeVisible();
        await showcase.locator('[data-services-kind="reiki"]').click();
        // Reiki is online-only, so choosing it intentionally resets Toronto.
        await expect(showcase.locator('[data-services-mode="online"]')).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator('[data-services-studio-card="remote-energy-support"]')).toBeVisible();
        // Explicitly switching back to Toronto must show the helpful empty state.
        await showcase.locator('[data-services-mode="toronto"]').click();
        await visible(showcase.locator("[data-services-empty]"));
        await expect(page.locator("[data-services-studio-paid]")).toBeHidden();
        await showcase.locator("[data-services-empty] button").click();
        await expect(showcase.locator('[data-services-mode="online"]')).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator('[data-services-studio-card="remote-energy-support"]')).toBeVisible();
        await showcase.locator('[data-services-kind="free"]').click();
        await expect(page.locator('[data-services-studio-free] [data-services-studio-card]:visible')).toHaveCount(3);
        await expect(page.locator("[data-services-studio-paid]")).toBeHidden();
        await showcase.locator('[data-services-kind="all"]').click();
        await expect(page.locator('[data-services-studio-paid] [data-services-studio-card]:visible')).toHaveCount(6);
        await assertViewport(page, locale + "/services/slider-filter/" + width);
      }
      // Keep the advanced matching UX available on a separate, dedicated
      // directory page, instead of duplicating it below personal offers.
      const directoryResponse = await page.goto(origin + "/" + locale + "/services/catalog", { waitUntil: "domcontentloaded" });
      assert.equal(directoryResponse?.status(), 200, "The dedicated Services catalog must load");
      const discovery = page.locator("#find-your-service");
      const searchForm = discovery.locator('form[role="search"]');
      const findOptions = searchForm.locator('button[type="submit"]');
      const freeOnly = discovery.locator("input[data-free-services-only]");
      const price = discovery.locator('select[class*="facetPrice"]');
      await visible(freeOnly);
      // Match the real Tests page, not only the markup: the hero and the
      // aqua topic panel must share the same near-edge-to-edge phone gutter.
      const visual = await discovery.evaluate((node) => {
        const hero = node.querySelector('[class*="services-smart-discovery_hero__"]');
        const topic = node.querySelector('[data-services-filter-below-search]');
        const submit = node.querySelector('form[role="search"] button[type="submit"]');
        const rect = (element) => {
          if (!element) return null;
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        };
        return {
          hero: rect(hero), topic: rect(topic),
          topicBorder: topic ? getComputedStyle(topic).borderTopColor : '',
          disabledSubmitColor: submit ? getComputedStyle(submit).backgroundColor : '',
          disabledSubmitOpacity: submit ? getComputedStyle(submit).opacity : '',
        };
      });
      assert.ok(visual.hero && visual.topic, "Services hero and topic panel both render");
      assert.ok(Math.abs(visual.hero.left - visual.topic.left) <= 1.5 &&
        Math.abs(visual.hero.width - visual.topic.width) <= 1.5,
        "Services hero and topic selection must align edge-to-edge");
      if (width <= 760) {
        assert.ok(visual.hero.left >= 0 && visual.hero.left <= 11,
          "Services mobile hero should have the same about-8px gutter as Tests: " + visual.hero.left);
        assert.ok(visual.hero.width >= width - 22,
          "Services first screen must not be narrowed by nested gutters");
      }
      assert.equal(visual.topicBorder, "rgb(209, 235, 238)",
        "Services aqua section border uses the same #d1ebee as Tests");
      assert.equal(visual.disabledSubmitColor, "rgb(153, 60, 95)",
        "Primary CTA keeps the same rich berry #993c5f as Tests");
      assert.equal(visual.disabledSubmitOpacity, "1",
        "The initially disabled Services CTA must not appear washed out");
      assert.equal(await freeOnly.isChecked(), false, "Free Services Only starts unchecked");
      assert.equal(await price.inputValue(), "", "Price starts at Any");
      assert.equal(await findOptions.count(), 1, "one original primary Find my options button");
      await expect(findOptions).toBeDisabled();
      if (width <= 390) {
        const formBox = await searchForm.boundingBox();
        const buttonBox = await findOptions.boundingBox();
        assert.ok(formBox && buttonBox && buttonBox.width >= formBox.width * 0.92,
          "Find my options is full-width on mobile, not split with a second CTA");
      }
      // The SSR control becomes interactive only when React has hydrated.
      // Waiting for enabled prevents the real first-click loss before hydration.
      await expect(freeOnly).toBeEnabled();
      await freeOnly.check();
      await expect(price).toHaveValue("free");
      await expect(findOptions).toBeEnabled();
      await findOptions.click();
      await expect(discovery.locator("#hh-service-discovery-results-title"))
        .toHaveText(locale === "ru" ? "Бесплатные услуги" : "Free services");
      // Services now follows Tests: advanced facets live below the search
      // inside a collapsed accessible panel. Open it before using Price.
      const additionalFilters = discovery.locator("details[data-services-extra-filters]");
      await additionalFilters.locator("summary").click();
      await expect(additionalFilters).toHaveAttribute("open", "");
      await expect(price).toBeVisible();
      await price.selectOption("");
      await expect(freeOnly).not.toBeChecked();
      await expect(findOptions).toBeDisabled();
      await price.selectOption("free");
      await expect(freeOnly).toBeChecked();
      await freeOnly.uncheck();
      await expect(price).toHaveValue("");
      await assertViewport(page, locale + "/services/free-only/" + width);
      await page.close();
    }
  }

  // Spanish uses its own page route but the same EN/RU/ES discovery component.
  {
    const page = await createPage(390);
    await page.goto(origin + "/es/services", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-services-studio-free]')).toBeHidden();
    assert.equal(await page.locator('[data-services-studio-free] [data-services-studio-card]').count(), 3);
    assert.equal(await page.locator('[data-services-studio-paid] [data-services-studio-card]').count(), 6);
    const esMonthly = page.locator('[data-services-studio-paid] [data-services-studio-card="monthly-support"]');
    await expect(esMonthly).toBeHidden();
    await expect(esMonthly).toContainText("200 € / mes");
    assert.equal(await esMonthly.locator('[data-service-card-details] a[href="/es/services/personal-support"]').getAttribute("href"),
      "/es/services/personal-support", "Spanish support offer must lead to the terms page");
    assert.equal(await page.locator("#find-your-service").count(), 0);
    // Confirm the real Spanish mobile Assist, then retain the full original
    // Spanish carousel/mode regression on a visible desktop viewport.
    await verifyMobileAssist(page, "es", 390);
    await page.setViewportSize({ width: 430, height: 844 });
    await verifyMobileAssist(page, "es", 430);
    await page.setViewportSize({ width: 1188, height: 844 });
    // Existing full modules are opt-in on desktop; test them after opening.
    for (const id of ["browse", "consultation", "services", "about", "testimonials", "mytube", "directory"]) {
      const category = page.locator('[data-services-unified-panel="' + id + '"]');
      await category.locator(':scope > button').first().click();
      await expect(category).toHaveAttribute("data-expanded", "true");
    }
    await visible(page.locator("#services-conversion-title"));
    await expect(page.locator("[data-assist-mobile]")).toBeHidden();
    const esShowcase = page.locator("[data-services-showcase-hero]");
    await esShowcase.locator('[data-services-slide-dot="business"]').click();
    await esShowcase.locator('[data-services-slide-action="business"]').click();
    await expect(esShowcase.locator('[data-services-kind="business"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-services-studio-card="business"]')).toBeVisible();
    await esShowcase.locator('[data-services-mode="toronto"]').click();
    await expect(page.locator("[data-services-studio-free]")).toBeHidden();
    // Reiki is online-only: selecting its topic intentionally switches the
    // current Toronto mode to online instead of displaying a false empty state.
    await esShowcase.locator('[data-services-kind="reiki"]').click();
    await expect(esShowcase.locator('[data-services-mode="online"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-services-studio-card="remote-energy-support"]')).toBeVisible();
    await expect(esShowcase.locator("[data-services-empty]")).toHaveCount(0);
    // A visitor can still explicitly switch to Toronto afterward. Only that
    // genuinely unmatched topic+mode combination should display empty state.
    await esShowcase.locator('[data-services-mode="toronto"]').click();
    await expect(esShowcase.locator('[data-services-mode="toronto"]')).toHaveAttribute("aria-pressed", "true");
    await expect(esShowcase.locator("[data-services-empty]")).toBeVisible();
    await expect(page.locator('[data-services-studio-card="remote-energy-support"]')).toBeHidden();
    await esShowcase.locator('[data-services-mode="online"]').click();
    await expect(esShowcase.locator("[data-services-empty]")).toHaveCount(0);
    await expect(page.locator('[data-services-studio-card="remote-energy-support"]')).toBeVisible();
    await esShowcase.locator('[data-services-kind="all"]').click();
    await expect(page.locator('[data-services-studio-free] [data-services-studio-card]:visible')).toHaveCount(3);
    await expect(page.locator('[data-services-studio-paid] [data-services-studio-card]:visible')).toHaveCount(6);
    await assertViewport(page, "es/services/slider-filter/1188");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/es/services/catalog", { waitUntil: "domcontentloaded" });
    const freeOnly = page.locator("#find-your-service input[data-free-services-only]");
    await visible(freeOnly);
    // After Next's route hydration attaches the real controlled checkbox and
    // search handlers, selecting free-only must enable a text-free search.
    // A DOMContentLoaded-only navigation can expose an inert SSR checkbox.
    await expect.poll(
      () => page.evaluate(() => history.pushState.toString().includes("__NA")),
      { timeout: 30000, message: "Catalog search hydration must complete before the free-only interaction" },
    ).toBe(true);
    await expect(freeOnly).not.toBeChecked();
    await freeOnly.check();
    await expect(freeOnly).toBeChecked();
    const freeOnlySubmit = page.locator('#find-your-service form[role="search"] button[type="submit"]');
    await expect(freeOnlySubmit).toBeEnabled();
    await freeOnlySubmit.click();
    await expect(page.locator("#hh-service-discovery-results-title")).toHaveText("Servicios gratuitos");
    await page.close();
  }

  // Real hydrated, non-submitting conversion journey for ALL personal service
  // landing variants, including Spanish. Verify navigation, pricing, live
  // thumbnails and message drafts; NEVER follow or send any messenger URL.
  for (const locale of ["en", "ru", "es"]) {
    for (const service of ["imagery-therapy", "systemic-constellations"]) {
      const width = 390;
      const page = await createPage(width);
      const label = locale + "/" + service + "/" + width;
      const response = await page.goto(origin + "/" + locale + "/services/" + service, { waitUntil: "domcontentloaded", timeout: 60000 });
      assert.equal(response?.status(), 200, "Personal landing should render: " + label);
      const main = page.locator('main[data-personal-service="' + service + '"]');
      await visible(main.locator('h1#personal-service-title'));
      assert.equal(await main.locator("h1").count(), 1, "One personal landing title: " + label);
      const photo = main.locator('section[aria-labelledby="personal-service-title"] img').first();
      assert.ok(await photo.evaluate(image => image.complete && image.naturalWidth > 100), "Approved hero photo loads: " + label);
      assert.equal(await main.locator('[class*="heroFacts"]').count(), 1);
      const facts = await main.locator('[class*="heroFacts"]').innerText();
      assert.ok(facts.includes("€50") && facts.includes("€100"), "Both paid session formats visible: " + label);
      // The main contains the responsive site header: its free-review link is
      // intentionally hidden when the mobile nav is closed. Verify the hero CTA,
      // which is the actual visible and directly actionable free alternative.
      const free = main.locator('section[aria-labelledby="personal-service-title"] a[href="/' + locale + '/services/free-situation-review"]');
      assert.equal(await free.count(), 1, "One hero free-review link: " + label);
      await visible(free);
      const primary = main.locator('section[aria-labelledby="personal-service-title"] a[href="#request-session"]');
      await visible(primary);
      const primaryBounds = await primary.boundingBox();
      assert.ok(primaryBounds && primaryBounds.height >= 44, "Large primary CTA: " + label);
      await assertViewport(page, "personal/" + label);
      await assertNoDevIssueOverlay(page, label);
      await page.screenshot({ path: output + "/personal-" + locale + "-" + service + "-hero-390.png", fullPage: false, animations: "disabled" });
      await primary.click();
      await page.waitForURL(/#request-session$/);
      // The current one-idea landing has one real inline CRM capture, not the
      // retired ConsultationChoiceCapture/WhatsApp-first paid selector.
      const target = main.locator('section#request-session[data-service-visual-screen="final-capture"]');
      await visible(target);
      const capture=target.locator('[data-service-lead-capture][data-inline-offer-form]');
      await visible(capture);
      const choices=capture.locator('select[data-messenger-offer-format]');
      await expect(choices).toHaveCount(1);
      assert.equal(await choices.locator('option').count(),2,"Two original paid formats: "+label);
      assert.ok((await choices.locator('option[value="30-min"]').innerText()).includes("€50"),
        "Express €50 choice retained: "+label);
      assert.ok((await choices.locator('option[value="60-min"]').innerText()).includes("€100"),
        "Full €100 choice retained: "+label);
      await choices.selectOption("30-min");
      const prepared=await assertMessengerOnlyCapture(capture,expect,{offer:"30-min",locale,label});
      assert.equal(await capture.locator('form[data-compact-lead-form],input[type="email"],input[type="tel"]').count(),0,
        "No email/phone bypass or unverified CRM write: "+label);
      assert.equal(await capture.locator('[data-lead-saved]').count(),0,
        "No saved receipt just from choosing a messenger: "+label);
      assert.ok((prepared.whatsappUrl.searchParams.get("text")||"").includes("30-min"),
        "Selected offer retained in outgoing draft: "+label);
      await assertViewport(page, "personal-request/" + label);
      await page.screenshot({ path: output + "/personal-" + locale + "-" + service + "-request-390.png", fullPage: false, animations: "disabled" });
      await page.close();
    }
  }

  // Business Strategy & Founder Coaching has its own separate source-backed
  // landing (PR #993); verify all three locales without assuming it uses
  // PersonalServiceLanding's generic consultation choice component.
  for (const locale of ["en", "ru", "es"]) {
    const page = await createPage(390);
    const label = locale + "/business-consulting/390";
    const response = await page.goto(origin + "/" + locale + "/services/business-consulting", {waitUntil:"domcontentloaded",timeout:60000});
    assert.equal(response?.status(), 200, "Business service must render: " + label);
    const main = page.locator("main[data-business-consulting]");
    await visible(main.locator('h1#business-hero-title'));
    assert.equal(await main.locator("h1").count(), 1);
    const portrait = main.locator('.person img, img[alt="Andrey Litvinov"]').first();
    assert.ok(await portrait.evaluate(img => img.complete && img.naturalWidth > 20),
      "Business practitioner portrait should load: " + label);
    const free = main.locator('a[data-business-cta="free-hero"]');
    const href = await free.getAttribute("href");
    assert.equal(href, "/" + locale + "/services/free-situation-review?topic=business",
      "Free Business hero must reach the separate written situation review, not imply a live session");
    const requestForm=main.locator("[data-business-website-enquiry]");
    await visible(requestForm);
    assert.equal(await requestForm.locator('select[data-business-field="format"]').count(),1);
    assert.equal(await requestForm.locator('input[type="email"],button[type="submit"]').count(),0,
      "Business enquiries require customer-initiated Telegram or WhatsApp");
    await assertMessengerOnlyCapture(requestForm,expect,{locale,label});
    const offers = main.locator("#business-offers");
    for (const kind of ["free", "express", "full"]) {
      await visible(offers.locator('[data-business-offer="' + kind + '"]'));
    }
    assert.ok((await offers.innerText()).includes("€50") && (await offers.innerText()).includes("€100"));
    // The hero and the quick-start card both legitimately link to this section.
    // Choose the visible hero CTA deterministically rather than violating Playwright strict mode.
    const toOffers = main.locator('a[href="#business-offers"]').first();
    await visible(toOffers);
    await toOffers.click();
    await page.waitForURL(/#business-offers$/);
    const express = offers.locator('[data-business-offer="express"]');
    const prepared=await assertMessengerOnlyCapture(express,expect,
      {offer:"€50",locale,label:label+"/express"});
    assert.ok((prepared.whatsappUrl.searchParams.get("text") || "").includes("€50"),
      "Business express €50 must survive messenger selection: " + label);
    await assertViewport(page, "business/" + label);
    await assertNoDevIssueOverlay(page, label);
    await page.screenshot({path: output + "/business-" + locale + "-express-request-390.png",fullPage:false,animations:"disabled"});
    await page.close();
  }

  // DAO now has its own free photo-led landing, not a paid core-service detail.
  const coreServices = [
    ["alchemy-of-soul", "alchemy"],
    ["hypnotherapy-course", "hypnotherapy"],
  ];
  for (const locale of ["en", "ru"]) {
    for (const [slug, kind] of coreServices) {
      for (const width of [320, 360, 390, 1188]) {
        const page = await createPage(width);
        await page.goto(origin + "/" + locale + "/services/" + slug, { waitUntil: "domcontentloaded" });
        const main = page.locator('main[data-core-service-detail="' + kind + '"]');
        await visible(main.locator("h1"));
        await assertNoDevIssueOverlay(page, locale + "/" + slug + "/" + width);
        await assertViewport(page, locale + "/" + slug + "/" + width);
        if (width === 390 || width === 1188) {
          await page.screenshot({ path: output + "/core-" + locale + "-" + slug + "-hero-" + width + ".png", fullPage: false });
        }
        if (kind === "alchemy") {
          assert.equal(await main.locator('[data-alchemy-payment-disclosure]').count(), 0,
            "Payment options belong only to the confirmed booking cart");
        }
        if (kind === "alchemy" && width <= 390) {
          const panelHeights = await main.locator("[data-alchemy-panel]").evaluateAll((nodes) =>
            nodes.map(node => ({name: node.getAttribute("data-alchemy-panel"), height: Math.ceil(node.getBoundingClientRect().height), max: window.innerHeight - 80})));
          assert.equal(panelHeights.length, 10, "Ten Alchemy chapters including video and public sample report");
          if (panelHeights.some(p => p.name !== "reviews" && p.height > p.max)) {
            try {
              await captureAlchemyPanelOverflow({ page, output, locale, width, panelHeights });
            } catch (error) {
              // Diagnostic failures must never replace the original layout assertion.
              console.error("Alchemy overflow diagnostics could not be saved:", error);
            }
          }
          assert.deepEqual(panelHeights.filter(p => p.name !== "reviews" && p.height > p.max), [],
            "One semantic section per mobile viewport: " + JSON.stringify(panelHeights));
          assert.equal(await page.locator('details[data-alchemy-extended-guide]').evaluate(node => node.open), false, "Long guide is initially collapsed");
          assert.equal(await page.locator('[data-sitewide-capture="core-service"]').count(), 0, "No duplicate global enquiry panel");
          assert.equal(await page.locator('[data-alchemy-lead-form="single"]').count(), 1, "Exactly one enquiry form");
        }
        if (kind === "alchemy") await assertAlchemyPaymentsExpanded(main, expect, width);
        if (width === 390) {
          if (kind === "alchemy") {
            const form = main.locator('[data-alchemy-lead-form="single"]');
            await form.scrollIntoViewIfNeeded();
            await assertMessengerOnlyCapture(form,expect,
              {locale,label:"alchemy "+locale+" personalised request"});
            assert.equal(await form.locator('form,input[type="email"],input[type="tel"]').count(),0,
              "Alchemy cannot accept unverified website-only contact");
            // Two editorial choices plus the separate international phone country selector.
            // Check semantic controls instead of a fragile global select count.
            await expect(form.locator('select[id$="-format"]')).toHaveCount(1);
            await expect(form.locator('select[id$="-topic"]')).toHaveCount(1);
            assert.equal(await form.locator('[data-phone-country-input]').count(),0,
              "No phone-only capture while verified messenger identity is mandatory");
            const reviewStack = main.locator('[data-alchemy-review-stack]');
            const positions = await reviewStack.locator('[data-testimonial-video-id]').evaluateAll(nodes =>
              nodes.map(node => {
                const card = node.getBoundingClientRect();
                const frame = node.querySelector('.site-video-frame')?.getBoundingClientRect();
                return {
                  id: node.getAttribute('data-testimonial-video-id'),
                  audio: node.getAttribute('data-testimonial-original-audio'),
                  top: card.top, bottom: card.bottom, width: card.width, videoWidth: frame?.width ?? 0,
                };
              }));
            assert.equal(positions.length, 12, "All twelve original-language testimonials are visible in a vertical feed");
            assert.equal(new Set(positions.map(item => item.id)).size, 12, "No duplicate testimonials");
            assert.ok(positions.every((pos, index) => index === 0 || pos.top >= positions[index-1].bottom),
              "All testimonial videos must stack vertically");
            assert.ok(positions.every(pos => ["en", "ru"].includes(pos.audio)),
              "The audio-language disclosure must follow the actual recording");
            assert.ok(positions.every(pos => pos.videoWidth >= pos.width - 12 && pos.videoWidth >= width - 65),
              "Every testimonial player fills its mobile card width");
            assert.ok(await reviewStack.evaluate(node => node.scrollWidth <= node.clientWidth + 1),
              "No horizontal scrolling or squeezed testimonials");
            const bottomGap = await main.locator('[data-alchemy-panel="reviews"]').evaluate(node => {
              const note = node.querySelector('[data-alchemy-review-note]');
              return note ? node.getBoundingClientRect().bottom - note.getBoundingClientRect().bottom : 999;
            });
            assert.ok(bottomGap >= 0 && bottomGap < 55, "No empty testimonial viewport after the last video");
            const pricing = main.locator('[data-alchemy-booking-formats]');
            // No payment methods or external provider links on an unconfirmed booking.
            await assertAlchemyPaymentsExpanded(main, expect, width);
            await pricing.locator('[data-alchemy-format="month"]').click();
            await expect(pricing.locator('[data-alchemy-format="month"]')).toHaveAttribute('aria-pressed','true');
            assert.equal(await pricing.locator('[data-booking-cta]').count(), 0,
              "Monthly support uses its independent service enquiry, not this one-time booking flow");
            await pricing.locator('[data-alchemy-format="30"]').click();
            await assertAlchemyPaymentsExpanded(main, expect, width);
            const booking=pricing.locator('[data-session-booking-flow]');
            await expect(booking).toHaveCount(1);
            await expect(booking).toHaveAttribute('data-booking-sku','express-consultation-30');
            await assertMessengerOnlyCapture(booking,expect,
              {offer:"€50",locale,label:"alchemy "+locale+" express"});
            assert.equal(await pricing.locator('[data-booking-payment-options]').count(),0,
              "No checkout or booking confirmation before verified reply channel");
            await page.screenshot({path: output + "/alchemy-" + locale + "-vertical-reviews-390.png", fullPage: false});
            await page.screenshot({path: output + "/alchemy-" + locale + "-request-390.png", fullPage: false});
          } else {
            // Current visual core services use a dedicated final enquiry screen
            // with one first-party compact capture. The former footer/details
            // selector was removed; never mark a missing legacy footer as UX failure.
            const capture = main.locator('[data-core-visual-screen="final-capture"]');
            await expect(capture).toHaveCount(1);
            await capture.scrollIntoViewIfNeeded();
            const inline=capture.locator('[data-inline-offer-form]');
            await expect(inline).toHaveCount(1);
            const prepared=await assertMessengerOnlyCapture(inline,expect,
              {locale,label:"hypnotherapy "+locale+" "+width});
            assert.ok((prepared.whatsappUrl.searchParams.get('text')||'').length>25,
              "The specific published service must have a concrete request draft");
            assert.equal(await inline.locator('form,input[type="email"]').count(),0,
              "No contact-only lead bypass");
            const freeAlternative = capture.locator('a[href="/' + locale + '/services/free-situation-review"]');
            await expect(freeAlternative).toHaveCount(1);
            await visible(freeAlternative);
            await page.screenshot({path: output + "/core-" + locale + "-" + slug + "-final-capture-390.png", fullPage: false});
          }
        }
        await page.close();
      }
    }
  }

  // Read-only EN/RU/ES acceptance for the CURRENT three free entry routes.
  // Never submit a visitor form: a clicked CTA is neither a CRM lead nor a booking.
  for (const locale of ["en", "ru", "es"]) {
    for (const [kind, slug, captureId] of [
      ["tests", "tests", "start-free"],
      ["situation", "services/free-situation-review", "request-free-review"],
      ["dao", "services/dao-health-profile", "request-free-wu-xing"],
    ]) {
      for (const width of [320, 360, 390, 1188]) {
        const page = await createPage(width);
        await page.goto(origin + "/" + locale + "/" + slug, { waitUntil: "domcontentloaded" });
        const main = page.locator('main[data-free-entry-landing="' + kind + '"]');
        await visible(main.locator("h1"));
        await assertNoDevIssueOverlay(page, locale + "/" + slug + "/" + width);
        await assertViewport(page, locale + "/" + slug + "/" + width);
        const hero = main.locator('section[aria-labelledby="free-entry-title"]');
        assert.ok((await hero.locator("h1").innerText()).trim().length > 15, "Heading must name a real offer");
        assert.ok(!(await hero.innerText()).includes("€100"), "No misleading paid upsell in the free hero");

        if (kind === "tests") {
          await visible(hero.locator("img"));
          await visible(main.locator("#what-you-get"));
          await visible(main.locator("#how-it-works"));
          await visible(main.locator('a[href="/' + locale + '/client/tests"]').first());
          const capture = main.locator("#" + captureId + "[data-service-lead-capture]");
          await visible(capture);
          await assertMessengerOnlyCapture(capture,expect,
            {locale,label:"free tests "+locale+" "+width});
        } else if (kind === "dao") {
          await visible(hero.locator("img"));
          await visible(main.locator("#what-you-get"));
          assert.equal(await main.locator("#how-it-works").count(), 0,
            "The compact Wu Xing journey does not repeat an unused process slide");
          const capture = main.locator("#" + captureId + "[data-service-lead-capture]");
          await visible(capture);
          await assertMessengerOnlyCapture(capture,expect,
            {locale,label:"Dao Wu Xing "+locale+" "+width});
          assert.equal(await capture.locator('form,input[type="email"],input[type="tel"]').count(),0,
            "A free Dao review does not accept email-only website leads");
        } else {
          // The former three-offer widget was replaced by the express review.
          // Verify the real current funnel without submitting any visitor data.
          const featured = main.locator("[data-free-review-intro-video]");
          await visible(featured);
          assert.equal(await featured.locator("iframe").count(), 0,
            "Introductory recording never autoplays before opt-in");
          const capture = main.locator("#" + captureId + "[data-personal-express-enquiry]");
          await visible(capture);
          const reveal = capture.locator("[data-express-reveal]");
          await expect(reveal).toHaveAttribute("aria-expanded", "false");
          await expect(capture.locator("[data-express-inline-disclosure]")).toBeHidden();
          await reveal.click();
          await expect(reveal).toHaveAttribute("aria-expanded", "true");
          const disclosure = capture.locator("[data-express-inline-disclosure]");
          await visible(disclosure);
          await expect(disclosure.locator("[data-express-focus]")).toHaveCount(2);
          await assertMessengerOnlyCapture(disclosure,expect,
            {locale,label:"written situation review "+locale+" "+width});
          assert.equal(await disclosure.locator('[data-lead-saved]').count(),0,
            "No provider verification or CRM receipt from opening a link");
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
            "Expanded information must fit the phone width");

        }
        await assertViewport(page, locale + "/" + slug + "/" + width + "/after-actions");
        if (width === 390 || width === 1188) {
          await page.screenshot({path: output + "/free-" + kind + "-" + locale + "-hero-" + width + ".png", fullPage: false});
        }
        await page.close();
      }
    }
  }
  for(const locale of ["ru","en","es"]){
    for(const width of [320,390,430]){
      const page=await createPage(width);
      try{await checkCompactBusiness(page,locale,width);}
      finally{await page.close();}
    }
  }
  diagnostics.devIssueOverlay = false;
  assert.deepEqual(diagnostics.pageErrors, [], "Unexpected browser page errors");
  // In isolated CI, getAppConfig() is guaranteed to return 503 before any
  // database query when HH_APP_SUPABASE_URL is absent. Do not read the response
  // body after the browser resource has already closed. Only a real observed
  // GET 503 from these two audited read-only endpoints can be exempted.
  const unavailable = responseEvidence;
  const unexpectedUnavailable = unavailable.filter(path => !noDatabase503Paths.has(path));
  assert.deepEqual(unexpectedUnavailable, [], 'Unexpected 503 API path');
  const expectedUnavailable = new Set();
  if (!process.env.HH_APP_SUPABASE_URL) {
    for (const path of unavailable) {
      if (noDatabase503Paths.has(path)) expectedUnavailable.add(path);
    }
  }
  const unexpected = diagnostics.console.filter(entry => {
    if (entry.type !== 'error') return false;
    if (expectedUnavailable.has(entry.path) &&
        entry.text === 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)') {
      return false;
    }
    return true;
  });
  assert.deepEqual(unexpected, [], "Unexpected browser console errors");
  await context.close();
} catch (error) {
  failure = error;
} finally {
  await writeFile(output + "/browser-diagnostics.json", JSON.stringify(diagnostics, null, 2) + "\n");
  await browser.close();
}
if (failure) throw failure;
console.log("PASS public production service acceptance");
