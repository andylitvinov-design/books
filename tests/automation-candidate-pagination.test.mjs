import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCandidatePage,candidatePageInfo,CANDIDATE_PAGE_SIZE,CANDIDATE_MAX_PAGE}
  from '../lib/automations/candidate-pagination.mjs';

test('first page is stable and valid pages are strictly bounded',()=>{
 assert.equal(CANDIDATE_PAGE_SIZE,40);
 assert.equal(CANDIDATE_MAX_PAGE,100);
 assert.equal(parseCandidatePage(undefined),1);
 assert.equal(parseCandidatePage(null),1);
 for(const n of ['1','2','10','100'])assert.equal(parseCandidatePage(n),Number(n));
});
test('arrays, injections, zero, leading zero, huge and fractional pages cannot reach SQL',()=>{
 for(const value of ['0','01','1.2','-1','101','1000','1;DROP TABLE','2&other=x',[],['1'],10,NaN,{},'0x2',' 2 '])
  assert.equal(parseCandidatePage(value),null);
});
test('page navigation counts are based on real candidate count',()=>{
 assert.deepEqual(candidatePageInfo(1,60),{page:1,pageSize:40,pages:2,offset:0,hasPrevious:false,hasNext:true});
 assert.deepEqual(candidatePageInfo(2,60),{page:2,pageSize:40,pages:2,offset:40,hasPrevious:true,hasNext:false});
 assert.equal(candidatePageInfo(1,0).pages,1);
 assert.equal(candidatePageInfo(3,81).hasNext,false);
});
test('bad boundaries are rejected at the server helper too',()=>{
 for(const [page,total] of [[0,60],[-1,1],[101,60],[1,-1],[1,1.2],[1,null],['2',60]])
 assert.throws(()=>candidatePageInfo(page,total),/CANDIDATE_PAGE_INVALID/);
});
