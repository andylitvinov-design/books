import assert from 'node:assert/strict'

// Self-contained browser read. No account text, native popup contents or inputs
// outside the synthetic report are captured.
export function readScaleJumpLayout() {
  const report = document.querySelector('[data-personal-result-report]')
  const select = report?.querySelector('[data-assessment-scale-picker] select')
  const label = select?.closest('label')
  const box = node => {
    if (!node) return null
    const rect = node.getBoundingClientRect()
    return { left: rect.left, right: rect.right, width: rect.width,
      clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }
  }
  return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth, label: box(label), select: box(select) }
}

export function assertScaleJumpLayout(layout) {
  assert.ok(Number.isFinite(layout.viewportWidth) && layout.viewportWidth > 0, 'Valid viewport width')
  assert.ok(layout.documentWidth <= layout.viewportWidth + 1, 'Document must not overflow: ' + JSON.stringify(layout))
  assert.ok(layout.bodyWidth <= layout.viewportWidth + 1, 'Body must not overflow: ' + JSON.stringify(layout))
  for (const name of ['label', 'select']) {
    const box = layout[name]
    assert.ok(box && Number.isFinite(box.width) && box.width > 0, name + ' must have a visible box')
    assert.ok(box.left >= -1 && box.right <= layout.viewportWidth + 1, name + ' must fit the viewport')
  }
  assert.ok(layout.label.scrollWidth <= layout.label.clientWidth + 1, 'Jump label must not leak native option width: ' + JSON.stringify(layout))
  assert.ok(layout.select.left >= layout.label.left - 1 && layout.select.right <= layout.label.right + 1, 'Native select must fit its label')
}

// Exercise the actual native select, not only the alternate horizontal buttons.
// Keep every native option and the full selected title/limitations reachable.
export async function assertAccountScaleJumpLayout(page, expect, sections, { screenshotPrefix } = {}) {
  assert.ok(sections.length > 6, 'Jump-control fixture needs more than six scales')
  const keys = sections.map(section => section.key)
  assert.equal(new Set(keys).size, keys.length, 'Every expected scale must be unique')
  const report = page.locator('[data-personal-result-report]')
  const select = report.locator('[data-assessment-scale-picker] select')
  await expect(select).toHaveCount(1)
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, label: node.textContent })))
  assert.deepEqual(options, sections.map((section, index) => ({ value: String(index), label: section.construct || section.title })), 'Every complete native option must be available in source order')
  const originalViewport = page.viewportSize()
  assert.ok(originalViewport, 'Browser fixture must have a fixed viewport')
  const layouts = []
  try {
    for (const width of [320, 390]) {
      await page.setViewportSize({ ...originalViewport, width })
      for (const [index, section] of sections.entries()) {
        await select.selectOption(String(index))
        await expect(select).toHaveValue(String(index))
        const panel = report.locator('article[data-active-scale]')
        await expect(panel).toHaveCount(1)
        await expect(panel).toHaveAttribute('data-active-scale', section.key)
        const selected = report.locator('[data-assessment-scale-trigger][aria-pressed="true"]')
        await expect(selected).toHaveCount(1)
        await expect(selected).toHaveAttribute('data-assessment-scale-trigger', section.key)
        await expect(panel.locator('h3')).toHaveText(section.construct || section.title)
        const limitations = panel.locator('[data-scale-limitation]')
        await expect(limitations).toHaveCount((section.limitations || []).length)
        for (const [limitIndex, limit] of (section.limitations || []).entries()) {
          await expect(limitations.nth(limitIndex)).toBeVisible()
          await expect(limitations.nth(limitIndex)).toHaveText(limit)
        }
        const layout = await page.evaluate(readScaleJumpLayout)
        assertScaleJumpLayout(layout)
        layouts.push({ key: section.key, ...layout })
      }
      await select.scrollIntoViewIfNeeded()
      if (screenshotPrefix) await page.screenshot({ path: screenshotPrefix + '-' + width + '.png', fullPage: false })
    }
  } finally {
    await page.setViewportSize(originalViewport)
  }
  return layouts
}
