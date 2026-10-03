import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('public OAuth disclosures state the limited Google sign-in use and are reachable from the home footer', async () => {
  const [privacy, terms, home] = await Promise.all([
    readFile('app/privacy/page.tsx', 'utf8'),
    readFile('app/terms/page.tsx', 'utf8'),
    readFile('components/holistic-house-home.tsx', 'utf8'),
  ])

  assert.match(privacy, /Google profile and email/)
  assert.match(privacy, /not medical advice/)
  assert.match(terms, /not medical advice/)
  assert.match(home, /href="\/privacy"/)
  assert.match(home, /href="\/terms"/)
})
