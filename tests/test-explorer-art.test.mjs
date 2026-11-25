import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

test('approved Explorer portrait is bundled and visible in the interactive model', () => {
  const source = readFileSync('components/app/test-explorer-visual.jsx', 'utf8')
  assert.match(source, /holistic-house-test-brain-concept\.png/)
  assert.match(source, /TestExplorerVisual/)
  assert.match(source, /onAxisFilter/)
  const path = 'public/images/holistic-house-test-brain-concept.png'
  assert.ok(statSync(path).size > 100_000)
  assert.deepEqual([...readFileSync(path).subarray(0,8)],[137,80,78,71,13,10,26,10])
})
