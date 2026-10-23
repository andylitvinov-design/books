import assert from 'node:assert/strict';
import { assertCompactLeadRequest } from './compact-lead-verifier.mjs';

export function assertScrollGeometry(value, { width, reducedMotion }, afterClick = false) {
  assert.equal(value.width, width);
  assert.equal(value.reduced, reducedMotion === 'reduce');
  assert.equal(value.behavior, reducedMotion === 'reduce' ? 'auto' : 'smooth');
  if (width === 320) {
    assert.equal(value.navVisible, true, 'Fixed navigation must remain visible');
    assert.ok(value.navHeight > 0);
    assert.ok(Math.abs(value.rootHeight - value.navHeight) <= 1, 'Root owns measured navigation height');
    assert.ok(value.padding >= value.navHeight - 1, 'Root scroll padding reserves fixed navigation');
  } else {
    assert.equal(value.navVisible, false, 'Desktop must not gain a fixed mobile bar');
    assert.equal(value.padding, 0, 'No mobile scroll padding on desktop');
  }
  if (afterClick) {
    assert.equal(value.checked, true, 'Normal pointer check changed state');
    assert.equal(value.hitCheckbox, true, 'Checkbox center remains pointer-accessible');
    assert.ok(value.centerX > 0 && value.centerX < value.width);
    assert.ok(value.centerY > 0 && value.centerY < value.height);
    if (value.navVisible) assert.ok(value.centerY < value.navTop, 'Fixed navigation does not cover checkbox center');
  }
}

// Read computed layout only. No scroll, event dispatch, focus or state changes.
export function readScrollGeometry(node) {
  const root = getComputedStyle(document.documentElement);
  const nav = document.querySelector('.ia222-bottom-navigation');
  const navRect = nav?.getBoundingClientRect();
  const navStyle = nav && getComputedStyle(nav);
  const rect = node?.getBoundingClientRect();
  const centerX = rect ? rect.left + rect.width / 2 : null;
  const centerY = rect ? rect.top + rect.height / 2 : null;
  return {
    width: innerWidth, height: innerHeight,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    behavior: root.scrollBehavior,
    padding: parseFloat(root.scrollPaddingBottom) || 0,
    rootHeight: parseFloat(root.getPropertyValue('--ia222-bottom-height')) || 0,
    navVisible: Boolean(navRect && navRect.height > 0 && navStyle.display !== 'none' && navStyle.visibility !== 'hidden'),
    navHeight: navRect?.height || 0, navTop: navRect?.top || 0,
    checked: node?.checked ?? null, centerX, centerY,
    hitCheckbox: node ? document.elementFromPoint(centerX, centerY) === node : null,
  };
}

export async function verifyCompactLeadScroll(browser, expect, origin, name) {
  assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/, 'Synthetic regression is loopback only');
  const results = [];
  for (const width of [320, 1188]) for (const reducedMotion of ['reduce', 'no-preference']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion, serviceWorkers: 'block', locale: 'en-CA' });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(origin + '/en/services/dao-health-profile', { waitUntil: 'networkidle', timeout: 60000 });
      assert.equal(response?.status(), 200);
      const dao = page.locator('main[data-free-entry-landing="dao"]');
      await expect(dao.locator('h1')).toBeVisible();
      await expect(dao.locator('[data-compact-lead-form] input[type="checkbox"][required]')).toHaveCount(1);
      await expect(dao.locator('[data-contact-channel-chooser]')).toHaveCount(0);
      const options = { width, reducedMotion };
      assertScrollGeometry(await page.evaluate(readScrollGeometry), options);
      await dao.locator('a[href="#request-free-wu-xing"]').click();
      let geometry;
      await assertCompactLeadRequest(page, dao.locator('#request-free-wu-xing'), expect, {
        locale: 'en', serviceTitle: 'Free symbolic Wu Xing Resource Profile',
        async afterConsentCheck(consent) {
          geometry = await consent.evaluate(readScrollGeometry);
          assertScrollGeometry(geometry, options, true);
        },
      });
      assert.ok(geometry, 'Post-pointer geometry is mandatory');
      assert.deepEqual(errors, [], 'No browser errors');
      results.push({ name, ...options, compactDaoScroll: true, geometry });
    } finally { await context.close(); }
  }
  return results;
}
