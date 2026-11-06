import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit, expect } from "@playwright/test";

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3103";
const output = "artifacts/public-wave1";
const widths = [320, 390, 430, 1200];
const routes = ["about", "contact"];
const locales = ["en", "ru", "es"];
const expected = {
  business: "explore/business",
  relationships: "explore/love",
  energy_health: "explore/energy",
  personal_growth: "personality-profiles",
};
mkdirSync(output, { recursive: true });
const reports = [];
for (const [engine, driver] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await driver.launch({ headless: true });
  try {
    for (const locale of locales) {
      for (const route of routes) {
        for (const width of widths) {
          const context = await browser.newContext({
            viewport: { width, height: 875 },
            locale: locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA",
            serviceWorkers: "block",
          });
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", error => errors.push(error.message));
          try {
            const response = await page.goto(origin + "/" + locale + "/" + route, {
              waitUntil: "domcontentloaded", timeout: 60000,
            });
            assert.equal(response?.status(), 200, locale + "/" + route + " HTTP");
            const root = page.locator('main[data-public-design-migration="wave1"]');
            await expect(root).toHaveAttribute("lang", locale);
            const strip = root.locator("[data-public-pathway-strip]");
            await expect(strip).toBeVisible();
            await expect(strip.locator("[data-public-pathway-topic]")).toHaveCount(4);
            for (const [id, suffix] of Object.entries(expected)) {
              const link = strip.locator('[data-public-pathway-topic="' + id + '"]');
              await expect(link).toHaveAttribute("href", "/" + locale + "/" + suffix);
              await expect(link).toBeVisible();
            }
            // The horizontal testimonial archive must remain independently
            // keyboard/touch scrollable even while the root never widens.
            if (route === "about") {
              // CSS Modules hash visual class names; target the existing accessible carousel region.
              const gallery = page.locator('[data-personal-testimonials="about"] [role="region"][tabindex="0"]');
              await expect(gallery).toHaveCount(1);
              const state = await gallery.evaluate(el => ({
                client: el.clientWidth, content: el.scrollWidth,
                overflowX: getComputedStyle(el).overflowX,
                rootOverflowX: getComputedStyle(document.querySelector('main[data-public-design-migration="wave1"]')).overflowX,
              }));
              assert.ok(state.content > state.client && state.overflowX === "auto" && state.rootOverflowX === "hidden",
                engine+" "+locale+"/about "+width+" gallery remains independently scrollable: "+JSON.stringify(state));
            }
            const didOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
            if (didOverflow) {
              const suspects = await page.evaluate(() => {
                const viewport = window.innerWidth;
                return {
                  viewport, documentWidth: document.documentElement.scrollWidth,
                  bodyWidth: document.body.scrollWidth,
                  elements: [...document.querySelectorAll("body *")].map(el => {
                    const box = el.getBoundingClientRect();
                    return { tag: el.tagName.toLowerCase(), id: el.id,
                      cls: typeof el.className === "string" ? el.className.slice(0, 160) : "",
                      left: Math.round(box.left), right: Math.round(box.right),
                      width: Math.round(box.width), scrollWidth: el.scrollWidth,
                      overflowX: getComputedStyle(el).overflowX };
                  }).filter(x => x.right > viewport + 2 && x.width > 0)
                    .sort((a, b) => b.right - a.right).slice(0, 28),
                };
              });
              console.error("WAVE1_OVERFLOW_FORENSICS", JSON.stringify({ engine, locale, route, width, suspects }));
              writeFileSync(output + "/overflow-" + engine + "-" + locale + "-" + route + "-" + width + ".json", JSON.stringify(suspects, null, 2));
              await page.screenshot({ path: output + "/overflow-" + engine + "-" + locale + "-" + route + "-" + width + ".png", fullPage: true });
            }
            assert.equal(didOverflow, false, engine + " " + locale + "/" + route + " " + width + " overflow");
            if (route === "about") {
              assert.equal(await page.locator(".about-biography > section").count(), 7);
              await expect(page.locator(".about-portrait img")).toHaveCount(1);
              await expect(page.locator('[data-consultation-capture="personal"]')).toHaveCount(1);
              // Existing HeyGen video must remain user-started; no autoplay iframe.
              assert.equal(await page.locator('[data-video-slot="about-intro"] iframe').count(), 0);
            } else {
              await expect(page.getByRole("link", { name: /WhatsApp/i })).toBeVisible();
              await expect(page.getByRole("link", { name: /Telegram/i })).toBeVisible();
              await expect(page.locator('a[href*="/app/settings#hh-client-contact-phone"]')).toHaveCount(1);
            }
            if (width === 390) {
              await page.screenshot({ path: output + "/" + engine + "-" + locale + "-" + route + "-390.png", fullPage: true });
              const first = strip.locator('[data-public-pathway-topic="business"]');
              await first.focus();
              assert.equal(await first.evaluate(el => el === document.activeElement), true, "keyboard focus");
              if (engine === "chromium" && route === "contact") {
                await first.click();
                await expect(page).toHaveURL(new RegExp("/" + locale + "/explore/business(?:\\?|$)"));
              }
            }
            assert.deepEqual(errors, [], engine + " " + locale + "/" + route + " page errors");
            reports.push({ engine, locale, route, width, status: "pass", overflow: false });
          } finally {
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
}
writeFileSync(output + "/results.json", JSON.stringify({ reports, passiveOnly: true, messagesSent: 0, privateDataAccessed: false }, null, 2));
console.log("PASS public pathway browser: " + reports.length + " combinations");
