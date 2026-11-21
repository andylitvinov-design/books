import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

test('approved context reaches one provider and an interrupted voice lookup sends nothing', () => {
  const service = new URL('../lib/app/coaching-brain.js', import.meta.url)
  const snapshot = new URL('../lib/app/coach-context-snapshot.js', import.meta.url)
  const output = execFileSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import { myCoachGenerativeTurn, myCoachGenerativeStreamTurn } from ${JSON.stringify(service.href)}
    import { createCoachContextLoader } from ${JSON.stringify(snapshot.href)}
    const calls = []
    const lookups = []
    const body = {
      personaId: 'mira', locale: 'en', consent: true, turns: [],
      message: 'I want to organize my work week and make time for breaks.',
    }
    const options = {
      env: {
        HH_COACHING_BRAIN_ENABLED: 'true', HH_COACHING_GROQ_ENABLED: 'true',
        HH_COACHING_GROQ_ZDR_CONFIRMED: 'true', HH_COACHING_GROQ_FREE_TIER_CONFIRMED: 'true',
        HH_FIRST_VIDEO_GROQ_API_KEY: 'gsk_' + 'x'.repeat(48),
        HH_AGENT_OPENROUTER_ENABLED: 'true',
        HH_AGENT_OPENROUTER_API_KEY: 'sk-or-v1-' + 'x'.repeat(48),
      },
      async loadApprovedContext(provider) {
        lookups.push(provider)
        return { version: 2, purpose: 'coaching_dialogue', items: [
          { kind: 'goals', sourceKind: 'saved_life_plan', text: 'Plan Friday in advance' },
        ] }
      },
      async fetcher(url, options) {
        calls.push({ url, messages: options?.body ? JSON.parse(options.body).messages : null })
        return new Response(null, { status: 503 })
      },
    }
    await myCoachGenerativeTurn(body, options)
    const contextRun = { calls: calls.splice(0), lookups: lookups.splice(0) }
    await myCoachGenerativeTurn(body, { ...options, async loadApprovedContext(provider) {
      lookups.push(provider)
    } })
    const controlLookups = lookups.splice(0)
    calls.splice(0)
    const pausedLoader = createCoachContextLoader(null, { id: 'synthetic' }, body, {
      HH_COACH_CONTEXT_ENABLED: 'true',
    })
    await myCoachGenerativeTurn(body, { ...options, loadApprovedContext: pausedLoader })
    const pausedCalls = calls.splice(0)
    const pausedLookups = lookups.splice(0)
    const pausedVoiceBody = { ...body, voiceTurn: true }
    const pausedVoice = await myCoachGenerativeStreamTurn(pausedVoiceBody, {
      ...options, loadApprovedContext: createCoachContextLoader(null, { id: 'synthetic' }, pausedVoiceBody, {
        HH_COACH_CONTEXT_ENABLED: 'true',
      }),
    })
    const pausedVoiceResponse = await new Response(pausedVoice).text()
    const pausedVoiceCalls = calls.splice(0)
    const focusChanges = []
    for (const [locale, message] of [
      ['en', "Let's change the topic. I want to talk about sleep."],
      ['en', 'You misunderstood. I meant something else.'],
      ['ru', 'Давайте сменим тему. Хочу поговорить о сне.'],
      ['ru', 'Вы меня не поняли. Я имела в виду другое.'],
      ['es', 'Cambiemos de tema. Quiero hablar del sueño.'],
      ['es', 'No me entendiste. Me refiero a otra cosa.'],
    ]) {
      await myCoachGenerativeTurn({ ...body, locale, message, contextTopic: 'career_business' }, options)
      focusChanges.push({ message, calls: calls.splice(0), lookups: lookups.splice(0) })
    }
    const controller = new AbortController()
    const voice = await myCoachGenerativeStreamTurn({ ...body, voiceTurn: true }, {
      ...options, signal: controller.signal,
      async loadApprovedContext(provider) {
        const snapshot = await options.loadApprovedContext(provider)
        controller.abort()
        return snapshot
      },
    })
    await new Response(voice).text()
    const interruptedCalls = calls.splice(0)
    const interruptedLookups = lookups.splice(0)
    const dispatchedVoice = await myCoachGenerativeStreamTurn({ ...body, voiceTurn: true }, options)
    const voiceResponse = await new Response(dispatchedVoice).text()
    console.log(JSON.stringify({ ...contextRun, controlLookups, pausedCalls, pausedLookups, pausedVoiceCalls, pausedVoiceResponse, focusChanges,
      interruptedCalls: interruptedCalls.length, interruptedLookups,
      voiceCalls: calls, voiceLookups: lookups, voiceResponse }))
  `], { encoding: 'utf8' })
  const { calls, lookups, controlLookups, pausedCalls, pausedLookups, pausedVoiceCalls, pausedVoiceResponse, focusChanges,
    interruptedCalls, interruptedLookups, voiceCalls, voiceLookups, voiceResponse } = JSON.parse(output)
  assert.deepEqual(controlLookups, ['groq', 'openrouter'])
  assert.deepEqual(pausedLookups, [])
  for (const requests of [pausedCalls, pausedVoiceCalls]) {
    assert.ok(requests.some(call => call.messages?.at(-1)?.content.includes('organize my work week')))
    assert.ok(requests.every(call => !call.messages?.some(message => message.content.includes('Plan Friday in advance'))))
  }
  for (const change of focusChanges) {
    assert.deepEqual(change.lookups, [])
    assert.ok(change.calls.some(call => call.messages?.at(-1)?.content.includes(change.message)))
    assert.ok(change.calls.every(call => !call.messages?.some(message => message.content.includes('Plan Friday in advance'))))
  }
  assert.match(pausedVoiceResponse, /"type":"result"/)
  assert.deepEqual(lookups, ['groq'])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].messages.filter(message => message.content.includes('Plan Friday in advance')).length, 1)
  assert.match(calls[0].messages.at(-1).content, /organize my work week/)
  assert.deepEqual(interruptedLookups, ['groq'])
  assert.equal(interruptedCalls, 0)
  assert.deepEqual(voiceLookups, ['groq'])
  assert.equal(voiceCalls.length, 1)
  assert.equal(voiceCalls[0].messages.filter(message => message.content.includes('Plan Friday in advance')).length, 1)
  assert.match(voiceResponse, /"type":"result"/)
})
