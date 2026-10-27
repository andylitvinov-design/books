import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const source = readFileSync(new URL('../components/mobile-bottom-navigation.tsx', import.meta.url), 'utf8')
const marker = '  useEffect(() => {\n    // Keep the fixed dock from taking the release half'
const start = source.indexOf(marker)
const end = source.indexOf('\n  }, [hidden, locale]);', start)
const body = start < 0 ? '' : source.slice(start + '  useEffect(() => {'.length, end)

function harness({ mobile = true, contactFocused = true, channel = true, sameForm = true, disabled = false,
  elementPresent = true, visibility = '', pointerEvents = '', priority = '',
  publicCollection = false, publicPicker = true, samePicker = true, searchType = 'search', searchId = 'hh-test-hero-search', connected = true } = {}) {
  class Node { contains(other) { return other === this || other?.parent === this } }
  class Element extends Node {
    constructor(kind, form = null) { super(); this.kind = kind; this.form = form; this.isConnected = true; this.disabled = false }
    closest(selector) {
      if (selector === 'button[data-compact-channel]') return this.kind === 'child' && this.parent.kind === 'channel' ? this.parent : this.kind === 'channel' ? this : null
      if (selector === 'button[data-test-collection]') return this.kind === 'child' && this.parent.kind === 'collection' ? this.parent : this.kind === 'collection' ? this : null
      if (selector === '[data-prelogin-test-picker][data-public-test-picker="true"]') return this.picker || null
      if (selector === 'form[data-compact-lead-form]') return this.form
      throw new Error('unexpected selector')
    }
    matches(selector) {
      if (selector === 'input#hh-test-hero-search[type="search"]') return this.kind === 'search' && this.type === 'search' && this.id === 'hh-test-hero-search'
      assert.equal(selector, 'input[name="contact"]'); return this.kind === 'editor'
    }
  }
  const form = new Element('form'), otherForm = new Element('form')
  const picker = new Element('picker'), otherPicker = new Element('picker')
  const button = new Element(publicCollection ? 'collection' : channel ? 'channel' : 'other', form), child = new Element('child', form)
  button.picker = publicPicker ? picker : null; button.isConnected = connected
  child.parent = button; button.disabled = disabled
  const editor = new Element(publicCollection ? 'search' : 'editor', sameForm ? form : otherForm), other = new Element('other')
  editor.picker = samePicker ? picker : otherPicker; editor.type = searchType; editor.id = searchId
  const values = new Map(), priorities = new Map()
  const style = {
    setProperty(key, value, p = '') { values.set(key, value); priorities.set(key, p) },
    removeProperty(key) { values.delete(key); priorities.delete(key) },
    getPropertyValue(key) { return values.get(key) || '' },
    getPropertyPriority(key) { return priorities.get(key) || '' },
  }
  if (visibility) style.setProperty('visibility', visibility, priority)
  if (pointerEvents) style.setProperty('pointer-events', pointerEvents, priority)
  const nav = new Element('nav'); nav.style = style
  const listeners = []
  const owner = name => ({
    addEventListener(type, fn, options = {}) { listeners.push({ name, type, fn, capture: options === true || Boolean(options.capture), passive: Boolean(options.passive) }) },
    removeEventListener(type, fn, options = {}) {
      const capture = options === true || Boolean(options.capture)
      const n = listeners.findIndex(row => row.name === name && row.type === type && row.fn === fn && row.capture === capture)
      assert.ok(n >= 0, name + '/' + type); listeners.splice(n, 1)
    },
  })
  const document = { ...owner('document'), activeElement: contactFocused ? editor : other, visibilityState: 'visible' }
  const tasks = new Map(), scheduled = []; let taskId = 0
  const window = { ...owner('window'),
    setTimeout(fn, delay) { assert.equal(delay, 0); const id = ++taskId; tasks.set(id, fn); scheduled.push(fn); return id },
    clearTimeout(id) { tasks.delete(id) },
    matchMedia(query) { assert.equal(query, '(max-width: 767px)'); return { matches: mobile } } }
  document.elementFromPoint = (x, y) => x >= 34 && x <= 191 && y >= 770.9 && y <= 819.9
    ? (document.activeElement === editor || style.getPropertyValue('pointer-events') === 'none' ? child : nav) : other
  const cleanup = body ? vm.runInNewContext(stripTypeScriptTypes('(function(){' + body + '})()'),
    { nav: { current: elementPresent ? nav : null }, window, document, Element, Node }) : undefined
  let actions = 0
  const emit = (type, target = child, extras = {}, name = 'document') => {
    const event = { type, target, pointerId: 7, isTrusted: true, isPrimary: true, button: 0, clientX: 112, clientY: 795, ...extras,
      preventDefault() { throw new Error('must not cancel native event') },
      stopPropagation() { throw new Error('must not stop native event') },
      stopImmediatePropagation() { throw new Error('must not stop native event') },
    }
    // The browser resolves each native event target before listener dispatch.
    for (const row of [...listeners].filter(row => row.name === name && row.type === type)) row.fn(event)
    if (type === 'click' && button.contains(event.target) && !button.disabled) actions++
    return event
  }
  // Replays the exact observed release coordinate against the proven boxes;
  // not a browser rendering or CSS-engine substitute.
  const hit = () => document.activeElement === editor || style.getPropertyValue('pointer-events') === 'none' ? child : nav
  const begin = extras => emit('pointerdown', child, extras)
  const blurEditor = (focusButton = true) => { document.activeElement = focusButton ? button : other }
  const complete = ({ compatibilityMouse = true, focusButton = true } = {}) => {
    begin(); blurEditor(focusButton)
    const upTarget = hit(); emit('pointerup', upTarget)
    let mouseTarget = null
    if (compatibilityMouse) { mouseTarget = hit(); emit('mouseup', mouseTarget) }
    const clickTarget = button.contains(upTarget) && (!mouseTarget || button.contains(mouseTarget)) ? child : other
    emit('click', clickTarget)
    return { upTarget, mouseTarget, clickTarget }
  }
  return { style, values, priorities, nav, form, editor, button, child, other, document, window, listeners,
    emit, hit, begin, blurEditor, complete, cleanup: () => cleanup?.(), actions: () => actions,
    tasks, scheduled, advanceTask() { const next = tasks.entries().next().value; if (next) { tasks.delete(next[0]); next[1]() } },
    setMobile(value) { mobile = value } }
}

