import test from 'node:test'
import assert from 'node:assert/strict'
import {openingStagePosition,profileStagePosition,methodStagePosition,courseStagePosition,savedProfileStagePosition,coachCapturedClientTurns,coachStageCounts,coachEvidenceMarks,openingCapturedAnswers,courseCapturedRows,groupedSessionPosition} from '../lib/coaching/coach-session-stage-view.mjs'
const keys=["invitation","name","continuity","focus","feelings","confirmation"]
test('every opening gate maps to exactly one of six rows in all locales',()=>{for(const locale of ['en','ru','es'])for(let i=0;i<6;i++){const p=openingStagePosition({current:keys[i],checkmarks:Object.fromEntries(keys.slice(0,i).map(k=>[k,true]))},locale);assert.equal(p.total,6);assert.equal(p.step,i+1);assert.equal(p.rows.filter(r=>r.active).length,1);assert.equal(p.rows[i].id,keys[i]);assert.equal(p.rows.filter(r=>r.status==='done').length,i)}assert.equal(openingStagePosition({declined:true,current:'invitation'}).index,-1)})
test('method completion and provisional progression share one state',()=>{assert.equal(methodStagePosition(['a','b'],['A','B'],1,true,true).finished,true);assert.equal(methodStagePosition(['a','b'],['A','B'],1,false,true).finished,false)})
test('profile uses stable axis IDs and separates skip from confirmation',()=>{const axes=['a','b','c'].map(id=>({id,name:{en:id}}));const p=profileStagePosition({current:'c',ratings:[{axis:'b',kind:'skipped'},{axis:'a',kind:'rated'}]},axes);assert.equal(p.step,3);assert.equal(p.rows[1].status,'skipped');assert.equal(p.rows[0].status,'done')})
test('course prompt and review are projected atomically, including correction and pause',()=>{const rows=[{id:'a',status:'confirmed'},{id:'b',status:'needs_confirmation'},{id:'c',status:'skipped_by_client'}];assert.equal(courseStagePosition(rows,{promptId:'b'}).step,2);assert.equal(courseStagePosition(rows,{paused:true}).index,-1);assert.equal(courseStagePosition(rows,{allowProvisional:false}).index,-1);assert.equal(courseStagePosition(rows.map(r=>({...r,status:'confirmed'}))).finished,true);assert.equal(courseStagePosition(rows.map(r=>({...r,status:'not_explored'})),{promptId:'c'}).step,3)})
test('saved outer profile correction or desired prompt remains active',()=>{const p=savedProfileStagePosition({track:'outer',rows:[{id:'a',label:'A',current:{status:'confirmed'},desired:{status:'not_explored'}}]},{pending:{axis:'a',slot:'desired'}});assert.equal(p.step,1);assert.equal(p.rows[0].active,true)})

test('literal captured statements remain visible independently of semantic checks',()=>{const rows=[{role:'assistant',content:'А как дела?'},{role:'user',content:'Конечно. Ну, конечно.'},{role:'user',content:'часть',interim:true},{role:'user',content:'Пока не знаю',unanswered:true},{role:'user',content:'Пока не знаю'},{role:'user',content:'  '}];const copy=JSON.stringify(rows);assert.deepEqual(coachCapturedClientTurns(rows),[{turnIndex:1,quote:'Конечно. Ну, конечно.',unanswered:false},{turnIndex:3,quote:'Пока не знаю',unanswered:true},{turnIndex:4,quote:'Пока не знаю',unanswered:false}]);assert.equal(JSON.stringify(rows),copy);assert.deepEqual(coachCapturedClientTurns(null),[]);assert.deepEqual(coachCapturedClientTurns([]),[]);});
test('opening displays the exact answer while automatic, skipped and unresolved fields never become green',()=>{for(const locale of ['ru','en','es']){const opening={current:'feelings',checkmarks:{invitation:true,name:true,continuity:true,focus:true},fieldStatus:{invitation:'confirmed',name:'confirmed',continuity:'not_explored',focus:'skipped_by_client',feelings:'needs_confirmation'},answers:{invitation:{quote:'Конечно. Ну, конечно.'},name:{quote:'Меня зовут Андрей'},continuity:{automatic:true,quote:''},focus:{quote:'Пропустим'}}};const p=openingStagePosition(opening,locale);assert.equal(p.step,5);assert.equal(p.rows[0].quote,opening.answers.invitation.quote);assert.equal(p.rows[1].quote,opening.answers.name.quote);assert.equal(p.rows[2].automatic,true);assert.equal(p.rows[2].status,'skipped');assert.equal(p.rows[3].quote,'Пропустим');assert.equal(p.rows[3].status,'skipped');assert.equal(p.rows[4].status,'needs_confirmation');assert.equal(p.rows[4].active,true);assert.deepEqual(coachStageCounts(p),{confirmed:2,skipped:2,total:6});}});

