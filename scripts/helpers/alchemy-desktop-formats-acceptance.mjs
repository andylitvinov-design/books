import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { ALCHEMY_PANEL_IDS, assertAlchemyPanelOrder } from './alchemy-panel-contract.mjs';
import { createAlchemyViewportIsolation } from './alchemy-viewport-isolation.mjs';
import { captureAlchemyPanelOverflow } from './alchemy-panel-overflow-diagnostics.mjs';

export const ALCHEMY_DESKTOP_FORMAT_CASES = Object.freeze(['en', 'ru', 'es'].flatMap(locale =>
  [[1024, 768], [1280, 844], [1440, 900]].map(([width, height]) => Object.freeze({ locale, width, height }))));

// The formats photograph is lazy and below the reviews feed. Scroll first,
// then wait for the real public image, without altering the DOM or its styles.
export function alchemyDesktopPhotoReady() {
  const roots = document.querySelectorAll('main[data-core-service-detail="alchemy"]');
  if (roots.length !== 1) return false;
  const formats = roots[0].querySelectorAll('[data-alchemy-panel="formats"]');
  if (formats.length !== 1) return false;
  const images = formats[0].querySelectorAll('img');
  return images.length === 1 && images[0].complete && images[0].naturalWidth > 0;
}

// Public geometry only: no text, href, input values, account data or storage.
// This function executes in the actual browser document, not a synthetic layout.
export function collectAlchemyDesktopFormatsGeometry() {
  const finite = value => Number.isFinite(value) ? value : null;
  const roots = document.querySelectorAll('main[data-core-service-detail="alchemy"]');
  const root = roots[0];
  const panels = root?.querySelectorAll('[data-alchemy-panel]') ?? [];
  const formats = root?.querySelectorAll('[data-alchemy-panel="formats"]') ?? [];
  const panel = formats[0];
  const disclosure = selector => {
    const nodes = root?.querySelectorAll(selector) ?? [];
    return { count: nodes.length, open: nodes[0] ? Boolean(nodes[0].open) : null };
  };
  const triggers = panel?.querySelectorAll('[data-contact-order]') ?? [];
  const expanded = triggers[0]?.getAttribute('aria-expanded');
  const image = panel?.querySelector('img');
  const imageRect = image?.getBoundingClientRect();
  const imageStyle = image ? getComputedStyle(image) : null;
  const visiblePhoto = Boolean(image && imageRect.width > 0 && imageRect.height > 0 &&
    imageStyle.display !== 'none' && imageStyle.visibility !== 'hidden' && image.complete && image.naturalWidth > 0);
  const escaping = Array.from(panel?.querySelectorAll('a,button,summary,h1,h2,h3,img,article,.site-video-player') ?? [])
    .filter(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 &&
        (rect.left < -1 || rect.right > innerWidth + 1);
    }).length;
  const rect = panel?.getBoundingClientRect();
  const approvedNames = ['featured-video', 'hero', 'situations', 'method', 'report', 'video', 'reviews', 'formats', 'faq', 'request'];
  return {
    rootCount: roots.length, panelCount: panels.length, formatsCount: formats.length,
    panelNames: Array.from(panels).slice(0, 11).map(node => {
      const name = node.getAttribute('data-alchemy-panel');
      return approvedNames.includes(name) ? name : null;
    }),
    viewport: { width: finite(innerWidth), height: finite(innerHeight) },
    documentWidth: finite(document.documentElement.scrollWidth),
    formats: { height: rect ? finite(Math.ceil(rect.height)) : null, width: rect ? finite(rect.width) : null,
      visiblePhoto, escapingChildren: escaping },
    disclosures: {
      guide: disclosure('details[data-alchemy-extended-guide]'),
      payment: disclosure('[data-alchemy-panel="formats"] details[data-alchemy-payment-disclosure]'),
      formatDetails: disclosure('[data-alchemy-panel="formats"] details[data-alchemy-format-details]'),
      capture: { count: triggers.length, expanded: expanded === 'true' ? true : expanded === 'false' ? false : null },
    },
  };
}