for (const focusButton of [true, false]) test('observed overlay cannot steal native mouse release, button focus ' + focusButton, () => {
  const h = harness(), result = h.complete({ focusButton })
  assert.equal(result.upTarget, h.child)
  assert.equal(result.mouseTarget, h.child)
  assert.equal(result.clickTarget, h.child)
  assert.equal(h.actions(), 1)
  assert.equal(h.values.size, 0)
  h.cleanup(); assert.equal(h.listeners.length, 0)
})

test('hold spans pointerup until native mouseup target exists, then restores even without click', () => {
  const h = harness(); h.begin(); h.blurEditor()
  h.emit('pointerup', h.child)
  assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
  const target = h.hit(); h.emit('mouseup', target)
  assert.equal(target, h.child)
  assert.equal(h.values.size, 0)
  assert.equal(h.actions(), 0)
  h.cleanup()
})

test('pointer-only click restores after its target is resolved without compatibility mouse events', () => {
  const h = harness(), result = h.complete({ compatibilityMouse: false, focusButton: false })
  assert.equal(result.clickTarget, h.child); assert.equal(h.actions(), 1); assert.equal(h.values.size, 0)
  h.cleanup()
})

for (const termination of ['pointercancel', 'contextmenu', 'dragstart', 'keydown', 'blur', 'pagehide', 'visibilitychange'])
  test('abandoned gesture restores on ' + termination + ' without activating', () => {
    const h = harness(); h.begin(); h.blurEditor()
    assert.equal(h.style.getPropertyValue('visibility'), 'hidden')
    if (termination === 'visibilitychange') h.document.visibilityState = 'hidden'
    h.emit(termination, h.child, {}, ['blur', 'pagehide'].includes(termination) ? 'window' : 'document')
    assert.equal(h.values.size, 0); assert.equal(h.actions(), 0); h.cleanup()
  })

for (const termination of ['outside', 'detached', 'disabled']) test('release ' + termination + ' preserves cancellation', () => {
  const h = harness(); h.begin(); h.blurEditor()
  if (termination === 'detached') h.button.isConnected = false
  if (termination === 'disabled') h.button.disabled = true
  h.emit('pointerup', termination === 'outside' ? h.other : h.child)
  assert.equal(h.values.size, 0); assert.equal(h.actions(), 0); h.cleanup()
})

for (const options of [{ mobile: false }, { contactFocused: false }, { channel: false }, { sameForm: false }, { disabled: true }])
  test('unrelated interactions are untouched ' + JSON.stringify(options), () => {
    const h = harness(options); h.begin(); assert.equal(h.values.size, 0); assert.equal(h.actions(), 0); h.cleanup()
  })

