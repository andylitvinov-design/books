import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'

const extract = (source, pattern, label) => {
  const match = source.match(pattern)
  assert.ok(match, 'Missing actual ' + label)
  return match[1]
}

// Evaluate only the named source expressions with synthetic functions/data.
// The real React modules, APIs, persistence and browser are never imported.
export function assertReviewSessionGuard(source) {
  const callbacks = [...source.matchAll(/onSession=\{(body=>[^}\n]+)\}/g)]
  assert.equal(callbacks.length, 3, 'all three lesson presenters keep the guarded callback')
  for (const [, expression] of callbacks) for (const reviewLesson of [null, { day: 1 }]) {
    const calls = [], body = { operationId: 'synthetic-operation', day: 1 }
    const callback = runInNewContext('(' + expression + ')', {
      reviewLesson, submit: (...args) => { calls.push(args); return 'saved-receipt' },
    })
    assert.equal(callback(body), reviewLesson ? null : 'saved-receipt')
    assert.deepEqual(calls, reviewLesson ? [] : [['session', body, undefined, 'inline']])
  }
}

export function assertReviewPreferenceGuard(source) {
  const expression = extract(source, /onPreferences=\{(patch=>[\s\S]*?\n    \}\))\}/, 'preference callback')
  for (const reviewLesson of [null, { day: 1 }]) {
    const calls = [], cycle = { revision: 7, preferences: { length: 'standard', imagery: 'optional', checkinFrequency: 'weekly' } }
    const callback = runInNewContext('(' + expression + ')', {
      reviewLesson, cycle, submit: (...args) => { calls.push(args); return 'saved-preferences' },
    })
    assert.equal(callback({ length: 'quick', imagery: 'no_imagery' }), reviewLesson ? null : 'saved-preferences')
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), reviewLesson ? [] : [['preferences', {
      expectedRevision: 7, length: 'quick', imagery: 'no_imagery', checkinFrequency: 'weekly',
    }]])
  }
}