// Persist only the exact allowlisted shape, including when the page is malformed.
function publicSnapshot(raw) {
  const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const boolean = value => typeof value === 'boolean' ? value : null;
  const disclosure = name => ({ count: finite(raw?.disclosures?.[name]?.count), open: boolean(raw?.disclosures?.[name]?.open) });
  return {
    rootCount: finite(raw?.rootCount), panelCount: finite(raw?.panelCount), formatsCount: finite(raw?.formatsCount),
    panelNames: Array.isArray(raw?.panelNames) ? raw.panelNames.slice(0, 11).map(name => ALCHEMY_PANEL_IDS.includes(name) ? name : null) : [],
    viewport: { width: finite(raw?.viewport?.width), height: finite(raw?.viewport?.height) },
    documentWidth: finite(raw?.documentWidth),
    formats: { height: finite(raw?.formats?.height), width: finite(raw?.formats?.width),
      visiblePhoto: boolean(raw?.formats?.visiblePhoto), escapingChildren: finite(raw?.formats?.escapingChildren) },
    disclosures: { guide: disclosure('guide'), payment: disclosure('payment'), formatDetails: disclosure('formatDetails'),
      capture: { count: finite(raw?.disclosures?.capture?.count), expanded: boolean(raw?.disclosures?.capture?.expanded) } },
  };
}

function boundedAssertion(code, assertion) {
  try { assertion(); } catch { const failure = new Error(code); failure.code = code; throw failure; }
}

export function assertAlchemyDesktopFormatsGeometry(data, expected) {
  boundedAssertion('PANEL_IDENTITY_FAILED', () => {
    assert.equal(data.rootCount, 1); assert.equal(data.panelCount, 10); assert.equal(data.formatsCount, 1);
    assertAlchemyPanelOrder(data.panelNames.map(name => ({ name })));
  });
  boundedAssertion('VIEWPORT_MISMATCH', () => assert.deepEqual(data.viewport, { width: expected.width, height: expected.height }));
  boundedAssertion('COLLAPSED_STATE_FAILED', () => {
    for (const name of ['guide', 'payment', 'formatDetails']) assert.deepEqual(data.disclosures[name], { count: 1, open: false });
    assert.deepEqual(data.disclosures.capture, { count: 1, expanded: false });
  });
  boundedAssertion('GEOMETRY_INVALID', () => {
    assert.ok(Number.isInteger(data.formats.height) && data.formats.height > 0);
    assert.ok(Number.isFinite(data.formats.width) && data.formats.width > 0);
    assert.ok(Number.isFinite(data.documentWidth) && data.documentWidth > 0);
    assert.ok(Number.isInteger(data.formats.escapingChildren) && data.formats.escapingChildren >= 0);
  });
  boundedAssertion('PHOTO_NOT_VISIBLE', () => assert.equal(data.formats.visiblePhoto, true));
  boundedAssertion('HORIZONTAL_OVERFLOW', () => {
    assert.ok(data.documentWidth <= data.viewport.width + 1);
    assert.equal(data.formats.escapingChildren, 0);
  });
  const measurement = { name: 'formats', height: data.formats.height, max: data.viewport.height - 80 };
  // Same inclusive budget as the original core/mobile guards; no exemptions,
  // fixed viewport budget, tolerance, synthetic fit or projected CSS arithmetic.
  boundedAssertion('FORMATS_OVERFLOW', () => assert.deepEqual([measurement].filter(panel => panel.height > panel.max), []));
  return measurement;
}