test('secondary pointers cannot cancel or steal the primary gesture', () => {
  const h = harness(); h.begin(); h.blurEditor()
  h.emit('pointerdown', h.other, { pointerId: 8, isPrimary: false })
  h.emit('pointerup', h.other, { pointerId: 8, isPrimary: false })
  h.emit('pointercancel', h.other, { pointerId: 8, isPrimary: false })
  assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
  h.emit('pointerup', h.child); h.emit('mouseup', h.child); h.emit('click', h.child)
  assert.equal(h.actions(), 1); assert.equal(h.values.size, 0); h.cleanup()
})

test('secondary mouse buttons and keyboard-only activation do not hide navigation', () => {
  const h = harness(); h.begin({ button: 2 }); assert.equal(h.values.size, 0)
  h.document.activeElement = h.button
  h.emit('keydown'); h.emit('click', h.button, { detail: 0 })
  assert.equal(h.actions(), 1); assert.equal(h.values.size, 0); h.cleanup()
})

test('a new primary gesture releases stale state and repeated real clicks stay single', () => {
  const h = harness(); h.begin(); h.blurEditor(); h.emit('pointerdown', h.other)
  assert.equal(h.values.size, 0)
  for (let n = 0; n < 3; n++) { h.document.activeElement = h.editor; h.complete() }
  assert.equal(h.actions(), 3); assert.equal(h.values.size, 0); h.cleanup()
})

test('effect cleanup and Strict Mode remount restore pre-existing style values and priorities', () => {
  for (let n = 0; n < 2; n++) {
    const h = harness({ visibility: 'collapse', pointerEvents: 'auto', priority: 'important' })
    h.begin(); h.blurEditor(); h.cleanup()
    assert.equal(h.style.getPropertyValue('visibility'), 'collapse')
    assert.equal(h.style.getPropertyValue('pointer-events'), 'auto')
    assert.equal(h.style.getPropertyPriority('visibility'), 'important')
    assert.equal(h.style.getPropertyPriority('pointer-events'), 'important')
    assert.equal(h.listeners.length, 0); assert.equal(h.actions(), 0)
  }
  const absent = harness({ elementPresent: false }); assert.equal(absent.listeners.length, 0); absent.cleanup()
})

