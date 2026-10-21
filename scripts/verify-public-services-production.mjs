import { assertAlchemyPaymentsExpanded } from './helpers/alchemy-payment-disclosure-verifier.mjs';
import { openRegisteredContactChannelChooser, assertPreparedContactChannels } from './helpers/contact-channel-verifier.mjs';
import { captureAlchemyPanelOverflow } from './helpers/alchemy-panel-overflow-diagnostics.mjs';
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

  // Spanish Alchemy has its own route. Check its untouched default state too;
  // do not navigate payment links or enable optional payment providers.
  {
    const locale = "es";
    for (const width of [320, 360, 390, 1188]) {
      const page = await createPage(width);
      const pageErrorStart = diagnostics.pageErrors.length;
      await page.goto(origin + "/es/services/alchemy-of-soul", { waitUntil: "networkidle" });
      const main = page.locator('main[data-core-service-detail="alchemy"]');
      await visible(main.locator("h1"));
      await expect(main).toHaveAttribute("lang", "es");
      await expect(main.locator('[data-alchemy-format="60"]')).toHaveAttribute("aria-pressed", "true");
      await assertNoDevIssueOverlay(page, "es/alchemy-of-soul/" + width);
      await assertViewport(page, "es/alchemy-of-soul/" + width);
      assert.equal(await main.locator('details[data-alchemy-payment-disclosure]').evaluate(node => node.open), false,
        "Default Spanish payment details are collapsed before geometry measurement");
      const panelHeights = await main.locator("[data-alchemy-panel]").evaluateAll((nodes) =>
        nodes.map(node => ({name: node.getAttribute("data-alchemy-panel"), height: Math.ceil(node.getBoundingClientRect().height), max: window.innerHeight - 80})));
      assert.equal(panelHeights.length, 8, "Eight compact Spanish Alchemy panels");
      if (width <= 390) {
        if (panelHeights.some(p => p.height > p.max)) {
          try {
            await captureAlchemyPanelOverflow({ page, output, locale, width, panelHeights });
          } catch (error) {
            console.error("Alchemy overflow diagnostics could not be saved:", error);
          }
        }
        assert.deepEqual(panelHeights.filter(p => p.height > p.max), [],
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
    for (const width of [320, 360, 390, 1188]) {
      const page = await createPage(width);
      await page.goto(origin + "/" + locale + "/services", { waitUntil: "networkidle" });
      await visible(page.locator("#services-conversion-title"));
      // Free-first studio: three distinct no-payment paths, then five real
      // personal offers. No secondary marketplace repeats on the landing.
      const freeCta = page.locator('[data-service-hero-cta="free"]');
      const paidCta = page.locator('[data-service-hero-cta="paid"]');
      await visible(freeCta);
      await visible(paidCta);
      assert.equal(await freeCta.getAttribute("href"), "#free-insights");
      assert.equal(await paidCta.getAttribute("href"), "#consultation");
      for (const action of [freeCta, paidCta]) {
        const bounds = await action.boundingBox();
        assert.ok(bounds && bounds.height >= 44,
          "Services first-screen actions must be usable at " + locale + "/" + width);
      }
      const free = page.locator('[data-services-studio-free]#free-insights');
      const paid = page.locator('[data-services-studio-paid]#solutions');
      await visible(free.locator("h2#services-free-title"));
      await visible(paid.locator("h2#services-personal-title"));
      assert.equal(await free.locator('[data-services-studio-card]').count(), 3);
      assert.equal(await paid.locator('[data-services-studio-card]').count(), 5);
      assert.equal(await page.locator("#find-your-service").count(), 0,
        "Detailed practitioner search belongs on the separate directory");
      const testAction = free.locator('[data-services-studio-action="tests"]');
      assert.equal(await testAction.getAttribute("href"), "/" + locale + "/tests");
      await visible(free.locator('a[href="/' + locale + '/services/free-situation-review"]').first());
      await visible(free.locator('a[href="/' + locale + '/services/dao-health-profile"]').first());
      await visible(free.locator('a[href="/' + locale + '/courses/antistress"]'));
      assert.equal(await page.locator("h1#services-conversion-title").count(), 1);
      assert.equal(await page.evaluate(() => {
        const selectors = ["#services-conversion-title", "#free-insights", "#solutions",
          "[data-services-meet]", '[data-personal-testimonials="services"]',
          "#method-videos", "#consultation", "[data-services-directory-invitation]"];
        const sections = selectors.map(selector => [...document.querySelectorAll(selector)]);
        if (sections.some(matches => matches.length !== 1)) return false;
        return sections.every((matches, index) => index === 0 ||
          Boolean(sections[index - 1][0].compareDocumentPosition(matches[0]) & Node.DOCUMENT_POSITION_FOLLOWING));
      }), true, "Owner studio order: hero, 3 free, personal offers, intro, reviews, methods, booking, directory");
      await expect(page.locator("#method-videos")).toHaveAttribute("open", "",
        { timeout: 15000 });
      // Method posters are visible, while third-party players stay opt-in.
      assert.equal(await page.locator("#method-videos iframe").count(), 0,
        "Method videos must not eagerly load third-party players");
      await visible(page.locator('a[href="/' + locale + '/services/free-situation-review"]').first());
      await assertNoDevIssueOverlay(page, locale + "/services/" + width);
      // Canonical header: Library shortcut; Cabinet keeps account access in the menu.
      const header = page.locator("header.house-header--services");
      const libraryEntry = header.locator("a.site-library-entry");
      await expect(libraryEntry).toHaveCount(1);
      await visible(libraryEntry);
      assert.equal(await libraryEntry.getAttribute("href"), "/" + locale + "/library", "top Library link keeps its locale");
      const libraryBounds = await libraryEntry.boundingBox();
      assert.ok(libraryBounds && libraryBounds.x >= 0 && libraryBounds.x + libraryBounds.width <= width + 1, "Library entry must fit the visible header: " + locale + "/" + width);
      const siteMenu = header.locator("details.site-main-menu");
      await expect(siteMenu).not.toHaveAttribute("open", "");
      const menuTrigger = siteMenu.locator("summary.site-main-menu-trigger");
      await visible(menuTrigger);
      const menuBounds = await menuTrigger.boundingBox();
      assert.ok(menuBounds && menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= width + 1,
        "Public site menu must fit the header: " + locale + "/" + width);
      await siteMenu.locator("summary.site-main-menu-trigger").click();
      await expect(siteMenu).toHaveAttribute("open", "");
      const cabinetEntry = siteMenu.locator('.site-main-menu-panel a[href="/' + locale + '/app"]');
      await expect(cabinetEntry).toHaveCount(1);
      await visible(cabinetEntry);
      await expect(cabinetEntry).toHaveText(locale === "ru" ? "Кабинет" : "Cabinet");
      assert.equal(await cabinetEntry.getAttribute("href"), "/" + locale + "/app", "Cabinet opens the authenticated app");
      const cabinetBounds = await cabinetEntry.boundingBox();
      assert.ok(cabinetBounds && cabinetBounds.x >= 0 && cabinetBounds.x + cabinetBounds.width <= width + 1, "Cabinet entry must fit the opened menu: " + locale + "/" + width);
      await siteMenu.locator("summary.site-main-menu-trigger").click();
      await expect(siteMenu).not.toHaveAttribute("open", "");
      await assertViewport(page, locale + "/services/" + width);
      if (width === 390 || width === 1188) {
        await page.screenshot({ path: output + "/services-" + locale + "-hero-" + width + ".png", fullPage: false });
      }
      if (width === 390) {
        const insights = page.locator("[data-services-studio-free]#free-insights");
        await insights.scrollIntoViewIfNeeded();
        await insights.screenshot({ path: output + "/services-" + locale + "-free-insights-390.png" });
      }
      // Keep the advanced matching UX available on a separate, dedicated
      // directory page, instead of duplicating it below personal offers.
      const directoryResponse = await page.goto(origin + "/" + locale + "/services/catalog", { waitUntil: "networkidle" });
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
    await page.goto(origin + "/es/services", { waitUntil: "networkidle" });
    await visible(page.locator('[data-services-studio-free]'));
    assert.equal(await page.locator('[data-services-studio-free] [data-services-studio-card]').count(), 3);
    assert.equal(await page.locator('[data-services-studio-paid] [data-services-studio-card]').count(), 5);
    assert.equal(await page.locator("#find-your-service").count(), 0);
    await page.goto(origin + "/es/services/catalog", { waitUntil: "networkidle" });
    const freeOnly = page.locator("#find-your-service input[data-free-services-only]");
    await visible(freeOnly);
    await expect(freeOnly).not.toBeChecked();
    await freeOnly.check();
    await page.locator('#find-your-service form[role="search"] button[type="submit"]').click();
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
      const response = await page.goto(origin + "/" + locale + "/services/" + service, { waitUntil: "networkidle", timeout: 60000 });
      assert.equal(response?.status(), 200, "Personal landing should render: " + label);
      const main = page.locator('main[data-personal-service="' + service + '"]');
      await visible(main.locator('h1#personal-service-title'));
      assert.equal(await main.locator("h1").count(), 1, "One personal landing title: " + label);
      const photo = main.locator('section[aria-labelledby="personal-service-title"] img').first();
      assert.ok(await photo.evaluate(image => image.complete && image.naturalWidth > 100), "Approved hero photo loads: " + label);
      assert.equal(await main.locator('[class*="heroFacts"]').count(), 1);
      const facts = await main.locator('[class*="heroFacts"]').innerText();
      assert.ok(facts.includes("€50") && facts.includes("€100"), "Both paid session formats visible: " + label);
      const free = main.locator('a[href="/' + locale + '/services/free-situation-review"]').first();
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
      const target = main.locator('aside#request-session [data-consultation-capture="service"]');
      await visible(target);
      assert.ok(await target.locator('[data-choice-layout="service"]').count() === 1,
        "Paid format selector must be present after anchor navigation: " + label);
      const choices = target.locator('[data-choice-layout="service"] button');
      assert.equal(await choices.count(), 3, "Two paid choices and the separate free alternative: " + label);
      await choices.nth(1).click();
      await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
      const chooser = await openRegisteredContactChannelChooser(target, expect, page);
      const prepared = await assertPreparedContactChannels(chooser, expect);
      assert.ok((prepared.whatsappUrl.searchParams.get("text") || "").includes("€50"),
        "Express rate preserved in approved draft: " + label);
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
    const response = await page.goto(origin + "/" + locale + "/services/business-consulting", {waitUntil:"networkidle",timeout:60000});
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
    const requestForm = main.locator("[data-business-website-enquiry]");
    await visible(requestForm);
    assert.equal(await requestForm.locator("select[data-business-field=\"format\"]").count(),1);
    await expect(requestForm.locator("button[type=submit]")).toBeDisabled();
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
    const chooser = await openRegisteredContactChannelChooser(express, expect, page);
    const prepared = await assertPreparedContactChannels(chooser, expect);
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
        await page.goto(origin + "/" + locale + "/services/" + slug, { waitUntil: "networkidle" });
        const main = page.locator('main[data-core-service-detail="' + kind + '"]');
        await visible(main.locator("h1"));
        await assertNoDevIssueOverlay(page, locale + "/" + slug + "/" + width);
        await assertViewport(page, locale + "/" + slug + "/" + width);
        if (width === 390 || width === 1188) {
          await page.screenshot({ path: output + "/core-" + locale + "-" + slug + "-hero-" + width + ".png", fullPage: false });
        }
        if (kind === "alchemy") {
          assert.equal(await main.locator('details[data-alchemy-payment-disclosure]').evaluate(node => node.open), false,
            "Default payment details are collapsed before geometry measurement");
        }
        if (kind === "alchemy" && width <= 390) {
          const panelHeights = await main.locator("[data-alchemy-panel]").evaluateAll((nodes) =>
            nodes.map(node => ({name: node.getAttribute("data-alchemy-panel"), height: Math.ceil(node.getBoundingClientRect().height), max: window.innerHeight - 80})));
          assert.equal(panelHeights.length, 8, "Eight compact Alchemy panels");
          if (panelHeights.some(p => p.height > p.max)) {
            try {
              await captureAlchemyPanelOverflow({ page, output, locale, width, panelHeights });
            } catch (error) {
              // Diagnostic failures must never replace the original layout assertion.
              console.error("Alchemy overflow diagnostics could not be saved:", error);
            }
          }
          assert.deepEqual(panelHeights.filter(p => p.height > p.max), [],
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
            await visible(form.locator('[data-contact-order]'));
            // Two editorial choices plus the separate international phone country selector.
            // Check semantic controls instead of a fragile global select count.
            await expect(form.locator('select[id$="-format"]')).toHaveCount(1);
            await expect(form.locator('select[id$="-topic"]')).toHaveCount(1);
            await expect(form.locator('select[aria-label="Country calling code"]')).toHaveCount(1);
            const reviewStack = main.locator('[data-alchemy-review-stack]');
            const positions = await reviewStack.locator('[data-testimonial-video-id]').evaluateAll(nodes =>
              nodes.map(node => ({top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom})));
            assert.equal(positions.length, 3, "Exactly three original testimonials");
            assert.ok(positions.every((pos, index) => index === 0 || pos.top >= positions[index-1].bottom),
              "All testimonial videos must stack vertically");
            assert.ok(await reviewStack.evaluate(node => node.scrollWidth <= node.clientWidth + 1),
              "No horizontal scrolling or squeezed testimonials");
            const pricing = main.locator('[data-alchemy-booking-formats]');
            // Payments are still available after agreement, but the default
            // 320/390px decision screen must not be extended by transfer notes.
            const paymentDisclosure = pricing.locator('[data-alchemy-payment-disclosure]');
            if (await paymentDisclosure.count()) {
              assert.equal(await paymentDisclosure.evaluate(node => node.open), false,
                "Payment methods must be collapsed until explicitly requested");
              await paymentDisclosure.locator('summary').click();
              assert.equal(await paymentDisclosure.evaluate(node => node.open), true,
                "Payment help can be expanded with an accessible control");
              await paymentDisclosure.locator('summary').click();
            }
            await pricing.locator('[data-alchemy-format="month"]').click();
            await expect(pricing.locator('[data-alchemy-format="month"]')).toHaveAttribute('aria-pressed','true');
            assert.equal(await paymentDisclosure.count(), 0,
              "Unpriced monthly support must never expose one-time transfer amounts");
            await pricing.locator('[data-alchemy-format="30"]').click();
            await assertAlchemyPaymentsExpanded(main, expect, width);
            const channels = await openRegisteredContactChannelChooser(pricing, expect, page);
            const prepared = await assertPreparedContactChannels(channels, expect);
            assert.ok(prepared.whatsappUrl.searchParams.get('text').includes('€50'),
              "Selected express session must appear in prepared order draft");
            await page.screenshot({path: output + "/alchemy-" + locale + "-vertical-reviews-390.png", fullPage: false});
            await page.screenshot({path: output + "/alchemy-" + locale + "-request-390.png", fullPage: false});
          } else {
            const capture = main.locator('section:has(> details)');
            assert.equal(await capture.count(), 1, "Exactly one core-service footer");
            await capture.scrollIntoViewIfNeeded();
            const chooser = await openRegisteredContactChannelChooser(capture, expect, page);
            const { whatsappUrl } = await assertPreparedContactChannels(chooser, expect);
            assert.ok(whatsappUrl.searchParams.get('text').includes(await main.locator('h1').innerText()), 'Prepared request must retain the selected service');
            const alternative = main.locator("details").filter({ hasText: locale === "ru" ? "Предпочитаете сначала бесплатный письменный разбор ситуации?" : "Prefer to start with a free written situation review?" });
            assert.equal(await alternative.evaluate((element) => element.open), false, "alternative starts collapsed");
            await alternative.locator("summary").click();
            await visible(alternative.locator('a[href="/' + locale + '/services/free-situation-review"]'));
            await page.screenshot({path: output + "/core-" + locale + "-" + slug + "-footer-expanded-390.png", fullPage: false});
          }
        }
        await page.close();
      }
    }
  }

  // The three free paths now share a photo-led landing and an actual independent entry.
  for (const locale of ["en", "ru", "es"]) {
    for (const [kind, slug, captureId] of [
      ["tests", "tests", "start-free"],
      ["situation", "services/free-situation-review", "request-free-review"],
      ["dao", "services/dao-health-profile", "request-free-wu-xing"],
    ]) {
      for (const width of [320, 360, 390, 1188]) {
        const page = await createPage(width);
        await page.goto(origin + "/" + locale + "/" + slug, { waitUntil: "networkidle" });
        const main = page.locator('main[data-free-entry-landing="' + kind + '"]');
        await visible(main.locator('h1'));
        await assertNoDevIssueOverlay(page, locale + "/" + slug + "/" + width);
        await assertViewport(page, locale + "/" + slug + "/" + width);

        const hero = main.locator('section[aria-labelledby="free-entry-title"]');
        await visible(hero.locator('img'));
        await visible(main.locator('#what-you-get'));
        await visible(main.locator('#how-it-works'));
        const capture = main.locator('#' + captureId);
        await visible(capture);
        assert.ok((await hero.innerText()).length > 150, "First screen must explain value before an enquiry");
        assert.ok(!(await hero.innerText()).includes("€100"), "A free hero must not be a paid consultation upsell");

        if (width <= 390) {
          const panelHeights = await page.evaluate(() => {
            const names = {
              hero: 'section[aria-labelledby="free-entry-title"]',
              outcomes: '#what-you-get',
              process: '#how-it-works',
            };
            return Object.entries(names).map(([name, selector]) => {
              const el = document.querySelector(selector);
              return { name, height: Math.ceil(el?.getBoundingClientRect().height ?? 9999),
                max: window.innerHeight - 66 };
            });
          });
          assert.deepEqual(panelHeights.filter((item) => item.height > item.max), [],
            "Each photo-led mobile section should fit within one screen: " + JSON.stringify(panelHeights));
        }

        if (kind === "tests") {
          await visible(main.locator('a[href="/' + locale + '/client/tests"]').first());
          assert.equal(await main.locator('[data-free-resource-enquiry]').count(), 0,
            "Tests begin in the existing private test explorer, not a fake contact form");
        } else {
          const form = main.locator('[data-free-resource-enquiry="' + kind + '"]');
          await visible(form);
          assert.equal(await form.locator('select').count(), 1);
          assert.equal(await form.locator('input[type="text"]').count(), 1);
          assert.equal(await form.locator('textarea').count(), 1);
          const markerA = "Synthetic name marker - " + locale + "/" + kind;
          const markerB = "Synthetic private context marker - " + locale + "/" + kind;
          await form.locator('input[type="text"]').fill(markerA);
          await form.locator('textarea').fill(markerB);
          await visible(form.getByRole('button', {name: locale === "ru" ? "Скопировать мой запрос" : locale === "es" ? "Copiar mis detalles" : "Copy my details"}));
          const chooser = await openRegisteredContactChannelChooser(form, expect, page);
          const { whatsappUrl, telegramUrl } = await assertPreparedContactChannels(chooser, expect);
          assert.ok((whatsappUrl.searchParams.get("text") || "").length > 40);
          for (const marker of [markerA, markerB]) {
            assert.ok(!whatsappUrl.searchParams.get("text")?.includes(marker), "Private note must not leak in WhatsApp URL");
            assert.ok(!telegramUrl.searchParams.get("text")?.includes(marker), "Private note must not leak in Telegram URL");
            assert.ok(!decodeURIComponent(page.url()).includes(marker), "Private note must not leak in page URL");
          }
          if (kind === "situation") {
            const detailedForm = main.locator('[data-free-drawing-intake]');
            await detailedForm.waitFor({ state: "hidden" });
            const details = main.locator('details').filter({ has: detailedForm });
            assert.equal(await details.evaluate((element) => element.open), false,
              "The real hand-drawn situation questionnaire is available but initially compact");
            if (width === 390) {
              await details.locator(':scope > summary').click();
              await visible(detailedForm);
              await detailedForm.locator('textarea').nth(0).fill(markerA);
              await detailedForm.locator('textarea').nth(1).fill(markerB);
              await detailedForm.locator('form button[type="submit"]').click();
              const ready = detailedForm.locator('[role="region"]');
              await visible(ready);
              const intakeChannels = await openRegisteredContactChannelChooser(ready, expect, page);
              const prepared = await assertPreparedContactChannels(intakeChannels, expect);
              for (const marker of [markerA, markerB]) {
                assert.ok(!prepared.whatsappUrl.searchParams.get("text")?.includes(marker));
                assert.ok(!prepared.telegramUrl.searchParams.get("text")?.includes(marker));
              }
            }
          }
        }
        if (width === 390 || width === 1188) {
          await page.screenshot({path: output + "/free-" + kind + "-" + locale + "-hero-" + width + ".png", fullPage: false});
        }
        await page.close();
      }
    }
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