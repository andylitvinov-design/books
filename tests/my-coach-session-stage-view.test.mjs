import test from 'node:test'
import assert from 'node:assert/strict'
import {openingStagePosition,profileStagePosition,methodStagePosition,courseStagePosition,savedProfileStagePosition,coachCapturedClientTurns,coachStageCounts,coachEvidenceMarks,openingCapturedAnswers,courseCapturedRows,groupedSessionPosition,boundTranscriptReview} from '../lib/coaching/coach-session-stage-view.mjs'
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
test('six stable positions: Day 1 balance consent, all eight ratings and verification share stage three',()=>{
 const ids=['request','situation','feelings','impact','balance_consent','outer_body_health','outer_emotional_wellbeing','outer_relationships','outer_career_business','outer_finance','outer_personal_growth','outer_lifestyle','outer_meaning_purpose','balance_review','priority','needs','why','resources','next','learning','reviewed_summary','homework_consent'];
 for(const locale of ['ru','en','es']){
  const opening=openingStagePosition({current:'complete',completed:true,fieldStatus:Object.fromEntries(keys.map(k=>[k,'confirmed'])),checkmarks:Object.fromEntries(keys.map(k=>[k,true])),answers:Object.fromEntries(keys.map(k=>[k,{quote:'client answer'}]))},locale);
  const core=courseStagePosition(ids.map(id=>({id,label:id,status:id==='outer_body_health'?'confirmed':id==='outer_emotional_wellbeing'?'needs_confirmation':'not_explored',quote:id.includes('wellbeing')||id.includes('health')?'5':''})),{promptId:'outer_emotional_wellbeing'});
  const p=groupedSessionPosition(opening,core,{mode:'course',courseId:'clarity_day_1',locale});
  assert.deepEqual(p.rows.map(x=>x.id),['contact','situation','method','insight','support','integration']);
  assert.equal(p.total,6);assert.equal(p.step,3);
  assert.equal(p.rows[0].tone,'green');assert.equal(p.rows[1].tone,'gray');assert.equal(p.rows[2].tone,'yellow');
  assert.equal(p.rows[2].total,10);assert.equal(p.rows[2].recorded,2);assert.equal(p.rows[2].confirmed,1);
  assert.deepEqual(p.rows.slice(1).flatMap(g=>g.children.map(r=>r.id)).sort(),[...ids].sort());
  const full=groupedSessionPosition(opening,courseStagePosition(ids.map(id=>({id,label:id,status:'confirmed',quote:'client evidence'}))),{mode:'course',courseId:'clarity_day_1',locale});
  assert.ok(full.rows.every(r=>r.tone==='green'));
 }
});
test('single solid color only from field evidence, never elapsed time, active prompt, skip or empty slot',()=>{
 const opening=openingStagePosition({current:'invitation'});
 const make=(rows)=>groupedSessionPosition(opening,courseStagePosition(rows),{mode:'course',courseId:'clarity_day_1'});
 const rows=[{id:'outer_body_health',label:'Body',status:'confirmed',quote:'0'},{id:'outer_finance',label:'Finance',status:'not_explored'}];
 let p=make(rows);assert.equal(p.rows[2].tone,'yellow');assert.equal(p.rows[2].recorded,1);assert.equal(p.rows[1].tone,'gray');
 p=make(rows.map(r=>({...r,status:'confirmed',quote:'5'})));assert.equal(p.rows[2].tone,'green');
 p=make(rows.map(r=>({...r,status:'needs_confirmation',quote:'5'})));assert.equal(p.rows[2].tone,'yellow');
 p=make(rows.map(r=>({...r,status:'skipped_by_client',quote:''})));assert.equal(p.rows[2].tone,'yellow');assert.equal(p.rows[2].confirmed,0);
 p=make(rows.map(r=>({...r,status:'confirmed',quote:''})));assert.notEqual(p.rows[2].tone,'green');
 p=make(rows.map(r=>({...r,status:'not_explored',quote:''})));assert.equal(p.rows[2].tone,'gray');
 assert.equal(p.rows.every(r=>Number.isFinite(r.recordedFraction)&&Number.isFinite(r.verifiedFraction)),true);
});
test('all course/profile/method fields represented exactly once in six slots, no fictitious answers',()=>{
 const plans=[['clarity_day_2',['changes','review_homework','inner_anchor','inner_connection','inner_freedom','inner_agency','inner_dignity','inner_love','inner_self-realization','inner_recognition','strengths','resources','practices']],['clarity_day_3',['changes','review_homework','dream_image','goal','why','success','next','timing']],['goal_plan',['plan','timing','levels','contingency','next']],['business_execution',['accountability_people','controls_metrics','launch_review']],['life_direction',['situation','wishes','direction','goal','future_new']]];
 for(const [courseId,ids] of plans){
  const p=groupedSessionPosition(openingStagePosition({current:'invitation'}),courseStagePosition(ids.map(id=>({id,label:id,status:'not_explored'}))),{mode:'course',courseId,openingActive:true});
  assert.equal(p.total,6);assert.deepEqual(p.rows.slice(1).flatMap(g=>g.children.map(r=>r.id)).sort(),[...ids].sort());
  assert.ok(p.rows.every(g=>g.tone==='gray'));
 }
 for(const mode of ['method','profile','profile-v3']){
  const core=methodStagePosition(['a','b','c','d','e','review'],['A','B','C','D','E','Review'],2,true,false);
  const p=groupedSessionPosition(openingStagePosition({current:'invitation'}),core,{mode});
  assert.equal(p.total,6);assert.equal(p.rows.slice(1).flatMap(g=>g.children).length,6);
 }
});

