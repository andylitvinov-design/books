import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('scripts/verify-alchemy-one-screen.mjs')
const runtime = read('components/contact-channel-chooser.tsx')
const start = source.indexOf('      // Read-only booking disclosure:')
const end = source.indexOf('      report.push(', start)
assert.ok(start >= 0 && end > start)
const snippet = source.slice(start, end)
const branch = runtime.slice(runtime.indexOf('  if (compactPhone && bookingSku) {'), runtime.indexOf('\n  if (compactPhone) {', runtime.indexOf('  if (compactPhone && bookingSku) {')))
const action = branch.match(/data-booking-cta=\{paidReady \? "pay" : "book"\}[\s\S]*?onClick=\{\(\) => \{([\s\S]*?)\n          \}\}/)?.[1]
assert.ok(action, 'execute the authored Book disclosure action')
function fixture(fault = '') {
  const state = { open: false, payment: false, clicks: 0, requests: 0, guarded: false }
  const issues = []
  const click = runInNewContext('(function(){' + action + '})', {
    paidReady: false,
    setOpen: value => { state.open = typeof value === 'function' ? value(state.open) : value },
    setPaymentExpanded: value => { state.payment = typeof value === 'function' ? value(state.payment) : value },
  })
  const type = selector => {
    if (selector.includes('data-alchemy-panel')) return 'hero'
    if (selector.includes('data-session-booking-flow')) return 'booking'
    if (selector.startsWith('[data-contact-order]')) return 'trigger'
    if (selector.startsWith('form[')) return 'contact'
    if (selector.includes('type="tel"')) return 'phone'
    if (selector.includes('type="checkbox"')) return 'consent'
    if (selector.includes('type="submit"')) return 'submit'
    if (selector.startsWith('[data-booking-step="pending"]')) return 'premature'
    assert.fail('unrecognized selector: ' + selector)
  }
  const locator = selector => {
    const kind = type(selector)
    const count = () => kind === 'premature' ? Number(fault === 'premature-payment')
      : (fault === 'missing-consent' && kind === 'consent') ? 0 : 1
    return { locator, count: async () => count(),
      getAttribute: async name => name === 'data-booking-sku' ? (fault === 'wrong-sku' ? 'express-consultation-30' : 'personal-session-60')
        : name === 'aria-expanded' ? String(state.open)
        : name === 'required' ? (fault === 'optional-consent' && kind === 'consent' ? null : '') : null,
      waitFor: async ({state: wanted}) => {
        const visible = count() === 1 && !(fault === 'hidden-' + kind) && (['hero','booking','trigger'].includes(kind) || state.open)
        assert.equal(visible, wanted === 'visible', kind + ' visibility')
      },
      click: async () => { assert.equal(kind, 'trigger', 'only authored Book disclosure is clicked'); assert.equal(state.guarded, true); state.clicks++; if (fault !== 'contact-not-opened') click() },
      inputValue: async () => fault === 'prefilled-phone' ? '123' : '',
      isChecked: async () => fault === 'implicit-consent',
      isDisabled: async () => fault !== 'enabled-submit',
      boundingBox: async () => ({width:100,height:fault === 'small-target' ? 43 : 44}),
    }
  }
  const page = {}, context = {}
  const installAlchemyDisclosureGuard = async () => { state.guarded = true; return async () => {} }

  return {state,issues,run: () => runInNewContext('(async()=>{' + snippet + '})()', {
    assert, width:390,height:844,root:{locator},page,context,installAlchemyDisclosureGuard,settleDisclosure:()=>{},disclosureViolations:issues,issues,origin:'http://127.0.0.1:3100',URL,
  }, {timeout:1000})}
}
test('actual mobile snippet opens and closes authored Book action without entry, receipt, pay or provider', async () => {
  const f = fixture(); await f.run()
  assert.deepEqual(f.state, {open:false,payment:false,clicks:2,requests:0,guarded:true})
  assert.deepEqual(f.issues, [])
})
for (const fault of ['wrong-sku','missing-consent','optional-consent','implicit-consent','enabled-submit','hidden-trigger','hidden-phone','hidden-consent','hidden-submit','contact-not-opened','premature-payment','prefilled-phone','small-target']) {
  test('mobile actual snippet rejects ' + fault, async () => {
    const f = fixture(fault); await assert.rejects(f.run(), {code:'ERR_ASSERTION'})
    assert.equal(f.state.requests,0)
  })
}
test('native geometry and route guards remain strict; no synthetic contact or forced clicks', () => {
  assert.match(source, /\[320, 375, 390, 430\]/)
  assert.match(source, /maxHeight: innerHeight - 80/)
  assert.match(source, /p\.height > p\.maxHeight/)
  assert.match(source, /assert\.deepEqual\(failures, \[\]/)
  assert.doesNotMatch(snippet, /\.fill\(|\.check\(|\.submit\(|force\s*:/)
  assert.doesNotMatch(snippet, /data-compact-phone-trigger|data-contact-channel-submit/)
  assert.match(read('components/alchemy-soul-landing.tsx'), /compactPhone compactTrigger stayAfterSave bookingSku="personal-session-60"/)
  assert.match(branch, /disabled=\{busy \|\| googleBusy \|\| !consent/)
  assert.match(branch, /\{paidReady && paymentExpanded \? \(/)
  for (const status of [404,500]) {
    const line = source.split('\n').find(line => line.includes('route must return HTTP 200'))
    assert.throws(() => runInNewContext(line,{assert,response:{status:()=>status},key:'en/390x844'}),{code:'ERR_ASSERTION'})
  }
})
