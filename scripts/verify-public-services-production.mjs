import { openContactChannelChooser, assertPreparedContactChannels } from './helpers/contact-channel-verifier.mjs';
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const { expect } = require((process.env.HH_PLAYWRIGHT_PACKAGE || "playwright") + "/test");
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Public acceptance may run only against an isolated loopback server");
}
const output = "artifacts/public-services-production";
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const diagnostics = { runtime: "next-start production", console: [], pageErrors: [], devIssueOverlay: false };
let failure;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pages = new Set();
  const attachDiagnostics = (page) => {
    pages.add(page);
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
    await page.setViewportSize({ width, height: 844 });
    return page;
  };

  for (const locale of ["en", "ru"]) {
    for (const width of [320, 360, 390, 1188]) {
      const page = await createPage(width);
      await page.goto(origin + "/" + locale + "/services", { waitUntil: "networkidle" });
      await visible(page.locator("#services-conversion-title"));
      const banner = page.locator('[data-services-tests-intro]#free-insights');
      assert.equal(await banner.count(), 1, "one free tests/course banner");
      await visible(banner);
      await visible(banner.locator("h2#services-tests-heading"));
      const testAction = banner.locator("a[data-services-test-action]");
      const courseAction = banner.locator("a[data-services-course-action]");
      await visible(testAction);
      await visible(courseAction);
      assert.equal(await testAction.getAttribute("href"), "/" + locale + "/client/tests", "free tests keep their locale-specific entry");
      assert.equal(await courseAction.getAttribute("href"), "/" + locale + "/courses/antistress", "free course keeps its locale-specific entry");
      await visible(banner.locator('a[href="#solutions"]'));
      assert.equal(await page.locator("h1#services-conversion-title").count(), 1, "restored hero has one primary heading");
      assert.equal(await page.evaluate(() => {
        const hero = document.querySelector("#services-conversion-title");
        const intro = document.querySelector("[data-services-tests-intro]#free-insights");
        const solutions = document.querySelector("#solutions");
        return Boolean(hero && intro && solutions &&
          (hero.compareDocumentPosition(intro) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          (intro.compareDocumentPosition(solutions) & Node.DOCUMENT_POSITION_FOLLOWING));
      }), true, "photographed hero precedes tests/course banner and service offers");
      await visible(page.locator('a[href="/' + locale + '/services/free-situation-review"]').first());
      await assertNoDevIssueOverlay(page, locale + "/services/" + width);
      const cabinetEntry = page.locator("header.house-header--services a.site-cabinet-entry");
      await visible(cabinetEntry);
      assert.equal(await cabinetEntry.getAttribute("href"), "/" + locale + "/app", "top cabinet link opens the authenticated app");
      const cabinetBounds = await cabinetEntry.boundingBox();
      assert.ok(cabinetBounds && cabinetBounds.x >= 0 && cabinetBounds.x + cabinetBounds.width <= width + 1, "Cabinet entry must fit the visible header: " + locale + "/" + width);
      await assertViewport(page, locale + "/services/" + width);
      if (width === 390 || width === 1188) {
        await page.screenshot({ path: output + "/services-" + locale + "-hero-" + width + ".png", fullPage: false });
      }
      if (width === 390) {
        const insights = page.locator("[data-services-tests-intro]#free-insights");
        await insights.scrollIntoViewIfNeeded();
        await insights.screenshot({ path: output + "/services-" + locale + "-free-insights-390.png" });
      }
      // Contract for the mobile screenshot regression: restore ONE full-width
      // Find my options action and a small, initially unchecked free-only filter.
      const discovery = page.locator("#find-your-service");
      const searchForm = discovery.locator('form[role="search"]');
      const findOptions = searchForm.locator('button[type="submit"]');
      const freeOnly = discovery.locator("input[data-free-services-only]");
      const price = discovery.locator('select[class*="facetPrice"]');
      await visible(freeOnly);
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
      await freeOnly.check();
      await expect(price).toHaveValue("free");
      await expect(findOptions).toBeEnabled();
      await findOptions.click();
      await expect(discovery.locator("#hh-service-discovery-results-title"))
        .toHaveText(locale === "ru" ? "Бесплатные услуги" : "Free services");
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
    await page.goto(origin + "/es/services", { waitUntil: "networkidle" });
    const freeOnly = page.locator("#find-your-service input[data-free-services-only]");
    await visible(freeOnly);
    await expect(freeOnly).not.toBeChecked();
    await freeOnly.check();
    await page.locator('#find-your-service form[role="search"] button[type="submit"]').click();
    await expect(page.locator("#hh-service-discovery-results-title")).toHaveText("Servicios gratuitos");
    await page.close();
  }

  const coreServices = [
    ["dao-health-profile", "dao"],
    ["alchemy-of-soul", "alchemy"],
    ["hypnotherapy-course", "hypnotherapy"],
  ];
  for (const locale of ["en", "ru"]) {
    for (const [slug, kind] of coreServices) {
      for (const width of [320, 360, 390, 1188]) {
        const page = await createPage(width);
        await page.goto(origin + "/" + locale + "/services/" + slug, { waitUntil: "networkidle" });
        const main = page.locator('main[data-core-service-detail="' + kind + '"]');
        await visible(main.locator("h1"));
        await assertNoDevIssueOverlay(page, locale + "/" + slug + "/" + width);
        await assertViewport(page, locale + "/" + slug + "/" + width);
        if (width === 390 || width === 1188) {
          await page.screenshot({ path: output + "/core-" + locale + "-" + slug + "-hero-" + width + ".png", fullPage: false });
        }
        if (width === 390) {
          const capture = main.locator('section:has(> details)');
          assert.equal(await capture.count(), 1, "Exactly one core-service footer");
          await capture.scrollIntoViewIfNeeded();
          const chooser = await openContactChannelChooser(capture, expect);
          const { whatsappUrl } = await assertPreparedContactChannels(chooser, expect);
          assert.ok(whatsappUrl.searchParams.get('text').includes(await main.locator('h1').innerText()), 'Prepared request must retain the selected service');
          const alternative = main.locator("details").filter({ hasText: locale === "ru" ? "Предпочитаете сначала бесплатный письменный разбор ситуации?" : "Prefer to start with a free written situation review?" });
          assert.equal(await alternative.evaluate((element) => element.open), false, "alternative starts collapsed");
          await alternative.locator("summary").click();
          await visible(alternative.locator('a[href="/' + locale + '/services/free-situation-review"]'));
          await page.screenshot({ path: output + "/core-" + locale + "-" + slug + "-footer-expanded-390.png", fullPage: false });
        }
        await page.close();
      }
    }
  }

  for (const locale of ["en", "ru"]) {
    for (const width of [320, 360, 390, 1188]) {
      const page = await createPage(width);
      await page.goto(origin + "/" + locale + "/services/free-situation-review", { waitUntil: "networkidle" });
      await visible(page.locator("[data-free-quick-request]").first());
      assert.equal(await page.locator("[data-free-quick-request]").count(), 1, "One consultation selector appears only after the benefits, process and Alchemy of the Soul link");
      await expect(page.locator("[data-free-quick-request]").first().locator('input[type="radio"]')).toHaveCount(3);
      const detailIntake = page.locator("[data-free-drawing-intake]");
      await detailIntake.waitFor({ state: "hidden" });
      const advanced = page.locator("details").filter({ has: detailIntake });
      assert.equal(await advanced.evaluate(element => element.open), false, "Detailed questionnaire must start collapsed");
      await assertNoDevIssueOverlay(page, locale + "/free-situation-review/" + width);
      await assertViewport(page, locale + "/free-situation-review/" + width);
      if (width <= 390) {
        const panelHeights = await page.evaluate(() => {
          const sections = {
            hero: 'section[aria-labelledby="review-hero-title"]',
            situations: '#situations',
            outcomes: 'section[aria-labelledby="review-outcomes-title"]',
            testimonials: '[data-personal-testimonials="all"]',
            alchemy: 'section[aria-labelledby="review-alchemy-title"]',
            about: 'section[aria-labelledby="review-about-title"]',
            faq: 'section[aria-labelledby="review-faq-title"]',
            steps: '#how-it-works',
            final: 'section[aria-labelledby="review-final-title"]',
          };
          const max = window.innerHeight - 90; // reserve bottom menu and a little breathing room
          return Object.entries(sections).map(([name, selector]) => {
            const node = document.querySelector(selector);
            return { name, height: Math.ceil(node?.getBoundingClientRect().height ?? 9999), max };
          });
        });
        assert.deepEqual(panelHeights.filter(item => item.height > item.max), [],
          "Each collapsed mobile landing panel should fit within one viewport: " + JSON.stringify(panelHeights));
        const archive = page.locator('[data-personal-testimonials="all"]');
        const gallery = archive.locator('[role="region"]');
        assert.equal(await archive.locator('[data-testimonial-video-id]').count(), 12);
        assert.equal(await archive.locator('details').first().evaluate(element => element.open), false);
        assert.ok(await gallery.evaluate(element => element.scrollWidth > element.clientWidth),
          "All twelve source-backed reviews remain available by horizontal swipe");
      }
      if (width === 390 || width === 1188) {
        await page.screenshot({ path: output + "/free-review-" + locale + "-hero-" + width + ".png", fullPage: false });
      }
      await page.close();
    }

    const page = await createPage(390);
    await page.goto(origin + "/" + locale + "/services/free-situation-review", { waitUntil: "networkidle" });
    const quick = page.locator("[data-free-quick-request]").first();
    await visible(quick);
    assert.equal(await page.locator("#personal-consultation").count(), 1, "Existing service consultation links still target the final selector");
    assert.equal(await page.locator("#situations article").count(), 4, "Four grounded question categories are displayed");
    const heroText = await page.locator('section[aria-labelledby="review-hero-title"]').innerText();
    assert.ok(!heroText.includes("€50") && !heroText.includes("€100"), "First screen focuses on benefits, not pricing");
    const quickChooser = await openContactChannelChooser(quick, expect);
    const freeDraft = await assertPreparedContactChannels(quickChooser, expect);
    const freeMessage = freeDraft.whatsappUrl.searchParams.get("text") || "";
    assert.ok(freeMessage.includes(locale === "ru" ? "Бесплатная консультация" : "Free consultation"), "Free request includes its explicit selected format");
    assert.ok(!freeMessage.includes("€50") && !freeMessage.includes("€100"), "Free enquiry must not accidentally quote a paid price");
    for (const [format, price, minutes] of [["mini", "€50", "30"], ["full", "€100", "60"]]) {
      await quick.locator('input[type="radio"][value="' + format + '"]').check();
      await expect(quick.locator('input[type="radio"][value="' + format + '"]')).toBeChecked();
      await expect(quickChooser.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
      const selectedChooser = await openContactChannelChooser(quick, expect);
      const { whatsappUrl, telegramUrl } = await assertPreparedContactChannels(selectedChooser, expect);
      const text = whatsappUrl.searchParams.get("text") || "";
      assert.ok(text.includes(price) && text.includes(minutes), "Messenger draft retains exact paid amount and duration: " + format);
      assert.equal(telegramUrl.searchParams.get("text"), text, "Telegram and WhatsApp preserve paid selection");
    }
    // The only format selector is the final section; the selected prices above
    // have already been verified against WhatsApp and Telegram drafts.
    const intake = page.locator("[data-free-drawing-intake]");
    const advanced = page.locator("details").filter({ has: intake });
    await intake.waitFor({ state: "hidden" });
    await advanced.locator(":scope > summary").click();
    await visible(intake);
    // A reflected state transition proves React is interactive before controlled inputs are filled.
    const topicChoice = intake.locator('fieldset button[type="button"]').nth(1);
    await topicChoice.click();
    await page.waitForFunction(() => document.querySelectorAll('[data-free-drawing-intake] fieldset button[type="button"]')[1]?.getAttribute('data-selected') === 'true');
    const markerA = "Synthetic privacy marker A — " + locale;
    const markerB = "Synthetic privacy marker B — " + locale;
    await intake.locator("textarea").nth(0).fill(markerA);
    await intake.locator("textarea").nth(1).fill(markerB);
    assert.equal(await intake.locator("textarea").nth(0).inputValue(), markerA, "first answer remains intact before native submit");
    assert.equal(await intake.locator("textarea").nth(1).inputValue(), markerB, "second answer remains intact before native submit");
    await intake.locator('form button[type="submit"]').click();
    const ready = intake.locator('[role="region"]');
    await visible(ready);
    const readyChooser = await openContactChannelChooser(ready, expect);
    const { whatsappUrl, telegramUrl } = await assertPreparedContactChannels(readyChooser, expect);
    const whatsappText = whatsappUrl.searchParams.get("text") || "";
    const telegramText = telegramUrl.searchParams.get("text") || "";
    const decodedPageUrl = decodeURIComponent(page.url());
    for (const marker of [markerA, markerB]) {
      assert.ok(!whatsappText.includes(marker), "WhatsApp query text must not include answer marker");
      assert.ok(!telegramText.includes(marker), "Telegram query text must not include answer marker");
      assert.ok(!decodedPageUrl.includes(marker), "Page URL must not include answer marker");
    }
    await ready.screenshot({ path: output + "/free-review-" + locale + "-ready-region-390.png" });
    await page.close();
  }

  diagnostics.devIssueOverlay = false;
  assert.deepEqual(diagnostics.pageErrors, [], "Unexpected browser page errors");
  assert.deepEqual(diagnostics.console.filter((entry) => entry.type === "error"), [], "Unexpected browser console errors");
  await context.close();
} catch (error) {
  failure = error;
} finally {
  await writeFile(output + "/browser-diagnostics.json", JSON.stringify(diagnostics, null, 2) + "\n");
  await browser.close();
}
if (failure) throw failure;
console.log("PASS public production service acceptance");