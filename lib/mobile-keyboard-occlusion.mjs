// Viewport geometry only: never read an editor's value or infer consent.
export function nextMobileKeyboardOcclusion(previous, sample) {
  const { width, layoutHeight, visibleHeight, scale, hasViewport, editing } = sample
  if (![width, layoutHeight, visibleHeight, scale].every(Number.isFinite) || width <= 0 || layoutHeight <= 0 || visibleHeight <= 0) {
    return { width: 0, baselineHeight: 0, occluded: false }
  }
  const changedOrientation = previous && Math.abs(previous.width - width) > 1
  let baselineHeight = previous && !changedOrientation ? previous.baselineHeight : Math.max(layoutHeight, visibleHeight)
  if (!previous?.occluded && !editing) baselineHeight = Math.max(layoutHeight, visibleHeight)
  // Without VisualViewport, or during pinch zoom, keep navigation accessible.
  if (!hasViewport || width > 767 || Math.abs(scale - 1) > 0.05) {
    return { width, baselineHeight, occluded: false }
  }
  const loss = baselineHeight - visibleHeight
  // Browser chrome alone is not a keyboard. Focus only arms the detector;
  // the actual viewport must shrink substantially before hiding the bar.
  const threshold = Math.max(100, baselineHeight * 0.15)
  const occluded = Boolean(previous?.occluded && !changedOrientation)
    ? loss >= threshold
    : Boolean(editing && loss >= threshold)
  // Blur does not restore the bar underneath the pointer while the keyboard
  // still occludes the viewport; only viewport recovery clears that state.
  return { width, baselineHeight, occluded }
}
