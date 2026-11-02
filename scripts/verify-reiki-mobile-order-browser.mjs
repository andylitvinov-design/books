// Loopback-only WebKit regression for the exact iPhone Reiki order modal.
// No real login, customer lead, messaging or payment provider is contacted.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Reiki modal QA must use an isolated loopback server");
await mkdir("artifacts/reiki-mobile-order", { recursive: true });
const master = {
  serviceId: "43b527d8-7692-44b1-bb58-36b9cb1a0583",
  slug: "andy-litvinov", name: "Andy", title: "Reiki Master",
  photo: "/images/holistic-house/andy-about.png", description: "Published personal Reiki support",
  bio: "Published practitioner", methods: ["Tantra Reiki"],
  priceOptions: [{ duration: 30, price: 50 }, { duration: 60, price: 100 }],
  currency: "EUR", languages: ["en", "ru"], reviewCount: 0, reviewAverage: 0,
};

const browser = await webkit.launch({ headless: true });
try {
  for (const [locale, width] of [["en",320],["ru",390],["es",430]]) {
    const ctx = await browser.newContext({
      viewport: { width, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block",
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    const errors = [], requests = [], path = "/" + locale + "/holistic-support/mobile";
    page.on("pageerror", e => errors.push(e.message));
    await ctx.route("**/*", route => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (url.origin !== origin) return route.abort("blockedbyclient");
      if (url.pathname === "/api/public/remote-energy-support-masters" && method === "GET")
        return route.fulfill({ status: 200, contentType:"application/json", body: JSON.stringify({ masters: [master] }) });
      if (url.pathname === "/api/app/auth/contact-profile" && method === "GET")
        return route.fulfill({status: 401, contentType: "application/json", body:'{"error":"SIGNED_OUT"}'});
      if (url.pathname === "/api/service-enquiries" && method === "POST") {
        requests.push(route.request().postDataJSON());
        return route.fulfill({ status: 201, contentType:"application/json",
          body: JSON.stringify({saved:true,referenceCode:"HH-A1B2C3D4E5F6"}) });
      }
      if (url.pathname.startsWith("/api/")) return route.fulfill({status:401,body:"{}"});
      if (!["GET","HEAD"].includes(method)) return route.abort("blockedbyclient");
      return route.continue();
    });
    try {
      const response = await page.goto(origin + path, {waitUntil:"domcontentloaded",timeout:60000});
      assert.equal(response?.status(),200,locale+": first party route HTTP");
      await page.locator('[data-support-tool="healing"]').click();
      const gallery = page.locator('[data-support-master-viewer][data-support-directory-kind="healing"]');
      await gallery.locator("[data-support-master-request]").waitFor();
      await gallery.locator("[data-support-master-request]").click();
      const dialog = page.locator('dialog[open][aria-labelledby="support-master-order-title"]');
      await dialog.waitFor();
      const focus = dialog.locator("[data-remote-focus-chip]").first();
      // The iPhone screenshot starts at "Available masters": its optional
      // first-screen focus can be entirely offscreen. RU must order without it.
      if (locale !== "ru") await focus.click();
      await dialog.locator("#remote-method").selectOption({label:"Tantra Reiki"});
      // A contact enquiry is valid even without date or time. For a chosen
      // time, both fields must be present and the preference must be future.
      if (locale === "en" || locale === "ru") {
        const date = await page.evaluate(() => {
          const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
          return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
        });
        await dialog.locator("#remote-date").fill(date);
        if (locale === "en") await dialog.locator("#remote-time").fill("15:00");
      }
      if (locale === "ru") {
        await dialog.locator('button[type="submit"]').last().click();
        await dialog.getByText("Выберите и дату, и время или оставьте оба поля пустыми.").waitFor();
        await dialog.locator("#remote-date").fill("");
      }
      await dialog.locator('button[type="submit"]').last().click();
      const contact = dialog.locator("[data-remote-public-order-contact]");
      await contact.waitFor({state:"visible"});
      assert.equal(new URL(page.url()).pathname,path,locale+": stays on public route, no client-side cabinet jump");
      assert.equal(await contact.locator('[data-contact-channel-chooser]').count(),1,locale+": shared consent form");
      assert.equal(await contact.getByRole('button',{name:/Google/i}).count(),1,locale+": Google option");
      assert.equal(await contact.locator('input[type="tel"]').count(),1,locale+": phone option");
      assert.equal(await contact.locator('input[type="checkbox"][required]').count(),1);
      assert.equal(await contact.locator('button[type="submit"]').isDisabled(),true,locale+": opt-in required");

      // Synthetic OAuth return: public scheduling metadata only. Never log in.
      await page.evaluate(([p, service]) => window.sessionStorage.setItem("hh-google-enquiry-return",
        JSON.stringify({path:p,service,panel:"synthetic-panel"})),
        [path,"Reiki support · Andy · 30 min"]);
      await page.goto(origin + path + "?hh_enquiry=google", {waitUntil:"domcontentloaded"});
      const resumed = page.locator('dialog[open] [data-remote-public-order-contact]');
      await resumed.waitFor({state:"visible",timeout:30000});
      assert.equal(new URL(page.url()).pathname,path,locale+": resumes same public modal");
      assert.equal(await resumed.locator('button[type="submit"]').isDisabled(),true);
      await resumed.locator('input[type="tel"]').fill("416 555 1234");
      await resumed.locator('input[type="checkbox"][required]').check();
      await resumed.locator('button[type="submit"]').click();
      await resumed.getByText("HH-A1B2C3D4E5F6").waitFor();
      assert.equal(requests.length,1,locale+": exactly one consented synthetic CRM request");
      assert.equal(requests[0].sourcePath,path);
      assert.equal(requests[0].contactConsent,true);
      assert.equal(requests[0].contact.phone,"+14165551234");
      assert.match(requests[0].serviceTitle,/Reiki support · Andy · 30 min/);
      assert.match(requests[0].description,/Tantra Reiki/);
      if (locale === "ru") assert.match(requests[0].description,/Personal intention/,
        "No offscreen focus choice is required to request a Reiki session");
      if (locale !== "en") assert.match(requests[0].description,/По согласованию|Por acordar/,
        locale+": no fabricated date/time for an unscheduled enquiry");
      assert.equal(await page.locator("[data-cart-verified-paypal-checkout]").count(),0);
      assert.deepEqual(errors,[],locale+": no uncaught JS errors");
      if (locale==="ru") await page.screenshot({
        path:"artifacts/reiki-mobile-order/ru-390-success.png",fullPage:false,timeout:12000,
      });
      console.log("PASS "+locale+" / "+width+" WebKit Reiki modal → phone/Google → simulated CRM receipt");
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); }
