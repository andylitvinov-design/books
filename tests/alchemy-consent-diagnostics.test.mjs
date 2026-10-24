import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFile} from 'node:fs/promises'
import {installAlchemyConsentProbe, withAlchemyConsentDiagnostics} from '../scripts/helpers/alchemy-consent-diagnostics.mjs'

// No browser/network. Execute the actual browser callback against a small DOM
// double to verify observer semantics/privacy, not React or WebKit acceptance.
function fixture() {
  const listeners = [], pending = [], observations = [], removed = []
  let now = 0
  const node = extra => ({isConnected: true, contains: target => target === refs.email || target === refs.checkbox || target === refs.label,
    closest: () => null, getAttribute: () => null, ...extra})
  const refs = {email: node({value: ''}), checkbox: node({checked: false, disabled: false,
    getBoundingClientRect: () => ({x: 20, y: 200, width: 19, height: 19})}), submit: node({disabled: true}),
    open: false, selected: '60'}
  refs.label = node({querySelector: () => refs.checkbox})
  refs.checkbox.closest = selector => selector === 'label' ? refs.label : null
  refs.chooser = node({querySelector: selector => ({'input[type="email"]': refs.email,
    'input[type="checkbox"]': refs.checkbox, 'button[type="submit"]': refs.submit})[selector] ?? null,
    getAttribute: name => name === 'data-open' ? String(refs.open) : null})
  refs.root = node({querySelector: selector => selector === '[data-contact-channel-chooser]' ? refs.chooser :
    /^\[data-alchemy-format="(30|60|month)"\]$/.test(selector) ? node({getAttribute: () => String(selector.includes(`"${refs.selected}"`))}) : null})
  const document = {querySelector: () => refs.root, activeElement: null,
    addEventListener: (type, listener, options) => listeners.push({type, listener, ...options}),
    removeEventListener: (type, listener, capture) => removed.push({type, listener, capture})}
  const window = {location: {pathname: '/en/services/alchemy-of-soul'}, scrollX: 0, scrollY: 0}
  const sandbox = {window, document, performance: {now: () => now++}, queueMicrotask: fn => pending.push(fn),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observations.push(this) }
      observe(root, options) { this.root = root; this.options = options }
      disconnect() { this.disconnected = true }
    }}
  const drain = () => { while (pending.length) pending.shift()() }
  const emit = (type, target, afterCapture = () => {}, bubble = true) => {
    const event = {type, target, isTrusted: true, defaultPrevented: false, clientX: 29, clientY: 209}
    for (const entry of listeners.filter(x => x.type === type && x.capture)) entry.listener(event)
    afterCapture(event)
    if (bubble) for (const entry of listeners.filter(x => x.type === type && !x.capture)) entry.listener(event)
  }
  const evaluate = (fn, arg) => vm.runInNewContext(`(${fn.toString()})(${JSON.stringify(arg)})`, sandbox)
  const install = () => evaluate(installAlchemyConsentProbe, {expectedContact: 'synthetic@example.invalid', expectedPath: '/en/services/alchemy-of-soul'})
  const finish = () => JSON.parse(JSON.stringify(window.__alchemyConsentProbe.stop()))
  return {refs, sandbox, window, document, listeners, removed, observations, pending, drain, emit, evaluate, install, finish}
}

test('passive scoped probe records the normal explicit consent transition without altering state', () => {
  const f = fixture(); f.install()
  assert.equal(f.listeners.length, 17)
  assert.ok(f.listeners.every(x => x.passive === true))
  assert.deepEqual(Array.from(f.observations[0].options.attributeFilter), ['disabled', 'checked', 'data-open', 'aria-pressed', 'hidden'])
  f.refs.selected = '30'; f.refs.open = true; f.refs.email.value = 'synthetic@example.invalid'
  f.refs.checkbox.checked = true; f.refs.submit.disabled = false
  f.emit('click', f.refs.checkbox); f.drain()
  const data = f.finish()
  assert.equal(data.entries[0].state.checked, false)
  assert.equal(data.final.checked, true); assert.equal(data.final.selected, '30')
  assert.equal(data.final.emailState, 'fixture'); assert.equal(data.final.submitDisabled, false)
  assert.equal(f.refs.checkbox.checked, true); assert.equal(f.refs.email.value, 'synthetic@example.invalid')
  assert.equal(data.entries.find(x => x.kind === 'click').target, 'consent')
})