test('native transcript review requires exact four-turn evidence; restore and explicit corrections remain conservative',()=>{
 const courseId='goal_result',fields=[{id:'goal'},{id:'success'}];
 const turn=(role,content,extra={})=>({role,content,...extra});
 const turns=[turn('assistant','goal?'),turn('user','My concrete goal'),turn('assistant','echo: My concrete goal'),turn('user','yes')];
 const normalize=(value,id,rows)=>{for(const e of value.events){if(e.binding&&rows[e.turnIndex].content!==e.quote)throw Error('invalid')}return value};
 const get=(t,extra={})=>boundTranscriptReview({courseId,turns:t,fields,matchQuestion:(f,q)=>q===f.id+'?',matchEcho:(f,q,a,e)=>e==='echo: '+a,answerClass:x=>x==='yes'?'affirm':x==='no'?'deny':'candidate',normalize,...extra});
 const r=get(turns);
 assert.equal(r.events.length,1);assert.deepEqual(r.events[0].binding,{questionTurnIndex:0,confirmationTurnIndex:3});assert.equal(r.events[0].quote,'My concrete goal');
 assert.deepEqual(get(JSON.parse(JSON.stringify(turns))),r);
 assert.equal(get(turns.slice(0,3)),null);
 assert.equal(get(turns.map((x,i)=>i===3?turn('user','no'):x)),null);
 assert.equal(get(turns.map((x,i)=>i===3?{...x,unanswered:true}:x)),null);
 assert.equal(get(turns.map((x,i)=>i===2?{...x,interrupted:true}:x)),null);
 assert.equal(get(turns.map((x,i)=>i===2?turn('assistant','different echo'):x)),null);
 assert.equal(get(turns,{afterIndex:0}),null);
 assert.equal(get([...turns,turn('assistant','goal?')]),null);
 assert.equal(get(turns,{normalize:()=>{throw Error('invalid')}}),null);
 const manual={version:'hh-coach-course-review-v1',courseSessionId:courseId,events:[{fieldId:'goal',status:'not_explored',turnIndex:null,quote:'',revision:1}]};
 assert.deepEqual(get(turns,{existing:manual}),manual);
});

