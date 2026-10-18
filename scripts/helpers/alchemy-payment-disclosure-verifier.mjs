import assert from 'node:assert/strict';

// Measure the owner's collapsed panel before this helper runs. Expanded content
// may be taller than one viewport; it must remain readable and operable by scroll.
export async function assertAlchemyPaymentsExpanded(main, expect, width) {
  const disclosure = main.locator('details[data-alchemy-payment-disclosure]');
  await expect(disclosure).toHaveCount(1);
  assert.equal(await disclosure.evaluate(node => node.open), false,
    'Payment methods must be collapsed until explicitly requested');
  const summary = disclosure.locator('summary');
  const summaryBox = await summary.boundingBox();
  assert.ok(summaryBox && summaryBox.width >= 44 && summaryBox.height >= 44,
    'Payment disclosure summary has a 44px touch target');
  await summary.click();
  assert.equal(await disclosure.evaluate(node => node.open), true,
    'Payment help can be expanded with an accessible control');
  const anchors = disclosure.locator('a');
  assert.ok(await anchors.count() > 0, 'Expanded payment methods retain their links');
  for (let index = 0; index < await anchors.count(); index++) {
    const anchor = anchors.nth(index);
    await expect(anchor).toBeVisible();
    const bounds = await anchor.boundingBox();
    assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44,
      'Expanded payment anchor has a 44px touch target: ' + width + '/' + index);
    assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
      'Expanded payment anchor fits the viewport: ' + width + '/' + index);
  }
  const notes = disclosure.locator('small');
  assert.ok(await notes.count() > 0, 'Expanded payment methods retain their disclosures');
  for (let index = 0; index < await notes.count(); index++) {
    const note = notes.nth(index);
    await expect(note).toBeVisible();
    assert.ok((await note.innerText()).trim(), 'Payment disclosure is not empty');
    assert.equal(await note.evaluate(node => {
      const rect = node.getBoundingClientRect();
      const details = node.closest('details').getBoundingClientRect();
      return node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1 &&
        rect.left >= details.left - 1 && rect.right <= details.right + 1 &&
        rect.top >= details.top - 1 && rect.bottom <= details.bottom + 1;
    }), true, 'Expanded payment disclosure is not clipped or truncated');
  }
  // Exercise native keyboard collapse too; never follow a payment destination.
  await summary.focus();
  await summary.press('Enter');
  assert.equal(await disclosure.evaluate(node => node.open), false, 'Payment help closes with the keyboard');
}
