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
