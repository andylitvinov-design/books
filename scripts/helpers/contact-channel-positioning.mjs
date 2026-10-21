// Browser acceptance preparation only. Keep Playwright's stability/readiness
// wait, then center this exact link instead of relying on Chromium's
// closest-edge positioning for partially visible fractional-pixel bounds.
// The caller still applies its unchanged full-viewport and hit-target checks.
export async function positionContactChannelForHitTest(link) {
  await link.scrollIntoViewIfNeeded();
  await link.evaluate(anchor => {
    anchor.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  });
}
