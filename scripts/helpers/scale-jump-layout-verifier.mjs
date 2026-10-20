import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { collectReportOverflowDiagnostics } from './report-overflow-diagnostics.mjs'

// Self-contained browser read. No account text, native popup contents or inputs
// outside the synthetic report are captured.
export function readScaleJumpLayout() {
  const report = document.querySelector('[data-personal-result-report]')
  const select = report?.querySelector('[data-assessment-scale-picker] select')
  const label = select?.closest('label')
  const control = select?.closest('[data-assessment-scale-select-control]')
  const box = node => {
    if (!node) return null
    const rect = node.getBoundingClientRect()
    const css = getComputedStyle(node)
    return { left: rect.left, right: rect.right, width: rect.width,
      clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
      overflowX: css.overflowX, appearance: css.appearance,
      outlineStyle: css.outlineStyle, outlineWidth: css.outlineWidth, outlineColor: css.outlineColor }
  }
  return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth, label: box(label), control: box(control), select: box(select),
    labelText: label ? Array.from(label.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join(' ').trim() : '',
    labelAssociated: Boolean(label && label.control === select && Array.from(select.labels || []).includes(label)),
    selectedOption: select?.selectedOptions[0]?.textContent || '', focused: document.activeElement === select }
}

export function assertScaleJumpLayout(layout) {
  assert.ok(Number.isFinite(layout.viewportWidth) && layout.viewportWidth > 0, 'Valid viewport width')
  assert.ok(layout.documentWidth <= layout.viewportWidth + 1, 'Document must not overflow: ' + JSON.stringify(layout))
  assert.ok(layout.bodyWidth <= layout.viewportWidth + 1, 'Body must not overflow: ' + JSON.stringify(layout))
  for (const name of ['label', 'control', 'select']) {
    const box = layout[name]
    assert.ok(box && Number.isFinite(box.width) && box.width > 0, name + ' must have a visible box')
    assert.ok(box.left >= -1 && box.right <= layout.viewportWidth + 1, name + ' must fit the viewport')
  }
  assert.ok(layout.label.scrollWidth <= layout.label.clientWidth + 1, 'Jump label must not leak native option width: ' + JSON.stringify(layout))
  assert.ok(layout.control.left >= layout.label.left - 1 && layout.control.right <= layout.label.right + 1, 'Native-control boundary must fit its label')
  assert.ok(layout.select.left >= layout.control.left - 1 && layout.select.right <= layout.control.right + 1, 'Native select must fit its control boundary')
  assert.equal(layout.control.overflowX, 'hidden', 'Ordinary control wrapper must contain native option overflow')
  assert.equal(layout.label.overflowX, 'visible', 'Do not clip the readable label')
  assert.ok(layout.labelAssociated, 'Native select must retain its implicit label association')
  assert.ok(['Jump to a scale', 'Быстрый выбор шкалы'].includes(layout.labelText), 'Full native label must remain readable')
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
  let checkedWidth = originalViewport.width, checkedKey = null
  try {
    for (const width of [320, 390]) {
      checkedWidth = width
      await page.setViewportSize({ ...originalViewport, width })
      for (const [index, section] of sections.entries()) {
        checkedKey = section.key
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
        // Ordinary methodology notes are intentionally collapsed by the approved
        // report design. Exercise their disclosure; still verify every full note.
        const disclosure = panel.locator('details:has([data-scale-limitation])')
        if (await disclosure.count()) {
          await expect(disclosure).toHaveCount(1)
          if (!await disclosure.evaluate(node => node.open)) await disclosure.locator('summary').click()
          assert.equal(await disclosure.evaluate(node => node.open), true, 'Scale limitations disclosure must open')
        }
        for (const [limitIndex, limit] of (section.limitations || []).entries()) {
          await expect(limitations.nth(limitIndex)).toBeVisible()
          await expect(limitations.nth(limitIndex)).toHaveText(limit)
        }
        const layout = await page.evaluate(readScaleJumpLayout)
        assertScaleJumpLayout(layout)
        assert.equal(layout.selectedOption, section.construct || section.title, 'Selected native option keeps its full text')
        await expect(select).toHaveAccessibleName(layout.labelText)
        layouts.push({ key: section.key, ...layout })
      }
      // Exercise native keyboard selection and commit with Tab, without
      // replacing the control or simulating its change handler ourselves.
      for (const [key, index] of [['ArrowUp', sections.length - 2], ['ArrowDown', sections.length - 1]]) {
        checkedKey = sections[index].key
        await select.focus()
        await expect(select).toBeFocused()
        await select.press(key)
        await select.press('Tab')
        await expect(select).toHaveValue(String(index))
        await expect(report.locator('article[data-active-scale]')).toHaveAttribute('data-active-scale', checkedKey)
        await expect(report.locator('[data-assessment-scale-trigger][aria-pressed="true"]')).toHaveAttribute('data-assessment-scale-trigger', checkedKey)
      }
      await select.focus()
      await expect(select).toBeFocused()
      const focusedLayout = await page.evaluate(readScaleJumpLayout)
      assertScaleJumpLayout(focusedLayout)
      assert.ok(focusedLayout.focused, 'Native control must retain keyboard focus')
      assert.ok(parseFloat(focusedLayout.control.outlineWidth) >= 3 && focusedLayout.control.outlineStyle !== 'none', 'Wrapper must display an unclipped focus ring')
      assert.ok(!['transparent', 'rgba(0, 0, 0, 0)'].includes(focusedLayout.control.outlineColor), 'Focus ring must be visible')
      layouts.push({ key: checkedKey, keyboardChecked: true, ...focusedLayout })
      await select.scrollIntoViewIfNeeded()
      if (screenshotPrefix) await page.screenshot({ path: screenshotPrefix + '-' + width + '.png', fullPage: false })
    }
  } catch (error) {
    // Preserve the failing viewport and selection before the cleanup restores
    //390px. Capture errors must never replace the strict layout failure.
    if (screenshotPrefix) {
      try {
        const layout = await page.evaluate(collectReportOverflowDiagnostics)
        const nativeControl = await page.evaluate(readScaleJumpLayout)
        await writeFile(screenshotPrefix + '-failure-layout.json', JSON.stringify({ commit: process.env.GITHUB_SHA, checkedWidth, checkedKey, nativeControl, ...layout }, null, 2))
        await page.screenshot({ path: screenshotPrefix + '-failure-' + checkedWidth + '.png', fullPage: false })
        // Keep the untouched failure view above, then make the offending
        // control visible in a second image at the same failing viewport.
        await select.scrollIntoViewIfNeeded()
        await page.screenshot({ path: screenshotPrefix + '-failure-control-' + checkedWidth + '.png', fullPage: false })
      } catch (captureError) { console.log('TYPOLOGY_PICKER_DIAGNOSTIC_ERROR', captureError.message) }
    }
    throw error
  } finally {
    await page.setViewportSize(originalViewport)
  }
  return layouts
}
