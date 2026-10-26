import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { parse } from 'acorn';
import { ALCHEMY_PANEL_IDS } from '../scripts/helpers/alchemy-panel-contract.mjs';
import { ALCHEMY_DESKTOP_FORMAT_CASES, alchemyDesktopPhotoReady, collectAlchemyDesktopFormatsGeometry,
  assertAlchemyDesktopFormatsGeometry, runAlchemyDesktopFormatsAcceptance } from '../scripts/helpers/alchemy-desktop-formats-acceptance.mjs';

// Executable control-flow/collector fixtures only. They do not simulate CSS fit
// and cannot replace actual hosted Chromium and WebKit geometry acceptance.
const origin = 'http://127.0.0.1:3100';
const secret = 'PRIVATE-URL-TEXT-ERROR-SENTINEL';
const valid = item => ({
  rootCount: 1, panelCount: 10, formatsCount: 1, panelNames: [...ALCHEMY_PANEL_IDS],
  viewport: { width: item.width, height: item.height }, documentWidth: item.width,
  formats: { height: item.height - 80, width: item.width - 90, visiblePhoto: true, escapingChildren: 0 },
  disclosures: { guide: { count: 1, open: false }, payment: { count: 1, open: false },
    formatDetails: { count: 1, open: false }, capture: { count: 1, expanded: false } },
});
function fixture({ alter = () => {}, failAt, captureThrows = false, mutateCapture = false, closeFails = false, mutatePassShot = false } = {}) {
  const events = [], captures = [], directories = [], screenshots = [];
  let created = 0;
  const dependencies = {
    async createIsolation(browser, options) {
      assert.equal(browser, 'fixture-browser');
      assert.equal(options.origin, origin);
      const index = created++, item = ALCHEMY_DESKTOP_FORMAT_CASES[index];
      assert.deepEqual(options, { origin, locale: item.locale, viewport: { width: item.width, height: item.height } });
      events.push([index, 'create']);
      if (failAt === 'create' && index === 0) throw Error(secret);
      let cleans = 0, photoReady = false;
      const data = valid(item); alter(data, index, item);
      const page = {
        async goto(url, options) {
          events.push([index, 'goto']);
          assert.equal(url, origin + '/' + item.locale + '/services/alchemy-of-soul');
          assert.deepEqual(options, { waitUntil: 'networkidle', timeout: 45000 });
          if (failAt === 'goto' && index === 0) throw Error(secret);
          return { status: () => failAt === 'http' && index === 0 ? 500 : 200 };
        },
        locator(selector) {
          if (selector === 'main[data-core-service-detail="alchemy"] [data-alchemy-panel="formats"]') return {
            async screenshot(options) {
              events.push([index, 'screenshot']); screenshots.push({ index, ...options });
              assert.equal(options.timeout, 10000);
              if (failAt === 'screenshot' && index === 0) throw Error(secret);
              if (mutatePassShot) data.formats.height = 0;
            },
          };
          if (selector === 'main[data-core-service-detail="alchemy"]') return {
            async count() { return data.rootCount; },
            locator(nested) {
              assert.equal(nested, '[data-alchemy-panel="formats"]');
              return { async count() { return data.formatsCount; }, async scrollIntoViewIfNeeded() {
                events.push([index, 'scroll']);
                if (failAt === 'scroll' && index === 0) throw Error(secret);
                photoReady = !(failAt === 'photo' && index === 0);
              } };
            },
          };
          assert.equal(selector, 'main[data-core-service-detail="alchemy"] h1');
          return { async waitFor(options) {
            events.push([index, 'heading']);
            assert.deepEqual(options, { state: 'visible', timeout: 30000 });
            if (failAt === 'heading' && index === 0) throw Error(secret);
          } };
        },
        async waitForFunction(callback, argument, options) {
          events.push([index, 'photo-ready']);
          assert.equal(callback, alchemyDesktopPhotoReady); assert.equal(argument, undefined);
          assert.deepEqual(options, { timeout: 10000 });
          if (!readyFixture({ complete: photoReady })) throw Error(secret);
        },
        async evaluate(callback) {
          events.push([index, 'evaluate']);
          assert.equal(callback, collectAlchemyDesktopFormatsGeometry);
          if (failAt === 'evaluate' && index === 0) throw Error(secret);
          return data;
        },
      };
      return { page,
        async assertClean() {
          events.push([index, 'clean', ++cleans]);
          if ((failAt === 'clean' || (failAt === 'late-clean' && cleans > 1)) && index === 0) throw Error(secret);
        },
        async close() {
          events.push([index, 'close']);
          if ((failAt === 'close' || closeFails) && index === 0) throw Error(secret);
        },
      };
    },
    async ensureDirectory(path, options) {
      directories.push(path); assert.deepEqual(options, { recursive: true });
      if (failAt === 'mkdir' && directories.length === 1) throw Error(secret);
    },
    async captureOverflow(options) {
      captures.push(structuredClone({ output: options.output, locale: options.locale, width: options.width, panelHeights: options.panelHeights }));
      if (mutateCapture) options.panelHeights[0].height = 0;
      if (captureThrows) throw Error(secret);
      return { screenshot: { captured: true }, formatsScreenshot: { captured: true }, captureErrors: [] };
    },
  };
  return { dependencies, events, captures, directories, screenshots, run: engine =>
    runAlchemyDesktopFormatsAcceptance({ browser: 'fixture-browser', engine, origin }, dependencies) };
}

