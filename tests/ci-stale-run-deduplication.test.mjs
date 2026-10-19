import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflows = [
  ['.github/workflows/ia-v2.yml', 'ia-v2-${{ github.ref }}'],
  ['.github/workflows/site-video-browser.yml', 'site-video-browser-${{ github.ref }}'],
  ['.github/workflows/release-reaudit.yml', 'release-reaudit-${{ github.ref }}'],
]

test('expensive PR workflows cancel only superseded runs for the same ref', () => {
  for (const [path, group] of workflows) {
    const source = readFileSync(path, 'utf8')
    assert.match(source, /^concurrency:\n  group: /m, path)
    assert.match(source, new RegExp(`^  group: ${group.replace(/[{}$]/g, '\\$&')}$`, 'm'), path)
    assert.match(source, /^  cancel-in-progress: true$/m, path)
  }
})
