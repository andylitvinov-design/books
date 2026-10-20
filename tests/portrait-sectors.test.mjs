import test from 'node:test'
import assert from 'node:assert/strict'
import { TEST_EXPLORER_AXES } from '../lib/assessments/test-explorer.js'
import {
  PORTRAIT_SECTORS, PORTRAIT_SECTOR_KEYS, PORTRAIT_AXIS_ORDER,
  portraitAngleForAxis, portraitAxesForSectors, portraitSectorMidAngle, summarizePortraitSectors,
  portraitFullCircleAngleForAxis,
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

test('All reports only actual measured coverage, never composite wellbeing values', () => {
  const portrait = {axes:{
    stress:{percent:20},sleep:{percent:80},clarity:{percent:40},
    relationships:{percent:65},boundaries:{percent:75},meaning:{percent:90},
  }}
  const summary = summarizePortraitSectors(portrait)
  assert.deepEqual(summary.map(row => [row.key,row.percent,row.measured,row.total,row.coveragePercent]), [
    ['body',null,2,5,40],['work',null,1,3,33],['relationships',null,2,4,50],['growth',null,1,5,20],
  ])
  assert.deepEqual(summary.map(s => Math.round(portraitSectorMidAngle(s.key) * 1e6)),
    PORTRAIT_SECTOR_KEYS.map((key,index) => Math.round((-Math.PI / 2 + (index+.5) * Math.PI / 2) * 1e6)))
})

test('No result: four sectors remain unmeasured, not percentages or health norms', () => {
  const absent = summarizePortraitSectors(null)
  assert.equal(absent.length, 4)
  assert.deepEqual(absent.map(x => x.percent), [null,null,null,null])
  assert.deepEqual(absent.map(x => x.measured), [0,0,0,0])
  assert.equal(portraitSectorMidAngle('invalid'), null)
  const invalid = summarizePortraitSectors({axes:{
    stress:{percent:NaN},anxiety:{percent:-2},sleep:{percent:101},energy:{percent:'40'},
    clarity:{percent:0},focus:{percent:100},
  }})
  assert.equal(invalid[0].percent,null)
  assert.equal(invalid[1].percent,null)
  assert.equal(invalid[1].coveragePercent,67)
  assert.equal(invalid[1].measured,2)
  assert.deepEqual(PORTRAIT_SECTOR_KEYS, ['body','work','relationships','growth'])
})

test('selected category scales occupy full 360°, not their old quarter',()=>{
  for(const sector of PORTRAIT_SECTORS){
    const angles=sector.axes.map(axis=>portraitFullCircleAngleForAxis(axis,sector.key))
    assert.equal(angles.length,sector.axes.length)
    assert.ok(angles.every(Number.isFinite))
    assert.equal(angles[0],-Math.PI/2)
    for(let i=1;i<angles.length;i++){
      assert.ok(Math.abs((angles[i]-angles[i-1])-(2*Math.PI/angles.length))<1e-10)
    }
    // The last and first axes are equally spaced around the wrap.
    assert.ok(Math.abs((angles[0]+Math.PI*2-angles.at(-1))-(2*Math.PI/angles.length))<1e-10)
    assert.equal(portraitFullCircleAngleForAxis('personality',sector.key),null)
    assert.equal(portraitFullCircleAngleForAxis('unrelated',sector.key),null)
  }
  assert.equal(portraitFullCircleAngleForAxis('stress','not-a-sector'),null)
  assert.equal(portraitFullCircleAngleForAxis('stress','growth'),null)
  // Existing domain membership remains unchanged, so no test scoring or
  // report/result storage migration is needed for the new presentation.
  assert.deepEqual(PORTRAIT_SECTOR_KEYS,['body','work','relationships','growth'])
})
