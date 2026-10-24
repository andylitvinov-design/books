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
  assert.match(ru.prompt,/врем/)
  assert.match(es.prompt,/tiempo/)
  assert.ok(ru.why.length>35)
  assert.ok(es.why.length>35)
})
test('WOOP mandatory if-then plan and numeric scale are not silently rewritten',()=>{
  const woopQuestions=questions.slice(0,4)
  assert.equal(coachingAdaptivePrompt({
    question:woopQuestions.at(-1),questions:woopQuestions,index:woopQuestions.length-1,
    answers:{barrier:'choice:time'},locale:'en',requiredCustomPlan:true,
  }),null,'final authored if–then plan is always authoritative')
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
  assert.equal(rows.find(r=>r.key==='action'),undefined,
    'a selected time must never appear as a personal action')
  assert.equal(rows.find(r=>r.key==='timing').value,'This week')
  assert.equal(rows.find(r=>r.key==='direction').value,'A small step')
  assert.equal(rows.some(r=>r.key==='resources'),false)
  const text=coachingRecapClipboardText(session,questions,'ru')
  assert.match(text,/На неделе/)
  assert.match(text,/How can I make progress/)
  assert.doesNotMatch(text,/choice:/)
  assert.doesNotMatch(text,/Полезно/)
  const noAnswer=buildCoachingRecap({answers:{review:'choice:useful'}},questions)
  assert.equal(noAnswer.length,0,'review-only answer cannot create an action plan')
})
test('a dated commitment, chosen direction and resource are semantically distinct',()=>{
  const end=[
    {id:'grow_will_q1_v1',stepKey:'will',type:'single_choice',
      choices:[choice('prepare','Prepare one concrete item','Подготовить одно дело','Preparar algo'),
        choice('pause','No action yet','Пока без шага','Aún no actuar')]},
    {id:'tgrow_will_q1_v1',stepKey:'will',type:'single_choice',
      choices:[choice('week','Within seven days','На этой неделе','Esta semana')]},
    {id:'oskar_affirm_q1_v1',stepKey:'affirm',type:'single_choice',
      choices:[choice('skills','My skills','Мои навыки','Mis habilidades')]},
    {id:'oskar_review_q1_v1',stepKey:'review',type:'single_choice',
      choices:[choice('useful','Useful','Полезно','Útil')]},
  ]
  const grow=buildCoachingRecap({answers:{grow_will_q1_v1:'choice:prepare'}},end)
  assert.equal(grow.find(r=>r.key==='action').value,'Prepare one concrete item')
  const tgrow=buildCoachingRecap({answers:{tgrow_will_q1_v1:'choice:week'}},end,'es')
  assert.equal(tgrow.find(r=>r.key==='timing').value,'Esta semana')
  assert.equal(tgrow.some(r=>r.key==='action'),false)
  const oskar=buildCoachingRecap({answers:{oskar_affirm_q1_v1:'choice:skills',
    oskar_review_q1_v1:'choice:useful'}},end,'ru')
  assert.equal(oskar.find(r=>r.key==='resources').value,'Мои навыки')
  assert.equal(oskar.some(r=>r.key==='action'),false)
  const pause=buildCoachingRecap({answers:{grow_will_q1_v1:'choice:pause'}},end)
  assert.equal(pause.some(r=>r.key==='action'),false)
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
test('manual clipboard export includes only the client-approved plan and has a Safari fallback',()=>{
  const session={clientQuestion:'What can I do next?',answers:{will:'choice:week'},
    actionPlan:{goal:'Improve consistency',obstacle:'Not enough time',
      actionText:'Write my first paragraph',when:'Tomorrow morning',
      confidence:6,approvedAt:'2026-10-24T00:00:00Z'}}
  const approved=coachingRecapClipboardText(session,questions,'en')
  assert.match(approved,/My confirmed action plan/)
  assert.match(approved,/Write my first paragraph/)
  assert.match(approved,/My confidence: 6\/10/)
  const unapproved=coachingRecapClipboardText({...session,actionPlan:{
    ...session.actionPlan,approvedAt:null}},questions,'ru')
  assert.doesNotMatch(unapproved,/подтверждённый план|Write my first paragraph/)
  assert.match(coachingRecapClipboardText(session,questions,'es'),/Mi plan de acción confirmado/)
  const player=source('components/app/personal-coaching.jsx')
  const css=source('components/app/personal-coaching.module.css')
  assert.match(player,/clipboardState==='error'&&<label className=\{styles\.recapFallback\}/)
  assert.match(player,/<textarea readOnly rows=\{7\}/)
  assert.match(css,/\.recapFallback\{/)
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

test('spoken or written numeric scales and saved reflections preserve user evidence',()=>{
  const scale={id:'s',type:'scale_0_10',stepKey:'scaling'}
  const next={id:'r',stepKey:'knowhow',type:'single_choice'}
  const adapted=coachingAdaptivePrompt({question:next,questions:[scale,next],index:1,
    answers:{s:'3'},locale:'ru'})
  assert.ok(adapted?.prompt.includes('ресурс'))
  assert.equal(coachingAnswerText('3',scale,'en'),'3/10')
  assert.equal(coachingAnswerText('choice:3',scale,'en'),'3/10')
  const recap=coachingRecapClipboardText({answers:{s:'3'},reflections:{s:{text:'I felt supported.'}}},
    [{...scale,prompt:{en:'How is it now?',ru:'Как сейчас?',es:'¿Cómo estás?'}}],'en')
  assert.match(recap,/I felt supported/)
  assert.doesNotMatch(recap,/undefined/)
})
