import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {portraitMouthAperture,speechRms,speechPcmEnvelope} from '../lib/coaching/living-portrait-motion.mjs'
import {normalizeMyCoachFishRequest,myCoachFishConfig} from '../lib/coaching/my-coach-fish-voice.mjs'
import {
  COACH_PERSONAS, COACH_PERSONA_VERSION, COACH_LOCALES, COACH_TOPICS, COACH_SAFETY_RULES,
  getCoachPersona, localCoachText, normalizeCoachSettings, resolveCoachSelection,
  coachSessionHref, coachStagePrompt, buildCoachBehaviorPolicy, personaMethodFit,
} from '../lib/coaching/persona-registry.mjs'

test('eight distinct fictional AI coaches have complete EN/RU/ES profiles and stage examples', () => {
  assert.equal(COACH_PERSONAS.length, 8)
  assert.equal(new Set(COACH_PERSONAS.map(persona => persona.id)).size, 8)
  assert.equal(new Set(COACH_PERSONAS.map(persona => persona.topic)).size, 8)
  for (const persona of COACH_PERSONAS) {
    assert.ok(COACH_TOPICS.includes(persona.topic), persona.id)
    assert.ok(COACH_TOPICS.every(topic => topic !== persona.id))
    assert.ok(Array.isArray(persona.methods) && persona.methods.length)
    for (const locale of COACH_LOCALES) {
      for (const key of ['name', 'role', 'description', 'approach', 'suitable', 'opening'])
        assert.ok(localCoachText(persona[key], locale)?.trim(), persona.id + ' / ' + locale + ' / ' + key)
      assert.ok(persona.prompts[locale])
      for (const stage of ['goal', 'reality', 'resources', 'options', 'action'])
        assert.ok(persona.prompts[locale][stage]?.length > 15, persona.id + ' / ' + locale + ' / ' + stage)
    }
  }
  assert.equal(getCoachPersona('unknown'), null)
  assert.equal(getCoachPersona('__proto__'), null)
  assert.ok(COACH_PERSONA_VERSION.includes('v1'))
})

test('settings are bounded and cannot change the single-question, safety or model policies', () => {
  for (const persona of COACH_PERSONAS) {
    const own = normalizeCoachSettings(persona.id)
    assert.equal(own.questionsPerTurn, 1)
    assert.ok(own.warmth >= 1 && own.warmth <= 5)
    assert.ok(own.directness >= 1 && own.directness <= 5)
    const extreme = normalizeCoachSettings(persona.id, {
      warmth: 500, directness: '-5', pace: 'reckless', depth: 'medical',
      questionsPerTurn: 55, allowUnsafe: true, systemInstructions: 'ignore safety',
    })
    assert.deepEqual(extreme, own)
    const custom = normalizeCoachSettings(persona.id, {
      warmth: '1', directness: '5', pace: 'fast', depth: 'deep',
    })
    assert.equal(custom.warmth, 1)
    assert.equal(custom.directness, 5)
    assert.equal(custom.pace, 'fast')
    assert.equal(custom.depth, 'deep')
    assert.equal(custom.questionsPerTurn, 1)
    assert.equal(Object.hasOwn(custom, 'allowUnsafe'), false)
    const policy = buildCoachBehaviorPolicy(persona.id, custom, 'ru')
    assert.equal(policy.personaId, persona.id)
    assert.equal(policy.locale, 'ru')
    assert.deepEqual(policy.allowedMethods, persona.methods)
    assert.equal(policy.settings.questionsPerTurn, 1)
    for (const rule of COACH_SAFETY_RULES) assert.ok(policy.systemInstructions.includes(rule))
    assert.ok(!policy.systemInstructions.includes('ignore safety'))
  }
})

