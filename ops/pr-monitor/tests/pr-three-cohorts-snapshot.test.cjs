'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {test}=require('node:test');
const original=JSON.parse(readFileSync(join(__dirname,'../pr-three-cohorts-snapshot.json'),'utf8'));

test('archived historical cohorts retain verifiable source identity and complete rows',()=>{
  assert.equal(original.schema,'HH_PR_THREE_CREATED_COHORTS_V1');
  assert.equal(original.repo,'andylitvinov-design/books');
  assert.equal(original.timezone,'America/Toronto');
  assert.ok(Number.isFinite(Date.parse(original.generated_at)));
  assert.deepEqual(original.windows.map(w=>w.id),['last_day','week_ago','two_weeks_ago']);
  assert.deepEqual(original.windows.map(w=>w.rows.length),[86,130,151]);
  for(const window of original.windows){
    assert.equal(window.complete,true);
    assert.equal(window.rows.length,window.expected_count);
    const from=Date.parse(window.from),to=Date.parse(window.to);
    assert.ok(Number.isFinite(from)&&Number.isFinite(to)&&to-from===86400000);
    const seen=new Set();
    for(const pr of window.rows){
      assert.deepEqual(Object.keys(pr).sort(),['closed_at','created_at','merged_at','number','state','title']);
      assert.ok(Number.isInteger(pr.number)&&pr.number>0&&!seen.has(pr.number));
      seen.add(pr.number);
      const created=Date.parse(pr.created_at);
      assert.ok(Number.isFinite(created)&&created>=from&&created<=to);
      if(pr.closed_at!==null)assert.ok(Date.parse(pr.closed_at)>=created);
      if(pr.merged_at!==null)assert.ok(Date.parse(pr.merged_at)>=created);
    }
  }
});

test('created-to-merged cohort discards PRs without both timestamps inside the selected window',()=>{
  for(const window of original.windows){
    const from=Date.parse(window.from),to=Date.parse(window.to);
    const valid=window.rows.filter(pr=>pr.merged_at &&
      Date.parse(pr.created_at)>=from&&Date.parse(pr.created_at)<=to &&
      Date.parse(pr.merged_at)>=from&&Date.parse(pr.merged_at)<=to);
    assert.ok(valid.length>0&&valid.length<window.rows.length);
    for(const pr of valid){
      const duration=Date.parse(pr.merged_at)-Date.parse(pr.created_at);
      assert.ok(Number.isFinite(duration)&&duration>=0&&duration<=86400000);
    }
  }
});
