import test from 'node:test'
import assert from 'node:assert/strict'
import { ALCHEMY_PANEL_IDS, assertAlchemyPanelOrder } from '../scripts/helpers/alchemy-panel-contract.mjs'

const panels = ids => ids.map(name => ({name,height:500,max:764}))
test('accepts exact nine ordered panels without altering geometry', () => {
  const measurements=panels(ALCHEMY_PANEL_IDS)
  const before=structuredClone(measurements)
  assertAlchemyPanelOrder(measurements)
  assert.deepEqual(measurements,before)
})
for (const id of ALCHEMY_PANEL_IDS) {
  test('rejects missing panel '+id, () => assert.throws(() =>
    assertAlchemyPanelOrder(panels(ALCHEMY_PANEL_IDS.filter(name => name!==id)))))
}
test('rejects duplicate panel even with count nine', () => {
  const ids=[...ALCHEMY_PANEL_IDS];ids[0]='hero'
  assert.throws(()=>assertAlchemyPanelOrder(panels(ids)))
})
test('rejects wrong panel with count nine', () => {
  const ids=[...ALCHEMY_PANEL_IDS];ids[0]='unknown'
  assert.throws(()=>assertAlchemyPanelOrder(panels(ids)))
})
test('rejects changed order with all correct IDs', () => {
  const ids=[...ALCHEMY_PANEL_IDS];[ids[0],ids[1]]=[ids[1],ids[0]]
  assert.throws(()=>assertAlchemyPanelOrder(panels(ids)))
})
test('rejects extra panel', () => assert.throws(()=>
  assertAlchemyPanelOrder(panels([...ALCHEMY_PANEL_IDS,'extra']))))
test('source integration retains all-panel geometry and DAO verifier', async () => {
  const {readFile}=await import('node:fs/promises')
  const script=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
  assert.match(script,/assertAlchemyPanelOrder\(measurements\)/)
  assert.match(script,/assert\.deepEqual\(measurements\.filter\(x=>x\.height>x\.max\),\[\]/)
  assert.match(script,/await assertAlchemyPaymentsExpanded\(servicePage,expect,width\)/)
  assert.match(script,/await verifyDaoLeadJourney\(servicePage,expect,locale\)/)
})