test('capture/bubble/microtask distinguish checked-to-unchecked controlled restoration', () => {
  const f = fixture(); f.install(); f.refs.checkbox.checked = true
  f.emit('click', f.refs.checkbox, () => { f.refs.checkbox.checked = false })
  f.drain()
  const events = f.finish().entries.filter(x => x.kind === 'click')
  assert.deepEqual(events.map(x => [x.phase, x.state.checked]), [['capture', true], ['bubble', false], ['microtask', false]])
  assert.equal(new Set(events.map(x => x.state.checkbox)).size, 1)
})

test('replaced checkbox and selection reset are visible without storing element identifiers', () => {
  const f = fixture(); f.install(); f.refs.selected = '30'; f.refs.open = true
  f.refs.checkbox.checked = true
  f.emit('change', f.refs.checkbox, () => {
    f.refs.checkbox = {...f.refs.checkbox, checked: false}; f.refs.open = false; f.refs.selected = '60'
  })
  f.drain(); f.observations[0].callback()
  const data = f.finish(), changes = data.entries.filter(x => x.kind === 'change')
  assert.notEqual(changes[0].state.checkbox, changes[1].state.checkbox)
  assert.equal(data.final.checked, false); assert.equal(data.final.open, false)
  assert.equal(data.final.selected, '60'); assert.ok(data.entries.some(x => x.kind === 'mutation'))
})

test('missed click records outside target plus motion while consent remains unchanged', () => {
  const f = fixture(); f.install(); f.emit('pointerdown', f.refs.checkbox)
  f.window.scrollY = 200
  f.refs.checkbox.getBoundingClientRect = () => ({x: 20, y: 400, width: 19, height: 19})
  f.emit('scroll', f.document); f.emit('pointerup', {}); f.emit('click', {}); f.drain()
  const data = f.finish(), clicks = data.entries.filter(x => x.kind === 'click')
  assert.ok(clicks.every(x => x.target === 'outside' && x.state.checked === false))
  assert.deepEqual(data.final.rect, [20, 400, 19, 19]); assert.deepEqual(data.final.scroll, [0, 200])
})

test('capture schedules a state observation even when propagation is stopped', () => {
  const f = fixture(); f.install(); f.refs.checkbox.checked = true
  f.emit('click', f.refs.checkbox, event => { event.defaultPrevented = true; f.refs.checkbox.checked = false }, false)
  f.drain()
  const events = f.finish().entries.filter(x => x.kind === 'click')
  assert.deepEqual(events.map(x => x.phase), ['capture', 'microtask'])
  assert.equal(events[1].prevented, true); assert.equal(events[1].state.checked, false)
})

