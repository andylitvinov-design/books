import test from 'node:test';
import assert from 'node:assert/strict';
import {isolatedOporaServerAddition,classifyOporaExactMerge} from '../scripts/ci-opora-lock-scope.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const a={name:'example',scripts:{'test:app':'node --conditions=react-server --test tests/old.test.mjs && npm run test:monetization'},dependencies:{react:'19.0.0'}};
const b=clone(a);b.dependencies.ws='8.23.0';
b.scripts['test:app']=b.scripts['test:app'].replace(' &&',' tests/clarity-relay-entry.test.mjs &&');
const l={lockfileVersion:3,packages:{'':{dependencies:a.dependencies},'node_modules/react':{version:'19.0.0'}}};
const m=clone(l);m.packages[''].dependencies=b.dependencies;
m.packages['node_modules/ws']={version:'8.23.0',resolved:'https://registry.npmjs.org/ws/-/ws-8.23.0.tgz',integrity:'sha512-'+ 'a'.repeat(86)+'=='};
const rows=['package.json','package-lock.json','app/api/app/my-coach/live-relay/route.js','tests/clarity-relay-entry.test.mjs'].map(filename=>({filename,status:'M'}));
const evidence={rows,basePackage:JSON.stringify(a),currentPackage:JSON.stringify(b),baseLock:JSON.stringify(l),currentLock:JSON.stringify(m)};
test('reviewed additive isolated server dependency leaves hermetic OPORA browser unaffected',()=>{
  assert.equal(isolatedOporaServerAddition(evidence),true);
  for(const filename of ['app/api/app/[...path]/route.js','components/app/opora-experience-player.jsx','components/app/my-page-courses.jsx',
    'app/globals.css','lib/inner-growth/lesson-library.js','middleware.ts','supabase/migrations/coach.sql',
    '.github/workflows/opora-module-ci.yml','scripts/ci-opora-lock-scope.mjs']){
    assert.equal(isolatedOporaServerAddition({...evidence,rows:[...rows,{filename,status:'M'}]}),false,filename);
  }
  assert.equal(isolatedOporaServerAddition({...evidence,rows:[...rows,rows[0]]}),false);
  assert.equal(isolatedOporaServerAddition({...evidence,rows:rows.slice(0,-1)}),false);
});
test('dependency graph, lifecycle, metadata and existing tests cannot be weakened',()=>{
  for(const mutate of [
    v=>{v.packages['node_modules/react'].version='20.0.0'},
    v=>{v.packages['node_modules/ws'].hasInstallScript=true},
    v=>{v.packages['node_modules/ws'].version='8.24.0'},
    v=>{v.packages['node_modules/ws'].resolved='https://example.com/ws.tgz'},
    v=>{v.packages['node_modules/ws'].integrity='sha512-bad'},
    v=>{v.packages['node_modules/ws'].bin={ws:'cli.js'}},
    v=>{v.packages['node_modules/unknown']={version:'1.0.0'}},
  ]){const bad=clone(m);mutate(bad);assert.equal(isolatedOporaServerAddition({...evidence,currentLock:JSON.stringify(bad)}),false);}
  const old=clone(l),next=clone(m);old.packages['node_modules/react'].peerDependencies=next.packages['node_modules/react'].peerDependencies={ws:'*'};
  assert.equal(isolatedOporaServerAddition({...evidence,baseLock:JSON.stringify(old),currentLock:JSON.stringify(next)}),false);
  const bad=clone(b);bad.scripts['test:app']='echo bypass';assert.equal(isolatedOporaServerAddition({...evidence,currentPackage:JSON.stringify(bad)}),false);
  assert.equal(classifyOporaExactMerge({GITHUB_EVENT_NAME:'workflow_dispatch'}),true);
  assert.equal(classifyOporaExactMerge({GITHUB_EVENT_NAME:'pull_request'}),true);
});
