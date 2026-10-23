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
  const form = chooser.locator("form");
  await form.waitFor({state:"visible"});
  const button = form.locator('button[type="submit"]');
  assert.equal(await button.isDisabled(), true, "Contact and reply consent are required");
  const withName = submissions.length % 3 === 0;
  const usePhone = submissions.length % 3 === 1;
  const googleButton = form.locator('button[type="button"]').filter({hasText:/Google/i});
  if (locale === "en") {
    assert.equal(await googleButton.count(), 1, "Google option available");
    assert.equal(await googleButton.first().isDisabled(), false);
  }
  if (usePhone) {
    await form.getByRole("group").locator("button").nth(1).click();
    await form.locator('input[type="tel"]').fill("4165550123");
  } else {
    await form.locator('input[autocomplete="email"]').fill("qa-browser@example.test");
  }
  if (withName) {
    await form.locator('details:has(input[autocomplete="name"]) > summary').click();
    await form.locator('input[autocomplete="name"]').fill("QA Visitor");
  }
  const privateNote = "PRIVATE_QA_NOTE_NOT_FOR_MESSENGER";
  const hasNote = submissions.length % 2 === 0;
  if (hasNote) {
    await form.locator('details:has(textarea) > summary').click();
    await form.locator("textarea").fill(privateNote);
  }
  assert.equal(await button.isDisabled(),true,"Consent must not be prechecked");
  await form.locator('input[type="checkbox"][required]').check();
  const priorCount = submissions.length;
  await button.click();
  await page.waitForURL(origin + "/" + locale + "/thank-you",{timeout:15000});
  await page.locator('[data-service-thank-you]').getByText("HH-CA5016DE79E4",{exact:true})
    .waitFor({state:"visible",timeout:15000});
  assert.equal(submissions.length,priorCount+1,"Exactly one first-party request committed");
  const request = submissions[submissions.length-1];
  assert.equal(request.locale,locale);
  assert.equal(request.contactConsent,true);
  assert.equal(request.contact.displayName,withName?"QA Visitor":"");
  assert.equal(request.contact.email,usePhone?"":"qa-browser@example.test");
  assert.equal(request.contact.phone,usePhone?"+14165550123":"");
  assert.deepEqual(Object.keys(request.contact).sort(),["displayName","email","phone"]);
  assert.ok(request.operationId && /^[a-f0-9-]{36}$/i.test(request.operationId));
  assert.ok(request.sourcePath && request.sourcePath.startsWith("/"+locale+"/"));
  assert.ok(request.serviceTitle);
  assert.equal(request.description,hasNote?privateNote:"");
  assert.ok(!request.website);
  return request;
}

