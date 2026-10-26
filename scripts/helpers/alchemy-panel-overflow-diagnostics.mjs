import { writeFile } from "node:fs/promises";

// Read-only geometry of the public landing page. Do not collect text, input
// values, link destinations, storage, or account/client data.
export function collectAlchemyPanelGeometry() {
  const finite = value => Number.isFinite(value) ? value : null;
  const bounded = (nodes, limit) => Array.from(nodes || []).slice(0, limit);
  const locales = ["en", "ru", "es"];
  const documentLocale = locales.includes(document.documentElement.lang) ? document.documentElement.lang : null;
  const box = (node) => {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return Object.fromEntries(["x", "y", "top", "right", "bottom", "left", "width", "height"]
      .map(key => [key, finite(rect[key])]));
  };
  const describe = (node) => {
    const style = getComputedStyle(node);
    return {
      tag: node.localName,
      box: box(node),
      style: Object.fromEntries(["display", "marginTop", "marginRight", "marginBottom", "marginLeft",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "gap", "rowGap", "columnGap",
        "fontSize", "lineHeight"].map(key => [key, style[key]])),
    };
  };
  const main = document.querySelector('main[data-core-service-detail="alchemy"]');
  const paymentOptions = main?.querySelector("[data-alchemy-payment-disclosure] > div");
  const formats = main?.querySelector('[data-alchemy-panel="formats"]');
  const selector = formats?.querySelector("[data-alchemy-booking-formats]");
  const disclosure = node => ({ present: Boolean(node), open: node ? Boolean(node.open) : null });
  const capture = formats?.querySelector("[data-contact-order]");
  const expanded = capture?.getAttribute("aria-expanded");
  return {
    documentLocale,
    viewport: {
      width: finite(window.innerWidth),
      height: finite(window.innerHeight),
      devicePixelRatio: finite(window.devicePixelRatio),
      scrollX: finite(window.scrollX),
      scrollY: finite(window.scrollY),
    },
    disclosures: {
      guide: disclosure(document.querySelector("details[data-alchemy-extended-guide]")),
      payment: disclosure(formats?.querySelector("[data-alchemy-payment-disclosure]")),
      formatDetails: disclosure(formats?.querySelector("[data-alchemy-format-details]")),
      formatsCapture: { present: Boolean(capture), expanded: expanded === "true" ? true : expanded === "false" ? false : null },
    },
    panels: bounded(main?.querySelectorAll("[data-alchemy-panel]"), 10).map(node => ({
      name: node.getAttribute("data-alchemy-panel"),
      ...describe(node),
      children: bounded(node.children, 12).map(describe),
    })),
    formatsSelector: selector ? { ...describe(selector), children: bounded(selector.children, 8).map(describe) } : null,
    formatChoices: bounded(main?.querySelectorAll("[data-alchemy-format], [data-alchemy-format] span, [data-alchemy-format] strong, [data-alchemy-format] small"), 24).map(node => ({
      format: node.getAttribute("data-alchemy-format"),
      ...describe(node),
    })),
    paymentOptions: paymentOptions ? {
      ...describe(paymentOptions),
      children: bounded(paymentOptions.children, 3).map(node => ({
        ...describe(node),
        markers: ["data-wise-payment-link", "data-paypal-personal-offer", "data-zen-manual-request"]
          .filter(attribute => node.hasAttribute(attribute)),
        children: bounded(node.children, 4).map(describe),
      })),
    } : null,
  };
}

export async function captureAlchemyPanelOverflow({ page, output, locale, width, panelHeights }) {
  if (!["en", "ru", "es"].includes(locale) || !Number.isFinite(width) || width <= 0) {
    throw new Error("INVALID_ALCHEMY_DIAGNOSTIC_CASE");
  }
  const snapshot = panelHeights.map(({ name, height, max }) => ({ name, height, max }));
  const viewport = page.viewportSize();
  const stem = output + "/alchemy-" + locale + "-panel-overflow-" + width;
  const evidence = {
    pathname: "/" + locale + "/services/alchemy-of-soul",
    locale,
    requestedWidth: width,
    configuredViewport: viewport ? {
      width: Number.isFinite(viewport.width) ? viewport.width : null,
      height: Number.isFinite(viewport.height) ? viewport.height : null,
    } : null,
    capturedAt: new Date().toISOString(),
    panelHeights: snapshot,
    overflow: snapshot.filter(panel => panel.name !== "reviews" && panel.height > panel.max),
    geometryTiming: "later-than-original-panel-measurement; non-atomic; before-screenshots",
    geometry: null,
    screenshot: { path: stem + ".png", fullPage: true, captured: false },
    captureErrors: [],
  };
  // This later state/geometry sample is not atomic with the original verdict.
  // Collect it before screenshots, which may temporarily resize or scroll.
  try {
    evidence.geometry = await page.evaluate(collectAlchemyPanelGeometry);
  } catch {
    evidence.captureErrors.push({ stage: "geometry", failed: true });
  }
  try {
    await page.screenshot({ path: evidence.screenshot.path, fullPage: true, timeout: 10000 });
    evidence.screenshot.captured = true;
  } catch {
    evidence.captureErrors.push({ stage: "screenshot", failed: true });
  }
  if (evidence.overflow.some(panel => panel.name === "formats")) {
    evidence.formatsScreenshot = { path: stem + "-formats.png", captured: false };
    try {
      await page.locator('[data-alchemy-panel="formats"]').screenshot({
        path: evidence.formatsScreenshot.path, timeout: 10000,
      });
      evidence.formatsScreenshot.captured = true;
    } catch {
      evidence.captureErrors.push({ stage: "formats-screenshot", failed: true });
    }
  }
  // Persist the original measurement even if the page/screenshot is unavailable.
  // The caller catches a write failure and still executes the strict assertion.
  await writeFile(stem + ".json", JSON.stringify(evidence, null, 2) + "\n");
  return evidence;
}
