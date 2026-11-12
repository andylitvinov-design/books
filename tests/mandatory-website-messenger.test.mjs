import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
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
 for(const s of ["WhatsApp","Telegram","data-messenger-only-contact","Нажмите «Отправить»","Press Send inside the messenger","resolveTelegramFirstEntry","data-hh-messenger-art"])assert.ok(ui.includes(s),s);
 assert.doesNotMatch(ui,/mailto:|\/api\/service-enquiries|type="email"/);
 assert.match(ui,/bot\.kind==="review"\?t\.review:t\.bot/);
 assert.match(ui,/setBot\(null\)/);
 const chooser=read("components/contact-channel-chooser.tsx");
 assert.match(chooser,/collapsed=\{\(compactPhone\|\|compactTrigger\)&&!allowSecureExpressClaim\}/);
 const css=read("components/mandatory-messenger-actions.module.css");
 assert.match(css,/@media\(max-width:430px\)\{\.art\{height:44px\}\}/);
 assert.match(ui,/data-telegram-route=\{bot\?\.kind\|\|"manual"\}/);
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
