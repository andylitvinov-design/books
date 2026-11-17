import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('five compact categories are exclusive and expose the approved themes', () => {
  const jsx = source('components/my-coach-catalog.jsx')
  const css = source('components/my-coach-catalog.module.css')
  for (const mode of ['all','ai','human','express','tao']) {
    assert.match(jsx, new RegExp('data-my-coach-mode="' + mode + '"'))
    assert.match(jsx, new RegExp("aria-pressed=\\{directoryMode === '" + mode + "'\\}"))
  }
  for (const title of ['hub.calm','hub.relationships','hub.goals','hub.energy']) {
    assert.ok(jsx.includes(title), title)
  }
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/)
  assert.match(css, /\.topicChips\{display:flex/)
  assert.doesNotMatch(jsx, /className=\{heroStyles\.benefitTiles\}/)
  assert.doesNotMatch(jsx, /className=\{styles\.visualTopics\}/)
  assert.doesNotMatch(jsx, /className=\{styles\.typePills\}/)
})

test('express opens three existing free journeys, not paid consultations', () => {
  const jsx = source('components/my-coach-catalog.jsx')
  for (const target of ['/services/free-situation-review','/services/dao-health-profile','/tests']) {
    assert.ok(jsx.includes("path: '" + target + "'"), target)
  }
  assert.match(jsx, /data-my-coach-free-option=\{entry\.id\}/)
  assert.match(jsx, /hub\.free/)
  assert.match(jsx, /not medical diagnoses/)
})

test('Tao advice reuses existing I Ching question and guidance, not a new API', () => {
  const jsx = source('components/my-coach-catalog.jsx')
  const choices = source('components/holistic-support-choices.tsx')
  assert.match(jsx, /\/holistic-support#dao-guidance/)
  assert.match(jsx, /data-my-coach-tao-open/)
  assert.match(jsx, /☯/)
  assert.match(choices, /window\.location\.hash === "#dao-guidance"/)
  assert.match(choices, /<IdeasDiscovery locale=\{locale\} variant="holistic-dao"/)
  assert.doesNotMatch(jsx, /fetch\(['"]\/api\/(dao|tao)/)
})

test('Mira retains sign-in verification, human coach retains real messenger handoff', () => {
  const jsx = source('components/my-coach-catalog.jsx')
  assert.match(jsx, /persona\.id === 'mira'[\s\S]*?MyCoachExpressStart/)
  assert.match(jsx, /data-my-coach-human-message-menu/)
  assert.match(jsx, /<MandatoryMessengerActions locale=\{lang\}/)
})
