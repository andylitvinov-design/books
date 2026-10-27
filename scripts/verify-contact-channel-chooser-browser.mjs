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
async function submitSyntheticForm(page, chooser, locale, submissions, receiptMode = "in-place") {
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
    // A previous browser history/layout state may leave this native <details>
    // expanded. Clicking its summary unconditionally would CLOSE the note,
    // making the textarea non-editable (observed in hosted WebKit acceptance).
    // Preserve a single, real user expansion when the details is closed.
    const note = form.locator('details:has(textarea)');
    assert.equal(await note.count(), 1, "Exactly one optional note field");
    if (!(await note.evaluate(element => element.open))) {
      await note.locator('summary').click();
    }
    assert.equal(await note.evaluate(element => element.open), true,
      "The optional note is expanded before editing");
    await note.locator('textarea').fill(privateNote);
  }
  assert.equal(await button.isDisabled(),true,"Consent must not be pre-checked");
  await form.locator('input[type="checkbox"]').check();
  const priorCount=submissions.length;
  await button.click();
  if (receiptMode === "thank-you") {
    // The standard chooser redirects AFTER the first-party save. Verify the
    // same-session receipt, not a transient link in the unmounted form.
    // Both the intercepted POST and its acknowledgement are synthetic.
    await page.waitForURL(origin + "/" + locale + "/thank-you", { timeout: 12000 });
    await page.locator("[data-service-thank-you]")
      .getByText("HH-CA5016DE79E4", { exact: true })
      .waitFor({ state: "visible", timeout: 12000 });
  } else {
    const wa = chooser.locator('a[data-contact-channel="whatsapp"]');
    await wa.waitFor({ state: "visible", timeout: 10000 });
  }
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

