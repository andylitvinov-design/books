import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflows = [
  ['.github/workflows/ia-v2.yml', 'ia-v2-'],
  ['.github/workflows/site-video-browser.yml', 'site-video-browser-'],
]

test('expensive PR workflows cancel only superseded runs for the same ref', () => {
  for (const [path, group] of workflows) {
    const source = readFileSync(path, 'utf8')
    assert.match(source, /^concurrency:\n  group: /m, path)
    const condition = "github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after"
    const groupCondition = "github.event_name == 'pull_request'"
    assert.ok(source.includes('group: ' + group + '${{ ' + groupCondition + " && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"), path)
    assert.ok(source.includes('cancel-in-progress: ${{ ' + condition + ' }}'), path)
  }
})
