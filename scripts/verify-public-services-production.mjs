import { chromium, expect } from "@playwright/test";
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
    assert.ok(scrollWidth <= width + 1, "Horizontal overflow: " + label + " (" + scrollWidth + " > " + width + ")");
  };
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
      await expect(page.locator("#services-conversion-title")).toBeVisible();
      await expect(page.locator('[data-free-insights="public"]')).toBeVisible();
      await expect(page.locator('a[href="/' + locale + '/services/free-situation-review"]').first()).toBeVisible();
      await assertNoDevIssueOverlay(page, locale + "/services/" + width);
      await assertViewport(page, locale + "/services/" + width);
      if (width === 390 || width === 1188) {
        await page.screenshot({ path: output + "/services-" + locale + "-hero-" + width + ".png", fullPage: false });
      }
      if (width === 390) {
        const insights = page.locator('[data-free-insights="public"]');
        await insights.scrollIntoViewIfNeeded();
        await insights.screenshot({ path: output + "/services-" + locale + "-free-insights-390.png" });
      }
      await page.close();
    }
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
        await expect(main.locator("h1")).toBeVisible();
        await assertNoDevIssueOverlay(page, locale + "/" + slug + "/" + width);
        await assertViewport(page, locale + "/" + slug + "/" + width);
        if (width === 390 || width === 1188) {
          await page.screenshot({ path: output + "/core-" + locale + "-" + slug + "-hero-" + width + ".png", fullPage: false });
        }
        if (width === 390) {
          const footerCta = main.locator('a[data-contact-channel="whatsapp"]').last();
          await footerCta.scrollIntoViewIfNeeded();
          const alternative = main.locator("details");
          assert.equal(await alternative.evaluate((element) => element.open), false, "alternative starts collapsed");
          await alternative.locator("summary").click();
          await expect(alternative.locator('a[href="/' + locale + '/services/free-situation-review"]')).toBeVisible();
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
      await expect(page.locator("[data-free-drawing-intake]")).toBeVisible();
      await assertNoDevIssueOverlay(page, locale + "/free-situation-review/" + width);
      await assertViewport(page, locale + "/free-situation-review/" + width);
      if (width === 390 || width === 1188) {
        await page.screenshot({ path: output + "/free-review-" + locale + "-hero-" + width + ".png", fullPage: false });
      }
      await page.close();
    }

    const page = await createPage(390);
    await page.goto(origin + "/" + locale + "/services/free-situation-review", { waitUntil: "networkidle" });
    const intake = page.locator("[data-free-drawing-intake]");
    const markerA = "Synthetic privacy marker A — " + locale;
    const markerB = "Synthetic privacy marker B — " + locale;
    await intake.locator("textarea").nth(0).fill(markerA);
    await intake.locator("textarea").nth(1).fill(markerB);
    await intake.locator('form button[type="submit"]').click();
    const ready = intake.locator('[role="region"]');
    await expect(ready).toBeVisible();
    const href = await ready.locator('a[data-contact-channel="whatsapp"]').getAttribute("href");
    const whatsappText = new URL(href || "").searchParams.get("text") || "";
    const decodedPageUrl = decodeURIComponent(page.url());
    for (const marker of [markerA, markerB]) {
      assert.ok(!whatsappText.includes(marker), "WhatsApp query text must not include answer marker");
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