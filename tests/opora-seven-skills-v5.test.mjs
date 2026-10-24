import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'
import { OPORA_SEVEN_SKILLS, oporaSkillCards, oporaSkillForDay, oporaSkillPassportValid,
  COURSE_ANTISTRESS_SKILLS_V5, OPORA_SKILL_SLIDE_MODEL } from '../lib/inner-growth/anti-stress-skills-v5.js'
import { lessonFor, COURSE_ANTISTRESS_OUTCOME_V3 } from '../lib/inner-growth/lesson-library.js'
import { buildCourseSlides, verifyCourseSlideVisitOrder } from '../lib/inner-growth/course-slide-sequence.js'
import { antiStressBlueprint } from '../lib/inner-growth/anti-stress-blueprint.js'

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('AS-5.0 specifies seven skills introduced in week one and revisited in week two',()=>{
 assert.equal(COURSE_ANTISTRESS_SKILLS_V5,'hh-antistress-skills-v5-20261017')
 assert.equal(oporaSkillPassportValid(),true)
 assert.equal(OPORA_SEVEN_SKILLS.length,7)
 for(const locale of ['ru','en']){
   const skills=oporaSkillCards(locale)
   assert.deepEqual(skills.map(row=>row.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
   for(let day=1;day<=14;day++){
     const l=oporaSkillForDay(day,locale)
     const index=(day-1)%7
     assert.equal(l.skillId,skills[index].id)
     assert.equal(l.week,day<=7?1:2)
     assert.equal(l.practiceMode,day<=7?'guided_optional':'independent_or_hint')
     assert.equal(l.slideModel,OPORA_SKILL_SLIDE_MODEL)
     assert.equal(l.durationSeconds,540)
     assert.ok(l.guide.length>75&&l.action.length>35)
     assert.equal(l.skill,skills[index].title)
     assert.notEqual(l.title,(day<=7?oporaSkillForDay(day+7,locale):oporaSkillForDay(day-7,locale)).title)
   }
 }
})

test('New V5 enrolments have seven compact slides; older V3 lessons preserve 15 screens and immutable IDs',()=>{
 for(const lang of ['ru','en']){
   for(let day=1;day<=14;day++){
     const v5=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V5)
     const old=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_OUTCOME_V3)
     assert.ok(v5&&old)
     assert.notEqual(v5.id,old.id)
     assert.equal(v5.antiStress.slideModel,OPORA_SKILL_SLIDE_MODEL)
     assert.equal(v5.antiStress.week,day<=7?1:2)
     const slides=buildCourseSlides(v5)
     assert.deepEqual(slides.map(item=>item.kind),['welcome','checkin','guided','ritual','transfer','reflection','feedback'])
     assert.equal(new Set(slides.map(s=>s.key)).size,7)
     assert.equal(slides[2].section.kind,'meditation')
     assert.ok(v5.durationSeconds>=480&&v5.durationSeconds<=720)
     assert.equal(verifyCourseSlideVisitOrder(slides,slides.map(s=>s.key)),true)
     assert.equal(verifyCourseSlideVisitOrder(slides,slides.map(s=>s.key).slice(0,-1)),false)
     assert.equal(buildCourseSlides(old).length,15)
     assert.match(old.id,/hh-antistress-outcomes-v3-20261014/)
   }
 }
})

