import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { assertAlchemyBookingGate } from "../scripts/helpers/alchemy-payment-disclosure-verifier.mjs";

const source = await readFile(new URL("../scripts/verify-public-services-production.mjs", import.meta.url), "utf8");
const start = source.indexOf("  // Spanish Alchemy has its own route.");
const end = source.indexOf('\n  for (const locale of ["en", "ru"])', start);
assert.ok(start >= 0 && end > start, "Execute the real ES-only production verifier block");
const block = source.slice(start, end);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const check = new AsyncFunction("createPage", "origin", "visible", "expect", "assertNoDevIssueOverlay",
  "assertViewport", "diagnostics", "captureAlchemyPanelOverflow", "output", "assert", "console", "assertAlchemyPaymentsExpanded", block);
const names = ["featured-video", "hero", "situations", "method", "report", "video", "reviews", "formats", "faq", "request"];

function fixture({ height = 764, panelNames = names, panelHeights = {}, gate = {},
  pageError = false, overflow = false, overlay = false, captureError = false,
  guideOpen = false, duplicateCapture = false, enquiryCount = 1 } = {}) {
  const events = [];
  const diagnostics = { pageErrors: [] };
  const createPage = async width => {
    events.push({ create: width });
    const booking = fakePage(gate);
    const main = {
      attrs: { lang: "es" },
      locator: selector => {
        if (selector === "h1") return { heading: true };
        if (selector === '[data-alchemy-format="60"]') return { attrs: { "aria-pressed": "true" } };
        if (selector === '[data-alchemy-lead-form="single"]') return { count: async () => enquiryCount };
        if (selector === '[data-alchemy-payment-disclosure]') return { count: async () => gate.legacy ?? 0 };
        if (selector === '[data-alchemy-booking-formats]') return booking.main.locator(selector);
        if (selector === "[data-alchemy-panel]") return { evaluateAll: async fn => {
          const nodes = panelNames.map(name => ({
            getAttribute: () => name,
            getBoundingClientRect: () => ({ height: panelHeights[name] ?? (name === "formats" ? (width === 1188 ? 900 : height) : 300) }),
          }));
          return JSON.parse(JSON.stringify(runInNewContext("(" + fn + ")(nodes)", { nodes, window: { innerHeight: 844 } })));
        } };
        if (selector === '[data-alchemy-panel="formats"]') return { screenshot: async options => events.push({ screenshot: width, path: options.path }) };
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
        if (selector === 'details[data-alchemy-extended-guide]') return { evaluate: async fn => fn({ open: guideOpen }) };
        if (selector === '[data-sitewide-capture="core-service"]') return { count: async () => Number(duplicateCapture) };
        assert.fail("Unexpected page locator: " + selector);
      },
      close: async () => events.push({ close: width }),
    };
  };
  return {
    events,
    run: () => check(createPage, "http://127.0.0.1:3100", async () => {}, locator => ({
      toHaveAttribute: async (key, value) => assert.equal(locator.attrs[key], value),
      toHaveCount: async value => assert.equal(await locator.count(), value),
      toBeVisible: async () => assert.equal(locator.visible, true, 'Expanded content must be visible'),
    }), async (page, label) => {
      events.push({ overlayCheck: label });
      assert.equal(overlay, false, "next dev overlay must not appear");
    }, async (page, label) => {
      events.push({ viewportCheck: label });
      assert.equal(overflow, false, "Horizontal overflow: " + label);
    }, diagnostics, async evidence => {
      events.push({ capture: evidence.locale, width: evidence.width, panelHeights: evidence.panelHeights });
      if (captureError) throw new Error("synthetic capture failure");
    }, "artifacts/public-services-production", assert, { error: (...errors) => events.push({ warning: errors.map(String).join(" ") }) },
      async (main, expect, width) => {
        events.push({ bookingGate: width });
        await assertAlchemyBookingGate(main, expect, width);
      }),
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

test("ES fixture retains the actual landing's ten approved chapters in source order", async () => {
  const landing = await readFile(new URL("../components/alchemy-soul-landing.tsx", import.meta.url), "utf8");
  assert.deepEqual([...landing.matchAll(/data-alchemy-panel="([a-z-]+)"/g)].map(match => match[1]), names);
});

test("Spanish defaults require ten chapters including video and public sample report", async () => {
  for (const panelNames of [names.slice(1), names.filter(name => name !== "report"), [...names, "extra"]]) {
    await assert.rejects(fixture({ panelNames }).run(), error => {
      assert.equal(error.code, "ERR_ASSERTION");
      assert.match(error.message, /Ten Alchemy chapters including video and public sample report/);
      assert.equal(error.actual, panelNames.length);
      assert.equal(error.expected, 10);
      return true;
    });
  }
});

test("Only the reviews panel may exceed the mobile viewport height budget", async () => {
  const reviews = fixture({ panelHeights: { reviews: 2400 } });
  await reviews.run();
  assert.equal(reviews.events.filter(event => event.capture).length, 0);
  for (const name of names.filter(name => name !== "reviews")) {
    const f = fixture({ panelHeights: { [name]: 765 } });
    await assert.rejects(f.run(), error => {
      assert.equal(error.code, "ERR_ASSERTION");
      assert.match(error.message, /One semantic section per mobile viewport/);
      assert.deepEqual(error.actual, [{ name, height: 765, max: 764 }]);
      return true;
    });
    const capture = f.events.find(event => event.capture);
    assert.equal(capture.capture, "es");
    assert.equal(capture.width, 320);
    assert.deepEqual(capture.panelHeights.find(panel => panel.name === name), { name, height: 765, max: 764 });
  }
});

test("Spanish defaults reject JS, overlay, and horizontal errors", async () => {
  await assert.rejects(fixture({ pageError: true }).run(), /Unexpected Spanish Alchemy browser page errors/);
  await assert.rejects(fixture({ overflow: true }).run(), /Horizontal overflow: es\/alchemy-of-soul\/320/);
  await assert.rejects(fixture({ overlay: true }).run(), /next dev overlay must not appear/);
});


test("Spanish defaults reject expanded guide, duplicate enquiry and premature payment", async () => {
  await assert.rejects(fixture({ guideOpen: true }).run(), /Spanish long guide is initially collapsed/);
  await assert.rejects(fixture({ duplicateCapture: true }).run(), /No duplicate Spanish global enquiry panel/);
  for (const enquiryCount of [0, 2])
    await assert.rejects(fixture({ enquiryCount }).run(), /Exactly one Spanish enquiry form/);
  for (const gate of [{ legacy: 1 }, { payment: 1 }, { cart: 1 }, { booking: 0 }, { booking: 2 }, { height: 43 }, { width: 43 }])
    await assert.rejects(fixture({ gate }).run(), { code: "ERR_ASSERTION" });
});

test("Default screenshot precedes the booking gate without filling, paying or enabling providers", async () => {
  const f = fixture();
  await f.run();
  for (const width of [320, 360, 390, 1188]) {
    const screenshot = f.events.findIndex(event => event.screenshot === width);
    const gate = f.events.findIndex(event => event.bookingGate === width);
    assert.ok(screenshot >= 0 && gate > screenshot);
  }
  assert.doesNotMatch(block, /process\.env|HH_WISE|click\(|\.fill\(|selectOption\(/);
});

function fakePage({ booking=1, legacy=0, payment=0, cart=0, height=48, width=200 } = {}) {
  const counts = new Map([
    ['[data-booking-cta="book"]', booking],
    ['[data-alchemy-payment-disclosure]', legacy],
    ['[data-booking-payment-options]', payment],
    ['[data-booking-cart-link]', cart],
  ])
  const pricing = {
    count: async () => 1,
    locator: selector => {
      if (!counts.has(selector)) throw new Error('Unknown locator: '+selector)
      return { count: async () => counts.get(selector), boundingBox: async () => ({width,height}) }
    },
  }
  const main = { locator: selector => {
    assert.equal(selector,'[data-alchemy-booking-formats]')
    return pricing
  } }
  const expect = node => ({ toHaveCount: async count => assert.equal(await node.count(),count) })
  return {main,expect}
}

test('Spanish Alchemy at 320/360/390/1188px has accessible request CTA without payment', async () => {
  const qa = source
  for (const size of [320,360,390,1188]) {
    const {main,expect} = fakePage()
    await assertAlchemyBookingGate(main,expect,size)
  }
  for (const contract of [
    'Ten Alchemy chapters including video and public sample report',
    'All twelve original-language testimonials are visible in a vertical feed',
    'assertViewport', 'captureAlchemyPanelOverflow',
    'data-booking-step="contact"',
    'No cart or payment method before a server-confirmed booking',
  ]) assert.ok(qa.includes(contract),contract)
  assert.match(qa,/await pricing\.locator\('\[data-alchemy-format="month"\]'\)\.click\(\)/)
})

test('an unconfirmed booking cannot reveal a provider link, cart or missing Book button', async () => {
  for (const setting of [{legacy:1},{payment:1},{cart:1},{booking:0},{booking:2}]) {
    const {main,expect} = fakePage(setting)
    await assert.rejects(assertAlchemyBookingGate(main,expect,390))
  }
})

test('mobile Book button must be at least 44px in both axes', async () => {
  for (const setting of [{width:43},{height:43}]) {
    const {main,expect} = fakePage(setting)
    await assert.rejects(assertAlchemyBookingGate(main,expect,320))
  }
  const chooser = await readFile(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8")
  assert.match(chooser,/data-booking-cta=\{paidReady \? "pay" : "book"\}/)
  assert.match(chooser,/!googleReady \|\| !email\.trim\(\)/)
  assert.match(chooser,/checkBookingStatus/)
})
