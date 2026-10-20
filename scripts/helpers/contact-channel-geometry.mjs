// Failure-only, read-only browser evidence. Deliberately omit text, form values,
// hrefs and HTML: the geometry must identify the obstruction, not copy contacts.
// Keep this function self-contained so Playwright can serialize it unchanged.
export function collectContactChannelGeometry({ channel, panelId }) {
  const describe = element => element ? {
    tag: element.tagName?.toLowerCase() || null,
    className: typeof element.className === 'string' ? element.className : null,
  } : null;
  const measure = element => {
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      element: describe(element), rect: element.getBoundingClientRect().toJSON(),
      style: {
        display: style.display, visibility: style.visibility,
        pointerEvents: style.pointerEvents, position: style.position,
        zIndex: style.zIndex, overflowX: style.overflowX, overflowY: style.overflowY,
        contain: style.contain, transform: style.transform,
        scrollMarginTop: style.scrollMarginTop, scrollMarginBottom: style.scrollMarginBottom,
      },
      scrollTop: element.scrollTop, scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  };
  const panel = document.getElementById(panelId);
  const anchor = panel?.querySelector('a[data-contact-channel="' + channel + '"]');
  const rect = anchor?.getBoundingClientRect();
  const point = rect ? { x: rect.left + rect.width / 2, y: rect.bottom - 6 } : null;
  const hit = point ? document.elementFromPoint(point.x, point.y) : null;
  const closest = hit?.closest('a[data-contact-channel="' + channel + '"]');
  const ancestors = [];
  for (let element = anchor?.parentElement; element && ancestors.length < 12; element = element.parentElement) {
    ancestors.push(measure(element));
  }
  return {
    checkedAt: new Date().toISOString(), channel, panelId,
    reason: !rect ? 'missing-anchor'
      : rect.top < 0 || rect.bottom > innerHeight ? 'outside-viewport'
        : !closest ? 'hit-target-obstructed' : closest !== anchor ? 'different-channel-target' : 'reachable',
    anchor: measure(anchor), panel: measure(panel),
    nav: measure(document.querySelector('.mobile-bottom-navigation')),
    viewport: {
      width: innerWidth, height: innerHeight, scrollX, scrollY,
      documentScrollHeight: document.scrollingElement?.scrollHeight ?? null,
      visual: window.visualViewport ? {
        width: window.visualViewport.width, height: window.visualViewport.height,
        offsetTop: window.visualViewport.offsetTop, offsetLeft: window.visualViewport.offsetLeft,
        scale: window.visualViewport.scale,
      } : null,
    },
    point, hit: describe(hit), closestChannel: describe(closest),
    hitIsIntendedAnchor: closest === anchor && Boolean(anchor),
    hitStack: point ? document.elementsFromPoint(point.x, point.y).slice(0, 6).map(describe) : [],
    ancestors,
  };
}
