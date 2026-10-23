import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { speechResultSegments, appendSpokenAnswer, COACHING_ANSWER_LIMIT } from '../lib/personal-coaching/speech-text.js'

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
