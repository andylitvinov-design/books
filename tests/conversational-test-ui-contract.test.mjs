import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('same protected messenger thread, no second assessment/scoring engine', () => {
  const chat=read('components/holistic-agent-chat.tsx')
  const journey=read('components/app/messenger-test-journey.jsx')
  assert.match(chat,/testOfferFromText\(text\)/)
  assert.match(chat,/incomingTurn=\{testChatTurn\}/)
  assert.match(chat,/No test response is forwarded to the agent model/)
  assert.match(journey,/request\('guest\/bootstrap'\)/)
  assert.match(journey,/request\('guest\/runs\/' \+ run\.id \+ '\/save'/)
  assert.match(journey,/expectedRevision/)
  assert.match(journey,/data-hh-test-block="test_result"/)
  assert.match(journey,/buildAssessmentResultReport\(/)
  assert.match(journey,/buildMotivatorMessage\(/)
  assert.doesNotMatch(journey,/localStorage\.(?:setItem|getItem)/)
})

test('both catalog experiences gate direct chat entry on rights and guest eligibility', () => {
  for (const file of ['components/app/simple-test-picker.jsx','components/app/test-explorer.jsx']) {
    const source=read(file)
    assert.match(source,/entry\.guestEligible === true/)
    assert.match(source,/entry\.rightsStatus === 'cleared'/)
    assert.match(source,/app\/messages\?section=ai&chatTest=/)
  }
})

test('sensitive answers never enter general model context from the test input', () => {
  const source=read('components/holistic-agent-chat.tsx')
  assert.match(source,/never duplicate answers in the AI assistant history array/)
  assert.match(source,/Never record a sensitive test utterance in general agent history/)
})
