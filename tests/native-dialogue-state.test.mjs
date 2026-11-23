import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {emptyNativeDialogueState,isValidNativeDialogueState,transitionNativeDialogueState} from '../lib/holistic-support/native-dialogue-state.mjs';

function apply(state,type,data={}){return transitionNativeDialogueState(state,{turnId:'turn-'+(state.revision+1),expectedRevision:state.revision,type,...data});}
test('a rejected stored time is cleared only when it matches',()=>{
 let state=apply(emptyNativeDialogueState(),'set_goal',{value:'consultation'}).state;
 state=apply(state,'set_time',{value:'morning'}).state;
 assert.throws(()=>apply(state,'clear_time',{value:'evening'}),/INVALID_EVENT/);
 state=apply(state,'clear_time',{value:'morning'}).state;
 assert.equal(state.timePreference,null);assert.equal(state.goal.value,'consultation');
});
test('explicit meditation refusal persists until a later explicit reversal',()=>{
 let state=emptyNativeDialogueState();
 state=apply(state,'offer_choices',{choiceIds:['service:one','youtube:abcdefghijk']}).state;
 state=apply(state,'refuse_meditation').state;
 assert.equal(state.declinedMeditation?.value,'meditation');assert.deepEqual(state.lastOfferedChoices,[]);
 state=apply(state,'ordinary').state;assert.equal(state.declinedMeditation?.value,'meditation');
 state=apply(state,'allow_meditation').state;assert.equal(state.declinedMeditation,null);
});
test('refusing advice survives ordinary turns and topic changes until reversal',()=>{
 let state=apply(emptyNativeDialogueState(),'refuse_advice').state;
 assert.equal(state.declinedAdvice.value,'advice');
 state=apply(state,'ordinary').state;assert.equal(state.declinedAdvice.value,'advice');
 state=apply(state,'allow_advice').state;assert.equal(state.declinedAdvice,null);
 state=apply(state,'refuse_advice').state;
 state=apply(state,'set_topic',{value:'work',newTopic:true}).state;assert.equal(state.declinedAdvice.value,'advice');
});
test('ending a conversation clears session preferences and pending state',()=>{
 let state=apply(emptyNativeDialogueState(),'refuse_advice').state;
 state=apply(state,'refuse_meditation').state;
 state=transitionNativeDialogueState(state,{type:'ordinary',turnId:'pending',expectedRevision:state.revision},
  {pendingAdviceConfirmation:true,pendingJudgmentTurnId:'judgment-token'}).state;
 state=apply(state,'stop').state;
 assert.equal(state.declinedAdvice,null);assert.equal(state.declinedMeditation,null);
 assert.equal(state.pendingAdviceConfirmation,false);assert.equal(state.pendingJudgmentTurnId,null);
});
test('advice clarification is server-controlled, single-turn and requires a refusal',()=>{
 const start=emptyNativeDialogueState();
 assert.throws(()=>transitionNativeDialogueState(start,{type:'ordinary',turnId:'x',expectedRevision:0},{pendingAdviceConfirmation:true}),/INVALID_EVENT/);
 let state=apply(start,'refuse_advice').state;
 state=transitionNativeDialogueState(state,{type:'ordinary',turnId:'q',expectedRevision:state.revision},{pendingAdviceConfirmation:true}).state;
 assert.equal(state.pendingAdviceConfirmation,true);
 state=apply(state,'retain_advice').state;assert.equal(state.pendingAdviceConfirmation,false);assert.equal(state.declinedAdvice.value,'advice');
});
test('pause clears topic and options while preserving consultation and time',()=>{
 let state=emptyNativeDialogueState();
 state=apply(state,'set_goal',{value:'consultation'}).state;
 state=apply(state,'set_topic',{value:'work'}).state;
 state=apply(state,'set_time',{value:'evening'}).state;
 state=apply(state,'offer_choices',{choiceIds:['service:one']}).state;
 state=apply(state,'pause_topic').state;
 assert.equal(state.topic,null);assert.deepEqual(state.lastOfferedChoices,[]);
 assert.equal(state.goal.value,'consultation');assert.equal(state.timePreference.value,'evening');
});
test('legacy dialogue state remains readable while malformed refusal metadata fails closed',()=>{
 const legacy=emptyNativeDialogueState();delete legacy.declinedMeditation;
 assert.equal(isValidNativeDialogueState(legacy),true);
 for(const value of [{value:'video',confirmed:true,sourceTurnId:'t1'},{value:'meditation',confirmed:false,sourceTurnId:'t1'}])
  assert.equal(isValidNativeDialogueState({...legacy,declinedMeditation:value}),false);
});
test('an explicitly stated goal remains session-scoped and is cleared at a new topic or stop',()=>{
 let state=emptyNativeDialogueState();
 state=apply(state,'set_goal_statement',{value:'I want a calmer conversation with my manager.'}).state;
 assert.equal(state.goalStatement.value,'I want a calmer conversation with my manager.');
 assert.equal(state.goalStatement.sourceTurnId,'turn-1');
 state=apply(state,'ordinary').state;
 state=apply(state,'cancel_to_talk').state;
 assert.equal(state.goalStatement.value,'I want a calmer conversation with my manager.');
 state=apply(state,'set_goal',{value:'consultation',corrected:true}).state;
 assert.equal(state.goalStatement.value,'I want a calmer conversation with my manager.');
 state=apply(state,'set_topic',{value:'relationships',newTopic:true}).state;
 assert.equal(state.goalStatement,null);
 state=apply(state,'set_goal_statement',{value:'I want to communicate more calmly.'}).state;
 state=apply(state,'stop').state;assert.equal(state.goalStatement,null);
});
test('goal text is bounded, provenance-checked and legacy state stays readable',()=>{
 const legacy=emptyNativeDialogueState();delete legacy.goalStatement;
 assert.equal(isValidNativeDialogueState(legacy),true);
 for(const value of ['', 'x'.repeat(161), 'a\nb', 'a\u0000b'])
  assert.throws(()=>apply(legacy,'set_goal_statement',{value}),/INVALID_EVENT/);
 assert.equal(isValidNativeDialogueState({...legacy,goalStatement:{value:'x',confirmed:false,sourceTurnId:'t1'}}),false);
});
test('forgetting the goal clears associated state and displayed choices',()=>{
 let state=apply(emptyNativeDialogueState(),'set_goal_statement',{value:'I want a calmer conversation.'}).state;
 state=apply(state,'set_goal',{value:'consultation'}).state;
 state=apply(state,'set_time',{value:'evening'}).state;
 state=apply(state,'set_topic',{value:'work'}).state;
 state=apply(state,'offer_choices',{choiceIds:['service:one']}).state;
 state=apply(state,'clear_goal_statement').state;
 assert.equal(state.goalStatement,null);assert.equal(state.goal,null);assert.equal(state.topic,null);
 assert.equal(state.timePreference,null);assert.deepEqual(state.lastOfferedChoices,[]);
});
test('a pending signed choice identifier can only be stored or cleared by the server transition',()=>{
 const s=emptyNativeDialogueState(),event={type:'ordinary',turnId:'turn-1',expectedRevision:0};
 const saved=transitionNativeDialogueState(s,event,{pendingJudgmentTurnId:'signed-choice-1'}).state;
 assert.equal(saved.pendingJudgmentTurnId,'signed-choice-1');
 const cleared=transitionNativeDialogueState(saved,{type:'ordinary',turnId:'turn-2',expectedRevision:1},{pendingJudgmentTurnId:null}).state;
 assert.equal(cleared.pendingJudgmentTurnId,null);
 assert.throws(()=>transitionNativeDialogueState(s,event,{pendingJudgmentTurnId:'bad identifier'}),/INVALID_EVENT/);
 assert.equal(isValidNativeDialogueState({...s,pendingJudgmentTurnId:'bad identifier'}),false);
});
test('a mixed refusal may retain a separate offer without retaining a meditation choice',()=>{
 const state=emptyNativeDialogueState(),event={type:'refuse_meditation',mixed:true,turnId:'t1',expectedRevision:0};
 const result=transitionNativeDialogueState(state,event,{offeredChoiceIds:['service:course']});
 assert.equal(result.state.declinedMeditation.value,'meditation');
 assert.deepEqual(result.state.lastOfferedChoices,['service:course']);assert.equal(result.action,null);
 assert.throws(()=>transitionNativeDialogueState(state,event,{offeredChoiceIds:['youtube:abcdefghijk']}),/INVALID_EVENT/);
 assert.throws(()=>transitionNativeDialogueState(state,{...event,mixed:false},{offeredChoiceIds:['service:course']}),/INVALID_EVENT/);
});
test('a meditation refusal remains effective on later turns until explicitly renewed',()=>{
 const refused=transitionNativeDialogueState(emptyNativeDialogueState(),{type:'refuse_meditation',turnId:'t1',expectedRevision:0}).state;
 const ordinary={type:'ordinary',turnId:'t2',expectedRevision:1};
 assert.throws(()=>transitionNativeDialogueState(refused,ordinary,{offeredChoiceIds:['youtube:abcdefghijk']}),/INVALID_EVENT/);
 assert.throws(()=>transitionNativeDialogueState(refused,{...ordinary,type:'offer_choices',choiceIds:['youtube:abcdefghijk']}),/INVALID_EVENT/);
 const renewed=transitionNativeDialogueState(refused,{...ordinary,type:'allow_meditation'}).state;
 const result=transitionNativeDialogueState(renewed,{type:'ordinary',turnId:'t3',expectedRevision:2},{offeredChoiceIds:['youtube:abcdefghijk']});
 assert.deepEqual(result.state.lastOfferedChoices,['youtube:abcdefghijk']);
});
test('bounded state follows a twelve-turn consultation, cancellation and corrected goal without actions',()=>{
 let s=emptyNativeDialogueState();
 const step=(type,data)=>{const r=apply(s,type,data);assert.equal(r.action,null);s=r.state;return r;};
 step('set_goal',{value:'consultation'});step('set_topic',{value:'relationships'});
 step('set_time',{value:'evening'});step('ordinary');
 assert.equal(s.goal.value,'consultation');assert.equal(s.topic.value,'relationships');assert.equal(s.timePreference.value,'evening');
 step('cancel_to_talk');assert.equal(s.goal.value,'conversation');assert.equal(s.timePreference,null);
 step('new_question');assert.equal(s.goal,null);assert.equal(s.topic,null);
 step('set_goal',{value:'consultation'});step('offer_choices',{choiceIds:['service-a','service-b']});
 const picked=step('choose',{ordinal:2});assert.equal(picked.choiceId,'service-b');
 step('ordinary');step('ordinary');step('ordinary');
 assert.equal(s.revision,12);assert.equal(s.goal.value,'consultation');
});
test('stale revision, repeated turn and fabricated choice are rejected without mutating input',()=>{
 let s=apply(emptyNativeDialogueState(),'set_goal',{value:'consultation'}).state;
 const before=structuredClone(s);
 assert.throws(()=>transitionNativeDialogueState(s,{turnId:'fresh',expectedRevision:0,type:'ordinary'}),/REVISION_MISMATCH/);
 assert.throws(()=>transitionNativeDialogueState(s,{turnId:'turn-1',expectedRevision:1,type:'ordinary'}),/TURN_REPLAY/);
 const result=apply(s,'choose',{ordinal:2});assert.equal(result.choiceId,null);
 assert.deepEqual(s,before);
});
test('goal changes clear incompatible slots and unknown events never issue actions',()=>{
 let s=apply(emptyNativeDialogueState(),'set_goal',{value:'consultation'}).state;
 s=apply(s,'set_time',{value:'evening'}).state;
 s=apply(s,'set_goal',{value:'conversation'}).state;
 assert.equal(s.timePreference,null);
 assert.equal(apply(s,'unknown').action,null);
 assert.throws(()=>apply(s,'set_topic',{value:'medical-diagnosis'}),/INVALID_EVENT/);
});
test('an explicit consultation and topic in the same turn share provenance',()=>{
 const result=transitionNativeDialogueState(emptyNativeDialogueState(),{type:'set_goal',value:'consultation',topic:'work',turnId:'t1',expectedRevision:0});
 assert.equal(result.state.goal.value,'consultation');assert.equal(result.state.topic.value,'work');
 assert.equal(result.state.goal.sourceTurnId,result.state.topic.sourceTurnId);assert.equal(result.action,null);
 assert.throws(()=>transitionNativeDialogueState(emptyNativeDialogueState(),{type:'set_goal',value:'consultation',topic:'invented',turnId:'t1',expectedRevision:0}),/INVALID_EVENT/);
});

