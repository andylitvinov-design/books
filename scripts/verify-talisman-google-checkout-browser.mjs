// Real WebKit journey on an isolated loopback build. All CRM, Google identity,
// and payment provider actions are intercepted: no real customer or charge.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Talisman checkout browser QA must be isolated loopback");
await mkdir("artifacts/talisman-google-checkout",{recursive:true});
const report = [];
const run = async (locale, width) => {
  const browser = await webkit.launch({headless:true});
  const ctx = await browser.newContext({
    viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:"block",
    reducedMotion:"reduce",
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  let signedIn = false, priced = false;
  const captured = { enquiries:[], checkouts:[], authStarts:[], ratingReads:[], unexpected:[], external:[] };
  const pageErrors = [];
  page.on("pageerror",e=>pageErrors.push(e.message));
  const fixed = {
    available:true,amountMinor:4500,currency:"EUR",
    items:[{id:"fu-prosperity",title:"Fu · Prosperity & Direction",amountMinor:4500}],
    methods:{paypal:{currency:"EUR",amountMinor:4500}},
  };
  await ctx.route("**/*", route => {
    const req = route.request(), url = new URL(req.url());
    const method = req.method();
    const json = (body,status=200) => route.fulfill({
      status,contentType:"application/json",headers:{"Cache-Control":"no-store"},
      body:JSON.stringify(body),
    });
    if (url.origin !== origin) {
      captured.external.push(req.url());
      return route.abort("blockedbyclient");
    }
    // Public star summaries are read-only catalog data, not a CRM or provider write.
    // Stub them deterministically to keep the price/consent/payment test offline.
    // POST /api/catalog/ratings remains forbidden by the unexpected-API guard.
    if (url.pathname === "/api/catalog/ratings" && method==="GET") {
      const kind = url.searchParams.get("kind");
      const keys = (url.searchParams.get("keys") || "").split(",").filter(Boolean);
      if (!["video","talisman","service"].includes(kind) || !keys.length || keys.length > 40) {
        captured.unexpected.push("INVALID_RATING_READ");
        return json({error:"SYNTHETIC_ONLY"},400);
      }
      captured.ratingReads.push({kind, count:keys.length});
      return json({ratings:Object.fromEntries(keys.map(key => [key,{count:0,average:0,mine:null}]))});
    }
    if (url.pathname === "/api/public/talisman-checkout" && method==="GET")
      return json(priced ? fixed : {available:false,reason:"PRICE_NOT_APPROVED"});
    if (url.pathname === "/api/app/auth/contact-profile" && method==="GET")
      return signedIn
        ? json({email:"test-buyer@example.test",displayName:"Test Buyer"})
        : json({error:"SIGN_IN_REQUIRED"},401);
    if (url.pathname === "/api/app/auth/start" && method==="POST") {
      captured.authStarts.push(req.postDataJSON());
      return json({redirectUrl:"https://accounts.google.com/o/oauth2/v2/auth?state=synthetic"});
    }
    if (url.pathname === "/api/service-enquiries" && method==="POST") {
      captured.enquiries.push(req.postDataJSON());
      return json({saved:true,contactPending:false,referenceCode:"HH-A1B2C3D4E5F6"},201);
    }
    if (url.pathname === "/api/payments/talismans/checkout" && method==="POST") {
      captured.checkouts.push(req.postDataJSON());
      return json({
        referenceCode:"HH-B1B2C3D4E5F6",
        checkoutUrl:"https://paypal.me/psitrends/45EUR",
        currency:"EUR",amountMinor:4500,status:"payment_not_verified",
      });
    }
    if (url.pathname.startsWith("/api/")) {
      captured.unexpected.push(method+" "+url.pathname);
      return json({error:"SYNTHETIC_ONLY"},401);
    }
    if (!["GET","HEAD"].includes(method)) return route.abort("blockedbyclient");
    return route.continue();
  });
  try {
    const path = "/" + locale + "/holistic-support/mobile";
    const response = await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
    assert.equal(response?.status(),200,"Public mobile support route");
    await page.locator('[data-support-tool="talisman"]').click();
    const viewer = page.locator("[data-support-talisman-viewer]");
    await viewer.waitFor({state:"visible"});
    await viewer.locator('[data-support-talisman-thumb="fu-prosperity"]').click();
    await viewer.locator("[data-support-talisman-request]").click();
    const modal = page.locator('dialog[open][aria-labelledby="support-talisman-order-title"]');
    await modal.waitFor({state:"visible"});
    const cart = modal.locator("[data-taoist-talisman-cart]");
    await cart.locator('[data-cart-talisman="fu-prosperity"]').waitFor();
    await cart.locator("[data-talisman-payment-unavailable]").waitFor();
    assert.equal(await cart.locator("[data-talisman-pay-now]").count(),0,
      "No fake Pay button for illustrative Fu with unapproved prices");
    assert.equal(await cart.locator("[data-talisman-manual-rails] summary").count(),1,
      "Wise / Interac / ZEN must be inquiries, not fake charges");
    assert.equal(await cart.locator("[data-talisman-google-start]").count(),1,
      "First option: Google creates or opens existing cabinet");
    assert.equal(await cart.locator("[data-talisman-contact]").count(),1,
      "Guest fallback has just one visible contact field");
    assert.equal(await cart.locator("details").first().getAttribute("open"),null,
      "Additional name and wishes are collapsed");
    await cart.locator("[data-talisman-contact]").fill("visitor@example.test");
    await cart.locator('[data-talisman-reply-consent] input[type="checkbox"]').check();
    await cart.locator("[data-talisman-request-quote]").click();
    await cart.locator("[data-talisman-quote-saved]").waitFor();
    assert.equal(captured.enquiries.length,1);
    assert.equal(captured.enquiries[0].contact.email,"visitor@example.test");
    assert.equal(captured.enquiries[0].contactConsent,true);
    assert.equal(captured.enquiries[0].sourcePath,"/"+locale+"/holistic-support");
    assert.equal(captured.checkouts.length,0,"A quote never triggers a charge");
    assert.deepEqual(pageErrors,[]);

    // Synthetic Google OAuth return: a public path/time marker and published
    // product IDs only. A fresh account is not created in this browser test.
    await page.evaluate(({p}) => {
      window.sessionStorage.setItem("hh:taoist-talisman-google-return:v1",
        JSON.stringify({path:p,createdAt:Date.now()}));
    },{p:path});
    signedIn = true;
    priced = true;
    await page.goto(origin+path+"?hh_enquiry=google",{waitUntil:"domcontentloaded",timeout:60000});
    const resumed = page.locator('dialog[open][aria-labelledby="support-talisman-order-title"]');
    await resumed.waitFor({state:"visible",timeout:25000});
    const purchased = resumed.locator("[data-taoist-talisman-cart]");
    await purchased.locator("[data-talisman-google-ready]").waitFor();
    await purchased.locator('[data-talisman-payment-ready="true"]').waitFor();
    assert.equal(await purchased.locator("[data-talisman-contact]").count(),0,
      "Verified Google email removes repeated contact fields");
    assert.match(await purchased.locator("[data-talisman-google-ready]").innerText(),
      /test-buyer@example\.test/);
    assert.match(await purchased.locator("[data-talisman-total]").innerText(),/45/);
    assert.equal(await purchased.locator('[data-talisman-reply-consent] input[type="checkbox"]').isChecked(),false,
      "Consent is not inferred from Google sign-in");
    await purchased.locator('[data-talisman-reply-consent] input[type="checkbox"]').check();
    const providerRequest = page.waitForRequest(req =>
      req.url() === "https://paypal.me/psitrends/45EUR", {timeout:20000});
    await purchased.locator("[data-talisman-pay-now]").click();
    const sent = await providerRequest;
    assert.equal(sent.url(),"https://paypal.me/psitrends/45EUR");
    assert.equal(captured.checkouts.length,1);
    assert.deepEqual(Object.keys(captured.checkouts[0]).sort(),
      ["items","locale","method","operationId","replyConsent","sourcePath"].sort());
    assert.deepEqual(captured.checkouts[0].items,["fu-prosperity"]);
    assert.equal(captured.checkouts[0].replyConsent,true);
    assert.equal(captured.checkouts[0].locale,locale);
    assert.equal(captured.checkouts[0].sourcePath,path);
    assert.equal(captured.checkouts[0].method,"paypal");
    assert.equal(captured.checkouts[0].totalMinor,undefined);
    assert.equal(captured.checkouts[0].currency,undefined);
    // The browser request event is the reliable proof of attempted provider
    // navigation; the route abort callback can run a tick later in WebKit.
    assert.equal(sent.url(),"https://paypal.me/psitrends/45EUR");
    assert.ok(captured.ratingReads.some(read => read.kind==="talisman"),
      "Published talisman rating summaries are read without a write");
    assert.deepEqual(captured.unexpected,[]);
    if (locale==="ru") await page.screenshot({
      path:"artifacts/talisman-google-checkout/ru-390-google-pay.png",
      fullPage:false,timeout:12000,
    }).catch(()=>{});
    report.push({locale,width,guestQuote:true,googleResume:true,checkoutSynthetic:true});
    console.log("PASS talisman "+locale+"/"+width+" guest → Google → fixed-price provider synthetic");
  } finally { await ctx.close(); await browser.close(); }
};
for (const [locale,width] of [["en",320],["ru",390],["es",430]]) await run(locale,width);
await writeFile("artifacts/talisman-google-checkout/acceptance.json",JSON.stringify(report,null,2));
