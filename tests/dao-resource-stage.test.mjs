import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  DAO_RESOURCE_STAGES, DAO_RESOURCE_SCALE_VERSION, parseDaoResourceScore, daoResourceStage,
} from '../lib/consultations/dao-resource-stage.js'
import { createPrescription, updatePrescription, getClientPrescription } from '../lib/prescriptions/service.js'

const sample = {
  patientName:'Test client', practitionerName:'Test practitioner',
  dateIssued:'2026-10-18', languagePreference:'ru', status:'active',
  recommendationType:'bach',
  items:[{itemType:'bach',displayNameOverride:'Test flower'}],
  daoResourceScore:'3,8',
}

test('18 canonical resource stages cover the full 0–10 scale without gaps', () => {
  assert.equal(DAO_RESOURCE_STAGES.length,18)
  assert.ok(DAO_RESOURCE_SCALE_VERSION.includes('18'))
  assert.equal(DAO_RESOURCE_STAGES[0].min,0)
  assert.equal(DAO_RESOURCE_STAGES.at(-1).max,10)
  for(let i=0;i<DAO_RESOURCE_STAGES.length-1;i++) {
    assert.equal(DAO_RESOURCE_STAGES[i].max,DAO_RESOURCE_STAGES[i+1].min)
  }
  for(let tenth=0;tenth<=100;tenth++){
    const score=tenth/10
    const stage=daoResourceStage(score,'ru')
    assert.ok(stage && stage.level>=1 && stage.level<=18)
    assert.equal(stage.score,score)
  }
})

test('3.8 is level 5 (King/Queen in Tower) in both languages', () => {
  assert.equal(daoResourceStage('3.8','ru').level,5)
  assert.equal(daoResourceStage('3,8','ru').name,'Король / Королева в башне')
  assert.equal(daoResourceStage(3.8,'en').name,'King / Queen in the Tower')
  assert.equal(daoResourceStage(3.8,'ru').range,'3.5–4.0')
  assert.equal(daoResourceStage('4.0','ru').level,6)
  assert.equal(daoResourceStage('3.5','ru').level,5)
})

test('boundary scores use the later stage and 10 is included exactly', () => {
  const boundaries=[
    [0,1],[2,2],[2.5,3],[3,4],[3.5,5],[4,6],[4.5,7],[5,8],[5.5,9],
    [6,10],[6.5,11],[7,12],[7.5,13],[8,14],[8.5,15],[9,16],[9.5,17],[10,18],
  ]
  for(const [score,level] of boundaries)assert.equal(daoResourceStage(score).level,level)
})

test('optional input is empty, never auto-generates a client stage',()=>{
  assert.equal(parseDaoResourceScore(''),null)
  assert.equal(parseDaoResourceScore(null),null)
  assert.equal(parseDaoResourceScore(undefined),null)
  assert.equal(daoResourceStage(null),null)
  assert.equal(parseDaoResourceScore(' 3,8 '),3.8)
})

test('malformed or out-of-range input is rejected rather than stored',()=>{
  for(const value of ['-0.1','3.88','11','10.1','NaN','Infinity','3.8abc','1e1',{},[],true]){
    assert.throws(()=>parseDaoResourceScore(value),/INVALID_DAO_RESOURCE_SCORE/,String(value))
  }
})

test('score roundtrips through report validation, client projection, editing and clearing',()=>{
  const created=createPrescription(sample)
  assert.equal(created.daoResourceScore,3.8)
  assert.equal(getClientPrescription(created,'ru').daoResourceScore,3.8)
  assert.equal(getClientPrescription(created,'en').daoResourceScore,3.8)
  const keep=updatePrescription(created,Object.fromEntries(
    Object.entries(created).filter(([k])=>k!=='daoResourceScore')))
  assert.equal(keep.daoResourceScore,3.8)
  const cleared=updatePrescription(created,{...created,daoResourceScore:null})
  assert.equal(cleared.daoResourceScore,null)
  assert.equal(getClientPrescription(cleared,'ru').daoResourceScore,null)
  assert.throws(()=>createPrescription({...sample,daoResourceScore:'999'}),/INVALID_DAO_RESOURCE_SCORE/)
})

test('owner editor, both PDF formats and private HTML client view share the same score field',async()=>{
  const paths=[
    'components/consultation-form.jsx',
    'app/admin/consultations/actions.js',
    'app/admin/api/consultations/preview/route.js',
    'lib/consultations/service.js',
    'lib/prescriptions/service.js',
    'components/prescription-document.jsx',
    'components/client-session-page.jsx',
    'lib/prescriptions/pdf.js',
  ]
  for(const path of paths){
    const source=await readFile(path,'utf8')
    assert.match(source,/daoResourceScore|DaoStageDisclosure|DaoResourceStageField/,path)
  }
  const field=await readFile('components/dao-resource-stage.jsx','utf8')
  assert.match(field,/name="daoResourceScore"/)
  assert.match(field,/<details className=\{styles\.disclosure\}>/)
  assert.doesNotMatch(field,/<details className=\{styles\.disclosure\} open/)
  const pdf=await readFile('lib/prescriptions/pdf.js','utf8')
  assert.equal(pdf.match(/daoResourceStage\(document\.daoResourceScore,locale\)/g)?.length,2)
})