export async function runAlchemyDesktopFormatsAcceptance({ browser, engine, origin }, dependencies = {}) {
  if (!['chromium', 'webkit'].includes(engine)) throw new Error('INVALID_DESKTOP_ENGINE');
  if (typeof origin !== 'string' || !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
    throw new Error('INVALID_LOOPBACK_ORIGIN');
  const createIsolation = dependencies.createIsolation ?? createAlchemyViewportIsolation;
  const captureOverflow = dependencies.captureOverflow ?? captureAlchemyPanelOverflow;
  const ensureDirectory = dependencies.ensureDirectory ?? mkdir;
  const output = 'artifacts/public-services-production/alchemy-desktop-formats/' + engine;
  const cases = [];
  for (const expected of ALCHEMY_DESKTOP_FORMAT_CASES) {
    const result = { ...expected, scope: 'desktop-formats-only', geometry: null, issues: [], diagnostic: null, formatsScreenshot: null };
    let isolation, stage = 'ISOLATION_SETUP_FAILED';
    try {
      isolation = await createIsolation(browser, { origin, locale: expected.locale, viewport: { width: expected.width, height: expected.height } });
      const { page } = isolation;
      stage = 'NAVIGATION_FAILED';
      const response = await page.goto(origin + '/' + expected.locale + '/services/alchemy-of-soul', { waitUntil: 'networkidle', timeout: 45000 });
      boundedAssertion('HTTP_STATUS_FAILED', () => assert.equal(response?.status(), 200));
      stage = 'HEADING_NOT_VISIBLE';
      await page.locator('main[data-core-service-detail="alchemy"] h1').waitFor({ state: 'visible', timeout: 30000 });
      stage = 'PANEL_IDENTITY_FAILED';
      const root = page.locator('main[data-core-service-detail="alchemy"]');
      assert.equal(await root.count(), 1);
      const formats = root.locator('[data-alchemy-panel="formats"]');
      assert.equal(await formats.count(), 1);
      stage = 'PHOTO_SCROLL_FAILED';
      await formats.scrollIntoViewIfNeeded();
      stage = 'PHOTO_NOT_READY';
      await page.waitForFunction(alchemyDesktopPhotoReady, undefined, { timeout: 10000 });
      stage = 'GEOMETRY_COLLECTION_FAILED';
      result.geometry = publicSnapshot(await page.evaluate(collectAlchemyDesktopFormatsGeometry));
      try { assertAlchemyDesktopFormatsGeometry(result.geometry, expected); }
      catch (error) {
        const codes = ['PANEL_IDENTITY_FAILED', 'VIEWPORT_MISMATCH', 'COLLAPSED_STATE_FAILED',
          'GEOMETRY_INVALID', 'PHOTO_NOT_VISIBLE', 'HORIZONTAL_OVERFLOW', 'FORMATS_OVERFLOW'];
        result.issues.push(codes.includes(error?.code) ? error.code : 'GEOMETRY_ASSERTION_FAILED');
      }
      stage = 'ISOLATION_FAILED';
      await isolation.assertClean();
      if (result.issues.length === 0) {
        result.formatsScreenshot = {
          path: output + '/alchemy-' + expected.locale + '-formats-' + expected.width + 'x' + expected.height + '.png',
          timing: 'later-than-original-geometry; non-atomic', captured: false,
        };
        try {
          await ensureDirectory(output, { recursive: true });
          await page.locator('main[data-core-service-detail="alchemy"] [data-alchemy-panel="formats"]').screenshot({
            path: result.formatsScreenshot.path, timeout: 10000,
          });
          result.formatsScreenshot.captured = true;
        } catch { result.issues.push('FORMATS_SCREENSHOT_FAILED'); }
        await isolation.assertClean();
      }
      if (result.issues.includes('FORMATS_OVERFLOW')) {
        result.diagnostic = { attempted: true, written: false, fullPageCaptured: false, formatsCaptured: false, failedStages: [] };
        try {
          await ensureDirectory(output, { recursive: true });
          const evidence = await captureOverflow({ page, output, locale: expected.locale, width: expected.width,
            panelHeights: [{ name: 'formats', height: result.geometry.formats.height, max: result.geometry.viewport.height - 80 }] });
          result.diagnostic.written = true;
          result.diagnostic.fullPageCaptured = evidence?.screenshot?.captured === true;
          result.diagnostic.formatsCaptured = evidence?.formatsScreenshot?.captured === true;
          result.diagnostic.failedStages = (Array.isArray(evidence?.captureErrors) ? evidence.captureErrors : []).slice(0, 3)
            .map(item => ['geometry', 'screenshot', 'formats-screenshot'].includes(item.stage) ? item.stage : 'unknown');
        } catch { result.diagnostic.failedStages = ['capture-or-write']; }
        // Screenshot-induced navigation/transport is still subject to the same
        // boundary; a diagnostic failure cannot replace the prior overflow.
        await isolation.assertClean();
      }
    } catch (error) {
      const code = ['HTTP_STATUS_FAILED'].includes(error?.code) ? error.code : stage;
      if (!result.issues.includes(code)) result.issues.push(code);
    } finally {
      if (isolation) {
        try { await isolation.close(); }
        catch { result.issues.push('CLEANUP_FAILED'); }
      }
    }
    result.passed = result.issues.length === 0;
    cases.push(result);
  }
  return { engine, cases, failures: cases.filter(item => !item.passed)
    .map(item => item.locale + '/' + item.width + 'x' + item.height + ': ' + item.issues.join(',')) };
}
