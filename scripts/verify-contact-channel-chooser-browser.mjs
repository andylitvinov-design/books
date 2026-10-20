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
  en: "Where would you like to send your request?",
  ru: "Куда отправить вашу заявку?",
  es: "¿Dónde quieres enviar tu solicitud?",
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

async function verifyChooser(page, chooser, locale, name, screenshot) {
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
  await trigger.click();
  await panel.waitFor({ state:"visible", timeout:10000 });
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert.equal(page.url(), startUrl, "Order first click must stay on this page");
  assert.equal((await panel.locator("p").first().innerText()).trim(), questions[locale]);
  const wa = panel.locator('a[data-contact-channel="whatsapp"]');
  const tg = panel.locator('a[data-contact-channel="telegram"]');
  assert.equal(await wa.count(), 1);
  assert.equal(await tg.count(), 1);
  const [waHref,tgHref] = await Promise.all([wa.getAttribute("href"),tg.getAttribute("href")]);
  const waDraft = draft(waHref, "wa.me", "/14376066502");
  const tgDraft = draft(tgHref, "t.me", "/AndyTherapist");
  assert.equal(waDraft, tgDraft, "Both channels must retain the same selected request");
  assert.ok(waDraft.includes("Holistic House") && /Service|Услуга|Servicio/.test(waDraft));
  const boxes = await Promise.all([wa.boundingBox(),tg.boundingBox()]);
  const viewportWidth = page.viewportSize().width;
  for (const b of boxes) {
    assert.ok(b && b.width >= 100 && b.height >= 44, "Usable messenger tap target at " + name + ": " + JSON.stringify(b));
    assert.ok(b.x >= -1 && b.x + b.width <= viewportWidth + 1, "Messenger choice fits screen");
    // Scroll after React's effect and CSS visibility update settle. A link can be
    // temporarily below the fold during opening even though scrolling succeeds.
    await page.waitForFunction(({channel,panelId}) => {
      const anchor = document.getElementById(panelId)?.querySelector('a[data-contact-channel="' + channel + '"]');
      if (!anchor) return false;
      const r = anchor.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) return false;
      const target = document.elementFromPoint(r.left + r.width / 2, r.bottom - 6);
      return Boolean(target?.closest('a[data-contact-channel="' + channel + '"]'));
    }, {channel: b === boxes[0] ? "whatsapp" : "telegram",panelId}, {timeout: 5000}).catch(async error => {
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
  results.push({name,locale,viewportWidth,channels:["WhatsApp","Telegram"],matchingDrafts:true,keyboardClose:true,nonNavigating:true});
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
              await verifyChooser(page,items.nth(i),locale,[name,locale,width,slug(item.path),i].join("-"),width===390);
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
            await verifyChooser(page,templeChooser,"en","chromium-en-390-temple-personal",true);
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
