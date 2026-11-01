import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/alchemy-soul-lead-form.tsx')
function render(locale, selected) {
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
  const compiled = ts.transpileModule(source, { compilerOptions: {
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

test('EN/RU/ES x 30/60/month: fixed SKU booking only, no inline payment providers', () => {
  for (const locale of ['en','ru','es']) for (const selected of ['30','60','month']) {
    const nodes = render(locale,selected)
    assert.equal(nodes.filter(n => n.props['data-alchemy-payment-disclosure']).length,0)
    assert.equal(nodes.filter(n => n.props['data-paypal-personal-offer']).length,0)
    assert.equal(nodes.filter(n => n.props['data-zen-manual-request']).length,0)
    assert.equal(nodes.filter(n => String(n.props.href || '').includes('/api/payments/')).length,0)
    const booking = nodes.filter(n => n.type === 'contact-chooser')
    if (selected === 'month') {
      assert.equal(booking.length,0)
      assert.equal(nodes.filter(n => n.props['data-alchemy-monthly-link']).length,1)
    } else {
      assert.equal(booking.length,1)
      assert.equal(booking[0].props.bookingSku,
        selected === '30' ? 'express-consultation-30' : 'personal-session-60')
      assert.equal(booking[0].props.compactPhone,true)
      assert.equal(booking[0].props.stayAfterSave,true)
    }
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
