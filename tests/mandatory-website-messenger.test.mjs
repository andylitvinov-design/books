import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {whatsappEnquiryUrl,telegramEnquiryUrlFromWhatsApp,TELEGRAM_USERNAME} from "../lib/whatsapp-enquiry.js";
import {telegramServiceRequestUrl,telegramBusinessServiceTitle} from "../lib/assist/telegram-business-request.mjs";
import {websiteMessengerOnly,websiteMessengerOnlyUi} from "../lib/crm/website-messenger-only.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("messenger-only default and explicit emergency rollback",()=>{
 const a=process.env.HH_WEBSITE_MESSENGER_ONLY,b=process.env.NEXT_PUBLIC_HH_WEBSITE_MESSENGER_ONLY;
 try{delete process.env.HH_WEBSITE_MESSENGER_ONLY;delete process.env.NEXT_PUBLIC_HH_WEBSITE_MESSENGER_ONLY;
 assert.equal(websiteMessengerOnly(),true);assert.equal(websiteMessengerOnlyUi(),true);
 process.env.HH_WEBSITE_MESSENGER_ONLY="false";process.env.NEXT_PUBLIC_HH_WEBSITE_MESSENGER_ONLY="false";
 assert.equal(websiteMessengerOnly(),false);assert.equal(websiteMessengerOnlyUi(),false);
 }finally{if(a===undefined)delete process.env.HH_WEBSITE_MESSENGER_ONLY;else process.env.HH_WEBSITE_MESSENGER_ONLY=a;
 if(b===undefined)delete process.env.NEXT_PUBLIC_HH_WEBSITE_MESSENGER_ONLY;else process.env.NEXT_PUBLIC_HH_WEBSITE_MESSENGER_ONLY=b;}
});
test("website-only intake UI shows Telegram and WhatsApp with honest Send disclosure",()=>{
 const ui=read("components/mandatory-messenger-actions.tsx");
 for(const s of ["WhatsApp","Telegram","data-messenger-only-contact","Нажмите «Отправить»","Press Send inside the messenger","data-hh-messenger-art"])assert.ok(ui.includes(s),s);
 assert.doesNotMatch(ui,/mailto:|\/api\/service-enquiries|type="email"/);
 assert.doesNotMatch(ui,/resolveTelegramFirstEntry|setBot|telegram-diagnostic/);
 assert.ok(ui.includes("telegramEnquiryUrlFromWhatsApp(whatsappUrl)"));
 const chooser=read("components/contact-channel-chooser.tsx");
 assert.match(chooser,/collapsed=\{compactMessenger\|\|\(\(compactPhone\|\|compactTrigger\)&&!allowSecureExpressClaim\)\}/);
 const css=read("components/mandatory-messenger-actions.module.css");
 assert.match(css,/@media\(max-width:430px\)\{\.art\{height:44px\}\}/);
 assert.match(ui,/data-telegram-route=\{telegramUrl\?"manual":"service"\}/);
 for(const p of ["components/contact-channel-chooser.tsx","components/compact-lead-capture.tsx","components/business-website-enquiry.tsx","components/meditation-course-enquiry.tsx"]) {
   assert.match(read(p),/if \(websiteMessengerOnlyUi\(\)\) return /,p);
   assert.match(read(p),/MandatoryMessengerActions/,p);
 }
 assert.match(read("components/compact-lead-capture.tsx"),/data-messenger-offer-format/);
 assert.match(read("components/business-website-enquiry.tsx"),/data-business-field="format"/);
 assert.match(read("components/contact-channel-chooser.tsx"),/data-booking-sku=\{bookingSku/);
 assert.match(read("components/home-free-diagnosis-banner.tsx"),/hidden=\{!open \|\| websiteMessengerOnlyUi\(\)\}/);
});
test("public website POST cannot write CRM lead before verified messenger handoff",()=>{
 const src=read("app/api/service-enquiries/route.js");
 assert.ok(src.indexOf("if (websiteMessengerOnly())")<src.indexOf("await createPublicServiceEnquiry("));
 assert.match(read("lib/practitioners/public-service-enquiry.js"),/if \(websiteMessengerOnly\(\) && !linkedTelegram\)/);
 const coaching=read("app/api/coaching-diagnostic/route.js");
 assert.ok(coaching.indexOf("if (websiteMessengerOnly() && !handoff)")<coaching.indexOf("await createPublicServiceEnquiry("));
 const business=read("app/api/services/business-consulting/route.js");
 assert.ok(business.indexOf("if (websiteMessengerOnly())")<business.indexOf("await submitBusinessEnquiry("));
 for(const route of [src,coaching,business])assert.match(route,/MESSENGER_VERIFICATION_REQUIRED/);
});

test("additional order and custom-quote journeys keep offer and never infer messenger proof",()=>{
  const cart=read("components/commerce/personal-cart.tsx");
  assert.match(cart,/ContactChannelChooser locale=\{locale\} whatsappUrl=\{bookingUrl\}/);
  assert.match(cart,/description = chosen\.map\(product => product\.title/);
  assert.match(cart,/selected\.includes\(product\.id\)/);
  const fu=read("components/taoist-talisman-cart.tsx");
  assert.match(fu,/websiteMessengerOnlyUi\(\)\? <MandatoryMessengerActions/);
  assert.match(fu,/option:idsKey/);
  const reiki=read("components/remote-energy-support-booking.tsx");
  assert.match(reiki,/option: remoteSupportPublicRequestSummary\(contactDraft, locale\)/);
  assert.match(reiki,/data-remote-public-order-contact/);
  const express=read("components/personal-express-enquiry.tsx");
  assert.match(express,/publicWizard = enableWizard && !websiteMessengerOnlyUi\(\)/);
  const business=read("components/business-website-enquiry.tsx");
  assert.match(business,/data-business-field="format"/);
  assert.match(business,/t\.formatNames\[format\]/);
  const paid=read("components/alchemy-soul-lead-form.tsx");
  assert.match(paid,/bookingSku=\{selected === "30" \? "express-consultation-30" : "personal-session-60"\}/);
  const gate=read("app/api/service-enquiries/route.js");
  assert.match(gate,/MESSENGER_VERIFICATION_REQUIRED/);
  assert.doesNotMatch(read("components/mandatory-messenger-actions.tsx"),/request:\s*(?:answers|report|medicalRecords)/);
});

test("Services request expands only two messaging buttons under the full service card",()=>{
 const ui=read("components/mandatory-messenger-actions.tsx");
 const css=read("components/mandatory-messenger-actions.module.css");
 const chooser=read("components/contact-channel-chooser.tsx");
 const spiritual=read("components/services-spiritual-reading.tsx");
 const spiritualCss=read("components/services-spiritual-reading.module.css");
 const magical=read("components/services-magical-help-mobile.tsx");
 const consultation=read("components/services-personal-consultation-mobile.tsx");
 const consultationCss=read("components/services-personal-consultation-mobile.module.css");
 const courses=read("components/services-courses-shelf.tsx");
 assert.match(ui,/data-compact-messenger=\{compact\?"true":undefined\}/);
 assert.match(ui,/data-contact-order=\{compact\?"":undefined\}/);
 assert.match(ui,/\{!compact&&<>\s*<img className=\{styles\.art\}/);
 assert.match(ui,/\{!compact&&<>\s*<p className=\{styles\.note\}/);
 assert.match(css,/\.root\[data-compact-messenger="true"\] \.actions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(chooser,/compact=\{compactMessenger\}/);
 for(const source of [spiritual,magical,consultation,courses])
   assert.match(source,/compactMessenger/);
 assert.equal((spiritual.match(/<SpiritualAction locale=/g)||[]).length,2);
 assert.match(spiritualCss,/\.request\{grid-column:1\/-1;/);
 assert.doesNotMatch(spiritualCss,/\.request :global\(\[data-contact-channel-chooser\]>div\[id\]\)\{position:absolute/);
 assert.equal((consultation.match(/compactPhone compactTrigger compactMessenger stayAfterSave/g)||[]).length,2);
 assert.match(consultationCss,/\.order \{ grid-column: 1 \/ -1;/);
 assert.match(magical,/className=\{styles\.booking\}/);
});


test("Services Telegram requests keep the selected product and never enter free-review interview",()=>{
 assert.equal(TELEGRAM_USERNAME,'holistichouse');
 for(const locale of ['ru','en','es'])for(const id of ['homeopathy','coaching','reiki','constellations','business']){
  const title=telegramBusinessServiceTitle(id,locale);
  const whatsapp=whatsappEnquiryUrl({locale,service:title,request:'Private question should stay out of Telegram'});
  assert.equal(telegramEnquiryUrlFromWhatsApp(whatsapp),telegramServiceRequestUrl(id,locale));
 }
 const details=whatsappEnquiryUrl({locale:'en',service:'Extended video consultation',
   request:'private request secret',topic:'sensitive symptom',context:'medical record and e-mail',option:'private time preference',pagePath:'/en/services'});
 const handoff=telegramEnquiryUrlFromWhatsApp(details);
 assert.ok(handoff.startsWith('https://t.me/holistichouse?text='));
 const text=new URL(handoff).searchParams.get('text');
 assert.match(text,/Extended video consultation/);
 assert.doesNotMatch(text,/private request secret|sensitive symptom|medical record|e-mail|private time preference|HH-REQ|hhreview|hhtalk/);
 assert.doesNotMatch(handoff,/AndyTherapist|holistichouse_bot|start=/);
 for(const bad of ['https://wa.me/123?text=test','https://attacker.test/?text=Service%3A%20Fake'])
   assert.throws(()=>telegramEnquiryUrlFromWhatsApp(bad));
});

test("cart messenger choice opens with native one-tap disclosure, without automatic CRM write",()=>{
 const src=read("components/commerce/personal-cart.tsx");
 const css=read("components/commerce/personal-cart.module.css");
 const qa=read("scripts/verify-storefront-shop-browser.mjs");
 assert.match(src,/<details className=\{styles\.orderDisclosure\} data-cart-order-disclosure/u);
 assert.match(src,/open=\{orderOpen\} onToggle=\{event => setOrderOpen\(event\.currentTarget\.open\)\}/u);
 assert.match(src,/<summary className=\{styles\.orderButton\} data-cart-start-order>/u);
 assert.match(src,/<ContactChannelChooser locale=\{locale\} whatsappUrl=\{bookingUrl\} quick cartContact/u);
 assert.doesNotMatch(src,/data-cart-start-order aria-expanded=\{orderOpen\}/u);
 assert.match(css,/\.orderDisclosure>\.orderButton::-webkit-details-marker\{display:none\}/u);
 assert.match(qa,/await contactForm\.waitFor\(\{ state: 'visible', timeout: 12000 \}\)/u);
 assert.match(qa,/await contactForm\.waitFor\(\{ state: 'hidden', timeout: 8000 \}\)/u);
 assert.match(qa,/syntheticEnquiries\.length,0/u);
 assert.match(qa,/data-cart-payment-step/u);
});
