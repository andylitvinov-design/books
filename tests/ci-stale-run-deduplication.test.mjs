import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflows = [
  ['.github/workflows/ia-v2.yml', 'ia-v2-'],
  ['.github/workflows/site-video-browser.yml', 'site-video-browser-'],
  ['.github/workflows/hh-app-browser.yml', 'app-r1-browser-'],
  ['.github/workflows/hh-app-r1.yml', 'app-r1-'],
]
const samePr = "${{ github.event_name == 'pull_request' && github.run_attempt == 1 && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"
const superseded = "${{ github.event_name == 'pull_request' && github.run_attempt == 1 && github.event.action == 'synchronize' }}"

test('expensive workflows cancel only earlier first attempts for the same PR, never manual reruns', () => {
  for (const [path, group] of workflows) {
    const source = readFileSync(path, 'utf8')
    assert.ok(source.includes('group: ' + group + samePr), path)
    assert.ok(source.includes('cancel-in-progress: ' + superseded), path)
    assert.ok(!source.includes('github.event.before != github.event.after'), path)
  }
})

test('browser binary cache is production-seeded and restored read-only; no check status reused', () => {
  const seed = readFileSync('.github/workflows/hh-public-playwright-cache.yml','utf8')
  const key = 'hh-public-browser-blobs-${{ runner.os }}-${{ runner.arch }}-pw1.63.0-v1'
  assert.ok(seed.includes('key: ' + key))
  assert.ok(seed.includes('actions/cache/save@v4'))
  for (const path of [
    '.github/workflows/ia-v2.yml',
    '.github/workflows/site-video-browser.yml',
    '.github/workflows/hh-app-browser.yml'
  ]) {
    const source = readFileSync(path,'utf8')
    assert.ok(source.includes('actions/cache/restore@v4'), path)
    assert.ok(source.includes('key: ' + key), path)
    assert.ok(!source.includes('actions/cache/save@v4'), path)
    assert.match(source, /playwright install --with-deps/, path)
  }
})