test('invalid state, invented slots and non-verified choice payload shapes fail closed',()=>{
 const s=emptyNativeDialogueState();
 assert.throws(()=>apply({...s,goal:{value:'consultation',confirmed:false,sourceTurnId:'t1'}},'ordinary'),/INVALID_STATE_TRANSITION/);
 assert.throws(()=>apply(s,'set_time',{value:'evening'}),/INVALID_EVENT/);
 assert.throws(()=>apply(s,'offer_choices',{choiceIds:['one','one']}),/INVALID_EVENT/);
 assert.throws(()=>apply(s,'offer_choices',{choiceIds:['a b']}),/INVALID_EVENT/);
});
test('server-offered choice IDs are committed in the same revision as the user turn',()=>{
 let s=emptyNativeDialogueState();
 const first=transitionNativeDialogueState(s,{type:'set_goal',value:'consultation',turnId:'t1',expectedRevision:0},{offeredChoiceIds:['service:first','service:second']});
 assert.equal(first.state.revision,1);
 const picked=transitionNativeDialogueState(first.state,{type:'choose',ordinal:2,turnId:'t2',expectedRevision:1});
 assert.equal(picked.choiceId,'service:second');assert.equal(picked.state.revision,2);
 assert.equal(picked.state.selectedChoiceId,'service:second');
 const rejected=transitionNativeDialogueState(first.state,{type:'choose',ordinal:2,turnId:'t-rejected',expectedRevision:1},{verifiedChoiceIds:[]});
 assert.equal(rejected.choiceId,null);assert.equal(rejected.state.selectedChoiceId,null);
 assert.throws(()=>transitionNativeDialogueState(first.state,{type:'choose',ordinal:2,turnId:'t-invalid',expectedRevision:1},{verifiedChoiceIds:['bad id']}),/INVALID_EVENT/);
 const cleared=transitionNativeDialogueState(picked.state,{type:'stop',turnId:'t-stop',expectedRevision:2});
 assert.equal(cleared.state.selectedChoiceId,null);
 assert.equal(isValidNativeDialogueState({...picked.state,selectedChoiceId:'bad id'}),false);
 assert.throws(()=>transitionNativeDialogueState(s,{type:'cancel_to_talk',turnId:'t3',expectedRevision:0},{offeredChoiceIds:['service:first']}),/INVALID_EVENT/);
 for(const type of ['clear_topic','new_question','stop','decline_booking'])
  assert.throws(()=>transitionNativeDialogueState(s,{type,turnId:'t4',expectedRevision:0},{offeredChoiceIds:['service:first']}),/INVALID_EVENT/);
});
test('ordinal selection uses only still-visible server-stored choices',()=>{
 const s={...emptyNativeDialogueState(),lastOfferedChoices:['service:first','service:second','youtube:abcdefghijk']};
 const choose=(ordinal,excludedChoiceIds)=>transitionNativeDialogueState(s,{type:'choose',ordinal,turnId:'t1',expectedRevision:0},{excludedChoiceIds});
 assert.equal(choose(1,['service:first']).choiceId,'service:second');
 assert.equal(choose(2,['service:first']).choiceId,'youtube:abcdefghijk');
 assert.equal(choose(3,['service:first']).choiceId,null);
 assert.equal(choose(1,['service:first','service:second','youtube:abcdefghijk']).choiceId,null);
 assert.throws(()=>choose(1,['bad id']),/INVALID_EVENT/);
});
test('a dismissal remains effective after an intervening turn',()=>{
 const s={...emptyNativeDialogueState(),lastOfferedChoices:['service:first','service:second']};
 const next=transitionNativeDialogueState(s,{type:'ordinary',turnId:'t1',expectedRevision:0},{excludedChoiceIds:['service:first']}).state;
 assert.deepEqual(next.lastOfferedChoices,['service:second']);
 const picked=transitionNativeDialogueState(next,{type:'choose',ordinal:1,turnId:'t2',expectedRevision:1});
 assert.equal(picked.choiceId,'service:second');
});
