import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";

const journeys = [
  { locale: "en", width: 320, title: "I'm a Master — Offer My Services" },
  { locale: "ru", width: 390, title: "Я мастер — предложить свои услуги" },
  { locale: "es", width: 430, title: "Soy profesional — ofrecer mis servicios" },
];

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const { locale, width, title } of journeys) {
      const page = await browser.newPage({ viewport: { width, height: 812 }, deviceScaleFactor: 2 });
      try {
        await page.goto(origin + "/" + locale + "/holistic-support#holistic-healing-support", { waitUntil: "domcontentloaded", timeout: 45_000 });
        const card = page.locator('[data-holistic-offer="practitioner"]');
        await card.waitFor({ state: "visible", timeout: 20_000 });
        assert.equal(await card.locator("h3").innerText(), title);
        const action = card.locator("[data-holistic-practitioner-cta]");
        assert.equal(await action.getAttribute("href"), "/" + locale + "/pro#profi-practice");
        const bounds = await card.boundingBox();
        const buttonBounds = await action.boundingBox();
        assert.ok(bounds && buttonBounds, locale + ": card and CTA have visible boxes");
        for (const [name, rect] of [["card", bounds], ["CTA", buttonBounds]]) {
          assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1, engineName + " " + locale + " " + name + " overflow at " + width + "px");
        }
        await action.click();
        await page.waitForURL(url => url.pathname === "/" + locale + "/pro" && url.hash === "#profi-practice", { timeout: 30_000 });
        await page.locator("#profi-practice").waitFor({ state: "visible", timeout: 20_000 });
        console.log("PASS " + engineName + " " + locale + " " + width + "px: practitioner card, CTA and Pro destination");
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
