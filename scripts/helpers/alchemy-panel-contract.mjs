import assert from 'node:assert/strict'

// Owner-requested featured video precedes the retained original service panels.
export const ALCHEMY_PANEL_IDS = Object.freeze([
  'featured-video', 'hero', 'situations', 'method', 'video',
  'reviews', 'formats', 'faq', 'request',
])

export function assertAlchemyPanelOrder(measurements) {
  assert.deepEqual(measurements.map(panel => panel.name), ALCHEMY_PANEL_IDS,
    'Alchemy must retain exactly nine unique panels in the approved order')
}
