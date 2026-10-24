import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachingGentleGuide,coachingQuickChoicesAllowed} from '../lib/personal-coaching/gentle-dialogue.js'

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
