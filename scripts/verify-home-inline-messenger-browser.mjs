// Browser QA against a local production build only.
// API replies and external messenger navigation are intercepted: zero real contacts or messages.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Messenger QA is restricted to local production Next.js builds");
}
const output = "artifacts/home-inline-messenger";
await mkdir(output, { recursive: true });
const results = [];

async function runOne(engine, locale, width) {
  const browser = await engine.launch({ headless: true });
  const channel = width === 390 ? "telegram" : "whatsapp";
  const errorCase = locale === "en" && width === 390 && engine.name() === "webkit";
  const host = channel === "telegram" ? "t.me" : "wa.me";
  const page = await browser.newPage({
    viewport: { width, height: 844 }, isMobile: true, hasTouch: true,
    deviceScaleFactor: 1, reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const submissions = [];
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("**/api/service-enquiries", async route => {
    const req = route.request();
    assert.equal(req.method(), "POST", "Only intentional form POST is allowed");
    submissions.push(JSON.parse(req.postData() || "{}"));
    await route.fulfill({
      status: errorCase ? 503 : 201,
      contentType: "application/json",
      body: JSON.stringify(errorCase
        ? { error: "CRM_UNAVAILABLE" }
        : { saved: true, referenceCode: "HH-CA5016DE79E4" }),
    });
  });
  // The test never contacts or opens real WhatsApp/Telegram servers or apps.
  await page.route(/^https:\/\/(?:wa\.me|t\.me)\//, async route => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<main>QA external handoff intercepted</main>" });
  });
  try {
    const home = locale === "en" ? "/" : "/" + locale;
    const response = await page.goto(origin + home, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.equal(response?.status(), 200, "Home SSR must load");
    const banner = page.locator("[data-home-free-diagnosis-banner]");
    const openButton = banner.locator("[data-home-diagnosis-order]");
    const request = banner.locator("[data-home-diagnosis-request]");
    await openButton.waitFor({ state: "visible", timeout: 30000 });
    assert.equal(await openButton.getAttribute("aria-expanded"), "false");
    assert.equal(await request.isVisible(), false);
    await openButton.click();
    await request.waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await openButton.getAttribute("aria-expanded"), "true");
    assert.equal(await request.evaluate(node => node.parentElement?.contains(
      node.parentElement.querySelector("[data-home-diagnosis-order]"))), true,
    "Inline chooser belongs to the SAME warm offer card");
    assert.equal(await banner.locator("[data-messenger-lead-capture]").count(), 1);
    assert.equal(await banner.locator("[data-compact-lead-form]").count(), 0,
      "The full separate form is not shown on this homepage card");
    const input = request.locator('input[name="contact"]');
    const whatsapp = request.locator('button[data-messenger-intake="whatsapp"]');
    const telegram = request.locator('button[data-messenger-intake="telegram"]');
    const controls = [whatsapp, telegram];
    assert.equal(await input.isVisible(), true);
    assert.equal(await whatsapp.isVisible(), true);
    assert.equal(await telegram.isVisible(), true);
    for (const button of controls) {
      const box = await button.boundingBox();
      assert.ok(box && box.height >= 44 && box.width >= 80, "Mobile channel target is tap-safe");
      assert.ok(box.x >= -1 && box.x + box.width <= width + 1, "Messenger target fits iPhone");
      await button.click({ trial: true, timeout: 10000 });
    }
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 2,
      "No horizontal overflow when inline capture opens");
    if (engine.name() === "webkit" && width === 390) {
      await banner.screenshot({ path: output + "/" + locale + "-webkit-390.png", animations: "disabled" });
    }
    // The email/phone value is never inferable from an external messenger click.
    const fakeEmail = "qa-home-" + locale + "@example.test";
    await input.fill(fakeEmail);
    const button = request.locator('button[data-messenger-intake="' + channel + '"]');
    const initialUrl = page.url();
    if (errorCase) {
      await button.click();
      await request.getByRole("alert").waitFor({ state: "visible" });
      assert.equal(page.url(), initialUrl, "Failed storage must NOT open an external messenger");
      assert.equal(await request.locator("[data-lead-saved]").count(), 0);
    } else {
      await Promise.all([
        page.waitForURL(url => url.hostname === host, { timeout: 15000 }),
        button.click(),
      ]);
      assert.equal(new URL(page.url()).hostname, host);
      const url = new URL(page.url());
      assert.ok(url.searchParams.get("text")?.includes("HH-CA5016DE79E4"),
        "Only confirmed database receipt is passed to messenger");
      assert.ok(url.searchParams.get("text")?.includes("Free drawing-based situation review"));
      assert.doesNotMatch(page.url(), /qa-home-|example\.test|test_results|patient|\/client\//i);
    }
    assert.equal(submissions.length, 1, "Exactly one API attempt");
    const data = submissions[0];
    assert.equal(data.operationId.length, 36);
    assert.equal(data.sourcePath, "/" + locale + "/services/free-situation-review");
    assert.equal(data.serviceTitle, "Free drawing-based situation review");
    assert.equal(data.locale, locale);
    assert.equal(data.contact.email, fakeEmail);
    assert.equal(data.contact.phone, "");
    assert.equal(data.contactConsent, true);
    assert.equal(data.description, undefined, "Do not send health details to CRM from homepage");
    assert.deepEqual(pageErrors, [], "Client hydration/navigation must not throw");
    results.push({ engine: engine.name(), locale, width, channel, status: errorCase ? "safe-failure" : "mock-save-and-handoff", apiPosts: submissions.length });
  } finally {
    await page.close();
    await browser.close();
  }
}

for (const engine of [chromium, webkit]) {
  for (const locale of ["en", "ru", "es"]) {
    for (const width of [320, 390, 430]) {
      await runOne(engine, locale, width);
    }
  }
}
await writeFile(output + "/results.json", JSON.stringify(results, null, 2));
console.log("Home inline messenger safe-browser journeys:", results.length, "EN/RU/ES × Chromium/WebKit × 320–430px.");
