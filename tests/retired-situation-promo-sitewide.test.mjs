import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')

async function* sourceFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const filename = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* sourceFiles(filename)
    } else if (entry.isFile() && /\.(?:js|jsx|mjs|ts|tsx|css)$/.test(entry.name)) {
      yield filename
    }
  }
}

test('retired compass banner and global free-review ribbon never appear on any site route or component', async () => {
  const forbidden = [
    /\bMindBodyMonitorStrip\b/,
    /mind-body-monitor-strip/,
    /data-monitor-strip/,
    /\bSitewideAntistressBanner\b/,
    /data-sitewide-personal-review-banner/,
    /Clarify a goal, business challenge or personal concern/,
  ]
  const violations = []
  for (const dir of ['app', 'components']) {
    for await (const filename of sourceFiles(join(root, dir))) {
      const source = await readFile(filename, 'utf8')
      for (const pattern of forbidden) {
        if (pattern.test(source)) violations.push(relative(root, filename) + ': ' + pattern.source)
      }
    }
  }
  assert.deepEqual(violations, [], 'obsolete globally repeated assessment promotions must not return')
  await assert.rejects(stat(join(root, 'components/mind-body-monitor-strip.tsx')), { code: 'ENOENT' })
})

test('removing global promos preserves real assessment requests and contextual post-test offers', async () => {
  const [layout, service, offers] = await Promise.all([
    readFile(join(root, 'app/layout.tsx'), 'utf8'),
    readFile(join(root, 'app/[locale]/services/free-situation-review/page.tsx'), 'utf8'),
    readFile(join(root, 'components/sitewide-antistress-banner.tsx'), 'utf8'),
  ])
  assert.doesNotMatch(layout, /SitewideAntistressBanner|MindBodyMonitorStrip/)
  assert.match(layout, /\{children\}/)
  assert.match(service, /FreeSituationReviewForm/)
  assert.match(offers, /export function TestSelectionCourseBanner/)
  assert.match(offers, /data-tests-review-banner/)
})