test('Desktop matrix is exactly EN/RU/ES crossed with the three approved viewports', () => {
  assert.deepEqual(ALCHEMY_DESKTOP_FORMAT_CASES, ['en', 'ru', 'es'].flatMap(locale =>
    [[1024, 768], [1280, 844], [1440, 900]].map(([width, height]) => ({ locale, width, height }))));
  assert.ok(Object.isFrozen(ALCHEMY_DESKTOP_FORMAT_CASES));
  assert.ok(ALCHEMY_DESKTOP_FORMAT_CASES.every(Object.isFrozen));
});

for (const engine of ['chromium', 'webkit']) test('Executes all nine real acceptance cases with fresh isolation: ' + engine, async () => {
  const f = fixture(), result = await f.run(engine);
  assert.equal(result.cases.length, 9); assert.deepEqual(result.failures, []);
  assert.deepEqual(result.cases.map(({ locale, width, height }) => ({ locale, width, height })), ALCHEMY_DESKTOP_FORMAT_CASES);
  assert.ok(result.cases.every(item => item.passed && item.scope === 'desktop-formats-only'));
  assert.equal(f.events.filter(([, event]) => event === 'create').length, 9);
  assert.equal(f.events.filter(([, event]) => event === 'close').length, 9);
  assert.equal(f.events.filter(([, event]) => event === 'clean').length, 18);
  assert.deepEqual(f.captures, []); assert.equal(f.directories.length, 9);
  assert.equal(f.screenshots.length, 9);
  assert.equal(new Set(f.screenshots.map(item => item.path)).size, 9);
  for (let i = 0; i < 9; i++) {
    const item = ALCHEMY_DESKTOP_FORMAT_CASES[i];
    const path = 'artifacts/public-services-production/alchemy-desktop-formats/' + engine +
      '/alchemy-' + item.locale + '-formats-' + item.width + 'x' + item.height + '.png';
    assert.equal(f.screenshots[i].path, path);
    assert.deepEqual(result.cases[i].formatsScreenshot, { path, timing: 'later-than-original-geometry; non-atomic', captured: true });
  }
});

for (const item of ALCHEMY_DESKTOP_FORMAT_CASES) test('Original inclusive h−80 boundary is executed for ' + item.locale + '/' + item.width, () => {
  const data = valid(item); assert.doesNotThrow(() => assertAlchemyDesktopFormatsGeometry(data, item));
  data.formats.height++; assert.throws(() => assertAlchemyDesktopFormatsGeometry(data, item), { code: 'FORMATS_OVERFLOW' });
});

