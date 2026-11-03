import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { scorePcl5Candidate as pcl, scorePcPtsd5Candidate as pc, scoreItqCandidate as itq } from '../lib/assessments/trauma-screening-candidate.js'
const fixtures = JSON.parse(fs.readFileSync(new URL('../docs/assessments/trauma-screening/synthetic-fixtures.json', import.meta.url)))
for (const fixture of fixtures.filter(f => f.instrument !== 'all')) test(`${fixture.instrument}: ${fixture.case}`, () => {
  const actual = fixture.instrument === 'PCL-5' ? pcl(fixture.responses, { traumaAssessmentRecorded: true }) : fixture.instrument === 'PC-PTSD-5' ? pc(fixture.exposure, fixture.responses) : itq(fixture.responses, { eventAnchored: true })
  if (fixture.expected_total === null) return assert.equal(actual.status, 'unavailable')
  if ('expected_total' in fixture) assert.equal(actual.total, fixture.expected_total)
  if (fixture.clusters) assert.deepEqual(Object.values(actual.clusters), fixture.clusters)
  if ('symptom_pattern' in fixture) assert.equal(actual.symptomPattern, fixture.symptom_pattern)
  if ('expected_pattern' in fixture) {
    assert.equal(actual.ptsdTotal, fixture.expected_ptsd_total)
    assert.equal(actual.dsoTotal, fixture.expected_dso_total)
    assert.equal(actual.pattern, fixture.expected_pattern)
  }
  assert.match(actual.interpretation, /not a diagnosis/)
})
const full = value => Object.fromEntries(['P','C'].flatMap(p => Array.from({length:9},(_,i)=>[`${p}${i+1}`,value])))
test('clinical anchors are required and cannot be truthy strings', () => {
  assert.equal(pcl(Array(20).fill(0)).status,'unavailable')
  assert.equal(pcl(Array(20).fill(0),{traumaAssessmentRecorded:'yes'}).status,'unavailable')
  assert.equal(itq(full(0)).status,'unavailable')
})
test('invalid values are rejected rather than coerced', () => {
  for(const value of [-1,5,0.5,'',false,NaN,Infinity,'2']) {
    assert.throws(()=>pcl([value,...Array(19).fill(0)],{traumaAssessmentRecorded:true}))
    assert.throws(()=>itq({...full(0),P1:value},{eventAnchored:true}))
  }
  for(const value of [-1,2,'',false,'1']) assert.throws(()=>pc(value))
  assert.throws(()=>pc(1,[1,1,1,1,2]))
  assert.throws(()=>itq({...full(0),extra:0},{eventAnchored:true}))
})
test('missing, sparse, and partial responses never become zero', () => {
  assert.equal(pcl(Array(20),{traumaAssessmentRecorded:true}).status,'unavailable')
  assert.equal(pc(1,[0,0,null,0,0]).status,'unavailable')
  assert.equal(pc(1).status,'unavailable')
  assert.equal(itq({...full(0),C9:null},{eventAnchored:true}).status,'unavailable')
  assert.throws(()=>pcl(Array(19).fill(0)))
})
test('PC structural skip excludes stale answers and does not fabricate NOs', () => {
  assert.equal(pc(0).symptomsState,'structurally-skipped')
  assert.throws(()=>pc(0,Array(5).fill(0)),/INAPPLICABLE/)
  assert.equal(pc(1,Array(5).fill(0)).total,0)
})
test('ITQ DSO alone is neither; impairment >=2 boundary and exclusivity', () => {
  const dso=full(0); for(let i=1;i<=9;i++)dso[`C${i}`]=2
  assert.equal(itq(dso,{eventAnchored:true}).pattern,'neither')
  for(const prefix of ['P','C']) {
    const a=full(2);for(let i=7;i<=9;i++)a[`${prefix}${i}`]=1
    assert.equal(itq(a,{eventAnchored:true}).pattern,prefix==='P'?'neither':'PTSD-only pattern')
    a[`${prefix}9`]=2
    assert.equal(itq(a,{eventAnchored:true}).pattern,'CPTSD pattern')
  }
  assert.equal(itq(full(4),{eventAnchored:true}).ptsdTotal,24)
})
test('PCL cluster boundaries use >=2 and independently require 1/1/2/2', () => {
  const a=fixtures.find(f=>f.case==='minimal_symptom_pattern').responses
  for(const index of [0,5,7,8,14,15]) {
    const b=[...a];b[index]=1
    assert.equal(pcl(b,{traumaAssessmentRecorded:true}).symptomPattern,false)
  }
})
test('candidate is not imported into live registry or scoring', () => {
  for(const path of ['lib/assessments/definitions.js','lib/assessments/scoring.js','data/assessments/catalog.js','lib/app/repository.js']) {
    const source=fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
    assert.doesNotMatch(source,/trauma-screening-candidate/)
  }
})
