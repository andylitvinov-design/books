import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const core = read('scripts/verify-app-r1.mjs')
const formSource = read('components/alchemy-soul-lead-form.tsx')
const phoneSource = read('components/phone-country-input.tsx')
const chooserSource = read('components/contact-channel-chooser.tsx')
const children = node => [node?.props?.children].flat(Infinity).filter(value => value != null && value !== false)
const walk = node => typeof node === 'object' && node != null ? [node, ...children(node).flatMap(walk)] : []
const text = node => typeof node === 'object' && node != null ? children(node).map(text).join('') : String(node ?? '')
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} }

// Execute only the actual pure form render and its two authored option callbacks.
// Effects, provider URLs, CSS, icons and nested runtime are inert boundaries.
function authoredForm(locale) {
  const states = ['60', 'relationships'], writes = []
  let cursor = 0
  const loaded = { exports: {} }
  const storage = new Map()
  const context = { exports: loaded.exports,
    window: { sessionStorage: { setItem: (key, value) => { storage.set(key, value) } } },
    require: name => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'react') return {
        useEffect: () => {}, useId: () => 'synthetic-alchemy',
        useState: () => { const index = cursor++; return [states[index], value => { states[index] = value; writes.push(index) }] },
      }
      if (name === 'next/link') return { default: 'a' }
      if (name === 'lucide-react') return new Proxy({}, { get: () => () => null })
      if (name === '@/components/contact-channel-chooser') return { ContactChannelChooser: props => ({ type: 'inert-contact-chooser', props }) }
      if (name === '@/lib/whatsapp-enquiry') return { whatsappEnquiryUrl: () => 'about:blank' }
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
      assert.fail('Unexpected form dependency: ' + name)
    },
  }
  runInNewContext(ts.transpileModule(formSource, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, context, { timeout: 1000 })
  const render = () => { cursor = 0; return loaded.exports.AlchemySoulLeadForm({ locale }) }
  function fields() {
    return children(render()).filter(node => node?.type === 'label').map(label => {
      const select = children(label).filter(node => node?.type === 'select')
      assert.equal(select.length, 1)
      const node = select[0], id = node.props.id.replace('synthetic-alchemy-', '')
      return { id, name: children(label).filter(child => child !== node).map(text).join('').trim(), node,
        options: children(node).filter(item => item?.type === 'option').map(item => item.props.value) }
    })
  }
  return { render, fields, states, writes, storage }
}
function countryName(locale) {
  const parsed = ts.createSourceFile('phone.tsx', phoneSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declarations = parsed.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
  const found = declarations.filter(node => node.name.getText(parsed) === 'captions')
  assert.equal(found.length, 1)
  assert.ok(ts.isObjectLiteralExpression(found[0].initializer))
  const captions = runInNewContext('(' + found[0].initializer.getText(parsed) + ')', {}, { timeout: 1000 })
  return captions[locale].country
}
function selectionBlock(source) {
  const parsed = ts.createSourceFile('verify-app-r1.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  assert.equal(parsed.parseDiagnostics.length, 0)
  const functions = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'verifyPublicServiceConversionJourneys')
  assert.equal(functions.length, 1)
  const found = []
  function visit(node) {
    if (ts.isVariableStatement(node) && node.getText(parsed) === "const form=servicePage.locator('[data-alchemy-lead-form=\"single\"]')") found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(functions[0]); assert.equal(found.length, 1)
  const first = found[0], block = first.parent
  assert.ok(ts.isBlock(block) && ts.isIfStatement(block.parent))
  assert.equal(block.parent.expression.getText(parsed), "kind==='alchemy'")
  assert.equal(block.statements[0], first)
  const stop = block.statements.filter(node => node.getText(parsed) === "await expect(servicePage.locator('[data-testimonial-video-id]')).toHaveCount(12)")
  assert.equal(stop.length, 1, 'preserve the unchanged following twelve-review gate')
  const before = [...block.statements].slice(0, block.statements.indexOf(stop[0]))
  assert.ok(before.every(node => !ts.isReturnStatement(node) && !ts.isThrowStatement(node)))
  return source.slice(first.getStart(parsed), stop[0].getStart(parsed))
}
const snippet = selectionBlock(core)

function fixture(locale, fault = '', countryFirst = false) {
  const model = authoredForm(locale), changed = []
  const actual = model.fields(); assert.deepEqual(actual.map(item => item.id), ['format', 'topic'])
  const fields = actual.map(item => ({ id: item.id, name: fault === 'wrong-format-label' && item.id === 'format' ? 'Other format' : item.name, direct: true, visible: !(fault === 'hidden-format' && item.id === 'format') }))
  fields.push({ id: 'country', name: countryName(locale), direct: false, visible: false })
  if (fault === 'missing-format') fields.splice(fields.findIndex(item => item.id === 'format'), 1)
  if (fault === 'missing-country') fields.splice(fields.findIndex(item => item.id === 'country'), 1)
  if (fault === 'duplicate-topic') fields.push({ ...fields.find(item => item.id === 'topic') })
  if (fault === 'extra-service-option') fields.push({ id: 'extra', name: 'Unexpected option', direct: true, visible: true })
  if (countryFirst) fields.sort((a, b) => Number(b.id === 'country') - Number(a.id === 'country'))
  const values = () => ({ format: model.states[0], topic: model.states[1], country: 'CA' })
  const select = get => ({ items: get,
    first: () => select(() => get().slice(0, 1)), nth: index => select(() => get().slice(index, index + 1)),
    selectOption: async value => {
      const found = get(); assert.equal(found.length, 1); const item = found[0]
      const authored = model.fields().find(field => field.id === item.id)
      const options = authored?.options.filter(option => !(fault === 'missing-' + item.id + '-option' && option === (item.id === 'format' ? '30' : 'business'))) || ['CA', 'US']
      assert.ok(options.includes(value), 'current authored option must exist')
      assert.ok(authored, 'service option must not change phone country')
      if (fault !== 'ignored-' + item.id + '-change') authored.node.props.onChange({ target: { value } })
      changed.push(item.id + ':' + value)
    },
  })
  const control = (id, attrs) => ({ items: () => [{ id, attrs, visible: true }] })
  const form = { scrollIntoViewIfNeeded: async () => {},
    getByRole: (role, options) => { assert.equal(role, 'combobox'); assert.equal(options.exact, true); return select(() => fields.filter(item => item.name === options.name && item.visible)) },
    getByLabel: (name, options) => { assert.equal(options.exact, true); assert.equal(name, countryName(locale)); return select(() => fields.filter(item => item.name === name)) },
    locator: selector => {
      if (selector === 'select') return select(() => fields)
      if (selector === ':scope > label > select') return select(() => fields.filter(item => item.direct))
      if (selector === '[data-contact-order]') return control('request', { 'aria-expanded': 'false' })
      if (selector === '[data-phone-country-input] input[type="tel"]') return control('phone', fault === 'optional-phone' ? {} : { required: '' })
      if (selector === '[data-booking-step="contact"] input[type="checkbox"]') return control('consent', fault === 'optional-consent' ? {} : { required: '' })
      assert.fail('Unexpected selected form selector: ' + selector)
    },
  }
  const servicePage = { locator: selector => { assert.equal(selector, '[data-alchemy-lead-form="single"]'); return form } }
  const expect = target => ({
    toHaveCount: async n => assert.equal(target.items().length, n),
    toBeVisible: async () => { assert.equal(target.items().length, 1); assert.equal(target.items()[0].visible, true) },
    toHaveAttribute: async (key, value) => { assert.equal(target.items().length, 1); assert.equal(target.items()[0].attrs?.[key], value) },
    toHaveValue: async value => { assert.equal(target.items().length, 1); assert.equal(values()[target.items()[0].id], value) },
  })
  return { model, changed, values, run: () => runInNewContext('(async()=>{' + snippet + '\n})()', { servicePage, expect, locale }, { timeout: 1000 }) }
}
for (const locale of ['en', 'ru']) for (const countryFirst of [false, true]) {
  test(locale + ' actual service option callbacks stay distinct from country: ' + countryFirst, async () => {
    const f = fixture(locale, '', countryFirst); await f.run()
    assert.deepEqual(f.changed, ['format:30', 'topic:business'])
    assert.deepEqual(f.values(), { format: '30', topic: 'business', country: 'CA' })
    assert.deepEqual(f.model.writes, [0, 1])
    assert.equal(f.model.storage.get('hh-alchemy-contact-format'), '30')
  })
}
for (const fault of ['missing-format', 'duplicate-topic', 'wrong-format-label', 'hidden-format', 'missing-country', 'extra-service-option', 'missing-format-option', 'missing-topic-option', 'optional-phone', 'optional-consent', 'ignored-format-change', 'ignored-topic-change']) {
  test('semantic selection rejects ' + fault, async () => { const f = fixture('en', fault); await assert.rejects(f.run(), { code: 'ERR_ASSERTION' }) })
}
test('actual booking producer mounts separate country, required phone and consent while collapsed', () => {
  const start = chooserSource.indexOf('  if (compactPhone && bookingSku) {'), end = chooserSource.indexOf('\n  if (compactPhone) {', start)
  assert.ok(start >= 0 && end > start)
  const booking = chooserSource.slice(start, end)
  assert.match(booking, /data-contact-order/); assert.match(booking, /aria-expanded=\{open\}/)
  assert.match(booking, /hidden=\{!open\}>\s*\{!saved \? \(/)
  assert.match(booking, /<form[^>]*data-booking-step="contact"/)
  assert.match(booking, /<PhoneCountryInput[^>]*required onChange=/)
  assert.match(booking, /<input type="checkbox" checked=\{consent\} required/)
  assert.match(phoneSource, /<select aria-label=\{words.country\}/)
  assert.match(phoneSource, /required=\{required\}/)
  for (const locale of ['en', 'ru']) {
    const model = authoredForm(locale), mounted = walk(model.render()).filter(node => node.type === 'inert-contact-chooser')
    assert.equal(mounted.length, 1)
    for (const flag of ['compactPhone', 'compactTrigger', 'stayAfterSave']) assert.equal(mounted[0].props[flag], true)
    assert.equal(mounted[0].props.bookingSku, 'personal-session-60')
    model.fields()[0].node.props.onChange({ target: { value: '30' } })
    assert.equal(walk(model.render()).find(node => node.type === 'inert-contact-chooser').props.bookingSku, 'express-consultation-30')
  }
})

test('selected verifier directly counts the two service controls, not all nested selects', () => {
  const parsed = ts.createSourceFile('selection.mjs', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  assert.equal(parsed.parseDiagnostics.length, 0)
  const matches = parsed.statements.filter(statement => {
    if (!ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) return false
    const call = statement.expression.expression
    if (!ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'toHaveCount') return false
    if (call.arguments.length !== 1 || !ts.isNumericLiteral(call.arguments[0]) || call.arguments[0].text !== '2') return false
    const expectCall = call.expression.expression
    if (!ts.isCallExpression(expectCall) || !ts.isIdentifier(expectCall.expression) || expectCall.expression.text !== 'expect' || expectCall.arguments.length !== 1) return false
    const locator = expectCall.arguments[0]
    return ts.isCallExpression(locator) && ts.isPropertyAccessExpression(locator.expression)
      && ts.isIdentifier(locator.expression.expression) && locator.expression.expression.text === 'form'
      && locator.expression.name.text === 'locator' && locator.arguments.length === 1
      && ts.isStringLiteral(locator.arguments[0]) && locator.arguments[0].text === ':scope > label > select'
  })
  assert.equal(matches.length, 1, 'one live exact direct-service count contract')
})
