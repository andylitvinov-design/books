import test from 'node:test';import assert from 'node:assert/strict';import {planLabWork} from '../scripts/lab-work-item.mjs';
const input={id:'LAB-101',title:'Improve meditation editor',owner:'agent-a',baseSha:'a'.repeat(40)};
test('ordinary feature stays local without PR',()=>{const x=planLabWork(input);assert.equal(x.route,'lab');assert.equal(x.requiresPr,false);assert.equal(x.productionBranch,'codex/public-book-library')});
test('critical production incident uses GitHub',()=>{const x=planLabWork({...input,kind:'production-incident'});assert.equal(x.route,'github-hotfix');assert.equal(x.requiresPr,true)});
test('invalid work items fail',()=>{for(const item of [{...input,id:'x'},{...input,baseSha:'HEAD'},{...input,owner:''}])assert.throws(()=>planLabWork(item))});
