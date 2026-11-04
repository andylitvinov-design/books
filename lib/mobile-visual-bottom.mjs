/**
 * Distance between the layout viewport's lower edge and the part actually
 * visible to a user. Safari's expanding bottom toolbar and software keyboard
 * can reduce the VisualViewport while CSS position:fixed still uses the layout
 * viewport. No UA sniffing, magic browser-specific toolbar sizes or polling.
 */
export function mobileVisualBottomGap({layoutHeight, visualHeight, visualOffsetTop = 0} = {}) {
  if (!Number.isFinite(layoutHeight) || layoutHeight <= 0 ||
      !Number.isFinite(visualHeight) || visualHeight <= 0) return 0;
  const offset = Number.isFinite(visualOffsetTop) ? Math.max(0, visualOffsetTop) : 0;
  // The cap guards against stale transient measurements during navigation and
  // rotation. A keyboard-focused dock is hidden separately by page CSS.
  return Math.round(Math.min(
    Math.max(0, layoutHeight - visualHeight - offset),
    Math.min(320, layoutHeight / 2),
  ));
}

/**
 * Apply an inset to a fixed dock only when its real bottom does not meet
 * the VisualViewport bottom. A modern Safari dock already at the edge needs
 * zero correction even when 100vh, 100dvh and VisualViewport differ.
 *
 * currentInset is included in dockBottom's measured rectangle. Adding the
 * measured error makes the next update idempotent, not cumulative on scroll.
 */
export function visualDockBottomCorrection({dockBottom, visualBottom, currentInset = 0} = {}) {
  if (![dockBottom, visualBottom, currentInset].every(Number.isFinite)) return 0;
  return Math.round(Math.max(0, Math.min(320, currentInset + dockBottom - visualBottom)));
}
