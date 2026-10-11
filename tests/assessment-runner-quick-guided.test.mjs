import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { createAssessmentRun, saveRunAnswers, submitRun } from '../lib/assessments/run-lifecycle.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Quick form displays every question on one scrollable page in account and guest flows', () => {
  const account = read('components/app/app-workspace.jsx')
  const guest = read('components/app/cabinet-landing.jsx')
  for (const ui of [account, guest]) {
    assert.match(ui, /mode === 'quick' \? \(/)
    assert.match(ui, /questions\.map\(\(item, step\) => \(/)
    assert.match(ui, /allAnswered/)
    assert.match(ui, /quickMinutes/)
    assert.match(ui, /guidedMinutes/)
  }
  assert.match(account, /className="hh-quick-question"/)
  assert.match(guest, /className="cabinet-quick-question"/)
  assert.match(account, /<RunnerAnswerChoices/)
  assert.match(guest, /<GuestAnswerChoices/)
})

test('Guided mode presents one compact question with an explicit next action', () => {
  const account = read('components/app/app-workspace.jsx')
  const guest = read('components/app/cabinet-landing.jsx')
  assert.match(account, /mode === 'quick' \? \([\s\S]*?\) : question \? \(/)
  assert.match(account, /mode === 'guided'[\s\S]*?onClick=\{next\}/)
  assert.match(guest, /\) : \(\s*<div className="cabinet-guided-question">/)
  assert.match(guest, /mode === 'guided'[\s\S]*?onClick=\{next\}/)
})

test('out-of-order Quick answers are durable, resumable, revisable and score identically', () => {
  const def = getAssessmentDefinition('hh-current-state', 'v1', 'en')
  const now = '2026-10-11T12:00:00.000Z'
  let run = createAssessmentRun({
    id: randomUUID(), accountId: randomUUID(), definition: def, now,
  })
  const firstMissing = (answers) => {
    const first = def.questions.findIndex(question => !Object.prototype.hasOwnProperty.call(answers, question.id))
    return first < 0 ? def.questions.length : first
  }
  const order = def.questions.map((_, index) => index).reverse()
  for (const index of order) {
    const answer = { [def.questions[index].id]: (index + 3) % 11 }
    const nextAnswers = { ...run.answers, ...answer }
    run = saveRunAnswers(run, answer, {
      expectedRevision: run.revision,
      progress: firstMissing(nextAnswers),
      now,
    })
    assert.equal(run.progress, firstMissing(run.answers))
    assert.equal(Object.keys(run.answers).length, def.questions.length - index)
  }
  const firstId = def.questions[0].id
  run = saveRunAnswers(run, { [firstId]: 8 }, {
    expectedRevision: run.revision,
    progress: def.questions.length, now,
  })
  assert.equal(run.answers[firstId], 8)
  assert.equal(Object.keys(run.answers).length, def.questions.length)
  assert.equal(submitRun(run, { expectedRevision: run.revision, now }).status, 'submitted')
})
