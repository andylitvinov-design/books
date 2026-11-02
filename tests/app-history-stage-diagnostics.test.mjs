import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../scripts/verify-app-r1.mjs', import.meta.url), 'utf8')
const start = source.indexOf(' // Technical-only markers isolate the existing history wait without changing it.')
const endLabel = " passed('history compares real results and exact point differences')"
const end = source.indexOf(endLabel, start) + endLabel.length
assert.ok(start >= 0 && end > start, 'The exact history diagnostic block is present')
const block = source.slice(start, end)
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const run = new AsyncFunction('page','ready','expect','screenshotEvidence','passed','performance','console','origin','output','historyNavigationDiagnostics', block)
const stages = ['goto-start','goto-complete','ready-start','ready-complete','assertion-start','assertion-complete','screenshot-start','screenshot-complete']

function fixture(failAt) {
  const events = [], operations = [], passiveStages = []
  let tick = 0
  const step = kind => {
    operations.push(kind)
    if (failAt === kind) throw new Error('fixture-private-secret-with-person@example.test')
  }
  const page = {
    goto: async (...args) => { assert.deepEqual(args, ['http://localhost:3100/en/app/history']); step('goto') },
    locator: selector => { assert.equal(selector, '.hh-change'); return 'unchanged-locator' },
  }
  const ready = async (...args) => { assert.equal(args.length, 0); step('ready') }
  const expect = locator => {
    assert.equal(locator, 'unchanged-locator')
    return { toContainText: async (...args) => { assert.deepEqual(args, ['7 → 4']); step('assertion') } }
  }
  const screenshot = async (target, options) => {
    assert.equal(target, page)
    assert.deepEqual(options, { path: '/synthetic-output/history-en.png', fullPage: true })
    step('screenshot')
  }
  const passed = label => { assert.equal(label, 'history compares real results and exact point differences'); step('passed') }
  const consoleDouble = { log: (label, value) => {
    assert.equal(label, 'SYNTHETIC_HISTORY_STAGE')
    const event = JSON.parse(value)
    assert.deepEqual(Object.keys(event).sort(), ['elapsedMs','stage'])
    assert.ok(stages.includes(event.stage))
    assert.ok(Number.isFinite(event.elapsedMs) && event.elapsedMs >= 0)
    events.push(event)
  } }
  return {
    events, operations, passiveStages,
    execute: () => run(page, ready, expect, screenshot, passed, { now: () => ++tick }, consoleDouble, 'http://localhost:3100', '/synthetic-output', { mark: stage => passiveStages.push(stage) }),
  }
}

test('history markers preserve every original await, assertion and screenshot argument', async () => {
  const f = fixture()
  await f.execute()
  assert.deepEqual(f.operations, ['goto','ready','assertion','screenshot','passed'])
  assert.deepEqual(f.events.map(event => event.stage), stages)
  assert.deepEqual(f.passiveStages, stages)
  assert.ok(f.events.every((event, index) => !index || event.elapsedMs >= f.events[index - 1].elapsedMs))
  assert.doesNotMatch(block, /timeout|waitForTimeout|setTimeout|retry|catch|page\.url|headers|response|body/)
})

for (const [index, failAt] of ['goto','ready','assertion','screenshot'].entries()) {
  test('history ' + failAt + ' failure remains fatal without leaking its message or retrying', async () => {
    const f = fixture(failAt)
    await assert.rejects(f.execute(), /fixture-private-secret/)
    assert.deepEqual(f.operations, ['goto','ready','assertion','screenshot'].slice(0, index + 1))
    assert.deepEqual(f.events.map(event => event.stage), stages.slice(0, index * 2 + 1))
    assert.deepEqual(f.passiveStages, stages.slice(0, index * 2 + 1))
    assert.doesNotMatch(JSON.stringify(f.events), /fixture-private|person@|http|history-en|query|token/)
  })
}
