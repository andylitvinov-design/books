import assert from 'node:assert/strict'
import test from 'node:test'
import { getRemedy, getRemedyDirectory } from '../data/remedies.js'
import { countSupplementarySources } from '../lib/remedy-sources.js'
import { readFileSync } from 'node:fs'

test('supplementary count includes channel posts alongside export message IDs', () => {
  assert.equal(countSupplementarySources(), 0)
  assert.equal(countSupplementarySources(' ; '), 0)
  assert.equal(countSupplementarySources('message31 (2024); daomagic/139 (2025); https://t.me/another_channel/8 (2026)'), 3)
  for (const locale of ['ru', 'en']) {
    assert.equal(countSupplementarySources(getRemedy(locale, 'aconitum').supplementary_materials), 15)
    for (const { slug } of getRemedyDirectory(locale).filter(({ slug }) => slug !== 'aconitum')) {
      const references = getRemedy(locale, slug).supplementary_materials
      assert.equal(countSupplementarySources(references), (references?.match(/message-?\d+/gi) ?? []).length, slug)
    }
  }
})

test('Aconitum supplementary references form fifteen renderer-compatible list blocks', () => {
  for (const locale of ['ru', 'en']) {
    const text = getRemedy(locale, 'aconitum').description
    const supplementary = text.split(/^## /m).at(-1)
    const listBlocks = supplementary.split(/\n{2,}/).filter((block) => /^- /u.test(block.trim()))
    assert.equal(listBlocks.length, 15)
    assert.ok(listBlocks.every((block) => !block.includes('\n- ')))
    assert.doesNotMatch(supplementary, /\[daomagic\/139\]/)
  }
  assert.match(readFileSync('components/remedy-content.tsx', 'utf8'), /countSupplementarySources\(remedy\.supplementary_materials\)/)
})
