import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { speechResultSegments, appendSpokenAnswer, COACHING_ANSWER_LIMIT } from '../lib/personal-coaching/speech-text.js'
import { coachingLocalVoices, chooseCoachingVoice, coachingSpeechProfile, coachingVoiceSample } from '../lib/personal-coaching/voice-quality.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('voice transcription previews interim words but appends only new final words',()=>{
  const first=speechResultSegments([
    {isFinal:true,0:{transcript:'A clear next step'}},
    {isFinal:false,0:{transcript:'tomorrow morning'}},
  ])
  assert.deepEqual(first,{final:'A clear next step',delta:'A clear next step',interim:'tomorrow morning'})
  assert.equal(speechResultSegments([{isFinal:true,0:{transcript:'A clear next step'}}],first.final).delta,'')
  assert.equal(speechResultSegments([{isFinal:true,0:{transcript:'A clear next step today'}}],first.final).delta,'today')
  assert.equal(speechResultSegments([{isFinal:false,0:{transcript:'draft words'}}],first.final).delta,'')
  assert.equal(speechResultSegments([{isFinal:true,0:{transcript:'Revised earlier phrase'}}],first.final).delta,'')
  assert.deepEqual(speechResultSegments(null),{final:'',delta:'',interim:''})
})

test('microphone final text is safely appended to a private editable answer with server limit',()=>{
  assert.equal(COACHING_ANSWER_LIMIT,800)
  assert.equal(appendSpokenAnswer('',' Spoken answer. '),'Spoken answer.')
  assert.equal(appendSpokenAnswer('Typed answer',' More words'),'Typed answer More words')
  assert.equal(appendSpokenAnswer('Typed answer',''),'Typed answer')
  assert.equal(appendSpokenAnswer('a'.repeat(799),'additional').length,800)
  assert.equal(appendSpokenAnswer('hello','world',5),'hello')
})

