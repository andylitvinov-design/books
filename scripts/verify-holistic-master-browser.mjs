import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";

const journeys = [
  { locale: "en", width: 320, title: "I'm a Master — Offer My Services", tab: "Holistic Support", accessible: "Holistic Support" },
  { locale: "ru", width: 390, title: "Я мастер — предложить свои услуги", tab: "Поддержка", accessible: "Холистическая поддержка" },
  { locale: "es", width: 430, title: "Soy profesional — ofrecer mis servicios", tab: "Apoyo holístico", accessible: "Apoyo holístico" },
];

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const { locale, width, title, tab, accessible } of journeys) {
      const page = await browser.newPage({ viewport: { width, height: 812 }, deviceScaleFactor: 2 });
      try {
        await page.goto(origin + "/" + locale + "/holistic-support", { waitUntil: "domcontentloaded", timeout: 45_000 });
        const hero = page.locator("[data-holistic-first-screen]");
        await hero.waitFor({ state: "visible", timeout: 20_000 });
        const choices = hero.locator("[data-holistic-path]");
        assert.equal(await choices.count(), 2, engineName + " " + locale + ": two first-screen directions");
        const bottomTab = page.locator('.mobile-bottom-navigation [data-nav-item="temple"]');
        await bottomTab.waitFor({ state: "visible", timeout: 20_000 });
        assert.equal((await bottomTab.innerText()).trim(), tab);
        assert.equal(await bottomTab.getAttribute("aria-label"), accessible);
        assert.equal(await bottomTab.getAttribute("aria-current"), "page");
        const boxes = [await hero.boundingBox(), await bottomTab.boundingBox()];
        for (const [index, rect] of boxes.entries()) {
          assert.ok(rect && rect.x >= -1 && rect.x + rect.width <= width + 1,
            engineName + " " + locale + " hero/tab horizontal overflow " + index);
        }
        for (const key of ["insights", "healing"]) {
          const path = hero.locator('[data-holistic-path="' + key + '"]');
          const target = key === "insights" ? "temple-psychic-insights" : "holistic-healing-support";
          const href = "#" + target;
          assert.equal(await path.getAttribute("href"), href);
          const rect = await path.boundingBox();
          assert.ok(rect && rect.width >= 44 && rect.height >= 44 &&
            rect.x >= -1 && rect.x + rect.width <= width + 1,
            engineName + " " + locale + " " + key + ": touch target 44px and no overflow");
          await path.click();
          await page.waitForURL(url => url.hash === href, { timeout: 20_000 });
          await page.locator("#" + target).waitFor({ state: "visible", timeout: 20_000 });
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          engineName + " " + locale + ": no document horizontal overflow");
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
        console.log("PASS " + engineName + " " + locale + " " + width + "px: two hero directions, bottom label, practitioner CTA and Pro destination");
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
