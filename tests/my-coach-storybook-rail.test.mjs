import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PUBLIC_COACH_PERSONA_IDS, PUBLIC_COACH_RAIL_IDS} from '../lib/coaching/persona-registry.mjs'

test('My Coach horizontal chooser shows Merlin, Harry and Samir first without hiding the other coaches',()=>{
  const storybook=['merlin','harry','genie']
  assert.deepEqual(PUBLIC_COACH_RAIL_IDS.slice(0,3),storybook)
  assert.deepEqual(PUBLIC_COACH_RAIL_IDS.slice(3),PUBLIC_COACH_PERSONA_IDS.filter(id=>!storybook.includes(id)))
  assert.equal(PUBLIC_COACH_RAIL_IDS.length,PUBLIC_COACH_PERSONA_IDS.length)
  assert.equal(new Set(PUBLIC_COACH_RAIL_IDS).size,PUBLIC_COACH_PERSONA_IDS.length)
  const catalog=readFileSync(new URL('../components/my-coach-catalog.jsx',import.meta.url),'utf8')
  assert.match(catalog,/\{PUBLIC_COACH_RAIL_IDS\.map\(id => \{/)
  assert.match(catalog,/\{displayedCoaches\.map\(persona => \{/)
  assert.match(catalog,/onClick=\{\(\) => \{ setSelectedId\(id\); setSettings\(normalizeCoachSettings\(id\)\) \}\}/)
})
