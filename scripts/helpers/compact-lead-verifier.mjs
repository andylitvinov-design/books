import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

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
    const consent = form.locator('input[type="checkbox"]')
    const originalConsent = await consent.elementHandle()
    const checkedBefore = await originalConsent.evaluate(node => node.checked)
    try {
      await consent.check()
    } catch (error) {
      // Preserve the failed normal pointer interaction. Do not force, synthesize
      // change events, retry the toggle or substitute a keyboard interaction.
      try {
        const geometry = await consent.evaluate(node => {
          const rect = node.getBoundingClientRect()
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return {
            pathname: location.pathname,
            checked: node.checked, connected: node.isConnected,
            bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY },
            visualViewport: window.visualViewport ? {
              height: visualViewport.height, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale,
            } : null,
            hit: hit ? { tag: hit.tagName, className: String(hit.className), isInput: hit === node,
              sameLabel: hit.closest('label') === node.closest('label') } : null,
            scrollBehavior: { html: getComputedStyle(document.documentElement).scrollBehavior,
              body: getComputedStyle(document.body).scrollBehavior },
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          }
        })
        geometry.checkedBefore = checkedBefore
        geometry.originalNodeAfter = await originalConsent.evaluate(node => ({
          checked: node.checked, connected: node.isConnected,
          isCurrentCheckbox: node === node.ownerDocument.querySelector('form[data-compact-lead-form] input[type="checkbox"]'),
        }))
        const directory = 'artifacts/app-r1/compact-lead-pointer'
        const stem = locale + '-' + sourcePath.replace(/[^a-z0-9-]+/gi, '-')
        await mkdir(directory, { recursive: true })
        await writeFile(directory + '/' + stem + '.json', JSON.stringify(geometry, null, 2))
        await page.screenshot({ path: directory + '/' + stem + '.png', fullPage: false })
        console.error('COMPACT_LEAD_POINTER_FAILURE', JSON.stringify(geometry))
      } catch (diagnosticError) {
        console.error('COMPACT_LEAD_POINTER_DIAGNOSTIC_FAILED', diagnosticError.message)
      }
      throw error
    } finally {
      await originalConsent.dispose().catch(() => {})
    }
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
