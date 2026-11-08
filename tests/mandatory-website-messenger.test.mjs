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
 for(const s of ["WhatsApp","Telegram","data-messenger-only-contact","Нажмите «Отправить»","Press Send inside the messenger","directAvailable"])assert.ok(ui.includes(s),s);
 assert.doesNotMatch(ui,/mailto:|\/api\/service-enquiries|type="email"/);
 for(const p of ["components/contact-channel-chooser.tsx","components/compact-lead-capture.tsx","components/business-website-enquiry.tsx","components/meditation-course-enquiry.tsx"])
 assert.match(read(p),/if \(websiteMessengerOnlyUi\(\)\) return <MandatoryMessengerActions/,p);
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
