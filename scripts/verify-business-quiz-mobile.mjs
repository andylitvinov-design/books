// Public Business direction acceptance against the CURRENT route and consented service flow.
// Real Chromium/WebKit EN/RU/ES at 320-430px. Read-only: no customer/CRM POST or checkout.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error("Business mobile browser QA requires an isolated loopback server");
const output = "artifacts/business-quiz-mobile";
await mkdir(output, { recursive: true });
const wishes = {
  en: "I need a consultation about money",
  ru: "Хочу консультацию про деньги",
  es: "Quiero una consulta sobre dinero",
};
const results = [];

async function verify(engine, locale, width) {
  const browser = await engine.launch({headless:true});
  const label = engine.name() + ":" + locale + ":" + width;
  const context = await browser.newContext({
    viewport:{width,height:844},deviceScaleFactor:1,hasTouch:width<=430,
    reducedMotion:"reduce",serviceWorkers:"block",
  });
  const page = await context.newPage();
  const pageErrors = [], externalPosts = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("request", request => {
    if (!["GET","HEAD"].includes(request.method())) externalPosts.push({
      method:request.method(), path:new URL(request.url()).pathname,
    });
  });
  const noOverflow = async (stage) => {
    const size = await page.evaluate(() => ({
      viewport:document.documentElement.clientWidth,
      content:document.documentElement.scrollWidth,
    }));
    assert.ok(size.content <= size.viewport+2, label+": "+stage+" mobile overflow "+JSON.stringify(size));
  };
  try {
    // The approved Business direction now renders DirectionOffers, not the retired
    // TopicJourneySelector/BusinessConsultationFinder fixture.
    const response = await page.goto(origin+"/"+locale+"/explore/business", {
      waitUntil:"domcontentloaded",timeout:45000,
    });
    assert.equal(response?.status(),200,label+": actual public Business direction HTTP 200");
    const root = page.locator('[data-direction-offers="business"]');
    await root.waitFor({state:"visible",timeout:15000});
    await root.locator("#hh-direction-heading").waitFor({state:"visible",timeout:10000});
    const heroImage = root.locator("[data-direction-hero] img").first();
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-direction-offers="business"] [data-direction-hero] img');
      return !!image && image.complete && image.naturalWidth > 50;
    }, null, {timeout:15000});
    assert.equal(await heroImage.count(),1,label+": real business photo rendered");
    await noOverflow("initial");

    const filters = root.locator("[data-direction-topic-finder] [data-direction-filter]");
    assert.equal(await filters.count(),5,label+": All plus four actual business topics");
    for (const topic of ["decisions","productivity","work-stress","money-beliefs"])
      assert.equal(await root.locator('[data-direction-filter="'+topic+'"]').count(),1,label+": topic "+topic);
    for (const intent of ["test","course","session","advice"])
      assert.equal(await root.locator('[data-direction-intent="'+intent+'"]').count(),1,label+": first step "+intent);
    assert.deepEqual(await root.locator("[data-direction-section]").evaluateAll(nodes =>
      nodes.map(node=>node.getAttribute("data-direction-section"))),
      ["test","course","session"],label+": genuine tests, courses and sessions");
    for (const kind of ["test","course","session"]) {
      assert.equal(await root.locator('[data-offer-action="'+kind+'"]').count(),2,
        label+": two usable compact "+kind+" offers");
    }
    await root.locator('[data-direction-filter="work-stress"]').click();
    assert.equal(await root.locator('[data-direction-filter="work-stress"]').getAttribute("aria-pressed"),"true",
      label+": focus selection reacts");
    await root.locator('[data-direction-show-more="session"]').click();
    assert.equal(await root.locator('[data-offer-action="session"]').count(),4,
      label+": show more reveals four genuine session options");
    await root.locator('[data-direction-show-more="session"]').click();
    assert.equal(await root.locator('[data-offer-action="session"]').count(),2,
      label+": collapse restores compact session choices");
    await root.locator('[data-direction-filter="all"]').click();

    // Text is interpreted only in browser state, never copied to URLs, analytics
    // or CRM. The guide must offer a real paid consultation without booking it.
    await root.locator("#hh-direction-wish").fill(wishes[locale]);
    await root.locator("[data-direction-wish-submit]").click();
    const guide = root.locator('[data-direction-dialogue][data-dialog-topic="money-beliefs"][data-dialog-intent="session"]');
    await guide.waitFor({state:"visible",timeout:12000});
    const suggested = guide.locator('[data-dialog-offer="primary-session"]');
    await suggested.waitFor({state:"visible"});
    assert.equal(new URL(await suggested.getAttribute("href"),origin).pathname,
      "/"+locale+"/services/business-consulting",label+": real approved business session");
    assert.ok(!(await suggested.getAttribute("href")).includes(encodeURIComponent(wishes[locale])),
      label+": private wish absent from referral URL");
    await guide.locator("[data-dialog-close]").click();
    assert.equal(await root.locator("[data-direction-dialogue]").count(),0,label+": guide can close");
    await root.locator('[data-direction-intent="session"]').click();
    assert.deepEqual(await root.locator("[data-direction-section]").evaluateAll(nodes =>
      nodes.map(node=>node.getAttribute("data-direction-section"))),["session"],
      label+": session focus leaves one visible section");
    const session = root.locator('[data-offer-action="session"]').first();
    assert.equal(new URL(await session.getAttribute("href"),origin).pathname,
      "/"+locale+"/services/business-consulting");
    if (engine === webkit && locale === "en" && width === 390)
      await page.screenshot({path:output+"/business-current-direction-390.png",fullPage:false});
    await noOverflow("filtered");
    await session.click();
    await page.waitForURL(url=>url.pathname==="/"+locale+"/services/business-consulting",
      {timeout:25000});
    await page.locator('[data-business-consulting] #business-hero-title').waitFor({state:"visible",timeout:15000});
    assert.equal(await page.locator('[data-business-offer="express"]').count(),1,
      label+": €50 express offer");
    assert.equal(await page.locator('[data-business-offer="full"]').count(),1,
      label+": €100 full offer");
    assert.match(await page.locator('[data-business-offer="express"]').innerText(),/50\s*€/u,
      label+": displayed €50 express price");
    assert.match(await page.locator('[data-business-offer="full"]').innerText(),/100\s*€/u,
      label+": displayed €100 full price");

    // Real first-party request form exists, but no POST is made. Consent must
    // remain unchecked, mandatory and submission blocked before explicit opt-in.
    const enquiry = page.locator("[data-business-website-enquiry]");
    await enquiry.waitFor({state:"visible",timeout:15000});
    assert.equal(await enquiry.locator('input[type="checkbox"][required]').count(),1,
      label+": explicit contact consent");
    assert.equal(await enquiry.locator('input[type="checkbox"][required]').isChecked(),false,
      label+": no implicit consent");
    assert.equal(await enquiry.locator('button[type="submit"]').isDisabled(),true,
      label+": cannot submit without consent");
    await page.locator('[data-business-offer="express"] [data-business-direct-option="express"]').click();
    assert.equal(await enquiry.locator('[data-business-field="format"]').inputValue(),"express",
      label+": actual express SKU preselected on first-party contact form");
    await noOverflow("paid request");
    await page.locator('[data-business-cta="free-hero"]').click();
    await page.waitForURL(url=>url.pathname==="/"+locale+"/services/free-situation-review" &&
      url.searchParams.get("topic")==="business",{timeout:25000});
    assert.deepEqual(externalPosts,[],label+": navigation never sends lead, payment or analytics POST");
    assert.deepEqual(pageErrors,[],label+": no unhandled page errors");
    return label;
  } finally {
    await context.close();
    await browser.close();
  }
}

for (const locale of ["en","ru","es"]) {
  for (const width of [320,375,390,430]) results.push(await verify(webkit,locale,width));
  results.push(await verify(chromium,locale,390));
}
console.log("Current Business direction → consent-gated €50/€100 service browser QA:",results.join(", "));
