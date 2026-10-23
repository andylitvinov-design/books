/**
 * Narrow, repeatable production-build acceptance for the Services mode control.
 * Runs only against the CI loopback server; deliberately avoids submissions,
 * checkout, messenger redirects, or client/private account interactions.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.HH_PLAYWRIGHT_PACKAGE || "playwright";
const { chromium, webkit } = require(playwrightPath);
const { expect } = require(playwrightPath + "/test");

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Services mode browser QA must use an isolated loopback production build");
}

const translations = {
  en: { heading: "What kind of support are you looking for?", online: "Online", local: "In person" },
  ru: { heading: "Какой тип услуг вам подходит?", online: "Онлайн", local: "Лично" },
  es: { heading: "¿Qué tipo de servicio buscas?", online: "En línea", local: "Presencial" },
};
const viewports = [320, 390, 430, 1188];
await mkdir("artifacts/public-services-production", { recursive: true });

let passed = 0;
for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    try {
      for (const [locale, translated] of Object.entries(translations)) {
        for (const width of viewports) {
          const page = await context.newPage();
          try {
            await page.setViewportSize({ width, height: 844 });
            const response = await page.goto(origin + "/" + locale + "/services", {
              waitUntil: "networkidle",
              timeout: 60000,
            });
            assert.equal(response?.status(), 200, engineName + " " + locale + "/" + width + " returned HTTP 200");

            const finder = page.locator("[data-services-category-filter]");
            const header = finder.locator('[class*="filterHeader"]');
            const heading = header.locator("h2");
            const switcher = header.getByRole("group", {
              name: locale === "ru" ? "Как вам удобно встретиться?"
                : locale === "es" ? "¿Dónde prefieres reunirnos?"
                : "Where would you like to meet?",
            });
            const online = switcher.locator('[data-services-mode="online"]');
            const inPerson = switcher.locator('[data-services-mode="toronto"]');
            await expect(heading).toHaveText(translated.heading);
            await expect(online).toHaveText(translated.online);
            await expect(inPerson).toHaveText(translated.local);
            await expect(switcher.locator("button")).toHaveCount(2);
            await expect(online).toHaveAttribute("aria-pressed", "true");
            await expect(inPerson).toHaveAttribute("aria-pressed", "false");
            await expect(inPerson).toHaveAttribute("aria-label", /Toronto/);

            const bounds = await page.evaluate(() => {
              const header = document.querySelector("[data-services-category-filter] [class*='filterHeader']");
              const h2 = header.querySelector("h2");
              const group = header.querySelector("[role=group]");
              const buttons = [...group.querySelectorAll("button")];
              const rect = node => {
                const r = node.getBoundingClientRect();
                return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
              };
              return {
                heading: rect(h2),
                group: rect(group),
                buttons: buttons.map(rect),
                viewport: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
              };
            });
            assert.ok(bounds.group.left >= bounds.heading.right - 1,
              "Mode switch must sit to the right of the question: " + engineName + " " + locale + "/" + width);
            assert.ok(Math.abs(bounds.group.top - bounds.heading.top) <= 15,
              "Mode switch must align with the heading row: " + engineName + " " + locale + "/" + width);
            assert.ok(bounds.group.right <= width + 1,
              "Mode switch must not clip outside the viewport: " + engineName + " " + locale + "/" + width);
            assert.ok(bounds.scrollWidth <= bounds.viewport + 1,
              "No horizontal overflow: " + engineName + " " + locale + "/" + width);
            assert.ok(bounds.buttons.every(item => item.height >= (width <= 760 ? 44 : 40)),
              "Both mode choices must retain comfortable touch targets");
            if (width <= 760) {
              assert.ok(bounds.buttons[1].top >= bounds.buttons[0].bottom,
                "Mode buttons stack vertically at phone widths");
            } else {
              assert.ok(bounds.buttons[1].left >= bounds.buttons[0].right,
                "Mode buttons sit horizontally on desktop");
            }

            if (engineName === "chromium" && locale === "en" && [320, 390].includes(width)) {
              await finder.screenshot({
                path: "artifacts/public-services-production/services-mode-en-" + width + ".png",
                animations: "disabled",
              });
            }

            const showcase = page.locator("[data-services-showcase-hero]");
            await showcase.locator('[data-services-kind="business"]').click();
            await expect(showcase.locator('[data-services-kind="business"]')).toHaveAttribute("aria-pressed", "true");
            await expect(page.locator('[data-services-studio-paid] [data-services-studio-card]:visible')).toHaveCount(1);
            await inPerson.click();
            await expect(inPerson).toHaveAttribute("aria-pressed", "true");
            await expect(online).toHaveAttribute("aria-pressed", "false");
            await expect(page.locator("[data-services-studio-free]")).toBeHidden();
            await expect(page.locator('[data-services-studio-card="business"]')).toBeVisible();

            // Reiki has online sessions only. Category choice must reset the
            // format, and a forced in-person choice must have an escape route.
            await showcase.locator('[data-services-kind="reiki"]').click();
            await expect(online).toHaveAttribute("aria-pressed", "true");
            await expect(page.locator('[data-services-studio-card="remote-energy-support"]')).toBeVisible();
            await inPerson.click();
            await expect(showcase.locator("[data-services-empty]")).toBeVisible();
            await expect(page.locator("[data-services-studio-paid]")).toBeHidden();
            await showcase.locator("[data-services-empty] button").click();
            await expect(online).toHaveAttribute("aria-pressed", "true");
            await expect(page.locator('[data-services-studio-card="remote-energy-support"]')).toBeVisible();
            await page.evaluate(() => window.scrollTo(0, 0));
            passed++;
          } finally {
            await page.close();
          }
        }
      }
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

console.log("PASS service-format toggle browser E2E: " + passed +
  " Chromium/WebKit EN/RU/ES runs on 320/390/430/1188px; no enquiries submitted");