test('guard uses passive capture without manipulating activation, focus or layout', () => {
  assert.ok(start > 0 && end > start)
  assert.doesNotMatch(body, /preventDefault|stopPropagation|stopImmediatePropagation|setPointerCapture|releasePointerCapture|dispatchEvent|\.click\(|\.focus\(|\.blur\(|setInterval|requestAnimationFrame|scrollIntoView|scrollTo|fetch\(|\.value\b|aria-hidden|tabIndex/)
  assert.equal((body.match(/window\.setTimeout\(/g) || []).length, 1)
  assert.match(body, /completionTimer = window\.setTimeout\(\(\) => \{[\s\S]*?\}, 0\);/)
  const h = harness()
  assert.ok(h.listeners.filter(row => !['visibilitychange', 'blur', 'pagehide'].includes(row.type)).every(row => row.capture && row.passive))
  assert.equal(h.listeners.length, 11); h.cleanup()
})

test('focus and viewport changes during keyboard dismissal do not prematurely release the gesture', () => {
  const h = harness(); h.begin(); h.blurEditor(false)
  h.emit('focusout', h.editor); h.emit('focusin', h.button)
  h.emit('resize', h.other, {}, 'window'); h.emit('visibilitychange')
  assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
  h.emit('pointerup', h.child); h.emit('mouseup', h.child); h.emit('click', h.child)
  assert.equal(h.actions(), 1); assert.equal(h.values.size, 0); h.cleanup()
})

for (const followup of ['none', 'lostpointercapture', 'disable-in-bubble', 'detach-in-bubble'])
  test('completed pointer-only gesture restores without any mouseup/click: ' + followup, () => {
    const h = harness(); h.begin(); h.blurEditor(false); h.emit('pointerup', h.child)
    assert.equal(h.tasks.size, 1)
    assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
    if (followup === 'lostpointercapture') h.emit('lostpointercapture', h.child)
    if (followup === 'disable-in-bubble') h.button.disabled = true
    if (followup === 'detach-in-bubble') h.button.isConnected = false
    h.advanceTask()
    assert.equal(h.values.size, 0); assert.equal(h.tasks.size, 0); assert.equal(h.actions(), 0)
    h.cleanup()
  })

test('implicit captured release outside the physical button abandons without waiting or activating', () => {
  const h = harness(); h.begin(); h.blurEditor(false)
  h.emit('pointerup', h.child, { clientX: 300, clientY: 600 })
  assert.equal(h.values.size, 0); assert.equal(h.tasks.size, 0); assert.equal(h.actions(), 0); h.cleanup()
})

test('delayed pointer click retains its already resolved native down/up target after completion fallback', () => {
  const h = harness(); h.begin(); h.blurEditor(false)
  const nativeUpTarget = h.hit(); h.emit('pointerup', nativeUpTarget)
  h.advanceTask(); assert.equal(h.values.size, 0)
  // Pointer Events3 §4.2.12.3: native click target is computed from down/up,
  // not whichever element now covers the pointer point. This is a model,
  // not proof that any particular native browser implementation conforms.
  assert.equal(h.hit(), h.nav)
  h.emit('click', nativeUpTarget)
  assert.equal(h.actions(), 1); assert.equal(h.tasks.size, 0); h.cleanup()
})

for (const termination of ['mouseup', 'click', 'pointercancel', 'keydown', 'pagehide', 'hidden', 'cleanup'])
  test('pending completion is canceled by ' + termination, () => {
    const h = harness(); h.begin(); h.blurEditor(); h.emit('pointerup', h.child)
    assert.equal(h.tasks.size, 1)
    if (termination === 'cleanup') h.cleanup()
    else if (termination === 'hidden') { h.document.visibilityState = 'hidden'; h.emit('visibilitychange') }
    else h.emit(termination, h.child, {}, termination === 'pagehide' ? 'window' : 'document')
    assert.equal(h.tasks.size, 0); assert.equal(h.values.size, 0)
    h.advanceTask(); assert.equal(h.values.size, 0)
    if (termination !== 'cleanup') h.cleanup()
  })

test('stale completion cannot release a later gesture or lose its cleanup handle', () => {
  const h = harness(); h.begin(); h.blurEditor(); h.emit('pointerup', h.child)
  const old = h.scheduled[0]
  h.document.activeElement = h.editor; h.begin(); h.blurEditor(); h.emit('pointerup', h.child)
  assert.equal(h.tasks.size, 1)
  old()
  assert.equal(h.tasks.size, 1); assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
  h.cleanup(); assert.equal(h.tasks.size, 0); assert.equal(h.values.size, 0)
})


for (const focusButton of [true, false]) test('same public picker search→collection keeps physical down/up/click target; button focus ' + focusButton, () => {
  const h = harness({ publicCollection: true }), before = h.document.activeElement
  h.begin(); assert.equal(h.document.activeElement, before, 'Guard never moves focus')
  assert.equal(h.style.getPropertyValue('visibility'), 'hidden'); assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
  h.blurEditor(focusButton)
  const up = h.hit(); h.emit('pointerup', up); const mouse = h.hit(); h.emit('mouseup', mouse)
  assert.equal(up, h.child); assert.equal(mouse, h.child)
  h.emit('click', up); assert.equal(h.actions(), 1); assert.equal(h.values.size, 0); h.cleanup()
})

test('public collection pointer-only release/click is native and restores before a later interaction', () => {
  const h = harness({ publicCollection: true }), result = h.complete({ compatibilityMouse: false })
  assert.equal(result.upTarget, h.child); assert.equal(result.clickTarget, h.child)
  assert.equal(h.actions(), 1); assert.equal(h.values.size, 0); assert.equal(h.tasks.size, 0); h.cleanup()
})

for (const [name, options, extras] of [
  ['private picker', { publicPicker: false }, {}],
  ['different picker', { samePicker: false }, {}],
  ['wrong search type', { searchType: 'tel' }, {}],
  ['wrong search identity', { searchId: 'different-search' }, {}],
  ['no focused editor', { contactFocused: false }, {}],
  ['disabled collection', { disabled: true }, {}],
  ['detached collection', { connected: false }, {}],
  ['desktop', { mobile: false }, {}],
  ['untrusted pointer', {}, { isTrusted: false }],
  ['secondary pointer', {}, { isPrimary: false, pointerId: 8 }],
  ['secondary button', {}, { button: 2 }],
]) test('public collection hold excludes ' + name, () => {
  const h = harness({ publicCollection: true, ...options }); h.begin(extras)
  assert.equal(h.values.size, 0); assert.equal(h.tasks.size, 0); assert.equal(h.actions(), 0); h.cleanup()
})

test('public search does not broaden the guard to unrelated buttons or collection without focus', () => {
  const h = harness({ publicCollection: true }); h.button.kind = 'other'; h.begin()
  assert.equal(h.values.size, 0); h.cleanup()
})

for (const terminal of ['pointercancel', 'contextmenu', 'dragstart', 'keydown', 'blur', 'pagehide', 'visibilitychange', 'cleanup'])
  test('public collection abandoned native gesture restores on ' + terminal, () => {
    const h = harness({ publicCollection: true }); h.begin(); h.blurEditor()
    if (terminal === 'visibilitychange') h.document.visibilityState = 'hidden'
    if (terminal === 'cleanup') h.cleanup()
    else { h.emit(terminal, h.child, {}, ['blur', 'pagehide'].includes(terminal) ? 'window' : 'document'); h.cleanup() }
    assert.equal(h.values.size, 0); assert.equal(h.tasks.size, 0); assert.equal(h.actions(), 0); assert.equal(h.listeners.length, 0)
  })

for (const terminal of ['outside', 'detached', 'disabled']) test('public collection release ' + terminal + ' keeps native cancellation', () => {
  const h = harness({ publicCollection: true }); h.begin(); h.blurEditor()
  if (terminal === 'detached') h.button.isConnected = false
  if (terminal === 'disabled') h.button.disabled = true
  h.emit('pointerup', h.child, terminal === 'outside' ? { clientX: 300, clientY: 600 } : {})
  assert.equal(h.values.size, 0); assert.equal(h.tasks.size, 0); assert.equal(h.actions(), 0); h.cleanup()
})

test('public collection secondary pointer cannot steal primary hold and stale release cannot clear the next hold', () => {
  const h = harness({ publicCollection: true }); h.begin(); h.blurEditor()
  h.emit('pointerdown', h.other, { isPrimary: false, pointerId: 8 }); h.emit('pointerup', h.other, { pointerId: 8 }); h.emit('pointercancel', h.other, { pointerId: 8 })
  assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
  h.emit('pointerup', h.child); const old = h.scheduled[0]
  h.document.activeElement = h.editor; h.begin({ pointerId: 9 }); h.blurEditor(); h.emit('pointerup', h.child, { pointerId: 9 })
  old(); assert.equal(h.style.getPropertyValue('pointer-events'), 'none'); assert.equal(h.tasks.size, 1)
  h.advanceTask(); assert.equal(h.values.size, 0); assert.equal(h.tasks.size, 0); assert.equal(h.actions(), 0); h.cleanup()
})

for (const terminal of ['none', 'disabled', 'detached']) test('public collection delayed-click fallback releases even when click is suppressed: ' + terminal, () => {
  const h = harness({ publicCollection: true }); h.begin(); h.blurEditor(); h.emit('pointerup', h.child)
  if (terminal === 'disabled') h.button.disabled = true
  if (terminal === 'detached') h.button.isConnected = false
  h.advanceTask(); assert.equal(h.values.size, 0); assert.equal(h.actions(), 0); assert.equal(h.tasks.size, 0); h.cleanup()
})

test('public collection effect cleanup restores exact preexisting style values and priorities through remount', () => {
  for (let index = 0; index < 2; index++) {
    const h = harness({ publicCollection: true, visibility: 'collapse', pointerEvents: 'auto', priority: 'important' })
    h.begin(); h.blurEditor(); h.cleanup()
    assert.equal(h.style.getPropertyValue('visibility'), 'collapse'); assert.equal(h.style.getPropertyValue('pointer-events'), 'auto')
    assert.equal(h.style.getPropertyPriority('visibility'), 'important'); assert.equal(h.style.getPropertyPriority('pointer-events'), 'important')
    assert.equal(h.actions(), 0); assert.equal(h.tasks.size, 0); assert.equal(h.listeners.length, 0)
  }
})


test('public search blur and viewport changes do not release the held collection gesture early', () => {
  const h = harness({ publicCollection: true }); h.begin(); h.blurEditor(false)
  h.emit('focusout', h.editor); h.emit('focusin', h.button)
  h.emit('resize', h.other, {}, 'window'); h.emit('visibilitychange')
  assert.equal(h.style.getPropertyValue('pointer-events'), 'none')
  h.emit('pointerup', h.child); h.emit('mouseup', h.child); h.emit('click', h.child)
  assert.equal(h.actions(), 1); assert.equal(h.values.size, 0); h.cleanup()
})
