import test from 'node:test'
import assert from 'node:assert/strict'
import {shouldBuildFromCommit as director} from '../ops/agents-director-standalone/skip-unrelated-build.mjs'
import {shouldBuildFromCommit as monitor} from '../ops/pr-monitor-standalone/skip-unrelated-build.mjs'
const sha = 'a'.repeat(40)
const candidate = (files, overrides={}) => ({sha,parents:[{sha:'b'.repeat(40)}],files,...overrides})
test('unrelated trusted control commit skips both static sites', () => {
 const commit=candidate([{filename:'.github/workflows/hh-hourly-vercel-production.yml'}])
 assert.equal(director(commit,sha),false)
 assert.equal(monitor(commit,sha),false)
})
test('changes trigger only matching site's build', () => {
 assert.equal(director(candidate([{filename:'ops/agents-director-standalone/index.html'}]),sha),true)
 assert.equal(monitor(candidate([{filename:'ops/agents-director-standalone/index.html'}]),sha),false)
 assert.equal(monitor(candidate([{filename:'ops/pr-monitor-standalone/vercel.json'}]),sha),true)
 assert.equal(director(candidate([{filename:'ops/pr-monitor-standalone/vercel.json'}]),sha),false)
})
test('renames and uncertainty never suppress needed builds', () => {
 const renamed=candidate([{filename:'docs/archived.html',previous_filename:'ops/agents-director-standalone/index.html'}])
 assert.equal(director(renamed,sha),true)
 assert.equal(monitor(renamed,sha),false)
 for(const invalid of [
  null, {}, candidate([],{}), candidate([{filename:'docs/a'}],{sha:'b'.repeat(40)}),
  candidate([{filename:'docs/a'}],{parents:[]}),
  candidate(Array.from({length:300},(_,i)=>({filename:'docs/'+i}))),
  candidate([{filename:null}]), candidate([{filename:'docs/a',previous_filename:10}])
 ]) {
  assert.equal(director(invalid,sha),true)
  assert.equal(monitor(invalid,sha),true)
 }
})
