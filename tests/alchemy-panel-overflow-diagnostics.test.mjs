import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { captureAlchemyPanelOverflow, collectAlchemyPanelGeometry } from "../scripts/helpers/alchemy-panel-overflow-diagnostics.mjs";

const source = await readFile(new URL("../scripts/verify-public-services-production.mjs", import.meta.url), "utf8");
const start = source.indexOf("          const panelHeights =", source.indexOf('if (kind === "alchemy" && width <= 390)'));
const end = source.indexOf("          assert.equal(await page.locator('details[data-alchemy-extended-guide]')", start);
assert.ok(start >= 0 && end > start, "Test executes the actual production measurement and strict assertion block");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const check = new AsyncFunction("main", "page", "locale", "width", "output", "captureAlchemyPanelOverflow", "assert", "console", source.slice(start, end));
const names = ["hero", "situations", "method", "video", "reviews", "formats", "faq", "request"];

async function fixture(t, { height = 824, screenshotError = false, geometryError = false, count = 8 } = {}) {
  const output = await mkdtemp(join(tmpdir(), "alchemy-overflow-diagnostics-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const calls = [];
  const panels = names.slice(0, count).map(name => ({
    getAttribute: () => name,
    getBoundingClientRect: () => ({ height: name === "formats" ? height : 300 }),
  }));
  const geometry = { documentLocale: "ru", viewport: { width: 320, height: 844 }, panels: [{ name: "formats", box: { height } }] };
  const page = {
    url: () => "http://127.0.0.1:3100/ru/services/alchemy-of-soul",
    viewportSize: () => ({ width: 320, height: 844 }),
    evaluate: async fn => {
      assert.equal(fn, collectAlchemyPanelGeometry);
      calls.push("geometry");
      if (geometryError) throw new Error("geometry unavailable");
      return geometry;
    },
    screenshot: async options => {
      calls.push({ fullPage: options.fullPage, path: options.path });
      if (screenshotError) throw new Error("screenshot unavailable");
      await writeFile(options.path, "synthetic image bytes for unit test only");
    },
    locator: selector => {
      assert.equal(selector, '[data-alchemy-panel="formats"]');
      return { screenshot: async options => {
        calls.push({ formats: true, path: options.path });
        if (screenshotError) throw new Error("formats screenshot unavailable");
        await writeFile(options.path, "synthetic element image bytes for unit test only");
      } };
    },
  };
  const main = { locator: selector => {
    assert.equal(selector, "[data-alchemy-panel]");
    return { evaluateAll: async fn => JSON.parse(JSON.stringify(runInNewContext(
      "(" + fn.toString() + ")(nodes)", { nodes: panels, window: { innerHeight: 844 } },
    ))) };
  } };
  return {
    output, calls, geometry,
    run: (overrides = {}) => check(main, page, "ru", 320, overrides.output ?? output,
      overrides.capture ?? captureAlchemyPanelOverflow, assert,
      { error: (...args) => calls.push({ diagnosticError: String(args[1]) }) }),
    json: () => readFile(join(output, "alchemy-ru-panel-overflow-320.json"), "utf8").then(JSON.parse),
  };
}

function originalOverflow(error, height) {
  assert.equal(error.code, "ERR_ASSERTION");
  assert.match(error.message, /One semantic section per mobile viewport:/);
  assert.deepEqual(error.actual, [{ name: "formats", height, max: 764 }]);
  assert.deepEqual(error.expected, []);
  return true;
}

test("Panels at and below 764px pass without diagnostics or files", async t => {
  for (const height of [300, 763.4, 764]) {
    const f = await fixture(t, { height });
    await f.run({ capture: () => assert.fail("Passing layout must not invoke capture") });
    assert.deepEqual(f.calls, []);
    assert.deepEqual(await readdir(f.output), []);
  }
});

test("765px still fails the original 764px assertion after failure-only captures", async t => {
  const f = await fixture(t, { height: 764.1 });
  await assert.rejects(f.run(), error => originalOverflow(error, 765));
  const evidence = await f.json();
  assert.equal(evidence.url, "http://127.0.0.1:3100/ru/services/alchemy-of-soul");
  assert.equal(evidence.locale, "ru");
  assert.equal(evidence.requestedWidth, 320);
  assert.deepEqual(evidence.configuredViewport, { width: 320, height: 844 });
  assert.deepEqual(evidence.geometry, f.geometry);
  assert.equal(evidence.screenshot.fullPage, true);
  assert.equal(evidence.screenshot.captured, true);
  assert.equal(evidence.formatsScreenshot.captured, true);
  assert.deepEqual(evidence.captureErrors, []);
  assert.equal(f.calls[0], "geometry", "Capture geometry before screenshot can resize/scroll");
  assert.equal(f.calls[1].fullPage, true);
  assert.equal(f.calls[2].formats, true);
});

test("824px overflow writes JSON even when both screenshots fail, then retains original failure", async t => {
  const f = await fixture(t, { screenshotError: true });
  await assert.rejects(f.run(), error => originalOverflow(error, 824));
  const evidence = await f.json();
  assert.deepEqual(evidence.overflow, [{ name: "formats", height: 824, max: 764 }]);
  assert.equal(evidence.screenshot.captured, false);
  assert.equal(evidence.formatsScreenshot.captured, false);
  assert.deepEqual(evidence.captureErrors.map(item => item.stage), ["screenshot", "formats-screenshot"]);
  assert.deepEqual(evidence.geometry, f.geometry);
  assert.deepEqual(await readdir(f.output), ["alchemy-ru-panel-overflow-320.json"]);
});

test("A geometry failure still permits screenshots and JSON with the original measurement", async t => {
  const f = await fixture(t, { geometryError: true });
  await assert.rejects(f.run(), error => originalOverflow(error, 824));
  const evidence = await f.json();
  assert.equal(evidence.geometry, null);
  assert.equal(evidence.panelHeights.length, 8);
  assert.equal(evidence.screenshot.captured, true);
  assert.deepEqual(evidence.captureErrors.map(item => item.stage), ["geometry"]);
});

test("An unwritable artifact target does not mask the strict assertion", async t => {
  const f = await fixture(t);
  const output = join(f.output, "file-not-directory");
  await writeFile(output, "occupied");
  await assert.rejects(f.run({ output }), error => originalOverflow(error, 824));
  assert.equal(f.calls.some(call => call.diagnosticError?.includes("ENOTDIR")), true);
});

test("The original eight-panel count assertion remains in force", async t => {
  const f = await fixture(t, { count: 7 });
  await assert.rejects(f.run(), { code: "ERR_ASSERTION", message: "Eight compact Alchemy panels\n\n7 !== 8\n" });
  assert.deepEqual(f.calls, []);
});

test("Geometry captures panel/card/payment boxes and computed spacing without content", () => {
  const rect = { x: 23, y: 400, top: 400, right: 297, bottom: 1224, left: 23, width: 274, height: 824 };
  const styles = { display: "block", marginTop: "10px", marginRight: "0px", marginBottom: "4px", marginLeft: "0px",
    paddingTop: "12px", paddingRight: "16px", paddingBottom: "12px", paddingLeft: "16px", gap: "8px",
    rowGap: "8px", columnGap: "8px", fontSize: "12px", lineHeight: "18px" };
  const element = (tag, attributes = {}, children = []) => ({
    localName: tag, children,
    getBoundingClientRect: () => rect,
    getAttribute: key => attributes[key] ?? null,
    hasAttribute: key => Object.hasOwn(attributes, key),
    get textContent() { assert.fail("Must not read text"); },
    get value() { assert.fail("Must not read form values"); },
    get innerHTML() { assert.fail("Must not read markup"); },
  });
  const payment = element("div", { "data-paypal-personal-offer": "" }, [element("a"), element("small")]);
  const paymentOptions = element("div", {}, [payment]);
  const card = element("button", { "data-alchemy-format": "30" }, [element("span")]);
  const panel = element("section", { "data-alchemy-panel": "formats" }, [element("h2"), paymentOptions]);
  const main = {
    querySelector: selector => {
      assert.equal(selector, "[data-alchemy-payment-disclosure] > div");
      return paymentOptions;
    },
    querySelectorAll: selector => selector === "[data-alchemy-panel]" ? [panel] : [card, ...card.children],
  };
  const collected = JSON.parse(JSON.stringify(runInNewContext("(" + collectAlchemyPanelGeometry + ")()", {
    document: {
      documentElement: { lang: "ru" },
      querySelector: selector => { assert.equal(selector, 'main[data-core-service-detail="alchemy"]'); return main; },
    },
    window: { innerWidth: 320, innerHeight: 844, devicePixelRatio: 1, scrollX: 0, scrollY: 0 },
    getComputedStyle: () => styles,
  })));
  assert.equal(collected.documentLocale, "ru");
  assert.deepEqual(collected.viewport, { width: 320, height: 844, devicePixelRatio: 1, scrollX: 0, scrollY: 0 });
  assert.deepEqual(collected.panels[0].box, rect);
  assert.deepEqual(collected.panels[0].style, styles);
  assert.equal(collected.formatChoices[0].format, "30");
  assert.equal(collected.formatChoices[1].style.lineHeight, "18px");
  assert.deepEqual(collected.paymentOptions.children[0].markers, ["data-paypal-personal-offer"]);
  assert.deepEqual(collected.paymentOptions.children[0].children[1].box, rect);
  assert.doesNotMatch(JSON.stringify(collected), /textContent|innerHTML|href|"value"/);
});
