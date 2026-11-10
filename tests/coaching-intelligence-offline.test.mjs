import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {
  coachingStageKey,authoredFollowupFor,coachingControlForAnswer,draftCoachingActionPlan,
  displayCoachingAnswer,COACHING_P1_VERSION,
} from '../lib/personal-coaching/offline-intelligence.js'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('localized, versioned, answer-aware followups with no speculative AI analysis',()=>{
  const question={id:'a',stepKey:'reality'}
  const choice=authoredFollowupFor(question,'choice:unclear')
  const written=authoredFollowupFor(question,'I need more information')
  assert.equal(coachingStageKey(question),'reality')
  assert.equal(COACHING_P1_VERSION,'hh-coaching-offline-p1-v1')
  assert.equal(choice.key,'reality_choice_v1')
  assert.equal(written.key,'reality_text_v1')
  for(const locale of ['en','ru','es']){
    assert.ok(choice.prompt[locale].length>25)
    assert.ok(written.prompt[locale].length>25)
    assert.ok(authoredFollowupFor({id:'b',stepKey:'options'},'choice:try').prompt[locale].length>25)
  }
  assert.notEqual(choice.prompt.en,written.prompt.en)
})

test('one gentle followup per stage, up to five per session; safety returns a blocking control and unknown stages skip it',()=>{
  const reality={id:'a',stepKey:'reality'}
  assert.equal(authoredFollowupFor(reality,''),null)
  assert.equal(authoredFollowupFor(reality,'kill myself').controlStatus,'safety_hold')
  assert.equal(authoredFollowupFor(reality,'покончить с собой').controlStatus,'safety_hold')
  assert.equal(authoredFollowupFor(reality,'quiero morir').controlStatus,'safety_hold')
  assert.equal(authoredFollowupFor({id:'c',stepKey:'review'},'A note'),null)
  const prev={a:{stage:'reality',text:'My own note'}}
  assert.equal(authoredFollowupFor({id:'b',stepKey:'obstacle'},'An obstacle',prev),null)
  assert.ok(authoredFollowupFor({id:'b',stepKey:'options'},'An option',prev))
  assert.equal(authoredFollowupFor({id:'c',stepKey:'options'},'An option',{...prev,b:{stage:'options',text:'My note'}}),null)
  const goal=authoredFollowupFor({id:'g',stepKey:'goal'},'My meaningful change',prev)
  assert.equal(goal.key,'goal_text_v1')
  for(const locale of ['en','ru','es'])assert.ok(goal.prompt[locale].length>25)
  const resources=authoredFollowupFor({id:'k',stepKey:'knowhow'},'I can ask a friend')
  const action=authoredFollowupFor({id:'w',stepKey:'will'},'One small call')
  assert.equal(resources.stage,'resources')
  assert.equal(action.stage,'action')
  for(const locale of ['en','ru','es']){
    assert.ok(resources.prompt[locale].length>25)
    assert.ok(action.prompt[locale].length>25)
  }
  assert.equal(authoredFollowupFor({id:'a',stepKey:'will'},'My step',{
    g:{stage:'goal'},r:{stage:'reality'},k:{stage:'resources'},o:{stage:'options'},w:{stage:'action'},
  }),null)
  assert.equal(authoredFollowupFor({id:'o',stepKey:'options'},'One option',{
    ...prev,g:{stage:'goal',text:'Reason'},o:{stage:'options',text:'Direction'},
  }),null)
})

test('action plan draft uses direct user evidence and leaves missing entries blank',()=>{
  const q=[
    {id:'g',stepKey:'goal'}, {id:'o',stepKey:'obstacle',type:'single_choice',
      choices:[{id:'time',label:{en:'Not enough time',ru:'Мало времени',es:'Falta tiempo'}}]},
    {id:'a',stepKey:'action'},{id:'w',stepKey:'when'},{id:'r',stepKey:'review'},
  ]
  const answers={g:'Start a project',o:'choice:time',a:'Write one page',w:'Tomorrow',r:'Useful session'}
  assert.deepEqual(draftCoachingActionPlan(q,answers,'My question','en'),
    {goal:'Start a project',obstacle:'Not enough time',actionText:'Write one page',when:'Tomorrow',confidence:null})
  assert.equal(draftCoachingActionPlan(q,answers,'','ru').obstacle,'Мало времени')
  assert.equal(displayCoachingAnswer('choice:time',q[1],'es'),'Falta tiempo')
  assert.equal(displayCoachingAnswer('choice:missing',q[1],'es'),'')
  assert.equal(draftCoachingActionPlan(q,{},'','en').actionText,'')
})

