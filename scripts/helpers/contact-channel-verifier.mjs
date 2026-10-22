import assert from 'node:assert/strict';

// Read and validate prepared links only: acceptance must never send an enquiry.
export async function assertPreparedContactChannels(chooser, expect) {
  await expect(chooser).toHaveCount(1);
  await expect(chooser.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'true');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
  const whatsapp = chooser.locator('a[data-contact-channel="whatsapp"]');
  const telegram = chooser.locator('a[data-contact-channel="telegram"]');
  const urls = [];
  for (const [link, host, path] of [[whatsapp, 'https://wa.me', '/14376066502'], [telegram, 'https://t.me', '/AndyTherapist']]) {
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toHaveAttribute('rel', /noreferrer/);
    const url = new URL(await link.getAttribute('href'));
    assert.equal(url.origin, host);
    assert.equal(url.pathname, path);
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.equal(url.hash, '');
    assert.deepEqual([...url.searchParams.keys()], ['text'], 'Only the prepared message belongs in the contact URL');
    assert.ok(url.searchParams.get('text')?.trim(), 'Prepared message must not be empty');
    urls.push(url);
  }
  assert.equal(urls[1].searchParams.get('text'), urls[0].searchParams.get('text'), 'Both channels must preserve the exact selected request');
  // Retrying assertions observe the committed open state after React effects.
  await expect(chooser.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'true');
  return { whatsapp, telegram, whatsappUrl: urls[0], telegramUrl: urls[1] };
}

export async function openContactChannelChooser(scope, expect) {
  const chooser = scope.locator('[data-contact-channel-chooser]');
  await expect(chooser).toHaveCount(1);
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(trigger).toHaveCount(1);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
  for (const channel of ['whatsapp', 'telegram']) {
    const link = chooser.locator('a[data-contact-channel="' + channel + '"]');
    await expect(link).toHaveCount(1);
    await expect(link).toBeHidden();
  }
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await assertPreparedContactChannels(chooser, expect);
  return chooser;
}

/**
 * Verify the REAL public two-stage flow against a hydrated local Next server.
 * Mock only the POST response to avoid writing fake contacts into Supabase.
 * A messenger link cannot exist until an explicitly consented enquiry is saved.
 */
export async function openRegisteredContactChannelChooser(scope, expect, page) {
  const chooser = scope.locator('[data-contact-channel-chooser]');
  await expect(chooser).toHaveCount(1);
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(trigger).toHaveCount(1);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  const submissions = [];
  await page.route('**/api/service-enquiries', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status:201, contentType:'application/json',
      body:JSON.stringify({saved:true,referenceCode:'HH-ABCD1234EF56'}) });
  });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  const form = chooser.locator('form');
  await expect(form).toBeVisible();
  const submit = form.locator('button[type="submit"]');
  await expect(submit).toBeDisabled();
  await form.locator('input[autocomplete="name"]').fill('Public QA Visitor');
  await form.locator('input[autocomplete="email"]').fill('enquiry-qa@example.test');
  await expect(submit).toBeDisabled();
  await form.locator('input[type="checkbox"]').check();
  await submit.click();
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
  assert.equal(submissions.length,1,'Exactly one explicitly consented synthetic registration');
  const data=submissions[0];
  assert.equal(data.contact.displayName,'Public QA Visitor');
  assert.equal(data.contact.email,'enquiry-qa@example.test');
  assert.equal(data.contactConsent,true);
  assert.equal(data.description,'','Optional personal note must not be required');
  assert.ok(data.serviceTitle && typeof data.serviceTitle==='string');
  assert.ok(data.operationId && /^[a-f0-9-]{36}$/i.test(data.operationId));
  assert.equal(data.website,'');
  const prepared = await assertPreparedContactChannels(chooser,expect);
  assert.doesNotMatch(prepared.whatsappUrl.searchParams.get('text')||'',
    /Public QA Visitor|enquiry-qa@example\.test/,'No synthetic contact data in a messenger URL');
  assert.match(prepared.whatsappUrl.searchParams.get('text')||'',/HH-ABCD1234EF56/);
  return chooser;
}
