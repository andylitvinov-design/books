import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { assertAlchemyPanelOrder } from "../scripts/helpers/alchemy-panel-contract.mjs";
import { captureAlchemyPanelOverflow, collectAlchemyPanelGeometry } from "../scripts/helpers/alchemy-panel-overflow-diagnostics.mjs";

const source = await readFile(new URL("../scripts/verify-public-services-production.mjs", import.meta.url), "utf8");
const start = source.indexOf("          const panelHeights =", source.indexOf('const locale = "es"'));
const end = source.indexOf("          assert.equal(await page.locator('details[data-alchemy-extended-guide]')", start);
assert.ok(start >= 0 && end > start, "Test executes the actual production measurement and strict assertion block");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const check = new AsyncFunction("main", "page", "locale", "width", "output", "captureAlchemyPanelOverflow", "assert", "console", source.slice(start, end));
const names = ["featured-video", "hero", "situations", "method", "report", "video", "reviews", "formats", "faq", "request"];
const appSource = await readFile(new URL("../scripts/verify-app-r1.mjs", import.meta.url), "utf8");
const appStart = appSource.indexOf("     const measurements=", appSource.indexOf("async function verifyPublicServiceConversionJourneys()"));
const appEnd = appSource.indexOf("     await assertAlchemyPaymentsExpanded", appStart);
assert.ok(appStart >= 0 && appEnd > appStart, "Test executes the actual App measurement, diagnostic and assertion block");
const spanishStart = source.indexOf("      const panelHeights =", source.indexOf('const locale = "es"'));
const spanishEnd = source.indexOf("      assert.equal(await page.locator('details[data-alchemy-extended-guide]')", spanishStart);
assert.ok(spanishStart >= 0 && spanishEnd > spanishStart);
const spanishCheck = new AsyncFunction("main", "page", "locale", "width", "output", "captureAlchemyPanelOverflow", "assertAlchemyPanelOrder", "assert", "console", source.slice(spanishStart, spanishEnd));
const appCheck = new AsyncFunction("servicePage", "output", "locale", "width", "captureAlchemyPanelOverflow", "assertAlchemyPanelOrder", "assert", "console", "page", appSource.slice(appStart, appEnd));

