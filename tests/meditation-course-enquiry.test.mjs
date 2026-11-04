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
  assert.match(src,/const consentId=formId\+"-contact-consent"/);
  assert.match(src,/id=\{consentId\} name="contactConsent" type="checkbox"/);
  assert.match(src,/label htmlFor=\{consentId\}/);
  // Preserve the native checkbox path for direct tapping and keyboard use.
  // In iPhone WebKit, the visible label also handles a real user tap because
  // WebKit can fail to activate the separate input under a fixed dock.
  // The browser acceptance independently checks that label click checks once.
  assert.match(src,/onChange=\{event=>setConsent\(event\.target\.checked\)\}/);
  // The native checkbox handles direct taps/keyboard; a full-width label
  // prevents WebKit's dropped sibling-input activation and toggles once.
  assert.match(src,/<label htmlFor=\{consentId\} onClick=\{event=>\{/);
  assert.match(src,/event\.preventDefault\(\);\s*if\(busy\)return;\s*setConsent\(value=>!value\);/);
  assert.doesNotMatch(src,/onClick=\{[^}]*setConsent\(true\)/);
  assert.match(src,/checked=\{consent\}/);
  assert.doesNotMatch(src,/setConsent\(true\)/);
  assert.match(src,/consent&&|!consent/);
  assert.match(src,/\/api\/service-enquiries/);
  assert.match(src,/crypto.randomUUID/);
  assert.match(src,/data-meditation-course-enquiry-saved/);
  assert.match(src,/result.saved!==true/);
  assert.match(src,/referenceCode/);
  assert.doesNotMatch(src,/paidAccess|checkout|wallet|spendXP|Stripe|PayPal|priceAmount/);
  assert.doesNotMatch(src,/JSON.stringify\(\{[\s\S]*?wish:/);
});

test("eight-video offer opens the existing consented CRM form instead of generic therapy checkout",()=>{
  const guided=read("components/mandala-guided-course.tsx");
  const form=read("components/meditation-course-enquiry.tsx");
  assert.match(guided,/MeditationCourseEnquiry[\s\S]*courseKind="video-series"/);
  assert.match(form,/courseKind==="video-series"\?["']?\/["']?\+locale\+["']\/holistic-support\/mandala["']/);
  for(const locale of ["ru","en","es"]){
    const sourcePath="/"+locale+"/holistic-support/mandala";
    const normalized=normalizePublicServiceEnquiry({
      operationId:"d54170d8-e973-48e4-a183-5323df5b3067",
      serviceTitle:"Personal course: 8 videos, practices and exercises",
      description:"Please contact me to discuss an eight-session personal video and practice programme. General direction: relationships.",
      sourcePath,locale,
      contact:{displayName:"Synthetic Visitor",email:"visitor@example.org",phone:""},
      contactConsent:true,
    });
    assert.equal(normalized.sourcePath,sourcePath);
    assert.equal(normalized.contactConsent,true);
    assert.equal(normalized.bookingSku,undefined,"a request is not a booking or payment");
    assert.equal(normalized.contact.email,"visitor@example.org");
  }
  assert.doesNotMatch(form,/JSON.stringify\(\{[\s\S]*?(?:keyDifficulty|keyGoal|profileEvidence|testResults|meditationScript):/);
});
