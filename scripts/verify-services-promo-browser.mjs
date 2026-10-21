import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const playwright = process.env.HH_PLAYWRIGHT_PACKAGE || "playwright";
const { chromium } = require(playwright);
const { expect } = require(playwright + "/test");

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Promo browser verification only runs against a local isolated server");
const output = "artifacts/public-services-promo";
await mkdir(output, {recursive:true});
const browser = await chromium.launch();
try {
  const locales = ["en", "ru", "es"];
  const offers = ["tests", "situation", "dao"];
  for (const locale of locales) {
    for (const width of [320, 390, 430]) {
      const page = await browser.newPage({viewport:{width,height:844}});
      const errors = [];
      const submits = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/service-enquiries", async route => {
        if (route.request().method() !== "POST") return route.continue();
        submits.push(route.request().postDataJSON());
        await route.fulfill({status:201,contentType:"application/json",
          body:JSON.stringify({saved:true,referenceCode:"HH-ABCD1234EF56"})});
      });
      const response = await page.goto(origin + "/" + locale + "/services", {waitUntil:"networkidle"});
      assert.equal(response?.status(), 200);
      const promo = page.locator('[data-services-promo]');
      await expect(promo).toBeVisible();
      await expect(promo).toHaveAttribute("data-services-promo-active", "tests");
      await expect(promo.locator('[data-services-promo-dot]')).toHaveCount(3);
      const header = page.locator("header.house-header--services");
      const hero = page.locator("[data-services-showcase-hero]");
      assert.equal(await promo.evaluate((node, h) => {
        const target = document.querySelector(h);
        return Boolean(target && (node.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING));
      }, "[data-services-showcase-hero]"), true, "Promo must precede category slider");
      await expect(hero).toBeVisible();
      const measured = await promo.locator('[class*="services-promo-carousel_card"]').boundingBox();
      assert.ok(measured && measured.height <= 760,
        "One-screen promo offer + form card at " + locale + "/" + width + ": " + measured?.height);

      // One synthetic registration per locale, using a different offer, so no
      // actual user/CRM record is created during these browser tests.
      const wanted = offers[locales.indexOf(locale)];
      if (wanted !== "tests") await promo.locator('[data-services-promo-dot="' + wanted + '"]').click();
      await expect(promo).toHaveAttribute("data-services-promo-active", wanted);
      const chooser = promo.locator('[data-contact-channel-chooser]');
      await expect(chooser).toHaveAttribute("data-presentation", "inline");
      await expect(chooser.locator("form")).toBeVisible();
      await expect(chooser.locator('button[data-contact-order]')).toHaveCount(0);
      await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
      const form = chooser.locator("form");
      const submit = form.locator('button[type="submit"]');
      await expect(submit).toBeDisabled();
      await expect(form.locator('input[autocomplete="email"]')).toBeVisible();
      await form.locator('input[autocomplete="email"]').fill("promo-qa@example.test");
      await expect(submit).toBeDisabled();
      await form.locator('input[type="checkbox"]').check();
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
      await expect(chooser.locator('[role="status"]')).toContainText("HH-ABCD1234EF56");
      assert.equal(submits.length,1);
      const payload=submits[0];
      assert.equal(payload.locale,locale);
      assert.equal(payload.sourcePath,"/"+locale+"/services");
      assert.equal(payload.contactConsent,true);
      assert.equal(payload.contact.email,"promo-qa@example.test");
      assert.equal(payload.contact.phone,"");
      assert.equal(payload.description,"");
      assert.equal(payload.website,"");
      assert.match(payload.serviceTitle,/./);
      assert.match(payload.operationId,/^[a-f0-9-]{36}$/i);
      const wa=new URL(await chooser.locator('[data-contact-channel="whatsapp"]').getAttribute("href"));
      const tg=new URL(await chooser.locator('[data-contact-channel="telegram"]').getAttribute("href"));
      assert.equal(wa.origin,"https://wa.me");
      assert.equal(tg.origin,"https://t.me");
      assert.equal(wa.searchParams.get("text"),tg.searchParams.get("text"));
      assert.doesNotMatch(wa.searchParams.get("text")||"",/promo-qa@example\.test/);
      assert.match(wa.searchParams.get("text")||"",/HH-ABCD1234EF56/);
      // Swapping the promotion must never silently reuse the previous lead.
      await promo.locator("[data-services-promo-next]").click();
      await expect(chooser).toHaveCount(1);
      await expect(promo).not.toHaveAttribute("data-services-promo-active", wanted);
      await expect(promo.locator('[data-contact-channel-chooser] form')).toBeVisible();
      await expect(promo.locator('a[data-contact-channel]')).toHaveCount(0);
      assert.equal(submits.length,1);
      await promo.locator("[data-services-promo-prev]").click();
      await expect(promo).toHaveAttribute("data-services-promo-active", wanted);

      const overflow=await page.evaluate(() => ({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(overflow.scroll<=overflow.inner+1, "No horizontal overflow: " + locale + "/" + width + " " + JSON.stringify(overflow));
      assert.deepEqual(errors,[], "No JS page errors: " + locale + "/" + width);
      if(width===390) await promo.screenshot({path:output+"/promo-"+locale+"-390.png"});
      await page.close();
    }
  }
  console.log("Promotion carousel verified: EN/RU/ES × iPhone 320/390/430, inline synthetic CRM registration");
} finally { await browser.close(); }
