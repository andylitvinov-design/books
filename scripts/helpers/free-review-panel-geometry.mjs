import assert from 'node:assert/strict';

export const freeReviewPanelNames = [
  'hero', 'situations-intro', 'situation-1', 'situation-2', 'situation-3', 'situation-4',
  'outcomes', 'testimonials', 'alchemy', 'about', 'faq', 'steps', 'final',
];

// Runs in page.evaluate: no framework internals, requests or private data.
export function readFreeReviewPanelGeometry() {
  const max = window.innerHeight - 90;
  const measure = (name, nodes) => {
    const node = nodes.length === 1 ? nodes[0] : null;
    return {
      name, count: nodes.length,
      height: node ? Math.ceil(node.getBoundingClientRect().height) : 9999,
      clipped: node ? node.scrollHeight > node.clientHeight + 1 : true,
      max,
    };
  };
  const roots = document.querySelectorAll('#situations');
  const root = roots.length === 1 ? roots[0] : null;
  const scenes = root ? [...root.querySelectorAll('article[class*="situationScene"]')] : [];
  const introNodes = root ? root.querySelectorAll(':scope > p, :scope > h2') : [];
  const intro = {
    name: 'situations-intro', count: roots.length === 1 && introNodes.length === 3 ? 1 : 0,
    height: root && scenes[0] ? Math.ceil(scenes[0].getBoundingClientRect().top - root.getBoundingClientRect().top) : 9999,
    clipped: false, max,
  };
  const panels = [measure('hero', document.querySelectorAll('section[aria-labelledby="review-hero-title"]')), intro];
  for (let index = 0; index < 4; index++) panels.push(measure('situation-' + (index + 1), scenes[index] ? [scenes[index]] : []));
  for (const [name, selector] of Object.entries({
    outcomes: 'section[aria-labelledby="review-outcomes-title"]',
    testimonials: '[data-personal-testimonials="all"]',
    alchemy: 'section[aria-labelledby="review-alchemy-title"]',
    about: 'section[aria-labelledby="review-about-title"]',
    faq: 'section[aria-labelledby="review-faq-title"]',
    steps: '#how-it-works',
    final: 'section[aria-labelledby="review-final-title"]',
  })) panels.push(measure(name, document.querySelectorAll(selector)));
  return { viewportHeight: window.innerHeight, situationSceneCount: scenes.length, panels };
}

export function assertFreeReviewPanelGeometry(report) {
  assert.ok(Number.isFinite(report.viewportHeight) && report.viewportHeight > 90, 'A real mobile viewport is required');
  assert.equal(report.situationSceneCount, 4, 'Preserve all four distinct situation scenes');
  assert.deepEqual(report.panels.map(panel => panel.name), freeReviewPanelNames, 'Measure every semantic landing panel exactly once');
  for (const panel of report.panels) {
    assert.equal(panel.count, 1, panel.name + ': exactly one panel is required');
    assert.ok(Number.isFinite(panel.height) && panel.height > 0, panel.name + ': a visible panel is required');
    assert.equal(panel.max, report.viewportHeight - 90, panel.name + ': preserve the existing viewport budget');
    assert.equal(panel.clipped, false, panel.name + ': full panel content must not be clipped');
  }
  assert.deepEqual(report.panels.filter(panel => panel.height > panel.max), [],
    'Each collapsed mobile landing panel should fit within one viewport: ' + JSON.stringify(report.panels));
}
