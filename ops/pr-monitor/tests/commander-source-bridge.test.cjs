'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../commander-source-bridge.js');
const fs=require('node:fs');
const path=require('node:path');
const good={taskId:'commander_1234567890abcdef12345678',base:'codex/bootstrap-books',
 sha:'a'.repeat(40),path:'components/example.js',title:'Fix verified source behavior',
 mode:'literal',find:'old()',replace:'new()',approved:true};
test('public owner command payload needs valid mode, SHA, path and public consent',()=>{
 const r=bridge.validate(good);
 assert.equal(r.mode,'literal');assert.equal(r.public_technical_only,true);
 assert.equal(r.expected_base_sha,'a'.repeat(40));
 assert.deepEqual([r.find,r.replace],['old()','new()']);
 for(const input of [{...good,approved:false},{...good,sha:'unknown'},
  {...good,path:'api/client-token.js'},{...good,path:'scripts/ci-pr-repair.cjs'},
  {...good,replace:'old()'},{...good,replace:'github_pat_veryLongAccidentalAccessToken12345'}]){
  assert.throws(()=>bridge.validate(input));
 }
});
test('public technical free AI instruction is explicit and bounded',()=>{
 const r=bridge.validate({...good,mode:'free_ai',instruction:'Fix the mismatched class name safely.'});
 assert.equal(r.mode,'free_ai');assert.equal(r.instruction,'Fix the mismatched class name safely.');
 assert.equal('find' in r,false);assert.equal('replace' in r,false);
 assert.throws(()=>bridge.validate({...good,mode:'free_ai',instruction:'too short'}));
});
test('browser HTML includes independent consent and existing owner session',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../task-editor.html'),'utf8');
 assert.match(html,/id="ac-workspace" hidden/);
 assert.match(html,/id="ac-source-approve"/);
 assert.match(html,/commander-source-bridge\.js/);
 assert.match(html,/id="ac-source-pr-link"/);
 assert.match(html,/github\.com\/andylitvinov-design\/books\/issues\/3890/);
 assert.doesNotMatch(html,/value="ghp_|value="github_pat_/);
});
