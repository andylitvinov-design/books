import assert from 'node:assert/strict'
import { createFreeReviewViewportIsolation } from './free-review-viewport-isolation.mjs'

// Current account Profile deliberately omits the legacy four-domain panels.
// The separate legacy journey retains all four privacy-safe service enquiries.
export async function verifyAccountProfileOffers(page, expect, { origin, browser, locale = 'en' }) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/)
  assert.ok(['en', 'ru'].includes(locale))
  await expect(page).toHaveURL(origin + '/' + locale + '/app/portrait')
  const profile = page.locator('[data-profile-domains][data-profile-mode="account"][data-profile-interactive="true"]')
  await expect(profile).toHaveCount(1)
  await expect(profile).toBeVisible()
  await expect(profile.locator('.hh-domain-more, .hh-domain-tabs, .hh-domain-support, [data-profile-service-cta]')).toHaveCount(0)
  await expect(profile.locator('[data-profile-report-archive]')).toBeVisible()
  const consultation = profile.locator('[data-profile-free-consultation] a[data-consultation-kind="free-options"]')
  await expect(consultation).toHaveCount(1)
  await expect(consultation).toBeVisible()
  const path = '/' + locale + '/services/free-consultation'
  await expect(consultation).toHaveAttribute('href', path)
  const href = await consultation.getAttribute('href')
  assert.equal(href, path)
  const destination = new URL(href, origin)
  assert.equal(destination.origin, origin)
  assert.equal(destination.search, '')
  assert.equal(destination.hash, '')
  const labs = profile.locator('[data-health-labs-link]')
  await expect(labs).toBeVisible()
  await expect(labs).toHaveAttribute('href', '/' + locale + '/app/labs')
  await expect(profile.locator('[data-testid="reports-development-program"]')).toBeVisible()

  // This is destination href-follow in a separate anonymous read-only context,
  // NOT proof of same-tab signed-in navigation. No form or contact action runs.
  // Reuse the unchanged exact-document boundary: API, writes and providers denied.
  const isolated = await createFreeReviewViewportIsolation(browser, {
    origin, locale, viewport: { width: 390, height: 844 }, mobile: false,
  })
  let failure, failed = false
  try {
    await isolated.page.goto(destination.href)
    await expect(isolated.page).toHaveURL(destination.href)
    const hub = isolated.page.locator('[data-free-consultation-hub]')
    await expect(hub).toHaveCount(1)
    await expect(hub).toBeVisible()
    const options = hub.locator('[data-free-diagnosis-options][data-free-diagnosis-layout="full"]')
    await expect(options).toHaveCount(1)
    await expect(options).toBeVisible()
    await expect(options.locator('article[data-diagnosis-offer]')).toHaveCount(3)
    for (const id of ['situation-written-free', 'wu-xing-free', 'personal-session-30-eur50']) {
      const offer = options.locator('article[data-diagnosis-offer="' + id + '"]')
      await expect(offer).toHaveCount(1)
      await expect(offer).toBeVisible()
      await expect(offer.locator('button[data-diagnosis-order="' + id + '"]')).toBeVisible()
    }
    await expect(options.locator('[data-diagnosis-order-form]')).toHaveAttribute('data-open', 'false')
    await expect(options.getByRole('dialog')).toHaveCount(0)
    await isolated.assertClean()
  } catch (error) {
    failure = error
    failed = true
  }
  try { await isolated.close() } catch (error) {
    if (!failed) { failure = error; failed = true }
  }
  if (failed) throw failure
}
