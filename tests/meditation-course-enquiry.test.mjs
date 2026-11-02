import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizePublicServiceEnquiry} from "../lib/practitioners/public-service-enquiry-input.mjs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("eight-day course request uses existing encrypted, reply-consented public enquiry",()=>{
  for(const locale of ["ru","en","es"]){
    const normalized=normalizePublicServiceEnquiry({
      operationId:"d54170d8-e973-48e4-a183-5323df5b3067",
      serviceTitle:"Eight personal meditations",
      description:"Please contact me about an eight-day meditation course. General topic: relationships.",
      sourcePath:"/"+locale+"/services/imagery-therapy",locale,
      contact:{displayName:"Visitor",email:"visitor@example.org",phone:""},
      contactConsent:true,
    });
    assert.equal(normalized.locale,locale);
    assert.equal(normalized.contact.email,"visitor@example.org");
    assert.equal(normalized.contactConsent,true);
    assert.equal(normalized.bookingSku,undefined);
    assert.equal(normalized.sourcePath,"/"+locale+"/services/imagery-therapy");
  }
});
test("client form needs explicit contact, keeps private text out and never checks out",()=>{
  const src=read("components/meditation-course-enquiry.tsx");
  assert.match(src,/contactConsent:true/);
  assert.match(src,/consent&&|!consent/);
  assert.match(src,/\/api\/service-enquiries/);
  assert.match(src,/crypto.randomUUID/);
  assert.match(src,/data-meditation-course-enquiry-saved/);
  assert.match(src,/result.saved!==true/);
  assert.match(src,/referenceCode/);
  assert.doesNotMatch(src,/paidAccess|checkout|wallet|spendXP|Stripe|PayPal|priceAmount/);
  assert.doesNotMatch(src,/JSON.stringify\(\{[\s\S]*?wish:/);
});
