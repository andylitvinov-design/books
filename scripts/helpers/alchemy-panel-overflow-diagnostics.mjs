import { writeFile } from "node:fs/promises";

// Read-only geometry of the public landing page. Do not collect text, input
// values, link destinations, storage, or account/client data.
export function collectAlchemyPanelGeometry() {
  const box = (node) => {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return Object.fromEntries(["x", "y", "top", "right", "bottom", "left", "width", "height"]
      .map(key => [key, rect[key]]));
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
  return {
    documentLocale: document.documentElement.lang,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    panels: Array.from(main?.querySelectorAll("[data-alchemy-panel]") || [], node => ({
      name: node.getAttribute("data-alchemy-panel"),
      ...describe(node),
      children: Array.from(node.children, describe),
    })),
    formatChoices: Array.from(main?.querySelectorAll("[data-alchemy-format], [data-alchemy-format] span, [data-alchemy-format] strong, [data-alchemy-format] small") || [], node => ({
      format: node.getAttribute("data-alchemy-format"),
      ...describe(node),
    })),
    paymentOptions: paymentOptions ? {
      ...describe(paymentOptions),
      children: Array.from(paymentOptions.children, node => ({
        ...describe(node),
        markers: ["data-wise-payment-link", "data-paypal-personal-offer", "data-zen-manual-request"]
          .filter(attribute => node.hasAttribute(attribute)),
        children: Array.from(node.children, describe),
      })),
    } : null,
  };
}

export async function captureAlchemyPanelOverflow({ page, output, locale, width, panelHeights }) {
  const stem = output + "/alchemy-" + locale + "-panel-overflow-" + width;
  const evidence = {
    url: page.url(),
    locale,
    requestedWidth: width,
    configuredViewport: page.viewportSize(),
    capturedAt: new Date().toISOString(),
    panelHeights,
    overflow: panelHeights.filter(panel => panel.height > panel.max),
    geometry: null,
    screenshot: { path: stem + ".png", fullPage: true, captured: false },
    captureErrors: [],
  };
  // Collect rectangles first: full-page screenshots may temporarily resize the
  // viewport, so their capture must not alter the recorded failure geometry.
  try {
    evidence.geometry = await page.evaluate(collectAlchemyPanelGeometry);
  } catch (error) {
    evidence.captureErrors.push({ stage: "geometry", error: String(error) });
  }
  try {
    await page.screenshot({ path: evidence.screenshot.path, fullPage: true, timeout: 10000 });
    evidence.screenshot.captured = true;
  } catch (error) {
    evidence.captureErrors.push({ stage: "screenshot", error: String(error) });
  }
  if (evidence.overflow.some(panel => panel.name === "formats")) {
    evidence.formatsScreenshot = { path: stem + "-formats.png", captured: false };
    try {
      await page.locator('[data-alchemy-panel="formats"]').screenshot({
        path: evidence.formatsScreenshot.path, timeout: 10000,
      });
      evidence.formatsScreenshot.captured = true;
    } catch (error) {
      evidence.captureErrors.push({ stage: "formats-screenshot", error: String(error) });
    }
  }
  // Persist the original measurement even if the page/screenshot is unavailable.
  // The caller catches a write failure and still executes the strict assertion.
  await writeFile(stem + ".json", JSON.stringify(evidence, null, 2) + "\n");
  return evidence;
}
