import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
test('public Client Cabinet includes the same interactive Test Explorer before account login', () => {
  const cabinet = read('components/app/cabinet-landing.jsx')
  const publicExplorer = read('components/app/public-test-explorer.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const styles = read('components/app/test-explorer.module.css')
  assert.match(cabinet, /<PublicTestExplorer locale=\{locale\} embedded\s*\/>/)
  assert.match(publicExplorer, /<TestExplorer locale=\{locale\} audience="guest" embedded=\{embedded\}/)
  assert.match(explorer, /embedded \? styles\.embedded/)
  assert.match(styles, /\.embedded \.battery\{position:sticky/)
  assert.match(cabinet, /<MoodCheckIn/)
})
