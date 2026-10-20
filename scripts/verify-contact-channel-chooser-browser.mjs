// Loopback UI fixtures only: no real enquiry saves, messenger sends or client records.
// Test the real hydrated save gate and prepared links on local Next production server.
import assert from "node:assert/strict";
import { exercisePublicEnquiryUi } from "./helpers/public-enquiry-ui-verifier.mjs";
import { installPublicUiNetworkGuard } from "./helpers/public-ui-network-guard.mjs";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

if (process.argv.includes("--live")) throw new Error("Save-gated UI fixtures never run against a live site");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Only isolated loopback UI verification is permitted");
if (process.env.HH_PUBLIC_QA_ENQUIRY_FIXTURE !== "1") throw new Error("Explicit HH_PUBLIC_QA_ENQUIRY_FIXTURE=1 is required; real saves are not permitted");
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const { expect } = require((process.env.HH_PLAYWRIGHT_PACKAGE || "playwright") + "/test");
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

async function verifyChooser(page, chooser, locale, kind, name, screenshot, requiredMessage = []) {
  const trigger = chooser.locator("button[data-contact-order]");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.waitFor({ state:"visible" });
  assert.equal(await trigger.getAttribute("type"), "button");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  const panelId = await trigger.getAttribute("aria-controls");
  assert.ok(panelId, "Panel ID");
  const panel = chooser.locator('[id="' + panelId + '"]');
  assert.equal(await panel.count(), 1);
  assert.equal(await panel.isVisible(), false, "The miniature form must start closed");
  const startUrl = page.url();
  const ctaRect = await trigger.boundingBox();
  assert.ok(ctaRect && ctaRect.width >= 150 && ctaRect.height >= 44, "Large, accessible order button " + name + ": " + JSON.stringify(ctaRect));
  await expect(panel.locator("p").first()).toHaveText(questions[locale]);
  await exercisePublicEnquiryUi(page, chooser, expect, { locale, kind, scopeIsChooser: true, requiredMessage });
  await panel.waitFor({ state:"visible", timeout:10000 });
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert.equal(page.url(), startUrl, "Order first click must stay on this page");
  const wa = panel.locator('a[data-contact-channel="whatsapp"]');
  const tg = panel.locator('a[data-contact-channel="telegram"]');
  assert.equal(await wa.count(), 1);
  assert.equal(await tg.count(), 1);
  const [waHref,tgHref] = await Promise.all([wa.getAttribute("href"),tg.getAttribute("href")]);
  const waDraft = draft(waHref, "wa.me", "/14376066502");
  const tgDraft = draft(tgHref, "t.me", "/AndyTherapist");
  assert.equal(waDraft, tgDraft, "Both channels must retain the same selected request");
  assert.ok(waDraft.includes("Holistic House") && /Service|Услуга|Servicio/.test(waDraft));
  const viewportWidth = page.viewportSize().width;
  for (const [channel, link] of [["whatsapp", wa], ["telegram", tg]]) {
    await link.scrollIntoViewIfNeeded();
    const b = await link.boundingBox();
    assert.ok(b && b.width >= 100 && b.height >= 44, "Usable messenger tap target at " + name + ": " + JSON.stringify(b));
    assert.ok(b.x >= -1 && b.x + b.width <= viewportWidth + 1, "Messenger choice fits screen");
    // Check hit targets after explicit scrolling and React/CSS visibility updates.
    // Each channel must remain reachable above the mobile navigation.
    await page.waitForFunction(({channel,panelId}) => {
      const anchor = document.getElementById(panelId)?.querySelector('a[data-contact-channel="' + channel + '"]');
      if (!anchor) return false;
      const r = anchor.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) return false;
      const target = document.elementFromPoint(r.left + r.width / 2, r.bottom - 6);
      return Boolean(target?.closest('a[data-contact-channel="' + channel + '"]'));
    }, {channel,panelId}, {timeout: 5000}).catch(async error => {
      const diagnostic = await page.evaluate(() => ({
        nav: document.querySelector('.mobile-bottom-navigation')?.getBoundingClientRect().toJSON(),
        open: document.querySelector('[data-contact-order][aria-expanded="true"]')?.outerHTML.slice(0,250),
        viewport: {height:innerHeight,width:innerWidth,scrollY},
      }));
      throw new Error("Messenger channel obstructed: " + name + " " + JSON.stringify(diagnostic) + ": " + error.message);
    });
  }
  const dimensions = await page.evaluate(() => ({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll <= dimensions.inner + 2, "No mobile horizontal overflow: " + JSON.stringify(dimensions));
  if (screenshot) await chooser.screenshot({ path:output + "/" + slug(name) + ".png", animations:"disabled" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await panel.waitFor({state:"hidden",timeout:8000});
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  results.push({name,locale,viewportWidth,channels:["WhatsApp","Telegram"],matchingDrafts:true,keyboardClose:true,nonNavigating:true,mockedSave:true,backendPersistenceVerified:false,messengerLinksOpened:false});
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
        const networkGuard = await installPublicUiNetworkGuard(context, origin);
        const page = await context.newPage();
        page.on("pageerror",e=>errors.push({name,width,locale,message:e.message}));
        try {
          const cases = [
            {path:"/"+locale+"/academy/reiki/tantra-reiki/free-initiation",kind:"tantra-initiation",selector:'[data-tantra-whatsapp-capture] [data-contact-channel-chooser]',min:5},
            {path:"/"+locale+"/academy/reiki/yggdrasil/free-initiation",kind:"yggdrasil-initiation",selector:'[data-yggdrasil-form] [data-contact-channel-chooser]',min:1},
            {path:"/"+locale+"/academy",kind:"academy-tantra",selector:'[data-academy-course-capture] [data-contact-channel-chooser]',min:1},
          ];
          cases.push({path:"/"+locale+"/services/dao-health-profile",kind:"dao",selector:'main[data-free-entry-landing="dao"] [data-free-resource-enquiry="dao"] [data-contact-channel-chooser]',min:1});
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
              await verifyChooser(page,items.nth(i),locale,item.kind,[name,locale,width,slug(item.path),i].join("-"),width===390);
            }
            if (item.path.endsWith("/yggdrasil/free-initiation")) {
              const form = page.locator("[data-yggdrasil-form]");
              const personal = form.locator('button[data-intent="personal"]');
              await personal.click();
              assert.equal(await personal.getAttribute("aria-pressed"),"true");
              const chooser = form.locator("[data-contact-channel-chooser]");
              await verifyChooser(page,chooser,locale,"yggdrasil-initiation",[name,locale,width,"yggdrasil-personal"].join("-"),false,
                [locale === "ru" ? "ЛИЧНУЮ" : "PERSONAL", "€100", "60"]);
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
            await verifyChooser(page,templeChooser,"en","temple-initiation","chromium-en-390-temple-personal",true,["Greek","Aphrodite","Meditation–initiation"]);
            assert.equal(await templeChooser.locator('a[data-contact-channel="whatsapp"]').count(),1);
          }
          networkGuard.assertNoUnexpectedRequests();
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
  await writeFile(output+"/results.json",JSON.stringify({origin,acceptanceScope:"loopback UI fixtures only",backendPersistenceVerified:false,checkedAt:new Date().toISOString(),results,errors,failure:failure?.message||null},null,2));
}
if(failure)throw failure;
console.log("PASS browser save-gated UI fixtures on Chromium and WebKit; no persistence or messenger delivery verified",results.length);
