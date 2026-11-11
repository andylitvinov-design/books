'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {analyzeBundle,required}=require('./verify-standalone-bundle.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hh-bundle-gate-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const name of required){
  const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'');
 }
 const snap={schema:'HH_PR_THREE_CREATED_COHORTS_V1',repo:'andylitvinov-design/books',timezone:'America/Toronto',
  windows:['last_day','week_ago','two_weeks_ago'].map((id,i)=>({id,complete:true,
   from:'2026-11-0'+(3-i)+'T00:00:00Z',to:'2026-11-0'+(4-i)+'T00:00:00Z',expected_count:1,
   rows:[{number:100+i,created_at:'2026-11-0'+(3-i)+'T01:00:00Z',closed_at:'2026-11-0'+(3-i)+'T02:00:00Z',merged_at:'2026-11-0'+(3-i)+'T02:00:00Z',state:'closed',title:'test'}]}))};
 fs.writeFileSync(path.join(root,'pr-three-cohorts-snapshot.json'),JSON.stringify(snap));
 fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({functions:{'api/*.js':{includeFiles:'lib/**'}}}));
 fs.writeFileSync(path.join(root,'api/commander-chats.js'),"const helper=require('../lib/commander-private-store');\nmodule.exports=helper;");
 fs.writeFileSync(path.join(root,'lib/commander-private-store.js'),'module.exports = {}');
 return root;
}
test('full source with explicitly bundled shared server dependency passes',t=>{
 const root=fixture(t),result=analyzeBundle(root);assert.deepEqual(result.errors,[]);assert.equal(result.ok,true);
});
test('omitted private server helper blocks release (the Nov 11 live regression)',t=>{
 const root=fixture(t);fs.rmSync(path.join(root,'lib/commander-private-store.js'));
 assert.match(analyzeBundle(root).errors.join(' '),/DEPENDENCY_MISSING/);
});
test('omitted legacy, learning or cohort snapshot blocks incomplete deployment',t=>{
 const root=fixture(t);for(const file of ['legacy.html','learning.html','pr-three-cohorts-snapshot.json'])fs.rmSync(path.join(root,file));
 const errors=analyzeBundle(root).errors.join(' ');for(const file of ['legacy.html','learning.html','pr-three-cohorts-snapshot.json'])assert.ok(errors.includes(file));
});
test('a vercel config without explicitly included lib blocks release',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'vercel.json'),'{}');
 assert.match(analyzeBundle(root).errors.join(' '),/FUNCTION_LIB_INCLUDE_NOT_PINNED/);
});
test('a wildcard external proxy is not an independent full deployment',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({functions:{'api/*.js':{includeFiles:'lib/**'}},rewrites:[{source:'/:path*',destination:'https://old.vercel.app/:path*'}]}));
 assert.match(analyzeBundle(root).errors.join(' '),/PROXY_ONLY_CONFIG/);
});
test('unrelated missing API relative module blocks complete-bundle certification',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'api/pr-three-kpis.js'),"require('../lib/missing');");
 assert.match(analyzeBundle(root).errors.join(' '),/api\/pr-three-kpis\.js -> \.\.\/lib\/missing/);
});
test('historical cohort cannot be replaced by invented or stale values',t=>{
 const root=fixture(t),file=path.join(root,'pr-three-cohorts-snapshot.json');
 const snap=JSON.parse(fs.readFileSync(file,'utf8'));snap.windows[1].rows[0].created_at='2026-11-11T00:00:00Z';fs.writeFileSync(file,JSON.stringify(snap));
 assert.match(analyzeBundle(root).errors.join(' '),/INVALID_COHORT_ROW/);
});
