import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TEST_DISCUSSION_INTENT_KEY,
  buildTestResultDiscussion, discussionOffers, discussionTopic,
  classifyTestDiscussionReply,
} from '../lib/assessments/test-result-discussion.mjs'

const verifiedResult = {
  id: 'b82539f0-6e3e-42c4-b823-2510cba55201',
  definitionKey: 'hh-current-state', definitionVersion: 'v2',
  measurementAt: '2026-10-28T18:00:00Z',
}
const section = (key, opts = {}) => ({
  key, domain: 'stress', construct: 'Daily tension', value: 7, min: 0, max: 10,
  summary: 'Your responses describe frequent tension, without establishing a cause.',
  presentationDirection: 'difficulty', bandBasis: 'descriptive',
  recommendedReview: false, ...opts,
})
const report = (sections, extra = {}) => ({
  verified: true, sections, purpose: 'A non-diagnostic check-in', ...extra,
})

test('one verified saved test yields source-linked numeric scales and never a fictional percentile', () => {
  const model = buildTestResultDiscussion(verifiedResult, report([
    section('state.tension'),
    section('resources.rest', { domain: 'resources', construct: 'Rest and recovery', value: 3, presentationDirection: 'resource' }),
  ]), 'en')
  assert.equal(model.verified, true)
  assert.equal(model.scales.length, 2)
  assert.ok(model.scales.some(item => item.label === 'Daily tension' && item.score === '7 (0–10)'))
  assert.ok(model.scales.some(item => item.label === 'Rest and recovery' && item.score === '3 (0–10)'))
  assert.doesNotMatch(JSON.stringify(model.scales), /percentile|diagnosed|% healthy/i)
  assert.match(model.intro, /not a diagnosis/)
})

test('unverified scores, wrong result identity and missing numeric sections are never interpreted', () => {
  for (const [result, assessment] of [
    [verifiedResult, report([section('state.tension')], { verified: false })],
    [{ ...verifiedResult, id: '' }, report([section('state.tension')])],
    [verifiedResult, report([section('state.tension', { value: 90 })])],
    [verifiedResult, report([section('state.tension', { bandBasis: 'unavailable' })])],
  ]) {
    const model = buildTestResultDiscussion(result, assessment, 'ru')
    assert.equal(model.verified, false)
    assert.equal(model.scales.length, 0)
    assert.match(model.intro, /не удалось|отсутствуют/i)
  }
})

test('published professional review goes first, and commercial routing is suppressed', () => {
  const model = buildTestResultDiscussion(verifiedResult, report([
    section('resources.rest', { domain: 'resources', value: 3, presentationDirection: 'resource' }),
    section('symptoms.anxiety', { domain: 'anxiety', construct: 'Anxiety screening', recommendedReview: true,
      bandBasis: 'screening', band: 'Screening threshold (not a diagnosis)', value: 8 }),
  ]), 'ru')
  assert.equal(model.needsCare, true)
  assert.equal(model.scales[0].key, 'symptoms.anxiety')
  assert.equal(discussionOffers({ locale: 'ru', needsCare: model.needsCare }).length, 0)
  assert.match(model.care, /медицинскому специалисту/)
})

test('neutral personality traits are not assigned an arbitrary high/low health norm', () => {
  const model = buildTestResultDiscussion(verifiedResult, report([
    section('traits.openness', { domain: 'personality', construct: 'Openness', value: 8, presentationDirection: 'neutral' }),
  ]), 'en')
  assert.equal(model.scales.length, 1)
  assert.equal(model.scales[0].band, '')
  assert.equal(model.scales[0].topic, 'general')
  assert.doesNotMatch(model.scales[0].summary, /too high|below average/)
})

test('offers respect expressed format preference and point to actual existing site pages', () => {
  const course = discussionOffers({ locale: 'ru', topic: 'stress', preference: 'course' })
  assert.deepEqual(course.map(o => o.id), ['course', 'video', 'tests'])
  assert.equal(course[0].href, '/ru/courses/antistress')
  assert.equal(course[1].href, '/ru/holistic-support/mobile#support-meditation-gallery')
  assert.equal(course[2].href, '/ru/app/tests?explore=1')
  const session = discussionOffers({ locale: 'en', topic: 'relationships', preference: 'session' })
  assert.equal(session[0].href, '/en/services#consultation')
  const spanish = discussionOffers({ locale: 'es', topic: 'meaning', preference: 'video' })
  assert.equal(spanish[0].href, '/es/holistic-support/mobile#support-meditation-gallery')
  assert.ok(session.every(offer => !/pay|checkout|order/.test(offer.href)))
})

test('topics use the source scale identity, not the score arithmetic or invented diagnoses', () => {
  assert.equal(discussionTopic({ key: 'relationships.social_support' }), 'relationships')
  assert.equal(discussionTopic({ domain: 'work' }), 'work')
  assert.equal(discussionTopic({ domain: 'sleep' }), 'energy')
  assert.equal(discussionTopic({ domain: 'attention' }), 'focus')
  assert.equal(discussionTopic({ key: 'arbitrary' }), 'general')
})

test('bounded local text understands only safe format requests and stops on crisis cues', () => {
  assert.equal(classifyTestDiscussionReply('Покажи видео'), 'video')
  assert.equal(classifyTestDiscussionReply('Хочу записаться на консультацию'), 'session')
  assert.equal(classifyTestDiscussionReply('Una práctica breve'), 'course')
  assert.equal(classifyTestDiscussionReply('I want to kill myself'), 'urgent')
  assert.equal(classifyTestDiscussionReply('самоповреждение'), 'urgent')
  assert.equal(classifyTestDiscussionReply('Почему я так чувствую себя?'), null)
  assert.equal(classifyTestDiscussionReply(''), null)
})

test('the same saved result opens from completion, My Tests and guest consent; no second API or scoring engine', () => {
  const workspace = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const battery = readFileSync(new URL('../components/app/account-test-battery.jsx', import.meta.url), 'utf8')
  const finish = readFileSync(new URL('../components/app/test-finish-actions.jsx', import.meta.url), 'utf8')
  const guest = readFileSync(new URL('../components/app/cabinet-landing.jsx', import.meta.url), 'utf8')
  const ui = readFileSync(new URL('../components/app/test-result-discussion.jsx', import.meta.url), 'utf8')
  assert.match(workspace, /onDiscuss=\{!courseMode \? \(\) => finish\('discuss'\)/)
  assert.match(workspace, /<TestResultDiscussion key=\{result.id\}/)
  assert.match(workspace, /savedGuestDiscussionTarget/)
  assert.match(workspace, /sessionStorage\.getItem\(TEST_DISCUSSION_INTENT_KEY\)/)
  assert.match(battery, /data-discuss-saved-test=\{row.result.id\}/)
  assert.match(finish, /data-finish-discuss-test/)
  assert.match(guest, /data-guest-discuss-test/)
  assert.match(guest, /saveToCabinet\(guestResult, true\)/)
  assert.match(ui, /support-reference-avatar.webp/)
  assert.match(ui, /role="log"/)
  assert.match(ui, /data-discussion-offer/)
  assert.doesNotMatch(ui, /fetch\(|appFetch\(|localStorage|sessionStorage|navigator\.sendBeacon/)
  assert.equal(TEST_DISCUSSION_INTENT_KEY, 'hh:discuss-guest-test-intent:v1')
})