async function fixture(t, { height = 824, reviewsHeight = 300, overflowPanel = "formats", screenshotError = false, geometryError = false, count = 10, locale = "ru", width = 320 } = {}) {
  const output = await mkdtemp(join(tmpdir(), "alchemy-overflow-diagnostics-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const calls = [];
  const panels = names.slice(0, count).map(name => ({
    getAttribute: () => name,
    getBoundingClientRect: () => ({ height: name === overflowPanel ? height : name === "reviews" ? reviewsHeight : 300 }),
  }));
  const geometry = { documentLocale: locale, viewport: { width, height: 844 }, panels: [{ name: "formats", box: { height } }] };
  const page = {
    url: () => assert.fail("Diagnostics must not read arbitrary URLs"),
    viewportSize: () => ({ width, height: 844 }),
    evaluate: async fn => {
      assert.equal(fn, collectAlchemyPanelGeometry);
      calls.push("geometry");
      if (geometryError) throw new Error("geometry unavailable");
      return geometry;
    },
    screenshot: async options => {
      assert.equal(options.timeout, 10000, "Existing screenshot timeout is not weakened");
      calls.push({ fullPage: options.fullPage, path: options.path });
      if (screenshotError) throw new Error("screenshot unavailable");
      await writeFile(options.path, "synthetic image bytes for unit test only");
    },
    locator: selector => {
      assert.equal(selector, '[data-alchemy-panel="formats"]');
      return { screenshot: async options => {
        assert.equal(options.timeout, 10000, "Existing formats screenshot timeout is not weakened");
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
  const servicePage = { ...page, locator: selector => selector === "[data-alchemy-panel]" ? main.locator(selector) : page.locator(selector) };
  return {
    output, calls, geometry, servicePage,
    run: (overrides = {}) => check(main, page, locale, width, overrides.output ?? output,
      overrides.capture ?? captureAlchemyPanelOverflow, assert,
      { error: (...args) => calls.push({ diagnosticError: String(args[1]) }) }),
    spanish: (overrides = {}) => spanishCheck(main, page, locale, width, overrides.output ?? output,
      overrides.capture ?? captureAlchemyPanelOverflow, assertAlchemyPanelOrder, assert,
      { error: (...args) => calls.push({ diagnosticError: args }) }),
    app: (overrides = {}) => appCheck(servicePage, overrides.output ?? output, locale, width,
      overrides.capture ?? captureAlchemyPanelOverflow, assertAlchemyPanelOrder, assert,
      { error: (...args) => calls.push({ diagnosticError: args }) },
      new Proxy({}, { get: () => assert.fail("Must use actual servicePage, not global page") })),
    json: () => readFile(join(output, "alchemy-" + locale + "-panel-overflow-" + width + ".json"), "utf8").then(JSON.parse),
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
  assert.equal(evidence.pathname, "/ru/services/alchemy-of-soul");
  assert.equal(Object.hasOwn(evidence, "url"), false);
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
  assert.equal(evidence.panelHeights.length, 10);
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

test("The ten-panel count assertion remains in force", async t => {
  const f = await fixture(t, { count: 9 });
  await assert.rejects(f.run(), { code: "ERR_ASSERTION", message: "Ten Alchemy chapters including video and public sample report\n\n9 !== 10\n" });
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
      if (selector === "[data-alchemy-payment-disclosure] > div") return paymentOptions;
      if (selector === '[data-alchemy-panel="formats"]') return null;
      assert.fail("Unexpected selector");
    },
    querySelectorAll: selector => selector === "[data-alchemy-panel]" ? [panel] : [card, ...card.children],
  };
  const collected = JSON.parse(JSON.stringify(runInNewContext("(" + collectAlchemyPanelGeometry + ")()", {
    document: {
      documentElement: { lang: "ru" },
      querySelector: selector => {
        if (selector === 'main[data-core-service-detail="alchemy"]') return main;
        assert.equal(selector, "details[data-alchemy-extended-guide]"); return null;
      },
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


test("Only the vertical reviews feed may exceed one viewport; the other nine panels remain bounded", async t => {
  const feed = await fixture(t, {height:300, reviewsHeight:4800});
  await feed.run({capture:()=>assert.fail("Twelve-review vertical feed must not be screen-clamped")});
  assert.deepEqual(feed.calls, []);
  for (const overflowPanel of names.filter(name => name !== "reviews")) {
    const f = await fixture(t, {height:765, reviewsHeight:4800, overflowPanel});
    await assert.rejects(f.run(), error => {
      assert.equal(error.code,"ERR_ASSERTION");
      assert.deepEqual(error.actual,[{name:overflowPanel,height:765,max:764}]);
      return true;
    });
  }
});

const oneScreenSource = await readFile(new URL("../scripts/verify-alchemy-one-screen.mjs", import.meta.url), "utf8");
const geometryStart = oneScreenSource.indexOf("      const issues = [];");
const geometryEnd = oneScreenSource.indexOf("      if (await root.locator(", geometryStart);
assert.ok(geometryStart>=0 && geometryEnd>geometryStart);
const geometryIssues = new Function("data", "width", "chapters", oneScreenSource.slice(geometryStart,geometryEnd)+"return issues;");
function validFeed() {
 return {documentWidth:390,panels:names.map(name=>({name,hasMedia:true,visual:"photo",height:name==="reviews"?4800:300,maxHeight:764,escapingChildren:0})),reviews:{topGap:20,bottomGap:20,cards:Array.from({length:12},(_,i)=>({id:"original-"+i,audio:i%2?"ru":"en",top:100+i*400,bottom:490+i*400,width:360,videoWidth:350}))}};
}
test("Actual Alchemy geometry block keeps ten ordered panels and exactly twelve truthful full-width vertical reviews", () => {
 assert.deepEqual(geometryIssues(validFeed(),390,names),[]);
 for (const [mutate, expected] of [
  [d=>d.panels[0].height=765,/exceeds/],
  [d=>d.panels.find(p=>p.name==="reviews").escapingChildren=1,/escaping/],
  [d=>d.panels.reverse(),/incorrect chapter order/],
  [d=>d.panels.pop(),/expected ten chapters/],
  [d=>d.reviews.cards.pop(),/expected 12/],
  [d=>d.reviews.cards[1].id=d.reviews.cards[0].id,/duplicate/],
  [d=>d.reviews.cards[0].audio="translated",/original-audio/],
  [d=>d.reviews.cards[1].top=0,/overlap/],
  [d=>d.reviews.cards[0].videoWidth=200,/full mobile width/],
  [d=>d.reviews.topGap=56,/empty space/],
  [d=>d.reviews.bottomGap=56,/empty space/],
  [d=>d.panels.find(p=>p.name==="report").hasMedia=false,/fictional report/],
 ]) {const data=validFeed();mutate(data);assert.match(geometryIssues(data,390,names).join(";"),expected);}
});

function originalAppOverflow(error, panel = "formats", height = 890) {
  assert.equal(error.code, "ERR_ASSERTION");
  assert.match(error.message, /Every collapsed Alchemy section except the twelve-video reviews feed must fit one phone screen:/);
  assert.deepEqual(error.actual, [{ name: panel, height, max: 764 }]);
  assert.deepEqual(error.expected, []);
  return true;
}

test("Existing Spanish caller retains its original mobile-only bound and shared diagnostics", async t => {
  const mobile = await fixture(t, { locale: "es", width: 390, height: 890, reviewsHeight: 7325 });
  await assert.rejects(mobile.spanish(), error => originalOverflow(error, 890));
  const evidence = await mobile.json();
  assert.equal(evidence.pathname, "/es/services/alchemy-of-soul");
  assert.equal(evidence.locale, "es");
  assert.deepEqual(evidence.overflow, [{ name: "formats", height: 890, max: 764 }]);
  const desktop = await fixture(t, { locale: "es", width: 1188, height: 890, reviewsHeight: 7325 });
  await desktop.spanish({ capture: () => assert.fail("Do not broaden existing Spanish caller scope") });
  assert.deepEqual(desktop.calls, []);
  assert.deepEqual(await readdir(desktop.output), []);
});

test("Actual App block keeps passing desktop cases and exempt reviews diagnostic-free", async t => {
  for (const height of [300, 763.4, 764]) {
    const f = await fixture(t, { height, width: 1280, locale: "en", reviewsHeight: 7325 });
    await f.app({ capture: () => assert.fail("No diagnostic actions on pass") });
    assert.deepEqual(f.calls, []);
    assert.deepEqual(await readdir(f.output), []);
  }
});

test("Actual App 1280 overflow captures actual servicePage before preserving the 890px verdict", async t => {
  const f = await fixture(t, { height: 890, width: 1280, locale: "en", reviewsHeight: 7325 });
  await assert.rejects(f.app({ capture: args => {
    assert.equal(args.page, f.servicePage, "Actual servicePage identity, not another page");
    return captureAlchemyPanelOverflow(args);
  } }), error => originalAppOverflow(error));
  const evidence = await f.json();
  assert.equal(evidence.locale, "en");
  assert.equal(evidence.pathname, "/en/services/alchemy-of-soul");
  assert.equal(evidence.requestedWidth, 1280);
  assert.deepEqual(evidence.configuredViewport, { width: 1280, height: 844 });
  assert.deepEqual(evidence.geometry.viewport, { width: 1280, height: 844 });
  assert.deepEqual(evidence.overflow, [{ name: "formats", height: 890, max: 764 }]);
  assert.equal(evidence.panelHeights.find(panel => panel.name === "reviews").height, 7325);
  assert.equal(evidence.geometryTiming, "later-than-original-panel-measurement; non-atomic; before-screenshots");
  assert.equal(f.calls[0], "geometry");
  assert.equal(f.calls[1].fullPage, true);
  assert.equal(f.calls[2].formats, true);
});

test("Actual App preserves every non-review guard and original approved-order assertion", async t => {
  for (const overflowPanel of names.filter(name => name !== "reviews")) {
    const f = await fixture(t, { height: 764.1, width: 1280, overflowPanel });
    await assert.rejects(f.app({ capture: async () => {} }), error => originalAppOverflow(error, overflowPanel, 765));
  }
  const missing = await fixture(t, { count: 9 });
  await assert.rejects(missing.app({ capture: () => assert.fail("Order failure precedes diagnostics") }),
    error => error.code === "ERR_ASSERTION" && error.message.includes("exactly ten unique panels in the approved order"));
  assert.deepEqual(missing.calls, []);
});

test("Actual App capture no-op, throwing capture and mutating capture cannot change original measurements", async t => {
  for (const throwing of [false, true]) {
    const f = await fixture(t, { height: 890, width: 1280 });
    await assert.rejects(f.app({ capture: async ({ panelHeights }) => {
      panelHeights.find(panel => panel.name === "formats").height = 1;
      panelHeights.reverse();
      panelHeights.splice(0, 3);
      if (throwing) throw new Error("private-error-text-must-not-be-logged");
    } }), error => originalAppOverflow(error));
    assert.deepEqual(f.calls, throwing ? [{ diagnosticError: ["ALCHEMY_PANEL_DIAGNOSTIC_FAILED"] }] : []);
  }
});

test("Actual App geometry, screenshot and write failures retain original assertion without raw error text", async t => {
  for (const options of [{ geometryError: true }, { screenshotError: true }, { geometryError: true, screenshotError: true }]) {
    const f = await fixture(t, { height: 890, width: 1280, ...options });
    await assert.rejects(f.app(), error => originalAppOverflow(error));
    const evidence = await f.json();
    assert.deepEqual(evidence.overflow, [{ name: "formats", height: 890, max: 764 }]);
    assert.ok(evidence.captureErrors.length > 0);
    assert.ok(evidence.captureErrors.every(entry => entry.failed === true && !Object.hasOwn(entry, "error")));
  }
  const f = await fixture(t, { height: 890, width: 1280 });
  const output = join(f.output, "file-not-directory");
  await writeFile(output, "occupied");
  await assert.rejects(f.app({ output }), error => originalAppOverflow(error));
  assert.deepEqual(f.calls.at(-1), { diagnosticError: ["ALCHEMY_PANEL_DIAGNOSTIC_FAILED"] });
});

test("Shared helper snapshots caller measurements before later page collection and does not read arbitrary URLs", async t => {
  const f = await fixture(t, { height: 890, width: 1280 });
  const panelHeights = names.map(name => ({ name, height: name === "formats" ? 890 : name === "reviews" ? 7325 : 300, max: 764 }));
  const original = structuredClone(panelHeights);
  const page = { ...f.servicePage, evaluate: async () => {
    panelHeights[0].height = 9999;
    return f.geometry;
  } };
  const evidence = await captureAlchemyPanelOverflow({ page, output: f.output, locale: "ru", width: 1280, panelHeights });
  assert.deepEqual(evidence.panelHeights, original, "Diagnostic snapshot is not a live alias to caller input");
  assert.deepEqual(evidence.overflow, [{ name: "formats", height: 890, max: 764 }]);
  assert.equal(Object.hasOwn(evidence, "url"), false);
});

test("Shared collector bounds children, captures actual disclosure states and rejects nonfinite geometry without reading private fields", () => {
  const rect = { x: 1, y: 2, top: 2, right: Infinity, bottom: 892, left: 1, width: 1100, height: 890 };
  const child = {
    localName: "div", children: [], getBoundingClientRect: () => rect,
    getAttribute: () => null, hasAttribute: () => false,
    get textContent() { assert.fail("No text"); }, get value() { assert.fail("No values"); },
    get innerHTML() { assert.fail("No markup"); }, get href() { assert.fail("No URLs"); },
  };
  const selector = Object.assign(Object.create(child), { children: Array.from({ length: 30 }, () => child) });
  for (const open of [false, true]) {
    const formats = Object.assign(Object.create(child), { querySelector: name => ({
      "[data-alchemy-booking-formats]": selector,
      "[data-alchemy-payment-disclosure]": { open },
      "[data-alchemy-format-details]": { open },
      "[data-contact-order]": { getAttribute: name => { assert.equal(name, "aria-expanded"); return String(open); } },
    })[name] });
    const main = { querySelector: name => name === '[data-alchemy-panel="formats"]' ? formats : selector,
      querySelectorAll: name => Array.from({ length: 40 }, () => name === "[data-alchemy-panel]" ? selector : child) };
    const raw = runInNewContext("(" + collectAlchemyPanelGeometry + ")()", {
      document: { documentElement: { lang: "en" }, querySelector: name => name === 'main[data-core-service-detail="alchemy"]' ? main : { open } },
      window: { innerWidth: 1280, innerHeight: 844, devicePixelRatio: 1, scrollX: 0, scrollY: 0 },
      getComputedStyle: () => ({ display: "block", height: "890px", marginTop: "12px", lineHeight: "24px" }),
    });
    assert.equal(raw.formatsSelector.children[0].box.right, null, "Finite filtering precedes JSON serialization");
    const collected = JSON.parse(JSON.stringify(raw));
    assert.deepEqual(collected.disclosures, {
      guide: { present: true, open }, payment: { present: true, open }, formatDetails: { present: true, open },
      formatsCapture: { present: true, expanded: open },
    });
    assert.equal(collected.formatsSelector.children.length, 8);
    assert.equal(collected.panels.length, 10);
    assert.equal(collected.panels[0].children.length, 12);
    assert.equal(collected.formatChoices.length, 24);
    assert.equal(collected.paymentOptions.children.length, 3);
    assert.equal(collected.formatsSelector.children[0].box.right, null);
    assert.equal(collected.formatsSelector.children[0].box.height, 890);
    assert.equal(collected.formatsSelector.children[0].style.marginTop, "12px");
    assert.doesNotMatch(JSON.stringify(collected), /textContent|innerHTML|href|"value"/);
  }
});
