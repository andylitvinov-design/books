import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  coachingAdaptivePrompt, coachingAnswerText, buildCoachingRecap, coachingRecapClipboardText,
} from '../lib/personal-coaching/guided-session.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const choice=(id,en,ru,es)=>({id,label:{en,ru,es}})
const questions=[
  {id:'focus',stepKey:'goal',type:'single_choice',choices:[choice('clarity','Clarity','Ясность','Claridad')]},
  {id:'barrier',stepKey:'obstacle',type:'single_choice',choices:[
    choice('time','Not enough time','Не хватает времени','Falta de tiempo'),
    choice('confidence','Doubt','Сомнения','Dudas'),
  ]},
  {id:'options',stepKey:'options',type:'single_choice',choices:[
    choice('small_action','A small step','Небольшой шаг','Un paso pequeño'),
    choice('ask','Ask for help','Попросить помощи','Pedir ayuda'),
  ]},
  {id:'will',stepKey:'will',type:'single_choice',choices:[
    choice('today','Today','Сегодня','Hoy'),choice('week','This week','На неделе','Esta semana'),
  ]},
  {id:'review',stepKey:'review',type:'single_choice',choices:[
    choice('useful','Useful','Полезно','Útil'),choice('none','Not useful yet','Пока не помогло','No me ayudó'),
  ]},
]
const adapt=(index,answers,locale='en',extra={})=>coachingAdaptivePrompt({
  question:questions[index],questions,index,answers,locale,...extra,
})

