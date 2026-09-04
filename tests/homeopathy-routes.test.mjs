import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAlphabeticalRemedies,
  getRemedy,
  getRemedyRouteParams,
  getRemedySwitchPath,
  isSupportedLocale,
  searchRemedies,
} from '../data/remedies.js'

test('builds all 38 remedy routes for each supported locale and no unknown locale', () => {
  assert.equal(isSupportedLocale('ru'), true)
  assert.equal(isSupportedLocale('en'), true)
  assert.equal(isSupportedLocale('de'), false)

  const params = getRemedyRouteParams()
  assert.equal(params.length, 76)
  assert.equal(params.filter(({ locale }) => locale === 'ru').length, 38)
  assert.equal(params.filter(({ locale }) => locale === 'en').length, 38)
  assert.equal(new Set(params.map(({ locale, slug }) => `${locale}/${slug}`)).size, 76)
  assert.equal(getRemedy('ru', 'not-a-remedy'), undefined)
})

test('searches partial Latin names, source Russian names, abbreviations, and Cyrillic transliteration', () => {
  assert.equal(searchRemedies('ru', 'aurum').length, 0, 'Aurum is not one of the 38 confirmed inventory entries')
  assert.equal(searchRemedies('ru', 'золото').length, 0, 'gold must not create an unsourced Aurum result')
  assert.deepEqual(searchRemedies('ru', 'nat mur').map(({ slug }) => slug), ['natrum-muriaticum'])
  assert.deepEqual(searchRemedies('ru', 'arsenicum').map(({ slug }) => slug), ['arsenicum-album'])
  assert.deepEqual(searchRemedies('ru', 'арсеникум').map(({ slug }) => slug), ['arsenicum-album'])
  assert.deepEqual(searchRemedies('ru', 'железо').map(({ slug }) => slug), ['ferrum-phosphoricum'])
  assert.equal(searchRemedies('en', 'chest').some(({ slug }) => slug === 'bach-sweet-chestnut'), true)
})

test('groups every remedy alphabetically and preserves the current slug on language switch', () => {
  const grouped = getAlphabeticalRemedies('ru')
  assert.equal(grouped.flatMap(({ remedies }) => remedies).length, 38)
  assert.equal(grouped.some(({ letter }) => letter === 'A'), true)
  assert.equal(grouped.some(({ letter }) => letter === 'S'), true)
  assert.equal(getRemedySwitchPath('en', 'natrum-muriaticum'), '/en/homeopathy/remedies/natrum-muriaticum')
  assert.equal(getRemedySwitchPath('ru', 'natrum-muriaticum'), '/ru/homeopathy/remedies/natrum-muriaticum')
})
