import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const workflow = read('.github/workflows/holistic-house-mobile-install.yml')
const manifest = JSON.parse(read('public/holistic-house-app-ru.webmanifest'))
const smoke = workflow.split('      - name: Check EN/RU install pages and real PNG icons\n')[1]
assert.ok(smoke, 'The built-server smoke must remain present')
const assertions = [...smoke.matchAll(/^\s*(?:check ru-manifest-contract )?node -e "([^"\n]+)"$/gm)]
assert.equal(assertions.length, 1, 'Exercise the one actual inline manifest assertion')

// Execute the workflow's exact inline assertion, not a second implementation.
// The only available modules are assert and a copied public manifest object.
// No child process, fetch, application/server module or database is exposed.
function validateManifest(value) {
  return vm.runInNewContext(assertions[0][1], {
    require(name) {
      if (name === 'node:assert/strict') return assert
      if (name === '/tmp/hh-manifest-ru.json') return structuredClone(value)
      throw new Error('UNEXPECTED_SMOKE_REQUIRE: ' + name)
    },
    process: { exit(code) { throw new Error('SMOKE_EXIT_' + code) } },
  }, { timeout: 1000 })
}

test('built-server manifest assertion accepts the canonical Russian Messages launcher', () => {
  assert.equal(manifest.start_url, '/ru/app/messages')
  assert.ok(manifest.shortcuts.some(shortcut => shortcut.url === '/ru/app/messages'))
  assert.doesNotThrow(() => validateManifest(manifest))
})

test('actual inline assertion rejects stale, foreign, non-Russian and altered launch routes', () => {
  for (const start_url of ['/ru/app/portrait', '/en/app/messages',
    'https://example.test/ru/app/messages', '/ru/app/messages?entry=other', '/ru/app/messages/']) {
    assert.throws(() => validateManifest({ ...manifest, start_url }), /RU install start URL/, start_url)
  }
})

test('actual inline assertion requires the Messages shortcut, not the removed consultations shortcut', () => {
  for (const shortcuts of [undefined, null, {}, [], [{ url: '/ru/app/consultations' }],
    [{ url: '/en/app/messages' }], manifest.shortcuts.filter(shortcut => shortcut.url !== '/ru/app/messages')]) {
    assert.throws(() => validateManifest({ ...manifest, shortcuts }), /RU Messages shortcut/)
  }
})

test('named smoke checks remain fail-fast and keep server startup, bounded readiness and cleanup', () => {
  assert.match(smoke, /shell: bash/)
  assert.match(smoke, /check\(\) \{[\s\S]*local label="\$1"[\s\S]*if "\$@"; then[\s\S]*local status=\$\?[\s\S]*return "\$status"/)
  for (const marker of ["printf 'CHECK %s\\n'", "printf 'PASS %s\\n'", "printf 'FAIL %s (exit %s)\\n'"])
    assert.ok(smoke.includes(marker), marker)
  assert.match(smoke, /PORT=3098 npm run start -- --port 3098/)
  assert.ok(smoke.includes(`trap 'kill "$child" 2>/dev/null || true' EXIT`))
  assert.match(smoke, /for n in \$\(seq 1 55\)/)
  assert.match(smoke, /curl --fail --silent http:\/\/127\.0\.0\.1:3098\/en\/install/)
  assert.match(smoke, /then ready=true; break; fi/)
  assert.match(smoke, /check en-install-ready test "\$ready" = true/)
  assert.doesNotMatch(workflow, /continue-on-error:\s*true|pull_request_target:|set \+e/)
})

test('all prior real RU page, PNG header/dimension and built mobile-head checks are retained', () => {
  assert.match(smoke, /check ru-install-fetch curl --fail --silent --show-error http:\/\/127\.0\.0\.1:3098\/ru\/install -o \/tmp\/hh-install-ru\.html/)
  assert.ok(smoke.includes("check ru-install-brand grep -q 'Holistic House' /tmp/hh-install-ru.html"))
  assert.match(smoke, /for size in 180 192 512; do/)
  assert.ok(smoke.includes('check "icon-$size-fetch" curl --fail --silent --show-error -D /tmp/hh-icon-headers -o /tmp/hh-icon.png "http://127.0.0.1:3098/holistic-house-icon/$size"'))
  assert.ok(smoke.includes('check "icon-$size-content-type" grep -qi \'^content-type: image/png\' /tmp/hh-icon-headers'))
  assert.ok(smoke.includes('check "icon-$size-dimensions" bash -o pipefail -c \'file "$1" | grep -q "PNG image data, $2 x $2"\' _ /tmp/hh-icon.png "$size"'))
  assert.match(smoke, /check ru-manifest-fetch curl --fail --silent --show-error http:\/\/127\.0\.0\.1:3098\/holistic-house-app-ru\.webmanifest -o \/tmp\/hh-manifest-ru\.json/)
  assert.match(smoke, /check ru-manifest-contract node -e/)
  assert.match(smoke, /check mobile-head node scripts\/verify-hh-mobile-head\.mjs http:\/\/127\.0\.0\.1:3098/)
})

test('smoke regression runs in the existing unit step and triggers both PR and push workflows', () => {
  const filename = 'tests/holistic-house-install-smoke.test.mjs'
  const [pr, push] = workflow.split('\n  push:')
  assert.ok(pr.includes("- '" + filename + "'"))
  assert.ok(push.split('\npermissions:')[0].includes("- '" + filename + "'"))
  const run = workflow.split('\n').find(line => line.includes('run: node --test'))
  for (const path of ['tests/holistic-house-pwa.test.mjs', 'tests/holistic-house-install-push-regression.test.mjs',
    'tests/holistic-house-post-signup-install.test.mjs', 'tests/workflow-next-route-filters.test.mjs',
    'tests/psialchemy-pwa.test.mjs', filename]) assert.ok(run?.includes(path), path)
  assert.match(workflow, /permissions:\s*\n\s+contents: read/)
  assert.match(workflow, /run: npm run build/)
  assert.match(workflow, /run: npx eslint/)
})
