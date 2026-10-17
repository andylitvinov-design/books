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

test('retired beige compass banner never reappears on public site routes or components', async () => {
  const forbidden = [
    /\bMindBodyMonitorStrip\b/,
    /mind-body-monitor-strip/,
    /data-monitor-strip/,
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
  assert.deepEqual(violations, [], 'the obsolete beige assessment banner must not return')
  await assert.rejects(stat(join(root, 'components/mind-body-monitor-strip.tsx')), { code: 'ENOENT' })
})

test('top free-review bar exactly matches approved screenshot while beige strip remains absent', async () => {
  const [layout, service, offers] = await Promise.all([
    readFile(join(root, 'app/layout.tsx'), 'utf8'),
    readFile(join(root, 'app/[locale]/services/free-situation-review/page.tsx'), 'utf8'),
    readFile(join(root, 'components/sitewide-antistress-banner.tsx'), 'utf8'),
  ])
  assert.match(layout, /<SitewideAntistressBanner initialLocale=\{lang\} \/>/)
  assert.doesNotMatch(layout, /MindBodyMonitorStrip/)
  assert.match(layout, /\{children\}/)
  assert.match(offers, /data-sitewide-personal-review-banner/)
  assert.match(offers, /FREE PERSONAL SITUATION REVIEW/)
  assert.ok(offers.includes('className={styles.cta} href={`/${locale}/services/free-situation-review`}'), 'burgundy CTA must open the free written review')
  assert.match(offers, /\/services\/free-situation-review/)
  for (const label of ['Получить разбор', 'Get free review', 'Solicitar gratis']) {
    assert.ok(offers.includes(label), label)
  }
  assert.match(service, /FreeSituationReviewForm/)
  assert.match(offers, /export function TestSelectionCourseBanner/)
  assert.match(offers, /data-tests-review-banner/)
})
