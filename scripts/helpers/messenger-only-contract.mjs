import assert from 'node:assert/strict'

// A customer-initiated messaging link is only a draft/navigation action.
// Verify real browser rendering without sending a provider message or creating
// a fake database receipt. This is distinct from signed CRM identity proof.
export async function assertMessengerOnlyCapture(scope,expect,{
  offer=null,locale=null,open=true,label='messenger-only contact',
}={}){
  const card=scope.locator('[data-messenger-only-contact]');
  await expect(card).toHaveCount(1);
  const details=card.locator('details');
  if(await details.count()){
    if(open && await details.getAttribute('open')===null)
      await details.locator(':scope > summary').click();
    if(open)await expect(details).toHaveAttribute('open','');
  }
  const w=card.locator('a[data-messenger-only-channel="whatsapp"]');
  const t=card.locator('a[data-messenger-only-channel="telegram"]');
  await expect(w).toHaveCount(1); await expect(t).toHaveCount(1);
  if(open){await expect(w).toBeVisible();await expect(t).toBeVisible();}
  const wa=new URL(await w.getAttribute('href'));
  const tg=new URL(await t.getAttribute('href'));
  assert.equal(wa.origin,'https://wa.me',label+' WhatsApp host');
  assert.equal(wa.pathname,'/14376066502',label+' verified public destination');
  assert.deepEqual([...wa.searchParams.keys()],['text'],label+' no contact/secret parameters');
  const draft=wa.searchParams.get('text')||'';
  assert.ok(draft.length>24,label+' descriptive public offer draft');
  if(offer)assert.ok(draft.includes(offer),label+' preserves selected offer '+offer);
  assert.equal(tg.origin,'https://t.me',label+' Telegram host');
  assert.ok(['/AndyTherapist','/holistichouse_bot'].includes(tg.pathname),
    label+' official/manual Telegram destination only');
  if(tg.pathname==='/holistichouse_bot'){
    assert.ok(locale&&['hhtalk_'+locale,'hhreview_'+locale].includes(tg.searchParams.get('start')),
      label+' correct signed first-party bot locale');
  }else{
    assert.deepEqual([...tg.searchParams.keys()],['text'],label+' no secret params');
    assert.equal(tg.searchParams.get('text'),draft,label+' same offer to both messengers');
  }
  for(const link of [w,t]){
    await expect(link).toHaveAttribute('target','_blank');
    await expect(link).toHaveAttribute('rel',/noopener/);
    await expect(link).toHaveAttribute('rel',/noreferrer/);
  }
  assert.equal(await card.locator('input[type="email"],input[type="tel"],form,button[type="submit"]').count(),0,
    label+' cannot submit by email/phone or fake CRM');
  assert.equal(await card.locator('[data-lead-saved], [data-booking-payment-options], [data-cart-order-saved]').count(),0,
    label+' cannot claim saved, booked or paid from an open link');
  assert.doesNotMatch(draft,/\b(?:test results|patient report|diagnosis|access_token|auth_token)\b/i);
  return {card,whatsapp:w,telegram:t,whatsappUrl:wa,telegramUrl:tg,draft};
}