test('two independent marks: raw answer first, verified only on accepted literal or structured evidence',()=>{
 for(const [row,recorded,verified] of [[{status:'pending'},false,false],[{status:'needs_confirmation',quote:'5'},true,false],[{status:'done',quote:'5 → 8'},true,true],[{status:'confirmed',quote:'actual words'},true,true],[{status:'done'},false,false],[{status:'skipped',quote:'skip'},true,false],[{status:'done',recorded:true},true,true]])assert.deepEqual(coachEvidenceMarks(row),{recorded,verified})
});
test('opening shows pending candidate without advancing accepted history',()=>{
 const getProgress=history=>({current:history.length?'name':'invitation',completed:false});
 const rows=[{role:'user',content:'Конечно.'},{role:'user',content:'Андрей',unanswered:true}];
 const capture=openingCapturedAnswers(rows,getProgress);
 assert.deepEqual(capture,{invitation:'Конечно.',name:'Андрей'});
 const p=openingStagePosition({current:'name',checkmarks:{invitation:true},answers:{invitation:{quote:'Конечно.'}}},'ru',capture);
 assert.equal(p.rows[1].quote,'Андрей');assert.equal(p.rows[1].status,'needs_confirmation');assert.equal(p.rows[1].active,true);
});
test('course receives short and unrelated exact-prompt responses before validation but never verifies them',()=>{
 const rows=[{id:'a',status:'not_explored'},{id:'b',status:'confirmed',quote:'original'},{id:'c',status:'not_explored',source:'client_selected_open'}];
 const turns=[{role:'assistant',content:'a'},{role:'user',content:'5',unanswered:true},{role:'assistant',content:'b'},{role:'user',content:'later'},{role:'assistant',content:'c'},{role:'user',content:'old'}];
 const capture=courseCapturedRows(rows,turns,(row,text)=>row.id===text);
 assert.equal(capture[0].quote,'5');assert.equal(capture[0].status,'needs_confirmation');assert.equal(capture[0].pending,true);assert.equal(capture[1].quote,'original');assert.equal(capture[2].quote,undefined);
 const reopened=courseCapturedRows(rows,turns,(row,text)=>row.id===text,{livePrompt:{fieldId:'c',kind:'question',turnIndex:4}});
 assert.equal(reopened[2].quote,'old');
 assert.equal(courseCapturedRows(rows,turns,(row,text)=>row.id===text,{afterIndex:1})[0].quote,undefined);
 assert.equal(courseCapturedRows(rows,[{role:'assistant',content:'a',interrupted:true},{role:'user',content:'5'}],()=>true)[0].quote,undefined);
});
test('all Clarity 1 fields map exactly once to seven groups with partial and reviewed fill',()=>{
 const ids=['request','outer_body_health','outer_emotional_wellbeing','outer_relationships','outer_career_business','outer_finance','outer_personal_growth','outer_lifestyle','outer_meaning_purpose','needs'];
 for(const locale of ['ru','en','es']){
  const opening=openingStagePosition({current:'complete',completed:true,checkmarks:Object.fromEntries(keys.map(k=>[k,true]))},locale);
  const core=courseStagePosition(ids.map(id=>({id,label:id,status:id==='outer_body_health'?'confirmed':id==='outer_emotional_wellbeing'?'needs_confirmation':'not_explored',quote:id.includes('wellbeing')||id.includes('health')?'5 8':''})),{promptId:'outer_emotional_wellbeing'});
  const p=groupedSessionPosition(opening,core,{mode:'course',courseId:'clarity_day_1',locale});
  assert.deepEqual(p.rows.map(x=>x.id),['contact','request','wellbeing','personal','realization','self','integration']);
  assert.equal(p.total,7);assert.equal(p.step,3);
  assert.deepEqual(p.rows[2].children.map(x=>x.id),['outer_body_health','outer_emotional_wellbeing']);
  assert.equal(p.rows[2].recordedFraction,1);assert.equal(p.rows[2].verifiedFraction,.5);assert.equal(p.rows[2].status,'needs_confirmation');
  assert.equal(p.rows.slice(1).flatMap(x=>x.children).length,10);
  assert.equal(p.rows[3].children.length,2);
 }
});
test('partial fill, skip, correction and unknown fields never fake a completed group',()=>{
 const rows=[{id:'goal',label:'Goal',status:'confirmed',quote:'goal'},{id:'success',label:'Success',status:'not_explored'},{id:'future_new',label:'New',status:'skipped_by_client'}];
 const opening=openingStagePosition({current:'invitation'});
 let p=groupedSessionPosition(opening,courseStagePosition(rows),{mode:'course',openingActive:true});
 assert.equal(p.step,1);assert.equal(p.rows[1].verifiedFraction,.5);assert.equal(p.rows[1].recordedFraction,.5);assert.equal(p.rows[2].skippedFraction,1);assert.equal(p.rows[2].verifiedFraction,0);
 p=groupedSessionPosition(opening,courseStagePosition(rows.map(x=>x.id==='goal'?{...x,status:'not_explored',quote:''}:x)),{mode:'course'});
 assert.equal(p.rows[1].verifiedFraction,0);assert.equal(p.rows[1].recordedFraction,0);
});
test('every existing thematic field and future Clarity day field remains represented without padding',()=>{
 const plans=[['clarity_day_2',['changes','review_homework','inner_anchor','inner_connection','inner_freedom','inner_agency','inner_love','inner_dignity','inner_self-realization','inner_recognition','strengths','resources','practices']],['clarity_day_3',['changes','review_homework','dream_image','goal','why','success','next','timing']],['goal_plan',['plan','timing','levels','contingency','next']],['business_execution',['accountability_people','controls_metrics','launch_review']],['life_direction',['situation','wishes','direction','goal']]];
 for(const [courseId,ids] of plans){
  const p=groupedSessionPosition(openingStagePosition({current:'invitation'}),courseStagePosition(ids.map(id=>({id,label:id,status:'not_explored'}))),{mode:'course',courseId,openingActive:true});
  assert.deepEqual(p.rows.slice(1).flatMap(g=>g.children.map(r=>r.id)).sort(),[...ids].sort());
  assert.equal(p.rows[0].id,'contact');assert.equal(p.rows.every(g=>g.children.length>0),true);
 }
});
