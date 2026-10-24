// Read-only mobile browser QA: never send messages or create CRM leads.
// Verify the real hydrated Academy CTA against the isolated Next production server.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Academy QA must run against an isolated local server, never a real messenger.");
const output = "artifacts/academy-messenger-order";
await mkdir(output, { recursive: true });
const results = [];
for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch();
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = browserType.name() + ":" + locale + ":" + width;
        const page = await browser.newPage({
          viewport: { width, height: 844 }, deviceScaleFactor: 1,
          isMobile: true, hasTouch: true, reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        try {
          const response = await page.goto(origin + "/" + locale + "/academy/reiki/kundalini-reiki", {
            waitUntil: "domcontentloaded", timeout: 60000,
          });
          assert.equal(response?.status(), 200, label + ": course loads");
          const card = page.locator('[data-sitewide-capture="training"]');
          await card.waitFor({ state: "visible", timeout: 30000 });
          assert.equal(await card.count(), 1, label + ": one footer order card");
          assert.equal(await card.locator("input,textarea,form").count(), 0, label + ": no contact form");
          assert.equal(await card.locator("button").count(), 1, label + ": only one primary Order button");
          assert.equal(await card.locator("img").count(), 1, label + ": teacher photo");
          assert.match(await card.innerText(), /Kundalini Reiki/, label + ": correct programme title");

          const order = card.locator('[data-academy-order-button]');
          await order.scrollIntoViewIfNeeded();
          assert.equal(await order.getAttribute("aria-expanded"), "false", label);
          const id = await order.getAttribute("aria-controls");
          assert.ok(id, label + ": accessible disclosure ID");
          const channels = card.locator("#" + id);
          assert.equal(await channels.isVisible(), false, label + ": channels collapsed");
          let bounds = await card.boundingBox();
          assert.ok(bounds && bounds.width <= width && bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
            label + ": card fits viewport: " + JSON.stringify(bounds));
          const buttonBounds = await order.boundingBox();
          assert.ok(buttonBounds && buttonBounds.height >= 44, label + ": touch target >=44px");
          await order.click();
          assert.equal(await order.getAttribute("aria-expanded"), "true", label);
          assert.equal(await channels.isVisible(), true, label + ": messenger chooser expanded");

          const links = channels.locator("a[data-messenger-channel]");
          assert.equal(await links.count(), 2, label + ": only WhatsApp and Telegram");
          const names = ["whatsapp", "telegram"];
          const hosts = ["wa.me", "t.me"];
          for (let i = 0; i < 2; i++) {
            const link = links.nth(i);
            assert.equal(await link.getAttribute("data-messenger-channel"), names[i], label);
            const target = new URL(await link.getAttribute("href"));
            assert.equal(target.protocol, "https:", label);
            assert.equal(target.hostname, hosts[i], label);
            assert.match(target.searchParams.get("text") || "", /Kundalini Reiki/, label + ": service preserved");
            const message = target.searchParams.get("text") || "";
            assert.ok(message.includes("holistichouse.vercel.app/" + locale + "/academy/reiki/kundalini-reiki"), label);
            assert.doesNotMatch(message, /token=|password|private-selector|\/client\//i, label + ": no private data");
          }
          bounds = await card.boundingBox();
          assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
            label + ": expanded card fits viewport");
          if (browserType === webkit && locale === "en" && width === 390) {
            await card.screenshot({ path: output + "/kundalini-390-webkit.png" });
          }
          await order.click();
          assert.equal(await channels.isVisible(), false, label + ": chooser closes");
          assert.equal(errors.length, 0, label + ": no JS runtime errors: " + errors.join(" | "));
          results.push({ label, checked: true });
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(output + "/result.json", JSON.stringify(results, null, 2));
console.log("Academy messenger CTA mobile browser cases: " + results.length + " passed.");
