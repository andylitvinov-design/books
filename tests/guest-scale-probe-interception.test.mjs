import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { assertGuestProbeIntercept } from '../scripts/helpers/guest-scale-verifier.mjs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('guest probe rejects missed, duplicate or successful un-intercepted requests', () => {
  assertGuestProbeIntercept(1,409)
  for (const [count,status] of [[0,200],[0,409],[2,409],[1,200],[1,500]])
    assert.throws(() => assertGuestProbeIntercept(count,status))
})
test('interception evidence is checked before recovery and result visibility are claimed', () => {
  const helper = read('scripts/helpers/guest-scale-verifier.mjs')
  assert.match(helper,/await page.route\(endpoint, intercept\)/)
  assert.match(helper,/const observed = await response\s+assertGuestProbeIntercept\(intercepted, observed.status\(\)\)\s+await expect\(button\).toBeEnabled\(\)\s+assertGuestSaveIntent\(captured, result\)/)
  assert.match(helper,/finally \{ await page.unroute\(endpoint, intercept\) \}/)
})
test('only deliberate guest intercept fixtures disable workers; account and primary privacy contexts remain', () => {
  for (const script of ['compassion-assessments','personality-types','mhc-sf','relationships-assessments']) {
    const text=read(`scripts/verify-${script}.mjs`)
    assert.match(text,/guest=await browser.newContext\(\{viewport:\{width:390,height:844\},serviceWorkers:'block'\}\)/)
    assert.match(text,/account=await browser.newContext\(\{viewport:\{width:390,height:844\}\}\)/)
  }
  const asrs=read('scripts/verify-asrs6.mjs')
  assert.match(asrs,/serviceWorkers: guestProbe \? 'block' : 'allow'/)
  assert.match(asrs,/const guest = await isolatedContext\(undefined, true\)/)
  assert.match(read('scripts/verify-app-r1.mjs'),/context=await browser.newContext\(\{viewport:\{width:390,height:844\}\}\)/)
})
