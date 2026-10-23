import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  MONTHLY_SUPPORT_TITLE, MONTHLY_SUPPORT_PRICE_MINOR, MONTHLY_SUPPORT_SLOTS,
  normalizeMonthlySupportOwnerAction,
} from "../lib/practitioners/monthly-support-contract.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const uuid="13b822f6-8d70-4b1c-b44e-d0c31ad1d82f";
const valid={
  action:"activate",operationId:uuid,sourceEnquiryId:uuid,clientAccountId:uuid,
  format:"remote_no_call",paymentMethod:"wise",receiptReference:"WISE/ABCD12345",
  confirmedByOwner:true,clientConsentConfirmed:true,termsAgreed:true,
};

test("€200 is exactly two 60-minute sessions, never a membership auto-renewal",()=>{
  assert.equal(MONTHLY_SUPPORT_PRICE_MINOR,20000);
  assert.equal(MONTHLY_SUPPORT_SLOTS,2);
  assert.match(MONTHLY_SUPPORT_TITLE,/Personal support · 2 x 60 min · EUR 200/);
  const schema=read("supabase/migrations/20261023210000_hh_personal_support_monthly_20261023.sql");
  assert.match(schema,/amount_minor integer NOT NULL DEFAULT 20000 CHECK \(amount_minor=20000\)/);
  assert.match(schema,/ordinal IN \(1,2\)/);
  assert.match(schema,/receipt_digest text NOT NULL UNIQUE/);
  assert.match(schema,/source_public_enquiry_id uuid NOT NULL UNIQUE/);
  assert.match(schema,/FORCE ROW LEVEL SECURITY/g);
  assert.match(schema,/FROM PUBLIC,anon,authenticated,hh_app_inbox/);
  assert.match(schema,/personal_support_integrity_guard/);
  assert.match(schema,/NEW\.client_account_id/);
  assert.doesNotMatch(schema,/auto_renew|charge_customer|billing_private\.service_orders/);
});

test("manual payment activation requires all three explicit owner attestations",()=>{
  assert.equal(normalizeMonthlySupportOwnerAction(valid).receiptReference,"WISE/ABCD12345");
  for(const field of ["confirmedByOwner","clientConsentConfirmed","termsAgreed"]){
    assert.throws(()=>normalizeMonthlySupportOwnerAction({...valid,[field]:false}),field);
  }
  for(const item of [
    {...valid,receiptReference:"hi"},
    {...valid,receiptReference:"a".repeat(161)},
    {...valid,format:"remote_guess"},
    {...valid,paymentMethod:"stripe_auto"},
    {...valid,clientAccountId:"not uuid"},
    {...valid,medicalNotes:"not allowed"},
  ])assert.throws(()=>normalizeMonthlySupportOwnerAction(item));
});

test("real appointment mutations reject unknown actions and protect optimistic revision",()=>{
  const schedule={action:"schedule",programId:uuid,ordinal:2,expectedRevision:1,
    scheduledAt:"2026-11-05T17:00:00Z"};
  assert.equal(normalizeMonthlySupportOwnerAction(schedule).scheduledAt,"2026-11-05T17:00:00.000Z");
  assert.equal(normalizeMonthlySupportOwnerAction({action:"complete",programId:uuid,ordinal:1,expectedRevision:2}).ordinal,1);
  for(const item of [
    {...schedule,scheduledAt:"tomorrow"},
    {...schedule,scheduledAt:"2026-11-05T17:00"},
    {...schedule,ordinal:3},
    {...schedule,expectedRevision:0},
    {...schedule,clientEmail:"private"},
    {action:"refund",programId:uuid},
  ])assert.throws(()=>normalizeMonthlySupportOwnerAction(item));
});

test("owner-only mutating API and client-only readback are separately authenticated",()=>{
  const owner=read("app/admin/api/personal-support/route.js");
  const client=read("app/api/client/personal-support/route.js");
  const service=read("lib/practitioners/monthly-support-service.js");
  const ui=read("components/monthly-support-client.tsx");
  const home=read("components/home-featured-workspace.tsx");
  assert.match(owner,/requireAdminRequest/);
  assert.match(owner,/practitionerEmailAllowed/);
  assert.match(owner,/createAppRepository\(config\)\.isPractitioner/);
  assert.match(owner,/requireSameOrigin/);
  assert.match(owner,/consumeRate/);
  assert.match(client,/const actor=await auth\.verified\(\)/);
  assert.match(client,/listMonthlySupportClient\(config,actor\)/);
  assert.doesNotMatch(client,/export \{.*POST/);
  assert.match(service,/receiptDigest=operationHash/);
  assert.match(service,/clientAccountId:input\.clientAccountId/);
  assert.match(service,/PERSONAL_SUPPORT_ENQUIRY_UNAVAILABLE/);
  assert.match(service,/PERSONAL_SUPPORT_ALREADY_VERIFIED/);
  assert.match(service,/source_public_enquiry_id/);
  assert.match(service,/completed_at is null/i);
  assert.match(service,/remainingSessions:Math\.max\(0,MONTHLY_SUPPORT_SLOTS-completed\)/);
  assert.match(ui,/fetch\("\/api\/client\/personal-support"/);
  assert.match(home,/data-home-personal-support-cta/);
  assert.doesNotMatch(ui,/autoRenew|localStorage|sendBeacon|stripe/i);
});


test("encrypted monthly messages enforce participant RLS and neutral in-site delivery",()=>{
  const migration=read("supabase/migrations/20261023210000_hh_personal_support_monthly_20261023.sql");
  const service=read("lib/practitioners/monthly-support-messages.js");
  const route=read("app/api/client/personal-support/[programId]/messages/route.js");
  const component=read("components/monthly-support-thread.tsx");
  const owner=read("components/monthly-support-owner.tsx");
  const client=read("components/monthly-support-client.tsx");
  for(const marker of ["personal_support_messages_participants_read","personal_support_messages_participants_send","FORCE ROW LEVEL SECURITY","GRANT SELECT,INSERT","FROM PUBLIC,anon,authenticated,hh_app_inbox"])
    assert.ok(migration.includes(marker),marker);
  for(const term of ["seal","openSealed","assertNoRelayContacts","transaction","PERSONAL_SUPPORT_CONVERSATION_CLOSED","IDEMPOTENCY_CONFLICT","pg_advisory_xact_lock"])
    assert.ok(service.includes(term),term);
  assert.match(route,/requireSameOrigin/);
  assert.match(route,/auth\.verified/);
  assert.match(route,/PRIVATE_HEADERS/);
  assert.match(route,/consumeRate/);
  assert.match(client,/MonthlySupportThread/);
  assert.match(owner,/MonthlySupportThread/);
  assert.match(component,/data-monthly-support-messages/);
  assert.doesNotMatch(service+route+component,/wa\.me|t\.me|sendMessage\(|sendSms\(|sendEmail\(|analyticsEvent\(/);
});
