import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {coachingSlidePurpose,contextualCoachingFollowup,authoredFollowupFor,coachingStageKey}
  from '../lib/personal-coaching/offline-intelligence.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const q=(step,id=step,type='single_choice')=>({id,stepKey:step,type,required:true})
const visit=(questions,answers,index,reflections={},clientQuestion='')=>
  contextualCoachingFollowup(questions[index],answers[questions[index].id],reflections,
    {questions,answers,clientQuestion})

// The ordered stage keys below are from the actual reviewed 10 published
// coaching_schemes on HH CA Central; never rewrite the schemes themselves.
const publishedFlows={
  appreciative_future_v1:['define','discover','dream','design','destiny'],
  clear_dialogue_v1:['contract','listen','explore','action','review'],
  fuel_development_v1:['frame','understand','explore','plan'],
  grow_quick_v1:['goal','reality','options','will'],
  grow_reflect_v1:['frame','goal','reality','options','will','review'],
  oskar_resources_v1:['outcome','scaling','knowhow','affirm','review'],
  solution_focus_quick_v1:['preferred','scale','step'],
  solution_focus_reflect_v1:['preferred','exceptions','scale','resources','step'],
  tgrow_compass_v1:['topic','goal','reality','options','will'],
  woop_habit_v1:['wish','outcome','obstacle','plan'],
}

test('all 10 published course structures receive an optional authored micro-slide',()=>{
  assert.equal(Object.keys(publishedFlows).length,10)
  for(const [model,steps] of Object.entries(publishedFlows)){
    const questions=steps.map((s,i)=>q(s,'step-'+i,['scale','scaling'].includes(s)?'scale_0_10':'single_choice'))
    const index=questions.findIndex((x,i)=>i<questions.length-1&&['reality','options'].includes(coachingStageKey(x)))
    assert.ok(index>=0,model+' eligible stage')
    const answers=Object.fromEntries(questions.slice(0,index+1).map(item=>[item.id,item.type==='scale_0_10'?'choice:5':'choice:visible_result']))
    const path=visit(questions,answers,index)
    assert.ok(path?.key?.endsWith('_v2'),model+' followup')
    assert.equal(path.questionId,questions[index].id)
    assert.ok(['reality','options'].includes(path.stage))
    assert.equal(path.choices.length,4)
  }
})

test('one selected obstacle changes the next question; no diagnosis or assumptions',()=>{
  const questions=[q('goal'),q('reality'),q('options'),q('will')]
  const answers={goal:'choice:visible_result',reality:'choice:stuck',options:'choice:small_action'}
  const early=visit(questions,answers,1)
  const later=visit(questions,answers,2)
  assert.equal(early.key,'reality_stuck_v2')
  assert.equal(later.key,'options_stuck_v2')
  assert.match(later.prompt.ru,/другую первую попытку/)
  assert.equal(early.choices.some(x=>x.label.ru.includes('Начало')),false)
})

test('explicit combinations choose contextual small experiments rather than a static generic question',()=>{
  const questions=[q('goal'),q('reality'),q('options'),q('will')]
  const combos=[
    [{goal:'I doubt whether this can work.',reality:'There is not enough time.',options:'choice:small_action'},'options_pair_time_confidence_v2'],
    [{goal:'I am unsure what is needed.',reality:'I have no time.',options:'choice:small_action'},'options_pair_time_clarity_v2'],
    [{goal:'I am unsure what I want.',reality:'I doubt my approach.',options:'choice:small_action'},'options_pair_clarity_confidence_v2'],
    [{goal:'I am stuck on this.',reality:'I have no time.',options:'choice:small_action'},'options_pair_time_stuck_v2'],
  ]
  for(const [answers,key] of combos){
    const picked=visit(questions,answers,2)
    assert.equal(picked.key,key,key)
    for(const lang of ['en','ru','es']){
      assert.ok(picked.prompt[lang].length>40,key+' '+lang)
      assert.ok(picked.why[lang].length>40,key+' reason '+lang)
    }
  }
})