export function assertCourseContinuationModes(source) {
  const block = extract(source, /(const oporaStarter=\[[\s\S]*?router\.push\(root \+ '\/runs\/'[^\n]+\))/, 'course continuation mode and destination')
  const starter = ['hh-weekly-pulse', 'gad-7', 'hh-resource-pulse']
  for (const [keys, nextKey, mode] of [
    ...starter.map(key => [starter, key, 'quick']),
    [starter, 'other-screen', 'guided'],
    [['hh-weekly-pulse', 'gad-7'], 'gad-7', 'guided'],
    [['other-screen'], 'other-screen', 'guided'],
  ]) {
    const paths = []
    runInNewContext(block, { courseState: { course: { testKeys: keys } }, nextKey,
      root: '/ru/app', nextRun: { id: 'synthetic/run' }, courseQuery: '&courseId=course-a',
      router: { push: path => paths.push(path) } })
    assert.deepEqual(paths, ['/ru/app/runs/synthetic%2Frun?mode=' + mode + '&course=1&courseId=course-a'])
  }
}

export function assertSavedSlideStart(source) {
  const expression = extract(source, /const \[index, setIndex\] = useState\(([^\n]+)\)/, 'ordinary slide initial index')
  for (const reviewOnly of [false, true]) for (const alreadyDone of [false, true]) {
    assert.equal(runInNewContext(expression, { reviewOnly, alreadyDone, slides: Array(7) }),
      reviewOnly ? 0 : alreadyDone ? 7 : 0)
  }
}

export function assertOporaFlowNavigation(source) {
  const build = extract(source, /(const flowScenes=\[[\s\S]*?\n  const \[step,setStep\])/, 'complete OPORA flow')
    .replace(/\n  const \[step,setStep\]$/, '')
  for (const day of [1, 14]) for (const showIntegratedJourney of [false, true]) {
    const flow = Array.from(runInNewContext(build + ';flowScenes', {
      displayScenes: ['arrival', 'support'], OPORA_GENTLE_RECAP: ['recapPractice', 'recapFeedback'],
      cycle: { day }, showIntegratedJourney,
    }))
    assert.deepEqual(flow, ['arrival', 'support', ...(day === 14 && !showIntegratedJourney ? ['closingMeditation'] : []), 'recapFeedback'])
  }
  const initial = extract(source, /const \[step,setStep\]=useState\(([^\n]+)\)/, 'OPORA initial index')
  for (const reviewOnly of [false, true]) for (const hasSaved of [false, true]) {
    assert.equal(runInNewContext(initial, { reviewOnly, hasSaved, flowScenes: Array(9), displayScenes: Array(5) }),
      reviewOnly ? 0 : hasSaved ? 9 : 0)
  }
  const receiptBack = extract(source, /onClick=\{(moment==='habit'[\s\S]*?)\}>/, 'saved receipt Back')
  const events = []
  runInNewContext('(' + receiptBack + ')', { moment: 'receipt', habitSetup: false, inPreview: false,
    flowScenes: Array(9), displayScenes: Array(5), setStep: step => events.push(step),
    setHabitSetup: () => assert.fail('unexpected habit navigation'), backFromPreview: () => assert.fail('unexpected preview navigation') })()
  assert.deepEqual(events, [8], 'Back reopens the final complete-flow screen, not an earlier teaching screen')
}

export async function assertCheckinReviewGuard(source) {
  const fn = extract(source, /(async function saveCheckin\(\) \{[\s\S]*?\n  \})/, 'check-in save function')
  for (const sample of [
    { reviewOnly: true, severity: 4, today: { severity: 2 }, writes: 0 },
    { reviewOnly: false, severity: null, today: null, writes: 0 },
    { reviewOnly: false, severity: 2, today: { severity: 2 }, writes: 0 },
    { reviewOnly: false, severity: 4, today: { severity: 2, revision: 7 }, writes: 1 },
  ]) {
    const calls = [], next = [], errors = [], submitting = { current: false }, checkinOp = { current: null }
    const callback = runInNewContext('(' + fn + ')', { ...sample, submitting, checkinOp,
      goNext: () => next.push(true), setSaving: () => {}, setError: error => errors.push(error),
      crypto: { randomUUID: () => 'synthetic-operation' }, words: { saveError: 'failed' },
      onCheckin: async body => { calls.push(body); return { saved: true } },
    })
    await callback()
    assert.equal(calls.length, sample.writes)
    assert.equal(next.length, 1)
    assert.equal(submitting.current, false)
    assert.ok(!errors.includes('failed'))
    if (sample.writes) assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
      severity: 4, interference: null, resource: null, note: '', operationId: 'synthetic-operation', expectedRevision: 7,
    })
  }
}

export function assertBaselineSelection(source, { getCourseProgram, withAntistressRequiredBaseline }) {
  const block = extract(source, /(const starter=programme\?\.id==='stress'[\s\S]*?setChosenTests\([^\n]+\))/, 'baseline proposal initializer')
  const starter = getCourseProgram('stress').starterKeys
  const ranked = [...starter, 'optional-screen'].map(key => ({ key }))
  for (const [confirmedKeys, preferred, preset, expected] of [
    [[], [], null, starter],
    [['optional-screen'], [], null, [...starter, 'optional-screen']],
    [['hh-weekly-pulse', 'optional-screen'], [], null, ['hh-weekly-pulse', 'optional-screen']],
    [['gad-7', 'optional-screen'], [], null, ['hh-weekly-pulse', 'gad-7', 'optional-screen']],
    [[], ['optional-screen'], null, [...starter, 'optional-screen']],
    [[], [], { testKeys: ['fixed-screen'] }, ['fixed-screen']],
  ]) {
    const selections = []
    runInNewContext(block, { programme: { id: 'stress' }, ranked, confirmedKeys, preferred, preset,
      getCourseProgram, withAntistressRequiredBaseline, setChosenTests: keys => selections.push(Array.from(keys)) })
    assert.deepEqual(selections, [Array.from(expected)])
  }
}
