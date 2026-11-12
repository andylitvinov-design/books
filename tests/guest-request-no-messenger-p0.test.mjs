import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {websiteMessengerOnly,websiteMessengerOnlyUi} from "../lib/crm/website-messenger-only.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("P0 owner rule: no bare website reply contact is a submitted messenger enquiry",()=>{
 assert.equal(websiteMessengerOnly(),process.env.HH_WEBSITE_MESSENGER_ONLY!=="false");
 assert.equal(websiteMessengerOnlyUi(),process.env.NEXT_PUBLIC_HH_WEBSITE_MESSENGER_ONLY!=="false");
 const page=read("components/compact-lead-capture.tsx");
 const chooser=read("components/contact-channel-chooser.tsx");
 assert.match(page,/if \(websiteMessengerOnlyUi\(\)\) return /);
 assert.match(chooser,/if \(websiteMessengerOnlyUi\(\)\) return /);
 const service=read("app/api/service-enquiries/route.js");
 assert.match(service,/MESSENGER_VERIFICATION_REQUIRED/);
 const store=read("lib/practitioners/public-service-enquiry.js");
 assert.match(store,/if \(websiteMessengerOnly\(\) && !linkedTelegram\)/);
});

test("P0 must block business email-only form while preserving provider-confirmed CRM threads",()=>{
 const business=read("components/business-website-enquiry.tsx");
 assert.match(business,/if \(websiteMessengerOnlyUi\(\)\) return /);
 const api=read("app/api/services/business-consulting/route.js");
 assert.ok(api.indexOf("if (websiteMessengerOnly())")<api.indexOf("await submitBusinessEnquiry("));
 const coach=read("app/api/coaching-diagnostic/route.js");
 assert.match(coach,/if \(websiteMessengerOnly\(\) && !handoff\)/);
 assert.match(coach,/verifyTelegramCoachingHandoff/);
 const ui=read("components/mandatory-messenger-actions.tsx");
 assert.match(ui,/target="_blank"/);
 assert.match(ui,/data-messenger-only-channel="telegram"/);
 assert.match(ui,/data-messenger-only-channel="whatsapp"/);
});
