import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateBusinessEnquiry} from "../lib/business-consulting/intake-policy.js";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const valid={operationId:"d8929678-5c86-4ad5-95ad-6dfd7086ca71",locale:"en",format:"express",name:"Example Founder",
  email:"example@example.org",phone:"",question:"Need a clear next strategic action.",contactConsent:true};
test("business intake requires explicit consent and a real reply channel",()=>{
  assert.equal(validateBusinessEnquiry(valid).format,"express");
  assert.throws(()=>validateBusinessEnquiry({...valid,contactConsent:false}),/CONSENT_REQUIRED/);
  assert.throws(()=>validateBusinessEnquiry({...valid,email:"",phone:""}),/CONTACT_REQUIRED/);
  assert.throws(()=>validateBusinessEnquiry({...valid,phone:"12345",email:""}),/INVALID_CONTACT/);
  assert.throws(()=>validateBusinessEnquiry({...valid,question:""}),/INVALID_QUESTION/);
});
test("only public parameters are accepted and campaign values are bounded",()=>{
  assert.throws(()=>validateBusinessEnquiry({...valid,ownerId:"other"}),/INVALID_REQUEST/);
  assert.throws(()=>validateBusinessEnquiry({...valid,format:"paid_without_fee"}),/INVALID_REQUEST/);
  const x=validateBusinessEnquiry({...valid,attribution:{source:"ig",campaign:"autumn_2026",medium:"paid-social"}});
  assert.deepEqual(x.attribution,{source:"ig",campaign:"autumn_2026",medium:"paid-social"});
  assert.deepEqual(validateBusinessEnquiry({...valid,attribution:{source:"https://evil.test/p?a=secret"}}).attribution,{});
  assert.equal(validateBusinessEnquiry({...valid,website:"robot-link"}).honeypot,true);
});
test("public intake is fail-closed, encrypted and never claims a confirmed booking",()=>{
  const route=read("app/api/services/business-consulting/route.js");
  const store=read("lib/business-consulting/enquiry-store.js");
  const form=read("components/business-website-enquiry.tsx");
  const crm=read("components/app/crm-manager.jsx");
  const ownerRoute=read("app/api/app/crm/route.js");
  assert.match(route,/requireSameOrigin/);
  assert.match(route,/consumeRate/);
  assert.match(route,/readBody\(request, 2400\)/);
  assert.match(store,/seal\(payload/);
  assert.match(store,/hh_app_inbox|inbox:true/);
  assert.match(store,/on conflict do nothing/);
  assert.doesNotMatch(store,/on conflict\\(operation_hash\\)/);
  // The inbox role has only column-level INSERT; naming the arbiter column
  // would additionally require SELECT privilege, defeating least privilege.
  assert.match(ownerRoute,/practitionerEmailAllowed/);
  assertBusinessInboxCall(ownerRoute);
  assert.match(crm,/CrmBusinessEnquiries/);
  assert.match(form,/contactConsent:consent/);
  assert.match(form,/type="checkbox" required/);
  assert.doesNotMatch(form,/mailto:|send_email|setTimeout\(/);
  assert.match(form,/No payment|no payment|без регистрации|sin registro/);
});


// #1013 reformatted the owner GET response; retain the exact awaited inbox call.
function assertBusinessInboxCall(source) {
  assert.match(source,/businessEnquiries:\s*await store\.listBusinessEnquiries\(\)/);
}
test("owner business inbox contract ignores formatting but rejects a lost or changed awaited call",()=>{
  const source=read("app/api/app/crm/route.js");
  const call=source.match(/businessEnquiries:\s*await store\.listBusinessEnquiries\(\)/)?.[0];
  assert.ok(call);
  for(const spacing of ["", " ", "\n  "])
    assertBusinessInboxCall(source.replace(call,"businessEnquiries:"+spacing+"await store.listBusinessEnquiries()"));
  for(const replacement of ["", "businessEnquiries:store.listBusinessEnquiries()", "businessEnquiries:await store.listContacts()", "other:await store.listBusinessEnquiries()"])
    assert.throws(()=>assertBusinessInboxCall(source.replace(call,replacement)));
});
