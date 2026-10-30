import "server-only";
import Stripe from "stripe";
import { AppError } from "../assessments/contracts.js";

const error = (code="CREDIT_PROVIDER_UNAVAILABLE", status=503) => { throw new AppError(code,status); };
const money = minor => (minor/100).toFixed(2);
const expectedLive = env => (env.HH_MEDIA_CREDITS_ENVIRONMENT||"sandbox")==="live";
const merchantEnabled = env =>
  env.HH_MEDIA_CREDITS_ENABLED==="true" &&
  env.HH_MEDIA_CREDITS_PAYMENTS_ENABLED==="true" &&
  env.HH_MEDIA_CREDITS_TAX_REVIEW_APPROVED==="true" &&
  env.HH_MEDIA_CREDITS_REFUND_REVIEW_APPROVED==="true" &&
  (env.VERCEL_ENV!=="production" ||
    (env.HH_MEDIA_CREDITS_PRODUCTION_APPROVED==="true" && expectedLive(env)));

export function mediaCreditPaymentAvailability(env=process.env) {
  const live=expectedLive(env), gate=merchantEnabled(env);
  const stripeKey=env.HH_MEDIA_STRIPE_SECRET_KEY||"";
  const stripe=gate && new RegExp("^([rs]k)_"+(live?"live":"test")+"_").test(stripeKey) &&
    /^acct_[a-zA-Z0-9]+$/.test(env.HH_MEDIA_STRIPE_ACCOUNT_ID||"") &&
    /^whsec_[a-zA-Z0-9]+$/.test(env.HH_MEDIA_STRIPE_WEBHOOK_SECRET||"");
  const paypal=gate && (env.HH_MEDIA_PAYPAL_CLIENT_ID||"").length>=12 &&
    (env.HH_MEDIA_PAYPAL_CLIENT_SECRET||"").length>=12 &&
    /^[A-Z0-9]{8,30}$/.test(env.HH_MEDIA_PAYPAL_MERCHANT_ID||"") &&
    /^WH-[a-zA-Z0-9-]{8,100}$/.test(env.HH_MEDIA_PAYPAL_WEBHOOK_ID||"");
  return {card:Boolean(stripe),paypal:Boolean(paypal),currency:"USD"};
}
export function mediaCreditProviderConfig(provider,env=process.env) {
  const availability=mediaCreditPaymentAvailability(env);
  if(provider!=="stripe"&&provider!=="paypal") error("CREDIT_PROVIDER_INVALID",400);
  if(!(provider==="stripe"?availability.card:availability.paypal)) error();
  return {provider, environment:expectedLive(env)?"live":"sandbox",
    ...(provider==="stripe" ?
      {key:env.HH_MEDIA_STRIPE_SECRET_KEY,accountId:env.HH_MEDIA_STRIPE_ACCOUNT_ID,
        webhookSecret:env.HH_MEDIA_STRIPE_WEBHOOK_SECRET} :
      {clientId:env.HH_MEDIA_PAYPAL_CLIENT_ID,clientSecret:env.HH_MEDIA_PAYPAL_CLIENT_SECRET,
        merchantId:env.HH_MEDIA_PAYPAL_MERCHANT_ID,webhookId:env.HH_MEDIA_PAYPAL_WEBHOOK_ID})};
}
const stripeClient = cfg => new Stripe(cfg.key,{maxNetworkRetries:1,timeout:12000});
async function verifiedStripe(cfg) {
  const client=stripeClient(cfg);
  const account=await client.accounts.retrieve();
  if(account.id!==cfg.accountId) error("CREDIT_MERCHANT_MISMATCH");
  return client;
}
const isStripeId = s => typeof s==="string"&&/^cs_(?:test_|live_)[A-Za-z0-9]+$/.test(s);
const isStripeIntent = s => typeof s==="string"&&/^pi_[A-Za-z0-9]+$/.test(s);
function stripeCheckoutUrl(value) {
  let url;try{url=new URL(value);}catch{error("CREDIT_CHECKOUT_URL_INVALID");}
  if(url.protocol!=="https:"||url.hostname!=="checkout.stripe.com"||
     url.username||url.password||url.port) error("CREDIT_CHECKOUT_URL_INVALID");
  return url.href;
}
function validateStripeSession(s,order,cfg) {
  if(!isStripeId(s?.id)||s.livemode!==(cfg.environment==="live")||
     s.mode!=="payment"||s.currency!=="usd"||s.amount_total!==order.amount_minor||
     s.client_reference_id!==order.id||s.metadata?.creditTopupId!==order.id||
     s.metadata?.creditAccountId!==order.account_id) error("CREDIT_PAYMENT_MISMATCH");
}
const paypalHost = cfg => cfg.environment==="live"?"https://api-m.paypal.com":"https://api-m.sandbox.paypal.com";
function paypalApproveUrl(links,cfg) {
  const link=(links||[]).find(x=>x.rel==="payer-action"||x.rel==="approve");
  let url;try{url=new URL(link?.href);}catch{error("CREDIT_CHECKOUT_URL_INVALID");}
  const host=cfg.environment==="live"?"www.paypal.com":"www.sandbox.paypal.com";
  if(url.protocol!=="https:"||url.hostname!==host||url.pathname!=="/checkoutnow"||
     url.port||url.username||url.password) error("CREDIT_CHECKOUT_URL_INVALID");
  return url.href;
}
const validPaypalId = id => typeof id==="string"&&/^[A-Za-z0-9_-]{8,100}$/.test(id);
async function paypalToken(cfg) {
  const key=Buffer.from(cfg.clientId+":"+cfg.clientSecret).toString("base64");
  const res=await fetch(paypalHost(cfg)+"/v1/oauth2/token",{
    method:"POST",headers:{Authorization:"Basic "+key,"Content-Type":"application/x-www-form-urlencoded"},
    body:"grant_type=client_credentials",cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!res.ok) error();
  const data=await res.json();
  if(!data.access_token||data.token_type?.toLowerCase()!=="bearer") error();
  return data.access_token;
}
async function paypalRequest(cfg,method,path,{body,requestId}={}) {
  const token=await paypalToken(cfg);
  const res=await fetch(paypalHost(cfg)+path,{
    method,headers:{Authorization:"Bearer "+token,Accept:"application/json",
      "Content-Type":"application/json",...(requestId?{"PayPal-Request-Id":requestId}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!res.ok) error();
  return res.status===204?{}:await res.json();
}
function verifyPaypalOrder(remote,order,cfg,{completed=false}={}) {
  const unit=remote?.purchase_units?.length===1?remote.purchase_units[0]:null;
  if(!validPaypalId(remote?.id)||remote.intent!=="CAPTURE"||!unit||
     remote.id!==order.provider_checkout_id && order.provider_checkout_id ||
     unit.reference_id!==order.id||unit.custom_id!==order.account_id||
     unit.invoice_id!=="HH-MEDIA-"+order.id||
     unit.payee?.merchant_id!==cfg.merchantId||
     unit.amount?.currency_code!=="USD"||unit.amount?.value!==money(order.amount_minor)||
     (completed&&remote.status!=="COMPLETED")) error("CREDIT_PAYMENT_MISMATCH");
  return unit;
}
export async function createMediaCreditCheckout(cfg,order,origin) {
  const returnUrl=origin+"/"+order.locale+"/holistic-support/mandala";
  if(cfg.provider==="stripe") {
    const stripe=await verifiedStripe(cfg);
    if(order.provider_checkout_id){
      if(!isStripeId(order.provider_checkout_id)) error("CREDIT_PAYMENT_MISMATCH");
      const existing=await stripe.checkout.sessions.retrieve(order.provider_checkout_id);
      validateStripeSession(existing,order,cfg);
      if(existing.status!=="open") error("CREDIT_CHECKOUT_EXPIRED",409);
      return {id:existing.id,url:stripeCheckoutUrl(existing.url)};
    }
    const s=await stripe.checkout.sessions.create({
      mode:"payment",payment_method_types:["card"],client_reference_id:order.id,
      line_items:[{price_data:{currency:"usd",unit_amount:order.amount_minor,
        product_data:{name:"Holistic House · personal media credits"}},quantity:1}],
      metadata:{creditTopupId:order.id,creditAccountId:order.account_id},
      payment_intent_data:{metadata:{creditTopupId:order.id,creditAccountId:order.account_id}},
      success_url:returnUrl+"?credits=success&topup="+order.id,
      cancel_url:returnUrl+"?credits=cancelled",
    },{idempotencyKey:"hh-media-topup-"+order.id});
    validateStripeSession(s,order,cfg);
    return {id:s.id,url:stripeCheckoutUrl(s.url)};
  }
  if(order.provider_checkout_id){
    const remote=await paypalRequest(cfg,"GET","/v2/checkout/orders/"+encodeURIComponent(order.provider_checkout_id));
    verifyPaypalOrder(remote,order,cfg);
    if(!["CREATED","APPROVED","PAYER_ACTION_REQUIRED"].includes(remote.status))
      error("CREDIT_CHECKOUT_EXPIRED",409);
    return {id:remote.id,url:paypalApproveUrl(remote.links,cfg)};
  }
  const body={intent:"CAPTURE",purchase_units:[{
    reference_id:order.id,custom_id:order.account_id,invoice_id:"HH-MEDIA-"+order.id,
    amount:{currency_code:"USD",value:money(order.amount_minor)},
  }],payment_source:{paypal:{experience_context:{
    brand_name:"Holistic House",shipping_preference:"NO_SHIPPING",user_action:"PAY_NOW",
    return_url:returnUrl+"?credits=paypal&topup="+order.id,
    cancel_url:returnUrl+"?credits=cancelled",
  }}}};
  const created=await paypalRequest(cfg,"POST","/v2/checkout/orders",{
    body,requestId:"hh-media-create-"+order.id});
  if(!validPaypalId(created.id)) error();
  const remote=await paypalRequest(cfg,"GET","/v2/checkout/orders/"+encodeURIComponent(created.id));
  verifyPaypalOrder(remote,{...order,provider_checkout_id:created.id},cfg);
  return {id:created.id,url:paypalApproveUrl(created.links?.length?created.links:remote.links,cfg)};
}
export async function verifyMediaStripeCheckout(cfg,sessionId) {
  if(!isStripeId(sessionId)) error("CREDIT_PAYMENT_MISMATCH");
  const stripe=await verifiedStripe(cfg),s=await stripe.checkout.sessions.retrieve(sessionId);
  if(!s?.metadata?.creditTopupId) error("CREDIT_PAYMENT_MISMATCH");
  const topupId=s.metadata.creditTopupId;
  const order={id:topupId,account_id:s.metadata.creditAccountId,amount_minor:s.amount_total};
  validateStripeSession(s,order,cfg);
  if(s.payment_status!=="paid"||!isStripeIntent(s.payment_intent)) error("CREDIT_PAYMENT_UNCONFIRMED",409);
  const intent=await stripe.paymentIntents.retrieve(s.payment_intent);
  if(intent.livemode!==(cfg.environment==="live")||intent.status!=="succeeded"||
     intent.currency!=="usd"||intent.amount_received!==s.amount_total||
     intent.metadata?.creditTopupId!==topupId||
     intent.metadata?.creditAccountId!==s.metadata.creditAccountId)
    error("CREDIT_PAYMENT_MISMATCH");
  return {topupId,provider:"stripe",environment:cfg.environment,amountMinor:s.amount_total,
    checkoutId:s.id,captureId:intent.id};
}
export async function verifyStripeMediaEvent(cfg,raw,signature) {
  if(!signature||raw.length>262144) error("CREDIT_WEBHOOK_INVALID",400);
  const stripe=await verifiedStripe(cfg);
  let event;try{event=stripe.webhooks.constructEvent(raw,signature,cfg.webhookSecret);}
  catch{error("CREDIT_WEBHOOK_SIGNATURE_INVALID",403);}
  if(event.livemode!==(cfg.environment==="live")) error("CREDIT_PAYMENT_MISMATCH");
  if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)){
    const sessionId=event.data?.object?.id;
    return {action:"credit",proof:await verifyMediaStripeCheckout(cfg,sessionId)};
  }
  if(["charge.refunded","charge.dispute.created"].includes(event.type)){
    const chargeId=event.data?.object?.id;
    if(!/^ch_[A-Za-z0-9]+$/.test(chargeId||"")) error("CREDIT_PAYMENT_MISMATCH");
    const charge=await stripe.charges.retrieve(chargeId);
    if(charge.livemode!==(cfg.environment==="live")||
       !isStripeIntent(charge.payment_intent)||
       (event.type==="charge.refunded"&&!charge.refunded)) error("CREDIT_PAYMENT_MISMATCH");
    const pi=await stripe.paymentIntents.retrieve(charge.payment_intent);
    if(!pi.metadata?.creditTopupId||pi.status!=="succeeded") error("CREDIT_PAYMENT_MISMATCH");
    // Partial refunds require manual fraud / liability reconciliation, never a fake full reversal.
    if(event.type==="charge.refunded"&&charge.amount_refunded!==charge.amount)
      return {action:"review",topupId:pi.metadata.creditTopupId};
    return {action:"reverse",proof:{topupId:pi.metadata.creditTopupId,provider:"stripe",captureId:pi.id}};
  }
  return {action:"ignore"};
}
export async function captureVerifiedMediaPaypal(cfg,order) {
  if(!validPaypalId(order.provider_checkout_id)) error("CREDIT_PAYMENT_MISMATCH");
  const path="/v2/checkout/orders/"+encodeURIComponent(order.provider_checkout_id);
  let remote=await paypalRequest(cfg,"GET",path);
  verifyPaypalOrder(remote,order,cfg);
  if(remote.status==="APPROVED"){
    await paypalRequest(cfg,"POST",path+"/capture",{requestId:"hh-media-capture-"+order.id});
    remote=await paypalRequest(cfg,"GET",path);
  }
  const unit=verifyPaypalOrder(remote,order,cfg,{completed:true});
  const captures=unit.payments?.captures;
  if(!Array.isArray(captures)||captures.length!==1||captures[0].status!=="COMPLETED"||
     captures[0].amount?.currency_code!=="USD"||
     captures[0].amount?.value!==money(order.amount_minor)||
     !validPaypalId(captures[0].id)) error("CREDIT_PAYMENT_MISMATCH");
  return {topupId:order.id,provider:"paypal",environment:cfg.environment,
    amountMinor:order.amount_minor,checkoutId:remote.id,captureId:captures[0].id};
}
export async function verifyPaypalMediaEvent(cfg,event,headers) {
  if(!event||typeof event!=="object") error("CREDIT_WEBHOOK_INVALID",400);
  const h=name=>headers.get(name);
  const verified=await paypalRequest(cfg,"POST","/v1/notifications/verify-webhook-signature",{
    body:{transmission_id:h("paypal-transmission-id"),transmission_time:h("paypal-transmission-time"),
      cert_url:h("paypal-cert-url"),auth_algo:h("paypal-auth-algo"),
      transmission_sig:h("paypal-transmission-sig"),webhook_id:cfg.webhookId,webhook_event:event},
  });
  if(verified.verification_status!=="SUCCESS") error("CREDIT_WEBHOOK_SIGNATURE_INVALID",403);
  if(event.event_type==="PAYMENT.CAPTURE.COMPLETED"){
    const orderId=event.resource?.supplementary_data?.related_ids?.order_id;
    if(!validPaypalId(orderId)) error("CREDIT_PAYMENT_MISMATCH");
    const remote=await paypalRequest(cfg,"GET","/v2/checkout/orders/"+encodeURIComponent(orderId));
    const unit=remote.purchase_units?.[0];
    const topupId=unit?.reference_id;
    if(typeof topupId!=="string") error("CREDIT_PAYMENT_MISMATCH");
    const order={id:topupId,account_id:unit.custom_id,amount_minor:Math.round(Number(unit.amount?.value)*100),provider_checkout_id:orderId};
    return {action:"credit",proof:await captureVerifiedMediaPaypal(cfg,order)};
  }
  return {action:"ignore"};
}
