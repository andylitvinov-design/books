import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { profileScreeningPresentation } from '../lib/profile/profile-scale-presentation.js'

function fixture(language='en',value=4) {
  const definition=getAssessmentDefinition('asrs-6','v1',language)
  const result={...scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,value]))),
    id:'synthetic-asrs',accountId:'synthetic-owner',measurementAt:'2026-10-16T12:00:00Z'}
  return {result,row:{...result.dimensions[0],sourceResultId:result.id,sourceDefinitionId:result.definitionId,
    instrumentLocale:result.instrumentLocale,measurementAt:result.measurementAt}}
}
for(const language of ['en','ru']) for(const value of [0,4]) test(`source-bound profile screening ${language}/${value}`,()=>{
  const {row,result}=fixture(language,value)
  const original=JSON.stringify({row,result})
  const presentation=profileScreeningPresentation(row,[result],language)
  assert.equal(presentation.verified,true)
  assert.match(presentation.label,language==='ru'?value===4?/На уровне или выше/:/Ниже/:value===4?/At or above/:/Below/)
  assert.equal(JSON.stringify({row,result}),original)
})
test('missing/mutated source identity and malformed result never acquire a screening band',()=>{
  const {row,result}=fixture()
  const fields=['definitionId','definitionKey','definitionVersion','contentHash','instrumentLocale','translationVersion',
    'scoringKey','scoringVersion','resultVersion','timeframe']
  const bad=[null,{...result,dimensions:null},{...result,dimensions:{}},...fields.map(field=>({...result,[field]:'tampered'}))]
  for(const item of bad){
    const presentation=profileScreeningPresentation(row,item?[item]:[])
    assert.equal(presentation.verified,false)
    assert.doesNotMatch(presentation.label,/threshold|\b4\b|above|below/i)
  }
  for(const key of ['sourceResultId','sourceDefinitionId','instrumentLocale','measurementAt','value','min','max','direction','unit','timeframe','sourceConstruct','displayKind']) {
    const presentation=profileScreeningPresentation({...row,[key]:'tampered'},[result])
    assert.equal(presentation.verified,false,key)
  }
})
test('a renamed screening row cannot fall through to a continuous percentage bar',()=>{
  const {row,result}=fixture()
  assert.equal(profileScreeningPresentation({...row,key:'unknown',displayKind:'continuous'},[result]).verified,false)
  assert.equal(profileScreeningPresentation({key:'state.energy',displayKind:'continuous'},[]),null)
})
test('profile map receives source results and renders only the verified shared label',()=>{
  const source=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  assert.match(source,/<ProfileOverview profile=\{profile\} locale=\{locale\} results=\{data\.results\} \/>/)
  assert.match(source,/profileScreeningPresentation\(row, results, locale\)/)
  assert.match(source,/data-screening-verified=\{row\.screening\.verified\}>\{row\.screening\.label\}/)
  assert.doesNotMatch(source,/Screening count 0–6; threshold 4|Скрининговый подсчёт 0–6; порог 4/)
})
