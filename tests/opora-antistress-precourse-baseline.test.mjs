import test from 'node:test'
import { runInNewContext } from 'node:vm'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getCourseProgram, ANTISTRESS_REQUIRED_BASELINE_KEY, ANTISTRESS_BASELINE_RECENCY_DAYS,
  hasAntistressRequiredBaseline, withAntistressRequiredBaseline, isAntistressBaselineRecent,
} from '../lib/inner-growth/course-programs.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('new Anti-Stress onboarding always retains the Weekly Pulse baseline without forcing optional screens', () => {
  assert.equal(ANTISTRESS_REQUIRED_BASELINE_KEY, 'hh-weekly-pulse')
  assert.equal(getCourseProgram('stress').starterKeys[0], 'hh-weekly-pulse')
  assert.deepEqual(withAntistressRequiredBaseline(['gad-7'], 'stress'), ['hh-weekly-pulse', 'gad-7'])
  assert.deepEqual(withAntistressRequiredBaseline([], 'stress'), ['hh-weekly-pulse'])
  assert.deepEqual(withAntistressRequiredBaseline(['hh-resource-pulse','hh-weekly-pulse','hh-weekly-pulse'], 'stress'),
    ['hh-weekly-pulse', 'hh-resource-pulse'])
  assert.equal(hasAntistressRequiredBaseline(['gad-7', 'hh-resource-pulse'], 'stress'), false)
  assert.equal(hasAntistressRequiredBaseline(['hh-weekly-pulse'], 'stress'), true)
  // Historical non-Anti-Stress programs are not migrated into a new baseline.
  assert.deepEqual(withAntistressRequiredBaseline(['hh-resource-pulse'], 'confidence'), ['hh-resource-pulse'])
  assert.equal(hasAntistressRequiredBaseline(['hh-resource-pulse'], 'confidence'), true)
})

test('a compatible previous assessment is counted only inside the defined baseline window', () => {
  const now = Date.parse('2026-10-14T12:00:00Z')
  assert.deepEqual(ANTISTRESS_BASELINE_RECENCY_DAYS, {
    'hh-weekly-pulse': 7, 'gad-7': 14, 'hh-resource-pulse': 14,
  })
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','2026-10-07T12:00:00Z',now),true)
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','2026-10-07T11:59:59Z',now),false)
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','2026-10-14T12:01:00Z',now),false)
  assert.equal(isAntistressBaselineRecent('gad-7','2026-09-30T12:00:00Z',now),true)
  assert.equal(isAntistressBaselineRecent('gad-7','2026-09-30T11:59:59Z',now),false)
  assert.equal(isAntistressBaselineRecent('hh-resource-pulse','2026-10-01T12:00:00Z',now),true)
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','invalid',now),false)
})

