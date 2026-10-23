import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../scripts/verify-asrs6.mjs', import.meta.url), 'utf8')

test('ASRS6 uses the current visible Cabinet entry before the existing auth and consent journey', () => {
  const steps = [
    "await navigate(page, origin + '/en/app')",
    "const cabinetEntry = page.locator('[data-cabinet-guest-overview=\"true\"]')",
    'await expect(cabinetEntry).toBeVisible()',
    "const signIn = cabinetEntry.getByRole('button', { name: 'Open my Cabinet with Google', exact: true })",
    'await expect(signIn).toBeEnabled()',
    'await signIn.click()',
    "const onboarding = page.getByRole('heading', { name: 'Create my private space', exact: true })",
    "await page.getByLabel('I am 18 or older.').check()",
    "await page.getByLabel('I agree to private processing', { exact: false }).check()",
    'await assertCabinetPortrait(page, expect, { origin })',
    'await openCabinetMyTests(page, expect, { origin })',
  ]
  let previous = -1
  for (const step of steps) {
    const position = source.indexOf(step)
    assert.ok(position > previous, `Missing or reordered entry step: ${step}`)
    previous = position
  }
  assert.doesNotMatch(source, /page\.getByRole\('button', \{ name: 'Continue with Google'/)
  assert.match(source, /assertIsolated\(\)/)
  assert.match(source, /route\.abort\('blockedbyclient'\)/)
  assert.match(source, /assert\.equal\(rejected\.status\(\), 429\)/)
})
