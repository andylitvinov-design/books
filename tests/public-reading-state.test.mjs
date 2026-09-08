import assert from 'node:assert/strict'
import test from 'node:test'

import { sanitizePublicReadingState } from '../lib/public-reading-state.js'

test('stores only known public remedy slugs once across locales', () => {
  const state = sanitizePublicReadingState({ version: 1, savedSlugs: ['arnica', 'arnica', 'missing'], recent: [{ slug: 'gelsemium', viewedAt: '2026-09-08T00:00:00.000Z' }] }, new Set(['arnica', 'gelsemium']))
  assert.deepEqual(state.savedSlugs, ['arnica'])
  assert.deepEqual(state.recent.map((entry) => entry.slug), ['gelsemium'])
})
