/**
 * Browser acceptance for public Reiki referral landing and its real course CTA.
 * Local guest-only browser: no production account, uploads or external messages.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";

const origin = process.env.HH_TEST_APP_ORIGIN || "http://127.0.0.1:3100";
assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):[0-9]+$/, "Use loopback only");
const engine = process.env.HH_TEST_BROWSER === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch();
const output = "artifacts/reiki-referral";
await mkdir(output, { recursive: true });

try {
  const cases = [
    { locale: "en", width: 320, height: 700 },
    { locale: "ru", width: 390, height: 844 },
    { locale: "es", width: 390, height: 844 },
    { locale: "en", width: 1280, height: 820 },
    { locale: "ru", width: 320, height: 700 },
    { locale: "es", width: 1280, height: 820 },
  ];
  for (const { locale, width, height } of cases) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(origin + "/" + locale + "/academy/reiki/free-practitioner-course",
      { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.equal(response?.status(), 200, locale + "/" + width + ": public HTTP status");
    const root = page.locator("[data-reiki-referral-landing]");
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute("data-locale", locale);
    await expect(root.locator("h1")).toHaveCount(1);
    const heroCta = page.locator('[data-reiki-cta="hero"]');
    const footerCta = page.locator('[data-reiki-cta="footer"]');
    await expect(heroCta).toBeVisible();
    await expect(footerCta).toHaveCount(1);
    // All public Reiki landings deliberately open the single approved EN course URL.
    const targetLocale = "en";
    const expectedHref = "/" + targetLocale + "/academy/principles-of-energywork/learn";
    await expect(heroCta).toHaveAttribute("href", expectedHref);
    await expect(footerCta).toHaveAttribute("href", expectedHref);
    const photo = root.locator('img[src*="reiki-practitioner-sunrise.webp"]');
    await expect(photo).toHaveCount(1);
    await expect(photo).toHaveJSProperty("complete", true);
    assert.ok(await photo.evaluate(img => img.naturalWidth > 0), locale + "/" + width + ": sunrise photo loaded");
    const teacher = root.locator('img[src*="andy-about.png"]');
    assert.ok(await teacher.count(), locale + "/" + width + ": real teacher portrait present");
    const geometry = await page.evaluate(() => {
      const root = document.querySelector("[data-reiki-referral-landing]");
      const photo = root.querySelector('img[src*="reiki-practitioner-sunrise.webp"]');
      const cta = root.querySelector('[data-reiki-cta="hero"]');
      const picture = photo.getBoundingClientRect();
      const button = cta.getBoundingClientRect();
      return {
        width: innerWidth, height: innerHeight,
        documentOverflow: document.documentElement.scrollWidth - innerWidth,
        pictureTop: picture.top, pictureBottom: picture.bottom,
        ctaTop: button.top, ctaBottom: button.bottom, ctaWidth: button.width,
      };
    });
    assert.ok(geometry.documentOverflow <= 3,
      locale + "/" + width + ": horizontal overflow " + JSON.stringify(geometry));
    assert.ok(geometry.ctaWidth >= (width < 700 ? 235 : 220),
      locale + "/" + width + ": accessible full-size CTA");
    if (width <= 390) {
      assert.ok(geometry.pictureTop < geometry.ctaTop, locale + "/" + width + ": image precedes CTA");
      assert.ok(geometry.pictureBottom < geometry.ctaTop, locale + "/" + width + ": photo before CTA");
      assert.ok(geometry.ctaBottom <= height + 5,
        locale + "/" + width + ": CTA above phone fold; " + JSON.stringify(geometry));
    }

    const faq = root.locator('section[aria-labelledby="reiki-referral-faq"] details').first();
    await expect(faq).not.toHaveAttribute("open", "");
    await faq.locator("summary").click();
    await expect(faq).toHaveAttribute("open", "");
    await page.screenshot({ path: output + "/" + engine + "-" + locale + "-" + width + ".png", fullPage: true });

    if ((locale === "en" && width === 320) || (locale === "ru" && width === 390) ||
        (locale === "es" && width === 390)) {
      await heroCta.click();
      await page.waitForURL(new RegExp("/" + targetLocale + "/academy/principles-of-energywork/learn$"), { timeout: 35000 });
      await expect(page.locator('[data-energywork-slide-id="welcome-01"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-energywork-slide-kind="welcome"]')).toBeVisible();
      await expect(page.locator('button[data-energywork-next]')).toHaveCount(1);
      await page.screenshot({ path: output + "/" + engine + "-" + locale + "-" + width + "-welcome.png", fullPage: true });
    }
    assert.deepEqual(errors, [], locale + "/" + width + ": no unhandled JS errors");
    console.log(JSON.stringify({ engine, locale, width, status: "passed", geometry }));
    await page.close();
  }

  // The ordinary course URL retains the original welcome for users outside the campaign.
  const regularPage = await browser.newPage();
  await regularPage.goto(origin + "/en/academy/principles-of-energywork/learn", { waitUntil: "domcontentloaded" });
  await expect(regularPage.locator('[data-energywork-slide-id="welcome-01"]')).toBeVisible();
  await regularPage.close();
} finally {
  await browser.close();
}
