import assert from 'node:assert/strict'

// Attach before creating either page. Retain genuine errors from the synthetic
// sign-in document as well as the focused Reports document in the same context.
export function capturePortraitPageErrors(context, problems) {
  context.on('page', page => {
    page.on('pageerror', error => problems.push(String(error.message).slice(0, 250)))
  })
}

export async function freshPortraitReportPage({ context, landingPage, expect, origin }) {
  assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/,
    'portrait handoff is restricted to the isolated loopback fixture')
  assert.equal(landingPage.context(), context, 'retain the authenticated synthetic context')
  await expect(landingPage).toHaveURL(/\/en\/app\/(?:portrait|tests)(?:[?#]|$)/, { timeout: 90000 })
  await expect(landingPage.locator('.hh-mobile-app-nav')).toBeVisible({ timeout: 90000 })
  // Visibility alone may precede hydration. This flag comes from the real
  // ProfileDomains mount effect; do not replace it with a delay or fake auth.
  await expect(landingPage.locator('[data-profile-domains][data-profile-interactive="true"]'))
    .toBeVisible({ timeout: 90000 })

  // This suite explicitly loads Reports directly after real synthetic consent;
  // it is not the Cabinet landing-to-Reports navigation integration test.
  // Isolate late navigation in the old document without changing context,
  // injecting cookies, retrying goto, or ignoring navigation/page errors.
  const reportPage = await context.newPage()
  assert.notEqual(reportPage, landingPage, 'Reports needs a fresh document')
  assert.equal(reportPage.context(), context, 'Reports must use the same signed-in context')
  await landingPage.close()
  return reportPage
}
