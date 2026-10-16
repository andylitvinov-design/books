import assert from 'node:assert/strict'

// Direct questionnaire checks run before their comprehensive saved-result
// verifier. Visit every selected panel so no interpretation or source is lost.
export async function readEveryAccountScale(report, expect, expectedKeys) {
  assert.ok(expectedKeys.length > 0, 'An account scale picker needs expected dimensions')
  assert.equal(new Set(expectedKeys).size, expectedKeys.length, 'Expected scale keys must be unique')
  const triggers = report.locator('[data-assessment-scale-trigger]')
  await expect(triggers).toHaveCount(expectedKeys.length)
  assert.deepEqual(await triggers.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-assessment-scale-trigger'))), expectedKeys, 'Exact ordered account scale picker')
  const texts = []
  for (const [index, key] of expectedKeys.entries()) {
    const trigger = triggers.nth(index)
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-controls', 'hh-assessment-scale-panel')
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-pressed', 'true')
    await expect(report.locator('[data-assessment-scale-trigger][aria-pressed="true"]')).toHaveCount(1)
    const panel = report.locator('article[data-active-scale]')
    await expect(report.locator('article')).toHaveCount(1)
    await expect(panel).toHaveCount(1)
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('id', 'hh-assessment-scale-panel')
    await expect(panel).toHaveAttribute('data-active-scale', key)
    for (const detail of await report.locator('details').all()) {
      if (await detail.getAttribute('open') === null) await detail.locator(':scope > summary').click()
      await expect(detail).toHaveAttribute('open', '')
    }
    texts.push(await report.innerText())
  }
  return texts.join('\n')
}
