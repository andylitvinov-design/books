import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { monitoringCatalogItem } from '../data/assessments/catalog.js'
import { chatChoosePayload, chatProgress, chatPermittedOptions } from '../lib/assessments/test-chat-flow.mjs'
import { proposedTestAnswer, previousTestAnswerPayload } from '../lib/assessments/conversational-test-protocol.mjs'

// Three distinct existing instruments: owner-authored check-in, independently
// defined personality baseline and original unvalidated typology. No new scale
// or scoring formula is introduced by the conversational interface.
const PILOTS = [
  ['check-in','hh-current-state','v2','en'],
  ['trait baseline','mini-ipip-20','v1','en'],
  ['reflective typology','hh-socionics-32','v1','en'],
]
for (const [kind,key,version,locale] of PILOTS) {
  test('original questionnaire/scoring parity: '+kind+' ('+key+')', () => {
    const def=getAssessmentDefinition(key,version,locale)
    const catalog=monitoringCatalogItem(key)
    assert.equal(catalog?.startable,true)
    assert.equal(catalog?.rightsStatus,'cleared')
    assert.equal(catalog?.guestEligible,true)
    assert.ok(def.questions.length>=5)
    let run={revision:0,progress:0,context:{},answers:{}}
    const directAnswers={}
    for (const [index,question] of def.questions.entries()) {
      const choice=chatPermittedOptions(def,question,run.answers)[0]
      assert.ok(choice)
      directAnswers[question.id]=choice.value
      const proposed=proposedTestAnswer(def,question,run.answers,String(choice.value))
      assert.equal(proposed?.value,choice.value)
      const patch=chatChoosePayload(def,run,choice.value,'operation-'+index)
      assert.deepEqual(patch.answers,{[question.id]:choice.value})
      assert.equal(patch.expectedRevision,index)
      run={...run,revision:index+1,progress:patch.progress,
        answers:{...run.answers,...patch.answers}}
    }
    assert.equal(chatProgress(def,run).complete,true)
    assert.deepEqual(run.answers,directAnswers)
    const chatScore=scoreAssessment(def,run.answers)
    const canonicalScore=scoreAssessment(def,directAnswers)
    assert.deepEqual(chatScore.dimensions,canonicalScore.dimensions)
    assert.equal(chatScore.scoringVersion,canonicalScore.scoringVersion)
    const undo=previousTestAnswerPayload(def,run,'operation-undo')
    assert.equal(undo.progress,def.questions.length-1)
    assert.equal(undo.answers[def.questions.at(-1).id],null)
  })
}