async function verifyChooser(page, chooser, locale, name, screenshot, submissions) {
  const trigger = chooser.locator("button[data-contact-order]");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.waitFor({state:"visible"});
  assert.equal(await trigger.getAttribute("type"),"button");
  assert.equal(await trigger.getAttribute("aria-expanded"),"false");
  const panelId = await trigger.getAttribute("aria-controls");
  assert.ok(panelId,"Panel ID");
  const panel = chooser.locator('[id="' + panelId + '"]');
  assert.equal(await panel.count(),1);
  assert.equal(await panel.isVisible(),false);
  const startUrl = page.url();
  const cta = await trigger.boundingBox();
  assert.ok(cta && cta.width>=150 && cta.height>=44,"Accessible order CTA");
  await trigger.click();
  await panel.waitFor({state:"visible",timeout:10000});
  assert.equal(await trigger.getAttribute("aria-expanded"),"true");
  assert.equal(page.url(),startUrl,"Opening must not yet navigate");
  assert.equal((await panel.locator("p").first().innerText()).trim(),questions[locale]);
  assert.equal(await panel.locator('a[data-contact-channel="whatsapp"]').count(),0,"No messenger before save");
  assert.equal(await panel.locator('a[data-contact-channel="telegram"]').count(),0,"No messenger before save");
  await submitSyntheticForm(page,chooser,locale,submissions);
  const receiptPage = page.locator("[data-service-thank-you]");
  const wa = receiptPage.locator('a[data-contact-channel="whatsapp"]');
  const tg = receiptPage.locator('a[data-contact-channel="telegram"]');
  assert.equal(await wa.count(),1);
  assert.equal(await tg.count(),1);
  const [waHref,tgHref] = await Promise.all([wa.getAttribute("href"),tg.getAttribute("href")]);
  const waDraft = draft(waHref,"wa.me","/14376066502");
  const tgDraft = draft(tgHref,"t.me","/AndyTherapist");
  assert.equal(waDraft,tgDraft,"Same privacy-safe follow-up in both channels");
  assert.match(waDraft,/HH-CA5016DE79E4/,"Handoff contains saved enquiry reference");
  assert.ok(waDraft.includes("Holistic House"),"Generic brand identification");
  assert.doesNotMatch(waDraft,/qa-browser@example.test|QA Visitor|PRIVATE_QA_NOTE_NOT_FOR_MESSENGER/,
    "Contact data and private note must not leak to messengers");
  const viewportWidth = page.viewportSize().width;
  for(const channel of [wa,tg]){
    await channel.scrollIntoViewIfNeeded();
    const rect=await channel.boundingBox();
    assert.ok(rect && rect.width>=100 && rect.height>=44,"Usable chat touch target");
    assert.ok(rect.x>=-1 && rect.x+rect.width<=viewportWidth+1,"Chat action fits viewport");
    const marker=await channel.getAttribute("data-contact-channel");
    try {
      await channel.click({trial:true,timeout:8000});
    }catch(error){
      const obstruction=await page.evaluate(marker=>{
        const anchor=document.querySelector('a[data-contact-channel="' + marker + '"]');
        const r=anchor?.getBoundingClientRect();
        const covering=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return {control:r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null,
          covering:covering?.tagName||null,
          coveringClass:typeof covering?.className==="string"?covering.className.slice(0,90):"",
          viewport:{width:innerWidth,height:innerHeight}};
      },marker);
      throw new Error("Thank-you chat action blocked: "+name+"/"+marker+" "+
        JSON.stringify(obstruction)+" / "+error.message);
    }
  }
  const dimensions=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.inner+2,"No mobile horizontal overflow");
  if(screenshot) await receiptPage.screenshot({path:output+"/"+slug(name)+".png",animations:"disabled"});
  results.push({name,locale,viewportWidth,channels:["WhatsApp","Telegram"],
    matchingDrafts:true,contactSubmitted:true,thankYouNavigation:true});
}

