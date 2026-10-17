import test from 'node:test'
import assert from 'node:assert/strict'
import { layoutPortraitRayLabels, portraitLabelLines } from '../lib/assessments/portrait-ray-labels.js'

const axes = [
  'Stress', 'Anxiety', 'Mood', 'Sleep', 'Energy', 'Clarity', 'Focus',
  'Emotional regulation', 'Relationships', 'Intimacy', 'Boundaries & consent',
  'Sexual wellbeing', 'Body presence', 'Resilience / resource',
  'Self-support', 'Daily functioning', 'Meaning / direction',
]

function rays(indices, names = axes) {
  return indices.map((i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 17
    return {
      axis: String(i),
      label: names[i],
      ideal: { x: 180 + Math.cos(angle) * 131, y: 182 + Math.sin(angle) * 131 },
      measured: i % 2 === 0,
    }
  })
}

function assertNoOverlaps(labels) {
  for (const side of ['left', 'right']) {
    const column = labels.filter((item) => item.side === side).sort((a, b) => a.y - b.y)
    for (const [i, item] of column.entries()) {
      assert.ok(item.y >= 7 && item.y + item.height <= 382, `Out of viewBox: ${item.label}`)
      assert.ok(item.x >= 0 && item.x + item.width <= 360, `Overflow: ${item.label}`)
      assert.equal(item.lines.join(' '), item.label)
      assert.equal(item.anchor.y, item.y + item.height / 2)
      if (i > 0) assert.ok(column[i - 1].y + column[i - 1].height + 4 <= item.y, `Overlap: ${item.label}`)
    }
  }
}

test('portrait captions stay near their rays, fit mobile SVG and never collide for 10 chosen axes', () => {
  for (const indices of [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [8, 9, 10, 11, 12, 13, 14, 15, 16],
    [0, 3, 6, 8, 10, 12, 14, 16],
  ]) {
    const labels = layoutPortraitRayLabels(rays(indices))
    assert.equal(labels.length, indices.length)
    assertNoOverlaps(labels)
    assert.deepEqual(labels.map((item) => item.axis), indices.map(String))
  }
})

test('localized long labels are wrapped without abbreviations or missing axes', () => {
  const names = [...axes]
  names[7] = 'Эмоциональная регуляция'
  names[10] = 'Границы и согласие'
  names[11] = 'Сексуальное благополучие'
  names[16] = 'Смысл и направление'
  const labels = layoutPortraitRayLabels(rays([7, 10, 11, 16], names))
  assertNoOverlaps(labels)
  assert.deepEqual(portraitLabelLines('Regulación emocional'), ['Regulación', 'emocional'])
  assert.deepEqual(portraitLabelLines('Stress'), ['Stress'])
  assert.ok(labels.every((item) => item.lines.length <= 2))
})

test('changing selected scales labels only selected rays and preserves measured state', () => {
  const chosen = rays([1, 6, 15])
  const labels = layoutPortraitRayLabels(chosen)
  assert.deepEqual(labels.map((item) => item.axis), ['1', '6', '15'])
  assert.deepEqual(labels.map((item) => item.measured), [false, true, false])
  assert.deepEqual(layoutPortraitRayLabels([]), [])
})