test('no external AI: adaptive question is tied to a preceding saved answer and preserves question ID',()=>{
  assert.equal(adapt(2,{}),null)
  assert.equal(adapt(0,{barrier:'choice:time'}),null)
  const adapted=adapt(2,{barrier:'choice:time'})
  assert.equal(adapted.key,'time')
  assert.match(adapted.prompt,/time/i)
  assert.match(adapted.why,/limited time/i)
  assert.equal(adapt(2,{barrier:'choice:confidence'}).key,'confidence')
  assert.match(adapt(3,{barrier:'choice:confidence'}).prompt,/When/)
  assert.equal(adapt(4,{barrier:'choice:time'}),null,
    'review wording cannot be replaced with an unrelated action question')
  assert.equal(adapt(2,{barrier:null}),null,'skipped answers are not invented')
})
test('localized editorial prompts exist in English, Russian, and Spanish',()=>{
  const answers={barrier:'choice:time'}
  const ru=adapt(2,answers,'ru')
  const es=adapt(2,answers,'es')
  assert.match(ru.prompt,/времени/)
  assert.match(es.prompt,/tiempo/)
  assert.ok(ru.why.length>35)
  assert.ok(es.why.length>35)
})
test('WOOP mandatory if-then plan and numeric scale are not silently rewritten',()=>{
  assert.equal(adapt(3,{barrier:'choice:time'},'en',{requiredCustomPlan:true}),null,
    'final authored plan is always authoritative')
  const scaleQuestions=[
    {id:'outcome',stepKey:'outcome'},
    {id:'rating',stepKey:'scaling',type:'scale_0_10'},
    {id:'resources',stepKey:'knowhow',type:'single_choice'},
  ]
  const scale=(n)=>coachingAdaptivePrompt({
    question:scaleQuestions[2],questions:scaleQuestions,index:2,
    answers:{rating:'choice:'+n},locale:'en',
  })
  assert.match(scale(2).prompt,/one small improvement/)
  assert.match(scale(8).prompt,/helped you reach/)
  assert.equal(coachingAdaptivePrompt({
    question:scaleQuestions[1],questions:scaleQuestions,index:1,answers:{},
  }),null)
  assert.equal(scaleQuestions[2].stepKey,'knowhow')
})
test('action recap never treats final review rating as the action and never claims a missing response',()=>{
  const session={answers:{
    focus:'choice:clarity',barrier:'choice:time',options:'choice:small_action',
    will:'choice:week',review:'choice:useful',
  },clientQuestion:'How can I make progress with my work?'}
  const rows=buildCoachingRecap(session,questions,'en')
  assert.equal(rows.find(r=>r.key==='focus').value,'Clarity')
  assert.equal(rows.find(r=>r.key==='situation').value,'Not enough time')
  assert.equal(rows.find(r=>r.key==='action').value,'This week')
  assert.notEqual(rows.find(r=>r.key==='action').value,'Useful')
  assert.equal(rows.some(r=>r.key==='resources'),false)
  const text=coachingRecapClipboardText(session,questions,'ru')
  assert.match(text,/На неделе/)
  assert.match(text,/How can I make progress/)
  assert.doesNotMatch(text,/choice:/)
  assert.doesNotMatch(text,/Полезно/)
  const noAnswer=buildCoachingRecap({answers:{review:'choice:useful'}},questions)
  assert.equal(noAnswer.length,0,'review-only answer cannot create an action plan')
})
test('legacy free-text questions and versioned question choices are reported without inventing meaning',()=>{
  const legacy=[
    {id:'topic',stage:'goal'},{id:'outcome',stage:'goal'},
    {id:'obstacle',stage:'reality'},{id:'first_step',stage:'will'},
    {id:'when',stage:'will'},
  ]
  const session={answers:{topic:'My decision',obstacle:'I need facts',
    first_step:'Ask two clients about their needs',when:'Friday'}}
  const rows=buildCoachingRecap(session,legacy,'es')
  assert.equal(rows.find(r=>r.key==='focus').value,'My decision')
  assert.equal(rows.find(r=>r.key==='situation').value,'I need facts')
  assert.equal(rows.find(r=>r.key==='action').value,'Ask two clients about their needs')
  assert.equal(rows.find(r=>r.key==='timing').value,'Friday')
  assert.equal(coachingAnswerText('choice:unknown',questions[0]),'')
  assert.equal(coachingAnswerText('choice:0',{type:'scale_0_10'}),'0/10')
  assert.equal(coachingAnswerText(null,questions[0]),'')
})
test('UI reuses authenticated encrypted storage, keeps one question and offers explicit standard wording',async()=>{
  const ui=source('components/app/personal-coaching.jsx')
  const css=source('components/app/personal-coaching.module.css')
  const helper=source('lib/personal-coaching/guided-session.js')
  const server=source('lib/app/personal-coaching.js')
  assert.match(ui,/data-coaching-one-question/)
  assert.match(ui,/coachingAdaptivePrompt\(/)
  assert.match(ui,/data-coaching-adaptive-prompt/)
  assert.match(ui,/setUseStandardPrompt\(value=>!value\)/)
  assert.match(ui,/text=\{visiblePrompt\} locale=\{lang\}/)
  assert.match(ui,/data-coaching-evidence-recap/)
  assert.match(ui,/data-coaching-recap-key=\{row\.key\}/)
  assert.match(ui,/clipboard\.writeText\(coachingRecapClipboardText/)
  assert.match(ui,/root='\/'\+lang\+'\/app'/)
  assert.match(ui,/command\('answer',\{questionId:question\.id,answer\}\)/)
  assert.match(server,/seal\(course,sealContext\(actor\),config\)/)
  for(const name of ['adaptivePanel','smartRecap','smartRecapGrid','smartRecapCard','recapCopy'])
    assert.match(css,new RegExp('\\.'+name+'\\b'))
  assert.match(css,/@media\(max-width:600px\)/)
  assert.doesNotMatch(helper,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|window\.analytics|gtag\(|fbq\(/)
  assert.doesNotMatch(ui,/api\/openai|api\/anthropic|MediaRecorder|getUserMedia\(/)
  const ts=(await import('typescript')).default
  const ast=ts.createSourceFile('personal-coaching.jsx',ui,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JSX)
  assert.deepEqual(ast.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[])
})
