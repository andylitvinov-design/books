import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeEpic,sanitizePRLink,proposePlans,projectProgress,deliveryLabel} from '../lib/project-management/plans.mjs';
const id='a3f1c4c5-53c4-4bb5-91ee-4878dcf162b2';
const data={projectId:id,title:'Улучшить видеогенератор',problem:'Слишком много экранов и настройка занимает время',outcome:'Пользователь создаёт готовый ролик за короткий понятный путь',priority:2};
test('epic schema bounds and injection control',()=>{
 assert.equal(sanitizeEpic(data)?.priority,2);
 assert.equal(sanitizeEpic({...data,projectId:'not-uuid'}),null);
 assert.equal(sanitizeEpic({...data,priority:6}),null);
 assert.equal(sanitizeEpic({...data,problem:'x'}),null);
 assert.equal(sanitizeEpic({...data,title:'a'.repeat(1000)})?.title.length,120);
});
test('proposals have distinct ordered steps but cannot publish PR',()=>{
 const options=proposePlans(data);
 assert.equal(options.length,3);
 assert.deepEqual(options.map(o=>o.key),['quick','balanced','extended']);
 for(const plan of options)for(const s of plan.steps){assert.ok(s.title.length>=6);assert.ok(s.description.length>=10);assert.ok(['code_change','product_spec','research','release_verify'].includes(s.kind));}
 assert.equal(options[0].steps.length,3);assert.equal(options[1].steps.length,5);assert.equal(options[2].steps.length,7);
 assert.equal(JSON.stringify(options).includes('https://api.openai.com'),false);
});
test('trusted PR only',()=>{
 assert.equal(sanitizePRLink('https://github.com/andylitvinov-design/books/pull/3782').number,3782);
 for(const s of ['https://github.com/evil/books/pull/1','https://github.com/andylitvinov-design/books/issues/3782','https://github.com/andylitvinov-design/books/pull/1?download=1','http://github.com/andylitvinov-design/books/pull/1'])assert.equal(sanitizePRLink(s),null);
});
test('progress is evidence-based, no synthetic zero percent when empty',()=>{
 assert.deepEqual(projectProgress([]),{verified:0,total:0,ratio:null});
 assert.deepEqual(projectProgress([{state:'planned'},{state:'completed_verified',has_evidence:true},{state:'running'}]),{verified:1,total:3,ratio:1/3});
 assert.deepEqual(projectProgress([{state:'completed_verified',has_evidence:false},{state:'planned'}]),{verified:0,total:2,ratio:0});
});
test('exact CI vs merge vs served code vs functional smoke are distinct',()=>{
 assert.equal(deliveryLabel(null).code,'UNKNOWN');
 assert.equal(deliveryLabel({prState:'open',ci:'failed'}).code,'CI_FAILED');
 assert.equal(deliveryLabel({prState:'open',ci:'pending'}).code,'CI_RUNNING');
 assert.equal(deliveryLabel({prState:'open',ci:'passed'}).code,'CI_GREEN');
 assert.equal(deliveryLabel({prState:'closed',ci:'passed'}).code,'CLOSED_UNMERGED');
 assert.equal(deliveryLabel({prState:'merged',codeOnProduction:false}).code,'MERGED');
 assert.equal(deliveryLabel({prState:'merged',codeOnProduction:true,functionalAccepted:false}).code,'SERVED_UNVERIFIED');
 assert.equal(deliveryLabel({prState:'merged',codeOnProduction:true,functionalAccepted:true}).code,'LIVE_VERIFIED');
});