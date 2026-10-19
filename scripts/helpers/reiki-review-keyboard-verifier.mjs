import assert from 'node:assert/strict';

// Called only by the existing loopback-only, guest-only course verifier.
export async function assertReviewKeyboardAccess(paragraph, locale, expect, keyboard) {
  const label = locale === 'ru' ? 'Отзыв участника' : 'Learner review';
  await expect(paragraph).toHaveAttribute('role', 'region');
  await expect(paragraph).toHaveAttribute('aria-label', label);
  await expect(paragraph).toHaveAttribute('tabindex', '0');
  await paragraph.focus();
  await expect(paragraph).toBeFocused();
  await keyboard.press('Shift+Tab');
  await expect(paragraph).not.toBeFocused();
  await keyboard.press('Tab');
  await expect(paragraph).toBeFocused();
  const original = await paragraph.evaluate(element => ({
    text: element.textContent, scrollTop: element.scrollTop,
    overflowing: element.scrollHeight > element.clientHeight,
  }));
  try {
    if (!original.overflowing) {
      // Short originals still prove focus/label above. This fixed fixture proves
      // native scrolling with the real paragraph and its unchanged screen CSS.
      await paragraph.evaluate(element => {
        element.textContent = 'Synthetic keyboard scrolling review. '.repeat(100);
      });
    }
    await paragraph.evaluate(element => { element.scrollTop = 0; });
    const geometry = await paragraph.evaluate(element => ({
      scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
      scrollTop: element.scrollTop,
    }));
    assert.ok(geometry.clientHeight > 0 && geometry.scrollHeight > geometry.clientHeight,
      'The real review region must have measured overflow for keyboard proof');
    assert.equal(geometry.scrollTop, 0, 'Keyboard proof starts at the top');
    await keyboard.press('PageDown');
    await expect.poll(() => paragraph.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    return { originalOverflow: original.overflowing, syntheticOverflow: !original.overflowing };
  } finally {
    await paragraph.evaluate((element, saved) => {
      element.textContent = saved.text;
      element.scrollTop = saved.scrollTop;
    }, original);
  }
}
