import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const workflows = [
  ['.github/workflows/ia-v2.yml', 'ia-v2-'],
  ['.github/workflows/site-video-browser.yml', 'site-video-browser-'],
]

test('expensive PR workflows cancel only superseded runs for the same ref', () => {
  for (const [path, group] of workflows) {
    const source = readFileSync(path, 'utf8')
    assert.match(source, /^concurrency:\n  group: /m, path)
    const condition = "github.event_name == 'pull_request' && github.run_attempt == 1 && github.event.action == 'synchronize'"
    const groupCondition = "github.event_name == 'pull_request' && github.run_attempt == 1"
    assert.ok(source.includes('group: ' + group + '${{ ' + groupCondition + " && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"), path)
    assert.ok(source.includes('cancel-in-progress: ${{ ' + condition + ' }}'), path)
  }
})

// A pull_request synchronize payload has no push-style before/after pair.
// Cancel superseded first-attempt checks by stable PR number, not run ID;
// retries and production/manual runs must remain in their separate lease.
test('all PR synchronize workflow leases cancel stale first attempts without push-only fields', () => {
  let checked = 0
  for (const file of readdirSync('.github/workflows').filter(name => /\.ya?ml$/.test(name))) {
    const source = readFileSync('.github/workflows/' + file, 'utf8')
    const block = source.split(/^concurrency:\s*$/m)[1]?.split(/^jobs:\s*$/m)[0]
    if (!block) continue
    const match = block.match(/^  cancel-in-progress: (.+)$/m)
    if (!match || !match[1].includes("github.event.action == 'synchronize'")) continue
    const group = block.split(/^  cancel-in-progress:/m)[0]
    checked++
    assert.doesNotMatch(block, /github\.event\.before\s*!=\s*github\.event\.after/, file)
    assert.ok(match[1].includes('github.run_attempt == 1'), file + ': reruns must be isolated')
    assert.ok(group.includes('github.run_attempt == 1'), file + ': initial and sync must share the PR lease')
    assert.ok(group.includes('github.event.pull_request.number'), file + ': PR lease must be stable')
    assert.ok(group.includes('github.run_id'), file + ': manual and non-PR leases stay unique')
  }
  assert.ok(checked >= 55, 'expected a repository-wide audit of PR workflows')
})