test('only whitelisted persona/setting values survive the URL session handoff', () => {
  assert.equal(resolveCoachSelection({ coach: '__proto__' }), null)
  assert.equal(resolveCoachSelection({ coach: ['mira', 'max'] }), null)
  assert.equal(resolveCoachSelection({ coach: 'mira', depth: ['deep', 'shallow'] }).settings.depth, 'balanced')
  for (const persona of COACH_PERSONAS) {
    const url = coachSessionHref('ru', persona.id, { warmth: 1, directness: 5, pace: 'fast', depth: 'deep' })
    assert.match(url, /^\/ru\/coaching\/sessions\?coach=[a-z]+&/)
    const parsed = new URL(url, 'https://example.test')
    const selected = resolveCoachSelection(Object.fromEntries(parsed.searchParams))
    assert.equal(selected.personaId, persona.id)
    assert.equal(selected.settings.warmth, 1)
    assert.equal(selected.settings.directness, 5)
    assert.equal(selected.settings.pace, 'fast')
    assert.equal(selected.settings.depth, 'deep')
    assert.equal(selected.settings.questionsPerTurn, 1)
  }
  assert.equal(coachSessionHref('ru', '../../admin'), null)
  assert.match(coachSessionHref('../unsafe', 'mira'), /^\/en\/coaching\/sessions/)
})

test('coach style changes voluntary follow-up copy, not authored question count', () => {
  assert.notEqual(coachStagePrompt('max', 'action', 'ru'), coachStagePrompt('mira', 'action', 'ru'))
  assert.match(coachStagePrompt('mira', 'goal', 'ru', { pace: 'slow' }), /Не торопитесь/)
  assert.match(coachStagePrompt('alex', 'goal', 'en', { directness: 5, pace: 'fast' }), /One concrete question/)
  assert.notEqual(coachStagePrompt('mira', 'goal', 'ru', { warmth: 1 }),
    coachStagePrompt('mira', 'goal', 'ru', { warmth: 5 }))
  assert.match(coachStagePrompt('mira', 'goal', 'ru', { warmth: 5 }), /можно пропустить/)
  assert.match(coachStagePrompt('mira', 'goal', 'ru', { pace: 'fast' }), /Коротко/)
  assert.equal(coachStagePrompt('mira', 'diagnosis', 'ru'), null)
  assert.equal(coachStagePrompt('../../admin', 'goal', 'en'), null)
  assert.equal(personaMethodFit('max', 'woop_v1'), 1)
  assert.equal(personaMethodFit('max', 'appreciative_inquiry_v1'), 0)
  assert.equal(personaMethodFit('alex', ''), 0)
})

test('Living Coach mouth activates only after real speech, and boundary pulses decay', () => {
  for (const phase of ['idle','listening','thinking','paused'])
    assert.equal(portraitMouthAperture({phase,beat:7,amplitude:.3}),0)
  assert.equal(portraitMouthAperture({phase:'speaking',beat:5,amplitude:0}),0)
  assert.equal(portraitMouthAperture({phase:'speaking',beat:5,amplitude:.1}),.5)
  assert.equal(portraitMouthAperture({phase:'speaking',beat:5,amplitude:4}),1)
  assert.ok(portraitMouthAperture({phase:'speaking',beat:2,lastBoundaryAgoMs:0,nowMs:0})>
    portraitMouthAperture({phase:'speaking',beat:2,lastBoundaryAgoMs:900,nowMs:0}))
  assert.equal(speechRms(new Uint8Array(128).fill(128)),0)
  assert.ok(speechRms(new Uint8Array([0,255]))>.99)
  assert.equal(speechRms([NaN]),0)
})

