import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachingGentleGuide,coachingQuickChoicesAllowed,coachingConversationTurn} from '../lib/personal-coaching/gentle-dialogue.js'
import ts from 'typescript'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const stages=['goal','outcome','reality','obstacle','scaling','knowhow','resources',
  'options','design','will','plan','when','review','dream','destiny','affirm','explore']

test('quick choice is allowed only during first orientation; all later model steps are open',()=>{
  const multi={id:'first',type:'single_choice',choices:[{id:'a'},{id:'b'}]}
  const scale={id:'scale',type:'scale_0_10',choices:[{id:'3'}]}
  assert.equal(coachingQuickChoicesAllowed(multi,0),true)
  assert.equal(coachingQuickChoicesAllowed(multi,1),false)
  assert.equal(coachingQuickChoicesAllowed(scale,0),false)
  assert.equal(coachingQuickChoicesAllowed({examples:['work','life']},0),true)
  assert.equal(coachingQuickChoicesAllowed({id:'open'},1),false)
})

test('all representative scheme stages provide gentle, localized, nonclinical guidance',()=>{
  for(const stage of stages){
    const q={id:stage,stepKey:stage,type:'single_choice'}
    for(const lang of ['en','ru','es']){
      const guide=coachingGentleGuide(q,3,8,lang)
      assert.ok(guide.label.length>7,stage+' / '+lang)
      assert.ok(guide.hint.length>26,stage+' / '+lang)
      assert.equal(/[?!]$/.test(guide.hint),false,'hint must not add another question')
      assert.ok(!/diagnos|терапи|диагноз/i.test(guide.hint))
    }
  }
  assert.equal(coachingGentleGuide({stage:'stage_3'},4,10,'ru').phase,'reality')
  assert.equal(coachingGentleGuide({stage:'finish'},9,10,'es').phase,'action')
})

test('the existing personal and two symbolic runners share the same written-first rule',()=>{
  const ui=source('components/app/personal-coaching.jsx')
  const symbolic=source('components/app/tradition-coaching.jsx')
  const backend=source('lib/app/personal-coaching.js')
  const publicUi=source('components/public-coaching-discovery.jsx')
  assert.match(ui,/coachingQuickChoicesAllowed\(question,index\)/)
  assert.match(ui,/data-coaching-open-reflection/)
  assert.match(symbolic,/coachingQuickChoicesAllowed\(question,index\)/)
  assert.match(symbolic,/data-tradition-open-reflection/)
  assert.match(backend,/answer\?\.choiceId/)
  assert.match(publicUi,/coachingQuickChoicesAllowed\(current,index\)/)
  assert.match(publicUi,/data-public-coaching-open-reflection/)
  assert.match(publicUi,/speechConsent=\{speechConsent\}/)
  assert.match(publicUi,/onListeningChange=\{setDictating\}/)
  assert.doesNotMatch(ui+symbolic,/localStorage|sessionStorage|sendBeacon|MediaRecorder/)
})


test('answer-aware coach replies vary by actual choice, words, score, uncertainty and skipped step',()=>{
  const first={id:'goal',stepKey:'goal',choices:[{id:'clarity',label:{en:'More clarity',ru:'Больше ясности',es:'Más claridad'}},{id:'not_sure',label:{en:'Not sure yet',ru:'Пока не знаю',es:'Aún no lo sé'}}]}
  const next={id:'reality',stepKey:'reality'}
  for(const [lang,choice,selected] of [
    ['en','More clarity','You chose:'],['ru','Больше ясности','Вы выбрали:'],
    ['es','Más claridad','Elegiste:'],
  ]){
    const turn=coachingConversationTurn({question:next,previousQuestion:first,
      previousAnswer:'choice:clarity',index:1,total:4,locale:lang})
    assert.equal(turn.quote,choice)
    assert.equal(turn.response,selected)
    assert.ok(turn.bridge.length>30)
    assert.doesNotMatch(turn.speech,new RegExp(choice),'never send the private answer to device TTS')
    assert.ok(!turn.speech.includes('choice:'))
  }
  const uncertain=coachingConversationTurn({question:next,previousQuestion:first,
    previousAnswer:'choice:not_sure',index:1,total:4,locale:'ru'})
  assert.match(uncertain.response,/Необязательно/)
  assert.equal(uncertain.quote,'')
  const skipped=coachingConversationTurn({question:next,previousQuestion:first,
    previousAnswer:null,index:1,total:4,locale:'en'})
  assert.match(skipped.response,/leave that question open/)
  assert.equal(skipped.quote,'')
  const opening=coachingConversationTurn({question:first,index:0,total:4,locale:'en'})
  assert.match(opening.speech,/no perfect answer/i)
  assert.equal(opening.quote,'')
  const scale=coachingConversationTurn({question:next,previousQuestion:{type:'scale_0_10'},
    previousAnswer:'choice:4',index:3,total:5,locale:'en'})
  assert.equal(scale.quote,'4/10')
  const forged=coachingConversationTurn({question:next,previousQuestion:first,
    previousAnswer:'choice:unrecognized',index:1,total:5,locale:'en'})
  assert.equal(forged.quote,'')
})

