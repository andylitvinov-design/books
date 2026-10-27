import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { alignAndMeasureStablePortraitFrame } from '../scripts/helpers/portrait-frame-readiness.mjs'

const base = { firstTop: 0, span: 373.25, pictureWidth: 231, pictureHeight: 250.25,
  minTopTap: 52, minBottomTap: 52, width: 390, height: 550, overflow: 0, scrollY: 100 }
function fixture() {
  let current = { ...base }, sequence = 0, nextId = 0
  const callbacks = new Map(), timers = new Map(), alignments = []
  const win = {
    get innerWidth() { return current.width }, get innerHeight() { return current.height },
    scrollX: 0, get scrollY() { return current.scrollY },
    get visualViewport() { return { width: current.width, height: current.height, offsetTop: 0 } },
    requestAnimationFrame(fn) { const id = ++nextId; callbacks.set(id, fn); return id },
    cancelAnimationFrame(id) { callbacks.delete(id) },
    setTimeout(fn, ms) { const id = ++nextId; timers.set(id, { fn, ms }); return id },
    clearTimeout(id) { timers.delete(id) },
  }
  const button = key => ({ getBoundingClientRect: () => ({ height: current[key] }) })
  const upper = {
    getBoundingClientRect: () => ({ top: current.firstTop }),
    querySelectorAll: () => [button('minTopTap')],
    scrollIntoView(options) { alignments.push({ sequence, options }) },
  }
  const lower = { getBoundingClientRect: () => ({ bottom: current.firstTop + current.span }),
    querySelectorAll: () => [button('minBottomTap')] }
  const picture = { getBoundingClientRect: () => ({ width: current.pictureWidth, height: current.pictureHeight }) }
  const nodes = { '[data-portrait-sectors]': upper, '[data-testid="portrait-quick-actions"]': lower,
    '[data-radar-layout="full-circle"]': picture }
  const el = { ownerDocument: { defaultView: win,
    documentElement: { get scrollWidth() { return current.width + current.overflow } } },
    querySelector: selector => nodes[selector] }
  return {
    el, upper, alignments, callbacks, timers,
    step(frame = {}) {
      current = { ...base, ...frame }; sequence += 1
      const pending = [...callbacks.entries()]; callbacks.clear()
      for (const [, fn] of pending) fn(sequence * 16)
    },
    expire() { for (const { fn } of [...timers.values()]) fn() },
  }
}
const observe = f => alignAndMeasureStablePortraitFrame(f.el, { width: 390, height: 550 })

test('waits for resized layout before one instant alignment and stable placement before returning', async () => {
  const f = fixture(), result = observe(f)
  f.step({ width: 320, height: 844 }); f.step({ width: 320, height: 844 })
  assert.equal(f.alignments.length, 0, 'a stable old viewport is not readiness')
  f.step({ firstTop: 10 }); f.step({ firstTop: 20 }); f.step({ firstTop: 20 })
  assert.deepEqual(f.alignments, [{ sequence: 5, options: { block: 'start', inline: 'nearest', behavior: 'instant' } }])
  let settled = false; result.then(() => { settled = true })
  f.step({ firstTop: -3.140625 }); await Promise.resolve()
  assert.equal(settled, false, 'do not sample the first post-scroll intermediate rect')
  f.step({ firstTop: 3 }); f.step({ firstTop: 5 }); f.step({ firstTop: 5 })
  const frame = await result
  assert.equal(frame.firstTop, 5)
  assert.equal(frame.span, 373.25)
  assert.equal(f.alignments.length, 1, 'never keep scrolling until visibility passes')
  assert.equal(f.callbacks.size, 0); assert.equal(f.timers.size, 0)
})

test('stable clipped WebKit evidence is returned unchanged and still fails the existing visibility gate', async () => {
  const f = fixture(), result = observe(f)
  for (let i = 0; i < 4; i++) f.step({ firstTop: -3.140625 })
  const frame = await result
  assert.equal(frame.firstTop, -3.140625)
  assert.equal(frame.lastBottom, 370.109375)
  assert.equal(frame.span, 373.25)
  assert.throws(() => assert.ok(frame.firstTop >= -2 && frame.lastBottom <= frame.viewportHeight - 70))
  assert.equal(f.alignments.length, 1)
})

test('stable oversized image, undersized taps and overflow are not normalized into passing measurements', async () => {
  const f = fixture(), result = observe(f)
  for (let i = 0; i < 4; i++) f.step({ span: 600, pictureWidth: 200, pictureHeight: 300, minTopTap: 30, minBottomTap: 31, overflow: 5 })
  const frame = await result
  assert.equal(frame.span, 600); assert.equal(frame.pictureWidth, 200); assert.equal(frame.pictureHeight, 300)
  assert.equal(frame.minTopTap, 30); assert.equal(frame.minBottomTap, 31); assert.equal(frame.overflow, 5)
})

test('continuous movement fails on the watchdog deadline instead of sleeping or returning a passing sample', async () => {
  const f = fixture(), result = observe(f)
  const rejection = assert.rejects(result, /did not stabilize.*before-scroll/)
  for (let i = 0; i < 8; i++) f.step({ firstTop: i % 2 })
  assert.equal(f.alignments.length, 0)
  assert.deepEqual([...f.timers.values()].map(t => t.ms), [30000])
  f.expire(); await rejection
  assert.equal(f.callbacks.size, 0); assert.equal(f.timers.size, 0)
})

test('unstable placement after alignment also fails without a second alignment', async () => {
  const f = fixture(), result = observe(f)
  const rejection = assert.rejects(result, /did not stabilize.*after-scroll/)
  f.step(); f.step()
  for (let i = 0; i < 8; i++) f.step({ firstTop: i % 2 + 10 })
  assert.equal(f.alignments.length, 1)
  f.expire(); await rejection
})

test('missing frame elements and actual scroll errors are propagated', async () => {
  const absent = fixture(); absent.el.querySelector = () => null
  assert.throws(() => observe(absent), /elements are missing/)
  const f = fixture(), result = observe(f)
  const rejection = assert.rejects(result, /synthetic scroll failure/)
  f.upper.scrollIntoView = () => { throw new Error('synthetic scroll failure') }
  f.step(); f.step(); await rejection
  assert.equal(f.callbacks.size, 0); assert.equal(f.timers.size, 0)
})

test('browser wiring retains all original hard gates after the measured readiness helper', () => {
  const source = readFileSync(new URL('../scripts/verify-portrait-mobile.mjs', import.meta.url), 'utf8')
  const resize = source.indexOf('await page.setViewportSize({ width, height })')
  const measure = source.indexOf('const frame = await card().evaluate(alignAndMeasureStablePortraitFrame, { width, height })')
  const gate = source.indexOf('assert.ok(frame.span <= maxSpan', measure)
  assert.ok(resize > 0 && measure > resize && gate > measure)
  assert.match(source, /const maxSpan = shortViewport \? 470 : 535/)
  assert.match(source, /frame\.pictureWidth >= \(shortViewport \? 228 : 262\)/)
  assert.match(source, /Math\.abs\(frame\.pictureHeight \/ frame\.pictureWidth - 390 \/ 360\) < \.025/)
  assert.match(source, /frame\.firstTop >= -2 && frame\.lastBottom <= frame\.viewportHeight - 70/)
  assert.match(source, /frame\.minTopTap >= 44 && frame\.minBottomTap >= 44/)
  assert.match(source, /frame\.overflow <= 1/)
  assert.doesNotMatch(source, /waitForTimeout|freshPortraitReportPage/)
})