test('question audio requires a tap, recognition requires disclosure, and old captures stop on navigation',()=>{
  const voice=source('components/app/coaching-question-voice.jsx')
  assert.match(voice,/SpeechSynthesisUtterance/)
  assert.match(voice,/window\.speechSynthesis\.cancel\(\)/)
  assert.match(voice,/window\.confirm\(t\.notice\)/)
  assert.match(voice,/SpeechRecognition\|\|window\.webkitSpeechRecognition/)
  assert.match(voice,/capture\.interimResults=true/)
  assert.match(voice,/speechResultSegments\(event\.results,emitted\)/)
  assert.match(voice,/if\(recognition\.current!==capture\)return/)
  assert.match(voice,/capture\?\.abort\(\)/)
  assert.match(voice,/document\.addEventListener\('visibilitychange'/)
  assert.match(voice,/onListeningChange/)
  assert.match(voice,/aria-live="polite"/)
  for(const lang of ['en','ru','es'])assert.match(voice,new RegExp(lang+':\\{'))
  assert.doesNotMatch(voice,/MediaRecorder|sendBeacon|localStorage|sessionStorage|audio\.src|fetch\(/)
})


test('coaching narration prefers enhanced local voices and provides calm, optional pacing',()=>{
  const voices=[
    {name:'Plain',lang:'en-US',voiceURI:'basic',localService:true,default:true},
    {name:'Natural Cloud',lang:'en-US',voiceURI:'remote',localService:false},
    {name:'Soft Enhanced',lang:'en-US',voiceURI:'enhanced',localService:true},
    {name:'Spanish Enhanced',lang:'es-ES',voiceURI:'es',localService:true},
  ]
  assert.deepEqual(coachingLocalVoices(voices,'en-US').map(v=>v.voiceURI),['enhanced','basic'])
  assert.equal(chooseCoachingVoice(voices,'en-US')?.voiceURI,'enhanced')
  assert.equal(chooseCoachingVoice(voices,'en-US','basic')?.voiceURI,'basic')
  assert.equal(chooseCoachingVoice(voices,'en-US','remote')?.voiceURI,'enhanced',
    'remote voice is never selected even by an old preference')
  assert.equal(chooseCoachingVoice(voices,'ru-RU'),null)
  assert.equal(chooseCoachingVoice(voices,'es-ES')?.voiceURI,'es')
  assert.ok(coachingSpeechProfile('calm').rate < coachingSpeechProfile('clear').rate)
  assert.ok(coachingSpeechProfile('calm').pitch <= coachingSpeechProfile('clear').pitch)
  assert.ok(coachingSpeechProfile('calm').volume <= 1)
})

test('voice settings are opt-in, localized and do not send client questions to speech vendors',()=>{
  const ui=source('components/app/coaching-question-voice.jsx')
  const css=source('components/app/tradition-coaching.module.css')
  assert.match(ui,/coachingSpeechProfile\(voicePace\)/)
  assert.match(ui,/chooseCoachingVoice\(available.length\?available:voices,spoken,voiceChoice\)/)
  assert.match(ui,/addEventListener\?\.\('voiceschanged',refresh\)/)
  assert.match(ui,/aria-expanded=\{voicePanel\}/)
  assert.match(ui,/voicePreferences\[lang\]/)
  for(const phrase of ['Voice & pace','Голос и темп','Voz y ritmo'])assert.ok(ui.includes(phrase))
  assert.match(css,/\.voiceSettingsPanel\{/)
  assert.match(css,/\.voiceSettingsPanel select:focus-visible/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|\bfetch\(|MediaRecorder|audio\.src|sendBeacon/)
})

test('warm coaching voice avoids robotic iPhone names and stretched default pacing',()=>{
  const choices=[
    {name:'Eloquence English',lang:'en-US',voiceURI:'robot',localService:true,default:true},
    {name:'Samantha',lang:'en-US',voiceURI:'normal',localService:true},
    {name:'Samantha Enhanced',lang:'en-US',voiceURI:'enhanced',localService:true},
    {name:'UK Premium',lang:'en-GB',voiceURI:'premium',localService:true},
    {name:'Natural Remote',lang:'en-US',voiceURI:'cloud',localService:false},
  ]
  assert.deepEqual(coachingLocalVoices(choices,'en-US').map(v=>v.voiceURI),
    ['enhanced','premium','normal','robot'])
  assert.equal(chooseCoachingVoice(choices,'en-US')?.voiceURI,'enhanced')
  assert.equal(chooseCoachingVoice(choices,'en-US','normal')?.voiceURI,'normal')
  assert.equal(chooseCoachingVoice(choices,'en-US','cloud')?.voiceURI,'enhanced')
  const warm=coachingSpeechProfile('calm')
  assert.equal(warm.rate,0.96,'natural-rate default is less robotic than the old 0.84')
  assert.equal(warm.pitch,1,'preserve original voice timbre')
  assert.ok(coachingSpeechProfile('unhurried').rate<warm.rate)
  assert.ok(coachingSpeechProfile('clear').rate>warm.rate)
  for(const [lang,phrase] of [
    ['en','What matters most'],['ru','самое важное'],['es','más importante'],
  ])assert.ok(coachingVoiceSample(lang).includes(phrase))
  for(const lang of ['en','ru','es'])
    assert.ok(!/test score|client name|health/i.test(coachingVoiceSample(lang)))
})

test('voice comparison plays only fixed samples and cancels safely before dictation',()=>{
  const jsx=source('components/app/coaching-question-voice.jsx')
  const css=source('components/app/tradition-coaching.module.css')
  assert.match(jsx,/playSpeech\(coachingVoiceSample\(lang\),true\)/)
  assert.match(jsx,/function stopAudio\(\)/)
  assert.match(jsx,/if\(previewing\)\{stopAudio\(\);return\}/)
  assert.match(jsx,/stopAudio\(\)\s*const Constructor=window\.SpeechRecognition/)
  assert.match(jsx,/aria-pressed=\{previewing\}/)
  assert.ok(jsx.includes("setVoicePace]=useState('calm')"))
  for(const key of ['paceUnhurried','tryVoice','stopSample','previewPlaying'])
    assert.match(jsx,new RegExp(key))
  assert.match(css,/\.voiceSettingsPanel \.voiceSample\{/)
  assert.doesNotMatch(jsx,/fetch\(|localStorage|sessionStorage|audio\.src|MediaRecorder|sendBeacon/)
})

test('personal course offers listen, typed, one-tap and dictated editable choices before protected save',()=>{
  const ui=source('components/app/personal-coaching.jsx')
  const css=source('components/app/personal-coaching.module.css')
  const server=source('lib/app/personal-coaching.js')
  assert.match(ui,/CoachingQuestionVoice/)
  assert.match(ui,/mode="answer"/)
  assert.match(ui,/onTranscript=\{words=>/)
  assert.match(ui,/appendSpokenAnswer\(previous\.startsWith\('choice:'\)\?'':previous,words\)/)
  assert.match(ui,/speechConsent=\{speechConsent\}/)
  assert.match(ui,/onListeningChange=\{setDictating\}/)
  assert.match(ui,/if\(dictating\)\{setError\(t\.stopMic\);return\}/)
  assert.match(ui,/className=\{draft\.trim\(\)===option\?styles\.chosen:undefined\}/)
  assert.match(ui,/aria-pressed=\{draft\.trim\(\)===option\}/)
  const suggestionIndex=ui.indexOf('className={styles.suggestions} role="group"')
  const answerIndex=ui.indexOf('id="hh-personal-coach-answer"')
  assert.ok(suggestionIndex>=0 && answerIndex>=0 && suggestionIndex<answerIndex,
    'Quick response chips must exist before the editable answer textarea')
  assert.match(ui,/command\('answer',\{questionId:question\.id,answer\}\)/)
  assert.match(ui,/if\(!saved\)return/)
  assert.match(server,/seal\(course,sealContext\(actor\),config\)/)
  assert.match(css,/\.questionArea\{min-height:0;flex:1;overflow-y:auto/)
  assert.match(css,/\.sheet\{height:calc\(100dvh - 105px\)/)
  assert.match(css,/safe-area-inset-bottom/)
  assert.match(css,/@media\(max-width:370px\)/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|MediaRecorder|sendBeacon|dangerouslySetInnerHTML/)
})


test('coaching UI scripts are parseable before a production deployment', async()=>{
  const ts=(await import('typescript')).default
  for(const file of [
    'components/app/personal-coaching.jsx',
    'components/app/personal-coaching-picker.jsx',
    'components/app/coaching-question-voice.jsx',
    'components/app/app-workspace.jsx',
    'components/app/tradition-coaching.jsx',
  ]){
    const parsed=ts.createSourceFile(file,source(file),ts.ScriptTarget.ES2022,true,ts.ScriptKind.JSX)
    const errors=parsed.parseDiagnostics.map(item=>{
      const where=parsed.getLineAndCharacterOfPosition(item.start||0)
      return file+':'+(where.line+1)+': '+ts.flattenDiagnosticMessageText(item.messageText,' ')
    })
    assert.deepEqual(errors,[],file+' contains invalid JSX/JavaScript')
  }
})