test('three self-rated ranges remain subjective and never trigger diagnoses',()=>{
  const qs=[q('preferred'),q('scale','my-scale','scale_0_10'),q('step')]
  for(const [score,key] of [[0,'reality_scale_low_v2'],[3,'reality_scale_low_v2'],
    [5,'reality_scale_mid_v2'],[8,'reality_scale_high_v2'],[10,'reality_scale_high_v2']]){
    const answers={'my-scale':'choice:'+score}
    const item=visit(qs,answers,1)
    assert.equal(item.key,key)
    assert.match(item.why.en,/not a (?:clinical|psychological)|subjective/)
  }
  assert.equal(visit(qs,{'my-scale':'I think 5'},1),null,'unparsed scale cannot be assumed to be 0')
})

test('pause, ask, learn, reframe and uncertainty get distinct ethical responses',()=>{
  const questions=[q('reality'),q('options'),q('will')]
  const pairs=[
    ['pause','options_pause_v2'],
    ['ask','options_support_v2'],
    ['learn','options_learn_v2'],
    ['reframe','options_reframe_v2'],
    ['small_action','options_choice_v2'],
  ]
  for(const [id,expected] of pairs){
    const result=visit(questions,{reality:'choice:early',options:'choice:'+id},1)
    assert.equal(result.key,expected,id)
  }
  assert.match(visit(questions,{options:'choice:pause'},1).why.ru,/Пауза/)
})

test('one followup per category, two in total, rejected forged/stale context, legacy safe',()=>{
  const questions=[q('goal'),q('reality'),q('options'),q('will')]
  const answers={reality:'choice:stuck',options:'choice:small_action'}
  const first=visit(questions,answers,1)
  assert.ok(first)
  const saved={reality:{stage:'reality',key:first.key,text:'I notice the pause'}}
  assert.equal(visit(questions,answers,1,saved),null)
  assert.ok(visit(questions,answers,2,saved))
  const two={...saved,options:{stage:'options',key:'options_stuck_v2',text:'Try a small change'}}
  assert.equal(visit(questions,answers,2,two),null)
  assert.equal(contextualCoachingFollowup(questions[1],'choice:time',{},{
    questions,answers,
  }),null,'client cannot switch selected answer without server save')
  assert.equal(contextualCoachingFollowup(questions[1],'choice:stuck',{},{
    questions:questions.filter(item=>item.id!=='reality'),answers,
  }),null,'only a known published question can be used')
  assert.equal(visit(questions,{reality:'kill myself'},1),null)
  assert.equal(visit(questions,answers,1,{},'I may kill myself'),null)
  assert.equal(authoredFollowupFor(q('reality'),'choice:stuck')?.key,'reality_choice_v1')
})

test('the purpose of a regular slide is a short statement, not a second question',()=>{
  for(const step of ['goal','reality','options','action','review','when','scale']){
    for(const lang of ['en','ru','es']){
      const p=coachingSlidePurpose(q(step),lang)
      assert.ok(p.length>15,step+' '+lang)
      assert.ok(!p.includes('?')&&!p.includes('¿'),step+' single question')
    }
  }
  assert.match(coachingSlidePurpose(q('scale','s','scale_0_10'),'ru'),/0–10/)
})

test('guest and private UIs share contextual choices; backend checks owner-persisted scheme',()=>{
  const guest=source('components/public-coaching-discovery.jsx')
  const privateUI=source('components/app/personal-coaching.jsx')
  const backend=source('lib/app/personal-coaching.js')
  assert.match(guest,/data-public-followup-choices/)
  assert.match(guest,/data-public-coaching-step-purpose/)
  assert.match(privateUI,/data-coaching-followup-choices/)
  assert.match(privateUI,/data-coaching-step-purpose/)
  assert.match(backend,/const permittedDeep=contextualCoachingFollowup/)
  assert.match(backend,/questions:scheme\?\.questions\|\|\[question\]/)
  assert.match(backend,/answers:course\.current\.answers/)
  assert.match(backend,/input\.followupKey===permittedDeep\?\.key/)
  assert.match(backend,/input\.followupKey===permittedLegacy\?\.key/)
  assert.match(backend,/questions\.slice\(Math\.max\(0,position\)\)/)
  assert.match(guest,/session\.questions\.slice\(index\)/)
  for(const ui of [guest,privateUI]){
    assert.doesNotMatch(ui,/api\/openai|api\/anthropic|fetch\('https:\/\/|sendBeacon\(/)
  }
  for(const file of ['components/app/personal-coaching.jsx','components/public-coaching-discovery.jsx']){
    const parsed=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[])
  }
})