test('approved plan seeds never invent actions from TGROW timing, OSKAR resources or directions',()=>{
  const option=(id,en,ru,es)=>({id,label:{en,ru,es}})
  const cases=[
    {questions:[
      {id:'tgrow_goal',stepKey:'goal'},
      {id:'tgrow_will',stepKey:'will',type:'single_choice',
        choices:[option('week','Within seven days','На этой неделе','Esta semana')]},
    ],answers:{tgrow_goal:'Clear career options',tgrow_will:'choice:week'},
      expected:{goal:'Clear career options',actionText:'',when:'Within seven days'}},
    {questions:[{id:'oskar_affirm',stepKey:'affirm',type:'single_choice',
      choices:[option('skills','My existing skills','Мои навыки','Mis habilidades')]}],
      answers:{oskar_affirm:'choice:skills'},expected:{goal:'',actionText:'',when:''}},
    {questions:[{id:'ap_design',stepKey:'design',type:'single_choice',
      choices:[option('routine','My daily routine','Мои привычки','Mi rutina')]}],
      answers:{ap_design:'choice:routine'},expected:{goal:'',actionText:'',when:''}},
    {questions:[{id:'grow_options',stepKey:'options',type:'single_choice',
      choices:[option('learn','Gather information','Собрать факты','Recopilar información')]},
      {id:'grow_will',stepKey:'will',type:'single_choice',
      choices:[option('pause','No action yet','Пока без шага','No actuar aún')]}],
      answers:{grow_options:'choice:learn',grow_will:'choice:pause'},
      expected:{goal:'',actionText:'',when:''}},
    {questions:[{id:'woop_plan',stepKey:'plan'}],
      answers:{woop_plan:'If the obstacle appears, then I will start for two minutes.'},
      expected:{goal:'',actionText:'If the obstacle appears, then I will start for two minutes.',when:''}},
  ]
  for(const {questions,answers,expected} of cases){
    const draft=draftCoachingActionPlan(questions,answers,'This is my concern, not necessarily a goal','en')
    for(const [key,value] of Object.entries(expected))assert.equal(draft[key],value,key)
    assert.equal(draft.confidence,null)
  }
  const oskar=cases[1]
  assert.equal(draftCoachingActionPlan(oskar.questions,oskar.answers,'','ru').actionText,'')
})

