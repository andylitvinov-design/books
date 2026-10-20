// Public read-only, no outgoing messenger clicks, sends, sign-in, or client records.
// Test the real hydrated two-step capture on local Next production server.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const live = process.argv.includes("--live");
const origin = live ? "https://holistichouse.vercel.app" : (process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100");
if (!live && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Only local loopback QA is allowed outside --live");
const output = "artifacts/contact-channel-browser";
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
const questions = {
  en: "Describe what you would like help with",
  ru: "Расскажите, с чем вам нужна помощь",
  es: "Cuéntanos en qué podemos ayudarte",
};
const slug = value => value.replace(/[^a-z0-9-]+/gi,"-").replace(/^-|-$/g,"").slice(0,90);

function draft(href, host, path) {
  const url = new URL(href || "");
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, host);
  assert.equal(url.pathname, path);
  const message = url.searchParams.get("text");
  assert.ok(message && message.length >= 35, "No bare messenger chat links");
  assert.doesNotMatch(message, /token=|secret=|password=|\/client\/|\/app\/results|private-selector/i);
  return message;
}

/**
 * The public production acceptance job has no database credentials. Intercept
 * the first-party POST, verify its shape, and return a synthetic successful
 * acknowledgement. No real lead is written to production or test Supabase.
 */
async function submitSyntheticForm(page, chooser, locale, submissions) {
  const form=chooser.locator('form');
  await form.waitFor({state:"visible"});
  const button=form.locator('button[type="submit"]');
  assert.equal(await button.isDisabled(),true,"Contact+consent are required");
  await form.locator('input[autocomplete="name"]').fill("QA Visitor");
  await form.locator('input[autocomplete="email"]').fill("qa-browser@example.test");
  await form.locator('textarea').fill("I want to register for this course or service. Please send the next steps.");
  assert.equal(await button.isDisabled(),true,"Consent must not be pre-checked");
  await form.locator('input[type="checkbox"]').check();
  const priorCount=submissions.length;
  await button.click();
  const wa=chooser.locator('a[data-contact-channel="whatsapp"]');
  await wa.waitFor({state:"visible",timeout:10000});
  assert.equal(submissions.length,priorCount+1,"Exactly one first-party registration submitted");
  const request=submissions[submissions.length-1];
  assert.equal(request.locale,locale);
  assert.equal(request.contactConsent,true);
  assert.equal(request.contact.displayName,"QA Visitor");
  assert.equal(request.contact.email,"qa-browser@example.test");
  assert.equal(request.contact.phone,"");
  assert.ok(request.operationId && /^[a-f0-9-]{36}$/i.test(request.operationId));
  assert.ok(request.sourcePath && request.sourcePath.startsWith("/"+locale+"/"));
  assert.ok(request.serviceTitle && request.description.length>=10);
  assert.ok(!request.website);
}

async function verifyChooser(page, chooser, locale, name, screenshot, submissions) {
  const trigger = chooser.locator("button[data-contact-order]");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.waitFor({ state:"visible" });
  assert.equal(await trigger.getAttribute("type"), "button");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  const panelId = await trigger.getAttribute("aria-controls");
  assert.ok(panelId, "Panel ID");
  const panel = chooser.locator('[id="' + panelId + '"]');
  assert.equal(await panel.count(), 1);
  assert.equal(await panel.isVisible(), false, "The registration form must start closed");
  const startUrl = page.url();
  const ctaRect = await trigger.boundingBox();
  assert.ok(ctaRect && ctaRect.width >= 150 && ctaRect.height >= 44, "Large, accessible order button " + name + ": " + JSON.stringify(ctaRect));
  await trigger.click();
  await panel.waitFor({ state:"visible", timeout:10000 });
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert.equal(page.url(), startUrl, "Order first click must stay on this page");
  assert.equal((await panel.locator("p").first().innerText()).trim(), questions[locale]);
  const wa = panel.locator('a[data-contact-channel="whatsapp"]');
  const tg = panel.locator('a[data-contact-channel="telegram"]');
  assert.equal(await wa.count(), 0, "Do not offer messenger before registration is saved");
  assert.equal(await tg.count(), 0, "Do not offer messenger before registration is saved");
  await submitSyntheticForm(page,chooser,locale,submissions);
  assert.equal(await wa.count(), 1);
  assert.equal(await tg.count(), 1);
  const [waHref,tgHref] = await Promise.all([wa.getAttribute("href"),tg.getAttribute("href")]);
  const waDraft = draft(waHref, "wa.me", "/14376066502");
  const tgDraft = draft(tgHref, "t.me", "/AndyTherapist");
  assert.equal(waDraft, tgDraft, "Both channels must retain the same selected request");
  assert.ok(waDraft.includes("Holistic House") && /Service|Услуга|Servicio/.test(waDraft));
  assert.doesNotMatch(waDraft,/qa-browser@example.test|QA Visitor/,"Never leak stored contact in messenger URL");
  assert.match(waDraft,/HH-CA5016DE79E4/,"The optional messenger handoff includes the enquiry reference");
  const viewportWidth = page.viewportSize().width;
  for (const channel of [wa,tg]) {
    await channel.scrollIntoViewIfNeeded();
    const b=await channel.boundingBox();
    assert.ok(b && b.width >= 100 && b.height >= 44, "Usable messenger tap target at " + name + ": " + JSON.stringify(b));
    assert.ok(b.x >= -1 && b.x + b.width <= viewportWidth + 1, "Messenger choice fits screen");
    const marker=await channel.getAttribute("data-contact-channel");
    await page.waitForFunction(({marker,panelId}) => {
      const anchor = document.getElementById(panelId)?.querySelector('a[data-contact-channel="' + marker + '"]');
      if (!anchor) return false;
      const r = anchor.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) return false;
      const target = document.elementFromPoint(r.left + r.width / 2, r.bottom - 6);
      return Boolean(target?.closest('a[data-contact-channel="' + marker + '"]'));
    }, {marker,panelId},{timeout:5000});
  }
  const dimensions = await page.evaluate(() => ({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll <= dimensions.inner + 2, "No mobile horizontal overflow: " + JSON.stringify(dimensions));
  if (screenshot) await chooser.screenshot({ path:output + "/" + slug(name) + ".png", animations:"disabled" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await panel.waitFor({state:"hidden",timeout:8000});
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  results.push({name,locale,viewportWidth,channels:["WhatsApp","Telegram"],matchingDrafts:true,contactSubmitted:true,keyboardClose:true,nonNavigating:true});
}

async function runEngine(name, engine) {
  const browser = await engine.launch({headless:true});
  try {
    for (const width of (name === "webkit" ? [390] : [320,390,1188])) {
      for (const locale of ["en","ru","es"]) {
        const context = await browser.newContext({
          viewport:{width,height:844}, serviceWorkers:"block", reducedMotion:"reduce",
          locale: locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA",
        });
        const page = await context.newPage();
        const submissions=[];
        await page.route("**/api/service-enquiries",async route=>{
          if(route.request().method()!=="POST")return route.continue();
          submissions.push(JSON.parse(route.request().postData()||"{}"));
          await route.fulfill({status:200,contentType:"application/json",
            body:JSON.stringify({saved:true,referenceCode:"HH-CA5016DE79E4"})});
        });
        page.on("pageerror",e=>errors.push({name,width,locale,message:e.message}));
        try {
          const cases = [
            {path:"/"+locale+"/academy/reiki/tantra-reiki/free-initiation",selector:'[data-tantra-whatsapp-capture] [data-contact-channel-chooser]',min:5},
            {path:"/"+locale+"/academy/reiki/yggdrasil/free-initiation",selector:'[data-yggdrasil-form] [data-contact-channel-chooser]',min:1},
            {path:"/"+locale+"/academy",selector:'[data-academy-course-capture] [data-contact-channel-chooser]',min:1},
          ];
          cases.push({path:"/"+locale+"/services/dao-health-profile",selector:'main[data-free-entry-landing="dao"] [data-free-resource-enquiry="dao"] [data-contact-channel-chooser]',min:1});
          for (const item of cases) {
            const response = await page.goto(origin + item.path,{waitUntil:"domcontentloaded",timeout:60000});
            assert.equal(response?.status(),200,name+" "+item.path);
            const items = page.locator(item.selector);
            await items.first().waitFor({state:"visible",timeout:25000});
            await page.waitForLoadState("networkidle",{timeout:20000}).catch(()=>{});
            const count = await items.count();
            assert.ok(count >= item.min, "Missing chooser on "+item.path+", count="+count);
            const indexes = count > 2 ? [0,count-1] : [0];
            for (const i of indexes) {
              await verifyChooser(page,items.nth(i),locale,[name,locale,width,slug(item.path),i].join("-"),width===390,submissions);
            }
            if (item.path.endsWith("/yggdrasil/free-initiation")) {
              const form = page.locator("[data-yggdrasil-form]");
              const personal = form.locator('button[data-intent="personal"]');
              await personal.click();
              assert.equal(await personal.getAttribute("aria-pressed"),"true");
              const chooser = form.locator("[data-contact-channel-chooser]");
              const button = chooser.locator("button[data-contact-order]");
              assert.equal(await button.getAttribute("aria-expanded"),"false");
              await button.click();
              await submitSyntheticForm(page,chooser,locale,submissions);
              const text = new URL(await chooser.locator('a[data-contact-channel="telegram"]').getAttribute("href")).searchParams.get("text");
              assert.match(text || "", /PERSONAL|ЛИЧНУЮ/i, "The new selection must be in the prepared message");
              await button.click();
            }
          }
          if (name === "chromium" && width === 390 && locale === "en") {
            await page.goto(origin + "/en/academy/temple-studies", {waitUntil:"domcontentloaded",timeout:60000});
            const temple = page.locator("[data-temple-initiation-chooser]");
            await temple.locator('[data-temple-step="tradition"] button').first().click();
            await temple.locator('[data-temple-step="deity"] button').first().click();
            await temple.locator('[data-temple-step="initiation"] button').first().click();
            const templeChooser = temple.locator("[data-contact-channel-chooser]");
            await templeChooser.waitFor({state:"visible"});
            await verifyChooser(page,templeChooser,"en","chromium-en-390-temple-personal",true,submissions);
            assert.equal(await templeChooser.locator('a[data-contact-channel="whatsapp"]').count(),1);
          }
        } finally {
          await page.close();
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

let failure = null;
try {
  await runEngine("chromium",chromium);
  await runEngine("webkit",webkit);
  assert.deepEqual(errors,[],"Unexpected browser JS errors");
  assert.ok(results.length >= 30,"Insufficient mobile and desktop coverage");
} catch(e) { failure=e; }
finally {
  await writeFile(output+"/results.json",JSON.stringify({origin,live,checkedAt:new Date().toISOString(),results,errors,failure:failure?.message||null},null,2));
}
if(failure)throw failure;
console.log("PASS browser messenger handoff on Chromium and WebKit",results.length);
