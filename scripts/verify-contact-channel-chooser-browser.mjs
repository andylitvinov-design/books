// Public read-only, no outgoing messenger clicks, sends, sign-in, or client records.
// Test the real hydrated two-step capture on local Next production server.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { assertPublicJourneyRuntime, publicJourneyRequestDecision } from "./helpers/public-journey-verifier.mjs";

import { blockedApiDetails } from "./helpers/contact-request-diagnostics.mjs";
import { createAnonymousAcademyBootstrapFixture, appendBootstrapFixtureFailure } from "./helpers/anonymous-bootstrap-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
if (process.argv.includes("--live")) throw new Error("Synthetic contact acceptance must never run against live production");
const live = false;
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
assertPublicJourneyRuntime(origin);
const output = "artifacts/contact-channel-browser";
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
const fixtureFailures = [];
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

// PR1950 intentionally replaced five repeated panels with one real select.
// Exercise every intent and its reset/deep-link contract, not a reduced count.
async function verifyTantraChoice(page, locale, name, submissions) {
  const capture=page.locator('[data-tantra-whatsapp-capture]');
  const select=capture.locator('select#tantra-request-'+locale);
  const intents=['free','personal','session','answers','feedback'];
  assert.deepEqual(await select.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value)),intents);
  assert.equal(await select.evaluate(node=>node.labels?.length),1,'Native intent control retains one associated label');
  await select.focus();
  assert.equal(await select.evaluate(node=>document.activeElement===node),true,'Native intent choice remains keyboard-focusable');
  const choiceBounds=await select.boundingBox();
  assert.ok(choiceBounds&&choiceBounds.width>=150&&choiceBounds.height>=44,'One accessible full-size intent chooser: '+name);
  const signatures={
    en:{free:/free introductory Level 1/,personal:/€50 \/ 30 minutes/,session:/€100 \/ 60 minutes/,answers:/seven answers/,feedback:/whether I was able to tune in/},
    ru:{free:/бесплатную вводную инициацию/,personal:/€50 \/ 30 минут/,session:/100 € \/ 60 минут/,answers:/7 ответов/,feedback:/удалось ли мне настроиться/},
    es:{free:/iniciación introductoria gratuita/,personal:/€50 \/ 30 minutos/,session:/100 € \/ 60 minutos/,answers:/siete respuestas/,feedback:/si pude conectar/},
  };
  for(const intent of intents){
    assert.equal(await capture.locator('#apply-'+intent).count(),1,'Preserved deep-link target '+intent);
    await select.selectOption(intent);
    assert.equal(await select.inputValue(),intent);
    const chooser=capture.locator('[data-contact-channel-chooser][data-reiki-phone-enquiry]');
    assert.equal(await chooser.count(),1,'Exactly one compact chooser for the selected intent');
    assert.equal(await chooser.locator('[data-contact-order], input[type="email"], textarea').count(),0,
      'No retired duplicate trigger, extra signup or private answer capture');
    const phone=chooser.locator('input[type="tel"]');
    const consent=chooser.locator('input[type="checkbox"][required]');
    assert.equal(await phone.inputValue(),'','Changing intent clears prior synthetic contact');
    assert.equal(await consent.isChecked(),false,'Changing intent cannot inherit consent');
    assert.equal(await chooser.locator('a[data-contact-channel]').count(),0,'No saved/provider receipt before consent');
    const selectedLabel=(await select.locator('option:checked').innerText()).trim();
    const before=submissions.length;
    await phone.fill('4165550123');
    const submit=chooser.locator('[data-contact-channel-submit="whatsapp"]');
    for(const channel of ['whatsapp','telegram']){
      const button=chooser.locator('[data-contact-channel-submit="'+channel+'"]');
      const box=await button.boundingBox();
      assert.ok(box&&box.width>=100&&box.height>=44,'Usable compact channel button '+intent+'/'+channel);
      assert.ok(box.x>=-1&&box.x+box.width<=page.viewportSize().width+1,'Compact button fits screen');
    }
    await submit.click();
    assert.equal(submissions.length,before,'Phone alone never saves a request');
    assert.equal(await consent.isChecked(),false);
    await consent.check();
    await submit.click();
    const wa=chooser.locator('a[data-contact-channel="whatsapp"]');
    const tg=chooser.locator('a[data-contact-channel="telegram"]');
    await wa.waitFor({state:'visible'});
    assert.equal(submissions.length,before+1,'Exactly one consented synthetic request per explicit intent');
    const request=submissions.at(-1);
    assert.equal(request.locale,locale);
    assert.equal(request.contactConsent,true);
    assert.deepEqual(request.contact,{displayName:'',email:'',phone:'+14165550123'});
    assert.equal(request.sourcePath,'/'+locale+'/academy/reiki/tantra-reiki/free-initiation');
    assert.equal(request.description,request.serviceTitle+' · '+selectedLabel,'Selected public intent, not invented private answers');
    assert.ok(/^[a-f0-9-]{36}$/i.test(request.operationId));
    assert.equal(request.website,'');
    const waText=draft(await wa.getAttribute('href'),'wa.me','/14376066502');
    assert.equal(draft(await tg.getAttribute('href'),'t.me','/AndyTherapist'),waText);
    assert.match(waText,signatures[locale][intent],'Prepared request preserves selected intent '+intent);
    assert.match(waText,/HH-CA5016DE79E4/);
    assert.doesNotMatch(waText,/4165550123|qa-browser@example\.test|PRIVATE_QA_NOTE_NOT_FOR_MESSENGER/);
    for(const channel of [wa,tg]){
      const box=await channel.boundingBox();
      assert.ok(box&&box.width>=100&&box.height>=44&&box.x>=-1&&box.x+box.width<=page.viewportSize().width+1);
      await channel.click({trial:true,timeout:8000}); // hit-test only; never follow provider
    }
    assert.equal(new URL(page.url()).pathname,request.sourcePath,'stayAfterSave retains the local request card');
    if(page.viewportSize().width===390&&(intent==='free'||intent==='feedback'))
      await chooser.screenshot({path:output+'/'+slug(name+'-'+intent)+'.png',animations:'disabled'});
    results.push({name:name+'-'+intent,locale,viewportWidth:page.viewportSize().width,intent,
      syntheticOnly:true,contactSubmitted:true,channels:['WhatsApp','Telegram'],matchingDrafts:true});
  }
  // Preserve every former #apply-* entry without another submission or API read.
  for(const intent of intents){
    await page.evaluate(hash=>{window.location.hash=hash;},'#apply-'+intent);
    await page.waitForFunction(({locale,intent})=>document.getElementById('tantra-request-'+locale)?.value===intent,{locale,intent});
    assert.equal(await capture.locator('input[type="checkbox"][required]').isChecked(),false);
    assert.equal(await capture.locator('a[data-contact-channel]').count(),0);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,'No compact capture horizontal overflow');
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
        const blocked=[];
        let requestPhase = "setup";
        const bootstrapFixture = createAnonymousAcademyBootstrapFixture(origin, locale);
        // Fence the whole context, including popups. No request can write to a
        // backend or navigate to a provider; only this exact synthetic POST exists.
        await context.route('**/*',async route=>{
          if (await bootstrapFixture.tryFulfill(route, requestPhase)) return;
          const request=route.request(),url=new URL(request.url()),method=request.method();
          if(url.origin===origin&&url.pathname==='/api/service-enquiries'&&!url.search&&method==='POST'){
            let payload;
            try{payload=JSON.parse(request.postData()||'{}')}catch{}
            const contact=payload?.contact;
            if(payload?.contactConsent!==true||!contact||
               ![contact.email,contact.phone].some(value=>value==='qa-browser@example.test'||value==='+14165550123')||
               (contact.email&&contact.email!=='qa-browser@example.test')||
               (contact.phone&&contact.phone!=='+14165550123')||
               (contact.displayName&&contact.displayName!=='QA Visitor')){
              blocked.push({category:'non-synthetic-enquiry'});
              return route.abort('blockedbyclient');
            }
            submissions.push(payload);
            return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({saved:true,referenceCode:'HH-CA5016DE79E4'})});
          }
          if(publicJourneyRequestDecision({url:request.url(),method,body:request.postData()||'',navigation:request.isNavigationRequest()},origin,
            ['qa-browser@example.test','4165550123','PRIVATE_QA_NOTE_NOT_FOR_MESSENGER'])==='private-text'){
            blocked.push({category:'private-text'});
            return route.abort('blockedbyclient');
          }
          if(!['GET','HEAD'].includes(method)||url.pathname.startsWith('/api/')||
             (url.origin!==origin&&request.isNavigationRequest())){
            blocked.push({method:['GET','HEAD','POST','PUT','PATCH','DELETE'].includes(method)?method:'OTHER',
              category:url.pathname.startsWith('/api/')?'unexpected-api':request.isNavigationRequest()?'external-navigation':'unexpected-write',
              ...(url.pathname.startsWith('/api/') ? blockedApiDetails({ url: request.url(), resourceType: request.resourceType(), navigation: request.isNavigationRequest(), frameUrl: () => request.frame().url() }, origin, requestPhase) : {})});
            return route.abort('blockedbyclient');
          }
          if(url.origin!==origin)return route.abort('blockedbyclient');
          return route.continue();
        });
        // Compact capture normally opens a provider tab after a saved receipt.
        // Keep that interface entirely in memory BEFORE the page or handler loads.
        await context.addInitScript(()=>{window.open=()=>({opener:null,closed:false,
          location:{replace:()=>{}},close:()=>{}});});
        page.on("pageerror",e=>errors.push({name,width,locale,message:e.message}));
        try {
          const cases = [
            {path:"/"+locale+"/academy/reiki/tantra-reiki/free-initiation",tantra:true,phase:"tantra"},
            {path:"/"+locale+"/academy/reiki/yggdrasil/free-initiation",selector:'[data-yggdrasil-form] [data-contact-channel-chooser]',min:1,phase:"yggdrasil"},
            {path:"/"+locale+"/academy",selector:'[data-academy-course-capture] [data-contact-channel-chooser]',min:1,phase:"academy"},
          ];
          // EN/RU/ES Dao now share one consented first-party CRM landing.
          // None use a parallel messenger chooser; verify them after the loop.
          for (const item of cases) {
            requestPhase = item.phase;
            const response = await page.goto(origin + item.path,{waitUntil:"domcontentloaded",timeout:60000});
            assert.equal(response?.status(),200,name+" "+item.path);
            if(item.tantra){
              // The compact contact form has its own country-code select.
              // Wait for the labelled five-intent control, not every select.
              await page.locator('[data-tantra-whatsapp-capture] select#tantra-request-'+locale).waitFor({state:'visible'});
              await verifyTantraChoice(page,locale,[name,locale,width,'tantra'].join('-'),submissions);
              continue;
            }
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
          {
            requestPhase = "dao-entry";
            const daoResponse = await page.goto(origin + "/" + locale + "/services/dao-health-profile",
              {waitUntil:"domcontentloaded",timeout:60000});
            assert.equal(daoResponse?.status(),200,name + " " + locale + " Dao free landing");
            const daoForm = page.locator('main[data-free-entry-landing="dao"] [data-compact-lead-form]');
            await daoForm.waitFor({state:"visible",timeout:25000});
            const consent = daoForm.locator('input[type="checkbox"][required]');
            assert.equal(await consent.count(),1,"Consent is required for the free Dao CRM request");
            assert.equal(await consent.isChecked(),false,"Dao consent must start unchecked");
            const submit = daoForm.locator('button[data-compact-channel="whatsapp"]');
            assert.equal(await daoForm.locator('button[data-compact-channel]').count(),2,
              "Dao retains both authored contact channels");
            assert.equal(await submit.getAttribute("type"),"button");
            assert.equal(await page.locator('[data-free-entry-landing="dao"] [data-contact-channel-chooser]').count(),0,
              "Dao uses approved first-party contact capture, not a second messenger funnel");
            // CompactLeadCapture validates on the channel click, rather than
            // disabling a retired submit button. Neither invalid contact nor
            // missing consent may create a request or saved receipt.
            const previous = submissions.length;
            const contact = daoForm.locator('input[name="contact"]');
            const saved = page.locator('main[data-free-entry-landing="dao"] [data-lead-saved]');
            const validation = {
              en: ["Enter a valid email or an international phone number starting with +.","Please agree to a personal reply before continuing."],
              ru: ["Укажите email или номер телефона с международным кодом +.","Подтвердите согласие на личный ответ по заявке."],
              es: ["Introduce un correo válido o un teléfono internacional que empiece por +.","Confirma que aceptas recibir una respuesta personal."],
            }[locale];
            await contact.fill("not-a-contact");
            await submit.click();
            const error = daoForm.locator('[role="alert"]');
            await error.waitFor({state:"visible"});
            assert.equal(await error.innerText(),validation[0]);
            assert.equal(submissions.length,previous,"Invalid contact must never save a Dao request");
            assert.equal(await saved.count(),0,"No receipt before a consented save");
            await contact.fill("qa-browser@example.test");
            await submit.click();
            await error.waitFor({state:"visible"});
            assert.equal(await error.innerText(),validation[1]);
            assert.equal(submissions.length,previous,"Contact cannot bypass consent");
            assert.equal(await consent.isChecked(),false);
            assert.equal(await saved.count(),0,"No receipt without consent");
            // The first-party POST is still intercepted by the context fence;
            // the existing inert popup never visits or sends to a provider.
            await consent.check();
            requestPhase = "dao-save";
            await submit.click();
            await saved.waitFor({state:"visible",timeout:10000});
            requestPhase = "dao-receipt";
            assert.equal(submissions.length,previous+1,"Exactly one synthetic Dao enquiry");
            const enquiry = submissions.at(-1);
            assert.equal(enquiry.locale,locale);
            assert.equal(enquiry.contactConsent,true);
            assert.deepEqual(enquiry.contact,{displayName:"",email:"qa-browser@example.test",phone:""});
            assert.equal(enquiry.description,"Preferred reply channel: WhatsApp");
            assert.equal(enquiry.sourcePath,"/"+locale+"/services/dao-health-profile");
            assert.equal(enquiry.website,"");
            assert.ok(/^[a-f0-9-]{36}$/i.test(enquiry.operationId));
          }
          if (name === "chromium" && width === 390 && locale === "en") {
            requestPhase = "temple";
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
          try {
          appendBootstrapFixtureFailure(fixtureFailures,bootstrapFixture,blocked,requestPhase);
          } catch { /* Diagnostics cannot replace either original final assertion. */ }
          assert.equal(bootstrapFixture.denials,1,'Exactly one observed anonymous Academy probe receives the explicit auth denial');
          assert.deepEqual(blocked,[],'No real API/write/provider operation attempted outside the exact synthetic enquiry');
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
  try {
  await writeFile(output+"/results.json",JSON.stringify({origin,live,checkedAt:new Date().toISOString(),results,errors,fixtureFailures,failure:failure?.message||null},null,2));
  } catch { if (!failure) failure = new Error("CONTACT_DIAGNOSTIC_WRITE_FAILED"); }
}
if(failure)throw failure;
try { console.log("PASS browser messenger handoff on Chromium and WebKit",results.length); } catch { throw new Error("CONTACT_DIAGNOSTIC_LOG_FAILED"); }
