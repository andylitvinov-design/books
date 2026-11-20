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
  const telegramHref=await t.getAttribute('href');
  let tg, handoffService=null, handoffUnavailable=false;
  // Public Services may use an internal, server-validated 307 handoff so that
  // visitors reach a verified bot when the human Business chat is not ready.
  // Resolve that exact same-origin route and inspect its real redirect WITHOUT
  // following it or contacting Telegram. Never waive destination assertions.
  if(telegramHref?.startsWith('/api/public/telegram-service-entry?')){
    assert.ok(locale&&['en','ru','es'].includes(locale),label+' handoff needs a valid locale');
    const origin=process.env.HH_PUBLIC_QA_ORIGIN||'http://127.0.0.1:3100';
    const handoff=new URL(telegramHref,origin);
    assert.equal(handoff.origin,new URL(origin).origin,label+' handoff must be same-origin');
    assert.equal(handoff.pathname,'/api/public/telegram-service-entry',label+' exact public handoff');
    assert.equal(handoff.pathname+handoff.search,telegramHref,label+' no hidden URL fragments');
    const keys=[...handoff.searchParams.keys()].sort();
    assert.deepEqual(keys,handoff.searchParams.has('offer')
      ?['locale','offer','service']:['locale','service'],label+' bounded public handoff parameters');
    handoffService=handoff.searchParams.get('service');
    assert.ok(['homeopathy','coaching','reiki','constellations','business'].includes(handoffService),
      label+' only published request types');
    assert.equal(handoff.searchParams.get('locale'),locale,label+' locale preserved');
    assert.ok(!handoff.searchParams.has('offer')||
      (handoffService==='business'&&handoff.searchParams.get('offer')==='business_strategy'),
      label+' only the approved business-page offer');
    const response=await fetch(handoff.href,{redirect:'manual'});
    assert.match(response.headers.get('cache-control')||'',/no-store/i,
      label+' customer-facing handoff must not be cached');
    if(response.status===503){
      // A keyless bot without verified transport is deliberately unavailable.
      // Verify a truthful no-submission response; never pretend a redirect worked.
      assert.equal(response.headers.get('location'),null,
        label+' unavailable bot cannot redirect to a different human chat');
      assert.equal(response.headers.get('retry-after'),'60',
        label+' temporary unavailability must be retryable');
      assert.match(response.headers.get('content-type')||'',/text\/plain/i,
        label+' unavailability is a plain status, not a provider message');
      const notice=(await response.text()).trim();
      assert.match(notice,locale==='ru'?/Заявка не отправлена/:
        locale==='es'?/No se envió ninguna solicitud/:/No request was submitted/,
        label+' no unverified order/CRM receipt when bot is unavailable');
      handoffUnavailable=true;
    }else{
      assert.equal(response.status,307,label+' verified bot must use an explicit temporary redirect');
      tg=new URL(response.headers.get('location'));
    }
  }else{
    tg=new URL(telegramHref);
  }
  assert.equal(wa.origin,'https://wa.me',label+' WhatsApp host');
  assert.equal(wa.pathname,'/14376066502',label+' verified public destination');
  assert.deepEqual([...wa.searchParams.keys()],['text'],label+' no contact/secret parameters');
  const draft=wa.searchParams.get('text')||'';
  assert.ok(draft.length>24,label+' descriptive public offer draft');
  if(offer)assert.ok(draft.includes(offer),label+' preserves selected offer '+offer);
  if(!handoffUnavailable){
  assert.equal(tg.origin,'https://t.me',label+' Telegram host');
  assert.ok(['/holistichouse','/holistichouse_bot'].includes(tg.pathname),
    label+' approved human Telegram Business or explicitly opted-in bot only');
  if(tg.pathname==='/holistichouse_bot'){
    assert.deepEqual([...tg.searchParams.keys()],['start'],label+' bot start only, no private fields');
    if(handoffService){
      assert.equal(tg.searchParams.get('start'),'hhservice_'+handoffService+'_'+locale,
        label+' verified service bot handoff, no private questions or CRM receipt');
    }else{
      assert.ok(locale&&['hhtalk_'+locale,'hhreview_'+locale].includes(tg.searchParams.get('start')),
        label+' explicit diagnostic bot locale');
    }
  }else{
    assert.deepEqual([...tg.searchParams.keys()],['text'],label+' no secret params');
    const telegramDraft=tg.searchParams.get('text')||'';
    assert.ok(telegramDraft.length>=12&&telegramDraft.length<=320,label+' public selected service title');
    assert.doesNotMatch(telegramDraft,/(?:Reference|Context|Topic|Page|Контекст|Страница|Тема|Solicitud|Contexto):|access_token|auth_token|private=|https?:\/\//iu,
      label+' no WhatsApp private context, references or URL copied to Telegram');
    assert.notEqual(telegramDraft,draft,label+' no full WhatsApp text copied to Telegram');
  }
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
  return {card,whatsapp:w,telegram:t,whatsappUrl:wa,telegramUrl:tg??null,
    handoffUnavailable,draft};
}