async function verifyChooser(page, chooser, locale, name, screenshot, submissions, receiptMode = "in-place") {
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
  await submitSyntheticForm(page,chooser,locale,submissions,receiptMode);
  if (receiptMode === "thank-you") {
    assert.equal(new URL(page.url()).pathname, "/" + locale + "/thank-you",
      "Standard chooser navigates only after a saved first-party enquiry");
    if (screenshot) await page.locator("[data-service-thank-you]")
      .screenshot({ path: output + "/" + slug(name) + ".png", animations: "disabled" });
    results.push({ name, locale, viewportWidth: page.viewportSize().width,
      contactSubmitted: true, receiptConfirmed: true, redirectedAfterSave: true,
      externalHandoff: false });
    return;
  }
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
            {path:"/"+locale+"/academy/reiki/tantra-reiki/free-initiation",selector:'[data-tantra-whatsapp-capture] [data-contact-channel-chooser]',min:1},
            {path:"/"+locale+"/academy/reiki/yggdrasil/free-initiation",selector:'[data-yggdrasil-form] [data-contact-channel-chooser]',min:1},
            {path:"/"+locale+"/academy",selector:'[data-academy-course-capture] [data-contact-channel-chooser]',min:1},
          ];
          // EN/RU/ES Dao now share one consented first-party CRM landing.
          // None use a parallel messenger chooser; verify them after the loop.
          for (const item of cases) {
            const response = await page.goto(origin + item.path,{waitUntil:"domcontentloaded",timeout:60000});
            assert.equal(response?.status(),200,name+" "+item.path);
            const items = page.locator(item.selector);
            await items.first().waitFor({state:"visible",timeout:25000});
            await page.waitForLoadState("networkidle",{timeout:20000}).catch(()=>{});
            const count = await items.count();
            assert.ok(count >= item.min, "Missing chooser on "+item.path+", count="+count);
            // Tantra uses the existing always-visible compact-phone CRM form,
            // not the collapsible chooser that has button[data-contact-order].
            // The generic test must run only on routes with that trigger.
            if (!item.path.endsWith("/tantra-reiki/free-initiation")) {
              const indexes = count > 2 ? [0,count-1] : [0];
              for (const i of indexes) {
                await verifyChooser(page,items.nth(i),locale,[name,locale,width,slug(item.path),i].join("-"),width===390,submissions);
              }
            }
            if (item.path.endsWith("/tantra-reiki/free-initiation")) {
              // The five distinct requests use one selectable form, not five
              // separate CRM/messenger choosers. Keep all original intents.
              const capture = page.locator("[data-tantra-whatsapp-capture]");
              assert.equal(count, 1, "Tantra requests reuse one consented chooser");
              const selector = capture.locator("#tantra-request-" + locale);
              const intents = await selector.locator("option").evaluateAll(options =>
                options.map(option => option.value));
              assert.deepEqual(intents, ["free", "personal", "session", "answers", "feedback"],
                "Free and paid Tantra requests remain selectable");
              // This existing compactPhone form is deliberately inline.
              // No order trigger, automatic chat, or external link exists before
              // an acknowledged first-party save. Do not fake a lead here.
              const initialPostCount = submissions.length;
              const chooser = capture.locator("[data-contact-channel-chooser]");
              assert.equal(await chooser.getAttribute("data-compact-phone-trigger"), null,
                "Tantra compact phone intake is already visible");
              assert.equal(await chooser.locator("button[data-contact-order]").count(), 0,
                "Inline compact intake must not be tested as a collapsible chooser");
              const form = chooser.locator("form");
              const channels = form.locator("button[data-contact-channel-submit]");
              assert.equal(await channels.count(), 2, "Two optional messenger handoff actions");
              for (const intent of ["free", "personal", "session", "answers", "feedback"]) {
                await selector.selectOption(intent);
                await form.waitFor({state:"visible",timeout:10000});
                assert.equal(await selector.inputValue(), intent);
                const consent = form.locator('input[type="checkbox"][required]');
                assert.equal(await consent.count(), 1, intent + " requires explicit consent");
                assert.equal(await consent.isChecked(), false,
                  intent + " must not inherit consent from another request");
                assert.equal(await form.locator('input[type="tel"]').count(), 1,
                  intent + " requires phone capture before CRM write");
                assert.equal(await chooser.locator("a[data-contact-channel]").count(), 0,
                  intent + " must not expose messenger links before a saved lead");
                const box = await channels.first().boundingBox();
                assert.ok(box && box.height >= 44 && box.width >= 90,
                  intent + " compact-channel mobile touch target");
                await channels.first().click({trial:true,timeout:8000});
                // Checking consent alone is not a submission. Selecting the next
                // offer remounts the existing chooser and must reset it.
                await consent.check();
              }
              await selector.selectOption("free");
              assert.equal(await form.locator('input[type="checkbox"][required]').isChecked(),
                false, "Returning to free initiation resets previously checked consent");
              assert.equal(submissions.length,initialPostCount,
                "Read-only Tantra intent checks never send a synthetic or real lead");
              results.push({name:[name,locale,width,"tantra-compact"].join("-"),
                locale,viewportWidth:width,channels:["WhatsApp","Telegram"],
                consentReset:true,firstPartySubmission:false,nonNavigating:true});
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
          {
            const daoResponse = await page.goto(origin + "/" + locale + "/services/dao-health-profile",
              {waitUntil:"domcontentloaded",timeout:60000});
            assert.equal(daoResponse?.status(),200,name + " " + locale + " Dao free landing");
            const daoForm = page.locator('main[data-free-entry-landing="dao"] [data-compact-lead-form]');
            await daoForm.waitFor({state:"visible",timeout:25000});
            const consent = daoForm.locator('input[type="checkbox"][required]');
            assert.equal(await consent.count(),1,"Consent is required for the free Dao CRM request");
            assert.equal(await consent.isChecked(),false,"Dao opt-in must start unchecked");
            assert.equal(await page.locator('[data-free-entry-landing="dao"] [data-contact-channel-chooser]').count(),0,
              "Dao uses approved first-party contact capture, not a second messenger funnel");
            // CompactLeadCapture has two type=button channel actions, never a
            // submit button. Both call the same first-party POST before handoff.
            const whatsapp = daoForm.locator('button[data-compact-channel="whatsapp"]');
            const telegram = daoForm.locator('button[data-compact-channel="telegram"]');
            assert.equal(await whatsapp.count(),1,"Dao offers the existing WhatsApp action");
            assert.equal(await telegram.count(),1,"Dao offers the existing Telegram action");
            assert.equal(await whatsapp.getAttribute("type"),"button");
            assert.equal(await daoForm.locator('button[type="submit"]').count(),0,
              "Dao compact intake is channel-driven, not a submit-button form");
            assert.equal(await daoForm.locator('a[data-compact-channel]').count(),0,
              "No external messenger links before a server-acknowledged request");
            // Negative consent path must never reach POST or a messenger.
            // Initial HTML can be interactive-looking before hydration; the
            // contact edit itself can also overlap a navigation/remount.
            // Install the DOM click observer only AFTER the edit, on the
            // actual document in which the user will tap the action.
            const previous = submissions.length;
            await daoForm.locator('input[name="contact"]').fill("qa-browser@example.test");
            await page.waitForFunction(() => {
              const form = document.querySelector('main[data-free-entry-landing="dao"] [data-compact-lead-form]');
              const button = form?.querySelector('button[data-compact-channel="whatsapp"]');
              const contact = form?.querySelector('input[name="contact"]');
              return contact?.value === "qa-browser@example.test" && Boolean(button &&
                Object.keys(button).some(key =>
                  key.startsWith("__reactProps$") && typeof button[key]?.onClick === "function"));
            }, null, {timeout:20000});
            const clickDocumentOrigin = await page.evaluate(() => {
              window.__hhDaoClickEvents = 0;
              // Redacted, passive diagnostics only: never log contact fields,
              // request bodies, texts, or messenger destinations.
              window.__hhDaoButtonAtSetup = document.querySelector('main[data-free-entry-landing="dao"] button[data-compact-channel="whatsapp"]');
              window.__hhDaoInputEvents = {pointerDowns:0, windowClicks:0, documentClicks:0, targetKind:null};
              window.addEventListener("pointerdown", () => {
                window.__hhDaoInputEvents.pointerDowns++;
              }, {capture:true});
              window.addEventListener("click", event => {
                const sample = window.__hhDaoInputEvents;
                sample.windowClicks++;
                sample.targetKind = event.target instanceof Element
                  ? (event.target.closest('button[data-compact-channel="whatsapp"]') ? "dao-whatsapp" : event.target.tagName.toLowerCase())
                  : "non-element";
              }, {capture:true});
              document.addEventListener("click", event => {
                window.__hhDaoInputEvents.documentClicks++;
                if (event.target instanceof Element &&
                    event.target.closest('main[data-free-entry-landing="dao"] button[data-compact-channel="whatsapp"]')) {
                  window.__hhDaoClickEvents++;
                }
              }, {capture:true});
              return performance.timeOrigin;
            });
            // Scroll and hit-test without dispatching an event before the
            // *single* real tap. The previous hosted trace recorded a body
            // click (not a button click) during automatic Playwright scrolling;
            // a missed tap cannot establish a consent-regression verdict.
            // Do not use force, DOM .click(), second taps, or synthetic consent.
            await whatsapp.scrollIntoViewIfNeeded();
            await whatsapp.click({trial:true,timeout:8000});
            // Positive path intercepts POST above and stubs window.open here:
            // no real enquiry, popup, external request, or customer message.
            await whatsapp.click();
            assert.equal(submissions.length,previous,"Contact alone cannot bypass Dao consent");
            const consentError = daoForm.getByRole("alert");
            try {
              await consentError.waitFor({state:"visible",timeout:8000});
            } catch (error) {
              const diagnostic = await page.evaluate((expectedDocumentOrigin) => {
                const form = document.querySelector('main[data-free-entry-landing="dao"] [data-compact-lead-form]');
                const button = form?.querySelector('button[data-compact-channel="whatsapp"]');
                const propsKey = button && Object.keys(button).find(key => key.startsWith("__reactProps$"));
                const contact = form?.querySelector('input[name="contact"]');
                return {
                  domClicks: window.__hhDaoClickEvents ?? 0,
                  inputEvents: window.__hhDaoInputEvents ?? null,
                  documentReplacedSinceTapSetup: performance.timeOrigin !== expectedDocumentOrigin,
                  buttonReplacedSinceTapSetup: button !== window.__hhDaoButtonAtSetup,
                  buttonHitAtCenter: Boolean(button && (() => {
                    const rect=button.getBoundingClientRect();
                    const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
                    return hit===button || button.contains(hit);
                  })()),
                  reactHandlerPresent: Boolean(propsKey && typeof button[propsKey]?.onClick === "function"),
                  formConnected: Boolean(form?.isConnected),
                  buttonDisabled: Boolean(button?.disabled),
                  consentChecked: Boolean(form?.querySelector('input[type="checkbox"][required]')?.checked),
                  contactAriaInvalid: contact?.getAttribute("aria-invalid") ?? null,
                  alertCount: form?.querySelectorAll('[role="alert"]').length ?? 0,
                  readyState: document.readyState,
                };
              }, clickDocumentOrigin);
              throw new Error("Dao negative-consent UI did not render after tap; redacted DOM evidence=" +
                JSON.stringify(diagnostic) + "; cause=" + error.message);
            }
            assert.equal(await consentError.count(),1,"Missing opt-in has an accessible error");
            await consent.check();
            await page.evaluate(() => {
              window.__hhQaHandoffs = [];
              window.open = () => ({
                opener:null, closed:false, close(){},
                location:{replace(destination){window.__hhQaHandoffs.push(destination);}},
              });
            });
            await whatsapp.click();
            await page.locator('main[data-free-entry-landing="dao"] [data-lead-saved]').waitFor({state:"visible",timeout:10000});
            assert.equal(submissions.length,previous+1,"Exactly one synthetic Dao enquiry");
            const enquiry = submissions.at(-1);
            assert.equal(enquiry.locale,locale);
            assert.equal(enquiry.contactConsent,true);
            assert.equal(enquiry.contact.email,"qa-browser@example.test");
            assert.equal(enquiry.sourcePath,"/"+locale+"/services/dao-health-profile");
            assert.ok(/^[a-f0-9-]{36}$/i.test(enquiry.operationId));
            const handoffs = await page.evaluate(() => window.__hhQaHandoffs);
            assert.equal(handoffs.length,1,"One intercepted, non-navigating messenger handoff");
            assert.match(handoffs[0],/^https:\/\/wa\.me\//);
            assert.doesNotMatch(handoffs[0],/qa-browser@example\.test/,"Never leak saved contact in messenger URL");
            assert.equal(await page.locator('[data-free-entry-landing="dao"] a[data-compact-channel]').count(),2,
              "Saved Dao receipt offers both optional channels without another CRM write");
          }
          if (name === "chromium" && width === 390 && locale === "en") {
            await page.goto(origin + "/en/academy/temple-studies", {waitUntil:"domcontentloaded",timeout:60000});
            const temple = page.locator("[data-temple-initiation-chooser]");
            await temple.locator('[data-temple-step="tradition"] button').first().click();
            await temple.locator('[data-temple-step="deity"] button').first().click();
            await temple.locator('[data-temple-step="initiation"] button').first().click();
            const templeChooser = temple.locator("[data-contact-channel-chooser]");
            await templeChooser.waitFor({state:"visible"});
            // Temple uses the default chooser (stayAfterSave=false): the
            // committed request navigates to /thank-you with its HH receipt.
            await verifyChooser(page,templeChooser,"en","chromium-en-390-temple-personal",
              true,submissions,"thank-you");
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


// P0 consultation regression: same-origin hydrated user interaction on this PR
// build, not the older Vercel alias. No sign-in, submitted leads or messages.
const paidRequestLabels = {
  en: ["Request 60-min session · €100", "Request 30-min consultation · €50"],
  ru: ["Заявка на сессию · 60 мин · €100", "Заявка на консультацию · 30 мин · €50"],
  es: ["Solicitar sesión · 60 min · €100", "Solicitar consulta · 30 min · €50"],
};
async function verifyPaidServiceChoices() {
  for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const width of [320, 390, 430]) {
        for (const locale of ["en", "ru", "es"]) {
          const page = await browser.newPage({
            viewport: { width, height: 844 },
            reducedMotion: "reduce",
            serviceWorkers: "block",
          });
          let postedLeads = 0;
          page.on("request", request => {
            if (request.method() === "POST" && request.url().includes("/api/service-enquiries")) postedLeads++;
          });
          const label = [engineName, locale, width, "paid-consultation"].join("-");
          try {
            const response = await page.goto(origin + "/" + locale + "/services/imagery-therapy",
              { waitUntil: "domcontentloaded", timeout: 60000 });
            assert.equal(response?.status(), 200, label + " landing response");
            const capture = page.locator('[data-consultation-capture="service"]');
            await capture.waitFor({ state: "visible", timeout: 30000 });
            const choices = capture.locator('[data-choice-layout="service"] button');
            assert.equal(await choices.count(), 3, label + " preserves two paid and one free choices");
            const chooser = capture.locator("[data-contact-channel-chooser]");
            const trigger = chooser.locator("button[data-contact-order]");
            await trigger.waitFor({ state: "visible", timeout: 15000 });
            const buttonText = async () => (await trigger.innerText()).replace(/\s+/g, " ").trim();
            assert.equal(await buttonText(), paidRequestLabels[locale][0], label + " €100 request label");
            assert.equal(await choices.nth(0).getAttribute("aria-pressed"), "true");
            await choices.nth(1).click();
            assert.equal(await choices.nth(1).getAttribute("aria-pressed"), "true");
            assert.equal(await choices.nth(0).getAttribute("aria-pressed"), "false");
            assert.equal(await buttonText(), paidRequestLabels[locale][1], label + " selected €50 CTA");
            const rect = await trigger.boundingBox();
            assert.ok(rect && rect.height >= 44 && rect.width >= 150, label + " usable mobile CTA");
            await trigger.click({ trial: true }); // Actual hit-testing, without a link or external send.
            assert.equal(await trigger.getAttribute("aria-expanded"), "false");
            await trigger.click();
            const form = chooser.locator("form");
            await form.waitFor({ state: "visible", timeout: 10000 });
            assert.equal(await form.locator('input[type="checkbox"]').isChecked(), false,
              label + " consent must start unchecked");
            assert.equal(await form.locator('button[type="submit"]').isDisabled(), true,
              label + " no submission without contact and consent");
            assert.equal(await chooser.locator('a[data-contact-channel="whatsapp"]').count(), 0,
              label + " no external messenger before saved first-party enquiry");
            // Switching the quoted offer while the form is open must close
            // the previous enquiry, reset consent, and restore the €100 CTA.
            // Check at one mobile width per locale/engine to limit browser cost.
            if (width === 390) {
              await choices.nth(0).click();
              await form.waitFor({ state: "hidden", timeout: 10000 });
              assert.equal(await trigger.getAttribute("aria-expanded"), "false",
                label + " changing tariff closes stale enquiry form");
              assert.equal(await buttonText(), paidRequestLabels[locale][0],
                label + " returned to €100 request");
              await trigger.click();
              await form.waitFor({ state: "visible", timeout: 10000 });
              assert.equal(await form.locator('input[type="checkbox"]').isChecked(), false,
                label + " changed tariff requires fresh consent");
              assert.equal(await form.locator('button[type="submit"]').isDisabled(), true,
                label + " changed tariff cannot reuse an uncommitted submission");
            }
            assert.equal(postedLeads, 0, label + " no request sent during read-only QA");
            const dims = await page.evaluate(() => ({
              inner: window.innerWidth, scroll: document.documentElement.scrollWidth,
            }));
            assert.ok(dims.scroll <= dims.inner + 2, label + " no horizontal overflow " + JSON.stringify(dims));
            results.push({ name: label, locale, viewportWidth: width,
              paidChoiceSwitch: true, consentUnchecked: true, firstPartySubmission: false });
          } finally {
            await page.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
}

let failure = null;
try {
  await verifyPaidServiceChoices();
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
