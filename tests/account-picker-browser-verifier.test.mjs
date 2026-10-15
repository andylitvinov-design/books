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
    count: async () => name instanceof RegExp ? Number(state === 'full') : Number(name === 'Choose or change tests' && state === 'collapsed'),
    isVisible: async () => name === 'Browse full database' ? state === 'compact' : state === 'full',
    getAttribute: async () => String(open),
    click: async () => {
      actions.push(String(name))
      if (name === 'Choose or change tests') { assert.equal(state, 'collapsed'); state = 'compact' }
      else if (name === 'Browse full database') { assert.equal(state, 'compact'); state = 'full' }
      else { assert.equal(state, 'full'); open = true }
    },
  })
  const card = { filter() { return this }, first() { return this }, isVisible: async () => state === 'full' && open,
    getByRole(role, { name }) { assert.equal(role, 'checkbox'); assert.equal(name, 'Current State Check'); return { check: async () => { assert.equal(state, 'full'); assert.equal(open, true); checked = true } } } }
  const page = { getByRole: (_, { name }) => control(name), locator: () => card }
  const expect = locator => ({ toBeVisible: async () => assert.equal(await locator.isVisible(), true) })
  await new Function('expect', `${helper}; return chooseVisibleTest`)(expect)(page, 'Current State Check')
  assert.equal(checked, true)
  assert.equal(actions.filter(x => x === 'Browse full database').length, initial === 'full' ? 0 : 1)
  assert.equal(actions.filter(x => x === 'Choose or change tests').length, initial === 'collapsed' ? 1 : 0)
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