test('Original 890 > 764 fails and capture cannot mutate the original measurement or verdict', async () => {
  const f = fixture({ alter(data, index) { if (index === 1) data.formats.height = 890; }, mutateCapture: true, captureThrows: true });
  const result = await f.run('webkit');
  assert.equal(result.failures.length, 1); assert.deepEqual(result.cases[1].issues, ['FORMATS_OVERFLOW']);
  assert.equal(result.cases[1].geometry.formats.height, 890);
  assert.deepEqual(f.captures[0].panelHeights, [{ name: 'formats', height: 890, max: 764 }]);
  assert.equal(f.captures[0].output, 'artifacts/public-services-production/alchemy-desktop-formats/webkit');
  assert.deepEqual(result.cases[1].diagnostic.failedStages, ['capture-or-write']);
  assert.equal(result.cases[1].diagnostic.written, false);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

for (const [name, alter, code] of [
  ['missing root', data => { data.rootCount = 0; }, 'PANEL_IDENTITY_FAILED'],
  ['missing formats panel', data => { data.formatsCount = 0; }, 'PANEL_IDENTITY_FAILED'],
  ['ambiguous root', data => { data.rootCount = 2; }, 'PANEL_IDENTITY_FAILED'],
  ['ambiguous formats panel', data => { data.formatsCount = 2; }, 'PANEL_IDENTITY_FAILED'],
  ['extra panel', data => { data.panelCount = 11; }, 'PANEL_IDENTITY_FAILED'],
  ['duplicate panel identity', data => { data.panelNames[0] = 'formats'; }, 'PANEL_IDENTITY_FAILED'],
  ['wrong order', data => { [data.panelNames[0], data.panelNames[1]] = [data.panelNames[1], data.panelNames[0]]; }, 'PANEL_IDENTITY_FAILED'],
  ['unknown panel identity', data => { data.panelNames[0] = secret; }, 'PANEL_IDENTITY_FAILED'],
  ['dynamic width', data => { data.viewport.width--; }, 'VIEWPORT_MISMATCH'],
  ['dynamic height', data => { data.viewport.height--; }, 'VIEWPORT_MISMATCH'],
  ['open guide', data => { data.disclosures.guide.open = true; }, 'COLLAPSED_STATE_FAILED'],
  ['open payment', data => { data.disclosures.payment.open = true; }, 'COLLAPSED_STATE_FAILED'],
  ['open format details', data => { data.disclosures.formatDetails.open = true; }, 'COLLAPSED_STATE_FAILED'],
  ['expanded capture', data => { data.disclosures.capture.expanded = true; }, 'COLLAPSED_STATE_FAILED'],
  ['duplicate capture', data => { data.disclosures.capture.count = 2; }, 'COLLAPSED_STATE_FAILED'],
  ['nonfinite measurement', data => { data.formats.height = NaN; }, 'GEOMETRY_INVALID'],
  ['fractional measurement', data => { data.formats.height = 687.4; }, 'GEOMETRY_INVALID'],
  ['invisible photo', data => { data.formats.visiblePhoto = false; }, 'PHOTO_NOT_VISIBLE'],
  ['document horizontal overflow', data => { data.documentWidth += 2; }, 'HORIZONTAL_OVERFLOW'],
  ['escaping child', data => { data.formats.escapingChildren = 1; }, 'HORIZONTAL_OVERFLOW'],
]) test('Executable native oracle rejects ' + name, async () => {
  const f = fixture({ alter(data, index) { if (index === 0) alter(data); } });
  const result = await f.run('chromium');
  assert.deepEqual(result.cases[0].issues, [code]); assert.equal(result.cases[0].passed, false);
  assert.equal(result.cases.length, 9); assert.equal(result.failures.length, 1);
  assert.deepEqual(f.captures, [], 'Non-overflow invalid states must not trigger overflow screenshots');
  assert.equal(JSON.stringify(result).includes(secret), false);
});

for (const [phase, code] of [['create', 'ISOLATION_SETUP_FAILED'], ['goto', 'NAVIGATION_FAILED'], ['http', 'HTTP_STATUS_FAILED'],
  ['heading', 'HEADING_NOT_VISIBLE'], ['scroll', 'PHOTO_SCROLL_FAILED'], ['photo', 'PHOTO_NOT_READY'], ['evaluate', 'GEOMETRY_COLLECTION_FAILED'], ['screenshot', 'FORMATS_SCREENSHOT_FAILED'], ['clean', 'ISOLATION_FAILED'], ['close', 'CLEANUP_FAILED']]) {
  test('Bounded ' + phase + ' failure is fatal, sanitized, and does not skip remaining cases', async () => {
    const f = fixture({ failAt: phase }), result = await f.run('chromium');
    assert.deepEqual(result.cases[0].issues, [code]); assert.equal(result.failures.length, 1);
    assert.equal(result.cases.length, 9); assert.equal(result.cases[0].passed, false);
    assert.equal(f.events.filter(([, event]) => event === 'close').length, phase === 'create' ? 8 : 9);
    assert.equal(JSON.stringify(result).includes(secret), false);
  });
}

test('Overflow, post-capture isolation failure, and late teardown failure are all retained', async () => {
  const f = fixture({ alter(data, index) { if (index === 0) data.formats.height++; }, failAt: 'late-clean', closeFails: true });
  const result = await f.run('chromium');
  assert.deepEqual(result.cases[0].issues, ['FORMATS_OVERFLOW', 'ISOLATION_FAILED', 'CLEANUP_FAILED']);
  assert.equal(result.cases[0].diagnostic.written, true);
  assert.equal(result.cases[0].diagnostic.formatsCaptured, true);
  assert.equal(f.directories.length, 9);
  assert.ok(f.directories.every(path => path === 'artifacts/public-services-production/alchemy-desktop-formats/chromium'));
});

test('Successful geometry is retained before later non-atomic visual capture and checked again for isolation', async () => {
  const f = fixture({ mutatePassShot: true }), result = await f.run('chromium');
  assert.deepEqual(result.failures, []);
  for (const item of result.cases) assert.equal(item.geometry.formats.height, item.height - 80);
  const events = f.events.filter(([index]) => index === 0).map(([, event]) => event);
  assert.ok(events.indexOf('evaluate') < events.indexOf('screenshot'));
  assert.ok(events.indexOf('clean') < events.indexOf('screenshot'));
  assert.ok(events.lastIndexOf('clean') > events.indexOf('screenshot'));
});

test('Missing pass-case visual evidence is explicit and cannot be reported as complete acceptance', async () => {
  const f = fixture({ failAt: 'screenshot' }), result = await f.run('webkit');
  assert.deepEqual(result.cases[0].issues, ['FORMATS_SCREENSHOT_FAILED']);
  assert.equal(result.cases[0].formatsScreenshot.captured, false);
  assert.equal(result.cases[0].geometry.formats.height, 688);
  assert.equal(result.cases[0].passed, false);
});

test('A successful visual capture cannot hide its late isolation or cleanup failure', async () => {
  const f = fixture({ failAt: 'late-clean', closeFails: true }), result = await f.run('chromium');
  assert.deepEqual(result.cases[0].issues, ['ISOLATION_FAILED', 'CLEANUP_FAILED']);
  assert.equal(result.cases[0].formatsScreenshot.captured, true);
  assert.equal(result.cases[0].passed, false);
});

test('Directory-write failure cannot erase original overflow or stop cleanup', async () => {
  const f = fixture({ alter(data, index) { if (index === 0) data.formats.height++; }, failAt: 'mkdir' });
  const result = await f.run('webkit');
  assert.deepEqual(result.cases[0].issues, ['FORMATS_OVERFLOW']);
  assert.deepEqual(result.cases[0].diagnostic.failedStages, ['capture-or-write']);
  assert.deepEqual(f.captures, []); assert.equal(f.events.filter(([, event]) => event === 'close').length, 9);
});

test('Snapshot output drops unexpected URL, text and input fields even from a failing collection', async () => {
  const f = fixture({ alter(data, index) { if (index === 0) {
    data.url = secret; data.text = secret; data.inputValues = [secret]; data.formats.url = secret;
    data.disclosures.payment.text = secret; data.viewport.raw = secret; data.formats.height = Infinity;
  } } });
  const result = await f.run('chromium');
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.deepEqual(result.cases[0].issues, ['GEOMETRY_INVALID']);
});

test('Unknown engine or non-loopback origin cannot create a context or artifact directory', async () => {
  const f = fixture();
  for (const [settings, code] of [[{ engine: secret, origin }, 'INVALID_DESKTOP_ENGINE'],
    [{ engine: 'chromium', origin: 'https://example.invalid/' + secret }, 'INVALID_LOOPBACK_ORIGIN']]) {
    await assert.rejects(runAlchemyDesktopFormatsAcceptance({ browser: 'fixture-browser', ...settings }, f.dependencies), error => {
      assert.equal(error.message, code); assert.equal(String(error).includes(secret), false); return true;
    });
  }
  assert.deepEqual(f.events, []); assert.deepEqual(f.directories, []);
});

function readyFixture({ complete = true, naturalWidth = 800, roots = 1, panels = 1, images = 1 } = {}) {
  const image = { complete, naturalWidth };
  const panel = { querySelectorAll: selector => { assert.equal(selector, 'img'); return Array(images).fill(image); } };
  const root = { querySelectorAll: selector => { assert.equal(selector, '[data-alchemy-panel="formats"]'); return Array(panels).fill(panel); } };
  const document = { querySelectorAll: selector => {
    assert.equal(selector, 'main[data-core-service-detail="alchemy"]'); return Array(roots).fill(root);
  } };
  return runInNewContext('(' + alchemyDesktopPhotoReady.toString() + ')()', { document });
}

test('Actual lazy-image readiness callback waits for loaded unique media before measurement', async () => {
  assert.equal(readyFixture({ complete: false }), false);
  assert.equal(readyFixture({ naturalWidth: 0 }), false);
  assert.equal(readyFixture({ roots: 2 }), false);
  assert.equal(readyFixture({ panels: 2 }), false);
  assert.equal(readyFixture({ images: 2 }), false);
  assert.equal(readyFixture(), true);
  const f = fixture(); await f.run('chromium');
  const events = f.events.filter(([index]) => index === 0).map(([, event]) => event);
  assert.ok(events.indexOf('scroll') < events.indexOf('photo-ready'));
  assert.ok(events.indexOf('photo-ready') < events.indexOf('evaluate'));
});

function collectorFixture({ height = 687.01, width = 1024, viewportHeight = 768, unknownPanel = false, escaped = false } = {}) {
  const rect = { left: 0, right: width, width, height };
  const photo = { getBoundingClientRect: () => ({ ...rect, height: 56 }), complete: true, naturalWidth: 800 };
  const trigger = { getAttribute: name => { assert.equal(name, 'aria-expanded'); return 'false'; } };
  const panel = { getBoundingClientRect: () => rect, querySelector: selector => { assert.equal(selector, 'img'); return photo; },
    querySelectorAll(selector) {
      if (selector === '[data-contact-order]') return [trigger];
      assert.equal(selector, 'a,button,summary,h1,h2,h3,img,article,.site-video-player');
      return [photo, { getBoundingClientRect: () => ({ ...rect, right: escaped ? width + 2 : width }) }];
    } };
  const nodes = ALCHEMY_PANEL_IDS.map((name, index) => ({ getAttribute: key => {
    assert.equal(key, 'data-alchemy-panel'); return unknownPanel && index === 0 ? secret : name;
  } }));
  const root = { querySelectorAll(selector) {
    if (selector === '[data-alchemy-panel]') return nodes;
    if (selector === '[data-alchemy-panel="formats"]') return [panel];
    assert.ok(['details[data-alchemy-extended-guide]', '[data-alchemy-panel="formats"] details[data-alchemy-payment-disclosure]',
      '[data-alchemy-panel="formats"] details[data-alchemy-format-details]'].includes(selector));
    return [{ open: false }];
  } };
  const document = { documentElement: { scrollWidth: width }, querySelectorAll(selector) {
    assert.equal(selector, 'main[data-core-service-detail="alchemy"]'); return [root];
  } };
  return runInNewContext('(' + collectAlchemyDesktopFormatsGeometry.toString() + ')()', {
    document, innerWidth: width, innerHeight: viewportHeight,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
  });
}

test('Actual document collector rounds up, reads dynamic viewport, and emits only bounded names', () => {
  const result = collectorFixture({ unknownPanel: true, escaped: true, viewportHeight: 767 });
  assert.equal(result.formats.height, 688); assert.equal(result.viewport.height, 767);
  assert.equal(result.formats.escapingChildren, 1); assert.equal(result.panelNames[0], null);
  assert.equal(result.formats.visiblePhoto, true); assert.equal(JSON.stringify(result).includes(secret), false);
});

const verifier = readFileSync(new URL('../scripts/verify-alchemy-one-screen.mjs', import.meta.url), 'utf8');
async function executeSupplement(source, invoke) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const imports = ast.body.filter(node => node.type === 'ImportDeclaration' &&
    node.source.value === './helpers/alchemy-desktop-formats-acceptance.mjs');
  assert.equal(imports.length, 1, 'Actual verifier imports the actual supplemental helper');
  assert.deepEqual(imports[0].specifiers.map(node => [node.type, node.imported?.name, node.local.name]),
    [['ImportSpecifier', 'runAlchemyDesktopFormatsAcceptance', 'runAlchemyDesktopFormatsAcceptance']]);
  const start = '  desktopFormats = await runAlchemyDesktopFormatsAcceptance({ browser, engine, origin });';
  const end = '} finally { await browser.close(); }';
  assert.equal(source.split(start).length, 2, 'One actual additive native batch');
  const from = source.indexOf(start), to = source.indexOf(end, from); assert.ok(to > from);
  const block = source.slice(from, to);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return new AsyncFunction('runAlchemyDesktopFormatsAcceptance', 'browser', 'engine', 'origin',
    'let desktopFormats; const failures = ["existing-mobile-failure"];\n' + block + '\nreturn { desktopFormats, failures };')(
      invoke, 'fixture-browser', 'chromium', origin);
}

test('Actual verifier supplement executes the real helper and appends rather than overwrites existing failures', async () => {
  const f = fixture({ alter(data, index) { if (index === 0) data.formats.height++; } });
  const result = await executeSupplement(verifier, settings => runAlchemyDesktopFormatsAcceptance(settings, f.dependencies));
  assert.equal(result.desktopFormats.cases.length, 9);
  assert.deepEqual(result.failures, ['existing-mobile-failure', 'en/1024x768: FORMATS_OVERFLOW']);
  const mutation = verifier.replace('  failures.push(...desktopFormats.failures);', '  failures.push();');
  const again = fixture({ alter(data, index) { if (index === 0) data.formats.height++; } });
  const broken = await executeSupplement(mutation, settings => runAlchemyDesktopFormatsAcceptance(settings, again.dependencies));
  assert.notDeepEqual(broken.failures, result.failures, 'Dropping supplemental failures is a meaningful rejected integration mutant');
});

test('Both native engine invocations and the precise engine artifact subtree stay connected', () => {
  const workflow = readFileSync(new URL('../.github/workflows/hh-alchemy-mobile-acceptance.yml', import.meta.url), 'utf8');
  assert.match(workflow, /node scripts\/verify-alchemy-one-screen\.mjs \|\| browser_status=\$\?/);
  assert.match(workflow, /HH_ALCHEMY_BROWSER=webkit node scripts\/verify-alchemy-one-screen\.mjs \|\| browser_status=\$\?/);
  assert.match(workflow, /artifacts\/public-services-production\/alchemy-one-screen-geometry\*\.json/);
  assert.match(workflow, /artifacts\/public-services-production\/alchemy-desktop-formats\/\*\*/);
  assert.match(verifier, /desktopFormats:desktopFormats\.cases/);
});
