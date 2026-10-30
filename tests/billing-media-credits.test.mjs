import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WELCOME_BONUS_MINOR, MEDIA_CREDIT_OFFERS, MEDIA_TOPUP_PACKS, mediaOffer } from "../lib/mandala/media-credit-catalog.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("welcome credit and server price catalog are immutable USD cents",()=>{
  assert.equal(WELCOME_BONUS_MINOR,200);
  assert.deepEqual(MEDIA_CREDIT_OFFERS.map(x=>[x.sku,x.minor,x.available]),[
    ["video-basic",0,true],["video-smart",200,false],["video-pro",990,false],
    ["audio-basic",0,true],["audio-smart",50,false],["audio-pro",150,false],
  ]);
  assert.deepEqual(MEDIA_TOPUP_PACKS,[500,1000,2000]);
  assert.equal(mediaOffer("video-smart")?.minor,200);
  assert.equal(mediaOffer("nonexistent"),null);
});
test("bonus grant is one-time and ledger / spending are serialized by database row locks",()=>{
  const src=read("lib/mandala/media-credit-wallet.js");
  assert.match(src,/insert into app_private\.media_credit_wallets\(account_id\).*on conflict do nothing/);
  assert.match(src,/if \(created\.rowCount\)/);
  assert.match(src,/welcome:\s*"\+id|\"welcome:\"\+id/);
  assert.match(src,/wallets where account_id=\$1 for update/);
  assert.match(src,/topups where id=\$1 for update/);
  assert.match(src,/media_credit_jobs where account_id=\$1 and operation_id=\$2/);
  assert.match(src,/CREDIT_INSUFFICIENT_BALANCE/);
  assert.match(src,/bonus_minor=bonus_minor-\$2,paid_minor=paid_minor-\$3/);
  assert.match(src,/bonus_minor=bonus_minor\+\$2,paid_minor=paid_minor\+\$3/);
  assert.match(src,/CREDIT_JOB_PROOF_MISSING/);
});
test("paid operations stay inaccessible until verified provider + merchant approval",()=>{
  const provider=read("lib/mandala/media-credit-payments.js");
  const api=read("app/api/app/media-credits/checkout/route.js");
  assert.match(provider,/HH_MEDIA_CREDITS_PAYMENTS_ENABLED/);
  assert.match(provider,/HH_MEDIA_CREDITS_TAX_REVIEW_APPROVED/);
  assert.match(provider,/HH_MEDIA_CREDITS_REFUND_REVIEW_APPROVED/);
  assert.match(provider,/HH_MEDIA_CREDITS_PRODUCTION_APPROVED/);
  assert.match(provider,/HH_MEDIA_STRIPE_WEBHOOK_SECRET/);
  assert.match(provider,/HH_MEDIA_PAYPAL_WEBHOOK_ID/);
  assert.match(api,/requireSameOrigin/);
  assert.match(api,/createRequestAuth/);
  assert.match(api,/consumeRate/);
  assert.match(api,/createCreditTopup/);
  assert.match(api,/createMediaCreditCheckout/);
  assert.match(provider,/payment_status!=="paid"/);
  assert.match(provider,/verify-webhook-signature/);
});
test("private SQL wallet enforces RLS, exact prices and payment proof",()=>{
  const sql=read("supabase/migrations/20261030060000_hh_media_credit_wallet.sql");
  for(const table of ["media_credit_wallets","media_credit_ledger","media_credit_jobs","media_credit_topups"]){
    assert.match(sql,new RegExp("create table app_private[.]"+table));
    assert.match(sql,new RegExp("alter table app_private[.]"+table+" enable row level security"));
    assert.match(sql,new RegExp("alter table app_private[.]"+table+" force row level security"));
  }
  assert.match(sql,/revoke all on app_private\.media_credit_wallets.*authenticated,hh_app_inbox/s);
  assert.match(sql,/hh\.media_payment_verified/);
  assert.match(sql,/MEDIA_CREDIT_PAYMENT_PROOF_REQUIRED/);
  assert.match(sql,/unique\(account_id,operation_id\)/);
  assert.match(sql,/paid_minor integer not null default 0/);
  assert.match(sql,/debt_minor integer not null default 0/);
});
test("real money is not spent by local free video or guest UI",()=>{
  const page=read("app/[locale]/holistic-support/mandala/page.tsx");
  const widget=read("components/mandala-credit-wallet.tsx");
  const jobs=read("lib/mandala/media-credit-wallet.js");
  assert.match(page,/<MandalaCreditWallet locale=\{locale\}/);
  assert.match(page,/<MandalaMeditationClient locale=\{locale\}/);
  assert.match(widget,/\/api\/app\/media-credits/);
  assert.match(widget,/wallet\?\.authenticated/);
  assert.match(widget,/wallet\.payments\.card/);
  assert.match(widget,/wallet\.payments\.paypal/);
  assert.match(widget,/credits=paypal|status==="paypal"/);
  assert.doesNotMatch(widget,/reserveMediaCreditJob|finishMediaCreditJob/);
  assert.match(jobs,/export async function reserveMediaCreditJob/);
  assert.match(jobs,/export async function finishMediaCreditJob/);
});
