import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {rehearsalCatalog,createCoachRehearsal,coachRehearsalView,advanceCoachRehearsal,coachRehearsalFeedback,appendRehearsalDictation,rehearsalReplyCue} from '../lib/coaching/coach-rehearsal.mjs'

test('adaptive and legacy rehearsal across six scenarios, three locales, both difficulties; private words are not spoken',()=>{
 for(const locale of ['en','ru','es']){
  const uncertainty={en:'I am not sure',ru:'Я не знаю',es:'No estoy segura'}[locale]
  for(const item of rehearsalCatalog(locale))for(const difficulty of ['standard','challenge']){
   const config={scenarioId:item.id,locale,difficulty,goal:'PRIVATE_GOAL'}
   const limit=difficulty==='standard'?3:4
   let legacy=createCoachRehearsal(config)
   for(let i=0;i<limit;i++){assert.equal(coachRehearsalView(legacy).prompt,item.prompts[i]);legacy=advanceCoachRehearsal(legacy,'A reply')}
   assert.equal(coachRehearsalView(legacy).done,true)
   for(const cue of ['PRIVATE_REPLY?',uncertainty]){
    let state=createCoachRehearsal({...config,adaptive:true})
    assert.equal(coachRehearsalView(state).prompt,item.prompts[0])
    const before=state
    state=advanceCoachRehearsal(state,cue)
    assert.equal(before.answers.length,0)
    const prompt=coachRehearsalView(state).prompt
    assert.notEqual(prompt,item.prompts[1]);assert.ok(!prompt.includes('PRIVATE_'));assert.ok(prompt.length>0)
    state=advanceCoachRehearsal(state,cue)
    assert.equal(coachRehearsalView(state).prompt,item.prompts[2])
    while(!coachRehearsalView(state).done)state=advanceCoachRehearsal(state,'A reply')
    assert.equal(coachRehearsalFeedback(state).evidenceQuote,cue)
    assert.equal(coachRehearsalFeedback(state).source,'actual_client_reply')
    assert.throws(()=>advanceCoachRehearsal(state,'Extra'),/REHEARSAL_FINISHED/)
   }
  }
 }
 assert.throws(()=>createCoachRehearsal({scenarioId:'salary',goal:'Goal',adaptive:'yes'}),/INVALID_REHEARSAL_CONFIG/)
})
test('device dictation fills an editable bounded draft, not a submitted answer',()=>{
 assert.equal(appendRehearsalDictation('Existing words',' new words'),'Existing words new words')
 assert.equal(appendRehearsalDictation('Existing words',' '),'Existing words')
 assert.equal(appendRehearsalDictation('x'.repeat(799),'too long').length,800)
 assert.equal(rehearsalReplyCue('Я не знаю','ru'),'uncertainty')
 assert.equal(rehearsalReplyCue('No sé','es'),'uncertainty')
 assert.equal(rehearsalReplyCue('Can you clarify?','en'),'question')
})
test('existing speech adapter is opt-in, guarded per turn, stopped on close, with verified takeaway-only save',()=>{
 const ui=readFileSync(new URL('../components/app/coach-rehearsal.jsx',import.meta.url),'utf8')
 for(const value of ["import CoachingQuestionVoice from './coaching-question-voice'","text={view.prompt}","speechConsent={speechConsent}","voiceTurnRef.current===state","setReply(old=>appendRehearsalDictation(old,delta))","listeningRef.current)return","if(!open)stopVoice()","old===state?advanceCoachRehearsal(old,reply):old","const entry=await saver.current.save(pending.current)","setSavedEntry({id:entry.id,revision:entry.revision})","tags:['hh-coach-rehearsal-v1']"])assert.ok(ui.includes(value),value)
 assert.ok(!ui.includes('onTranscript={answer}'))
})
