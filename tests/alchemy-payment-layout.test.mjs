import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/alchemy-soul-lead-form.tsx')
function render(locale, selected, input = source) {
  const jsx = (type, props) => ({ type, props: props || {} })
  const modules = {
    react: { useState: () => [selected, () => {}], useId: () => 'fixture', useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'a', __esModule: true },
    'lucide-react': { Check: 'check', ShieldCheck: 'shield' },
    '@/components/contact-channel-chooser': { ContactChannelChooser: 'contact-chooser' },
    '@/lib/whatsapp-enquiry': { whatsappEnquiryUrl: () => 'https://example.invalid/booking' },
    './alchemy-soul-landing.module.css': { default: new Proxy({}, { get: (_, name) => name }), __esModule: true },
  }
  const compiled = ts.transpileModule(input, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), name); return modules[name]
  } })
  const tree = exports.AlchemySoulFormatSelector({locale})
  const nodes = []
  const walk = node => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    nodes.push(node); walk(node.props?.children)
  }
  walk(tree)
  return nodes
}

const marked = (nodes, name) => nodes.filter(node => Object.hasOwn(node.props, name))
const summaries = node => [node.props.children].flat().filter(child => child?.type === 'summary')

function assertGates(input = source) {
  for (const locale of ['en','ru','es']) for (const selected of ['30','60','month']) {
    const nodes = render(locale,selected,input)
    const details = marked(nodes, 'data-alchemy-format-details')
    assert.equal(details.length,1,'Format explanations remain independently available')
    assert.equal(details[0].type,'details')
    assert.ok(!details[0].props.open,'Format explanations default closed')
    assert.equal(summaries(details[0]).length,1,'Format details have exactly one direct summary')
    assert.equal(marked(nodes,'data-alchemy-payment-disclosure').length,0)
    assert.equal(marked(nodes,'data-paypal-personal-offer').length,0)
    assert.equal(marked(nodes,'data-wise-payment-link').length,0)
    assert.equal(marked(nodes,'data-zen-manual-request').length,0)
    assert.equal(nodes.filter(n => String(n.props.href || '').includes('/api/payments/')).length,0)
    const booking = nodes.filter(n => n.type === 'contact-chooser')
    if (selected === 'month') {
      assert.equal(booking.length,0)
      assert.equal(marked(nodes,'data-alchemy-monthly-link').length,1)
      assert.equal(marked(nodes,'data-alchemy-monthly-link')[0].props.href,'/' + locale + '/services/personal-support')
    } else {
      assert.equal(booking.length,1)
      assert.equal(booking[0].props.bookingSku,
        selected === '30' ? 'express-consultation-30' : 'personal-session-60')
      assert.equal(booking[0].props.compactPhone,true)
      assert.equal(booking[0].props.stayAfterSave,true)
    }
  }
}

test('EN/RU/ES x 30/60/month: fixed SKU booking only, no inline payment providers', () => assertGates())

test('format explanations reject default-open and missing or duplicated direct summaries', () => {
  assert.ok(source.includes('data-alchemy-format-details>'))
  assert.throws(() => assertGates(source.replace('data-alchemy-format-details>', 'data-alchemy-format-details open>')),
    { code: 'ERR_ASSERTION', message: /Format explanations default closed/ })
  const detailsStart = source.indexOf('data-alchemy-format-details>')
  const summaryStart = source.indexOf('<summary>', detailsStart)
  const summaryEnd = source.indexOf('</summary>', summaryStart) + '</summary>'.length
  const detailsEnd = source.indexOf('</details>', detailsStart)
  assert.ok(detailsStart >= 0 && summaryStart > detailsStart && summaryEnd > summaryStart && summaryEnd < detailsEnd)
  const summary = source.slice(summaryStart,summaryEnd)
  for (const replacement of ['',summary+summary,'<div>'+summary+'</div>']) {
    // An unrelated summary elsewhere must not satisfy this disclosure's contract.
    const changed = (source.slice(0,summaryStart) + replacement + source.slice(summaryEnd))
      .replace('<div data-alchemy-booking-formats>', '<div data-alchemy-booking-formats><details><summary>Unrelated</summary></details>')
    assert.throws(() => assertGates(changed),
      { code: 'ERR_ASSERTION', message: /Format details have exactly one direct summary/ })
  }
})

test('reintroduced payment UI, wrong SKU and monthly-booking mutations fail', () => {
  for (const [before,after] of [
    ['<div data-alchemy-booking-formats>', '<div data-alchemy-booking-formats data-alchemy-payment-disclosure>'],
    ['bookingSku={selected === "30" ? "express-consultation-30" : "personal-session-60"}',
     'bookingSku="express-consultation-30"'],
    ['selected === "month" ? (', 'false ? ('],
  ]) {
    assert.ok(source.includes(before),before)
    assert.throws(() => assertGates(source.replace(before,after)),{code:'ERR_ASSERTION'},before)
  }
})

test('Pay Your Session opens only after a server-confirmed, signed appointment', () => {
  const chooser = read('components/contact-channel-chooser.tsx')
  const route = read('app/api/service-enquiries/booking-status/route.js')
  const cart = read('app/[locale]/cart/page.tsx')
  assert.match(chooser,/const paidReady = bookingConfirmed && Boolean\(saved && bookingStartsAt\)/)
  assert.match(chooser,/paidReady && paymentExpanded/)
  assert.match(chooser,/data-booking-payment-options/)
  assert.match(chooser,/data-booking-cart-link/)
  assert.match(route,/row.status === 'booked'/)
  assert.match(route,/verifySessionBooking/)
  assert.match(cart,/<PersonalCart/)
  assert.doesNotMatch(chooser,/data-paypal-personal-offer|data-zen-manual-request/)
})