test('no private values, HTML, labels, URLs, errors or arbitrary attributes are exported', () => {
  const f = fixture(); const secret = 'DO_NOT_LOG_PRIVATE_VALUE'
  for (const n of Object.values(f.refs).filter(x => x && typeof x === 'object')) {
    for (const key of ['textContent', 'innerHTML', 'outerHTML', 'id', 'name', 'href'])
      Object.defineProperty(n, key, {get() { throw Error('Forbidden raw DOM read') }})
  }
  Object.defineProperty(f.window.location, 'href', {get() { throw Error('Forbidden URL read') }})
  f.refs.email.value = secret; f.install(); f.emit('input', f.refs.email); f.drain()
  const data = f.finish(), text = JSON.stringify(data)
  assert.equal(data.final.emailState, 'other'); assert.ok(!text.includes(secret))
  assert.ok(!text.includes('synthetic@example.invalid')); assert.ok(!text.includes('/en/services'))
  const source = installAlchemyConsentProbe.toString()
  assert.doesNotMatch(source, /(?:fetch\(|\.click\(|\.check\(|\.focus\(|\.scrollIntoView\(|\.dispatchEvent\(|\.preventDefault\(|\.stopPropagation\(|\.setAttribute\(|localStorage|sessionStorage|console\.)/)
})

test('bounded transcript retains final state and cleans listeners/observer/pending microtasks', () => {
  const f = fixture(); f.install()
  for (let i = 0; i < 20; i++) f.emit('scroll', f.document)
  for (let i = 0; i < 90; i++) f.emit('click', f.refs.checkbox)
  f.refs.checkbox.checked = true
  const data = f.finish(); f.drain()
  assert.equal(data.entries.length, 120); assert.ok(data.dropped > 0)
  assert.equal(data.droppedScroll, 12); assert.equal(data.final.checked, true)
  assert.equal(f.removed.length, 17); assert.equal(f.observations[0].disconnected, true)
  assert.equal(f.window.__alchemyConsentProbe, undefined)
  assert.equal(data.entries.filter(x => x.kind === 'scroll').length, 8)
})

test('rejects absent target and duplicate installation rather than overwriting another probe', () => {
  const f = fixture(); f.document.querySelector = () => null
  assert.throws(f.install, /pricing root missing/)
  f.document.querySelector = () => f.refs.root; f.install()
  assert.throws(f.install, /Duplicate/); f.finish()
})

test('wrapper runs native action once and preserves its exact failure through diagnostic failure', async () => {
  const primary = Error('native checkbox failure'), calls = [], logs = [], original = console.log
  console.log = (...args) => logs.push(args)
  try {
    await assert.rejects(withAlchemyConsentDiagnostics({evaluate: async () => {calls.push('evaluate'); throw Error('private page text')}},
      {locale: 'en', denyReceiptStorage: false, expectedContact: 'synthetic@example.invalid'}, async () => {calls.push('run'); throw primary}), error => error === primary)
  } finally { console.log = original }
  assert.deepEqual(calls, ['evaluate', 'run', 'evaluate'])
  assert.equal(logs.length, 1); assert.equal(logs[0][0], 'SYNTHETIC_ALCHEMY_CONSENT')
  assert.deepEqual(JSON.parse(logs[0][1]), {locale: 'en', denyReceiptStorage: false, schemaVersion: 1, outcome: 'unavailable'})
})

test('wrapper emits captured success before returning and removes its global', async () => {
  const f = fixture(), logs = [], original = console.log
  console.log = (...args) => logs.push(args)
  let result
  try {
    result = await withAlchemyConsentDiagnostics({evaluate: async (fn, arg) => f.evaluate(fn, arg)},
      {locale: 'en', denyReceiptStorage: true, expectedContact: 'synthetic@example.invalid'}, async () => 'native result')
  } finally { console.log = original }
  assert.equal(result, 'native result'); assert.equal(f.window.__alchemyConsentProbe, undefined)
  const data = JSON.parse(logs[0][1]); assert.equal(data.outcome, 'captured'); assert.equal(data.denyReceiptStorage, true)
})

test('integration preserves one native check and every following receipt/guard assertion', async () => {
  const source = await readFile(new URL('../scripts/helpers/alchemy-enquiry-journey-verifier.mjs', import.meta.url), 'utf8')
  assert.equal(source.split('await consent.check()').length - 1, 1)
  assert.match(source, /withAlchemyConsentDiagnostics\(page,\{locale,denyReceiptStorage,expectedContact:ALCHEMY_CONTACT\},async \(\) => \{/)
  assert.match(source, /await consent\.check\(\)\s*return \{contact,consent,submit\}\s*\}\)/)
  assert.doesNotMatch(source, /force\s*:|timeout\s*:|waitForTimeout|reducedMotion\s*:/)
  for (const assertion of ['assert.equal(receipt.count,0)', 'assert.equal(receipt.count,2)', 'assert.deepEqual(failures,[])', 'toContainText(ALCHEMY_REFERENCE)', 'toHaveURL(origin+`/${locale}/thank-you`)']) assert.ok(source.includes(assertion))
})
