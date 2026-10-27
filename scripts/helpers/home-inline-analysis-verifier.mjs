import assert from 'node:assert/strict';

// The final analysis choice is an inline, consent-gated action, not navigation.
// The separate seven-stage review link retains the localized service destination.
export async function verifyHomeInlineAnalysis(page, expect, locale) {
  assert.ok(locale === 'en' || locale === 'ru');
  const capture = page.locator('[data-home-contact-capture] [data-home-free-capture]');
  await expect(capture).toHaveCount(1);
  await expect(capture).toHaveAttribute('lang', locale);
  const option = capture.locator('button[data-home-free-option="analysis"]');
  await expect(option).toBeVisible();
  await option.click();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  const chooser = capture.locator('[data-contact-channel-chooser][data-compact-phone-trigger="true"]');
  await expect(chooser).toHaveCount(1);
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(trigger).toHaveCount(1);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveText(locale === 'ru' ? 'Получить бесплатный личный разбор' : 'Get my free personal analysis');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const panelId = await trigger.getAttribute('aria-controls');
  assert.ok(panelId, 'The inline action controls its own request panel');
  const panel = chooser.locator('[id="' + panelId + '"]');
  await expect(panel).toHaveCount(1);
  await expect(panel).toBeHidden();
  const before = page.url();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  const phone = panel.locator('input[type="tel"]');
  await expect(phone).toHaveCount(1);
  await expect(phone).toBeVisible();
  await expect(phone).toHaveValue('');
  const consent = panel.locator('input[type="checkbox"]');
  await expect(consent).toHaveCount(1);
  await expect(consent).not.toBeChecked();
  await expect(chooser.getByRole('status')).toHaveCount(0);
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  await expect(page).toHaveURL(before);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  const review = page.locator('[data-home-featured-workspace] a[data-home-offer-primary="review"]');
  await expect(review).toHaveCount(1);
  await expect(review).toHaveAttribute('href', '/' + locale + '/services/free-situation-review');
  await expect(review).toBeVisible();
  await expect(page).toHaveURL(before);
  return { trigger, review };
}