test('spoken coaching reply uses only redacted, bounded user words; reflections override chips',()=>{
  const now={id:'action',stepKey:'will'}
  const prior={choices:[{id:'a',label:{en:'Option A'}}]}
  const written=coachingConversationTurn({question:now,previousQuestion:prior,
    previousAnswer:'choice:a',previousReflection:'I want a small experiment on Tuesday',
    index:3,total:4,locale:'en'})
  assert.equal(written.quote,'I want a small experiment on Tuesday')
  assert.match(written.response,/put it this way/)
  const long='Talk to person@example.com on https://example.com about '+('specific words '.repeat(20))+' +1 416 555 3310'
  const safe=coachingConversationTurn({question:now,previousAnswer:long,index:3,total:4,locale:'en'})
  assert.ok(safe.quote.length<=97)
  assert.ok(!safe.speech.includes('person@example.com'))
  assert.ok(!safe.speech.includes('https://'))
  assert.ok(!safe.speech.includes('specific words'))
  const symbolic=coachingConversationTurn({question:now,previousQuestion:prior,
    previousAnswer:{choiceId:'a',note:'I could ask for feedback'},index:3,total:4,locale:'en'})
  assert.equal(symbolic.quote,'I could ask for feedback')
  const urgent=coachingConversationTurn({question:now,previousAnswer:'I might kill myself',
    index:2,total:4,locale:'en'})
  assert.equal(urgent.quote,'')
  assert.match(urgent.response,/urgent local help/)
  assert.ok(!urgent.speech.includes('kill myself'))
  const followup=coachingConversationTurn({question:prior,previousQuestion:prior,
    previousAnswer:'choice:a',index:0,total:5,locale:'en',followup:true})
  assert.equal(followup.quote,'Option A')
  assert.match(followup.bridge,/Before we move on/)
})

test('guest, signed-in and Egyptian/Greek runners share contextual visibly spoken turns',()=>{
  const guest=source('components/public-coaching-discovery.jsx')
  const signed=source('components/app/personal-coaching.jsx')
  const symbolic=source('components/app/tradition-coaching.jsx')
  const component=source('components/coaching-dialogue-turn.jsx')
  const css=source('components/coaching-dialogue-turn.module.css')
  for(const [name,ui] of [['guest',guest],['personal',signed],['tradition',symbolic]]){
    assert.match(ui,/coachingConversationTurn\(\{/,'context derived in '+name)
    assert.match(ui,/<CoachingChatThread turn=\{conversationTurn\}/,'chat-shaped reply in '+name)
    assert.match(ui,/previousReply=/,'user reply preserved in context: '+name)
    assert.match(ui,/data-coaching-composer/,'editable messenger composer: '+name)
    assert.match(ui,/conversationTurn\?\.speech/,'same reply read aloud in '+name)
    assert.match(ui,/previousAnswer:/,'previous answer from session in '+name)
    assert.doesNotMatch(ui,/dangerouslySetInnerHTML/,'no raw HTML echo in '+name)
    const file=name==='guest'?'components/public-coaching-discovery.jsx':
      name==='personal'?'components/app/personal-coaching.jsx':'components/app/tradition-coaching.jsx'
    const parsed=ts.createSourceFile(file,ui,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.equal(parsed.parseDiagnostics.length,0,name+' JSX syntax')
  }
  for(const ui of [guest,signed]){
    assert.match(ui,/<CoachingChatThread turn=\{followupTurn\}/)
    assert.match(ui,/followupTurn\?\.speech/)
  }
  assert.match(component,/data-coaching-conversational-turn/)
  assert.match(component,/<q className=\{styles\.quote\}>/)
  assert.doesNotMatch(component,/dangerouslySetInnerHTML/)
  assert.match(css,/@media\(max-width:430px\)/)
  assert.match(css,/overflow-wrap:anywhere/)
  const parsed=ts.createSourceFile('components/coaching-dialogue-turn.jsx',component,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.equal(parsed.parseDiagnostics.length,0)
})


test('all three coaching runners share a localized portrait chat without pretending to be live',()=>{
  const ui=source('components/coaching-chat-thread.jsx')
  const css=source('components/coaching-chat-thread.module.css')
  for(const text of ['data-coaching-chat-thread','data-coaching-chat-user-turn',
    'data-coaching-chat-coach-turn','portrait-static/andy-96-b9d7800d1448.webp']){
    assert.ok(ui.includes(text),text)
  }
  for(const message of ['Self-guided session · not a live chat',
    'Самостоятельная сессия · не живой чат',
    'Sesión autoguiada · no es un chat en vivo']){
    assert.ok(ui.includes(message),message)
  }
  assert.match(ui,/Array\.from\(previous\)\.slice\(0,260\)/)
  assert.doesNotMatch(ui,/fetch\(|localStorage|sessionStorage|dangerouslySetInnerHTML|typingIndicator/)
  assert.match(css,/@media\(max-width:430px\)/)
  assert.match(css,/@media\(max-width:350px\)/)
  const parsed=ts.createSourceFile('components/coaching-chat-thread.jsx',ui,
    ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.equal(parsed.parseDiagnostics.length,0,'shared JSX parses')
})