test('all published courses, all languages, and opening/active states share six stable macro stages without fictitious answers',async()=>{
 const {COACH_PROGRAM_SESSIONS}=await import('../lib/coaching/coach-program-topics.mjs')
 const {coachCourseProtocolSchema}=await import('../lib/coaching/coach-course-protocol-schema.mjs')
 for(const locale of ['en','ru','es'])for(const course of [...COACH_PROGRAM_SESSIONS,...['clarity_day_1','clarity_day_2','clarity_day_3'].map(id=>({id}))]){
  const schema=coachCourseProtocolSchema(course.id,locale);if(!schema)continue;
  const rows=schema.checkpoints.map(r=>({...r,status:'not_explored'}));
  const start=groupedSessionPosition(openingStagePosition({current:'invitation'},locale),courseStagePosition(rows,{allowProvisional:false}),{mode:'course',courseId:course.id,locale,openingActive:true});
  const running=groupedSessionPosition(openingStagePosition({completed:true,checkmarks:Object.fromEntries(keys.map(k=>[k,true]))},locale),courseStagePosition(rows),{mode:'course',courseId:course.id,locale});
  assert.equal(start.total,6,course.id);assert.equal(running.total,6,course.id);
  assert.equal(start.step,1);assert.deepEqual(start.rows.map(g=>g.id),running.rows.map(g=>g.id));
  assert.ok(running.rows.filter(g=>g.total===0).every(g=>g.tone==='gray'));
  assert.deepEqual(running.rows.flatMap(g=>g.coreChildren.map(r=>r.id)).sort(),rows.map(r=>r.id).sort());
  assert.deepEqual(running.rows[0].children.slice(0,keys.length).map(r=>r.id),keys);
  assert.equal(running.rows.filter(g=>g.active).length,1);
 }
})

test('a course field mapped to contact remains in the course projection and can be active',()=>{
 const p=groupedSessionPosition(openingStagePosition({completed:true}),courseStagePosition([{id:'continuity_review',progressStage:'contact',label:'Continuity review',status:'not_explored'}],{promptId:'continuity_review'}),{mode:'course'});
 assert.equal(p.total,6);assert.equal(p.rows[0].coreChildren[0].id,'continuity_review');assert.equal(p.rows[0].active,true);assert.equal(p.rows[0].tone,'gray');
});

import {coachOpeningProgress} from '../lib/coaching/coach-opening-protocol.mjs'
test('incident: unrelated interface replies and bare no are transcript only, not field captures',()=>{
 const rows=[{role:'user',content:'Yes'},{role:'user',content:'sad'},{role:'user',content:'No, I want to check protocol of the session.'}]
 const captured=openingCapturedAnswers(rows,h=>coachOpeningProgress({turns:h}))
 assert.equal(captured.name,undefined)
 assert.equal(coachCapturedClientTurns(rows).length,3)
 const fields=[{id:'feelings',status:'not_explored'}]
 for(const reply of ['No.','I want to check the protocol']){
  const turns=[{role:'assistant',content:'question'},{role:'user',content:reply}]
  assert.equal(courseCapturedRows(fields,turns,()=>true)[0].quote,undefined)
  assert.equal(coachCapturedClientTurns(turns).length,1)
 }
})


test('confirmed preferred name shows the normalized value independently of the literal assent',()=>{
 for(const locale of ['en','ru','es']){
  const name={kind:'confirmed_previous',value:'Alex',quote:({en:'Yes',ru:'Да',es:'Sí'})[locale]}
  const confirmed=openingStagePosition({fieldStatus:{name:'confirmed'},checkmarks:{name:true},answers:{name}},locale).rows.find(r=>r.id==='name')
  assert.equal(confirmed.value,'Alex');assert.equal(confirmed.quote,name.quote);assert.equal(confirmed.status,'done')
  const pending=openingStagePosition({current:'name',fieldStatus:{name:'needs_confirmation'},answers:{name}},locale).rows.find(r=>r.id==='name')
  assert.equal(pending.value,undefined);assert.equal(pending.status,'needs_confirmation')
 }
})
