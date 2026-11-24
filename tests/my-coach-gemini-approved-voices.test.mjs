import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  APPROVED_GEMINI_VOICES,
  approvedGeminiVoice,
  allowedGeminiCoachVoice,
  coachGeminiVoiceOptions,
} from '../lib/coaching/gemini-voice-catalog.mjs'

const expected = {
  mira: ['Erinome','Gacrux'],
  max: ['Orus','Orus'],
  sofia: ['Vindemiatrix','Sulafat'],
  alex: ['Alnilam','Charon'],
  merlin: ['Sadaltager','Algenib'],
  harry: ['Achird','Achird'],
  genie: ['Puck','Orus'],
  meditations: ['Algieba','Algieba'],
}

test('all eight owner-approved Gemini voice profiles have exact RU/EN identities',()=>{
  assert.deepEqual(Object.keys(APPROVED_GEMINI_VOICES).sort(),Object.keys(expected).sort())
  for(const [id,[ru,en]] of Object.entries(expected)){
    assert.equal(approvedGeminiVoice(id,'ru'),ru)
    assert.equal(approvedGeminiVoice(id,'en'),en)
    assert.equal(approvedGeminiVoice(id,'es'),null)
    if(id==='meditations')continue
    assert.equal(allowedGeminiCoachVoice(id,ru),true)
    assert.equal(allowedGeminiCoachVoice(id,en),true)
    assert.ok(coachGeminiVoiceOptions(id).includes(ru))
    assert.ok(coachGeminiVoiceOptions(id).includes(en))
  }
})

test('unapproved personas and locales never receive a made-up fallback voice',()=>{
  for(const id of ['unknown', '', null]){
    assert.equal(approvedGeminiVoice(id,'ru'),null)
    assert.equal(approvedGeminiVoice(id,'en'),null)
  }
  assert.equal(approvedGeminiVoice('mira','EN'),null)
  assert.equal(approvedGeminiVoice('mira',undefined),null)
  assert.equal(allowedGeminiCoachVoice('unknown','Erinome'),false)
})

test('the running My Coach session defaults to approved voices with persona-scoped overrides',()=>{
  const source=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(source,/approvedGeminiVoice\(personaId,conversationLang\)/)
  assert.match(source,/voiceSelectionKey=personaId\+':'\+conversationLang/)
  assert.match(source,/geminiVoiceByLocale\[voiceSelectionKey\]/)
  assert.match(source,/\[voiceSelectionKey\]:event\.target\.value/)
  assert.doesNotMatch(source,/\[conversationLang\]:event\.target\.value/)
})
