import test from 'node:test'
import assert from 'node:assert/strict'
import { TAOIST_TALISMANS } from '../lib/practitioners/taoist-talismans.js'
import {
  TALISMAN_CART_STORAGE_KEY, normalizeTalismanCart, readTalismanCart,
  saveBrowserTalismanCart,
} from '../lib/practitioners/taoist-talisman-cart.js'

test('Basket accepts only canonical published, deduplicated talisman IDs', () => {
  const ids = TAOIST_TALISMANS.map(item => item.id)
  assert.deepEqual(normalizeTalismanCart(ids), ids)
  assert.deepEqual(normalizeTalismanCart([ids[1], ids[1], ids[0]]), [ids[1], ids[0]])
  for (const value of [
    null, {}, 2, 'fu-balance', [null], ['not-a-talisman'], ['/api/secret'],
    [{id:ids[0]}], [ids[0], 'not-a-talisman'], [ids[0], ids[1], ids[2], ids[0]],
  ]) assert.deepEqual(normalizeTalismanCart(value), [])
})
test('Browser cart parser never trusts corrupt, oversized or private content', () => {
  const id = TAOIST_TALISMANS[0].id
  assert.deepEqual(readTalismanCart({getItem:()=>JSON.stringify([id])}), [id])
  for (const payload of ['', '[', '"fu-balance"', '{"notes":"private"}',
    JSON.stringify([{id, privateNote:'medical record'}]), ' '.repeat(301)]) {
    assert.deepEqual(readTalismanCart({getItem:()=>payload}), [])
  }
  assert.deepEqual(readTalismanCart({getItem:()=>{throw new Error('BLOCKED')}}), [])
})
test('Mutating basket without a browser is fail-closed', () => {
  assert.equal(typeof TALISMAN_CART_STORAGE_KEY, 'string')
  assert.equal(saveBrowserTalismanCart([TAOIST_TALISMANS[0].id]), false)
})
