import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../scripts/verify-public-services-production.mjs", import.meta.url), "utf8");
const start = source.indexOf("  // Spanish Alchemy has its own route.");
const end = source.indexOf('\n  for (const locale of ["en", "ru"])', start);
assert.ok(start >= 0 && end > start, "Execute the real ES-only production verifier block");
const block = source.slice(start, end);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const check = new AsyncFunction("createPage", "origin", "visible", "expect", "assertNoDevIssueOverlay",
  "assertViewport", "diagnostics", "captureAlchemyPanelOverflow", "output", "assert", "console", block);
const names = ["hero", "situations", "method", "video", "reviews", "formats", "faq", "request"];

function fixture({ height = 764, count = 8, termsHeight = 44, primaryHeight = 44, wise = false,
  pageError = false, overflow = false, overlay = false, captureError = false } = {}) {
  const events = [];
  const diagnostics = { pageErrors: [] };
  const createPage = async width => {
    events.push({ create: width });
    const paymentNames = wise ? ["wise", "paypal", "terms", "zen"] : ["paypal", "terms", "zen"];
    const main = {
      attrs: { lang: "es" },
      locator: selector => {
        if (selector === "h1") return { heading: true };
        if (selector === '[data-alchemy-format="60"]') return { attrs: { "aria-pressed": "true" } };
        if (selector === '[data-alchemy-lead-form="single"]') return { count: async () => 1 };
        if (selector === "[data-alchemy-panel]") return { evaluateAll: async fn => {
          const nodes = names.slice(0, count).map(name => ({
            getAttribute: () => name,
            getBoundingClientRect: () => ({ height: name === "formats" ? (width === 1188 ? 900 : height) : 300 }),
          }));
          return JSON.parse(JSON.stringify(runInNewContext("(" + fn + ")(nodes)", { nodes, window: { innerHeight: 844 } })));
        } };
        if (selector === '[data-alchemy-panel="formats"]') return { screenshot: async options => events.push({ screenshot: width, path: options.path }) };
        if (selector === "[data-alchemy-payment-options]") return { locator: anchorSelector => {
          assert.equal(anchorSelector, width <= 390 ? "a" : ":scope > div > a:first-child");
          const selected = paymentNames.filter(name => width <= 390 || name !== "terms");
          return {
            count: async () => selected.length,
            nth: index => ({
              click: () => assert.fail("Must never navigate a payment link"),
              boundingBox: async () => {
                const name = selected[index];
                events.push({ anchor: name, width });
                return { x: 23, y: 400, width: width - 46, height: name === "terms" ? termsHeight : primaryHeight };
              },
            }),
          };
        } };
        assert.fail("Unexpected main locator: " + selector);
      },
    };
    return {
      width,
      goto: async (url, options) => {
        assert.equal(url, "http://127.0.0.1:3100/es/services/alchemy-of-soul");
        assert.equal(options.waitUntil, "networkidle");
        events.push({ visit: width });
        if (pageError) diagnostics.pageErrors.push("synthetic JavaScript failure");
      },
      locator: selector => {
        if (selector === 'main[data-core-service-detail="alchemy"]') return main;
        if (selector === 'details[data-alchemy-extended-guide]') return { evaluate: async fn => fn({ open: false }) };
        if (selector === '[data-sitewide-capture="core-service"]') return { count: async () => 0 };
        assert.fail("Unexpected page locator: " + selector);
      },
      close: async () => events.push({ close: width }),
    };
  };
  return {
    events,
    run: () => check(createPage, "http://127.0.0.1:3100", async () => {}, locator => ({
      toHaveAttribute: async (key, value) => assert.equal(locator.attrs[key], value),
    }), async (page, label) => {
      events.push({ overlayCheck: label });
      assert.equal(overlay, false, "next dev overlay must not appear");
    }, async (page, label) => {
      events.push({ viewportCheck: label });
      assert.equal(overflow, false, "Horizontal overflow: " + label);
    }, diagnostics, async evidence => {
      events.push({ capture: evidence.locale, width: evidence.width, panelHeights: evidence.panelHeights });
      if (captureError) throw new Error("synthetic capture failure");
    }, "artifacts/public-services-production", assert, { error: error => events.push({ warning: String(error) }) }),
  };
}

test("ES default state runs all four widths with no payment navigation", async () => {
  const f = fixture();
  await f.run();
  assert.deepEqual(f.events.filter(event => event.create).map(event => event.create), [320, 360, 390, 1188]);
  assert.equal(f.events.filter(event => event.visit).length, 4);
  assert.equal(f.events.filter(event => event.viewportCheck).length, 4);
  assert.equal(f.events.filter(event => event.overlayCheck).length, 4);
  assert.equal(f.events.filter(event => event.close).length, 4);
  assert.equal(f.events.filter(event => event.capture).length, 0);
  assert.deepEqual(f.events.filter(event => event.screenshot).map(event => event.path),
    [320, 360, 390, 1188].map(width => `artifacts/public-services-production/alchemy-es-formats-default-${width}.png`));
});

test("Mobile checks include terms; desktop checks only existing primary CTAs", async () => {
  const f = fixture();
  await f.run();
  for (const width of [320, 360, 390]) {
    assert.deepEqual(f.events.filter(event => event.anchor && event.width === width).map(event => event.anchor), ["paypal", "terms", "zen"]);
  }
  assert.deepEqual(f.events.filter(event => event.anchor && event.width === 1188).map(event => event.anchor), ["paypal", "zen"]);
  await assert.rejects(fixture({ termsHeight: 43 }).run(), /Spanish payment anchor has a 44px touch target: 320\/1/);
  await assert.rejects(fixture({ primaryHeight: 43 }).run(), /Spanish payment anchor has a 44px touch target/);
});

test("Rendered Wise links receive the same checks without changing provider flags", async () => {
  const f = fixture({ wise: true });
  await f.run();
  assert.deepEqual(f.events.filter(event => event.anchor === "wise").map(event => event.width), [320, 360, 390, 1188]);
  assert.doesNotMatch(block, /process\.env|HH_WISE|click\(|\.fill\(|selectOption\(/);
});

test("765px Spanish overflow captures evidence and retains the strict 764px failure", async () => {
  const f = fixture({ height: 764.1 });
  await assert.rejects(f.run(), error => {
    assert.equal(error.code, "ERR_ASSERTION");
    assert.match(error.message, /One semantic section per mobile viewport/);
    assert.deepEqual(error.actual, [{ name: "formats", height: 765, max: 764 }]);
    return true;
  });
  const capture = f.events.find(event => event.capture);
  assert.equal(capture.capture, "es");
  assert.equal(capture.width, 320);
});

test("A failed diagnostic capture does not hide Spanish 824px overflow", async () => {
  const f = fixture({ height: 824, captureError: true });
  await assert.rejects(f.run(), error => {
    assert.equal(error.code, "ERR_ASSERTION");
    assert.deepEqual(error.actual, [{ name: "formats", height: 824, max: 764 }]);
    return true;
  });
  assert.equal(f.events.filter(event => event.warning).length, 1);
});

test("Spanish defaults retain eight panels and reject JS, overlay, and horizontal errors", async () => {
  await assert.rejects(fixture({ count: 7 }).run(), /Eight compact Spanish Alchemy panels/);
  await assert.rejects(fixture({ pageError: true }).run(), /Unexpected Spanish Alchemy browser page errors/);
  await assert.rejects(fixture({ overflow: true }).run(), /Horizontal overflow: es\/alchemy-of-soul\/320/);
  await assert.rejects(fixture({ overlay: true }).run(), /next dev overlay must not appear/);
});
