import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const source = readFileSync(new URL('../.github/workflows/hh-app-browser.yml', import.meta.url), 'utf8')
const block = source.match(/          case "\$HH_TEST_SUITE" in[\s\S]*?          done/)[0].replace(/^          /gm, '')
const expected = {
  core: ['verify-document-hydration', 'verify-app-r1', 'verify-compassion-assessments', 'verify-relationships-assessments'],
  extended: ['verify-document-hydration', 'verify-mhc-sf', 'verify-asrs6', 'verify-asrs6-pdf', 'verify-personality-types', 'verify-account-status-filters', 'verify-bach-personal-report-browser'],
}
function run(suite, fail = '') {
  const dir = mkdtempSync(join(tmpdir(), 'hh-journey-'))
  try {
    writeFileSync(join(dir, 'node'), '#!/bin/sh\necho "EXEC $1"\n[ "$1" != "$FAIL_SCRIPT" ]\n', { mode: 0o700 })
    return spawnSync('bash', ['-c', block], { encoding: 'utf8', env: { ...process.env, PATH: dir + ':' + process.env.PATH, HH_TEST_SUITE: suite, FAIL_SCRIPT: fail } })
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
test('both engines execute all original journeys once plus hydration for each fresh app', () => {
  assert.match(source, /browser: \[chromium, webkit\]/)
  assert.match(source, /suite: \[core, extended\]/)
  const all = []
  for (const [suite, scripts] of Object.entries(expected)) {
    const result = run(suite)
    assert.equal(result.status, 0, result.stderr)
    const actual = [...result.stdout.matchAll(/^EXEC scripts\/(.+)\.mjs$/gm)].map(match => match[1])
    assert.deepEqual(actual, scripts)
    assert.equal((result.stdout.match(/BROWSER_JOURNEY_PASS/g) || []).length, scripts.length)
    all.push(...actual)
  }
  assert.equal(all.length, 11)
  assert.equal(all.filter(script => script === 'verify-document-hydration').length, 2)
  assert.equal(new Set(all).size, 10)
})
for (const [suite, scripts] of Object.entries(expected)) for (const script of scripts) {
  test(`${suite}: ${script} failure cannot pass or continue`, () => {
    const result = run(suite, `scripts/${script}.mjs`)
    assert.equal(result.status, 1)
    const actual = [...result.stdout.matchAll(/^EXEC scripts\/(.+)\.mjs$/gm)].map(match => match[1])
    assert.deepEqual(actual, scripts.slice(0, scripts.indexOf(script) + 1))
    assert.ok(!result.stdout.includes(`BROWSER_JOURNEY_PASS ${suite} ${script}`))
  })
}
test('unknown suite fails closed', () => { assert.equal(run('unknown').status, 1) })
test('matrix retains bounded isolated setup and unique evidence; aggregate rejects all non-success states', () => {
  assert.match(source, /fail-fast: false/)
  assert.match(source, /timeout-minutes: 30/)
  assert.match(source, /services:\n      postgres:/)
  assert.match(source, /node --conditions=react-server tests\/helpers\/app-db-setup\.mjs/)
  assert.match(source, /HH_APP_TEST_RUNTIME: isolated/)
  assert.match(source, /persist-credentials: false/)
  assert.match(source, /permissions:\n  contents: read/)
  assert.match(source, /app-r1-browser-synthetic-evidence-\$\{\{ matrix.browser \}\}-\$\{\{ matrix.suite \}\}/)
  assert.match(source, /browser-journey-complete:\n    name: browser \(\$\{\{ matrix.browser \}\}\)\n    strategy:\n      fail-fast: false\n      matrix:\n        browser: \[chromium, webkit\]\n    needs: browser\n    if: always\(\)/)
  const gate = source.match(/run: (test "\$MATRIX_RESULT" = success)/)[1]
  for (const state of ['success', 'failure', 'cancelled', 'skipped', '']) {
    assert.equal(spawnSync('bash', ['-c', gate], { env: { ...process.env, MATRIX_RESULT: state } }).status, state === 'success' ? 0 : 1)
  }
})