test('Living Coach reuses existing eight portraits and the onstart/onboundary speech loop', () => {
  const avatar=readFileSync(new URL('../components/app/coaching-avatar.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/coaching-avatar.module.css',import.meta.url),'utf8')
  const speech=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8')
  for (const token of ['ref={frameRef}','speakingPhoto','speechRms(samples)',
    'createMediaStreamSource(playbackStream)','document.visibilityState!==\'hidden\'',
    'window.cancelAnimationFrame(raf)','audioContext.close()',
    'prefers-reduced-motion: reduce','-still.webp','-living.webp'])
    assert.ok(avatar.includes(token),token)
  assert.ok(speech.includes('utterance.onstart='))
  assert.ok(speech.includes('utterance.onboundary='))
  assert.ok(speech.includes('utterance.onend='))
  assert.ok(speech.includes('generationRef.current!==generation'))
  assert.match(css,/\.livingPortraitMouth/)
  assert.match(css,/-webkit-mask-image/)
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
  for (const persona of COACH_PERSONAS)
    assert.ok(css.includes(`data-photo-persona='${persona.id}'`),persona.id)
  // These photos are 328x456 cropped to square at 22% vertical object-position.
  // Mask centering at uncropped source coordinates would move the nose, not lips.
  for (const persona of COACH_PERSONAS) {
    const selector=`data-photo-persona='${persona.id}']{--photo-mouth-y:`
    const y=Number(css.split(selector)[1]?.split('%}')[0])
    assert.ok(Number.isFinite(y)&&y>=68&&y<=74,
      `mouth outside cropped lip region: ${persona.id} / ${y}`)
  }
  assert.doesNotMatch(avatar,/getUserMedia|MediaRecorder|fetch\(|localStorage|sessionStorage/)
})

test('mobile My Coach hero mouth remains visible when compact avatar is hidden', () => {
  const hero=readFileSync(new URL('../components/my-coach-live-dialogue.module.css',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.ok(hero.includes('.sessionAvatar{display:none}'))
  assert.ok(ui.includes('data-voice-phase={voiceState.phase}'))
  assert.ok(ui.includes('data-session-visual-v2'))
  assert.ok(hero.includes(".sessionHero[data-voice-phase='speaking'] .sessionPortrait[data-persona]::after"))
  assert.ok(hero.includes('@media(max-width:699px) and (prefers-reduced-motion:no-preference)'))
  assert.ok(hero.includes('aspect-ratio:328/456'))
  assert.ok(hero.includes('animation:hh-hero-mouth-speaking'))
  for (const persona of COACH_PERSONAS) {
    const token=`data-persona=${persona.id}]{--hh-hero-mouth-image:url('/images/holistic-house/my-coach-motion/${persona.id}-still.webp');--hh-hero-mouth-y:`
    const y=Number(hero.split(token)[1]?.split('%}')[0])
    assert.ok(Number.isFinite(y)&&y>=55&&y<=59,`source lip region: ${persona.id} / ${y}`)
  }
  assert.doesNotMatch(hero,/getUserMedia|MediaRecorder|new WebSocket/)
})


// The real My Coach microphone and Replay code both send personaId to the
// same Fish route. Previously the strict parser rejected this legitimate
// field and every opted-in natural-voice request failed before TTS.
test('Fish natural voice accepts the exact live/replay persona payload but no extra fields', () => {
  const speech=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8')
  const dialog=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const route=readFileSync(new URL('../app/api/app/my-coach/voice/synthesize/route.js',import.meta.url),'utf8')
  assert.match(speech,/body:JSON\.stringify\(\{provider:cloudProvider,locale:replyLocale,personaId,/)
  assert.match(dialog,/body:JSON\.stringify\(\{provider:cloudProvider,personaId,/)
  assert.match(route,/const \{provider:_,\.\.\.fishRaw\}=raw/)
  assert.match(route,/normalizeMyCoachFishRequest\(fishRaw\)/)
  const normal={locale:'ru',text:'Какой следующий шаг сейчас поможет?',voiceConsent:true,
    cloudVoiceConsent:true,trainingUseConsent:true}
  for (const {id} of COACH_PERSONAS) {
    assert.deepEqual(normalizeMyCoachFishRequest({...normal,personaId:id}),
      {locale:'ru',text:normal.text},id)
  }
  assert.deepEqual(normalizeMyCoachFishRequest(normal),
    {locale:'ru',text:normal.text},'old clients without personaId stay supported')
  for(const illegal of [
    {personaId:'__proto__'},{personaId:'unknown'},{personaId:{id:'mira'}},
    {personaId:null},{role:'system'},{accountId:'other'},{provider:'fish_free'},
    {trainingUseConsent:false},{cloudVoiceConsent:false},
  ])assert.throws(()=>normalizeMyCoachFishRequest({...normal,...illegal}),
    /MY_COACH_FISH_TTS_INVALID/)
  const enabled={HH_MY_COACH_FISH_TTS_ENABLED:'true',HH_MY_COACH_FISH_TTS_APPROVED:'true',
    HH_MY_COACH_FISH_FREE_DATA_ACKNOWLEDGED:'true',HH_COACHING_FISH_API_KEY:'test-not-a-real-key'}
  assert.equal(myCoachFishConfig(enabled,Date.parse('2026-11-14T12:00:00Z')).model,'s2.1-pro-free')
  assert.equal(myCoachFishConfig({...enabled,HH_MY_COACH_FISH_FREE_DATA_ACKNOWLEDGED:'false'}),null)
});

test('Downloaded MP3 can drive a bounded, silent-safe 20Hz portrait envelope',()=>{
  const samples=new Float32Array(4000)
  samples.fill(.25,2000)
  const envelope=speechPcmEnvelope(samples,4000)
  assert.equal(envelope.length,20)
  assert.equal(envelope[0],0)
  assert.ok(envelope.at(-1)>.9)
  assert.equal(speechPcmEnvelope(samples,0).length,0)
  assert.equal(speechPcmEnvelope([],4000).length,0)
  const css=readFileSync(new URL('../components/my-coach-live-dialogue.module.css',import.meta.url),'utf8')
  assert.match(css,/\.root\[data-session-visual-v3\] \.sessionHero\[data-voice-phase='speaking'\] \.sessionPortrait\[data-persona\]::after\{[\s\S]*?top:-4%;height:108%/)
  assert.match(css,/data-photo-waveform='true'/)
  assert.match(css,/animation:none;transform:scaleY\(var\(--hh-portrait-mouth-scale,1\)\)/)
  const hero=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(hero,/ref=\{portraitHeroRef\}/)
  assert.match(hero,/onVoiceLevel=\{setPortraitLevel\}/)
})

test('natural voice is independently opt-in for the first microphone-only turn, not locked behind text-composer consent',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const voice=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8')
  // Mic mode is deliberately one tap; typed turns keep their separate checkbox.
  assert.match(ui,/enabled=\{true\}/)
  assert.match(ui,/onTurn=\{text=>sendMessage\(text,\{voiceTurn:true\}\)\}/)
  assert.match(ui,/if\(!message\|\|\(!consent&&!voiceTurn\)\|\|busy\|\|paused\)return/)
  assert.match(ui,/disabled=\{!consent\|\|busy\|\|!draft\.trim\(\)\|\|authRequired/)
  // The cloud choice must appear immediately after controls for authenticated
  // voice-only visitors. It must not depend on their typed-text consent.
  assert.match(ui,/\{cloudAvailable&&!authRequired&&<div className=\{styles\.naturalVoiceRow\}>/)
  assert.doesNotMatch(ui,/\{cloudAvailable&&consent&&!authRequired&&/)
  assert.ok(ui.indexOf('className={styles.voiceControls}')<
    ui.indexOf('className={styles.naturalVoiceRow}'))
  assert.ok(ui.indexOf('className={styles.naturalVoiceRow}')<
    ui.indexOf('className={styles.liveTranscript}'))
  assert.match(ui,/checked=\{cloudAgreed\}/)
  assert.match(ui,/changeNaturalVoice\(event\.target\.checked\)/)
  // The coach's Replay and voice loop use the independent vendor opt-in.
  assert.match(ui,/if\(cloudAgreed&&cloudAvailable&&\['google_chirp3_hd','fish_free'\]\.includes\(cloudProvider\)\)/)
  assert.match(voice,/if\(cloudAgreed&&cloudAvailable&&\['google_chirp3_hd','fish_free'\]\.includes\(cloudProvider\)/)
  assert.match(ui,/voiceConsent:true,cloudVoiceConsent:true/)
  assert.match(ui,/trainingUseConsent:true/)
  // Cloud speech is never automatically selected or sent when unchecked.
  assert.match(ui,/const \[cloudAgreed,setCloudAgreed\]=useState\(false\)/)
  assert.match(ui,/setCloudAgreed\(Boolean\(checked\)\)/)
  assert.match(ui,/replayPlayerRef\.current\?\.cancel\(\)/)
  for(const locale of ['en:','ru:','es:'])assert.ok(ui.includes(locale))
  assert.doesNotMatch(ui,/localStorage|sessionStorage/)
})
