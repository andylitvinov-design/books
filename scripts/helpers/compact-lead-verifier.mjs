import assert from 'node:assert/strict'

// Browser-only fixture: intercept before the user action, never write a lead.
export async function assertCompactLeadRequest(page, capture, expect, { locale, serviceTitle }) {
  const sourcePath = new URL(page.url()).pathname
  const referenceCode = 'HH-CA5016DE79E4'
  const email = 'qa-compact@example.test'
  const submissions = []
  const intercept = async route => {
    assert.equal(route.request().method(), 'POST')
    submissions.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true, referenceCode }) })
  }
  await page.route('**/api/service-enquiries', intercept)
  try {
    await expect(capture).toBeVisible()
    const form = capture.locator('form[data-compact-lead-form]')
    await expect(form).toHaveCount(1)
    const submit = form.locator('button[type="submit"]')
    await expect(submit).toBeDisabled()
    await form.locator('input[name="contact"]').fill(email)
    await expect(submit).toBeDisabled()
    assert.equal(submissions.length, 0, 'No request before explicit consent and submission')
    await form.locator('input[type="checkbox"]').check()
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(capture.locator('[data-lead-saved][role="status"]')).toContainText(referenceCode)
    assert.equal(submissions.length, 1, 'Exactly one synthetic request')
    const body = submissions[0]
    assert.match(body.operationId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)
    assert.deepEqual({ ...body, operationId: undefined }, {
      operationId: undefined, serviceTitle, sourcePath, locale,
      contact: { displayName: '', email, phone: '' }, contactConsent: true, website: '',
    })
    await expect(form).toHaveCount(0)
    assert.equal(new URL(page.url()).pathname, sourcePath, 'Submission stays on the service page')
    assert.ok(!decodeURIComponent(page.url()).includes(email), 'Contact never enters the URL')
    await expect(capture.locator('a[href*="wa.me"],a[href*="t.me"]')).toHaveCount(0)
  } finally {
    await page.unroute('**/api/service-enquiries', intercept)
  }
}