test('continuity and unsubmitted followup safeguards reuse the same private account',async()=>{
  const ui=source('components/app/personal-coaching.jsx')
  const picker=source('components/app/personal-coaching-picker.jsx')
  const css=source('components/app/personal-coaching.module.css')
  const helper=source('lib/personal-coaching/offline-intelligence.js')
  assert.match(helper,/buildCoachingRecap\(\{answers\},items,locale\)/)
  assert.match(ui,/const lastApprovedPlan=\[session/)
  assert.match(ui,/previousPlan=\{lastApprovedPlan\}/)
  assert.match(ui,/pendingFollowup&&reflectionDraft\.trim\(\)\.length>0/)
  assert.match(picker,/isNew&&previousAction&&/)
  assert.match(picker,/previousPlan\?\.approvedAt/)
  assert.match(picker,/onClick=\{revisitPrevious\}/)
  assert.match(picker,/setShowRecommendations\(false\)/)
  assert.match(css,/\.previousPlanPanel\{/)
  assert.match(css,/@media\(max-width:370px\)/)
  assert.doesNotMatch(picker,/\blocalStorage\b|\bsessionStorage\b|\bsendBeacon\b|\bfetch\(/)
  const ts=(await import('typescript')).default
  const parsed=ts.createSourceFile('components/app/personal-coaching-picker.jsx',picker,
    ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.equal(parsed.parseDiagnostics.length,0)
})

test('backend keeps saved reflections and approved plans owner encrypted and optimistic-revision guarded',()=>{
  const src=source('lib/app/personal-coaching.js'),api=source('app/api/app/[...path]/route.js')
  for(const literal of ["input.action==='reflection'","input.action==='plan'",
    'course.current.reflections={','course.current.actionPlan={','readRow(db,actor,true)',
    'seal(course,sealContext(actor),config)','authoredFollowupFor(question,original,course.current.reflections)',
    'PERSONAL_COACH_REFLECTION_UNAVAILABLE','PERSONAL_COACH_PLAN_INVALID'])
    assert.ok(src.includes(literal),literal)
  assert.match(src,/onlyKeys\(input,\['action','revision','questionId','followupKey','note'\]\)/)
  assert.match(api,/await auth\.verified\(\)/)
  assert.match(api,/savePersonalCoaching\(config, actor, await readBody\(request, 8192\)\)/)
  assert.doesNotMatch(src,/process\.env\.GEMINI|\bfetch\(/)
})

test('guest remains memory-only; signed in flow waits for saved server response',()=>{
  const guest=source('components/public-coaching-discovery.jsx')
  const user=source('components/app/personal-coaching.jsx')
  const plan=source('components/coaching-action-plan.jsx')
  for(const marker of ['data-public-coaching-followup','setReflections(previous=>','CoachingActionPlan','setApprovedPlan(value)'])
    assert.ok(guest.includes(marker),marker)
  assert.match(user,/const saved=await command\('reflection'/)
  assert.match(user,/if\(!saved\)return/)
  assert.match(user,/command\('plan',fields\)/)
  assert.match(user,/data-coaching-authored-followup/)
  assert.match(plan,/onSave\(\{/)
  assert.doesNotMatch(guest,/localStorage|sessionStorage|sendBeacon\(|\bfetch\(|appFetch|gtag\(|fbq\(/)
  assert.doesNotMatch(plan,/localStorage|sessionStorage|\bfetch\(/)
})

test('changed JSX modules parse before Vercel build',()=>{
  for(const path of ['components/app/personal-coaching.jsx','components/public-coaching-discovery.jsx',
    'components/coaching-action-plan.jsx']){
    const parsed=ts.createSourceFile(path,source(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    const errors=parsed.parseDiagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error)
    assert.equal(errors.length,0,path+': '+errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '))
  }
})


test('adaptive methodology selects a focused follow-up for overload, ambivalence and advice requests',()=>{
  const overload=authoredFollowupFor({id:'overload',stepKey:'reality'},'У меня слишком много дел, я не успеваю')
  assert.equal(overload.intervention,'prioritize')
  assert.equal(overload.prompt.ru,'Что из этого важнее всего в ближайшие семь дней?')
  const ambivalence=authoredFollowupFor({id:'ambivalence',stepKey:'action'},'I am afraid to start')
  assert.equal(ambivalence.intervention,'explore_ambivalence')
  assert.match(ambivalence.prompt.en,/what makes you want to move forward/i)
  const advice=authoredFollowupFor({id:'advice',stepKey:'options'},'What should I do?')
  assert.equal(advice.intervention,'offer_advice_with_permission')
  assert.match(advice.prompt.en,/Would you like me/i)
})

test('methodology adapts across EN/RU/ES, including contradiction and priority stage',()=>{
  const contradiction=authoredFollowupFor({id:'c',stepKey:'reality'},
    'On one hand I want to leave, but at the same time I want to stay')
  assert.equal(contradiction.intervention,'check_contradiction')
  for(const locale of ['en','ru','es']){
    assert.ok(contradiction.prompt[locale].length>20)
    const priority=authoredFollowupFor({id:'p',stepKey:'priority'},'choice:important')
    assert.ok(priority.prompt[locale].length>20)
  }
})

test('safety, stop and pause produce terminal controls, never ordinary follow-up questions',()=>{
  for(const [message,expected] of [
    ['I want to kill myself','safety_hold'],
    ['I want to stop now','stopped'],
    ['Please pause','paused'],
  ]){
    const control=authoredFollowupFor({id:'s',stepKey:'reality'},message)
    assert.equal(control.controlStatus,expected)
    assert.match(control.key,/^control_(?:safety_hold|stopped|paused)_v2$/)
    assert.notEqual(control.key,'reality_text_v1')
    assert.equal(control.methodologyVersion,'hh-coaching-methodology-v2')
  }
})

test('adaptive metadata contains only controlled reason codes and no client text',()=>{
  const result=authoredFollowupFor({id:'a',stepKey:'reality'},'I am afraid to start')
  assert.equal(result.methodologyVersion,'hh-coaching-methodology-v2')
  assert.equal(result.intervention,'explore_ambivalence')
  assert.equal(JSON.stringify(result).includes('afraid to start'),false)
})


test('safety, pause and stop return explicit control states instead of silent fallthrough',()=>{
  const safety=authoredFollowupFor({id:'safe',stepKey:'reality'},'I want to kill myself')
  assert.equal(safety.controlStatus,'safety_hold')
  assert.ok(safety.prompt.ru.length>20)
  const pause=authoredFollowupFor({id:'pause',stepKey:'reality'},'Please pause')
  assert.equal(pause.controlStatus,'paused')
  const stop=authoredFollowupFor({id:'stop',stepKey:'reality'},'I want to stop now')
  assert.equal(stop.controlStatus,'stopped')
})

test('runner renders a blocking control state and resumes only after explicit user action',()=>{
  const ui=source('components/app/personal-coaching.jsx')
  assert.match(ui,/if\(item\.controlStatus\)\{/)
  assert.match(ui,/setSessionControl\(item\)/)
  assert.match(ui,/: sessionControl \? <div/)
  assert.match(ui,/sessionControl\.controlStatus==='safety_hold'/)
  assert.match(ui,/onClick=\{\(\)=>visit\(index\+1,session\?\.answers\)\}/)
})


test('stop, pause and safety controls are detected independently of question stage or position',()=>{
  for(const [message,status] of [
    ['I want to kill myself','safety_hold'],
    ['покончить с собой','safety_hold'],
    ['I want to stop now','stopped'],
    ['Please pause','paused'],
  ]){
    const control=coachingControlForAnswer(message,'en')
    assert.equal(control.controlStatus,status)
  }
  assert.equal(coachingControlForAnswer('I have completed my goal','en'),null)
})

test('final question path checks control intent before completion',()=>{
  const ui=source('components/app/personal-coaching.jsx')
  assert.match(ui,/function offerSessionControl\(answer\)/)
  assert.match(ui,/if\(offerSessionControl\(answer\)\)return/)
  assert.match(ui,/if\(!skip&&offerSessionControl\(answer\)\)return/)
  assert.ok(ui.indexOf('if(!skip&&offerSessionControl(answer))return')<ui.indexOf("commandAfterSave(saved,'complete')"))
})
