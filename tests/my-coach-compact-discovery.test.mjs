import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Coach second screen retains five-mode filters and four compact topics', () => {
  const jsx = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-catalog.module.css')
  for (const mode of ['all', 'ai', 'human', 'express', 'tao'])
    assert.ok(jsx.includes('data-my-coach-mode="' + mode + '"'), mode)
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/)
  assert.match(jsx, /<section className=\{\[styles\.hero, heroStyles\.landing\]/)
  assert.doesNotMatch(jsx, /showIntroHero|setShowIntroHero/)
  assert.ok(jsx.indexOf('id="my-coach-top"') < jsx.indexOf('id="all-coaches"'))
  assert.match(jsx, /coachModes && <section className=\{styles.discover\}/)
  for (const label of ["label:d.antistress", "label:categories.relationships", "label:d.goals", "label:d.energy"])
    assert.ok(jsx.includes(label), label)
  assert.match(jsx, /<div className=\{heroStyles\.benefitTiles\}>/)
  assert.match(jsx, /href="#my-coach-top"/)
  assert.match(jsx, /onClick=\{\(\) => document\.getElementById\('my-coach-top'\)/)
  assert.match(jsx, /sortBy, setSortBy\] = useState\('suggested'\)/)
  assert.match(jsx, /setTopic\(current => current === item.id \? 'all' : item.id\)/)
})

test('Express Diagnostics reuses three existing free services, never a paid booking', () => {
  const jsx = read('components/my-coach-catalog.jsx')
  for (const path of ['/services/free-situation-review','/services/dao-health-profile','/tests'])
    assert.ok(jsx.includes(path), path)
  for (const id of ['situation','wu','tests'])
    assert.ok(jsx.includes("id:'" + id + "'"), id)
  assert.match(jsx, /data-my-coach-free-option=\{option.id\}/)
  assert.doesNotMatch(jsx, /personal-session-30-eur50|paymentUrl/)
})

test('Tao Advice uses existing client-side Dao guidance and a sage icon', () => {
  const jsx = read('components/my-coach-catalog.jsx')
  const existing = read('components/ideas-discovery.tsx')
  assert.match(jsx, /data-my-coach-tao-advice/)
  assert.match(jsx, /function TaoSageIcon\(\)/)
  assert.match(jsx, /<IdeasDiscovery locale=\{lang\} variant="holistic-dao"/)
  assert.match(existing, /Mode = "dao"/)
  for (const title of ['Ask the Taoist sage','Вопрос даосскому мудрецу','Pregunta al sabio taoísta'])
    assert.ok(jsx.includes(title), title)
})
