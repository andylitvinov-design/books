import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit, expect } from "@playwright/test";

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3104";
const folder = "artifacts/public-toronto-wave2";
const widths = [320, 390, 430, 1200];
const locales = ["en", "ru", "es"];
const routes = ["explore/business", "explore/love", "explore/energy", "personality-profiles"];
mkdirSync(folder, { recursive: true });
const results = [];

for (const [engine, driver] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await driver.launch({ headless: true });
  try {
    for (const locale of locales) for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 850 }, serviceWorkers: "block",
        locale: locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA",
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", err => errors.push(err.message));
        const response = await page.goto(origin + "/" + locale + "/toronto", {
          waitUntil: "domcontentloaded", timeout: 60000,
        });
        assert.equal(response.status(), 200);
        const main = page.locator('main[data-gbp-toronto-entry][data-public-design-migration="wave2"]');
        await expect(main).toHaveAttribute("lang", locale);
        await expect(main.locator(".about-nonexistent")).toHaveCount(0);
        await expect(page.locator("[data-free-quick-request]")).toHaveCount(1);
        await expect(page.locator(".house-wordmark")).toHaveCount(1);
        await expect(main.locator("h1")).toHaveCount(1);
        const strip = main.locator("[data-public-pathway-strip]");
        await expect(strip).toBeVisible();
        for (let i = 0; i < routes.length; i++) {
          const topic = strip.locator("[data-public-pathway-topic]").nth(i);
          await expect(topic).toHaveAttribute("href", "/" + locale + "/" + routes[i]);
          await expect(topic).toBeVisible();
        }
        const geometry = await page.evaluate(() => ({
          width: innerWidth, document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        if (geometry.document > width + 2) {
          const offenders = await page.evaluate(() => [...document.querySelectorAll("body *")]
            .map(el => { const r = el.getBoundingClientRect(); return {
              el: el.tagName + "." + (typeof el.className === "string" ? el.className.slice(0, 100) : ""),
              right: Math.round(r.right), left: Math.round(r.left) }; })
            .filter(x => x.right > innerWidth + 2).slice(0, 20));
          console.error("TORONTO_OVERFLOW", JSON.stringify({ engine, locale, width, geometry, offenders }));
          writeFileSync(folder + "/overflow-" + engine + "-" + locale + "-" + width + ".json", JSON.stringify({ geometry, offenders }, null, 2));
          await page.screenshot({ path: folder + "/overflow-" + engine + "-" + locale + "-" + width + ".png", fullPage: true });
        }
        assert.ok(geometry.document <= width + 2, engine + " " + locale + " " + width + " horizontal overflow");
        await expect(main.locator('section[id="request"]')).toHaveCount(1);
        await expect(main.locator('a[href="#request"]')).toHaveCount(2);
        if (width === 390) {
          await page.screenshot({ path: folder + "/" + engine + "-" + locale + "-390.png", fullPage: true });
          const first = strip.locator('[data-public-pathway-topic="business"]');
          await first.focus();
          assert.equal(await first.evaluate(el => el === document.activeElement), true);
          await main.locator('a[href="#request"]').first().click();
          await expect(page).toHaveURL(/#request$/);
          await expect(main.locator('section[id="request"]')).toBeVisible();
        }
        assert.deepEqual(errors, []);
        results.push({ engine, locale, width, pass: true, messagesSent: false, paymentsInitiated: false });
      } finally {
        await context.close();
      }
    }
  } finally { await browser.close(); }
}
writeFileSync(folder + "/results.json", JSON.stringify(results, null, 2));
console.log("PASS Toronto wave 2 " + results.length + " browser combinations");
