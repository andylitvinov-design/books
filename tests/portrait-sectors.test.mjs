import test from 'node:test'
import assert from 'node:assert/strict'
import { TEST_EXPLORER_AXES } from '../lib/assessments/test-explorer.js'
import {
  PORTRAIT_SECTORS, PORTRAIT_SECTOR_KEYS, PORTRAIT_AXIS_ORDER,
  portraitAngleForAxis, portraitAxesForSectors,
} from '../lib/assessments/portrait-sectors.js'

test('portrait grouping partitions all 17 directional axes exactly once and excludes personality', () => {
  const available = TEST_EXPLORER_AXES.filter((axis) => axis !== 'personality')
  assert.equal(PORTRAIT_SECTORS.length, 4)
  assert.equal(PORTRAIT_AXIS_ORDER.length, 17)
  assert.equal(new Set(PORTRAIT_AXIS_ORDER).size, 17)
  assert.deepEqual([...PORTRAIT_AXIS_ORDER].sort(), [...available].sort())
  assert.equal(PORTRAIT_AXIS_ORDER.includes('personality'), false)
  assert.deepEqual(PORTRAIT_SECTORS.map((sector) => sector.axes.length), [5, 3, 4, 5])
})

test('sector filters support none, one, several, all without losing data or reordering axes', () => {
  assert.deepEqual(portraitAxesForSectors([]), [])
  assert.deepEqual(portraitAxesForSectors(['body']), PORTRAIT_SECTORS[0].axes)
  assert.deepEqual(portraitAxesForSectors(['growth', 'body']), [...PORTRAIT_SECTORS[0].axes, ...PORTRAIT_SECTORS[3].axes])
  assert.deepEqual(portraitAxesForSectors(PORTRAIT_SECTOR_KEYS), PORTRAIT_AXIS_ORDER)
  assert.deepEqual(portraitAxesForSectors(['not-a-sector']), [])
})

test('each scale keeps its own stable angle inside the named quadrant', () => {
  for (const [sectorIndex, sector] of PORTRAIT_SECTORS.entries()) {
    for (const axis of sector.axes) {
      const angle = portraitAngleForAxis(axis)
      assert.ok(Number.isFinite(angle))
      const start = -Math.PI / 2 + sectorIndex * Math.PI / 2
      assert.ok(angle > start && angle < start + Math.PI / 2, axis)
    }
  }
  assert.equal(portraitAngleForAxis('personality'), null)
  assert.equal(portraitAngleForAxis('non-existent'), null)
})

test('each sector has localized public labels', () => {
  for (const sector of PORTRAIT_SECTORS) {
    for (const lang of ['en', 'ru', 'es']) assert.ok(sector.label[lang], sector.key + '/' + lang)
  }
})
