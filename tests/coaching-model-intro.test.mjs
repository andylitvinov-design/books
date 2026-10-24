import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {TRADITION_COURSES} from '../lib/personal-coaching/traditions.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('shared coach introduction is localized, has two real actions and keeps privacy',()=>{
  const ui=read('components/coaching-model-intro.jsx')
  const css=read('components/coaching-model-intro.module.css')
  for(const phrase of ['Yes, start this session','Да, пройти сессию','Sí, empezar la sesión',
    'Choose another E-coach','Выбрать другого E-коуча','Elegir otro E-coach',
    'When this is useful','Для каких задач подходит','Para qué situaciones sirve'])assert.ok(ui.includes(phrase),phrase)
  assert.match(ui,/data-coaching-model-intro/)
  assert.match(ui,/onClick=\{onStart\}/)
  assert.match(ui,/onClick=\{onOther\}/)
  assert.match(ui,/otherHref/)
  assert.match(ui,/privacy==='private'/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|\bfetch\(|appFetch|autoplay|speechSynthesis/)
  assert.match(css,/grid-template-rows:minmax\(0,1fr\) auto/)
  assert.match(css,/overflow-y:auto/)
  assert.match(css,/min-height:44px/)
  assert.match(css,/@media\(max-width:380px\)/)
})
test('guest direct-link and selected sessions see presentation before the questions; adult safety stays',()=>{
  const ui=read('components/public-coaching-discovery.jsx')
  const css=read('components/public-coaching-discovery.module.css')
  assert.match(ui,/const \[introAccepted,setIntroAccepted\]=useState\(false\)/)
  assert.match(ui,/setSession\(selected\);setIntroAccepted\(false\)/)
  assert.match(ui,/setSession\(scheme\);setIntroAccepted\(false\)/)
  assert.match(ui,/!introAccepted\?<div className=\{styles\.introHost\}><CoachingModelIntro/)
  assert.match(ui,/onStart=\{\(\)=>setIntroAccepted\(true\)\}/)
  assert.match(ui,/onOther=\{backToModels\}/)
  assert.match(ui,/session&&introAccepted&&!finished/)
  assert.match(ui,/coachingSchemeRequiresAdultConsent\(session\)&&!adultAcknowledged/)
  assert.match(ui,/data-coaching-age-confirm/)
  assert.match(css,/\.introHost\{grid-row:1 \/ -1/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|\bfetch\(|appFetch|sendBeacon\(/)
})
test('private selection delays start POST until preview confirmation, preserving the 18+ flag',()=>{
  const ui=read('components/app/personal-coaching.jsx')
  assert.match(ui,/const \[pendingIntro,setPendingIntro\]=useState\(null\)/)
  assert.match(ui,/pendingIntro \? <CoachingModelIntro/)
  assert.match(ui,/onChoose=\{\(choice,clientQuestion,adultConfirmed\)=>\{setPendingIntro/)
  assert.match(ui,/onStart=\{\(\)=>begin\(pendingIntro\.choice,pendingIntro\.clientQuestion,pendingIntro\.adultConfirmed\)\}/)
  assert.match(ui,/onOther=\{\(\)=>\{setPendingIntro\(null\)/)
  assert.match(ui,/: \(!course\|\|newSelection\) \?/)
  assert.match(ui,/const result=await command\('start',\{schemeKey:choice\.schemeKey,clientQuestion,/)
  assert.match(ui,/setPendingIntro\(null\)/)
})
test('both authored ancient tracks have their own fit/result and ask again before restarting',()=>{
  const ui=read('components/app/tradition-coaching.jsx')
  assert.match(ui,/\(!course\|\|restartPreview\)\?<div/)
  assert.match(ui,/onStart=\{error&&!data\?reload:start\}/)
  assert.match(ui,/onClick=\{\(\)=>setRestartPreview\(true\)\}/)
  assert.match(ui,/otherHref=\{'\/'\+lang\+'\/coaching'\}/)
  for(const def of TRADITION_COURSES)for(const lang of ['en','ru','es']){
    assert.ok(def.useCases[lang].length>35)
    assert.ok(def.expectedOutcome[lang].length>28)
  }
})
test('the shared presentation and three existing coaching runners parse as JSX',()=>{
  for(const path of ['components/coaching-model-intro.jsx','components/public-coaching-discovery.jsx',
    'components/app/personal-coaching.jsx','components/app/tradition-coaching.jsx']){
    const parsed=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.equal(parsed.parseDiagnostics.length,0,path+': '+parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '))
  }
})