// Mock the transport boundaries, never a real Google account or CRM write.
// Covers the same-tab OAuth round trip, selected paid offer, consent and
// receipt navigation. True Google provider E2E remains an independent gate.
async function verifySyntheticGoogleReturn(page, submissions) {
  const path="/en/academy/reiki/yggdrasil/free-initiation";
  const fakeGoogle="https://accounts.google.com/hh-qa-oauth-return";
  await page.route("**/api/app/auth/start",async route=>{
    const request=JSON.parse(route.request().postData()||"{}");
    assert.equal(request.continueTo,"enquiry");
    assert.equal(request.returnPath,path);
    await route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify({redirectUrl:fakeGoogle})});
  });
  await page.route(fakeGoogle,async route=>{
    await route.fulfill({status:302,headers:{location:origin+path+"?hh_enquiry=google"},body:""});
  });
  await page.route("**/api/app/auth/contact-profile",async route=>{
    await route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify({email:"google-qa@example.test",displayName:"Google QA"})});
  });
  try {
    await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
    await page.locator('[data-yggdrasil-form] button[data-intent="personal"]').click();
    const chooser=page.locator('[data-yggdrasil-form] [data-contact-channel-chooser]');
    await chooser.locator('button[data-contact-order]').click();
    const form=chooser.locator("form");
    const consent=form.locator('input[data-reply-consent]');
    assert.equal(await consent.isChecked(),false,"Google must require explicit opt-in");
    await consent.check();
    const before=submissions.length;
    await form.locator("button").filter({hasText:/Continue with Google/i}).first().click();
    await page.waitForURL(origin+"/en/thank-you",{timeout:20000});
    await page.locator("[data-service-thank-you]").getByText("HH-CA5016DE79E4",{exact:true})
      .waitFor({state:"visible",timeout:10000});
    assert.equal(submissions.length,before+1,"OAuth return creates exactly one saved request");
    const req=submissions.at(-1);
    assert.equal(req.contact.email,"google-qa@example.test");
    assert.equal(req.contactConsent,true);
    assert.match(req.serviceTitle,/Personal initiation/,"OAuth must preserve original paid option");
    assert.doesNotMatch(req.description,/google-qa@example.test/,"Never copy contact to note");
  }finally{
    await page.unroute("**/api/app/auth/start");
    await page.unroute(fakeGoogle);
    await page.unroute("**/api/app/auth/contact-profile");
  }
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
            const indexes = count > 2 ? [0,count-1] : [0];
            for (const i of indexes) {
              if(i!==indexes[0]){
                const again = await page.goto(origin+item.path,{waitUntil:"domcontentloaded",timeout:60000});
                assert.equal(again?.status(),200);
              }
              await verifyChooser(page,page.locator(item.selector).nth(i),locale,[name,locale,width,slug(item.path),i].join("-"),width===390,submissions);
            }
            if (item.path.endsWith("/yggdrasil/free-initiation")) {
              await page.goto(origin+item.path,{waitUntil:"domcontentloaded",timeout:60000});
              const form = page.locator("[data-yggdrasil-form]");
              const personal = form.locator('button[data-intent="personal"]');
              await personal.click();
              assert.equal(await personal.getAttribute("aria-pressed"),"true");
              const chooser = form.locator("[data-contact-channel-chooser]");
              const button = chooser.locator("button[data-contact-order]");
              assert.equal(await button.getAttribute("aria-expanded"),"false");
              await button.click();
              await submitSyntheticForm(page,chooser,locale,submissions);
              const selected = submissions[submissions.length-1];
              assert.match(selected.serviceTitle + " " + selected.description,/PERSONAL|ЛИЧНУЮ|personal|личн/i,
                "The selected paid option must reach the encrypted owner request");
              assert.equal(page.url(),origin+"/"+locale+"/thank-you");
            }
          }
          if (name === "chromium" && width === 390 && locale === "en") {
            await verifySyntheticGoogleReturn(page,submissions);
          }
          {
            const daoResponse = await page.goto(origin + "/" + locale + "/services/dao-health-profile",
              {waitUntil:"domcontentloaded",timeout:60000});
            assert.equal(daoResponse?.status(),200,name + " " + locale + " Dao free landing");
            const daoForm = page.locator('main[data-free-entry-landing="dao"] [data-compact-lead-form]');
            await daoForm.waitFor({state:"visible",timeout:25000});
            const consent = daoForm.locator('input[type="checkbox"][required]');
            assert.equal(await consent.count(),1,"Consent is required for the free Dao CRM request");
            assert.equal(await daoForm.locator('button[type="submit"]').isDisabled(),true,
              "Dao form cannot submit without an opt-in");
            assert.equal(await page.locator('[data-free-entry-landing="dao"] [data-contact-channel-chooser]').count(),0,
              "Dao uses approved first-party contact capture, not a second messenger funnel");
            // The network request is intercepted above; synthetic consent
            // validates the CRM handoff without touching a real lead/account.
            const previous = submissions.length;
            const submit = daoForm.locator('button[type="submit"]');
            await daoForm.locator('input[name="contact"]').fill("qa-browser@example.test");
            assert.equal(await submit.isDisabled(),true,"Contact cannot bypass consent");
            await consent.check();
            await submit.click();
            await page.waitForURL(origin+"/"+locale+"/thank-you",{timeout:15000});
            await page.locator('[data-service-thank-you]').getByText("HH-CA5016DE79E4",{exact:true})
              .waitFor({state:"visible",timeout:15000});
            assert.equal(submissions.length,previous+1,"Exactly one synthetic Dao enquiry");
            const enquiry = submissions.at(-1);
            assert.equal(enquiry.locale,locale);
            assert.equal(enquiry.contactConsent,true);
            assert.equal(enquiry.contact.email,"qa-browser@example.test");
            assert.equal(enquiry.sourcePath,"/"+locale+"/services/dao-health-profile");
            assert.ok(/^[a-f0-9-]{36}$/i.test(enquiry.operationId));
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
            assert.equal(await page.locator('[data-service-thank-you] a[data-contact-channel="whatsapp"]').count(),1);
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
console.log("PASS browser verified thank-you navigation and optional messenger handoff on Chromium and WebKit",results.length);
