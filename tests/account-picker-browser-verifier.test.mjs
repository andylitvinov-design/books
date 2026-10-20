import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {buildExplorerEntries} from '../lib/assessments/test-explorer.js'
const source = readFileSync(new URL('../scripts/verify-app-r1.mjs', import.meta.url), 'utf8')
const helper = source.slice(source.indexOf('async function chooseVisibleTest('), source.indexOf('// Exact approved public hero'))
for (const initial of ['compact', 'collapsed', 'full']) test(`browser verifier selects through the real ${initial} catalog transition`, async () => {
  let state = initial, open = false, checked = false
  const actions = []
  const control = name => ({
    count: async () => name instanceof RegExp ? Number(state === 'full') : 0,
    isVisible: async () => name === 'Browse full database' ? state === 'compact' : state === 'full',
    getAttribute: async () => String(open),
    click: async () => {
      actions.push(String(name))
      if (name === 'Browse full database') { assert.equal(state, 'compact'); state = 'full' }
      else { assert.equal(state, 'full'); open = true }
    },
  })
  const card = { count: async () => Number(state === 'full' && open), filter() { return this }, first() { return this }, isVisible: async () => state === 'full' && open,
    getByRole(role, { name, exact }) { assert.ok(['heading','checkbox'].includes(role)); assert.equal(exact,true); assert.equal(name, 'Current State Check'); return { count: async () => 1, check: async () => { assert.equal(state, 'full'); assert.equal(open, true); checked = true } } } }
  const page = { getByRole: (_, { name }) => control(name), locator: selector => selector === '#my-tests-picker-toggle' ? { count: async () => Number(state === 'collapsed') } : selector.startsWith('button[')?control(/customizer/):card }
  const expect = locator => ({ toBeVisible: async () => assert.equal(await locator.isVisible(), true), toHaveCount: async count => assert.equal(await locator.count(),count), toBeChecked: async () => assert.equal(checked,true), toHaveAttribute: async (key,value) => {assert.equal(key,'aria-expanded');assert.equal(await locator.getAttribute(key),value)} })
  const openAccountTestPicker = async (target, matcher) => { assert.equal(target,page); assert.equal(matcher,expect); assert.equal(state,'collapsed'); actions.push('top-picker'); state='compact' }
  await new Function('expect', 'openAccountTestPicker', `${helper}; return chooseVisibleTest`)(expect,openAccountTestPicker)(page, 'Current State Check')
  assert.equal(checked, true)
  assert.equal(actions.filter(x => x === 'Browse full database').length, initial === 'full' ? 0 : 1)
  assert.equal(actions.filter(x => x === 'top-picker').length, initial === 'collapsed' ? 1 : 0)
})

const selectSource = source.slice(source.indexOf('function unsavedPublicTest('), source.indexOf('async function chooseVisibleTest('))
const selectUnsaved = new Function('assert', 'buildExplorerEntries', `${selectSource};return unsavedPublicTest`)(assert, buildExplorerEntries)
test('public append regression selects an absent exact ID when Monthly was already suggested', () => {
  const catalog = buildExplorerEntries({locale:'en', audience:'public'})
  const savedKeys = ['hh-current-state','hh-weekly-pulse','hh-resource-pulse','hh-monthly-profile','mini-ipip-20']
  const saved = {definitionIds: catalog.filter(row => savedKeys.includes(row.key)).map(row => row.definition.id)}
  assert.ok(saved.definitionIds.includes(catalog.find(row => row.key === 'hh-monthly-profile').definition.id))
  const selected = selectUnsaved(saved)
  assert.equal(selected.key, 'ipip-locus-of-control-internality-10')
  assert.equal(saved.definitionIds.includes(selected.definition.id), false)
  assert.equal(selected.selectable, true)
  const second = selectUnsaved({definitionIds:[...saved.definitionIds, selected.definition.id]})
  assert.notEqual(second.definition.id, selected.definition.id)
  assert.throws(() => selectUnsaved({definitionIds:catalog.filter(row=>row.definition).map(row=>row.definition.id)}), /not already saved/)
})