test('Public V6 fifteen-screen preview preserves seven skill IDs and supports all three public languages',()=>{
 for(const locale of ['ru','en','es']){
   const blueprint=antiStressBlueprint(locale)
   assert.equal(blueprint.skills.length,7)
   assert.equal(blueprint.days.length,14)
   assert.deepEqual(blueprint.skills.map(skill=>skill.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
   for(let day=1;day<=14;day++){
     const d=blueprint.days[day-1]
     const ref=oporaSkillForDay(day,locale==='es'?'en':locale)
     assert.equal(d.day,day)
     assert.equal(d.skillId,ref.skillId)
     assert.equal(d.week,ref.week)
     assert.equal(d.checkDay,day>7)
     assert.equal(d.screens.length,15)
     assert.ok(d.screens.every(s=>s.expected.length>=10))
     assert.equal(d.methodStatus,'implemented')
     assert.equal(d.methodNames.length,3)
   }
 }
})

test('V5 remains version-pinned while new AS2 cycles select V6 and keep old module routes',()=>{
 const server=read('lib/app/growth-daily.js')
 const player=read('components/app/course-slide-player.jsx')
 const passport=read('docs/myspace/HOLISTIC_HOUSE_OPORA_ANTISTRESS_7_SKILLS_COURSE_PASSPORT_AS5_2026-10-17.md')
 assert.match(server,/\? COURSE_ANTISTRESS_SKILLS_V7 : COURSE_CONTENT_V4/)
 assert.match(server,/const firstStressDay=Boolean\(version===COURSE_ANTISTRESS_OUTCOME_V3/)
 assert.match(server,/verifyCourseSlideVisitOrder\(requiredSlides,input.visitedSlideKeys\)/)
 assert.match(player,/const isSkillV5=Boolean\(lesson\.antiStress\?\.slideModel===OPORA_SKILL_SLIDE_MODEL/)
 assert.match(player,/!isSkillV5 && lesson\.antiStress/)
 assert.match(player,/isSkillV5\?'8–12'/)
 assert.match(passport,/Неделя|неделя/)
 assert.match(passport,/ПТСР/)
 assert.match(passport,/AS4/)
})

// Execute the selected JSX and handlers from the real player. Guard order,
// whitespace and parentheses are deliberately not part of this contract.
const PLAYER_PATH='components/app/course-slide-player.jsx'
const OPTIONAL_SLIDES=['baseline','checkin','guided','ritual','transfer','symbol','moment','reflection']
const CHOICE_GROUPS=[
  ['practiceAttempt','setPracticeAttempt',['tried','simplified','neutral']],
  ['comfort','setComfort',['comfortable','neutral','uncomfortable']],
  ['usefulness','setUsefulness',['useful','unchanged','unsure']],
  ['flexibility','setFlexibility',['more_choice','same','unsure']],
]
const descendants=node=>{
  const result=[]
  const visit=item=>{result.push(item);ts.forEachChild(item,visit)}
  visit(node)
  return result
}
function playerContract(source=read(PLAYER_PATH)){
  const file=ts.createSourceFile(PLAYER_PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.deepEqual(file.parseDiagnostics,[],'Player JSX must parse before checking its controls')
  const all=descendants(file)
  const one=(predicate,label)=>{
    const matches=all.filter(predicate)
    assert.equal(matches.length,1,'Expected exactly one '+label)
    return matches[0]
  }
  const button=name=>one(node=>ts.isJsxElement(node)&&node.openingElement.tagName.getText(file)==='button'&&
    node.openingElement.attributes.properties.some(prop=>ts.isJsxAttribute(prop)&&prop.name.text==='className'&&
      ts.isJsxExpression(prop.initializer)&&ts.isPropertyAccessExpression(prop.initializer.expression)&&
      prop.initializer.expression.expression.getText(file)==='styles'&&prop.initializer.expression.name.text===name),
  name+' button')
  const guard=name=>{
    let node=button(name).parent
    while(node&&!ts.isJsxExpression(node))node=node.parent
    assert.ok(node?.expression,'Missing JSX guard for '+name)
    return node.expression
  }
  return {source,file,button,guard,
    fn:name=>one(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name,name+' function'),
    choices:setter=>one(node=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&
      node.expression.name.text==='map'&&ts.isArrayLiteralExpression(node.expression.expression)&&
      node.arguments.some(arg=>descendants(arg).some(child=>ts.isCallExpression(child)&&
        ts.isIdentifier(child.expression)&&child.expression.text===setter)),setter+' choice map'),
    initial:name=>{
      const declaration=one(node=>ts.isVariableDeclaration(node)&&ts.isArrayBindingPattern(node.name)&&
        node.name.elements[0]?.name?.getText(file)===name,name+' state initializer')
      assert.ok(ts.isCallExpression(declaration.initializer))
      assert.equal(declaration.initializer.expression.getText(file),'useState')
      return declaration.initializer.arguments[0]
    },
  }
}
const compiledExpressions=new Map()
function execute(node,contract,scope){
  const source=node.getText(contract.file)
  let compiled=compiledExpressions.get(source)
  if(!compiled){
    compiled=ts.transpileModule('const value = ('+source+');',{
      fileName:'opora-optional-control.tsx',compilerOptions:{
        target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React,
      },
    }).outputText
    compiledExpressions.set(source,compiled)
  }
  return new Function(...Object.keys(scope),compiled+'\nreturn value;')(...Object.values(scope))
}
const textOf=node=>node==null||typeof node==='boolean'?'':Array.isArray(node)?node.map(textOf).join(''):
  typeof node==='object'?textOf(node.props?.children):String(node)
const labelObject=new Proxy({}, {get:(_,name)=>String(name)})
function controlContext(contract,overrides={}){
  const events=[],state={index:overrides.index??0,welcomeFeeling:'',error:'previous error'}
  const slides=Array.from({length:3},(_,index)=>({key:'slide-'+index}))
  const visitedSlideKeys={current:new Set()}
  const record=name=>(...args)=>events.push([name,...args])
  const scope={
    React,styles:labelObject,words:labelObject,learning:labelObject,
    SkipForward:'SkipForward',ArrowRight:'ArrowRight',Check:'Check',CheckCircle2:'CheckCircle2',
    finished:false,isSkillV5:false,isDayOne:false,locked:false,discomfortOpen:false,
    slide:{kind:'guided'},slides,index:state.index,lesson:{antiStress:{}},isOporaModule:false,
    earned:false,rewardStep:0,reviewOnly:false,locale:'en',severity:null,today:null,
    practiceAttempt:'',comfort:'skip',usefulness:'skip',flexibility:'skip',welcomeFeeling:'',
    reflection:'',beforeNow:null,afterNow:null,session:null,
    visitedSlideKeys,submitting:{current:false},checkinOp:{current:null},
    crypto:{randomUUID:()=> 'synthetic-checkin'},
    setIndex:update=>{state.index=typeof update==='function'?update(state.index):update;events.push(['index',state.index])},
    setError:value=>{state.error=value;events.push(['error',value])},
    setWelcomeFeeling:value=>{state.welcomeFeeling=value;events.push(['welcomeFeeling',value])},
    setRewardStep:record('rewardStep'),setSaving:record('saving'),onCheckin:record('checkin'),
    onFinish:record('finish'),onClose:record('close'),finishLesson:record('finishLesson'),
    setFeedback:record('feedback'),setDiscomfortOpen:record('discomfort'),
    ...Object.fromEntries(CHOICE_GROUPS.map(([,setter])=>[setter,record(setter)])),
    ...overrides,
  }
  scope.goNext=execute(contract.fn('goNext'),contract,scope)
  scope.saveCheckin=execute(contract.fn('saveCheckin'),contract,scope)
  return {scope,events,state,visitedSlideKeys,
    render:name=>execute(contract.guard(name),contract,scope),
  }
}
function assertAdvanced(context,from=0){
  assert.equal(context.state.index,Math.min(from+1,context.scope.slides.length-1),'Actual goNext must advance once')
  assert.equal(context.state.error,'','Actual goNext must clear a previous error')
  assert.deepEqual([...context.visitedSlideKeys.current],['slide-'+Math.min(from+1,2)],'Record the next visited slide')
}
function verifyFooterSkip(contract){
  for(const finished of [false,true])for(const isSkillV5 of [false,true])for(const isDayOne of [false,true]){
    for(const kind of [...OPTIONAL_SLIDES,'welcome','understand','idea','recall','phrase','feedback','free_offer','day1-exit','unknown']){
      for(const locked of [false,true]){
        const context=controlContext(contract,{finished,isSkillV5,isDayOne,locked,slide:{kind}})
        const button=context.render('skip')
        const expected=!finished&&!isSkillV5&&!isDayOne&&OPTIONAL_SLIDES.includes(kind)
        assert.equal(Boolean(button),expected,`Footer skip visibility: ${JSON.stringify({finished,isSkillV5,isDayOne,kind})}`)
        if(!expected)continue
        assert.equal(button.type,'button')
        assert.equal(button.props.type,'button')
        assert.equal(button.props.disabled,locked,'Footer skip respects locked state')
        assert.equal(button.props.onClick,context.scope.goNext,'Footer skip uses the real goNext handler')
        assert.equal(textOf(button),kind==='checkin'?'skipRating':'skip','Footer skip keeps the appropriate action label')
        if(!locked){button.props.onClick();assertAdvanced(context)}
      }
    }
  }
}
function verifyWelcomeSkip(contract){
  for(const isSkillV5 of [false,true])for(const isDayOne of [false,true])for(const locked of [false,true]){
    const context=controlContext(contract,{isSkillV5,isDayOne,locked})
    const button=context.render('welcomeSkip')
    assert.equal(Boolean(button),!isSkillV5&&!isDayOne,'Welcome skip excludes V5 and day one')
    if(!button)continue
    assert.equal(button.type,'button')
    assert.equal(button.props.disabled,locked,'Welcome skip respects locked state')
    assert.equal(textOf(button),'welcomeSkip')
    if(!locked){
      button.props.onClick()
      assert.equal(context.state.welcomeFeeling,'skip','Welcome skip records the legacy value')
      assert.deepEqual(context.events,[['welcomeFeeling','skip'],['error',''],['index',1]],'Record skip before advancing exactly once')
      assertAdvanced(context)
    }
  }
}
function verifyChoiceGroups(contract){
  for(const [stateName,setter,keys] of CHOICE_GROUPS){
    for(const isSkillV5 of [false,true])for(const locked of [false,true]){
      const context=controlContext(contract,{isSkillV5,locked})
      const buttons=execute(contract.choices(setter),contract,context.scope)
      assert.deepEqual(buttons.map(button=>button.key),isSkillV5?keys:[...keys,'skip'],stateName+' preserves legacy choices without a V5 skip')
      for(const button of buttons){
        assert.equal(button.type,'button')
        assert.equal(button.props.disabled,locked,stateName+' choices respect locked state')
        if(button.key==='skip')assert.equal(textOf(button),stateName==='practiceAttempt'?'practiceSkip':'preferNot',stateName+' keeps its legacy skip label')
        if(!locked){
          context.events.length=0
          button.props.onClick()
          const expected=[[setter,button.key]]
          if(stateName==='comfort'&&button.key==='uncomfortable')expected.push(['feedback','uncomfortable'],['discomfort',true])
          assert.deepEqual(context.events,expected,stateName+' saves the selected value without navigation')
        }
      }
    }
  }
}
function verifyLegacyState(contract){
  for(const name of ['comfort','usefulness','flexibility','practiceAttempt']){
    const initial=contract.initial(name)
    const empty=execute(initial,contract,{session:null})
    assert.equal(empty,name==='practiceAttempt'?'':'skip',name+' keeps its optional unanswered default')
    for(const value of ['skip',name==='practiceAttempt'?'tried':'synthetic-saved-value']){
      assert.equal(execute(initial,contract,{session:{signals:{[name]:value}}}),value,name+' restores the saved value')
    }
  }
}
function verifyMainContinuation(contract){
  for(const isSkillV5 of [false,true])for(const isDayOne of [false,true]){
    for(const kind of ['welcome',...OPTIONAL_SLIDES,'feedback'])for(const locked of [false,true]){
      const context=controlContext(contract,{isSkillV5,isDayOne,locked,slide:{kind}})
      const button=context.render('primary')
      assert.ok(button,'Unanswered optional fields must not hide Continue')
      assert.equal(button.props.disabled,locked,'Only locked state disables Continue, not unanswered optional fields')
      if(!locked){button.props.onClick();assertAdvanced(context)}
    }
    const final=controlContext(contract,{isSkillV5,isDayOne,index:2,slide:{kind:'feedback'}})
    final.render('primary').props.onClick()
    assert.deepEqual(final.events,[['finishLesson']],'The final footer dispatches finishLesson without requiring optional answers')
  }
  const legacyCheckin=controlContext(contract,{slide:{kind:'checkin'},lesson:{antiStress:null}})
  legacyCheckin.render('primary').props.onClick()
  assertAdvanced(legacyCheckin)
  assert.equal(legacyCheckin.events.some(([event])=>event==='checkin'),false,'An absent optional check-in rating does not submit a rating')
  assert.equal(Boolean(controlContext(contract,{discomfortOpen:true}).render('primary')),false,'Discomfort support keeps the normal footer hidden')
}

test('V5 practice screens omit visible footer Skip; eligible legacy slides advance through the real handler',()=>{
  verifyFooterSkip(playerContract())
})
test('Welcome Skip preserves its legacy value-before-navigation behavior and V5/day-one exclusions',()=>{
  verifyWelcomeSkip(playerContract())
})
test('Optional practice and feedback choices preserve legacy skip without rendering it for V5',()=>{
  verifyChoiceGroups(playerContract())
})
test('Saved legacy skip values and unanswered optional state remain supported',()=>{
  verifyLegacyState(playerContract())
})
test('The main footer continues and dispatches completion without optional answers',()=>{
  verifyMainContinuation(playerContract())
})

test('Optional-control checks reject executable source regressions rather than matching guard spelling',async t=>{
  const original=playerContract()
  const replace=(node,from,to)=>{
    const snippet=node.getText(original.file)
    assert.equal(snippet.split(from).length,2,'Mutation target must occur exactly once: '+from)
    return original.source.slice(0,node.getStart(original.file))+snippet.replace(from,to)+original.source.slice(node.end)
  }
  const mutants=[
    ['finished lessons expose footer skip',original.guard('skip'),'!finished&&','',verifyFooterSkip],
    ['V5 exposes footer skip',original.guard('skip'),'!isSkillV5','true',verifyFooterSkip],
    ['day one exposes footer skip',original.guard('skip'),'!isDayOne','true',verifyFooterSkip],
    ['an ineligible slide exposes footer skip',original.guard('skip'),"['baseline'","['welcome','baseline'",verifyFooterSkip],
    ['an eligible slide loses footer skip',original.guard('skip'),"'guided',",'',verifyFooterSkip],
    ['footer skip ignores locked',original.guard('skip'),'disabled={locked}','disabled={false}',verifyFooterSkip],
    ['footer skip calls the wrong handler',original.guard('skip'),'onClick={goNext}','onClick={onClose}',verifyFooterSkip],
    ['goNext stops advancing',original.fn('goNext'),'current+1','current',verifyFooterSkip],
    ['V5 exposes welcome skip',original.guard('welcomeSkip'),'!isSkillV5','true',verifyWelcomeSkip],
    ['day one exposes welcome skip',original.guard('welcomeSkip'),'!isDayOne','true',verifyWelcomeSkip],
    ['welcome skip ignores locked',original.guard('welcomeSkip'),'disabled={locked}','disabled={false}',verifyWelcomeSkip],
    ['welcome skip saves the wrong value',original.guard('welcomeSkip'),"setWelcomeFeeling('skip')","setWelcomeFeeling('')",verifyWelcomeSkip],
    ['welcome skip does not advance',original.guard('welcomeSkip'),'goNext()','',verifyWelcomeSkip],
    ['welcome skip advances before recording',original.guard('welcomeSkip'),"setWelcomeFeeling('skip'); goNext()","goNext(); setWelcomeFeeling('skip')",verifyWelcomeSkip],
    ['legacy comfort loses skip default',original.initial('comfort'),"'skip'","''",verifyLegacyState],
    ['legacy practice loses its saved response',original.initial('practiceAttempt'),"session?.signals?.practiceAttempt || ''","''",verifyLegacyState],
    ['Continue requires an optional answer',original.guard('primary'),'disabled={locked}','disabled={locked||!practiceAttempt}',verifyMainContinuation],
    ['Continue hides without an optional answer',original.guard('primary'),'!discomfortOpen &&','!discomfortOpen && practiceAttempt &&',verifyMainContinuation],
    ['Continue calls the wrong handler',original.guard('primary'),': goNext}',': onClose}',verifyMainContinuation],
    ['completion calls the wrong handler',original.guard('primary'),'() => void finishLesson()','() => void onClose()',verifyMainContinuation],
  ]
  for(const [name,setter] of CHOICE_GROUPS){
    const node=original.choices(setter)
    mutants.push(
      [name+' exposes skip for V5',node,'!isSkillV5','true',verifyChoiceGroups],
      [name+' loses legacy skip',node,'!isSkillV5','false',verifyChoiceGroups],
      [name+' ignores locked',node,'disabled={locked}','disabled={false}',verifyChoiceGroups],
    )
  }
  for(const [name,node,from,to,verify] of mutants){
    await t.test(name,()=>{
      const mutated=playerContract(replace(node,from,to))
      assert.throws(()=>verify(mutated),{name:'AssertionError'},'The executable contract must reject '+name)
    })
  }
  await t.test('equivalent reordered and parenthesized guard remains valid',()=>{
    const equivalent=playerContract(replace(original.guard('skip'),
      '!finished&&!isSkillV5&&!isDayOne&&','(!isDayOne) && (!finished) && (!isSkillV5) &&'))
    verifyFooterSkip(equivalent)
  })
})
