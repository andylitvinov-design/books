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
  en: "Leave your contact to enquire or join",
  ru: "Оставьте контакт, чтобы записаться или узнать подробности",
  es: "Deja tus datos para consultar o inscribirte",
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
  const withName = submissions.length % 3 === 0;
  const usePhone = submissions.length % 3 === 1;
  const googleButton = form.locator('button[type="button"]').filter({hasText:/Google/i});
  if (locale === "en") {
    assert.equal(await googleButton.count(),1,"Optional Google must be available");
    assert.equal(await googleButton.first().isDisabled(),false);
  }
  if (usePhone) {
    await form.getByRole('group').locator('button').nth(1).click();
    await form.locator('input[type="tel"]').fill("4165550123");
  } else await form.locator('input[autocomplete="email"]').fill("qa-browser@example.test");
  if (withName) {
    // Name is an explicit opt-in field, hidden until requested.
    await form.locator('details:has(input[autocomplete="name"]) > summary').click();
    await form.locator('input[autocomplete="name"]').fill("QA Visitor");
  }
  // Alternate private note / no-note requests without expanding optional name.
  const privateNote = "PRIVATE_QA_NOTE_NOT_FOR_MESSENGER";
  const hasNote = submissions.length % 2 === 0;
  if (hasNote) {
    await form.locator('details:has(textarea) > summary').click();
    await form.locator('textarea').fill(privateNote);
  }
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
  assert.equal(request.contact.displayName,withName?"QA Visitor":"");
  assert.equal(request.contact.email,usePhone?"":"qa-browser@example.test");
  assert.equal(request.contact.phone,usePhone?"+14165550123":"");
  assert.deepEqual(Object.keys(request.contact).sort(),["displayName","email","phone"]);
  assert.ok(request.operationId && /^[a-f0-9-]{36}$/i.test(request.operationId));
  assert.ok(request.sourcePath && request.sourcePath.startsWith("/"+locale+"/"));
  assert.ok(request.serviceTitle);
  assert.equal(request.description,hasNote?"PRIVATE_QA_NOTE_NOT_FOR_MESSENGER":"");
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
  assert.doesNotMatch(waDraft,/PRIVATE_QA_NOTE_NOT_FOR_MESSENGER/,"Never put visitor notes in external messenger URL");
  const viewportWidth = page.viewportSize().width;
  for (const channel of [wa,tg]) {
    await channel.scrollIntoViewIfNeeded();
    const b=await channel.boundingBox();
    assert.ok(b && b.width >= 100 && b.height >= 44, "Usable messenger tap target at " + name + ": " + JSON.stringify(b));
    assert.ok(b.x >= -1 && b.x + b.width <= viewportWidth + 1, "Messenger choice fits screen");
    // Playwright trial click checks real hit testing, performs its own scroll
    // and never follows an external messenger URL. A fixed mobile tab bar
    // must not intercept the control when a user tries to tap it.
    const marker=await channel.getAttribute("data-contact-channel");
    try {
      await channel.click({trial:true,timeout:8000});
    } catch (error) {
      const obstruction=await page.evaluate(({marker,panelId})=>{
        const anchor=document.getElementById(panelId)?.querySelector('a[data-contact-channel="' + marker + '"]');
        const rect=anchor?.getBoundingClientRect();
        const atop=rect&&document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
        return {
          control:rect?{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right}:null,
          covering:atop?.tagName||null,
          coveringClass:typeof atop?.className==='string'?atop.className.slice(0,90):'',
          viewport:{width:innerWidth,height:innerHeight,scrollY:scrollY},
        };
      },{marker,panelId});
      throw new Error("Messenger choice not tappable: "+name+" / "+marker+" "+
        JSON.stringify(obstruction)+" / "+error.message);
    }
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
          // The Spanish DAO route still uses CoreServiceDetail with the same
          // privacy-gated ContactChannelChooser. EN/RU now use FreeEntryLanding.
          const daoSelector = locale === "es"
            ? 'main[data-core-service-detail="dao"] [data-contact-channel-chooser]'
            : 'main[data-free-entry-landing="dao"] [data-free-resource-enquiry="dao"] [data-contact-channel-chooser]';
          cases.push({path:"/"+locale+"/services/dao-health-profile",selector:daoSelector,min:1});
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
