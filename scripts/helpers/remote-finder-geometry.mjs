import assert from 'node:assert/strict';

// One passive layout sample: never focus, blur, scroll, click or wait. The
// existing fill and natural sector tap own the actual editing transitions.
export async function remoteFinderGeometry(page) {
  return page.evaluate(() => {
    const rect = node => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return {x:r.x, y:r.y, width:r.width, height:r.height};
    };
    const navs = document.querySelectorAll('.mobile-bottom-navigation');
    const nav = navs[0];
    const viewport = window.visualViewport;
    const finder = document.querySelector('[data-remote-find-options]');
    const visibleStyle = node => Boolean(node && getComputedStyle(node).display !== 'none' &&
      !['hidden', 'collapse'].includes(getComputedStyle(node).visibility));
    return {
      navCount:navs.length, nav:rect(nav),
      navDisplay:nav ? getComputedStyle(nav).display : null,
      finder:rect(finder), finderVisible:visibleStyle(finder), navVisible:visibleStyle(nav),
      editorFocused:document.activeElement === document.querySelector('#remote-intention'),
      paddingBottom:parseFloat(getComputedStyle(document.body).paddingBottom),
      viewport:{x:viewport?.offsetLeft ?? 0, y:viewport?.offsetTop ?? 0,
        width:viewport?.width ?? innerWidth, height:viewport?.height ?? innerHeight},
    };
  });
}

export function assertRemoteFinderGeometry(sample, {phase, label, baseline}) {
  // Numeric/style-only evidence survives a failing assertion before the success
  // artifact is written; no private intention, input value or text is retained.
  label += ' ' + JSON.stringify({phase, ...sample});
  assert.ok(['initial', 'editing', 'restored'].includes(phase));
  const {finder, nav, viewport} = sample;
  const positive = box => box && Object.values(box).every(Number.isFinite) && box.width > 0 && box.height > 0;
  assert.ok(positive(viewport) && positive(finder), label + ': measured finder and visual viewport');
  assert.equal(sample.navCount, 1, label + ': exactly one global mobile navigation');
  assert.equal(sample.finderVisible, true, label + ': finder CTA is not visually hidden');
  assert.ok(finder.x >= viewport.x - 1 && finder.x + finder.width <= viewport.x + viewport.width + 1 &&
    finder.y >= viewport.y - 1 && finder.y + finder.height <= viewport.y + viewport.height + 2,
    label + ': complete finder CTA fits the actual visual viewport during ' + phase);
  if (phase === 'editing') {
    assert.ok(baseline && positive(baseline.nav), label + ': editing requires proven initial navigation geometry');
    assert.equal(sample.editorFocused, true, label + ': existing fill really focuses optional wishes');
    assert.equal(sample.navDisplay, 'none', label + ': intentional focused-editor CSS hides navigation');
    assert.equal(sample.navVisible, false, label + ': focused navigation is visually hidden');
    assert.ok(nav && nav.width === 0 && nav.height === 0, label + ': hidden navigation has no visible fixed layer');
    assert.ok(Number.isFinite(sample.paddingBottom) && sample.paddingBottom >= baseline.nav.height - 1,
      label + ': focused editor retains the measured navigation page clearance');
  } else {
    assert.equal(sample.editorFocused, false, label + ': navigation measured outside optional-wishes editing');
    assert.notEqual(sample.navDisplay, 'none', label + ': actual navigation is visible during ' + phase);
    assert.equal(sample.navVisible, true, label + ': navigation is not visually hidden during ' + phase);
    assert.ok(positive(nav), label + ': actual visible navigation geometry during ' + phase);
    assert.ok(nav.x >= viewport.x - 1 && nav.x + nav.width <= viewport.x + viewport.width + 1 &&
      nav.y >= viewport.y - 1 && nav.y + nav.height <= viewport.y + viewport.height + 2,
      label + ': restored navigation fits the actual visual viewport during ' + phase);
    assert.ok(finder.y + finder.height <= nav.y + 2,
      label + ': complete finder CTA is above fixed mobile navigation during ' + phase);
  }
}