test('stage-2 server rejects omitting the baseline and reviewing without completed, recent assessments', () => {
  const server=read('lib/app/growth-course.js')
  const commands=server.slice(server.indexOf("} else if (action === 'confirm-tests')"),
    server.indexOf("} else if (action === 'choose-goals')"))
  assert.equal((commands.match(/COURSE_ANTISTRESS_BASELINE_REQUIRED/g)||[]).length,2)
  assert.match(commands,/hasAntistressRequiredBaseline\(keys,courseProgramFromTopics/)
  assert.match(commands,/hasAntistressRequiredBaseline\(row\.test_keys,courseProgramFromTopics/)
  assert.match(commands,/COURSE_TEST_SELECTION_REQUIRED/)
  assert.match(commands,/COURSE_TESTS_REMAIN/)
  assert.match(commands,/compatibleResult\(found,key,\{requireRecent:recentStress\}\)/)
  assert.match(server,/isAntistressBaselineRecent\(key,r\.measurementAt,now\)/)
  const active=server.slice(server.indexOf("} else if (action === 'choose-goals')"),
    server.indexOf("} else if (action === 'complete-day')"))
  // Even if stage 2 passed previously, the learner may start weeks later.
  // Revalidate every chosen Anti-Stress questionnaire at actual cycle activation.
  assert.match(active,/hasAntistressRequiredBaseline\(row\.test_keys, 'stress'\)/)
  assert.match(active,/COURSE_ANTISTRESS_BASELINE_REQUIRED/)
  assert.match(active,/compatibleResult\(before,key,\{requireRecent:true\}\)/)
  assert.match(active,/COURSE_TESTS_REMAIN/)
})

test('the private step-2 interface visibly leads through starting tests before the first lesson', async () => {
  const wizard=read('components/app/course-r3-steps.jsx')
  const css=read('components/app/course-r3-steps.module.css')
  const root=read('components/app/my-course.jsx')
  const testFlow=read('lib/app/course-test-flow.js')
  assert.match(root,/request\(accountId, \{ action: 'start', consent: true, courseId: requestedCourseId/)
  assert.match(root,/action: 'intake'/)
  assert.match(root,/Weekly Pulse baseline/)
  assert.match(wizard,/data-course-antistress-pretests/)
  assert.match(wizard,/data-course-required-baseline/)
  const initialization=wizard.match(/useEffect\(\(\)=>\{\n    if\(stage!==2 \|\| testsTouched\) return[\s\S]*?\n  \},\[stage,testsTouched,confirmedKeys,ranked,preset,programme\?\.id\]\)/)?.[0]
  assert.ok(initialization,'execute the actual selection effect, not a duplicate selection algorithm')
  const initializationBody=initialization.slice('useEffect(()=>{'.length,initialization.lastIndexOf('\n  },'))
  const starter=['hh-weekly-pulse','gad-7','hh-resource-pulse']
  const extras=['fictional-extra']
  const ranked=Object.freeze([...starter,...extras].map(key=>Object.freeze({key})))
  function selectionContext(confirmedKeys=[],intent=null,preset=null){
    const calls=[]
    const context={stage:2,testsTouched:false,programme:{id:'stress'},preset,
      confirmedKeys:Object.freeze([...confirmedKeys]),ranked,
      readCourseEntryIntent:()=>intent,getCourseProgram,withAntistressRequiredBaseline,
      setChosenTests:keys=>calls.push(Array.from(keys))}
    return {context,calls}
  }
  const initialize=context=>runInNewContext('(()=>{'+initializationBody+'})()',context)
  const cases=[
    {confirmed:[],expected:starter},
    {confirmed:[],intent:{testKeys:['gad-7','unavailable-item']},expected:starter},
    {confirmed:['hh-weekly-pulse'],expected:['hh-weekly-pulse']},
    {confirmed:['hh-weekly-pulse','gad-7'],expected:['hh-weekly-pulse','gad-7']},
    {confirmed:starter,expected:starter},
    {confirmed:['hh-weekly-pulse','fictional-extra'],expected:['hh-weekly-pulse','fictional-extra']},
    {confirmed:['gad-7'],expected:['hh-weekly-pulse','gad-7']},
  ]
  for(const scenario of cases){
    const {context,calls}=selectionContext(scenario.confirmed,scenario.intent)
    initialize(context)
    assert.deepEqual(calls,[scenario.expected],'retain confirmed opt-outs; defaults are only for an unconfirmed selection')
    assert.deepEqual(Array.from(context.confirmedKeys),scenario.confirmed,'do not mutate persisted selection')
    assert.ok(calls[0].includes(ANTISTRESS_REQUIRED_BASELINE_KEY))
  }
  const preset=Object.freeze({testKeys:Object.freeze(['fixed-a','fixed-b'])})
  const fixed=selectionContext(['hh-weekly-pulse'],null,preset)
  initialize(fixed.context)
  assert.deepEqual(fixed.calls,[['fixed-a','fixed-b']],'fixed presets remain exact, without OPORA additions')
  assert.deepEqual(Array.from(preset.testKeys),['fixed-a','fixed-b'])
  for(const patch of [{stage:1},{testsTouched:true}]){
    const {context,calls}=selectionContext()
    Object.assign(context,patch);initialize(context)
    assert.equal(calls.length,0,'do not overwrite outside stage 2 or while user edits')
  }
  const extract=name=>{
    const declaration=wizard.match(new RegExp('  (?:async )?function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}'))?.[0]
    assert.ok(declaration,name+' is extracted from actual component source')
    return '('+declaration+')'
  }
  const state=selectionContext()
  const commands=[],routes=[],errors=[]
  const c=state.context
  Object.assign(c,{
    chosenTests:[],isAntistress:true,ANTISTRESS_REQUIRED_BASELINE_KEY,hasAntistressRequiredBaseline,
    setChosenTests:value=>{c.chosenTests=typeof value==='function'?value(c.chosenTests):value},
    setTestsTouched:value=>{c.testsTouched=value},
    actionLock:{current:false},busy:false,localBusy:false,openingTest:false,confirmed:false,
    optionByKey:new Map(ranked.map(item=>[item.key,{...item,definitionVersion:'fictional-v1',instrumentLocale:'en'}])),
    assessment:{planStatus:'active',planKeys:starter},data:{account:{id:'fictional-owner'}},
    setLocalBusy:()=>{},onError:message=>{if(message)errors.push(message)},ensureCurrent:()=>{},
    saveExistingAccountPlan:()=>{throw Error('existing fictional plan should be reused')},
    onCourseCommand:async(action,body)=>{
      commands.push({action,body:JSON.parse(JSON.stringify(body))})
      return {course:{id:'fictional-course',testKeys:[...body.testKeys],revision:2}}
    },
    onState:value=>{c.confirmedKeys=Object.freeze([...value.course.testKeys])},
    discardCourseEntryIntent:()=>{},setShowCompletedOptions:()=>{},isCourseCurrent:()=>true,
    onCourseRead:()=>{throw Error('initial selection has not been confirmed')},
    coursePendingKeys:()=>['hh-weekly-pulse'],startOrResumeCourseTest:async()=>({id:'fictional-run'}),
    locale:'en',root:'/en/app',boundRequest:()=>{throw Error('no real network requests in this test')},
    router:{push:path=>routes.push(path)},
  })
  initialize(c)
  const toggle=runInNewContext(extract('toggleTest'),c)
  toggle('gad-7');toggle('hh-resource-pulse');toggle('hh-weekly-pulse')
  assert.deepEqual(Array.from(c.chosenTests),['hh-weekly-pulse'],'both optional choices are removable, required Weekly is not')
  const disabled=wizard.match(/disabled=\{([^}\n]+)\} onClick=\{startCompactTests\}/)?.[1]
  assert.ok(disabled)
  assert.equal(runInNewContext(disabled,c),false,'Weekly-only is a permitted enabled CTA')
  const start=runInNewContext(extract('startCompactTests'),c)
  assert.equal(commands.length,0,'render and selection do not confirm consent automatically')
  for(const field of ['busy','localBusy','openingTest']){
    c[field]=true;await start();c[field]=false
    assert.equal(commands.length,0,'busy guards do not save or start tests')
    assert.equal(routes.length,0)
  }
  c.actionLock.current=true
  await start()
  c.actionLock.current=false
  assert.equal(commands.length,0,'in-flight action lock prevents duplicate confirmation')
  assert.equal(routes.length,0)
  c.ensureCurrent=()=>{throw Error('fictional-owner-changed')}
  await start()
  assert.deepEqual(errors,['fictional-owner-changed'])
  assert.equal(commands.length,0,'owner/lifetime guard runs before confirmation')
  assert.equal(routes.length,0)
  errors.length=0;c.ensureCurrent=()=>{}
  await start()
  assert.deepEqual(commands,[{action:'confirm-tests',body:{testKeys:['hh-weekly-pulse']}}])
  assert.deepEqual(routes,['/en/app/runs/fictional-run?mode=quick&course=1&courseId=fictional-course'])
  assert.deepEqual(errors,[])
  assert.equal(c.testsTouched,false)
  initialize(c)
  assert.deepEqual(Array.from(c.chosenTests),['hh-weekly-pulse'],'confirmation must not re-add optional tests')
  const reloaded=selectionContext(Array.from(c.confirmedKeys))
  initialize(reloaded.context)
  assert.deepEqual(reloaded.calls,[['hh-weekly-pulse']],'a remount retains the saved optional opt-out')

  assert.match(wizard,/if\(isAntistress && key===ANTISTRESS_REQUIRED_BASELINE_KEY\) return/)
  assert.match(wizard,/confirmed && baselineConfirmed && pending\.length===0/)
  assert.match(wizard,/pending\.length===0&&baselineConfirmed/)
  assert.match(wizard,/startOrResumeCourseTest/)
  assert.match(testFlow,/coursePendingKeys/)
  assert.match(css,/\.stressBaselineIntro/)
  assert.match(css,/\.requiredBadge/)
  assert.match(css,/\.optionalBadge/)
})

test('marketing and Academy course URLs retain the standard sign-up path and truthful test descriptions', () => {
  const landing=read('components/public-antistress-landing.tsx')
  const catalogue=read('components/public-growth-courses.tsx')
  assert.match(landing,/Antes de la primera lección/)
  assert.match(landing,/Перед первым уроком/)
  assert.match(landing,/Before the first lesson/)
  assert.match(landing,/GAD-7/)
  assert.match(landing,/Resource Pulse/)
  assert.match(landing,/app\/course\?program=stress/)
  assert.match(catalogue,/Weekly Pulse \(8 questions\)/)
  assert.match(catalogue,/Weekly Pulse \(8 вопросов\)/)
})

test('combined server guards allow Weekly-only Anti-Stress and preserve fixed preset contracts', async () => {
  const { coursePresetForTags, coursePresetTags, getCoursePreset, matchesFixedPresetTests } = await import('../lib/inner-growth/course-presets.js')
  const { courseProgramFromTopics } = await import('../lib/inner-growth/course-programs.js')
  const source=read('lib/app/growth-course.js')
  const start=source.indexOf('          const preset =',source.indexOf("} else if (action === 'confirm-tests')"))
  const end=source.indexOf('          // Highlighted suggestions',start)
  const check=new Function('row','keys','coursePresetForTags','matchesFixedPresetTests','hasAntistressRequiredBaseline','courseProgramFromTopics','reject',source.slice(start,end))
  const run=(tags,keys)=>check({focus_tags:tags},keys,coursePresetForTags,matchesFixedPresetTests,hasAntistressRequiredBaseline,courseProgramFromTopics,(code)=>{throw new Error(code)})
  const stress=getCourseProgram('stress')
  const tags=stress.topics || stress.focusTags || ['stress']
  assert.equal(courseProgramFromTopics(tags)?.id,'stress')
  assert.doesNotThrow(()=>run(tags,['hh-weekly-pulse']))
  assert.throws(()=>run(tags,['gad-7']),/COURSE_ANTISTRESS_BASELINE_REQUIRED/)
  for(const id of ['calm_balance','business_focus','confidence']){
    const preset=getCoursePreset(id)
    assert.doesNotThrow(()=>run(coursePresetTags(id),preset.testKeys))
    assert.throws(()=>run(coursePresetTags(id),preset.testKeys.slice(1)),/COURSE_PRESET_TESTS_FIXED/)
  }
  assert.match(source,/const stressIntake=row\?\.stage===2 && !coursePresetForTags/)
  assert.match(source,/const recentStress=!preset &&/)
})

test('actual T0 recency recheck preserves the separate fixed preset battery',()=>{
 const source=read('lib/app/growth-course.js')
 const block=source.slice(source.indexOf("} else if (action === 'choose-goals')"),source.indexOf('          let goals, scales = []'))
 assert.match(block,/if \(!coursePresetForTags\(row.focus_tags\) && courseProgramFromTopics\(row.focus_tags\|\|\[\]\)\?\.id==='stress'\)/)
 assert.match(block,/where account_id=\$1/)
 assert.match(block,/\[actor.id\]/)
 assert.match(block,/compatibleResult\(before,key,\{requireRecent:true\}\)/)
})
